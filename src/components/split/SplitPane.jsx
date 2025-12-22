import { useEffect, useMemo, useState } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { cn } from '@/lib/utils';
import useSplitStore from '../../stores/useSplitStore';
import useTerminalStore from '../../stores/useTerminalStore';
import useSSHStore from '../../stores/useSSHStore';
import Pane from '../../Terminal/Pane';
import {
    DndContext,
    PointerSensor,
    DragOverlay,
    useSensor,
    useSensors,
    closestCenter,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

/**
 * Custom Resize Handle - Barra de redimensionamento personalizada
 */
const CustomResizeHandle = ({ direction }) => {
    return (
        <ResizableHandle
            className={cn(
                "group relative flex items-center justify-center bg-gray-800 hover:bg-green-500/20 transition-colors",
                direction === 'vertical' ? "h-1 w-full cursor-row-resize" : "w-1 h-full cursor-col-resize"
            )}
        >
            <div className={cn(
                "absolute bg-gray-600 group-hover:bg-green-500 transition-colors rounded-full",
                direction === 'vertical' ? "w-8 h-1" : "h-8 w-1"
            )} />
        </ResizableHandle>
    );
};

/**
 * Split Pane Renderer - Renderiza recursivamente a árvore de splits
 */
const SplitPaneRenderer = ({ splitId }) => {
    const split = useSplitStore((state) => state.getSplit(splitId));
    const updateSplitSizes = useSplitStore((state) => state.updateSplitSizes);

    if (!split) return null;

    // Painel único (folha)
    if (split.type === 'single') {
        return <Pane paneId={splitId} />;
    }

    // Container com filhos
    const defaultSizes = split.sizes || [50, 50];

    return (
        <ResizablePanelGroup
            direction={split.type}
            onLayout={(sizes) => {
                updateSplitSizes(splitId, sizes);
                window.dispatchEvent(new Event('terminal:relayout'));
            }}
            className="w-full h-full"
        >
            <ResizablePanel className="z-[10000] overflow-hidden" defaultSize={defaultSizes[0]} minSize={10}>
                <SplitPaneRenderer splitId={split.children[0]} />
            </ResizablePanel>

            <CustomResizeHandle direction={split.type} />

            <ResizablePanel className="z-[10002] overflow-hidden" defaultSize={defaultSizes[1]} minSize={10}>
                <SplitPaneRenderer splitId={split.children[1]} />
            </ResizablePanel>
        </ResizablePanelGroup>
    );
};

/**
 * Split Pane Container - Componente principal
 */
const SplitPane = () => {
    const rootSplitId = useSplitStore((state) => state.rootSplitId);
    const initializeWithTerminal = useSplitStore((state) => state.initializeWithTerminal);
    const terminals = useTerminalStore((state) => state.terminals);
    const sessions = useSSHStore((state) => state.sessions);
    const moveTerminalBetweenSplits = useSplitStore((state) => state.moveTerminalBetweenSplits);
    const mergePane = useSplitStore((state) => state.mergePane);
    const splitPaneWithPane = useSplitStore((state) => state.splitPaneWithPane);
    const splitPane = useSplitStore((state) => state.splitPane);
    const removeTerminalFromSplit = useSplitStore((state) => state.removeTerminalFromSplit);
    const setSplitTerminalIds = useSplitStore((state) => state.setSplitTerminalIds);
    const setActiveTerminal = useSplitStore((state) => state.setActiveTerminal);
    const findSplitByTerminal = useSplitStore((state) => state.findSplitByTerminal);

    // DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    const [activeDrag, setActiveDrag] = useState(null);

    const dragOverlay = useMemo(() => {
        const data = activeDrag?.data?.current;
        if (!data) return null;

        if (data.type === 'pane') {
            const ids = data.terminalIds || [];
            const label = ids.length === 1 ? '1 tab' : `${ids.length} tabs`;
            return (
                <div className="w-[360px] max-w-[70vw] rounded-lg border-2 border-blue-500 bg-[#25262B] shadow-xl overflow-hidden">
                    <div className="h-10 px-3 flex items-center gap-2 border-b border-gray-800 bg-[#2C2D32]">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        <span className="text-sm text-gray-200">{label}</span>
                    </div>
                    <div className="h-[220px] bg-[#1A1B1E]" />
                </div>
            );
        }

        if (data.type === 'terminal-tab') {
            return (
                <div className="rounded-md border border-gray-700 bg-[#25262B] px-3 py-1 text-sm text-gray-100 shadow-lg">
                    {data.terminalId}
                </div>
            );
        }

        return null;
    }, [activeDrag]);

    // NOTA: Inicialização de terminais é feita pelo MainTerminalView.jsx
    // Não duplicar aqui para evitar race conditions

    if (!rootSplitId) {
        return (
            <div className="flex items-center justify-center w-full h-full bg-[#1A1B1E] text-gray-500">
                <div className="flex flex-col items-center gap-4">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-lg">Nenhum terminal aberto</p>
                    <p className="text-sm text-gray-600">Crie um novo terminal para começar</p>
                </div>
            </div>
        );
    }

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveDrag(null);
        if (!over) return;

        const activeData = active.data?.current;
        const overData = over.data?.current;

        const saveTerminalSnapshot = (terminalId) => {
            if (useTerminalStore.getState().terminals.has(terminalId)) {
                window.dispatchEvent(new CustomEvent('terminal:snapshot', { detail: { kind: 'pty', id: terminalId } }));
            } else if (useSSHStore.getState().sessions.has(terminalId)) {
                window.dispatchEvent(new CustomEvent('terminal:snapshot', { detail: { kind: 'ssh', id: terminalId } }));
            }
        };

        if (activeData?.type === 'pane' && overData?.type === 'drop-zone') {
            const sourceSplitId = activeData.paneId;
            const targetSplitId = overData.paneId;
            const zone = overData.zone;

            if (sourceSplitId === targetSplitId) return;

            if (zone === 'center') {
                (activeData.terminalIds || []).forEach(saveTerminalSnapshot);
                mergePane(sourceSplitId, targetSplitId);
                window.dispatchEvent(new Event('terminal:relayout'));
                return;
            }

            const direction = (zone === 'top' || zone === 'bottom') ? 'vertical' : 'horizontal';
            (activeData.terminalIds || []).forEach(saveTerminalSnapshot);
            splitPaneWithPane(targetSplitId, direction, sourceSplitId, zone);
            window.dispatchEvent(new Event('terminal:relayout'));
            return;
        }

        if (activeData?.type === 'terminal-tab') {
            const activeTerminalId = activeData.terminalId;
            const sourceSplitId = activeData.paneId || findSplitByTerminal(activeTerminalId);
            if (!sourceSplitId) return;

            if (overData?.type === 'drop-zone') {
                const targetSplitId = overData.paneId;
                const zone = overData.zone;
                if (!targetSplitId) return;

                if (zone === 'center') {
                    if (sourceSplitId !== targetSplitId) {
                        saveTerminalSnapshot(activeTerminalId);
                        moveTerminalBetweenSplits(activeTerminalId, sourceSplitId, targetSplitId);
                    }
                    setActiveTerminal(targetSplitId, activeTerminalId);
                    window.dispatchEvent(new Event('terminal:relayout'));
                    return;
                }

                const direction = (zone === 'top' || zone === 'bottom') ? 'vertical' : 'horizontal';
                const sourceSplit = useSplitStore.getState().splits.get(sourceSplitId);
                const sourceIds = sourceSplit?.terminalIds || [];
                if (sourceSplitId === targetSplitId && sourceIds.length === 1) return;

                saveTerminalSnapshot(activeTerminalId);
                removeTerminalFromSplit(sourceSplitId, activeTerminalId);
                const newLeafId = splitPane(targetSplitId, direction, activeTerminalId, zone);
                if (newLeafId) {
                    setActiveTerminal(newLeafId, activeTerminalId);
                }
                window.dispatchEvent(new Event('terminal:relayout'));
                return;
            }

            if (overData?.type === 'terminal-tab') {
                const targetSplitId = overData.paneId;
                const overTerminalId = overData.terminalId;

                if (!targetSplitId) return;

                if (sourceSplitId === targetSplitId) {
                    const sourceSplit = useSplitStore.getState().splits.get(sourceSplitId);
                    const ids = sourceSplit?.terminalIds || [];
                    const oldIndex = ids.indexOf(activeTerminalId);
                    const newIndex = ids.indexOf(overTerminalId);
                    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
                    setSplitTerminalIds(sourceSplitId, arrayMove(ids, oldIndex, newIndex));
                    window.dispatchEvent(new Event('terminal:relayout'));
                    return;
                }

                saveTerminalSnapshot(activeTerminalId);
                moveTerminalBetweenSplits(activeTerminalId, sourceSplitId, targetSplitId);
                const targetSplit = useSplitStore.getState().splits.get(targetSplitId);
                const nextIds = targetSplit?.terminalIds || [];
                const movedIndex = nextIds.indexOf(activeTerminalId);
                const overIndex = nextIds.indexOf(overTerminalId);
                if (movedIndex !== -1 && overIndex !== -1 && movedIndex !== overIndex) {
                    setSplitTerminalIds(targetSplitId, arrayMove(nextIds, movedIndex, overIndex));
                }
                setActiveTerminal(targetSplitId, activeTerminalId);
                window.dispatchEvent(new Event('terminal:relayout'));
                return;
            }

            if (overData?.type === 'pane-tablist') {
                const targetSplitId = overData.paneId;
                if (!targetSplitId) return;
                if (sourceSplitId !== targetSplitId) {
                    saveTerminalSnapshot(activeTerminalId);
                    moveTerminalBetweenSplits(activeTerminalId, sourceSplitId, targetSplitId);
                }
                setActiveTerminal(targetSplitId, activeTerminalId);
                window.dispatchEvent(new Event('terminal:relayout'));
            }
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={(event) => setActiveDrag(event.active)}
            onDragCancel={() => setActiveDrag(null)}
            onDragEnd={handleDragEnd}
        >
            <div className="w-full h-full">
                <SplitPaneRenderer splitId={rootSplitId} />
            </div>
            <DragOverlay>
                {dragOverlay}
            </DragOverlay>
        </DndContext>
    );
};

export default SplitPane;
