// Animated, doodle-themed background: a tiled pattern of simple hand-drawn-
// style icons (pencil, star, speech bubble, sparkle, paint drop) drifting
// slowly behind the UI. Authored as inline SVG (no external asset pipeline,
// no image library) and tiled via a CSS repeating background — low opacity
// so it reads as texture behind the glass panels, not noise.
const DOODLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220">
  <g fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 65 L48 37 L58 47 L30 75 Z M48 37 L58 47" />
    <path d="M150 18 L155 33 L171 33 L158 43 L163 58 L150 49 L137 58 L142 43 L129 33 L145 33 Z" />
    <path d="M38 118 h52 a8 8 0 0 1 8 8 v24 a8 8 0 0 1 -8 8 h-32 l-13 13 v-13 h-7 a8 8 0 0 1 -8 -8 v-24 a8 8 0 0 1 8 -8 Z" />
    <path d="M172 148 l4 12 l12 4 l-12 4 l-4 12 l-4 -12 l-12 -4 l12 -4 Z" />
    <path d="M104 176 a16 16 0 1 0 0.1 0 Z M104 154 q0 11 -9 22" />
  </g>
</svg>`;

const DOODLE_BG_URL = `url("data:image/svg+xml,${encodeURIComponent(DOODLE_SVG)}")`;

export function DoodleBackground() {
  return (
    <div
      aria-hidden="true"
      className="doodle-background pointer-events-none fixed inset-0 -z-10"
      style={{ backgroundImage: DOODLE_BG_URL }}
    />
  );
}
