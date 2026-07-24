// Lightweight cross-room online-presence set, used only by the Phase 3
// rival system's "notify when rival comes online" feature. Module-level
// singleton rather than per-room state since presence is inherently
// server-wide, not scoped to any one RoomInstance.
class PresenceTracker {
  private online = new Map<string, string>(); // anonId -> current socket.id

  setOnline(anonId: string, socketId: string): void {
    this.online.set(anonId, socketId);
  }

  setOffline(anonId: string): void {
    this.online.delete(anonId);
  }

  isOnline(anonId: string): boolean {
    return this.online.has(anonId);
  }

  socketIdFor(anonId: string): string | undefined {
    return this.online.get(anonId);
  }
}

export const presenceTracker = new PresenceTracker();
