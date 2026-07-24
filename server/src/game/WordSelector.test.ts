import { describe, it, expect } from "vitest";
import { WordSelector } from "./WordSelector.js";
import type { WordPack } from "@pixelpanic/shared";

function makePack(words: string[]): WordPack {
  return { id: "test-pack", name: "Test", isBuiltIn: false, words };
}

describe("WordSelector.pickThree", () => {
  it("returns 3 distinct words from a large enough pack", () => {
    const selector = new WordSelector(makePack(["a", "b", "c", "d", "e"]));
    const [a, b, c] = selector.pickThree();
    expect(new Set([a, b, c]).size).toBe(3);
  });

  it("avoids repeating a used word until the pool is exhausted", () => {
    const selector = new WordSelector(makePack(["a", "b", "c"]));
    selector.markUsed("a");
    selector.markUsed("b");
    selector.markUsed("c");
    // All 3 used — pickThree should reset and serve from the full pack again.
    const [x, y, z] = selector.pickThree();
    expect(new Set(["a", "b", "c"])).toContain(x);
    expect(new Set(["a", "b", "c"])).toContain(y);
    expect(new Set(["a", "b", "c"])).toContain(z);
  });
});

describe("WordSelector.pickThreeHard", () => {
  it("only returns words from the longest ~40% of the pack", () => {
    const words = ["a", "bb", "ccc", "dddd", "eeeee", "ffffff", "ggggggg", "hhhhhhhh", "iiiiiiiii", "jjjjjjjjjj"];
    const selector = new WordSelector(makePack(words));
    const sortedLengths = [...words].map((w) => w.length).sort((a, b) => b - a);
    const hardPoolSize = Math.max(3, Math.ceil(words.length * 0.4));
    const minHardLength = sortedLengths[hardPoolSize - 1]!;
    for (let i = 0; i < 10; i++) {
      for (const w of selector.pickThreeHard()) {
        expect(w.length).toBeGreaterThanOrEqual(minHardLength);
      }
    }
  });

  it("falls back gracefully on a tiny pack", () => {
    const selector = new WordSelector(makePack(["a", "bb"]));
    const choices = selector.pickThreeHard();
    expect(choices).toHaveLength(3);
  });
});

describe("WordSelector.pickMashup", () => {
  it("combines two distinct words from the pack", () => {
    const selector = new WordSelector(makePack(["banana", "shark", "castle"]));
    const mashup = selector.pickMashup();
    const parts = mashup.split(" ");
    expect(parts).toHaveLength(2);
    expect(parts[0]).not.toBe(parts[1]);
    for (const part of parts) {
      expect(["banana", "shark", "castle"]).toContain(part);
    }
  });
});
