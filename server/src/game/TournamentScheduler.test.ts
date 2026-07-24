import { describe, it, expect } from "vitest";
import { generateRoundRobinSchedule, pickNextMatch } from "./TournamentScheduler.js";
import type { TournamentMatch } from "@pixelpanic/shared";

describe("generateRoundRobinSchedule", () => {
  it("produces N*(N-1)/2 matches for an even player count", () => {
    const schedule = generateRoundRobinSchedule(["a", "b", "c", "d"]);
    expect(schedule).toHaveLength(6); // 4*3/2
  });

  it("produces N*(N-1)/2 matches for an odd player count (bye excluded)", () => {
    const schedule = generateRoundRobinSchedule(["a", "b", "c"]);
    expect(schedule).toHaveLength(3); // 3*2/2
  });

  it("has every player face every other player exactly once", () => {
    const anonIds = ["a", "b", "c", "d", "e"];
    const schedule = generateRoundRobinSchedule(anonIds);
    const seenPairs = new Set<string>();
    for (const { playerAnonIds } of schedule) {
      const key = [...playerAnonIds].sort().join("-");
      expect(seenPairs.has(key)).toBe(false);
      seenPairs.add(key);
    }
    const expectedPairCount = (anonIds.length * (anonIds.length - 1)) / 2;
    expect(seenPairs.size).toBe(expectedPairCount);
  });

  it("never repeats a player within the same round", () => {
    const schedule = generateRoundRobinSchedule(["a", "b", "c", "d", "e", "f"]);
    const byRound = new Map<number, string[]>();
    for (const { round, playerAnonIds } of schedule) {
      const players = byRound.get(round) ?? [];
      players.push(...playerAnonIds);
      byRound.set(round, players);
    }
    for (const players of byRound.values()) {
      expect(new Set(players).size).toBe(players.length);
    }
  });
});

describe("pickNextMatch", () => {
  const match = (id: string, status: TournamentMatch["status"]): TournamentMatch => ({
    id,
    round: 0,
    playerAnonIds: ["a", "b"],
    status,
    scores: null,
    winnerAnonId: null,
  });

  it("returns the first pending match", () => {
    const matches = [match("1", "complete"), match("2", "pending"), match("3", "pending")];
    expect(pickNextMatch(matches)?.id).toBe("2");
  });

  it("returns null when no match is pending", () => {
    const matches = [match("1", "complete"), match("2", "complete")];
    expect(pickNextMatch(matches)).toBeNull();
  });
});
