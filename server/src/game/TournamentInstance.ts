import { randomUUID } from "node:crypto";
import type { TournamentMatch, TournamentStanding, TournamentState } from "@pixelpanic/shared";
import { generateRoundRobinSchedule, pickNextMatch } from "./TournamentScheduler.js";
import { recordTournamentResult } from "../db/tournamentRepo.js";
import { logger } from "../utils/logger.js";

// Narrow structural interface RoomInstance satisfies — kept separate so this
// file never imports RoomInstance.ts (which would own a TournamentInstance
// field), avoiding a circular module dependency.
export interface TournamentHost {
  startMatch(anonA: string, anonB: string, onComplete: (scores: Record<string, number>) => void): void;
  broadcastTournamentState(tournament: TournamentState): void;
  broadcastTournamentMatchStart(matchId: string, playerAnonIds: [string, string]): void;
  broadcastTournamentComplete(tournament: TournamentState): void;
}

export class TournamentInstance {
  private matches: TournamentMatch[];
  private currentMatchId: string | null = null;
  private isComplete = false;
  private readonly participantOrder: string[];
  private readonly nameByAnonId = new Map<string, string>();

  constructor(
    private host: TournamentHost,
    private roomCode: string,
    participants: { anonId: string; name: string }[]
  ) {
    this.participantOrder = participants.map((p) => p.anonId);
    for (const p of participants) this.nameByAnonId.set(p.anonId, p.name);

    const schedule = generateRoundRobinSchedule(this.participantOrder);
    this.matches = schedule.map((m) => ({
      id: randomUUID(),
      round: m.round,
      playerAnonIds: m.playerAnonIds,
      status: "pending",
      scores: null,
      winnerAnonId: null,
    }));
  }

  start(): void {
    this.advance();
  }

  private advance(): void {
    const next = pickNextMatch(this.matches);
    if (!next) {
      this.isComplete = true;
      this.currentMatchId = null;
      const state = this.getState();
      this.host.broadcastTournamentComplete(state);
      try {
        recordTournamentResult(this.roomCode, this.matches);
      } catch (err) {
        logger.error("Failed to persist tournament result", err);
      }
      return;
    }

    next.status = "active";
    this.currentMatchId = next.id;
    this.host.broadcastTournamentMatchStart(next.id, next.playerAnonIds);
    this.host.broadcastTournamentState(this.getState());
    this.host.startMatch(next.playerAnonIds[0], next.playerAnonIds[1], (scores) =>
      this.onMatchComplete(next.id, scores)
    );
  }

  private onMatchComplete(matchId: string, scores: Record<string, number>): void {
    const match = this.matches.find((m) => m.id === matchId);
    if (!match) return;
    const [a, b] = match.playerAnonIds;
    match.status = "complete";
    match.scores = scores;
    const scoreA = scores[a] ?? 0;
    const scoreB = scores[b] ?? 0;
    match.winnerAnonId = scoreA === scoreB ? null : scoreA > scoreB ? a : b;
    this.advance();
  }

  private headToHeadResult(a: string, b: string): number {
    const match = this.matches.find(
      (m) => m.status === "complete" && m.playerAnonIds.includes(a) && m.playerAnonIds.includes(b)
    );
    if (!match || !match.winnerAnonId) return 0;
    return match.winnerAnonId === a ? -1 : 1;
  }

  // Tiebreaker (documented per spec's explicit ask): wins desc -> head-to-head
  // result (only decisive between exactly the two players being compared) ->
  // point differential desc -> total points scored desc -> stable join order.
  private computeStandings(): TournamentStanding[] {
    const rows = new Map<string, TournamentStanding>();
    for (const anonId of this.participantOrder) {
      rows.set(anonId, {
        anonId,
        name: this.nameByAnonId.get(anonId) ?? "Player",
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        pointDiff: 0,
      });
    }
    for (const m of this.matches) {
      if (m.status !== "complete" || !m.scores) continue;
      const [a, b] = m.playerAnonIds;
      const sa = m.scores[a] ?? 0;
      const sb = m.scores[b] ?? 0;
      const rowA = rows.get(a)!;
      const rowB = rows.get(b)!;
      rowA.pointsFor += sa;
      rowB.pointsFor += sb;
      rowA.pointDiff += sa - sb;
      rowB.pointDiff += sb - sa;
      if (m.winnerAnonId === a) {
        rowA.wins += 1;
        rowB.losses += 1;
      } else if (m.winnerAnonId === b) {
        rowB.wins += 1;
        rowA.losses += 1;
      } else {
        rowA.ties += 1;
        rowB.ties += 1;
      }
    }

    return [...rows.values()].sort((x, y) => {
      if (y.wins !== x.wins) return y.wins - x.wins;
      const h2h = this.headToHeadResult(x.anonId, y.anonId);
      if (h2h !== 0) return h2h;
      if (y.pointDiff !== x.pointDiff) return y.pointDiff - x.pointDiff;
      if (y.pointsFor !== x.pointsFor) return y.pointsFor - x.pointsFor;
      return this.participantOrder.indexOf(x.anonId) - this.participantOrder.indexOf(y.anonId);
    });
  }

  getState(): TournamentState {
    return {
      matches: this.matches,
      standings: this.computeStandings(),
      currentMatchId: this.currentMatchId,
      isComplete: this.isComplete,
    };
  }
}
