import { ClientEvents, type DrawTool } from "@pixelpanic/shared";
import { useDrawingStore } from "../../store/useDrawingStore";
import { useConnectionStore } from "../../store/useConnectionStore";
import { useGameStore } from "../../store/useGameStore";
import { useRoomStore } from "../../store/useRoomStore";
import { Icon } from "../shared/Icon";

const TOOLS: { tool: DrawTool; icon: string }[] = [
  { tool: "pencil", icon: "edit" },
  { tool: "brush", icon: "brush" },
  { tool: "eraser", icon: "ink_eraser" },
  { tool: "fill", icon: "format_color_fill" },
];

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

  if (!isDrawer) return null;

  return (
    <div className="glass flex flex-wrap items-center gap-3 rounded-2xl p-3">
      <div className="flex gap-1">
        {TOOLS.map((t) => (
          <button
            key={t.tool}
            onClick={() => setTool(t.tool)}
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
              tool === t.tool
                ? "bg-primary text-on-primary shadow-[0_0_12px_rgba(221,183,255,0.4)]"
                : "bg-surface-container-highest text-on-surface-variant hover:bg-surface-variant"
            }`}
            aria-label={t.tool}
          >
            <Icon name={t.icon} />
          </button>
        ))}
      </div>

      <div className="hidden h-8 w-px bg-white/10 md:block" />

      <div className="flex flex-wrap gap-1.5">
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
          />
        </>
      )}

      <div className="ml-auto flex gap-1">
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
      </div>
    </div>
  );
}
