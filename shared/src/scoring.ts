// Kept in `shared` (not just server) so the client can optionally preview
// "how many points is this guess worth right now" without duplicating the formula.
export const SCORING = {
  BASE_POINTS: 100,
  MIN_POINTS: 10,
  DRAWER_POINTS_PER_CORRECT_GUESSER: 50,
  DRAWER_BONUS_ALL_GUESSED: 50,
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
