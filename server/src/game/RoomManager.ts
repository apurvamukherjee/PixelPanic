import type { Server, Socket } from "socket.io";
import { ServerEvents, type RoomVisibility, type WordPack } from "@pixelpanic/shared";
import { RoomInstance } from "./RoomInstance.js";
import { generateUniqueRoomCode } from "../rooms/roomCodes.js";
import { getWordPack } from "../db/wordPacksRepo.js";
import { DEFAULT_WORD_PACK_ID } from "../db/seedWords.js";
import { getExistingRivalAnonId } from "../db/rivalsRepo.js";
import { presenceTracker } from "./PresenceTracker.js";
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
    hostAnonId: string,
    hostAvatarId: string | null = null
  ): RoomInstance {
    this.leaveCurrentRoomIfAny(hostSocket);
    const code = generateUniqueRoomCode((c) => this.rooms.has(c));
    const room = new RoomInstance(
      this.io,
      code,
      visibility,
      hostSocket,
      hostName,
      hostAnonId,
      this.resolveWordPack(null),
      hostAvatarId
    );
    room.setOnClosed(() => {
      this.rooms.delete(code);
      this.emptySince.delete(code);
    });
    this.rooms.set(code, room);
    hostSocket.data.roomId = code;
    hostSocket.data.anonId = hostAnonId;
    this.markPresence(hostAnonId, hostSocket.id);
    logger.info(`Room ${code} created (${visibility}) by ${hostName}`);
    return room;
  }

  joinRoom(
    roomId: string,
    socket: Socket,
    name: string,
    anonId: string,
    avatarId: string | null = null
  ): { ok: true; room: RoomInstance } | { ok: false; code: "ROOM_NOT_FOUND" | "ROOM_FULL" | "NAME_TAKEN" } {
    const room = this.rooms.get(roomId.toUpperCase());
    if (!room) return { ok: false, code: "ROOM_NOT_FOUND" };

    // Reconnecting into the SAME room (the common case — anonId already a
    // member) must not trip the "leave your old room first" path below, or
    // every grace-period reconnect would evict itself before rejoining.
    const alreadyThere = room.room.players.some((p) => p.anonId === anonId);
    if (!alreadyThere) this.leaveCurrentRoomIfAny(socket);

    const result = room.join(socket, name, anonId, avatarId);
    if (!result.ok) return { ok: false, code: result.code };

    socket.data.roomId = room.room.id;
    socket.data.anonId = anonId;
    this.markPresence(anonId, socket.id);
    return { ok: true, room };
  }

  // A socket that creates or joins a new room while still marked as a
  // member of a previous one (no explicit ROOM_LEAVE — e.g. the user just
  // clicked "Create Private Room" again from Home) would otherwise stay
  // subscribed to the old room's Socket.IO broadcast channel *and* leave a
  // permanently-connected ghost player behind there, blocking that old room
  // from ever being cleaned up. Route it through the same voluntary-leave
  // path a real ROOM_LEAVE takes.
  private leaveCurrentRoomIfAny(socket: Socket): void {
    const previousRoomId = socket.data.roomId as string | undefined;
    if (!previousRoomId) return;
    const previousRoom = this.rooms.get(previousRoomId);
    if (!previousRoom) return;
    previousRoom.leave(socket.id);
    this.markPossiblyEmpty(previousRoom);
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

  // Real transport disconnect (tab closed, network dropped) — starts the
  // reconnect grace period rather than removing the player outright.
  leaveSocket(socket: Socket): void {
    const room = this.getRoomBySocket(socket);
    if (room) {
      room.handleDisconnect(socket.id);
      this.markPossiblyEmpty(room);
    }
    const anonId = socket.data.anonId as string | undefined;
    if (anonId) this.markOffline(anonId);
  }

  // Explicit ROOM_LEAVE — the player is choosing to leave right now, so
  // there's no grace period: removed immediately, socket detached from the
  // room's Socket.IO channel so it's free to create/join a different room.
  leaveRoomVoluntarily(socket: Socket): void {
    const room = this.getRoomBySocket(socket);
    if (room) {
      room.leave(socket.id);
      this.markPossiblyEmpty(room);
    }
    socket.data.roomId = undefined;
    const anonId = socket.data.anonId as string | undefined;
    if (anonId) this.markOffline(anonId);
  }

  resolveWordPack(customWordListId: string | null): WordPack {
    if (!customWordListId) return this.defaultPack;
    return getWordPack(customWordListId) ?? this.defaultPack;
  }

  // Phase 3 rival system: cross-room presence, used only to push
  // RIVAL_ONLINE_CHANGED to a pairing that already exists — this never
  // creates a pairing on its own (see getExistingRivalAnonId).
  private markPresence(anonId: string, socketId: string): void {
    presenceTracker.setOnline(anonId, socketId);
    const rivalAnonId = getExistingRivalAnonId(anonId);
    if (!rivalAnonId) return;
    if (presenceTracker.isOnline(rivalAnonId)) {
      const rivalSocketId = presenceTracker.socketIdFor(rivalAnonId);
      if (rivalSocketId) this.io.to(rivalSocketId).emit(ServerEvents.RIVAL_ONLINE_CHANGED, { rivalOnline: true });
      this.io.to(socketId).emit(ServerEvents.RIVAL_ONLINE_CHANGED, { rivalOnline: true });
    }
  }

  private markOffline(anonId: string): void {
    presenceTracker.setOffline(anonId);
    const rivalAnonId = getExistingRivalAnonId(anonId);
    if (!rivalAnonId) return;
    const rivalSocketId = presenceTracker.socketIdFor(rivalAnonId);
    if (rivalSocketId) this.io.to(rivalSocketId).emit(ServerEvents.RIVAL_ONLINE_CHANGED, { rivalOnline: false });
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
