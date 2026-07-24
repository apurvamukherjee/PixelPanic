export type RoomVisibility = "public" | "private";

export type HintFrequency = "off" | "slow" | "normal" | "fast";

// Phase 2: "team" gates team-mode behavior (rotation, chat channel, team
// scoreboard) everywhere. Tournament mode is not a RoomMode — it's an
// orchestration layered on top of a normal (solo) room, see tournament.ts.
export type RoomMode = "solo" | "team";

export interface Team {
  id: string;
  name: string;
  color: string;
}

export interface Player {
  id: string; // socket.id, ephemeral per connection
  anonId: string; // client's persistent localStorage id, survives reconnects
  name: string;
  color: string; // avatar color, assigned on join
  score: number;
  isHost: boolean;
  connected: boolean; // false during the reconnect grace period
  isMuted: boolean;
  votekickTargetOf: string[]; // player ids who voted to kick this player (cleared each turn)
  teamId: string | null; // null in solo mode, or unassigned in team mode
  avatarId: string | null; // Phase 3: chosen preset avatar id, null = fall back to initials
}

// Phase 3: each mode is an independent boolean checked by the server when
// picking round type/scoring — no schema changes needed to add a future
// mode. Lives on RoomSettings (ephemeral, room-instance-only) exactly like
// roundCount/drawTimeSec, not a separate DB table.
// `ghostDrawing` is intentionally unimplemented for now — it needs a
// stroke-aggregation pipeline fed by real play history that doesn't exist
// yet (see PHASE3-PLAN.md). The flag exists so the settings shape is final;
// the host UI shows it disabled/"coming soon" and the server no-ops it.
export interface ChaosModes {
  sabotage: boolean;
  curseWords: boolean;
  mashup: boolean;
  momentum: boolean;
  ghostDrawing: boolean;
  reverseMode: boolean;
  bounty: boolean;
}

export const DEFAULT_CHAOS_MODES: ChaosModes = {
  sabotage: false,
  curseWords: false,
  mashup: false,
  momentum: false,
  ghostDrawing: false,
  reverseMode: false,
  bounty: false,
};

export interface RoomSettings {
  roundCount: number; // default 3, clamped 1-10 server-side
  drawTimeSec: number; // default 80, clamped 30-180 server-side
  hintFrequency: HintFrequency;
  customWordListId: string | null; // null = use the built-in default pack
  maxPlayers: number; // fixed 12 in Phase 1
  mode: RoomMode;
  chaosModes: ChaosModes;
}

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  roundCount: 3,
  drawTimeSec: 80,
  hintFrequency: "normal",
  customWordListId: null,
  maxPlayers: 12,
  mode: "solo",
  chaosModes: { ...DEFAULT_CHAOS_MODES },
};

export interface Room {
  id: string; // 6-char base32 shareable code
  visibility: RoomVisibility;
  settings: RoomSettings;
  players: Player[];
  teams: Team[]; // empty in solo mode
  hostId: string;
  createdAt: number;
}
