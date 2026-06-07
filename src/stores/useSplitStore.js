import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

const splitStorage = {
    getItem: (name) => {
        const raw = sessionStorage.getItem(name);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        parsed.state.splits = new Map(Object.entries(parsed.state.splits || {}));
        return parsed;
    },
    setItem: (name, value) => {
        const toSave = {
            ...value,
            state: {
                ...value.state,
                splits: Object.fromEntries(value.state.splits),
            },
        };
        sessionStorage.setItem(name, JSON.stringify(toSave));
    },
    removeItem: (name) => sessionStorage.removeItem(name),
};

/**
 * Split Store - Gerencia divisões de terminais (split panes)
 */

const useSplitStore = create(
    devtools(
        persist(
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

                    // Se o terminal já existe em algum split, apenas ativa esse split
                    const existingSplitId = get().findSplitByTerminal(terminalId);
                    if (existingSplitId) {
                        set({ activePaneId: existingSplitId });
                        return existingSplitId;
                    }

                    const activeSplitId = state.activePaneId;

                    // Se não houver split ativo ou inválido
                    if (!activeSplitId || !state.splits.has(activeSplitId)) {
                        // Tenta encontrar o primeiro split 'single' disponível
                        const firstLeafId = Array.from(state.splits.values()).find(s => s.type === 'single')?.id;
                        if (firstLeafId) {
                            get().setActivePane(firstLeafId);
                            // Chama recursivamente com o novo ID ativo
                            return get().addTerminalToActivePane(terminalId);
                        }
                        // Se não houver nenhum, inicializa
                        return get().initializeWithTerminal(terminalId);
                    }

                    const activeSplit = state.splits.get(activeSplitId);
                    if (!activeSplit || activeSplit.type !== 'single') {
                        // Se o ativo não for single, tenta encontrar um single
                        const firstLeafId = Array.from(state.splits.values()).find(s => s.type === 'single')?.id;
                        if (firstLeafId) {
                            get().setActivePane(firstLeafId);
                            return get().addTerminalToActivePane(terminalId);
                        }
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
            splitPane: (splitId, direction, newTerminalId, position, sessionType = 'terminal') => {
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

                const existingTerminalIds = (existingSplit.terminalIds || []).filter(id => id !== newTerminalId);
                let existingActiveTerminalId = existingSplit.activeTerminalId;
                if (existingActiveTerminalId === newTerminalId || !existingTerminalIds.includes(existingActiveTerminalId)) {
                    existingActiveTerminalId = existingTerminalIds[0] || null;
                }

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

                const placeFirst = (position === 'top' && direction === 'vertical')
                    || (position === 'left' && direction === 'horizontal');

                // Atualizar o split existente para container
                const updatedSplit = {
                    id: splitId,
                    type: direction,
                    children: placeFirst ? [newSplit2Id, newSplit1Id] : [newSplit1Id, newSplit2Id],
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

            splitPaneWithPane: (targetSplitId, direction, sourceSplitId, position) => {
                const state = get();
                const targetSplit = state.splits.get(targetSplitId);
                const sourceSplit = state.splits.get(sourceSplitId);
                if (!targetSplit || targetSplit.type !== 'single') return null;
                if (!sourceSplit || sourceSplit.type !== 'single') return null;
                if (targetSplitId === sourceSplitId) return null;

                const newTargetLeafId = uuidv4();
                const newSourceLeafId = uuidv4();

                const targetLeaf = {
                    id: newTargetLeafId,
                    type: 'single',
                    terminalIds: targetSplit.terminalIds || [],
                    activeTerminalId: targetSplit.activeTerminalId || targetSplit.terminalIds?.[0] || null,
                };

                const sourceLeaf = {
                    id: newSourceLeafId,
                    type: 'single',
                    terminalIds: sourceSplit.terminalIds || [],
                    activeTerminalId: sourceSplit.activeTerminalId || sourceSplit.terminalIds?.[0] || null,
                };

                const placeSourceFirst = (position === 'top' && direction === 'vertical')
                    || (position === 'left' && direction === 'horizontal');

                const updatedSplit = {
                    id: targetSplitId,
                    type: direction,
                    children: placeSourceFirst ? [newSourceLeafId, newTargetLeafId] : [newTargetLeafId, newSourceLeafId],
                    sizes: [50, 50],
                };

                set((state) => {
                    const newSplits = new Map(state.splits);
                    newSplits.set(targetSplitId, updatedSplit);
                    newSplits.set(newTargetLeafId, targetLeaf);
                    newSplits.set(newSourceLeafId, sourceLeaf);

                    const parentByChild = new Map();
                    const buildParents = (nodeId) => {
                        const node = newSplits.get(nodeId);
                        if (!node?.children) return;
                        for (const childId of node.children) {
                            parentByChild.set(childId, nodeId);
                            buildParents(childId);
                        }
                    };
                    if (state.rootSplitId) {
                        buildParents(state.rootSplitId);
                    }

                    const parentId = parentByChild.get(sourceSplitId);
                    if (!parentId) {
                        return {
                            splits: newSplits,
                            activePaneId: newSourceLeafId,
                        };
                    }

                    const parent = newSplits.get(parentId);
                    const siblingId = parent?.children?.find((id) => id !== sourceSplitId);
                    const grandParentId = parentByChild.get(parentId);

                    newSplits.delete(sourceSplitId);
                    if (parentId !== targetSplitId) {
                        newSplits.delete(parentId);
                    }

                    if (!siblingId) {
                        return {
                            splits: newSplits,
                            activePaneId: newSourceLeafId,
                        };
                    }

                    if (!grandParentId) {
                        return {
                            splits: newSplits,
                            rootSplitId: siblingId,
                            activePaneId: newSourceLeafId,
                        };
                    }

                    const grandParent = newSplits.get(grandParentId);
                    if (grandParent?.children) {
                        const nextChildren = grandParent.children.map((id) => (id === parentId ? siblingId : id));
                        newSplits.set(grandParentId, { ...grandParent, children: nextChildren });
                    }

                    return {
                        splits: newSplits,
                        activePaneId: newSourceLeafId,
                    };
                });

                return newSourceLeafId;
            },

            /**
             * Fecha um painel
             * @param {string} splitId - ID do split a fechar
             */
            closePane: (splitId) => {
                set((state) => {
                    const existing = state.splits.get(splitId);
                    if (!existing) return state;

                    // Se for o root e único, limpar tudo
                    if (splitId === state.rootSplitId && state.splits.size === 1) {
                        return {
                            splits: new Map(),
                            rootSplitId: null,
                            activePaneId: null,
                        };
                    }

                    const newSplits = new Map(state.splits);

                    const parentByChild = new Map();
                    const buildParents = (nodeId) => {
                        const node = newSplits.get(nodeId);
                        if (!node?.children) return;
                        for (const childId of node.children) {
                            parentByChild.set(childId, nodeId);
                            buildParents(childId);
                        }
                    };
                    if (state.rootSplitId) {
                        buildParents(state.rootSplitId);
                    }

                    const parentId = parentByChild.get(splitId);
                    if (!parentId) {
                        console.error(`[SplitStore] Pai de ${splitId} não encontrado`);
                        return state;
                    }

                    const parent = newSplits.get(parentId);
                    if (!parent?.children) return state;

                    const siblingId = parent.children.find((id) => id !== splitId);
                    if (!siblingId) return state;

                    const grandParentId = parentByChild.get(parentId);

                    newSplits.delete(splitId);
                    newSplits.delete(parentId);

                    if (!grandParentId) {
                        return {
                            splits: newSplits,
                            rootSplitId: siblingId,
                            activePaneId: siblingId,
                        };
                    }

                    const grandParent = newSplits.get(grandParentId);
                    if (!grandParent?.children) {
                        console.error(`[SplitStore] Avô de ${parentId} não encontrado`);
                        return state;
                    }

                    const nextChildren = grandParent.children.map((id) => (id === parentId ? siblingId : id));
                    newSplits.set(grandParentId, { ...grandParent, children: nextChildren });

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

            resetLayout: () => {
                sessionStorage.removeItem('split-layout');
                set({
                    splits: new Map(),
                    rootSplitId: null,
                    activePaneId: null,
                });
                window.dispatchEvent(new Event('terminal:relayout'));
            },
        }),
        {
            name: 'split-layout',
            storage: splitStorage,
            partialize: (state) => ({
                splits: state.splits,
                rootSplitId: state.rootSplitId,
                activePaneId: state.activePaneId,
            }),
        }
    )
    )
);

export default useSplitStore;
