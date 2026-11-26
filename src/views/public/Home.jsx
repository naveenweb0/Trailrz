"use client";

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion, useScroll, useTransform, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { api, errMsg, useLoad } from "@/lib/api";
import { useSeo } from "@/lib/seo";
import { useMeta } from "@/components/public/MetaContext";
import { EventFeature, EventPortrait, EventLine, SectionHead, OriginalMark } from "@/components/public/EventBits";
import { Loading, ErrorState } from "@/components/common/States";
import { EASE, Reveal, SplitWords, ImageReveal, Parallax, ScrollFillText, Counter, ShuttleLine, LiveDot } from "@/components/motion/Motion";
import { VelocityMarquee, HorizontalScroll, FollowList } from "@/components/motion/Crazy";
import { ZoomThrough, CardFan, SlideLines, ScrollTrigger } from "@/components/motion/Wow";
import HeroPoster from "@/components/public/HeroPoster";

export const MOOD_IMG = {
  "Date Night": "date-night", "With Friends": "with-friends", "Family Time": "family-time", "Creative Escape": "creative-escape",
  "Slow Evenings": "slow-evenings", "Food Lovers": "food-lovers", "Music Nights": "music-nights", "Something Different": "something-different",
};
const CAT_IMG = {
  Music: "concert", "Food & Dining": "food-lovers", "Art & Culture": "something-different", Comedy: "comedy", Workshops: "creative-escape",
  Nightlife: "rooftop", Outdoor: "outdoor", Family: "family-time", "Social Experiences": "with-friends", Theatre: "theatre",
};

const CHAPTERS = [
  { id: "curated", label: "Tonight" },
  { id: "moods", label: "Moods" },
  { id: "originals", label: "Originals" },
  { id: "letter", label: "The letter" },
];

// A quiet margin note for a very long page: where you are, and where you can go.
function ChapterRail() {
  const [active, setActive] = useState("");
  const { scrollYProgress } = useScroll();
  const fill = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    CHAPTERS.forEach((c) => {
      const el = document.getElementById(c.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  const go = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (window.__lenis) window.__lenis.scrollTo(el, { offset: -80 });
    else el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav aria-label="Page sections" className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-end gap-4 no-print xl:flex mix-blend-difference text-white">
      <span className="relative mb-1 block h-24 w-px bg-white/25" aria-hidden>
        <motion.span className="absolute inset-0 origin-top bg-white" style={{ scaleY: fill }} />
      </span>
      {CHAPTERS.map((c) => (
        <button key={c.id} onClick={() => go(c.id)} data-testid={`chapter-${c.id}`} data-cursor={c.label} className="group flex items-center gap-3">
          <span className={`text-[10px] uppercase tracking-[0.16em] transition-all duration-300 ${active === c.id ? "opacity-100" : "opacity-0 group-hover:opacity-80"}`}>{c.label}</span>
          <span className={`h-px transition-all duration-300 ${active === c.id ? "w-7 bg-white" : "w-3 bg-white/40 group-hover:w-5 group-hover:bg-white/70"}`} />
        </button>
      ))}
    </nav>
  );
}

// A press stamp for the first season — the page has no listings yet, so the
// empty state gets a printed mark instead of apologising in grey text.
function SeasonSeal({ className = "" }) {
  return (
    <svg viewBox="0 0 120 120" className={`trz-spin-slow ${className}`} aria-hidden>
      <defs>
        <path id="trz-seal-path" d="M60,60 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0" />
      </defs>
      <text fontSize="8" letterSpacing="2.1" className="fill-current font-serial">
        <textPath href="#trz-seal-path" startOffset="0">FIRST SEASON — 2026 — CURATED IN THE TRICITY — </textPath>
      </text>
    </svg>
  );
}

function DiscoveryBar() {
  const { meta } = useMeta();
  const nav = useNavigate();
  const [f, setF] = useState({ city: "", when: "", category: "", mood: "", price_max: "", availability: "" });
  const go = (e) => {
    e.preventDefault();
    nav(`/discover?${new URLSearchParams(Object.entries(f).filter(([, v]) => v))}`);
  };
  const sel = (k, label, opts) => (
    <label className="group flex flex-col gap-1 px-4 py-3 border-b md:border-b-0 md:border-r hairline min-w-0 hover:bg-tint transition-colors duration-200">
      <span className="eyebrow group-hover:text-ink">{label}</span>
      <select data-testid={`discovery-${k}`} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="bg-transparent text-[0.9375rem] outline-none truncate">
        {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
  return (
    <motion.form onSubmit={go} initial={{ opacity: 0, y: 60 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 1, ease: EASE }}
      className="grid grid-cols-2 md:grid-cols-[repeat(6,minmax(0,1fr))_auto] border hairline bg-surface shadow-[0_40px_80px_-40px_rgba(0,0,0,0.6)]" data-testid="discovery-bar">
      {sel("city", "City", [["", "All cities"], ...(meta?.supported_cities || []).map((c) => [c, c])])}
      {sel("when", "Date", [["", "Anytime"], ["today", "Today"], ["weekend", "This weekend"], ["week", "Next 7 days"], ["month", "Next 30 days"]])}
      {sel("category", "Category", [["", "All"], ...(meta?.categories || []).map((c) => [c, c])])}
      {sel("mood", "Mood", [["", "Any mood"], ...(meta?.moods || []).map((c) => [c, c])])}
      {sel("price_max", "Price", [["", "Any price"], ["0", "Free"], ["500", "Under ₹500"], ["1500", "Under ₹1,500"], ["3000", "Under ₹3,000"]])}
      {sel("availability", "Availability", [["", "Everything"], ["available", "Passes available"], ["limited", "Limited left"]])}
      <button data-testid="discovery-submit" data-cursor="Find" className="btn-ink group col-span-2 md:col-span-1 h-auto min-h-[56px] px-8">Find <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden /></button>
    </motion.form>
  );
}

function Curated({ items }) {
  if (!items.length)
    return (
      <section id="curated" className="wrap py-28 grid lg:grid-cols-12 gap-12 items-end scroll-mt-24" data-testid="curated-empty">
        <div className="lg:col-span-5">
          <SectionHead eyebrow="Curated experiences" title="The first season is being curated.">
            Nothing is on sale yet. We publish only what we'd go to ourselves — leave your email below and we'll write the moment the doors open.
          </SectionHead>
          <Reveal delay={0.2}><a href="#letter" data-cursor="Join" className="btn-ink group">Get the first invitation <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></a></Reveal>
        </div>
        <div className="relative lg:col-span-7">
          <div className="grid grid-cols-3 gap-4">
            {["slow-evenings", "creative-escape", "date-night"].map((im, i) => (
              <Parallax key={im} speed={30 + i * 40}><ImageReveal src={`/img/${im}.jpg`} alt="Atmosphere — illustrative" className={`aspect-[3/4] ${i === 1 ? "mt-20" : ""}`} delay={i * 0.15} parallax={0} /></Parallax>
            ))}
          </div>
          <div className="absolute -left-3 -top-10 sm:-left-6 sm:-top-12 flex h-24 w-24 items-center justify-center rounded-full border hairline bg-parchment shadow-[0_20px_44px_-20px_rgba(24,22,20,0.45)] sm:h-32 sm:w-32" aria-hidden>
            <SeasonSeal className="absolute inset-0 text-ink" />
            <span className="beam-wedge !w-7 !h-2" />
          </div>
        </div>
      </section>
    );
  const [lead, ...rest] = items;
  return (
    <section id="curated" className="wrap py-24 scroll-mt-24" aria-labelledby="curated-title">
      <SectionHead eyebrow="Curated experiences" title={<span id="curated-title">Worth stepping out for</span>}
        action={<Link to="/discover" className="text-sm link-u" data-testid="curated-view-all">View all experiences →</Link>} />
      <EventFeature e={lead} />
      {rest.length > 0 && (
        <div className="grid md:grid-cols-12 gap-10 mt-20">
          <div className="md:col-span-5">{rest[0] && <EventPortrait e={rest[0]} tall />}</div>
          <div className="md:col-span-6 md:col-start-7 md:pt-24">
            {rest[1] && <EventPortrait e={rest[1]} />}
            <div className="mt-10">{rest.slice(2).map((e) => <EventLine key={e.id} e={e} />)}</div>
          </div>
        </div>
      )}
    </section>
  );
}

function Moods() {
  const { meta } = useMeta();
  const moods = meta?.moods || Object.keys(MOOD_IMG);
  const reduce = useReducedMotion();
  const sectionRef = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 90, damping: 22 });
  const sy = useSpring(my, { stiffness: 90, damping: 22 });
  const [lampOn, setLampOn] = useState(false);
  const [fine, setFine] = useState(false);
  useEffect(() => {
    setFine(window.matchMedia("(pointer: fine)").matches);
  }, []);
  // The lamp is the brand's own metaphor: a warm pool of light over the list.
  // It is one transformed gradient layer, so it costs the compositor nothing.
  const lamp = fine && !reduce;
  const track = (e) => {
    const r = sectionRef.current?.getBoundingClientRect();
    if (!r || !lamp) return;
    mx.set(e.clientX - r.left);
    my.set(e.clientY - r.top);
  };
  return (
    <section
      ref={sectionRef}
      id="moods"
      onMouseMove={track}
      onMouseEnter={() => setLampOn(true)}
      onMouseLeave={() => setLampOn(false)}
      className="relative bg-ink-deep text-parchment dark-zone py-28 overflow-hidden"
      aria-labelledby="moods-title"
    >
      {lamp && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 h-[70vmax] w-[70vmax] -ml-[35vmax] -mt-[35vmax] rounded-full transition-opacity duration-700"
          style={{
            x: sx,
            y: sy,
            opacity: lampOn ? 1 : 0,
            background: "radial-gradient(circle, rgba(255,210,10,0.16) 0%, rgba(255,210,10,0.05) 38%, transparent 62%)",
          }}
        />
      )}
      <div className="wrap relative z-10">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-12">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[#8f8574] flex items-center gap-3"><span className="beam-wedge" aria-hidden /> Discover by mood</p>
            <h2 id="moods-title" className="font-display text-5xl sm:text-7xl mt-4 leading-none"><SplitWords text="What kind of evening is it?" step={0.05} /></h2>
          </div>
          <p className="text-sm text-[#8f8574] hidden lg:block">Hover a mood →</p>
        </div>
        <FollowList items={moods.map((m) => ({ label: m, to: `/discover?mood=${encodeURIComponent(m)}`, img: `/img/${MOOD_IMG[m] || "concert"}.jpg` }))} />
      </div>
    </section>
  );
}

const TABS = [["soon", "Happening soon"], ["weekend", "This weekend"], ["recent", "Recently added"], ["popular", "Popular"], ["limited", "Limited availability"]];

function Upcoming({ data }) {
  const tabs = TABS.filter(([k]) => data[k]?.length);
  const [tab, setTab] = useState(tabs[0]?.[0]);
  if (!tabs.length) return null;
  const cur = tabs.find(([k]) => k === tab) ? tab : tabs[0][0];
  return (
    <section className="wrap py-24" aria-labelledby="upcoming-title">
      <SectionHead eyebrow="On the calendar" title={<span id="upcoming-title">Coming up</span>} />
      <div role="tablist" className="flex gap-6 overflow-x-auto border-b hairline mb-2">
        {tabs.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={cur === k} data-testid={`upcoming-tab-${k}`} onClick={() => setTab(k)} className={`relative pb-3 text-sm whitespace-nowrap transition-colors ${cur === k ? "" : "text-mineral hover:text-ink"}`}>
            {l}{cur === k && <motion.span layoutId="tab-line" className="absolute left-0 right-0 -bottom-px h-[2px] bg-ink" />}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={cur} role="tabpanel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
          {data[cur].map((e) => <EventLine key={e.id} e={e} />)}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

const STEPS = [
  ["Discover", "Browse by city, date, mood or category. Every listing shows its real availability — no fake urgency.", "Live availability"],
  ["Reserve", "Pick your passes and we hold them for 10 minutes while you pay. No account, no passwords.", "10-min seat hold"],
  ["Walk in", "Your pass arrives with a signed QR code. Show it at the door, and the night is yours.", "Offline QR entry"],
];

function HowItWorks() {
  const ref = useRef(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);
  return (
    <section ref={ref} className="wrap py-24" aria-labelledby="how-title">
      <SectionHead eyebrow="How it works" title={<span id="how-title">Three steps to a better evening</span>} />
      <div className="relative mb-12">
        <ShuttleLine />
        <motion.div style={{ scaleX }} className="absolute inset-y-0 left-0 right-0 bg-beam/55 origin-left pointer-events-none" />
      </div>
      <div className="grid md:grid-cols-3 gap-6 lg:gap-10">
        {STEPS.map(([t, d, tag], i) => {
          const isOn = active === i;
          return (
            <Reveal key={t} delay={i * 0.12}>
              <div
                onMouseEnter={() => setActive(i)}
                onClick={() => setActive(i)}
                className={`group card-sheen cursor-pointer border p-6 sm:p-7 transition-[background-color,border-color,box-shadow] duration-500 ${
                  isOn ? "bg-surface border-ink shadow-[0_24px_60px_-34px_rgba(24,22,20,0.22)]" : "bg-surface/40 hairline hover:bg-surface"
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className={`inline-flex items-center gap-2 text-[11px] font-serial uppercase tracking-wider px-2.5 py-1 border transition-colors ${isOn ? "bg-ink-deep text-parchment border-ink-deep" : "bg-tint hairline text-mineral"}`}>
                    <LiveDot color={isOn ? "bg-beam" : "bg-mineral"} ping={isOn} /> {tag}
                  </span>
                </div>
                <Counter to={i + 1} className={`font-display text-[7.5rem] sm:text-[8.5rem] leading-none transition-colors duration-500 tabular ${isOn ? "text-ink" : "text-outline-ink group-hover:text-beam"}`} />
                <h3 className="font-display text-4xl mt-2">{t}</h3>
                <p className="text-mineral mt-3 leading-relaxed max-w-sm">{d}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

function Originals({ items }) {
  return (
    <section id="originals" className="bg-ink-deep text-parchment dark-zone py-28 overflow-hidden relative" aria-labelledby="originals-title">
      <motion.span aria-hidden className="absolute -right-20 top-24 w-[60vw] h-24 bg-beam origin-right" style={{ clipPath: "polygon(0 70%, 100% 0, 100% 100%, 0 100%)" }}
        initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 1.4, ease: EASE }} />
      <div className="wrap grid lg:grid-cols-12 gap-12 relative">
        <div className="lg:col-span-4">
          <Reveal><OriginalMark /></Reveal>
          <h2 id="originals-title" className="font-display text-5xl sm:text-6xl mt-6 leading-[1.02]"><SplitWords text="Made by us, for the city." /></h2>
          <Reveal delay={0.2}><p className="text-[#bdb3a3] mt-6 leading-relaxed">TRAILRZ Originals are experiences we commission and host ourselves — small rooms, careful hosts, things you won't find twice.</p></Reveal>
          <Reveal delay={0.3}><Link to="/originals" data-testid="originals-section-link" className="inline-flex mt-8 text-sm link-u text-beam">Explore Originals →</Link></Reveal>
        </div>
        <div className="lg:col-span-7 lg:col-start-6 mt-10 lg:mt-32">
          {items.length ? (
            <div className="grid sm:grid-cols-2 gap-10">
              {items.map((e, i) => (
                <Reveal key={e.id} delay={i * 0.1}>
                  <Link to={`/events/${e.slug}`} data-testid={`original-card-${e.slug}`} data-cursor="View" className="group block border-t border-ink-border pt-5">
                    <div className="aspect-[4/3] overflow-hidden bg-ink-surface">{e.cover_image?.url && <img src={e.cover_image.url} alt={e.cover_image.alt || e.title} className="img-cover zoom-img" loading="lazy" />}</div>
                    <h3 className="font-display text-3xl mt-5">{e.title}</h3>
                    <p className="text-sm text-[#bdb3a3] mt-2">{e.venue} · {e.city}</p>
                  </Link>
                </Reveal>
              ))}
            </div>
          ) : (
            <Reveal className="grid sm:grid-cols-[1fr_1.2fr] gap-6 items-end" data-testid="originals-empty">
              <ImageReveal src="/img/theatre.jpg" alt="Performers silhouetted against a red curtain — illustrative" className="aspect-[4/5]" />
              <div className="border-l-2 border-beam pl-6 pb-2">
                <p className="font-display text-4xl leading-tight">The first Original is in rehearsal.</p>
                <p className="text-[#bdb3a3] mt-3">Nothing to book yet — subscribe below to hear first.</p>
              </div>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}

function Cities({ cities }) {
  const { meta } = useMeta();
  const list = cities.length ? cities : (meta?.supported_cities || []).map((c) => ({ city: c, count: null }));
  return (
    <section className="wrap py-28" aria-labelledby="cities-title">
      <SectionHead eyebrow="City by city" title={<span id="cities-title">Where we are</span>}>
        {cities.length ? "Experiences currently listed, by city." : "Starting in the Tricity. Listings appear here as they go on sale."}
      </SectionHead>
      <div className="border-t hairline">
        {list.map((c, i) => (
          <Reveal key={c.city} delay={i * 0.08} y={20}>
            <Link to={`/discover?city=${encodeURIComponent(c.city)}`} data-testid={`city-link-${c.city.toLowerCase()}`} data-cursor="Explore" className="group relative flex items-baseline justify-between gap-6 py-6 border-b hairline overflow-hidden">
              <span className="absolute inset-0 bg-ink origin-bottom scale-y-0 group-hover:scale-y-100 transition-transform duration-500 ease-out" aria-hidden />
              <span className="relative font-display text-6xl sm:text-8xl lg:text-9xl leading-none text-outline-ink group-hover:text-beam group-hover:[-webkit-text-stroke:0] group-hover:translate-x-6 transition-[transform,color] duration-500 pl-2">{c.city}</span>
              <span className="relative text-sm text-mineral group-hover:text-parchment tabular flex items-center gap-3 pr-2 transition-colors">
                {c.count === null ? "Opening soon" : `${c.count} ${c.count === 1 ? "experience" : "experiences"}`}
                <ArrowUpRight className="h-6 w-6 transition-transform duration-300 group-hover:rotate-45" aria-hidden />
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Story() {
  return (
    <section className="wrap py-24 grid lg:grid-cols-12 gap-12 items-center" aria-labelledby="story-title">
      <ImageReveal src="/img/story.jpg" alt="A visitor standing before paintings in a quiet gallery" className="lg:col-span-6 aspect-[4/3]" parallax={50} />
      <div className="lg:col-span-5 lg:col-start-8">
        <Reveal><p className="eyebrow">Why TRAILRZ</p></Reveal>
        <h2 id="story-title" className="font-display text-5xl mt-5 leading-[1.04]"><SplitWords text="We're not selling tickets. We're keeping a lookout." step={0.04} /></h2>
        <Reveal delay={0.2} className="mt-6 space-y-4 text-mineral leading-relaxed">
          <p>Every city has rooms where something good is happening tonight. We go looking for them.</p>
          <p>We list fewer things, on purpose. Each experience is chosen for its hosts, its atmosphere and the chance it gives you to meet your city again.</p>
        </Reveal>
        <Reveal delay={0.3}><Link to="/about" data-testid="story-about-link" className="inline-flex mt-8 text-sm link-u">Read our story →</Link></Reveal>
      </div>
    </section>
  );
}

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/public/subscribe", { email, consent });
      setDone(true);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section id="letter" className="wrap scroll-mt-24" aria-labelledby="letter-title">
      <Reveal className="border-t-2 border-ink pt-12 grid lg:grid-cols-2 gap-10">
        <div>
          <h2 id="letter-title" className="font-display text-4xl sm:text-5xl leading-tight">The TRAILRZ letter</h2>
          <p className="text-mineral mt-3 max-w-md">A short note when new experiences go on sale. No noise, unsubscribe anytime.</p>
        </div>
        <AnimatePresence mode="wait">
          {done ? (
            <motion.p key="ok" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} data-testid="newsletter-success" className="font-display text-3xl self-center">Thank you — you're on the list.</motion.p>
          ) : (
            <motion.form key="form" exit={{ opacity: 0, y: -10 }} onSubmit={submit} className="self-center">
              <div className="flex border-b border-ink">
                <label htmlFor="nl-email" className="sr-only">Email address</label>
                <input id="nl-email" data-testid="newsletter-email-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email address" className="flex-1 bg-transparent h-12 outline-none text-lg" />
                <button data-testid="newsletter-submit" disabled={busy || !consent} className="group text-sm font-semibold px-2 disabled:opacity-40 inline-flex items-center gap-1">Subscribe <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></button>
              </div>
              <label className="flex items-start gap-3 mt-4 text-sm text-mineral">
                <input type="checkbox" data-testid="newsletter-consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 accent-[#181614]" />
                I agree to receive occasional emails from TRAILRZ and accept the <Link to="/privacy" className="underline">privacy policy</Link>.
              </label>
            </motion.form>
          )}
        </AnimatePresence>
      </Reveal>
    </section>
  );
}

export default function Home() {
  useSeo(null, null);
  const { meta } = useMeta();
  const { data, loading, error, reload } = useLoad(async () => (await api.get("/public/home")).data);
  const cats = (meta?.categories || Object.keys(CAT_IMG)).map((c) => ({ label: c, to: `/discover?category=${encodeURIComponent(c)}`, img: `/img/${CAT_IMG[c] || "concert"}.jpg` }));
  const homeRef = useRef(null);

  useEffect(() => {
    let rafId = 0;
    let settle;
    let lastHeight = 0;
    // ScrollTrigger.refresh() re-measures every pinned/scrubbed section on the
    // page. Images above it decoding one after another used to fire a burst of
    // refreshes; coalesce the burst into a single pass after things settle.
    const syncScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        clearTimeout(settle);
        settle = setTimeout(() => {
          ScrollTrigger.sort();
          ScrollTrigger.refresh();
          window.__lenis?.resize();
          if (homeRef.current) {
            lastHeight = homeRef.current.offsetHeight;
          }
        }, 120);
      });
    };

    syncScroll();
    window.addEventListener("load", syncScroll);
    document.fonts?.ready?.then(syncScroll).catch(() => {});

    let ro;
    if (typeof ResizeObserver !== "undefined" && homeRef.current) {
      ro = new ResizeObserver(() => {
        const nextHeight = homeRef.current?.offsetHeight || 0;
        if (nextHeight && Math.abs(nextHeight - lastHeight) > 2) {
          syncScroll();
        }
      });
      ro.observe(homeRef.current);
    }

    const t = setTimeout(syncScroll, 350);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t);
      clearTimeout(settle);
      window.removeEventListener("load", syncScroll);
      ro?.disconnect();
    };
  }, [loading, data, meta]);

  return (
    <div ref={homeRef} data-testid="home-page">
      <ChapterRail />
      <HeroPoster />
      <div className="bg-ink-deep pb-16 pt-2"><div className="wrap relative z-20"><DiscoveryBar /></div></div>
      <section className="bg-beam py-6 overflow-hidden border-y-2 border-ink" aria-hidden>
        <VelocityMarquee text="Life is happening ✦ Go be part of it ✦" className="font-display text-[12vw] lg:text-[8vw] leading-none text-ink" />
      </section>
      {loading ? <div className="wrap"><Loading label="Finding what's on" /></div> : error ? <div className="wrap"><ErrorState message={error} onRetry={reload} /></div> : <Curated items={data.featured} />}
      <HorizontalScroll items={cats} title="Ten ways to spend an evening" />
      <ZoomThrough image="/img/concert.jpg" />
      <section className="wrap py-28" aria-label="Our promise">
        <p className="eyebrow mb-8 flex items-center gap-3"><span className="beam-wedge" aria-hidden />What we look for</p>
        <ScrollFillText className="font-display text-4xl sm:text-5xl lg:text-[4.6rem] leading-[1.05] max-w-6xl"
          text="Somewhere in the city, a quartet is tuning by candlelight, a long table is being set for strangers, and clay is turning on a wheel. We go looking for those rooms — and hold the door open for you." />
      </section>
      <Moods />
      <CardFan title="Pick your night." cards={Object.entries(MOOD_IMG).slice(0, 7).map(([m, im]) => ({ label: m, to: `/discover?mood=${encodeURIComponent(m)}`, img: `/img/${im}.jpg` }))} />
      <SlideLines lines={["Candlelight", "Supper clubs", "Jazz till late", "Clay & colour", "Rooftops"]} />
      {data && <Upcoming data={data} />}
      <HowItWorks />
      {data && <Originals items={data.originals} />}
      {data && <Cities cities={data.cities} />}
      <section className="py-10 overflow-hidden" aria-hidden>
        <VelocityMarquee text={`${cats.map((c) => c.label).join(" — ")} — `} base={2} className="font-display text-[10vw] lg:text-[7vw] leading-none text-outline-ink" />
      </section>
      <Story />
      <Newsletter />
    </div>
  );
}
