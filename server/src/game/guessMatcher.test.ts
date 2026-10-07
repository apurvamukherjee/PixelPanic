import { describe, it, expect } from "vitest";
import { isCorrectGuess, isNearMiss, containsWord } from "./guessMatcher.js";

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

  it("matches a multi-word answer guessed with the space omitted", () => {
    expect(isCorrectGuess("icecream", "ice cream")).toBe(true);
  });

  it("matches a multi-word answer guessed run-together and uppercase", () => {
    expect(isCorrectGuess("ICECREAM", "ice cream")).toBe(true);
  });

  it("still rejects a genuinely different word once spaces are stripped", () => {
    expect(isCorrectGuess("icecream", "ice creams")).toBe(false);
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

describe("punctuation in answers", () => {
  it("ignores apostrophes and hyphens on both sides", () => {
    expect(isCorrectGuess("rubiks cube", "rubik's cube")).toBe(true);
    expect(isCorrectGuess("yoyo", "yo-yo")).toBe(true);
    expect(isCorrectGuess("yo yo", "yo-yo")).toBe(true);
    expect(isCorrectGuess("yo-yo!", "yo-yo")).toBe(true);
  });
});

describe("containsWord", () => {
  it("finds the word inside a longer message, ignoring spacing and punctuation", () => {
    expect(containsWord("lol it's an ICE-CREAM", "ice cream")).toBe(true);
    expect(containsWord("nice drawing", "ice cream")).toBe(false);
  });
});
