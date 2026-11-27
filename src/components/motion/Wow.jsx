"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
  // Mobile browsers fire resize on every address-bar toggle, and each one
  // triggers a full ScrollTrigger recalculation (pins included).
  ScrollTrigger.config({ ignoreMobileResize: true });
}

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Golden dust drifting along a spotlight cone — the TRAILRZ lamp, in 3D.
export function BeamParticles({ className = "" }) {
  const host = useRef(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return undefined;
    let disposed = false;
    let cleanup = () => {};

    import("three")
      .then((THREE) => {
        if (disposed || !el) return;
        let renderer;
        try {
          renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" });
        } catch {
          return;
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        el.appendChild(renderer.domElement);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
        camera.position.set(0, 0, 9);
        const N = window.innerWidth < 768 ? 1400 : 3200;
        const pos = new Float32Array(N * 3);
        const seed = new Float32Array(N * 3);
        for (let i = 0; i < N; i++) {
          seed[i * 3] = Math.random();
          seed[i * 3 + 1] = Math.random() * Math.PI * 2;
          seed[i * 3 + 2] = Math.sqrt(Math.random());
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 64;
        const g = canvas.getContext("2d");
        if (!g) return;
        const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, "rgba(255,230,120,1)");
        grad.addColorStop(0.4, "rgba(255,210,10,0.6)");
        grad.addColorStop(1, "rgba(255,210,10,0)");
        g.fillStyle = grad;
        g.fillRect(0, 0, 64, 64);
        const mat = new THREE.PointsMaterial({ size: 0.11, map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 });
        const pts = new THREE.Points(geo, mat);
        const group = new THREE.Group();
        group.add(pts);
        group.rotation.z = -0.32;
        group.position.set(-1.2, 1.4, 0);
        scene.add(group);
        const mouse = { x: 0, y: 0 };
        const onMove = (e) => { mouse.x = e.clientX / window.innerWidth - 0.5; mouse.y = e.clientY / window.innerHeight - 0.5; };
        window.addEventListener("mousemove", onMove, { passive: true });
        const size = () => {
          const w = Math.max(1, el.clientWidth);
          const h = Math.max(1, el.clientHeight);
          renderer.setSize(w, h, false);
          renderer.domElement.style.width = "100%";
          renderer.domElement.style.height = "100%";
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        };
        size();
        window.addEventListener("resize", size);
        let visible = true;
        const io = typeof IntersectionObserver !== "undefined"
          ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; })
          : null;
        io?.observe(el);
        let t = 0, id;
        const frame = () => {
          id = requestAnimationFrame(frame);
          if (!visible) return;
          t += 0.0016;
          for (let i = 0; i < N; i++) {
            const u = (seed[i * 3] + t * (0.6 + seed[i * 3 + 2])) % 1;
            const a = seed[i * 3 + 1] + t * 3;
            const r = 0.08 + u * 3.2 * seed[i * 3 + 2];
            pos[i * 3] = -6 + u * 16;
            pos[i * 3 + 1] = Math.cos(a) * r - u * 1.6;
            pos[i * 3 + 2] = Math.sin(a) * r;
          }
          geo.attributes.position.needsUpdate = true;
          group.rotation.y += (mouse.x * 0.6 - group.rotation.y) * 0.04;
          group.rotation.x += (mouse.y * 0.4 - group.rotation.x) * 0.04;
          renderer.render(scene, camera);
        };
        if (reduced()) { frame(); cancelAnimationFrame(id); } else frame();
        cleanup = () => {
          cancelAnimationFrame(id);
          io?.disconnect();
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("resize", size);
          geo.dispose(); mat.map?.dispose(); mat.dispose(); renderer.dispose();
          if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
        };
      })
      .catch(() => {});

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);
  return <div ref={host} aria-hidden className={`absolute inset-0 pointer-events-none ${className}`} />;
}

// Pinned section: giant words zoom until the photo behind swallows the screen.
export function ZoomThrough({ image, words = "GO BE PART OF IT" }) {
  const root = useRef(null);
  const layer = useRef(null);
  const after = useRef(null);
  useIsomorphicLayoutEffect(() => {
    if (reduced()) return undefined;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "+=180%",
          scrub: 1.6,
          pin: true,
          anticipatePin: 1,
        },
      });
      tl.fromTo(layer.current, { scale: 1 }, { scale: 30, ease: "power2.inOut", duration: 1 })
        .to(layer.current, { opacity: 0, duration: 0.2 }, 0.8)
        .fromTo(after.current, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.25 }, 0.8);
    }, root);
    return () => ctx.revert();
  }, []);
  return (
    <section ref={root} className="relative z-20 h-[100svh] overflow-hidden bg-black" aria-label="Go be part of it" data-testid="zoom-through">
      <img src={image} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" />
      <div ref={layer} className="absolute inset-0 bg-black flex items-center justify-center mix-blend-multiply will-change-transform" style={{ transformOrigin: "50% 52%" }}>
        <p className="font-display text-white text-[19vw] leading-[0.8] text-center tracking-[-0.04em] select-none">{words.split(" ").slice(0, 2).join(" ")}<br />{words.split(" ").slice(2).join(" ")}</p>
      </div>
      <div ref={after} className="absolute inset-x-0 bottom-0 p-8 sm:p-14 text-parchment opacity-0 bg-gradient-to-t from-black/80 to-transparent">
        <p className="font-display text-5xl sm:text-7xl max-w-3xl leading-none">The night doesn't wait. Neither should you.</p>
      </div>
    </section>
  );
}

// Pinned card fan: photos stacked like passes in a pocket, fanned open by the scroll.
export function CardFan({ cards, title }) {
  const root = useRef(null);
  useIsomorphicLayoutEffect(() => {
    if (reduced()) return undefined;
    const ctx = gsap.context(() => {
      const els = gsap.utils.toArray(".fan-card");
      const mid = (els.length - 1) / 2;
      gsap.set(els, { rotate: (i) => (i - mid) * 2, y: (i) => i * -4 });
      gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "+=140%",
          scrub: 1.5,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      })
        .to(els, { x: (i) => (i - mid) * Math.min(window.innerWidth / (els.length + 0.5), 260), rotate: (i) => (i - mid) * 9, y: (i) => Math.abs(i - mid) * 40, ease: "power2.out" })
        .fromTo(".fan-title", { letterSpacing: "0.3em", opacity: 0 }, { letterSpacing: "-0.02em", opacity: 1, ease: "power2.out" }, 0);
    }, root);
    return () => ctx.revert();
  }, []);
  return (
    <section ref={root} className="relative z-20 h-[100svh] overflow-hidden bg-beam flex flex-col items-center justify-center" aria-label={title} data-testid="card-fan">
      <h2 className="fan-title font-display text-ink text-6xl sm:text-8xl lg:text-9xl text-center leading-none absolute top-[12%] px-4">{title}</h2>
      <div className="relative w-[46vw] max-w-[240px] aspect-[3/4] mt-24">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} data-testid={`fan-card-${c.label.toLowerCase().replace(/\s/g, "-")}`} className="fan-card absolute inset-0 bg-ink border-[6px] border-parchment shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)] overflow-hidden group" data-cursor={c.label}>
            <img src={c.img} alt="" loading="lazy" className="img-cover group-hover:scale-105 transition-transform duration-900 ease-out" />
            <span className="absolute bottom-0 inset-x-0 bg-parchment text-ink font-display text-xl px-3 py-2">{c.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

// Lines of type slide in from alternating sides, scrubbed to the scroll.
export function SlideLines({ lines }) {
  const root = useRef(null);
  useIsomorphicLayoutEffect(() => {
    if (reduced()) return undefined;
    const ctx = gsap.context(() => {
      gsap.utils.toArray(".slide-line").forEach((el, i) => {
        gsap.fromTo(el, { xPercent: i % 2 ? 24 : -24, opacity: 0.2 }, { xPercent: 0, opacity: 1, ease: "none", scrollTrigger: { trigger: el, start: "top 95%", end: "top 45%", scrub: 1.2 } });
      });
    }, root);
    return () => ctx.revert();
  }, []);
  return (
    <section ref={root} className="py-24 overflow-hidden bg-ink-deep text-parchment" aria-label="Every kind of night">
      {lines.map((l, i) => (
        <p key={l} className={`slide-line font-display text-[13vw] lg:text-[10vw] leading-[0.92] whitespace-nowrap px-6 ${i % 2 ? "text-right italic text-beam" : "text-outline"}`}>{l}</p>
      ))}
    </section>
  );
}

export { ScrollTrigger };
