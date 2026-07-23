import { getStroke } from "perfect-freehand";

export interface PixelStrokePoint {
  x: number;
  y: number;
  pressure: number;
}

// Standard perfect-freehand "cookbook" helper: turns the polygon outline
// returned by getStroke() into an SVG path `d` string.
function getSvgPathFromStroke(stroke: number[][]): string {
  if (!stroke.length) return "";

  const d = stroke.reduce<(string | number)[]>(
    (acc, [x0, y0], i, arr) => {
      const next = arr[(i + 1) % arr.length]!;
      const [x1, y1] = next as [number, number];
      acc.push(x0!, y0!, (x0! + x1) / 2, (y0! + y1) / 2);
      return acc;
    },
    ["M", ...stroke[0]!, "Q"]
  );

  d.push("Z");
  return d.join(" ");
}

// Builds a fillable Path2D for a stroke given in pixel coordinates (already
// denormalized from the shared 0..1 protocol by the caller).
export function strokeToPath2D(points: PixelStrokePoint[], sizePx: number): Path2D {
  const simulatePressure = points.every((p) => p.pressure === 0.5);
  const outline = getStroke(
    points.map((p) => [p.x, p.y, p.pressure]),
    {
      size: Math.max(1, sizePx),
      thinning: 0.6,
      smoothing: 0.5,
      streamline: 0.5,
      simulatePressure,
    }
  );
  return new Path2D(getSvgPathFromStroke(outline));
}
