import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { RateLimitError } from "./rate-limit";

export class ApiError extends Error {
  status: number;
  detail: string | unknown[];

  constructor(status: number, detail: string | unknown[]) {
    super(typeof detail === "string" ? detail : "Validation Error");
    this.status = status;
    this.detail = detail;
    this.name = "ApiError";
  }
}

export function jsonOk<T>(data: T, status = 200, headers?: HeadersInit): NextResponse {
  return NextResponse.json(data, { status, headers });
}

export function jsonError(detail: string | unknown[], status = 400): NextResponse {
  return NextResponse.json({ detail }, { status });
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return jsonError(err.detail, err.status);
  }
  if (err instanceof RateLimitError) {
    return jsonError(err.message, err.status);
  }
  if (err instanceof ZodError) {
    const formatted = (err as any).issues.map((e: any) => ({
      loc: ["body", ...e.path],
      msg: e.message,
      type: e.code,
    }));
    return jsonError(formatted, 422);
  }

  console.error("Unhandled API error:", err);
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err instanceof Error
      ? err.message
      : "Internal server error";
  return jsonError(message, 500);
}
