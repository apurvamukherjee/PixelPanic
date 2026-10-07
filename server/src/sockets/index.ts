import type { Server, Socket } from "socket.io";
import { RoomManager } from "../game/RoomManager.js";
import { registerRoomHandlers } from "./roomHandlers.js";
import { registerGameHandlers } from "./gameHandlers.js";
import { registerDrawHandlers } from "./drawHandlers.js";
import { registerChatHandlers } from "./chatHandlers.js";
import { registerModHandlers } from "./modHandlers.js";
import { registerTeamHandlers } from "./teamHandlers.js";
import { registerTournamentHandlers } from "./tournamentHandlers.js";
import { registerChaosHandlers } from "./chaosHandlers.js";
import { chatRateLimiter, votekickRateLimiter } from "../utils/rateLimiter.js";
import { logger } from "../utils/logger.js";

export function attachSocketHandlers(io: Server): RoomManager {
  const roomManager = new RoomManager(io);

  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.id}`);
    guardHandlers(socket);

    registerRoomHandlers(socket, roomManager);
    registerGameHandlers(socket, roomManager);
    registerDrawHandlers(socket, roomManager);
    registerChatHandlers(socket, roomManager);
    registerModHandlers(socket, roomManager);
    registerTeamHandlers(socket, roomManager);
    registerTournamentHandlers(socket, roomManager);
    registerChaosHandlers(socket, roomManager);

    socket.on("disconnect", () => {
      roomManager.leaveSocket(socket);
      chatRateLimiter.remove(socket.id);
      votekickRateLimiter.remove(socket.id);
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return roomManager;
}

// A throw inside a socket.io listener escapes to the process and kills it —
// one malformed packet from any client would take down every room. Wrapping
// at registration covers every handler file without repeating try/catch.
function guardHandlers(socket: Socket): void {
  const on = socket.on.bind(socket);
  socket.on = ((event: string, handler: (...args: unknown[]) => void) =>
    on(event, (...args: unknown[]) => {
      try {
        handler(...args);
      } catch (err) {
        logger.error(`Socket handler for "${event}" threw`, err);
      }
    })) as typeof socket.on;
}
