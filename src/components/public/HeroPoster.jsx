"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowDown } from "lucide-react";
import { useMeta } from "@/components/public/MetaContext";
import { normalizeHeroConfig } from "@/lib/hero";
import { EASE, AmbientField, LiveDot, Magnetic } from "@/components/motion/Motion";

// Warm the next couple of slides while the current one is on screen, so the
// clip reveal never uncovers an empty black frame.
const preloadSlide = (src) => {
  if (typeof window === "undefined" || !src) return;
  const img = new Image();
  img.decoding = "async";
  img.src = src;
};

const W = 11;
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ-&";
const pad = (s) => (s || "").toUpperCase().padEnd(W, " ").slice(0, W);

function Flap({ ch, i }) {
  const [shown, setShown] = useState(ch);
  useEffect(() => {
    if (shown === ch) return undefined;
    let n = 0;
    const steps = 4 + (i % 4);
    const t = setInterval(() => {
      n += 1;
      if (n >= steps) { setShown(ch); clearInterval(t); } else setShown(GLYPHS[Math.floor(Math.random() * GLYPHS.length)]);
    }, 55);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ch]);
  return (
    <span className="relative inline-flex items-center justify-center w-[6.5vw] sm:w-[4.6vw] lg:w-[2.9vw] h-[9.4vw] sm:h-[6.6vw] lg:h-[4.1vw] bg-[#0c0b0a] border border-[#2a2622] overflow-hidden [perspective:400px]">
      <motion.span key={shown} initial={{ rotateX: -90 }} animate={{ rotateX: 0 }} transition={{ duration: 0.12 }} className="font-serial text-beam text-[5vw] sm:text-[3.4vw] lg:text-[2.2vw] leading-none">
        {shown === " " ? "\u00a0" : shown}
      </motion.span>
      <span className="absolute inset-x-0 top-1/2 h-px bg-black/80" aria-hidden />
    </span>
  );
}

// The board is always "live" — this makes the claim literal.
function LiveClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const fmt = () =>
      new Intl.DateTimeFormat("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Kolkata",
      }).format(new Date());
    const tick = () => setTime(fmt());
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, []);
  return <span className="tabular">{time || "--:--"} IST</span>;
}

const Row = ({ text, testid }) => (
  <div className="flex gap-[3px]" data-testid={testid} aria-label={(text || "").trim()}>
    {pad(text).split("").map((c, i) => <Flap key={i} ch={c} i={i} />)}
  </div>
);

export default function HeroPoster() {
  const { meta } = useMeta();
  const cities = meta?.supported_cities || ["Chandigarh", "Mohali", "Panchkula"];
  const hero = normalizeHeroConfig(meta?.hero);
  const slides = hero.slides;
  const [k, setK] = useState(0);
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.25]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, -160]);
  // A few pixels of pointer drift under the poster: the frame feels deeper
  // than a flat photograph without animating anything that needs repainting.
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const driftX = useSpring(mx, { stiffness: 55, damping: 22 });
  const driftY = useSpring(my, { stiffness: 55, damping: 22 });
  const onMove = (e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || reduce) return;
    mx.set(((e.clientX - r.left) / r.width - 0.5) * -18);
    my.set(((e.clientY - r.top) / r.height - 0.5) * -12);
  };
  const dim = useTransform(scrollYProgress, [0, 1], [0.45, 0.85]);
  const [delay] = useState(() => {
    if (typeof window === "undefined") return 0.1;
    try {
      const p = new URLSearchParams(window.location.search);
      if (p.has("nopreload")) return 0.1;
      return sessionStorage.getItem("trz_intro") ? 0.05 : 1.0;
    } catch {
      return 0.1;
    }
  });
  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const t = setInterval(() => setK((x) => x + 1), 3400);
    return () => clearInterval(t);
  }, [slides.length]);
  useEffect(() => {
    if (slides.length <= 1) return;
    preloadSlide(slides[(k + 1) % slides.length]?.image_url);
    preloadSlide(slides[(k + 2) % slides.length]?.image_url);
  }, [k, slides]);
  const slideIdx = k % slides.length;
  const activeSlide = slides[slideIdx] || slides[0];
  const city = cities[k % cities.length];

  return (
    <section ref={ref} id="top" onMouseMove={onMove} className="relative h-[calc(100svh-72px)] min-h-[620px] overflow-hidden bg-black text-parchment dark-zone" data-testid="hero-poster" aria-labelledby="hero-title">
      <motion.div className="absolute inset-0" style={{ scale, x: driftX, y: driftY }}>
        <AnimatePresence initial={false}>
          <motion.img key={`${slideIdx}-${activeSlide.image_url}`} src={activeSlide.image_url} alt="" aria-hidden decoding="async" fetchPriority={k === 0 ? "high" : "auto"}
            className="absolute inset-0 w-full h-full object-cover"
            initial={{ clipPath: "inset(0 0 100% 0)", scale: 1.15 }} animate={{ clipPath: "inset(0 0 0% 0)", scale: 1 }} transition={{ duration: 1.1, ease: [0.76, 0, 0.24, 1] }} />
        </AnimatePresence>
      </motion.div>
      <motion.div className="absolute inset-0 bg-black" style={{ opacity: dim }} aria-hidden />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/60 to-transparent" aria-hidden />
      <AmbientField />

      <motion.div style={{ y: textY }} className="relative z-10 wrap h-full flex flex-col justify-between py-8 lg:py-12">
        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
          <motion.p className="text-[11px] uppercase tracking-[0.16em] text-[#cfc6b6]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: delay + 0.4 }}>
            Now curating · {cities.join(" / ")}
          </motion.p>
          <motion.div className="" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: delay + 0.2 }}>
            <div className="bg-black/70 border border-[#2a2622] p-3 sm:p-4 space-y-[3px] backdrop-blur-[2px]" data-testid="hero-flap-board">
              <div className="flex justify-between gap-3 text-[10px] uppercase tracking-[0.16em] text-[#8f8574] pb-2">
                <span>Tonight&apos;s departures</span>
                <span className="text-beam inline-flex items-center gap-1.5"><LiveDot color="bg-beam" /> <LiveClock /></span>
              </div>
              <Row text={activeSlide.line_1 || "NOW SHOWING"} testid="flap-row-title" />
              <Row text={activeSlide.line_2} testid="flap-row-night" />
              <Row text={activeSlide.line_3 || city} testid="flap-row-city" />
              <p className="text-[10px] text-[#8f8574] pt-2">Kinds of nights we curate · photos illustrative</p>
            </div>
          </motion.div>
        </div>

        <div>
          <h1 id="hero-title" className="font-display leading-[0.84] tracking-[-0.035em] text-[18vw] sm:text-[14vw] lg:text-[10.5vw]">
            {["Life is", "happening."].map((line, li) => (
              <span key={line} className="block overflow-hidden pb-[0.22em] -mb-[0.2em]">
                <motion.span className={`block ${li ? "lg:pl-[12vw]" : ""}`} initial={{ y: "135%" }} animate={{ y: 0 }} transition={{ duration: 1.2, ease: EASE, delay: delay + li * 0.15 }}>{line}</motion.span>
              </span>
            ))}
          </h1>
          <motion.div className="mt-8 flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-t border-white/15 pt-6"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: delay + 0.6 }}>
            <div className="flex items-end gap-6">
              <p className="font-display italic text-beam text-4xl sm:text-5xl leading-none">Go be part of it.</p>
              <p className="hidden xl:block text-sm text-[#cfc6b6] max-w-xs">Find the moments, places and people worth stepping out for.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Magnetic strength={0.16}>
                <Link to="/discover" data-testid="hero-discover-button" data-cursor="Go" className="btn-beam group"><LiveDot color="bg-ink" /> Discover experiences <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden /></Link>
              </Magnetic>
              <Link to="/originals" data-testid="hero-originals-link" className="btn-line h-12 border-parchment hover:bg-parchment hover:text-ink">Originals</Link>
              <a href="#curated" className="hidden lg:inline-flex w-12 h-12 items-center justify-center border border-white/30 rounded-full hover:bg-beam hover:text-ink hover:border-beam transition-colors" aria-label="Scroll down" data-testid="hero-scroll"><ArrowDown className="h-4 w-4 trz-float" aria-hidden /></a>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
