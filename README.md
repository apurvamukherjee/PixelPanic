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
  pipeline fed by real play history that doesn't exist yet.
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
