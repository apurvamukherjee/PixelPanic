import { useEffect, useState } from "react";
import { useFeedbackStore } from "../../store/useFeedbackStore";
import { useGameStore } from "../../store/useGameStore";
import { Icon } from "../shared/Icon";

const VISIBLE_MS = 1200;

// Fires once per private GUESS_CORRECT the local player receives — see
// useFeedbackStore. A top toast, not a centered modal: drawing/guessing for
// everyone else keeps going underneath it, so it must never block the
// canvas. It also self-dismisses the instant `phase` leaves "drawing" —
// when the local guess is the *last* one needed, RoomInstance ends the turn
// synchronously right after GUESS_CORRECT, so ROUND_END can land a beat
// later while this is still on screen. Without that guard, this toast and
// RoundEndOverlay's own "You got it!" badge would render on top of each
// other for a moment instead of handing off cleanly.
export function GuessCorrectAnimation() {
  const correctGuessSignal = useFeedbackStore((s) => s.correctGuessSignal);
  const pointsAwarded = useFeedbackStore((s) => s.pointsAwarded);
  const phase = useGameStore((s) => s.phase);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (correctGuessSignal === 0) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), VISIBLE_MS);
    return () => clearTimeout(t);
  }, [correctGuessSignal]);

  useEffect(() => {
    if (phase !== "drawing") setVisible(false);
  }, [phase]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center">
      <div className="guess-celebrate glass flex items-center gap-2 rounded-full border-success/40 bg-success/20 px-5 py-2.5">
        <Icon name="check_circle" filled className="!text-xl text-success" />
        <span className="font-display text-base font-bold text-success">Correct!</span>
        <span className="font-mono text-sm text-on-surface">+{pointsAwarded}</span>
      </div>
    </div>
  );
}
