import type {
  DrawTool,
  StrokePoint,
  StrokeStartPayload,
  StrokePointPayload,
  StrokeEndPayload,
} from "@pixelpanic/shared";
import { strokeToPath2D } from "./perfectFreehandRender";

interface TrackedStroke {
  id: string;
  tool: DrawTool;
  color: string;
  size: number;
  points: StrokePoint[];
}

// Renders every stroke event coming back from the server — including the
// drawer's own strokes, since `io.to(room).emit` echoes to the sender too.
// A single source of truth avoids double-rendering the drawer's own lines.
// Two-canvas technique: `live` holds in-progress strokes (redrawn every
// frame), `committed` accumulates finished strokes as a flat bitmap so
// render cost doesn't grow with a turn's total stroke count.
export class StrokeRenderer {
  private active = new Map<string, TrackedStroke>();
  private committed: TrackedStroke[] = [];

  constructor(
    private committedCtx: CanvasRenderingContext2D,
    private liveCtx: CanvasRenderingContext2D,
    private getCanvasSize: () => { width: number; height: number }
  ) {}

  handleStart(payload: StrokeStartPayload): void {
    this.active.set(payload.strokeId, {
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

  handleClear(): void {
    this.active.clear();
    this.committed = [];
    const { width, height } = this.getCanvasSize();
    this.committedCtx.clearRect(0, 0, width, height);
    this.renderLiveLayer();
  }

  // Server tells us exactly which committed stroke to remove; cheapest
  // correct approach is replaying all remaining strokes (a turn's stroke
  // count is small, so this is not a real perf concern in Phase 1).
  handleUndo(strokeId: string): void {
    this.committed = this.committed.filter((s) => s.id !== strokeId);
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
    for (const s of this.committed) this.drawStrokeOnto(this.committedCtx, s);
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
