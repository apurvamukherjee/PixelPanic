import type { StrokePoint } from "@pixelpanic/shared";

export type ShapeTool = "rect" | "ellipse" | "arrow";

interface Vec2 {
  x: number;
  y: number;
}

function pt(x: number, y: number, t: number): StrokePoint {
  return { x, y, pressure: 0.5, t };
}

// Closed rectangle outline between two dragged corners (normalized 0..1
// coords) — traced as a single loop so it reuses the freehand stroke
// renderer instead of needing a dedicated shape-drawing code path.
function rectOutline(a: Vec2, b: Vec2, t: number): StrokePoint[] {
  const x1 = Math.min(a.x, b.x);
  const x2 = Math.max(a.x, b.x);
  const y1 = Math.min(a.y, b.y);
  const y2 = Math.max(a.y, b.y);
  return [pt(x1, y1, t), pt(x2, y1, t), pt(x2, y2, t), pt(x1, y2, t), pt(x1, y1, t)];
}

// Ellipse inscribed in the bounding box of the two dragged corners, sampled
// as a closed polygon (perfect-freehand only needs a point list, not a true
// arc primitive).
function ellipseOutline(a: Vec2, b: Vec2, t: number, steps = 48): StrokePoint[] {
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2;
  const rx = Math.abs(a.x - b.x) / 2;
  const ry = Math.abs(a.y - b.y) / 2;
  const points: StrokePoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    points.push(pt(cx + rx * Math.cos(angle), cy + ry * Math.sin(angle), t));
  }
  return points;
}

// Shaft + chevron arrowhead as one continuous path: tail -> tip -> wing ->
// tip -> wing. Retracing the tip is a standard trick for drawing an
// arrowhead with a single stroked polyline instead of separate segments.
function arrowOutline(a: Vec2, b: Vec2, t: number): StrokePoint[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 0.0001;
  const angle = Math.atan2(dy, dx);
  const headLen = Math.min(len * 0.4, 0.06);
  const spread = Math.PI / 7; // ~25.7deg half-angle
  const wing1 = { x: b.x - headLen * Math.cos(angle - spread), y: b.y - headLen * Math.sin(angle - spread) };
  const wing2 = { x: b.x - headLen * Math.cos(angle + spread), y: b.y - headLen * Math.sin(angle + spread) };
  return [pt(a.x, a.y, t), pt(b.x, b.y, t), pt(wing1.x, wing1.y, t), pt(b.x, b.y, t), pt(wing2.x, wing2.y, t)];
}

export function buildShapeOutline(tool: ShapeTool, anchor: Vec2, current: Vec2, t: number): StrokePoint[] {
  if (tool === "rect") return rectOutline(anchor, current, t);
  if (tool === "ellipse") return ellipseOutline(anchor, current, t);
  return arrowOutline(anchor, current, t);
}
