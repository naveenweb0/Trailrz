"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useSpring, useMotionValue, useReducedMotion } from "framer-motion";

export const EASE = [0.22, 1, 0.36, 1];
const VIEW = { once: true, margin: "0px 0px -8% 0px" };

export function Reveal({ children, delay = 0, y = 20, className = "", as = "div", ...rest }) {
  const M = motion[as];
  return (
    <M className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={VIEW} transition={{ duration: 1.0, ease: EASE, delay }} {...rest}>
      {children}
    </M>
  );
}

export function SplitWords({ text, className = "", delay = 0, step = 0.045, accent = {} }) {
  return (
    <span className={className} aria-label={text}>
      {text.split(" ").map((w, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom pb-[0.08em] -mb-[0.08em]" aria-hidden>
          <motion.span className={`inline-block ${accent[i] || ""}`} initial={{ y: "85%", opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }}
            transition={{ duration: 1.05, ease: EASE, delay: delay + i * step }}>
            {w}&nbsp;
          </motion.span>
        </span>
      ))}
    </span>
  );
}

export function ImageReveal({ src, alt, className = "", parallax = 22, delay = 0, eager = false }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-parallax, parallax]);
  return (
    <motion.div ref={ref} className={`overflow-hidden bg-tint ${className}`} initial={{ clipPath: "inset(100% 0% 0% 0%)", opacity: 0.7 }} whileInView={{ clipPath: "inset(0% 0% 0% 0%)", opacity: 1 }}
      viewport={{ once: true }} transition={{ duration: 1.35, ease: EASE, delay }}>
      <motion.img src={src} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" draggable={false} style={{ y, scale: 1.06 }} className="img-cover"
        initial={{ scale: 1.14 }} whileInView={{ scale: 1.06 }} viewport={{ once: true }} transition={{ duration: 1.8, ease: EASE, delay }} />
    </motion.div>
  );
}

export function Parallax({ children, speed = 36, className = "" }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [speed, -speed]);
  return <motion.div ref={ref} style={{ y }} className={className}>{children}</motion.div>;
}

export function Magnetic({ children, strength = 0.3, className = "" }) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18 });
  const sy = useSpring(y, { stiffness: 220, damping: 18 });
  const move = (e) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - r.left - r.width / 2) * strength);
    y.set((e.clientY - r.top - r.height / 2) * strength);
  };
  return (
    <motion.span className={`inline-flex ${className}`} style={{ x: sx, y: sy }} onMouseMove={move} onMouseLeave={() => { x.set(0); y.set(0); }}>
      {children}
    </motion.span>
  );
}

export function ScrollFillText({ text, className = "" }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 45%"] });
  const words = text.split(" ");
  return (
    <p ref={ref} className={className}>
      {words.map((w, i) => <FillWord key={i} w={w} p={scrollYProgress} range={[i / words.length, (i + 1) / words.length]} />)}
    </p>
  );
}

function FillWord({ w, p, range }) {
  const opacity = useTransform(p, range, [0.14, 1]);
  return <motion.span style={{ opacity }} className="inline-block mr-[0.25em]">{w}</motion.span>;
}

export function BeamSweep({ delay = 0.6, className = "" }) {
  return (
    <motion.span aria-hidden className={`absolute left-0 right-0 bottom-[0.06em] h-[0.34em] bg-beam -z-10 origin-left ${className}`}
      style={{ clipPath: "polygon(0 35%, 100% 0, 100% 100%, 0 100%)" }}
      initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.2, ease: EASE, delay }} />
  );
}

export function Rotator({ words, interval = 2600, className = "" }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (words.length < 2) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % words.length), interval);
    return () => clearInterval(t);
  }, [words.length, interval]);
  return (
    <span className={`relative inline-flex overflow-hidden align-bottom h-[1.25em] ${className}`}>
      <motion.span key={words[i]} initial={{ y: "85%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.75, ease: EASE }} className="inline-block">{words[i]}</motion.span>
    </span>
  );
}

export function Marquee({ children, speed = 38, className = "" }) {
  return (
    <div className={`overflow-hidden group ${className}`}>
      <div className="flex w-max marquee-track group-hover:[animation-play-state:paused]" style={{ animationDuration: `${speed}s` }}>
        <div className="flex shrink-0">{children}</div>
        <div className="flex shrink-0" aria-hidden>{children}</div>
      </div>
    </div>
  );
}

export function Counter({ to, className = "" }) {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      const t0 = performance.now();
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / 1200);
        setN(Math.round(to * (1 - Math.pow(1 - k, 3))));
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      io.disconnect();
    });
    io.observe(el);
    return () => io.disconnect();
  }, [to]);
  return <span ref={ref} className={className}>{String(n).padStart(2, "0")}</span>;
}

const CROSSHAIRS = [
  { top: "18%", left: "58%", delay: "0s", ring: false },
  { top: "30%", left: "78%", delay: "1.2s", ring: true },
  { top: "48%", left: "64%", delay: "2.4s", ring: false },
  { top: "68%", left: "84%", delay: "0.7s", ring: true },
  { top: "76%", left: "52%", delay: "1.9s", ring: false },
];

export function AmbientField({ className = "" }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden select-none ${className}`}>
      {CROSSHAIRS.map((pt, i) => (
        <div
          key={i}
          className="absolute hidden md:flex items-center justify-center trz-crosshair"
          style={{ top: pt.top, left: pt.left, animationDelay: pt.delay }}
        >
          {pt.ring && (
            <span className="absolute w-7 h-7 rounded-full border border-beam/45 trz-ring-pulse" style={{ animationDelay: pt.delay }} />
          )}
          <span className="text-parchment/45 font-serial text-xs leading-none">+</span>
        </div>
      ))}
    </div>
  );
}

export function ShuttleLine({ className = "" }) {
  return (
    <div aria-hidden className={`relative h-[2px] w-full bg-linen overflow-hidden ${className}`}>
      <span
        className="absolute inset-y-0 left-0 w-1/4 trz-shuttle-x"
        style={{ background: "linear-gradient(90deg, transparent, var(--beam), transparent)" }}
      />
    </div>
  );
}

export function LiveDot({ color = "bg-beam", ping = true, className = "" }) {
  return (
    <span className={`relative inline-flex items-center justify-center w-2 h-2 shrink-0 ${className}`} aria-hidden>
      {ping && <span className={`absolute inset-0 rounded-full ${color} trz-ring-pulse`} />}
      <span className={`relative w-1.5 h-1.5 rounded-full ${color}`} />
    </span>
  );
}
