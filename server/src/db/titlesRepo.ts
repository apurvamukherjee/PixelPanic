import { getTitleName } from "@pixelpanic/shared";
import { db } from "./connection.js";
import { getAnonStats, type AnonStatsRow } from "./statsRepo.js";

interface TitleDefinition {
  id: string;
  check: (stats: AnonStatsRow) => boolean;
}

// Small, static milestone list checked against the *updated* anon_stats row
// right after recordGameEndStats — deliberately simple (no XP/leveling
// system, no dedicated achievements engine), consistent with this codebase's
// "simplest option that's coherent" convention. Display names live in
// shared/src/titles.ts (single source of truth for server + client).
const TITLE_DEFINITIONS: TitleDefinition[] = [
  { id: "first_win", check: (s) => s.wins >= 1 },
  { id: "ten_games", check: (s) => s.gamesPlayed >= 10 },
  { id: "fifty_games", check: (s) => s.gamesPlayed >= 50 },
  { id: "hundred_correct", check: (s) => s.correctGuesses >= 100 },
  { id: "five_hundred_correct", check: (s) => s.correctGuesses >= 500 },
  { id: "fifty_rounds_drawn", check: (s) => s.roundsDrawn >= 50 },
  { id: "ten_wins", check: (s) => s.wins >= 10 },
  { id: "ten_thousand_points", check: (s) => s.totalScore >= 10_000 },
];

function getAlreadyUnlocked(anonId: string): Set<string> {
  const rows = db.prepare(`SELECT title_id FROM unlocked_titles WHERE anon_id = ?`).all(anonId) as {
    title_id: string;
  }[];
  return new Set(rows.map((r) => r.title_id));
}

// Returns the title ids newly unlocked this call (empty if none), inserting
// them into unlocked_titles. Must run after recordGameEndStats so `stats`
// reflects this game's contribution.
export function checkAndUnlockTitles(anonId: string): string[] {
  const stats = getAnonStats(anonId);
  if (!stats) return [];
  const already = getAlreadyUnlocked(anonId);
  const newlyUnlocked: string[] = [];
  const insert = db.prepare(
    `INSERT INTO unlocked_titles (anon_id, title_id, unlocked_at) VALUES (?, ?, ?)`
  );
  for (const def of TITLE_DEFINITIONS) {
    if (already.has(def.id)) continue;
    if (def.check(stats)) {
      insert.run(anonId, def.id, Date.now());
      newlyUnlocked.push(def.id);
    }
  }
  return newlyUnlocked;
}

export function listUnlockedTitles(anonId: string): { id: string; name: string; unlockedAt: number }[] {
  const rows = db
    .prepare(`SELECT title_id, unlocked_at FROM unlocked_titles WHERE anon_id = ? ORDER BY unlocked_at ASC`)
    .all(anonId) as { title_id: string; unlocked_at: number }[];
  return rows.map((r) => ({ id: r.title_id, name: getTitleName(r.title_id), unlockedAt: r.unlocked_at }));
}
