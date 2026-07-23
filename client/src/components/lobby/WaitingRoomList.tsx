import { useRoomStore } from "../../store/useRoomStore";
import { Avatar } from "../shared/Avatar";

export function WaitingRoomList() {
  const room = useRoomStore((s) => s.room);
  if (!room) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="font-mono text-xs uppercase tracking-wide text-on-surface-variant">
        {room.players.length} / {room.settings.maxPlayers} players
      </div>
      <ul className="flex flex-col gap-2">
        {room.players.map((p) => (
          <li key={p.id} className="glass flex items-center gap-3 rounded-xl px-3 py-2">
            <Avatar name={p.name} color={p.color} status={p.connected ? undefined : "idle"} />
            <span className="font-display font-medium text-on-surface">{p.name}</span>
            {p.isHost && (
              <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-primary">
                Host
              </span>
            )}
            {!p.connected && (
              <span className="text-xs text-on-surface-variant">reconnecting…</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
