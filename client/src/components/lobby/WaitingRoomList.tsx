import { useRoomStore } from "../../store/useRoomStore";
import { Avatar } from "../shared/Avatar";

export function WaitingRoomList() {
  const room = useRoomStore((s) => s.room);
  const mySocketId = useRoomStore((s) => s.mySocketId);
  if (!room) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="hand text-xl font-bold text-on-surface">Players</h2>
        <span className="text-sm text-on-surface-variant">
          {room.players.length} of {room.settings.maxPlayers}
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {room.players.map((p) => (
          <li
            key={p.id}
            className={`player-join flex items-center gap-3 rounded-xl px-2 py-1.5 ${
              p.id === mySocketId ? "bg-white/5" : ""
            }`}
          >
            <Avatar name={p.name} color={p.color} avatarId={p.avatarId} status={p.connected ? undefined : "idle"} />
            <span className="min-w-0 flex-1 truncate font-semibold text-on-surface">
              {p.name}
              {p.id === mySocketId && <span className="font-normal text-on-surface-variant"> (you)</span>}
            </span>
            {!p.connected && <span className="text-xs text-on-surface-variant">reconnecting…</span>}
            {p.isHost && (
              <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-bold text-on-primary">host</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
