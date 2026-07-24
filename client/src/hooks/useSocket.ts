import { useEffect } from "react";
import {
  ServerEvents,
  type RoomStatePayload,
  type RoomErrorPayload,
  type GamePhaseChangePayload,
  type WordChoicesPayload,
  type TurnStartPayload,
  type TimerTickPayload,
  type HintRevealPayload,
  type ChatMessage,
  type GuessCorrectPayload,
  type ScoreUpdatePayload,
  type RoundEndPayload,
  type GameEndPayload,
  type VotekickUpdatePayload,
  type MutedPayload,
  type TournamentStatePayload,
  type TournamentCompletePayload,
  type NearMissPayload,
  type SabotagePowerupGrantedPayload,
  type SabotageEffectAppliedPayload,
  type MashupVoteResultPayload,
  type RivalOnlineChangedPayload,
} from "@pixelpanic/shared";
import { useConnectionStore } from "../store/useConnectionStore";
import { useRoomStore } from "../store/useRoomStore";
import { useGameStore } from "../store/useGameStore";
import { useChatStore } from "../store/useChatStore";
import { useTournamentStore } from "../store/useTournamentStore";
import { useChaosStore } from "../store/useChaosStore";
import { useRivalStore } from "../store/useRivalStore";
import { useFeedbackStore } from "../store/useFeedbackStore";

// Wires every non-drawing server event into the relevant store. Drawing
// events are subscribed to directly inside DrawingCanvas (imperative canvas
// updates on every point would be wasteful to route through React state).
export function useSocket() {
  const ensureConnected = useConnectionStore((s) => s.ensureConnected);

  useEffect(() => {
    const socket = ensureConnected();

    const onRoomState = ({ room }: RoomStatePayload) => {
      useRoomStore.getState().setRoom(room, socket.id ?? null);
    };
    const onRoomError = (error: RoomErrorPayload) => {
      useRoomStore.getState().setError(error);
    };
    const onPhaseChange = (payload: GamePhaseChangePayload) => {
      useGameStore.getState().applyPhaseChange(payload.phase);
    };
    const onWordChoices = (payload: WordChoicesPayload) => {
      useGameStore.getState().applyWordChoices(payload);
    };
    const onTurnStart = (payload: TurnStartPayload) => {
      useGameStore.getState().applyTurnStart(payload);
    };
    const onTimerTick = (payload: TimerTickPayload) => {
      useGameStore.getState().applyTimerTick(payload.turnEndsAt, payload.serverNow);
    };
    const onHintReveal = (payload: HintRevealPayload) => {
      useGameStore.getState().applyHintReveal(payload);
    };
    const onChatMessage = (msg: ChatMessage) => {
      useChatStore.getState().addMessage(msg);
    };
    const onGuessCorrect = (payload: GuessCorrectPayload) => {
      useGameStore.getState().markGuessedCorrectly();
      useFeedbackStore.getState().triggerCorrectGuess(payload.pointsAwarded);
      useChatStore.getState().addMessage({
        id: crypto.randomUUID(),
        playerId: "system",
        playerName: "System",
        text: `Correct! +${payload.pointsAwarded} points`,
        ts: Date.now(),
        kind: "correctGuess",
        channel: "room",
        teamId: null,
      });
    };
    const onScoreUpdate = (payload: ScoreUpdatePayload) => {
      useGameStore.getState().applyScoreUpdate(payload);
    };
    const onRoundEnd = (payload: RoundEndPayload) => {
      useGameStore.getState().applyRoundEnd(payload);
    };
    const onGameEnd = (payload: GameEndPayload) => {
      useGameStore.getState().applyGameEnd(payload);
    };
    const onVotekickUpdate = (payload: VotekickUpdatePayload) => {
      useChatStore.getState().addMessage({
        id: crypto.randomUUID(),
        playerId: "system",
        playerName: "System",
        text: `Votekick: ${payload.votes}/${payload.votesNeeded} votes${payload.kicked ? " — removed." : ""}`,
        ts: Date.now(),
        kind: "system",
        channel: "room",
        teamId: null,
      });
    };
    const onMuted = (payload: MutedPayload) => {
      if (payload.targetPlayerId === socket.id) {
        useChatStore.getState().addMessage({
          id: crypto.randomUUID(),
          playerId: "system",
          playerName: "System",
          text: payload.muted ? "You have been muted by the host." : "You have been unmuted.",
          ts: Date.now(),
          kind: "system",
          channel: "room",
          teamId: null,
        });
      }
    };

    socket.on(ServerEvents.ROOM_STATE, onRoomState);
    socket.on(ServerEvents.ROOM_ERROR, onRoomError);
    socket.on(ServerEvents.GAME_PHASE_CHANGE, onPhaseChange);
    socket.on(ServerEvents.WORD_CHOICES, onWordChoices);
    socket.on(ServerEvents.TURN_START, onTurnStart);
    socket.on(ServerEvents.TIMER_TICK, onTimerTick);
    socket.on(ServerEvents.HINT_REVEAL, onHintReveal);
    socket.on(ServerEvents.CHAT_MESSAGE, onChatMessage);
    socket.on(ServerEvents.GUESS_CORRECT, onGuessCorrect);
    socket.on(ServerEvents.SCORE_UPDATE, onScoreUpdate);
    socket.on(ServerEvents.ROUND_END, onRoundEnd);
    socket.on(ServerEvents.GAME_END, onGameEnd);
    socket.on(ServerEvents.MOD_VOTEKICK_UPDATE, onVotekickUpdate);
    socket.on(ServerEvents.MOD_MUTED, onMuted);

    const onNearMiss = (payload: NearMissPayload) => {
      useChatStore.getState().addMessage({
        id: crypto.randomUUID(),
        playerId: "system",
        playerName: "System",
        text: `"${payload.guess}" is ${payload.hint} — so close!`,
        ts: Date.now(),
        kind: "nearMiss",
        channel: "room",
        teamId: null,
      });
    };
    const onSabotageGranted = (payload: SabotagePowerupGrantedPayload) => {
      useChaosStore.getState().setPendingPowerup(payload.powerup);
    };
    const onSabotageEffect = (payload: SabotageEffectAppliedPayload) => {
      useChaosStore.getState().applyEffect(payload);
    };
    const onMashupVoteResult = (payload: MashupVoteResultPayload) => {
      useChatStore.getState().addMessage({
        id: crypto.randomUUID(),
        playerId: "system",
        playerName: "System",
        text:
          payload.winnerId && payload.bonusAwarded > 0
            ? `Mashup vote: best interpretation wins +${payload.bonusAwarded} points!`
            : "Mashup vote: no votes were cast.",
        ts: Date.now(),
        kind: "system",
        channel: "room",
        teamId: null,
      });
    };
    const onRivalOnlineChanged = (payload: RivalOnlineChangedPayload) => {
      useRivalStore.getState().setOnline(payload.rivalOnline);
    };

    socket.on(ServerEvents.NEAR_MISS, onNearMiss);
    socket.on(ServerEvents.SABOTAGE_POWERUP_GRANTED, onSabotageGranted);
    socket.on(ServerEvents.SABOTAGE_EFFECT_APPLIED, onSabotageEffect);
    socket.on(ServerEvents.MASHUP_VOTE_RESULT, onMashupVoteResult);
    socket.on(ServerEvents.RIVAL_ONLINE_CHANGED, onRivalOnlineChanged);

    const onTournamentState = (payload: TournamentStatePayload) => {
      useTournamentStore.getState().applyTournamentState(payload.tournament);
    };
    const onTournamentComplete = (payload: TournamentCompletePayload) => {
      useTournamentStore.getState().applyTournamentState(payload.tournament);
    };
    socket.on(ServerEvents.TOURNAMENT_STATE, onTournamentState);
    socket.on(ServerEvents.TOURNAMENT_COMPLETE, onTournamentComplete);

    return () => {
      socket.off(ServerEvents.ROOM_STATE, onRoomState);
      socket.off(ServerEvents.ROOM_ERROR, onRoomError);
      socket.off(ServerEvents.GAME_PHASE_CHANGE, onPhaseChange);
      socket.off(ServerEvents.WORD_CHOICES, onWordChoices);
      socket.off(ServerEvents.TURN_START, onTurnStart);
      socket.off(ServerEvents.TIMER_TICK, onTimerTick);
      socket.off(ServerEvents.HINT_REVEAL, onHintReveal);
      socket.off(ServerEvents.CHAT_MESSAGE, onChatMessage);
      socket.off(ServerEvents.GUESS_CORRECT, onGuessCorrect);
      socket.off(ServerEvents.SCORE_UPDATE, onScoreUpdate);
      socket.off(ServerEvents.ROUND_END, onRoundEnd);
      socket.off(ServerEvents.GAME_END, onGameEnd);
      socket.off(ServerEvents.MOD_VOTEKICK_UPDATE, onVotekickUpdate);
      socket.off(ServerEvents.MOD_MUTED, onMuted);
      socket.off(ServerEvents.TOURNAMENT_STATE, onTournamentState);
      socket.off(ServerEvents.TOURNAMENT_COMPLETE, onTournamentComplete);
      socket.off(ServerEvents.NEAR_MISS, onNearMiss);
      socket.off(ServerEvents.SABOTAGE_POWERUP_GRANTED, onSabotageGranted);
      socket.off(ServerEvents.SABOTAGE_EFFECT_APPLIED, onSabotageEffect);
      socket.off(ServerEvents.MASHUP_VOTE_RESULT, onMashupVoteResult);
      socket.off(ServerEvents.RIVAL_ONLINE_CHANGED, onRivalOnlineChanged);
    };
  }, [ensureConnected]);
}
