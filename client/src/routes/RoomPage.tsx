import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClientEvents } from "@pixelpanic/shared";
import { useRoomFromUrl } from "../hooks/useRoomFromUrl";
import { useRoomStore } from "../store/useRoomStore";
import { useGameStore } from "../store/useGameStore";
import { useTournamentStore } from "../store/useTournamentStore";
import { useConnectionStore } from "../store/useConnectionStore";
import { JoinByLinkRedirect } from "./JoinByLinkRedirect";
import { WaitingRoomList } from "../components/lobby/WaitingRoomList";
import { HostSettingsPanel } from "../components/lobby/HostSettingsPanel";
import { TeamAssignmentPanel } from "../components/lobby/TeamAssignmentPanel";
import { GameScreen } from "../components/game/GameScreen";
import { LeaderboardScreen } from "../components/endgame/LeaderboardScreen";
import { TournamentStandingsScreen } from "../components/endgame/TournamentStandingsScreen";
import { Button } from "../components/shared/Button";

export function RoomPage() {
  const code = useRoomFromUrl();
  const room = useRoomStore((s) => s.room);
  const isHost = useRoomStore((s) => s.isHost);
  const closedReason = useRoomStore((s) => s.closedReason);
  const phase = useGameStore((s) => s.phase);
  const tournament = useTournamentStore((s) => s.tournament);
  const socket = useConnectionStore((s) => s.socket);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  // ROOM_CLOSED (useSocket.ts) already cleared `room` by the time this
  // fires — HomePage is what actually shows closedReason, once, then clears it.
  useEffect(() => {
    if (closedReason) navigate("/");
  }, [closedReason, navigate]);

  if (!code) return null;

  // We haven't joined this room in this session yet (cold link open) —
  // prompt for a name and join before showing anything else.
  if (!room || room.id !== code) {
    return <JoinByLinkRedirect code={code} />;
  }

  if (phase === "gameEnd") return <LeaderboardScreen />;
  if (phase === "wordChoice" || phase === "drawing" || phase === "roundEnd") {
    return <GameScreen />;
  }
  // "lobby" is the tournament's natural between-match resting state — a
  // tournament in progress (or just completed) takes over the lobby screen
  // instead of the normal host-settings/waiting-room view.
  if (tournament) {
    return (
      <div className="mx-auto flex h-full max-w-lg flex-col gap-4 p-4 pt-8">
        <TournamentStandingsScreen />
        {isHost && tournament.isComplete && (
          <Button variant="secondary" onClick={() => useTournamentStore.getState().clear()}>
            Back to lobby
          </Button>
        )}
      </div>
    );
  }

  const shareUrl = `${window.location.origin}/room/${room.id}`;
  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Desktop: a fixed two-column grid (settings left, player list + start
  // action pinned right) that fills the viewport with no page-level scroll —
  // only the settings column scrolls internally if it overflows. Mobile
  // keeps the simple stacked flow (settings, then players, then actions).
  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col gap-3 overflow-y-auto p-3 pt-4 md:grid md:grid-cols-[1fr_300px] md:gap-4 md:overflow-hidden md:p-4">
      <div className="flex min-h-0 flex-col gap-3 md:overflow-y-auto md:pr-1">
        <div className="glass rounded-2xl p-6 text-center">
          <div className="font-mono text-xs uppercase tracking-widest text-on-surface-variant">
            Room code
          </div>
          <div
            data-testid="room-code"
            className="font-display text-4xl font-extrabold tracking-widest text-primary"
          >
            {room.id}
          </div>
        </div>

        <Button variant="secondary" onClick={copyLink}>
          {copied ? "Link copied!" : "Copy share link"}
        </Button>

        <HostSettingsPanel />
        <TeamAssignmentPanel />
      </div>

      <div className="glass flex min-h-0 flex-col gap-3 rounded-2xl p-3 md:h-full">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <WaitingRoomList />
        </div>

        {isHost && (
          <div className="flex shrink-0 flex-col gap-2 border-t border-white/5 pt-3">
            <Button
              onClick={() => socket?.emit(ClientEvents.GAME_START)}
              disabled={room.players.filter((p) => p.connected).length < 2}
            >
              Start Game
            </Button>
            <Button
              variant="secondary"
              onClick={() => socket?.emit(ClientEvents.TOURNAMENT_START)}
              disabled={
                room.players.filter((p) => p.connected).length < 2 ||
                room.players.filter((p) => p.connected).length > 10
              }
            >
              Start Tournament
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
