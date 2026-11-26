import { Resend } from "resend";
import { prisma } from "./prisma";
import { getAppUrl, getMailFrom, getResendApiKey } from "./env";
import { newId } from "./constants";

export function resendReady(): boolean {
  return Boolean(getResendApiKey() && getMailFrom());
}

function escapeHtml(val: unknown): string {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function confirmationHtml(
  b: { reference: string; accessKey: string; eventSnapshot: any },
  tickets: Array<{ serial: string; tierName: string }>
): string {
  const safeBase = getAppUrl().replace(/["'<>]/g, "");
  const link = `${safeBase}/my-tickets?ref=${encodeURIComponent(b.reference)}&key=${encodeURIComponent(b.accessKey)}`;
  const rows = tickets
    .map(
      (t) =>
        `<tr><td style='padding:6px 0;font-family:monospace'>${escapeHtml(t.serial)}</td><td style='padding:6px 0'>${escapeHtml(t.tierName)}</td></tr>`
    )
    .join("");

  const ev = b.eventSnapshot || {};
  return `<div style="background:#FAF7F2;padding:32px;font-family:Helvetica,Arial,sans-serif;color:#181614">
<div style="max-width:560px;margin:auto;background:#fff;border:1px solid #E9E2D6;padding:32px">
<p style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#686053;margin:0">TRAILRZ · Admission confirmed</p>
<h1 style="font-family:Georgia,serif;font-weight:400;font-size:28px;margin:12px 0">${escapeHtml(ev.title || "Experience")}</h1>
<p style="margin:0 0 4px">${escapeHtml(ev.venue || "")}, ${escapeHtml(ev.city || "")}</p>
<p style="margin:0 0 20px;color:#686053">Booking reference <b style="font-family:monospace">${escapeHtml(b.reference)}</b></p>
<table style="width:100%;border-top:1px solid #E9E2D6;border-bottom:1px solid #E9E2D6;margin-bottom:20px">${rows}</table>
<a href="${link}" style="display:inline-block;background:#181614;color:#FAF7F2;padding:12px 20px;text-decoration:none">Open your passes</a>
<p style="font-size:12px;color:#686053;margin-top:24px">Show the QR code on each pass at the entrance. Life is happening. Go be part of it.</p>
</div></div>`;
}

export function refundHtml(
  b: { reference: string; eventSnapshot: any },
  p: { amount?: number }
): string {
  const amt = p?.amount ? `₹${(p.amount / 100).toFixed(2)}` : "your payment";
  const ev = b.eventSnapshot || {};
  return `<div style="background:#FAF7F2;padding:32px;font-family:Helvetica,Arial,sans-serif;color:#181614">
<div style="max-width:560px;margin:auto;background:#fff;border:1px solid #E9E2D6;padding:32px">
<p style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#686053;margin:0">TRAILRZ · Refund Processed</p>
<h1 style="font-family:Georgia,serif;font-weight:400;font-size:28px;margin:12px 0">${escapeHtml(ev.title || "Experience")}</h1>
<p style="margin:0 0 20px;color:#686053">Booking reference <b style="font-family:monospace">${escapeHtml(b.reference)}</b></p>
<p style="margin:0 0 16px">Your refund of <b>${escapeHtml(amt)}</b> has been processed by the bank. The funds should reflect in your original payment method in 5–7 business days.</p>
<p style="font-size:12px;color:#686053;margin-top:24px">Admission passes for this booking have been voided and will be refused at the entrance.</p>
</div></div>`;
}

export function broadcastHtml(
  b: { reference: string; eventSnapshot: any },
  subject: string,
  message: string
): string {
  const ev = b.eventSnapshot || {};
  return `<div style='font-family:Helvetica,Arial;padding:24px;background:#FAF7F2;color:#181614'>
<p style='font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#686053'>TRAILRZ · ${escapeHtml(ev.title || "Experience")}</p>
<h2 style='font-family:Georgia,serif;font-weight:400'>${escapeHtml(subject)}</h2>
<p style='white-space:pre-line'>${escapeHtml(message)}</p>
<p style='color:#686053;font-size:12px'>Booking ${escapeHtml(b.reference)}</p>
</div>`;
}

export async function queueEmail(
  booking: { id: string; reference: string; eventId: string; customerSnapshot: any },
  kind: string,
  subject: string,
  html: string
) {
  const to = booking.customerSnapshot?.email || "";
  const notif = await prisma.notification.create({
    data: {
      id: newId(),
      channel: "email",
      kind,
      bookingId: booking.id,
      bookingReference: booking.reference,
      eventId: booking.eventId,
      to,
      subject,
      html,
      status: "queued",
      attempts: 0,
    },
  });

  // In production/runtime, await dispatch so serverless runtimes don't terminate before sending.
  if (process.env.NODE_ENV !== "test") {
    await sendNotification(notif.id).catch((err) => {
      console.error("Failed to send queued notification:", notif.id, err);
    });
  }

  return notif;
}

export async function sendNotification(nid: string) {
  const notif = await prisma.notification.findUnique({
    where: { id: nid },
  });

  if (!notif || !["queued", "failed", "not_configured"].includes(notif.status)) {
    return;
  }

  await prisma.notification.update({
    where: { id: nid },
    data: { status: "sending", attempts: { increment: 1 } },
  });

  if (!resendReady()) {
    await prisma.notification.update({
      where: { id: nid },
      data: { status: "not_configured", lastError: "Email provider not configured" },
    });
    return;
  }

  try {
    const resend = new Resend(getResendApiKey());
    const result = await resend.emails.send({
      from: getMailFrom(),
      to: [notif.to],
      subject: notif.subject,
      html: notif.html,
    });

    const providerId = result.data?.id || null;
    await prisma.notification.update({
      where: { id: nid },
      data: { status: "sent", providerId, lastError: null },
    });
  } catch (err: any) {
    await prisma.notification.update({
      where: { id: nid },
      data: { status: "failed", lastError: String(err?.message || err).slice(0, 300) },
    });
  }
}
