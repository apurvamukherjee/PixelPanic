import { describe, it, expect } from "vitest";
import { isStrokeStart, isStrokePoints, isDrawFill, MAX_POINTS_PER_BATCH } from "./validate.js";

const point = { x: 0.5, y: 0.5, pressure: 0.5, t: 0 };

describe("draw payload validation", () => {
  it("accepts a well-formed stroke start", () => {
    expect(isStrokeStart({ strokeId: "s1", tool: "pencil", color: "#000000", size: 8, point })).toBe(true);
  });

  it("rejects bad colors, unknown tools, and fill as a stroke", () => {
    expect(isStrokeStart({ strokeId: "s1", tool: "pencil", color: "red", size: 8, point })).toBe(false);
    expect(isStrokeStart({ strokeId: "s1", tool: "laser", color: "#000000", size: 8, point })).toBe(false);
    expect(isStrokeStart({ strokeId: "s1", tool: "fill", color: "#000000", size: 8, point })).toBe(false);
  });

  it("rejects non-finite coordinates and oversized batches", () => {
    expect(isStrokePoints({ strokeId: "s1", points: [{ ...point, x: NaN }] })).toBe(false);
    expect(isStrokePoints({ strokeId: "s1", points: Array(MAX_POINTS_PER_BATCH + 1).fill(point) })).toBe(false);
    expect(isStrokePoints({ strokeId: "s1", points: [point] })).toBe(true);
  });

  it("rejects null and malformed fills", () => {
    expect(isDrawFill(null)).toBe(false);
    expect(isDrawFill({ strokeId: "f1", color: "#00ff00", point })).toBe(true);
    expect(isDrawFill({ strokeId: "f1", color: "#00ff00" })).toBe(false);
  });
});
