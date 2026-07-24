// Phase 3 legacy titles — display names only, single source of truth shared
// by the server (which decides which ids unlock, see server/src/db/
// titlesRepo.ts) and the client (which just needs to render a badge label).
export const TITLE_NAMES: Record<string, string> = {
  first_win: "First Win",
  ten_games: "Regular",
  fifty_games: "Veteran",
  hundred_correct: "Century Club",
  five_hundred_correct: "Word Wizard",
  fifty_rounds_drawn: "Prolific Artist",
  ten_wins: "Champion",
  ten_thousand_points: "High Scorer",
};

export function getTitleName(titleId: string): string {
  return TITLE_NAMES[titleId] ?? titleId;
}
