import { remove } from "@tauri-apps/plugin-fs";
import { create } from "zustand";

const useConfigStore = create((set) => ({
    customers: [],
    groups: [],
    tags: [],
    colors: {},
    configs: {},
    addCustomer: (id, name, host, port, username, password, group, tagId, identityFile) => set((state) => ({
        customers: state.customers.some(c => c.id === id) 
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
    addColors: (id, obj) => set((state) => ({
        colors: { ...state.colors, [id]: { id: id, name: obj?.name, colors: obj?.colors } },
    })),
    setInitialData: (data) => set(() => ({
        customers: data.customers || [],
        groups: data.groups || [],
        tags: data.tags || [],
        colors: data.colors || {},
        configs: data.configs || {}
    }))
}));

export default useConfigStore;
