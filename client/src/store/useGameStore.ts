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
  momentum: Record<string, number>; // anonId -> streak, Phase 3 momentum mode only
  unlockedTitles: Record<string, string[]> | null; // anonId -> title ids unlocked at last GAME_END
  wordChoices: WordChoicesPayload | null;
  lastRoundEnd: RoundEndPayload | null;
  finalScoreboard: GameEndPayload["finalScoreboard"] | null;
  clockOffsetMs: number; // serverNow - Date.now(), applied to render an accurate countdown
  // Private GUESS_CORRECT only reaches the guesser, so this is the only way
  // the client itself knows "did I get it this turn" — reset each TURN_START.
  iGuessedThisTurn: boolean;
  // This round's drawer order, from the server (see TurnStartPayload) —
  // recomputing this client-side would mean reimplementing team-interleaved
  // rotation and connected-player filtering.
  rotationPlayerIds: string[];
  // HINT_REVEAL sends the full cumulative revealed-index set each time, not
  // just the new one — revealedIndices is that set, justRevealedIndex is the
  // diff against the previous one, so MaskedWordBanner can animate only the
  // newly-revealed letter.
  revealedIndices: number[];
  justRevealedIndex: number | null;

  applyPhaseChange: (phase: GamePhase) => void;
  applyWordChoices: (payload: WordChoicesPayload) => void;
  applyTurnStart: (payload: TurnStartPayload) => void;
  applyTimerTick: (turnEndsAt: number, serverNow: number) => void;
  applyHintReveal: (payload: HintRevealPayload) => void;
  applyScoreUpdate: (payload: ScoreUpdatePayload) => void;
  applyRoundEnd: (payload: RoundEndPayload) => void;
  applyGameEnd: (payload: GameEndPayload) => void;
  markGuessedCorrectly: () => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  phase: "lobby",
  turn: null,
  scoreboard: {},
  teamScoreboard: null,
  momentum: {},
  unlockedTitles: null,
  wordChoices: null,
  lastRoundEnd: null,
  finalScoreboard: null,
  clockOffsetMs: 0,
  iGuessedThisTurn: false,
  rotationPlayerIds: [],
  revealedIndices: [],
  justRevealedIndex: null,

  applyPhaseChange: (phase) => set({ phase }),

  applyWordChoices: (payload) => set({ wordChoices: payload, phase: "wordChoice" }),

  applyTurnStart: (payload) =>
    set({
      turn: payload.turn,
      phase: payload.turn.phase,
      wordChoices: null,
      lastRoundEnd: null,
      iGuessedThisTurn: false,
      rotationPlayerIds: payload.rotationPlayerIds,
      revealedIndices: [],
      justRevealedIndex: null,
    }),

  applyTimerTick: (turnEndsAt, serverNow) =>
    set((state) => ({
      clockOffsetMs: serverNow - Date.now(),
      turn: state.turn ? { ...state.turn, turnEndsAt } : state.turn,
    })),

  applyHintReveal: (payload) =>
    set((state) => {
      if (!state.turn) return {};
      const prev = new Set(state.revealedIndices);
      const justRevealedIndex = payload.revealedIndices.find((i) => !prev.has(i)) ?? null;
      return {
        turn: { ...state.turn, maskedWord: payload.maskedWord },
        revealedIndices: payload.revealedIndices,
        justRevealedIndex,
      };
    }),

  applyScoreUpdate: (payload) =>
    set((state) => ({
      scoreboard: payload.scoreboard,
      teamScoreboard: payload.teamScoreboard ?? null,
      momentum: payload.momentum ?? state.momentum,
    })),

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
      unlockedTitles: payload.unlockedTitles ?? null,
    }),

  markGuessedCorrectly: () => set({ iGuessedThisTurn: true }),

  reset: () =>
    set({
      phase: "lobby",
      turn: null,
      scoreboard: {},
      teamScoreboard: null,
      momentum: {},
      unlockedTitles: null,
      wordChoices: null,
      lastRoundEnd: null,
      finalScoreboard: null,
      clockOffsetMs: 0,
      iGuessedThisTurn: false,
      rotationPlayerIds: [],
      revealedIndices: [],
      justRevealedIndex: null,
    }),
}));
