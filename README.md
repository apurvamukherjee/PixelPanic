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
- **Chaos and retention (planned)** — sabotage powerups, curse-words mode,
  word mashups, momentum multipliers, bounty rounds, reverse mode, a rival
  system that pairs you against someone at your skill level, and (once
  enough games have been played to aggregate from) a ghost-drawing overlay
  that shows the crowd's collective attempt at a word. See
  [PHASE3-PLAN.md](PHASE3-PLAN.md) for the detailed plan.

Every design decision in this codebase is filtered through one question:
does this make game night better, or does it just make the architecture
diagram bigger? See [CLAUDE.md](CLAUDE.md) for the specific calls that
answer made along the way.

## Features

**Play**

- Public quick-match or a private room you share by link — 12 players per room
- Configurable round count, draw time, and hint frequency
- Live incremental stroke sync (everyone watches the drawing happen, not a
  finished image) with pencil, brush, eraser, and a full color palette
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

Phase 1 (the MVP loop) and Phase 2 (team mode, tournament, word-pack
builder) are built, typechecked, linted, and built clean. Phase 2 hasn't had
a human playtest pass in a real browser yet — see [HANDOFF.md](HANDOFF.md)
for exactly what's been verified and what to check next before calling it
done. Phase 3 is planned, not started — see [PHASE3-PLAN.md](PHASE3-PLAN.md).

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
separate static host needed. Target: Fly.io / Render / a small VPS. No
Redis, no multi-instance scaling — this is intentionally friend-group scale.

```bash
npm run build -w client   # produces client/dist
npm start -w server         # tsx src/index.ts, serves API + socket.io + client/dist
```

## Roadmap

- **Phase 1 — the core loop.** ✅ Shipped.
- **Phase 2 — team mode, tournament, word-pack builder.** ✅ Shipped, pending
  human playtest.
- **Phase 3 — chaos modes + retention.** 📋 Planned — see
  [PHASE3-PLAN.md](PHASE3-PLAN.md) for sabotage powerups, curse words,
  word mashups, momentum, bounty rounds, reverse mode, a rival system,
  near-miss taunts, and (last, once there's enough game history to
  aggregate from) ghost drawing.

## Documentation map

- **[CLAUDE.md](CLAUDE.md)** — architecture reference: file-by-file layout,
  the turn/round state machine, conventions, and every ambiguous
  implementation call and why it was made that way.
- **[HANDOFF.md](HANDOFF.md)** — current status, what's been verified, what
  hasn't, and the recommended next steps.
- **[PHASE3-PLAN.md](PHASE3-PLAN.md)** — the plan for chaos modes, retention
  features, and taking this from "feature-complete" to production-ready.
