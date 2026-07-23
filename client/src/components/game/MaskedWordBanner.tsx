import { useGameStore } from "../../store/useGameStore";
import { useRoomStore } from "../../store/useRoomStore";
import { CountdownBar } from "../shared/CountdownBar";

export function MaskedWordBanner() {
  const turn = useGameStore((s) => s.turn);
  const mySocketId = useRoomStore((s) => s.mySocketId);
  const drawTimeSec = useRoomStore((s) => s.room?.settings.drawTimeSec ?? 80);
  if (!turn) return null;

  const isDrawer = turn.drawerId === mySocketId;

  return (
    <div className="glass flex flex-col gap-2 rounded-2xl p-3">
      {isDrawer && (
        <div className="text-center font-mono text-[10px] uppercase tracking-widest text-secondary">
          You are drawing
        </div>
      )}
      <div
        data-testid="masked-word"
        className={`text-center font-display text-2xl font-extrabold tracking-[0.25em] ${
          isDrawer ? "text-primary" : "text-on-surface"
        }`}
      >
        {isDrawer && turn.word ? turn.word.toUpperCase() : turn.maskedWord}
      </div>
      <CountdownBar totalSec={drawTimeSec} />
    </div>
  );
}
