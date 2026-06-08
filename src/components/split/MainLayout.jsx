import { useEffect, useMemo, useRef } from 'react';
import { useTerminalStore, useSSHStore, useSplitStore } from '@/stores';
import SplitPane from './SplitPane';

/**
 * MainLayout - View principal que renderiza terminais locais e SSH
 * Agora usa o sistema de layout com drag-and-drop e splits (Termius style)
 */
const MainLayout = () => {
    // Terminal Store
    const terminalsMap = useTerminalStore((state) => state.terminals);

    // SSH Store
    const sessionsMap = useSSHStore((state) => state.sessions);

    // Split Store
    const activePaneId = useSplitStore((state) => state.activePaneId);
    const addTerminalToActivePane = useSplitStore((state) => state.addTerminalToActivePane);
    const findSplitByTerminal = useSplitStore((state) => state.findSplitByTerminal);
    const removeTerminalFromSplit = useSplitStore((state) => state.removeTerminalFromSplit);
    const initializeWithTerminal = useSplitStore((state) => state.initializeWithTerminal);
    const rootSplitId = useSplitStore((state) => state.rootSplitId);
    const collapseToSingle = useSplitStore((state) => state.collapseToSingle);

    // Memoized arrays
    const terminals = useMemo(() => Array.from(terminalsMap.values()), [terminalsMap]);
    const sessions = useMemo(() => Array.from(sessionsMap.values()), [sessionsMap]);

    const prevTerminalIdsRef = useRef(new Set());
    const prevSessionIdsRef = useRef(new Set());

    const setFocusedTerminal = useTerminalStore((state) => state.setFocused);
    const setFocusedSession = useSSHStore((state) => state.setFocused);

    /**
     * Sincronizar terminais com o layout de splits
     */
    useEffect(() => {
        const currentTerminalIds = new Set(terminals.map((t) => t.id));
        const currentSessionIds = new Set(sessions.map((s) => s.id));

        const prevTerminalIds = prevTerminalIdsRef.current;
        const prevSessionIds = prevSessionIdsRef.current;

        const newTerminalIds = Array.from(currentTerminalIds).filter((id) => !prevTerminalIds.has(id));
        const newSessionIds = Array.from(currentSessionIds).filter((id) => !prevSessionIds.has(id));

        const removedTerminalIds = Array.from(prevTerminalIds).filter((id) => !currentTerminalIds.has(id));
        const removedSessionIds = Array.from(prevSessionIds).filter((id) => !currentSessionIds.has(id));

        // Adicionar novos terminais/sessões
        const addNewIdToLayout = (id, kind) => {
            const store = useSplitStore.getState();
            const root = store.splits.get(store.rootSplitId);

            // Se estiver em split, colapsa para mostrar o novo terminal full screen
            if (root && root.type !== 'single') {
                collapseToSingle(id);
            } else if (!rootSplitId && !store.rootSplitId) {
                initializeWithTerminal(id);
            } else {
                addTerminalToActivePane(id);
            }

            if (kind === 'terminal') setFocusedTerminal(id);
            if (kind === 'ssh') setFocusedSession(id);
        };

        newTerminalIds.forEach((id) => addNewIdToLayout(id, 'terminal'));
        newSessionIds.forEach((id) => addNewIdToLayout(id, 'ssh'));

        // Remover terminais/sessões fechados
        const pruneIdFromLayout = (id) => {
            const splitId = findSplitByTerminal(id);
            if (!splitId) return;
            removeTerminalFromSplit(splitId, id);
        };

        removedTerminalIds.forEach(pruneIdFromLayout);
        removedSessionIds.forEach(pruneIdFromLayout);

        prevTerminalIdsRef.current = currentTerminalIds;
        prevSessionIdsRef.current = currentSessionIds;
    }, [
        terminals,
        sessions,
        addTerminalToActivePane,
        findSplitByTerminal,
        removeTerminalFromSplit,
        initializeWithTerminal,
        rootSplitId,
        setFocusedTerminal,
        setFocusedSession
    ]);

    return <SplitPane />;
};

export default MainLayout;
