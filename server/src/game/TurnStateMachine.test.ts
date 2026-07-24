import { describe, it, expect } from "vitest";
import { initialTurnIndices, nextTurnIndices } from "./TurnStateMachine.js";

describe("TurnStateMachine", () => {
  it("starts at round 0, turn 0", () => {
    expect(initialTurnIndices()).toEqual({ roundIndex: 0, turnIndexInRound: 0 });
  });

  it("advances turnIndexInRound within a round", () => {
    const { indices, isGameEnd } = nextTurnIndices({ roundIndex: 0, turnIndexInRound: 0 }, 3, 2);
    expect(indices).toEqual({ roundIndex: 0, turnIndexInRound: 1 });
    expect(isGameEnd).toBe(false);
  });

  it("wraps to the next round when turnIndexInRound overflows playerCount", () => {
    const { indices, isGameEnd } = nextTurnIndices({ roundIndex: 0, turnIndexInRound: 2 }, 3, 2);
    expect(indices).toEqual({ roundIndex: 1, turnIndexInRound: 0 });
    expect(isGameEnd).toBe(false);
  });

  it("signals game end once roundIndex would overflow totalRounds", () => {
    const current = { roundIndex: 1, turnIndexInRound: 2 };
    const { indices, isGameEnd } = nextTurnIndices(current, 3, 2);
    expect(isGameEnd).toBe(true);
    expect(indices).toEqual(current); // unchanged, per the "freeze at game end" contract
  });

  it("covers a full 2-round, 3-player game turn-by-turn", () => {
    let indices = initialTurnIndices();
    const seen: { roundIndex: number; turnIndexInRound: number }[] = [indices];
    for (let i = 0; i < 5; i++) {
      const result = nextTurnIndices(indices, 3, 2);
      expect(result.isGameEnd).toBe(false);
      indices = result.indices;
      seen.push(indices);
    }
    expect(seen).toEqual([
      { roundIndex: 0, turnIndexInRound: 0 },
      { roundIndex: 0, turnIndexInRound: 1 },
      { roundIndex: 0, turnIndexInRound: 2 },
      { roundIndex: 1, turnIndexInRound: 0 },
      { roundIndex: 1, turnIndexInRound: 1 },
      { roundIndex: 1, turnIndexInRound: 2 },
    ]);
    expect(nextTurnIndices(indices, 3, 2).isGameEnd).toBe(true);
  });
});
