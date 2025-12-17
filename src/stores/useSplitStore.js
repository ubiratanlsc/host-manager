import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

/**
 * Split Store - Gerencia divisões de terminais (split panes)
 */

const useSplitStore = create(
    devtools(
        (set, get) => ({
            // ========== ESTADO ==========
            splits: new Map(), // Map<splitId, split>
            rootSplitId: null,
            activePaneId: null, // ID do painel ativo (split ou terminal)

            // ========== INICIALIZAÇÃO ==========

            /**
             * Inicializa o root split com um terminal
             */
            initializeWithTerminal: (terminalId) => {
                const splitId = uuidv4();
                const split = {
                    id: splitId,
                    type: 'single',
                    terminalIds: [terminalId],
                    activeTerminalId: terminalId,
                };

                set({
                    splits: new Map([[splitId, split]]),
                    rootSplitId: splitId,
                    activePaneId: splitId,
                });

                return splitId;
            },

            addTerminalToActivePane: (terminalId) => {
                const state = get();
                const activeSplitId = state.activePaneId;

                if (!activeSplitId || !state.splits.has(activeSplitId)) {
                    return get().initializeWithTerminal(terminalId);
                }

                const activeSplit = state.splits.get(activeSplitId);
                if (!activeSplit || activeSplit.type !== 'single') {
                    return get().initializeWithTerminal(terminalId);
                }

                set((state) => {
                    const newSplits = new Map(state.splits);
                    const split = newSplits.get(activeSplitId);
                    if (!split || split.type !== 'single') return state;

                    const existingIds = split.terminalIds || [];
                    if (existingIds.includes(terminalId)) {
                        newSplits.set(activeSplitId, { ...split, activeTerminalId: terminalId });
                        return { splits: newSplits, activePaneId: activeSplitId };
                    }

                    newSplits.set(activeSplitId, {
                        ...split,
                        terminalIds: [...existingIds, terminalId],
                        activeTerminalId: terminalId,
                    });

                    return { splits: newSplits, activePaneId: activeSplitId };
                });

                return activeSplitId;
            },

            /**
             * Divide um painel existente
             * @param {string} splitId - ID do split a dividir
             * @param {'horizontal' | 'vertical'} direction - Direção da divisão
             * @param {string} newTerminalId - ID do novo terminal
             * @param {string} sessionType - 'terminal' ou 'ssh'
             */
            splitPane: (splitId, direction, newTerminalId, sessionType = 'terminal') => {
                const state = get();
                const existingSplit = state.splits.get(splitId);

                if (!existingSplit) {
                    console.error(`[SplitStore] Split ${splitId} não encontrado`);
                    return null;
                }

                if (existingSplit.type !== 'single') {
                    console.error(`[SplitStore] Split ${splitId} não é folha`);
                    return null;
                }

                const existingTerminalIds = existingSplit.terminalIds || [];
                const existingActiveTerminalId = existingSplit.activeTerminalId || existingTerminalIds[0] || null;

                // Criar novo split para o terminal existente
                const newSplit1Id = uuidv4();
                const newSplit1 = {
                    id: newSplit1Id,
                    type: 'single',
                    terminalIds: existingTerminalIds,
                    activeTerminalId: existingActiveTerminalId,
                };

                // Criar split para o novo terminal
                const newSplit2Id = uuidv4();
                const newSplit2 = {
                    id: newSplit2Id,
                    type: 'single',
                    terminalIds: [newTerminalId],
                    activeTerminalId: newTerminalId,
                };

                // Atualizar o split existente para container
                const updatedSplit = {
                    id: splitId,
                    type: direction,
                    children: [newSplit1Id, newSplit2Id],
                    sizes: [50, 50], // Dividir 50/50
                };

                set((state) => {
                    const newSplits = new Map(state.splits);
                    newSplits.set(splitId, updatedSplit);
                    newSplits.set(newSplit1Id, newSplit1);
                    newSplits.set(newSplit2Id, newSplit2);

                    return {
                        splits: newSplits,
                        activePaneId: newSplit2Id,
                    };
                });

                return newSplit2Id;
            },

            setActiveTerminal: (splitId, terminalId) => {
                set((state) => {
                    const newSplits = new Map(state.splits);
                    const split = newSplits.get(splitId);
                    if (!split || split.type !== 'single') return state;
                    if (!split.terminalIds?.includes(terminalId)) return state;

                    newSplits.set(splitId, { ...split, activeTerminalId: terminalId });
                    return { splits: newSplits, activePaneId: splitId };
                });
            },

            setSplitTerminalIds: (splitId, terminalIds) => {
                set((state) => {
                    const newSplits = new Map(state.splits);
                    const split = newSplits.get(splitId);
                    if (!split || split.type !== 'single') return state;

                    const nextTerminalIds = (terminalIds || []).filter(Boolean);
                    const nextActiveTerminalId = nextTerminalIds.includes(split.activeTerminalId)
                        ? split.activeTerminalId
                        : nextTerminalIds[0] || null;

                    newSplits.set(splitId, {
                        ...split,
                        terminalIds: nextTerminalIds,
                        activeTerminalId: nextActiveTerminalId,
                    });

                    return { splits: newSplits };
                });
            },

            findSplitByTerminal: (terminalId) => {
                const state = get();
                for (const [splitId, split] of state.splits.entries()) {
                    if (split.type === 'single' && split.terminalIds?.includes(terminalId)) {
                        return splitId;
                    }
                }
                return null;
            },

            removeTerminalFromSplit: (splitId, terminalId) => {
                const state = get();
                const split = state.splits.get(splitId);
                if (!split || split.type !== 'single') return;

                const nextTerminalIds = (split.terminalIds || []).filter((id) => id !== terminalId);
                if (nextTerminalIds.length === 0) {
                    get().closePane(splitId);
                    return;
                }

                const nextActiveTerminalId = split.activeTerminalId === terminalId
                    ? nextTerminalIds[0]
                    : split.activeTerminalId;

                set((state) => {
                    const newSplits = new Map(state.splits);
                    const current = newSplits.get(splitId);
                    if (!current || current.type !== 'single') return state;

                    newSplits.set(splitId, {
                        ...current,
                        terminalIds: nextTerminalIds,
                        activeTerminalId: nextActiveTerminalId,
                    });

                    return { splits: newSplits };
                });
            },

            moveTerminalBetweenSplits: (terminalId, fromSplitId, toSplitId) => {
                if (fromSplitId === toSplitId) return;

                let shouldCloseFromPane = false;

                set((state) => {
                    const newSplits = new Map(state.splits);
                    const fromSplit = newSplits.get(fromSplitId);
                    const toSplit = newSplits.get(toSplitId);

                    if (!fromSplit || fromSplit.type !== 'single') return state;
                    if (!toSplit || toSplit.type !== 'single') return state;

                    const nextFromIds = (fromSplit.terminalIds || []).filter((id) => id !== terminalId);
                    const nextToIds = (toSplit.terminalIds || []).includes(terminalId)
                        ? (toSplit.terminalIds || [])
                        : [...(toSplit.terminalIds || []), terminalId];

                    const nextFromActiveId = fromSplit.activeTerminalId === terminalId
                        ? nextFromIds[0] || null
                        : fromSplit.activeTerminalId;

                    newSplits.set(toSplitId, {
                        ...toSplit,
                        terminalIds: nextToIds,
                        activeTerminalId: terminalId,
                    });

                    if (nextFromIds.length === 0) {
                        shouldCloseFromPane = true;
                        return {
                            splits: newSplits,
                            activePaneId: toSplitId,
                        };
                    }

                    newSplits.set(fromSplitId, {
                        ...fromSplit,
                        terminalIds: nextFromIds,
                        activeTerminalId: nextFromActiveId,
                    });

                    return {
                        splits: newSplits,
                        activePaneId: toSplitId,
                    };
                });

                if (shouldCloseFromPane) {
                    get().closePane(fromSplitId);
                    get().setActivePane(toSplitId);
                }
            },

            mergePane: (fromSplitId, toSplitId) => {
                if (fromSplitId === toSplitId) return;
                const state = get();
                const fromSplit = state.splits.get(fromSplitId);
                const toSplit = state.splits.get(toSplitId);
                if (!fromSplit || fromSplit.type !== 'single') return;
                if (!toSplit || toSplit.type !== 'single') return;

                const fromIds = fromSplit.terminalIds || [];
                if (fromIds.length === 0) return;

                set((state) => {
                    const newSplits = new Map(state.splits);
                    const currentTo = newSplits.get(toSplitId);
                    const currentFrom = newSplits.get(fromSplitId);
                    if (!currentTo || currentTo.type !== 'single') return state;
                    if (!currentFrom || currentFrom.type !== 'single') return state;

                    const nextToIds = Array.from(new Set([...(currentTo.terminalIds || []), ...(currentFrom.terminalIds || [])]));
                    newSplits.set(toSplitId, {
                        ...currentTo,
                        terminalIds: nextToIds,
                        activeTerminalId: currentFrom.activeTerminalId || currentFrom.terminalIds?.[0] || currentTo.activeTerminalId,
                    });

                    return {
                        splits: newSplits,
                        activePaneId: toSplitId,
                    };
                });

                get().closePane(fromSplitId);
                get().setActivePane(toSplitId);
            },

            splitPaneWithPane: (targetSplitId, direction, sourceSplitId) => {
                const state = get();
                const targetSplit = state.splits.get(targetSplitId);
                const sourceSplit = state.splits.get(sourceSplitId);
                if (!targetSplit || targetSplit.type !== 'single') return null;
                if (!sourceSplit || sourceSplit.type !== 'single') return null;
                if (targetSplitId === sourceSplitId) return null;

                const newSplit1Id = uuidv4();
                const newSplit2Id = uuidv4();

                const left = {
                    id: newSplit1Id,
                    type: 'single',
                    terminalIds: targetSplit.terminalIds || [],
                    activeTerminalId: targetSplit.activeTerminalId || targetSplit.terminalIds?.[0] || null,
                };

                const right = {
                    id: newSplit2Id,
                    type: 'single',
                    terminalIds: sourceSplit.terminalIds || [],
                    activeTerminalId: sourceSplit.activeTerminalId || sourceSplit.terminalIds?.[0] || null,
                };

                const updatedSplit = {
                    id: targetSplitId,
                    type: direction,
                    children: [newSplit1Id, newSplit2Id],
                    sizes: [50, 50],
                };

                set((state) => {
                    const newSplits = new Map(state.splits);
                    newSplits.set(targetSplitId, updatedSplit);
                    newSplits.set(newSplit1Id, left);
                    newSplits.set(newSplit2Id, right);
                    return {
                        splits: newSplits,
                        activePaneId: newSplit2Id,
                    };
                });

                get().closePane(sourceSplitId);
                get().setActivePane(newSplit2Id);

                return newSplit2Id;
            },

            /**
             * Fecha um painel
             * @param {string} splitId - ID do split a fechar
             */
            closePane: (splitId) => {
                const state = get();
                const split = state.splits.get(splitId);

                if (!split) return;

                // Se for o root e único, limpar tudo
                if (splitId === state.rootSplitId && state.splits.size === 1) {
                    set({
                        splits: new Map(),
                        rootSplitId: null,
                        activePaneId: null,
                    });
                    return;
                }

                // Encontrar o pai deste split
                const parentSplit = Array.from(state.splits.values()).find(
                    (s) => s.children?.includes(splitId)
                );

                if (!parentSplit) {
                    console.error(`[SplitStore] Pai de ${splitId} não encontrado`);
                    return;
                }

                // Obter o irmão (sibling)
                const siblingId = parentSplit.children.find((id) => id !== splitId);
                const sibling = state.splits.get(siblingId);

                if (!sibling) return;

                // Substituir o pai pelo irmão
                set((state) => {
                    const newSplits = new Map(state.splits);

                    // Remover o split fechado
                    newSplits.delete(splitId);

                    // Se o pai for o root, o irmão vira o novo root
                    if (parentSplit.id === state.rootSplitId) {
                        return {
                            splits: new Map([[siblingId, sibling]]),
                            rootSplitId: siblingId,
                            activePaneId: siblingId,
                        };
                    }

                    // Caso contrário, substituir o pai pelo irmão
                    const grandParent = Array.from(newSplits.values()).find(
                        (s) => s.children?.includes(parentSplit.id)
                    );

                    if (grandParent) {
                        grandParent.children = grandParent.children.map((id) =>
                            id === parentSplit.id ? siblingId : id
                        );
                        newSplits.set(grandParent.id, { ...grandParent });
                    }

                    newSplits.delete(parentSplit.id);

                    return {
                        splits: newSplits,
                        activePaneId: siblingId,
                    };
                });
            },

            /**
             * Atualiza os tamanhos de um split
             */
            updateSplitSizes: (splitId, sizes) => {
                set((state) => {
                    const newSplits = new Map(state.splits);
                    const split = newSplits.get(splitId);

                    if (split && split.children) {
                        newSplits.set(splitId, { ...split, sizes });
                    }

                    return { splits: newSplits };
                });
            },

            /**
             * Define o painel ativo
             */
            setActivePane: (splitId) => {
                set({ activePaneId: splitId });
            },

            /**
             * Move um terminal para outro painel (drag & drop)
             */
            moveTerminal: (fromSplitId, toSplitId, terminalId, sessionType) => {
                get().moveTerminalBetweenSplits(terminalId, fromSplitId, toSplitId);
            },

            // ========== GETTERS ==========

            getSplit: (splitId) => {
                return get().splits.get(splitId);
            },

            getRootSplit: () => {
                const state = get();
                return state.splits.get(state.rootSplitId);
            },

            getAllTerminalIds: () => {
                const state = get();
                const terminalIds = [];

                const traverse = (splitId) => {
                    const split = state.splits.get(splitId);
                    if (!split) return;

                    if (split.type === 'single') {
                        (split.terminalIds || []).forEach((id) => {
                            terminalIds.push({ terminalId: id });
                        });
                    } else if (split.children) {
                        split.children.forEach(traverse);
                    }
                };

                if (state.rootSplitId) {
                    traverse(state.rootSplitId);
                }

                return terminalIds;
            },

            // ========== UTILS ==========

            clear: () => {
                set({
                    splits: new Map(),
                    rootSplitId: null,
                    activePaneId: null,
                });
            },
        }),
        { name: 'SplitStore' }
    )
);

export default useSplitStore;
