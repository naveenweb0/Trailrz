"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api, errMsg, useLoad } from "@/lib/api";
import { useSeo } from "@/lib/seo";
import { useMeta } from "@/components/public/MetaContext";
import { EventFeature, OriginalMark } from "@/components/public/EventBits";
import { Loading, ErrorState, Empty } from "@/components/common/States";
import { Newsletter } from "@/views/public/Home";
import { SplitWords, ImageReveal, Reveal } from "@/components/motion/Motion";

export function Originals() {
  useSeo("TRAILRZ Originals", "Experiences commissioned and hosted by TRAILRZ.");
  const { data, loading, error, reload } = useLoad(async () => (await api.get("/public/events?original=true&limit=24")).data);
  return (
    <div data-testid="originals-page">
      <section className="bg-ink-deep text-parchment dark-zone">
        <div className="wrap py-24">
          <OriginalMark />
          <h1 className="font-display text-6xl sm:text-8xl mt-6 leading-[0.95] max-w-4xl"><SplitWords text="TRAILRZ Originals" /></h1>
          <p className="text-[#bdb3a3] text-lg mt-8 max-w-xl leading-relaxed">Evenings we commission, design and host ourselves. Small rooms, considered details, and hosts we'd trust with our own night out.</p>
        </div>
      </section>
      <div className="wrap py-20 space-y-24">
        {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={reload} /> : data.items.length === 0 ? (
          <Empty title="The first Original is in rehearsal.">Nothing is on sale yet. Subscribe below and we'll write when it is.</Empty>
        ) : data.items.map((e, i) => <EventFeature key={e.id} e={e} index={i} />)}
      </div>
      <Newsletter />
    </div>
  );
}

export function About() {
  useSeo("About", "TRAILRZ curates cultural experiences across Chandigarh, Mohali and Panchkula.");
  return (
    <div data-testid="about-page">
      <section className="wrap pt-14 grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7">
          <p className="eyebrow">About TRAILRZ</p>
          <h1 className="font-display text-6xl sm:text-7xl mt-4 leading-[0.98]"><SplitWords text="A flashlight for the city's best evenings." step={0.05} /></h1>
        </div>
        <p className="lg:col-span-4 lg:col-start-9 self-end text-mineral leading-relaxed">Our logo is a lamp throwing a beam. That's the job: point the light at rooms worth walking into, then get out of the way.</p>
      </section>
      <div className="wrap mt-14"><ImageReveal src="/img/slow-evenings.jpg" alt="A long dinner table set with candles" className="aspect-[21/9]" parallax={70} eager /></div>
      <section className="wrap mt-20 grid md:grid-cols-3 gap-12">
        {[["Curated, not crowded", "We list fewer experiences, chosen for their hosts, atmosphere and care."], ["Local first", "We begin in Chandigarh, Mohali and Panchkula — the places we know best."], ["Booking without friction", "No account needed. Honest availability, secure payment and passes that just work at the door."]].map(([t, d], i) => (
          <Reveal key={t} delay={i * 0.12} className="border-t-2 border-ink pt-6"><span className="font-serial text-xs text-mineral">{String(i + 1).padStart(2, "0")}</span><h2 className="font-display text-3xl mt-3">{t}</h2><p className="text-mineral mt-3 leading-relaxed">{d}</p></Reveal>
        ))}
      </section>
    </div>
  );
}

export function Contact() {
  useSeo("Contact", "Get in touch with TRAILRZ.");
  const { meta } = useMeta();
  const [f, setF] = useState({ name: "", email: "", topic: "Booking help", message: "" });
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/public/contact", f);
      setDone(true);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="wrap py-14 grid lg:grid-cols-12 gap-14" data-testid="contact-page">
      <div className="lg:col-span-5" id="help">
        <p className="eyebrow">Contact & help</p>
        <h1 className="font-display text-6xl mt-4 leading-none">Say hello.</h1>
        <p className="text-mineral mt-6 leading-relaxed">For booking help, include your booking reference. Hosts and venues who'd like to work with us are welcome too.</p>
        <dl className="mt-10 space-y-4 text-sm">
          {meta?.support_email && <div><dt className="eyebrow">Email</dt><dd><a className="link-u" href={`mailto:${meta.support_email}`}>{meta.support_email}</a></dd></div>}
          {meta?.support_phone && <div><dt className="eyebrow">Phone</dt><dd>{meta.support_phone}</dd></div>}
          <div><dt className="eyebrow">Lost your passes?</dt><dd><a href="/my-tickets" className="link-u">Retrieve them from My Passes</a></dd></div>
        </dl>
      </div>
      <div className="lg:col-span-6 lg:col-start-7">
        {done ? <p data-testid="contact-success" className="font-display text-4xl">Thank you — we'll reply by email.</p> : (
          <form onSubmit={submit} className="space-y-5" data-testid="contact-form">
            <div className="grid sm:grid-cols-2 gap-5">
              <label className="block"><span className="text-sm font-medium">Name</span><input data-testid="contact-name" required minLength={2} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="field mt-2" /></label>
              <label className="block"><span className="text-sm font-medium">Email</span><input data-testid="contact-email" required type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className="field mt-2" /></label>
            </div>
            <label className="block"><span className="text-sm font-medium">Topic</span>
              <select data-testid="contact-topic" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} className="field mt-2">
                {["Booking help", "Refunds", "Host an experience", "Partnerships", "Something else"].map((t) => <option key={t}>{t}</option>)}
              </select></label>
            <label className="block"><span className="text-sm font-medium">Message</span><textarea data-testid="contact-message" required minLength={10} rows={6} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} className="field h-auto py-3 mt-2" /></label>
            <button data-testid="contact-submit" disabled={busy} className="btn-ink">{busy ? "Sending…" : "Send message"}</button>
          </form>
        )}
      </div>
    </div>
  );
}

const LEGAL = {
  privacy: ["Privacy policy", [
    ["What we collect", "When you book, we collect your name, email address and mobile number, and the passes you choose. Payments are handled by Razorpay; we never receive or store card details."],
    ["Why", "To issue and deliver your passes, let you retrieve them, verify admission at the venue, and contact you about the experience you booked. With your consent only, we send our newsletter."],
    ["Your QR code", "Pass QR codes contain a signed identifier only — no personal information."],
    ["Retention & rights", "You may ask us to access, correct or delete your data by contacting us. Booking records required for tax and accounting are kept as the law requires."],
  ]],
  terms: ["Terms of use", [
    ["Bookings", "A booking is confirmed only after payment is verified (or immediately for free passes). Holds last 10 minutes and are released automatically."],
    ["Admission", "Each pass admits one guest once. Passes may be refused if voided, duplicated or presented for another event. Venue rules apply."],
    ["Changes", "Hosts may change details of an experience. We'll email you about important changes."],
    ["Liability", "TRAILRZ curates and sells passes; each experience is delivered by its host or venue."],
  ]],
  refund: ["Refund policy", [
    ["Cancelled experiences", "If an experience is cancelled, you'll receive a full refund to your original payment method."],
    ["Your cancellations", "Unless an experience's own cancellation policy says otherwise, passes are non-refundable but may be transferable — contact us."],
    ["Late payments", "If a payment lands after your hold expired and passes are no longer available, no passes are issued and the payment is refunded in full."],
    ["Timelines", "Refunds are initiated within 7 working days; your bank may take longer to reflect them."],
  ]],
};

export function Legal({ kind }) {
  const [title, sections] = LEGAL[kind];
  useSeo(title, `TRAILRZ ${title.toLowerCase()}.`);
  return (
    <div className="wrap py-14 max-w-3xl" data-testid={`legal-${kind}-page`}>
      <p className="eyebrow">Policies</p>
      <h1 className="font-display text-6xl mt-4">{title}</h1>
      <p className="text-xs text-mineral mt-4">Draft for review — please have these terms checked before launch.</p>
      <div className="mt-12 space-y-10">{sections.map(([h, p]) => <section key={h}><h2 className="font-display text-3xl">{h}</h2><p className="text-mineral mt-3 leading-relaxed">{p}</p></section>)}</div>
    </div>
  );
}
