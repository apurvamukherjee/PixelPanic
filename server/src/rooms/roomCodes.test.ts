import { describe, it, expect } from "vitest";
import { normalizeRoomCode } from "./roomCodes.js";

describe("normalizeRoomCode", () => {
  it("uppercases, trims, and maps look-alike letters to digits", () => {
    expect(normalizeRoomCode(" ab0o1l ")).toBe("AB0011");
    expect(normalizeRoomCode("x7kqiz")).toBe("X7KQ1Z");
  });
});
