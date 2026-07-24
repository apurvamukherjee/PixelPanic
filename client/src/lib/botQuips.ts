// Flavor text from "Apurva's Bot" — a fake in-chat mascot that reacts to
// guesses in cheeky Hinglish. Purely cosmetic (client-side only, never sent
// to the server), so different players can see different quips for the same
// event without anything needing to agree on state.

const NEAR_MISS_QUIPS = [
  "phirse guess kar laude",
  "so close it hurts.",
  "ek dum paas hai, dubara try kar!",
  "you can taste it, can't you?",
  "bas thoda aur, ho jayega!",
];

const WRONG_GUESS_QUIPS = [
  "hut laude",
  "bold guess. wrong, but bold.",
  "yeh kya jawab tha bhai.",
  "Apurva's Bot is quietly judging that one.",
  "not even close, but A for effort.",
  "dimaag lagao thoda!",
];

const CORRECT_GUESS_QUIPS = [
  "lovely laude",
  "shabaash! ekdum sahi jawab.",
  "certified genius right there.",
  "waah bhai waah!",
  "nailed it.",
];

function pick(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export function pickNearMissQuip(): string {
  return pick(NEAR_MISS_QUIPS);
}

export function pickWrongGuessQuip(): string {
  return pick(WRONG_GUESS_QUIPS);
}

export function pickCorrectGuessQuip(): string {
  return pick(CORRECT_GUESS_QUIPS);
}
