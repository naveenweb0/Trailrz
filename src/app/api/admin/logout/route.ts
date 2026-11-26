import { NextRequest } from "next/server";
import { jsonOk } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const res = jsonOk({ ok: true, message: "Logged out" });
  res.cookies.set("__session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
