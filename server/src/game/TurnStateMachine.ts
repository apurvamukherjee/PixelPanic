// Pure helpers for advancing turn/round indices. "Round count" = number of
// full passes through all current drawers (roundCount 3, 5 players = 15 turns).
export interface TurnIndices {
  roundIndex: number;
  turnIndexInRound: number;
}

export function initialTurnIndices(): TurnIndices {
  return { roundIndex: 0, turnIndexInRound: 0 };
}

export function nextTurnIndices(
  current: TurnIndices,
  playerCount: number,
  totalRounds: number
): { indices: TurnIndices; isGameEnd: boolean } {
  const nextTurnInRound = current.turnIndexInRound + 1;

  if (nextTurnInRound < playerCount) {
    return {
      indices: { roundIndex: current.roundIndex, turnIndexInRound: nextTurnInRound },
      isGameEnd: false,
    };
  }

  const nextRound = current.roundIndex + 1;
  if (nextRound < totalRounds) {
    return {
      indices: { roundIndex: nextRound, turnIndexInRound: 0 },
      isGameEnd: false,
    };
  }

  return { indices: current, isGameEnd: true };
}
