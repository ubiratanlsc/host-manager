import { remove } from "@tauri-apps/plugin-fs";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { create } from "zustand";
import { removeGroupFromConfig } from "../lib/groupTree";
import { checkConnectivity } from "../lib/connectivity";
import { appendCustomers, toCustomer } from "../lib/customerList";

const samePort = (a, b) => Number(a || 22) === Number(b || 22);

/** Mesmo destino SSH: host + porta + usuário. */
export const isSameHost = (customer, { host, port, username }) => (
    customer.host === host
    && samePort(customer.port, port)
    && (customer.username || '') === (username || '')
);

// Uma verificação de conectividade por vez: reabrir o modal durante uma
// verificação reaproveita a que já está rodando.
let connectivityRun = null;

const useConfigStore = create((set) => ({
    customers: [],
    groups: [],
    tags: [],
    colors: {},
    configs: {},
    externalTools: [],
    addCustomer: (id, name, host, port, username, password, group, tagId, identityFile) => set((state) => ({
        customers: state.customers.some(c => c.id === id || isSameHost(c, { host, port, username }))
            ? state.customers
            : [...state.customers, toCustomer({ id, name, host, port, username, password, group, tagId, identityFile })],
    })),
    // Inserção em lote (importação): um único set, ignorando duplicados de
    // id ou de host + porta + usuário, inclusive dentro do próprio lote.
    addCustomers: (hosts) => set((state) => ({ customers: appendCustomers(state.customers, hosts) })),
    editCustomer: (id, updatedData) => set((state) => ({
        customers: state.customers.map(customer => customer.id === id ? { ...customer, ...updatedData } : customer),
    })),
    removeCustomer: (id) => set((state) => ({
        customers: state.customers.filter(customer => customer.id !== id),
    })),
    addGroup: (id, name, username, password, parentId) => set((state) => ({
        groups: state.groups.some(g => g.id === id)
            ? state.groups
            : [...state.groups, { id, name, username, password, ...(parentId ? { parentId } : {}) }],
    })),
    addGroups: (newGroups) => set((state) => ({
        groups: [...state.groups, ...newGroups.filter(g => !state.groups.some(existing => existing.id === g.id))],
    })),
    editGroup: (id, updatedData) => set((state) => ({
        groups: state.groups.map(group => group.id === id ? { ...group, ...updatedData } : group),
    })),
    // Remove também os subgrupos; hosts que estavam neles ficam "Sem grupo".
    removeGroup: (id) => set((state) => removeGroupFromConfig(state, id)),
    addTag: (id, name, description, color) => set((state) => ({
        tags: state.tags.some(t => t.id === id)
            ? state.tags
            : [...state.tags, { id, name, description, color }],
    })),
    editTag: (id, updatedData) => set((state) => ({
        tags: state.tags.map(tag => tag.id === id ? { ...tag, ...updatedData } : tag),
    })),
    removeTag: (id) => set((state) => ({
        tags: state.tags.filter(tag => tag.id !== id),
    })),
    addConfig: (key, value) => set((state) => ({
        configs: { ...state.configs, [key]: value },
    })),
    addTool: (tool) => set((state) => ({
        externalTools: [...state.externalTools, tool],
    })),
    editTool: (id, updatedData) => set((state) => ({
        externalTools: state.externalTools.map(t => t.id === id ? { ...t, ...updatedData } : t),
    })),
    removeTool: (id) => set((state) => ({
        externalTools: state.externalTools.filter(t => t.id !== id),
    })),
    addColors: (id, obj) => set((state) => ({
        colors: { ...state.colors, [id]: { id: id, name: obj?.name, colors: obj?.colors } },
    })),
    setInitialData: (data) => set(() => ({
        // Versões antigas gravavam `status` no host; hoje ele vive em hostStatus.
        customers: (data.customers || []).map(({ status: _status, ...customer }) => customer),
        groups: data.groups || [],
        tags: data.tags || [],
        colors: data.colors || {},
        configs: data.configs || {},
        externalTools: data.externalTools || [],
    })),
    // Status de conectividade por id de host. Fica fora de `customers` para
    // não re-renderizar tudo que depende da lista nem ir para o config.json.
    hostStatus: {},
    checkAllConnectivity: () => {
        if (!isTauri()) return Promise.resolve();
        if (connectivityRun) return connectivityRun;
        connectivityRun = checkConnectivity(
            useConfigStore.getState().customers,
            (host, port) => invoke('check_host_connectivity', { host, port }),
            { onResults: (patch) => set((state) => ({ hostStatus: { ...state.hostStatus, ...patch } })) },
        ).finally(() => { connectivityRun = null; });
        return connectivityRun;
    },
}));

export default useConfigStore;
