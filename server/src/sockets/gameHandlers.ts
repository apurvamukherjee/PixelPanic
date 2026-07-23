import type { Socket } from "socket.io";
import {
  ClientEvents,
  type WordChoosePayload,
  type WordPackCreatePayload,
  type WordPackCreateResult,
} from "@pixelpanic/shared";
import type { RoomManager } from "../game/RoomManager.js";
import { createCustomWordPack } from "../db/wordPacksRepo.js";

const MIN_WORDS = 10;
const MAX_WORDS = 300;

export function registerGameHandlers(socket: Socket, roomManager: RoomManager): void {
  socket.on(ClientEvents.GAME_START, () => {
    const room = roomManager.getRoomBySocket(socket);
    if (!room) return;
    const pack = roomManager.resolveWordPack(room.room.settings.customWordListId);
    room.setWordPack(pack);
    room.startGame(socket.id);
  });

  socket.on(ClientEvents.WORD_CHOOSE, (payload: WordChoosePayload) => {
    const room = roomManager.getRoomBySocket(socket);
    room?.chooseWord(socket.id, payload.word);
  });

  socket.on(
    ClientEvents.WORD_PACK_CREATE,
    (payload: WordPackCreatePayload, callback: (result: WordPackCreateResult) => void) => {
      const room = roomManager.getRoomBySocket(socket);
      if (!room || socket.id !== room.room.hostId) {
        callback({ ok: false, error: "Only the host can add a custom word list." });
        return;
      }
      const words = [...new Set(payload.words.map((w) => w.trim().toLowerCase()).filter(Boolean))];
      const invalid = words.some((w) => w.length < 2 || w.length > 30 || !/^[a-z ]+$/i.test(w));
      if (words.length < MIN_WORDS || words.length > MAX_WORDS || invalid) {
        callback({
          ok: false,
          error: `Provide ${MIN_WORDS}-${MAX_WORDS} words, letters/spaces only, 2-30 chars each.`,
        });
        return;
      }
      const pack = createCustomWordPack(
        payload.name.trim().slice(0, 40) || "Custom pack",
        words.map((text) => ({ text, category: null })),
        null
      );
      room.updateSettings(socket.id, { customWordListId: pack.id });
      callback({ ok: true, id: pack.id, name: pack.name });
    }
  );
}
