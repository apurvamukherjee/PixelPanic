import { useEffect, useState } from "react";
import { ClientEvents } from "@pixelpanic/shared";
import { useGameStore } from "../../store/useGameStore";
import { useRoomStore } from "../../store/useRoomStore";
import { useConnectionStore } from "../../store/useConnectionStore";
import { Button } from "../shared/Button";

// Same "fixed overlay, phase-gated" pattern as WordChoiceOverlay — a mashup
// round's vote window is a sub-state of the roundEnd phase (turn.
// mashupVoteOpen), not a separate GamePhase, since the server treats it as
// an extension of the normal round-end pause rather than a new state.
export function MashupVoteOverlay() {
  const phase = useGameStore((s) => s.phase);
  const lastRoundEnd = useGameStore((s) => s.lastRoundEnd);
  const mySocketId = useRoomStore((s) => s.mySocketId);
  const socket = useConnectionStore((s) => s.socket);
  const [voted, setVoted] = useState(false);

  const isOpen = phase === "roundEnd" && lastRoundEnd?.mashupVoteOpen === true;

  useEffect(() => {
    if (isOpen) setVoted(false);
  }, [isOpen, lastRoundEnd]);

  if (!isOpen) return null;

  const candidates = (lastRoundEnd?.mashupCandidates ?? []).filter((c) => c.playerId !== mySocketId);

  const vote = (targetPlayerId: string) => {
    socket?.emit(ClientEvents.MASHUP_VOTE, { targetPlayerId });
    setVoted(true);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="glass flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl p-8">
        <div className="text-center font-display text-lg font-bold text-on-surface">
          Word mashup: <span className="capitalize text-secondary">"{lastRoundEnd?.word}"</span>
        </div>
        <div className="text-center text-sm text-on-surface-variant">
          Vote for the best guess this round — the top vote earns a bonus.
        </div>
        {voted ? (
          <div className="text-sm text-secondary">Vote cast — waiting for everyone else…</div>
        ) : candidates.length === 0 ? (
          <div className="text-sm text-on-surface-variant">No candidate guesses to vote on.</div>
        ) : (
          <div className="flex w-full flex-col gap-2">
            {candidates.map((c) => (
              <Button key={c.playerId} onClick={() => vote(c.playerId)} className="w-full">
                {c.playerName}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
