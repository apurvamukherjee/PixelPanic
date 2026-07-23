import { useEffect, useRef } from "react";
import {
  ClientEvents,
  ServerEvents,
  type StrokeStartPayload,
  type StrokePointPayload,
  type StrokeEndPayload,
  type DrawFillPayload,
  type DrawUndoPayload,
} from "@pixelpanic/shared";
import { useConnectionStore } from "../../store/useConnectionStore";
import { useGameStore } from "../../store/useGameStore";
import { useRoomStore } from "../../store/useRoomStore";
import { useDrawingStore } from "../../store/useDrawingStore";
import { attachStrokeCapture } from "../../canvas/strokeCapture";
import { StrokeRenderer } from "../../canvas/remoteStrokeRenderer";

// The drawer's own strokes are rendered purely from the server's echoed
// broadcast (io.to(room).emit includes the sender), not drawn locally first —
// one source of truth, avoids double-render/drift bugs between local and
// remote rendering paths.
export function DrawingCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const committedRef = useRef<HTMLCanvasElement>(null);
  const liveRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<StrokeRenderer | null>(null);

  const socket = useConnectionStore((s) => s.socket);
  const mySocketId = useRoomStore((s) => s.mySocketId);
  const drawerId = useGameStore((s) => s.turn?.drawerId ?? null);
  const isDrawer = drawerId !== null && drawerId === mySocketId;

  useEffect(() => {
    const container = containerRef.current;
    const committedCanvas = committedRef.current;
    const liveCanvas = liveRef.current;
    if (!container || !committedCanvas || !liveCanvas) return;

    const committedCtx = committedCanvas.getContext("2d");
    const liveCtx = liveCanvas.getContext("2d");
    if (!committedCtx || !liveCtx) return;

    const getCanvasSize = () => ({
      width: committedCanvas.width,
      height: committedCanvas.height,
    });
    const renderer = new StrokeRenderer(committedCtx, liveCtx, getCanvasSize);
    rendererRef.current = renderer;

    function resizeCanvases() {
      const dpr = window.devicePixelRatio || 1;
      const rect = container!.getBoundingClientRect();
      committedCanvas!.width = Math.round(rect.width * dpr);
      committedCanvas!.height = Math.round(rect.height * dpr);
      liveCanvas!.width = Math.round(rect.width * dpr);
      liveCanvas!.height = Math.round(rect.height * dpr);
      renderer.handleResize();
    }
    resizeCanvases();

    const resizeObserver = new ResizeObserver(resizeCanvases);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onStart = (p: StrokeStartPayload) => rendererRef.current?.handleStart(p);
    const onPoints = (p: StrokePointPayload) => rendererRef.current?.handlePoints(p);
    const onEnd = (p: StrokeEndPayload) => rendererRef.current?.handleEnd(p);
    const onFill = (p: DrawFillPayload) => rendererRef.current?.handleFill(p);
    const onClear = () => rendererRef.current?.handleClear();
    const onUndo = (p: DrawUndoPayload) => rendererRef.current?.handleUndo(p.strokeId);

    socket.on(ServerEvents.DRAW_STROKE_START, onStart);
    socket.on(ServerEvents.DRAW_STROKE_POINT, onPoints);
    socket.on(ServerEvents.DRAW_STROKE_END, onEnd);
    socket.on(ServerEvents.DRAW_FILL, onFill);
    socket.on(ServerEvents.DRAW_CLEAR, onClear);
    socket.on(ServerEvents.DRAW_UNDO, onUndo);

    return () => {
      socket.off(ServerEvents.DRAW_STROKE_START, onStart);
      socket.off(ServerEvents.DRAW_STROKE_POINT, onPoints);
      socket.off(ServerEvents.DRAW_STROKE_END, onEnd);
      socket.off(ServerEvents.DRAW_FILL, onFill);
      socket.off(ServerEvents.DRAW_CLEAR, onClear);
      socket.off(ServerEvents.DRAW_UNDO, onUndo);
    };
  }, [socket]);

  useEffect(() => {
    if (!isDrawer || !socket) return;
    const canvas = liveRef.current;
    if (!canvas) return;

    const detach = attachStrokeCapture(canvas, {
      getTool: () => useDrawingStore.getState().tool,
      getColor: () => useDrawingStore.getState().color,
      getSize: () => useDrawingStore.getState().size,
      onStart: (strokeId, tool, color, size, point) => {
        socket.emit(ClientEvents.DRAW_STROKE_START, { strokeId, tool, color, size, point });
      },
      onPoints: (strokeId, points) => {
        socket.emit(ClientEvents.DRAW_STROKE_POINT, { strokeId, points });
      },
      onEnd: (strokeId) => {
        socket.emit(ClientEvents.DRAW_STROKE_END, { strokeId });
      },
      onFill: (opId, point, color) => {
        socket.emit(ClientEvents.DRAW_FILL, { strokeId: opId, point, color });
      },
    });

    return detach;
  }, [isDrawer, socket]);

  return (
    <div
      ref={containerRef}
      data-testid="drawing-canvas"
      className="relative aspect-[4/3] w-full touch-none overflow-hidden rounded-2xl border border-white/10 bg-white shadow-[inset_0_0_40px_rgba(0,0,0,0.5)]"
    >
      <canvas ref={committedRef} className="absolute inset-0 h-full w-full" />
      <canvas
        ref={liveRef}
        data-testid="live-canvas"
        className="absolute inset-0 h-full w-full"
        style={{ pointerEvents: isDrawer ? "auto" : "none", touchAction: "none" }}
      />
    </div>
  );
}
