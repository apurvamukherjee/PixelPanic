import { create } from "zustand";
import type {
  GamePhase,
  TurnState,
  TurnStartPayload,
  HintRevealPayload,
  RoundEndPayload,
  GameEndPayload,
  ScoreUpdatePayload,
  WordChoicesPayload,
} from "@pixelpanic/shared";

interface GameState {
  phase: GamePhase;
  turn: TurnState | null;
  scoreboard: Record<string, number>;
  teamScoreboard: Record<string, number> | null; // teamId -> avg member score, team mode only
  wordChoices: WordChoicesPayload | null;
  lastRoundEnd: RoundEndPayload | null;
  finalScoreboard: GameEndPayload["finalScoreboard"] | null;
  clockOffsetMs: number; // serverNow - Date.now(), applied to render an accurate countdown

  applyPhaseChange: (phase: GamePhase) => void;
  applyWordChoices: (payload: WordChoicesPayload) => void;
  applyTurnStart: (payload: TurnStartPayload) => void;
  applyTimerTick: (turnEndsAt: number, serverNow: number) => void;
  applyHintReveal: (payload: HintRevealPayload) => void;
  applyScoreUpdate: (payload: ScoreUpdatePayload) => void;
  applyRoundEnd: (payload: RoundEndPayload) => void;
  applyGameEnd: (payload: GameEndPayload) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  phase: "lobby",
  turn: null,
  scoreboard: {},
  teamScoreboard: null,
  wordChoices: null,
  lastRoundEnd: null,
  finalScoreboard: null,
  clockOffsetMs: 0,

  applyPhaseChange: (phase) => set({ phase }),

  applyWordChoices: (payload) => set({ wordChoices: payload, phase: "wordChoice" }),

  applyTurnStart: (payload) =>
    set({
      turn: payload.turn,
      phase: payload.turn.phase,
      wordChoices: null,
      lastRoundEnd: null,
    }),

  applyTimerTick: (turnEndsAt, serverNow) =>
    set((state) => ({
      clockOffsetMs: serverNow - Date.now(),
      turn: state.turn ? { ...state.turn, turnEndsAt } : state.turn,
    })),

  applyHintReveal: (payload) =>
    set((state) =>
      state.turn
        ? { turn: { ...state.turn, maskedWord: payload.maskedWord } }
        : {}
    ),

  applyScoreUpdate: (payload) =>
    set({
      scoreboard: payload.scoreboard,
      teamScoreboard: payload.teamScoreboard ?? null,
    }),

  applyRoundEnd: (payload) =>
    set((state) => ({
      lastRoundEnd: payload,
      phase: "roundEnd",
      turn: state.turn ? { ...state.turn, phase: "roundEnd" } : state.turn,
      scoreboard: payload.scoreboardDelta,
      teamScoreboard: payload.teamScoreboard ?? null,
    })),

  applyGameEnd: (payload) =>
    set({
      phase: "gameEnd",
      finalScoreboard: payload.finalScoreboard,
      teamScoreboard: payload.teamScoreboard ?? null,
    }),

  reset: () =>
    set({
      phase: "lobby",
      turn: null,
      scoreboard: {},
      teamScoreboard: null,
      wordChoices: null,
      lastRoundEnd: null,
      finalScoreboard: null,
      clockOffsetMs: 0,
    }),
}));
