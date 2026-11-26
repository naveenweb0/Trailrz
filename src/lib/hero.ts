export interface HeroSlide {
  label: string;
  image_url: string;
}

export interface HeroConfig {
  eyebrow: string;
  headline_line_1: string;
  headline_line_2: string;
  tagline: string;
  subtext: string;
  primary_cta_label: string;
  primary_cta_href: string;
  secondary_cta_label: string;
  secondary_cta_href: string;
  show_board: boolean;
  board_eyebrow: string;
  board_title: string;
  board_footnote: string;
  slides: HeroSlide[];
}

export const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  { label: "CANDLELIGHT", image_url: "/img/hero.jpg" },
  { label: "JAZZ NIGHT", image_url: "/img/music-nights.jpg" },
  { label: "POTTERY", image_url: "/img/creative-escape.jpg" },
  { label: "SUPPER CLUB", image_url: "/img/slow-evenings.jpg" },
  { label: "STAND-UP", image_url: "/img/comedy.jpg" },
  { label: "ROOFTOP", image_url: "/img/rooftop.jpg" },
  { label: "GALLERY", image_url: "/img/something-different.jpg" },
  { label: "THEATRE", image_url: "/img/theatre.jpg" },
];

export const DEFAULT_HERO_CONFIG: HeroConfig = {
  eyebrow: "",
  headline_line_1: "Life is",
  headline_line_2: "happening.",
  tagline: "Go be part of it.",
  subtext: "Find the moments, places and people worth stepping out for.",
  primary_cta_label: "Discover experiences",
  primary_cta_href: "/discover",
  secondary_cta_label: "Originals",
  secondary_cta_href: "/originals",
  show_board: true,
  board_eyebrow: "Tonight's departures",
  board_title: "NOW SHOWING",
  board_footnote: "Kinds of nights we curate · photos illustrative",
  slides: DEFAULT_HERO_SLIDES,
};

export function isSafeImageUrl(url: string): boolean {
  const u = (url || "").trim();
  return /^https?:\/\//i.test(u) || u.startsWith("/");
}

export function isSafeHref(href: string): boolean {
  const h = (href || "").trim();
  return h.startsWith("/") || /^https?:\/\//i.test(h);
}

export function normalizeHeroConfig(raw: unknown): HeroConfig {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const str = (key: keyof HeroConfig, fallback: string) => {
    const val = src[key];
    return typeof val === "string" ? val : fallback;
  };

  const rawSlides = Array.isArray(src.slides) ? src.slides : [];
  const slides: HeroSlide[] = rawSlides
    .map((s) => {
      if (!s || typeof s !== "object") return null;
      const item = s as Record<string, unknown>;
      const imageUrl = typeof item.image_url === "string" ? item.image_url.trim() : "";
      const label = typeof item.label === "string" ? item.label.trim() : "";
      if (!imageUrl || !isSafeImageUrl(imageUrl)) return null;
      return {
        label: (label || "TRAILRZ").slice(0, 20),
        image_url: imageUrl,
      };
    })
    .filter((s): s is HeroSlide => s !== null);

  const primaryHref = str("primary_cta_href", DEFAULT_HERO_CONFIG.primary_cta_href).trim();
  const secondaryHref = str("secondary_cta_href", DEFAULT_HERO_CONFIG.secondary_cta_href).trim();

  return {
    eyebrow: str("eyebrow", DEFAULT_HERO_CONFIG.eyebrow),
    headline_line_1: str("headline_line_1", DEFAULT_HERO_CONFIG.headline_line_1) || DEFAULT_HERO_CONFIG.headline_line_1,
    headline_line_2: str("headline_line_2", DEFAULT_HERO_CONFIG.headline_line_2),
    tagline: str("tagline", DEFAULT_HERO_CONFIG.tagline),
    subtext: str("subtext", DEFAULT_HERO_CONFIG.subtext),
    primary_cta_label: str("primary_cta_label", DEFAULT_HERO_CONFIG.primary_cta_label) || DEFAULT_HERO_CONFIG.primary_cta_label,
    primary_cta_href: isSafeHref(primaryHref) ? primaryHref : DEFAULT_HERO_CONFIG.primary_cta_href,
    secondary_cta_label: str("secondary_cta_label", DEFAULT_HERO_CONFIG.secondary_cta_label),
    secondary_cta_href: isSafeHref(secondaryHref) ? secondaryHref : DEFAULT_HERO_CONFIG.secondary_cta_href,
    show_board: typeof src.show_board === "boolean" ? src.show_board : DEFAULT_HERO_CONFIG.show_board,
    board_eyebrow: str("board_eyebrow", DEFAULT_HERO_CONFIG.board_eyebrow),
    board_title: str("board_title", DEFAULT_HERO_CONFIG.board_title),
    board_footnote: str("board_footnote", DEFAULT_HERO_CONFIG.board_footnote),
    slides: slides.length > 0 ? slides : DEFAULT_HERO_SLIDES,
  };
}
