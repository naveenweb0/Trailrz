import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  blocklist: ["overline"],
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Instrument Serif"', "Georgia", "serif"],
        sans: ['"Plus Jakarta Sans"', "-apple-system", "sans-serif"],
        mono: ['"Space Grotesk"', "monospace"],
      },
      borderRadius: { lg: "var(--radius)", md: "var(--radius)", sm: "1px" },
      colors: {
        parchment: "var(--parchment)",
        surface: "var(--surface)",
        tint: "var(--tint)",
        linen: "var(--linen)",
        ink: {
          DEFAULT: "var(--ink)",
          deep: "var(--ink-deep)",
          surface: "var(--ink-surface)",
          border: "var(--ink-border)",
        },
        mineral: "var(--mineral)",
        beam: "var(--beam)",
        amber: "var(--amber)",
        olive: "var(--olive)",
        granted: { DEFAULT: "var(--granted)", bg: "var(--granted-bg)" },
        dup: { DEFAULT: "var(--dup)", bg: "var(--dup-bg)" },
        invalid: { DEFAULT: "var(--invalid)", bg: "var(--invalid-bg)" },
        wrong: { DEFAULT: "var(--wrong)", bg: "var(--wrong-bg)" },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [animate],
};

export default config;
