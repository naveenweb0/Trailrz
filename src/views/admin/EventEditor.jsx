"use client";

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowUp, ArrowDown, Trash2, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { useStaff } from "@/views/admin/AdminLayout";
import { EventActions } from "@/views/admin/EventsAdmin";
import { errMsg, toLocalInput, fromLocalInput } from "@/lib/api";
import { PageHead, Pill } from "@/components/admin/AdminKit";
import { Loading, ErrorState } from "@/components/common/States";

const CATS = ["Music", "Food & Dining", "Art & Culture", "Comedy", "Workshops", "Nightlife", "Outdoor", "Family", "Social Experiences", "Theatre"];
const MOODS = ["Date Night", "With Friends", "Family Time", "Creative Escape", "Slow Evenings", "Food Lovers", "Music Nights", "Something Different"];
const DT = ["start_at", "end_at", "booking_opens_at", "booking_closes_at"];
const blankTier = () => ({ name: "General Admission", description: "", price: 0, capacity: 50, max_per_booking: 6, sale_starts_at: "", sale_ends_at: "", active: true });
const BLANK = { title: "", slug: "", category: "Music", moods: [], experience_type: "", is_original: false, short_description: "", description: "", organizer: "", city: "Chandigarh", venue: "", address: "", lat: "", lng: "",
  start_at: "", end_at: "", booking_opens_at: "", booking_closes_at: "", gate_key: "", gate_pin: "", cover_image: null, gallery: [], highlights: "", guidelines: "", why_attend: "", who_should_attend: "", what_to_expect: "", included: "", faqs: [], cancellation_policy: "", age_restriction: "", tiers: [blankTier()] };

function fromApi(e) {
  const f = {
    ...BLANK,
    ...e,
    highlights: (e.highlights || []).join("\n"),
    guidelines: (e.guidelines || []).join("\n"),
    who_should_attend: (e.who_should_attend || []).join("\n"),
    what_to_expect: (e.what_to_expect || []).join("\n"),
    included: (e.included || []).join("\n"),
    lat: e.lat ?? "",
    lng: e.lng ?? "",
  };
  DT.forEach((k) => { f[k] = toLocalInput(e[k]); });
  f.tiers = (e.tiers || []).map((t) => ({ ...t, price: t.price / 100, sale_starts_at: toLocalInput(t.sale_starts_at), sale_ends_at: toLocalInput(t.sale_ends_at) }));
  return f;
}

function toApi(f) {
  const b = {
    ...f,
    highlights: f.highlights.split("\n"),
    guidelines: f.guidelines.split("\n"),
    who_should_attend: (f.who_should_attend || "").split("\n"),
    what_to_expect: (f.what_to_expect || "").split("\n"),
    included: (f.included || "").split("\n"),
    lat: f.lat === "" ? null : Number(f.lat),
    lng: f.lng === "" ? null : Number(f.lng),
  };
  DT.forEach((k) => { b[k] = fromLocalInput(f[k]); });
  b.tiers = f.tiers.map((t) => ({ ...t, price: Number(t.price), capacity: Number(t.capacity), max_per_booking: Number(t.max_per_booking), sale_starts_at: fromLocalInput(t.sale_starts_at), sale_ends_at: fromLocalInput(t.sale_ends_at) }));
  ["id", "status", "created_at", "updated_at", "created_by", "capacity", "sold", "reserved"].forEach((k) => delete b[k]);
  return b;
}

const Box = ({ title, children }) => <fieldset className="bg-surface border hairline p-5 mb-4"><legend className="eyebrow px-1">{title}</legend><div className="grid sm:grid-cols-2 gap-4 mt-2">{children}</div></fieldset>;
const F = ({ label, full, children }) => <label className={`block ${full ? "sm:col-span-2" : ""}`}><span className="text-xs font-medium">{label}</span><div className="mt-1">{children}</div></label>;

function useUploader() {
  const { http } = useStaff();
  return async (file) => {
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) throw new Error("Images only, up to 10 MB");
    const { data: s } = await http.get("/admin/media/signature");
    const fd = new FormData();
    Object.entries({ file, api_key: s.api_key, timestamp: s.timestamp, signature: s.signature, folder: s.folder }).forEach(([k, v]) => fd.append(k, v));
    const r = await fetch(`https://api.cloudinary.com/v1_1/${s.cloud_name}/image/upload`, { method: "POST", body: fd });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error?.message || "Upload failed");
    return { url: j.secure_url, public_id: j.public_id, alt: "" };
  };
}

function MediaPicker({ onAdd, testid }) {
  const upload = useUploader();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const onFiles = async (files) => {
    setBusy(true);
    for (const f of files) {
      try { onAdd(await upload(f)); } catch (e) { toast.error(e.response ? errMsg(e) : e.message); break; }
    }
    setBusy(false);
  };
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <label className="btn-line h-10 text-sm cursor-pointer"><Upload className="h-4 w-4" /> {busy ? "Uploading…" : "Upload"}
        <input type="file" accept="image/*" multiple className="sr-only" data-testid={`${testid}-file`} onChange={(e) => onFiles([...e.target.files])} /></label>
      <span className="text-xs text-mineral">or</span>
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste an https:// image URL" data-testid={`${testid}-url`} className="field h-10 text-sm flex-1 min-w-[200px]" />
      <button type="button" data-testid={`${testid}-url-add`} onClick={() => { if (/^https:\/\//.test(url)) { onAdd({ url, alt: "" }); setUrl(""); } else toast.error("Enter an https:// URL"); }} className="btn-line h-10 text-sm">Add</button>
    </div>
  );
}

function Tiers({ tiers, set }) {
  const up = (i, k, v) => set(tiers.map((t, j) => (j === i ? { ...t, [k]: v } : t)));
  return (
    <fieldset className="bg-surface border hairline p-5 mb-4"><legend className="eyebrow px-1">Ticket configuration</legend>
      {tiers.map((t, i) => (
        <div key={t.id || i} className="grid grid-cols-2 md:grid-cols-6 gap-3 py-4 border-b hairline" data-testid={`tier-editor-${i}`}>
          <F label="Name"><input className="field h-10" required value={t.name} onChange={(e) => up(i, "name", e.target.value)} data-testid={`tier-name-${i}`} /></F>
          <F label="Price (₹)"><input className="field h-10" type="number" min="0" step="1" required value={t.price} onChange={(e) => up(i, "price", e.target.value)} data-testid={`tier-price-${i}`} /></F>
          <F label={`Capacity${t.sold ? ` (sold ${t.sold})` : ""}`}><input className="field h-10" type="number" min="1" required value={t.capacity} onChange={(e) => up(i, "capacity", e.target.value)} data-testid={`tier-capacity-${i}`} /></F>
          <F label="Max / booking"><input className="field h-10" type="number" min="1" max="10" value={t.max_per_booking} onChange={(e) => up(i, "max_per_booking", e.target.value)} data-testid={`tier-max-${i}`} /></F>
          <F label="Sale starts"><input className="field h-10 text-sm" type="datetime-local" value={t.sale_starts_at} onChange={(e) => up(i, "sale_starts_at", e.target.value)} /></F>
          <F label="Sale ends"><input className="field h-10 text-sm" type="datetime-local" value={t.sale_ends_at} onChange={(e) => up(i, "sale_ends_at", e.target.value)} /></F>
          <div className="col-span-2 md:col-span-4"><F label="Description"><input className="field h-10" value={t.description} onChange={(e) => up(i, "description", e.target.value)} /></F></div>
          <label className="flex items-center gap-2 text-sm mt-5"><input type="checkbox" checked={t.active} onChange={(e) => up(i, "active", e.target.checked)} data-testid={`tier-active-${i}`} /> On sale</label>
          <button type="button" onClick={() => set(tiers.filter((_, j) => j !== i))} className="text-sm text-invalid mt-5 text-left" data-testid={`tier-remove-${i}`}>Remove tier</button>
        </div>
      ))}
      <button type="button" onClick={() => set([...tiers, { ...blankTier(), name: "" }])} className="btn-line h-10 text-sm mt-4" data-testid="tier-add"><Plus className="h-4 w-4" /> Add tier</button>
    </fieldset>
  );
}

export default function EventEditor() {
  const { id } = useParams();
  const isNew = !id;
  const { http } = useStaff();
  const nav = useNavigate();
  const [f, setF] = useState(isNew ? BLANK : null);
  const [raw, setRaw] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = () => http.get(`/admin/events/${id}`).then((r) => { setRaw(r.data); setF(fromApi(r.data)); }).catch((e) => setErr(errMsg(e)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!isNew) load(); }, [id]);
  if (err) return <ErrorState message={err} />;
  if (!f) return <Loading />;
  const s = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = toApi(f);
      const { data } = isNew ? await http.post("/admin/events", body) : await http.put(`/admin/events/${id}`, body);
      toast.success("Saved");
      if (isNew) nav(`/admin/events/${data.id}`, { replace: true }); else { setRaw(data); setF(fromApi(data)); }
    } catch (er) {
      toast.error(errMsg(er));
    } finally {
      setBusy(false);
    }
  };
  const move = (i, d) => { const g = [...f.gallery]; [g[i], g[i + d]] = [g[i + d], g[i]]; setF({ ...f, gallery: g }); };
  return (
    <form onSubmit={save} data-testid="event-editor">
      <PageHead title={isNew ? "New event" : f.title || "Edit event"} sub={raw ? <>Status <Pill v={raw.status} /> · Times are India Standard Time</> : "Saved as a private draft. Times are India Standard Time."}>
        {raw && <EventActions e={raw} onChange={load} />}
        <button data-testid="event-save" disabled={busy} className="btn-ink h-10 text-sm">{busy ? "Saving…" : "Save"}</button>
      </PageHead>
      <Box title="Basic information">
        <F label="Title" full><input data-testid="event-title-input" required minLength={3} className="field" value={f.title} onChange={s("title")} /></F>
        <F label="URL slug (leave blank to generate)"><input data-testid="event-slug-input" className="field font-serial text-sm" value={f.slug} onChange={s("slug")} /></F>
        <F label="Category"><select data-testid="event-category-select" className="field" value={f.category} onChange={s("category")}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></F>
        <F label="Experience type (e.g. Candlelight concert)"><input className="field" value={f.experience_type} onChange={s("experience_type")} data-testid="event-type-input" /></F>
        <F label="Organizer"><input className="field" value={f.organizer} onChange={s("organizer")} data-testid="event-organizer-input" /></F>
        <F label="City"><select data-testid="event-city-select" className="field" value={f.city} onChange={s("city")}>{["Chandigarh", "Mohali", "Panchkula", "Delhi NCR", "Mumbai", "Bengaluru", "Goa"].map((c) => <option key={c}>{c}</option>)}</select></F>
        <F label="Venue"><input data-testid="event-venue-input" required className="field" value={f.venue} onChange={s("venue")} /></F>
        <F label="Full address" full><input className="field" value={f.address} onChange={s("address")} data-testid="event-address-input" /></F>
        <F label="Latitude"><input className="field" type="number" step="any" value={f.lat} onChange={s("lat")} /></F>
        <F label="Longitude"><input className="field" type="number" step="any" value={f.lng} onChange={s("lng")} /></F>
        <F label="Short description (max 280)" full><textarea data-testid="event-short-input" maxLength={280} rows={2} className="field h-auto py-2" value={f.short_description} onChange={s("short_description")} /></F>
        <F label="Full description" full><textarea data-testid="event-description-input" rows={7} className="field h-auto py-2" value={f.description} onChange={s("description")} /></F>
        <div className="sm:col-span-2"><span className="text-xs font-medium">Moods</span>
          <div className="flex flex-wrap gap-2 mt-1">{MOODS.map((m) => (
            <button type="button" key={m} data-testid={`event-mood-${m.toLowerCase().replace(/\s/g, "-")}`} aria-pressed={f.moods.includes(m)} onClick={() => setF({ ...f, moods: f.moods.includes(m) ? f.moods.filter((x) => x !== m) : [...f.moods, m] })}
              className={`text-xs px-3 py-1.5 border ${f.moods.includes(m) ? "bg-ink text-parchment border-ink" : "hairline"}`}>{m}</button>))}</div></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" data-testid="event-original-checkbox" checked={f.is_original} onChange={s("is_original")} /> TRAILRZ Original</label>
      </Box>
      <Box title="Schedule">
        <F label="Starts"><input data-testid="event-start-input" required type="datetime-local" className="field" value={f.start_at} onChange={s("start_at")} /></F>
        <F label="Ends"><input data-testid="event-end-input" type="datetime-local" className="field" value={f.end_at} onChange={s("end_at")} /></F>
        <F label="Booking opens"><input type="datetime-local" className="field" value={f.booking_opens_at} onChange={s("booking_opens_at")} /></F>
        <F label="Booking closes"><input type="datetime-local" className="field" value={f.booking_closes_at} onChange={s("booking_closes_at")} /></F>
      </Box>
      <Box title="Gate portal credentials">
        <F label="Gate ID (leave blank to auto-generate)"><input data-testid="event-gate-key-input" className="field font-serial text-sm" placeholder="e.g. gate-acoustic-night" value={f.gate_key} onChange={s("gate_key")} /></F>
        <F label="Gate PIN / Password (defaults to 2026)"><input data-testid="event-gate-pin-input" className="field font-serial text-sm" placeholder="e.g. 2026" value={f.gate_pin} onChange={s("gate_pin")} /></F>
        <p className="sm:col-span-2 text-xs text-mineral">Share this Gate ID and PIN with the gate keeper to log in at <span className="font-serial">/gate</span>.</p>
      </Box>
      <fieldset className="bg-surface border hairline p-5 mb-4"><legend className="eyebrow px-1">Media</legend>
        <p className="text-xs font-medium mb-2">Cover image</p>
        {f.cover_image?.url ? (
          <div className="flex gap-4 items-start mb-4"><img src={f.cover_image.url} alt="" className="w-48 aspect-[16/10] object-cover" />
            <div className="flex-1 space-y-2"><input className="field h-10 text-sm" placeholder="Alt text (describe the image)" value={f.cover_image.alt} onChange={(e) => setF({ ...f, cover_image: { ...f.cover_image, alt: e.target.value } })} data-testid="cover-alt-input" />
              <button type="button" className="text-sm text-invalid" onClick={() => setF({ ...f, cover_image: null })} data-testid="cover-remove">Remove cover</button></div></div>
        ) : <MediaPicker testid="cover" onAdd={(m) => setF((x) => ({ ...x, cover_image: m }))} />}
        <p className="text-xs font-medium mt-6 mb-2">Gallery</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">{f.gallery.map((g, i) => (
          <div key={g.url + i} className="border hairline" data-testid={`gallery-item-${i}`}><img src={g.url} alt={g.alt} className="w-full aspect-square object-cover" />
            <div className="flex justify-between p-1"><button type="button" aria-label="Move earlier" disabled={!i} onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></button>
              <button type="button" aria-label="Move later" disabled={i === f.gallery.length - 1} onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></button>
              <button type="button" aria-label="Remove image" onClick={() => setF({ ...f, gallery: f.gallery.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4 text-invalid" /></button></div></div>))}</div>
        <MediaPicker testid="gallery" onAdd={(m) => setF((x) => ({ ...x, gallery: [...x.gallery, m] }))} />
      </fieldset>
      <Tiers tiers={f.tiers} set={(tiers) => setF({ ...f, tiers })} />
      <Box title="Why attend & audience">
        <F label="Why attend / Why you need this" full><textarea rows={3} className="field h-auto py-2" placeholder="Explain why this evening matters and what makes it worth stepping out for..." value={f.why_attend} onChange={s("why_attend")} data-testid="event-why-attend-input" /></F>
        <F label="Who should attend / Better for (one per line)"><textarea rows={4} className="field h-auto py-2" placeholder="Early-stage founders — building 0→1&#10;Designers & operators — looking for candid peer exchange" value={f.who_should_attend} onChange={s("who_should_attend")} data-testid="event-who-input" /></F>
        <F label="Schedule / What to expect (one per line)"><textarea rows={4} className="field h-auto py-2" placeholder="07:00 PM — Doors open & welcome drinks&#10;07:45 PM — Curated group circles" value={f.what_to_expect} onChange={s("what_to_expect")} data-testid="event-expect-input" /></F>
        <F label="What's included (one per line)" full><textarea rows={3} className="field h-auto py-2" placeholder="Artisan welcome drink & light bites&#10;Curated introductions & digital pass" value={f.included} onChange={s("included")} data-testid="event-included-input" /></F>
      </Box>
      <Box title="Additional details">
        <F label="Highlights (one per line)"><textarea rows={4} className="field h-auto py-2" value={f.highlights} onChange={s("highlights")} data-testid="event-highlights-input" /></F>
        <F label="Guidelines (one per line)"><textarea rows={4} className="field h-auto py-2" value={f.guidelines} onChange={s("guidelines")} data-testid="event-guidelines-input" /></F>
        <F label="Cancellation policy"><textarea rows={2} className="field h-auto py-2" value={f.cancellation_policy} onChange={s("cancellation_policy")} /></F>
        <F label="Age restriction"><input className="field" placeholder="e.g. 18+ or All ages" value={f.age_restriction} onChange={s("age_restriction")} /></F>
        <div className="sm:col-span-2"><span className="text-xs font-medium">FAQs</span>
          {f.faqs.map((q, i) => (
            <div key={i} className="grid sm:grid-cols-[1fr_2fr_auto] gap-2 mt-2">
              <input className="field h-10" placeholder="Question" value={q.q} onChange={(e) => setF({ ...f, faqs: f.faqs.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)) })} />
              <input className="field h-10" placeholder="Answer" value={q.a} onChange={(e) => setF({ ...f, faqs: f.faqs.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)) })} />
              <button type="button" aria-label="Remove FAQ" onClick={() => setF({ ...f, faqs: f.faqs.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4 text-invalid" /></button>
            </div>))}
          <button type="button" className="btn-line h-9 text-sm mt-2" data-testid="faq-add" onClick={() => setF({ ...f, faqs: [...f.faqs, { q: "", a: "" }] })}><Plus className="h-4 w-4" /> Add FAQ</button>
        </div>
      </Box>
    </form>
  );
}
