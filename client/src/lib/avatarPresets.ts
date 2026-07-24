// Phase 3 avatar customization — a curated set of complete presets (icon +
// background color), not independently composable layers. Simplest v1 that
// still delivers "pick your character, cycle with arrows, hit dice to
// randomize" without a real art-production pipeline: reuses the Material
// Symbols webfont already loaded for the rest of the UI (see Icon.tsx)
// instead of authoring bespoke SVG character art.
export interface AvatarPreset {
  id: string;
  icon: string;
  bg: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: "cat", icon: "pets", bg: "#ef4444" },
  { id: "robot", icon: "smart_toy", bg: "#3b82f6" },
  { id: "rocket", icon: "rocket_launch", bg: "#8b5cf6" },
  { id: "smiley", icon: "sentiment_satisfied", bg: "#22c55e" },
  { id: "star", icon: "star", bg: "#eab308" },
  { id: "bolt", icon: "bolt", bg: "#06b6d4" },
  { id: "planet", icon: "public", bg: "#ec4899" },
  { id: "fire", icon: "local_fire_department", bg: "#f97316" },
  { id: "snowflake", icon: "ac_unit", bg: "#5de6ff" },
  { id: "crown", icon: "workspace_premium", bg: "#ddb7ff" },
  { id: "wizard", icon: "auto_fix_high", bg: "#b76dff" },
  { id: "mask", icon: "theater_comedy", bg: "#31394d" },
  { id: "dragon", icon: "whatshot", bg: "#e364a7" },
  { id: "eye", icon: "visibility", bg: "#00cbe6" },
  { id: "nature", icon: "emoji_nature", bg: "#4ade80" },
  { id: "sparkle", icon: "auto_awesome", bg: "#ffafd3" },
];

export function getAvatarPreset(id: string | null | undefined): AvatarPreset | null {
  if (!id) return null;
  return AVATAR_PRESETS.find((p) => p.id === id) ?? null;
}
