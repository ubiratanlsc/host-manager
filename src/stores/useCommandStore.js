import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

/**
 * Command Store - Histórico e comandos salvos para sugestões no terminal.
 *
 * Estado (persistido em localStorage):
 * - history: comandos já utilizados (mais recente primeiro), deduplicado.
 * - saved:   comandos salvos pelo usuário { id, name, command, description }.
 */

const HISTORY_LIMIT = 300;

const useCommandStore = create(
    devtools(
        persist(
            (set, get) => ({
                history: [],
                saved: [],

                // Rascunho para o diálogo "Salvar comando" aberto pelo terminal.
                draft: null,
                setDraft: (draft) => set({ draft }),

                // ========== HISTÓRICO ==========
                addHistory: (command) => {
                    const cmd = (command || '').trim();
                    if (!cmd) return;
                    set((state) => {
                        const next = [cmd, ...state.history.filter((c) => c !== cmd)];
                        if (next.length > HISTORY_LIMIT) next.length = HISTORY_LIMIT;
                        return { history: next };
                    });
                },

                clearHistory: () => set({ history: [] }),

                // ========== COMANDOS SALVOS ==========
                addSaved: ({ name, command, description }) => {
                    const cmd = (command || '').trim();
                    if (!cmd) return null;
                    const entry = {
                        id: crypto.randomUUID(),
                        name: (name || '').trim() || cmd,
                        command: cmd,
                        description: (description || '').trim(),
                        createdAt: new Date().toISOString(),
                    };
                    set((state) => ({ saved: [entry, ...state.saved] }));
                    return entry;
                },

                updateSaved: (id, updates) => {
                    set((state) => ({
                        saved: state.saved.map((s) =>
                            s.id === id
                                ? {
                                    ...s,
                                    ...updates,
                                    name: (updates.name ?? s.name).trim(),
                                    command: (updates.command ?? s.command).trim(),
                                }
                                : s
                        ),
                    }));
                },

                removeSaved: (id) => set((state) => ({ saved: state.saved.filter((s) => s.id !== id) })),

                // ========== SUGESTÕES ==========
                /**
                 * Retorna até `limit` sugestões para o prefixo digitado, priorizando:
                 * salvos por prefixo > salvos por substring > histórico por prefixo > histórico por substring.
                 */
                getSuggestions: (query, limit = 8) => {
                    const q = (query || '').trim();
                    if (!q) return [];
                    const ql = q.toLowerCase();
                    const { saved, history } = get();

                    const seen = new Set();
                    const out = [];
                    const push = (command, source, name) => {
                        if (!command || command === q || seen.has(command)) return;
                        seen.add(command);
                        out.push({ command, source, name });
                    };

                    for (const s of saved) {
                        if (s.command.toLowerCase().startsWith(ql)) push(s.command, 'saved', s.name);
                    }
                    for (const s of saved) {
                        const c = s.command.toLowerCase();
                        const n = (s.name || '').toLowerCase();
                        if (!c.startsWith(ql) && (c.includes(ql) || n.includes(ql))) push(s.command, 'saved', s.name);
                    }
                    for (const h of history) {
                        if (h.toLowerCase().startsWith(ql)) push(h, 'history');
                    }
                    for (const h of history) {
                        const c = h.toLowerCase();
                        if (!c.startsWith(ql) && c.includes(ql)) push(h, 'history');
                    }

                    return out.slice(0, limit);
                },
            }),
            {
                name: 'command-storage',
                partialize: (state) => ({ history: state.history, saved: state.saved }),
            }
        ),
        { name: 'CommandStore' }
    )
);

export default useCommandStore;
