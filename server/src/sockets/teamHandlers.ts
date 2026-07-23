import type { Socket } from "socket.io";
import {
  ClientEvents,
  type RoomSetTeamsPayload,
  type RoomSetPlayerTeamPayload,
} from "@pixelpanic/shared";
import type { RoomManager } from "../game/RoomManager.js";

export function registerTeamHandlers(socket: Socket, roomManager: RoomManager): void {
  socket.on(ClientEvents.ROOM_SET_TEAMS, (payload: RoomSetTeamsPayload) => {
    const room = roomManager.getRoomBySocket(socket);
    room?.setTeams(socket.id, payload.teams);
  });

  socket.on(ClientEvents.ROOM_SET_PLAYER_TEAM, (payload: RoomSetPlayerTeamPayload) => {
    const room = roomManager.getRoomBySocket(socket);
    room?.setPlayerTeam(socket.id, payload.playerId, payload.teamId);
  });
}
