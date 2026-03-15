import { create } from "zustand";

/**
 * ThemeConfig - Configurações de tema da aplicação
 * 
 * Estado:
 * - theme: Tema da interface (dark/light)
 * - colorTheme: Nome do color scheme do terminal (ex: "Default Dark", "Dracula")
 */
const ThemeConfig = create((set) => ({
    theme: "dark",
    colorTheme: "Default Dark",
    setTheme: (theme) => set({ theme }),
    setColorTheme: (colorTheme) => set({ colorTheme }),
}));

export default ThemeConfig;
