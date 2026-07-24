import type { Socket } from "socket.io";
import { ClientEvents, type SabotageUsePowerupPayload, type MashupVotePayload } from "@pixelpanic/shared";
import type { RoomManager } from "../game/RoomManager.js";

export function registerChaosHandlers(socket: Socket, roomManager: RoomManager): void {
  socket.on(ClientEvents.SABOTAGE_USE_POWERUP, (payload: SabotageUsePowerupPayload) => {
    const room = roomManager.getRoomBySocket(socket);
    room?.useSabotagePowerup(socket.id, payload.powerup, payload.targetPlayerId);
  });

  socket.on(ClientEvents.MASHUP_VOTE, (payload: MashupVotePayload) => {
    const room = roomManager.getRoomBySocket(socket);
    room?.castMashupVote(socket.id, payload.targetPlayerId);
  });
}
