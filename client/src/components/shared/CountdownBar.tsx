import { useEffect, useState } from "react";
import { useGameStore } from "../../store/useGameStore";

interface CountdownBarProps {
  totalSec: number;
}

// The server is the sole timer authority — this just renders
// `turnEndsAt - now` locally between periodic server resyncs (see
// TIMER_TICK), so it stays accurate without the client running its own
// independent countdown logic that could drift.
export function CountdownBar({ totalSec }: CountdownBarProps) {
  const turnEndsAt = useGameStore((s) => s.turn?.turnEndsAt ?? null);
  const clockOffsetMs = useGameStore((s) => s.clockOffsetMs);
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (!turnEndsAt) return;
    const tick = () => setRemainingMs(Math.max(0, turnEndsAt - (Date.now() + clockOffsetMs)));
    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [turnEndsAt, clockOffsetMs]);

  const pct = Math.max(0, Math.min(100, (remainingMs / 1000 / totalSec) * 100));
  const isUrgent = remainingMs < 10_000;

  return (
    <div className="h-2 w-full rounded-full bg-surface-variant overflow-hidden">
      <div
        className={`h-full rounded-full transition-[width] duration-200 ${
          isUrgent ? "bg-error shadow-[0_0_8px_rgba(255,180,171,0.6)]" : "bg-primary"
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
