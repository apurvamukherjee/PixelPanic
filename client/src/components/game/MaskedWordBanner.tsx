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
  const flipPosition = justRevealedIndex === null ? -1 : justRevealedIndex * 2;

  if (iKnowTheWord && word) {
    return (
      <div
        data-testid="masked-word"
        className="break-words text-center font-display text-xl font-extrabold uppercase tracking-[0.2em] text-primary md:text-2xl"
      >
        {word}
      </div>
    );
  }

  // Words of a multi-word answer are separated by three spaces in the mask;
  // each is kept unbreakable so a long phrase wraps between words on a
  // phone instead of overflowing or splitting mid-word.
  let offset = 0;
  return (
    <div
      data-testid="masked-word"
      className="flex flex-wrap justify-center gap-x-[1em] text-center font-display text-xl font-extrabold tracking-[0.2em] text-on-surface md:text-2xl"
    >
      {maskedWord.split("   ").map((part, wordIndex) => {
        const start = offset;
        offset += part.length + 3;
        return (
          <span key={wordIndex} className="whitespace-nowrap">
            {part.split("").map((ch, i) => (
              <span key={i} className={start + i === flipPosition ? "letter-flip inline-block" : "inline-block"}>
                {ch === " " ? "\u00a0" : ch}
              </span>
            ))}
          </span>
        );
      })}
    </div>
  );
}

// "3 + 5 letters" for "ice cream" — wordLength counts the space and any
// punctuation, which read as one more letter to guess.
function letterCounts(maskedWord: string): string {
  const counts = maskedWord.split("   ").map((part) => part.replace(/[^\p{L}\p{N}_]/gu, "").length);
  const total = counts.reduce((a, b) => a + b, 0);
  return `${counts.join(" + ")} ${total === 1 ? "letter" : "letters"}`;
}

export function MaskedWordBanner() {
  const turn = useGameStore((s) => s.turn);
  const mySocketId = useRoomStore((s) => s.mySocketId);
  const drawTimeSec = useRoomStore((s) => s.room?.settings.drawTimeSec ?? 80);
  // Set only once *this* client has correctly guessed — see markGuessedCorrectly.
  // Non-drawer guessers never receive turn.word itself (see chooseWord,
  // RoomInstance.ts), so this is the only way they learn the real word.
  const revealedWordForMe = useGameStore((s) => s.revealedWordForMe);
  if (!turn) return null;

  // Reverse mode flips who sees what — the server sends the real word to
  // everyone except whoever is nominally "drawing" this turn, so "am I
  // drawing blind" is just the normal isDrawer flag under the hood. Either
  // way, turn.word is non-null exactly when *this* client already has it;
  // revealedWordForMe fills in the one case it can't cover — a guesser who
  // just got it right.
  const isDrawer = turn.drawerId === mySocketId;
  const wordToShow = turn.word ?? revealedWordForMe;
  const iKnowTheWord = wordToShow !== null;

  return (
    <div
      key={`${turn.roundIndex}-${turn.turnIndexInRound}`}
      className="turn-reveal panel flex flex-col gap-1.5 rounded-2xl px-3 py-2 md:gap-2 md:p-3"
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
      <div className="flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-widest">
        <span className="text-on-surface-variant/70">
          Round {turn.roundIndex + 1}/{turn.totalRounds}
        </span>
        {isDrawer ? (
          <span className="text-secondary">
            {turn.isReverseMode ? "You're guessing" : "You're drawing"}
          </span>
        ) : (
          !iKnowTheWord && turn.maskedWord && (
            <span className="text-on-surface-variant">{letterCounts(turn.maskedWord)}</span>
          )
        )}
      </div>
      <MaskedWordDisplay iKnowTheWord={iKnowTheWord} word={wordToShow} maskedWord={turn.maskedWord} />
      <CountdownBar totalSec={drawTimeSec} />
    </div>
  );
}
