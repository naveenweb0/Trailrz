import { Resend } from "resend";
import QRCode from "qrcode";
import { prisma } from "./prisma";
import { getAppUrl, getMailFrom, getResendApiKey, getSupportEmail } from "./env";
import { newId } from "./constants";
import { qrSign } from "./qr";

export interface ResendAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
  contentId: string;
}

export interface ResendEmailClient {
  emails: {
    send: (payload: {
      from: string;
      to: string[];
      subject: string;
      html: string;
      attachments?: ResendAttachment[];
    }) => Promise<{ data?: { id?: string } | null; error?: { message?: string; name?: string; statusCode?: number | null } | null }>;
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailAddress(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 320) return false;
  return EMAIL_RE.test(trimmed);
}

export function extractSenderAddress(mailFrom: string): string {
  const trimmed = mailFrom.trim();
  const angleMatch = trimmed.match(/<([^<>]+)>/);
  return (angleMatch ? angleMatch[1] : trimmed).trim();
}

export function isValidMailFrom(mailFrom: unknown): boolean {
  if (typeof mailFrom !== "string") return false;
  const addr = extractSenderAddress(mailFrom);
  return isValidEmailAddress(addr);
}

export function resendReady(): boolean {
  const apiKey = getResendApiKey().trim();
  const mailFrom = getMailFrom().trim();
  return Boolean(apiKey && mailFrom && isValidMailFrom(mailFrom));
}

function escapeHtml(val: unknown): string {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface ConfirmationBookingInput {
  reference: string;
  accessKey: string;
  eventSnapshot: any;
  customerSnapshot?: any;
  items?: any;
  amount?: number | null;
  paymentStatus?: string | null;
}

export interface ConfirmationTicketInput {
  id?: string;
  serial: string;
  tierName: string;
  holderName?: string;
  status?: string;
}

function formatEventDate(startAt?: string | Date | null): string {
  if (!startAt) return "TBA";
  const d = new Date(startAt);
  if (Number.isNaN(d.getTime())) return "TBA";
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function formatEventTime(startAt?: string | Date | null): string {
  if (!startAt) return "TBA";
  const d = new Date(startAt);
  if (Number.isNaN(d.getTime())) return "TBA";
  return d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

function resolveImageUrl(rawUrl: unknown, safeBase: string): string {
  if (typeof rawUrl !== "string") return "";
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) {
    return safeBase ? `${safeBase}${trimmed}` : "";
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return "";
}

function summarizeTicketCategories(tickets: ConfirmationTicketInput[]): string {
  if (tickets.length === 0) return "General Admission";
  const counts = new Map<string, number>();
  for (const t of tickets) {
    const name = (t.tierName || "Pass").trim();
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  if (counts.size === 1 && tickets.length === 1) {
    return Array.from(counts.keys())[0];
  }
  return Array.from(counts.entries())
    .map(([name, qty]) => (qty > 1 ? `${name} × ${qty}` : name))
    .join(", ");
}

export function confirmationHtml(
  b: ConfirmationBookingInput,
  tickets: ConfirmationTicketInput[]
): string {
  const safeBase = getAppUrl().replace(/["'<>]/g, "");
  const passesUrl = `${safeBase}/my-tickets?ref=${encodeURIComponent(b.reference)}&key=${encodeURIComponent(b.accessKey)}`;

  const ev = b.eventSnapshot || {};
  const cust = b.customerSnapshot || {};

  const customerName = escapeHtml(cust.name || "Guest");
  const eventName = escapeHtml(ev.title || "Experience");
  const eventDate = escapeHtml(formatEventDate(ev.start_at || ev.startAt));
  const eventTime = escapeHtml(formatEventTime(ev.start_at || ev.startAt));
  const venueParts = [ev.venue, ev.city].filter(Boolean);
  const venueName = escapeHtml(venueParts.join(", ") || "Venue TBA");
  const venueAddress = escapeHtml(ev.address || venueParts.join(", ") || "Address TBA");

  const rawImageUrl = ev.cover_image?.url || ev.coverImage?.url || "";
  const resolvedImageUrl = resolveImageUrl(rawImageUrl, safeBase);
  const eventImageBlock = resolvedImageUrl
    ? `
            <!-- EVENT IMAGE -->
            <tr>
              <td style="padding:5px 25px 0;">
                <img
                  src="${escapeHtml(resolvedImageUrl)}"
                  width="510"
                  alt="${eventName}"
                  style="display:block;width:100%;height:auto;border-radius:12px;"
                />
              </td>
            </tr>`
    : "";

  const activeTickets = tickets.filter((t) => t.status !== "VOID");
  const displayTickets = activeTickets.length > 0 ? activeTickets : tickets;

  const bookingId = escapeHtml(b.reference);
  const ticketIdSummary = escapeHtml(
    displayTickets.length > 0
      ? displayTickets.map((t) => t.serial).join(", ")
      : b.reference
  );
  const ticketTypeSummary = escapeHtml(summarizeTicketCategories(displayTickets));
  const quantity = escapeHtml(String(displayTickets.length || 1));

  const amountPaise = typeof b.amount === "number" ? b.amount : 0;
  const totalAmount = escapeHtml(
    (amountPaise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })
  );
  const paymentBadge =
    amountPaise === 0 || b.paymentStatus === "not_required" ? "✓ CONFIRMED" : "✓ PAID";

  const supportEmail = escapeHtml(getSupportEmail());

  const qrCardsHtml = displayTickets
    .map((t, idx) => {
      const serial = escapeHtml(t.serial);
      const tier = escapeHtml(t.tierName || "Pass");
      const cid = t.id ? `qr-${String(t.id).replace(/[^a-zA-Z0-9_-]/g, "")}` : "";
      const qrCodeSrc = cid ? `cid:${cid}` : "";
      const passHeader =
        displayTickets.length > 1
          ? `<p style="font-size:10px;letter-spacing:2px;color:#df6554;font-weight:bold;margin:${idx === 0 ? "0" : "24px"} 0 10px;">PASS ${idx + 1} OF ${displayTickets.length} · ${tier.toUpperCase()}</p>`
          : "";

      const qrImageHtml = qrCodeSrc
        ? `
                <table
                  role="presentation"
                  align="center"
                  cellpadding="0"
                  cellspacing="0"
                  style="background:#ffffff;border:1px solid #e9e4dc;border-radius:15px;"
                >
                  <tr>
                    <td style="padding:15px;">
                      <img
                        src="${escapeHtml(qrCodeSrc)}"
                        width="210"
                        height="210"
                        alt="Unique TRAILRZ ticket QR code for ${serial}"
                        style="display:block;width:210px;height:210px;"
                      />
                    </td>
                  </tr>
                </table>`
        : "";

      return `${passHeader}${qrImageHtml}
                <p style="font-size:9px;letter-spacing:2px;color:#999;margin:20px 0 7px;">TICKET IDENTIFICATION</p>

                <p style="font-size:15px;font-weight:bold;letter-spacing:1px;color:#171717;margin:0;">
                  ${serial}
                </p>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>Your TRAILRZ Experience Pass</title>
  </head>

  <body style="margin:0;padding:0;background:#f2eee8;font-family:Arial,Helvetica,sans-serif;color:#171717;">
    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="background:#f2eee8;padding:35px 12px;"
    >
      <tr>
        <td align="center">
          <table
            role="presentation"
            width="100%"
            cellpadding="0"
            cellspacing="0"
            border="0"
            style="max-width:560px;background:#fffdf9;border-radius:18px;overflow:hidden;"
          >
            <!-- HEADER -->
            <tr>
              <td style="background:#171717;padding:30px 32px 27px;">
                <table width="100%" role="presentation">
                  <tr>
                    <td>
                      <p
                        style="font-family:Georgia,serif;font-size:32px;letter-spacing:3px;font-weight:bold;color:#fff;margin:0;"
                      >
                        TRAILRZ
                      </p>
                      <p style="font-size:9px;letter-spacing:2.8px;color:#c9c3ba;margin:9px 0 0;">
                        EXPERIENCES · FOOD · EVENTS · TRAVEL
                      </p>
                    </td>
                    <td align="right" valign="middle">
                      <span
                        style="background:#e85d4a;color:#fff;padding:9px 12px;border-radius:20px;font-size:9px;font-weight:bold;letter-spacing:1px;"
                      >
                        YOUR PASS
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- INTRO -->
            <tr>
              <td style="padding:35px 30px 22px;">
                <p style="font-size:10px;font-weight:bold;letter-spacing:2px;color:#df6554;margin:0 0 15px;">
                  ✦ YOUR BOOKING IS CONFIRMED
                </p>

                <h1
                  style="font-family:Georgia,serif;font-size:34px;line-height:1.2;font-weight:normal;margin:0;color:#171717;"
                >
                  Good plans.<br />
                  Great memories.
                </h1>

                <p style="font-size:14px;color:#777;line-height:1.8;margin:18px 0 0;">
                  Hey ${customerName},<br />
                  Your spot is secured. We've saved a place for you at something special. Here's your official TRAILRZ
                  experience pass.
                </p>
              </td>
            </tr>
${eventImageBlock}

            <!-- EVENT DETAILS -->
            <tr>
              <td style="padding:24px 30px 26px;">
                <p style="font-size:10px;letter-spacing:2px;color:#df6554;font-weight:bold;margin:0 0 10px;">
                  THE EXPERIENCE
                </p>

                <h2
                  style="font-family:Georgia,serif;font-size:27px;font-weight:normal;line-height:1.3;margin:0 0 19px;color:#171717;"
                >
                  ${eventName}
                </h2>

                <table width="100%" role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:7px 0;font-size:13px;color:#777;">DATE</td>
                    <td align="right" style="padding:7px 0;font-size:13px;color:#171717;font-weight:bold;">
                      ${eventDate}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;font-size:13px;color:#777;">TIME</td>
                    <td align="right" style="padding:7px 0;font-size:13px;color:#171717;font-weight:bold;">
                      ${eventTime}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;font-size:13px;color:#777;">VENUE</td>
                    <td align="right" style="padding:7px 0;font-size:13px;color:#171717;font-weight:bold;">
                      ${venueName}
                    </td>
                  </tr>
                </table>

                <p style="font-size:12px;color:#888;line-height:1.7;margin:13px 0 0;">📍 ${venueAddress}</p>
              </td>
            </tr>

            <!-- TICKET STUB -->
            <tr>
              <td style="padding:0 25px;">
                <table
                  width="100%"
                  role="presentation"
                  cellpadding="0"
                  cellspacing="0"
                  style="background:#f6f1e9;border-radius:13px;"
                >
                  <tr>
                    <td style="padding:21px 22px 15px;">
                      <p style="font-size:10px;letter-spacing:2px;color:#999;margin:0 0 16px;font-weight:bold;">
                        BOOKING DETAILS
                      </p>

                      <table width="100%" role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="font-size:12px;color:#888;padding:7px 0;">Booking reference</td>
                          <td align="right" style="font-size:12px;color:#171717;font-weight:bold;">${bookingId}</td>
                        </tr>
                        <tr>
                          <td style="font-size:12px;color:#888;padding:7px 0;">Ticket ID</td>
                          <td align="right" style="font-size:12px;color:#171717;font-weight:bold;">${ticketIdSummary}</td>
                        </tr>
                        <tr>
                          <td style="font-size:12px;color:#888;padding:7px 0;">Ticket category</td>
                          <td align="right" style="font-size:12px;color:#171717;font-weight:bold;">
                            ${ticketTypeSummary}
                          </td>
                        </tr>
                        <tr>
                          <td style="font-size:12px;color:#888;padding:7px 0;">Quantity</td>
                          <td align="right" style="font-size:12px;color:#171717;font-weight:bold;">${quantity}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 15px;">
                      <div style="border-top:2px dashed #d9d0c4;font-size:1px;line-height:1px;">&nbsp;</div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:17px 22px 22px;">
                      <table width="100%" role="presentation">
                        <tr>
                          <td valign="middle">
                            <p style="font-size:10px;color:#999;letter-spacing:1.5px;margin:0 0 5px;">TOTAL PAID</p>
                            <p style="font-size:25px;font-weight:bold;color:#df6554;margin:0;">₹${totalAmount}</p>
                          </td>
                          <td align="right" valign="middle">
                            <span
                              style="background:#e4eee4;color:#34774c;font-size:10px;font-weight:bold;padding:8px 10px;border-radius:20px;"
                            >
                              ${paymentBadge}
                            </span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- QR EXPERIENCE PASS -->
            <tr>
              <td style="padding:32px 30px 35px;text-align:center;">
                <p style="font-size:10px;letter-spacing:2.5px;color:#df6554;font-weight:bold;margin:0 0 10px;">
                  YOUR ENTRY PASS
                </p>

                <h2 style="font-family:Georgia,serif;font-size:27px;font-weight:normal;margin:0 0 10px;">
                  This is your way in.
                </h2>

                <p style="font-size:13px;line-height:1.7;color:#888;margin:0 0 22px;">
                  Present your unique QR code at the entrance. Our event team will scan it to verify your ticket.
                </p>
                ${qrCardsHtml}

                <p style="font-size:11px;color:#999;line-height:1.7;margin:14px 0 0;">
                  Your ticket is unique. Keep this QR code private and do not share it.
                </p>

                <div style="margin-top:22px;">
                  <a
                    href="${escapeHtml(passesUrl)}"
                    style="display:inline-block;background:#171717;color:#fffdf9;padding:13px 26px;border-radius:999px;font-size:12px;font-weight:bold;letter-spacing:1px;text-decoration:none;"
                  >
                    Open your passes
                  </a>
                </div>
              </td>
            </tr>

            <!-- ENTRY REMINDER -->
            <tr>
              <td style="background:#171717;padding:25px 30px;">
                <p style="font-size:10px;color:#e77b68;letter-spacing:2px;font-weight:bold;margin:0 0 12px;">
                  A LITTLE REMINDER
                </p>

                <h3 style="font-family:Georgia,serif;font-size:22px;color:#fff;font-weight:normal;margin:0 0 13px;">
                  Come for the experience.
                  <br />Leave with a memory.
                </h3>

                <p style="font-size:12px;color:#c4c0bb;line-height:1.9;margin:0;">
                  01 &nbsp; Keep your QR ticket ready.<br />
                  02 &nbsp; Arrive before the event begins.<br />
                  03 &nbsp; Present your ticket at entry.<br />
                  04 &nbsp; Enjoy every moment.
                </p>
              </td>
            </tr>

            <!-- SUPPORT -->
            <tr>
              <td style="padding:25px 30px;background:#fffdf9;">
                <p style="font-family:Georgia,serif;font-size:20px;margin:0 0 8px;">Need a hand?</p>

                <p style="font-size:12px;line-height:1.8;color:#888;margin:0;">
                  For booking assistance, reach out to us at:
                  <br />
                  <a href="mailto:${supportEmail}" style="color:#df6554;text-decoration:none;font-weight:bold;">
                    ${supportEmail}
                  </a>
                </p>
              </td>
            </tr>

            <!-- FOOTER -->
            <tr>
              <td style="background:#171717;text-align:center;padding:28px 20px;">
                <p style="font-family:Georgia,serif;font-size:25px;letter-spacing:4px;color:#fff;margin:0;">TRAILRZ</p>

                <p style="font-size:10px;letter-spacing:2px;color:#aaa;margin:10px 0 16px;">
                  DISCOVER. EXPERIENCE. REMEMBER.
                </p>

                <div style="width:35px;border-top:2px solid #e85d4a;margin:0 auto 16px;"></div>

                <p style="font-size:10px;color:#888;margin:0;">Made for moments worth remembering.</p>

                <p style="font-size:10px;color:#777;margin:12px 0 0;">© 2026 TRAILRZ. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
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
  const to = String(booking.customerSnapshot?.email || "").trim();
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

function formatProviderError(err: unknown): string {
  if (!err) return "Unknown email provider error";
  if (typeof err === "string") return err.slice(0, 500);
  const e = err as { message?: string; name?: string; statusCode?: number };
  const parts: string[] = [];
  if (e.statusCode) parts.push(`[${e.statusCode}]`);
  if (e.name) parts.push(`${e.name}:`);
  parts.push(e.message || String(err));
  return parts.join(" ").trim().slice(0, 500);
}

export async function sendNotification(
  nid: string,
  options?: { client?: ResendEmailClient }
) {
  const notif = await prisma.notification.findUnique({
    where: { id: nid },
  });

  if (!notif || !["queued", "failed", "not_configured"].includes(notif.status)) {
    return;
  }

  // Atomic claim so concurrent callers cannot send duplicate emails
  const claimed = await prisma.notification.updateMany({
    where: {
      id: nid,
      status: { in: ["queued", "failed", "not_configured"] },
    },
    data: {
      status: "sending",
      attempts: { increment: 1 },
    },
  });

  if (claimed.count === 0) {
    return;
  }

  const recipient = (notif.to || "").trim();
  if (!isValidEmailAddress(recipient)) {
    await prisma.notification.update({
      where: { id: nid },
      data: {
        status: "failed",
        providerId: null,
        lastError: "Invalid or missing recipient email address",
      },
    });
    return;
  }

  const apiKey = getResendApiKey().trim();
  const mailFrom = getMailFrom().trim();

  if (!apiKey) {
    await prisma.notification.update({
      where: { id: nid },
      data: {
        status: "not_configured",
        providerId: null,
        lastError: "RESEND_API_KEY is not configured",
      },
    });
    return;
  }

  if (!mailFrom || !isValidMailFrom(mailFrom)) {
    await prisma.notification.update({
      where: { id: nid },
      data: {
        status: "not_configured",
        providerId: null,
        lastError: !mailFrom
          ? "MAIL_FROM is not configured"
          : "MAIL_FROM is not a valid sender address",
      },
    });
    return;
  }

async function buildInlineQrAttachments(html: string): Promise<ResendAttachment[]> {
  const seen = new Set<string>();
  const attachments: ResendAttachment[] = [];
  const matches = html.matchAll(/src="cid:(qr-([a-zA-Z0-9_-]+))"/g);

  for (const match of matches) {
    const contentId = match[1];
    const ticketId = match[2];
    if (!contentId || !ticketId || seen.has(contentId)) continue;
    seen.add(contentId);

    const payload = qrSign(ticketId);
    const pngBuffer = await QRCode.toBuffer(payload, {
      type: "png",
      width: 420,
      margin: 2,
      errorCorrectionLevel: "M",
      color: {
        dark: "#171717",
        light: "#FFFFFF",
      },
    });

    attachments.push({
      filename: `${contentId}.png`,
      content: pngBuffer,
      contentType: "image/png",
      contentId,
    });
  }

  return attachments;
}

  try {
    const resend: ResendEmailClient = options?.client ?? new Resend(apiKey);
    const attachments = await buildInlineQrAttachments(notif.html);
    const result = await resend.emails.send({
      from: mailFrom,
      to: [recipient],
      subject: notif.subject,
      html: notif.html,
      ...(attachments.length > 0 ? { attachments } : {}),
    });

    if (result?.error) {
      const errorMsg = formatProviderError(result.error);
      console.error("Resend API returned error for notification", nid, errorMsg);
      await prisma.notification.update({
        where: { id: nid },
        data: {
          status: "failed",
          providerId: null,
          lastError: errorMsg,
        },
      });
      return;
    }

    const providerId = result?.data?.id || null;
    if (!providerId) {
      await prisma.notification.update({
        where: { id: nid },
        data: {
          status: "failed",
          providerId: null,
          lastError: "Email provider did not return a message ID",
        },
      });
      return;
    }

    await prisma.notification.update({
      where: { id: nid },
      data: { status: "sent", providerId, lastError: null },
    });
  } catch (err: unknown) {
    const errorMsg = formatProviderError(err);
    console.error("Resend send exception for notification", nid, errorMsg);
    await prisma.notification.update({
      where: { id: nid },
      data: { status: "failed", providerId: null, lastError: errorMsg },
    });
  }
}
