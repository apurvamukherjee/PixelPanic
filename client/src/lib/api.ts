import type { WordPackDetail, RivalSummary } from "@pixelpanic/shared";

export interface WordPackSummary {
  id: string;
  name: string;
  isBuiltIn: boolean;
}

export async function fetchWordPacks(): Promise<WordPackSummary[]> {
  const res = await fetch("/api/wordpacks");
  if (!res.ok) return [];
  return res.json();
}

export interface WordInput {
  text: string;
  category?: string | null;
}

async function parseErrorOrThrow(res: Response): Promise<never> {
  const body = await res.json().catch(() => ({}));
  throw new Error(body.error ?? `Request failed (${res.status})`);
}

export async function fetchMyWordPacks(anonId: string): Promise<WordPackDetail[]> {
  const res = await fetch(`/api/wordpacks/mine?anonId=${encodeURIComponent(anonId)}`);
  if (!res.ok) return [];
  return res.json();
}

export async function createWordPack(
  anonId: string,
  name: string,
  words: WordInput[]
): Promise<WordPackDetail> {
  const res = await fetch("/api/wordpacks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ anonId, name, words }),
  });
  if (!res.ok) return parseErrorOrThrow(res);
  return res.json();
}

export async function updateWordPack(
  id: string,
  anonId: string,
  patch: { name?: string; words?: WordInput[] }
): Promise<WordPackDetail> {
  const res = await fetch(`/api/wordpacks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ anonId, ...patch }),
  });
  if (!res.ok) return parseErrorOrThrow(res);
  return res.json();
}

export async function deleteWordPack(id: string, anonId: string): Promise<void> {
  const res = await fetch(`/api/wordpacks/${id}?anonId=${encodeURIComponent(anonId)}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 204) return parseErrorOrThrow(res);
}

export function wordPackExportUrl(id: string): string {
  return `/api/wordpacks/${id}/export`;
}

export async function fetchRival(anonId: string): Promise<RivalSummary | null> {
  const res = await fetch(`/api/rivals?anonId=${encodeURIComponent(anonId)}`);
  if (!res.ok) return null;
  const body = (await res.json()) as { rival: RivalSummary | null };
  return body.rival;
}
