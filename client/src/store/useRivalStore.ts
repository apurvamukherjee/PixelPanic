import { create } from "zustand";
import type { RivalSummary } from "@pixelpanic/shared";
import { fetchRival } from "../lib/api";

interface RivalStoreState {
  rival: RivalSummary | null;
  loaded: boolean;
  load: (anonId: string) => Promise<void>;
  setOnline: (online: boolean) => void;
}

// Rival data is cross-room, profile-level state (not tied to any one room's
// lifecycle), fetched via REST rather than pushed on room join — so it gets
// its own store outside useRoomStore, mirroring useTournamentStore's
// minimal "one payload + one apply action" shape.
export const useRivalStore = create<RivalStoreState>((set) => ({
  rival: null,
  loaded: false,

  load: async (anonId) => {
    const rival = await fetchRival(anonId);
    set({ rival, loaded: true });
  },

  setOnline: (online) =>
    set((state) => (state.rival ? { rival: { ...state.rival, rivalOnline: online } } : {})),
}));
