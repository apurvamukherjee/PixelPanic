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
import { Icon } from "../components/shared/Icon";

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
        {tournament.isComplete && (
          <Button variant="secondary" onClick={() => useTournamentStore.getState().clear()}>
            Back to lobby
          </Button>
        )}
      </div>
    );
  }

  const shareUrl = `${window.location.origin}/room/${room.id}`;
  const canShare = typeof navigator.share === "function";
  // Native share sheet on phones; clipboard elsewhere. navigator.clipboard
  // only exists on secure origins, so over plain-http LAN (how phones reach
  // a dev server) the old copy button threw — fall back to a prompt there.
  const shareInvite = async () => {
    if (canShare) {
      try {
        await navigator.share({ title: "Pixelpanic", text: `Join my Pixelpanic room: ${room.id}`, url: shareUrl });
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) console.warn("Share failed", err);
      }
      return;
    }
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }
    window.prompt("Copy this invite link", shareUrl);
  };

  const connectedCount = room.players.filter((p) => p.connected).length;
  const hostName = room.players.find((p) => p.isHost)?.name ?? "the host";

  // Phones: one scrolling column (code, players, settings) with the start
  // actions pinned to the bottom. Desktop: settings left, players right.
  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col gap-3 overflow-y-auto px-3 md:grid md:grid-cols-[1fr_320px] md:grid-rows-[auto_1fr_auto] md:gap-4 md:overflow-hidden md:px-4 md:pb-4">
      <section className="panel flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-3xl px-5 py-4 md:col-start-1 md:row-start-1">
        <div>
          <div className="text-sm text-on-surface-variant">Room code</div>
          <div data-testid="room-code" className="hand text-5xl font-extrabold tracking-[0.12em] text-primary">
            {room.id}
          </div>
        </div>
        <Button variant="secondary" onClick={shareInvite}>
          <span className="flex items-center gap-2">
            <Icon name={canShare ? "ios_share" : "link"} className="!text-lg" />
            {canShare ? "Invite friends" : copied ? "Link copied" : "Copy invite link"}
          </span>
        </Button>
      </section>

      <section className="panel flex shrink-0 flex-col rounded-3xl p-4 md:col-start-2 md:row-span-2 md:row-start-1 md:min-h-0 md:overflow-y-auto">
        <WaitingRoomList />
      </section>

      <div className="flex shrink-0 flex-col gap-3 md:col-start-1 md:row-span-2 md:row-start-2 md:min-h-0 md:overflow-y-auto md:pr-1">
        <HostSettingsPanel />
        <TeamAssignmentPanel />
      </div>

      <div className="sticky bottom-0 mt-auto flex shrink-0 flex-col gap-2 bg-background pb-3 pt-2 md:static md:col-start-2 md:row-start-3 md:bg-transparent md:p-0">
        {isHost ? (
          <>
            {connectedCount < 2 && (
              <p className="text-center text-sm text-on-surface-variant">Invite at least one friend to start.</p>
            )}
            <Button onClick={() => socket?.emit(ClientEvents.GAME_START)} disabled={connectedCount < 2}>
              Start game
            </Button>
            <Button
              variant="secondary"
              onClick={() => socket?.emit(ClientEvents.TOURNAMENT_START)}
              disabled={connectedCount < 2 || connectedCount > 10}
            >
              Start a tournament
            </Button>
          </>
        ) : (
          <p className="panel rounded-2xl px-4 py-3 text-center text-on-surface-variant">
            Waiting for <span className="font-bold text-on-surface">{hostName}</span> to start the game…
          </p>
        )}
      </div>
    </div>
  );
}
