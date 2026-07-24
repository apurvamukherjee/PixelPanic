import { useGameStore } from "../../store/useGameStore";
import { useRoomStore } from "../../store/useRoomStore";
import { Avatar } from "../shared/Avatar";
import { Icon } from "../shared/Icon";

// Brief between-turn score screen — visible for the server's
// ROUND_END_PAUSE_MS pause (RoomInstance.ts) before the next TURN_START
// clears lastRoundEnd. Deliberately not shown during a mashup vote window
// (MashupVoteOverlay owns that sub-state instead).
export function RoundEndOverlay() {
  const phase = useGameStore((s) => s.phase);
  const lastRoundEnd = useGameStore((s) => s.lastRoundEnd);
  const turn = useGameStore((s) => s.turn);
  const iGuessedThisTurn = useGameStore((s) => s.iGuessedThisTurn);
  const room = useRoomStore((s) => s.room);
  const mySocketId = useRoomStore((s) => s.mySocketId);

  const isOpen = phase === "roundEnd" && lastRoundEnd?.mashupVoteOpen !== true;
  if (!isOpen || !lastRoundEnd || !room) return null;

  const isDrawer = turn?.drawerId === mySocketId;
  // Reverse mode narrows real guessing to the nominal drawer (see
  // CLAUDE.md's Phase 3 addendum) — everyone else already knew the word.
  const wasEligibleGuesser = turn?.isReverseMode ? isDrawer : !isDrawer;
  const showDrawerBonus = isDrawer && !turn?.isReverseMode && lastRoundEnd.drawerBonusAwarded > 0;
  const hasBadge = wasEligibleGuesser || showDrawerBonus;

  const delta = lastRoundEnd.scoreboardDelta;
  const sorted = [...room.players].sort((a, b) => (delta[b.id] ?? 0) - (delta[a.id] ?? 0));

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="round-end-pop glass flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl p-6">
        <div className="text-center">
          <div className="font-mono text-xs uppercase tracking-widest text-on-surface-variant">The word was</div>
          <div className="font-display text-2xl font-extrabold capitalize text-primary">{lastRoundEnd.word}</div>
        </div>

        {wasEligibleGuesser && (
          <div
            style={{ animationDelay: "180ms" }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 font-display text-sm font-bold ${
              iGuessedThisTurn ? "guess-celebrate bg-success/20 text-success" : "miss-shake bg-error/20 text-error"
            }`}
          >
            <Icon name={iGuessedThisTurn ? "check_circle" : "schedule"} filled className="!text-base" />
            {iGuessedThisTurn ? "You got it!" : "Time's up — you didn't guess it"}
          </div>
        )}

        {/* The drawer never "guesses," so they get their own distinct
            celebration for the everyone-guessed-it bonus instead of sharing
            the guesser badge above. */}
        {showDrawerBonus && (
          <div
            style={{ animationDelay: "180ms" }}
            className="guess-celebrate flex items-center gap-2 rounded-xl bg-tertiary/20 px-4 py-2 font-display text-sm font-bold text-tertiary"
          >
            <Icon name="celebration" filled className="!text-base" />
            Everyone guessed it! +{lastRoundEnd.drawerBonusAwarded}
          </div>
        )}

        {/* Scoreboard reveals top-to-bottom after the word/result land, not
            all at once — the eye has somewhere to travel each round. */}
        <ul className="flex w-full flex-col gap-1.5">
          {sorted.slice(0, 6).map((p, i) => (
            <li
              key={p.id}
              style={{ animationDelay: `${(hasBadge ? 330 : 150) + i * 70}ms` }}
              className="round-row-in flex items-center gap-2 rounded-lg bg-surface-container-high/50 px-2 py-1.5"
            >
              <Avatar name={p.name} color={p.color} avatarId={p.avatarId} size={24} />
              <span className="truncate font-display text-sm text-on-surface">{p.name}</span>
              <span className="ml-auto font-mono text-sm text-on-surface-variant">{delta[p.id] ?? 0}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
