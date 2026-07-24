# HANDOFF — Pixelpanic

**Date:** 2026-07-24
**Status:** Phase 1 (MVP) built and scripted-verified. Phase 2 (team mode,
round-robin tournament, word-pack builder) and Phase 3 (chaos modes, legacy
titles, rival system, avatars, animated background/UI polish — everything
except ghost drawing, which is deliberately deferred) are both built on top
of it — typechecked, linted, built, unit-tested (Vitest, 45 tests across
every pure scoring/rotation/scheduling/matching function), and REST/
migration-level runtime-smoke-tested, but **neither has been human-
playtested in a browser yet**. Production-readiness work (rate limiting, a
client error boundary, Docker/Fly.io deploy config) is also done. See the
"Phase 2" and "Phase 3" sections below for exactly what to verify next.

This doc is the "pick up where we left off" reference. For architecture and
conventions, see [CLAUDE.md](CLAUDE.md) (Phase 1 + 2). For setup/run
instructions, see [README.md](README.md). For what's next, see
[PHASE3-PLAN.md](PHASE3-PLAN.md).

---

## What was built

The full Phase 1 spec: turn-based drawing/guessing loop, public quick-match
+ private room-by-link (12-player cap), host settings panel (round count,
draw time, custom word list, hint frequency), mod tools (votekick, mute),
realtime incremental stroke sync over socket.io, progressive hint reveal,
time-decayed scoring, and an end-of-game leaderboard. Full file list and
architecture in CLAUDE.md.

Phase 2 (team mode, tournament, word-pack builder UI) is now built — see
"Phase 2 — what was built" below. Phase 3 (chaos modes, rival system,
near-miss taunts) has not been started — it remains exactly as specced in
the original prompt, reproduced in full at the bottom of this doc for
reference.

## Phase 2 — what was built

**Team mode.** `RoomSettings.mode: "solo" | "team"`, `Room.teams: Team[]`,
`Player.teamId`. Drawer rotation interleaves round-robin across teams
(`server/src/game/TeamRotation.ts`) so no team goes twice before every team
with players has gone once, regardless of uneven team size. Team score is
computed server-side as the average of member scores (never summed, never a
second source of truth — derived from `Player.score` on every broadcast) in
`ScoreEngine.computeTeamScoreboard`. Team chat is a second Socket.IO room
(`team:${roomId}:${teamId}`) reusing the existing `ChatMessage`/`CHAT_MESSAGE`
event with an added `channel` field, rather than a parallel event pair.
Guessing/scoring itself is untouched by team mode — any non-drawer can still
score a correct guess in the room channel; only rotation, the team-average
scoreboard, and the extra chat channel are team-aware.

**Tournament (round-robin).** Host starts a tournament from the lobby over
all currently connected players (2–10 cap). `TournamentScheduler.ts`
generates the round-robin pairing via the classic circle method. Each match
is run as a **1-round, 2-player game through the existing turn engine**
(`RoomInstance.startMatch`) rather than a second game loop — this was the
single biggest simplification call in Phase 2: matches play out sequentially
in the one shared room/session (everyone spectates live), not as isolated
parallel games with separate canvases, since simultaneous multi-canvas play
isn't justified at friend-group scale. `TournamentInstance.ts` owns the
schedule, standings, and tiebreaker (wins → head-to-head → point
differential → total points → join order — see the tiebreaker comment in
that file). Spectators who aren't in the active match can't score a guess
or count toward "did everyone guess" (`RoomInstance.eligibleGuessers`/
`isEligibleGuesser`) — this was a real bug caught during self-review, not
part of the original design, since the naive version let anyone in the room
contaminate match scoring by guessing along in chat. Completed tournaments
are persisted via `db/tournamentRepo.ts`.

**Word pack builder.** Standalone `/wordpacks` page, REST-based
(`GET/POST/PUT/DELETE /api/wordpacks[...]`, ownership-checked by `anonId`,
built-in packs are never editable/deletable), separate from the existing
lobby "quick custom list" socket flow which is untouched. Per-word
categories are stored (`word_pack_words.category`) but kept out of the
`WordPack` shape gameplay code already consumes — a parallel `WordPackDetail`
type is used only by the builder, so there's zero blast radius on
`WordSelector`/`RoomManager`/`WordChoiceOverlay`. JSON export only, no
import (per spec, "skip unless trivial"). The `owner_anon_id` and `category`
columns were added via a small guarded `ALTER TABLE` in `migrate.ts` (the
one place this diverges from the pure `CREATE TABLE IF NOT EXISTS`
convention in `schema.sql`, since column changes to an existing table aren't
naturally idempotent) — preserves any existing dev DB instead of requiring a
wipe.

**Visual design system pass.** A "Modern-Electric" glassmorphism design
system (purple/cyan/pink on obsidian, Sora/Inter/JetBrains Mono, Material
Symbols icons) was supplied as reference (`design/` folder: `DESIGN.md` +
Stitch-generated mockups for lobby/drawing/guessing/leaderboard) and applied
across every screen — both pre-existing Phase 1 screens and everything built
in Phase 2. `tailwind.config.ts` now carries the full token palette;
`index.css` adds the `.glass` panel utility and a few keyframe animations
(`timer-pulse`, `guess-correct`, `shimmer`); a new `Icon.tsx` wraps the
Material Symbols webfont. **Note:** the mockups themselves depict a much
bigger fictional feature set (XP/levels, a Store, a Gallery, a public lobby
browser, a global activity feed) that isn't part of the actual Pixelpanic
spec — only the *visual language* (colors, type, glassmorphism, component
styling patterns) was extracted and applied to this app's real screens/
features, not that fictional content.

## Phase 3 — what was built

Full chaos-mode + retention feature set from PHASE3-PLAN.md, minus ghost
drawing (see below). All modes are independent booleans on
`RoomSettings.chaosModes`, host-toggleable from the lobby's settings panel,
reusing the existing `ROOM_UPDATE_SETTINGS` patch mechanism — no schema
changes beyond that bag, per the original spec's own instruction.

**Momentum, bounty, near-miss.** A per-anonId streak counter
(`RoomInstance.streaks`) increments on each correct guess and resets when a
player whiffs a turn they were eligible to guess in (not on every turn
boundary — a refinement over the plan's initial "decays every turn" wording,
since that would have capped the streak at 1 and defeated the ramp). Feeds
`ScoreEngine.applyMultipliers` (shared `applyScoreMultipliers`), which ramps
guesser points up to a 2x multiplier at a 5-guess streak and separately
applies a flat 5x on the one random bounty round chosen per game
(`WordSelector.pickThreeHard`, filtered to the pack's longest ~40% of
words). Near-miss taunts run server-side in `guessMatcher.isNearMiss`
(Levenshtein distance ≤1, or ≤2 for words over 6 letters) since guessers'
clients only ever see the masked word — a private `NEAR_MISS` emit, shown
as a 4th `ChatMessage.kind` in `ChatPanel.tsx`.

**Curse words & reverse mode.** Curse words is almost entirely client-side:
`DrawingCanvas.tsx` skips calling the stroke renderer for the drawer's own
canvas only when the flag is on, while strokes still broadcast normally so
everyone else renders fine. Reverse mode flips which side of the
`TURN_START` broadcast gets the real word (room sees it, the nominal
"drawer" gets the masked version) and narrows `eligibleGuessers`/
`isEligibleGuesser` so only that person can score a guess — everyone else
already knows the word, so their guesses wouldn't be meaningful.

**Sabotage powerups.** Crossing the momentum-streak threshold
(`SCORING.SABOTAGE_STREAK_THRESHOLD`) grants one of three random powerups
(blur/swapGuesses/freezePalette), used via a new `sockets/chaosHandlers.ts`
against a target player. `swapGuesses` is implemented as a 3-second window
where `RoomInstance.handleChat` re-attributes the sender's message to their
swap partner's identity before any further processing — a light, reversible
prank per the plan's own resolved reading of this ambiguous spec item, not
a permanent effect.

**Word mashup.** Resolved interpretation (documented here since "room votes
on best interpretation" doesn't map cleanly onto a single-drawer-per-turn
engine): one wildcard round gives the drawer a 2-word compound target
(`WordSelector.pickMashup`); non-winning guesses typed during that turn
become "candidate interpretations"; a 15s vote window opens after the turn
ends (`turn.mashupVoteOpen`, a sub-state of the `roundEnd` phase rather than
a new `GamePhase`) where everyone votes on the best guess for a flat bonus.

**Legacy titles.** Fixed a real pre-existing gap along the way:
`RoomInstance.endGame()` was calling `recordGameEndStats` with
`roundsDrawn`/`correctGuesses` hardcoded to `0` — these are now tracked
per-game and passed through for real. 8 static milestone titles (first win,
century club, champion, etc. — see `shared/src/titles.ts` for display names
and `server/src/db/titlesRepo.ts` for the unlock checks) are checked right
after stats are recorded and folded onto the existing `GAME_END` payload
(`unlockedTitles`) rather than a new event.

**Rival system.** V1 scope per the plan: stat comparison only, no
head-to-head match log. REST, not sockets (`GET /api/rivals?anonId=`),
mirroring the word-pack builder's precedent for session-independent
profile data — auto-pairs on first request by closest lifetime average
score (`server/src/db/rivalsRepo.ts`). A lightweight cross-room
`PresenceTracker` singleton (updated from `RoomManager`'s existing
join/leave paths) pushes `RIVAL_ONLINE_CHANGED` when a pairing exists and
the other side connects/disconnects — this never eagerly creates a pairing
on its own, only on an explicit REST request. Surfaced via a new
`AppHeader.tsx` (also carries the animated "Pixelpanic" wordmark and a "By
Apurva" credit, mounted once outside the phase-switching routes so it
persists across navigation).

**Ghost drawing — deliberately not built.** PHASE3-PLAN.md's own
instruction was "do not attempt until enough games are logged." The
`ghostDrawing` flag exists on `ChaosModes` for schema completeness, but the
host settings UI shows it disabled with a "coming soon" label and the
server force-clears it on every settings update.

**Avatars, animated background, animations, user guide.** A curated set of
16 preset avatars (Material Symbols icon + background color combo, reusing
the webfont already loaded rather than a bespoke art pipeline) picked via
arrow-cycle/dice on `HomePage`, persisted to `localStorage` alongside the
existing saved name, added to `Player.avatarId` (the one real schema change
in this phase, per the plan). A tiled, slowly-drifting inline-SVG doodle
background sits behind every screen; turn-start/score-change/player-join
moments now use small CSS-only transitions (`turn-reveal`, `score-pop`,
`player-join` in `index.css`), and the previously-unused `timer-pulse`/
`shimmer` keyframes from Phase 2 are still available for further use. A new
`FeatureGuide.tsx` on `HomePage` documents every feature/chaos
mode/mod tool in-app so players don't need this file to understand what
they're toggling.

## Not yet verified — Phase 3

Everything above typechecks, builds, lints, and passes its unit tests
(`npm run test`). A runtime smoke test (server boot, migration, `/health`,
`/api/wordpacks`, `/api/rivals` including actual pairing creation against
real `anon_stats` rows) passed. Nothing has been clicked through in a real
browser — same limitation as Phase 1/2, no browser automation available in
this environment:

- Every chaos mode toggle, in a live multi-tab game: momentum ramping
  visibly, a bounty round actually landing and paying 5x, curse words
  hiding the drawer's own canvas while others still see it, reverse mode's
  inverted word visibility and guess eligibility, a sabotage powerup being
  granted/used/expiring (all 3 effects), and a full mashup round through to
  vote resolution.
- Legacy titles actually unlocking and rendering on `LeaderboardScreen`.
- The rival panel: pairing creation, the online/offline dot flipping live
  across two tabs, stat accuracy after a real game.
- The avatar picker end-to-end (pick → persists → shows up for other
  players in `PlayerList`/`WaitingRoomList`/`LeaderboardScreen`), the doodle
  background/animations rendering as intended, and the `AppHeader` wordmark/
  rival icon not overlapping page content awkwardly on mobile.
- The Docker image actually building and running (`docker build` was not
  run in this environment) and a real `flyctl deploy`.

## Environment setup friction (resolved)

`better-sqlite3` needs a native build. This machine initially had only the
Microsoft Store Python stub (non-functional for node-gyp) and no Visual
Studio Build Tools. Two dead ends were hit before it worked:

1. `npm install -g windows-build-tools` — deprecated, broken on modern
   npm/Node, tries to fetch Python 2.7 which wouldn't even satisfy the
   >=3.6 requirement. Don't use this.
2. Installing real Python 3 alone wasn't enough — node-gyp also needs
   Visual Studio's "Desktop development with C++" workload.

**What actually worked:** installing Python 3 from python.org and Visual
Studio Build Tools (Desktop development with C++) from
visualstudio.microsoft.com/visual-cpp-build-tools, both added to `PATH`.
After that, `npm install` compiled `better-sqlite3` cleanly.

If this environment is ever rebuilt from scratch (new machine, CI, Docker),
budget for this — it's the single most likely install-time failure.

## Bug found and fixed during verification

See CLAUDE.md's "Known bug fixed during Phase 1 verification" section —
`WordChoiceOverlay.tsx` was checking `turn.drawerId` (not populated until
after word choice) instead of the presence of the privately-sent
`wordChoices` payload, so the real drawer saw the wrong UI and other players
saw nothing during the word-choice phase. Fixed; verified working after.

## How it was verified

No existing project skill covered running this app, and `chromium-cli`
wasn't available in this environment, so verification used a one-off
Playwright script (written to the repo root as `verify-pixelpanic.cjs`,
then deleted after use — not part of the committed codebase). It drove 3
separate browser contexts (host + 2 guests, distinct `localStorage` anon
IDs) through:

1. Create private room → copy code → 2 guests join via link → live player
   list sync confirmed in all 3 tabs.
2. Host starts game → confirmed exactly one tab receives the word-choice
   picker, the other two show "waiting for drawer."
3. Drawer picks a word → confirmed guessers see masked underscores (correct
   length), never the real word.
4. Drawer draws a stroke (pencil, multiple points) → confirmed the same
   stroke renders on both guesser canvases in near-real-time.
5. A guesser sends a wrong guess (shown as plain chat), then the correct
   word → confirmed a green "Correct! +N points" message, live scoreboard
   update, and correct sort order (highest score first).
6. Both guessers guess correctly → confirmed the round ends early (doesn't
   wait for the full timer) and rotates to a new drawer.
7. Zero browser console errors across all 3 tabs throughout.

**One key discovery along the way:** `http://localhost:5173` was
intermittently serving the wrong project. A leftover Vite dev server from
the user's separate **Portfolio** project was bound to `[::1]:5173`
(IPv6 loopback only), while Pixelpanic's own Vite bound to the IPv4/dual-
stack address on the same port number — Windows allows two processes to
share a port number across different address families. Chromium's
`localhost` resolution picked the wrong one. Fixed by testing against
`http://127.0.0.1:5173` explicitly rather than touching the other project's
process. Worth remembering if `localhost:5173` ever looks wrong again —
check `netstat -ano | findstr :5173` before assuming Pixelpanic itself is
broken.

## Not yet verified — Phase 2

Everything below typechecks, builds, and lints clean. The word-pack builder
REST API was smoke-tested end to end with curl (create/list/update/delete/
export, ownership 403s, built-in-pack delete 403). Nothing else has been
exercised in a real browser — no Playwright/`chromium-cli` was available in
this environment (same limitation noted for Phase 1 below).

- **Team mode end-to-end**: assigning uneven teams, starting a game, and
  confirming the drawer rotation actually interleaves fairly (e.g. a 1-person
  team and a 3-person team both drawing roughly equally often), the team
  chat channel staying isolated from room chat, and the team-average
  scoreboard updating correctly on `PlayerList`/`LeaderboardScreen`.
- **Tournament end-to-end**: a real 3+ player round-robin through every
  match to final standings, including the tiebreaker logic actually
  triggering (needs a contrived tie), and the "Now playing: A vs B" /
  between-match standings UI transitions.
- **Word pack builder UI**: the actual `/wordpacks` page click-through
  (create/edit/delete/export via the browser, not just curl), and confirming
  a builder-created pack shows up in a room's "Word list" dropdown.
- **The visual redesign, in a real browser**: fonts loading (Google Fonts
  CDN — will silently fall back to sans-serif if offline), the glass/blur
  effect rendering correctly, Material Symbols icons resolving instead of
  showing raw icon-name text (webfont must load before first paint), and the
  whole thing on an actual phone (all styling was written from the mockups'
  markup, not visually verified against them).

## Additional features (post-Phase 2, ad hoc)

**Paint-bucket fill tool.** A `"fill"` `DrawTool` alongside pencil/brush/
eraser — click the canvas to flood-fill a contiguous region with the
selected color. Architecturally different from strokes: it's a single
instant point+color op (`DrawFillPayload`, reusing the `strokeId` field name
as a generic per-op undo id so it slots into the existing undo history
alongside strokes — see the comment on `DrawFillPayload` in
`shared/src/drawing.ts`), not a dragged sequence of points.

**Important architectural note, not yet stress-tested:** the flood fill
(`client/src/canvas/floodFill.ts`) runs independently on every client
against its own locally-rasterized committed canvas — the fill point+color
is broadcast, not pixel data, consistent with the existing "never full
canvas frames" rule. This assumes every client's canvas is byte-identical at
the moment of the fill, which is already an implicit assumption the whole
committed-stroke-replay system makes (same Path2D + same canvas calls should
render identically across browsers). It's untested whether that holds
closely enough in practice for flood fill specifically — flood fill is far
more sensitive to tiny antialiasing differences at region boundaries than
strokes are, since a single differently-colored boundary pixel can change
which region gets filled. Worth a specific check across different
browsers/devices in the same room before trusting it; if it turns out to
drift, the fallback is making fills server-authoritative (server holds a
canonical raster and broadcasts the resulting delta or a small raster patch)
rather than trusting independent client-side computation.

## Not yet verified — Phase 1

- **A full multi-round game to the leaderboard screen.** The scripted test
  only exercised one round + rotation to a second drawer, not a complete
  game (all rounds × all players) through to `GameEnd`/`LeaderboardScreen`
  and the "Play Again" flow back to lobby.
- **Votekick and mute in the running app.** Server logic was code-reviewed
  and the formulas documented, but neither was clicked through in a real
  browser session.
- **Real mobile/touch behavior.** The verification script ran desktop-sized
  Playwright contexts. The responsive layout (tabbed Players/Chat panel
  below `md`, `touch-action: none` on the canvas, `100dvh` chat input) has
  not been tested on an actual phone or with DevTools device emulation.
- **Drawer/guesser disconnect-mid-turn behavior** (20s reconnect grace,
  immediate turn-end on drawer disconnect, host transfer) — implemented per
  the documented policy in `RoomInstance.ts`, not manually triggered.
- **Custom word list creation** (`WordPackCreate` round trip via socket.io
  ack callback) — implemented and typechecked, not clicked through.

## Recommended next steps (pick up here)

1. Human playtest Phase 1, Phase 2, **and** Phase 3 together: run
   `npm run dev`, open 3+ real browser tabs, play a full solo game to the
   leaderboard, then a team-mode game, then a 3+ player tournament, then a
   game with each chaos mode toggled on, then click through the word-pack
   builder and the rival panel — see the three "Not yet verified" sections
   above for the specific things to check.
2. Test on an actual phone (or DevTools device toolbar) for the mobile
   layout, touch-drawing, the glassmorphism/font rendering, and the new
   `AppHeader`/doodle background not interfering with anything.
3. Build the Docker image locally (`docker build -t pixelpanic .`) and run
   it once before trusting it in Fly.io — it hasn't been built in this
   environment (no Docker available here).
4. `flyctl auth login` → `flyctl launch --no-deploy` → create the
   `pixelpanic_data` volume → `flyctl deploy`, per README.md's "Deploying"
   section.
5. Commit the working tree once signed off — commits are intentionally left
   to the user rather than made automatically.

---

## Full original spec (for reference — Phase 2 done, Phase 3 not started)

### Tech stack (fixed, do not substitute)
- **Frontend:** React + TypeScript, Zustand for state, Tailwind for styling,
  `perfect-freehand` for stroke rendering, `socket.io-client` for realtime
- **Backend:** Node.js + Fastify, `socket.io` for realtime, in-memory `Map`
  for live room/game state (no Redis), `better-sqlite3` for persistent data
  (word packs, anon stats, tournament history)
- **Auth:** none — guest play only, `localStorage` anon ID for persistent stats
- **Deploy target:** single process, Fly.io/Render/small VPS — do not add
  Redis or horizontal-scaling infra

### Phase 2 — Team mode, Tournament, Word Pack Builder (✅ built, see above)

**Team mode**
- Teams can be uneven in size
- Team score = **average of member scores** (not sum) — use this formula
  everywhere team totals are computed or displayed
- Drawer rotation must cycle fairly across all teams regardless of team size
- Separate team chat channel from global room chat

**Tournament (round-robin)**
- N players → N×(N-1)/2 matches
- Add a player cap (recommend ~10) or a Swiss-style cutoff for larger groups
- Standings table: wins/losses + point differential; pick one clear
  tiebreaker rule and document it in code comments
- Server-side match scheduler for concurrent matches

**Word pack builder UI**
- CRUD screen: add/edit/delete words, tag categories, name and save a pack
- Packs stored in SQLite, owned by creator's anon ID, selectable at
  room-creation time
- v1: no sharing/marketplace between users
- JSON export for a pack (skip import unless trivial)

### Phase 3 — Chaos modes + retention features (not started)

Each chaos mode is an independent boolean flag in room settings:
```
chaosModes: {
  sabotage: bool,
  curseWords: bool,
  mashup: bool,
  momentum: bool,
  ghostDrawing: bool,
  reverseMode: bool,
  bounty: bool
}
```
Server checks these flags when picking round type/scoring — no schema
changes needed to add future modes.

- **Sabotage powerups** — guess-streak earns a random powerup (blur
  opponent screen / swap 2 guesses / freeze drawer's palette)
- **Curse words mode** — drawer's own canvas hidden from themselves
- **Word mashup** — one wildcard round combines 2 random words, room votes
  on best interpretation for bonus points
- **Momentum meter** — combo multiplier on consecutive correct guesses,
  decays quickly
- **Ghost drawing** — build this LAST; needs a stroke-data aggregation
  pipeline (store strokes per word across games) before it can show a
  crowd-average overlay. Do not attempt until enough games are logged.
- **Reverse mode** — guessers see the word, drawer doesn't; drawer guesses
  from chat reactions only
- **Bounty words** — a flagged hard word worth 5x points, visible countdown
- **Legacy titles** — anon-ID-persistent milestone titles unlocked by achievements

**Retention features**
- **Rival system** — auto-pair players with similar skill (win rate/avg
  score), head-to-head record, notify when rival comes online. Needs a
  skill metric, persistent anon-ID pairing table, lightweight presence
  tracking.
- **Near-miss taunt** — pure client-side string-diff on each guess; "SO
  CLOSE" flash + highlight the differing letter if 1 letter off. No schema
  changes needed.

### Working agreement
1. Confirm repo scaffold and shared types package before writing game logic. ✅ done
2. Build and manually verify Phase 1 end-to-end before touching Phase 2. ⚠️ Phase 2 was started on the user's explicit instruction before a human
   playtest pass happened — scripted/REST verification only (see above).
3. For ambiguous implementation choices, pick the simplest option consistent
   with "friend-group scale, no premature scaling infra," document the
   assumption as a code comment, and keep moving. ✅ done — see CLAUDE.md and
   the Phase 2 decisions documented above (team rotation, tournament match
   model, tiebreaker rule, word-pack REST vs socket).
4. Keep socket event contracts in `/shared` — any new event type gets a
   typed interface there first. ✅ done for Phase 2, keep following it in Phase 3

See [PHASE3-PLAN.md](PHASE3-PLAN.md) for the Phase 3 + production-readiness
plan.
