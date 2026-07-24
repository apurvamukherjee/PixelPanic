import { useEffect, useState } from "react";
import { useFeedbackStore } from "../../store/useFeedbackStore";
import { Icon } from "../shared/Icon";

const VISIBLE_MS = 1200;

// Fires once per private GUESS_CORRECT the local player receives — see
// useFeedbackStore. Purely decorative; the real score change already
// travels through SCORE_UPDATE/PlayerList's .score-pop.
export function GuessCorrectAnimation() {
  const correctGuessSignal = useFeedbackStore((s) => s.correctGuessSignal);
  const pointsAwarded = useFeedbackStore((s) => s.pointsAwarded);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (correctGuessSignal === 0) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), VISIBLE_MS);
    return () => clearTimeout(t);
  }, [correctGuessSignal]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <div className="guess-celebrate glass flex flex-col items-center gap-1 rounded-3xl border-success/40 bg-success/20 px-10 py-7 text-center">
        <Icon name="check_circle" filled className="!text-4xl text-success" />
        <span className="font-display text-2xl font-extrabold text-success">Correct!</span>
        <span className="font-mono text-sm text-on-surface">+{pointsAwarded} points</span>
      </div>
    </div>
  );
}
