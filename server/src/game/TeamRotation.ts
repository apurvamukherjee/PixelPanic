// Pure helper for team-mode drawer rotation. Builds one round's rotation
// order by round-robin-interleaving each team's player bucket (team order
// preserved from `teamOrder`, player order preserved within each bucket) so
// no team goes twice before every team with players left has gone once —
// this is what makes rotation fair regardless of uneven team sizes.
// TurnStateMachine's nextTurnIndices()/initialTurnIndices() are untouched;
// they only ever consume the resulting array's length.
export function buildTeamInterleavedRotation(
  players: { anonId: string; teamId: string | null }[],
  teamOrder: string[]
): string[] {
  const buckets = new Map<string, string[]>();
  for (const teamId of teamOrder) buckets.set(teamId, []);
  for (const p of players) {
    if (p.teamId === null) continue;
    buckets.get(p.teamId)?.push(p.anonId);
  }

  const rotation: string[] = [];
  let remaining = true;
  while (remaining) {
    remaining = false;
    for (const teamId of teamOrder) {
      const bucket = buckets.get(teamId)!;
      const next = bucket.shift();
      if (next !== undefined) {
        rotation.push(next);
        remaining = true;
      }
    }
  }
  return rotation;
}
