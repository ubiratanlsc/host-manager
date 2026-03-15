import { getSystemFonts } from "tauri-plugin-system-fonts-api";
import { create } from "zustand";

const FontSettings = create((set) => ({
    fonts: [],
    font: "JetBrainsMono Nerd Font, monospace",
    fontSize: 16,
    ligatures: true,
    loadFonts: async () => {
        let fonts = await getSystemFonts();
        fonts = Array.from(
            new Map(fonts.map(font => [font.name, font])).values()
        )
        set({ fonts });
    },
    setFont: (font) => set({ font }),
    setFontSize: (fontSize) => set({ fontSize }),
    setLigatures: (ligatures) => set({ ligatures })
}));
export default FontSettings;