import { create } from "zustand";
import type { DrawTool } from "@pixelpanic/shared";

interface DrawingState {
  tool: DrawTool;
  color: string;
  size: number;
  setTool: (tool: DrawTool) => void;
  setColor: (color: string) => void;
  setSize: (size: number) => void;
}

export const useDrawingStore = create<DrawingState>((set) => ({
  tool: "pencil",
  color: "#f8fafc",
  size: 8,
  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color }),
  setSize: (size) => set({ size }),
}));
