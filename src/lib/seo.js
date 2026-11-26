import { useEffect } from "react";

function setMeta(attr, key, value) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

export function useSeo(title, description, { image, jsonLd } = {}) {
  useEffect(() => {
    const full = title ? `${title} — TRAILRZ` : "TRAILRZ — Life is happening. Go be part of it.";
    const desc = description || "Curated cultural experiences, live music, supper clubs, workshops and TRAILRZ Originals across Chandigarh, Mohali and Panchkula.";
    document.title = full;
    setMeta("name", "description", desc);
    setMeta("property", "og:title", full);
    setMeta("property", "og:description", desc);
    setMeta("property", "og:type", "website");
    if (image) setMeta("property", "og:image", image);
    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = window.location.origin + window.location.pathname;
    let script = document.getElementById("trz-jsonld");
    if (script) script.remove();
    if (jsonLd) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = "trz-jsonld";
      script.text = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
  }, [title, description, image, jsonLd]);
}
