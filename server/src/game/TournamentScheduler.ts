import type { TournamentMatch } from "@pixelpanic/shared";

// Pure round-robin pairing via the classic "circle method": fix the first
// player, rotate everyone else around them for N-1 rounds (N rounds with a
// bye if the player count is odd). Every round's pairs share no players, so
// they could in principle run concurrently — the simplification this app
// makes is running them one at a time in this order instead of building a
// second, simultaneous-canvas game loop (see HANDOFF.md / plan notes).
const BYE = Symbol("bye");

export function generateRoundRobinSchedule(
  anonIds: string[]
): { round: number; playerAnonIds: [string, string] }[] {
  const players: (string | typeof BYE)[] = [...anonIds];
  if (players.length % 2 !== 0) players.push(BYE);

  const n = players.length;
  const rounds = n - 1;
  const half = n / 2;
  const schedule: { round: number; playerAnonIds: [string, string] }[] = [];

  let arr = [...players];
  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < half; i++) {
      const a = arr[i]!;
      const b = arr[n - 1 - i]!;
      if (a !== BYE && b !== BYE) {
        schedule.push({ round, playerAnonIds: [a, b] });
      }
    }
    const fixed = arr[0]!;
    const rest = arr.slice(1);
    rest.unshift(rest.pop()!);
    arr = [fixed, ...rest];
  }
  return schedule;
}

// "Match scheduler": decide which pending match plays next. Schedule order
// already keeps each round's pairs player-disjoint, so "next pending in
// order" is a complete, deterministic answer to "which pair plays next."
export function pickNextMatch(matches: TournamentMatch[]): TournamentMatch | null {
  return matches.find((m) => m.status === "pending") ?? null;
}
