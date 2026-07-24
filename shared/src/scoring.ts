// Kept in `shared` (not just server) so the client can optionally preview
// "how many points is this guess worth right now" without duplicating the formula.
export const SCORING = {
  BASE_POINTS: 100,
  MIN_POINTS: 10,
  DRAWER_POINTS_PER_CORRECT_GUESSER: 50,
  DRAWER_BONUS_ALL_GUESSED: 50,
  // Phase 3 chaos-mode multipliers.
  BOUNTY_MULTIPLIER: 5,
  MOMENTUM_MAX_MULTIPLIER: 2, // reached at MOMENTUM_STREAK_FOR_MAX consecutive correct guesses
  MOMENTUM_STREAK_FOR_MAX: 5,
  MASHUP_VOTE_BONUS: 30,
  SABOTAGE_STREAK_THRESHOLD: 3, // streak length that grants a powerup
} as const;

// Linear decay from BASE_POINTS down to a floor of MIN_POINTS over the turn's
// draw time — chosen over a curve-based formula for simplicity/tunability.
export function computeGuesserPoints(
  secondsElapsedInTurn: number,
  drawTimeSec: number
): number {
  const remainingFrac = Math.max(0, 1 - secondsElapsedInTurn / drawTimeSec);
  return Math.max(
    SCORING.MIN_POINTS,
    Math.round(SCORING.BASE_POINTS * remainingFrac)
  );
}

// Momentum ramps linearly from 1x (streak 0-1) to MOMENTUM_MAX_MULTIPLIER at
// MOMENTUM_STREAK_FOR_MAX+ consecutive correct guesses. Bounty is a flat
// multiplier on top. Multipliers are applied here (not baked into
// computeGuesserPoints) so Phase 1/2 code paths that never pass chaos state
// stay byte-identical.
export function applyScoreMultipliers(
  basePoints: number,
  opts: { isBounty?: boolean; momentumStreak?: number } = {}
): number {
  let multiplier = 1;
  if (opts.momentumStreak && opts.momentumStreak > 0) {
    const frac = Math.min(1, opts.momentumStreak / SCORING.MOMENTUM_STREAK_FOR_MAX);
    multiplier *= 1 + frac * (SCORING.MOMENTUM_MAX_MULTIPLIER - 1);
  }
  if (opts.isBounty) {
    multiplier *= SCORING.BOUNTY_MULTIPLIER;
  }
  return Math.round(basePoints * multiplier);
}
