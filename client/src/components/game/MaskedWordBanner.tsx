import { useGameStore } from "../../store/useGameStore";
import { useRoomStore } from "../../store/useRoomStore";
import { CountdownBar } from "../shared/CountdownBar";
import { Icon } from "../shared/Icon";

// buildMaskedWord (server, HintScheduler.ts) joins one array entry per
// original word index with " " — so original word index `i` always lands at
// rendered string position `2*i`. That's what lets justRevealedIndex (an
// original-word index) target the right character span to flip, without the
// client needing to know the real word to compute it.
function MaskedWordDisplay({
  iKnowTheWord,
  word,
  maskedWord,
}: {
  iKnowTheWord: boolean;
  word: string | null;
  maskedWord: string;
}) {
  const justRevealedIndex = useGameStore((s) => s.justRevealedIndex);
  const display = iKnowTheWord && word ? word.toUpperCase() : maskedWord;

  return (
    <div
      data-testid="masked-word"
      className={`text-center font-display text-2xl font-extrabold tracking-[0.25em] ${
        iKnowTheWord ? "text-primary" : "text-on-surface"
      }`}
    >
      {iKnowTheWord
        ? display
        : display.split("").map((ch, i) => (
            <span key={i} className={i === (justRevealedIndex ?? -1) * 2 ? "letter-flip inline-block" : "inline-block"}>
              {ch}
            </span>
          ))}
    </div>
  );
}

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
      <MaskedWordDisplay iKnowTheWord={iKnowTheWord} word={turn.word} maskedWord={turn.maskedWord} />
      <CountdownBar totalSec={drawTimeSec} />
    </div>
  );
}
