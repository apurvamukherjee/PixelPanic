import type {
  DrawTool,
  StrokePoint,
  StrokeStartPayload,
  StrokePointPayload,
  DrawFillPayload,
} from "@pixelpanic/shared";

// Socket payloads are untrusted: these guard the ones that get stored
// server-side (DRAW_SNAPSHOT buffer) and rebroadcast to every client.
const DRAW_TOOLS: ReadonlySet<string> = new Set<DrawTool>([
  "pencil", "brush", "eraser", "fill", "rect", "ellipse", "arrow",
]);
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
// A freehand batch is one animation frame's worth of pointer events; a shape
// resends its whole outline (ellipse = 49 points). 256 is far above either.
export const MAX_POINTS_PER_BATCH = 256;
export const MAX_POINTS_PER_STROKE = 8192;

export function isId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 64;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isStrokePoint(value: unknown): value is StrokePoint {
  return (
    isRecord(value) &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    isFiniteNumber(value.pressure) &&
    isFiniteNumber(value.t)
  );
}

export function isStrokeStart(value: unknown): value is StrokeStartPayload {
  return (
    isRecord(value) &&
    isId(value.strokeId) &&
    typeof value.tool === "string" &&
    DRAW_TOOLS.has(value.tool) &&
    value.tool !== "fill" &&
    typeof value.color === "string" &&
    HEX_COLOR.test(value.color) &&
    isFiniteNumber(value.size) &&
    value.size >= 1 &&
    value.size <= 40 &&
    isStrokePoint(value.point)
  );
}

export function isStrokePoints(value: unknown): value is StrokePointPayload {
  return (
    isRecord(value) &&
    isId(value.strokeId) &&
    Array.isArray(value.points) &&
    value.points.length <= MAX_POINTS_PER_BATCH &&
    value.points.every(isStrokePoint)
  );
}

export function isDrawFill(value: unknown): value is DrawFillPayload {
  return (
    isRecord(value) &&
    isId(value.strokeId) &&
    typeof value.color === "string" &&
    HEX_COLOR.test(value.color) &&
    isStrokePoint(value.point)
  );
}
