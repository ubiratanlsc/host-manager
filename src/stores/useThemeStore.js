import { create } from 'zustand';
import useConfigStore from './ConfigData';
import ThemeConfig from './ThemeConfig';

const draculaTheme = {
    foreground: '#f8f8f2',
    background: '#282a36',
    cursor: '#f8f8f0',
    cursorAccent: '#282a36',
    selection: 'rgba(255, 255, 255, 0.3)',
    black: '#21222c',
    red: '#ff5555',
    green: '#50fa7b',
    yellow: '#f1fa8c',
    blue: '#bd93f9',
    magenta: '#ff79c6',
    cyan: '#8be9fd',
    white: '#f8f8f2',
    brightBlack: '#6272a4',
    brightRed: '#ff6e6e',
    brightGreen: '#69ff94',
    brightYellow: '#ffffa5',
    brightBlue: '#d6acff',
    brightMagenta: '#ff92df',
    brightCyan: '#a4ffff',
    brightWhite: '#ffffff'
};

const useThemeStore = create((set) => ({
    themes: {},
    theme: draculaTheme,

    // Action to initialize or refresh the current theme based on ConfigStore
    initTheme: () => {
        const configState = useConfigStore.getState();
        const savedThemeName = ThemeConfig.getState().colorTheme || 'Dracula';
        const themesFromConfig = configState.colors || {};

        const allThemes = {};

        // Add Dracula as a base/fallback
        allThemes['Dracula'] = draculaTheme;

        // Merge themes from ConfigStore
        // Expecting themesFromConfig values to be { id, name, colors: {...} } or direct colors objects?
        // Based on LoadData, it's { id, name, colors }.
        Object.values(themesFromConfig).forEach(ct => {
            // Use the name as key, or id if name is missing
            const key = ct.name || ct.id;
            if (key && ct.colors) {
                allThemes[key] = ct.colors;
            }
        });

        let selectedTheme = allThemes[savedThemeName];

        // Fallback
        if (!selectedTheme) {
            // Check if savedThemeName matches an ID directly
            const matchById = Object.values(themesFromConfig).find(t => t.id === savedThemeName);
            if (matchById && matchById.colors) {
                selectedTheme = matchById.colors;
            } else {
                selectedTheme = draculaTheme;
            }
        }

        set({
            themes: allThemes,
            theme: selectedTheme
        });
    },

    setTheme: (themeName) => {
        ThemeConfig.getState().setColorTheme(themeName);
        useThemeStore.getState().initTheme();
    },
}));

// Initialize theme immediately
useThemeStore.getState().initTheme();

// Optional: Subscribe to changes in ConfigStore to auto-update ThemeStore
useConfigStore.subscribe(() => {
    useThemeStore.getState().initTheme();
});

// Subscribe to ThemeConfig changes too
ThemeConfig.subscribe(() => {
    useThemeStore.getState().initTheme();
});

export default useThemeStore;