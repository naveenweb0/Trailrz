import { NextRequest } from "next/server";
import QRCode from "qrcode";
import { qrVerify } from "@/lib/qr";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || "";
  const ticketId = qrVerify(token);

  if (!ticketId) {
    return new Response(JSON.stringify({ detail: "Invalid or missing QR token" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const pngBuffer = await QRCode.toBuffer(token, {
    type: "png",
    width: 420,
    margin: 2,
    errorCorrectionLevel: "M",
    color: {
      dark: "#171717",
      light: "#FFFFFF",
    },
  });

  return new Response(new Uint8Array(pngBuffer), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
