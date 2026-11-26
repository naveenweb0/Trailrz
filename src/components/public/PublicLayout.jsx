"use client";

import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useOutlet } from "react-router-dom";
import { motion, useReducedMotion, useMotionValue, useSpring } from "framer-motion";
import Lenis from "lenis";
import { Logo } from "@/components/brand/Logo";
import { Nav } from "@/components/public/Nav";
import { MetaProvider, useMeta } from "@/components/public/MetaContext";
import dynamic from "next/dynamic";
import { gsap } from "gsap";
import { EASE, Reveal } from "@/components/motion/Motion";
import { Grain } from "@/components/motion/Crazy";
import { ScrollTrigger } from "@/components/motion/Wow";

const Preloader = dynamic(() => import("@/components/motion/Crazy").then((m) => m.Preloader), { ssr: false });
const Cursor = dynamic(() => import("@/components/motion/Crazy").then((m) => m.Cursor), { ssr: false });

const COLS = [
  { title: "Discover", links: [["All experiences", "/discover"], ["This weekend", "/discover?when=weekend"], ["TRAILRZ Originals", "/originals"], ["My Passes", "/my-tickets"]] },
  { title: "TRAILRZ", links: [["About", "/about"], ["Contact", "/contact"], ["Help", "/contact#help"]] },
  { title: "Policies", links: [["Privacy policy", "/privacy"], ["Terms", "/terms"], ["Refund policy", "/refund-policy"]] },
];

const TRAILRZ_LETTERS = ["T", "R", "A", "I", "L", "R", "Z"];

function FooterBrandWordmark() {
  const wrapRef = useRef(null);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50, active: false });
  const mx = useMotionValue(50);
  const my = useMotionValue(50);
  const sx = useSpring(mx, { stiffness: 120, damping: 24 });
  const sy = useSpring(my, { stiffness: 120, damping: 24 });

  useEffect(() => sx.on("change", (v) => setGlowPos((p) => ({ ...p, x: v }))), [sx]);
  useEffect(() => sy.on("change", (v) => setGlowPos((p) => ({ ...p, y: v }))), [sy]);

  const onMove = (e) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set(((e.clientX - rect.left) / rect.width) * 100);
    my.set(((e.clientY - rect.top) / rect.height) * 100);
    setGlowPos((p) => (p.active ? p : { ...p, active: true }));
  };

  return (
    <motion.div
      ref={wrapRef}
      aria-hidden
      onMouseMove={onMove}
      onMouseLeave={() => {
        setHoveredIdx(null);
        setGlowPos((p) => ({ ...p, active: false }));
      }}
      className="relative mt-16 sm:mt-20 pt-4 pb-2 select-none overflow-hidden"
      initial={{ y: "24%", opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1.4, ease: EASE }}
    >
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: glowPos.active ? 1 : 0,
          background: `radial-gradient(320px circle at ${glowPos.x}% ${glowPos.y}%, rgba(255, 210, 10, 0.14), transparent 70%)`,
        }}
      />
      <div className="relative flex items-baseline justify-between w-full font-display text-[19vw] sm:text-[17vw] lg:text-[13.5rem] xl:text-[16rem] leading-[0.82] tracking-[-0.02em]">
        {TRAILRZ_LETTERS.map((ch, idx) => {
          const dist = hoveredIdx === null ? 99 : Math.abs(hoveredIdx - idx);
          const isExact = dist === 0;
          const isNear = dist === 1;
          return (
            <span
              key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              className="inline-block cursor-default transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{
                color: isExact ? "#FFD20A" : isNear ? "#8f8574" : "#2c2722",
                transform: isExact
                  ? "translateY(-14px) scale(1.04)"
                  : isNear
                  ? "translateY(-5px)"
                  : "translateY(0)",
                textShadow: isExact ? "0 12px 36px rgba(255, 210, 10, 0.25)" : "none",
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>
    </motion.div>
  );
}

function Footer() {
  const { meta } = useMeta();
  const socials = Object.entries(meta?.socials || {}).filter(([, v]) => v);
  return (
    <footer className="bg-ink-deep text-parchment mt-32 dark-zone no-print overflow-hidden" data-testid="site-footer">
      <div className="wrap pt-20 pb-10">
        <div className="grid gap-14 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <Reveal>
            <Logo className="h-9" plate testid="footer-logo" />
            <p className="font-display text-3xl mt-8 max-w-sm leading-tight">Life is happening. Go be part of it.</p>
            {socials.length > 0 && (
              <div className="flex gap-5 mt-8 text-sm text-[#bdb3a3]">
                {socials.map(([k, v]) => <a key={k} href={v} target="_blank" rel="noreferrer" className="link-u capitalize" data-testid={`footer-social-${k}`}>{k}</a>)}
              </div>
            )}
          </Reveal>
          {COLS.map((c, i) => (
            <Reveal key={c.title} delay={0.08 * (i + 1)}>
              <p className="eyebrow !text-[#8f8574]">{c.title}</p>
              <ul className="mt-5 space-y-3 text-sm">
                {c.links.map(([l, to]) => <li key={to}><Link to={to} className="link-u text-[#e9e2d6]" data-testid={`footer-link-${l.toLowerCase().replace(/\s/g, "-")}`}>{l}</Link></li>)}
              </ul>
            </Reveal>
          ))}
        </div>
        <FooterBrandWordmark />
        <div className="pt-6 border-t border-ink-border flex flex-col sm:flex-row justify-between gap-3 text-xs text-[#8f8574]">
          <p>© {new Date().getFullYear()} TRAILRZ. All rights reserved.</p>
          <p>Chandigarh · Mohali · Panchkula</p>
        </div>
      </div>
    </footer>
  );
}

function useSmoothScroll() {
  const reduce = useReducedMotion();
  const { pathname } = useLocation();
  useEffect(() => {
    if (reduce || typeof window === "undefined") return undefined;
    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      wheelMultiplier: 1,
      // In-page links (#curated, #letter, #help) glide instead of snapping
      // and yanking Lenis' internal target out of sync.
      anchors: true,
      stopInertiaOnNavigate: true,
    });
    window.__lenis = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const update = (time) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(update);
      lenis.destroy();
      window.__lenis = null;
    };
  }, [reduce]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash) return;
    window.__lenis ? window.__lenis.scrollTo(0, { immediate: true }) : window.scrollTo(0, 0);
    const refresh = () => {
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
      window.__lenis?.resize();
    };
    const t1 = setTimeout(refresh, 100);
    const t2 = setTimeout(refresh, 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pathname]);
}

export default function PublicLayout({ children }) {
  const loc = useLocation();
  const outlet = useOutlet();
  const content = children ?? outlet;
  const pathKey = loc.pathname || "/";
  useSmoothScroll();
  return (
    <MetaProvider>
      <div className="min-h-screen flex flex-col bg-parchment overflow-x-clip">
        <Preloader />
        <Cursor />
        <Grain />
        <motion.div key={`beam-${pathKey}`} aria-hidden className="fixed top-0 left-0 h-[3px] w-full bg-beam z-[60] origin-left pointer-events-none no-print"
          initial={{ scaleX: 0, opacity: 1 }} animate={{ scaleX: 1, opacity: 0 }} transition={{ scaleX: { duration: 0.7, ease: EASE }, opacity: { delay: 0.6, duration: 0.3 } }} />
        <Nav />
        <main id="main" className="flex-1">
          <div key={pathKey}>{content}</div>
        </main>
        <Footer />
      </div>
    </MetaProvider>
  );
}

