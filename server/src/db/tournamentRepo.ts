import { randomUUID } from "node:crypto";
import type { TournamentMatch } from "@pixelpanic/shared";
import { db } from "./connection.js";

// One transaction, written once when a tournament completes (see
// TournamentInstance) — Phase 2 has no read/query UI for tournament history
// yet, this is purely the persistence half of "tournament history" from the
// original spec's stack description.
export function recordTournamentResult(roomCode: string, matches: TournamentMatch[]): void {
  const tournamentId = randomUUID();
  const now = Date.now();

  const insertTournament = db.prepare(
    "INSERT INTO tournaments (id, room_code, created_at, completed_at) VALUES (?, ?, ?, ?)"
  );
  const insertMatch = db.prepare(
    `INSERT INTO tournament_matches
       (id, tournament_id, round, player_a_anon_id, player_b_anon_id, score_a, score_b, winner_anon_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const run = db.transaction(() => {
    insertTournament.run(tournamentId, roomCode, now, now);
    for (const match of matches) {
      if (match.status !== "complete" || !match.scores) continue;
      const [anonA, anonB] = match.playerAnonIds;
      insertMatch.run(
        match.id,
        tournamentId,
        match.round,
        anonA,
        anonB,
        match.scores[anonA] ?? 0,
        match.scores[anonB] ?? 0,
        match.winnerAnonId
      );
    }
  });
  run();
}
