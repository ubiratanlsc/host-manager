import { readFile, BaseDirectory } from '@tauri-apps/plugin-fs';
import { isTauri } from '@tauri-apps/api/core';
import { create } from "zustand";
import useConfigStore from './ConfigData';
import useSaveData from './SaveData';
import useAppStore from './useAppStore';
import FontConfig from './FontConfig';
import ThemeConfig from './ThemeConfig';
import TerminalConfig from './TerminalConfig';
import ClipboardConfig from './ClipboardConfig';
import AppVersionConfig from './AppVersionConfig';

const useLoadData = create((set) => ({
    loadData: async () => {
        if (!isTauri()) {
            return;
        }
        try {
            const file = await readFile('config.json', {
                baseDir: BaseDirectory.Resource,
            });
            const contents = new TextDecoder().decode(file);
            const data = JSON.parse(contents);

            // Carregar dados de entidades no ConfigStore
            const { setInitialData } = useConfigStore.getState();
            setInitialData(data);

            // Distribuir configs nos stores componentizados
            const configs = data.configs || {};

            // ThemeConfig
            if (configs.theme) ThemeConfig.getState().setTheme(configs.theme);
            if (configs.colorTheme) ThemeConfig.getState().setColorTheme(configs.colorTheme);

            // FontConfig
            if (configs.font) FontConfig.setState({ font: configs.font });
            if (configs.fontSize) FontConfig.getState().setFontSize(configs.fontSize);
            if (configs.ligatures !== undefined) FontConfig.getState().setLigatures(configs.ligatures);

            // TerminalConfig
            if (configs.cursorBlink !== undefined) TerminalConfig.getState().setCursorBlink(configs.cursorBlink);
            if (configs.cursorStyle) TerminalConfig.getState().setCursorStyle(configs.cursorStyle);
            if (configs.scrollback) TerminalConfig.getState().setScrollback(configs.scrollback);
            if (configs.lineHeight) TerminalConfig.getState().setLineHeight(configs.lineHeight);

            // ClipboardConfig
            if (configs.pasteRight !== undefined) ClipboardConfig.getState().setPasteRight(configs.pasteRight);
            if (configs.copyOnSelect !== undefined) ClipboardConfig.getState().setCopyOnSelect(configs.copyOnSelect);

            // AppVersionConfig
            if (configs.version) AppVersionConfig.getState().setVersion(configs.version);
        } catch (error) {
            useAppStore.getState().addNotification({ type: 'info', title: 'Configuração inicial', message: 'Arquivo de configuração não encontrado. Criando com valores padrão.' });
            const { persist } = useSaveData.getState();
            await persist();
        }
    },
    initLoadData: () => {
        const { loadData } = useLoadData.getState();
        const { loadFonts } = FontConfig.getState();
        loadFonts();
        loadData();
    }
}));
export default useLoadData;
