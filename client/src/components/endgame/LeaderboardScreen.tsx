import { ClientEvents } from "@pixelpanic/shared";
import { useGameStore } from "../../store/useGameStore";
import { useRoomStore } from "../../store/useRoomStore";
import { useConnectionStore } from "../../store/useConnectionStore";
import { Avatar } from "../shared/Avatar";
import { Button } from "../shared/Button";
import { Icon } from "../shared/Icon";

const RANK_STYLES = [
  "border-primary/40 bg-primary/10 text-primary",
  "border-secondary/40 bg-secondary/10 text-secondary",
  "border-tertiary/40 bg-tertiary/10 text-tertiary",
];

export function LeaderboardScreen() {
  const finalScoreboard = useGameStore((s) => s.finalScoreboard);
  const teamScoreboard = useGameStore((s) => s.teamScoreboard);
  const isHost = useRoomStore((s) => s.isHost);
  const room = useRoomStore((s) => s.room);
  const socket = useConnectionStore((s) => s.socket);
  if (!finalScoreboard) return null;

  const teamsRanked =
    room?.settings.mode === "team" && teamScoreboard
      ? [...room.teams].sort((a, b) => (teamScoreboard[b.id] ?? 0) - (teamScoreboard[a.id] ?? 0))
      : null;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 overflow-y-auto p-6">
      <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight text-primary">
        Final scores
      </h1>

      {teamsRanked && (
        <ol className="flex w-full max-w-sm flex-col gap-2">
          {teamsRanked.map((team, i) => (
            <li key={team.id} className={`glass flex items-center gap-3 rounded-xl border px-4 py-3 ${RANK_STYLES[i] ?? "border-white/5"}`}>
              <span className="w-6 font-mono text-sm">#{i + 1}</span>
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: team.color }} />
              <span className="flex-1 font-display font-semibold text-on-surface">{team.name}</span>
              <span className="font-mono font-semibold">{Math.round(teamScoreboard![team.id] ?? 0)} avg</span>
            </li>
          ))}
        </ol>
      )}

      <ol className="flex w-full max-w-sm flex-col gap-2">
        {finalScoreboard.map((entry, i) => {
          const player = room?.players.find((p) => p.id === entry.playerId);
          return (
            <li
              key={entry.playerId}
              className={`glass flex items-center gap-3 rounded-xl border px-4 py-3 ${RANK_STYLES[i] ?? "border-white/5"}`}
            >
              {i < 3 ? (
                <Icon name="workspace_premium" filled className="!text-xl" />
              ) : (
                <span className="w-6 text-center font-mono text-sm text-on-surface-variant">#{i + 1}</span>
              )}
              {player && <Avatar name={player.name} color={player.color} size={28} />}
              <span className="flex-1 font-display font-medium text-on-surface">{entry.name}</span>
              <span className="font-mono font-semibold">{entry.score}</span>
            </li>
          );
        })}
      </ol>
      {isHost && (
        <Button onClick={() => socket?.emit(ClientEvents.GAME_START)}>
          <span className="flex items-center gap-2">
            <Icon name="replay" className="!text-base" /> Play again
          </span>
        </Button>
      )}
    </div>
  );
}
