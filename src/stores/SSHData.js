import { create } from "zustand";

const useSSHStore = create((set) => ({
    connections: [],
    addConnection: (host, username, password) => set((state) => ({
        connections: [...state.connections, { host, username, password }],
    })),
    removeConnection: (id) => set((state) => ({
        connections: state.connections.filter((_, index) => index !== id),
    })),
}));

export default useSSHStore;
