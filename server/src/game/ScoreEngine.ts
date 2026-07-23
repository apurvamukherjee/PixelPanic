import { SCORING, computeGuesserPoints, type Player, type Team } from "@pixelpanic/shared";

export const ScoreEngine = {
  guesserPoints(secondsElapsedInTurn: number, drawTimeSec: number): number {
    return computeGuesserPoints(secondsElapsedInTurn, drawTimeSec);
  },

  drawerPointsForGuesser(): number {
    return SCORING.DRAWER_POINTS_PER_CORRECT_GUESSER;
  },

  drawerAllGuessedBonus(): number {
    return SCORING.DRAWER_BONUS_ALL_GUESSED;
  },

  // Team score = average of member scores (not sum) — per spec, used
  // everywhere a team total is computed or displayed. Derived on demand from
  // Player.score, never stored, so there's only one source of truth.
  computeTeamScoreboard(players: Player[], teams: Team[]): Record<string, number> {
    const result: Record<string, number> = {};
    for (const team of teams) {
      const members = players.filter((p) => p.teamId === team.id);
      result[team.id] =
        members.length === 0 ? 0 : members.reduce((sum, p) => sum + p.score, 0) / members.length;
    }
    return result;
  },
};
