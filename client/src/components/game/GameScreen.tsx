import { useEffect, useState } from "react";
import { MaskedWordBanner } from "./MaskedWordBanner";
import { DrawingCanvas } from "./DrawingCanvas";
import { Toolbar } from "./Toolbar";
import { PlayerList } from "./PlayerList";
import { ChatPanel } from "./ChatPanel";
import { WordChoiceOverlay } from "./WordChoiceOverlay";
import { MashupVoteOverlay } from "./MashupVoteOverlay";
import { RoundEndOverlay } from "./RoundEndOverlay";
import { GuessCorrectAnimation } from "./GuessCorrectAnimation";
import { TurnOrderStrip } from "./TurnOrderStrip";
import { DrawingRating } from "./DrawingRating";

type MobileTab = "players" | "chat";

export function GameScreen() {
  const [mobileTab, setMobileTab] = useState<MobileTab>("chat");

  // Phones dim and lock mid-turn while someone is just watching the drawing.
  // The lock is dropped by the browser whenever the tab is hidden, so it's
  // re-requested on return. Unsupported or denied (battery saver) is fine.
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = () => {
      if (document.visibilityState !== "visible" || !navigator.wakeLock) return;
      navigator.wakeLock
        .request("screen")
        .then((sentinel) => {
          lock = sentinel;
        })
        .catch((err: unknown) => console.warn("Screen wake lock unavailable", err));
    };
    request();
    document.addEventListener("visibilitychange", request);
    return () => {
      document.removeEventListener("visibilitychange", request);
      void lock?.release();
    };
  }, []);

  // Phones: one scrolling column where the canvas never shrinks (it used to
  // get squeezed to a sliver by flex shrink) and players/chat share the
  // remaining height behind tabs. Desktop: three-column grid.
  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto p-2 md:grid md:grid-cols-[200px_1fr_280px] md:gap-4 md:overflow-visible md:p-3">
      <div className="hidden md:block md:h-full md:overflow-y-auto">
        <PlayerList />
      </div>

      <div className="flex shrink-0 flex-col gap-2 md:min-h-0 md:gap-3 md:overflow-y-auto">
        <div className="hidden md:block">
          <TurnOrderStrip />
        </div>
        <MaskedWordBanner />
        <DrawingCanvas />
        <Toolbar />
        <DrawingRating />
      </div>

      <div className="flex min-h-[7rem] flex-1 flex-col gap-2 md:h-full md:min-h-0">
        <div className="glass flex shrink-0 gap-1 rounded-xl p-1 md:hidden">
          {(["chat", "players"] as const).map((tab) => (
            <button
              key={tab}
              className={`flex-1 rounded-lg py-2 font-display text-sm font-bold capitalize transition-colors ${
                mobileTab === tab ? "bg-primary text-on-primary" : "text-on-surface-variant"
              }`}
              onClick={() => setMobileTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        {mobileTab === "players" && (
          <div className="min-h-0 flex-1 overflow-y-auto md:hidden">
            <PlayerList />
          </div>
        )}
        <div className={`min-h-0 flex-1 flex-col md:flex ${mobileTab === "chat" ? "flex" : "hidden"}`}>
          <ChatPanel />
        </div>
      </div>

      <WordChoiceOverlay />
      <MashupVoteOverlay />
      <RoundEndOverlay />
      <GuessCorrectAnimation />
    </div>
  );
}
