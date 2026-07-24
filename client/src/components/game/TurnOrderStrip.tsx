import { useGameStore } from "../../store/useGameStore";
import { useRoomStore } from "../../store/useRoomStore";
import { Avatar } from "../shared/Avatar";

const UPCOMING_COUNT = 4;

// A persistent "who's up next" preview so players aren't surprised by
// TURN_START — the rotation order itself comes straight from the server
// (see TurnStartPayload.rotationPlayerIds) rather than being guessed
// client-side, since team-interleaved rotation and connected-player
// filtering both live in RoomInstance.
export function TurnOrderStrip() {
  const rotationPlayerIds = useGameStore((s) => s.rotationPlayerIds);
  const drawerId = useGameStore((s) => s.turn?.drawerId ?? null);
  const phase = useGameStore((s) => s.phase);
  const room = useRoomStore((s) => s.room);
  const mySocketId = useRoomStore((s) => s.mySocketId);

  if (phase === "gameEnd" || !room || rotationPlayerIds.length < 2 || !drawerId) return null;

  const currentIndex = rotationPlayerIds.indexOf(drawerId);
  if (currentIndex === -1) return null;

  const upcoming = Array.from({ length: Math.min(UPCOMING_COUNT, rotationPlayerIds.length - 1) }, (_, i) =>
    rotationPlayerIds[(currentIndex + 1 + i) % rotationPlayerIds.length]
  )
    .map((id) => room.players.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p);

  if (upcoming.length === 0) return null;

  return (
    <div className="glass flex items-center gap-2 overflow-x-auto rounded-2xl px-3 py-2">
      <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant/60">
        Up next
      </span>
      {upcoming.map((p, i) => (
        <div key={p.id} className="flex shrink-0 items-center gap-1">
          {i > 0 && <span className="text-on-surface-variant/30">→</span>}
          <Avatar name={p.name} color={p.color} avatarId={p.avatarId} size={22} />
          <span className="max-w-[6rem] truncate font-display text-xs text-on-surface-variant">
            {p.id === mySocketId ? "You" : p.name}
          </span>
        </div>
      ))}
    </div>
  );
}
