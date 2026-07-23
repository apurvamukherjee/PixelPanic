import type { RoomVisibility, Room, RoomMode, Team } from "./room.js";
import type { TurnState } from "./game.js";
import type { ChatChannel } from "./chat.js";
import type { TournamentState } from "./tournament.js";

export interface RoomCreatePayload {
  visibility: RoomVisibility;
  hostName: string;
  anonId: string;
}

export interface RoomJoinPayload {
  roomId: string;
  name: string;
  anonId: string;
}

export interface RoomQuickMatchPayload {
  name: string;
  anonId: string;
}

export type RoomErrorCode =
  | "ROOM_NOT_FOUND"
  | "ROOM_FULL"
  | "NAME_TAKEN"
  | "KICKED"
  | "INVALID_STATE";

export interface RoomErrorPayload {
  code: RoomErrorCode;
  message: string;
}

export interface RoomStatePayload {
  room: Room;
}

export interface RoomUpdateSettingsPayload {
  roundCount?: number;
  drawTimeSec?: number;
  hintFrequency?: "off" | "slow" | "normal" | "fast";
  customWordListId?: string | null;
  mode?: RoomMode;
}

export interface RoomSetTeamsPayload {
  teams: (Omit<Team, "id"> & { id?: string })[];
}

export interface RoomSetPlayerTeamPayload {
  playerId: string;
  teamId: string | null;
}

export interface WordChoicesPayload {
  words: [string, string, string];
  deadline: number; // epoch ms
}

export interface WordChoosePayload {
  word: string;
}

export interface TurnStartPayload {
  turn: TurnState; // `word` is stripped server-side for everyone but the drawer
  drawTimeSec: number;
}

export interface TimerTickPayload {
  turnEndsAt: number;
  serverNow: number;
}

export interface HintRevealPayload {
  maskedWord: string;
  revealedIndices: number[];
}

export interface GuessCorrectPayload {
  pointsAwarded: number;
  word: string;
}

export interface ScoreUpdatePayload {
  scoreboard: Record<string, number>;
  teamScoreboard?: Record<string, number>; // teamId -> avg member score, team mode only
}

export interface RoundEndPayload {
  word: string;
  scoreboardDelta: Record<string, number>;
  teamScoreboard?: Record<string, number>;
}

export interface GameEndPayload {
  finalScoreboard: { playerId: string; name: string; score: number }[];
  teamScoreboard?: Record<string, number>;
}

export interface VotekickPayload {
  targetPlayerId: string;
}

export interface VotekickUpdatePayload {
  targetPlayerId: string;
  votes: number;
  votesNeeded: number;
  kicked: boolean;
}

export interface MutePayload {
  targetPlayerId: string;
}

export interface MutedPayload {
  targetPlayerId: string;
  muted: boolean;
}

export interface GamePhaseChangePayload {
  phase: TurnState["phase"];
}

export interface ChatSendPayload {
  text: string;
  channel?: ChatChannel; // defaults to "room" server-side
}

export interface WordPackCreatePayload {
  name: string;
  words: string[];
}

export type WordPackCreateResult =
  | { ok: true; id: string; name: string }
  | { ok: false; error: string };

// TOURNAMENT_START takes no payload — it starts a round-robin over all
// currently connected room players, like GAME_START.

export interface TournamentStatePayload {
  tournament: TournamentState;
}

export interface TournamentMatchStartPayload {
  matchId: string;
  playerAnonIds: [string, string];
}

export interface TournamentCompletePayload {
  tournament: TournamentState;
}
