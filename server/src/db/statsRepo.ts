import { db } from "./connection.js";

export interface GameEndStatsInput {
  anonId: string;
  displayName: string;
  roundsDrawn: number;
  correctGuesses: number;
  scoreEarned: number;
  isWinner: boolean;
}

export interface AnonStatsRow {
  anonId: string;
  gamesPlayed: number;
  roundsDrawn: number;
  correctGuesses: number;
  totalScore: number;
  wins: number;
}

export function getAnonStats(anonId: string): AnonStatsRow | null {
  const row = db
    .prepare(
      `SELECT anon_id, games_played, rounds_drawn, correct_guesses, total_score, wins
       FROM anon_stats WHERE anon_id = ?`
    )
    .get(anonId) as
    | {
        anon_id: string;
        games_played: number;
        rounds_drawn: number;
        correct_guesses: number;
        total_score: number;
        wins: number;
      }
    | undefined;
  if (!row) return null;
  return {
    anonId: row.anon_id,
    gamesPlayed: row.games_played,
    roundsDrawn: row.rounds_drawn,
    correctGuesses: row.correct_guesses,
    totalScore: row.total_score,
    wins: row.wins,
  };
}

// Every anon_stats row not backing a live player (i.e. everyone who's ever
// played a game) — used by the rival auto-pairing matcher.
export function listAllAnonStats(): AnonStatsRow[] {
  const rows = db
    .prepare(
      `SELECT anon_id, games_played, rounds_drawn, correct_guesses, total_score, wins
       FROM anon_stats WHERE games_played > 0`
    )
    .all() as {
    anon_id: string;
    games_played: number;
    rounds_drawn: number;
    correct_guesses: number;
    total_score: number;
    wins: number;
  }[];
  return rows.map((row) => ({
    anonId: row.anon_id,
    gamesPlayed: row.games_played,
    roundsDrawn: row.rounds_drawn,
    correctGuesses: row.correct_guesses,
    totalScore: row.total_score,
    wins: row.wins,
  }));
}

export function getDisplayName(anonId: string): string | null {
  const row = db.prepare(`SELECT display_name FROM anon_players WHERE anon_id = ?`).get(anonId) as
    | { display_name: string | null }
    | undefined;
  return row?.display_name ?? null;
}

function ensureAnonPlayer(anonId: string, displayName: string): void {
  const now = Date.now();
  db.prepare(
    `INSERT INTO anon_players (anon_id, display_name, first_seen, last_seen)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(anon_id) DO UPDATE SET display_name = excluded.display_name, last_seen = excluded.last_seen`
  ).run(anonId, displayName, now, now);

  db.prepare(
    `INSERT INTO anon_stats (anon_id) VALUES (?)
     ON CONFLICT(anon_id) DO NOTHING`
  ).run(anonId);
}

export function recordGameEndStats(entries: GameEndStatsInput[]): void {
  const run = db.transaction((rows: GameEndStatsInput[]) => {
    for (const row of rows) {
      ensureAnonPlayer(row.anonId, row.displayName);
      db.prepare(
        `UPDATE anon_stats SET
           games_played = games_played + 1,
           rounds_drawn = rounds_drawn + ?,
           correct_guesses = correct_guesses + ?,
           total_score = total_score + ?,
           wins = wins + ?
         WHERE anon_id = ?`
      ).run(
        row.roundsDrawn,
        row.correctGuesses,
        row.scoreEarned,
        row.isWinner ? 1 : 0,
        row.anonId
      );
    }
  });
  run(entries);
}
