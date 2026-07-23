# CLAUDE.md — Pixelpanic (Phase 1)

## What this is

**Pixelpanic** — a real-time multiplayer drawing/guessing game (Pictionary-
style). Guest-only, friend-group scale: no accounts, no Redis, no
horizontal-scaling infrastructure. One process serves the API, the socket
connections, and (in production) the built client.

This file documents **Phase 1 only** (the MVP turn-based loop). Phases 2
(team mode, round-robin tournament, word-pack builder UI) and 3 (chaos
modes, rival system, retention features) are specced in the original prompt
but not yet built — see [HANDOFF.md](HANDOFF.md) for the full spec and status.

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
    room.ts         Player, RoomSettings, Room, DEFAULT_ROOM_SETTINGS
    game.ts         GamePhase, TurnState, GameState
    words.ts        WordPack
    chat.ts         ChatMessage
    drawing.ts      StrokePoint (normalized 0..1) + Stroke*Payload shapes
    scoring.ts       SCORING constants + computeGuesserPoints() — shared so client can preview live if ever needed
    flags.ts         RoomFeatureFlags — Phase 2/3 hook, unused in Phase 1 logic
    payloads.ts       every socket request/response payload interface
  → consumed as a real npm workspace package (`@pixelpanic/shared`), resolved
    straight to `src/` via package.json main/types — no build step, no dist/,
    edits are picked up immediately by both tsx (server) and Vite (client).

server/
  src/
    app.ts             Fastify instance: cors, /health, /api/wordpacks, static client/dist in prod
    index.ts            entrypoint: migrate() → buildApp() → attach socket.io
    config.ts            env/config (PORT, CORS_ORIGIN, DB_PATH)
    db/                  better-sqlite3: schema.sql (idempotent), seedWords.ts (150-word default pack),
                          connection.ts, migrate.ts, wordPacksRepo.ts, statsRepo.ts
    game/
      RoomManager.ts      sole in-memory Map<roomId, RoomInstance> — replaces Redis. Room lifecycle,
                          quick-match matching, empty-room GC sweep.
      RoomInstance.ts     ★ the core file. One room's Room + GameState + chat ring buffer + turn timer.
                          Turn/round state machine, scoring, hint scheduling, votekick/mute,
                          disconnect/reconnect/host-transfer policy. Read this file first.
      TurnStateMachine.ts  pure functions: nextTurnIndices()/initialTurnIndices() — round/turn math only
      HintScheduler.ts     computeHintSchedule() + buildMaskedWord() — pure, no state
      ScoreEngine.ts        thin wrapper around shared computeGuesserPoints() + drawer bonus constants
      WordSelector.ts       picks 3 word choices per turn, avoids repeats within a session
      guessMatcher.ts        normalizes + compares guess text to the target word
    rooms/roomCodes.ts     6-char Crockford base32 room code generator
    sockets/               one file per concern (room/game/draw/chat/mod)Handlers.ts, wired in index.ts
    types/socketAugment.d.ts  augments socket.data with { roomId, anonId }

client/
  src/
    store/                5 separate Zustand stores (connection, room, game, chat, drawing) —
                          split so high-frequency events (stroke points, timer ticks) don't
                          re-render unrelated UI
    canvas/               strokeCapture.ts (local pointer capture → normalized deltas),
                          perfectFreehandRender.ts (getStroke → Path2D), remoteStrokeRenderer.ts
                          (two-canvas: committed bitmap + live in-progress layer)
    hooks/useSocket.ts     wires every non-drawing ServerEvent into the relevant store; mounted once in App.tsx
    routes/               HomePage, RoomPage (single route that switches lobby/game/leaderboard by
                          game phase, not by URL — the socket connection never remounts),
                          JoinByLinkRedirect (cold-link name prompt)
    components/          lobby/, game/, endgame/, shared/
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
- **`io.to(room).emit(...)` includes the sender.** The drawer's own strokes
  are rendered purely from the echoed broadcast, not drawn locally first —
  one source of truth for canvas rendering, avoids double-render/drift bugs.
  Don't add a separate "local optimistic stroke" rendering path.

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
