import type { Socket } from "socket.io";
import {
  ClientEvents,
  ServerEvents,
  type RoomCreatePayload,
  type RoomJoinPayload,
  type RoomQuickMatchPayload,
  type RoomUpdateSettingsPayload,
  type RoomErrorPayload,
} from "@pixelpanic/shared";
import type { RoomManager } from "../game/RoomManager.js";

const NAME_MAX_LEN = 20;

function sanitizeName(name: string): string {
  return name.trim().slice(0, NAME_MAX_LEN) || "Player";
}

function emitError(socket: Socket, payload: RoomErrorPayload): void {
  socket.emit(ServerEvents.ROOM_ERROR, payload);
}

export function registerRoomHandlers(socket: Socket, roomManager: RoomManager): void {
  socket.on(ClientEvents.ROOM_CREATE, (payload: RoomCreatePayload) => {
    const room = roomManager.createRoom(
      payload.visibility,
      socket,
      sanitizeName(payload.hostName),
      payload.anonId,
      payload.avatarId ?? null
    );
    room.broadcastRoomState();
  });

  socket.on(ClientEvents.ROOM_JOIN, (payload: RoomJoinPayload) => {
    const result = roomManager.joinRoom(
      payload.roomId,
      socket,
      sanitizeName(payload.name),
      payload.anonId,
      payload.avatarId ?? null
    );
    if (!result.ok) {
      emitError(socket, {
        code: result.code,
        message: roomErrorMessage(result.code),
      });
      return;
    }
    result.room.broadcastRoomState();
  });

  socket.on(ClientEvents.ROOM_QUICK_MATCH, (payload: RoomQuickMatchPayload) => {
    const existing = roomManager.findQuickMatchRoom();
    if (existing) {
      const result = roomManager.joinRoom(
        existing.room.id,
        socket,
        sanitizeName(payload.name),
        payload.anonId,
        payload.avatarId ?? null
      );
      if (result.ok) {
        result.room.broadcastRoomState();
        return;
      }
    }
    const room = roomManager.createRoom(
      "public",
      socket,
      sanitizeName(payload.name),
      payload.anonId,
      payload.avatarId ?? null
    );
    room.broadcastRoomState();
  });

  socket.on(ClientEvents.ROOM_LEAVE, () => {
    roomManager.leaveRoomVoluntarily(socket);
  });

  socket.on(ClientEvents.ROOM_UPDATE_SETTINGS, (payload: RoomUpdateSettingsPayload) => {
    const room = roomManager.getRoomBySocket(socket);
    room?.updateSettings(socket.id, payload);
  });
}

function roomErrorMessage(code: RoomErrorPayload["code"]): string {
  switch (code) {
    case "ROOM_NOT_FOUND":
      return "That room code doesn't exist.";
    case "ROOM_FULL":
      return "That room is full (12 players max).";
    case "NAME_TAKEN":
      return "Someone in this room already has that name.";
    case "KICKED":
      return "You were removed from this room.";
    case "INVALID_STATE":
      return "That action isn't available right now.";
  }
}
