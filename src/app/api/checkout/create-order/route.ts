import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createRazorpayOrder } from "@/lib/razorpay";
import { generateRandomToken } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reservationToken, eventId, customer, attendeeNames } = body;

    if (!reservationToken || !eventId || !customer) {
      return NextResponse.json(
        { success: false, error: "Missing required booking details." },
        { status: 400 }
      );
    }

    const { fullName, email, phone } = customer;

    // Validate customer inputs
    if (!fullName || fullName.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Please enter your full name." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    // Validate phone number (support Indian 10-digit mobile numbers with or without +91)
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");
    const phoneRegex = /^(\+?91)?[6-9]\d{9}$/;
    if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).",
        },
        { status: 400 }
      );
    }

    // Verify active reservation
    const now = new Date();
    const reservations = await prisma.inventoryReservation.findMany({
      where: {
        reservationToken,
        status: "PENDING",
        expiresAt: { gt: now },
      },
      include: {
        ticketType: true,
      },
    });

    if (reservations.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Your ticket reservation has expired. Please select your tickets again.",
        },
        { status: 400 }
      );
    }

    // Fetch Event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event || event.status !== "PUBLISHED") {
      return NextResponse.json(
        { success: false, error: "Event is not currently available for booking." },
        { status: 400 }
      );
    }

    // Fetch settings for fees
    const settings = await prisma.platformSetting.findFirst({
      where: { id: 1 },
    });

    const feePct = settings?.convenienceFeePercentage ?? 2.5;
    const fixedFee = settings?.convenienceFeeFixed ?? 2000;
    const gstPct = settings?.taxPercentage ?? 18.0;

    let subtotalPaise = 0;
    let totalTickets = 0;

    for (const res of reservations) {
      const itemSubtotal = res.ticketType.price * res.quantity;
      subtotalPaise += itemSubtotal;
      totalTickets += res.quantity;
    }

    let convenienceFeePaise = 0;
    let taxAmountPaise = 0;

    if (subtotalPaise > 0) {
      const percentFee = Math.round((subtotalPaise * feePct) / 100);
      convenienceFeePaise = percentFee + fixedFee;
      taxAmountPaise = Math.round((convenienceFeePaise * gstPct) / 100);
    }

    const totalAmountPaise = subtotalPaise + convenienceFeePaise + taxAmountPaise;

    // Generate unique booking reference (e.g. TRZ-BK-2026-89472)
    const year = new Date().getFullYear();
    const randomCode = Math.floor(10000 + Math.random() * 90000);
    const bookingReference = `TRZ-BK-${year}-${randomCode}`;

    // Upsert Customer record
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = cleanPhone.startsWith("+91")
      ? cleanPhone
      : cleanPhone.startsWith("91") && cleanPhone.length === 12
      ? `+${cleanPhone}`
      : `+91${cleanPhone}`;

    const customerRecord = await prisma.customer.upsert({
      where: { email: normalizedEmail },
      update: {
        fullName: fullName.trim(),
        phone: normalizedPhone,
      },
      create: {
        fullName: fullName.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
      },
    });

    // Create Booking and BookingItems in transaction
    const booking = await prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          bookingReference,
          eventId,
          customerId: customerRecord.id,
          customerName: fullName.trim(),
          customerEmail: normalizedEmail,
          customerPhone: normalizedPhone,
          totalQuantity: totalTickets,
          subtotal: subtotalPaise,
          convenienceFee: convenienceFeePaise,
          taxAmount: taxAmountPaise,
          totalAmount: totalAmountPaise,
          bookingStatus: "PENDING",
          paymentStatus: "PENDING",
          reservationToken,
          notes: attendeeNames ? JSON.stringify(attendeeNames) : null,
          items: {
            create: reservations.map((res) => ({
              ticketTypeId: res.ticketTypeId,
              ticketName: res.ticketType.name,
              quantity: res.quantity,
              unitPrice: res.ticketType.price,
              subtotal: res.ticketType.price * res.quantity,
            })),
          },
        },
      });

      return newBooking;
    });

    // Handle free events (amount === 0)
    if (totalAmountPaise === 0) {
      return NextResponse.json({
        success: true,
        isFree: true,
        bookingReference: booking.bookingReference,
        bookingId: booking.id,
        amount: 0,
      });
    }

    // Create Razorpay payment order server-side
    const razorpayOrder = await createRazorpayOrder({
      amountInPaise: totalAmountPaise,
      receipt: booking.bookingReference,
      notes: {
        bookingReference: booking.bookingReference,
        eventId: event.id,
        eventTitle: event.title,
        customerEmail: normalizedEmail,
      },
    });

    // Record initial Payment attempt
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: totalAmountPaise,
        currency: "INR",
        provider: "RAZORPAY",
        razorpayOrderId: razorpayOrder.orderId,
        status: "CREATED",
      },
    });

    return NextResponse.json({
      success: true,
      isFree: false,
      orderId: razorpayOrder.orderId,
      keyId: razorpayOrder.keyId,
      amount: totalAmountPaise,
      currency: "INR",
      bookingReference: booking.bookingReference,
      bookingId: booking.id,
      customer: {
        name: fullName.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
      },
      isMock: razorpayOrder.isMock,
    });
  } catch (error: any) {
    console.error("POST /api/checkout/create-order error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create order. Please try again." },
      { status: 500 }
    );
  }
}
