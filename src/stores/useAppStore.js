import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

/**
 * App Store - Estado global da aplicação
 * 
 * Estado:
 * - theme: Tema da aplicação (light/dark)
 * - sidebarOpen: Estado da sidebar
 * - activeView: View ativa (hosts/terminals/settings)
 * - notifications: Notificações
 */

const useAppStore = create(
    devtools(
        persist(
            (set, get) => ({
                // Estado
                theme: 'dark',
                sidebarOpen: true,
                sidebarWidth: 280,
                activeView: 'hosts', // hosts, terminals, settings
                notifications: [],
                settings: {
                    autoConnect: false,
                    savePasswords: true,
                    terminalFontSize: 14,
                    terminalTheme: 'default',
                },

                // ========== THEME ==========
                setTheme: (theme) => {
                    set({ theme });
                },

                toggleTheme: () => {
                    set((state) => ({
                        theme: state.theme === 'dark' ? 'light' : 'dark',
                    }));
                },

                // ========== SIDEBAR ==========
                toggleSidebar: () => {
                    set((state) => ({
                        sidebarOpen: !state.sidebarOpen,
                    }));
                },

                setSidebarOpen: (open) => {
                    set({ sidebarOpen: open });
                },

                setSidebarWidth: (width) => {
                    set({ sidebarWidth: width });
                },

                // ========== NAVIGATION ==========
                setActiveView: (view) => {
                    set({ activeView: view });
                },

                // ========== NOTIFICATIONS ==========
                addNotification: (notification) => {
                    set((state) => ({
                        notifications: [
                            ...state.notifications,
                            {
                                id: crypto.randomUUID(),
                                ...notification,
                                timestamp: new Date().toISOString(),
                            },
                        ],
                    }));
                },

                removeNotification: (id) => {
                    set((state) => ({
                        notifications: state.notifications.filter(n => n.id !== id),
                    }));
                },

                clearNotifications: () => {
                    set({ notifications: [] });
                },

                // ========== SETTINGS ==========
                updateSettings: (updates) => {
                    set((state) => ({
                        settings: {
                            ...state.settings,
                            ...updates,
                        },
                    }));
                },

                resetSettings: () => {
                    set({
                        settings: {
                            autoConnect: false,
                            savePasswords: true,
                            terminalFontSize: 14,
                            terminalTheme: 'default',
                        },
                    });
                },

                // ========== UTILS ==========
                reset: () => {
                    set({
                        theme: 'dark',
                        sidebarOpen: true,
                        sidebarWidth: 280,
                        activeView: 'hosts',
                        notifications: [],
                    });
                },
            }),
            {
                name: 'app-storage',
                partialize: (state) => ({
                    theme: state.theme,
                    sidebarOpen: state.sidebarOpen,
                    sidebarWidth: state.sidebarWidth,
                    settings: state.settings,
                }),
            }
        ),
        { name: 'AppStore' }
    )
);

export default useAppStore;
