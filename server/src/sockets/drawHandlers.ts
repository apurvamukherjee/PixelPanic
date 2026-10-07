import type { Socket } from "socket.io";
import { ClientEvents } from "@pixelpanic/shared";
import type { RoomManager } from "../game/RoomManager.js";
import { isDrawFill, isId, isStrokePoints, isStrokeStart } from "./validate.js";

export function registerDrawHandlers(socket: Socket, roomManager: RoomManager): void {
  socket.on(ClientEvents.DRAW_STROKE_START, (payload: unknown) => {
    if (!isStrokeStart(payload)) return;
    roomManager.getRoomBySocket(socket)?.relayStrokeStart(socket.id, payload);
  });

  socket.on(ClientEvents.DRAW_STROKE_POINT, (payload: unknown) => {
    if (!isStrokePoints(payload)) return;
    roomManager.getRoomBySocket(socket)?.relayStrokePoint(socket.id, payload);
  });

  socket.on(ClientEvents.DRAW_STROKE_END, (payload: { strokeId?: unknown } | null) => {
    if (!isId(payload?.strokeId)) return;
    roomManager.getRoomBySocket(socket)?.relayStrokeEnd(socket.id, { strokeId: payload.strokeId });
  });

  socket.on(ClientEvents.DRAW_FILL, (payload: unknown) => {
    if (!isDrawFill(payload)) return;
    roomManager.getRoomBySocket(socket)?.relayFill(socket.id, payload);
  });

  socket.on(ClientEvents.DRAW_CLEAR, () => {
    roomManager.getRoomBySocket(socket)?.relayClear(socket.id);
  });

  socket.on(ClientEvents.DRAW_UNDO, () => {
    roomManager.getRoomBySocket(socket)?.relayUndo(socket.id);
  });
}
