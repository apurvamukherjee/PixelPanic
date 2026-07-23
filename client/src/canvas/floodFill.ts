// Classic stack-based flood fill over the canvas's raster pixels. Runs
// independently on every client against its own locally-rasterized
// committed canvas rather than syncing pixel data — strokes are already
// trusted to replay identically across clients (same Path2D + same canvas
// API calls), so a fill starting from the same normalized point with the
// same color is trusted to produce the same result too. This is the
// documented simplification: no server-authoritative rasterization.
//
// A color-distance tolerance (rather than exact-match) is required because
// stroke edges are antialiased — an exact match would leave a ring of
// unfilled fringe pixels around every boundary.
const TOLERANCE = 48; // per-channel-ish distance threshold, 0..~510

function colorDistance(
  data: Uint8ClampedArray,
  i: number,
  r: number,
  g: number,
  b: number,
  a: number
): number {
  return (
    Math.abs(data[i]! - r) +
    Math.abs(data[i + 1]! - g) +
    Math.abs(data[i + 2]! - b) +
    Math.abs(data[i + 3]! - a)
  );
}

function hexToRgba(hex: string): [number, number, number, number] {
  const c = hex.replace("#", "");
  const r = parseInt(c.length === 3 ? c[0]! + c[0]! : c.slice(0, 2), 16);
  const g = parseInt(c.length === 3 ? c[1]! + c[1]! : c.slice(2, 4), 16);
  const b = parseInt(c.length === 3 ? c[2]! + c[2]! : c.slice(4, 6), 16);
  return [r, g, b, 255];
}

export function floodFill(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  fillColorHex: string,
  width: number,
  height: number
): void {
  if (width <= 0 || height <= 0) return;
  const x0 = Math.max(0, Math.min(width - 1, Math.round(startX)));
  const y0 = Math.max(0, Math.min(height - 1, Math.round(startY)));

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const startIdx = (y0 * width + x0) * 4;
  const targetR = data[startIdx]!;
  const targetG = data[startIdx + 1]!;
  const targetB = data[startIdx + 2]!;
  const targetA = data[startIdx + 3]!;

  const [fr, fg, fb, fa] = hexToRgba(fillColorHex);
  // Already the fill color (within tolerance) — nothing to do.
  if (colorDistance(data, startIdx, fr, fg, fb, fa) <= TOLERANCE) return;

  const visited = new Uint8Array(width * height);
  const stack: number[] = [x0, y0];

  while (stack.length > 0) {
    const y = stack.pop()!;
    const x = stack.pop()!;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    const pixelIndex = y * width + x;
    if (visited[pixelIndex]) continue;

    const i = pixelIndex * 4;
    if (colorDistance(data, i, targetR, targetG, targetB, targetA) > TOLERANCE) continue;

    visited[pixelIndex] = 1;
    data[i] = fr;
    data[i + 1] = fg;
    data[i + 2] = fb;
    data[i + 3] = fa;

    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }

  ctx.putImageData(imageData, 0, 0);
}
