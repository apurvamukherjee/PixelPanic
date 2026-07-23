import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "./connection.js";
import { DEFAULT_WORD_PACK_ID, DEFAULT_WORD_PACK_NAME, DEFAULT_WORDS } from "./seedWords.js";
import { logger } from "../utils/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function migrate(): void {
  const schemaSql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
  db.exec(schemaSql);
  addColumnsForPhase2();
  seedDefaultWordPackIfEmpty();
}

// ALTER TABLE ADD COLUMN isn't naturally idempotent (no IF NOT EXISTS in
// SQLite), unlike every other statement in schema.sql — so these two
// additive Phase 2 columns are guarded here instead, preserving any
// existing dev DB rather than requiring a wipe.
function addColumnsForPhase2(): void {
  ensureColumn("word_packs", "owner_anon_id", "TEXT");
  ensureColumn("word_pack_words", "category", "TEXT");
}

function ensureColumn(table: string, column: string, ddl: string): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (columns.some((c) => c.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
  logger.info(`Migrated: added ${table}.${column}`);
}

function seedDefaultWordPackIfEmpty(): void {
  const existing = db
    .prepare("SELECT id FROM word_packs WHERE id = ?")
    .get(DEFAULT_WORD_PACK_ID);
  if (existing) return;

  const insertPack = db.prepare(
    "INSERT INTO word_packs (id, name, is_built_in, created_at) VALUES (?, ?, 1, ?)"
  );
  const insertWord = db.prepare(
    "INSERT INTO word_pack_words (pack_id, word) VALUES (?, ?)"
  );

  const seed = db.transaction(() => {
    insertPack.run(DEFAULT_WORD_PACK_ID, DEFAULT_WORD_PACK_NAME, Date.now());
    for (const word of DEFAULT_WORDS) {
      insertWord.run(DEFAULT_WORD_PACK_ID, word);
    }
  });
  seed();

  logger.info(`Seeded default word pack with ${DEFAULT_WORDS.length} words`);
}
