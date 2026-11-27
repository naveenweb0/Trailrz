"use client";

import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { api, useLoad, errMsg, inr, fmtDay, fmtTime, passStore } from "@/lib/api";
import { useSeo } from "@/lib/seo";
import { Loading, ErrorState, Empty } from "@/components/common/States";

const keyFor = (id) => {
  try {
    return typeof window !== "undefined" ? sessionStorage.getItem(`trz_hold_${id}`) : null;
  } catch {
    return null;
  }
};

function Summary({ title, venue, start, items, amount }) {
  return (
    <div className="bg-surface border hairline p-6 sm:p-8" data-testid="booking-summary">
      <p className="eyebrow">Your selection</p>
      <h2 className="font-display text-3xl mt-3 leading-tight">{title}</h2>
      <p className="text-sm text-mineral mt-2">{fmtDay(start)}, {fmtTime(start)} · {venue}</p>
      <div className="mt-6 border-t hairline">
        {items.map((i) => (
          <div key={i.name} className="flex justify-between py-3 border-b hairline text-sm"><span>{i.quantity} × {i.name}</span><span className="tabular">{inr(i.unit_price * i.quantity)}</span></div>
        ))}
      </div>
      <div className="flex justify-between items-baseline mt-5"><span className="text-sm">Total</span><span className="font-display text-3xl tabular" data-testid="summary-total">{inr(amount)}</span></div>
      <p className="text-xs text-mineral mt-2">Prices are confirmed by our server. Taxes, if any, are included.</p>
    </div>
  );
}

function DetailsStep({ slug, sel }) {
  const nav = useNavigate();
  const [, setParams] = useSearchParams();
  const { data: e, loading, error } = useLoad(async () => (await api.get(`/public/events/${slug}`)).data, [slug]);
  const [f, setF] = useState({ name: "", email: "", phone: "", consent: false, terms: false });
  const [busy, setBusy] = useState(false);
  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} />;
  const items = sel.map(([id, q]) => ({ t: e.tiers.find((t) => t.id === id), q })).filter((x) => x.t && x.q > 0)
    .map(({ t, q }) => ({ ticket_type_id: t.id, name: t.name, unit_price: t.price, quantity: q }));
  if (!items.length) return <Empty title="No passes selected." action={<Link className="btn-line" to={`/events/${slug}`}>Choose passes</Link>} />;
  const amount = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const submit = async (ev) => {
    ev.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/checkout/hold", {
        event_id: e.id, items: items.map(({ ticket_type_id, quantity }) => ({ ticket_type_id, quantity })),
        customer: { name: f.name, email: f.email, phone: f.phone }, marketing_consent: f.consent,
      });
      try { sessionStorage.setItem(`trz_hold_${data.id}`, data.access_key); } catch {}
      setParams({ booking: data.id, key: data.access_key });
    } catch (err) {
      toast.error(errMsg(err));
      if (err?.response?.status === 409) nav(`/events/${slug}`);
    } finally {
      setBusy(false);
    }
  };
  const input = (k, label, type, auto, extra = {}) => (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input data-testid={`checkout-${k}-input`} type={type} autoComplete={auto} required value={f[k]} onChange={(x) => setF({ ...f, [k]: x.target.value })} className="field mt-2" {...extra} />
    </label>
  );
  return (
    <div className="grid lg:grid-cols-12 gap-12">
      <form onSubmit={submit} className="lg:col-span-7 space-y-6" data-testid="checkout-details-form">
        <div><p className="eyebrow">Step 1 of 2</p><h1 className="font-display text-5xl mt-3">Who's coming?</h1>
          <p className="text-mineral mt-3">No account needed. We'll send your passes to this email; your mobile number lets you retrieve them later.</p></div>
        {input("name", "Full name", "text", "name", { minLength: 2 })}
        <div className="grid sm:grid-cols-2 gap-6">
          {input("email", "Email address", "email", "email")}
          {input("phone", "Mobile number", "tel", "tel", { pattern: "[+0-9 \\-]{10,16}", title: "10-digit mobile number", placeholder: "+91 98765 43210" })}
        </div>
        <label className="flex gap-3 text-sm"><input type="checkbox" data-testid="checkout-terms" required checked={f.terms} onChange={(x) => setF({ ...f, terms: x.target.checked })} className="mt-1 accent-[#181614]" />
          <span>I agree to the <Link to="/terms" className="underline" target="_blank">terms</Link> and <Link to="/refund-policy" className="underline" target="_blank">refund policy</Link>.</span></label>
        <label className="flex gap-3 text-sm text-mineral"><input type="checkbox" data-testid="checkout-consent" checked={f.consent} onChange={(x) => setF({ ...f, consent: x.target.checked })} className="mt-1 accent-[#181614]" />
          <span>Send me the occasional TRAILRZ letter (optional).</span></label>
        <button data-testid="checkout-hold-submit" disabled={busy} className="btn-ink w-full sm:w-auto">{busy ? "Holding your passes…" : "Hold passes & review"}</button>
      </form>
      <aside className="lg:col-span-5"><Summary title={e.title} venue={e.venue} start={e.start_at} items={items} amount={amount} /></aside>
    </div>
  );
}

function useCountdown(until) {
  const [left, setLeft] = useState(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const compute = () => Math.max(0, new Date(until).getTime() - Date.now());
    setLeft(compute());
    const t = setInterval(() => setLeft(compute()), 1000);
    return () => clearInterval(t);
  }, [until]);
  return mounted ? left : 600000;
}

const loadRazorpay = () => new Promise((res, rej) => {
  if (typeof window === "undefined") return rej(new Error("Browser required"));
  if (window.Razorpay) return res();
  const s = document.createElement("script");
  s.src = "https://checkout.razorpay.com/v1/checkout.js";
  s.async = true;
  const timer = setTimeout(() => {
    s.remove();
    rej(new Error("Payment window timed out. Check your connection and try again."));
  }, 15000);
  s.onload = () => {
    clearTimeout(timer);
    res();
  };
  s.onerror = () => {
    clearTimeout(timer);
    s.remove();
    rej(new Error("Could not load the payment window"));
  };
  document.body.appendChild(s);
});

function PayStep({ b, k, reload }) {
  const nav = useNavigate();
  const left = useCountdown(b.hold_expires_at);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const expired = left <= 0 || b.status === "expired" || b.status === "cancelled";
  const mm = String(Math.floor(left / 60000)).padStart(2, "0");
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
  const done = () => {
    passStore.add({ id: b.id, reference: b.reference, key: k, title: b.event.title, start_at: b.event.start_at });
    nav(`/booking/success?id=${b.id}&key=${k}`);
  };
  const pay = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const { data } = await api.post(`/checkout/${b.id}/pay`, {}, { headers: { "X-Booking-Key": k } });
      if (data.status === "confirmed") return done();
      await loadRazorpay();
      const rzp = new window.Razorpay({
        key: data.key_id, order_id: data.order_id, amount: data.amount, currency: data.currency, name: data.name, description: data.description,
        prefill: data.prefill, theme: { color: "#181614" },
        handler: async (resp) => {
          try {
            await api.post(`/checkout/${b.id}/verify`, resp, { headers: { "X-Booking-Key": k } });
            done();
          } catch (err) {
            setNotice(errMsg(err));
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rzp.on("payment.failed", (r) => setNotice(r?.error?.description || "Payment failed. You have not been charged twice — try again."));
      rzp.open();
    } catch (err) {
      setNotice(errMsg(err));
      setBusy(false);
      if (err?.response?.status === 409) reload();
    }
  };
  const cancel = async () => {
    await api.post(`/checkout/${b.id}/release`, {}, { headers: { "X-Booking-Key": k } }).catch(() => {});
    nav(`/events/${b.event.slug}`);
  };
  if (b.status === "confirmed") return <Empty title="This booking is confirmed." action={<button className="btn-ink" onClick={done}>View your passes</button>} />;
  return (
    <div className="grid lg:grid-cols-12 gap-12">
      <div className="lg:col-span-7">
        <p className="eyebrow">Step 2 of 2</p>
        <h1 className="font-display text-5xl mt-3">Review & pay</h1>
        <div className={`mt-8 border-l-2 pl-5 py-2 ${expired ? "border-invalid" : "border-beam"}`} data-testid="hold-timer" aria-live="polite">
          {expired ? (
            <><p className="font-medium">Your hold has expired.</p><p className="text-sm text-mineral mt-1">The passes were released for others. You can select them again if still available.</p>
              <Link to={`/events/${b.event.slug}`} className="btn-line mt-4" data-testid="hold-expired-back">Choose passes again</Link></>
          ) : (
            <><p className="text-sm text-mineral">Passes held for you for</p><p className="font-display text-5xl tabular mt-1" data-testid="hold-countdown" suppressHydrationWarning>{mm}:{ss}</p>
              <p className="text-sm text-mineral mt-1">Not confirmed until payment is verified.</p></>
          )}
        </div>
        <dl className="mt-10 grid sm:grid-cols-2 gap-6 text-sm border-t hairline pt-6">
          <div><dt className="eyebrow">Name</dt><dd className="mt-1">{b.customer.name}</dd></div>
          <div><dt className="eyebrow">Email</dt><dd className="mt-1">{b.customer.email}</dd></div>
          <div><dt className="eyebrow">Mobile</dt><dd className="mt-1">{b.customer.phone}</dd></div>
          <div><dt className="eyebrow">Reference</dt><dd className="mt-1 font-serial">{b.reference}</dd></div>
        </dl>
        {notice && <p role="alert" data-testid="payment-notice" className="mt-8 border-l-2 border-invalid pl-4 py-2 text-sm">{notice}</p>}
        {!expired && b.payment_required && !b.payments_enabled && !notice && (
          <p data-testid="payments-not-configured" className="mt-8 border-l-2 border-dup pl-4 py-2 text-sm">Online payments are being set up. Your passes are held, but paid bookings can't be completed just yet.</p>
        )}
        {!expired && (
          <div className="flex flex-wrap gap-4 mt-10">
            <button data-testid="checkout-pay-button" onClick={pay} disabled={busy || (b.payment_required && !b.payments_enabled)} className="btn-ink">
              {busy ? "Processing…" : b.payment_required ? `Pay ${inr(b.amount)} securely` : "Confirm free passes"}
            </button>
            <button data-testid="checkout-cancel-hold" onClick={cancel} className="text-sm underline underline-offset-4">Release hold</button>
          </div>
        )}
        {b.payment_required && <p className="text-xs text-mineral mt-4">Payments are processed by Razorpay. TRAILRZ never sees your card details.</p>}
      </div>
      <aside className="lg:col-span-5"><Summary title={b.event.title} venue={b.event.venue} start={b.event.start_at} items={b.items} amount={b.amount} /></aside>
    </div>
  );
}

function HoldLoader({ id }) {
  const [params] = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [k, setK] = useState(() => (typeof window !== "undefined" ? params.get("key") || keyFor(id) : null));

  useEffect(() => {
    const found = params.get("key") || keyFor(id);
    setK(found);
    setMounted(true);
  }, [id, params]);

  const { data, loading, error, reload } = useLoad(
    async () => {
      if (!k) return null;
      return (await api.get(`/checkout/${id}?key=${k}`)).data;
    },
    [id, k]
  );

  if (!mounted) return <Loading />;
  if (!k) return <Empty title="This checkout session has ended." action={<Link to="/discover" className="btn-line">Discover experiences</Link>}>Holds are tied to the browser tab they were created in.</Empty>;
  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <Loading />;
  return <PayStep b={data} k={k} reload={reload} />;
}

export default function Checkout() {
  useSeo("Checkout", "Reserve your passes.");
  const [params] = useSearchParams();
  const booking = params.get("booking");
  const sel = (params.get("sel") || "").split(",").filter(Boolean).map((s) => { const [id, q] = s.split(":"); return [id, Number(q)]; });
  return (
    <div className="wrap py-12" data-testid="checkout-page">
      {booking ? <HoldLoader id={booking} /> : params.get("event") ? <DetailsStep slug={params.get("event")} sel={sel} /> : <Empty title="Nothing to check out." action={<Link to="/discover" className="btn-line">Discover experiences</Link>} />}
    </div>
  );
}
