import { v4 as uuidv4 } from "uuid";
import { SHAPE_TOOLS, type DrawTool, type StrokePoint } from "@pixelpanic/shared";
import { buildShapeOutline, type ShapeTool } from "./shapeGeometry";

export interface StrokeCaptureCallbacks {
  getTool: () => DrawTool;
  getColor: () => string;
  getSize: () => number;
  onStart: (strokeId: string, tool: DrawTool, color: string, size: number, point: StrokePoint) => void;
  onPoints: (strokeId: string, points: StrokePoint[]) => void;
  onEnd: (strokeId: string) => void;
  onFill: (opId: string, point: StrokePoint, color: string) => void;
}

function round(value: number, factor: number): number {
  return Math.round(value * factor) / factor;
}

// Captures local pointer input as normalized (0..1) StrokePoints and batches
// them once per animation frame — the client half of the "never full canvas
// frames" realtime-sync requirement.
export function attachStrokeCapture(
  canvas: HTMLCanvasElement,
  callbacks: StrokeCaptureCallbacks
): () => void {
  let strokeId: string | null = null;
  let buffer: StrokePoint[] = [];
  let rafHandle: number | null = null;
  let strokeStartTime = 0;
  let drawing = false;
  // Only the pointer that started the stroke may continue or end it. A second
  // finger or a resting palm used to start a new stroke mid-stroke, orphaning
  // the first one in every client's live layer.
  let activePointerId: number | null = null;
  // Set for the duration of a shape-tool drag (rect/ellipse/arrow) — the
  // point the drag started from, and the full outline is recomputed from it
  // on every move instead of appending like a freehand stroke.
  let shapeAnchor: StrokePoint | null = null;
  let activeShapeTool: ShapeTool | null = null;

  // Rounded before sending: 4 decimals is sub-pixel even on a 4K canvas,
  // and roughly halves the JSON size of every point batch.
  function toNormalizedPoint(e: PointerEvent): StrokePoint {
    const rect = canvas.getBoundingClientRect();
    return {
      x: round((e.clientX - rect.left) / rect.width, 1e4),
      y: round((e.clientY - rect.top) / rect.height, 1e4),
      pressure: e.pressure > 0 ? round(e.pressure, 100) : 0.5,
      t: Math.round(performance.now() - strokeStartTime),
    };
  }

  function flush() {
    rafHandle = null;
    if (strokeId && buffer.length > 0) {
      callbacks.onPoints(strokeId, buffer);
      buffer = [];
    }
  }

  function scheduleFlush() {
    if (rafHandle === null) rafHandle = requestAnimationFrame(flush);
  }

  function handlePointerDown(e: PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    if (drawing) return;

    const tool = callbacks.getTool();

    // Fill is a single instant click, not a dragged stroke — no pointermove
    // tracking, no onEnd.
    if (tool === "fill") {
      strokeStartTime = performance.now();
      callbacks.onFill(uuidv4(), toNormalizedPoint(e), callbacks.getColor());
      return;
    }

    canvas.setPointerCapture(e.pointerId);
    activePointerId = e.pointerId;
    drawing = true;
    strokeStartTime = performance.now();
    strokeId = uuidv4();
    const point = toNormalizedPoint(e);
    if (SHAPE_TOOLS.has(tool)) {
      shapeAnchor = point;
      activeShapeTool = tool as ShapeTool;
    } else {
      shapeAnchor = null;
      activeShapeTool = null;
    }
    callbacks.onStart(strokeId, tool, callbacks.getColor(), callbacks.getSize(), point);
  }

  function handlePointerMove(e: PointerEvent) {
    if (!drawing || !strokeId || e.pointerId !== activePointerId) return;
    const point = toNormalizedPoint(e);
    if (activeShapeTool && shapeAnchor) {
      // Replace, don't accumulate — the whole outline is recomputed from
      // the anchor each frame (see remoteStrokeRenderer.ts's SHAPE_TOOLS
      // handling on the receiving end).
      buffer = buildShapeOutline(activeShapeTool, shapeAnchor, point, point.t);
    } else {
      // Browsers deliver one pointermove per frame but may have sampled the
      // pen/finger several times in between (120Hz screens, styluses) —
      // using every sample gives noticeably smoother curves.
      const samples = e.getCoalescedEvents?.() ?? [];
      if (samples.length > 1) for (const sample of samples) buffer.push(toNormalizedPoint(sample));
      else buffer.push(point);
    }
    scheduleFlush();
  }

  function handlePointerUp(e: PointerEvent) {
    if (!drawing || !strokeId || e.pointerId !== activePointerId) return;
    const point = toNormalizedPoint(e);
    if (activeShapeTool && shapeAnchor) {
      buffer = buildShapeOutline(activeShapeTool, shapeAnchor, point, point.t);
    } else {
      buffer.push(point);
    }
    flush();
    callbacks.onEnd(strokeId);
    drawing = false;
    activePointerId = null;
    strokeId = null;
    shapeAnchor = null;
    activeShapeTool = null;
  }

  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointercancel", handlePointerUp);

  return () => {
    canvas.removeEventListener("pointerdown", handlePointerDown);
    canvas.removeEventListener("pointermove", handlePointerMove);
    canvas.removeEventListener("pointerup", handlePointerUp);
    canvas.removeEventListener("pointercancel", handlePointerUp);
    if (rafHandle !== null) cancelAnimationFrame(rafHandle);
  };
}
