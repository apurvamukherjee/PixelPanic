import { useState } from "react";
import { ClientEvents } from "@pixelpanic/shared";
import { useRoomStore } from "../../store/useRoomStore";
import { useConnectionStore } from "../../store/useConnectionStore";
import { Button } from "../shared/Button";
import { Icon } from "../shared/Icon";

const TEAM_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#eab308", "#8b5cf6", "#ec4899"];

export function TeamAssignmentPanel() {
  const room = useRoomStore((s) => s.room);
  const isHost = useRoomStore((s) => s.isHost);
  const socket = useConnectionStore((s) => s.socket);
  const [editingTeams, setEditingTeams] = useState(false);
  const [names, setNames] = useState<string[]>([]);

  if (!room || room.settings.mode !== "team") return null;

  const startEditing = () => {
    setNames(room.teams.map((t) => t.name));
    setEditingTeams(true);
  };

  const saveTeams = () => {
    const teams = names
      .map((name, i) => ({
        id: room.teams[i]?.id,
        name: name.trim() || `Team ${i + 1}`,
        color: room.teams[i]?.color ?? TEAM_COLORS[i % TEAM_COLORS.length]!,
      }))
      .filter((t) => t.name);
    socket?.emit(ClientEvents.ROOM_SET_TEAMS, { teams });
    setEditingTeams(false);
  };

  const addTeamSlot = () => setNames((n) => [...n, `Team ${n.length + 1}`]);
  const removeTeamSlot = (i: number) => setNames((n) => n.filter((_, idx) => idx !== i));

  const setPlayerTeam = (playerId: string, teamId: string | null) => {
    socket?.emit(ClientEvents.ROOM_SET_PLAYER_TEAM, { playerId, teamId });
  };

  return (
    <div className="glass flex flex-col gap-3 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className="font-display text-sm font-bold uppercase tracking-wide text-on-surface-variant">
          Teams
        </div>
        {isHost && !editingTeams && (
          <button className="font-mono text-xs text-primary hover:underline" onClick={startEditing}>
            Edit teams
          </button>
        )}
      </div>

      {editingTeams ? (
        <div className="flex flex-col gap-2">
          {names.map((name, i) => (
            <div key={i} className="flex items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: room.teams[i]?.color ?? TEAM_COLORS[i % TEAM_COLORS.length] }}
              />
              <input
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-background px-2 py-1 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary"
                value={name}
                maxLength={24}
                onChange={(e) =>
                  setNames((n) => n.map((v, idx) => (idx === i ? e.target.value : v)))
                }
              />
              <button
                className="text-xs text-on-surface-variant hover:text-error"
                onClick={() => removeTeamSlot(i)}
              >
                <Icon name="close" />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={addTeamSlot}>
              + Add team
            </Button>
            <Button onClick={saveTeams}>Save</Button>
            <Button variant="ghost" onClick={() => setEditingTeams(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {room.players.map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-sm">
              <span className="flex-1 truncate text-on-surface">{p.name}</span>
              {isHost ? (
                <select
                  className="rounded-lg border border-white/10 bg-background px-2 py-1 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary"
                  value={p.teamId ?? ""}
                  onChange={(e) => setPlayerTeam(p.id, e.target.value || null)}
                >
                  <option value="">Unassigned</option>
                  {room.teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-mono text-xs text-on-surface-variant">
                  {room.teams.find((t) => t.id === p.teamId)?.name ?? "Unassigned"}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
