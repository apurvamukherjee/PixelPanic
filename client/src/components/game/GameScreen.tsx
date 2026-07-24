import { useState } from "react";
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

type MobileTab = "players" | "chat";

export function GameScreen() {
  const [mobileTab, setMobileTab] = useState<MobileTab>("chat");

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3 md:grid md:grid-cols-[200px_1fr_280px] md:gap-4">
      {/* Player list — sidebar on desktop, tabbed panel on mobile */}
      <div className={`md:block ${mobileTab === "players" ? "block" : "hidden"} md:h-full md:overflow-y-auto`}>
        <PlayerList />
      </div>

      {/* Canvas column — always visible */}
      <div className="flex min-h-0 flex-col gap-3">
        <TurnOrderStrip />
        <MaskedWordBanner />
        <DrawingCanvas />
        <Toolbar />
      </div>

      {/* Chat — sidebar on desktop, tabbed panel on mobile */}
      <div
        className={`min-h-0 md:flex md:h-full md:flex-col ${mobileTab === "chat" ? "flex h-64 flex-col" : "hidden"}`}
      >
        <ChatPanel />
      </div>

      {/* Mobile tab switcher */}
      <div className="glass flex gap-1 rounded-xl p-1 md:hidden">
        <button
          className={`flex-1 rounded-lg py-1.5 font-display text-sm font-bold transition-colors ${
            mobileTab === "players" ? "bg-primary text-on-primary" : "text-on-surface-variant"
          }`}
          onClick={() => setMobileTab("players")}
        >
          Players
        </button>
        <button
          className={`flex-1 rounded-lg py-1.5 font-display text-sm font-bold transition-colors ${
            mobileTab === "chat" ? "bg-primary text-on-primary" : "text-on-surface-variant"
          }`}
          onClick={() => setMobileTab("chat")}
        >
          Chat
        </button>
      </div>

      <WordChoiceOverlay />
      <MashupVoteOverlay />
      <RoundEndOverlay />
      <GuessCorrectAnimation />
    </div>
  );
}
