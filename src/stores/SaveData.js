import { mkdir, writeFile, readFile, BaseDirectory } from '@tauri-apps/plugin-fs';
import { create } from "zustand";
import useConfigStore from './ConfigData';
import useAppStore from './useAppStore';
import FontConfig from './FontConfig';
import ThemeConfig from './ThemeConfig';
import TerminalConfig from './TerminalConfig';
import ClipboardConfig from './ClipboardConfig';
import { writeConfigFile } from '../lib/configStorage';
import { cloneGroup } from '../lib/groupTree';
import { v4 as uuidv4 } from 'uuid';

/**
 * Persists the entire ConfigStore state to config.json.
 * Monta o objeto configs a partir dos stores componentizados.
 * This is the single source of truth for writing to disk.
 */
const persistConfig = async () => {
    const { customers, groups, tags, colors, externalTools } = useConfigStore.getState();

    // Montar configs a partir dos stores componentizados
    const themeState = ThemeConfig.getState();
    const fontState = FontConfig.getState();
    const terminalState = TerminalConfig.getState();
    const clipboardState = ClipboardConfig.getState();
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
        // TerminalConfig
        defaultShell: terminalState.defaultShell,
        // ClipboardConfig
        pasteRight: clipboardState.pasteRight,
        copyOnSelect: clipboardState.copyOnSelect,
        mode: clipboardState.mode,
    };

    const dataToSave = {
        customers: [...customers],
        groups: [...groups],
        tags: [...tags],
        configs,
        colors: { ...colors },
        externalTools: [...externalTools],
    };

    await writeConfigFile(
        { mkdir, writeFile },
        BaseDirectory.AppData,
        dataToSave,
    );
};

const useSaveData = create(() => ({

    updateHost: async (id, data) => {
        try {
            const { editCustomer } = useConfigStore.getState();
            editCustomer(id, data);
            await persistConfig();
            useAppStore.getState().addNotification({ type: 'success', title: 'Host atualizado', message: `${data.name || 'Host'} foi atualizado com sucesso.` });
        } catch (error) {
            useAppStore.getState().addNotification({ type: 'error', title: 'Erro ao atualizar host', message: error.message || error });
        }
    },

    saveHost: async (id, name, host, port, username, password, group, tag, identityFile) => {
        try {
            const { addCustomer } = useConfigStore.getState();
            addCustomer(id, name, host, port, username, password, group, tag, identityFile);
            await persistConfig();
            useAppStore.getState().addNotification({ type: 'success', title: 'Host salvo', message: `${name} foi adicionado com sucesso.` });
        } catch (error) {
            useAppStore.getState().addNotification({ type: 'error', title: 'Erro ao salvar host', message: error.message || error });
        }
    },

    saveGroup: async (id, name, username, password, parentId) => {
        try {
            const { addGroup } = useConfigStore.getState();
            addGroup(id, name, username, password, parentId);
            await persistConfig();
            useAppStore.getState().addNotification({ type: 'success', title: 'Grupo salvo', message: `${name} foi salvo com sucesso.` });
        } catch (error) {
            useAppStore.getState().addNotification({ type: 'error', title: 'Erro ao salvar grupo', message: error.message || error });
        }
    },

    updateGroup: async (id, data) => {
        try {
            useConfigStore.getState().editGroup(id, data);
            await persistConfig();
            useAppStore.getState().addNotification({ type: 'success', title: 'Grupo atualizado', message: `${data.name || 'Grupo'} foi atualizado com sucesso.` });
        } catch (error) {
            useAppStore.getState().addNotification({ type: 'error', title: 'Erro ao atualizar grupo', message: error.message || error });
        }
    },

    // Duplica um grupo (com os subgrupos, se pedido) ou um subgrupo. Hosts não
    // são copiados. Para subgrupos, `parentIds` cria uma cópia em cada cliente.
    cloneGroup: async (id, { parentIds, ...options } = {}) => {
        try {
            const groups = useConfigStore.getState().groups;
            const targets = parentIds?.length ? parentIds : [options.parentId];
            const created = targets.flatMap((parentId) => cloneGroup(groups, id, { ...options, parentId, createId: uuidv4 }));
            if (created.length === 0) return [];
            useConfigStore.getState().addGroups(created);
            await persistConfig();
            useAppStore.getState().addNotification({
                type: 'success',
                title: 'Grupo duplicado',
                message: `${created.length} grupo${created.length === 1 ? '' : 's'} criado${created.length === 1 ? '' : 's'}.`,
            });
            return created;
        } catch (error) {
            useAppStore.getState().addNotification({ type: 'error', title: 'Erro ao duplicar grupo', message: error.message || error });
            return [];
        }
    },

    deleteGroup: async (id) => {
        try {
            useConfigStore.getState().removeGroup(id);
            await persistConfig();
            useAppStore.getState().addNotification({ type: 'success', title: 'Grupo excluído', message: 'O grupo foi excluído.' });
        } catch (error) {
            useAppStore.getState().addNotification({ type: 'error', title: 'Erro ao excluir grupo', message: error.message || error });
        }
    },

    // Adiciona vários hosts e persiste uma única vez. Retorna quantos entraram
    // (duplicados de host + porta + usuário são ignorados pelo addCustomer).
    importHosts: async (hosts) => {
        try {
            const store = useConfigStore.getState();
            const before = store.customers.length;
            hosts.forEach((h) => store.addCustomer(h.id, h.name, h.host, h.port, h.username, h.password, h.group, h.tagId, h.identityFile));
            const added = useConfigStore.getState().customers.length - before;
            await persistConfig();
            useAppStore.getState().addNotification({ type: 'success', title: 'Hosts importados', message: `${added} host${added === 1 ? '' : 's'} importado${added === 1 ? '' : 's'}.` });
            return added;
        } catch (error) {
            useAppStore.getState().addNotification({ type: 'error', title: 'Erro ao importar hosts', message: error.message || error });
            return 0;
        }
    },

    saveTag: async (id, name, description, color) => {
        try {
            const { addTag } = useConfigStore.getState();
            addTag(id, name, description, color);
            await persistConfig();
            useAppStore.getState().addNotification({ type: 'success', title: 'Tag salva', message: `${name} foi salva com sucesso.` });
        } catch (error) {
            useAppStore.getState().addNotification({ type: 'error', title: 'Erro ao salvar tag', message: error.message || error });
        }
    },

    saveConfig: async (key, value) => {
        try {
            const { addConfig } = useConfigStore.getState();
            addConfig(key, value);
            await persistConfig();
            useAppStore.getState().addNotification({ type: 'success', title: 'Configuração salva', message: `Configuração ${key} atualizada.` });
        } catch (error) {
            useAppStore.getState().addNotification({ type: 'error', title: 'Erro ao salvar configuração', message: error.message || error });
        }
    },

    // Generic: persists current state without modifying it
    // Useful after edit/remove operations done directly on ConfigStore
    persist: async () => {
        try {
            await persistConfig();
            useAppStore.getState().addNotification({ type: 'success', title: 'Dados salvos', message: 'Configurações persistidas com sucesso.' });
        } catch (error) {
            useAppStore.getState().addNotification({ type: 'error', title: 'Erro ao persistir', message: error.message || error });
        }
    },

    getFullConfig: () => {
        const { customers, groups, tags, colors, externalTools } = useConfigStore.getState();
        const themeState = ThemeConfig.getState();
        const fontState = FontConfig.getState();
        const terminalState = TerminalConfig.getState();
        const clipboardState = ClipboardConfig.getState();

        return {
            customers: [...customers],
            groups: [...groups],
            tags: [...tags],
            colors: { ...colors },
            externalTools: [...externalTools],
            configs: {
                theme: themeState.theme,
                colorTheme: themeState.colorTheme,
                font: fontState.font,
                fontSize: fontState.fontSize,
                ligatures: fontState.ligatures,
                cursorBlink: terminalState.cursorBlink,
                cursorStyle: terminalState.cursorStyle,
                scrollback: terminalState.scrollback,
                lineHeight: terminalState.lineHeight,
                defaultShell: terminalState.defaultShell,
                pasteRight: clipboardState.pasteRight,
                copyOnSelect: clipboardState.copyOnSelect,
                mode: clipboardState.mode,
            },
        };
    },

    exportConfig: async (filePath) => {
        try {
            const fullConfig = useSaveData.getState().getFullConfig();
            await writeFile(
                filePath,
                new TextEncoder().encode(JSON.stringify(fullConfig, null, 4)),
            );
            useAppStore.getState().addNotification({ type: 'success', title: 'Exportado', message: `Configurações exportadas para ${filePath}` });
        } catch (error) {
            useAppStore.getState().addNotification({ type: 'error', title: 'Erro ao exportar', message: error.message || error });
        }
    },

    importConfig: async (filePath) => {
        try {
            const file = await readFile(filePath);
            const contents = new TextDecoder().decode(file);
            const data = JSON.parse(contents);

            const { setInitialData } = useConfigStore.getState();
            setInitialData(data);

            const configs = data.configs || {};
            if (configs.theme) ThemeConfig.getState().setTheme(configs.theme);
            if (configs.colorTheme) ThemeConfig.getState().setColorTheme(configs.colorTheme);
            if (configs.font) FontConfig.setState({ font: configs.font });
            if (configs.fontSize) FontConfig.getState().setFontSize(configs.fontSize);
            if (configs.ligatures !== undefined) FontConfig.getState().setLigatures(configs.ligatures);
            if (configs.cursorBlink !== undefined) TerminalConfig.getState().setCursorBlink(configs.cursorBlink);
            if (configs.cursorStyle) TerminalConfig.getState().setCursorStyle(configs.cursorStyle);
            if (configs.scrollback) TerminalConfig.getState().setScrollback(configs.scrollback);
            if (configs.lineHeight) TerminalConfig.getState().setLineHeight(configs.lineHeight);
            if (configs.pasteRight !== undefined) ClipboardConfig.getState().setPasteRight(configs.pasteRight);
            if (configs.copyOnSelect !== undefined) ClipboardConfig.getState().setCopyOnSelect(configs.copyOnSelect);
            if (configs.mode) ClipboardConfig.getState().setMode(configs.mode);

            await persistConfig();
            useAppStore.getState().addNotification({ type: 'success', title: 'Importado', message: 'Dados importados com sucesso.' });
        } catch (error) {
            useAppStore.getState().addNotification({ type: 'error', title: 'Erro ao importar', message: error.message || error });
        }
    },

}));
export default useSaveData;
