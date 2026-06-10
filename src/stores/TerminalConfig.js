import { create } from "zustand";

/**
 * TerminalConfig - Configurações visuais do terminal xterm.js
 * 
 * Estado:
 * - cursorBlink: Se o cursor pisca
 * - cursorStyle: Estilo do cursor (bar, block, underline)
 * - scrollback: Quantidade de linhas no scrollback
 * - lineHeight: Altura da linha
 * - defaultShell: Comando do shell padrão ao abrir novo terminal
 */
const TerminalConfig = create((set) => ({
    cursorBlink: true,
    cursorStyle: "bar",
    scrollback: 2000,
    lineHeight: 1.2,
    defaultShell: null, // null = usa o primeiro shell detectado pelo sistema
    setCursorBlink: (cursorBlink) => set({ cursorBlink }),
    setCursorStyle: (cursorStyle) => set({ cursorStyle }),
    setScrollback: (scrollback) => set({ scrollback }),
    setLineHeight: (lineHeight) => set({ lineHeight }),
    setDefaultShell: (defaultShell) => set({ defaultShell }),
}));

export default TerminalConfig;
