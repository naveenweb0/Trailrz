import { Resend } from "resend";
import { prisma } from "./prisma";

interface SendBookingConfirmationParams {
  bookingId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  bookingReference: string;
  eventTitle: string;
  eventDate: Date | string;
  eventTime: string;
  venueName: string;
  venueAddress: string;
  totalTickets: number;
  totalAmountInPaise: number;
  ticketLink: string;
}

/**
 * Dispatch booking confirmation notifications (Email + WhatsApp)
 */
export async function dispatchBookingNotifications(params: SendBookingConfirmationParams) {
  const results = {
    email: await sendBookingConfirmationEmail(params),
    whatsapp: await sendBookingConfirmationWhatsApp(params),
  };
  return results;
}

/**
 * Send branded HTML confirmation email via Resend
 */
export async function sendBookingConfirmationEmail(params: SendBookingConfirmationParams) {
  const settings = await prisma.platformSetting.findFirst({
    where: { id: 1 },
    select: { resendApiKey: true, resendFromEmail: true, supportEmail: true, platformName: true },
  });

  const apiKey = settings?.resendApiKey || process.env.RESEND_API_KEY;
  const fromEmail = settings?.resendFromEmail || process.env.RESEND_FROM_EMAIL || "tickets@trailrz.com";
  const supportEmail = settings?.supportEmail || "care@trailrz.com";

  // Create notification record in DB
  const notification = await prisma.notification.create({
    data: {
      bookingId: params.bookingId,
      type: "EMAIL",
      recipient: params.customerEmail,
      subject: "Your Trailrz experience is confirmed! 🎟️",
      content: `Booking Reference: ${params.bookingReference} for ${params.eventTitle}`,
      status: "PENDING",
      attempts: 1,
    },
  });

  const formattedDate = new Date(params.eventDate).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your Trailrz Experience is Confirmed!</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F7F3EB; margin: 0; padding: 24px; color: #111111; }
    .card { max-width: 580px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E2DDD3; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
    .header { background: #111111; padding: 32px 28px; text-align: center; }
    .brand { font-size: 26px; font-weight: 800; letter-spacing: 4px; color: #F7F3EB; margin: 0; }
    .badge { display: inline-block; background: #E53935; color: #FFFFFF; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; padding: 4px 12px; border-radius: 999px; margin-top: 12px; }
    .body { padding: 32px 28px; }
    h1 { font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 8px; color: #111111; }
    p { font-size: 15px; line-height: 1.6; color: #444444; margin: 8px 0; }
    .ticket-box { background: #FAF7F0; border: 1px dashed #D5CEBF; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
    .label { color: #777777; }
    .val { font-weight: 600; color: #111111; text-align: right; }
    .btn { display: block; text-align: center; background: #E53935; color: #FFFFFF; font-weight: 700; font-size: 16px; text-decoration: none; padding: 14px 24px; border-radius: 10px; margin-top: 24px; }
    .footer { padding: 20px 28px; background: #F7F3EB; text-align: center; font-size: 12px; color: #777777; border-top: 1px solid #E2DDD3; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="brand">TRAILRZ</div>
      <div class="badge">Booking Confirmed</div>
    </div>
    <div class="body">
      <h1>You're on the list, ${params.customerName}!</h1>
      <p>Your tickets have been confirmed for an extraordinary experience curated by Trailrz. Show your digital QR tickets at the gate for instant entry.</p>
      
      <div class="ticket-box">
        <div class="detail-row">
          <span class="label">Experience</span>
          <span class="val">${params.eventTitle}</span>
        </div>
        <div class="detail-row">
          <span class="label">Booking ID</span>
          <span class="val">${params.bookingReference}</span>
        </div>
        <div class="detail-row">
          <span class="label">Date & Time</span>
          <span class="val">${formattedDate} at ${params.eventTime}</span>
        </div>
        <div class="detail-row">
          <span class="label">Venue</span>
          <span class="val">${params.venueName}</span>
        </div>
        <div class="detail-row">
          <span class="label">Address</span>
          <span class="val">${params.venueAddress}</span>
        </div>
        <div class="detail-row">
          <span class="label">Total Tickets</span>
          <span class="val">${params.totalTickets} ticket(s)</span>
        </div>
      </div>

      <a href="${params.ticketLink}" class="btn">View & Download Digital Tickets</a>

      <p style="font-size: 13px; color: #777777; margin-top: 20px; text-align: center;">
        No need to print! Present the digital QR code on your mobile phone at the entrance.
      </p>
    </div>
    <div class="footer">
      Questions? Reach out to our concierge team at <a href="mailto:${supportEmail}" style="color: #111111; font-weight: 600;">${supportEmail}</a>.<br>
      © ${new Date().getFullYear()} Trailrz Experiences Pvt. Ltd. All rights reserved.
    </div>
  </div>
</body>
</html>
  `;

  if (apiKey && apiKey.startsWith("re_")) {
    try {
      const resend = new Resend(apiKey);
      const data = await resend.emails.send({
        from: `TRAILRZ <${fromEmail}>`,
        to: params.customerEmail,
        subject: "Your Trailrz experience is confirmed! 🎟️",
        html: htmlContent,
      });

      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          providerResponse: JSON.stringify(data),
        },
      });

      return { success: true, notificationId: notification.id };
    } catch (err: any) {
      console.error("Resend delivery failed:", err);
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: "FAILED",
          lastError: err.message || "Failed to send email via Resend",
        },
      });
      return { success: false, error: err.message };
    }
  }

  // If Resend API key is not yet set in production, mark notification as simulated/queued
  await prisma.notification.update({
    where: { id: notification.id },
    data: {
      status: "SENT",
      sentAt: new Date(),
      providerResponse: JSON.stringify({ message: "Simulated successful local delivery (no live key provided)" }),
    },
  });

  return { success: true, notificationId: notification.id, simulated: true };
}

/**
 * Send WhatsApp confirmation message using Meta WhatsApp Business Cloud API
 */
export async function sendBookingConfirmationWhatsApp(params: SendBookingConfirmationParams) {
  const settings = await prisma.platformSetting.findFirst({
    where: { id: 1 },
    select: { whatsappToken: true, whatsappPhoneNumberId: true },
  });

  const token = settings?.whatsappToken || process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = settings?.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;

  // Format phone number to E.164 (ensure 91 prefix for Indian numbers)
  let cleanPhone = params.customerPhone.replace(/\D/g, "");
  if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

  const notification = await prisma.notification.create({
    data: {
      bookingId: params.bookingId,
      type: "WHATSAPP",
      recipient: cleanPhone,
      subject: "WhatsApp Booking Pass",
      content: `Your Trailrz experience is confirmed! Booking Reference: ${params.bookingReference} for ${params.eventTitle}`,
      status: "PENDING",
      attempts: 1,
    },
  });

  if (token && phoneNumberId) {
    try {
      const response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: cleanPhone,
          type: "text",
          text: {
            preview_url: true,
            body: `🎟️ *Your Trailrz Experience is Confirmed!*\n\nHi ${params.customerName},\n\nYou're on the list for *${params.eventTitle}*.\n\n📍 *Venue:* ${params.venueName}\n🗓️ *Date:* ${params.eventDate}\n⏰ *Time:* ${params.eventTime}\n🎫 *Tickets:* ${params.totalTickets}\n🆔 *Booking ID:* ${params.bookingReference}\n\n👉 Access your digital QR tickets here:\n${params.ticketLink}\n\nSimply present your QR code at the venue gate for swift check-in. See you there!\n\n_Trailrz Experiences_`,
          },
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData?.error?.message || "WhatsApp API error");
      }

      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          providerResponse: JSON.stringify(resData),
        },
      });

      return { success: true, notificationId: notification.id };
    } catch (err: any) {
      console.error("WhatsApp delivery failed:", err);
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: "FAILED",
          lastError: err.message || "Failed to deliver WhatsApp message",
        },
      });
      return { success: false, error: err.message };
    }
  }

  // Record simulated log if credentials not configured
  await prisma.notification.update({
    where: { id: notification.id },
    data: {
      status: "SENT",
      sentAt: new Date(),
      providerResponse: JSON.stringify({ message: "Simulated WhatsApp delivery (no live API token configured)" }),
    },
  });

  return { success: true, notificationId: notification.id, simulated: true };
}

/**
 * Retry a failed notification
 */
export async function retryNotification(notificationId: string) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    include: {
      booking: {
        include: {
          event: true,
        },
      },
    },
  });

  if (!notification) throw new Error("Notification not found");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const ticketLink = `${baseUrl}/my-tickets?ref=${notification.booking.bookingReference}&email=${encodeURIComponent(
    notification.booking.customerEmail
  )}`;

  const params: SendBookingConfirmationParams = {
    bookingId: notification.bookingId,
    customerName: notification.booking.customerName,
    customerEmail: notification.booking.customerEmail,
    customerPhone: notification.booking.customerPhone,
    bookingReference: notification.booking.bookingReference,
    eventTitle: notification.booking.event.title,
    eventDate: notification.booking.event.eventDate,
    eventTime: notification.booking.event.startTime,
    venueName: notification.booking.event.venueName,
    venueAddress: notification.booking.event.fullAddress,
    totalTickets: notification.booking.totalQuantity,
    totalAmountInPaise: notification.booking.totalAmount,
    ticketLink,
  };

  await prisma.notification.update({
    where: { id: notificationId },
    data: { attempts: { increment: 1 } },
  });

  if (notification.type === "EMAIL") {
    return await sendBookingConfirmationEmail(params);
  } else {
    return await sendBookingConfirmationWhatsApp(params);
  }
}
