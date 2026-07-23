import { v4 as uuidv4 } from "uuid";
import type { DrawTool, StrokePoint } from "@pixelpanic/shared";

export interface StrokeCaptureCallbacks {
  getTool: () => DrawTool;
  getColor: () => string;
  getSize: () => number;
  onStart: (strokeId: string, tool: DrawTool, color: string, size: number, point: StrokePoint) => void;
  onPoints: (strokeId: string, points: StrokePoint[]) => void;
  onEnd: (strokeId: string) => void;
  onFill: (opId: string, point: StrokePoint, color: string) => void;
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

  function toNormalizedPoint(e: PointerEvent): StrokePoint {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
      pressure: e.pressure > 0 ? e.pressure : 0.5,
      t: performance.now() - strokeStartTime,
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

    // Fill is a single instant click, not a dragged stroke — no pointermove
    // tracking, no onEnd.
    if (callbacks.getTool() === "fill") {
      strokeStartTime = performance.now();
      callbacks.onFill(uuidv4(), toNormalizedPoint(e), callbacks.getColor());
      return;
    }

    canvas.setPointerCapture(e.pointerId);
    drawing = true;
    strokeStartTime = performance.now();
    strokeId = uuidv4();
    callbacks.onStart(
      strokeId,
      callbacks.getTool(),
      callbacks.getColor(),
      callbacks.getSize(),
      toNormalizedPoint(e)
    );
  }

  function handlePointerMove(e: PointerEvent) {
    if (!drawing || !strokeId) return;
    buffer.push(toNormalizedPoint(e));
    scheduleFlush();
  }

  function handlePointerUp(e: PointerEvent) {
    if (!drawing || !strokeId) return;
    buffer.push(toNormalizedPoint(e));
    flush();
    callbacks.onEnd(strokeId);
    drawing = false;
    strokeId = null;
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
