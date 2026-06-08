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
// 1. Gruvbox Dark
const gruvboxDarkTheme = {
    foreground: '#debfa6',
    background: '#282828',
    cursor: '#ffb9a4',
    cursorAccent: '#282828',
    selection: 'rgba(255, 185, 164, 0.3)',
    black: '#282828',
    red: '#cc241d',
    green: '#98971a',
    yellow: '#d79921',
    blue: '#458588',
    magenta: '#b16286',
    cyan: '#689d6a',
    white: '#a89984',
    brightBlack: '#928374',
    brightRed: '#fb4f3a',
    brightGreen: '#b8bb26',
    brightYellow: '#fabd2f',
    brightBlue: '#83a598',
    brightMagenta: '#d3869b',
    brightCyan: '#8ec07c',
    brightWhite: '#ebdbb2'
};

// 2. Nord
const nordTheme = {
    foreground: '#ECEFF4',
    background: '#2E3440',
    cursor: '#D8DEE9',
    cursorAccent: '#2E3440',
    selection: 'rgba(216, 222, 233, 0.3)',
    black: '#3B4252',
    red: '#BF616A',
    green: '#A3BE8C',
    yellow: '#EBCB8B',
    blue: '#81A1C1',
    magenta: '#B48EAD',
    cyan: '#88C0D0',
    white: '#D8DEE9',
    brightBlack: '#4C566A',
    brightRed: '#BF616A',
    brightGreen: '#A3BE8C',
    brightYellow: '#EBCB8B',
    brightBlue: '#81A1C1',
    brightMagenta: '#B48EAD',
    brightCyan: '#8FBCD0',
    brightWhite: '#FFFFFF'
};

// 3. OneDark
const oneDarkTheme = {
    foreground: '#abb2bf',
    background: '#282c34',
    cursor: '#528bff',
    cursorAccent: '#282c34',
    selection: 'rgba(82, 135, 255, 0.3)',
    black: '#12171c',
    red: '#e06c75',
    green: '#98c379',
    yellow: '#d19a66',
    blue: '#61afef',
    magenta: '#c678dd',
    cyan: '#56b6c2',
    white: '#abb2bf',
    brightBlack: '#3b4048',
    brightRed: '#e06c75',
    brightGreen: '#98c379',
    brightYellow: '#d19a66',
    brightBlue: '#61afef',
    brightMagenta: '#c678dd',
    brightCyan: '#56b6c2',
    brightWhite: '#ffffff'
};

// 4. Solarized Dark
const solarizedDarkTheme = {
    foreground: '#839496',
    background: '#002b36',
    cursor: '#duli36',
    cursorAccent: '#002b36',
    selection: 'rgba(131, 148, 150, 0.3)',
    black: '#002b36',
    red: '#dc322f',
    green: '#859900',
    yellow: '#b58900',
    blue: '#268bd2',
    magenta: '#d33682',
    cyan: '#2aa198',
    white: '#839496',
    brightBlack: '#495156',
    brightRed: '#dc322f',
    brightGreen: '#859900',
    brightYellow: '#b58900',
    brightBlue: '#268bd2',
    brightMagenta: '#d33682',
    brightCyan: '#2aa198',
    brightWhite: '#fdf6e3'
};

// 5. Monokai
const monokaiTheme = {
    foreground: '#d0d0d0',
    background: '#222222',
    cursor: '#d0d0d0',
    cursorAccent: '#222222',
    selection: 'rgba(208, 208, 208, 0.3)',
    black: '#1a1a1a',
    red: '#f4005f',
    green: '#98e02a',
    yellow: '#e0d561',
    blue: '#9d65ff',
    magenta: '#f4005f',
    cyan: '#58d1eb',
    white: '#d0d0d0',
    brightBlack: '#464646',
    brightRed: '#ff7b9a',
    brightGreen: '#caff7e',
    brightYellow: '#ffee9a',
    brightBlue: '#c5b7ff',
    brightMagenta: '#ff7b9a',
    brightCyan: '#9ceff7',
    brightWhite: '#ffffff'
};

// 6. Ocean Dark
const oceanDarkTheme = {
    foreground: '#c3c7d1',
    background: '#1b2b34',
    cursor: '#c3c7d1',
    cursorAccent: '#1b2b34',
    selection: 'rgba(195, 199, 209, 0.3)',
    black: '#1b2b34',
    red: '#ec5f67',
    green: '#99c794',
    yellow: '#fac863',
    blue: '#6699cc',
    magenta: '#c594c5',
    cyan: '#5fb3b3',
    white: '#c3c7d1',
    brightBlack: '#404852',
    brightRed: '#ec5f67',
    brightGreen: '#99c794',
    brightYellow: '#fac863',
    brightBlue: '#6699cc',
    brightMagenta: '#c594c5',
    brightCyan: '#5fb3b3',
    brightWhite: '#ffffff'
};

// 7. Material Dark
const materialDarkTheme = {
    foreground: '#eeffff',
    background: '#263238',
    cursor: '#ffcc00',
    cursorAccent: '#263238',
    selection: 'rgba(238, 255, 255, 0.3)',
    black: '#263238',
    red: '#f07178',
    green: '#c3e88d',
    yellow: '#ffcb6b',
    blue: '#82aaff',
    magenta: '#c792ea',
    cyan: '#89ddff',
    white: '#eeffff',
    brightBlack: '#465a64',
    brightRed: '#f07178',
    brightGreen: '#c3e88d',
    brightYellow: '#ffcb6b',
    brightBlue: '#82aaff',
    brightMagenta: '#c792ea',
    brightCyan: '#89ddff',
    brightWhite: '#ffffff'
};

// 8. Catppuccin Mocha
const catppuccinMochaTheme = {
    foreground: '#cdd6f4',
    background: '#1e1e2e',
    cursor: '#f5e0dc',
    cursorAccent: '#1e1e2e',
    selection: 'rgba(245, 224, 220, 0.3)',
    black: '#45475a',
    red: '#f38ba8',
    green: '#a6e3a1',
    yellow: '#f9e2af',
    blue: '#89b4fa',
    magenta: '#f5c2e7',
    cyan: '#94e2d5',
    white: '#bac2de',
    brightBlack: '#585b70',
    brightRed: '#f38ba8',
    brightGreen: '#a6e3a1',
    brightYellow: '#f9e2af',
    brightBlue: '#89b4fa',
    brightMagenta: '#f5c2e7',
    brightCyan: '#94e2d5',
    brightWhite: '#a6adc8'
};

// 9. Tokyo Night
const tokyoNightTheme = {
    foreground: '#c0caf5',
    background: '#1a1b26',
    cursor: '#c0caf5',
    cursorAccent: '#1a1b26',
    selection: 'rgba(192, 202, 245, 0.3)',
    black: '#1a1b26',
    red: '#f7768e',
    green: '#9ece6a',
    yellow: '#e0af68',
    blue: '#7aa2f7',
    magenta: '#ad8ee6',
    cyan: '#449dab',
    white: '#787c99',
    brightBlack: '#444b5a',
    brightRed: '#f7768e',
    brightGreen: '#9ece6a',
    brightYellow: '#e0af68',
    brightBlue: '#7aa2f7',
    brightMagenta: '#ad8ee6',
    brightCyan: '#449dab',
    brightWhite: '#a9b1d6'
};

// 10. Everforest Dark
const everforestDarkTheme = {
    foreground: '#d3c6aa',
    background: '#2d3a3b',
    cursor: '#d3c6aa',
    cursorAccent: '#2d3a3b',
    selection: 'rgba(211, 198, 170, 0.3)',
    black: '#2d3a3b',
    red: '#e67e8c',
    green: '#a7c080',
    yellow: '#dbbc7f',
    blue: '#7fbbb3',
    magenta: '#d699b6',
    cyan: '#83c092',
    white: '#d3c6aa',
    brightBlack: '#475258',
    brightRed: '#e67e8c',
    brightGreen: '#a7c080',
    brightYellow: '#dbbc7f',
    brightBlue: '#7fbbb3',
    brightMagenta: '#d699b6',
    brightCyan: '#83c092',
    brightWhite: '#fffaf3'
};

// 11. Hubdark
const hubdarkTheme = {
    foreground: '#c9d1d9',
    background: '#0d1117',
    cursor: '#c9d1d9',
    cursorAccent: '#0d1117',
    selection: 'rgba(201, 209, 217, 0.3)',
    black: '#0d1117',
    red: '#ff7b72',
    green: '#7ee787',
    yellow: '#d2a8ff',
    blue: '#58a6ff',
    magenta: '#d2a8ff',
    cyan: '#79c0ff',
    white: '#c9d1d9',
    brightBlack: '#484f58',
    brightRed: '#ff7b72',
    brightGreen: '#7ee787',
    brightYellow: '#d2a8ff',
    brightBlue: '#58a6ff',
    brightMagenta: '#d2a8ff',
    brightCyan: '#79c0ff',
    brightWhite: '#ffffff'
};

// 12. Purple Dark
const purpleDarkTheme = {
    foreground: '#e0e0e0',
    background: '#1a0b2e',
    cursor: '#e0e0e0',
    cursorAccent: '#1a0b2e',
    selection: 'rgba(224, 224, 224, 0.3)',
    black: '#1a0b2e',
    red: '#ff6b6b',
    green: '#51ff6b',
    yellow: '#ffd16b',
    blue: '#6b6bff',
    magenta: '#ff6bff',
    cyan: '#6bffff',
    white: '#e0e0e0',
    brightBlack: '#3d2a5c',
    brightRed: '#ff8585',
    brightGreen: '#6bff85',
    brightYellow: '#ffe085',
    brightBlue: '#8585ff',
    brightMagenta: '#ff85ff',
    brightCyan: '#85ffff',
    brightWhite: '#ffffff'
};

// 13. Inferno
const infernoTheme = {
    foreground: '#ffcc88',
    background: '#1a0f0a',
    cursor: '#ffcc88',
    cursorAccent: '#1a0f0a',
    selection: 'rgba(255, 204, 136, 0.3)',
    black: '#1a0f0a',
    red: '#ff5555',
    green: '#ff8855',
    yellow: '#ffaa55',
    blue: '#ffcc88',
    magenta: '#ffee88',
    cyan: '#ffff88',
    white: '#ffddaa',
    brightBlack: '#4a2a1a',
    brightRed: '#ff6666',
    brightGreen: '#ff9966',
    brightYellow: '#ffbb66',
    brightBlue: '#ffdd99',
    brightMagenta: '#ffff99',
    brightCyan: '#ffff99',
    brightWhite: '#ffffff'
};

// 14. Night Owl
const nightOwlTheme = {
    foreground: '#bbbbbb',
    background: '#2b3340',
    cursor: '#bbbbbb',
    cursorAccent: '#2b3340',
    selection: 'rgba(187, 187, 187, 0.3)',
    black: '#2b3340',
    red: '#ff6b6b',
    green: '#5abc5a',
    yellow: '#ffcc5a',
    blue: '#5a9bff',
    magenta: '#c586c0',
    cyan: '#5abc9f',
    white: '#bbbbbb',
    brightBlack: '#404a5c',
    brightRed: '#ff6b6b',
    brightGreen: '#5abc5a',
    brightYellow: '#ffcc5a',
    brightBlue: '#5a9bff',
    brightMagenta: '#c586c0',
    brightCyan: '#5abc9f',
    brightWhite: '#ffffff'
};

// 15. Snazzy
const snazzyTheme = {
    foreground: '#f1f1f1',
    background: '#282a36',
    cursor: '#f1f1f1',
    cursorAccent: '#282a36',
    selection: 'rgba(241, 241, 241, 0.3)',
    black: '#282a36',
    red: '#ff5c57',
    green: '#5af78e',
    yellow: '#f3f99d',
    blue: '#57c7ff',
    magenta: '#ff6ac1',
    cyan: '#9aedfe',
    white: '#f1f1f1',
    brightBlack: '#686868',
    brightRed: '#ff5c57',
    brightGreen: '#5af78e',
    brightYellow: '#f3f99d',
    brightBlue: '#57c7ff',
    brightMagenta: '#ff6ac1',
    brightCyan: '#9aedfe',
    brightWhite: '#ffffff'
};

// 16. Lime Dark
const limeDarkTheme = {
    foreground: '#cddaemon',
    background: '#0c0c0c',
    cursor: '#b8d568',
    cursorAccent: '#0c0c0c',
    selection: 'rgba(184, 213, 104, 0.3)',
    black: '#0c0c0c',
    red: '#e06c75',
    green: '#b8d568',
    yellow: '#d19a66',
    blue: '#61afef',
    magenta: '#c678dd',
    cyan: '#56b6c2',
    white: '#ffffff',
    brightBlack: '#3b4048',
    brightRed: '#e06c75',
    brightGreen: '#b8d568',
    brightYellow: '#d19a66',
    brightBlue: '#61afef',
    brightMagenta: '#c678dd',
    brightCyan: '#56b6c2',
    brightWhite: '#ffffff'
};

// 17. Blue Dark
const blueDarkTheme = {
    foreground: '#d6deeb',
    background: '#011627',
    cursor: '#d6deeb',
    cursorAccent: '#011627',
    selection: 'rgba(214, 222, 235, 0.3)',
    black: '#011627',
    red: '#ef5350',
    green: '#22da6e',
    yellow: '#ffeb95',
    blue: '#82b1ff',
    magenta: '#c792ea',
    cyan: '#7fdbca',
    white: '#d6deeb',
    brightBlack: '#163852',
    brightRed: '#ef5350',
    brightGreen: '#22da6e',
    brightYellow: '#ffeb95',
    brightBlue: '#82b1ff',
    brightMagenta: '#c792ea',
    brightCyan: '#7fdbca',
    brightWhite: '#ffffff'
};

// 18. Dark+ (VS Code Default)
const darkPlusTheme = {
    foreground: '#cccccc',
    background: '#000000',
    cursor: '#ffffff',
    cursorAccent: '#000000',
    selection: 'rgba(255, 255, 255, 0.3)',
    black: '#000000',
    red: '#f44336',
    green: '#8bc34a',
    yellow: '#ffeb3b',
    blue: '#2196f3',
    magenta: '#e91e63',
    cyan: '#00bcd4',
    white: '#cccccc',
    brightBlack: '#444444',
    brightRed: '#f44336',
    brightGreen: '#8bc34a',
    brightYellow: '#ffeb3b',
    brightBlue: '#2196f3',
    brightMagenta: '#e91e63',
    brightCyan: '#00bcd4',
    brightWhite: '#ffffff'
};

// 19. Rosé Pine Dawn
const rosePineDawnTheme = {
    foreground: '#57527d',
    background: '#faf4ed',
    cursor: '#57527d',
    cursorAccent: '#faf4ed',
    selection: 'rgba(87, 82, 125, 0.3)',
    black: '#f2e9e1',
    red: '#b4637a',
    green: '#287980',
    yellow: '#ea9d34',
    blue: '#56949f',
    magenta: '#9b788c',
    cyan: '#627980',
    white: '#57527d',
    brightBlack: '#6e6a86',
    brightRed: '#b4637a',
    brightGreen: '#287980',
    brightYellow: '#ea9d34',
    brightBlue: '#56949f',
    brightMagenta: '#9b788c',
    brightCyan: '#627980',
    brightWhite: '#57527d'
};

// 20. Rosé Pine Night
const rosePineNightTheme = {
    foreground: '#e0def4',
    background: '#191724',
    cursor: '#e0def4',
    cursorAccent: '#191724',
    selection: 'rgba(224, 222, 244, 0.3)',
    black: '#26233a',
    red: '#eb6f92',
    green: '#31748f',
    yellow: '#f6c177',
    blue: '#9ccfd8',
    magenta: '#c4a7e7',
    cyan: '#31748f',
    white: '#e0def4',
    brightBlack: '#6e6a86',
    brightRed: '#eb6f92',
    brightGreen: '#31748f',
    brightYellow: '#f6c177',
    brightBlue: '#9ccfd8',
    brightMagenta: '#c4a7e7',
    brightCyan: '#9ccfd8',
    brightWhite: '#e0def4'
};

// 21. Atom One Dark
const atomOneDarkTheme = {
    foreground: '#abb2bf',
    background: '#282c34',
    cursor: '#abb2bf',
    cursorAccent: '#282c34',
    selection: 'rgba(171, 178, 191, 0.3)',
    black: '#282c34',
    red: '#e06c75',
    green: '#98c379',
    yellow: '#d19a66',
    blue: '#61afef',
    magenta: '#c578dd',
    cyan: '#56b6c2',
    white: '#abb2bf',
    brightBlack: '#3b4048',
    brightRed: '#e06c75',
    brightGreen: '#98c379',
    brightYellow: '#d19a66',
    brightBlue: '#61afef',
    brightMagenta: '#c578dd',
    brightCyan: '#56b6c2',
    brightWhite: '#ffffff'
};

// 22. Bluewild
const bluewildTheme = {
    foreground: '#e0e0e0',
    background: '#0a1a2a',
    cursor: '#e0e0e0',
    cursorAccent: '#0a1a2a',
    selection: 'rgba(224, 224, 224, 0.3)',
    black: '#0a1a2a',
    red: '#ff6b8b',
    green: '#6bff8b',
    yellow: '#ffd16b',
    blue: '#6b8bff',
    magenta: '#ff6bff',
    cyan: '#6bffff',
    white: '#e0e0e0',
    brightBlack: '#1a3a5a',
    brightRed: '#ff859f',
    brightGreen: '#8bff9f',
    brightYellow: '#ffe085',
    brightBlue: '#859fff',
    brightMagenta: '#ff85ff',
    brightCyan: '#85ffff',
    brightWhite: '#ffffff'
};
const useThemeStore = create((set) => ({
    themes: {

    },
    theme: draculaTheme,

    // Action to initialize or refresh the current theme based on ConfigStore
    initTheme: () => {
        const configState = useConfigStore.getState();
        const savedThemeName = ThemeConfig.getState().colorTheme || 'Dracula';
        const themesFromConfig = configState.colors || {};

        const allThemes = {};

        // Built-in themes
        allThemes['Dracula'] = draculaTheme;
        allThemes['Gruvbox Dark'] = gruvboxDarkTheme;
        allThemes['Nord'] = nordTheme;
        allThemes['One Dark'] = oneDarkTheme;
        allThemes['Solarized Dark'] = solarizedDarkTheme;
        allThemes['Monokai'] = monokaiTheme;
        allThemes['Ocean Dark'] = oceanDarkTheme;
        allThemes['Material Dark'] = materialDarkTheme;
        allThemes['Catppuccin Mocha'] = catppuccinMochaTheme;
        allThemes['Tokyo Night'] = tokyoNightTheme;
        allThemes['Everforest Dark'] = everforestDarkTheme;
        allThemes['Hubdark'] = hubdarkTheme;
        allThemes['Purple Dark'] = purpleDarkTheme;
        allThemes['Inferno'] = infernoTheme;
        allThemes['Night Owl'] = nightOwlTheme;
        allThemes['Snazzy'] = snazzyTheme;
        allThemes['Lime Dark'] = limeDarkTheme;
        allThemes['Blue Dark'] = blueDarkTheme;
        allThemes['Dark+'] = darkPlusTheme;
        allThemes['Rosé Pine Dawn'] = rosePineDawnTheme;
        allThemes['Rosé Pine Night'] = rosePineNightTheme;
        allThemes['Atom One Dark'] = atomOneDarkTheme;
        allThemes['Bluewild'] = bluewildTheme;

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