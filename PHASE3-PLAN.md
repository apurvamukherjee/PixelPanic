# PHASE3-PLAN — Chaos modes, retention features, production-readiness

**Status:** Built. Everything below is implemented — chaos modes (Waves
0/A/B/C except ghost drawing, which stays deferred per this doc's own
instruction), the polish/animation/avatar wave, and the production-
readiness section — typechecked, linted, built, and unit-tested. See
HANDOFF.md's "Phase 3 — what was built" section for what actually happened
vs. this plan (a few resolved-in-practice refinements, e.g. momentum decay
triggers on a missed turn rather than every turn boundary) and its "Not yet
verified — Phase 3" section for what still needs a human browser playtest
before calling this fully done. This document is kept as-is below for
historical/design-rationale reference.

~~Prerequisite before any of this starts: a human playtest of Phase 1 + 2~~
— this was built on the user's explicit instruction ahead of that
prerequisite (same call already made for Phase 2, see HANDOFF.md), so the
playtest debt now covers Phase 1 through 3 together.

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

## Polish, animation & avatars (added per user request)

Not from the original spec — added on top of it. Four asks, roughly ordered
cheapest-to-most-involved:

- **Auto-clear the canvas at turn boundaries.** Right now nothing clears the
  committed canvas automatically — `DRAW_CLEAR` only fires if the drawer
  manually hits the Clear button, so a new drawer's turn can start on top of
  the previous drawing unless they remember to clear it themselves. This is
  really a Phase 1/2 correctness gap that surfaced while scoping this list,
  not a genuinely new Phase 3 feature — worth fixing independently of the
  rest of Phase 3, before chaos modes add more turn-boundary complexity on
  top of it. Fix: `RoomInstance.startTurn` broadcasts `DRAW_CLEAR` itself
  when a new turn begins (word-choice phase), so the canvas is always blank
  by the time a word gets chosen — no new event needed, reuses the existing
  one, and it also naturally covers tournament matches since they run
  through the same `startTurn`.
- **An animated, doodle-themed background**, in the spirit of the reference
  image (a tiled pattern of light hand-drawn icons — pencils, stars, speech
  bubbles — drifting slowly behind the UI). Simplest option: author a small
  set (8-10) of simple line-doodle icons as inline SVG, tile them as a
  repeating CSS background behind the existing glass panels (low opacity, so
  it reads as texture, not noise, and doesn't fight the panels' legibility),
  and animate `background-position` slowly via a CSS keyframe for the drift.
  No new asset pipeline or external library needed — this stays consistent
  with the "Modern-Electric" glassmorphism direction already applied, just
  adds the missing "alive background" layer the current flat `bg-background`
  doesn't have.
- **More animation throughout the game.** `index.css` already has
  `timer-pulse`, `guess-correct`, and `shimmer` keyframes from the Phase 2
  design pass — this extends that same CSS-only approach (no animation
  library needed) to more moments: a turn-start transition when the drawer
  is revealed, a score count-up tween instead of the number just jumping,
  player join/leave list transitions, a small celebratory burst on a correct
  guess (reuse/extend `guess-correct`), and a round-end reveal transition
  before the canvas clears. Keep these all CSS transitions/keyframes rather
  than reaching for Framer Motion or similar — nothing here needs
  physics-based or gesture-driven animation, and pulling in an animation
  library would be exactly the kind of infra this project keeps
  deliberately avoiding.
- **Per-player avatar customization ("bitmoji"-style character creator)**,
  replacing today's initials-in-a-colored-circle `Avatar.tsx`. This is the
  biggest of the four asks — the recommended v1 scope, and the reasoning
  for it: a *fully compositional* system (independently mix-and-matchable
  base/eyes/mouth/accessory layers, like the reference image's per-feature
  arrow pickers) means designing and maintaining several art layers per
  slot and a compositing renderer — real, ongoing art production for a
  friend-group game. Simplest option that still delivers "pick your
  character, cycle with arrows, hit dice to randomize": a curated set of
  15-20 **complete** preset character illustrations (not independently
  composable pieces) that the player cycles through with the same
  left/right-arrow + dice UI as the reference, at name-entry time on
  `HomePage` (and re-editable later from a small profile affordance).
  Store the chosen preset id in `localStorage` next to the existing saved
  name, and add it to `Player` (`shared/src/room.ts`) so it's visible to
  everyone in the room — **this is a real, deliberate schema change**
  (`Player.avatarId: string`), unlike most of the rest of this document.
  `Avatar.tsx` renders the chosen preset image instead of initials, with
  initials kept as the fallback for anyone who hasn't picked one. True
  independently-composable layers (matching the reference image's per-slot
  arrows exactly) are a reasonable v2 if the preset set turns out too
  limiting, but shouldn't be the v1 bar.

## Implementation order

**Wave 0 — do first, ahead of everything else above**
0. Canvas auto-clear at turn boundaries — a correctness fix, not a feature;
   fixing it before Wave A means chaos-mode turn transitions (bounty rounds,
   reverse mode, curse words) never have to think about stale canvas state.

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

**Wave E — polish, animation & avatars**
11. Animated doodle background + expanded game animations — purely additive
    CSS/visual work, no dependency on any chaos mode, can genuinely run
    whenever (including in parallel with Waves A–C if there's a second
    person free to do it).
12. Avatar customization — do this one on its own, not squeezed in alongside
    a chaos-mode wave, since it's the one item in this whole document with a
    real `Player` schema change; touching it at the same time as, say,
    reverse mode (which also changes what's broadcast about `turn`/`Player`)
    is how two unrelated changes end up merge-conflicting over the same
    types for no good reason.

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
