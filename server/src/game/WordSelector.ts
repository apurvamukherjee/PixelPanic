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
}
