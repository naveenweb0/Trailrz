"use client";

import { Link, useSearchParams } from "react-router-dom";
import { Printer } from "lucide-react";
import { api, useLoad, inr, passStore } from "@/lib/api";
import { useSeo } from "@/lib/seo";
import { TicketPass } from "@/components/public/TicketPass";
import { Loading, ErrorState } from "@/components/common/States";

export function PassBundle({ b }) {
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6 no-print">
        <div>
          <p className="eyebrow">Booking {b.reference}</p>
          <h2 className="font-display text-4xl mt-2">{b.event.title}</h2>
          <p className="text-sm text-mineral mt-2">{b.tickets.length} {b.tickets.length === 1 ? "pass" : "passes"} · {inr(b.amount)} · sent to {b.customer.email}</p>
        </div>
        <button data-testid="passes-print-button" onClick={() => window.print()} className="btn-line"><Printer className="h-4 w-4" aria-hidden /> Print or save as PDF</button>
      </div>
      {b.status === "refund_due" && <p role="alert" data-testid="refund-due-notice" className="mt-6 border-l-2 border-dup pl-4 py-2 text-sm">Your payment arrived after the hold expired and the passes were no longer available, so no passes were issued. Our team has been alerted to refund you in full — please <Link to="/contact" className="underline">contact support</Link> with reference {b.reference} if you don't hear from us within 2 working days.</p>}
      <div className="mt-8 space-y-6">{b.tickets.map((t, i) => <TicketPass key={t.id} t={t} booking={b} index={i} total={b.tickets.length} />)}</div>
    </div>
  );
}

export default function BookingSuccess() {
  useSeo("Booking confirmed", "Your TRAILRZ passes.");
  const [p] = useSearchParams();
  const id = p.get("id"), key = p.get("key");
  const { data, loading, error, reload } = useLoad(async () => {
    if (!id || !key) {
      throw new Error("Missing booking details. Check your email or retrieve your passes in My Passes.");
    }
    const d = (await api.get(`/bookings/${id}?key=${encodeURIComponent(key)}`)).data;
    passStore.add({ id: d.id, reference: d.reference, key, title: d.event.title, start_at: d.event.start_at });
    return d;
  }, [id, key]);
  return (
    <div className="wrap py-14" data-testid="booking-success-page">
      {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={reload} /> : data.status === "refund_due" ? (
        <div className="max-w-3xl" data-testid="booking-refund-due">
          <h1 className="font-display text-5xl leading-tight">We couldn't secure your passes.</h1>
          <PassBundle b={data} />
        </div>
      ) : data.status !== "confirmed" ? (
        <ErrorState message="This booking hasn't been confirmed. If you paid, confirmation can take a minute — check My Passes shortly." onRetry={reload} />
      ) : (
        <>
          <div className="max-w-3xl mb-14 no-print">
            <span className="beam-wedge" aria-hidden />
            <h1 className="font-display text-5xl sm:text-7xl leading-[0.98] mt-5" data-testid="booking-success-title">You're in. See you there.</h1>
            <p className="text-mineral mt-5">Your booking is confirmed. Keep this page, or retrieve your passes anytime from <Link to="/my-tickets" className="underline">My Passes</Link> using your reference, email and mobile number.</p>
          </div>
          <PassBundle b={data} />
        </>
      )}
    </div>
  );
}
