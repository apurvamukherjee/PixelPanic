# Pixelpanic

A real-time multiplayer drawing/guessing game (Pictionary-style). Guest-only
play, friend-group scale — no accounts, no Redis, no horizontal scaling infra.

**Status: Phase 1 (MVP) + Phase 2 (team mode, tournament, word-pack builder)
built, plus a full visual redesign pass.** Typechecked/built/linted clean;
not yet human-playtested in a browser. See [HANDOFF.md](HANDOFF.md) for
what's been tested, known gaps, and next steps, [CLAUDE.md](CLAUDE.md) for
the Phase 1 architecture reference, and [PHASE3-PLAN.md](PHASE3-PLAN.md) for
what's next (chaos modes, retention features, production-readiness).

## Stack

- **Client:** React 18 + TypeScript, Zustand, Tailwind, `perfect-freehand`,
  `socket.io-client`, React Router, Vite. Visual design: Sora/Inter/JetBrains
  Mono + Material Symbols icons, a glassmorphism "Modern-Electric" theme
  (see `design/DESIGN.md`).
- **Server:** Node.js + Fastify, `socket.io`, in-memory `Map` for live
  room/game state, `better-sqlite3` for word packs, anon stats, and
  tournament history
- **Shared:** a `/shared` workspace package holding every socket event name
  and payload type, so client and server can't drift silently
- **Auth:** none — guest play only, a `localStorage` anon ID drives
  reconnect-matching and persistent stats

## Requirements

- Node.js 20+ (developed against Node 24)
- On Windows, `better-sqlite3` needs a native build the first time:
  **Python 3** (real one, not the Microsoft Store stub) and **Visual Studio
  Build Tools** with the "Desktop development with C++" workload. Both must
  be on `PATH` before `npm install`.

## Setup

```bash
npm install        # installs all 3 workspaces (client, server, shared)
npm run dev         # runs server (:3001) + client (:5173) together
```

Open `http://localhost:5173`. On first boot the server seeds a 150-word
default pack into SQLite (`server/data/pixelpanic.sqlite`, gitignored).

Other useful scripts:

```bash
npm run typecheck   # tsc --noEmit across server + client
npm run lint         # eslint across the whole monorepo
npm run build        # builds the client, typechecks the server
```

Per-workspace equivalents: `npm run dev -w server`, `npm run dev -w client`, etc.

### Windows loopback gotcha

If `http://localhost:5173` shows the wrong app, another process may already
own IPv6 loopback (`[::1]:5173`) while Vite binds the IPv4/dual-stack address
— Windows lets two different processes claim the same port on different
address families. Check with `netstat -ano | findstr :5173`, or just visit
`http://127.0.0.1:5173` directly.

## Project layout

```
shared/   socket event names + payload types (single source of truth)
server/   Fastify + socket.io + in-memory game engine + SQLite
client/   React app — stores, canvas rendering, routes, components
```

See [CLAUDE.md](CLAUDE.md) for the full file-by-file breakdown, the turn/round
state machine, and every "simplest option" decision that was made and needs
to stay consistent as the codebase grows.

## Deploying

Single process, single port: in production, `server` serves the built
`client/dist` itself via `@fastify/static` (see `server/src/app.ts`) — no
separate static host needed. Target: Fly.io / Render / a small VPS. No Redis,
no multi-instance scaling — this is intentionally friend-group scale.

```bash
npm run build -w client   # produces client/dist
npm start -w server         # tsx src/index.ts, serves API + socket.io + client/dist
```

## Roadmap

Phase 1 is the MVP turn-based loop. Phase 2 (team mode, round-robin
tournament, word-pack builder UI) is built — see HANDOFF.md. Phase 3 (chaos
modes, rival system, near-miss taunts) plus production-readiness hardening
is planned but not started — see [PHASE3-PLAN.md](PHASE3-PLAN.md).
