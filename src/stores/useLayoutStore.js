import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

/**
 * useLayoutStore - Gerencia o layout de panes e a distribuição de terminais
 * 
 * Estrutura:
 * - panes: Map de panes, cada um contendo terminais/SSH sessions
 * - layout: Array 2D representando o grid (ex: [['pane1', 'pane2'], ['pane3', 'pane4']])
 * - activePane: ID do pane atualmente focado
 */
const useLayoutStore = create((set, get) => ({
    // Estado
    panes: new Map(), // Map<paneId, Pane>
    layout: [], // string[][] - Grid layout
    activePane: null,

    /**
     * Inicializa o layout com o primeiro pane
     */
    initializeLayout: () => {
        const firstPaneId = uuidv4();
        const firstPane = {
            id: firstPaneId,
            terminalIds: [],
            activeTerminalId: null,
        };

        set({
            panes: new Map([[firstPaneId, firstPane]]),
            layout: [[firstPaneId]],
            activePane: firstPaneId,
        });

        return firstPaneId;
    },

    /**
     * Adiciona um terminal a um pane específico
     */
    addTerminalToPane: (paneId, terminalId) => {
        const { panes } = get();
        const pane = panes.get(paneId);

        if (!pane) {
            console.error(`[LayoutStore] Pane ${paneId} not found`);
            return;
        }

        const updatedPane = {
            ...pane,
            terminalIds: [...pane.terminalIds, terminalId],
            activeTerminalId: pane.activeTerminalId || terminalId, // Se não tem ativo, este se torna ativo
        };

        const newPanes = new Map(panes);
        newPanes.set(paneId, updatedPane);

        set({ panes: newPanes });
    },

    /**
     * Remove um terminal de um pane
     */
    removeTerminalFromPane: (paneId, terminalId) => {
        const { panes } = get();
        const pane = panes.get(paneId);

        if (!pane) return;

        const newTerminalIds = pane.terminalIds.filter(id => id !== terminalId);
        const newActiveId = pane.activeTerminalId === terminalId
            ? newTerminalIds[0] || null
            : pane.activeTerminalId;

        const updatedPane = {
            ...pane,
            terminalIds: newTerminalIds,
            activeTerminalId: newActiveId,
        };

        const newPanes = new Map(panes);
        newPanes.set(paneId, updatedPane);

        set({ panes: newPanes });

        // Se o pane ficou vazio, considerar removê-lo
        if (newTerminalIds.length === 0) {
            get().removePane(paneId);
        }
    },

    /**
     * Move um terminal de um pane para outro
     */
    moveTerminalToPane: (terminalId, fromPaneId, toPaneId) => {
        if (fromPaneId === toPaneId) return;

        const { removeTerminalFromPane, addTerminalToPane } = get();

        removeTerminalFromPane(fromPaneId, terminalId);
        addTerminalToPane(toPaneId, terminalId);
    },

    setPaneTerminalIds: (paneId, terminalIds) => {
        const { panes } = get();
        const pane = panes.get(paneId);
        if (!pane) return;

        const nextTerminalIds = terminalIds.filter(Boolean);
        const nextActiveTerminalId = nextTerminalIds.includes(pane.activeTerminalId)
            ? pane.activeTerminalId
            : nextTerminalIds[0] || null;

        const updatedPane = {
            ...pane,
            terminalIds: nextTerminalIds,
            activeTerminalId: nextActiveTerminalId,
        };

        const newPanes = new Map(panes);
        newPanes.set(paneId, updatedPane);
        set({ panes: newPanes });
    },

    /**
     * Define o terminal ativo em um pane
     */
    setActiveTerminal: (paneId, terminalId) => {
        const { panes } = get();
        const pane = panes.get(paneId);

        if (!pane || !pane.terminalIds.includes(terminalId)) return;

        const updatedPane = {
            ...pane,
            activeTerminalId: terminalId,
        };

        const newPanes = new Map(panes);
        newPanes.set(paneId, updatedPane);

        set({
            panes: newPanes,
            activePane: paneId,
        });
    },

    /**
     * Define o pane ativo
     */
    setActivePane: (paneId) => {
        set({ activePane: paneId });
    },

    /**
     * Divide um pane (split horizontal ou vertical)
     */
    splitPane: (paneId, direction = 'horizontal') => {
        const { panes, layout } = get();
        const newPaneId = uuidv4();
        const newPane = {
            id: newPaneId,
            terminalIds: [],
            activeTerminalId: null,
        };

        // Adicionar novo pane ao Map
        const newPanes = new Map(panes);
        newPanes.set(newPaneId, newPane);

        // Atualizar layout
        let newLayout = [...layout];
        let found = false;

        if (direction === 'horizontal') {
            // Split horizontal: adiciona nova coluna ao lado
            for (let i = 0; i < newLayout.length; i++) {
                const rowIndex = newLayout[i].indexOf(paneId);
                if (rowIndex !== -1) {
                    newLayout[i] = [...newLayout[i]];
                    newLayout[i].splice(rowIndex + 1, 0, newPaneId);
                    found = true;
                    break;
                }
            }
        } else {
            // Split vertical: adiciona nova linha abaixo
            for (let i = 0; i < newLayout.length; i++) {
                const rowIndex = newLayout[i].indexOf(paneId);
                if (rowIndex !== -1) {
                    // Criar nova linha com o mesmo número de colunas
                    const newRow = new Array(newLayout[i].length).fill(null);
                    newRow[rowIndex] = newPaneId;
                    newLayout.splice(i + 1, 0, newRow);
                    found = true;
                    break;
                }
            }
        }

        if (found) {
            set({
                panes: newPanes,
                layout: newLayout,
                activePane: newPaneId,
            });
        }

        return newPaneId;
    },

    /**
     * Cria um novo pane com um terminal (para abrir cada terminal em nova aba)
     */
    createPaneWithTerminal: (terminalId) => {
        const { panes, layout } = get();
        const newPaneId = uuidv4();
        const newPane = {
            id: newPaneId,
            terminalIds: [terminalId],
            activeTerminalId: terminalId,
        };

        // Adicionar novo pane ao Map
        const newPanes = new Map(panes);
        newPanes.set(newPaneId, newPane);

        // Adicionar ao layout (sempre adiciona na última linha como nova coluna)
        let newLayout = [...layout];

        if (newLayout.length === 0) {
            // Primeiro pane
            newLayout = [[newPaneId]];
        } else {
            // Adicionar como nova coluna na última linha
            const lastRowIndex = newLayout.length - 1;
            newLayout[lastRowIndex] = [...newLayout[lastRowIndex], newPaneId];
        }

        set({
            panes: newPanes,
            layout: newLayout,
            activePane: newPaneId,
        });

        console.log(`[LayoutStore] Created new pane ${newPaneId} with terminal ${terminalId}`);
        return newPaneId;
    },

    /**
     * Remove um pane do layout
     */
    removePane: (paneId) => {
        const { panes, layout } = get();

        // Não permitir remover o último pane
        if (panes.size <= 1) {
            console.warn('[LayoutStore] Cannot remove the last pane');
            return;
        }

        // Remover do Map
        const newPanes = new Map(panes);
        newPanes.delete(paneId);

        // Remover do layout
        let newLayout = layout.map(row => row.filter(id => id !== paneId))
            .filter(row => row.length > 0); // Remover linhas vazias

        // Se o layout ficou vazio, criar um novo pane
        if (newLayout.length === 0) {
            const newPaneId = uuidv4();
            newPanes.set(newPaneId, {
                id: newPaneId,
                terminalIds: [],
                activeTerminalId: null,
            });
            newLayout = [[newPaneId]];
        }

        set({
            panes: newPanes,
            layout: newLayout,
            activePane: newLayout[0]?.[0] || null,
        });
    },

    /**
     * Obtém todos os terminais de um pane
     */
    getPaneTerminals: (paneId) => {
        const { panes } = get();
        return panes.get(paneId)?.terminalIds || [];
    },

    /**
     * Obtém o terminal ativo de um pane
     */
    getPaneActiveTerminal: (paneId) => {
        const { panes } = get();
        return panes.get(paneId)?.activeTerminalId || null;
    },

    /**
     * Encontra o pane que contém um terminal
     */
    findPaneByTerminal: (terminalId) => {
        const { panes } = get();
        for (const [paneId, pane] of panes.entries()) {
            if (pane.terminalIds.includes(terminalId)) {
                return paneId;
            }
        }
        return null;
    },

    /**
     * Limpa todo o layout (útil para reset)
     */
    clearLayout: () => {
        set({
            panes: new Map(),
            layout: [],
            activePane: null,
        });
    },
}));

export default useLayoutStore;
