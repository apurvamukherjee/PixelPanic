import { useEffect, useState } from "react";
import { ClientEvents } from "@pixelpanic/shared";
import { useGameStore } from "../../store/useGameStore";
import { useRoomStore } from "../../store/useRoomStore";
import { useConnectionStore } from "../../store/useConnectionStore";
import { Icon } from "../shared/Icon";

// Live like/dislike reactions to the drawing in progress. Guessers get the
// buttons; the drawer gets a read-only tally of what they're earning. Only
// rendered while a turn is actually in the drawing phase — see GameScreen.
export function DrawingRating() {
  const socket = useConnectionStore((s) => s.socket);
  const turn = useGameStore((s) => s.turn);
  const mySocketId = useRoomStore((s) => s.mySocketId);
  const { likes, dislikes } = useGameStore((s) => s.drawingRating);
  const [myRating, setMyRating] = useState<"like" | "dislike" | null>(null);

  const isDrawer = turn?.drawerId === mySocketId;

  // A fresh drawing means a fresh vote — the server resets its own tally on
  // TURN_START too, so this just keeps the button highlight in sync with it.
  useEffect(() => {
    setMyRating(null);
  }, [turn?.roundIndex, turn?.turnIndexInRound]);

  if (!turn || turn.phase !== "drawing") return null;

  const rate = (rating: "like" | "dislike") => {
    setMyRating(rating);
    socket?.emit(ClientEvents.DRAWING_RATE, { rating });
  };

  return (
    <div className="glass flex items-center justify-between gap-3 rounded-2xl px-3 py-1 md:justify-center md:py-2">
      <span className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant md:text-xs">
        {isDrawer ? "Reactions" : "Rate this drawing"}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          disabled={isDrawer}
          onClick={() => rate("like")}
          title="Like this drawing"
          className={`flex min-h-9 items-center gap-1 rounded-full px-3 py-1 font-mono text-xs transition-colors ${
            myRating === "like" ? "bg-success/25 text-success" : "text-on-surface-variant hover:text-success"
          } ${isDrawer ? "cursor-default" : ""}`}
        >
          <Icon name="thumb_up" filled={myRating === "like"} className="!text-base" />
          {likes}
        </button>
        <button
          disabled={isDrawer}
          onClick={() => rate("dislike")}
          title="Dislike this drawing"
          className={`flex min-h-9 items-center gap-1 rounded-full px-3 py-1 font-mono text-xs transition-colors ${
            myRating === "dislike" ? "bg-error/25 text-error" : "text-on-surface-variant hover:text-error"
          } ${isDrawer ? "cursor-default" : ""}`}
        >
          <Icon name="thumb_down" filled={myRating === "dislike"} className="!text-base" />
          {dislikes}
        </button>
      </div>
    </div>
  );
}
