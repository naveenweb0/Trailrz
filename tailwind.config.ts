import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        trailrz: {
          ivory: "#F7F3EB",
          "ivory-dark": "#EDE7DA",
          black: "#111111",
          dark: "#1A1A1A",
          card: "#FFFFFF",
          red: "#E53935",
          "red-hover": "#D32F2F",
          "red-light": "#FFEBEE",
          grey: "#777777",
          "grey-light": "#E5E0D5",
          "grey-border": "#E2DDD3",
          gold: "#D4AF37",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Playfair Display", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      backgroundImage: {
        "grain-pattern": "radial-gradient(#111111 0.75px, transparent 0.75px)",
      },
    },
  },
  plugins: [],
};
export default config;
