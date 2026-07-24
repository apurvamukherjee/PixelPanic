import { useRoomStore } from "../store/useRoomStore";
import { useGameStore } from "../store/useGameStore";
import { useChatStore } from "../store/useChatStore";
import { useTournamentStore } from "../store/useTournamentStore";
import { useChaosStore } from "../store/useChaosStore";

// Every store that holds state scoped to a single room — cleared whenever
// the local player leaves one, whether voluntarily (Leave Room) or because
// the server closed it out from under them (ROOM_CLOSED). Without this, a
// stale `room`/`turn`/chat history from the old room could bleed into the
// next one this socket joins or creates.
export function resetRoomScopedState(): void {
  useRoomStore.getState().clear();
  useGameStore.getState().reset();
  useChatStore.getState().clear();
  useTournamentStore.getState().clear();
  useChaosStore.getState().reset();
}
