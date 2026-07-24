import { describe, it, expect } from "vitest";
import { computeGuesserPoints, applyScoreMultipliers, SCORING } from "./scoring.js";

describe("computeGuesserPoints", () => {
  it("awards full base points at the instant the turn starts", () => {
    expect(computeGuesserPoints(0, 80)).toBe(SCORING.BASE_POINTS);
  });

  it("decays linearly toward the floor as time elapses", () => {
    expect(computeGuesserPoints(40, 80)).toBe(50); // halfway
  });

  it("never drops below MIN_POINTS even if elapsed exceeds drawTimeSec", () => {
    expect(computeGuesserPoints(200, 80)).toBe(SCORING.MIN_POINTS);
  });
});

describe("applyScoreMultipliers", () => {
  it("returns the base points unchanged with no chaos modifiers", () => {
    expect(applyScoreMultipliers(100, {})).toBe(100);
  });

  it("applies the flat bounty multiplier", () => {
    expect(applyScoreMultipliers(100, { isBounty: true })).toBe(100 * SCORING.BOUNTY_MULTIPLIER);
  });

  it("ramps the momentum multiplier linearly up to the streak cap", () => {
    const atCap = applyScoreMultipliers(100, { momentumStreak: SCORING.MOMENTUM_STREAK_FOR_MAX });
    expect(atCap).toBe(100 * SCORING.MOMENTUM_MAX_MULTIPLIER);

    const halfway = applyScoreMultipliers(100, {
      momentumStreak: SCORING.MOMENTUM_STREAK_FOR_MAX / 2,
    });
    expect(halfway).toBeGreaterThan(100);
    expect(halfway).toBeLessThan(atCap);
  });

  it("does not exceed the momentum cap beyond the threshold streak", () => {
    const atCap = applyScoreMultipliers(100, { momentumStreak: SCORING.MOMENTUM_STREAK_FOR_MAX });
    const beyond = applyScoreMultipliers(100, { momentumStreak: SCORING.MOMENTUM_STREAK_FOR_MAX * 3 });
    expect(beyond).toBe(atCap);
  });

  it("stacks bounty and momentum multiplicatively", () => {
    const bountyOnly = applyScoreMultipliers(100, { isBounty: true });
    const both = applyScoreMultipliers(100, {
      isBounty: true,
      momentumStreak: SCORING.MOMENTUM_STREAK_FOR_MAX,
    });
    expect(both).toBe(bountyOnly * SCORING.MOMENTUM_MAX_MULTIPLIER);
  });
});
