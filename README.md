# Pixelpanic

**Draw. Guess. Panic.** A real-time multiplayer drawing-and-guessing game —
Pictionary, but built for a friend group who wants to jump into a browser
tab together with zero setup: no accounts, no installs, no lobby friction.
Just a name, a room code, and a pencil.

## The vision

Most drawing games either stay a toy (one game mode, no depth) or bolt on
scale nobody asked for (accounts, matchmaking, leaderboards for strangers).
Pixelpanic is aiming for the middle: **enough depth to stay interesting
across a whole game night, none of the infrastructure a game night doesn't
need.**

That plays out across three phases:

- **The core loop (shipped)** — turn-based drawing and guessing that just
  works: pick a word, draw it, everyone races to guess, points decay with
  time, hints peel away as the clock runs down. Public quick-match for
  "anyone up for a game," private rooms-by-link for "just us."
- **Structured play (shipped)** — team mode for uneven friend-group sizes,
  a round-robin tournament for when "one more game" turns into "let's find
  out who's actually the best," and a word-pack builder so the words are
  always the ones your group actually wants to draw.
- **Chaos and retention (shipped, minus ghost drawing)** — sabotage
  powerups, curse-words mode, word mashups, momentum multipliers, bounty
  rounds, reverse mode, legacy titles, and a rival system that pairs you
  against someone at your skill level. Ghost drawing (a crowd-average
  overlay) is intentionally deferred — it needs a stroke-aggregation
  pipeline fed by real play history that doesn't exist yet. See
  [PHASE3-PLAN.md](PHASE3-PLAN.md) for the detailed plan and what's verified
  vs. not.

Every design decision in this codebase is filtered through one question:
does this make game night better, or does it just make the architecture
diagram bigger? See [CLAUDE.md](CLAUDE.md) for the specific calls that
answer made along the way.

## Features

**Play**

- Public quick-match or a private room you share by link — 12 players per room
- Configurable round count, draw time, and hint frequency
- Live incremental stroke sync (everyone watches the drawing happen, not a
  finished image) with pencil, brush, eraser, paint-bucket fill, and a full
  color palette
- Progressive hint reveal and time-decayed scoring, so early correct guesses
  are worth more than last-second ones
- Mod tools: votekick and mute, majority-gated server-side

**Team mode**

- Teams of any size, including uneven ones
- Drawer rotation interleaves fairly across teams regardless of size — no
  team draws twice before every team has had a turn
- Team score is the _average_ of member scores, shown everywhere a team
  total appears
- A private team chat channel alongside the room-wide one

**Tournament**

- Round-robin scheduling (every player faces every other player) via the
  classic circle method, capped at 10 players
- Live standings — wins, losses, point differential — with a documented
  tiebreaker rule
- Every match plays out live in the shared room, so the whole group watches
  together instead of splitting into isolated games

**Word packs**

- Build, edit, and delete your own word lists with per-word categories
- Export any pack as JSON
- Packs you create are instantly selectable when hosting a room

## Tech stack

- **Client** — React 18 + TypeScript (strict), Zustand, Tailwind CSS,
  `perfect-freehand` for stroke rendering, `socket.io-client`, React Router,
  Vite. Visual design: Sora / Inter / JetBrains Mono, Material Symbols
  icons, a glassmorphism "Modern-Electric" dark theme (`design/DESIGN.md`).
- **Server** — Node.js + Fastify + `socket.io`, an in-memory `Map` for live
  room/game state (this is the thing that would need to become Redis if this
  ever stopped being friend-group scale — it deliberately hasn't), and
  `better-sqlite3` for anything that needs to survive a restart: word packs,
  anonymous player stats, and tournament history.
- **Shared** — a `/shared` npm workspace holding every socket event name and
  payload type, imported by both client and server, so the two sides of the
  wire can't drift silently out of sync.
- **Auth** — none. Guest play only, via a `localStorage` anonymous ID that
  survives reconnects and drives persistent stats.

## Status

Phase 1 (the MVP loop), Phase 2 (team mode, tournament, word-pack builder),
and Phase 3 (chaos modes, legacy titles, rival system, avatars, animated
background — everything except ghost drawing) are built, typechecked,
linted, built, and unit-tested clean (`npm run test` covers every pure
scoring/rotation/scheduling/matching function). None of Phase 2 or Phase 3
has had a full human playtest pass in a real browser yet — see
[HANDOFF.md](HANDOFF.md) for exactly what's been verified (including a
runtime smoke test of the new REST endpoints and DB migration) and what to
check next. Production-readiness work (rate limiting, a client error
boundary, Vitest coverage, Docker/Fly.io deploy config) is done — see
"Deploying" below.

## Quick start

### Requirements

- Node.js 20+ (developed against Node 24)
- On Windows, `better-sqlite3` needs a native build the first time:
  **Python 3** (the real one, not the Microsoft Store stub) and **Visual
  Studio Build Tools** with the "Desktop development with C++" workload.
  Both need to be on `PATH` before `npm install`.

### Setup

```bash
npm install         # installs all 3 workspaces (client, server, shared)
npm run dev          # runs server (:3001) + client (:5173) together
```

Open `http://127.0.0.1:5173` (use `127.0.0.1`, not `localhost` — see the
Windows loopback note below), enter a name, and either quick-match into a
public room or create a private one to share with friends. Open a couple
more tabs to play with yourself while testing.

On first boot the server seeds a 150-word default pack into SQLite
(`server/data/pixelpanic.sqlite`, gitignored).

Other useful scripts:

```bash
npm run typecheck    # tsc --noEmit across server + client
npm run lint          # eslint across the whole monorepo
npm run build          # builds the client, typechecks the server
npm run test           # vitest — pure scoring/rotation/scheduling/matching functions
```

Per-workspace equivalents: `npm run dev -w server`, `npm run dev -w client`, etc.

### Windows loopback gotcha

If `http://localhost:5173` shows the wrong app, another process may already
own IPv6 loopback (`[::1]:5173`) while Vite binds the IPv4/dual-stack
address — Windows lets two different processes claim the same port number
on different address families. Check with `netstat -ano | findstr :5173`,
or just visit `http://127.0.0.1:5173` directly.

## Project layout

```
shared/   socket event names + payload types (single source of truth)
server/   Fastify + socket.io + in-memory game engine + SQLite
client/   React app — stores, canvas rendering, routes, components
design/   visual design system reference (colors, type, component patterns)
```

See [CLAUDE.md](CLAUDE.md) for the full file-by-file architecture, the
turn/round state machine, and every "simplest option" decision made along
the way that needs to stay consistent as the codebase grows.

## Deploying

Single process, single port: in production, `server` serves the built
`client/dist` itself via `@fastify/static` (see `server/src/app.ts`) — no
separate static host needed. No Redis, no multi-instance scaling — this is
intentionally friend-group scale, and it matters operationally too: this
process holds live rooms/games in an in-memory `Map` (`RoomManager`), so it
must run as exactly one always-on instance, never scaled to zero or
horizontally.

### Fly.io (Docker)

A `Dockerfile`, `.dockerignore`, and `fly.toml` are included at the repo
root — a multi-stage build (full devDependencies to compile
`better-sqlite3` and build the client, then a slim runtime image) that
matches this project's existing scripts (`npm run build -w client`,
`npm start -w server`) exactly, no new build steps invented.

```bash
flyctl auth login
flyctl launch --no-deploy          # confirms/creates the app from fly.toml
flyctl volumes create pixelpanic_data --size 1 --region iad
flyctl deploy
```

The volume is required — `DB_PATH` (word packs, anon stats, tournament
history, rival pairings, unlocked titles) points at `/data`, which is only
persistent across redeploys if it's a mounted Fly volume rather than the
container's own ephemeral filesystem. `fly.toml` also pins
`min_machines_running = 1` / `auto_stop_machines = false` for the
in-memory-state reason above.

### Manual (any VPS/Render)

```bash
npm run build -w client   # produces client/dist
npm start -w server         # tsx src/index.ts, serves API + socket.io + client/dist
```

Set `DB_PATH` to a path on a persistent volume/disk before running in
production, and `CORS_ORIGIN` if the client is ever served from a different
origin than the API (same-origin static serving, as above, doesn't need it).

## Security notes

No auth exists anywhere in this app, by design (guest-only, per the
non-negotiables) — this section documents what that tradeoff actually means
in practice rather than leaving it implicit:

- **`anonId` ownership is spoofable.** Word packs, rival pairings, and
  stats are all keyed by a client-supplied `anonId` (a `localStorage` UUID)
  with no server-side proof of identity. Anyone who learns/guesses another
  player's `anonId` could act as them against these endpoints. Acceptable
  at friend-group scale; would need real auth before this trust model holds
  up for strangers.
- **Rate limiting** is in place as abuse mitigation, not an identity
  control: `@fastify/rate-limit` on the REST surface (120 req/min per IP
  baseline, 20 req/min on `/api/wordpacks/*` writes and `/api/rivals`), plus
  an in-memory token-bucket (`server/src/utils/rateLimiter.ts`) on chat/
  guess submission and votekick over sockets.
- **User text rendering**: React escapes by default and no
  `dangerouslySetInnerHTML`/`eval`/`new Function` exists anywhere in
  `client/src` (confirmed by grep during this pass) — chat, guesses, names,
  and word-pack content all render as plain text.
- **`npm audit`** currently reports moderate-severity advisories in
  `@fastify/static` (directory-listing path traversal — not applicable
  here, since directory listing is never enabled), `vite`/`esbuild`/
  `vitest` (dev-server-only exposure, not present in the built production
  bundle), and `react-router-dom` (open-redirect fix requires a v7 major
  upgrade). None are fixed by `npm audit fix` without a breaking major
  bump; flagged here as a known, deferred cleanup rather than silently
  ignored — worth a dedicated upgrade pass before treating this as fully
  hardened.

## Roadmap

- **Phase 1 — the core loop.** ✅ Shipped.
- **Phase 2 — team mode, tournament, word-pack builder.** ✅ Shipped, pending
  human playtest.
- **Phase 3 — chaos modes + retention.** ✅ Shipped (sabotage powerups,
  curse words, word mashups, momentum, bounty rounds, reverse mode,
  near-miss taunts, legacy titles, rival system, avatar customization,
  animated background), pending human playtest — see
  [PHASE3-PLAN.md](PHASE3-PLAN.md). Ghost drawing is the one deliberate
  exception: deferred until enough games have been played to build a
  stroke-aggregation pipeline from.
- **Production readiness.** ✅ Vitest coverage for every pure function,
  REST + socket rate limiting, a client error boundary, and a Docker/
  Fly.io deploy path.

## Documentation map

- **[CLAUDE.md](CLAUDE.md)** — architecture reference: file-by-file layout,
  the turn/round state machine, conventions, and every ambiguous
  implementation call and why it was made that way.
- **[HANDOFF.md](HANDOFF.md)** — current status, what's been verified, what
  hasn't, and the recommended next steps.
- **[PHASE3-PLAN.md](PHASE3-PLAN.md)** — the plan for chaos modes, retention
  features, and taking this from "feature-complete" to production-ready.
