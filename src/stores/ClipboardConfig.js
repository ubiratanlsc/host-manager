import { create } from "zustand";

/**
 * ClipboardConfig - Configurações de copiar/colar
 * 
 * Estado:
 * - pasteRight: Colar com botão direito do mouse
 * - copyOnSelect: Copiar automaticamente ao selecionar texto
 * - mode: Modo de cópia ("keyboard" ou "selection")
 */
const ClipboardConfig = create((set) => ({
    pasteRight: true,
    copyOnSelect: true,
    mode: "keyboard",
    setPasteRight: (pasteRight) => set({ pasteRight }),
    setCopyOnSelect: (copyOnSelect) => set({ copyOnSelect }),
    setMode: (newMode) => set(() => ({
        mode: newMode === "keyboard" ? "keyboard" : "selection"
    })),
}));

export default ClipboardConfig;
