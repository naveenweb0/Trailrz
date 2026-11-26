import { NextRequest } from "next/server";
import { verifyToken } from "@clerk/backend";
import { prisma } from "./prisma";
import { getAdminEmails, getClerkSecretKey } from "./env";
import { ROLES, DEFAULT_ROLE, RETIRED_ROLES, type UserRole, newId } from "./constants";
import { ApiError } from "./api-response";
import { verifyStaffSessionToken } from "./session";

export interface Member {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  assignedEventIds: string[];
  env: string | null;
  createdAt: Date;
}

export function effectiveRole(role?: string | null): UserRole {
  if (!role) return DEFAULT_ROLE;
  const remapped = RETIRED_ROLES[role] || role;
  return (ROLES as readonly string[]).includes(remapped) ? (remapped as UserRole) : DEFAULT_ROLE;
}

export async function fetchClerkProfile(userId: string): Promise<{ isAdmin: boolean; email: string; name: string }> {
  const secretKey = getClerkSecretKey();
  if (!secretKey) {
    return { isAdmin: false, email: "", name: "" };
  }

  const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "User-Agent": "trailrz-app",
    },
  });

  if (!res.ok) {
    throw new ApiError(res.status, "Failed to load user profile from authentication service");
  }

  const data = await res.json();
  const admins = getAdminEmails();
  const emails = data.email_addresses || [];
  const verifiedAdmin = emails.some(
    (e: { email_address: string; verification?: { status: string } }) =>
      admins.has(e.email_address.toLowerCase()) && e.verification?.status === "verified"
  );
  const primaryObj = emails.find((e: { id: string }) => e.id === data.primary_email_address_id);
  const primaryEmail = primaryObj ? primaryObj.email_address : emails[0]?.email_address || "";
  const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || primaryEmail;

  return { isAdmin: verifiedAdmin, email: primaryEmail, name };
}

export async function authenticateRequest(req: NextRequest): Promise<string> {
  const authHeader = req.headers.get("authorization") || "";
  let token = "";
  if (authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  }

  if (!token) {
    // Check Clerk session cookies
    const sessionCookie = req.cookies.get("__session")?.value;
    if (sessionCookie) {
      token = sessionCookie;
    }
  }

  if (!token) {
    throw new ApiError(401, "Not authenticated");
  }

  // 1. Check if token is our cryptographically signed staff session token
  const staffSession = verifyStaffSessionToken(token);
  if (staffSession && staffSession.sub) {
    return staffSession.sub;
  }

  const secretKey = getClerkSecretKey();
  if (!secretKey) {
    // If Clerk secret is not configured in environment, reject
    throw new ApiError(401, "Authentication service is not configured");
  }

  // When live or standard Clerk secret is present, verify token signature cryptographically
  if (secretKey.startsWith("sk_live_") || secretKey.startsWith("sk_test_")) {
    try {
      const verified = await verifyToken(token, { secretKey });
      if (verified && verified.sub) {
        return verified.sub;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification failed";
      throw new ApiError(401, `Invalid or expired session: ${msg}`);
    }
  }

  if (process.env.NODE_ENV !== "test") {
    throw new ApiError(401, "Invalid authentication token");
  }

  try {
    // Fallback strictly for isolated unit and integration test suites (NODE_ENV=test)
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Malformed JWT token");
    }
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
    const userId = payload.sub;
    if (!userId) {
      throw new Error("Token missing user ID");
    }
    // Check expiration if exp is present
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      throw new ApiError(401, "Session has expired");
    }
    return userId;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, "Invalid authentication token");
  }
}

export async function currentMember(req: NextRequest): Promise<Member> {
  const userId = await authenticateRequest(req);
  let member = await prisma.user.findUnique({
    where: { userId },
  });

  const env = getClerkSecretKey().startsWith("sk_live_") ? "live" : "preview";

  if (!member || !member.role) {
    const token =
      req.headers.get("authorization")?.replace(/^Bearer\s+/, "") ||
      req.cookies.get("__session")?.value ||
      "";
    const staff = verifyStaffSessionToken(token);
    if (staff) {
      member = await prisma.user.upsert({
        where: { userId },
        update: { role: staff.role as UserRole, email: staff.email, name: staff.name, env },
        create: {
          id: newId(),
          userId,
          role: staff.role as UserRole,
          email: staff.email,
          name: staff.name,
          assignedEventIds: [],
          env,
        },
      });
    } else {
      const prof = await fetchClerkProfile(userId);
      const role: UserRole = prof.isAdmin ? "superadmin" : DEFAULT_ROLE;
      member = await prisma.user.upsert({
        where: { userId },
        update: { role, email: prof.email, name: prof.name, env },
        create: {
          id: newId(),
          userId,
          role,
          email: prof.email,
          name: prof.name,
          assignedEventIds: [],
          env,
        },
      });
    }
  }

  return {
    ...member,
    role: effectiveRole(member.role),
  };
}

export async function requireRole(
  req: NextRequest,
  ...allowedRoles: readonly UserRole[]
): Promise<Member> {
  const member = await currentMember(req);
  if (!allowedRoles.includes(member.role)) {
    throw new ApiError(403, "Not allowed");
  }
  return member;
}

