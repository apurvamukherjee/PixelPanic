import type { Socket } from "socket.io";
import { ClientEvents, type VotekickPayload, type MutePayload } from "@pixelpanic/shared";
import type { RoomManager } from "../game/RoomManager.js";
import { votekickRateLimiter } from "../utils/rateLimiter.js";

export function registerModHandlers(socket: Socket, roomManager: RoomManager): void {
  socket.on(ClientEvents.MOD_VOTEKICK, (payload: VotekickPayload) => {
    if (!votekickRateLimiter.check(socket.id)) return;
    const room = roomManager.getRoomBySocket(socket);
    room?.votekick(socket.id, payload.targetPlayerId);
  });

  socket.on(ClientEvents.MOD_MUTE, (payload: MutePayload) => {
    const room = roomManager.getRoomBySocket(socket);
    room?.mute(socket.id, payload.targetPlayerId);
  });
}
