import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClientEvents } from "@pixelpanic/shared";
import { useConnectionStore } from "../store/useConnectionStore";
import { useRoomStore } from "../store/useRoomStore";
import { resetRoomScopedState } from "../lib/resetRoomState";
import { getAnonId, getSavedName, saveName, getSavedAvatarId, saveAvatarId } from "../lib/anonId";
import { Button } from "../components/shared/Button";
import { AvatarPicker } from "../components/shared/AvatarPicker";
import { FeatureGuide } from "../components/shared/FeatureGuide";

export function HomePage() {
  const navigate = useNavigate();
  const ensureConnected = useConnectionStore((s) => s.ensureConnected);
  const room = useRoomStore((s) => s.room);
  const closedReason = useRoomStore((s) => s.closedReason);
  const [name, setName] = useState(getSavedName());
  const [avatarId, setAvatarId] = useState<string | null>(getSavedAvatarId());
  const [pending, setPending] = useState(false);

  // Landing here with a stale `room` still in the store (e.g. the browser
  // back button from an active room, rather than the "Leave room" button —
  // client-side navigation alone never touches store state) used to make
  // the effect below fire on that *old* room the instant "pending" flipped
  // true, sending Create/Quick Match right back into the room being left
  // instead of the fresh one the server was about to create. Wiping it on
  // mount guarantees the effect can only fire once real, new room data
  // arrives — the ROOM_CREATE/ROOM_JOIN emit itself also triggers a
  // server-side cleanup of the old room membership (see RoomManager).
  useEffect(() => {
    resetRoomScopedState();
  }, []);

  useEffect(() => {
    if (pending && room) navigate(`/room/${room.id}`);
  }, [pending, room, navigate]);

  // Shown once after landing here from a ROOM_CLOSED (host left for good) —
  // cleared immediately so it doesn't reappear on a later visit.
  useEffect(() => {
    if (closedReason) {
      const t = setTimeout(() => useRoomStore.getState().clearClosedReason(), 6000);
      return () => clearTimeout(t);
    }
  }, [closedReason]);

  const chooseAvatar = (id: string) => {
    setAvatarId(id);
    saveAvatarId(id);
  };

  const withName = (fn: () => void) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    saveName(trimmed);
    ensureConnected();
    setPending(true);
    fn();
  };

  const quickMatch = () =>
    withName(() => {
      const socket = useConnectionStore.getState().socket;
      socket?.emit(ClientEvents.ROOM_QUICK_MATCH, { name: name.trim(), anonId: getAnonId(), avatarId });
    });

  const createPrivate = () =>
    withName(() => {
      const socket = useConnectionStore.getState().socket;
      socket?.emit(ClientEvents.ROOM_CREATE, {
        visibility: "private",
        hostName: name.trim(),
        anonId: getAnonId(),
        avatarId,
      });
    });

  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-8 overflow-hidden p-6">
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-secondary/10 blur-[100px]" />

      {closedReason && (
        <div className="round-end-pop glass relative w-full max-w-sm rounded-2xl border border-tertiary/30 bg-tertiary/10 px-4 py-3 text-center text-sm text-tertiary">
          {closedReason}
        </div>
      )}

      <div className="glass relative flex w-full max-w-sm flex-col items-center gap-6 rounded-3xl p-8 text-center">
        <div>
          <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight text-primary">
            Pixelpanic
          </h1>
          <p className="mt-2 text-on-surface-variant">
            Doodle. Guess. <span className="text-secondary">Dominate.</span>
          </p>
        </div>

        <AvatarPicker avatarId={avatarId} onChange={chooseAvatar} name={name} />

        <input
          className="w-full rounded-xl border border-white/10 bg-background px-4 py-3 text-center font-body text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-secondary"
          placeholder="Your name"
          maxLength={20}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="flex w-full flex-col gap-3">
          <Button onClick={quickMatch} disabled={!name.trim() || pending}>
            Quick Match
          </Button>
          <Button variant="secondary" onClick={createPrivate} disabled={!name.trim() || pending}>
            Create Private Room
          </Button>
          <Button variant="ghost" onClick={() => navigate("/wordpacks")}>
            My Word Packs
          </Button>
          <FeatureGuide />
        </div>
      </div>
    </div>
  );
}
