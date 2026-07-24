import { describe, it, expect } from "vitest";
import { computeHintSchedule, buildMaskedWord } from "./HintScheduler.js";

describe("computeHintSchedule", () => {
  it("returns no hints for words of length 3 or less", () => {
    expect(computeHintSchedule("cat", 80, "fast")).toEqual([]);
  });

  it("returns no hints when frequency is off", () => {
    expect(computeHintSchedule("elephant", 80, "off")).toEqual([]);
  });

  it("reveals roughly the configured percentage of letters", () => {
    const word = "elephant"; // 8 letters, no spaces
    const hints = computeHintSchedule(word, 80, "normal"); // 40%
    expect(hints).toHaveLength(Math.floor(8 * 0.4));
  });

  it("schedules hints strictly within the turn's draw time, spread across 20%-90%", () => {
    const drawTimeSec = 100;
    const hints = computeHintSchedule("elephant", drawTimeSec, "fast");
    for (const hint of hints) {
      expect(hint.atMs).toBeGreaterThanOrEqual(drawTimeSec * 1000 * 0.2);
      expect(hint.atMs).toBeLessThanOrEqual(drawTimeSec * 1000 * 0.9);
    }
  });

  it("excludes spaces from the revealable letter indices", () => {
    const hints = computeHintSchedule("ice cream", 80, "fast"); // 8 letters + 1 space
    for (const hint of hints) {
      expect("ice cream"[hint.index]).not.toBe(" ");
    }
  });
});

describe("buildMaskedWord", () => {
  it("masks every letter when nothing is revealed", () => {
    expect(buildMaskedWord("cat", new Set())).toBe("_ _ _");
  });

  it("reveals only the given indices, preserving spaces", () => {
    expect(buildMaskedWord("ice cream", new Set([0, 4]))).toBe("i _ _   c _ _ _ _");
  });

  it("fully reveals when every index is given", () => {
    expect(buildMaskedWord("cat", new Set([0, 1, 2]))).toBe("c a t");
  });
});
