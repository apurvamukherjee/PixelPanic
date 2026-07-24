import { describe, it, expect } from "vitest";
import { buildTeamInterleavedRotation } from "./TeamRotation.js";

describe("buildTeamInterleavedRotation", () => {
  it("interleaves evenly-sized teams strictly alternating", () => {
    const players = [
      { anonId: "a1", teamId: "A" },
      { anonId: "a2", teamId: "A" },
      { anonId: "b1", teamId: "B" },
      { anonId: "b2", teamId: "B" },
    ];
    const rotation = buildTeamInterleavedRotation(players, ["A", "B"]);
    expect(rotation).toEqual(["a1", "b1", "a2", "b2"]);
  });

  it("never lets a team go twice before every non-empty team has gone once (uneven sizes)", () => {
    const players = [
      { anonId: "solo", teamId: "A" },
      { anonId: "b1", teamId: "B" },
      { anonId: "b2", teamId: "B" },
      { anonId: "b3", teamId: "B" },
    ];
    const rotation = buildTeamInterleavedRotation(players, ["A", "B"]);
    expect(rotation).toEqual(["solo", "b1", "b2", "b3"]);
    // Team A (1 player) exhausts after turn 0; team B keeps going without
    // A ever getting a second turn in the same pass.
    expect(rotation.indexOf("solo")).toBe(0);
  });

  it("skips unassigned players (teamId: null)", () => {
    const players = [
      { anonId: "a1", teamId: "A" },
      { anonId: "unassigned", teamId: null },
      { anonId: "b1", teamId: "B" },
    ];
    const rotation = buildTeamInterleavedRotation(players, ["A", "B"]);
    expect(rotation).toEqual(["a1", "b1"]);
  });

  it("returns an empty rotation when no teams have players", () => {
    expect(buildTeamInterleavedRotation([], ["A", "B"])).toEqual([]);
  });
});
