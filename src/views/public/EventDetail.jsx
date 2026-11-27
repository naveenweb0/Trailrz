"use client";

import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Minus,
  Plus,
  MapPin,
  Clock,
  CalendarDays,
  ArrowRight,
  Sparkles,
  Users,
  Compass,
  Check,
  Info,
  ShieldCheck,
  QrCode,
  Timer,
} from "lucide-react";
import { api, useLoad, inr, fmtDay, fmtTime, fmtDate } from "@/lib/api";
import { useSeo } from "@/lib/seo";
import { AvailTag, OriginalMark, EventPortrait } from "@/components/public/EventBits";
import { Loading, ErrorState, Empty } from "@/components/common/States";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SplitWords, ImageReveal, Reveal, AmbientField, LiveDot } from "@/components/motion/Motion";

function fmtDuration(startAt, endAt) {
  if (!startAt || !endAt) return null;
  const mins = Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000);
  if (!Number.isFinite(mins) || mins <= 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m session`;
  if (h) return `${h} hr${h > 1 ? "s" : ""} session`;
  return `${m} min session`;
}

function splitTaggedItems(list = [], prefix) {
  const matched = [];
  const rest = [];
  for (const item of list) {
    if (typeof item === "string" && item.toLowerCase().startsWith(prefix.toLowerCase())) {
      matched.push(item.slice(prefix.length).trim());
    } else {
      rest.push(item);
    }
  }
  return [matched, rest];
}

function TierRow({ t, qty, setQty, disabled }) {
  const can = t.on_sale && t.availability !== "sold_out" && !disabled;
  const max = Math.min(t.max_per_booking, t.remaining ?? t.max_per_booking);
  return (
    <div
      className={`py-5 border-b hairline transition-colors ${qty > 0 ? "bg-tint/45 -mx-3 px-3 border-l-2 border-l-beam" : ""}`}
      data-testid={`tier-${t.id}`}
    >
      <div className="flex justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium text-ink">{t.name}</p>
          {t.description && <p className="text-sm text-mineral mt-1">{t.description}</p>}
          <div className="mt-2">
            {t.on_sale ? (
              <AvailTag a={t.availability} remaining={t.remaining} />
            ) : (
              <span className="text-xs text-mineral">
                {t.sale_starts_at && new Date(t.sale_starts_at) > new Date()
                  ? `On sale ${fmtDate(t.sale_starts_at)}`
                  : "Sales closed"}
              </span>
            )}
          </div>
        </div>
        <p className="tabular font-semibold text-base whitespace-nowrap">{inr(t.price)}</p>
      </div>
      {can && (
        <div className="flex items-center gap-4 mt-4" role="group" aria-label={`${t.name} quantity`}>
          <button
            data-testid={`tier-dec-${t.id}`}
            aria-label="Fewer"
            disabled={!qty}
            onClick={() => setQty(qty - 1)}
            className="w-11 h-11 border hairline bg-surface flex items-center justify-center disabled:opacity-30 transition-colors hover:border-ink"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="tabular w-6 text-center text-lg font-medium" data-testid={`tier-qty-${t.id}`} aria-live="polite">
            {qty}
          </span>
          <button
            data-testid={`tier-inc-${t.id}`}
            aria-label="More"
            disabled={qty >= max}
            onClick={() => setQty(qty + 1)}
            className="w-11 h-11 border hairline bg-surface flex items-center justify-center disabled:opacity-30 transition-colors hover:border-ink"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function TicketPanel({ e }) {
  const [sel, setSel] = useState({});
  const nav = useNavigate();
  const count = Object.values(sel).reduce((a, b) => a + b, 0);
  const total = e.tiers.reduce((s, t) => s + (sel[t.id] || 0) * t.price, 0);
  const go = () =>
    nav(
      `/checkout?event=${e.slug}&sel=${Object.entries(sel)
        .filter(([, q]) => q)
        .map(([id, q]) => `${id}:${q}`)
        .join(",")}`
    );

  return (
    <div
      id="tickets"
      className="bg-surface border hairline scroll-mt-24 shadow-[0_30px_70px_-36px_rgba(24,22,20,0.28)] overflow-hidden"
      data-testid="ticket-panel"
    >
      {/* Ticket Stub Header */}
      <div className="bg-ink-deep text-parchment dark-zone px-6 sm:px-8 pt-6 pb-5 relative">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow !text-beam flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-beam" aria-hidden />
            Reserve your pass
          </p>
          <span className="font-serial text-[11px] uppercase tracking-wider text-[#bdb3a3]">
            {e.availability === "sold_out" ? "Sold out" : e.availability === "limited" ? "Limited left" : "Live"}
          </span>
        </div>
        <p className="font-display text-2xl sm:text-3xl leading-tight mt-2">{e.title}</p>
        <p className="text-xs text-[#bdb3a3] mt-1">
          {fmtDay(e.start_at)} · {fmtTime(e.start_at)} · {e.venue}
        </p>
      </div>
      <div className="bg-ink-deep no-print" aria-hidden>
        <div className="perf" />
      </div>

      {/* Tiers & Checkout CTA */}
      <div className="p-6 sm:p-8 pt-4">
        {!e.booking_open && (
          <p className="mt-2 mb-4 text-sm border-l-2 border-invalid pl-3 py-1" data-testid="booking-closed">
            Booking is not open for this experience
            {e.booking_opens_at && new Date(e.booking_opens_at) > new Date()
              ? ` — opens ${fmtDate(e.booking_opens_at)}`
              : ""}
            .
          </p>
        )}
        {e.tiers.length === 0 ? (
          <p className="mt-4 text-sm text-mineral">No passes have been released.</p>
        ) : (
          e.tiers.map((t) => (
            <TierRow
              key={t.id}
              t={t}
              qty={sel[t.id] || 0}
              disabled={!e.booking_open || (count >= 10 && !sel[t.id])}
              setQty={(q) =>
                setSel({
                  ...sel,
                  [t.id]: Math.max(0, Math.min(q, 10 - count + (sel[t.id] || 0))),
                })
              }
            />
          ))
        )}

        <div className="flex justify-between items-baseline mt-6">
          <span className="text-sm text-mineral">
            {count} {count === 1 ? "pass" : "passes"} selected
          </span>
          <span className="font-display text-3xl tabular" data-testid="ticket-panel-total">
            {count === 0 && e.min_price ? `From ${inr(e.min_price)}` : inr(total)}
          </span>
        </div>

        <button
          data-testid="ticket-panel-continue"
          disabled={!count}
          onClick={go}
          className="btn-ink w-full mt-5 group"
        >
          {count > 0 ? `Continue · ${inr(total)}` : "Select a pass above"}
          {count > 0 && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />}
        </button>

        <div className="mt-5 pt-4 border-t hairline grid grid-cols-1 gap-2 text-xs text-mineral">
          <span className="inline-flex items-center gap-2">
            <Timer className="h-3.5 w-3.5 text-ink shrink-0" aria-hidden />
            Passes are held exclusively for 10 minutes while you pay.
          </span>
          <span className="inline-flex items-center gap-2">
            <QrCode className="h-3.5 w-3.5 text-ink shrink-0" aria-hidden />
            Instant digital QR pass — no account or password needed.
          </span>
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-ink shrink-0" aria-hidden />
            Encrypted checkout powered by Razorpay.
          </span>
        </div>
      </div>
    </div>
  );
}

function AudienceGrid({ items }) {
  if (!items?.length) return null;
  return (
    <Reveal y={16} className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-ink" aria-hidden /> Better suited for
          </p>
          <h3 className="font-display text-3xl sm:text-4xl mt-1.5">Who should be in this room</h3>
        </div>
        <span className="font-serial text-xs text-mineral">{String(items.length).padStart(2, "0")}</span>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {items.map((item, i) => {
          const parts = item.split(/\s+—\s+/);
          return (
            <div
              key={i}
              className="group card-sheen bg-surface border hairline hover:border-ink transition-colors duration-300 p-5 flex flex-col justify-between border-t-2 border-t-beam"
            >
              <div>
                <span className="font-serial text-xs text-mineral">{String(i + 1).padStart(2, "0")}</span>
                {parts.length > 1 ? (
                  <>
                    <h4 className="font-medium text-ink mt-2 leading-snug">{parts[0]}</h4>
                    <p className="text-sm text-mineral mt-1.5 leading-relaxed">{parts.slice(1).join(" — ")}</p>
                  </>
                ) : (
                  <p className="text-sm text-ink mt-2 leading-relaxed">{item}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Reveal>
  );
}

function ScheduleTimeline({ items }) {
  if (!items?.length) return null;
  return (
    <Reveal y={16} className="bg-surface border hairline p-6 sm:p-8">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <p className="eyebrow flex items-center gap-2">
            <Compass className="h-3.5 w-3.5 text-ink" aria-hidden /> The evening unfolds
          </p>
          <h3 className="font-display text-3xl mt-1.5">Schedule & what to expect</h3>
        </div>
        <span className="font-serial text-xs text-mineral">{String(items.length).padStart(2, "0")}</span>
      </div>
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 bottom-0 w-[2px] overflow-hidden"
        >
          <span
            className="block w-full h-1/4 trz-shuttle-y"
            style={{ background: "linear-gradient(180deg, transparent, var(--beam), transparent)" }}
          />
        </div>
        <ol className="border-l-2 border-linen pl-5 sm:pl-6 space-y-5">
        {items.map((item, i) => {
          const timeMatch = item.match(/^(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)\s*[—–-]\s*(.+)$/);
          return (
            <li key={i} className="relative">
              <span
                className="absolute -left-[29px] sm:-left-[33px] top-1.5 w-3 h-3 rounded-full bg-beam border-2 border-ink"
                aria-hidden
              />
              {timeMatch ? (
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1.5 sm:gap-4">
                  <span className="font-serial text-xs bg-tint border hairline px-2.5 py-0.5 text-ink shrink-0 self-start">
                    {timeMatch[1]}
                  </span>
                  <span className="text-sm sm:text-[15px] text-[#3a352f] leading-relaxed">{timeMatch[2]}</span>
                </div>
              ) : (
                <div className="flex gap-3 text-sm sm:text-[15px] text-[#3a352f] leading-relaxed">
                  <span className="font-serial text-xs text-mineral pt-0.5">{String(i + 1).padStart(2, "0")}</span>
                  <span>{item}</span>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      </div>
    </Reveal>
  );
}

function EditorialColumn({ icon: Icon, eyebrow, title, items, delay = 0 }) {
  if (!items?.length) return null;
  return (
    <Reveal delay={delay} y={16} className="min-w-0 bg-surface border hairline p-6 sm:p-7 flex flex-col">
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow flex items-center gap-2">
          {Icon && <Icon className="h-3.5 w-3.5 text-ink" aria-hidden />} {eyebrow}
        </span>
        <span className="font-serial text-[11px] text-mineral">{String(items.length).padStart(2, "0")}</span>
      </div>
      {title && <h3 className="font-display text-2xl sm:text-3xl mt-3 leading-tight">{title}</h3>}
      <ul className="space-y-3.5 mt-5">
        {items.map((item, i) => {
          const parts = item.split(/\s+—\s+/);
          return (
            <li key={i} className="flex gap-3.5 text-sm leading-relaxed border-t hairline pt-3 first:border-t-0 first:pt-0">
              <span className="font-serial text-xs text-mineral pt-0.5 shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                {parts.length > 1 ? (
                  <>
                    <span className="font-medium text-ink">{parts[0]}</span>
                    <span className="text-mineral"> — {parts.slice(1).join(" — ")}</span>
                  </>
                ) : (
                  <span className="text-[#3a352f]">{item}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Reveal>
  );
}

export default function EventDetail() {
  const { slug } = useParams();
  const { data: e, loading, error, reload } = useLoad(async () => (await api.get(`/public/events/${slug}`)).data, [slug]);
  const jsonLd = useMemo(
    () =>
      e && {
        "@context": "https://schema.org",
        "@type": "Event",
        name: e.title,
        startDate: e.start_at,
        endDate: e.end_at || undefined,
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        location: { "@type": "Place", name: e.venue, address: e.address || e.city },
        image: e.cover_image?.url ? [e.cover_image.url] : undefined,
        description: e.short_description,
        organizer: e.organizer ? { "@type": "Organization", name: e.organizer } : undefined,
        offers: e.tiers.map((t) => ({
          "@type": "Offer",
          name: t.name,
          price: t.price / 100,
          priceCurrency: "INR",
          availability: t.availability === "sold_out" ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
        })),
      },
    [e]
  );
  useSeo(e?.title, e?.short_description, { image: e?.cover_image?.url, jsonLd });
  if (loading) return <div className="wrap"><Loading /></div>;
  if (error)
    return (
      <div className="wrap py-20">
        {error.includes("not found") ? (
          <Empty title="This experience isn't available." action={<Link to="/discover" className="btn-line">Discover others</Link>}>
            It may have ended or been unpublished.
          </Empty>
        ) : (
          <ErrorState message={error} onRetry={reload} />
        )}
      </div>
    );

  const [legacyWho, cleanHighlights] = splitTaggedItems(e.highlights || [], "Who:");
  const [legacySchedule, cleanGuidelines] = splitTaggedItems(e.guidelines || [], "Schedule:");

  const whoItems = e.who_should_attend?.length ? e.who_should_attend : legacyWho;
  const scheduleItems = e.what_to_expect?.length ? e.what_to_expect : legacySchedule;
  const highlightItems = cleanHighlights;
  const guidelineItems = cleanGuidelines;
  const includedItems = e.included || [];
  const durationLabel = fmtDuration(e.start_at, e.end_at);

  return (
    <article data-testid="event-detail-page">
      {/* Cinematic Dark Spotlight Hero: Title & Conversion Hook Left, Framed Poster Right */}
      <header className="bg-ink-deep text-parchment dark-zone relative overflow-hidden">
        {e.cover_image?.url && (
          <img
            src={e.cover_image.url}
            alt=""
            aria-hidden
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover opacity-[0.12] blur-2xl scale-110 pointer-events-none select-none"
          />
        )}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 76% 44%, rgba(255, 210, 10, 0.16) 0%, rgba(255, 210, 10, 0.04) 36%, transparent 66%)",
          }}
        />
        <AmbientField />
        <div className="wrap relative z-10 py-10 lg:py-16">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-6 min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to={`/discover?category=${encodeURIComponent(e.category)}`}
                  className="eyebrow !text-beam link-u"
                >
                  {e.category}
                </Link>
                {e.experience_type?.trim() && (
                  <span className="text-xs px-2.5 py-0.5 bg-ink-surface border border-ink-border text-[#e9e2d6]">
                    {e.experience_type.trim()}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 bg-ink-surface border border-ink-border text-parchment">
                  <LiveDot
                    color={
                      e.availability === "sold_out"
                        ? "bg-invalid"
                        : e.availability === "limited"
                        ? "bg-beam"
                        : "bg-granted"
                    }
                    ping={e.availability !== "sold_out"}
                  />
                  {e.availability === "sold_out"
                    ? "Sold out"
                    : e.availability === "limited" && e.remaining
                    ? `Only ${e.remaining} left`
                    : "Passes available"}
                </span>
              </div>

              {e.is_original && (
                <div className="mt-4">
                  <OriginalMark />
                </div>
              )}

              <h1
                className="font-display text-5xl sm:text-6xl xl:text-[4.85rem] leading-[0.96] mt-4 text-parchment"
                data-testid="event-title"
              >
                <SplitWords text={e.title} step={0.045} />
              </h1>

              {e.short_description && (
                <Reveal delay={0.12} y={14}>
                  <p className="mt-5 text-base sm:text-lg leading-relaxed text-[#e9e2d6]/90 max-w-xl">
                    {e.short_description}
                  </p>
                </Reveal>
              )}

              <Reveal delay={0.18} y={14}>
                <div className="grid sm:grid-cols-3 gap-3 mt-7 text-sm">
                  <div className="bg-ink-surface/85 border border-ink-border px-4 py-3">
                    <p className="eyebrow !text-[#8f8574] flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-beam" aria-hidden /> Date
                    </p>
                    <p className="mt-1 font-medium text-parchment">{fmtDay(e.start_at)}</p>
                  </div>
                  <div className="bg-ink-surface/85 border border-ink-border px-4 py-3">
                    <p className="eyebrow !text-[#8f8574] flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-beam" aria-hidden /> Time
                    </p>
                    <p className="mt-1 font-medium text-parchment">
                      {fmtTime(e.start_at)}
                      {e.end_at ? ` – ${fmtTime(e.end_at)}` : ""}
                    </p>
                  </div>
                  <div className="bg-ink-surface/85 border border-ink-border px-4 py-3">
                    <p className="eyebrow !text-[#8f8574] flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-beam" aria-hidden /> Venue
                    </p>
                    <p className="mt-1 font-medium text-parchment truncate" title={`${e.venue}, ${e.city}`}>
                      {e.venue}, {e.city}
                    </p>
                  </div>
                </div>
              </Reveal>

              <Reveal delay={0.24} y={14}>
                <div className="flex flex-wrap items-center gap-4 mt-8">
                  <a href="#tickets" className="btn-beam group" data-cursor="Reserve">
                    {e.availability === "sold_out"
                      ? "Sold out"
                      : e.min_price === 0
                      ? "Reserve free pass"
                      : e.min_price
                      ? `Reserve passes · ${inr(e.min_price)}`
                      : "Reserve passes"}
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                      aria-hidden
                    />
                  </a>
                  <a
                    href="#about-event"
                    className="inline-flex items-center justify-center px-5 h-12 text-sm font-medium border border-ink-border text-parchment hover:border-beam hover:text-beam transition-colors duration-300"
                  >
                    See what&apos;s inside ↓
                  </a>
                </div>
                <p className="mt-4 text-xs text-[#bdb3a3]">
                  Instant signed QR pass · 10-minute exclusive seat hold · No account needed
                </p>
              </Reveal>
            </div>

            <div className="lg:col-span-6 min-w-0">
              <Reveal
                delay={0.1}
                y={16}
                className="bg-ink-surface border border-ink-border p-3 sm:p-4 shadow-[0_36px_90px_-30px_rgba(0,0,0,0.85)]"
              >
                {e.cover_image?.url ? (
                  <ImageReveal
                    src={e.cover_image.url}
                    alt={e.cover_image.alt || e.title}
                    className="aspect-[16/9]"
                    parallax={12}
                    eager
                  />
                ) : (
                  <div className="aspect-[16/9] bg-black/50" />
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3.5 px-1 text-xs">
                  <span className="font-serial uppercase tracking-[0.12em] text-[#bdb3a3]">
                    {e.city} · {fmtDay(e.start_at)}
                  </span>
                  <span className="font-serial uppercase tracking-[0.1em] text-beam">
                    {e.min_price === 0 ? "Free pass" : e.min_price ? `From ${inr(e.min_price)}` : "Verified Pass"}
                  </span>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </header>

      {/* At-a-Glance Decision Confidence Strip */}
      <section className="bg-surface border-b hairline" aria-label="Experience overview">
        <div className="wrap py-5 grid grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
          <div>
            <p className="eyebrow">Duration</p>
            <p className="mt-1 font-medium text-ink">{durationLabel || "Curated session"}</p>
          </div>
          <div>
            <p className="eyebrow">Hosted by</p>
            <p className="mt-1 font-medium text-ink">{e.organizer?.trim() || "TRAILRZ"}</p>
          </div>
          <div>
            <p className="eyebrow">Entry format</p>
            <p className="mt-1 font-medium text-ink">{e.age_restriction || "Instant QR · Offline check-in"}</p>
          </div>
          <div>
            <p className="eyebrow">Vibe</p>
            <p className="mt-1 font-medium text-ink">
              {e.moods?.length ? e.moods.join(" · ") : e.experience_type?.trim() || e.category}
            </p>
          </div>
        </div>
      </section>

      {/* Main Content + Collectible Ticket Pass Sidebar */}
      <div id="about-event" className="wrap grid lg:grid-cols-12 gap-12 lg:gap-14 mt-14 scroll-mt-24">
        <div className="lg:col-span-7 space-y-12 min-w-0">
          {/* Editorial Story */}
          <section>
            <h2 className="eyebrow mb-3">Why this experience</h2>
            <div className="leading-relaxed whitespace-pre-line text-base sm:text-[17px] text-[#3a352f]">
              {e.description || e.short_description}
            </div>

            {e.why_attend && (
              <Reveal
                delay={0.1}
                y={16}
                className="mt-8 bg-ink-deep text-parchment dark-zone p-6 sm:p-8 relative overflow-hidden"
              >
                <span className="beam-wedge mb-4" aria-hidden />
                <p className="eyebrow !text-beam">Why you should attend</p>
                <p className="mt-3 text-[#e9e2d6] text-base leading-relaxed whitespace-pre-line">{e.why_attend}</p>
              </Reveal>
            )}
          </section>

          {/* Audience Decision Cards */}
          <AudienceGrid items={whoItems} />

          {/* Schedule & Flow Timeline */}
          <ScheduleTimeline items={scheduleItems} />

          {/* Highlights, Included & Guidelines Columns */}
          {(highlightItems.length > 0 || includedItems.length > 0 || guidelineItems.length > 0) && (
            <section className="grid sm:grid-cols-2 gap-6" aria-label="Highlights and essentials">
              <EditorialColumn
                icon={Sparkles}
                eyebrow="Why it stands out"
                title="Highlights"
                items={highlightItems}
                delay={0.05}
              />
              <EditorialColumn
                icon={Check}
                eyebrow="On your pass"
                title="What's included"
                items={includedItems}
                delay={0.1}
              />
              <EditorialColumn
                icon={Info}
                eyebrow="Essentials"
                title="Good to know"
                items={guidelineItems}
                delay={0.15}
              />
            </section>
          )}

          {e.gallery?.length > 0 && (
            <section>
              <h2 className="eyebrow mb-4">Atmosphere & moments</h2>
              <div className="grid grid-cols-2 gap-4">
                {e.gallery.map((g, i) => (
                  <div
                    key={i}
                    className={`overflow-hidden bg-tint ${i % 3 === 0 ? "col-span-2 aspect-[16/9]" : "aspect-square"}`}
                  >
                    <img
                      src={g.url}
                      alt={g.alt || `${e.title} — image ${i + 1}`}
                      className="img-cover zoom-img"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="grid sm:grid-cols-2 gap-8 border-t hairline pt-8 text-sm">
            <div>
              <h2 className="eyebrow mb-2">Venue</h2>
              <p className="font-medium">{e.venue}</p>
              <p className="text-mineral">{e.address || e.city}</p>
              {(e.lat && e.lng) || e.address ? (
                <a
                  className="link-u text-sm mt-2 inline-block"
                  data-testid="event-map-link"
                  target="_blank"
                  rel="noreferrer"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    e.lat && e.lng ? `${e.lat},${e.lng}` : `${e.venue} ${e.address}`
                  )}`}
                >
                  Open in maps →
                </a>
              ) : null}
            </div>
            {e.organizer && (
              <div>
                <h2 className="eyebrow mb-2">Hosted by</h2>
                <p>{e.organizer}</p>
              </div>
            )}
            {e.age_restriction && (
              <div>
                <h2 className="eyebrow mb-2">Age</h2>
                <p>{e.age_restriction}</p>
              </div>
            )}
            {e.cancellation_policy && (
              <div>
                <h2 className="eyebrow mb-2">Cancellation</h2>
                <p>{e.cancellation_policy}</p>
              </div>
            )}
          </section>

          {e.faqs?.length > 0 && (
            <section className="border-t hairline pt-8">
              <h2 className="eyebrow mb-3">Questions</h2>
              <Accordion type="single" collapsible>
                {e.faqs.map((f, i) => (
                  <AccordionItem key={i} value={`f${i}`} className="border-linen">
                    <AccordionTrigger data-testid={`faq-${i}`} className="text-left">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-mineral">{f.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          )}
        </div>

        <aside className="lg:col-span-5 min-w-0">
          <Reveal delay={0.15} y={16} className="lg:sticky lg:top-24">
            <TicketPanel e={e} />
          </Reveal>
        </aside>
      </div>

      {e.related?.length > 0 && (
        <section className="wrap mt-28">
          <h2 className="font-display text-4xl mb-10">You might also like</h2>
          <div className="grid md:grid-cols-3 gap-10">
            {e.related.map((r) => (
              <EventPortrait key={r.id} e={r} />
            ))}
          </div>
        </section>
      )}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-parchment border-t hairline px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-4 no-print">
        <div>
          <p className="text-xs text-mineral">{e.min_price === 0 ? "Free" : "From"}</p>
          <p className="tabular font-medium">{e.min_price ? inr(e.min_price) : ""}</p>
        </div>
        <a href="#tickets" data-testid="mobile-reserve-button" className="btn-ink h-11">
          {e.availability === "sold_out" ? "Sold out" : "Reserve passes"}
        </a>
      </div>
    </article>
  );
}
