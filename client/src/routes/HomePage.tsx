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
import { Wordmark } from "../components/shared/Wordmark";

export function HomePage() {
  const navigate = useNavigate();
  const ensureConnected = useConnectionStore((s) => s.ensureConnected);
  const room = useRoomStore((s) => s.room);
  const closedReason = useRoomStore((s) => s.closedReason);
  const lastError = useRoomStore((s) => s.lastError);
  const [name, setName] = useState(getSavedName());
  const [avatarId, setAvatarId] = useState<string | null>(getSavedAvatarId());
  const [pending, setPending] = useState(false);
  const [code, setCode] = useState("");

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
    useRoomStore.getState().clearError();
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

  const joinByCode = () =>
    withName(() => {
      const socket = useConnectionStore.getState().socket;
      socket?.emit(ClientEvents.ROOM_JOIN, {
        roomId: code.trim(),
        name: name.trim(),
        anonId: getAnonId(),
        avatarId,
      });
    });

  // A wrong code answers with ROOM_ERROR instead of room state, so drop the
  // pending flag or every button stays disabled.
  useEffect(() => {
    if (lastError) setPending(false);
  }, [lastError]);

  const field =
    "w-full rounded-xl border-[1.5px] border-on-surface/15 bg-surface-container-lowest px-4 py-3 text-on-surface placeholder:text-on-surface-variant/70 focus:border-secondary focus:outline-none";

  return (
    <div className="h-full overflow-y-auto px-5 pb-8">
      <div className="mx-auto flex min-h-full max-w-5xl flex-col items-center justify-center gap-8 md:flex-row md:items-center md:justify-between md:gap-16">
        <section className="flex flex-col items-center gap-5 pt-2 text-center md:items-start md:text-left">
          <Wordmark size="lg" />
          <p className="max-w-xs text-lg text-on-surface-variant">
            One person draws, everyone else races to guess. Bad drawings encouraged.
          </p>
          {/* The real turn loop, in order — only on wide screens, where
              there's room for it beside the form. */}
          <ol className="hidden gap-3 md:flex">
            {[
              { text: "Pick a word", color: "bg-primary text-on-primary", tilt: "-rotate-3" },
              { text: "Draw it fast", color: "bg-secondary text-on-secondary", tilt: "rotate-2" },
              { text: "Guess first, score most", color: "bg-tertiary text-on-tertiary", tilt: "-rotate-1" },
            ].map((step) => (
              <li
                key={step.text}
                className={`hand w-32 rounded-md p-3 text-base font-bold leading-snug shadow-[3px_4px_0_rgba(0,0,0,0.35)] ${step.color} ${step.tilt}`}
              >
                {step.text}
              </li>
            ))}
          </ol>
        </section>

        <section className="panel flex w-full max-w-sm flex-col gap-4 rounded-3xl p-5 sm:p-6">
          {closedReason && (
            <div role="status" className="rounded-xl bg-tertiary/15 px-4 py-3 text-sm text-tertiary">
              {closedReason}
            </div>
          )}

          <div className="flex flex-col items-center gap-3">
            <AvatarPicker avatarId={avatarId} onChange={chooseAvatar} name={name} />
            <label className="sr-only" htmlFor="player-name">
              Your name
            </label>
            <input
              id="player-name"
              className={`${field} text-center text-lg`}
              placeholder="Your name"
              maxLength={20}
              autoComplete="nickname"
              enterKeyHint="go"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && quickMatch()}
            />
          </div>

          <div className="flex flex-col gap-3">
            <Button onClick={quickMatch} disabled={!name.trim() || pending}>
              Quick match
            </Button>
            <Button variant="secondary" onClick={createPrivate} disabled={!name.trim() || pending}>
              Create a private room
            </Button>
          </div>

          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.trim()) joinByCode();
            }}
          >
            <label htmlFor="room-code" className="text-sm text-on-surface-variant">
              Got a code from a friend?
            </label>
            <div className="flex gap-2">
              <input
                id="room-code"
                className={`${field} min-w-0 flex-1 font-mono uppercase tracking-[0.3em] placeholder:tracking-normal`}
                placeholder="ABC123"
                maxLength={6}
                autoCapitalize="characters"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="go"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
              <Button type="submit" variant="secondary" disabled={!name.trim() || code.trim().length < 6 || pending}>
                Join
              </Button>
            </div>
            {lastError && <div className="text-sm text-error">{lastError.message}</div>}
          </form>

          <div className="flex items-center justify-center gap-1 border-t border-on-surface/10 pt-3 text-sm">
            <Button variant="ghost" className="min-h-0 py-2 text-sm" onClick={() => navigate("/wordpacks")}>
              My word packs
            </Button>
            <FeatureGuide />
          </div>
        </section>
      </div>
      <p className="pb-2 text-center text-xs text-on-surface-variant/70">made by Apurva</p>
    </div>
  );
}
