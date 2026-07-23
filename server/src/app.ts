import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import fs from "node:fs";
import { config } from "./config.js";
import {
  listWordPacks,
  listWordPacksByOwner,
  getWordPackDetail,
  createCustomWordPack,
  updateWordPack,
  deleteWordPack,
} from "./db/wordPacksRepo.js";

const PACK_NAME_MAX_LEN = 40;
const MIN_WORDS = 3;
const MAX_WORDS = 300;
const WORD_MAX_LEN = 30;
const CATEGORY_MAX_LEN = 30;

interface WordInput {
  text: string;
  category?: string | null;
}

function sanitizeWords(words: WordInput[]): { text: string; category: string | null }[] | null {
  const seen = new Set<string>();
  const cleaned: { text: string; category: string | null }[] = [];
  for (const w of words) {
    const text = w.text?.trim().toLowerCase().slice(0, WORD_MAX_LEN);
    if (!text || text.length < 2 || seen.has(text)) continue;
    seen.add(text);
    const category = w.category?.trim().slice(0, CATEGORY_MAX_LEN) || null;
    cleaned.push({ text, category });
  }
  if (cleaned.length < MIN_WORDS || cleaned.length > MAX_WORDS) return null;
  return cleaned;
}

export async function buildApp() {
  const app = Fastify({ logger: false });

  await app.register(cors, { origin: config.corsOrigin });

  app.get("/health", async () => ({ ok: true }));

  // Public summary list — used by the room-creation word-list dropdown.
  app.get("/api/wordpacks", async () => listWordPacks());

  // Word pack builder CRUD. anonId is passed explicitly (no auth/session
  // exists anywhere in this app), mirroring the socket convention.
  app.get<{ Querystring: { anonId?: string } }>("/api/wordpacks/mine", async (req, reply) => {
    const anonId = req.query.anonId;
    if (!anonId) return reply.code(400).send({ error: "anonId query param required" });
    return listWordPacksByOwner(anonId);
  });

  app.post<{ Body: { anonId?: string; name?: string; words?: WordInput[] } }>(
    "/api/wordpacks",
    async (req, reply) => {
      const { anonId, name, words } = req.body ?? {};
      if (!anonId) return reply.code(400).send({ error: "anonId required" });
      const cleanWords = sanitizeWords(words ?? []);
      if (!cleanWords) {
        return reply
          .code(400)
          .send({ error: `Provide ${MIN_WORDS}-${MAX_WORDS} unique words, 2-${WORD_MAX_LEN} chars each.` });
      }
      const pack = createCustomWordPack(
        (name ?? "").trim().slice(0, PACK_NAME_MAX_LEN) || "Untitled pack",
        cleanWords,
        anonId
      );
      return reply.code(201).send(pack);
    }
  );

  app.put<{ Params: { id: string }; Body: { anonId?: string; name?: string; words?: WordInput[] } }>(
    "/api/wordpacks/:id",
    async (req, reply) => {
      const { anonId, name, words } = req.body ?? {};
      if (!anonId) return reply.code(400).send({ error: "anonId required" });
      const cleanWords = words !== undefined ? sanitizeWords(words) : undefined;
      if (words !== undefined && !cleanWords) {
        return reply
          .code(400)
          .send({ error: `Provide ${MIN_WORDS}-${MAX_WORDS} unique words, 2-${WORD_MAX_LEN} chars each.` });
      }
      const result = updateWordPack(req.params.id, anonId, {
        name: name?.trim().slice(0, PACK_NAME_MAX_LEN),
        words: cleanWords ?? undefined,
      });
      if (!result.ok) {
        return reply.code(result.error === "NOT_FOUND" ? 404 : 403).send({ error: result.error });
      }
      return result.pack;
    }
  );

  app.delete<{ Params: { id: string }; Querystring: { anonId?: string } }>(
    "/api/wordpacks/:id",
    async (req, reply) => {
      const anonId = req.query.anonId;
      if (!anonId) return reply.code(400).send({ error: "anonId query param required" });
      const result = deleteWordPack(req.params.id, anonId);
      if (!result.ok) {
        return reply.code(result.error === "NOT_FOUND" ? 404 : 403).send({ error: result.error });
      }
      return reply.code(204).send();
    }
  );

  app.get<{ Params: { id: string } }>("/api/wordpacks/:id/export", async (req, reply) => {
    const pack = getWordPackDetail(req.params.id);
    if (!pack) return reply.code(404).send({ error: "NOT_FOUND" });
    reply.header("Content-Disposition", `attachment; filename="${pack.id}.json"`);
    return pack;
  });

  // Single-process prod deploy: serve the built client if it exists (no-op in dev,
  // where Vite's own dev server handles the client on a separate port).
  if (fs.existsSync(config.clientDistPath)) {
    await app.register(fastifyStatic, {
      root: config.clientDistPath,
    });
    app.setNotFoundHandler((req, reply) => {
      if (req.raw.method === "GET" && !req.url.startsWith("/api")) {
        reply.sendFile("index.html");
      } else {
        reply.code(404).send({ error: "Not found" });
      }
    });
  }

  return app;
}
