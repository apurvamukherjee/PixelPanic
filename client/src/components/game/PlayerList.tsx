import { ClientEvents, type Player } from "@pixelpanic/shared";
import { useRoomStore } from "../../store/useRoomStore";
import { useGameStore } from "../../store/useGameStore";
import { useConnectionStore } from "../../store/useConnectionStore";
import { Avatar } from "../shared/Avatar";
import { Icon } from "../shared/Icon";

function PlayerRow({
  p,
  score,
  isMe,
  isHost,
  isDrawer,
}: {
  p: Player;
  score: number;
  isMe: boolean;
  isHost: boolean;
  isDrawer: boolean;
}) {
  const socket = useConnectionStore((s) => s.socket);
  return (
    <li
      className={`flex items-center gap-2 rounded-xl border px-2 py-2 ${
        isDrawer ? "border-primary/30 bg-primary/10" : "border-white/5 bg-surface-container-high/50"
      } ${!p.connected ? "opacity-60" : ""}`}
    >
      <Avatar
        name={p.name}
        color={p.color}
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
      <span className="ml-auto font-mono text-sm text-on-surface-variant">{score}</span>
      {!isMe && (
        <div className="flex gap-1">
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
  const drawerId = useGameStore((s) => s.turn?.drawerId ?? null);
  if (!room) return null;

  const scoreOf = (p: Player) => scoreboard[p.id] ?? p.score;
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
          />
        ))}
      </ul>
    </div>
  );
}
