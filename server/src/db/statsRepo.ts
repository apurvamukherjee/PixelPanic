import { db } from "./connection.js";

export interface GameEndStatsInput {
  anonId: string;
  displayName: string;
  roundsDrawn: number;
  correctGuesses: number;
  scoreEarned: number;
  isWinner: boolean;
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
