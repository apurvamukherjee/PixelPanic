import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ClientEvents } from "@pixelpanic/shared";
import { getAnonId } from "../../lib/anonId";
import { useRivalStore } from "../../store/useRivalStore";
import { useRoomStore } from "../../store/useRoomStore";
import { useConnectionStore } from "../../store/useConnectionStore";
import { resetRoomScopedState } from "../../lib/resetRoomState";
import { useAudioStore } from "../../store/useAudioStore";
import { Icon } from "./Icon";
import { Wordmark } from "./Wordmark";

// Persistent chrome mounted once at the app root (outside the phase-
// switching RoomPage/HomePage routes, see App.tsx) so it survives
// navigation and the socket connection never has to think about it.
export function AppHeader() {
  const rival = useRivalStore((s) => s.rival);
  const loaded = useRivalStore((s) => s.loaded);
  const load = useRivalStore((s) => s.load);
  const [panelOpen, setPanelOpen] = useState(false);
  const room = useRoomStore((s) => s.room);
  const socket = useConnectionStore((s) => s.socket);
  const navigate = useNavigate();
  // Home already shows the big wordmark.
  const isHome = useLocation().pathname === "/";
  const sfxOn = useAudioStore((s) => s.sfxOn);
  const toggleMuted = useAudioStore((s) => s.toggleMuted);
  const muted = !sfxOn;

  useEffect(() => {
    load(getAnonId());
  }, [load]);

  // Always-accessible way out of a room — previously the only options were
  // closing the tab (leaves a ghost player behind, see RoomManager) or
  // creating another room without ever leaving this one (same bleed bug).
  const leaveRoom = () => {
    socket?.emit(ClientEvents.ROOM_LEAVE);
    resetRoomScopedState();
    navigate("/");
  };

  return (
    <div className="app-header pointer-events-none fixed inset-x-0 top-0 z-50 flex items-center justify-between p-3">
      <div className="flex items-baseline gap-2">
        {!isHome && <Wordmark />}
        {!isHome && (
          <span className="hidden text-xs text-on-surface-variant sm:inline">by Apurva</span>
        )}
      </div>

      <div className="pointer-events-auto flex items-center gap-1.5">
        <HeaderButton label={muted ? "Unmute sound" : "Mute sound"} onClick={toggleMuted}>
          <Icon name={muted ? "volume_off" : "volume_up"} className="!text-xl" />
        </HeaderButton>
        <HeaderButton
          label={rival ? `Rival: ${rival.rivalName}` : "Your rival"}
          onClick={() => setPanelOpen((v) => !v)}
          className="hover:text-tertiary"
        >
          <Icon name="local_fire_department" className="!text-xl" filled={!!rival?.rivalOnline} />
        </HeaderButton>
        {room && (
          <HeaderButton label="Leave room" onClick={leaveRoom} className="hover:text-error">
            <Icon name="logout" className="!text-xl" />
          </HeaderButton>
        )}
      </div>

      {panelOpen && (
        <div className="pointer-events-auto panel absolute right-3 top-full flex w-64 flex-col gap-3 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="font-display text-sm font-bold text-on-surface">Your rival</span>
            <button
              onClick={() => setPanelOpen(false)}
              aria-label="Close"
              className="text-on-surface-variant hover:text-error"
            >
              <Icon name="close" className="!text-base" />
            </button>
          </div>
          {!loaded ? (
            <span className="text-xs text-on-surface-variant">Loading…</span>
          ) : !rival ? (
            <span className="text-xs text-on-surface-variant">
              Play a full game to get auto-matched with a rival of similar skill.
            </span>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${rival.rivalOnline ? "bg-success" : "bg-outline"}`}
                />
                <span className="font-display text-sm font-semibold text-on-surface">{rival.rivalName}</span>
                <span className="ml-auto font-mono text-[10px] uppercase tracking-wide text-on-surface-variant">
                  {rival.rivalOnline ? "online" : "offline"}
                </span>
              </div>
              <RivalStatRow label="Win rate" mine={rival.myWinRate * 100} theirs={rival.rivalWinRate * 100} suffix="%" />
              <RivalStatRow label="Avg score" mine={Math.round(rival.myAvgScore)} theirs={Math.round(rival.rivalAvgScore)} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function RivalStatRow({ label, mine, theirs, suffix = "" }: { label: string; mine: number; theirs: number; suffix?: string }) {
  const winning = mine >= theirs;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[10px] uppercase tracking-wide text-on-surface-variant">{label}</span>
      <div className="flex items-center justify-between font-mono text-xs">
        <span className={winning ? "text-success" : "text-on-surface"}>
          You: {mine}
          {suffix}
        </span>
        <span className={!winning ? "text-success" : "text-on-surface"}>
          Them: {theirs}
          {suffix}
        </span>
      </div>
    </div>
  );
}

function HeaderButton({
  label,
  onClick,
  className = "",
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-white/5 ${className}`}
    >
      {children}
    </button>
  );
}
