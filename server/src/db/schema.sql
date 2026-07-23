-- Idempotent: every statement is safe to re-run on every server boot.
-- Additive-only; Phase 2/3 tables (e.g. tournaments) get appended here later,
-- never inserted mid-file, so this stays a trivial migration story.

CREATE TABLE IF NOT EXISTS word_packs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_built_in INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS word_pack_words (
  pack_id TEXT NOT NULL REFERENCES word_packs(id) ON DELETE CASCADE,
  word TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_word_pack_words_pack ON word_pack_words(pack_id);

CREATE TABLE IF NOT EXISTS anon_players (
  anon_id TEXT PRIMARY KEY,
  display_name TEXT,
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS anon_stats (
  anon_id TEXT PRIMARY KEY REFERENCES anon_players(anon_id),
  games_played INTEGER NOT NULL DEFAULT 0,
  rounds_drawn INTEGER NOT NULL DEFAULT 0,
  correct_guesses INTEGER NOT NULL DEFAULT 0,
  total_score INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0
);

-- Phase 2: tournament (round-robin) history.
CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY,
  room_code TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  completed_at INTEGER
);

CREATE TABLE IF NOT EXISTS tournament_matches (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  player_a_anon_id TEXT NOT NULL,
  player_b_anon_id TEXT NOT NULL,
  score_a INTEGER NOT NULL,
  score_b INTEGER NOT NULL,
  winner_anon_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament ON tournament_matches(tournament_id);
