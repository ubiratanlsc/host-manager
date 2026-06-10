import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

// Constants
const PTY_SPAWN_EVENT = 'EVENTS:PTY:SPAWN';
const PTY_STDOUT_EVENT = 'EVENTS:PTY:STDOUT';
const PTY_EXIT_EVENT = 'EVENTS:PTY:EXIT';
const GET_SYSTEM_SHELLS_COMMAND = 'get_system_shells';
const PTY_SPAWN_COMMAND = 'spawn_pty';
const PTY_STDIN_COMMAND = 'write_pty';
const PTY_RESIZE_COMMAND = 'resize_pty';
const PTY_KILL_COMMAND = 'kill_pty';
const PTY_KILL_ALL_COMMAND = 'kill_all_ptys';
const LIST_PTYS_COMMAND = 'list_ptys';

/**
 * Terminal Store - Gerencia terminais PTY locais com Xterm.js
 * 
 * Estado:
 * - terminals: Map de terminais ativos com instâncias xterm
 * - shells: Array de shells disponíveis no sistema
 * - focusedTerminal: ID do terminal em foco
 * - listeners: Unlisteners dos eventos Tauri
 * 
 * Ações:
 * - initializeListeners: Configura listeners de eventos Tauri
 * - loadSystemShells: Carrega shells do sistema
 * - spawnPty: Cria novo terminal PTY
 * - writePty: Escreve dados no PTY
 * - resizePty: Redimensiona PTY
 * - killPty: Mata processo PTY
 */

const useTerminalStore = create(
    devtools(
        (set, get) => ({
            // ========== ESTADO ==========
            terminals: new Map(),
            shells: [],
            focusedTerminal: null,
            listeners: null,
            isInitialized: false,
            serializedContent: new Map(), // Armazena conteúdo serializado temporariamente
            pendingStdout: new Map(),
            recentlyClosed: new Map(),
            attachedTerminals: new Map(),

            // ========== INICIALIZAÇÃO ==========

            /**
             * Carrega shells disponíveis no sistema
             */
            loadSystemShells: async () => {
                try {
                    if (!isTauri()) {
                        const shells = [
                            { name: 'Web', command: 'web', args: [] },
                            { name: 'PowerShell', command: 'powershell.exe', args: [] },
                        ];
                        set({ shells });
                        return shells;
                    }
                    const shells = await invoke(GET_SYSTEM_SHELLS_COMMAND, {});
                    set({ shells });
                    console.log('shells', shells);

                    return shells;
                } catch (error) {
                    console.error('[TerminalStore] Failed to load system shells:', error);
                    return [];
                }
            },

            /**
             * Inicializa listeners de eventos Tauri
             */
            initializeListeners: async () => {
                const state = get();

                // Evitar múltiplas inicializações
                if (state.isInitialized) {
                    console.warn('[TerminalStore] Listeners already initialized');
                    return;
                }

                try {
                    if (!isTauri()) {
                        set({
                            listeners: null,
                            isInitialized: true,
                        });
                        return;
                    }
                    // Listener para spawn de terminal
                    const spawnListener = await listen(PTY_SPAWN_EVENT, ({ payload }) => {
                        const { id, shell } = payload;

                        // Adicionar terminal ao estado
                        set((state) => {
                            const newTerminals = new Map(state.terminals);
                            newTerminals.set(id, {
                                id,
                                shell,
                                title: shell.name,
                                isOpen: true,
                                createdAt: new Date().toISOString(),
                            });

                            const newRecentlyClosed = new Map(state.recentlyClosed);
                            newRecentlyClosed.delete(id);

                            return {
                                terminals: newTerminals,
                                focusedTerminal: id,
                                recentlyClosed: newRecentlyClosed,
                            };
                        });
                    });

                    // Listener para stdout do terminal
                    const stdoutListener = await listen(PTY_STDOUT_EVENT, ({ payload }) => {
                        const { id, bytes } = payload;
                        const state = get();
                        const closedAt = state.recentlyClosed.get(id);
                        if (typeof closedAt === 'number' && Date.now() - closedAt < 5000) {
                            return;
                        }

                        const attachedCount = state.attachedTerminals.get(id) || 0;
                        if (attachedCount > 0) {
                            window.dispatchEvent(new CustomEvent('pty:stdout', { detail: { id, bytes } }));
                            return;
                        }

                        const pending = new Map(state.pendingStdout);
                        const chunks = pending.get(id) || [];
                        chunks.push(bytes);
                        if (chunks.length > 200) {
                            chunks.splice(0, chunks.length - 200);
                        }
                        pending.set(id, chunks);
                        set({ pendingStdout: pending });
                    });

                    // Listener para exit do terminal
                    const exitListener = await listen(PTY_EXIT_EVENT, ({ payload }) => {
                        const { id, success, code } = payload;

                        console.log(`[TerminalStore] Terminal ${id} exited. Success: ${success}, Code: ${code}`);

                        set((state) => {
                            const newTerminals = new Map(state.terminals);
                            const terminal = newTerminals.get(id);

                            const terminalArray = Array.from(newTerminals.keys());
                            const currentIndex = terminalArray.indexOf(id);

                            // Remover terminal
                            newTerminals.delete(id);

                            const newSerialized = new Map(state.serializedContent);
                            newSerialized.delete(id);

                            const newPending = new Map(state.pendingStdout);
                            newPending.delete(id);

                            const newRecentlyClosed = new Map(state.recentlyClosed);
                            newRecentlyClosed.set(id, Date.now());

                            const newAttached = new Map(state.attachedTerminals);
                            newAttached.delete(id);

                            // Determinar próximo foco
                            console.log('[TerminalStore] exitListener focus check:', { focusedTerminal: state.focusedTerminal, exitedId: id, idMatch: state.focusedTerminal === id });
                            let newFocused = state.focusedTerminal;
                            if (state.focusedTerminal === id) {
                                if (newTerminals.size > 0) {
                                    const nextIndex = currentIndex < terminalArray.length - 1
                                        ? currentIndex + 1
                                        : currentIndex - 1;
                                    newFocused = terminalArray[nextIndex] || Array.from(newTerminals.keys())[0];
                                } else {
                                    newFocused = null;
                                }
                            }

                            return {
                                terminals: newTerminals,
                                focusedTerminal: newFocused,
                                serializedContent: newSerialized,
                                pendingStdout: newPending,
                                recentlyClosed: newRecentlyClosed,
                                attachedTerminals: newAttached,
                            };
                        });
                    });

                    // Buscar PTYs existentes ANTES de marcar como inicializado
                    try {
                        const existingPtys = await invoke(LIST_PTYS_COMMAND);
                        if (existingPtys && existingPtys.length > 0) {
                            set((state) => {
                                const newTerminals = new Map(state.terminals);
                                existingPtys.forEach((pty) => {
                                    newTerminals.set(pty.id, {
                                        id: pty.id,
                                        shell: pty.shell,
                                        title: pty.shell.name,
                                        isOpen: true,
                                        createdAt: new Date().toISOString(),
                                    });
                                });
                                const focused = state.focusedTerminal || existingPtys[existingPtys.length - 1].id;
                                return { terminals: newTerminals, focusedTerminal: focused };
                            });
                            console.log('[TerminalStore] Restored existing PTYs:', existingPtys.length);
                        }
                    } catch (e) {
                        console.error('[TerminalStore] Failed to fetch existing PTYs:', e);
                    }

                    // Armazenar unlisteners e marcar como inicializado
                    set({
                        listeners: { spawnListener, stdoutListener, exitListener },
                        isInitialized: true
                    });

                    console.log('[TerminalStore] Listeners initialized successfully');
                } catch (error) {
                    console.error('[TerminalStore] Failed to initialize listeners:', error);
                }
            },

            /**
             * Remove listeners e limpa recursos
             */
            cleanup: () => {
                const state = get();

                if (state.listeners) {
                    state.listeners.spawnListener();
                    state.listeners.stdoutListener();
                    state.listeners.exitListener();
                }

                set({
                    listeners: null,
                    isInitialized: false,
                    pendingStdout: new Map(),
                    recentlyClosed: new Map(),
                    attachedTerminals: new Map(),
                });

                console.log('[TerminalStore] Cleanup completed');
            },

            // ========== AÇÕES PTY ==========

            /**
             * Spawna novo terminal PTY
             */
            spawnPty: async (shell, cols = 80, rows = 24) => {
                try {
                    if (!isTauri()) {
                        const id = crypto.randomUUID();
                        set((state) => {
                            const newTerminals = new Map(state.terminals);
                            newTerminals.set(id, {
                                id,
                                shell,
                                title: shell?.name || 'Terminal',
                                mode: 'web',
                                isOpen: true,
                                createdAt: new Date().toISOString(),
                            });
                            return {
                                terminals: newTerminals,
                                focusedTerminal: id,
                            };
                        });

                        return;
                    }
                    // Gera um spawn_id único. O Rust rejeita duplicatas deste ID,
                    // prevenindo phantom invokes (ex: Tauri replay após reload).
                    const spawn_id = crypto.randomUUID();
                    await invoke(PTY_SPAWN_COMMAND, { shell, cols, rows, spawnId: spawn_id });
                } catch (error) {
                    console.error('[TerminalStore] Failed to spawn PTY:', error);
                    throw error;
                }
            },

            /**
             * Escreve dados no PTY
             */
            writePty: async (id, data) => {
                try {
                    if (!isTauri()) return;
                    await invoke(PTY_STDIN_COMMAND, { id, data });
                } catch (error) {
                    console.error(`[TerminalStore] Failed to write to PTY ${id}:`, error);
                }
            },

            /**
             * Redimensiona PTY
             */
            resizePty: async (id, size) => {
                try {
                    if (!isTauri()) return;
                    await invoke(PTY_RESIZE_COMMAND, { id, size });
                } catch (error) {
                    console.error(`[TerminalStore] Failed to resize PTY ${id}:`, error);
                }
            },

            /**
             * Mata terminal PTY
             */
            killPty: async (id) => {
                // Remove terminal from store immediately to prevent
                // the MainLayout sync effect from re-creating a tab for it.
                set((state) => {
                    const newTerminals = new Map(state.terminals);
                    newTerminals.delete(id);

                    const newSerialized = new Map(state.serializedContent);
                    newSerialized.delete(id);

                    const newPending = new Map(state.pendingStdout);
                    newPending.delete(id);

                    const newRecentlyClosed = new Map(state.recentlyClosed);
                    newRecentlyClosed.set(id, Date.now());

                    const newAttached = new Map(state.attachedTerminals);
                    newAttached.delete(id);

                    const nextFocused = state.focusedTerminal === id ? null : state.focusedTerminal;

                    return {
                        terminals: newTerminals,
                        focusedTerminal: nextFocused,
                        serializedContent: newSerialized,
                        pendingStdout: newPending,
                        recentlyClosed: newRecentlyClosed,
                        attachedTerminals: newAttached,
                    };
                });

                if (isTauri()) {
                    try {
                        await invoke(PTY_KILL_COMMAND, { id });
                    } catch (error) {
                        console.error(`[TerminalStore] Failed to kill PTY ${id}:`, error);
                    }
                }
            },

            // ========== GETTERS E SETTERS ==========

            setFocused: (id) => {
                set({ focusedTerminal: id });
            },

            getTerminal: (id) => {
                return get().terminals.get(id);
            },

            getAllTerminals: () => {
                return Array.from(get().terminals.values());
            },

            clear: () => {
                const state = get();

                // Limpar event listeners e matar todos os terminais
                state.terminals.forEach((terminal) => {
                    // Matar o PTY
                    state.killPty(terminal.id).catch(console.error);
                });

                set({
                    terminals: new Map(),
                    focusedTerminal: null,
                    serializedContent: new Map(),
                    pendingStdout: new Map(),
                    recentlyClosed: new Map(),
                    attachedTerminals: new Map(),
                });
            },

            attachTerminal: (id) => {
                set((state) => {
                    const next = new Map(state.attachedTerminals);
                    next.set(id, (next.get(id) || 0) + 1);
                    return { attachedTerminals: next };
                });
            },

            detachTerminal: (id) => {
                set((state) => {
                    const next = new Map(state.attachedTerminals);
                    const current = next.get(id) || 0;
                    if (current <= 1) {
                        next.delete(id);
                    } else {
                        next.set(id, current - 1);
                    }
                    return { attachedTerminals: next };
                });
            },

            drainPendingStdout: (id) => {
                const pending = get().pendingStdout.get(id) || [];
                const next = new Map(get().pendingStdout);
                next.delete(id);
                set({ pendingStdout: next });
                return pending;
            },

            setSerializedContent: (id, content) => {
                const next = new Map(get().serializedContent);
                next.set(id, content);
                set({ serializedContent: next });
            },

            consumeSerializedContent: (id) => {
                const current = get().serializedContent.get(id);
                const next = new Map(get().serializedContent);
                next.delete(id);
                set({ serializedContent: next });
                return current ?? null;
            },
        }),
        { name: 'TerminalStore' }
    )
);

export default useTerminalStore;
