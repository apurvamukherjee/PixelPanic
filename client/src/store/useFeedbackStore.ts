import { create } from "zustand";

// Transient, fire-and-forget UI signal — not game state, so it lives outside
// useGameStore. GuessCorrectAnimation watches correctGuessSignal and shows
// itself for a couple seconds each time it changes; nothing ever reads the
// value itself, only whether it changed.
interface FeedbackState {
  correctGuessSignal: number;
  pointsAwarded: number;
  triggerCorrectGuess: (pointsAwarded: number) => void;
}

export const useFeedbackStore = create<FeedbackState>((set) => ({
  correctGuessSignal: 0,
  pointsAwarded: 0,
  triggerCorrectGuess: (pointsAwarded) =>
    set((s) => ({ correctGuessSignal: s.correctGuessSignal + 1, pointsAwarded })),
}));
