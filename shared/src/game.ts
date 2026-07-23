export type GamePhase =
  | "lobby"
  | "wordChoice"
  | "drawing"
  | "roundEnd"
  | "gameEnd";

export interface TurnState {
  drawerId: string;
  roundIndex: number; // 0-based, increments each full player rotation
  turnIndexInRound: number; // which player's turn within the current round
  word: string | null; // only ever populated server-side / sent to the drawer
  maskedWord: string; // "_ _ _ _" style, updated as hints reveal
  wordLength: number;
  phase: GamePhase;
  turnEndsAt: number | null; // epoch ms, authoritative deadline set by the server
  correctGuesserIds: string[]; // who has already guessed correctly this turn
  hintsRevealedCount: number;
}

export interface GameState {
  roomId: string;
  turn: TurnState | null;
  scoreboard: Record<string, number>; // playerId -> score, mirrors Player.score
  isGameActive: boolean;
  totalRounds: number;
}
