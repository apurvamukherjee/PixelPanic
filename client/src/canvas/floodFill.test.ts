import { describe, it, expect } from "vitest";
import { floodFill } from "./floodFill";

// 5x5 transparent canvas with an opaque black vertical wall at x = 2.
function makeCtx() {
  const width = 5;
  const height = 5;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) data[(y * width + 2) * 4 + 3] = 255;
  const ctx = {
    getImageData: () => ({ data }),
    putImageData: () => {},
  } as unknown as CanvasRenderingContext2D;
  const isFilled = (x: number, y: number) => data[(y * width + x) * 4] === 255;
  return { ctx, width, height, isFilled };
}

describe("floodFill", () => {
  it("fills the whole connected region and stops at the wall", () => {
    const { ctx, width, height, isFilled } = makeCtx();
    floodFill(ctx, 0, 0, "#ff0000", width, height);
    for (let y = 0; y < height; y++) {
      expect(isFilled(0, y) && isFilled(1, y)).toBe(true);
      expect(isFilled(3, y) || isFilled(4, y)).toBe(false);
    }
  });

  it("does not leak around a wall that has a gap only diagonally", () => {
    const { ctx, width, height, isFilled } = makeCtx();
    floodFill(ctx, 4, 4, "#ff0000", width, height);
    expect(isFilled(3, 0)).toBe(true);
    expect(isFilled(1, 0)).toBe(false);
  });
});
