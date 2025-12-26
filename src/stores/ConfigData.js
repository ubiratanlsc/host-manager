import { remove } from "@tauri-apps/plugin-fs";
import { create } from "zustand";

const useConfigStore = create((set) => ({
    customers: [],
    groups: [],
    tags: [],
    configs: {
        theme: "dark",
        font: "Roboto",
        ligatures: true,
    },
    colors: {},
    addCustomer: (id, name, host, port, username, password, group, tagId) => set((state) => ({
        customers: [...state.customers, { id: id, name: name, host: host, port: port, username: username, password: password, groups: [group], tagId: tagId }],
    })),
    editCustomer: (id, updatedData) => set((state) => ({
        customers: state.customers.map(customer => customer.id === id ? { ...customer, ...updatedData } : customer),
    })),
    removeCustomer: (id) => set((state) => ({
        customers: state.customers.filter(customer => customer.id !== id),
    })),
    addGroup: (id, name, username, password) => set((state) => ({
        groups: [...state.groups, { id: id, name: name, username: username, password: password }],
    })),
    editGroup: (id, updatedData) => set((state) => ({
        groups: state.groups.map(group => group.id === id ? { ...group, ...updatedData } : group),
    })),
    removeGroup: (id) => set((state) => ({
        groups: state.groups.filter(group => group.id !== id),
    })),
    addTag: (id, name, description, color) => set((state) => ({
        tags: [...state.tags, { id: id, name: name, description: description, color: color }],
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
    }))
}));

export default useConfigStore;
