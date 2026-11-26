export interface HeroSlide {
  image_url: string;
  line_1: string;
  line_2: string;
  line_3: string;
}

export interface HeroConfig {
  slides: HeroSlide[];
}

export const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  { image_url: "/img/hero.jpg", line_1: "NOW SHOWING", line_2: "CANDLELIGHT", line_3: "CHANDIGARH" },
  { image_url: "/img/music-nights.jpg", line_1: "NOW SHOWING", line_2: "JAZZ NIGHT", line_3: "MOHALI" },
  { image_url: "/img/creative-escape.jpg", line_1: "NOW SHOWING", line_2: "POTTERY", line_3: "PANCHKULA" },
  { image_url: "/img/slow-evenings.jpg", line_1: "NOW SHOWING", line_2: "SUPPER CLUB", line_3: "CHANDIGARH" },
  { image_url: "/img/comedy.jpg", line_1: "NOW SHOWING", line_2: "STAND-UP", line_3: "MOHALI" },
  { image_url: "/img/rooftop.jpg", line_1: "NOW SHOWING", line_2: "ROOFTOP", line_3: "CHANDIGARH" },
  { image_url: "/img/something-different.jpg", line_1: "NOW SHOWING", line_2: "GALLERY", line_3: "PANCHKULA" },
  { image_url: "/img/theatre.jpg", line_1: "NOW SHOWING", line_2: "THEATRE", line_3: "MOHALI" },
];

export const DEFAULT_HERO_CONFIG: HeroConfig = {
  slides: DEFAULT_HERO_SLIDES,
};

export function isSafeImageUrl(url: string): boolean {
  const u = (url || "").trim();
  return /^https?:\/\//i.test(u) || u.startsWith("/");
}

function cleanLine(val: unknown, fallback = ""): string {
  return typeof val === "string" ? val.trim().toUpperCase().slice(0, 11) : fallback;
}

export function normalizeHeroConfig(raw: unknown): HeroConfig {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const rawSlides = Array.isArray(src.slides) ? src.slides : [];

  const slides: HeroSlide[] = rawSlides
    .map((s) => {
      if (!s || typeof s !== "object") return null;
      const item = s as Record<string, unknown>;
      const imageUrl = typeof item.image_url === "string" ? item.image_url.trim() : "";
      if (!imageUrl || !isSafeImageUrl(imageUrl)) return null;

      const line1 = cleanLine(item.line_1) || "NOW SHOWING";
      const line2 = cleanLine(item.line_2 ?? item.label) || "TRAILRZ";
      const line3 = cleanLine(item.line_3);

      return {
        image_url: imageUrl,
        line_1: line1,
        line_2: line2,
        line_3: line3,
      };
    })
    .filter((s): s is HeroSlide => s !== null);

  return {
    slides: slides.length > 0 ? slides : DEFAULT_HERO_SLIDES,
  };
}
