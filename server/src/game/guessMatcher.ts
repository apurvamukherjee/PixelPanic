function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isCorrectGuess(guess: string, word: string): boolean {
  return normalize(guess) === normalize(word);
}

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dist: number[][] = Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dist[i]![j] = Math.min(
        dist[i - 1]![j]! + 1,
        dist[i]![j - 1]! + 1,
        dist[i - 1]![j - 1]! + cost
      );
    }
  }
  return dist[rows - 1]![cols - 1]!;
}

// Near-miss taunt (Phase 3): a guess close enough to be worth an encouraging
// nudge, but not correct. Threshold scales with word length so a 1-letter
// typo on a long word still counts as "close" — this must run server-side
// (guessers' clients only ever see the masked word, never the real one).
export function isNearMiss(guess: string, word: string): boolean {
  const g = normalize(guess);
  const w = normalize(word);
  if (g === w) return false;
  const threshold = w.length > 6 ? 2 : 1;
  return levenshtein(g, w) <= threshold;
}
