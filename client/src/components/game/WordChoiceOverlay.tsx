import { useEffect, useState } from "react";
import { ClientEvents } from "@pixelpanic/shared";
import { useGameStore } from "../../store/useGameStore";
import { useConnectionStore } from "../../store/useConnectionStore";
import { Button } from "../shared/Button";

export function WordChoiceOverlay() {
  const phase = useGameStore((s) => s.phase);
  const wordChoices = useGameStore((s) => s.wordChoices);
  const socket = useConnectionStore((s) => s.socket);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!wordChoices) return;
    const tick = () => setSecondsLeft(Math.max(0, Math.round((wordChoices.deadline - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 500);
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
            <div className="font-display text-lg font-bold text-on-surface">
              Pick a word <span className="font-mono text-primary">({secondsLeft}s)</span>
            </div>
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
