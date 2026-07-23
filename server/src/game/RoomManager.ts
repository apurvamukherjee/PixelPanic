import type { Server, Socket } from "socket.io";
import type { RoomVisibility, WordPack } from "@pixelpanic/shared";
import { RoomInstance } from "./RoomInstance.js";
import { generateUniqueRoomCode } from "../rooms/roomCodes.js";
import { getWordPack } from "../db/wordPacksRepo.js";
import { DEFAULT_WORD_PACK_ID } from "../db/seedWords.js";
import { logger } from "../utils/logger.js";

const EMPTY_ROOM_SWEEP_MS = 30_000;
const EMPTY_ROOM_TTL_MS = 60_000;

export class RoomManager {
  private rooms = new Map<string, RoomInstance>();
  private emptySince = new Map<string, number>();
  private defaultPack: WordPack;
  private sweepInterval: ReturnType<typeof setInterval>;

  constructor(private io: Server) {
    const pack = getWordPack(DEFAULT_WORD_PACK_ID);
    if (!pack) throw new Error("Default word pack not seeded — run migrate() first");
    this.defaultPack = pack;

    this.sweepInterval = setInterval(() => this.sweepEmptyRooms(), EMPTY_ROOM_SWEEP_MS);
  }

  getRoom(roomId: string): RoomInstance | undefined {
    return this.rooms.get(roomId);
  }

  getRoomBySocket(socket: Socket): RoomInstance | undefined {
    const roomId = socket.data.roomId as string | undefined;
    if (!roomId) return undefined;
    return this.rooms.get(roomId);
  }

  createRoom(
    visibility: RoomVisibility,
    hostSocket: Socket,
    hostName: string,
    hostAnonId: string
  ): RoomInstance {
    const code = generateUniqueRoomCode((c) => this.rooms.has(c));
    const room = new RoomInstance(
      this.io,
      code,
      visibility,
      hostSocket,
      hostName,
      hostAnonId,
      this.resolveWordPack(null)
    );
    this.rooms.set(code, room);
    hostSocket.data.roomId = code;
    hostSocket.data.anonId = hostAnonId;
    logger.info(`Room ${code} created (${visibility}) by ${hostName}`);
    return room;
  }

  joinRoom(
    roomId: string,
    socket: Socket,
    name: string,
    anonId: string
  ): { ok: true; room: RoomInstance } | { ok: false; code: "ROOM_NOT_FOUND" | "ROOM_FULL" | "NAME_TAKEN" } {
    const room = this.rooms.get(roomId.toUpperCase());
    if (!room) return { ok: false, code: "ROOM_NOT_FOUND" };

    const result = room.join(socket, name, anonId);
    if (!result.ok) return { ok: false, code: result.code };

    socket.data.roomId = room.room.id;
    socket.data.anonId = anonId;
    return { ok: true, room };
  }

  findQuickMatchRoom(): RoomInstance | undefined {
    for (const room of this.rooms.values()) {
      const notStarted = !room.isGameActive();
      if (
        room.room.visibility === "public" &&
        notStarted &&
        room.room.players.length < room.room.settings.maxPlayers
      ) {
        return room;
      }
    }
    return undefined;
  }

  leaveSocket(socket: Socket): void {
    const room = this.getRoomBySocket(socket);
    if (!room) return;
    room.handleDisconnect(socket.id);
    this.markPossiblyEmpty(room);
  }

  resolveWordPack(customWordListId: string | null): WordPack {
    if (!customWordListId) return this.defaultPack;
    return getWordPack(customWordListId) ?? this.defaultPack;
  }

  private markPossiblyEmpty(room: RoomInstance): void {
    if (room.isEmpty()) {
      this.emptySince.set(room.room.id, Date.now());
    }
  }

  private sweepEmptyRooms(): void {
    for (const [code, room] of this.rooms.entries()) {
      if (!room.isEmpty()) {
        this.emptySince.delete(code);
        continue;
      }
      const since = this.emptySince.get(code) ?? Date.now();
      this.emptySince.set(code, since);
      if (Date.now() - since >= EMPTY_ROOM_TTL_MS) {
        room.dispose();
        this.rooms.delete(code);
        this.emptySince.delete(code);
        logger.info(`Room ${code} garbage-collected (empty)`);
      }
    }
  }
}
