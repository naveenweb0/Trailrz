import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { verifyAndCheckInTicket } from "@/lib/tickets";

export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { ticketIdentifier, location, device } = body;

    if (!ticketIdentifier || typeof ticketIdentifier !== "string" || !ticketIdentifier.trim()) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid ticket QR code or ticket ID." },
        { status: 400 }
      );
    }

    const scannerName = `${admin.name} (${admin.role})`;
    const result = await verifyAndCheckInTicket(
      ticketIdentifier.trim(),
      scannerName,
      location || "Main Entrance Gate",
      device || "Admin Web Scanner"
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("POST /api/admin/tickets/validate error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to validate ticket" },
      { status: 500 }
    );
  }
}
