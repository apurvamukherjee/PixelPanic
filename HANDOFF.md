# HANDOFF — Pixelpanic

**Date:** 2026-07-24
**Status:** Phase 1 (MVP) built and scripted-verified. Phase 2 (team mode,
round-robin tournament, word-pack builder) built on top of it — typechecked,
linted, built, and REST-level smoke-tested, but **not yet human-playtested
in a browser**. See the "Phase 2" section below for what to verify next.

This doc is the "pick up where we left off" reference. For architecture and
conventions, see [CLAUDE.md](CLAUDE.md) (Phase 1 only — still accurate, Phase
2 isn't folded into it yet). For setup/run instructions, see
[README.md](README.md).

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

1. Human playtest Phase 1 **and** Phase 2 together: run `npm run dev`, open
   3+ real browser tabs, play a full solo game to the leaderboard, then a
   team-mode game, then a 3+ player tournament, then click through the
   word-pack builder — see the two "Not yet verified" sections above for the
   specific things to check.
2. Test on an actual phone (or DevTools device toolbar) for the mobile
   layout, touch-drawing, and the new glassmorphism/font rendering.
3. Commit the working tree. `git init` was run and everything is staged, but
   commits were intentionally left to the user rather than made
   automatically — nothing has been committed yet.
4. Once Phase 2 is signed off, move to Phase 3 (chaos modes + retention
   features) — see the plan for that below / the full spec at the bottom of
   this doc.

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
