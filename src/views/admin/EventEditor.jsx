"use client";

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowUp, ArrowDown, Trash2, Plus, Upload, Search, ChevronDown, RotateCcw, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useStaff } from "@/views/admin/AdminLayout";
import { EventActions } from "@/views/admin/EventsAdmin";
import { errMsg, toLocalInput, fromLocalInput } from "@/lib/api";
import { PageHead, Pill } from "@/components/admin/AdminKit";
import { Loading, ErrorState } from "@/components/common/States";
import { findIndianCity, searchIndianCities } from "@/lib/indian-cities";
import {
  calculateAdditionalTicketPrice,
  generateBundleSchedule,
  validateBundlePricing,
} from "@/lib/pricing";

const CATS = ["Music", "Food & Dining", "Art & Culture", "Comedy", "Workshops", "Nightlife", "Outdoor", "Family", "Social Experiences", "Theatre"];
const MOODS = ["Date Night", "With Friends", "Family Time", "Creative Escape", "Slow Evenings", "Food Lovers", "Music Nights", "Something Different"];
const AGE_PRESETS = ["All ages", "16+", "18+", "21+"];
const DT = ["start_at", "end_at", "booking_opens_at", "booking_closes_at"];
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

const blankTier = () => ({
  name: "General Admission",
  description: "",
  price: 0,
  bundle_enabled: false,
  two_ticket_price: "",
  bundle_prices: {},
  capacity: 50,
  max_per_booking: 6,
  sale_starts_at: "",
  sale_ends_at: "",
  active: true,
});

const BLANK = {
  title: "",
  slug: "",
  category: "Music",
  moods: [],
  experience_type: "",
  is_original: false,
  short_description: "",
  description: "",
  organizer: "",
  city: "Chandigarh",
  state: "Chandigarh",
  venue: "",
  address: "",
  lat: null,
  lng: null,
  start_at: "",
  end_at: "",
  booking_opens_at: "",
  booking_closes_at: "",
  gate_key: "",
  gate_pin: "",
  cover_image: null,
  gallery: [],
  highlights: "",
  guidelines: "",
  why_attend: "",
  who_should_attend: "",
  what_to_expect: "",
  included: "",
  faqs: [],
  cancellation_policy: "",
  age_restriction: "",
  tiers: [blankTier()],
};

function fromApi(e) {
  const matchedCity = findIndianCity(e.city);
  const f = {
    ...BLANK,
    ...e,
    state: e.state || matchedCity?.state || "",
    highlights: (e.highlights || []).join("\n"),
    guidelines: (e.guidelines || []).join("\n"),
    who_should_attend: (e.who_should_attend || []).join("\n"),
    what_to_expect: (e.what_to_expect || []).join("\n"),
    included: (e.included || []).join("\n"),
    lat: e.lat ?? matchedCity?.lat ?? null,
    lng: e.lng ?? matchedCity?.lng ?? null,
  };
  DT.forEach((k) => { f[k] = toLocalInput(e[k]); });
  f.tiers = (e.tiers || []).map((t) => {
    const overridesRupees = {};
    if (t.bundle_prices && typeof t.bundle_prices === "object") {
      for (const [k, v] of Object.entries(t.bundle_prices)) {
        if (Number.isFinite(Number(v))) {
          overridesRupees[k] = Number(v) / 100;
        }
      }
    }
    return {
      ...t,
      price: t.price / 100,
      bundle_enabled: Boolean(t.bundle_enabled),
      two_ticket_price:
        t.two_ticket_price !== null && t.two_ticket_price !== undefined
          ? t.two_ticket_price / 100
          : "",
      bundle_prices: overridesRupees,
      sale_starts_at: toLocalInput(t.sale_starts_at),
      sale_ends_at: toLocalInput(t.sale_ends_at),
    };
  });
  return f;
}

function toApi(f) {
  const matchedCity = findIndianCity(f.city);
  const b = {
    ...f,
    state: f.state || matchedCity?.state || "",
    highlights: f.highlights.split("\n"),
    guidelines: f.guidelines.split("\n"),
    who_should_attend: (f.who_should_attend || "").split("\n"),
    what_to_expect: (f.what_to_expect || "").split("\n"),
    included: (f.included || "").split("\n"),
    faqs: (f.faqs || []).filter((q) => q && (q.q?.trim() || q.a?.trim())),
    lat: f.lat ?? matchedCity?.lat ?? null,
    lng: f.lng ?? matchedCity?.lng ?? null,
  };
  DT.forEach((k) => { b[k] = fromLocalInput(f[k]); });
  b.tiers = f.tiers.map((t) => {
    const bundlePrices = {};
    if (t.bundle_enabled && t.bundle_prices && typeof t.bundle_prices === "object") {
      for (const [k, v] of Object.entries(t.bundle_prices)) {
        if (v !== "" && v !== null && v !== undefined && Number.isFinite(Number(v))) {
          bundlePrices[k] = Number(v);
        }
      }
    }
    return {
      ...t,
      price: Number(t.price),
      bundle_enabled: Boolean(t.bundle_enabled),
      two_ticket_price:
        t.bundle_enabled && t.two_ticket_price !== "" && t.two_ticket_price !== null && t.two_ticket_price !== undefined
          ? Number(t.two_ticket_price)
          : null,
      bundle_prices: bundlePrices,
      capacity: Number(t.capacity),
      max_per_booking: Number(t.max_per_booking),
      sale_starts_at: fromLocalInput(t.sale_starts_at),
      sale_ends_at: fromLocalInput(t.sale_ends_at),
    };
  });
  ["id", "status", "created_at", "updated_at", "created_by", "capacity", "sold", "reserved"].forEach((k) => delete b[k]);
  return b;
}

const Box = ({ title, children }) => (
  <fieldset className="bg-surface border hairline p-5 mb-4">
    <legend className="eyebrow px-1">{title}</legend>
    <div className="grid sm:grid-cols-2 gap-4 mt-2">{children}</div>
  </fieldset>
);

const F = ({ label, full, children }) => (
  <label className={`block ${full ? "sm:col-span-2" : ""}`}>
    <span className="text-xs font-medium">{label}</span>
    <div className="mt-1">{children}</div>
  </label>
);

function CitySelector({ city, state, onSelect }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    const onDocClick = (ev) => {
      if (containerRef.current && !containerRef.current.contains(ev.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const results = searchIndianCities(query, 40);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        data-testid="event-city-select"
        onClick={() => setOpen((o) => !o)}
        className="field w-full flex items-center justify-between text-left"
        aria-expanded={open}
      >
        <span className="truncate">
          {city ? (
            <>
              <span className="font-medium text-ink">{city}</span>
              {state ? <span className="text-mineral"> · {state}</span> : null}
            </>
          ) : (
            <span className="text-mineral">Select an Indian city…</span>
          )}
        </span>
        <ChevronDown className="h-4 w-4 text-mineral shrink-0" />
      </button>

      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-surface border border-ink shadow-lg">
          <div className="p-2 border-b hairline flex items-center gap-2">
            <Search className="h-4 w-4 text-mineral shrink-0" />
            <input
              type="text"
              autoFocus
              data-testid="event-city-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city or state (e.g. Chandigarh, Mumbai, Pune)…"
              className="w-full text-sm bg-transparent outline-none"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto divide-y divide-linen/40" role="listbox">
            {results.length === 0 ? (
              <li className="px-3 py-3 text-xs text-mineral">No matching Indian cities found.</li>
            ) : (
              results.map((item) => {
                const selected = item.city.toLowerCase() === (city || "").toLowerCase();
                return (
                  <li key={`${item.city}-${item.state}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      data-testid={`city-option-${item.city.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                      onClick={() => {
                        onSelect(item);
                        setOpen(false);
                        setQuery("");
                      }}
                      className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-tint transition-colors ${
                        selected ? "bg-tint font-medium" : ""
                      }`}
                    >
                      <span>{item.city}</span>
                      <span className="text-xs text-mineral">{item.state}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function useUploader() {
  const { http } = useStaff();
  return async (file) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new Error("Only PNG, JPEG, WebP, or AVIF images are allowed");
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("Image must be 10 MB or smaller");
    }

    // Try direct Cloudinary signed upload first
    try {
      const { data: s } = await http.get("/admin/media/signature");
      const fd = new FormData();
      Object.entries({
        file,
        api_key: s.api_key,
        timestamp: s.timestamp,
        signature: s.signature,
        folder: s.folder,
      }).forEach(([k, v]) => fd.append(k, v));
      const r = await fetch(`https://api.cloudinary.com/v1_1/${s.cloud_name}/image/upload`, {
        method: "POST",
        body: fd,
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error?.message || "Upload failed");
      return { url: j.secure_url, public_id: j.public_id, alt: "" };
    } catch (err) {
      // Fallback to /api/admin/upload when Cloudinary signature is unavailable (e.g. local dev)
      if (err?.response?.status === 503) {
        const fd = new FormData();
        fd.append("file", file);
        const { data } = await http.post("/admin/upload", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        return { url: data.url, public_id: data.publicId || "", alt: "" };
      }
      throw err;
    }
  };
}

function MediaPicker({ onAdd, testid, multiple = true, label = "Upload" }) {
  const upload = useUploader();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const onFiles = async (files) => {
    if (!files.length) return;
    setBusy(true);
    for (const f of files) {
      try {
        onAdd(await upload(f));
      } catch (e) {
        toast.error(e.response ? errMsg(e) : e.message);
        break;
      }
    }
    setBusy(false);
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <label className="btn-line h-10 text-sm cursor-pointer">
        <Upload className="h-4 w-4" /> {busy ? "Uploading…" : label}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple={multiple}
          className="sr-only"
          data-testid={`${testid}-file`}
          onChange={(e) => {
            onFiles([...e.target.files]);
            e.target.value = "";
          }}
        />
      </label>
      <span className="text-xs text-mineral">or</span>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Paste an https:// image URL"
        data-testid={`${testid}-url`}
        className="field h-10 text-sm flex-1 min-w-[200px]"
      />
      <button
        type="button"
        data-testid={`${testid}-url-add`}
        onClick={() => {
          if (/^https:\/\//.test(url)) {
            onAdd({ url, alt: "" });
            setUrl("");
          } else {
            toast.error("Enter an https:// URL");
          }
        }}
        className="btn-line h-10 text-sm"
      >
        Add
      </button>
    </div>
  );
}

function TierBundlePricing({ t, index, onUpdate }) {
  const singlePrice = Number(t.price) || 0;
  const twoPrice =
    t.two_ticket_price !== "" && t.two_ticket_price !== null && t.two_ticket_price !== undefined
      ? Number(t.two_ticket_price)
      : singlePrice * 2;
  const additional = calculateAdditionalTicketPrice(singlePrice, twoPrice);
  const maxQ = Math.max(1, Math.min(50, Number(t.max_per_booking) || 1));

  const schedule = generateBundleSchedule({
    price: singlePrice,
    bundleEnabled: t.bundle_enabled,
    twoTicketPrice: twoPrice,
    maxPerBooking: maxQ,
    bundlePrices: t.bundle_prices,
  });

  const hasOverrides = Object.keys(t.bundle_prices || {}).length > 0;
  const validationErr = validateBundlePricing({
    price: singlePrice,
    bundleEnabled: Boolean(t.bundle_enabled),
    twoTicketPrice: t.bundle_enabled ? twoPrice : null,
    maxPerBooking: maxQ,
    bundlePrices: t.bundle_prices,
  });

  const setOverride = (qty, val) => {
    const next = { ...(t.bundle_prices || {}) };
    if (val === "" || val === null || val === undefined) {
      delete next[String(qty)];
    } else {
      next[String(qty)] = Number(val);
    }
    onUpdate("bundle_prices", next);
  };

  return (
    <div className="col-span-2 md:col-span-6 mt-2 bg-parchment/60 border hairline p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(t.bundle_enabled)}
            data-testid={`tier-bundle-toggle-${index}`}
            onChange={(e) => {
              const enabled = e.target.checked;
              onUpdate("bundle_enabled", enabled);
              if (enabled && (t.two_ticket_price === "" || t.two_ticket_price === null)) {
                onUpdate("two_ticket_price", singlePrice * 2);
              }
            }}
          />
          Enable quantity bundle pricing
        </label>
        {t.bundle_enabled && hasOverrides && (
          <button
            type="button"
            onClick={() => onUpdate("bundle_prices", {})}
            className="text-xs underline underline-offset-4 text-mineral hover:text-ink inline-flex items-center gap-1"
            data-testid={`tier-bundle-reset-${index}`}
          >
            <RotateCcw className="h-3 w-3" /> Reset manual overrides
          </button>
        )}
      </div>

      {t.bundle_enabled && (
        <div className="mt-4 space-y-4">
          <div className="grid sm:grid-cols-3 gap-3 items-end">
            <F label="1 Ticket Price (₹)">
              <input
                className="field h-9 text-sm bg-surface"
                type="number"
                min="0"
                step="1"
                value={t.price}
                onChange={(e) => onUpdate("price", e.target.value)}
              />
            </F>
            <F label="2 Tickets Bundle Price (₹)">
              <input
                className="field h-9 text-sm bg-surface"
                type="number"
                min="0"
                step="1"
                required
                data-testid={`tier-two-price-${index}`}
                value={t.two_ticket_price}
                onChange={(e) => onUpdate("two_ticket_price", e.target.value)}
              />
            </F>
            <div className="text-xs text-mineral pb-2">
              <p className="font-medium text-ink">
                Additional ticket: <span className="tabular">₹{additional.toLocaleString("en-IN")}</span>
              </p>
              <p className="mt-0.5">Formula: 2-ticket price + (qty − 2) × additional</p>
            </div>
          </div>

          {validationErr && (
            <p className="text-xs text-invalid border-l-2 border-invalid pl-2 py-0.5" data-testid={`tier-bundle-error-${index}`}>
              {validationErr}
            </p>
          )}

          <div>
            <p className="text-xs font-medium text-mineral mb-2">
              Pricing preview &amp; manual overrides (1 to {maxQ} tickets)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {schedule.map((row) => (
                <div
                  key={row.quantity}
                  className="bg-surface border hairline px-3 py-2 flex items-center justify-between gap-2 text-sm"
                  data-testid={`tier-${index}-bundle-row-${row.quantity}`}
                >
                  <div className="min-w-0">
                    <span className="font-medium">
                      {row.quantity} {row.quantity === 1 ? "Ticket" : "Tickets"}
                    </span>
                    <span className="block text-[11px] text-mineral tabular">
                      ₹{row.perTicket.toLocaleString("en-IN")}/ticket
                      {row.isOverride ? " · Overridden" : row.quantity >= 2 ? " · Auto" : ""}
                    </span>
                  </div>
                  {row.quantity === 1 ? (
                    <span className="tabular font-semibold">₹{row.price.toLocaleString("en-IN")}</span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-mineral">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        aria-label={`Price for ${row.quantity} tickets`}
                        data-testid={`tier-${index}-bundle-price-${row.quantity}`}
                        value={row.isOverride ? t.bundle_prices[String(row.quantity)] : row.price}
                        onChange={(e) => setOverride(row.quantity, e.target.value)}
                        className="field h-8 w-20 text-right text-sm tabular px-2"
                      />
                      {row.isOverride && (
                        <button
                          type="button"
                          title="Reset to auto-calculated price"
                          onClick={() => setOverride(row.quantity, "")}
                          className="text-mineral hover:text-ink p-1"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Tiers({ tiers, set }) {
  const up = (i, k, v) => set(tiers.map((t, j) => (j === i ? { ...t, [k]: v } : t)));
  const upMany = (i, patch) => set(tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)));

  return (
    <fieldset className="bg-surface border hairline p-5 mb-4">
      <legend className="eyebrow px-1">Ticket configuration</legend>
      {tiers.map((t, i) => (
        <div key={t.id || i} className="grid grid-cols-2 md:grid-cols-6 gap-3 py-4 border-b hairline" data-testid={`tier-editor-${i}`}>
          <F label="Name">
            <input className="field h-10" required value={t.name} onChange={(e) => up(i, "name", e.target.value)} data-testid={`tier-name-${i}`} />
          </F>
          <F label="Single price (₹)">
            <input className="field h-10" type="number" min="0" step="1" required value={t.price} onChange={(e) => up(i, "price", e.target.value)} data-testid={`tier-price-${i}`} />
          </F>
          <F label={`Capacity${t.sold ? ` (sold ${t.sold})` : ""}`}>
            <input className="field h-10" type="number" min="1" required value={t.capacity} onChange={(e) => up(i, "capacity", e.target.value)} data-testid={`tier-capacity-${i}`} />
          </F>
          <F label="Max / booking">
            <input className="field h-10" type="number" min="1" max="50" value={t.max_per_booking} onChange={(e) => up(i, "max_per_booking", e.target.value)} data-testid={`tier-max-${i}`} />
          </F>
          <F label="Sale starts">
            <input className="field h-10 text-sm" type="datetime-local" value={t.sale_starts_at} onChange={(e) => up(i, "sale_starts_at", e.target.value)} />
          </F>
          <F label="Sale ends">
            <input className="field h-10 text-sm" type="datetime-local" value={t.sale_ends_at} onChange={(e) => up(i, "sale_ends_at", e.target.value)} />
          </F>
          <div className="col-span-2 md:col-span-4">
            <F label="Description">
              <input className="field h-10" value={t.description} onChange={(e) => up(i, "description", e.target.value)} />
            </F>
          </div>
          <label className="flex items-center gap-2 text-sm mt-5">
            <input type="checkbox" checked={t.active} onChange={(e) => up(i, "active", e.target.checked)} data-testid={`tier-active-${i}`} /> On sale
          </label>
          <button type="button" onClick={() => set(tiers.filter((_, j) => j !== i))} className="text-sm text-invalid mt-5 text-left" data-testid={`tier-remove-${i}`}>
            Remove tier
          </button>

          <TierBundlePricing
            t={t}
            index={i}
            onUpdate={(k, v) => upMany(i, { [k]: v })}
          />
        </div>
      ))}
      <button type="button" onClick={() => set([...tiers, { ...blankTier(), name: "" }])} className="btn-line h-10 text-sm mt-4" data-testid="tier-add">
        <Plus className="h-4 w-4" /> Add tier
      </button>
    </fieldset>
  );
}

export default function EventEditor() {
  const { id } = useParams();
  const isNew = !id;
  const { http } = useStaff();
  const nav = useNavigate();
  const upload = useUploader();
  const [f, setF] = useState(isNew ? BLANK : null);
  const [raw, setRaw] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [customAgeMode, setCustomAgeMode] = useState(false);

  const load = () =>
    http
      .get(`/admin/events/${id}`)
      .then((r) => {
        setRaw(r.data);
        const parsed = fromApi(r.data);
        setF(parsed);
        const ageVal = parsed.age_restriction || "";
        setCustomAgeMode(Boolean(ageVal && !AGE_PRESETS.includes(ageVal)));
      })
      .catch((e) => setErr(errMsg(e)));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!isNew) load(); }, [id]);

  if (err) return <ErrorState message={err} />;
  if (!f) return <Loading />;

  const s = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const save = async (e) => {
    e.preventDefault();
    for (let i = 0; i < f.tiers.length; i++) {
      const t = f.tiers[i];
      const twoVal =
        t.two_ticket_price !== "" && t.two_ticket_price !== null && t.two_ticket_price !== undefined
          ? Number(t.two_ticket_price)
          : Number(t.price) * 2;
      const pricingErr = validateBundlePricing({
        price: Number(t.price),
        bundleEnabled: Boolean(t.bundle_enabled),
        twoTicketPrice: t.bundle_enabled ? twoVal : null,
        maxPerBooking: Number(t.max_per_booking),
        bundlePrices: t.bundle_prices,
      });
      if (pricingErr) {
        toast.error(`${t.name || `Tier ${i + 1}`}: ${pricingErr}`);
        return;
      }
    }

    setBusy(true);
    try {
      const body = toApi(f);
      const { data } = isNew ? await http.post("/admin/events", body) : await http.put(`/admin/events/${id}`, body);
      toast.success("Saved");
      if (isNew) nav(`/admin/events/${data.id}`, { replace: true });
      else {
        setRaw(data);
        setF(fromApi(data));
      }
    } catch (er) {
      toast.error(errMsg(er));
    } finally {
      setBusy(false);
    }
  };

  const moveGallery = (i, d) => {
    const g = [...f.gallery];
    [g[i], g[i + d]] = [g[i + d], g[i]];
    setF({ ...f, gallery: g });
  };

  const moveFaq = (i, d) => {
    const q = [...f.faqs];
    [q[i], q[i + d]] = [q[i + d], q[i]];
    setF({ ...f, faqs: q });
  };

  const ageSelectValue = customAgeMode
    ? "custom"
    : AGE_PRESETS.includes(f.age_restriction)
    ? f.age_restriction
    : f.age_restriction
    ? "custom"
    : "";

  return (
    <form onSubmit={save} data-testid="event-editor">
      <PageHead
        title={isNew ? "New event" : f.title || "Edit event"}
        sub={raw ? <>Status <Pill v={raw.status} /> · Times are India Standard Time</> : "Saved as a private draft. Times are India Standard Time."}
      >
        {raw && <EventActions e={raw} onChange={load} />}
        <button data-testid="event-save" disabled={busy} className="btn-ink h-10 text-sm">
          {busy ? "Saving…" : "Save"}
        </button>
      </PageHead>

      <Box title="Basic information">
        <F label="Title" full>
          <input data-testid="event-title-input" required minLength={3} className="field" value={f.title} onChange={s("title")} />
        </F>
        <F label="URL slug (leave blank to generate)">
          <input data-testid="event-slug-input" className="field font-serial text-sm" value={f.slug} onChange={s("slug")} />
        </F>
        <F label="Category">
          <select data-testid="event-category-select" className="field" value={f.category} onChange={s("category")}>
            {CATS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </F>
        <F label="Experience type (e.g. Candlelight concert)">
          <input className="field" value={f.experience_type} onChange={s("experience_type")} data-testid="event-type-input" />
        </F>
        <F label="Organizer">
          <input className="field" value={f.organizer} onChange={s("organizer")} data-testid="event-organizer-input" />
        </F>
        <F label="City">
          <CitySelector
            city={f.city}
            state={f.state}
            onSelect={(item) =>
              setF((prev) => ({
                ...prev,
                city: item.city,
                state: item.state,
                lat: item.lat,
                lng: item.lng,
              }))
            }
          />
        </F>
        <F label="State / UT">
          <input
            className="field bg-parchment/60 text-mineral"
            readOnly
            value={f.state || ""}
            placeholder="Auto-filled from city"
            data-testid="event-state-input"
          />
        </F>
        <F label="Venue" full>
          <input data-testid="event-venue-input" required className="field" value={f.venue} onChange={s("venue")} />
        </F>
        <F label="Full address" full>
          <input className="field" value={f.address} onChange={s("address")} data-testid="event-address-input" />
        </F>
        <F label="Short description (max 280)" full>
          <textarea data-testid="event-short-input" maxLength={280} rows={2} className="field h-auto py-2" value={f.short_description} onChange={s("short_description")} />
        </F>
        <F label="Full description" full>
          <textarea data-testid="event-description-input" rows={7} className="field h-auto py-2" value={f.description} onChange={s("description")} />
        </F>
        <div className="sm:col-span-2">
          <span className="text-xs font-medium">Moods</span>
          <div className="flex flex-wrap gap-2 mt-1">
            {MOODS.map((m) => (
              <button
                type="button"
                key={m}
                data-testid={`event-mood-${m.toLowerCase().replace(/\s/g, "-")}`}
                aria-pressed={f.moods.includes(m)}
                onClick={() => setF({ ...f, moods: f.moods.includes(m) ? f.moods.filter((x) => x !== m) : [...f.moods, m] })}
                className={`text-xs px-3 py-1.5 border ${f.moods.includes(m) ? "bg-ink text-parchment border-ink" : "hairline"}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" data-testid="event-original-checkbox" checked={f.is_original} onChange={s("is_original")} /> TRAILRZ Original
        </label>
      </Box>

      <Box title="Schedule">
        <F label="Starts"><input data-testid="event-start-input" required type="datetime-local" className="field" value={f.start_at} onChange={s("start_at")} /></F>
        <F label="Ends"><input data-testid="event-end-input" type="datetime-local" className="field" value={f.end_at} onChange={s("end_at")} /></F>
        <F label="Booking opens"><input type="datetime-local" className="field" value={f.booking_opens_at} onChange={s("booking_opens_at")} /></F>
        <F label="Booking closes"><input type="datetime-local" className="field" value={f.booking_closes_at} onChange={s("booking_closes_at")} /></F>
      </Box>

      <Box title="Gate portal credentials">
        <F label="Gate ID (leave blank to auto-generate)">
          <input data-testid="event-gate-key-input" className="field font-serial text-sm" placeholder="e.g. gate-acoustic-night" value={f.gate_key} onChange={s("gate_key")} />
        </F>
        <F label="Gate PIN / Password (defaults to 2026)">
          <input data-testid="event-gate-pin-input" className="field font-serial text-sm" placeholder="e.g. 2026" value={f.gate_pin} onChange={s("gate_pin")} />
        </F>
        <p className="sm:col-span-2 text-xs text-mineral">
          Share this Gate ID and PIN with the gate keeper to log in at <span className="font-serial">/gate</span>.
        </p>
      </Box>

      <fieldset className="bg-surface border hairline p-5 mb-4">
        <legend className="eyebrow px-1">Media</legend>
        <p className="text-xs font-medium mb-2">Cover image (JPEG, PNG, WebP or AVIF, max 10 MB)</p>
        {f.cover_image?.url ? (
          <div className="flex flex-col sm:flex-row gap-4 items-start mb-4">
            <img src={f.cover_image.url} alt={f.cover_image.alt || ""} className="w-48 aspect-[16/10] object-cover border hairline" />
            <div className="flex-1 space-y-2 w-full">
              <input
                className="field h-10 text-sm"
                placeholder="Alt text (describe the image)"
                value={f.cover_image.alt || ""}
                onChange={(e) => setF({ ...f, cover_image: { ...f.cover_image, alt: e.target.value } })}
                data-testid="cover-alt-input"
              />
              <div className="flex flex-wrap gap-3 items-center">
                <label className="btn-line h-9 text-xs cursor-pointer">
                  <RefreshCw className="h-3.5 w-3.5" /> {coverBusy ? "Uploading…" : "Replace cover"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    className="sr-only"
                    data-testid="cover-replace-file"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      setCoverBusy(true);
                      try {
                        const uploaded = await upload(file);
                        setF((x) => ({ ...x, cover_image: uploaded }));
                      } catch (err2) {
                        toast.error(err2.response ? errMsg(err2) : err2.message);
                      } finally {
                        setCoverBusy(false);
                      }
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="text-sm text-invalid"
                  onClick={() => setF({ ...f, cover_image: null })}
                  data-testid="cover-remove"
                >
                  Remove cover
                </button>
              </div>
            </div>
          </div>
        ) : (
          <MediaPicker testid="cover" multiple={false} label="Upload cover" onAdd={(m) => setF((x) => ({ ...x, cover_image: m }))} />
        )}

        <p className="text-xs font-medium mt-6 mb-2">Gallery</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          {f.gallery.map((g, i) => (
            <div key={g.url + i} className="border hairline" data-testid={`gallery-item-${i}`}>
              <img src={g.url} alt={g.alt || ""} className="w-full aspect-square object-cover" />
              <div className="p-1.5 border-t hairline">
                <input
                  className="field h-7 text-xs mb-1.5"
                  placeholder="Alt text"
                  value={g.alt || ""}
                  onChange={(e) =>
                    setF({
                      ...f,
                      gallery: f.gallery.map((item, j) => (j === i ? { ...item, alt: e.target.value } : item)),
                    })
                  }
                />
                <div className="flex justify-between">
                  <button type="button" aria-label="Move earlier" disabled={!i} onClick={() => moveGallery(i, -1)} className="disabled:opacity-30">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button type="button" aria-label="Move later" disabled={i === f.gallery.length - 1} onClick={() => moveGallery(i, 1)} className="disabled:opacity-30">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button type="button" aria-label="Remove image" onClick={() => setF({ ...f, gallery: f.gallery.filter((_, j) => j !== i) })}>
                    <Trash2 className="h-4 w-4 text-invalid" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <MediaPicker testid="gallery" label="Upload gallery" onAdd={(m) => setF((x) => ({ ...x, gallery: [...x.gallery, m] }))} />
      </fieldset>

      <Tiers tiers={f.tiers} set={(tiers) => setF({ ...f, tiers })} />

      <Box title="Why attend & audience">
        <F label="Why attend / Why you need this" full>
          <textarea rows={3} className="field h-auto py-2" placeholder="Explain why this evening matters and what makes it worth stepping out for..." value={f.why_attend} onChange={s("why_attend")} data-testid="event-why-attend-input" />
        </F>
        <F label="Who should attend / Best for (one per line)">
          <textarea rows={4} className="field h-auto py-2" placeholder="Early-stage founders — building 0 to 1&#10;Designers & operators — looking for candid peer exchange" value={f.who_should_attend} onChange={s("who_should_attend")} data-testid="event-who-input" />
        </F>
        <F label="Schedule / What to expect (one per line)">
          <textarea rows={4} className="field h-auto py-2" placeholder="07:00 PM — Doors open & welcome drinks&#10;07:45 PM — Curated group circles" value={f.what_to_expect} onChange={s("what_to_expect")} data-testid="event-expect-input" />
        </F>
        <F label="What's included (one per line)" full>
          <textarea rows={3} className="field h-auto py-2" placeholder="Artisan welcome drink & light bites&#10;Curated introductions & digital pass" value={f.included} onChange={s("included")} data-testid="event-included-input" />
        </F>
      </Box>

      <Box title="Additional details & FAQs">
        <F label="Highlights (one per line)">
          <textarea rows={4} className="field h-auto py-2" value={f.highlights} onChange={s("highlights")} data-testid="event-highlights-input" />
        </F>
        <F label="Guidelines (one per line)">
          <textarea rows={4} className="field h-auto py-2" value={f.guidelines} onChange={s("guidelines")} data-testid="event-guidelines-input" />
        </F>
        <F label="Cancellation policy">
          <textarea rows={2} className="field h-auto py-2" value={f.cancellation_policy} onChange={s("cancellation_policy")} data-testid="event-cancellation-input" />
        </F>
        <F label="Age restriction">
          <div className="space-y-2">
            <select
              className="field"
              data-testid="event-age-select"
              value={ageSelectValue}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "custom") {
                  setCustomAgeMode(true);
                  if (AGE_PRESETS.includes(f.age_restriction)) {
                    setF({ ...f, age_restriction: "" });
                  }
                } else {
                  setCustomAgeMode(false);
                  setF({ ...f, age_restriction: v });
                }
              }}
            >
              <option value="">Not specified</option>
              {AGE_PRESETS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
              <option value="custom">Custom age restriction</option>
            </select>
            {ageSelectValue === "custom" && (
              <input
                className="field"
                data-testid="event-age-custom-input"
                placeholder="Enter custom age restriction (e.g. 25+ or Families with kids)"
                value={f.age_restriction}
                onChange={s("age_restriction")}
              />
            )}
          </div>
        </F>

        <div className="sm:col-span-2 pt-2 border-t hairline">
          <span className="text-xs font-medium">FAQs</span>
          {f.faqs.map((q, i) => (
            <div key={i} className="grid sm:grid-cols-[1fr_2fr_auto] gap-2 mt-2 items-start" data-testid={`faq-editor-${i}`}>
              <input
                className="field h-10"
                placeholder="Question"
                data-testid={`faq-q-${i}`}
                value={q.q}
                onChange={(e) => setF({ ...f, faqs: f.faqs.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)) })}
              />
              <textarea
                rows={2}
                className="field h-auto py-2"
                placeholder="Answer"
                data-testid={`faq-a-${i}`}
                value={q.a}
                onChange={(e) => setF({ ...f, faqs: f.faqs.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)) })}
              />
              <div className="flex items-center gap-1 pt-2">
                <button
                  type="button"
                  aria-label="Move FAQ up"
                  disabled={!i}
                  onClick={() => moveFaq(i, -1)}
                  className="p-1 disabled:opacity-30"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Move FAQ down"
                  disabled={i === f.faqs.length - 1}
                  onClick={() => moveFaq(i, 1)}
                  className="p-1 disabled:opacity-30"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Remove FAQ"
                  data-testid={`faq-remove-${i}`}
                  onClick={() => setF({ ...f, faqs: f.faqs.filter((_, j) => j !== i) })}
                  className="p-1"
                >
                  <Trash2 className="h-4 w-4 text-invalid" />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="btn-line h-9 text-sm mt-3"
            data-testid="faq-add"
            onClick={() => setF({ ...f, faqs: [...f.faqs, { q: "", a: "" }] })}
          >
            <Plus className="h-4 w-4" /> Add FAQ
          </button>
        </div>
      </Box>
    </form>
  );
}
