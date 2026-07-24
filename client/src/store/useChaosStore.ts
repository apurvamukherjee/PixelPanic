import { create } from "zustand";
import type { SabotagePowerup, SabotageEffectAppliedPayload } from "@pixelpanic/shared";

interface ActiveEffect {
  effect: SabotagePowerup;
  expiresAt: number;
  partnerId?: string;
}

interface ChaosStoreState {
  pendingPowerup: SabotagePowerup | null; // granted to me, not yet used
  activeEffect: ActiveEffect | null; // currently applied to me
  // Drawer-only: most recent near-miss pulse (no guess text), keyed by an
  // incrementing id so PlayerList can retrigger the pulse even if the same
  // player is the one heating up twice in a row.
  nearMissPulse: { playerId: string; signal: number } | null;
  setPendingPowerup: (powerup: SabotagePowerup | null) => void;
  applyEffect: (payload: SabotageEffectAppliedPayload) => void;
  clearExpiredEffect: () => void;
  triggerNearMissPulse: (playerId: string) => void;
  reset: () => void;
}

// Sabotage powerup/effect state is purely local-player UI state (which
// powerup I'm holding, which effect is currently active on my screen) — it
// doesn't belong in useGameStore (room-wide authoritative state) since
// nobody else needs to know the details, only that an effect fired.
export const useChaosStore = create<ChaosStoreState>((set, get) => ({
  pendingPowerup: null,
  activeEffect: null,
  nearMissPulse: null,

  setPendingPowerup: (powerup) => set({ pendingPowerup: powerup }),

  triggerNearMissPulse: (playerId) =>
    set((state) => ({ nearMissPulse: { playerId, signal: (state.nearMissPulse?.signal ?? 0) + 1 } })),

  applyEffect: (payload) => {
    set({ activeEffect: { effect: payload.effect, expiresAt: Date.now() + payload.durationMs, partnerId: payload.partnerId } });
    setTimeout(() => {
      if (get().activeEffect?.expiresAt && Date.now() >= get().activeEffect!.expiresAt) {
        set({ activeEffect: null });
      }
    }, payload.durationMs + 50);
  },

  clearExpiredEffect: () =>
    set((state) =>
      state.activeEffect && state.activeEffect.expiresAt <= Date.now() ? { activeEffect: null } : {}
    ),

  reset: () => set({ pendingPowerup: null, activeEffect: null, nearMissPulse: null }),
}));
