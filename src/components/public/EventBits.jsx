import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { inr, fmtDay, fmtTime, fmtDate } from "@/lib/api";
import { Reveal, SplitWords, LiveDot } from "@/components/motion/Motion";

export function AvailTag({ a, remaining, className = "" }) {
  const map = {
    available: ["Passes available", "text-olive"],
    limited: [`Only ${remaining} left`, "text-ink bg-beam px-1.5"],
    sold_out: ["Sold out", "text-mineral line-through"],
    unavailable: ["Not on sale", "text-mineral"],
  };
  const [label, cls] = map[a] || map.unavailable;
  return (
    <span data-testid="availability-tag" className={`inline-flex items-center gap-1.5 text-xs font-semibold ${cls} ${className}`}>
      {(a === "available" || a === "limited") && (
        <LiveDot color={a === "limited" ? "bg-ink" : "bg-olive"} ping={a === "limited"} />
      )}
      {label}
    </span>
  );
}

export function Cover({ e, className = "" }) {
  if (e.cover_image?.url)
    return <img src={e.cover_image.url} alt={e.cover_image.alt || e.title} loading="lazy" className={`img-cover zoom-img ${className}`} />;
  return (
    <div className={`w-full h-full bg-ink-surface text-parchment flex items-end p-6 ${className}`}>
      <span className="font-display text-2xl opacity-70">{e.title}</span>
    </div>
  );
}

export const OriginalMark = () => (
  <span className="inline-flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em]">
    <span className="beam-wedge !w-6 !h-[7px]" aria-hidden /> TRAILRZ Original
  </span>
);

const metaLine = (e) => `${e.venue} · ${e.city}`;

export function EventFeature({ e, index = 0 }) {
  return (
    <Reveal delay={index * 0.08}>
    <Link to={`/events/${e.slug}`} data-testid={`event-feature-${e.slug}`} className="group grid lg:grid-cols-12 gap-6 lg:gap-12 items-end">
      <div className="lg:col-span-8 aspect-[16/10] overflow-hidden bg-tint relative card-sheen"><Cover e={e} /><HoverTag /></div>
      <div className="lg:col-span-4 pb-2">
        <p className="eyebrow">{e.category} · {fmtDay(e.start_at)}</p>
        {e.is_original && <div className="mt-3"><OriginalMark /></div>}
        <h3 className="font-display text-4xl sm:text-5xl leading-[1.04] mt-4">{e.title}</h3>
        <p className="text-mineral mt-4 leading-relaxed line-clamp-3">{e.short_description}</p>
        <div className="mt-6 pt-4 border-t hairline flex items-end justify-between gap-4 text-sm">
          <div>
            <p>{metaLine(e)}</p>
            <p className="text-mineral">{fmtTime(e.start_at)}</p>
          </div>
          <div className="text-right">
            <p className="tabular font-medium">{e.min_price === 0 ? "Free" : `From ${inr(e.min_price)}`}</p>
            <AvailTag a={e.availability} remaining={e.remaining} />
          </div>
        </div>
      </div>
    </Link>
    </Reveal>
  );
}

const HoverTag = () => (
  <span className="absolute right-4 top-4 bg-parchment text-ink text-xs font-semibold px-3 py-2 inline-flex items-center gap-1 opacity-0 -translate-y-2 transition-[opacity,transform] duration-300 group-hover:opacity-100 group-hover:translate-y-0">
    View experience <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
  </span>
);

export function EventPortrait({ e, tall = false }) {
  return (
    <Reveal>
    <Link to={`/events/${e.slug}`} data-testid={`event-portrait-${e.slug}`} className="group block">
      <div className={`${tall ? "aspect-[3/4]" : "aspect-[4/3]"} overflow-hidden bg-tint relative card-sheen`}><Cover e={e} /><HoverTag /></div>
      <div className="mt-4 flex justify-between gap-4">
        <p className="eyebrow">{e.category}</p>
        <AvailTag a={e.availability} remaining={e.remaining} />
      </div>
      <h3 className="font-display text-[1.75rem] leading-tight mt-2">{e.title}</h3>
      <p className="text-sm text-mineral mt-2">{fmtDay(e.start_at)}, {fmtTime(e.start_at)} · {metaLine(e)}</p>
      <p className="text-sm mt-1 tabular">{e.min_price === 0 ? "Free" : `From ${inr(e.min_price)}`}</p>
    </Link>
    </Reveal>
  );
}

export function EventLine({ e }) {
  const d = new Date(e.start_at);
  return (
    <Link to={`/events/${e.slug}`} data-testid={`event-line-${e.slug}`} className="group relative grid transition-[padding] duration-300 hover:pl-3 hover:bg-tint/60 grid-cols-[64px_1fr] sm:grid-cols-[88px_1fr_auto] gap-x-5 gap-y-1 items-center py-5 border-b hairline">
      <div className="row-span-2 sm:row-span-1">
        <p className="font-display text-4xl leading-none tabular">{d.toLocaleDateString("en-IN", { day: "2-digit", timeZone: "Asia/Kolkata" })}</p>
        <p className="eyebrow mt-1">{d.toLocaleDateString("en-IN", { month: "short", timeZone: "Asia/Kolkata" })}</p>
      </div>
      <div className="min-w-0">
        <p className="eyebrow">{e.category}{e.is_original ? " · Original" : ""}</p>
        <h3 className="font-display text-2xl leading-tight mt-1 group-hover:underline underline-offset-4 decoration-1">{e.title}</h3>
        <p className="text-sm text-mineral mt-1 truncate">{fmtTime(e.start_at)} · {metaLine(e)}</p>
      </div>
      <div className="col-start-2 sm:col-start-3 flex sm:flex-col sm:items-end gap-3 sm:gap-1 text-sm">
        <span className="tabular font-medium">{e.min_price === 0 ? "Free" : `From ${inr(e.min_price)}`}</span>
        <AvailTag a={e.availability} remaining={e.remaining} />
        <ArrowUpRight className="hidden sm:block h-4 w-4 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
      </div>
    </Link>
  );
}

export const SectionHead = ({ eyebrow, title, children, action }) => (
  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
    <div className="max-w-2xl">
      <Reveal y={16} className="flex items-center gap-3"><span className="beam-wedge" aria-hidden /><p className="eyebrow">{eyebrow}</p></Reveal>
      <h2 className="font-display text-4xl sm:text-5xl mt-4 leading-[1.05]">{typeof title === "string" ? <SplitWords text={title} step={0.05} /> : <Reveal y={24}>{title}</Reveal>}</h2>
      {children && <Reveal delay={0.15}><p className="text-mineral mt-4 leading-relaxed">{children}</p></Reveal>}
    </div>
    {action && <Reveal delay={0.2}>{action}</Reveal>}
  </div>
);

export { fmtDate };

