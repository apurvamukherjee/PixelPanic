import { useEffect, useRef, useState } from "react";
import { useRoomStore } from "../../store/useRoomStore";
import { useConnectionStore } from "../../store/useConnectionStore";
import { Icon } from "./Icon";

// Mirrors RECONNECT_GRACE_MS in server/src/game/RoomInstance.ts — the server
// is still the sole authority on when a disconnected player actually gets
// removed, this is only a countdown *display* so the grace period isn't
// invisible (previously just a fade on the player's avatar).
const GRACE_MS = 20_000;

interface PendingReconnect {
  playerId: string;
  name: string;
  disconnectedAt: number;
}

// Global (mounted once in App.tsx) so the countdown survives navigating
// between the lobby and game screens instead of resetting.
export function ReconnectToasts() {
  const room = useRoomStore((s) => s.room);
  const connectionStatus = useConnectionStore((s) => s.status);
  const [pending, setPending] = useState<PendingReconnect[]>([]);
  const prevConnected = useRef<Map<string, boolean>>(new Map());
  const [, forceTick] = useState(0);

  // Diff room.players' `connected` flags across ROOM_STATE updates — a
  // false->true or a departure clears the toast, a true->false starts one.
  useEffect(() => {
    if (!room) return;
    const now = Date.now();
    setPending((prevList) => {
      let next = prevList;
      for (const p of room.players) {
        const wasConnected = prevConnected.current.get(p.id);
        if (wasConnected === true && !p.connected) {
          next = [...next.filter((x) => x.playerId !== p.id), { playerId: p.id, name: p.name, disconnectedAt: now }];
        } else if (p.connected) {
          next = next.filter((x) => x.playerId !== p.id);
        }
      }
      const stillPresent = new Set(room.players.map((p) => p.id));
      next = next.filter((x) => stillPresent.has(x.playerId));
      return next;
    });
    prevConnected.current = new Map(room.players.map((p) => [p.id, p.connected]));
  }, [room]);

  // Tick once a second purely to re-render the countdown text and drop
  // entries once their grace window has elapsed.
  useEffect(() => {
    if (pending.length === 0) return;
    const t = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [pending.length]);

  const visible = pending.filter((p) => GRACE_MS - (Date.now() - p.disconnectedAt) > 0);
  // Gated on already having room state, not just connectionStatus — status
  // is also briefly "connecting" during the very first-ever handshake
  // (before any room exists), which is not a reconnect and shouldn't say so.
  const iAmReconnecting = !!room && (connectionStatus === "disconnected" || connectionStatus === "connecting");

  if (!iAmReconnecting && visible.length === 0) return null;

  return (
    <div className="pointer-events-none fixed left-1/2 top-16 z-40 flex -translate-x-1/2 flex-col items-center gap-2">
      {iAmReconnecting && (
        <div className="glass round-end-pop flex items-center gap-2 rounded-full px-4 py-2 text-sm text-on-surface">
          <Icon name="sync" className="!text-base animate-spin text-tertiary" />
          Reconnecting…
        </div>
      )}
      {visible.map((p) => {
        const remainingSec = Math.max(0, Math.ceil((GRACE_MS - (Date.now() - p.disconnectedAt)) / 1000));
        return (
          <div key={p.playerId} className="glass round-end-pop flex items-center gap-2 rounded-full px-4 py-2 text-sm text-on-surface">
            <span className="h-2 w-2 shrink-0 rounded-full bg-error" />
            {p.name} disconnected — {remainingSec}s to reconnect
          </div>
        );
      })}
    </div>
  );
}
