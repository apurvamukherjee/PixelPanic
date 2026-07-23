function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isCorrectGuess(guess: string, word: string): boolean {
  return normalize(guess) === normalize(word);
}
