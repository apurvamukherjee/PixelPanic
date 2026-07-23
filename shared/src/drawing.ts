export type DrawTool = "pencil" | "brush" | "eraser" | "fill";

// Coordinates are normalized 0..1 relative to canvas width/height so a phone
// in portrait and a desktop browser can render the exact same strokes at
// their own resolution without a fixed shared pixel size.
export interface StrokePoint {
  x: number;
  y: number;
  pressure: number; // 0..1, defaults to 0.5 when no pressure API is available
  t: number; // ms timestamp relative to strokeStart
}

export interface StrokeStartPayload {
  strokeId: string; // uuid, client-generated
  tool: DrawTool;
  color: string; // hex, ignored for eraser
  size: number; // brush size in normalized units (e.g. 1..40 scale)
  point: StrokePoint;
}

export interface StrokePointPayload {
  strokeId: string;
  points: StrokePoint[]; // batched — client flushes buffered points once per animation frame
}

export interface StrokeEndPayload {
  strokeId: string;
}

// Paint-bucket fill: a single instant point + color, not a dragged stroke.
// `strokeId` (client-generated, like a stroke's) lets it slot into the same
// undo history as strokes — RoomInstance.currentTurnStrokeIds and
// DrawUndoPayload don't need to know "fill" is a different kind of op.
export interface DrawFillPayload {
  strokeId: string;
  point: StrokePoint;
  color: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DrawClearPayload {} // drawer-only, wipes the canvas

// Client -> server: "undo my last stroke", no payload needed.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DrawUndoRequestPayload {}

// Server -> clients: exactly which committed stroke to remove, so clients
// can replay the remaining strokes without needing the whole history resent.
export interface DrawUndoPayload {
  strokeId: string;
}
