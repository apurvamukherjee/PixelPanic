import { create } from "zustand";
import type { ChatChannel, ChatMessage } from "@pixelpanic/shared";
import { useConnectionStore } from "./useConnectionStore";
import { ClientEvents } from "@pixelpanic/shared";

const HISTORY_CAP = 300;

interface ChatState {
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  sendGuess: (text: string, channel?: ChatChannel) => void;
  clear: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],

  addMessage: (msg) =>
    set((state) => ({
      messages: [...state.messages, msg].slice(-HISTORY_CAP),
    })),

  sendGuess: (text, channel = "room") => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const socket = useConnectionStore.getState().socket;
    socket?.emit(ClientEvents.CHAT_MESSAGE, { text: trimmed, channel });
  },

  clear: () => set({ messages: [] }),
}));
