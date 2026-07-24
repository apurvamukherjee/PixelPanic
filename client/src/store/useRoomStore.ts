import { create } from "zustand";
import type { Room, RoomErrorPayload } from "@pixelpanic/shared";

interface RoomState {
  room: Room | null;
  mySocketId: string | null;
  isHost: boolean;
  myTeamId: string | null;
  lastError: RoomErrorPayload | null;
  // Set when ROOM_CLOSED arrives (host left for good) — RoomPage watches
  // this to bounce back to the home screen with a message, once.
  closedReason: string | null;
  setRoom: (room: Room, mySocketId: string | null) => void;
  setError: (error: RoomErrorPayload) => void;
  clearError: () => void;
  setClosedReason: (reason: string) => void;
  clearClosedReason: () => void;
  clear: () => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  room: null,
  mySocketId: null,
  isHost: false,
  myTeamId: null,
  lastError: null,
  closedReason: null,

  setRoom: (room, mySocketId) =>
    set({
      room,
      mySocketId,
      isHost: room.hostId === mySocketId,
      myTeamId: room.players.find((p) => p.id === mySocketId)?.teamId ?? null,
    }),

  setError: (error) => set({ lastError: error }),
  clearError: () => set({ lastError: null }),
  setClosedReason: (reason) => set({ closedReason: reason }),
  clearClosedReason: () => set({ closedReason: null }),

  clear: () => set({ room: null, mySocketId: null, isHost: false, myTeamId: null }),
}));
