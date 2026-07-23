import { create } from "zustand";
import type { TournamentState } from "@pixelpanic/shared";

interface TournamentStoreState {
  tournament: TournamentState | null;
  applyTournamentState: (tournament: TournamentState) => void;
  clear: () => void;
}

export const useTournamentStore = create<TournamentStoreState>((set) => ({
  tournament: null,
  applyTournamentState: (tournament) => set({ tournament }),
  clear: () => set({ tournament: null }),
}));
