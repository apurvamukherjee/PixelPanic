import type { Config } from "tailwindcss";

// "Chalkboard party" tokens: a slate-green board, warm chalk-white text and
// chalk-stick accents. Flat M3-style names kept so components read as
// `bg-surface-container`, `text-primary`, etc.
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#17221d",
        surface: "#17221d",
        "surface-dim": "#121b17",
        "surface-bright": "#31463b",
        "surface-container-lowest": "#111a15",
        "surface-container-low": "#1b2822",
        "surface-container": "#1f2d26",
        "surface-container-high": "#283a31",
        "surface-container-highest": "#31463b",
        "surface-variant": "#31463b",
        "on-background": "#f1ede0",
        "on-surface": "#f1ede0",
        "on-surface-variant": "#b5bfb0",
        outline: "#8c9a8a",
        "outline-variant": "#3e5246",
        primary: "#f7cb46",
        "on-primary": "#2a2108",
        "primary-container": "#c99a1a",
        "on-primary-container": "#2a2108",
        secondary: "#86cdf5",
        "on-secondary": "#07283a",
        "secondary-container": "#3d9bd1",
        "on-secondary-container": "#04192a",
        tertiary: "#f59abd",
        "on-tertiary": "#3f0a20",
        "tertiary-container": "#d4628d",
        "on-tertiary-container": "#2e0516",
        error: "#ff8a7a",
        "on-error": "#3a0a05",
        "error-container": "#a3271a",
        "on-error-container": "#ffdad6",
        success: "#9bdb7e",
      },
      fontFamily: {
        display: ["\"Shantell Sans\"", "cursive"],
        body: ["\"Atkinson Hyperlegible Next\"", "system-ui", "sans-serif"],
        mono: ["\"JetBrains Mono\"", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
