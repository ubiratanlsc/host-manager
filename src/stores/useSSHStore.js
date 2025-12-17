import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Terminal } from '@xterm/xterm';

// Constants
const SSH_SPAWN_EVENT = 'EVENTS:SSH:SPAWN';
const SSH_STDOUT_EVENT = 'EVENTS:SSH:STDOUT';
const SSH_EXIT_EVENT = 'EVENTS:SSH:EXIT';
const SSH_SPAWN_COMMAND = 'spawn_ssh';
const SSH_STDIN_COMMAND = 'write_ssh';
const SSH_KILL_COMMAND = 'kill_ssh';

/**
 * SSH Store - Gerencia sessões SSH remotas com Xterm.js
 * 
 * Estado:
 * - sessions: Map de sessões SSH ativas com instâncias xterm
 * - focusedSession: ID da sessão em foco
 * - listeners: Unlisteners dos eventos Tauri
 * - commandBuffers: Map de buffers de comando por sessão
 * 
 * Ações:
 * - initializeListeners: Configura listeners de eventos Tauri
 * - spawnSSH: Cria nova sessão SSH
 * - writeSSH: Escreve comando no SSH
 * - killSSH: Encerra sessão SSH
 */

const useSSHStore = create(
    devtools(
        (set, get) => ({
            // ========== ESTADO ==========
            sessions: new Map(),
            focusedSession: null,
            listeners: null,
            isInitialized: false,
            commandBuffers: new Map(), // Buffer de comandos por sessão

            // ========== INICIALIZAÇÃO ==========

            /**
             * Inicializa listeners de eventos Tauri para SSH
             */
            initializeListeners: async () => {
                const state = get();

                // Evitar múltiplas inicializações
                if (state.isInitialized) {
                    console.warn('[SSHStore] Listeners already initialized');
                    return;
                }

                try {
                    // Listener para spawn de sessão SSH
                    const spawnListener = await listen(SSH_SPAWN_EVENT, ({ payload }) => {
                        const { id, host, port, username } = payload;

                        // Criar instância xterm para SSH
                        const xterm = new Terminal({
                            theme: {
                                cursor: '#10B981',
                                selectionForeground: 'transparent'
                            },
                            fontFamily: 'Cascadia Mono, Consolas, "DejaVu Sans Mono", monospace',
                            fontSize: 14,
                            lineHeight: 1.2,
                            cursorBlink: true,
                            allowTransparency: false,
                            allowProposedApi: true,
                            overviewRulerWidth: 8,
                        });

                        // Configurar handler de dados
                        xterm.onData((data) => {
                            // Echo local do que foi digitado
                            if (data === '\r') {
                                xterm.writeln('');
                            } else {
                                xterm.write(data);
                            }

                            // Enviar para o backend
                            get().writeSSH(id, data);
                        });

                        xterm.onResize((size) => {
                            console.log('[SSHStore] Terminal resized:', size);
                            // TODO: Implementar resize no backend se necessário
                        });

                        const config = { host, port, username };

                        // Adicionar sessão ao estado
                        set((state) => {
                            const newSessions = new Map(state.sessions);
                            newSessions.set(id, {
                                id,
                                shell: { name: 'SSH' },
                                title: `${username}@${host}`,
                                config,
                                xterm,
                                isOpen: true,
                                createdAt: new Date().toISOString(),
                            });

                            // Inicializar buffer de comandos
                            const newBuffers = new Map(state.commandBuffers);
                            newBuffers.set(id, []);

                            return {
                                sessions: newSessions,
                                commandBuffers: newBuffers,
                                focusedSession: id,
                            };
                        });
                    });

                    // Listener para stdout do SSH
                    const stdoutListener = await listen(SSH_STDOUT_EVENT, ({ payload }) => {
                        const { id, bytes } = payload;
                        const state = get();
                        const session = state.sessions.get(id);

                        if (!session) {
                            console.error(`[SSHStore] Session ${id} not found for STDOUT`);
                            return;
                        }

                        // Converter bytes para texto e corrigir line endings
                        const text = String.fromCharCode(...bytes);
                        const fixedData = text.replace(/\r?\n/g, "\r\n");

                        // Escrever no xterm
                        session.xterm.write(fixedData);
                    });

                    // Listener para exit do SSH
                    const exitListener = await listen(SSH_EXIT_EVENT, ({ payload }) => {
                        const { id, success, code } = payload;

                        console.log(`[SSHStore] Session ${id} exited. Success: ${success}, Code: ${code}`);

                        set((state) => {
                            const newSessions = new Map(state.sessions);
                            const sessionArray = Array.from(newSessions.keys());
                            const currentIndex = sessionArray.indexOf(id);

                            // Remover sessão
                            newSessions.delete(id);

                            // Remover buffer
                            const newBuffers = new Map(state.commandBuffers);
                            newBuffers.delete(id);

                            // Determinar próximo foco
                            let newFocused = state.focusedSession;
                            if (state.focusedSession === id) {
                                if (newSessions.size > 0) {
                                    const nextIndex = currentIndex < sessionArray.length - 1
                                        ? currentIndex + 1
                                        : currentIndex - 1;
                                    newFocused = sessionArray[nextIndex] || Array.from(newSessions.keys())[0];
                                } else {
                                    newFocused = null;
                                }
                            }

                            return {
                                sessions: newSessions,
                                commandBuffers: newBuffers,
                                focusedSession: newFocused,
                            };
                        });
                    });

                    // Armazenar unlisteners
                    set({
                        listeners: { spawnListener, stdoutListener, exitListener },
                        isInitialized: true
                    });

                    console.log('[SSHStore] Listeners initialized successfully');
                } catch (error) {
                    console.error('[SSHStore] Failed to initialize listeners:', error);
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

                console.log('[SSHStore] Cleanup completed');
            },

            // ========== AÇÕES SSH ==========

            /**
             * Spawna nova sessão SSH
             * @param {Object} config - Configuração da conexão SSH
             * @param {string} config.windowId - ID da janela (opcional)
             * @param {string} config.host - Host SSH
             * @param {number} config.port - Porta SSH (padrão 22)
             * @param {string} config.username - Usuário
             * @param {string} config.password - Senha (ou null para usar chave)
             */
            spawnSSH: async (config) => {
                try {
                    const { windowId, host, port = 22, username, password } = config;
                    await invoke(SSH_SPAWN_COMMAND, {
                        windowId: windowId || crypto.randomUUID(),
                        host,
                        port,
                        username,
                        password,
                    });
                } catch (error) {
                    console.error('[SSHStore] Failed to spawn SSH:', error);
                    throw error;
                }
            },

            /**
             * Escreve comando no SSH com buffering
             * Acumula caracteres até receber Enter (\r) e então envia o comando completo
             */
            writeSSH: async (id, data) => {
                try {
                    const state = get();
                    const buffer = state.commandBuffers.get(id) || [];

                    // Se for Enter, enviar comando acumulado
                    if (data === '\r') {
                        const command = buffer.join('');
                        console.log(`[SSHStore] Sending command to ${id}:`, command);

                        // Enviar comando para o backend
                        await invoke(SSH_STDIN_COMMAND, { id, data: command });

                        // Limpar buffer
                        set((state) => {
                            const newBuffers = new Map(state.commandBuffers);
                            newBuffers.set(id, []);
                            return { commandBuffers: newBuffers };
                        });
                    } else {
                        // Acumular no buffer
                        buffer.push(data);
                        set((state) => {
                            const newBuffers = new Map(state.commandBuffers);
                            newBuffers.set(id, buffer);
                            return { commandBuffers: newBuffers };
                        });
                    }
                } catch (error) {
                    console.error(`[SSHStore] Failed to write to SSH ${id}:`, error);
                }
            },

            /**
             * Mata sessão SSH
             */
            killSSH: async (id) => {
                try {
                    await invoke(SSH_KILL_COMMAND, { id });
                } catch (error) {
                    console.error(`[SSHStore] Failed to kill SSH ${id}:`, error);
                }
            },

            /**
             * Envia heartbeat para sessão
             */
            heartbeat: async (id) => {
                try {
                    await invoke('heartbeat', { id });
                } catch (error) {
                    console.error(`[SSHStore] Failed to send heartbeat to ${id}:`, error);
                }
            },

            /**
             * Limpa sessões inativas
             */
            cleanupInactiveSessions: async () => {
                try {
                    await invoke('cleanup_inactive_sessions');
                } catch (error) {
                    console.error('[SSHStore] Failed to cleanup inactive sessions:', error);
                }
            },

            /**
             * Desliga todas as sessões
             */
            shutdownAllSessions: async () => {
                try {
                    await invoke('shutdown_all_sessions');
                    set({
                        sessions: new Map(),
                        commandBuffers: new Map(),
                        focusedSession: null,
                    });
                } catch (error) {
                    console.error('[SSHStore] Failed to shutdown all sessions:', error);
                }
            },

            // ========== GETTERS E SETTERS ==========

            setFocused: (id) => {
                set({ focusedSession: id });
            },

            getSession: (id) => {
                return get().sessions.get(id);
            },

            getAllSessions: () => {
                return Array.from(get().sessions.values());
            },

            clear: () => {
                const state = get();

                // Matar todas as sessões
                state.sessions.forEach((session) => {
                    state.killSSH(session.id).catch(console.error);
                });

                set({
                    sessions: new Map(),
                    commandBuffers: new Map(),
                    focusedSession: null,
                });
            },
        }),
        { name: 'SSHStore' }
    )
);

export default useSSHStore;
