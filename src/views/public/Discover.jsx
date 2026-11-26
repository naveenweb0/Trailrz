"use client";

import { useSearchParams, Link } from "react-router-dom";
import { SlidersHorizontal, X } from "lucide-react";
import { api, useLoad } from "@/lib/api";
import { useSeo } from "@/lib/seo";
import { useMeta } from "@/components/public/MetaContext";
import { EventPortrait, EventLine } from "@/components/public/EventBits";
import { Loading, Empty, ErrorState } from "@/components/common/States";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SplitWords } from "@/components/motion/Motion";

const KEYS = ["q", "city", "category", "mood", "when", "date_from", "date_to", "price_max", "availability", "original", "sort"];
const LABELS = { when: { today: "Today", weekend: "This weekend", week: "Next 7 days", month: "Next 30 days" }, availability: { available: "Available", limited: "Limited left" } };

function Filters({ params, set }) {
  const { meta } = useMeta();
  const v = (k) => params.get(k) || "";
  const Group = ({ k, label, opts }) => (
    <fieldset className="py-5 border-b hairline">
      <legend className="eyebrow mb-3">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {opts.map(([val, l]) => (
          <button key={val || "any"} type="button" data-testid={`filter-${k}-${(val || "any").toString().toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
            aria-pressed={v(k) === val} onClick={() => set(k, val)}
            className={`text-sm px-3 py-1.5 border transition-colors ${v(k) === val ? "bg-ink text-parchment border-ink" : "hairline hover:border-ink"}`}>{l}</button>
        ))}
      </div>
    </fieldset>
  );
  return (
    <div>
      <Group k="city" label="City" opts={[["", "All"], ...(meta?.supported_cities || []).map((c) => [c, c])]} />
      <Group k="when" label="Date" opts={[["", "Anytime"], ["today", "Today"], ["weekend", "Weekend"], ["week", "7 days"], ["month", "30 days"]]} />
      <fieldset className="py-5 border-b hairline">
        <legend className="eyebrow mb-3">Specific dates</legend>
        <div className="grid grid-cols-2 gap-2">
          <input type="date" aria-label="From date" data-testid="filter-date-from" value={v("date_from")} onChange={(e) => set("date_from", e.target.value)} className="field h-10 text-sm" />
          <input type="date" aria-label="To date" data-testid="filter-date-to" value={v("date_to")} onChange={(e) => set("date_to", e.target.value)} className="field h-10 text-sm" />
        </div>
      </fieldset>
      <Group k="category" label="Category" opts={[["", "All"], ...(meta?.categories || []).map((c) => [c, c])]} />
      <Group k="mood" label="Mood" opts={[["", "Any"], ...(meta?.moods || []).map((c) => [c, c])]} />
      <Group k="price_max" label="Price" opts={[["", "Any"], ["0", "Free"], ["500", "≤ ₹500"], ["1500", "≤ ₹1,500"], ["3000", "≤ ₹3,000"]]} />
      <Group k="availability" label="Availability" opts={[["", "Everything"], ["available", "Available"], ["limited", "Limited left"]]} />
      <Group k="original" label="Collection" opts={[["", "All"], ["true", "TRAILRZ Originals"]]} />
    </div>
  );
}

export default function Discover() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page") || 1);
  const qs = params.toString();
  useSeo("Discover experiences", "Search concerts, supper clubs, workshops, comedy and culture across Chandigarh, Mohali and Panchkula.");
  const { data, loading, error, reload } = useLoad(async () => (await api.get(`/public/events?${qs}&limit=12`)).data, [qs]);
  const set = (k, val) => {
    const p = new URLSearchParams(params);
    if (val) p.set(k, val); else p.delete(k);
    if (k !== "page") p.delete("page");
    setParams(p);
  };
  const active = KEYS.filter((k) => k !== "sort" && params.get(k));
  const reset = () => setParams(new URLSearchParams());
  return (
    <div className="wrap pt-10 pb-10" data-testid="discover-page">
      <p className="eyebrow">Discover</p>
      <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl mt-3 leading-none"><SplitWords text="Every experience," /><SplitWords text="curated." className="italic" delay={0.2} /></h1>
      <form onSubmit={(e) => { e.preventDefault(); set("q", new FormData(e.target).get("q")); }} className="mt-10 flex border-b border-ink max-w-3xl">
        <label htmlFor="dq" className="sr-only">Search by title, venue, city or category</label>
        <input id="dq" name="q" key={params.get("q")} defaultValue={params.get("q") || ""} data-testid="discover-search-input" placeholder="Search by title, venue, city or category" className="flex-1 bg-transparent h-14 text-xl outline-none" />
        <button data-testid="discover-search-submit" className="text-sm font-semibold px-2">Search →</button>
      </form>

      <div className="flex flex-wrap items-center gap-3 mt-6 min-h-[36px]">
        <Sheet>
          <SheetTrigger data-testid="discover-filters-open" className="lg:hidden inline-flex items-center gap-2 text-sm border border-ink px-3 h-9"><SlidersHorizontal className="h-4 w-4" /> Filters{active.length ? ` (${active.length})` : ""}</SheetTrigger>
          <SheetContent side="left" className="bg-parchment overflow-y-auto w-full sm:max-w-sm">
            <SheetTitle className="font-display text-3xl font-normal">Filters</SheetTitle>
            <Filters params={params} set={set} />
          </SheetContent>
        </Sheet>
        {active.map((k) => (
          <button key={k} data-testid={`active-filter-${k}`} onClick={() => set(k, "")} className="inline-flex items-center gap-1.5 text-sm bg-tint px-3 h-9">
            {LABELS[k]?.[params.get(k)] || (k === "original" ? "Originals" : k === "price_max" ? `≤ ₹${params.get(k)}` : params.get(k))} <X className="h-3.5 w-3.5" aria-label="Remove filter" />
          </button>
        ))}
        {active.length > 0 && <button data-testid="discover-reset-filters" onClick={reset} className="text-sm underline underline-offset-4">Reset all</button>}
        <label className="ml-auto flex items-center gap-2 text-sm">
          <span className="text-mineral">Sort</span>
          <select data-testid="discover-sort" value={params.get("sort") || "date"} onChange={(e) => set("sort", e.target.value === "date" ? "" : e.target.value)} className="bg-transparent border hairline h-9 px-2">
            <option value="date">Date</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option>
          </select>
        </label>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-12 mt-8">
        <aside className="hidden lg:block" aria-label="Filters"><Filters params={params} set={set} /></aside>
        {/* Keep the current results on screen while the next filter/page load
            is in flight, so the grid never collapses into a bare spinner. */}
        <section aria-live="polite" aria-busy={loading} className={`transition-opacity duration-200 ${loading && data ? "opacity-60" : ""}`}>
          {loading && !data ? <Loading label="Searching" /> : error ? <ErrorState message={error} onRetry={reload} /> : data.total === 0 ? (
            <Empty title="Nothing matches — yet." action={active.length ? <button onClick={reset} className="btn-line" data-testid="empty-reset">Clear filters</button> : <Link to="/" className="btn-line">Back home</Link>}>
              {active.length ? "Try widening your dates or removing a filter." : "No experiences are on sale right now. New listings appear here the moment they're published."}
            </Empty>
          ) : (
            <>
              <p className="text-sm text-mineral mb-6 tabular" data-testid="discover-result-count">{data.total} {data.total === 1 ? "experience" : "experiences"}</p>
              <div className="grid sm:grid-cols-2 gap-x-10 gap-y-14">
                {data.items.slice(0, 4).map((e, i) => <div key={e.id} className={i % 2 ? "sm:pt-16" : ""}><EventPortrait e={e} tall={i % 3 === 0} /></div>)}
              </div>
              {data.items.length > 4 && <div className="mt-14 border-t hairline">{data.items.slice(4).map((e) => <EventLine key={e.id} e={e} />)}</div>}
              {data.pages > 1 && (
                <nav className="flex gap-2 mt-12" aria-label="Pagination">
                  {Array.from({ length: data.pages }, (_, i) => i + 1).map((p) => (
                    <button key={p} data-testid={`discover-page-${p}`} aria-current={p === page ? "page" : undefined} onClick={() => { set("page", String(p)); if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true }); else window.scrollTo(0, 0); }}
                      className={`w-10 h-10 border tabular ${p === page ? "bg-ink text-parchment border-ink" : "hairline"}`}>{p}</button>
                  ))}
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
