import type { RoomVisibility, Room, RoomMode, Team, ChaosModes } from "./room.js";
import type { TurnState } from "./game.js";
import type { ChatChannel } from "./chat.js";
import type { TournamentState } from "./tournament.js";
import type { RivalSummary } from "./rival.js";

export interface RoomCreatePayload {
  visibility: RoomVisibility;
  hostName: string;
  anonId: string;
  avatarId?: string | null;
}

export interface RoomJoinPayload {
  roomId: string;
  name: string;
  anonId: string;
  avatarId?: string | null;
}

export interface RoomQuickMatchPayload {
  name: string;
  anonId: string;
  avatarId?: string | null;
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
  chaosModes?: Partial<ChaosModes>;
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
  momentum?: Record<string, number>; // anonId -> streak, only when chaosModes.momentum is on
}

export interface RoundEndPayload {
  word: string;
  scoreboardDelta: Record<string, number>;
  teamScoreboard?: Record<string, number>;
  isMashupRound?: boolean;
  mashupVoteOpen?: boolean;
  mashupCandidates?: { playerId: string; playerName: string }[];
}

export interface GameEndPayload {
  finalScoreboard: { playerId: string; name: string; score: number }[];
  teamScoreboard?: Record<string, number>;
  // Phase 3 — anonId -> title ids unlocked this game, folded onto the
  // existing GAME_END event rather than a new one.
  unlockedTitles?: Record<string, string[]>;
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

// ---- Phase 3: chaos modes ----

export interface NearMissPayload {
  guess: string;
  hint: "one letter off" | "close";
}

export type SabotagePowerup = "blur" | "swapGuesses" | "freezePalette";

export interface SabotagePowerupGrantedPayload {
  powerup: SabotagePowerup;
}

export interface SabotageUsePowerupPayload {
  powerup: SabotagePowerup;
  targetPlayerId: string;
}

export interface SabotageEffectAppliedPayload {
  effect: SabotagePowerup;
  durationMs: number;
  partnerId?: string; // swapGuesses only — who the target's guesses are routed to/from
}

export interface MashupVotePayload {
  targetPlayerId: string;
}

export interface MashupVoteResultPayload {
  winnerId: string | null;
  bonusAwarded: number;
}

// ---- Phase 3: rival system (REST, not sockets — see /api/rivals) ----

export interface RivalStatePayload {
  rival: RivalSummary | null;
}

export interface RivalOnlineChangedPayload {
  rivalOnline: boolean;
}
