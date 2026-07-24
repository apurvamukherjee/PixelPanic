import type {
  DrawTool,
  StrokePoint,
  StrokeStartPayload,
  StrokePointPayload,
  StrokeEndPayload,
  DrawFillPayload,
  CommittedDrawOp,
} from "@pixelpanic/shared";
import { strokeToPath2D } from "./perfectFreehandRender";
import { floodFill } from "./floodFill";

interface TrackedStroke {
  kind: "stroke";
  id: string;
  tool: DrawTool;
  color: string;
  size: number;
  points: StrokePoint[];
}

interface TrackedFill {
  kind: "fill";
  id: string;
  point: StrokePoint;
  color: string;
}

type CommittedItem = TrackedStroke | TrackedFill;

// Renders every stroke event coming back from the server — including the
// drawer's own strokes, since `io.to(room).emit` echoes to the sender too.
// A single source of truth avoids double-rendering the drawer's own lines.
// Two-canvas technique: `live` holds in-progress strokes (redrawn every
// frame), `committed` accumulates finished strokes as a flat bitmap so
// render cost doesn't grow with a turn's total stroke count.
export class StrokeRenderer {
  private active = new Map<string, TrackedStroke>();
  // Strokes and fills interleaved in the order they were performed — replay
  // must preserve that order (a fill only makes sense relative to whatever
  // was already drawn onto the canvas at the time it ran).
  private committed: CommittedItem[] = [];

  constructor(
    private committedCtx: CanvasRenderingContext2D,
    private liveCtx: CanvasRenderingContext2D,
    private getCanvasSize: () => { width: number; height: number }
  ) {}

  handleStart(payload: StrokeStartPayload): void {
    this.active.set(payload.strokeId, {
      kind: "stroke",
      id: payload.strokeId,
      tool: payload.tool,
      color: payload.color,
      size: payload.size,
      points: [payload.point],
    });
    this.renderLiveLayer();
  }

  handlePoints(payload: StrokePointPayload): void {
    const s = this.active.get(payload.strokeId);
    if (!s) return;
    s.points.push(...payload.points);
    this.renderLiveLayer();
  }

  handleEnd(payload: StrokeEndPayload): void {
    const s = this.active.get(payload.strokeId);
    if (!s) return;
    this.active.delete(payload.strokeId);
    this.committed.push(s);
    this.drawStrokeOnto(this.committedCtx, s);
    this.renderLiveLayer();
  }

  // Fill has no drag/live phase — it's applied straight onto the committed
  // layer and recorded for replay (undo/resize), same as a finished stroke.
  handleFill(payload: DrawFillPayload): void {
    this.committed.push({ kind: "fill", id: payload.strokeId, point: payload.point, color: payload.color });
    this.applyFill(this.committedCtx, payload.point, payload.color);
  }

  // Catch-up for a mid-game joiner/reconnect — see DrawSnapshotPayload.
  // Ops arrive already-finished (no active/in-progress entries), so this
  // slots straight into `committed` and replays, same as handleUndo/resize.
  handleSnapshot(ops: CommittedDrawOp[]): void {
    this.committed = ops.map((op) =>
      op.kind === "stroke"
        ? { kind: "stroke", id: op.strokeId, tool: op.tool, color: op.color, size: op.size, points: op.points }
        : { kind: "fill", id: op.strokeId, point: op.point, color: op.color }
    );
    this.replayCommitted();
  }

  handleClear(): void {
    this.active.clear();
    this.committed = [];
    const { width, height } = this.getCanvasSize();
    this.committedCtx.clearRect(0, 0, width, height);
    this.renderLiveLayer();
  }

  // Server tells us exactly which committed stroke/fill to remove; cheapest
  // correct approach is replaying everything remaining (a turn's op count is
  // small, so this is not a real perf concern in Phase 1).
  handleUndo(strokeId: string): void {
    this.committed = this.committed.filter((item) => item.id !== strokeId);
    this.replayCommitted();
  }

  // Points are stored normalized (0..1), so a resize just needs a redraw at
  // the new pixel size — no coordinate migration required.
  handleResize(): void {
    this.replayCommitted();
    this.renderLiveLayer();
  }

  private replayCommitted(): void {
    const { width, height } = this.getCanvasSize();
    this.committedCtx.clearRect(0, 0, width, height);
    for (const item of this.committed) {
      if (item.kind === "stroke") this.drawStrokeOnto(this.committedCtx, item);
      else this.applyFill(this.committedCtx, item.point, item.color);
    }
  }

  private applyFill(ctx: CanvasRenderingContext2D, point: StrokePoint, color: string): void {
    const { width, height } = this.getCanvasSize();
    floodFill(ctx, point.x * width, point.y * height, color, width, height);
  }

  private renderLiveLayer(): void {
    const { width, height } = this.getCanvasSize();
    this.liveCtx.clearRect(0, 0, width, height);
    for (const s of this.active.values()) this.drawStrokeOnto(this.liveCtx, s);
  }

  private drawStrokeOnto(ctx: CanvasRenderingContext2D, s: TrackedStroke): void {
    const { width, height } = this.getCanvasSize();
    const pixelPoints = s.points.map((p) => ({
      x: p.x * width,
      y: p.y * height,
      pressure: p.pressure,
    }));
    // `size` is a normalized 1..40 unit; scale relative to a 600px baseline
    // width so brush thickness looks consistent across canvas sizes.
    const pxSize = (s.size / 600) * width;
    const path = strokeToPath2D(pixelPoints, pxSize);

    ctx.save();
    if (s.tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = s.color;
    }
    ctx.fill(path);
    ctx.restore();
  }
}
