import { getStroke } from "perfect-freehand";
import { SHAPE_TOOLS, type DrawTool } from "@pixelpanic/shared";

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

// Only the brush varies width with pressure/speed. Pencil and eraser keep a
// constant width (previously pencil and brush rendered identically), and
// shapes also skip smoothing/streamline, which rounded off rectangle corners
// and made one side visibly thinner than the other.
function strokeOptions(tool: DrawTool) {
  if (SHAPE_TOOLS.has(tool)) return { thinning: 0, smoothing: 0, streamline: 0 };
  if (tool === "brush") return { thinning: 0.6, smoothing: 0.5, streamline: 0.5 };
  return { thinning: 0, smoothing: 0.5, streamline: 0.4 };
}

// Builds a fillable Path2D for a stroke given in pixel coordinates (already
// denormalized from the shared 0..1 protocol by the caller).
export function strokeToPath2D(points: PixelStrokePoint[], sizePx: number, tool: DrawTool): Path2D {
  const outline = getStroke(
    points.map((p) => [p.x, p.y, p.pressure]),
    {
      size: Math.max(1, sizePx),
      ...strokeOptions(tool),
      simulatePressure: tool === "brush" && points.every((p) => p.pressure === 0.5),
    }
  );
  return new Path2D(getSvgPathFromStroke(outline));
}
