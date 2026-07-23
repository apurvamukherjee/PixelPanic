import type { Socket } from "socket.io";
import {
  ClientEvents,
  type StrokeStartPayload,
  type StrokePointPayload,
  type StrokeEndPayload,
  type DrawFillPayload,
} from "@pixelpanic/shared";
import type { RoomManager } from "../game/RoomManager.js";

export function registerDrawHandlers(socket: Socket, roomManager: RoomManager): void {
  socket.on(ClientEvents.DRAW_STROKE_START, (payload: StrokeStartPayload) => {
    roomManager.getRoomBySocket(socket)?.relayStrokeStart(socket.id, payload);
  });

  socket.on(ClientEvents.DRAW_STROKE_POINT, (payload: StrokePointPayload) => {
    roomManager.getRoomBySocket(socket)?.relayStrokePoint(socket.id, payload);
  });

  socket.on(ClientEvents.DRAW_STROKE_END, (payload: StrokeEndPayload) => {
    roomManager.getRoomBySocket(socket)?.relayStrokeEnd(socket.id, payload);
  });

  socket.on(ClientEvents.DRAW_FILL, (payload: DrawFillPayload) => {
    roomManager.getRoomBySocket(socket)?.relayFill(socket.id, payload);
  });

  socket.on(ClientEvents.DRAW_CLEAR, () => {
    roomManager.getRoomBySocket(socket)?.relayClear(socket.id);
  });

  socket.on(ClientEvents.DRAW_UNDO, () => {
    roomManager.getRoomBySocket(socket)?.relayUndo(socket.id);
  });
}
