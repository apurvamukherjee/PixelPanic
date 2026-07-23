import { randomUUID } from "node:crypto";
import type { WordPack, WordPackDetail } from "@pixelpanic/shared";
import { db } from "./connection.js";

interface WordPackRow {
  id: string;
  name: string;
  is_built_in: number;
  owner_anon_id: string | null;
}

export function getWordPack(id: string): WordPack | null {
  const pack = db
    .prepare("SELECT id, name, is_built_in FROM word_packs WHERE id = ?")
    .get(id) as { id: string; name: string; is_built_in: number } | undefined;
  if (!pack) return null;

  const rows = db
    .prepare("SELECT word FROM word_pack_words WHERE pack_id = ?")
    .all(pack.id) as { word: string }[];

  return {
    id: pack.id,
    name: pack.name,
    isBuiltIn: pack.is_built_in === 1,
    words: rows.map((r) => r.word),
  };
}

export function getWordPackDetail(id: string): WordPackDetail | null {
  const pack = db
    .prepare("SELECT id, name, is_built_in, owner_anon_id FROM word_packs WHERE id = ?")
    .get(id) as WordPackRow | undefined;
  if (!pack) return null;

  const rows = db
    .prepare("SELECT word, category FROM word_pack_words WHERE pack_id = ?")
    .all(pack.id) as { word: string; category: string | null }[];

  return {
    id: pack.id,
    name: pack.name,
    isBuiltIn: pack.is_built_in === 1,
    ownerAnonId: pack.owner_anon_id,
    words: rows.map((r) => ({ text: r.word, category: r.category })),
  };
}

export function listWordPacks(): Pick<WordPack, "id" | "name" | "isBuiltIn">[] {
  const rows = db
    .prepare("SELECT id, name, is_built_in FROM word_packs ORDER BY is_built_in DESC, created_at ASC")
    .all() as { id: string; name: string; is_built_in: number }[];
  return rows.map((r) => ({ id: r.id, name: r.name, isBuiltIn: r.is_built_in === 1 }));
}

export function listWordPacksByOwner(ownerAnonId: string): WordPackDetail[] {
  const rows = db
    .prepare("SELECT id FROM word_packs WHERE owner_anon_id = ? ORDER BY created_at DESC")
    .all(ownerAnonId) as { id: string }[];
  return rows.map((r) => getWordPackDetail(r.id)!);
}

// Custom lists always create a fresh pack row — no dedup logic in Phase 1/2.
// ownerAnonId is null for the lobby "quick custom list" flow (WORD_PACK_CREATE
// socket event), which was never attributed to a creator before Phase 2 and
// stays that way for backward compatibility with that flow.
export function createCustomWordPack(
  name: string,
  words: { text: string; category: string | null }[],
  ownerAnonId: string | null
): WordPackDetail {
  const id = randomUUID();
  const insertPack = db.prepare(
    "INSERT INTO word_packs (id, name, is_built_in, created_at, owner_anon_id) VALUES (?, ?, 0, ?, ?)"
  );
  const insertWord = db.prepare(
    "INSERT INTO word_pack_words (pack_id, word, category) VALUES (?, ?, ?)"
  );
  const run = db.transaction(() => {
    insertPack.run(id, name, Date.now(), ownerAnonId);
    for (const word of words) insertWord.run(id, word.text, word.category);
  });
  run();
  return { id, name, isBuiltIn: false, ownerAnonId, words };
}

export type WordPackWriteResult =
  | { ok: true; pack: WordPackDetail }
  | { ok: false; error: "NOT_FOUND" | "FORBIDDEN" };

export function updateWordPack(
  id: string,
  ownerAnonId: string,
  patch: { name?: string; words?: { text: string; category: string | null }[] }
): WordPackWriteResult {
  const existing = db
    .prepare("SELECT owner_anon_id, is_built_in FROM word_packs WHERE id = ?")
    .get(id) as { owner_anon_id: string | null; is_built_in: number } | undefined;
  if (!existing) return { ok: false, error: "NOT_FOUND" };
  if (existing.is_built_in === 1 || existing.owner_anon_id !== ownerAnonId) {
    return { ok: false, error: "FORBIDDEN" };
  }

  const run = db.transaction(() => {
    if (patch.name !== undefined) {
      db.prepare("UPDATE word_packs SET name = ? WHERE id = ?").run(patch.name, id);
    }
    if (patch.words !== undefined) {
      db.prepare("DELETE FROM word_pack_words WHERE pack_id = ?").run(id);
      const insertWord = db.prepare(
        "INSERT INTO word_pack_words (pack_id, word, category) VALUES (?, ?, ?)"
      );
      for (const word of patch.words) insertWord.run(id, word.text, word.category);
    }
  });
  run();
  return { ok: true, pack: getWordPackDetail(id)! };
}

export type WordPackDeleteResult = { ok: true } | { ok: false; error: "NOT_FOUND" | "FORBIDDEN" };

export function deleteWordPack(id: string, ownerAnonId: string): WordPackDeleteResult {
  const existing = db
    .prepare("SELECT owner_anon_id, is_built_in FROM word_packs WHERE id = ?")
    .get(id) as { owner_anon_id: string | null; is_built_in: number } | undefined;
  if (!existing) return { ok: false, error: "NOT_FOUND" };
  if (existing.is_built_in === 1 || existing.owner_anon_id !== ownerAnonId) {
    return { ok: false, error: "FORBIDDEN" };
  }
  db.prepare("DELETE FROM word_packs WHERE id = ?").run(id);
  return { ok: true };
}
