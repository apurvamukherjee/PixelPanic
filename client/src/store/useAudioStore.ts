import { create } from "zustand";
import {
  playCorrectGuessSound,
  playWrongGuessSound,
  playNearMissSound,
  playRoundEndSound,
  unlockAudio,
} from "../lib/sound";

const SFX_KEY = "pixelpanic:sfxOn";

function readBool(key: string, fallback: boolean): boolean {
  const raw = localStorage.getItem(key);
  return raw === null ? fallback : raw === "1";
}

interface AudioState {
  sfxOn: boolean;
  unlocked: boolean;
  // Called once on the first user gesture — browsers won't let audio start
  // before that.
  unlock: () => void;
  toggleMuted: () => void;
  playCorrect: () => void;
  playWrong: () => void;
  playNearMiss: () => void;
  playRoundEnd: () => void;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  sfxOn: readBool(SFX_KEY, true),
  unlocked: false,

  unlock: () => {
    if (get().unlocked) return;
    unlockAudio();
    set({ unlocked: true });
  },

  toggleMuted: () => {
    const next = !get().sfxOn;
    localStorage.setItem(SFX_KEY, next ? "1" : "0");
    set({ sfxOn: next });
  },

  playCorrect: () => {
    if (get().sfxOn) playCorrectGuessSound();
  },
  playWrong: () => {
    if (get().sfxOn) playWrongGuessSound();
  },
  playNearMiss: () => {
    if (get().sfxOn) playNearMissSound();
  },
  playRoundEnd: () => {
    if (get().sfxOn) playRoundEndSound();
  },
}));
