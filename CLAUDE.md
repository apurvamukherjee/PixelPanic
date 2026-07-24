# CLAUDE.md — Pixelpanic (Phase 1 + 2)

## What this is

**Pixelpanic** — a real-time multiplayer drawing/guessing game (Pictionary-
style). Guest-only, friend-group scale: no accounts, no Redis, no
horizontal-scaling infrastructure. One process serves the API, the socket
connections, and (in production) the built client.

This file documents **Phase 1 architecture in full, plus Phase 2 and Phase 3
addenda** (Phase 2: team mode, round-robin tournament, word-pack builder —
see "Phase 2 additions" below. Phase 3: chaos modes, legacy titles, rival
system, avatars — see "Phase 3 additions" below). Everything in the earlier
sections is still accurate; each phase only adds to it, nothing was
restructured. See [PHASE3-PLAN.md](PHASE3-PLAN.md) for the detailed
per-feature design rationale and [HANDOFF.md](HANDOFF.md) for current status
and what's been verified.

## Stack (fixed, do not substitute)

React 18 + TypeScript (strict) + Vite + Zustand + Tailwind + `perfect-freehand`
+ `socket.io-client` on the client. Node.js + Fastify + `socket.io` +
`better-sqlite3` on the server. A `shared` npm workspace holds every socket
event name and payload type consumed by both sides.

## Run / build

```bash
npm install
npm run dev         # server :3001 + client :5173, run together via concurrently
npm run typecheck    # tsc --noEmit, server + client
npm run build         # client build + server typecheck — should be clean before any change is considered done
```

`better-sqlite3` requires a native build on first `npm install` — see
README.md's Windows note if it fails with a node-gyp/Python error.

## Monorepo layout

```
shared/
  src/
    events.ts      ClientEvents / ServerEvents string-constant maps (no magic strings anywhere else)
    room.ts         Player (+ teamId), Team, RoomMode, RoomSettings (+ mode), Room (+ teams), DEFAULT_ROOM_SETTINGS
    game.ts         GamePhase, TurnState, GameState
    words.ts        WordPack + WordPackDetail (builder-only shape, see Phase 2 additions)
    chat.ts         ChatMessage (channel: "room" | "team")
    drawing.ts      StrokePoint (normalized 0..1) + Stroke*Payload shapes
    scoring.ts       SCORING constants + computeGuesserPoints() — shared so client can preview live if ever needed
    tournament.ts    TournamentMatch, TournamentStanding, TournamentState — Phase 2
    payloads.ts       every socket request/response payload interface
  → consumed as a real npm workspace package (`@pixelpanic/shared`), resolved
    straight to `src/` via package.json main/types — no build step, no dist/,
    edits are picked up immediately by both tsx (server) and Vite (client).

server/
  src/
    app.ts             Fastify instance: cors, /health, /api/wordpacks[...CRUD], static client/dist in prod
    index.ts            entrypoint: migrate() → buildApp() → attach socket.io
    config.ts            env/config (PORT, CORS_ORIGIN, DB_PATH)
    db/                  better-sqlite3: schema.sql (idempotent), seedWords.ts (150-word default pack),
                          connection.ts, migrate.ts (also does the one guarded ALTER TABLE for Phase 2 columns),
                          wordPacksRepo.ts, statsRepo.ts, tournamentRepo.ts (Phase 2)
    game/
      RoomManager.ts      sole in-memory Map<roomId, RoomInstance> — replaces Redis. Room lifecycle,
                          quick-match matching, empty-room GC sweep.
      RoomInstance.ts     ★ the core file. One room's Room + GameState + chat ring buffer + turn timer.
                          Turn/round state machine, scoring, hint scheduling, votekick/mute,
                          disconnect/reconnect/host-transfer policy, teams, tournament matches
                          (implements TournamentHost). Read this file first.
      TurnStateMachine.ts  pure functions: nextTurnIndices()/initialTurnIndices() — round/turn math only
      TeamRotation.ts       pure: buildTeamInterleavedRotation() — Phase 2, fair rotation across uneven teams
      TournamentScheduler.ts pure: generateRoundRobinSchedule() (circle method) + pickNextMatch() — Phase 2
      TournamentInstance.ts  Phase 2: owns a tournament's schedule/standings/tiebreaker, drives RoomInstance.startMatch
      HintScheduler.ts     computeHintSchedule() + buildMaskedWord() — pure, no state
      ScoreEngine.ts        thin wrapper around shared computeGuesserPoints() + drawer bonus constants
                          + computeTeamScoreboard() (Phase 2, team avg score)
      WordSelector.ts       picks 3 word choices per turn, avoids repeats within a session
      guessMatcher.ts        normalizes + compares guess text to the target word
    rooms/roomCodes.ts     6-char Crockford base32 room code generator
    sockets/               one file per concern (room/game/draw/chat/mod/team/tournament)Handlers.ts, wired in index.ts
    types/socketAugment.d.ts  augments socket.data with { roomId, anonId }

client/
  src/
    store/                6 separate Zustand stores (connection, room, game, chat, drawing, tournament) —
                          split so high-frequency events (stroke points, timer ticks) don't
                          re-render unrelated UI
    canvas/               strokeCapture.ts (local pointer capture → normalized deltas),
                          perfectFreehandRender.ts (getStroke → Path2D), remoteStrokeRenderer.ts
                          (two-canvas: committed bitmap + live in-progress layer)
    hooks/useSocket.ts     wires every non-drawing ServerEvent into the relevant store; mounted once in App.tsx
    routes/               HomePage, RoomPage (single route that switches lobby/game/leaderboard/tournament-
                          standings by game phase + tournament state, not by URL — the socket connection
                          never remounts), JoinByLinkRedirect (cold-link name prompt), WordPackBuilderPage (Phase 2)
    components/          lobby/ (+ TeamAssignmentPanel), game/, endgame/ (+ TournamentStandingsScreen),
                          wordpacks/ (Phase 2), shared/ (+ Icon.tsx — Material Symbols wrapper)
```

## The turn/round state machine

`lobby → wordChoice → drawing → roundEnd → (wordChoice | gameEnd)`, entirely
driven server-side by `RoomInstance`. Key points anyone touching this needs
to know:

- **The server is the sole timer authority.** Clients never run independent
  countdown logic — they render `turnEndsAt` (epoch ms) locally and resync
  on periodic `TIMER_TICK` broadcasts. Don't add client-side timers that
  decide when a turn ends.
- **`TurnState` (and therefore `turn.drawerId`) is only populated after
  `TURN_START` fires** — i.e. *after* the drawer picks a word. During the
  `wordChoice` phase, nothing about `turn` exists yet. Any UI that needs to
  know "am I the drawer" *during word choice* must key off something else —
  see the bug/fix below.
- **`WORD_CHOICES` is a private emit** (`io.to(drawerSocketId).emit(...)`) —
  only the drawer's own client ever receives it. This is intentionally how
  `WordChoiceOverlay` determines "am I the drawer": if I have `wordChoices`
  locally, I'm the drawer; everyone else in the `wordChoice` phase without it
  shows the "waiting" message.
- **Rotation is recomputed at every round boundary** (`turnIndexInRound`
  wrapping to 0), not frozen once at game start — this is what naturally
  folds in mid-game joiners and drops permanently-left players without a
  separate waiting-queue data structure.
- **`io.to(room).emit(...)` includes the sender.** Everyone *except* the
  local drawer still renders purely from that echoed broadcast — one source
  of truth for their canvases. The drawer's own in-progress stroke is the
  one deliberate exception (`DrawingCanvas.tsx`): it renders immediately
  from local pointer input instead of waiting on the round-trip, because on
  a deployed server that round-trip is real latency that reads as input lag
  (invisible on localhost, where RTT ≈ 0). `localStrokeIdsRef` tracks which
  strokeIds were rendered locally so their own echo is a no-op (checked, not
  re-applied) — that's what prevents double-render/drift. If you touch this
  path, keep that invariant: a strokeId is rendered from exactly one source,
  local input for the drawer's own pen, the echo for everything else.

## Known bug fixed during Phase 1 verification

`WordChoiceOverlay.tsx` originally derived `isDrawer` from
`turn?.drawerId === mySocketId`. Because `turn` isn't populated until
`TURN_START` (see above), this was `false` for *everyone* during the
word-choice phase — including the real drawer, who saw the "waiting for
drawer" message instead of the word picker, while non-drawers (who never
receive `wordChoices` at all) saw nothing. Fixed by gating the whole overlay
on `phase === "wordChoice"` and branching the picker-vs-waiting UI on
whether `wordChoices` itself is non-null. If you ever see "waiting for
drawer" shown to the actual drawer again, this is the first place to check.

## Conventions

- **No magic socket event strings.** Always import from
  `ClientEvents`/`ServerEvents` in `shared/src/events.ts`.
- **Normalized coordinates.** `StrokePoint.x`/`.y` are always 0..1 relative
  to canvas width/height — never raw pixels — so phone-portrait and
  desktop-landscape canvases render the same strokes correctly. Denormalize
  only at the point of rendering (`remoteStrokeRenderer.ts`).
- **Fill is a point+color op, not a stroke, but shares the undo history.**
  `DrawTool` includes `"fill"`; unlike pencil/brush/eraser it has no drag
  phase — `strokeCapture.ts` fires `onFill` straight from `pointerdown`. The
  flood fill itself (`canvas/floodFill.ts`) runs independently on every
  client against its own rasterized canvas rather than syncing pixel data —
  see HANDOFF.md's "Additional features" section for the assumption that
  relies on and why it hasn't been stress-tested yet.
- **Every new socket event needs a typed payload in `shared/` first**,
  added to both `ClientEvents`/`ServerEvents` and a corresponding interface
  in `payloads.ts`, before any handler code is written.
- **Destructive room actions** (votekick, mute) are host/majority-gated
  server-side — never trust a client-supplied permission check.
- **No client-supplied authority.** The server derives drawer identity,
  scoring, and timer deadlines itself; it never trusts a client's claim
  about elapsed time, whose turn it is, or the correct word.

## Ambiguous choices resolved (Phase 1)

Documented inline as comments in `RoomInstance.ts`, summarized here:

- **Scoring:** guesser points = linear decay `100 → 10` over the turn's draw
  time; drawer gets a flat 50/correct guesser + 50 bonus if everyone guesses.
- **Hints:** 4-tier `hintFrequency` (off/slow/normal/fast = 0/25/40/60% of
  letters), spaced evenly across 20%–90% of the turn, shuffled reveal order.
- **Votekick:** majority of connected non-target players
  (`ceil(eligibleVoters / 2)`); no host immunity.
- **Quick-match:** first public lobby-phase room with a free slot, else
  create a new one — no skill/ELO matching.
- **Disconnects:** drawer disconnect → turn ends immediately; guesser
  disconnect → no special handling; host disconnect → host transfers
  immediately to the next connected player. 20s reconnect grace period
  matched by `anonId`, but a disconnected drawer's turn is not resumed.
- **Room codes:** 6-char Crockford base32, collision-checked against the
  live `RoomManager` Map.
- **Custom word lists:** host pastes comma/newline-separated words; each
  submission creates a fresh `word_packs` row — no dedup in Phase 1.

## Non-negotiables

- Friend-group scale: no Redis, no multi-instance scaling infra.
- Guest-only: no accounts, `localStorage` anon ID only.
- Single process in production: server serves the built client too.

## Phase 2 additions

Team mode, round-robin tournament, and a word-pack builder, built on top of
the Phase 1 engine above without changing any of it structurally. Full
narrative in HANDOFF.md's "Phase 2 — what was built" section; the load-
bearing facts anyone touching this code needs:

- **Team mode barely touches the guessing engine.** Any non-drawer, on any
  team, can still score a correct guess in the room channel exactly like
  Phase 1 — team mode only changes *drawer rotation* (interleaved fairly
  across teams by `TeamRotation.buildTeamInterleavedRotation`, called from
  `RoomInstance.startTurn` only when `room.settings.mode === "team"`), the
  *scoreboard display* (team avg is derived on every broadcast from
  `Player.score`, never stored separately), and adds a *second chat channel*
  scoped by a per-team Socket.IO room (`team:${roomId}:${teamId}`, joined at
  team-assignment time).
- **A tournament match is a normal 1-round, 2-player game**, not a separate
  system. `RoomInstance.startMatch(anonA, anonB, onComplete)` seeds
  `rotationAnonIds` to exactly those two (checked first in `startTurn`,
  before the team/solo branches) and forces `game.totalRounds = 1`; on
  completion it diffs each participant's score against a snapshot taken at
  match start and hands the delta to `onComplete` instead of doing the
  normal room-wide `GAME_END` broadcast. This means **everyone in the room
  watches every match live** (spectators included) — matches are not run in
  isolated parallel sessions. Because of that, `RoomInstance.eligibleGuessers`/
  `isEligibleGuesser` restrict who can score a guess or count toward "did
  everyone guess" to just the two match participants while `activeMatch` is
  set — without this, a spectator typing the word in chat would score points
  that don't belong to either player and could stop a match's turn from
  ending early. If you ever touch guess-scoring logic, check this gate is
  still applied.
- **Tournament orchestration lives in `TournamentInstance`**, which
  `RoomInstance` owns (`private tournament: TournamentInstance | null`) and
  implements the narrow `TournamentHost` interface for (deliberately no
  import cycle: `TournamentInstance.ts` never imports `RoomInstance.ts`).
  Pairing is the classic round-robin circle method
  (`TournamentScheduler.generateRoundRobinSchedule`); the tiebreaker (wins →
  head-to-head → point differential → total points → join order) is
  documented as a comment directly above `computeStandings()` in
  `TournamentInstance.ts`.
- **Word pack builder is REST, not sockets** (`app.ts`:
  `GET/POST/PUT/DELETE /api/wordpacks[...]`), separate from the pre-existing
  lobby "quick custom list" socket flow (`WORD_PACK_CREATE`), which is
  unchanged. Ownership is enforced by an explicit `anonId` in every
  request body/query param (there's still no auth/session anywhere in this
  app) and checked in `wordPacksRepo.ts`; built-in packs (`is_built_in = 1`)
  can never be updated or deleted. Per-word `category` and pack
  `ownerAnonId` are exposed only via the separate `WordPackDetail` shape —
  gameplay code (`WordSelector`, `RoomManager.resolveWordPack`,
  `WordChoiceOverlay`) still only ever sees the original flat
  `WordPack.words: string[]`.
- **Design system**: `design/DESIGN.md` (+ mockups) is a reference for
  visual language only — colors/type/glassmorphism/component patterns are
  real and applied throughout `client/src`; the mockups' fictional feature
  content (XP/levels, Store, Gallery, public lobby browser) is not part of
  this app and was intentionally not built.

## Phase 3 additions

Chaos modes, legacy titles, a rival system, and avatar customization, built
on top of the Phase 1+2 engine without restructuring it. Full narrative in
HANDOFF.md's "Phase 3 — what was built" section; the load-bearing facts:

- **`chaosModes` is a plain bag of independent booleans on `RoomSettings`**
  (`shared/src/room.ts`), reusing `ROOM_UPDATE_SETTINGS` exactly like every
  other setting — no new DB table, per the original spec's own instruction.
  `RoomInstance` reads it live in `startGame`/`startTurn`/`handleChat`, but
  freezes the per-turn-relevant subset (`isBountyRound`, `isReverseMode`,
  `isMashupRound`, `mashupVoteOpen`) onto `TurnState` at `startTurn` so
  scoring/eligibility logic doesn't re-read `room.settings` mid-turn.
- **Momentum streaks and sabotage's pending-powerup/active-swap state live
  as anonId-keyed private `Map`s directly on `RoomInstance`** (`streaks`,
  `pendingPowerup`, `activeSwaps`), the same pattern `graceTimers` already
  used — anonId, not socket.id, so state survives a reconnect. Momentum
  decays (resets to 0) when a player was eligible to guess a turn but
  didn't, not on every turn boundary — the plan's original "decays quickly"
  wording was resolved this way because a flat per-turn reset would cap the
  streak at 1 and defeat the multiplier ramp entirely.
- **Near-miss detection must be server-side**: guessers' clients only ever
  see `turn.maskedWord`, never the real word, so the Levenshtein check
  (`guessMatcher.isNearMiss`) runs in `RoomInstance.handleChat` right next
  to the exact-match check, and the result is a private `NEAR_MISS` emit —
  not a client-computable diff, despite the original spec's "pure
  client-side" framing.
- **Reverse mode does not change who draws** — it only swaps which side of
  the `TURN_START` broadcast is stripped of the real word, and narrows
  `eligibleGuessers`/`isEligibleGuesser` to just the nominal drawer (since
  everyone else already knows the word, letting them "guess" would be
  meaningless/exploitable). This is a deliberate simplification of an
  underspecified spec item — see PHASE3-PLAN.md's own note that reverse
  mode has "no real enforcement mechanism," resolved here by restricting who
  can score rather than trying to police chat content.
- **Word mashup's "room votes on best interpretation"** doesn't map onto a
  single-drawer-per-turn engine, so the resolved reading is: a 15s vote
  window (`turn.mashupVoteOpen`) opens after a mashup round's normal
  `ROUND_END`, sourced from non-winning guesses typed during that turn
  (`RoomInstance.mashupCandidateByAnon`) — a sub-state of the `roundEnd`
  phase, not a new `GamePhase`.
- **Legacy titles fixed a real Phase 1/2 gap**: `endGame()` was calling
  `recordGameEndStats` with `roundsDrawn`/`correctGuesses` hardcoded to `0`.
  Both are now tracked per-game (`RoomInstance.gameStats`, an anonId-keyed
  map incremented in `startTurn`/`handleCorrectGuess`) and passed through
  for real — titles in `shared/src/titles.ts` (names) +
  `server/src/db/titlesRepo.ts` (unlock checks against `anon_stats`) depend
  on these being accurate.
- **Rival system is REST, not sockets** (`GET /api/rivals?anonId=` in
  `app.ts`), following the word-pack builder's precedent for
  session-independent profile data. Auto-pairs on first request by closest
  lifetime average score (`server/src/db/rivalsRepo.ts`); a
  `PresenceTracker` singleton (`server/src/game/PresenceTracker.ts`),
  updated from `RoomManager`'s existing join/leave paths, is the only thing
  that pushes a socket event (`RIVAL_ONLINE_CHANGED`) — and only to an
  *existing* pairing, never creating one itself.
- **Ghost drawing is the one deliberate no-build**: `ChaosModes.ghostDrawing`
  exists for schema completeness (host UI shows it disabled/"coming soon"),
  but `RoomInstance.updateSettings` force-clears it on every patch. Per
  PHASE3-PLAN.md's own instruction, it needs a stroke-aggregation pipeline
  fed by real play history that doesn't exist yet.
- **Avatars are curated presets, not composable layers**: `Player.avatarId`
  (the one real schema change this phase) references one of 16 entries in
  `client/src/lib/avatarPresets.ts` (Material Symbols icon + background
  color, reusing the webfont already loaded rather than a bespoke art
  pipeline). `Avatar.tsx` falls back to today's initials-circle when
  `avatarId` is null/unrecognized.
