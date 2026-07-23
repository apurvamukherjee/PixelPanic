# PHASE3-PLAN — Chaos modes, retention features, production-readiness

**Status:** Planning only — nothing in this document has been built yet.
This is the plan for the last phase in the original spec (chaos modes +
retention features), plus what it takes to actually call Pixelpanic
"production ready" once that's done.

Prerequisite before any of this starts: a human playtest of Phase 1 + 2 (see
HANDOFF.md's "Not yet verified" sections). Phase 3 sits on top of the turn
engine, team mode, and tournament system — bugs in the foundation will just
get harder to isolate once chaos modes are checking flags inside the same
code paths.

## Scope, per the original spec

```ts
chaosModes: {
  sabotage: bool,
  curseWords: bool,
  mashup: bool,
  momentum: bool,
  ghostDrawing: bool,
  reverseMode: bool,
  bounty: bool,
}
```

Each mode is an independent boolean on room settings, checked by the server
when picking round type/scoring — no schema changes needed to add a future
mode, per the original spec. Plus two retention features (rival system,
near-miss taunt) and legacy titles.

## Key design decisions to make going in

These are the ambiguous calls the original spec leaves open. Documenting
the intended resolution here so implementation doesn't stall on them —
consistent with the working agreement (pick the simplest option, document
the assumption, keep moving).

- **Near-miss taunt can't be purely client-side.** The spec describes it as
  "pure client-side string-diff... no schema changes needed," but guessers'
  clients only ever see the *masked* word (`turn.maskedWord`), never the
  real one — only the drawer's client and the server know it. The diff has
  to happen server-side, in `RoomInstance.handleChat`, right where
  `isCorrectGuess` already runs and fails. "No schema changes" still holds
  (this is a new lightweight event + payload in `shared/`, not a DB change)
  — just not a client-only computation.
- **`chaosModes` lives on `RoomSettings`**, not a new DB table — it's
  room-instance-only ephemeral state exactly like `roundCount`/`drawTimeSec`,
  reusing the existing `ROOM_UPDATE_SETTINGS` patch mechanism.
- **Reverse mode's "guesses from chat reactions only"** has no real
  enforcement mechanism for "don't just say the word" — there's no profanity/
  spoiler filter in this codebase and building one is out of scope. Simplest
  option: rely on the honor system (friend-group scale), and make the
  "drawer" role in reverse mode a genuine guesser (they *can* type guesses,
  scored normally) rather than trying to police what guessers say.
- **Sabotage's "swap 2 guesses"** is underspecified in the original prompt.
  Simplest coherent interpretation: for 3 seconds, the two targeted players'
  guess input boxes silently swap where their typed text is sent to chat
  under (a light, reversible prank, not a permanent effect) — worth
  confirming with whoever's picking this up before building it, since it's
  the one mechanic here with real room for a different reasonable reading.
- **Rival system's "head-to-head record"** — this codebase doesn't currently
  log match-level "who beat whom" outside of tournament matches (solo/team
  games just accumulate individual scores). Simplest v1: show current stat
  comparison (wins, avg score) between the two rivals rather than building a
  dedicated match-log table just for this. A real head-to-head log is a
  reasonable v2 if it turns out to matter.
- **Ghost drawing stays last**, per the spec's own instruction — it needs a
  stroke-aggregation pipeline (persisted strokes per word, across games)
  that doesn't exist yet and won't have meaningful data to aggregate from
  until Phase 3's other modes have been played for a while. Treat it as a
  stretch goal for this phase, not a committed deliverable.

## Implementation order

**Wave A — low risk, self-contained, ship first**
1. Near-miss taunt (server-side diff, one new lightweight event)
2. Curse words mode (client-only: skip local canvas render for the drawer
   when the flag is on — strokes still broadcast normally, so this is
   almost free given strokes already render purely from the echoed
   broadcast, never drawn locally first)
3. Momentum meter (per-player combo streak + decaying multiplier feeding
   into `ScoreEngine.guesserPoints`)

**Wave B — moderate, build on Wave A's streak tracking**
4. Bounty words (flag one round per game as bounty, filter word choices to
   longer/harder words, 5x multiplier, visible countdown)
5. Reverse mode (swap which side of the turn broadcast gets the real word)
6. Sabotage powerups (reuses the momentum streak counter to grant a random
   powerup; needs a targeted client-effect event for blur/palette-freeze)

**Wave C — bigger, more novel subsystems**
7. Word mashup (voting flow: propose 2-word combo, room votes, bonus payout)
8. Legacy titles (new `achievements`/`unlocked_titles` tables, checked
   against `anon_stats` after `recordGameEndStats`)
9. Rival system (skill metric from existing `anon_stats`, a persistent
   pairing table, lightweight in-memory online-presence set broadcast to
   rivals)

**Wave D — deferred**
10. Ghost drawing — only once Wave A–C have generated enough game history to
    aggregate from. Needs its own design pass when picked up (stroke storage
    format, aggregation/rendering algorithm, when to show the overlay).

Production-readiness work (below) can run in parallel with Waves A–C; the
final security/deploy pass should happen after everything else, following a
human playtest of the whole feature set.

## Production-readiness (the "wrap up" work)

This codebase currently has **zero automated tests** — only `tsc --noEmit`,
eslint, and manual/scripted verification. That's been an acceptable
tradeoff for two phases built in quick succession, but calling this
"production ready" should mean more than "it compiles."

- **Automated tests for the pure functions** — the highest-value, lowest-
  effort test target: `TurnStateMachine`, `TeamRotation`,
  `TournamentScheduler`, `ScoreEngine` (including any Phase 3 multipliers),
  `HintScheduler`, `guessMatcher`, and the new near-miss diff logic are all
  pure, deterministic, and currently only verified by hand. Use Vitest —
  it's Vite-native, zero extra build config, consistent with "no premature
  infra."
- **Basic abuse/resilience hardening** — simple in-memory rate limiting
  (a token bucket keyed by `socket.id`, no Redis needed at this scale) on
  chat/guess submission and votekick spam, which currently have no
  throttling at all beyond the existing input-length/validation checks.
- **Security review pass** — no auth exists by design (guest-only, per the
  non-negotiables), so this isn't about adding login. It's about confirming
  the *accepted* risk surface is actually acceptable and documented, not
  accidental: anonId-based ownership (word packs) is spoofable by design at
  this trust level — that's fine for a friend group and should be written
  down as a known, accepted limitation rather than silently discovered
  later. Also: production `CORS_ORIGIN` config, and a pass over anywhere
  user text renders (React escapes by default, so this should mostly be a
  confirmation pass, not new work).
- **Deployment artifact** — a `Dockerfile` or `fly.toml`/`render.yaml` so
  `npm run build && npm start` isn't the only documented path to a running
  deployment, plus explicit documentation that `DB_PATH` needs to point at
  a persistent volume (word packs/stats/tournament history are lost
  otherwise on every redeploy).
- **Client error boundary** — there's currently no React error boundary
  anywhere in `client/src`; an unexpected render error blanks the whole app
  silently. One boundary at the `App` root is enough at this scale.
- **Final human playtest** of every chaos mode + the rival system before
  calling any of this done, same as Phase 1 and Phase 2.
