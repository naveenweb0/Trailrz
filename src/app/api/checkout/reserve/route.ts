import { NextRequest, NextResponse } from "next/server";
import { reserveInventory } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, items } = body;

    if (!eventId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Please select at least one ticket category." },
        { status: 400 }
      );
    }

    // Filter valid quantity selections
    const validItems = items.filter((i) => i.quantity > 0 && i.ticketTypeId);
    if (validItems.length === 0) {
      return NextResponse.json(
        { success: false, error: "Please select at least 1 ticket." },
        { status: 400 }
      );
    }

    // Get platform settings for fee and tax calculation
    const settings = await prisma.platformSetting.findFirst({
      where: { id: 1 },
    });

    const expiryMinutes = settings?.bookingExpiryMinutes ?? 10;
    const feePct = settings?.convenienceFeePercentage ?? 2.5;
    const fixedFee = settings?.convenienceFeeFixed ?? 2000; // in paise
    const gstPct = settings?.taxPercentage ?? 18.0;

    // Reserve inventory temporarily
    const reservation = await reserveInventory(eventId, validItems, expiryMinutes);

    // Fetch ticket types to calculate exact subtotal in paise
    const ticketTypeIds = validItems.map((i) => i.ticketTypeId);
    const ticketTypes = await prisma.ticketType.findMany({
      where: { id: { in: ticketTypeIds } },
    });

    let subtotalPaise = 0;
    let totalTickets = 0;
    const selectedItemsWithDetails = [];

    for (const item of validItems) {
      const tt = ticketTypes.find((t) => t.id === item.ticketTypeId);
      if (tt) {
        const itemSubtotal = tt.price * item.quantity;
        subtotalPaise += itemSubtotal;
        totalTickets += item.quantity;
        selectedItemsWithDetails.push({
          ticketTypeId: tt.id,
          name: tt.name,
          price: tt.price,
          quantity: item.quantity,
          subtotal: itemSubtotal,
        });
      }
    }

    // Calculate transparent fees
    // If free event (subtotal === 0), fee is 0
    let convenienceFeePaise = 0;
    let taxAmountPaise = 0;

    if (subtotalPaise > 0) {
      // Percentage fee + fixed fee
      const percentFee = Math.round((subtotalPaise * feePct) / 100);
      convenienceFeePaise = percentFee + fixedFee;
      // GST on convenience fee
      taxAmountPaise = Math.round((convenienceFeePaise * gstPct) / 100);
    }

    const totalAmountPaise = subtotalPaise + convenienceFeePaise + taxAmountPaise;

    return NextResponse.json({
      success: true,
      reservationToken: reservation.reservationToken,
      expiresAt: reservation.expiresAt,
      durationMinutes: expiryMinutes,
      items: selectedItemsWithDetails,
      totalTickets,
      breakdown: {
        subtotal: subtotalPaise,
        convenienceFee: convenienceFeePaise,
        taxAmount: taxAmountPaise,
        totalAmount: totalAmountPaise,
      },
    });
  } catch (error: any) {
    console.error("POST /api/checkout/reserve error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to reserve tickets. Please try again." },
      { status: 400 }
    );
  }
}
