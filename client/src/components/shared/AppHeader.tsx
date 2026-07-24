import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClientEvents } from "@pixelpanic/shared";
import { getAnonId } from "../../lib/anonId";
import { useRivalStore } from "../../store/useRivalStore";
import { useRoomStore } from "../../store/useRoomStore";
import { useConnectionStore } from "../../store/useConnectionStore";
import { resetRoomScopedState } from "../../lib/resetRoomState";
import { Icon } from "./Icon";

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
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-start justify-between p-3">
      <div className="pointer-events-auto glass rounded-full px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
          By <span className="text-secondary">Apurva</span>
        </span>
      </div>

      <div className="pointer-events-auto flex items-center gap-2">
        {room && (
          <button
            title="Leave room"
            onClick={leaveRoom}
            className="glass flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:text-error"
          >
            <Icon name="logout" className="!text-base" />
          </button>
        )}
        <button
          title={rival ? `Rival: ${rival.rivalName}` : "Your rival"}
          onClick={() => setPanelOpen((v) => !v)}
          className="glass flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:text-tertiary"
        >
          <Icon name="local_fire_department" className="!text-base" filled={!!rival?.rivalOnline} />
        </button>
        <div className="glass rounded-full px-3 py-1.5">
          <span className="logo-wordmark font-display text-sm font-extrabold uppercase tracking-widest">
            Pixelpanic
          </span>
        </div>
      </div>

      {panelOpen && (
        <div className="pointer-events-auto glass absolute right-3 top-14 flex w-64 flex-col gap-3 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="font-display text-sm font-bold text-on-surface">Your rival</span>
            <button onClick={() => setPanelOpen(false)} className="text-on-surface-variant hover:text-error">
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
