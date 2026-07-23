import type { Socket } from "socket.io";
import { ClientEvents } from "@pixelpanic/shared";
import type { RoomManager } from "../game/RoomManager.js";

export function registerTournamentHandlers(socket: Socket, roomManager: RoomManager): void {
  socket.on(ClientEvents.TOURNAMENT_START, () => {
    const room = roomManager.getRoomBySocket(socket);
    room?.startTournament(socket.id);
  });
}
