import { useEffect, useState } from "react";
import { ClientEvents, type DrawTool } from "@pixelpanic/shared";
import { useDrawingStore } from "../../store/useDrawingStore";
import { useConnectionStore } from "../../store/useConnectionStore";
import { useGameStore } from "../../store/useGameStore";
import { useRoomStore } from "../../store/useRoomStore";
import { useChaosStore } from "../../store/useChaosStore";
import { Icon } from "../shared/Icon";

const TOOLS: { tool: DrawTool; icon: string; label: string; key: string }[] = [
  { tool: "pencil", icon: "edit", label: "Pencil", key: "P" },
  { tool: "brush", icon: "brush", label: "Brush", key: "B" },
  { tool: "eraser", icon: "ink_eraser", label: "Eraser", key: "E" },
  { tool: "fill", icon: "format_color_fill", label: "Fill", key: "F" },
];

const TOOL_SHORTCUTS: Record<string, DrawTool> = {
  p: "pencil",
  b: "brush",
  e: "eraser",
  f: "fill",
};
const SIZE_STEP = 2;
const SIZE_MIN = 2;
const SIZE_MAX = 40;

const COLORS = [
  "#f8fafc", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6",
  "#ec4899", "#000000",
];

export function Toolbar() {
  const { tool, color, size, setTool, setColor, setSize } = useDrawingStore();
  const socket = useConnectionStore((s) => s.socket);
  const mySocketId = useRoomStore((s) => s.mySocketId);
  const drawerId = useGameStore((s) => s.turn?.drawerId ?? null);
  const isDrawer = drawerId !== null && drawerId === mySocketId;
  const [showShortcuts, setShowShortcuts] = useState(false);
  const paletteFrozen = useChaosStore(
    (s) => s.activeEffect?.effect === "freezePalette" && s.activeEffect.expiresAt > Date.now()
  );

  // Keyboard shortcuts, drawer-only: B/E/F/P swap tools, [ ] adjust brush
  // size. Ignored while focus is in a text field (chat input) so guessers
  // typing "before" or "fast" don't accidentally swap the drawer's tool.
  useEffect(() => {
    if (!isDrawer || paletteFrozen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;

      const key = e.key.toLowerCase();
      const shortcutTool = TOOL_SHORTCUTS[key];
      if (shortcutTool) {
        setTool(shortcutTool);
        e.preventDefault();
        return;
      }
      if (key === "[" || key === "]") {
        const current = useDrawingStore.getState().size;
        const next = key === "[" ? current - SIZE_STEP : current + SIZE_STEP;
        setSize(Math.max(SIZE_MIN, Math.min(SIZE_MAX, next)));
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDrawer, paletteFrozen, setTool, setSize]);

  if (!isDrawer) return null;

  return (
    <div className="glass flex flex-wrap items-center gap-3 rounded-2xl p-3">
      {paletteFrozen && (
        <div className="w-full rounded-lg bg-tertiary/20 px-3 py-1.5 text-center font-mono text-[10px] uppercase tracking-wide text-tertiary">
          Sabotaged! Your palette is frozen for a few seconds.
        </div>
      )}
      <div className={`flex gap-1 ${paletteFrozen ? "pointer-events-none opacity-40" : ""}`}>
        {TOOLS.map((t) => (
          <button
            key={t.tool}
            onClick={() => setTool(t.tool)}
            title={`${t.label} (${t.key})`}
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
              tool === t.tool
                ? "bg-primary text-on-primary shadow-[0_0_12px_rgba(221,183,255,0.4)]"
                : "bg-surface-container-highest text-on-surface-variant hover:bg-surface-variant"
            }`}
            aria-label={`${t.label} (${t.key})`}
          >
            <Icon name={t.icon} />
          </button>
        ))}
      </div>

      <div className="hidden h-8 w-px bg-white/10 md:block" />

      <div className={`flex flex-wrap gap-1.5 ${paletteFrozen ? "pointer-events-none opacity-40" : ""}`}>
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`h-6 w-6 rounded-full ring-2 ring-offset-2 ring-offset-surface-container transition-transform hover:scale-110 ${
              color === c ? "ring-primary" : "ring-transparent"
            }`}
            style={{ backgroundColor: c }}
            aria-label={`color ${c}`}
          />
        ))}
      </div>

      {tool !== "fill" && (
        <>
          <div className="hidden h-8 w-px bg-white/10 md:block" />
          <input
            type="range"
            min={2}
            max={40}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-24 accent-primary"
            disabled={paletteFrozen}
            title="Brush size ([ ])"
          />
        </>
      )}

      <div className="relative ml-auto flex gap-1">
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-primary"
          title="Undo"
          onClick={() => socket?.emit(ClientEvents.DRAW_UNDO)}
        >
          <Icon name="undo" />
        </button>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-error"
          title="Clear"
          onClick={() => socket?.emit(ClientEvents.DRAW_CLEAR)}
        >
          <Icon name="delete" />
        </button>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-secondary"
          title="Keyboard shortcuts"
          onClick={() => setShowShortcuts((v) => !v)}
        >
          <Icon name="keyboard" />
        </button>
        {showShortcuts && (
          <div className="round-row-in glass absolute bottom-11 right-0 z-10 flex w-52 flex-col gap-1.5 rounded-xl p-3 text-xs">
            <div className="mb-0.5 font-display font-bold uppercase tracking-wide text-on-surface-variant">
              Shortcuts
            </div>
            {TOOLS.map((t) => (
              <div key={t.tool} className="flex items-center justify-between text-on-surface">
                <span>{t.label}</span>
                <kbd className="rounded bg-surface-container-highest px-1.5 py-0.5 font-mono">{t.key}</kbd>
              </div>
            ))}
            <div className="flex items-center justify-between text-on-surface">
              <span>Brush size</span>
              <kbd className="rounded bg-surface-container-highest px-1.5 py-0.5 font-mono">[ ]</kbd>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
