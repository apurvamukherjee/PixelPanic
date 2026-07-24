import { randomUUID } from "node:crypto";
import type { Server, Socket } from "socket.io";
import {
  ServerEvents,
  DEFAULT_ROOM_SETTINGS,
  SCORING,
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
  type NearMissPayload,
  type NearMissPulsePayload,
  type SabotagePowerup,
  type SabotageEffectAppliedPayload,
  type MashupVoteResultPayload,
  type StrokeStartPayload,
  type StrokePointPayload,
  type StrokeEndPayload,
  type DrawFillPayload,
  type CommittedStrokeOp,
  type CommittedDrawOp,
  type DrawSnapshotPayload,
} from "@pixelpanic/shared";
import { WordSelector } from "./WordSelector.js";
import { computeHintSchedule, buildMaskedWord } from "./HintScheduler.js";
import { ScoreEngine } from "./ScoreEngine.js";
import { isCorrectGuess, isNearMiss } from "./guessMatcher.js";
import { initialTurnIndices, nextTurnIndices } from "./TurnStateMachine.js";
import { buildTeamInterleavedRotation } from "./TeamRotation.js";
import { TournamentInstance, type TournamentHost } from "./TournamentInstance.js";
import { recordGameEndStats } from "../db/statsRepo.js";
import { checkAndUnlockTitles } from "../db/titlesRepo.js";
import { logger } from "../utils/logger.js";

const DEFAULT_TEAM_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#eab308"];
const TOURNAMENT_MIN_PLAYERS = 2;
const TOURNAMENT_MAX_PLAYERS = 10;

const WORD_CHOICE_TIMEOUT_MS = 15_000;
const ROUND_END_PAUSE_MS = 5_000;
const RECONNECT_GRACE_MS = 20_000;
const TIMER_TICK_INTERVAL_MS = 5_000;
const CHAT_HISTORY_CAP = 200;
const MASHUP_VOTE_WINDOW_MS = 15_000;
const SABOTAGE_EFFECT_DURATION_MS = 3_000;
const SABOTAGE_POWERUPS: SabotagePowerup[] = ["blur", "swapGuesses", "freezePalette"];
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
  // Mirrors the client's own StrokeRenderer.committed (remoteStrokeRenderer.ts)
  // so a mid-game joiner or reconnecting player can be caught up — see
  // catchUpNewcomer(). activeStrokeOps holds in-progress (not yet ended)
  // strokes, same split as the client's `active` map vs `committed` array.
  private committedOps: CommittedDrawOp[] = [];
  private activeStrokeOps = new Map<string, CommittedStrokeOp>();
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

  // Phase 3 chaos-mode state — all anonId-keyed (not socket.id) so it
  // survives reconnects, matching graceTimers' existing convention.
  private streaks = new Map<string, number>(); // momentum: consecutive correct guesses
  private pendingPowerup = new Map<string, SabotagePowerup>(); // granted, not yet used
  private activeSwaps = new Map<string, string>(); // anonId -> swapped-with anonId (sabotage)
  private bountyRoundIndex: number | null = null; // chosen once per game
  private mashupRoundIndex: number | null = null; // chosen once per game
  private gameStats = new Map<string, { roundsDrawn: number; correctGuesses: number }>();
  private mashupCandidateByAnon = new Map<string, { playerId: string; playerName: string }>();
  private mashupVotes = new Map<string, string>(); // voter anonId -> target playerId

  constructor(
    private io: Server,
    id: string,
    visibility: RoomVisibility,
    hostSocket: Socket,
    hostName: string,
    hostAnonId: string,
    private defaultWordPack: WordPack,
    hostAvatarId: string | null = null
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
      avatarId: hostAvatarId,
    };
    this.room = {
      id,
      visibility,
      // Defensive deep-copy of chaosModes: a shallow spread of
      // DEFAULT_ROOM_SETTINGS would leave every new room's chaosModes
      // pointing at the same shared object until the first settings update.
      settings: { ...DEFAULT_ROOM_SETTINGS, chaosModes: { ...DEFAULT_ROOM_SETTINGS.chaosModes } },
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
      momentum: {},
    };
    this.wordSelector = new WordSelector(defaultWordPack);
    hostSocket.join(id);
  }

  // ---- room membership ----

  join(socket: Socket, name: string, anonId: string, avatarId: string | null = null): RoomJoinResult {
    const existing = this.room.players.find((p) => p.anonId === anonId);
    if (existing) {
      const wasDisconnected = !existing.connected;
      existing.id = socket.id;
      existing.connected = true;
      existing.name = name;
      existing.avatarId = avatarId;
      this.cancelGraceTimer(anonId);
      socket.join(this.room.id);
      if (existing.teamId) socket.join(this.teamRoomKey(existing.teamId));
      if (wasDisconnected) this.pushSystemChat(`${name} reconnected.`);
      this.broadcastRoomState();
      this.catchUpNewcomer(existing.id);
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
      avatarId,
    };
    this.room.players.push(player);
    this.game.scoreboard[player.id] = 0;
    socket.join(this.room.id);
    this.pushSystemChat(`${name} joined the room.`);
    this.broadcastRoomState();
    // A brand-new player (not a reconnect) can join a room whose game is
    // already active — nothing gates ROOM_JOIN on isGameActive, and rotation
    // is designed to fold mid-game joiners in at the next round boundary
    // (see CLAUDE.md). Without this, their client would sit stuck on
    // GAME_PHASE_CHANGE's default "lobby" state, never having received the
    // TURN_START/SCORE_UPDATE broadcasts that happened before they connected.
    this.catchUpNewcomer(player.id);
    return { ok: true, player };
  }

  // Private catch-up for a socket that just joined or reconnected while a
  // game is already in progress: current phase, the in-progress turn (word
  // masked exactly like a normal non-drawer would see it — a newcomer is
  // never the current turn's drawer), current scores, and whatever's been
  // drawn so far this turn (see committedOps/DRAW_SNAPSHOT).
  private catchUpNewcomer(playerId: string): void {
    const turn = this.game.turn;
    this.emitTo(playerId, ServerEvents.GAME_PHASE_CHANGE, { phase: turn?.phase ?? "lobby" });
    if (!turn) return;

    this.emitTo(playerId, ServerEvents.TURN_START, {
      turn: { ...turn, word: turn.isReverseMode ? turn.word : null },
      drawTimeSec: this.room.settings.drawTimeSec,
      rotationPlayerIds: this.connectedRotationPlayerIds(),
    } satisfies TurnStartPayload);

    this.emitTo(playerId, ServerEvents.SCORE_UPDATE, {
      scoreboard: { ...this.game.scoreboard },
      teamScoreboard: this.currentTeamScoreboard(),
      momentum: this.room.settings.chaosModes.momentum ? { ...this.game.momentum } : undefined,
    } satisfies ScoreUpdatePayload);

    if (turn.phase === "drawing" && this.committedOps.length > 0) {
      this.emitTo(playerId, ServerEvents.DRAW_SNAPSHOT, {
        ops: this.committedOps,
      } satisfies DrawSnapshotPayload);
    }
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
    if (patch.chaosModes !== undefined) {
      this.room.settings.chaosModes = {
        ...this.room.settings.chaosModes,
        ...patch.chaosModes,
        // Ghost drawing needs a stroke-aggregation pipeline that doesn't
        // exist yet (see PHASE3-PLAN.md) — always force it off server-side
        // regardless of what a client sends, so the flag exists in the
        // schema without a half-built feature turning on by accident.
        ghostDrawing: false,
      };
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
    this.game.momentum = {};

    // Reset per-game chaos-mode state.
    this.streaks.clear();
    this.pendingPowerup.clear();
    this.activeSwaps.clear();
    this.mashupCandidateByAnon.clear();
    this.mashupVotes.clear();
    this.gameStats.clear();
    for (const p of this.room.players) this.gameStats.set(p.anonId, { roundsDrawn: 0, correctGuesses: 0 });
    const chaos = this.room.settings.chaosModes;
    this.bountyRoundIndex = chaos.bounty ? Math.floor(Math.random() * this.room.settings.roundCount) : null;
    this.mashupRoundIndex = chaos.mashup
      ? pickDistinctRoundIndex(this.room.settings.roundCount, this.bountyRoundIndex)
      : null;

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
      isBountyRound: false,
      isReverseMode: false,
      isMashupRound: false,
      mashupVoteOpen: false,
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
    // Tournament matches never use chaos modes — bounty/mashup round
    // selection is skipped so a match always plays a plain single turn.
    this.bountyRoundIndex = null;
    this.mashupRoundIndex = null;
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
      isBountyRound: false,
      isReverseMode: false,
      isMashupRound: false,
      mashupVoteOpen: false,
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

  // rotationAnonIds filtered to currently-connected players and mapped to
  // player.id — the shape TURN_START hands the client for its turn-order
  // strip, since anonId is a server-internal identity concept.
  private connectedRotationPlayerIds(): string[] {
    return this.rotationAnonIds
      .map((anonId) => this.room.players.find((p) => p.anonId === anonId && p.connected))
      .filter((p): p is Player => !!p)
      .map((p) => p.id);
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

    const stats = this.gameStats.get(drawer.anonId) ?? { roundsDrawn: 0, correctGuesses: 0 };
    stats.roundsDrawn += 1;
    this.gameStats.set(drawer.anonId, stats);

    const isBountyRound = indices.roundIndex === this.bountyRoundIndex;
    const isMashupRound = !isBountyRound && indices.roundIndex === this.mashupRoundIndex;
    const [w1, w2, w3] = isMashupRound
      ? ([this.wordSelector.pickMashup(), this.wordSelector.pickMashup(), this.wordSelector.pickMashup()] as const)
      : isBountyRound
        ? this.wordSelector.pickThreeHard()
        : this.wordSelector.pickThree();
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
      isBountyRound,
      isReverseMode: this.room.settings.chaosModes.reverseMode,
      isMashupRound,
      mashupVoteOpen: false,
    };
    this.currentTurnStrokeIds = [];
    this.revealedIndices = new Set();
    this.mashupCandidateByAnon.clear();
    this.mashupVotes.clear();
    // Fixes a real gap: nothing previously told clients to wipe the canvas
    // between turns — currentTurnStrokeIds/revealedIndices were reset
    // server-side but the drawing itself lingered client-side until the
    // drawer manually hit Clear.
    this.broadcast(ServerEvents.DRAW_CLEAR, {});

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

    const rotationPlayerIds = this.connectedRotationPlayerIds();
    if (turn.isReverseMode) {
      // Reverse mode: everyone EXCEPT the drawer sees the real word — the
      // drawer has to draw/guess from the room's reactions instead. The
      // drawer's own targeted emit (sent second, so it wins for their
      // socket — same last-write-wins trick the normal path below relies
      // on) is the only one that gets the masked version.
      this.broadcast(ServerEvents.TURN_START, { turn, drawTimeSec, rotationPlayerIds } satisfies TurnStartPayload);
      this.emitTo(turn.drawerId, ServerEvents.TURN_START, {
        turn: { ...turn, word: null },
        drawTimeSec,
        rotationPlayerIds,
      } satisfies TurnStartPayload);
    } else {
      this.broadcast(ServerEvents.TURN_START, {
        turn: { ...turn, word: null },
        drawTimeSec,
        rotationPlayerIds,
      } satisfies TurnStartPayload);
      this.emitTo(turn.drawerId, ServerEvents.TURN_START, {
        turn,
        drawTimeSec,
        rotationPlayerIds,
      } satisfies TurnStartPayload);
    }

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
    let drawerBonusAwarded = 0;
    if (
      !turn.isReverseMode &&
      connectedGuessers.length > 0 &&
      turn.correctGuesserIds.length >= connectedGuessers.length
    ) {
      const drawer = this.room.players.find((p) => p.id === turn.drawerId);
      if (drawer) {
        drawerBonusAwarded = ScoreEngine.drawerAllGuessedBonus();
        drawer.score += drawerBonusAwarded;
        this.game.scoreboard[drawer.id] = drawer.score;
      }
    }

    // Momentum "decays quickly": anyone who was eligible to guess this turn
    // but didn't get it loses their streak.
    if (this.room.settings.chaosModes.momentum) {
      let changed = false;
      for (const guesser of connectedGuessers) {
        if (!turn.correctGuesserIds.includes(guesser.id)) {
          this.streaks.set(guesser.anonId, 0);
          this.game.momentum[guesser.anonId] = 0;
          changed = true;
        }
      }
      if (changed) {
        this.broadcast(ServerEvents.SCORE_UPDATE, {
          scoreboard: { ...this.game.scoreboard },
          teamScoreboard: this.currentTeamScoreboard(),
          momentum: { ...this.game.momentum },
        } satisfies ScoreUpdatePayload);
      }
    }

    turn.phase = "roundEnd";
    turn.mashupVoteOpen = turn.isMashupRound && this.mashupCandidateByAnon.size > 0;
    this.broadcast(ServerEvents.ROUND_END, {
      word: turn.word,
      scoreboardDelta: { ...this.game.scoreboard },
      teamScoreboard: this.currentTeamScoreboard(),
      isMashupRound: turn.isMashupRound,
      mashupVoteOpen: turn.mashupVoteOpen,
      mashupCandidates: turn.mashupVoteOpen ? [...this.mashupCandidateByAnon.values()] : undefined,
      drawerBonusAwarded,
    } satisfies RoundEndPayload);

    if (turn.mashupVoteOpen) {
      const t = setTimeout(() => this.resolveMashupVote(turn), MASHUP_VOTE_WINDOW_MS);
      this.turnTimeouts.push(t);
    } else {
      const t = setTimeout(() => this.advanceToNextTurnOrEnd(turn), ROUND_END_PAUSE_MS);
      this.turnTimeouts.push(t);
    }
  }

  // Tallies votes cast via castMashupVote and awards a flat bonus to the
  // most-voted "best interpretation" guesser (ties: first player to reach
  // the top count keeps it — consistent with this codebase's existing
  // tiebreak-by-order convention, see TournamentInstance's standings).
  private resolveMashupVote(turn: TurnState): void {
    turn.mashupVoteOpen = false;
    const tally = new Map<string, number>();
    for (const targetPlayerId of this.mashupVotes.values()) {
      tally.set(targetPlayerId, (tally.get(targetPlayerId) ?? 0) + 1);
    }
    let winnerId: string | null = null;
    let topVotes = 0;
    for (const [id, count] of tally) {
      if (count > topVotes) {
        winnerId = id;
        topVotes = count;
      }
    }
    let bonusAwarded = 0;
    if (winnerId) {
      const winner = this.room.players.find((p) => p.id === winnerId);
      if (winner) {
        bonusAwarded = SCORING.MASHUP_VOTE_BONUS;
        winner.score += bonusAwarded;
        this.game.scoreboard[winner.id] = winner.score;
        this.broadcast(ServerEvents.SCORE_UPDATE, {
          scoreboard: { ...this.game.scoreboard },
          teamScoreboard: this.currentTeamScoreboard(),
        } satisfies ScoreUpdatePayload);
      }
    }
    this.broadcast(ServerEvents.MASHUP_VOTE_RESULT, {
      winnerId,
      bonusAwarded,
    } satisfies MashupVoteResultPayload);
    this.mashupVotes.clear();
    this.mashupCandidateByAnon.clear();
    this.advanceToNextTurnOrEnd(turn);
  }

  castMashupVote(voterSocketId: string, targetPlayerId: string): void {
    const turn = this.game.turn;
    if (!turn || !turn.mashupVoteOpen) return;
    const voter = this.room.players.find((p) => p.id === voterSocketId);
    if (!voter) return;
    const target = this.room.players.find((p) => p.id === targetPlayerId);
    if (!target) return;
    this.mashupVotes.set(voter.anonId, targetPlayerId);
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

    let unlockedTitles: Record<string, string[]> | undefined;
    try {
      const topScore = ranked[0]?.score ?? 0;
      recordGameEndStats(
        this.room.players.map((p) => {
          const stats = this.gameStats.get(p.anonId) ?? { roundsDrawn: 0, correctGuesses: 0 };
          return {
            anonId: p.anonId,
            displayName: p.name,
            roundsDrawn: stats.roundsDrawn,
            correctGuesses: stats.correctGuesses,
            scoreEarned: p.score,
            isWinner: p.score === topScore && topScore > 0,
          };
        })
      );
      const titles: Record<string, string[]> = {};
      for (const p of this.room.players) {
        const newlyUnlocked = checkAndUnlockTitles(p.anonId);
        if (newlyUnlocked.length > 0) titles[p.anonId] = newlyUnlocked;
      }
      if (Object.keys(titles).length > 0) unlockedTitles = titles;
    } catch (err) {
      logger.error("Failed to persist anon stats", err);
    }

    this.broadcast(ServerEvents.GAME_END, {
      finalScoreboard: ranked,
      teamScoreboard: this.currentTeamScoreboard(),
      unlockedTitles,
    } satisfies GameEndPayload);
  }

  // ---- chat / guessing ----

  handleChat(playerId: string, text: string, channel: ChatChannel = "room"): void {
    let player = this.room.players.find((p) => p.id === playerId);
    if (!player || player.isMuted) return;
    const trimmed = text.trim().slice(0, 200);
    if (!trimmed) return;

    // Sabotage "swapGuesses": for a few seconds, whatever the two targeted
    // players type gets attributed to their partner instead — a light,
    // reversible prank rather than a real identity change.
    const swapPartnerAnonId = this.activeSwaps.get(player.anonId);
    if (swapPartnerAnonId) {
      const partner = this.room.players.find((p) => p.anonId === swapPartnerAnonId && p.connected);
      if (partner) player = partner;
    }

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
    // match by chatting the word. In reverse mode, only the drawer is a
    // genuine guesser — everyone else already sees the real word.
    const turn = this.game.turn;
    const guesserIdentityOk = turn?.isReverseMode
      ? player.id === turn.drawerId
      : player.id !== turn?.drawerId;
    if (
      !isTeamChannel &&
      this.isEligibleGuesser(player.id) &&
      turn &&
      turn.phase === "drawing" &&
      turn.word &&
      guesserIdentityOk &&
      !turn.correctGuesserIds.includes(player.id)
    ) {
      if (isCorrectGuess(trimmed, turn.word)) {
        this.handleCorrectGuess(player, turn);
        return;
      }
      if (isNearMiss(trimmed, turn.word)) {
        this.emitTo(player.id, ServerEvents.NEAR_MISS, {
          guess: trimmed,
          hint: trimmed.length === turn.wordLength ? "one letter off" : "close",
        } satisfies NearMissPayload);
        if (turn.drawerId !== player.id) {
          this.emitTo(turn.drawerId, ServerEvents.NEAR_MISS_PULSE, {
            playerId: player.id,
          } satisfies NearMissPulsePayload);
        }
      }
    }

    // Word mashup: non-winning guesses typed during the drawing phase are
    // the "candidate interpretations" the room votes on after the turn ends.
    if (!isTeamChannel && turn?.isMashupRound && turn.phase === "drawing" && player.id !== turn.drawerId) {
      this.mashupCandidateByAnon.set(player.anonId, { playerId: player.id, playerName: player.name });
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
    const basePoints = ScoreEngine.guesserPoints(Math.max(0, elapsedSec), this.room.settings.drawTimeSec);

    const chaos = this.room.settings.chaosModes;
    let streak = 0;
    if (chaos.momentum) {
      streak = (this.streaks.get(player.anonId) ?? 0) + 1;
      this.streaks.set(player.anonId, streak);
      this.game.momentum[player.anonId] = streak;
    }
    const points = ScoreEngine.applyMultipliers(basePoints, {
      isBounty: turn.isBountyRound,
      momentumStreak: chaos.momentum ? streak : undefined,
    });
    player.score += points;
    this.game.scoreboard[player.id] = player.score;

    const stats = this.gameStats.get(player.anonId) ?? { roundsDrawn: 0, correctGuesses: 0 };
    stats.correctGuesses += 1;
    this.gameStats.set(player.anonId, stats);

    if (chaos.sabotage && streak === SCORING.SABOTAGE_STREAK_THRESHOLD && !this.pendingPowerup.has(player.anonId)) {
      const powerup = SABOTAGE_POWERUPS[Math.floor(Math.random() * SABOTAGE_POWERUPS.length)]!;
      this.pendingPowerup.set(player.anonId, powerup);
      this.emitTo(player.id, ServerEvents.SABOTAGE_POWERUP_GRANTED, { powerup });
    }

    // Reverse mode: the "drawer" is the one guessing, so there's no
    // separate artist to award the per-guesser drawer bonus to.
    if (!turn.isReverseMode) {
      const drawer = this.room.players.find((p) => p.id === turn.drawerId);
      if (drawer) {
        drawer.score += ScoreEngine.drawerPointsForGuesser();
        this.game.scoreboard[drawer.id] = drawer.score;
      }
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
      momentum: chaos.momentum ? { ...this.game.momentum } : undefined,
    } satisfies ScoreUpdatePayload);

    const connectedGuessers = this.eligibleGuessers(turn.drawerId);
    if (connectedGuessers.every((p) => turn.correctGuesserIds.includes(p.id))) {
      this.endTurn();
    }
  }

  // Phase 3 sabotage: validates the sender actually holds the powerup they
  // claim, clears it, and applies the effect to the target(s).
  useSabotagePowerup(socketId: string, powerup: SabotagePowerup, targetPlayerId: string): void {
    const player = this.room.players.find((p) => p.id === socketId);
    if (!player) return;
    if (this.pendingPowerup.get(player.anonId) !== powerup) return;
    const target = this.room.players.find((p) => p.id === targetPlayerId && p.connected);
    if (!target || target.id === player.id) return;
    this.pendingPowerup.delete(player.anonId);

    if (powerup === "swapGuesses") {
      this.activeSwaps.set(player.anonId, target.anonId);
      this.activeSwaps.set(target.anonId, player.anonId);
      setTimeout(() => {
        this.activeSwaps.delete(player.anonId);
        this.activeSwaps.delete(target.anonId);
      }, SABOTAGE_EFFECT_DURATION_MS);
      this.emitTo(target.id, ServerEvents.SABOTAGE_EFFECT_APPLIED, {
        effect: powerup,
        durationMs: SABOTAGE_EFFECT_DURATION_MS,
        partnerId: player.anonId,
      } satisfies SabotageEffectAppliedPayload);
      this.emitTo(player.id, ServerEvents.SABOTAGE_EFFECT_APPLIED, {
        effect: powerup,
        durationMs: SABOTAGE_EFFECT_DURATION_MS,
        partnerId: target.anonId,
      } satisfies SabotageEffectAppliedPayload);
    } else {
      this.emitTo(target.id, ServerEvents.SABOTAGE_EFFECT_APPLIED, {
        effect: powerup,
        durationMs: SABOTAGE_EFFECT_DURATION_MS,
      } satisfies SabotageEffectAppliedPayload);
    }
  }

  // During a tournament match, only the two match participants are
  // "guessers" — everyone else connected is spectating that live match (see
  // startMatch) and shouldn't count toward "did everyone guess" or be able
  // to score a guess themselves. In reverse mode, only the drawer is a
  // genuine guesser (everyone else already sees the real word).
  private eligibleGuessers(drawerId: string): Player[] {
    if (this.game.turn?.isReverseMode) {
      const drawer = this.room.players.find((p) => p.id === drawerId && p.connected);
      return drawer ? [drawer] : [];
    }
    if (this.activeMatch) {
      const { anonA, anonB } = this.activeMatch;
      return this.room.players.filter(
        (p) => p.connected && p.id !== drawerId && (p.anonId === anonA || p.anonId === anonB)
      );
    }
    return this.room.players.filter((p) => p.connected && p.id !== drawerId);
  }

  private isEligibleGuesser(playerId: string): boolean {
    if (this.game.turn?.isReverseMode) {
      return playerId === this.game.turn.drawerId;
    }
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

  relayStrokeStart(socketId: string, payload: StrokeStartPayload): void {
    if (!this.isCurrentDrawer(socketId)) return;
    this.activeStrokeOps.set(payload.strokeId, {
      kind: "stroke",
      strokeId: payload.strokeId,
      tool: payload.tool,
      color: payload.color,
      size: payload.size,
      points: [payload.point],
    });
    this.broadcast(ServerEvents.DRAW_STROKE_START, payload);
  }

  relayStrokePoint(socketId: string, payload: StrokePointPayload): void {
    if (!this.isCurrentDrawer(socketId)) return;
    this.activeStrokeOps.get(payload.strokeId)?.points.push(...payload.points);
    this.broadcast(ServerEvents.DRAW_STROKE_POINT, payload);
  }

  relayStrokeEnd(socketId: string, payload: StrokeEndPayload): void {
    if (!this.isCurrentDrawer(socketId)) return;
    this.currentTurnStrokeIds.push(payload.strokeId);
    const op = this.activeStrokeOps.get(payload.strokeId);
    if (op) {
      this.committedOps.push(op);
      this.activeStrokeOps.delete(payload.strokeId);
    }
    this.broadcast(ServerEvents.DRAW_STROKE_END, payload);
  }

  // A fill is a single instant op (no start/point/end sequence) — slot its
  // id into the same undo history as strokes so DRAW_UNDO can remove either.
  relayFill(socketId: string, payload: DrawFillPayload): void {
    if (!this.isCurrentDrawer(socketId)) return;
    this.currentTurnStrokeIds.push(payload.strokeId);
    this.committedOps.push({ kind: "fill", strokeId: payload.strokeId, point: payload.point, color: payload.color });
    this.broadcast(ServerEvents.DRAW_FILL, payload);
  }

  relayClear(socketId: string): void {
    if (!this.isCurrentDrawer(socketId)) return;
    this.currentTurnStrokeIds = [];
    this.committedOps = [];
    this.activeStrokeOps.clear();
    this.broadcast(ServerEvents.DRAW_CLEAR, {});
  }

  relayUndo(socketId: string): void {
    if (!this.isCurrentDrawer(socketId)) return;
    const strokeId = this.currentTurnStrokeIds.pop();
    if (!strokeId) return;
    this.committedOps = this.committedOps.filter((op) => op.strokeId !== strokeId);
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

// Picks a random round index in [0, roundCount), avoiding `exclude` (used so
// bounty and mashup don't land on the same round when both are enabled) —
// falls back to allowing the collision if roundCount is too small to avoid it.
function pickDistinctRoundIndex(roundCount: number, exclude: number | null): number {
  if (roundCount <= 1 || exclude === null) return Math.floor(Math.random() * roundCount);
  let index = Math.floor(Math.random() * roundCount);
  if (index === exclude) index = (index + 1) % roundCount;
  return index;
}
