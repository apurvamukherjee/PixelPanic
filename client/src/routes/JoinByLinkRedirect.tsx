import { useEffect, useRef, useState } from "react";
import { ClientEvents } from "@pixelpanic/shared";
import { useConnectionStore } from "../store/useConnectionStore";
import { useRoomStore } from "../store/useRoomStore";
import { getAnonId, getSavedName, saveName, getSavedAvatarId } from "../lib/anonId";
import { Button } from "../components/shared/Button";

interface JoinByLinkRedirectProps {
  code: string;
}

// Rendered by RoomPage whenever someone lands on /room/:code without having
// joined yet this session (e.g. opening a friend's shared link cold) —
// prompts for a name once (or reuses the saved one) and joins by code.
export function JoinByLinkRedirect({ code }: JoinByLinkRedirectProps) {
  const ensureConnected = useConnectionStore((s) => s.ensureConnected);
  const lastError = useRoomStore((s) => s.lastError);
  const clearError = useRoomStore((s) => s.clearError);
  const [name, setName] = useState(getSavedName());
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (lastError) setJoining(false);
  }, [lastError]);

  // A reload of /room/CODE (mobile browsers discard background tabs all the
  // time) lands here with an empty store. With a saved name, rejoin straight
  // away so the player is back inside the server's 20s reconnect grace
  // window instead of sitting on a name prompt. Errors fall back to the form.
  const autoJoined = useRef(false);
  useEffect(() => {
    if (autoJoined.current || !getSavedName().trim()) return;
    autoJoined.current = true;
    join();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const join = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    saveName(trimmed);
    clearError();
    setJoining(true);
    const socket = ensureConnected();
    socket.emit(ClientEvents.ROOM_JOIN, { roomId: code, name: trimmed, anonId: getAnonId(), avatarId: getSavedAvatarId() });
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
      <div className="panel flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl p-8 text-center">
        <div>
          <h2 className="font-display text-xl font-bold text-on-surface">Join room {code}</h2>
          <p className="text-on-surface-variant">Enter a name to jump in.</p>
        </div>
        <input
          className="w-full rounded-xl border border-white/10 bg-background px-4 py-3 text-center text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-secondary"
          placeholder="Your name"
          maxLength={20}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {lastError && <div className="text-sm text-error">{lastError.message}</div>}
        <Button className="w-full" onClick={join} disabled={!name.trim() || joining}>
          {joining ? "Joining…" : "Join room"}
        </Button>
      </div>
    </div>
  );
}
