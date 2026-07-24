import { useEffect, useRef, useState } from "react";
import { ClientEvents, type Player } from "@pixelpanic/shared";
import { useRoomStore } from "../../store/useRoomStore";
import { useGameStore } from "../../store/useGameStore";
import { useConnectionStore } from "../../store/useConnectionStore";
import { useChaosStore } from "../../store/useChaosStore";
import { Avatar } from "../shared/Avatar";
import { Icon } from "../shared/Icon";

function PlayerRow({
  p,
  score,
  isMe,
  isHost,
  isDrawer,
  streak,
  heatSignal,
}: {
  p: Player;
  score: number;
  isMe: boolean;
  isHost: boolean;
  isDrawer: boolean;
  streak: number;
  heatSignal: number;
}) {
  const socket = useConnectionStore((s) => s.socket);
  const pendingPowerup = useChaosStore((s) => s.pendingPowerup);
  const [heating, setHeating] = useState(false);

  useEffect(() => {
    if (heatSignal === 0) return;
    setHeating(true);
    const t = setTimeout(() => setHeating(false), 900);
    return () => clearTimeout(t);
  }, [heatSignal]);

  // "+N" flyup on top of the existing .score-pop bump — skips the initial
  // mount (prevScoreRef starts equal to score) so joining mid-game doesn't
  // show a flyup for a score you already had.
  const prevScoreRef = useRef(score);
  const [flyup, setFlyup] = useState<{ value: number; key: number } | null>(null);
  useEffect(() => {
    const diff = score - prevScoreRef.current;
    prevScoreRef.current = score;
    if (diff > 0) {
      setFlyup({ value: diff, key: Date.now() });
      const t = setTimeout(() => setFlyup(null), 900);
      return () => clearTimeout(t);
    }
  }, [score]);

  const useSabotageOnTarget = () => {
    if (!pendingPowerup) return;
    socket?.emit(ClientEvents.SABOTAGE_USE_POWERUP, { powerup: pendingPowerup, targetPlayerId: p.id });
    useChaosStore.getState().setPendingPowerup(null);
  };

  return (
    <li
      className={`player-join flex items-center gap-2 rounded-xl border px-2 py-2 ${
        isDrawer ? "border-primary/30 bg-primary/10" : "border-white/5 bg-surface-container-high/50"
      } ${!p.connected ? "opacity-60" : ""} ${heating ? "near-miss-heat" : ""}`}
    >
      <Avatar
        name={p.name}
        color={p.color}
        avatarId={p.avatarId}
        size={32}
        status={isDrawer ? "drawing" : p.connected ? undefined : "idle"}
      />
      <div className="flex min-w-0 flex-col">
        <span className={`truncate font-display text-sm font-semibold ${isDrawer ? "text-primary" : "text-on-surface"}`}>
          {p.name}
          {isMe ? " (you)" : ""}
        </span>
        {isDrawer && (
          <span className="font-mono text-[9px] uppercase tracking-wide text-primary/70">Drawing…</span>
        )}
      </div>
      {streak > 0 && (
        <span
          title={`${streak} guess streak`}
          className="flex items-center gap-0.5 rounded-full bg-tertiary/20 px-1.5 py-0.5 font-mono text-[10px] text-tertiary"
        >
          <Icon name="local_fire_department" className="!text-xs" filled /> {streak}
        </span>
      )}
      <span className="relative ml-auto">
        <span key={score} className="score-pop font-mono text-sm text-on-surface-variant">{score}</span>
        {flyup && (
          <span
            key={flyup.key}
            className="score-fly-up pointer-events-none absolute right-0 -top-1 font-mono text-xs font-bold text-success"
          >
            +{flyup.value}
          </span>
        )}
      </span>
      {!isMe && (
        <div className="flex gap-1">
          {pendingPowerup && (
            <button
              title={`Use ${pendingPowerup} on ${p.name}`}
              className="flex h-6 w-6 items-center justify-center rounded bg-tertiary/20 text-tertiary hover:bg-tertiary/40"
              onClick={useSabotageOnTarget}
            >
              <Icon name="bolt" className="!text-sm" />
            </button>
          )}
          <button
            title="Vote kick"
            className="flex h-6 w-6 items-center justify-center rounded text-on-surface-variant hover:text-error"
            onClick={() => socket?.emit(ClientEvents.MOD_VOTEKICK, { targetPlayerId: p.id })}
          >
            <Icon name="block" className="!text-sm" />
          </button>
          {isHost && (
            <button
              title="Mute"
              className="flex h-6 w-6 items-center justify-center rounded text-on-surface-variant hover:text-tertiary"
              onClick={() => socket?.emit(ClientEvents.MOD_MUTE, { targetPlayerId: p.id })}
            >
              <Icon name={p.isMuted ? "mic_off" : "mic"} className="!text-sm" />
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export function PlayerList() {
  const room = useRoomStore((s) => s.room);
  const mySocketId = useRoomStore((s) => s.mySocketId);
  const isHost = useRoomStore((s) => s.isHost);
  const scoreboard = useGameStore((s) => s.scoreboard);
  const teamScoreboard = useGameStore((s) => s.teamScoreboard);
  const momentum = useGameStore((s) => s.momentum);
  const drawerId = useGameStore((s) => s.turn?.drawerId ?? null);
  const nearMissPulse = useChaosStore((s) => s.nearMissPulse);
  if (!room) return null;

  const scoreOf = (p: Player) => scoreboard[p.id] ?? p.score;
  const streakOf = (p: Player) => momentum[p.anonId] ?? 0;
  // Only ever non-zero on the drawer's own client — NEAR_MISS_PULSE is a
  // private emit that non-drawers never receive in the first place.
  const heatSignalOf = (p: Player) => (nearMissPulse?.playerId === p.id ? nearMissPulse.signal : 0);
  const heading = "font-mono text-[10px] uppercase tracking-widest text-on-surface-variant/60 px-1";

  if (room.settings.mode === "team" && room.teams.length > 0) {
    const teamsSorted = [...room.teams].sort(
      (a, b) => (teamScoreboard?.[b.id] ?? 0) - (teamScoreboard?.[a.id] ?? 0)
    );
    const unassigned = room.players.filter((p) => p.teamId === null);
    return (
      <div className="flex flex-col gap-3">
        {teamsSorted.map((team) => {
          const members = room.players
            .filter((p) => p.teamId === team.id)
            .sort((a, b) => scoreOf(b) - scoreOf(a));
          return (
            <div key={team.id}>
              <div className="mb-1 flex items-center gap-2 px-1 font-display text-xs font-bold uppercase tracking-wide text-on-surface">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: team.color }} />
                <span>{team.name}</span>
                <span className="ml-auto font-mono text-on-surface-variant">
                  avg {Math.round(teamScoreboard?.[team.id] ?? 0)}
                </span>
              </div>
              <ul className="flex flex-col gap-2">
                {members.map((p) => (
                  <PlayerRow
                    key={p.id}
                    p={p}
                    score={scoreOf(p)}
                    isMe={p.id === mySocketId}
                    isHost={isHost}
                    isDrawer={p.id === drawerId}
                    streak={streakOf(p)}
                    heatSignal={heatSignalOf(p)}
                  />
                ))}
              </ul>
            </div>
          );
        })}
        {unassigned.length > 0 && (
          <div>
            <div className={`mb-1 ${heading}`}>Unassigned</div>
            <ul className="flex flex-col gap-2">
              {unassigned.map((p) => (
                <PlayerRow
                  key={p.id}
                  p={p}
                  score={scoreOf(p)}
                  isMe={p.id === mySocketId}
                  isHost={isHost}
                  isDrawer={p.id === drawerId}
                  streak={streakOf(p)}
                  heatSignal={heatSignalOf(p)}
                />
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  const sorted = [...room.players].sort((a, b) => scoreOf(b) - scoreOf(a));
  return (
    <div className="flex flex-col gap-2">
      <div className={heading}>Players</div>
      <ul className="flex flex-col gap-2">
        {sorted.map((p) => (
          <PlayerRow
            key={p.id}
            p={p}
            score={scoreOf(p)}
            isMe={p.id === mySocketId}
            isHost={isHost}
            isDrawer={p.id === drawerId}
            streak={streakOf(p)}
            heatSignal={heatSignalOf(p)}
          />
        ))}
      </ul>
    </div>
  );
}
