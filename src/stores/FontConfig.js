import { getSystemFonts } from "tauri-plugin-system-fonts-api";
import { create } from "zustand";
import { isTauri } from "@tauri-apps/api/core";

const FontSettings = create((set) => ({
    fonts: [],
    font: "JetBrainsMono Nerd Font, monospace",
    fontSize: 16,
    ligatures: true,
    loadFonts: async () => {
        try {
            if (!isTauri()) {
                set({ fonts: [] });
                return;
            }
            let fonts = await getSystemFonts();
            if (!fonts || !Array.isArray(fonts)) {
                set({ fonts: [] });
                return;
            }
            fonts = Array.from(
                new Map(fonts.map(font => [font.name, font])).values()
            )
            set({ fonts });
        } catch (e) {
            console.warn('[FontConfig] Failed to load system fonts:', e);
            set({ fonts: [] });
        }
    },
    setFont: (font) => set({ font }),
    setFontSize: (fontSize) => set({ fontSize }),
    setLigatures: (ligatures) => set({ ligatures })
}));
export default FontSettings;