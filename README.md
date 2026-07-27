<div align="center">

# Pixelpanic

### Draw. Guess. Panic.

A real-time multiplayer drawing-and-guessing game for your friend group — no accounts, no installs, no lobby friction. Just a name, a room code, and a pencil.

[![React](https://img.shields.io/badge/React_18-TypeScript-149eca?logo=react&logoColor=white)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-Fastify-83CD29?logo=node.js&logoColor=white)](https://fastify.dev)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-realtime-010101?logo=socket.io&logoColor=white)](https://socket.io)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-Modern--Electric-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![SQLite](https://img.shields.io/badge/better--sqlite3-persistence-003B57?logo=sqlite&logoColor=white)](https://github.com/WiseLibs/better-sqlite3)

</div>

---

Open a room, share the link, and start drawing — everyone watches the picture happen stroke by stroke, races to guess the word before the clock runs out, and roasts each other in chat while they do it. No sign-up screen between you and the first round, and no infrastructure a group of friends doesn't need: it runs as a single lightweight process, holding every live room in memory.

## Features

### Draw & guess
- **Live incremental stroke sync** — everyone watches the drawing happen in real time, not a finished image dropped in at the end. The drawer's own pen renders with zero perceptible lag, even deployed over a real network.
- **A real toolset** — pencil, brush, eraser, paint-bucket fill, rectangle/ellipse/arrow shapes, ten preset colors plus a full custom color picker.
- **Time-decayed scoring & progressive hints** — early correct guesses are worth more than last-second ones; letters peel away as the timer runs down, at a frequency the host controls.
- **Public quick-match or a private room by link** — up to 12 players, with configurable round count, draw time, and hint frequency.
- **Jump in mid-game** — new joiners and reconnecting players catch up on the current turn, score, and drawing instantly, with a 20-second reconnect grace period.
- **Mod tools** — votekick and mute, majority-gated.

### Sound & reactions
- **Synthesized sound effects** for correct guesses, wrong guesses, near-misses, and round endings — generated live, so no two rounds sound quite the same.
- **Like/dislike the drawing** as it happens, with a live tally the drawer can see.
- **"Apurva's Bot"** — a cheeky in-chat mascot that reacts to your near-misses and whiffs, differently for everyone watching.
- **Animated round-flow feedback** — correct-guess toasts, a staged round-end reveal, near-miss pulses, score flyups.

### Team mode
- Teams of any size, including uneven ones — drawer rotation stays fair across all of them.
- Team score is the *average* of member scores, everywhere it's shown.
- A private team chat channel alongside the room-wide one.

### Tournament
- Round-robin scheduling — everyone faces everyone — with live standings and a clear tiebreaker.
- Every match plays out live in the shared room, so the whole group watches together instead of splitting into separate games.

### Chaos modes
Independent, host-toggleable twists for when the standard loop gets too predictable:

| Mode | What it does |
|---|---|
| **Momentum** | Consecutive correct guesses ramp up a scoring multiplier |
| **Bounty round** | One randomly flagged hard word pays out 5× |
| **Near-miss taunts** | A one-letter-off guess gets called out |
| **Curse words** | The drawer can't see their own canvas |
| **Reverse mode** | Guessers see the word; the "drawer" has to guess from reactions |
| **Sabotage** | Guess streaks earn powerups to mess with an opponent — blur, guess-swap, frozen palette |
| **Word mashup** | A wildcard round combines two words; the room votes on the best guess |

### Word packs
- Build, edit, and delete your own word lists with per-word categories.
- Mix and match multiple packs into one room, combined with the built-in default.
- Export any pack as JSON.

### Identity & progression
- Pick a character from a curated avatar set — no account needed, it just remembers you.
- **Legacy titles** — milestone achievements tied to your anonymous ID across games.
- **Rivals** — auto-paired with a player at your skill level, with a live online/offline indicator.

## Tech stack

| Layer | Stack |
|---|---|
| Client | React 18 + TypeScript, Zustand, Tailwind CSS, `perfect-freehand`, `socket.io-client` |
| Server | Node.js + Fastify + `socket.io`, in-memory room state, `better-sqlite3` for anything persistent |
| Shared | A typed workspace package of every socket event and payload, imported by both sides so client and server can't drift out of sync |
| Auth | None — guest play only, identified by a local anonymous ID |

Visual design is a glassmorphism "Modern-Electric" dark theme — Sora, Inter, and JetBrains Mono, Material Symbols icons, deep obsidian surfaces with electric purple, neon cyan, and hot-pink accents.

## Running it locally

```bash
npm install
npm run dev
```

This starts the API/socket server and the client dev server together. Open the client URL it prints and you're in.

> **Windows:** `better-sqlite3` compiles a native module on install — you'll need Python 3 and the Visual Studio Build Tools "Desktop development with C++" workload on your `PATH` first.

```bash
npm run typecheck   # strict TypeScript across client + server
npm run build        # production client build + server typecheck
npm run test          # unit tests
```

---

<div align="center">Made by Apurva</div>
