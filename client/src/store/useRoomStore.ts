import { create } from "zustand";
import type { Room, RoomErrorPayload } from "@pixelpanic/shared";

interface RoomState {
  room: Room | null;
  mySocketId: string | null;
  isHost: boolean;
  myTeamId: string | null;
  lastError: RoomErrorPayload | null;
  setRoom: (room: Room, mySocketId: string | null) => void;
  setError: (error: RoomErrorPayload) => void;
  clearError: () => void;
  clear: () => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  room: null,
  mySocketId: null,
  isHost: false,
  myTeamId: null,
  lastError: null,

  setRoom: (room, mySocketId) =>
    set({
      room,
      mySocketId,
      isHost: room.hostId === mySocketId,
      myTeamId: room.players.find((p) => p.id === mySocketId)?.teamId ?? null,
    }),

  setError: (error) => set({ lastError: error }),
  clearError: () => set({ lastError: null }),

  clear: () => set({ room: null, mySocketId: null, isHost: false, myTeamId: null }),
}));
