import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Terminal } from '@xterm/xterm';

// Constants
const PTY_SPAWN_EVENT = 'EVENTS:PTY:SPAWN';
const PTY_STDOUT_EVENT = 'EVENTS:PTY:STDOUT';
const PTY_EXIT_EVENT = 'EVENTS:PTY:EXIT';
const GET_SYSTEM_SHELLS_COMMAND = 'get_system_shells';
const PTY_SPAWN_COMMAND = 'spawn_pty';
const PTY_STDIN_COMMAND = 'write_pty';
const PTY_RESIZE_COMMAND = 'resize_pty';
const PTY_KILL_COMMAND = 'kill_pty';

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

            // ========== INICIALIZAÇÃO ==========

            /**
             * Carrega shells disponíveis no sistema
             */
            loadSystemShells: async () => {
                try {
                    const shells = await invoke(GET_SYSTEM_SHELLS_COMMAND, {});
                    set({ shells });
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
                    // Listener para spawn de terminal
                    const spawnListener = await listen(PTY_SPAWN_EVENT, ({ payload }) => {
                        const { id, shell } = payload;

                        // Criar instância xterm
                        const xterm = new Terminal({
                            theme: {
                                background: '#1A1B1E',
                                cursor: '#10B981',
                                cursorAccent: '#10B98100',
                            },
                            fontFamily: 'JetBrainsMono Nerd Font, monospace',
                            cursorBlink: true,
                            allowTransparency: true,
                            allowProposedApi: true,
                            overviewRulerWidth: 8,
                            rows: 20,
                            cols: 40,
                        });

                        // Armazenar disposables para cleanup posterior
                        const onDataDisposable = xterm.onData((data) => get().writePty(id, data));
                        const onResizeDisposable = xterm.onResize((size) => {
                            get().resizePty(id, {
                                ...size,
                                pixel_width: size.cols,
                                pixel_height: size.rows,
                            });
                        });

                        // Adicionar terminal ao estado
                        set((state) => {
                            const newTerminals = new Map(state.terminals);
                            newTerminals.set(id, {
                                id,
                                shell,
                                title: shell.name,
                                xterm,
                                // Armazenar disposables para cleanup
                                disposables: { onDataDisposable, onResizeDisposable },
                                isOpen: true,
                                createdAt: new Date().toISOString(),
                            });
                            return {
                                terminals: newTerminals,
                                focusedTerminal: id,
                            };
                        });
                    });

                    // Listener para stdout do terminal
                    const stdoutListener = await listen(PTY_STDOUT_EVENT, ({ payload }) => {
                        const { id, bytes } = payload;
                        const state = get();
                        const terminal = state.terminals.get(id);

                        if (!terminal) {
                            console.error(`[TerminalStore] Terminal ${id} not found for STDOUT`);
                            return;
                        }

                        // Escrever bytes no xterm
                        terminal.xterm.write(bytes);
                    });

                    // Listener para exit do terminal
                    const exitListener = await listen(PTY_EXIT_EVENT, ({ payload }) => {
                        const { id, success, code } = payload;

                        console.log(`[TerminalStore] Terminal ${id} exited. Success: ${success}, Code: ${code}`);

                        set((state) => {
                            const newTerminals = new Map(state.terminals);
                            const terminal = newTerminals.get(id);

                            // Cleanup dos event listeners do xterm antes de remover
                            if (terminal?.disposables) {
                                try {
                                    terminal.disposables.onDataDisposable?.dispose();
                                    terminal.disposables.onResizeDisposable?.dispose();
                                    console.log(`[TerminalStore] Disposed event listeners for terminal ${id}`);
                                } catch (error) {
                                    console.warn(`[TerminalStore] Error disposing listeners for terminal ${id}:`, error);
                                }
                            }

                            const terminalArray = Array.from(newTerminals.keys());
                            const currentIndex = terminalArray.indexOf(id);

                            // Remover terminal
                            newTerminals.delete(id);

                            // Determinar próximo foco
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
                            };
                        });
                    });

                    // Armazenar unlisteners
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
                });

                console.log('[TerminalStore] Cleanup completed');
            },

            // ========== AÇÕES PTY ==========

            /**
             * Spawna novo terminal PTY
             */
            spawnPty: async (shell, cols = 80, rows = 24) => {
                try {
                    await invoke(PTY_SPAWN_COMMAND, { shell, cols, rows });
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
                    await invoke(PTY_RESIZE_COMMAND, { id, size });
                } catch (error) {
                    console.error(`[TerminalStore] Failed to resize PTY ${id}:`, error);
                }
            },

            /**
             * Mata terminal PTY
             */
            killPty: async (id) => {
                try {
                    await invoke(PTY_KILL_COMMAND, { id });
                } catch (error) {
                    console.error(`[TerminalStore] Failed to kill PTY ${id}:`, error);
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
                    // Cleanup dos event listeners
                    if (terminal.disposables) {
                        try {
                            terminal.disposables.onDataDisposable?.dispose();
                            terminal.disposables.onResizeDisposable?.dispose();
                        } catch (error) {
                            console.warn(`[TerminalStore] Error disposing listeners for terminal ${terminal.id}:`, error);
                        }
                    }

                    // Matar o PTY
                    state.killPty(terminal.id).catch(console.error);
                });

                set({
                    terminals: new Map(),
                    focusedTerminal: null,
                });
            },
        }),
        { name: 'TerminalStore' }
    )
);

export default useTerminalStore;
