import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import { ClientEvents } from "@pixelpanic/shared";
import { useRoomStore } from "./useRoomStore";
import { getAnonId, getSavedName } from "../lib/anonId";

type ConnectionStatus = "idle" | "connecting" | "connected" | "disconnected";

interface ConnectionState {
  socket: Socket | null;
  status: ConnectionStatus;
  ensureConnected: () => Socket;
}

// Single socket for the whole app lifetime — created lazily on first use.
let socketSingleton: Socket | null = null;

export const useConnectionStore = create<ConnectionState>((set) => ({
  socket: null,
  status: "idle",

  ensureConnected: () => {
    if (socketSingleton) return socketSingleton;

    set({ status: "connecting" });
    const socket = io({ autoConnect: true });
    socketSingleton = socket;

    socket.on("connect", () => {
      set({ status: "connected" });
      // socket.io-client auto-reconnects with a brand-new socket.id after a
      // network blip, but the server only knows a *room* by anonId — without
      // re-emitting ROOM_JOIN here, the reconnect would complete at the
      // transport level while the player stayed stuck in the room's 20s
      // grace-period limbo (RECONNECT_GRACE_MS, RoomInstance.ts) until
      // manually refreshing. `room` is only already set here on a *second*
      // "connect" (a real reconnect) — the first-ever join is always driven
      // explicitly by HomePage/JoinByLinkRedirect.
      const { room } = useRoomStore.getState();
      if (room) {
        socket.emit(ClientEvents.ROOM_JOIN, { roomId: room.id, name: getSavedName(), anonId: getAnonId() });
      }
    });
    socket.on("disconnect", () => set({ status: "disconnected" }));

    set({ socket });
    return socket;
  },
}));
