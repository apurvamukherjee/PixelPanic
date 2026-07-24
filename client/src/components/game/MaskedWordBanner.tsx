import { useGameStore } from "../../store/useGameStore";
import { useRoomStore } from "../../store/useRoomStore";
import { CountdownBar } from "../shared/CountdownBar";
import { Icon } from "../shared/Icon";

export function MaskedWordBanner() {
  const turn = useGameStore((s) => s.turn);
  const mySocketId = useRoomStore((s) => s.mySocketId);
  const drawTimeSec = useRoomStore((s) => s.room?.settings.drawTimeSec ?? 80);
  if (!turn) return null;

  // Reverse mode flips who sees what — the server sends the real word to
  // everyone except whoever is nominally "drawing" this turn, so "am I
  // drawing blind" is just the normal isDrawer flag under the hood.
  const isDrawer = turn.drawerId === mySocketId;
  const iKnowTheWord = turn.isReverseMode ? !isDrawer : isDrawer;

  return (
    <div
      key={`${turn.roundIndex}-${turn.turnIndexInRound}`}
      className="turn-reveal glass flex flex-col gap-2 rounded-2xl p-3"
    >
      {(turn.isBountyRound || turn.isMashupRound || turn.isReverseMode) && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {turn.isBountyRound && (
            <span className="flex items-center gap-1 rounded-full bg-tertiary/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-tertiary">
              <Icon name="bolt" className="!text-xs" /> Bounty round · 5x points
            </span>
          )}
          {turn.isMashupRound && (
            <span className="rounded-full bg-secondary/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-secondary">
              Word mashup
            </span>
          )}
          {turn.isReverseMode && (
            <span className="rounded-full bg-primary/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-primary">
              Reverse mode
            </span>
          )}
        </div>
      )}
      {isDrawer && (
        <div className="text-center font-mono text-[10px] uppercase tracking-widest text-secondary">
          {turn.isReverseMode ? "You're guessing this turn" : "You are drawing"}
        </div>
      )}
      <div
        data-testid="masked-word"
        className={`text-center font-display text-2xl font-extrabold tracking-[0.25em] ${
          iKnowTheWord ? "text-primary" : "text-on-surface"
        }`}
      >
        {iKnowTheWord && turn.word ? turn.word.toUpperCase() : turn.maskedWord}
      </div>
      <CountdownBar totalSec={drawTimeSec} />
    </div>
  );
}
