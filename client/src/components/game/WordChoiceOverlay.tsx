import { useEffect, useRef, useState } from "react";
import { ClientEvents } from "@pixelpanic/shared";
import { useGameStore } from "../../store/useGameStore";
import { useConnectionStore } from "../../store/useConnectionStore";
import { Button } from "../shared/Button";

const RING_RADIUS = 20;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// Small radial countdown ring, same urgent-at-<3s color cue as CountdownBar.
// WORD_CHOICE_TIMEOUT_MS itself lives server-side only (RoomInstance.ts) —
// rather than hardcode a copy of it here, the total is captured from the
// first tick after each wordChoices payload arrives (deadline - now, which
// is ~the full window minus network latency), so the ring self-adjusts if
// that constant ever changes.
function CountdownRing({ remainingMs, totalMs }: { remainingMs: number; totalMs: number }) {
  const pct = totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0;
  const isUrgent = remainingMs < 3000;
  return (
    <svg width={48} height={48} className="-rotate-90">
      <circle cx={24} cy={24} r={RING_RADIUS} className="fill-none stroke-surface-variant" strokeWidth={4} />
      <circle
        cx={24}
        cy={24}
        r={RING_RADIUS}
        strokeWidth={4}
        strokeLinecap="round"
        className={`fill-none transition-[stroke-dashoffset] duration-200 ${isUrgent ? "stroke-error" : "stroke-primary"}`}
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset={RING_CIRCUMFERENCE * (1 - pct)}
      />
    </svg>
  );
}

export function WordChoiceOverlay() {
  const phase = useGameStore((s) => s.phase);
  const wordChoices = useGameStore((s) => s.wordChoices);
  const socket = useConnectionStore((s) => s.socket);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [remainingMs, setRemainingMs] = useState(0);
  const totalMsRef = useRef(0);

  useEffect(() => {
    if (!wordChoices) return;
    totalMsRef.current = 0;
    const tick = () => {
      const ms = Math.max(0, wordChoices.deadline - Date.now());
      if (totalMsRef.current === 0) totalMsRef.current = ms;
      setRemainingMs(ms);
      setSecondsLeft(Math.round(ms / 1000));
    };
    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [wordChoices]);

  // Only the drawer's client ever receives `wordChoices` (server sends it as
  // a private emit) — its mere presence during the wordChoice phase is what
  // tells us "I'm the drawer", since `turn.drawerId` isn't populated until
  // TURN_START fires (after a word is chosen), so it can't be used here.
  if (phase !== "wordChoice") return null;

  const choose = (word: string) => socket?.emit(ClientEvents.WORD_CHOOSE, { word });

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="glass flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl p-8">
        {wordChoices ? (
          <>
            <div className="relative flex items-center justify-center">
              <CountdownRing remainingMs={remainingMs} totalMs={totalMsRef.current} />
              <span className="absolute font-mono text-sm font-bold text-on-surface">{secondsLeft}</span>
            </div>
            <div className="font-display text-lg font-bold text-on-surface">Pick a word</div>
            <div className="flex w-full flex-col gap-2">
              {wordChoices.words.map((word) => (
                <Button
                  key={word}
                  data-testid="word-choice"
                  onClick={() => choose(word)}
                  className="w-full capitalize"
                >
                  {word}
                </Button>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center text-on-surface-variant">Waiting for the drawer to choose a word…</div>
        )}
      </div>
    </div>
  );
}
