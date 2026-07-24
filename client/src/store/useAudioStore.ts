import { create } from "zustand";
import {
  playCorrectGuessSound,
  playWrongGuessSound,
  playNearMissSound,
  playRoundEndSound,
  startBackgroundMusic,
  stopBackgroundMusic,
  unlockAudio,
} from "../lib/sound";

const SFX_KEY = "pixelpanic:sfxOn";
const MUSIC_KEY = "pixelpanic:musicOn";

function readBool(key: string, fallback: boolean): boolean {
  const raw = localStorage.getItem(key);
  return raw === null ? fallback : raw === "1";
}

interface AudioState {
  sfxOn: boolean;
  musicOn: boolean;
  unlocked: boolean;
  // Called once on the first user gesture — browsers won't let audio start
  // before that, so background music can only kick in here or on toggle.
  unlock: () => void;
  toggleMuted: () => void;
  playCorrect: () => void;
  playWrong: () => void;
  playNearMiss: () => void;
  playRoundEnd: () => void;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  sfxOn: readBool(SFX_KEY, true),
  musicOn: readBool(MUSIC_KEY, true),
  unlocked: false,

  unlock: () => {
    if (get().unlocked) return;
    unlockAudio();
    set({ unlocked: true });
    if (get().musicOn) startBackgroundMusic();
  },

  toggleMuted: () => {
    const isMuted = !get().sfxOn && !get().musicOn;
    const nextOn = isMuted;
    localStorage.setItem(SFX_KEY, nextOn ? "1" : "0");
    localStorage.setItem(MUSIC_KEY, nextOn ? "1" : "0");
    set({ sfxOn: nextOn, musicOn: nextOn });
    if (nextOn && get().unlocked) startBackgroundMusic();
    else stopBackgroundMusic();
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
