"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useSpring, useScroll, useTransform, useVelocity, useAnimationFrame, animate, useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Logo } from "@/components/brand/Logo";
import { EASE } from "@/components/motion/Motion";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const fine = () => typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;

export function Cursor() {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const rx = useSpring(x, { stiffness: 170, damping: 28, mass: 0.85 });
  const ry = useSpring(y, { stiffness: 170, damping: 28, mass: 0.85 });
  const [hover, setHover] = useState(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!fine()) return undefined;
    setOn(true);
    document.documentElement.classList.add("has-cursor");
    // Coalesce pointer events to one update per frame, and only touch React
    // state when the hovered target actually changes — otherwise every mouse
    // move re-renders the whole cursor subtree.
    let raf = 0;
    let latest = null;
    const flush = () => {
      raf = 0;
      if (!latest) return;
      const e = latest;
      latest = null;
      x.set(e.clientX);
      y.set(e.clientY);
      const t = e.target.closest?.("a, button, [data-cursor]");
      const next = t ? t.getAttribute("data-cursor") || "" : null;
      setHover((prev) => (prev === next ? prev : next));
    };
    const move = (e) => {
      latest = e;
      if (!raf) raf = requestAnimationFrame(flush);
    };
    window.addEventListener("mousemove", move, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", move);
      document.documentElement.classList.remove("has-cursor");
    };
  }, [x, y]);
  if (!on) return null;
  return (
    <>
      <motion.div aria-hidden className="fixed top-0 left-0 z-[200] pointer-events-none w-2 h-2 -ml-1 -mt-1 rounded-full bg-beam" style={{ x, y }} />
      <motion.div aria-hidden className="fixed top-0 left-0 z-[199] pointer-events-none rounded-full border border-beam flex items-center justify-center mix-blend-difference"
        style={{ x: rx, y: ry, translateX: "-50%", translateY: "-50%" }}
        animate={{ width: hover === null ? 38 : hover ? 96 : 64, height: hover === null ? 38 : hover ? 96 : 64, backgroundColor: hover ? "#FFD20A" : "rgba(255,210,10,0)" }}
        transition={{ duration: 0.38, ease: EASE }}>
        {hover && <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink">{hover}</span>}
      </motion.div>
    </>
  );
}

export function Grain() {
  // Overscan only as far as the 3% drift in @keyframes grain needs -
  // a 200%-wide fixed layer is three times the paint area for no visual gain.
  return <div aria-hidden="true" className="grain pointer-events-none fixed -inset-[12%] z-[90] no-print" />;
}

export function Preloader() {
  const [show, setShow] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const p = new URLSearchParams(window.location.search);
      if (p.has("nopreload")) return false;
      return !sessionStorage.getItem("trz_intro");
    } catch {
      return false;
    }
  });
  const countRef = useRef(null);
  const barRef = useRef(null);

  useEffect(() => {
    if (!show) {
      if (typeof document !== "undefined") {
        document.documentElement.classList.remove("trz-intro-pending");
      }
      return undefined;
    }
    let tDone;
    let last = -1;
    const finish = () => {
      try {
        sessionStorage.setItem("trz_intro", "1");
      } catch {}
      if (typeof document !== "undefined") {
        document.documentElement.classList.remove("trz-intro-pending");
      }
      tDone = setTimeout(() => setShow(false), 60);
    };
    const failsafe = setTimeout(finish, 1800);
    // Write the counter straight to the DOM: setting React state on every
    // frame here re-rendered the whole full-screen overlay ~100 times while
    // the hero underneath was still trying to paint.
    const c = animate(0, 100, {
      duration: 0.65,
      ease: [0.65, 0, 0.35, 1],
      onUpdate: (v) => {
        const next = Math.round(v);
        if (next === last) return;
        last = next;
        if (countRef.current) countRef.current.textContent = String(next);
        if (barRef.current) barRef.current.style.transform = `scaleX(${v / 100})`;
      },
      onComplete: () => {
        clearTimeout(failsafe);
        finish();
      },
    });
    return () => {
      c.stop();
      clearTimeout(failsafe);
      clearTimeout(tDone);
      if (typeof document !== "undefined") {
        document.documentElement.classList.remove("trz-intro-pending");
      }
    };
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[300] bg-ink-deep flex flex-col items-center justify-center text-parchment"
          exit={{ clipPath: "inset(0 0 100% 0)" }}
          initial={{ clipPath: "inset(0 0 0% 0)" }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          data-testid="preloader"
        >
          <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, ease: EASE }}>
            <Logo className="h-14 sm:h-20" plate />
          </motion.div>
          <div className="w-64 h-[3px] bg-ink-border mt-10 overflow-hidden">
            <div ref={barRef} className="h-full w-full bg-beam origin-left" style={{ transform: "scaleX(0)" }} />
          </div>
          <p ref={countRef} className="font-display text-[22vw] sm:text-[14vw] leading-none absolute bottom-0 right-6 text-[#2a2622] tabular">
            0
          </p>
          <p className="absolute bottom-8 left-6 text-xs uppercase tracking-[0.2em] text-[#8f8574]">
            Life is happening
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&*";
export function Scramble({ text, className = "" }) {
  const [out, setOut] = useState(text);
  const timer = useRef(null);
  const run = () => {
    let f = 0;
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      f += 1;
      setOut(text.split("").map((ch, i) => (ch === " " || i < f / 2 ? ch : CHARS[Math.floor(Math.random() * CHARS.length)])).join(""));
      if (f / 2 >= text.length) { clearInterval(timer.current); setOut(text); }
    }, 28);
  };
  useEffect(() => () => clearInterval(timer.current), []);
  return <span className={className} onMouseEnter={run}><span className="sr-only">{text}</span><span aria-hidden>{out}</span></span>;
}

export function SpotlightHero({ children, image, alt }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const mx = useMotionValue(60);
  const my = useMotionValue(45);
  const sx = useSpring(mx, { stiffness: 55, damping: 24 });
  const sy = useSpring(my, { stiffness: 55, damping: 24 });
  const [pos, setPos] = useState({ x: 60, y: 45 });
  useEffect(() => sx.on("change", (v) => setPos((p) => ({ ...p, x: v }))), [sx]);
  useEffect(() => sy.on("change", (v) => setPos((p) => ({ ...p, y: v }))), [sy]);
  useEffect(() => {
    if (fine() || reduce) return undefined;
    const a = animate(mx, [60, 25, 75, 40, 60], { duration: 11, repeat: Infinity, ease: "easeInOut" });
    const b = animate(my, [45, 30, 60, 70, 45], { duration: 11, repeat: Infinity, ease: "easeInOut" });
    return () => { a.stop(); b.stop(); };
  }, [mx, my, reduce]);
  const move = (e) => {
    const r = ref.current.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width) * 100);
    my.set(((e.clientY - r.top) / r.height) * 100);
  };
  const mask = `radial-gradient(circle at ${pos.x}% ${pos.y}%, #000 0, #000 9%, transparent 26%)`;
  return (
    <section ref={ref} onMouseMove={move} className="relative h-[100svh] min-h-[640px] bg-black overflow-hidden text-parchment dark-zone" data-testid="spotlight-hero" aria-labelledby="hero-title">
      <motion.img src={image} alt={alt} className="absolute inset-0 w-full h-full object-cover opacity-[0.16] grayscale" initial={{ scale: 1.12 }} animate={{ scale: 1.02 }} transition={{ duration: 3.0, ease: EASE }} />
      <motion.img src={image} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" style={{ WebkitMaskImage: mask, maskImage: mask }} initial={{ scale: 1.12 }} animate={{ scale: 1.02 }} transition={{ duration: 3.0, ease: EASE }} />
      <div aria-hidden className="absolute pointer-events-none w-[34vmax] h-[34vmax] rounded-full border border-beam/40 -translate-x-1/2 -translate-y-1/2" style={{ left: `${pos.x}%`, top: `${pos.y}%` }} />
      {children}
    </section>
  );
}

export function VelocityMarquee({ text, className = "", base = 2.6 }) {
  const x = useMotionValue(0);
  const { scrollY } = useScroll();
  const vel = useSpring(useVelocity(scrollY), { damping: 45, stiffness: 200 });
  const factor = useTransform(vel, [-2000, 0, 2000], [-4, 0, 4], { clamp: false });
  const skew = useTransform(vel, [-2000, 2000], [4, -4]);
  const dir = useRef(1);
  const reduce = useReducedMotion();
  const wrap = useRef(null);
  const live = useRef(true);
  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(([e]) => { live.current = e.isIntersecting; }, { rootMargin: "150px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useAnimationFrame((_, d) => {
    if (reduce || !live.current) return;
    const f = factor.get();
    if (f < 0) dir.current = -1; else if (f > 0) dir.current = 1;
    let v = x.get() - dir.current * base * (d / 1000) * (1 + Math.abs(f));
    if (v < -50) v += 50;
    if (v > 0) v -= 50;
    x.set(v);
  });
  const tx = useTransform(x, (v) => `${v}%`);
  return (
    <div ref={wrap} className={`overflow-hidden whitespace-nowrap ${className}`} aria-hidden>
      <motion.div className="inline-flex" style={{ x: tx, skewX: skew }}>
        {[0, 1].map((k) => <span key={k} className="pr-8">{text} {text} </span>)}
      </motion.div>
    </div>
  );
}

// Hover tilt for the category cards. Pointer values are written straight to
// springs, so moving the mouse never re-renders the track.
function Tilt({ children, className = "" }) {
  const reduce = useReducedMotion();
  const rx = useSpring(0, { stiffness: 220, damping: 26 });
  const ry = useSpring(0, { stiffness: 220, damping: 26 });
  const reset = () => { rx.set(0); ry.set(0); };
  const move = (e) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 9);
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * 9);
  };
  return (
    <motion.div className={className} onMouseMove={move} onMouseLeave={reset} style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}>
      {children}
    </motion.div>
  );
}

export function HorizontalScroll({ items, title }) {
  const ref = useRef(null);
  const track = useRef(null);
  const [dist, setDist] = useState(0);
  const itemsKey = items.map((it) => it.label).join("|");
  useIsomorphicLayoutEffect(() => {
    const measure = () => {
      const next = Math.max(0, (track.current?.scrollWidth || 0) - window.innerWidth);
      setDist((prev) => (prev === next ? prev : next));
    };
    measure();
    window.addEventListener("resize", measure);
    let ro;
    if (typeof ResizeObserver !== "undefined" && track.current) {
      ro = new ResizeObserver(measure);
      ro.observe(track.current);
    }
    return () => {
      window.removeEventListener("resize", measure);
      ro?.disconnect();
    };
  }, [itemsKey]);
  useIsomorphicLayoutEffect(() => {
    if (typeof window === "undefined") return undefined;
    const id = requestAnimationFrame(() => {
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
      window.__lenis?.resize();
    });
    return () => cancelAnimationFrame(id);
  }, [dist]);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], [0, -dist]);
  const bar = useTransform(scrollYProgress, [0, 1], [0, 1]);
  return (
    <section ref={ref} style={{ height: `calc(100svh + ${dist}px)` }} className="relative bg-ink-deep text-parchment dark-zone" aria-label={title}>
      <div className="sticky top-0 h-[100svh] overflow-hidden flex flex-col justify-center">
        <div className="wrap flex items-end justify-between mb-8">
          <h2 className="font-display text-5xl sm:text-7xl leading-none">{title}</h2>
          <span className="text-xs uppercase tracking-[0.16em] text-[#8f8574] hidden sm:block">Keep scrolling →</span>
        </div>
        <motion.div ref={track} style={{ x }} className="flex gap-6 pl-5 sm:pl-12 pr-[20vw] w-max">
          {items.map((it, i) => (
            <Tilt key={it.label} className="w-[78vw] sm:w-[36vw] lg:w-[28vw] h-[58vh] shrink-0">
              <Link to={it.to} data-cursor="Explore" data-testid={`hscroll-${it.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                className="group relative block h-full w-full overflow-hidden bg-black">
                <img src={it.img} alt="" loading="lazy" decoding="async" className="img-cover opacity-70 grayscale group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-110 transition-[transform,opacity,filter] duration-700 ease-out" />
                <span className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/20 to-transparent" aria-hidden />
                <span className="absolute top-5 left-5 font-serial text-xs text-beam">{String(i + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}</span>
                <span className="absolute left-5 right-5 bottom-5 font-display text-5xl sm:text-6xl leading-[0.9] group-hover:text-beam transition-colors duration-300">{it.label}</span>
                <span className="absolute inset-0 border-[6px] border-beam opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden />
              </Link>
            </Tilt>
          ))}
        </motion.div>
        <div className="wrap mt-10"><div className="h-[2px] bg-ink-border"><motion.div className="h-full bg-beam origin-left" style={{ scaleX: bar }} /></div></div>
      </div>
    </section>
  );
}

export function FollowList({ items }) {
  const ref = useRef(null);
  const [active, setActive] = useState(null);
  const x = useSpring(useMotionValue(0), { stiffness: 110, damping: 24 });
  const y = useSpring(useMotionValue(0), { stiffness: 110, damping: 24 });
  const rot = useTransform(x, (v) => ((v % 200) - 100) / 36);
  const move = (e) => {
    const r = ref.current.getBoundingClientRect();
    x.set(e.clientX - r.left);
    y.set(e.clientY - r.top);
  };
  return (
    <div ref={ref} onMouseMove={move} onMouseLeave={() => setActive(null)} className="relative">
      <AnimatePresence>
        {active && (
          <motion.img key={active.img} src={active.img} alt="" aria-hidden className="hidden lg:block absolute z-0 pointer-events-none w-[300px] h-[380px] object-cover -translate-x-1/2 -translate-y-1/2"
            style={{ left: x, top: y, rotate: rot }} initial={{ opacity: 0, scale: 0.88, clipPath: "inset(15% 15% 15% 15%)" }} animate={{ opacity: 1, scale: 1, clipPath: "inset(0% 0% 0% 0%)" }} exit={{ opacity: 0, scale: 0.92 }} transition={{ duration: 0.55, ease: EASE }} />
        )}
      </AnimatePresence>
      <ol className="relative z-10 border-t border-ink-border">
        {items.map((it, i) => (
          <li key={it.label}>
            <Link to={it.to} onMouseEnter={() => setActive(it)} data-cursor="Go" data-testid={`mood-link-${it.label.toLowerCase().replace(/\s/g, "-")}`}
              className="group flex items-baseline gap-6 py-5 border-b border-ink-border">
              <span className="font-serial text-xs text-[#8f8574] w-8">{String(i + 1).padStart(2, "0")}</span>
              <span className="font-display text-5xl sm:text-7xl lg:text-8xl leading-none transition-[color,transform] duration-500 group-hover:text-beam group-hover:translate-x-6 group-hover:italic text-outline group-hover:[-webkit-text-stroke:0]">{it.label}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
