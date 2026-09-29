import animate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
// MentorRoom design system — vibrant · soft · flat (no shadows).
// Light surface (#FFFFFF) with an electric-blue primary (#0100F8), pill
// buttons, 16px cards and Geist at a 16px body base. Hover/pressed tints are
// derived from the brief's accent (#0100C6) so states stay on-palette.
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Core palette — every key reads from the CSS custom properties in
        // index.css, so the .dark token block flips the whole app (light
        // values are exactly the brief's hexes). rgb(...) + <alpha-value>
        // keeps Tailwind opacity modifiers (border-primary/30) working.
        primary: {
          DEFAULT: "rgb(var(--primary-rgb) / <alpha-value>)", // electric blue
          dark: "var(--primary-dark)", // hover (the brief's accent)
          deeper: "var(--primary-deeper)", // active / pressed
          soft: "var(--primary-soft)", // selected fills, mentor bubbles
          tint: "var(--primary-tint)", // page wash, hover fills
          foreground: "#FFFFFF", // shadcn: text on primary
        },
        surface: "var(--background)", // page / card background
        elevated: "var(--elevated)", // subtle raised fill
        ink: "rgb(var(--ink-rgb) / <alpha-value>)", // text
        muted: "var(--muted)", // secondary text
        // Semantic state tokens (no one-off rgba values in components)
        hairline: "var(--border)", // default 1px border on light surfaces
        hoverfill: "var(--hover)", // neutral hover fill
        hoverstrong: "var(--hover-strong)", // pressed/active fill
        // shadcn/ui semantic layer — mapped onto the same MentorRoom tokens
        // (no second source of truth; components from either system match).
        border: "var(--border)",
        input: "var(--border)",
        ring: "var(--focus-ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: { DEFAULT: "var(--background)", foreground: "var(--foreground)" },
        popover: { DEFAULT: "var(--background)", foreground: "var(--foreground)" },
        secondary: { DEFAULT: "var(--elevated)", foreground: "var(--foreground)" },
        "muted-foreground": "var(--muted)",
        accent: { DEFAULT: "var(--hover)", foreground: "var(--foreground)" },
        destructive: { DEFAULT: "var(--danger)", foreground: "#FFFFFF" },
      },
      borderRadius: {
        DEFAULT: "0.375rem", // inputs: 6px per the brief
        input: "6px",
        card: "16px", // cards: 16px
        pill: "9999px", // buttons/chips: pill
        // Legacy aliases still referenced by components
        xs: "18px",
        btn: "6px",
        chip: "9999px",
      },
      fontFamily: {
        sans: ["Geist", "Geist Fallback", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Type scale from the brief: 60 / 48 / 31 / 16
        h1: ["60px", { lineHeight: "1", fontWeight: "600" }],
        h2: ["48px", { lineHeight: "1", letterSpacing: "-1.9px", fontWeight: "500" }],
        h3: ["48px", { lineHeight: "1", fontWeight: "500" }],
        h4: ["16px", { lineHeight: "1.5", fontWeight: "500" }],
        body: ["16px", { lineHeight: "1.5", fontWeight: "400" }],
      },
      spacing: {
        // 4px grid; the brief's scale (20/28/40/80/112) already exists in
        // Tailwind's default ruler — this adds the marketing gutter.
        gutter: "10px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "accordion-up": "accordion-up 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      },
      transitionDuration: {
        DEFAULT: "300ms",
      },
      transitionTimingFunction: {
        std: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      zIndex: {
        element: "50", // brief: element layer at 50
        nav: "999",
      },
    },
  },
  plugins: [animate],
};
