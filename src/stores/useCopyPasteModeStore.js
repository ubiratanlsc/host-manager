import { create } from "zustand";

// Store para modo de copiar/colar
const useCopyPasteModeStore = create((set) => ({
  mode: "keyboard", // "keyboard" ou "selection"
  setMode: (newMode) => set(() => ({
    mode: newMode === "keyboard" ? "keyboard" : "selection"
  }))
}));

export default useCopyPasteModeStore;
