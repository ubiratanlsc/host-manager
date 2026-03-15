import { writeFile, BaseDirectory } from '@tauri-apps/plugin-fs';
import { create } from "zustand";
import useConfigStore from './ConfigData';
import FontConfig from './FontConfig';
import ThemeConfig from './ThemeConfig';
import TerminalConfig from './TerminalConfig';
import ClipboardConfig from './ClipboardConfig';
import AppVersionConfig from './AppVersionConfig';

/**
 * Persists the entire ConfigStore state to config.json.
 * Monta o objeto configs a partir dos stores componentizados.
 * This is the single source of truth for writing to disk.
 */
const persistConfig = async () => {
    const { customers, groups, tags, colors } = useConfigStore.getState();

    // Montar configs a partir dos stores componentizados
    const themeState = ThemeConfig.getState();
    const fontState = FontConfig.getState();
    const terminalState = TerminalConfig.getState();
    const clipboardState = ClipboardConfig.getState();
    const versionState = AppVersionConfig.getState();

    const configs = {
        // ThemeConfig
        theme: themeState.theme,
        colorTheme: themeState.colorTheme,
        // FontConfig
        font: fontState.font,
        fontSize: fontState.fontSize,
        ligatures: fontState.ligatures,
        // TerminalConfig
        cursorBlink: terminalState.cursorBlink,
        cursorStyle: terminalState.cursorStyle,
        scrollback: terminalState.scrollback,
        lineHeight: terminalState.lineHeight,
        // ClipboardConfig
        pasteRight: clipboardState.pasteRight,
        copyOnSelect: clipboardState.copyOnSelect,
        // AppVersionConfig
        version: versionState.version,
    };

    const dataToSave = {
        customers: [...customers],
        groups: [...groups],
        tags: [...tags],
        configs,
        colors: { ...colors },
    };

    await writeFile(
        'config.json',
        new TextEncoder().encode(JSON.stringify(dataToSave, null, 4)),
        { baseDir: BaseDirectory.Resource }
    );
};

const useSaveData = create(() => ({

    saveHost: async (id, name, host, port, username, password, group, tag) => {
        try {
            const { addCustomer } = useConfigStore.getState();
            addCustomer(id, name, host, port, username, password, group, tag);
            await persistConfig();
            console.log('Host salvo com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar host:', error);
        }
    },

    saveGroup: async (id, name, username, password) => {
        try {
            const { addGroup } = useConfigStore.getState();
            addGroup(id, name, username, password);
            await persistConfig();
            console.log('Grupo salvo com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar grupo:', error);
        }
    },

    saveTag: async (id, name, description, color) => {
        try {
            const { addTag } = useConfigStore.getState();
            addTag(id, name, description, color);
            await persistConfig();
            console.log('Tag salva com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar tag:', error);
        }
    },

    saveConfig: async (key, value) => {
        try {
            const { addConfig } = useConfigStore.getState();
            addConfig(key, value);
            await persistConfig();
            console.log('Configuração salva com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar configuração:', error);
        }
    },

    // Generic: persists current state without modifying it
    // Useful after edit/remove operations done directly on ConfigStore
    persist: async () => {
        try {
            await persistConfig();
            console.log('Dados persistidos com sucesso!');
        } catch (error) {
            console.error('Erro ao persistir dados:', error);
        }
    },

}));
export default useSaveData;
