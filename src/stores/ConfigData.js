import { remove } from "@tauri-apps/plugin-fs";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { create } from "zustand";

const useConfigStore = create((set) => ({
    customers: [],
    groups: [],
    tags: [],
    colors: {},
    configs: {},
    externalTools: [],
    addCustomer: (id, name, host, port, username, password, group, tagId, identityFile) => set((state) => ({
        customers: state.customers.some(c => c.id === id || c.host === host)
            ? state.customers
            : [...state.customers, { id, name, host, port, username, password, groups: group ? [group] : [], tagId, identityFile }],
    })),
    editCustomer: (id, updatedData) => set((state) => ({
        customers: state.customers.map(customer => customer.id === id ? { ...customer, ...updatedData } : customer),
    })),
    removeCustomer: (id) => set((state) => ({
        customers: state.customers.filter(customer => customer.id !== id),
    })),
    addGroup: (id, name, username, password) => set((state) => ({
        groups: state.groups.some(g => g.id === id)
            ? state.groups
            : [...state.groups, { id, name, username, password }],
    })),
    editGroup: (id, updatedData) => set((state) => ({
        groups: state.groups.map(group => group.id === id ? { ...group, ...updatedData } : group),
    })),
    removeGroup: (id) => set((state) => ({
        groups: state.groups.filter(group => group.id !== id),
    })),
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
        customers: data.customers || [],
        groups: data.groups || [],
        tags: data.tags || [],
        colors: data.colors || {},
        configs: data.configs || {},
        externalTools: data.externalTools || [],
    })),
    updateCustomerStatus: (id, status) => set((state) => ({
        customers: state.customers.map(c => c.id === id ? { ...c, status } : c),
    })),
    checkAllConnectivity: async () => {
        if (!isTauri()) return;
        const customers = useConfigStore.getState().customers;
        await Promise.all(customers.map(async (c) => {
            try {
                const online = await invoke('check_host_connectivity', { host: c.host, port: c.port || 22 });
                useConfigStore.getState().updateCustomerStatus(c.id, online ? 'online' : 'offline');
            } catch {
                useConfigStore.getState().updateCustomerStatus(c.id, 'unknown');
            }
        }));
    }
}));

export default useConfigStore;
