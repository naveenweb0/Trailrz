"use client";


import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { api, errMsg, passStore, fmtDay } from "@/lib/api";
import { useSeo } from "@/lib/seo";
import { PassBundle } from "@/views/public/BookingSuccess";
import { Loading } from "@/components/common/States";

export default function MyTickets() {
  useSeo("My Passes", "Retrieve your TRAILRZ admission passes without an account.");
  const [params] = useSearchParams();
  const [f, setF] = useState({ reference: params.get("ref") || "", email: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [bundle, setBundle] = useState(null);
  const saved = passStore.all();

  const lookup = async (body) => {
    setBusy(true);
    try {
      const { data } = await api.post("/tickets/lookup", body);
      passStore.add({ id: data.id, reference: data.reference, key: data.access_key, title: data.event.title, start_at: data.event.start_at });
      setBundle(data);
      window.scrollTo(0, 0);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (params.get("ref") && params.get("key")) lookup({ reference: params.get("ref"), key: params.get("key") });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (bundle)
    return (
      <div className="wrap py-14" data-testid="my-tickets-result">
        <button data-testid="my-tickets-back" onClick={() => setBundle(null)} className="text-sm link-u mb-10 no-print">← Find another booking</button>
        <PassBundle b={bundle} />
        <p className="text-sm text-mineral mt-10 no-print">Need help? <Link to="/contact" className="underline">Contact TRAILRZ support</Link> with your booking reference.</p>
      </div>
    );
  return (
    <div className="wrap py-14 grid lg:grid-cols-12 gap-14" data-testid="my-tickets-page">
      <div className="lg:col-span-6">
        <p className="eyebrow">Ticket vault</p>
        <h1 className="font-display text-5xl sm:text-6xl mt-3 leading-none">My Passes</h1>
        <p className="text-mineral mt-5 max-w-md">No account needed. Enter your booking reference with the email and mobile number used at checkout — all three must match.</p>
        {busy && <Loading label="Looking up" />}
        <form onSubmit={(e) => { e.preventDefault(); lookup(f); }} className="mt-10 space-y-5 max-w-md">
          {[["reference", "Booking reference", "text", "TRZ-XXXXXX"], ["email", "Email address", "email", ""], ["phone", "Mobile number", "tel", "+91"]].map(([k, l, t, ph]) => (
            <label key={k} className="block"><span className="text-sm font-medium">{l}</span>
              <input data-testid={`lookup-${k}-input`} required type={t} placeholder={ph} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className={`field mt-2 ${k === "reference" ? "font-serial uppercase" : ""}`} /></label>
          ))}
          <button data-testid="lookup-submit" disabled={busy} className="btn-ink">Retrieve passes</button>
        </form>
      </div>
      <div className="lg:col-span-5 lg:col-start-8">
        <p className="eyebrow">On this device</p>
        {saved.length === 0 ? <p className="text-sm text-mineral mt-4">Bookings you make on this browser will appear here for quick access.</p> : (
          <ul className="mt-4 border-t hairline">
            {saved.map((s) => (
              <li key={s.id}>
                <button data-testid={`saved-pass-${s.reference}`} onClick={() => lookup({ reference: s.reference, key: s.key })} className="w-full text-left py-5 border-b hairline group">
                  <p className="font-display text-2xl group-hover:underline underline-offset-4 decoration-1">{s.title}</p>
                  <p className="text-sm text-mineral mt-1">{fmtDay(s.start_at)} · <span className="font-serial">{s.reference}</span></p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
