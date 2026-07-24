import { describe, it, expect } from "vitest";
import { isCorrectGuess, isNearMiss } from "./guessMatcher.js";

describe("isCorrectGuess", () => {
  it("matches exact words", () => {
    expect(isCorrectGuess("banana", "banana")).toBe(true);
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(isCorrectGuess("  BaNaNa  ", "banana")).toBe(true);
  });

  it("collapses internal whitespace runs", () => {
    expect(isCorrectGuess("ice   cream", "ice cream")).toBe(true);
  });

  it("rejects a wrong word", () => {
    expect(isCorrectGuess("apple", "banana")).toBe(false);
  });
});

describe("isNearMiss", () => {
  it("is false for an exact match", () => {
    expect(isNearMiss("banana", "banana")).toBe(false);
  });

  it("is true for a single-letter typo on a short word", () => {
    expect(isNearMiss("banaka", "banana")).toBe(true);
  });

  it("is false when more than the threshold differs on a short word", () => {
    expect(isNearMiss("zzzzzz", "banana")).toBe(false);
  });

  it("allows a slightly larger edit distance on longer words", () => {
    expect(isNearMiss("giraffe", "giraffes")).toBe(true); // 1 insertion, threshold 2 (len 8 > 6)
  });

  it("is false for a completely unrelated guess", () => {
    expect(isNearMiss("xyz", "elephant")).toBe(false);
  });
});
