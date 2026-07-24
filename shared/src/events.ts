// Socket event name constants shared by client and server, so a typo in an
// event name is a compile error instead of a silent runtime no-op.

export const ClientEvents = {
  ROOM_CREATE: "room:create",
  ROOM_JOIN: "room:join",
  ROOM_LEAVE: "room:leave",
  ROOM_QUICK_MATCH: "room:quickMatch",
  ROOM_UPDATE_SETTINGS: "room:updateSettings",
  GAME_START: "game:start",
  WORD_CHOOSE: "word:choose",
  DRAW_STROKE_START: "draw:strokeStart",
  DRAW_STROKE_POINT: "draw:strokePoint",
  DRAW_STROKE_END: "draw:strokeEnd",
  DRAW_FILL: "draw:fill",
  DRAW_CLEAR: "draw:clear",
  DRAW_UNDO: "draw:undo",
  CHAT_MESSAGE: "chat:message",
  MOD_VOTEKICK: "mod:votekick",
  MOD_MUTE: "mod:mute",
  WORD_PACK_CREATE: "wordPack:create",
  ROOM_SET_TEAMS: "room:setTeams",
  ROOM_SET_PLAYER_TEAM: "room:setPlayerTeam",
  TOURNAMENT_START: "tournament:start",
  // Phase 3 — chaos modes
  SABOTAGE_USE_POWERUP: "sabotage:usePowerup",
  MASHUP_VOTE: "mashup:vote",
} as const;

export const ServerEvents = {
  ROOM_STATE: "room:state",
  ROOM_ERROR: "room:error",
  GAME_PHASE_CHANGE: "game:phaseChange",
  WORD_CHOICES: "word:choices",
  TURN_START: "turn:start",
  TIMER_TICK: "timer:tick",
  HINT_REVEAL: "hint:reveal",
  DRAW_STROKE_START: "draw:strokeStart",
  DRAW_STROKE_POINT: "draw:strokePoint",
  DRAW_STROKE_END: "draw:strokeEnd",
  DRAW_FILL: "draw:fill",
  DRAW_CLEAR: "draw:clear",
  DRAW_UNDO: "draw:undo",
  // Private catch-up emit — see DrawSnapshotPayload.
  DRAW_SNAPSHOT: "draw:snapshot",
  CHAT_MESSAGE: "chat:message",
  GUESS_CORRECT: "guess:correct",
  SCORE_UPDATE: "score:update",
  ROUND_END: "round:end",
  GAME_END: "game:end",
  MOD_VOTEKICK_UPDATE: "mod:votekickUpdate",
  MOD_MUTED: "mod:muted",
  TOURNAMENT_STATE: "tournament:state",
  TOURNAMENT_MATCH_START: "tournament:matchStart",
  TOURNAMENT_COMPLETE: "tournament:complete",
  // Phase 3 — chaos modes
  NEAR_MISS: "chaos:nearMiss",
  // Drawer-only "someone's close" signal — no guess text, just a pulse so
  // the drawer can feel the room without a guesser's private hint leaking.
  NEAR_MISS_PULSE: "chaos:nearMissPulse",
  SABOTAGE_POWERUP_GRANTED: "sabotage:powerupGranted",
  SABOTAGE_EFFECT_APPLIED: "sabotage:effectApplied",
  MASHUP_VOTE_RESULT: "mashup:voteResult",
  // Phase 3 — retention features
  RIVAL_STATE: "rival:state",
  RIVAL_ONLINE_CHANGED: "rival:onlineChanged",
} as const;

export type ClientEventName = (typeof ClientEvents)[keyof typeof ClientEvents];
export type ServerEventName = (typeof ServerEvents)[keyof typeof ServerEvents];
