import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

/**
 * Host Store - Gerencia hosts, grupos e tags
 * 
 * Estado:
 * - hosts: Array de hosts
 * - groups: Array de grupos
 * - tags: Array de tags
 * - selectedHost: Host selecionado atualmente
 * 
 * Ações:
 * - CRUD de hosts
 * - CRUD de grupos
 * - CRUD de tags
 * - Filtragem e busca
 */

const useHostStore = create(
    devtools(
        persist(
            (set, get) => ({
                // Estado
                hosts: [],
                groups: [],
                tags: [],
                selectedHost: null,
                searchQuery: '',
                filterByGroup: null,
                filterByTag: null,

                // ========== HOSTS ==========
                addHost: (host) => {
                    set((state) => ({
                        hosts: [...state.hosts, {
                            id: crypto.randomUUID(),
                            ...host,
                            createdAt: new Date().toISOString(),
                        }],
                    }));
                },

                updateHost: (id, updates) => {
                    set((state) => ({
                        hosts: state.hosts.map(h =>
                            h.id === id ? { ...h, ...updates, updatedAt: new Date().toISOString() } : h
                        ),
                    }));
                },

                removeHost: (id) => {
                    set((state) => ({
                        hosts: state.hosts.filter(h => h.id !== id),
                        selectedHost: state.selectedHost?.id === id ? null : state.selectedHost,
                    }));
                },

                setSelectedHost: (host) => {
                    set({ selectedHost: host });
                },

                // ========== GROUPS ==========
                addGroup: (group) => {
                    set((state) => ({
                        groups: [...state.groups, {
                            id: crypto.randomUUID(),
                            ...group,
                            hostIds: group.hostIds || [],
                            createdAt: new Date().toISOString(),
                        }],
                    }));
                },

                updateGroup: (id, updates) => {
                    set((state) => ({
                        groups: state.groups.map(g =>
                            g.id === id ? { ...g, ...updates } : g
                        ),
                    }));
                },

                removeGroup: (id) => {
                    set((state) => ({
                        groups: state.groups.filter(g => g.id !== id),
                        filterByGroup: state.filterByGroup === id ? null : state.filterByGroup,
                    }));
                },

                addHostToGroup: (groupId, hostId) => {
                    set((state) => ({
                        groups: state.groups.map(g =>
                            g.id === groupId
                                ? { ...g, hostIds: [...new Set([...g.hostIds, hostId])] }
                                : g
                        ),
                    }));
                },

                removeHostFromGroup: (groupId, hostId) => {
                    set((state) => ({
                        groups: state.groups.map(g =>
                            g.id === groupId
                                ? { ...g, hostIds: g.hostIds.filter(id => id !== hostId) }
                                : g
                        ),
                    }));
                },

                // ========== TAGS ==========
                addTag: (tag) => {
                    set((state) => ({
                        tags: [...state.tags, {
                            id: crypto.randomUUID(),
                            ...tag,
                            createdAt: new Date().toISOString(),
                        }],
                    }));
                },

                updateTag: (id, updates) => {
                    set((state) => ({
                        tags: state.tags.map(t =>
                            t.id === id ? { ...t, ...updates } : t
                        ),
                    }));
                },

                removeTag: (id) => {
                    set((state) => ({
                        tags: state.tags.filter(t => t.id !== id),
                        filterByTag: state.filterByTag === id ? null : state.filterByTag,
                    }));
                },

                // ========== FILTERS & SEARCH ==========
                setSearchQuery: (query) => {
                    set({ searchQuery: query });
                },

                setFilterByGroup: (groupId) => {
                    set({ filterByGroup: groupId });
                },

                setFilterByTag: (tagId) => {
                    set({ filterByTag: tagId });
                },

                clearFilters: () => {
                    set({
                        searchQuery: '',
                        filterByGroup: null,
                        filterByTag: null,
                    });
                },

                // ========== GETTERS ==========
                getFilteredHosts: () => {
                    const state = get();
                    let filtered = state.hosts;

                    // Busca por texto
                    if (state.searchQuery) {
                        const query = state.searchQuery.toLowerCase();
                        filtered = filtered.filter(h =>
                            h.name?.toLowerCase().includes(query) ||
                            h.ip?.toLowerCase().includes(query)
                        );
                    }

                    // Filtro por grupo
                    if (state.filterByGroup) {
                        const group = state.groups.find(g => g.id === state.filterByGroup);
                        if (group) {
                            filtered = filtered.filter(h => group.hostIds.includes(h.id));
                        }
                    }

                    // Filtro por tag
                    if (state.filterByTag) {
                        filtered = filtered.filter(h =>
                            h.tagIds?.includes(state.filterByTag)
                        );
                    }

                    return filtered;
                },

                getHostsByGroup: (groupId) => {
                    const state = get();
                    const group = state.groups.find(g => g.id === groupId);
                    if (!group) return [];
                    return state.hosts.filter(h => group.hostIds.includes(h.id));
                },

                getHostsByTag: (tagId) => {
                    return get().hosts.filter(h => h.tagIds?.includes(tagId));
                },

                // ========== UTILS ==========
                clear: () => {
                    set({
                        hosts: [],
                        groups: [],
                        tags: [],
                        selectedHost: null,
                        searchQuery: '',
                        filterByGroup: null,
                        filterByTag: null,
                    });
                },
            }),
            {
                name: 'host-storage', // Nome da chave no localStorage
                partialize: (state) => ({
                    // Apenas persistir hosts, groups e tags
                    hosts: state.hosts,
                    groups: state.groups,
                    tags: state.tags,
                }),
            }
        ),
        { name: 'HostStore' }
    )
);

export default useHostStore;
