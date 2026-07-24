import { useEffect, useRef, useState } from "react";
import type { ChatChannel } from "@pixelpanic/shared";
import { useChatStore } from "../../store/useChatStore";
import { useGameStore } from "../../store/useGameStore";
import { useRoomStore } from "../../store/useRoomStore";
import { Icon } from "../shared/Icon";

export function ChatPanel() {
  const messages = useChatStore((s) => s.messages);
  const sendGuess = useChatStore((s) => s.sendGuess);
  const drawerId = useGameStore((s) => s.turn?.drawerId ?? null);
  const mySocketId = useRoomStore((s) => s.mySocketId);
  const room = useRoomStore((s) => s.room);
  const myTeamId = useRoomStore((s) => s.myTeamId);
  const isDrawer = drawerId !== null && drawerId === mySocketId;
  const isTeamMode = room?.settings.mode === "team" && myTeamId !== null;
  const [channel, setChannel] = useState<ChatChannel>("room");
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPinnedToBottom, setIsPinnedToBottom] = useState(true);
  const [unseenCount, setUnseenCount] = useState(0);

  const activeChannel = isTeamMode ? channel : "room";
  const visibleMessages = messages.filter((m) =>
    activeChannel === "team" ? m.channel === "team" && m.teamId === myTeamId : m.channel !== "team"
  );

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ block: "end", behavior });
    setUnseenCount(0);
  };

  // Only auto-scroll when the user was already at (or near) the bottom —
  // otherwise a fast-moving guess feed yanks them away mid-read. If they've
  // scrolled up, new messages just bump a "jump to latest" pill instead.
  useEffect(() => {
    if (isPinnedToBottom) {
      bottomRef.current?.scrollIntoView({ block: "end" });
    } else {
      setUnseenCount((n) => n + 1);
    }
  }, [visibleMessages.length, isPinnedToBottom]);

  // Switching channels (room/team) should always land at the bottom of that
  // channel's own history, not carry over the other channel's scroll state.
  useEffect(() => {
    scrollToBottom("auto");
  }, [activeChannel]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    setIsPinnedToBottom(nearBottom);
    if (nearBottom) setUnseenCount(0);
  };

  const submit = () => {
    if (!text.trim()) return;
    sendGuess(text, activeChannel);
    setText("");
  };

  return (
    <div className="glass flex h-full min-h-0 flex-col rounded-2xl">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
          <Icon name="forum" className="!text-sm" /> Feed
        </span>
        {isTeamMode && (
          <div className="flex gap-1 rounded-lg bg-surface-container-highest p-0.5">
            <button
              className={`rounded-md px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide transition-colors ${
                channel === "room" ? "bg-primary text-on-primary" : "text-on-surface-variant"
              }`}
              onClick={() => setChannel("room")}
            >
              Room
            </button>
            <button
              className={`rounded-md px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide transition-colors ${
                channel === "team" ? "bg-primary text-on-primary" : "text-on-surface-variant"
              }`}
              onClick={() => setChannel("team")}
            >
              My Team
            </button>
          </div>
        )}
      </div>
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="custom-scrollbar h-full overflow-y-auto p-3 flex flex-col gap-2 text-sm"
        >
        {visibleMessages.map((m) => {
          if (m.kind === "system") {
            return (
              <div key={m.id} className="text-center text-xs italic text-on-surface-variant">
                {m.text}
              </div>
            );
          }
          if (m.kind === "correctGuess") {
            return (
              <div
                key={m.id}
                className="guess-correct flex items-center gap-3 rounded-xl border border-success/40 bg-success/20 p-2.5"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success text-white">
                  <Icon name="check" className="!text-sm" />
                </div>
                <span className="text-xs text-success">{m.text}</span>
              </div>
            );
          }
          if (m.kind === "nearMiss") {
            return (
              <div
                key={m.id}
                className="near-miss flex items-center gap-3 rounded-xl border border-tertiary/40 bg-tertiary/20 p-2.5"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tertiary text-on-tertiary">
                  <Icon name="bolt" className="!text-sm" />
                </div>
                <span className="text-xs text-tertiary">{m.text}</span>
              </div>
            );
          }
          return (
            <div key={m.id} className="rounded-lg border border-white/5 bg-white/5 p-2">
              <span className="font-bold text-secondary">{m.playerName}: </span>
              <span className="text-on-surface">{m.text}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
        </div>
        {!isPinnedToBottom && (
          <button
            onClick={() => scrollToBottom()}
            className="round-row-in absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-secondary px-3 py-1 font-mono text-[11px] font-bold text-on-secondary shadow-lg"
          >
            <Icon name="arrow_downward" className="!text-sm" />
            {unseenCount > 0 ? `${unseenCount} new` : "Jump to latest"}
          </button>
        )}
      </div>
      <div className="border-t border-white/5 p-3">
        <div className="relative">
          <input
            data-testid="chat-input"
            className="w-full rounded-xl border border-white/10 bg-background py-2.5 pl-4 pr-12 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-secondary"
            placeholder={
              activeChannel === "team"
                ? "Message your team…"
                : isDrawer
                  ? "You're drawing — chat is guess-only"
                  : "Type your guess…"
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <button
            data-testid="chat-send"
            className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-secondary text-on-secondary transition-transform active:scale-90"
            onClick={submit}
          >
            <Icon name="send" className="!text-base" />
          </button>
        </div>
      </div>
    </div>
  );
}
