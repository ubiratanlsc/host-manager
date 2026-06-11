/**
 * Persistence Utilities - Save/Load data using Tauri FS Plugin
 * 
 * Funções para persistir dados localmente usando Tauri FS API
 */

import { BaseDirectory, create, exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';

const DATA_FILE = 'host-manager-data.json';

/**
 * Salva dados no arquivo local
 * @param {Object} data - Dados para salvar
 * @returns {Promise<boolean>} - True se salvou com sucesso
 */
export async function saveData(data) {
    try {
        const jsonData = JSON.stringify(data, null, 2);

        await writeTextFile(DATA_FILE, jsonData, {
            baseDir: BaseDirectory.AppData,
        });

        return true;
    } catch (error) {
        console.error('❌ Erro ao salvar dados:', error);
        return false;
    }
}

/**
 * Carrega dados do arquivo local
 * @returns {Promise<Object|null>} - Dados carregados ou null se não existir
 */
export async function loadData() {
    try {
        const fileExists = await exists(DATA_FILE, {
            baseDir: BaseDirectory.AppData,
        });

        if (!fileExists) {
            return null;
        }

        const jsonData = await readTextFile(DATA_FILE, {
            baseDir: BaseDirectory.AppData,
        });

        const data = JSON.parse(jsonData);
        return data;
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        return null;
    }
}

/**
 * Salva apenas hosts
 * @param {Array} hosts - Array de hosts
 */
export async function saveHosts(hosts) {
    const currentData = await loadData() || {};
    return saveData({
        ...currentData,
        hosts,
        updatedAt: new Date().toISOString(),
    });
}

/**
 * Salva apenas grupos
 * @param {Array} groups - Array de grupos
 */
export async function saveGroups(groups) {
    const currentData = await loadData() || {};
    return saveData({
        ...currentData,
        groups,
        updatedAt: new Date().toISOString(),
    });
}

/**
 * Salva apenas tags
 * @param {Array} tags - Array de tags
 */
export async function saveTags(tags) {
    const currentData = await loadData() || {};
    return saveData({
        ...currentData,
        tags,
        updatedAt: new Date().toISOString(),
    });
}

/**
 * Cria backup dos dados atuais
 * @returns {Promise<boolean>}
 */
export async function createBackup() {
    try {
        const data = await loadData();
        if (!data) return false;

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = `host-manager-backup-${timestamp}.json`;

        await writeTextFile(backupFile, JSON.stringify(data, null, 2), {
            baseDir: BaseDirectory.AppData,
        });

        return true;
    } catch (error) {
        console.error('❌ Erro ao criar backup:', error);
        return false;
    }
}

/**
 * Exporta dados para um arquivo escolhido pelo usuário
 * @param {Object} data - Dados para exportar
 * @param {string} filename - Nome do arquivo
 */
export async function exportData(data, filename = 'export.json') {
    try {
        const jsonData = JSON.stringify(data, null, 2);

        // Tauri FS plugin - salvar em Desktop por padrão
        await writeTextFile(filename, jsonData, {
            baseDir: BaseDirectory.Desktop,
        });

        return true;
    } catch (error) {
        console.error('❌ Erro ao exportar dados:', error);
        return false;
    }
}

/**
 * Importa dados de um arquivo
 * @param {string} filename - Nome do arquivo para importar
 */
export async function importData(filename) {
    try {
        const jsonData = await readTextFile(filename, {
            baseDir: BaseDirectory.Desktop,
        });

        const data = JSON.parse(jsonData);
        return data;
    } catch (error) {
        console.error('❌ Erro ao importar dados:', error);
        return null;
    }
}

/**
 * Valida estrutura de dados
 * @param {Object} data - Dados para validar
 * @returns {boolean} - True se válido
 */
export function validateData(data) {
    if (!data || typeof data !== 'object') return false;

    // Validar que arrays são realmente arrays
    if (data.hosts && !Array.isArray(data.hosts)) return false;
    if (data.groups && !Array.isArray(data.groups)) return false;
    if (data.tags && !Array.isArray(data.tags)) return false;

    // Validar estrutura básica de host
    if (data.hosts) {
        for (const host of data.hosts) {
            if (!host.id || !host.name) return false;
        }
    }

    return true;
}

/**
 * Auto-save helper - debounced save
 */
let saveTimeout = null;
export function autoSave(data, delay = 1000) {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }

    saveTimeout = setTimeout(() => {
        saveData(data);
    }, delay);
}
