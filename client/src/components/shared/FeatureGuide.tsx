import { useState } from "react";
import { Icon } from "./Icon";
import { Button } from "./Button";

interface GuideSection {
  icon: string;
  title: string;
  items: string[];
}

const SECTIONS: GuideSection[] = [
  {
    icon: "brush",
    title: "The core loop",
    items: [
      "Each turn, the drawer picks 1 of 3 words and draws it — everyone else races to type the correct guess in chat.",
      "Guessing earlier is worth more: points decay from 100 down to a floor of 10 over the draw timer.",
      "Letters of the word reveal gradually as hints, based on the host's Hint Frequency setting.",
      "The drawer earns 50 points for every correct guesser, plus a bonus if everyone in the room gets it.",
      "Tools: pencil, brush, eraser, paint-bucket fill, undo, and clear — pick your color from the palette.",
    ],
  },
  {
    icon: "groups",
    title: "Team mode",
    items: [
      "Split into teams of any size (even uneven ones) from the lobby's team panel.",
      "Drawer turns rotate fairly across teams — no team draws twice before every team has had a turn.",
      "Team score is the average of its members' scores, shown on the scoreboard and leaderboard.",
      "Each team gets a private team chat channel alongside the normal room chat.",
    ],
  },
  {
    icon: "emoji_events",
    title: "Tournament",
    items: [
      "Host can start a round-robin tournament instead of a normal game (2-10 connected players).",
      "Every player faces every other player once; standings track wins, losses, and point differential.",
      "Matches play out live in the shared room, so everyone watches together instead of splitting up.",
    ],
  },
  {
    icon: "auto_stories",
    title: "Word packs",
    items: [
      "Paste your own comma/newline-separated word list right from the lobby's host settings.",
      "Or build, edit, and export full word packs with categories from the \"My Word Packs\" page.",
      "Packs you create are instantly selectable as the word list for any room you host.",
    ],
  },
  {
    icon: "bolt",
    title: "Chaos modes (host-toggleable per room)",
    items: [
      "Momentum — guess streaks ramp your points up to 2x; a miss resets your streak.",
      "Bounty round — one random round every game is worth a flat 5x points.",
      "Curse words — the drawer can't see their own canvas, only everyone else can.",
      "Reverse mode — everyone except the drawer sees the real word; the \"drawer\" has to guess it themselves.",
      "Word mashup — one wildcard round combines two words into a compound target; after the round, everyone votes on the best guess for a bonus.",
      "Sabotage powerups — a hot guessing streak grants a random prank (blur a rival's screen, freeze the drawer's palette, or swap two players' guesses) for a few seconds.",
      "Ghost drawing — planned for a future update once enough games have been played to build it from.",
    ],
  },
  {
    icon: "shield",
    title: "Mod tools",
    items: [
      "Votekick — anyone can start a vote; a majority of connected players (excluding the target) removes them.",
      "Mute — the host can mute/unmute any player's chat.",
    ],
  },
  {
    icon: "face",
    title: "Avatars & rivals",
    items: [
      "Pick a character avatar on this screen — cycle with the arrows or hit the dice to randomize.",
      "You're auto-matched with a rival of similar skill after your first game — check the flame icon top-right to compare stats and see if they're online.",
      "Milestone titles (First Win, Century Club, Champion, and more) unlock automatically and show up on the final leaderboard.",
    ],
  },
];

export function FeatureGuide() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)} className="w-full">
        <span className="flex items-center justify-center gap-2">
          <Icon name="help" className="!text-base" /> How to play &amp; features
        </span>
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="glass custom-scrollbar flex max-h-[85vh] w-full max-w-lg flex-col gap-5 overflow-y-auto rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-extrabold uppercase tracking-wide text-primary">
                How to play
              </h2>
              <button onClick={() => setOpen(false)} className="text-on-surface-variant hover:text-error">
                <Icon name="close" />
              </button>
            </div>

            {SECTIONS.map((section) => (
              <div key={section.title} className="flex flex-col gap-2">
                <div className="flex items-center gap-2 font-display text-sm font-bold text-on-surface">
                  <Icon name={section.icon} className="!text-base text-secondary" />
                  {section.title}
                </div>
                <ul className="flex flex-col gap-1.5 pl-1 text-sm text-on-surface-variant">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-outline" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <Button onClick={() => setOpen(false)}>Got it</Button>
          </div>
        </div>
      )}
    </>
  );
}
