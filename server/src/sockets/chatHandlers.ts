import type { Socket } from "socket.io";
import { ClientEvents, type ChatSendPayload } from "@pixelpanic/shared";
import type { RoomManager } from "../game/RoomManager.js";
import { chatRateLimiter } from "../utils/rateLimiter.js";

export function registerChatHandlers(socket: Socket, roomManager: RoomManager): void {
  socket.on(ClientEvents.CHAT_MESSAGE, (payload: ChatSendPayload) => {
    if (!chatRateLimiter.check(socket.id)) return;
    const room = roomManager.getRoomBySocket(socket);
    room?.handleChat(socket.id, payload.text, payload.channel);
  });
}
