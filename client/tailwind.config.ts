import type { Config } from "tailwindcss";

// Design tokens sourced from design/pixelpanic/DESIGN.md — "Modern-Electric"
// glassmorphism, obsidian-grade dark mode. Flat M3-style token names so
// components read as `bg-surface-container`, `text-primary`, etc.
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0b1326",
        surface: "#0b1326",
        "surface-dim": "#0b1326",
        "surface-bright": "#31394d",
        "surface-container-lowest": "#060e20",
        "surface-container-low": "#131b2e",
        "surface-container": "#171f33",
        "surface-container-high": "#222a3d",
        "surface-container-highest": "#2d3449",
        "surface-variant": "#2d3449",
        "on-background": "#dae2fd",
        "on-surface": "#dae2fd",
        "on-surface-variant": "#cfc2d6",
        outline: "#988d9f",
        "outline-variant": "#4d4354",
        primary: "#ddb7ff",
        "on-primary": "#490080",
        "primary-container": "#b76dff",
        "on-primary-container": "#400071",
        secondary: "#5de6ff",
        "on-secondary": "#00363e",
        "secondary-container": "#00cbe6",
        "on-secondary-container": "#00515d",
        tertiary: "#ffafd3",
        "on-tertiary": "#620040",
        "tertiary-container": "#e364a7",
        "on-tertiary-container": "#560038",
        error: "#ffb4ab",
        "on-error": "#690005",
        "error-container": "#93000a",
        "on-error-container": "#ffdad6",
        success: "#4ade80",
      },
      fontFamily: {
        display: ["Sora", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["\"JetBrains Mono\"", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
