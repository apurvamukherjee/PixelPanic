import { db } from "./connection.js";
import { getAnonStats, getDisplayName, listAllAnonStats } from "./statsRepo.js";

function findExistingPairing(anonId: string): string | null {
  const row = db
    .prepare(
      `SELECT anon_id_a, anon_id_b FROM rivalries WHERE anon_id_a = ? OR anon_id_b = ? LIMIT 1`
    )
    .get(anonId, anonId) as { anon_id_a: string; anon_id_b: string } | undefined;
  if (!row) return null;
  return row.anon_id_a === anonId ? row.anon_id_b : row.anon_id_a;
}

function avgScore(stats: { totalScore: number; gamesPlayed: number }): number {
  return stats.gamesPlayed > 0 ? stats.totalScore / stats.gamesPlayed : 0;
}

// V1 auto-pairing per PHASE3-PLAN.md: closest lifetime avg score, excluding
// self and anyone already paired. No skill-decay/re-pairing over time — a
// pairing is permanent once created, same simplicity level as the rest of
// this codebase's "pick the simplest option" Phase 2/3 calls.
function createPairing(anonId: string): string | null {
  const mine = getAnonStats(anonId);
  if (!mine) return null;
  const myAvg = avgScore(mine);

  const alreadyPaired = new Set<string>();
  const rows = db
    .prepare(`SELECT anon_id_a, anon_id_b FROM rivalries`)
    .all() as { anon_id_a: string; anon_id_b: string }[];
  for (const r of rows) {
    alreadyPaired.add(r.anon_id_a);
    alreadyPaired.add(r.anon_id_b);
  }

  const candidates = listAllAnonStats().filter(
    (s) => s.anonId !== anonId && !alreadyPaired.has(s.anonId)
  );
  if (candidates.length === 0) return null;

  let best = candidates[0]!;
  let bestDiff = Math.abs(avgScore(best) - myAvg);
  for (const c of candidates.slice(1)) {
    const diff = Math.abs(avgScore(c) - myAvg);
    if (diff < bestDiff) {
      best = c;
      bestDiff = diff;
    }
  }

  db.prepare(`INSERT INTO rivalries (anon_id_a, anon_id_b, created_at) VALUES (?, ?, ?)`).run(
    anonId,
    best.anonId,
    Date.now()
  );
  return best.anonId;
}

// Presence-notification path only — looks up a pairing without creating one,
// so merely connecting never eagerly pairs a player up.
export function getExistingRivalAnonId(anonId: string): string | null {
  return findExistingPairing(anonId);
}

export interface RivalStats {
  rivalAnonId: string;
  rivalName: string;
  myWinRate: number;
  rivalWinRate: number;
  myAvgScore: number;
  rivalAvgScore: number;
}

// Returns null only if there's no one else with any game history yet to
// pair against (e.g. the very first player on a fresh install).
export function getOrCreateRival(anonId: string): RivalStats | null {
  const rivalAnonId = findExistingPairing(anonId) ?? createPairing(anonId);
  if (!rivalAnonId) return null;

  const mine = getAnonStats(anonId);
  const rival = getAnonStats(rivalAnonId);
  if (!mine || !rival) return null;

  return {
    rivalAnonId,
    rivalName: getDisplayName(rivalAnonId) ?? "Unknown",
    myWinRate: mine.gamesPlayed > 0 ? mine.wins / mine.gamesPlayed : 0,
    rivalWinRate: rival.gamesPlayed > 0 ? rival.wins / rival.gamesPlayed : 0,
    myAvgScore: avgScore(mine),
    rivalAvgScore: avgScore(rival),
  };
}
