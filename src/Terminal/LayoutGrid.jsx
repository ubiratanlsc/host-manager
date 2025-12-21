import { useState, useEffect } from 'react';
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    closestCenter,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import Pane from './Pane';
import useLayoutStore from '../stores/useLayoutStore';
import useTerminalStore from '../stores/useTerminalStore';
import useSSHStore from '../stores/useSSHStore';

/**
 * LayoutGrid - Grid principal com drag-and-drop estilo Termius
 * Arrasta panes inteiros, split automático nas bordas, merge no centro
 */
const LayoutGrid = () => {
    const [activeId, setActiveId] = useState(null);
    const [isDraggingPane, setIsDraggingPane] = useState(false);
    const [isDraggingTab, setIsDraggingTab] = useState(false);

    // Layout Store
    const layout = useLayoutStore(state => state.layout);
    const panes = useLayoutStore(state => state.panes);
    const splitPane = useLayoutStore(state => state.splitPane);
    const moveTerminalToPane = useLayoutStore(state => state.moveTerminalToPane);
    const setActiveTerminal = useLayoutStore(state => state.setActiveTerminal);
    const setPaneTerminalIds = useLayoutStore(state => state.setPaneTerminalIds);
    const findPaneByTerminal = useLayoutStore(state => state.findPaneByTerminal);

    // Terminal/SSH Stores
    const terminals = useTerminalStore(state => state.terminals);
    const sessions = useSSHStore(state => state.sessions);
    const saveTerminalContent = useTerminalStore(state => state.saveSerializedContent);
    const saveSSHContent = useSSHStore(state => state.saveSerializedContent);

    // Configurar sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor)
    );

    const handleDragStart = (event) => {
        const { active } = event;
        setActiveId(active.id);

        // Verificar se está arrastando um pane
        if (active.data.current?.type === 'pane') {
            setIsDraggingPane(true);
            setIsDraggingTab(false);

            // Serializar conteúdo de todos os terminais do pane
            const terminalIds = active.data.current?.terminalIds || [];
            terminalIds.forEach(terminalId => {
                if (terminals.has(terminalId)) {
                    saveTerminalContent(terminalId);
                } else if (sessions.has(terminalId)) {
                    saveSSHContent(terminalId);
                }
            });
        } else if (active.data.current?.type === 'terminal-tab') {
            setIsDraggingTab(true);
            setIsDraggingPane(false);

            // Serializar conteúdo do terminal sendo arrastado
            const terminalId = active.data.current?.terminalId;
            if (terminalId) {
                if (terminals.has(terminalId)) {
                    saveTerminalContent(terminalId);
                } else if (sessions.has(terminalId)) {
                    saveSSHContent(terminalId);
                }
            }
        }
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        setActiveId(null);
        setIsDraggingPane(false);
        setIsDraggingTab(false);

        if (!over) return;

        const activeData = active.data.current;
        const overData = over.data.current;

        // Se está arrastando um pane
        if (activeData?.type === 'pane') {
            const sourcePaneId = activeData.paneId;
            const sourceTerminalIds = activeData.terminalIds || [];

            // Se droppou em uma drop zone
            if (overData?.type === 'drop-zone') {
                const targetPaneId = overData.paneId;
                const zone = overData.zone;

                // Não fazer nada se soltar no próprio pane
                if (sourcePaneId === targetPaneId) return;

                // MERGE - Centro
                if (zone === 'center') {
                    // Mover todos os terminais do pane arrastado para o pane alvo
                    sourceTerminalIds.forEach(terminalId => {
                        moveTerminalToPane(terminalId, sourcePaneId, targetPaneId);
                    });
                    console.log(`[LayoutGrid] Merged pane ${sourcePaneId} into ${targetPaneId}`);
                }
                // SPLIT - Bordas
                else {
                    const direction = (zone === 'top' || zone === 'bottom') ? 'vertical' : 'horizontal';
                    const newPaneId = splitPane(targetPaneId, direction);

                    if (newPaneId) {
                        // Mover terminais para o novo pane
                        sourceTerminalIds.forEach(terminalId => {
                            moveTerminalToPane(terminalId, sourcePaneId, newPaneId);
                        });
                        console.log(`[LayoutGrid] Split ${direction} and moved terminals to new pane ${newPaneId}`);
                    }
                }
            }
        }

        if (activeData?.type === 'terminal-tab') {
            const activeTerminalId = activeData.terminalId;
            const sourcePaneId = activeData.paneId || findPaneByTerminal(activeTerminalId);
            if (!sourcePaneId) return;

            if (overData?.type === 'terminal-tab') {
                const targetPaneId = overData.paneId;
                const overTerminalId = overData.terminalId;

                if (!targetPaneId) return;

                if (sourcePaneId === targetPaneId) {
                    const pane = panes.get(sourcePaneId);
                    if (!pane) return;
                    const oldIndex = pane.terminalIds.indexOf(activeTerminalId);
                    const newIndex = pane.terminalIds.indexOf(overTerminalId);
                    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
                    setPaneTerminalIds(sourcePaneId, arrayMove(pane.terminalIds, oldIndex, newIndex));
                    return;
                }

                moveTerminalToPane(activeTerminalId, sourcePaneId, targetPaneId);
                const targetPane = useLayoutStore.getState().panes.get(targetPaneId);
                if (!targetPane) return;
                const nextIds = [...targetPane.terminalIds];
                const movedIndex = nextIds.indexOf(activeTerminalId);
                const overIndex = nextIds.indexOf(overTerminalId);
                if (movedIndex !== -1 && overIndex !== -1 && movedIndex !== overIndex) {
                    setPaneTerminalIds(targetPaneId, arrayMove(nextIds, movedIndex, overIndex));
                }
                setActiveTerminal(targetPaneId, activeTerminalId);
                return;
            }

            if (overData?.type === 'pane-tablist') {
                const targetPaneId = overData.paneId;
                if (!targetPaneId) return;
                if (sourcePaneId !== targetPaneId) {
                    moveTerminalToPane(activeTerminalId, sourcePaneId, targetPaneId);
                }
                setActiveTerminal(targetPaneId, activeTerminalId);
            }
        }
    };

    const handleDragCancel = () => {
        setActiveId(null);
        setIsDraggingPane(false);
    };

    // Renderizar grid baseado no layout
    const renderGrid = () => {
        if (layout.length === 0) {
            return (
                <div className="flex items-center justify-center h-full text-gray-500">
                    <p>No panes available</p>
                </div>
            );
        }

        // Calcular grid template baseado no layout
        const rows = layout.length;
        const maxCols = Math.max(...layout.map(row => row.filter(id => id !== null).length));

        return (
            <div
                className="h-full grid gap-2 p-2"
                style={{
                    gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
                    gridTemplateColumns: `repeat(${maxCols}, minmax(0, 1fr))`,
                }}
            >
                {layout.map((row, rowIndex) =>
                    row.map((paneId, colIndex) => {
                        if (!paneId) return null;

                        return (
                            <div
                                key={paneId}
                                style={{
                                    gridRow: rowIndex + 1,
                                    gridColumn: colIndex + 1,
                                }}
                            >
                                <Pane paneId={paneId} />
                            </div>
                        );
                    })
                )}
            </div>
        );
    };

    // Obter label do pane sendo arrastado
    const getActivePaneLabel = () => {
        if (!activeId || !isDraggingPane) return null;

        const pane = panes.get(activeId);
        if (!pane || !pane.activeTerminalId) return 'Empty Pane';

        const terminal = terminals.get(pane.activeTerminalId);
        const session = sessions.get(pane.activeTerminalId);

        if (terminal) return terminal.shell?.name || 'Terminal';
        if (session) return `${session.config.username}@${session.config.host}`;
        return 'Terminal';
    };

    const getActiveTabLabel = () => {
        if (!activeId || !isDraggingTab) return null;
        const terminal = terminals.get(activeId);
        if (terminal) return terminal.shell?.name || 'Terminal';

        const session = sessions.get(activeId);
        if (session) return session.title || 'SSH';
        return 'Terminal';
    };

    const activePaneLabel = getActivePaneLabel();
    const activeTabLabel = getActiveTabLabel();

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            {renderGrid()}

            {/* DragOverlay para panes */}
            <DragOverlay>
                {isDraggingPane && activePaneLabel ? (
                    <div className="bg-[#2C2D32] border-2 border-blue-500 rounded-lg p-4 shadow-2xl opacity-80">
                        <p className="text-sm text-gray-300">{activePaneLabel}</p>
                    </div>
                ) : null}
                {isDraggingTab && activeTabLabel ? (
                    <div className="bg-[#2C2D32] border border-gray-700 rounded-md px-3 py-2 shadow-2xl opacity-90">
                        <p className="text-sm text-gray-200 truncate max-w-[240px]">{activeTabLabel}</p>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};

export default LayoutGrid;
