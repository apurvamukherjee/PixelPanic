export type ChatMessageKind =
  | "chat"
  | "system"
  | "correctGuess"
  | "nearMiss"
  // "Apurva's Bot" flavor-text reaction to a wrong/near-miss guess.
  | "bot"
  // Divider marking the start of a new turn, so a scrolled-up chat feed
  // makes it obvious where the previous drawer's guesses ended.
  | "roundSeparator";

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
