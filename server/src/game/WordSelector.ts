import type { WordPack } from "@pixelpanic/shared";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
}

// Tracks which words have been offered this game session so a small pack
// doesn't repeat too early. If the pack runs out, the "used" set resets
// (an acceptable Phase 1 limitation for a very small custom pack).
export class WordSelector {
  private usedWords = new Set<string>();

  constructor(private pack: WordPack) {}

  reset(): void {
    this.usedWords.clear();
  }

  pickThree(): [string, string, string] {
    let available = this.pack.words.filter((w) => !this.usedWords.has(w));
    if (available.length < 3) {
      this.usedWords.clear();
      available = this.pack.words;
    }
    const [a, b, c] = shuffle(available);
    const choices: [string, string, string] = [
      a ?? this.pack.words[0]!,
      b ?? this.pack.words[1 % this.pack.words.length]!,
      c ?? this.pack.words[2 % this.pack.words.length]!,
    ];
    return choices;
  }

  markUsed(word: string): void {
    this.usedWords.add(word);
  }

  // Phase 3 bounty rounds: filter to the longest ~40% of the pack (harder to
  // draw/guess), falling back to the normal pool if the pack is too small
  // for that filter to leave at least 3 words.
  pickThreeHard(): [string, string, string] {
    const sortedByLength = [...this.pack.words].sort((a, b) => b.length - a.length);
    const hardPoolSize = Math.max(3, Math.ceil(sortedByLength.length * 0.4));
    const hardPool = sortedByLength.slice(0, hardPoolSize);
    let available = hardPool.filter((w) => !this.usedWords.has(w));
    if (available.length < 3) available = hardPool;
    const [a, b, c] = shuffle(available);
    return [
      a ?? hardPool[0]!,
      b ?? hardPool[1 % hardPool.length]!,
      c ?? hardPool[2 % hardPool.length]!,
    ];
  }

  // Phase 3 word mashup: combines 2 random distinct pack words into one
  // compound draw target (e.g. "banana shark"). Not tracked in usedWords —
  // a mashup round is a one-off wildcard, not part of the normal repeat-
  // avoidance pool.
  pickMashup(): string {
    const shuffled = shuffle(this.pack.words);
    const first = shuffled[0] ?? this.pack.words[0]!;
    const second = shuffled.find((w) => w !== first) ?? shuffled[1] ?? first;
    return `${first} ${second}`;
  }
}
