import { randomUUID } from "node:crypto";
import type { Server, Socket } from "socket.io";
import {
  ServerEvents,
  DEFAULT_ROOM_SETTINGS,
  type Room,
  type Player,
  type Team,
  type RoomVisibility,
  type GameState,
  type TurnState,
  type WordPack,
  type ChatMessage,
  type ChatChannel,
  type RoomUpdateSettingsPayload,
  type RoomSetTeamsPayload,
  type WordChoicesPayload,
  type TurnStartPayload,
  type TimerTickPayload,
  type HintRevealPayload,
  type GuessCorrectPayload,
  type ScoreUpdatePayload,
  type RoundEndPayload,
  type GameEndPayload,
  type VotekickUpdatePayload,
  type MutedPayload,
  type TournamentState,
} from "@pixelpanic/shared";
import { WordSelector } from "./WordSelector.js";
import { computeHintSchedule, buildMaskedWord } from "./HintScheduler.js";
import { ScoreEngine } from "./ScoreEngine.js";
import { isCorrectGuess } from "./guessMatcher.js";
import { initialTurnIndices, nextTurnIndices } from "./TurnStateMachine.js";
import { buildTeamInterleavedRotation } from "./TeamRotation.js";
import { TournamentInstance, type TournamentHost } from "./TournamentInstance.js";
import { recordGameEndStats } from "../db/statsRepo.js";
import { logger } from "../utils/logger.js";

const DEFAULT_TEAM_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#eab308"];
const TOURNAMENT_MIN_PLAYERS = 2;
const TOURNAMENT_MAX_PLAYERS = 10;

const WORD_CHOICE_TIMEOUT_MS = 15_000;
const ROUND_END_PAUSE_MS = 5_000;
const RECONNECT_GRACE_MS = 20_000;
const TIMER_TICK_INTERVAL_MS = 5_000;
const CHAT_HISTORY_CAP = 200;
const AVATAR_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

export type RoomJoinResult =
  | { ok: true; player: Player }
  | { ok: false; code: "ROOM_FULL" | "NAME_TAKEN" };

export class RoomInstance implements TournamentHost {
  readonly room: Room;
  private game: GameState;
  private chatHistory: ChatMessage[] = [];
  private wordSelector: WordSelector;
  private rotationAnonIds: string[] = [];
  private currentTurnStrokeIds: string[] = [];
  private revealedIndices = new Set<number>();
  private graceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private turnTimeouts: ReturnType<typeof setTimeout>[] = [];
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private disposed = false;
  private tournament: TournamentInstance | null = null;
  private activeMatch: {
    anonA: string;
    anonB: string;
    startScores: Record<string, number>;
    onComplete: (scores: Record<string, number>) => void;
  } | null = null;

  constructor(
    private io: Server,
    id: string,
    visibility: RoomVisibility,
    hostSocket: Socket,
    hostName: string,
    hostAnonId: string,
    private defaultWordPack: WordPack
  ) {
    const hostPlayer: Player = {
      id: hostSocket.id,
      anonId: hostAnonId,
      name: hostName,
      color: AVATAR_COLORS[0]!,
      score: 0,
      isHost: true,
      connected: true,
      isMuted: false,
      votekickTargetOf: [],
      teamId: null,
    };
    this.room = {
      id,
      visibility,
      settings: { ...DEFAULT_ROOM_SETTINGS },
      players: [hostPlayer],
      teams: [],
      hostId: hostPlayer.id,
      createdAt: Date.now(),
    };
    this.game = {
      roomId: id,
      turn: null,
      scoreboard: { [hostPlayer.id]: 0 },
      isGameActive: false,
      totalRounds: this.room.settings.roundCount,
    };
    this.wordSelector = new WordSelector(defaultWordPack);
    hostSocket.join(id);
  }

  // ---- room membership ----

  join(socket: Socket, name: string, anonId: string): RoomJoinResult {
    const existing = this.room.players.find((p) => p.anonId === anonId);
    if (existing) {
      existing.id = socket.id;
      existing.connected = true;
      existing.name = name;
      this.cancelGraceTimer(anonId);
      socket.join(this.room.id);
      if (existing.teamId) socket.join(this.teamRoomKey(existing.teamId));
      this.broadcastRoomState();
      this.emitTo(existing.id, ServerEvents.GAME_PHASE_CHANGE, {
        phase: this.game.turn?.phase ?? "lobby",
      });
      return { ok: true, player: existing };
    }

    if (this.room.players.length >= this.room.settings.maxPlayers) {
      return { ok: false, code: "ROOM_FULL" };
    }
    if (this.room.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      return { ok: false, code: "NAME_TAKEN" };
    }

    const player: Player = {
      id: socket.id,
      anonId,
      name,
      color: AVATAR_COLORS[this.room.players.length % AVATAR_COLORS.length]!,
      score: 0,
      isHost: false,
      connected: true,
      isMuted: false,
      votekickTargetOf: [],
      teamId: null,
    };
    this.room.players.push(player);
    this.game.scoreboard[player.id] = 0;
    socket.join(this.room.id);
    this.pushSystemChat(`${name} joined the room.`);
    this.broadcastRoomState();
    return { ok: true, player };
  }

  handleDisconnect(socketId: string): void {
    const player = this.room.players.find((p) => p.id === socketId);
    if (!player) return;
    player.connected = false;
    this.pushSystemChat(`${player.name} disconnected.`);

    if (this.room.hostId === player.id) {
      this.transferHost();
    }
    if (this.game.turn?.phase === "drawing" && this.game.turn.drawerId === player.id) {
      this.endTurn();
    }

    const anonId = player.anonId;
    const timer = setTimeout(() => this.removePlayerPermanently(anonId), RECONNECT_GRACE_MS);
    this.graceTimers.set(anonId, timer);
    this.broadcastRoomState();
  }

  private cancelGraceTimer(anonId: string): void {
    const timer = this.graceTimers.get(anonId);
    if (timer) {
      clearTimeout(timer);
      this.graceTimers.delete(anonId);
    }
  }

  private removePlayerPermanently(anonId: string): void {
    this.graceTimers.delete(anonId);
    const idx = this.room.players.findIndex((p) => p.anonId === anonId);
    if (idx === -1) return;
    const [player] = this.room.players.splice(idx, 1);
    delete this.game.scoreboard[player!.id];
    this.pushSystemChat(`${player!.name} left the room.`);
    this.broadcastRoomState();
  }

  private transferHost(): void {
    const nextHost = this.room.players.find((p) => p.connected && p.id !== this.room.hostId);
    for (const p of this.room.players) p.isHost = false;
    if (nextHost) {
      nextHost.isHost = true;
      this.room.hostId = nextHost.id;
    }
  }

  isEmpty(): boolean {
    return this.room.players.every((p) => !p.connected);
  }

  isGameActive(): boolean {
    return this.game.isGameActive;
  }

  dispose(): void {
    this.disposed = true;
    for (const t of this.turnTimeouts) clearTimeout(t);
    for (const t of this.graceTimers.values()) clearTimeout(t);
    if (this.tickInterval) clearInterval(this.tickInterval);
  }

  // ---- settings ----

  updateSettings(requesterId: string, patch: RoomUpdateSettingsPayload): void {
    if (requesterId !== this.room.hostId) return;
    if (patch.roundCount !== undefined) {
      this.room.settings.roundCount = clamp(patch.roundCount, 1, 10);
    }
    if (patch.drawTimeSec !== undefined) {
      this.room.settings.drawTimeSec = clamp(patch.drawTimeSec, 30, 180);
    }
    if (patch.hintFrequency !== undefined) {
      this.room.settings.hintFrequency = patch.hintFrequency;
    }
    if (patch.customWordListId !== undefined) {
      this.room.settings.customWordListId = patch.customWordListId;
    }
    if (patch.mode !== undefined) {
      this.room.settings.mode = patch.mode;
      // Switching into team mode for the first time: seed 2 default teams
      // and auto-balance current players round-robin, so the host isn't
      // dropped into an empty roster. Re-toggling later leaves existing
      // teams/assignments alone.
      if (patch.mode === "team" && this.room.teams.length === 0) {
        this.room.teams = [
          { id: randomUUID(), name: "Team 1", color: DEFAULT_TEAM_COLORS[0]! },
          { id: randomUUID(), name: "Team 2", color: DEFAULT_TEAM_COLORS[1]! },
        ];
        this.room.players.forEach((p, i) => {
          this.assignPlayerTeam(p, this.room.teams[i % this.room.teams.length]!.id);
        });
      }
    }
    this.game.totalRounds = this.room.settings.roundCount;
    this.broadcastRoomState();
  }

  setWordPack(pack: WordPack): void {
    this.wordSelector = new WordSelector(pack);
  }

  // ---- teams ----

  setTeams(requesterId: string, teams: RoomSetTeamsPayload["teams"]): void {
    if (requesterId !== this.room.hostId) return;
    const validIds = new Set(teams.map((t) => t.id).filter(Boolean));
    const nextTeams: Team[] = teams.map((t) => ({
      id: t.id && validIds.has(t.id) ? t.id : randomUUID(),
      name: t.name.trim().slice(0, 24) || "Team",
      color: t.color,
    }));
    const nextTeamIds = new Set(nextTeams.map((t) => t.id));
    this.room.teams = nextTeams;
    // Players whose team no longer exists become unassigned rather than
    // silently kept on a deleted team.
    for (const p of this.room.players) {
      if (p.teamId && !nextTeamIds.has(p.teamId)) {
        this.assignPlayerTeam(p, null);
      }
    }
    this.broadcastRoomState();
  }

  setPlayerTeam(requesterId: string, playerId: string, teamId: string | null): void {
    if (requesterId !== this.room.hostId) return;
    const player = this.room.players.find((p) => p.id === playerId);
    if (!player) return;
    if (teamId !== null && !this.room.teams.some((t) => t.id === teamId)) return;
    this.assignPlayerTeam(player, teamId);
    this.broadcastRoomState();
  }

  private assignPlayerTeam(player: Player, teamId: string | null): void {
    const socket = this.io.sockets.sockets.get(player.id);
    if (player.teamId && player.teamId !== teamId) {
      socket?.leave(this.teamRoomKey(player.teamId));
    }
    player.teamId = teamId;
    if (teamId) socket?.join(this.teamRoomKey(teamId));
  }

  private teamRoomKey(teamId: string): string {
    return `team:${this.room.id}:${teamId}`;
  }

  private currentTeamScoreboard(): Record<string, number> | undefined {
    if (this.room.settings.mode !== "team") return undefined;
    return ScoreEngine.computeTeamScoreboard(this.room.players, this.room.teams);
  }

  // ---- game lifecycle ----

  startGame(requesterId: string): void {
    if (requesterId !== this.room.hostId) return;
    if (this.tournament) return;
    const connectedCount = this.room.players.filter((p) => p.connected).length;
    if (connectedCount < 2) return;

    if (this.room.settings.mode === "team") {
      const connected = this.room.players.filter((p) => p.connected);
      const unassigned = connected.some((p) => p.teamId === null);
      const emptyTeam = this.room.teams.some(
        (t) => !connected.some((p) => p.teamId === t.id)
      );
      if (unassigned || emptyTeam) {
        this.emitTo(requesterId, ServerEvents.ROOM_ERROR, {
          code: "INVALID_STATE",
          message: "Every player must be on a team with at least one member before starting.",
        });
        return;
      }
    }

    this.game.isGameActive = true;
    this.game.totalRounds = this.room.settings.roundCount;
    this.wordSelector.reset();
    for (const p of this.room.players) p.score = 0;
    this.game.scoreboard = Object.fromEntries(this.room.players.map((p) => [p.id, 0]));

    this.game.turn = {
      drawerId: "",
      roundIndex: -1,
      turnIndexInRound: 0,
      word: null,
      maskedWord: "",
      wordLength: 0,
      phase: "lobby",
      turnEndsAt: null,
      correctGuesserIds: [],
      hintsRevealedCount: 0,
    };
    this.startTurn(initialTurnIndices());
  }

  // ---- tournament (round-robin) ----

  startTournament(requesterId: string): void {
    if (requesterId !== this.room.hostId) return;
    if (this.game.isGameActive || this.tournament) return;
    const connected = this.room.players.filter((p) => p.connected);
    if (connected.length < TOURNAMENT_MIN_PLAYERS || connected.length > TOURNAMENT_MAX_PLAYERS) {
      this.emitTo(requesterId, ServerEvents.ROOM_ERROR, {
        code: "INVALID_STATE",
        message: `Tournament needs ${TOURNAMENT_MIN_PLAYERS}-${TOURNAMENT_MAX_PLAYERS} connected players.`,
      });
      return;
    }
    this.tournament = new TournamentInstance(
      this,
      this.room.id,
      connected.map((p) => ({ anonId: p.anonId, name: p.name }))
    );
    this.tournament.start();
  }

  // Runs one 1-round, 2-player match through the normal turn engine —
  // reuses word-choice/drawing/scoring/hints unchanged. `startTurn` checks
  // `activeMatch` first to seed the rotation with exactly these two players
  // instead of the full room roster. See TournamentInstance/TournamentHost.
  startMatch(anonA: string, anonB: string, onComplete: (scores: Record<string, number>) => void): void {
    const playerA = this.room.players.find((p) => p.anonId === anonA);
    const playerB = this.room.players.find((p) => p.anonId === anonB);
    if (!playerA || !playerB) {
      onComplete({ [anonA]: 0, [anonB]: 0 });
      return;
    }

    this.activeMatch = {
      anonA,
      anonB,
      startScores: { [anonA]: playerA.score, [anonB]: playerB.score },
      onComplete,
    };
    this.wordSelector.reset();
    this.game.isGameActive = true;
    this.game.totalRounds = 1;
    this.game.turn = {
      drawerId: "",
      roundIndex: -1,
      turnIndexInRound: 0,
      word: null,
      maskedWord: "",
      wordLength: 0,
      phase: "lobby",
      turnEndsAt: null,
      correctGuesserIds: [],
      hintsRevealedCount: 0,
    };
    this.startTurn(initialTurnIndices());
  }

  broadcastTournamentState(tournament: TournamentState): void {
    this.broadcast(ServerEvents.TOURNAMENT_STATE, { tournament });
  }

  broadcastTournamentMatchStart(matchId: string, playerAnonIds: [string, string]): void {
    this.broadcast(ServerEvents.TOURNAMENT_MATCH_START, { matchId, playerAnonIds });
  }

  broadcastTournamentComplete(tournament: TournamentState): void {
    this.tournament = null;
    this.broadcast(ServerEvents.TOURNAMENT_COMPLETE, { tournament });
  }

  private startTurn(indices: { roundIndex: number; turnIndexInRound: number }): void {
    this.clearTurnTimers();
    // Votekick tallies don't carry across turns.
    for (const p of this.room.players) p.votekickTargetOf = [];

    if (indices.turnIndexInRound === 0) {
      if (this.activeMatch) {
        this.rotationAnonIds = [this.activeMatch.anonA, this.activeMatch.anonB];
      } else if (this.room.settings.mode === "team") {
        this.rotationAnonIds = buildTeamInterleavedRotation(
          this.room.players.filter((p) => p.connected),
          this.room.teams.map((t) => t.id)
        );
      } else {
        this.rotationAnonIds = this.room.players.filter((p) => p.connected).map((p) => p.anonId);
      }
    }
    const connectedRotation = this.rotationAnonIds.filter((anonId) =>
      this.room.players.some((p) => p.anonId === anonId && p.connected)
    );
    if (connectedRotation.length < 2) {
      this.endGame();
      return;
    }

    const drawerAnonId = connectedRotation[indices.turnIndexInRound % connectedRotation.length]!;
    const drawer = this.room.players.find((p) => p.anonId === drawerAnonId)!;

    const [w1, w2, w3] = this.wordSelector.pickThree();
    const deadline = Date.now() + WORD_CHOICE_TIMEOUT_MS;

    this.game.turn = {
      drawerId: drawer.id,
      roundIndex: indices.roundIndex,
      turnIndexInRound: indices.turnIndexInRound,
      word: null,
      maskedWord: "",
      wordLength: 0,
      phase: "wordChoice",
      turnEndsAt: null,
      correctGuesserIds: [],
      hintsRevealedCount: 0,
    };
    this.currentTurnStrokeIds = [];
    this.revealedIndices = new Set();

    this.emitTo(drawer.id, ServerEvents.WORD_CHOICES, {
      words: [w1, w2, w3],
      deadline,
    } satisfies WordChoicesPayload);
    this.broadcast(ServerEvents.GAME_PHASE_CHANGE, { phase: "wordChoice" });

    const timeout = setTimeout(() => {
      if (this.game.turn?.phase === "wordChoice") this.chooseWord(drawer.id, w1);
    }, WORD_CHOICE_TIMEOUT_MS);
    this.turnTimeouts.push(timeout);
  }

  chooseWord(requesterId: string, word: string): void {
    const turn = this.game.turn;
    if (!turn || turn.phase !== "wordChoice" || turn.drawerId !== requesterId) return;

    this.wordSelector.markUsed(word);
    const drawTimeSec = this.room.settings.drawTimeSec;
    turn.word = word;
    turn.wordLength = word.length;
    turn.maskedWord = buildMaskedWord(word, this.revealedIndices);
    turn.phase = "drawing";
    turn.turnEndsAt = Date.now() + drawTimeSec * 1000;

    this.broadcast(ServerEvents.TURN_START, {
      turn: { ...turn, word: null },
      drawTimeSec,
    } satisfies TurnStartPayload);
    this.emitTo(turn.drawerId, ServerEvents.TURN_START, {
      turn,
      drawTimeSec,
    } satisfies TurnStartPayload);

    const hints = computeHintSchedule(word, drawTimeSec, this.room.settings.hintFrequency);
    for (const hint of hints) {
      const t = setTimeout(() => this.revealHint(hint.index), hint.atMs);
      this.turnTimeouts.push(t);
    }

    const endTimeout = setTimeout(() => this.endTurn(), drawTimeSec * 1000);
    this.turnTimeouts.push(endTimeout);

    this.tickInterval = setInterval(() => {
      if (!this.game.turn?.turnEndsAt) return;
      this.broadcast(ServerEvents.TIMER_TICK, {
        turnEndsAt: this.game.turn.turnEndsAt,
        serverNow: Date.now(),
      } satisfies TimerTickPayload);
    }, TIMER_TICK_INTERVAL_MS);
  }

  private revealHint(index: number): void {
    const turn = this.game.turn;
    if (!turn || turn.phase !== "drawing" || !turn.word) return;
    this.revealedIndices.add(index);
    turn.maskedWord = buildMaskedWord(turn.word, this.revealedIndices);
    turn.hintsRevealedCount += 1;
    this.broadcast(ServerEvents.HINT_REVEAL, {
      maskedWord: turn.maskedWord,
      revealedIndices: [...this.revealedIndices],
    } satisfies HintRevealPayload);
  }

  private clearTurnTimers(): void {
    for (const t of this.turnTimeouts) clearTimeout(t);
    this.turnTimeouts = [];
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  private endTurn(): void {
    const turn = this.game.turn;
    if (!turn || (turn.phase !== "drawing" && turn.phase !== "wordChoice")) return;
    this.clearTurnTimers();

    if (turn.phase === "wordChoice" || !turn.word) {
      // Drawer never got to draw (e.g. disconnected during word choice) — skip straight ahead.
      this.advanceToNextTurnOrEnd(turn);
      return;
    }

    const connectedGuessers = this.eligibleGuessers(turn.drawerId);
    if (connectedGuessers.length > 0 && turn.correctGuesserIds.length >= connectedGuessers.length) {
      const drawer = this.room.players.find((p) => p.id === turn.drawerId);
      if (drawer) {
        drawer.score += ScoreEngine.drawerAllGuessedBonus();
        this.game.scoreboard[drawer.id] = drawer.score;
      }
    }

    turn.phase = "roundEnd";
    this.broadcast(ServerEvents.ROUND_END, {
      word: turn.word,
      scoreboardDelta: { ...this.game.scoreboard },
      teamScoreboard: this.currentTeamScoreboard(),
    } satisfies RoundEndPayload);

    const t = setTimeout(() => this.advanceToNextTurnOrEnd(turn), ROUND_END_PAUSE_MS);
    this.turnTimeouts.push(t);
  }

  private advanceToNextTurnOrEnd(turn: TurnState): void {
    const connectedRotation = this.rotationAnonIds.filter((anonId) =>
      this.room.players.some((p) => p.anonId === anonId && p.connected)
    );
    const { indices, isGameEnd } = nextTurnIndices(
      { roundIndex: turn.roundIndex, turnIndexInRound: turn.turnIndexInRound },
      connectedRotation.length,
      this.game.totalRounds
    );
    if (isGameEnd) {
      this.endGame();
    } else {
      this.startTurn(indices);
    }
  }

  private endGame(): void {
    this.clearTurnTimers();
    this.game.isGameActive = false;
    if (this.game.turn) this.game.turn.phase = "gameEnd";

    if (this.activeMatch) {
      const { anonA, anonB, startScores, onComplete } = this.activeMatch;
      this.activeMatch = null;
      const playerA = this.room.players.find((p) => p.anonId === anonA);
      const playerB = this.room.players.find((p) => p.anonId === anonB);
      const scoreA = Math.max(0, (playerA?.score ?? startScores[anonA]!) - startScores[anonA]!);
      const scoreB = Math.max(0, (playerB?.score ?? startScores[anonB]!) - startScores[anonB]!);
      // Return to the lobby phase (the tournament's between-match resting
      // state) instead of the normal room-wide GAME_END/leaderboard —
      // TournamentInstance drives what happens next.
      this.broadcast(ServerEvents.GAME_PHASE_CHANGE, { phase: "lobby" });
      onComplete({ [anonA]: scoreA, [anonB]: scoreB });
      return;
    }

    const ranked = [...this.room.players]
      .sort((a, b) => b.score - a.score)
      .map((p) => ({ playerId: p.id, name: p.name, score: p.score }));

    this.broadcast(ServerEvents.GAME_END, {
      finalScoreboard: ranked,
      teamScoreboard: this.currentTeamScoreboard(),
    } satisfies GameEndPayload);

    try {
      const topScore = ranked[0]?.score ?? 0;
      recordGameEndStats(
        this.room.players.map((p) => ({
          anonId: p.anonId,
          displayName: p.name,
          roundsDrawn: 0,
          correctGuesses: 0,
          scoreEarned: p.score,
          isWinner: p.score === topScore && topScore > 0,
        }))
      );
    } catch (err) {
      logger.error("Failed to persist anon stats", err);
    }
  }

  // ---- chat / guessing ----

  handleChat(playerId: string, text: string, channel: ChatChannel = "room"): void {
    const player = this.room.players.find((p) => p.id === playerId);
    if (!player || player.isMuted) return;
    const trimmed = text.trim().slice(0, 200);
    if (!trimmed) return;

    // Team channel only exists in team mode and only for players on a team;
    // anything else silently falls back to the room channel.
    const isTeamChannel = channel === "team" && this.room.settings.mode === "team" && player.teamId;
    const teamId = isTeamChannel ? player.teamId : null;

    // Guessing only counts in the room channel — team chat is private
    // strategy/banter and intentionally can't score a correct guess, so a
    // team can't quietly confer the word without the rest of the room
    // seeing it guessed. During a tournament match, only the two match
    // participants can score a guess — everyone else in the room is
    // spectating live (see startMatch) and shouldn't be able to affect the
    // match by chatting the word.
    const turn = this.game.turn;
    if (
      !isTeamChannel &&
      this.isEligibleGuesser(playerId) &&
      turn &&
      turn.phase === "drawing" &&
      turn.word &&
      playerId !== turn.drawerId &&
      !turn.correctGuesserIds.includes(playerId)
    ) {
      if (isCorrectGuess(trimmed, turn.word)) {
        this.handleCorrectGuess(player, turn);
        return;
      }
    }

    this.pushChat({
      id: randomUUID(),
      playerId: player.id,
      playerName: player.name,
      text: trimmed,
      ts: Date.now(),
      kind: "chat",
      channel: isTeamChannel ? "team" : "room",
      teamId,
    });
  }

  private handleCorrectGuess(player: Player, turn: TurnState): void {
    turn.correctGuesserIds.push(player.id);
    const elapsedSec = turn.turnEndsAt
      ? this.room.settings.drawTimeSec - (turn.turnEndsAt - Date.now()) / 1000
      : 0;
    const points = ScoreEngine.guesserPoints(Math.max(0, elapsedSec), this.room.settings.drawTimeSec);
    player.score += points;
    this.game.scoreboard[player.id] = player.score;

    const drawer = this.room.players.find((p) => p.id === turn.drawerId);
    if (drawer) {
      drawer.score += ScoreEngine.drawerPointsForGuesser();
      this.game.scoreboard[drawer.id] = drawer.score;
    }

    this.emitTo(player.id, ServerEvents.GUESS_CORRECT, {
      pointsAwarded: points,
      word: turn.word!,
    } satisfies GuessCorrectPayload);

    this.pushChat({
      id: randomUUID(),
      playerId: player.id,
      playerName: player.name,
      text: `${player.name} guessed the word!`,
      ts: Date.now(),
      kind: "correctGuess",
      channel: "room",
      teamId: null,
    });

    this.broadcast(ServerEvents.SCORE_UPDATE, {
      scoreboard: { ...this.game.scoreboard },
      teamScoreboard: this.currentTeamScoreboard(),
    } satisfies ScoreUpdatePayload);

    const connectedGuessers = this.eligibleGuessers(turn.drawerId);
    if (connectedGuessers.every((p) => turn.correctGuesserIds.includes(p.id))) {
      this.endTurn();
    }
  }

  // During a tournament match, only the two match participants are
  // "guessers" — everyone else connected is spectating that live match (see
  // startMatch) and shouldn't count toward "did everyone guess" or be able
  // to score a guess themselves.
  private eligibleGuessers(drawerId: string): Player[] {
    if (this.activeMatch) {
      const { anonA, anonB } = this.activeMatch;
      return this.room.players.filter(
        (p) => p.connected && p.id !== drawerId && (p.anonId === anonA || p.anonId === anonB)
      );
    }
    return this.room.players.filter((p) => p.connected && p.id !== drawerId);
  }

  private isEligibleGuesser(playerId: string): boolean {
    if (!this.activeMatch) return true;
    const player = this.room.players.find((p) => p.id === playerId);
    if (!player) return false;
    return player.anonId === this.activeMatch.anonA || player.anonId === this.activeMatch.anonB;
  }

  private pushSystemChat(text: string): void {
    this.pushChat({
      id: randomUUID(),
      playerId: "system",
      playerName: "System",
      text,
      ts: Date.now(),
      kind: "system",
      channel: "room",
      teamId: null,
    });
  }

  private pushChat(msg: ChatMessage): void {
    this.chatHistory.push(msg);
    if (this.chatHistory.length > CHAT_HISTORY_CAP) this.chatHistory.shift();
    if (msg.channel === "team" && msg.teamId) {
      if (this.disposed) return;
      this.io.to(this.teamRoomKey(msg.teamId)).emit(ServerEvents.CHAT_MESSAGE, msg);
    } else {
      this.broadcast(ServerEvents.CHAT_MESSAGE, msg);
    }
  }

  // ---- drawing relay ----

  isCurrentDrawer(socketId: string): boolean {
    return this.game.turn?.phase === "drawing" && this.game.turn.drawerId === socketId;
  }

  relayStrokeStart(socketId: string, payload: unknown): void {
    if (!this.isCurrentDrawer(socketId)) return;
    this.broadcast(ServerEvents.DRAW_STROKE_START, payload);
  }

  relayStrokePoint(socketId: string, payload: unknown): void {
    if (!this.isCurrentDrawer(socketId)) return;
    this.broadcast(ServerEvents.DRAW_STROKE_POINT, payload);
  }

  relayStrokeEnd(socketId: string, payload: { strokeId: string }): void {
    if (!this.isCurrentDrawer(socketId)) return;
    this.currentTurnStrokeIds.push(payload.strokeId);
    this.broadcast(ServerEvents.DRAW_STROKE_END, payload);
  }

  relayClear(socketId: string): void {
    if (!this.isCurrentDrawer(socketId)) return;
    this.currentTurnStrokeIds = [];
    this.broadcast(ServerEvents.DRAW_CLEAR, {});
  }

  relayUndo(socketId: string): void {
    if (!this.isCurrentDrawer(socketId)) return;
    const strokeId = this.currentTurnStrokeIds.pop();
    if (!strokeId) return;
    this.broadcast(ServerEvents.DRAW_UNDO, { strokeId });
  }

  // ---- moderation ----

  votekick(voterId: string, targetId: string): void {
    if (voterId === targetId) return;
    const target = this.room.players.find((p) => p.id === targetId);
    const voter = this.room.players.find((p) => p.id === voterId);
    if (!target || !voter) return;

    const idx = target.votekickTargetOf.indexOf(voterId);
    if (idx === -1) target.votekickTargetOf.push(voterId);
    else target.votekickTargetOf.splice(idx, 1);

    // Majority of connected players eligible to vote (everyone but the target).
    const eligibleVoters = this.room.players.filter(
      (p) => p.connected && p.id !== targetId
    ).length;
    const votesNeeded = Math.max(1, Math.ceil(eligibleVoters / 2));
    const votes = target.votekickTargetOf.length;
    const kicked = votes >= votesNeeded;

    this.broadcast(ServerEvents.MOD_VOTEKICK_UPDATE, {
      targetPlayerId: targetId,
      votes,
      votesNeeded,
      kicked,
    } satisfies VotekickUpdatePayload);

    if (kicked) {
      this.forceKick(target);
    }
  }

  private forceKick(target: Player): void {
    const socket = this.io.sockets.sockets.get(target.id);
    socket?.leave(this.room.id);
    socket?.disconnect(true);

    const wasDrawer = this.game.turn?.phase === "drawing" && this.game.turn.drawerId === target.id;
    const wasHost = this.room.hostId === target.id;

    this.cancelGraceTimer(target.anonId);
    this.room.players = this.room.players.filter((p) => p.id !== target.id);
    delete this.game.scoreboard[target.id];
    this.pushSystemChat(`${target.name} was votekicked.`);

    if (wasHost) this.transferHost();
    if (wasDrawer) this.endTurn();
    this.broadcastRoomState();
  }

  mute(requesterId: string, targetId: string): void {
    if (requesterId !== this.room.hostId) return;
    const target = this.room.players.find((p) => p.id === targetId);
    if (!target) return;
    target.isMuted = !target.isMuted;
    this.broadcast(ServerEvents.MOD_MUTED, {
      targetPlayerId: targetId,
      muted: target.isMuted,
    } satisfies MutedPayload);
  }

  // ---- broadcasting ----

  broadcastRoomState(): void {
    this.broadcast(ServerEvents.ROOM_STATE, { room: this.room });
  }

  private broadcast(event: string, payload: unknown): void {
    if (this.disposed) return;
    this.io.to(this.room.id).emit(event, payload);
  }

  private emitTo(socketId: string, event: string, payload: unknown): void {
    if (this.disposed) return;
    this.io.to(socketId).emit(event, payload);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
