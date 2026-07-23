import { create } from "zustand";
import { io, Socket } from "socket.io-client";

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

    socket.on("connect", () => set({ status: "connected" }));
    socket.on("disconnect", () => set({ status: "disconnected" }));

    set({ socket });
    return socket;
  },
}));
