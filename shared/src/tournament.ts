export type TournamentMatchStatus = "pending" | "active" | "complete";

export interface TournamentMatch {
  id: string;
  round: number; // circle-method round index, 0-based
  playerAnonIds: [string, string];
  status: TournamentMatchStatus;
  scores: Record<string, number> | null; // anonId -> points earned in this match, set on complete
  winnerAnonId: string | null; // null = tie
}

export interface TournamentStanding {
  anonId: string;
  name: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointDiff: number;
}

export interface TournamentState {
  matches: TournamentMatch[];
  standings: TournamentStanding[];
  currentMatchId: string | null;
  isComplete: boolean;
}
