import type { HintFrequency } from "@pixelpanic/shared";

// % of letters (non-space characters) revealed by the end of the turn.
// Chosen over "one letter every N seconds" so it scales for both short and
// long words without a second tuning knob.
const HINT_FREQUENCY_PERCENT: Record<HintFrequency, number> = {
  off: 0,
  slow: 0.25,
  normal: 0.4,
  fast: 0.6,
};

export interface ScheduledHint {
  atMs: number; // ms after turn start
  index: number; // index into the word string to reveal
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
}

export function computeHintSchedule(
  word: string,
  drawTimeSec: number,
  frequency: HintFrequency
): ScheduledHint[] {
  const letterIndices: number[] = [];
  for (let i = 0; i < word.length; i++) {
    if (word[i] !== " ") letterIndices.push(i);
  }

  if (word.length <= 3 || frequency === "off") return [];

  const percent = HINT_FREQUENCY_PERCENT[frequency];
  const hintCount = Math.floor(letterIndices.length * percent);
  if (hintCount <= 0) return [];

  const revealOrder = shuffle(letterIndices).slice(0, hintCount);
  const totalMs = drawTimeSec * 1000;

  return revealOrder.map((index, i) => ({
    atMs: Math.round(totalMs * (0.2 + 0.7 * ((i + 1) / (hintCount + 1)))),
    index,
  }));
}

export function buildMaskedWord(word: string, revealedIndices: Set<number>): string {
  return word
    .split("")
    .map((ch, i) => {
      if (ch === " ") return " ";
      return revealedIndices.has(i) ? ch : "_";
    })
    .join(" ");
}
