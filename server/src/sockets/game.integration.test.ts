import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Server } from "socket.io";
import { io as connect, type Socket as ClientSocket } from "socket.io-client";
import {
  ClientEvents,
  ServerEvents,
  type RoomStatePayload,
  type WordChoicesPayload,
  type TurnStartPayload,
  type RoundEndPayload,
  type GameEndPayload,
  type GamePhaseChangePayload,
  type RoomErrorPayload,
  type RoomClosedPayload,
} from "@pixelpanic/shared";

// End-to-end over real sockets: the server modules are imported only after
// DB_PATH points at an in-memory database (config.ts reads it at load).
let io: Server;
let http: HttpServer;
let url: string;
const clients: ClientSocket[] = [];

beforeAll(async () => {
  process.env.DB_PATH = ":memory:";
  const { migrate } = await import("../db/migrate.js");
  const { attachSocketHandlers } = await import("./index.js");
  migrate();
  http = createServer();
  io = new Server(http);
  attachSocketHandlers(io);
  await new Promise<void>((resolve) => http.listen(0, resolve));
  url = `http://localhost:${(http.address() as AddressInfo).port}`;
});

afterAll(() => {
  for (const c of clients) c.disconnect();
  io.close();
  http.close();
});

async function client(): Promise<ClientSocket> {
  const socket = connect(url, { transports: ["websocket"], forceNew: true });
  clients.push(socket);
  await once(socket, "connect");
  return socket;
}

function once<T>(socket: ClientSocket, event: string, match: (p: T) => boolean = () => true, ms = 3000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`timed out waiting for ${event}`));
    }, ms);
    const handler = (payload: T) => {
      if (!match(payload)) return;
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(payload);
    };
    socket.on(event, handler);
  });
}

function never(socket: ClientSocket, event: string, ms = 300): Promise<void> {
  return new Promise((resolve, reject) => {
    const handler = () => reject(new Error(`unexpected ${event}`));
    socket.on(event, handler);
    setTimeout(() => {
      socket.off(event, handler);
      resolve();
    }, ms);
  });
}

async function createRoom(host: ClientSocket, anonId: string): Promise<string> {
  const state = once<RoomStatePayload>(host, ServerEvents.ROOM_STATE);
  host.emit(ClientEvents.ROOM_CREATE, { visibility: "private", hostName: anonId, anonId });
  return (await state).room.id;
}

async function join(socket: ClientSocket, roomId: string, anonId: string): Promise<RoomStatePayload> {
  const state = once<RoomStatePayload>(socket, ServerEvents.ROOM_STATE);
  socket.emit(ClientEvents.ROOM_JOIN, { roomId, name: anonId, anonId });
  return state;
}

describe("socket game flow", () => {
  it("plays a full 1-round game between two players", async () => {
    const a = await client();
    const b = await client();
    const roomId = await createRoom(a, "alice");
    await join(b, roomId, "bob");
    a.emit(ClientEvents.ROOM_UPDATE_SETTINGS, { roundCount: 1 });
    await once<RoomStatePayload>(a, ServerEvents.ROOM_STATE, (p) => p.room.settings.roundCount === 1);

    const firstChoices = once<WordChoicesPayload>(a, ServerEvents.WORD_CHOICES);
    a.emit(ClientEvents.GAME_START);
    const { words, serverNow } = await firstChoices;
    expect(serverNow).toBeGreaterThan(0);

    // A word that wasn't offered is ignored.
    const noTurn = never(a, ServerEvents.TURN_START);
    a.emit(ClientEvents.WORD_CHOOSE, { word: "definitely-not-offered" });
    await noTurn;

    const drawerTurn = once<TurnStartPayload>(a, ServerEvents.TURN_START);
    const guesserTurn = once<TurnStartPayload>(b, ServerEvents.TURN_START);
    a.emit(ClientEvents.WORD_CHOOSE, { word: words[0] });
    expect((await drawerTurn).turn.word).toBe(words[0]);
    expect((await guesserTurn).turn.word).toBeNull();

    // The drawer can't spoil the word in chat.
    const leaked = never(b, ServerEvents.CHAT_MESSAGE);
    a.emit(ClientEvents.CHAT_MESSAGE, { text: `it's ${words[0]}!` });
    await leaked;

    const wrong = once(b, ServerEvents.WRONG_GUESS);
    b.emit(ClientEvents.CHAT_MESSAGE, { text: "zzzzzzzzzzzz" });
    await wrong;

    const roundEnd = once<RoundEndPayload>(b, ServerEvents.ROUND_END);
    b.emit(ClientEvents.CHAT_MESSAGE, { text: words[0].toUpperCase() });
    const ended = await roundEnd;
    expect(ended.word).toBe(words[0]);
    expect(Object.values(ended.scoreboardDelta).every((score) => score > 0)).toBe(true);

    // Second turn: bob draws after the round-end pause.
    const secondChoices = await once<WordChoicesPayload>(b, ServerEvents.WORD_CHOICES, () => true, 8000);
    b.emit(ClientEvents.WORD_CHOOSE, { word: secondChoices.words[1] });
    await once(a, ServerEvents.TURN_START);
    const gameEnd = once<GameEndPayload>(a, ServerEvents.GAME_END, () => true, 8000);
    a.emit(ClientEvents.CHAT_MESSAGE, { text: secondChoices.words[1] });
    const final = await gameEnd;
    expect(final.finalScoreboard).toHaveLength(2);

    // Someone joining after the game ended lands in the lobby, not a blank leaderboard.
    const late = await client();
    const phase = once<GamePhaseChangePayload>(late, ServerEvents.GAME_PHASE_CHANGE);
    await join(late, roomId, "late");
    expect((await phase).phase).toBe("lobby");
  }, 20_000);

  it("re-sends word choices to a drawer who reconnects mid-choice", async () => {
    const a = await client();
    const b = await client();
    const roomId = await createRoom(a, "carol");
    await join(b, roomId, "dave");
    const choices = once<WordChoicesPayload>(a, ServerEvents.WORD_CHOICES);
    a.emit(ClientEvents.GAME_START);
    const original = await choices;

    a.disconnect();
    const a2 = await client();
    const resent = once<WordChoicesPayload>(a2, ServerEvents.WORD_CHOICES);
    await join(a2, roomId, "carol");
    expect((await resent).words).toEqual(original.words);
  });

  it("ignores invalid settings", async () => {
    const a = await client();
    const roomId = await createRoom(a, "erin");
    const b = await client();
    await join(b, roomId, "frank");
    a.emit(ClientEvents.ROOM_UPDATE_SETTINGS, { roundCount: null, drawTimeSec: "fast", hintFrequency: "max" });
    a.emit(ClientEvents.ROOM_UPDATE_SETTINGS, { drawTimeSec: 60 });
    const { room } = await once<RoomStatePayload>(a, ServerEvents.ROOM_STATE, (p) => p.room.settings.drawTimeSec === 60);
    expect(room.settings.roundCount).toBe(3);
    expect(room.settings.hintFrequency).toBe("normal");
  });

  it("votekick removes the target and blocks them from rejoining", async () => {
    const a = await client();
    const b = await client();
    const c = await client();
    const roomId = await createRoom(a, "gina");
    await join(b, roomId, "hank");
    const { room } = await join(c, roomId, "ivan");
    const target = room.players.find((p) => p.anonId === "hank")!;

    const closed = once<RoomClosedPayload>(b, ServerEvents.ROOM_CLOSED);
    a.emit(ClientEvents.MOD_VOTEKICK, { targetPlayerId: target.id });
    expect((await closed).reason).toMatch(/votekicked/);

    const error = once<RoomErrorPayload>(b, ServerEvents.ROOM_ERROR);
    b.emit(ClientEvents.ROOM_JOIN, { roomId, name: "hank", anonId: "hank" });
    expect((await error).code).toBe("KICKED");
  });

  it("survives malformed payloads", async () => {
    const a = await client();
    await createRoom(a, "jade");
    a.emit(ClientEvents.CHAT_MESSAGE, null);
    a.emit(ClientEvents.DRAW_STROKE_POINT, { strokeId: "x", points: "nope" });
    a.emit(ClientEvents.ROOM_UPDATE_SETTINGS, null);
    a.emit(ClientEvents.ROOM_CREATE, { hostName: 5 });
    const b = await client();
    expect(await createRoom(b, "kyle")).toHaveLength(6);
  });
});
