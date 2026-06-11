import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import useAppStore from './useAppStore';

// Constants
const SSH_SPAWN_EVENT = 'EVENTS:SSH:SPAWN';
const SSH_STDOUT_EVENT = 'EVENTS:SSH:STDOUT';
const SSH_EXIT_EVENT = 'EVENTS:SSH:EXIT';
const SSH_SPAWN_COMMAND = 'spawn_ssh';
const SSH_STDIN_COMMAND = 'write_ssh';
const SSH_RESIZE_COMMAND = 'resize_ssh';
const SSH_KILL_COMMAND = 'kill_ssh';
const SSH_LIST_COMMAND = 'list_ssh_sessions';

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
            commandBuffers: new Map(), // { buffer: string, history: string[], historyIndex: number, cursorPosition: number, currentAttempt: string }
            serializedContent: new Map(), // Armazena conteúdo serializado temporariamente
            pendingStdout: new Map(),
            recentlyClosed: new Map(),
            attachedSessions: new Map(),

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
                    if (!isTauri()) {
                        set({
                            listeners: null,
                            isInitialized: true,
                        });
                        return;
                    }
                    // Listener para spawn de sessão SSH
                    const spawnListener = await listen(SSH_SPAWN_EVENT, ({ payload }) => {
                        const { id, host, port, username } = payload;

                        const config = { host, port, username };

                        // Adicionar sessão ao estado
                        set((state) => {
                            const newSessions = new Map(state.sessions);
                            newSessions.set(id, {
                                id,
                                shell: { name: 'SSH' },
                                title: `${username}@${host}`,
                                config,
                                isOpen: true,
                                createdAt: new Date().toISOString(),
                            });

                            // Inicializar buffer de comandos com metadados de histórico
                            const newBuffers = new Map(state.commandBuffers);
                            newBuffers.set(id, {
                                buffer: '',
                                history: [],
                                historyIndex: -1,
                                cursorPosition: 0,
                                currentAttempt: ''
                            });

                            const newRecentlyClosed = new Map(state.recentlyClosed);
                            newRecentlyClosed.delete(id);

                            return {
                                sessions: newSessions,
                                commandBuffers: newBuffers,
                                focusedSession: id,
                                recentlyClosed: newRecentlyClosed,
                            };
                        });
                    });

                    // Listener para stdout do SSH
                    const stdoutListener = await listen(SSH_STDOUT_EVENT, ({ payload }) => {
                        const { id, bytes } = payload;
                        const state = get();
                        const closedAt = state.recentlyClosed.get(id);
                        if (typeof closedAt === 'number' && Date.now() - closedAt < 5000) {
                            return;
                        }

                        const attachedCount = state.attachedSessions.get(id) || 0;
                        if (attachedCount > 0) {
                            window.dispatchEvent(new CustomEvent('ssh:stdout', { detail: { id, bytes } }));
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

                    // Listener para exit do SSH (desconexão inesperada)
                    const exitListener = await listen(SSH_EXIT_EVENT, ({ payload }) => {
                        const { id } = payload;
                        const session = get().sessions.get(id);

                        // Sem sessão no store = fechamento intencional (killSSH já
                        // removeu). Ou já marcada como desconectada: ignora (evita
                        // toast duplicado).
                        if (!session || session.disconnected) return;

                        // Desconexão inesperada: mantém a aba, marca como
                        // desconectada e notifica o usuário.
                        set((state) => {
                            const newSessions = new Map(state.sessions);
                            const cur = newSessions.get(id);
                            if (cur) {
                                newSessions.set(id, { ...cur, disconnected: true, isOpen: false });
                            }
                            return { sessions: newSessions };
                        });

                        useAppStore.getState().addNotification({
                            type: 'warning',
                            title: 'SSH desconectado',
                            message: `${session.title || 'Sessão'} foi encerrada (servidor, timeout ou rede).`,
                            duration: 6000,
                        });

                        // Limpa os restos no backend (task de escrita + registro),
                        // mantendo a aba visível com o scrollback.
                        if (isTauri()) {
                            invoke(SSH_KILL_COMMAND, { id }).catch(() => { });
                        }
                    });

                    // Restaurar sessões ativas do backend ANTES de marcar como inicializado
                    try {
                        const activeSessions = await invoke(SSH_LIST_COMMAND);
                        if (activeSessions && activeSessions.length > 0) {
                            set((state) => {
                                const newSessions = new Map(state.sessions);
                                const newBuffers = new Map(state.commandBuffers);
                                let lastId = null;

                                for (const session of activeSessions) {
                                    if (!newSessions.has(session.id)) {
                                        newSessions.set(session.id, {
                                            id: session.id,
                                            shell: { name: 'SSH' },
                                            title: `${session.username}@${session.host}`,
                                            config: { host: session.host, port: session.port, username: session.username },
                                            isOpen: true,
                                            createdAt: new Date().toISOString(),
                                        });
                                        newBuffers.set(session.id, {
                                            buffer: '',
                                            history: [],
                                            historyIndex: -1,
                                            cursorPosition: 0,
                                            currentAttempt: ''
                                        });
                                        lastId = session.id;
                                    }
                                }

                                return {
                                    sessions: newSessions,
                                    commandBuffers: newBuffers,
                                    ...(lastId ? { focusedSession: lastId } : {}),
                                };
                            });
                        }
                    } catch (listError) {
                        console.warn('[SSHStore] Failed to list active sessions:', listError);
                    }

                    // Armazenar unlisteners e marcar como inicializado
                    set({
                        listeners: { spawnListener, stdoutListener, exitListener },
                        isInitialized: true
                    });

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
                    pendingStdout: new Map(),
                    recentlyClosed: new Map(),
                    attachedSessions: new Map(),
                });

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
                    if (!isTauri()) {
                        const id = crypto.randomUUID();
                        const { host, port = 22, username } = config;

                        const sessionConfig = { host, port, username };

                        set((state) => {
                            const newSessions = new Map(state.sessions);
                            newSessions.set(id, {
                                id,
                                shell: { name: 'SSH' },
                                title: `${username || 'user'}@${host || 'localhost'}`,
                                config: sessionConfig,
                                mode: 'web',
                                isOpen: true,
                                createdAt: new Date().toISOString(),
                            });

                            const newBuffers = new Map(state.commandBuffers);
                            newBuffers.set(id, {
                                buffer: '',
                                history: [],
                                historyIndex: -1,
                                cursorPosition: 0,
                                currentAttempt: ''
                            });

                            return {
                                sessions: newSessions,
                                commandBuffers: newBuffers,
                                focusedSession: id,
                            };
                        });

                        return;
                    }
                    const { windowId, host, port = 22, username, password, identityFile } = config;
                    await invoke(SSH_SPAWN_COMMAND, {
                        windowId: windowId || crypto.randomUUID(),
                        host,
                        port,
                        username,
                        password,
                        identityFile: identityFile || null,
                    });
                } catch (error) {
                    console.error('[SSHStore] Failed to spawn SSH:', error);
                    throw error;
                }
            },

            /**
             * Escreve dados no SSH (pass-through cru).
             * Cada tecla vai direto para o shell remoto, que cuida do echo,
             * edição de linha, histórico (setas) e autocompletar com Tab.
             */
            writeSSH: async (id, data) => {
                try {
                    if (!isTauri()) return;
                    await invoke(SSH_STDIN_COMMAND, { id, data });
                } catch (error) {
                    console.error(`[SSHStore] Failed to write to SSH ${id}:`, error);
                }
            },

            /**
             * Mata sessão SSH
             */
            killSSH: async (id) => {
                set((state) => {
                    const newSessions = new Map(state.sessions);
                    newSessions.delete(id);

                    const newBuffers = new Map(state.commandBuffers);
                    newBuffers.delete(id);

                    const newSerialized = new Map(state.serializedContent);
                    newSerialized.delete(id);

                    const newPending = new Map(state.pendingStdout);
                    newPending.delete(id);

                    const newRecentlyClosed = new Map(state.recentlyClosed);
                    newRecentlyClosed.set(id, Date.now());

                    const newAttached = new Map(state.attachedSessions);
                    newAttached.delete(id);

                    const nextFocused = state.focusedSession === id ? null : state.focusedSession;

                    return {
                        sessions: newSessions,
                        commandBuffers: newBuffers,
                        focusedSession: nextFocused,
                        serializedContent: newSerialized,
                        pendingStdout: newPending,
                        recentlyClosed: newRecentlyClosed,
                        attachedSessions: newAttached,
                    };
                });

                if (isTauri()) {
                    try {
                        await invoke(SSH_KILL_COMMAND, { id });
                    } catch (error) {
                        console.error(`[SSHStore] Failed to kill SSH ${id}:`, error);
                    }
                }
            },

            resizeSSH: async (id, size) => {
                try {
                    if (!isTauri()) return;
                    await invoke(SSH_RESIZE_COMMAND, { id, size });
                } catch (error) {
                    console.error(`[SSHStore] Failed to resize SSH ${id}:`, error);
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
                        serializedContent: new Map(),
                        pendingStdout: new Map(),
                        recentlyClosed: new Map(),
                        attachedSessions: new Map(),
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
                    serializedContent: new Map(),
                    pendingStdout: new Map(),
                    recentlyClosed: new Map(),
                    attachedSessions: new Map(),
                });
            },

            attachSession: (id) => {
                set((state) => {
                    const next = new Map(state.attachedSessions);
                    next.set(id, (next.get(id) || 0) + 1);
                    return { attachedSessions: next };
                });
            },

            detachSession: (id) => {
                set((state) => {
                    const next = new Map(state.attachedSessions);
                    const current = next.get(id) || 0;
                    if (current <= 1) {
                        next.delete(id);
                    } else {
                        next.set(id, current - 1);
                    }
                    return { attachedSessions: next };
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
        { name: 'SSHStore' }
    )
);

export default useSSHStore;
