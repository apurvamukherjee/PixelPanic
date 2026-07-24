export type ChatMessageKind = "chat" | "system" | "correctGuess" | "nearMiss";

// "team" channel only exists in team-mode rooms; omitted/"room" preserves
// Phase 1 behavior (single room-wide channel) everywhere else.
export type ChatChannel = "room" | "team";

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  ts: number;
  kind: ChatMessageKind;
  channel: ChatChannel;
  teamId: string | null; // set when channel === "team"
}
