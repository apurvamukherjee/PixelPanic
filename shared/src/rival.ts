// Phase 3 retention feature. V1 scope per PHASE3-PLAN.md: a stat comparison
// between auto-paired players (closest lifetime avg score), not a dedicated
// head-to-head match log — that's a reasonable v2 if it turns out to matter.
export interface RivalSummary {
  rivalAnonId: string;
  rivalName: string;
  myWinRate: number; // 0..1
  rivalWinRate: number;
  myAvgScore: number;
  rivalAvgScore: number;
  rivalOnline: boolean;
}
