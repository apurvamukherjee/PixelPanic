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
  // Phase 3 chaos modes: frozen per-turn snapshots of the relevant
  // chaosModes flags, set once in startTurn/chooseWord rather than read
  // live off room.settings everywhere scoring/eligibility logic runs.
  isBountyRound: boolean;
  isReverseMode: boolean;
  isMashupRound: boolean;
  mashupVoteOpen: boolean; // true during the post-turn vote window on a mashup round
}

export interface GameState {
  roomId: string;
  turn: TurnState | null;
  scoreboard: Record<string, number>; // playerId -> score, mirrors Player.score
  isGameActive: boolean;
  totalRounds: number;
  // Phase 3: anonId -> current correct-guess streak, only populated when
  // chaosModes.momentum is on. Never a second source of truth for score.
  momentum: Record<string, number>;
}
