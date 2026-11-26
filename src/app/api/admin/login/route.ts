import { NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getAdminEmail, getAdminPassword } from "@/lib/env";
import { createStaffSessionToken } from "@/lib/session";
import { newId } from "@/lib/constants";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonOk, ApiError, handleApiError } from "@/lib/api-response";

function timingSafeMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a || "", "utf-8");
  const bufB = Buffer.from(b || "", "utf-8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function POST(req: NextRequest) {
  try {
    await enforceRateLimit(req, "admin_login", 10, 900);

    const body = await req.json().catch(() => ({}));
    const email = (typeof body.email === "string" ? body.email : "").trim().toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";

    const configuredEmail = getAdminEmail();
    const configuredPassword = getAdminPassword();

    if (!configuredEmail || !configuredPassword) {
      throw new ApiError(500, "Admin credentials are not configured in environment");
    }

    const emailMatch = timingSafeMatch(email, configuredEmail);
    const passwordMatch = timingSafeMatch(password, configuredPassword);

    if (!emailMatch || !passwordMatch) {
      throw new ApiError(401, "Invalid email or password");
    }

    // Find or create superadmin in database
    let user = await prisma.user.findFirst({
      where: { email: configuredEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: newId(),
          userId: `admin_${Buffer.from(configuredEmail).toString("hex").slice(0, 16)}`,
          email: configuredEmail,
          name: "Naveen Maan",
          role: "superadmin",
          assignedEventIds: [],
          env: "live",
        },
      });
    } else if (user.role !== "superadmin") {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: "superadmin" },
      });
    }

    const token = createStaffSessionToken({
      sub: user.userId,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const res = jsonOk({
      ok: true,
      user: {
        id: user.id,
        user_id: user.userId,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    });

    res.cookies.set("__session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 86400,
    });

    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
