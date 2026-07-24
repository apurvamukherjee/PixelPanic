import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClientEvents } from "@pixelpanic/shared";
import { useConnectionStore } from "../store/useConnectionStore";
import { useRoomStore } from "../store/useRoomStore";
import { getAnonId, getSavedName, saveName, getSavedAvatarId, saveAvatarId } from "../lib/anonId";
import { Button } from "../components/shared/Button";
import { AvatarPicker } from "../components/shared/AvatarPicker";
import { FeatureGuide } from "../components/shared/FeatureGuide";

export function HomePage() {
  const navigate = useNavigate();
  const ensureConnected = useConnectionStore((s) => s.ensureConnected);
  const room = useRoomStore((s) => s.room);
  const [name, setName] = useState(getSavedName());
  const [avatarId, setAvatarId] = useState<string | null>(getSavedAvatarId());
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (pending && room) navigate(`/room/${room.id}`);
  }, [pending, room, navigate]);

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
