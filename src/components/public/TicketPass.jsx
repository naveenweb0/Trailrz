"use client";

import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import { Logo } from "@/components/brand/Logo";
import { fmtDay, fmtTime, fmtDT } from "@/lib/api";

const STATUS = {
  VALID: ["Valid for entry", "bg-[#e3efe2] text-[#1d5a32]"],
  REDEEMED: ["Admitted", "bg-tint text-mineral"],
  VOID: ["Void", "bg-[#f6e0dc] text-[#8a2a1d]"],
};

export function TicketPass({ t, booking, index, total }) {
  const [label, cls] = STATUS[t.status] || STATUS.VOID;
  const ev = booking.event;
  return (
    <motion.article data-testid={`ticket-pass-${t.serial}`} initial={{ opacity: 0, y: 40, rotateX: -12 }} animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.15 + index * 0.12 }} style={{ transformPerspective: 1200 }}
      className="pass-print bg-surface border hairline grid md:grid-cols-[1fr_auto] relative hover:shadow-[0_30px_60px_-35px_rgba(24,22,20,0.4)] transition-shadow duration-500">
      <div className="p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <Logo className="h-6" />
          <span className="eyebrow">Admission pass {index + 1} of {total}</span>
        </div>
        <h3 className="font-display text-3xl sm:text-4xl leading-tight mt-8">{ev.title}</h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 mt-6 text-sm">
          <div><dt className="eyebrow">Date</dt><dd className="mt-1">{fmtDay(ev.start_at)}</dd></div>
          <div><dt className="eyebrow">Doors</dt><dd className="mt-1">{fmtTime(ev.start_at)}</dd></div>
          <div className="col-span-2"><dt className="eyebrow">Venue</dt><dd className="mt-1">{ev.venue}, {ev.city}{ev.address ? ` — ${ev.address}` : ""}</dd></div>
          <div><dt className="eyebrow">Pass</dt><dd className="mt-1 font-medium">{t.tier_name}</dd></div>
          <div><dt className="eyebrow">Guest</dt><dd className="mt-1">{t.holder_name}</dd></div>
        </dl>
        <p className="text-xs text-mineral mt-8 leading-relaxed max-w-md">One pass admits one guest. Present this QR code at the entrance; it can be scanned once. Screenshots work, but please don't share them.</p>
      </div>
      <div className="relative md:w-[260px] border-t md:border-t-0 md:border-l border-dashed border-[#cfc5b3] p-6 sm:p-8 flex flex-col items-center justify-center gap-4 bg-parchment">
        <span className="hidden md:block absolute -top-3 -left-3 w-6 h-6 rounded-full bg-parchment border hairline" aria-hidden />
        <span className="hidden md:block absolute -bottom-3 -left-3 w-6 h-6 rounded-full bg-parchment border hairline" aria-hidden />
        {t.qr ? (
          <div className="bg-white p-3 border hairline"><QRCodeSVG value={t.qr} size={168} level="M" data-testid={`ticket-qr-${t.serial}`} /></div>
        ) : (
          <div className="w-[192px] h-[192px] border hairline flex items-center justify-center text-center text-sm text-mineral p-4">
            {t.status === "REDEEMED" ? `Admitted ${fmtDT(t.redeemed_at)}` : "This pass is no longer valid"}
          </div>
        )}
        <p className="font-serial text-sm" data-testid="ticket-serial">{t.serial}</p>
        <span className={`text-xs font-semibold px-2 py-1 ${cls}`} data-testid="ticket-status">{label}</span>
        <p className="text-[11px] text-mineral">Booking {booking.reference}</p>
      </div>
    </motion.article>
  );
}
