import React, { useEffect } from 'react';
import { useDroppable, useDraggable, useDndContext } from '@dnd-kit/core';
import { GripVertical, X } from 'lucide-react';
import LocalTerminal from '../terminals/LocalTerminal';
import SSHTerminal from '../terminals/SSHTerminal';
import { useSplitStore, useTerminalStore, useSSHStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Pane - Container de terminal. Suporta cabeçalho arrastável (em split) e zonas de drop para divisão.
 */
const Pane = ({ tabId, paneId, terminalId, isSplitLayout }) => {
    const { active } = useDndContext();
    const isDraggingTab = active?.data?.current?.type === 'terminal-tab';
    const isDraggingPane = active?.data?.current?.type === 'pane';
    const showDropZones = isDraggingTab || isDraggingPane;

    const terminals = useTerminalStore((s) => s.terminals);
    const sessions = useSSHStore((s) => s.sessions);
    const killPty = useTerminalStore((s) => s.killPty);
    const killSSH = useSSHStore((s) => s.killSSH);

    const activeTab = useSplitStore((s) => s.getActiveTab());
    const closePaneInSplit = useSplitStore((s) => s.closePaneInSplit);
    const setActivePaneInTab = useSplitStore((s) => s.setActivePaneInTab);

    const isFocusedPane = activeTab?.type === 'split' && activeTab.activePaneId === paneId;

    // Resolve name/title of terminal
    const terminal = terminals.get(terminalId);
    const session = sessions.get(terminalId);
    const name = terminal
        ? (terminal.shell?.name || 'Terminal')
        : session
            ? (session.title || (session.config ? `${session.config.username}@${session.config.host}` : 'SSH'))
            : 'Terminal';

    // Sincronizar foco global do xterm quando o painel fica ativo
    useEffect(() => {
        if ((!isSplitLayout || isFocusedPane) && terminalId) {
            const timer = setTimeout(() => {
                if (useTerminalStore.getState().terminals.has(terminalId)) {
                    useTerminalStore.getState().setFocused(terminalId);
                } else if (useSSHStore.getState().sessions.has(terminalId)) {
                    useSSHStore.getState().setFocused(terminalId);
                }
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isFocusedPane, isSplitLayout, terminalId]);

    // Draggable hook para o cabeçalho do painel
    const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
        id: `pane-drag-${paneId}`,
        data: {
            type: 'pane',
            tabId,
            paneId,
            terminalId,
            label: name,
        },
        disabled: !isSplitLayout,
    });

    // Drop zones para divisão
    const { setNodeRef: setDropCenterRef, isOver: isOverCenter } = useDroppable({
        id: `${paneId}-center`,
        data: { type: 'drop-zone', zone: 'center', paneId },
    });

    const { setNodeRef: setDropTopRef, isOver: isOverTop } = useDroppable({
        id: `${paneId}-top`,
        data: { type: 'drop-zone', zone: 'top', paneId },
    });

    const { setNodeRef: setDropBottomRef, isOver: isOverBottom } = useDroppable({
        id: `${paneId}-bottom`,
        data: { type: 'drop-zone', zone: 'bottom', paneId },
    });

    const { setNodeRef: setDropLeftRef, isOver: isOverLeft } = useDroppable({
        id: `${paneId}-left`,
        data: { type: 'drop-zone', zone: 'left', paneId },
    });

    const { setNodeRef: setDropRightRef, isOver: isOverRight } = useDroppable({
        id: `${paneId}-right`,
        data: { type: 'drop-zone', zone: 'right', paneId },
    });

    const handleClose = async (e) => {
        e.stopPropagation();
        closePaneInSplit(tabId, paneId);
        if (terminals.has(terminalId)) {
            await killPty(terminalId);
        } else if (sessions.has(terminalId)) {
            await killSSH(terminalId);
        }
    };

    const style = transform
        ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.5 : 1 }
        : undefined;

    return (
        <div
            onClick={() => isSplitLayout && setActivePaneInTab(tabId, paneId)}
            className={cn(
                "relative flex flex-col h-full overflow-hidden transition-colors duration-150 bg-[#1A1B1E]",
                isSplitLayout && "border dark:border-[#2C2D32]/80 border-gray-300",
                isFocusedPane && isSplitLayout && "border-blue-500/80 ring-1 ring-blue-500/20"
            )}
            style={style}
        >
            {/* Slim Premium Header for split layouts */}
            {isSplitLayout && (
                <div
                    ref={setDragRef}
                    className="h-7 flex items-center justify-between px-2 bg-[#202124] border-b dark:border-gray-900 border-gray-300 text-gray-400 select-none text-[11px] font-semibold flex-shrink-0"
                >
                    <div className="flex items-center gap-1.5 truncate">
                        <div
                            {...attributes}
                            {...listeners}
                            className="cursor-grab active:cursor-grabbing hover:text-gray-200 p-0.5"
                        >
                            <GripVertical className="h-3 w-3 flex-shrink-0" />
                        </div>
                        <span className="truncate">{name}</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 hover:bg-destructive/20 hover:text-destructive p-0 flex items-center justify-center transition-colors"
                        onClick={handleClose}
                    >
                        <X className="h-2.5 w-2.5" />
                    </Button>
                </div>
            )}

            {/* Terminal area */}
            <div className="flex-1 relative overflow-hidden">
                <div className="absolute inset-0">
                    {terminal && <LocalTerminal terminalId={terminalId} />}
                    {session && <SSHTerminal sessionId={terminalId} />}
                </div>

                {/* Split Drop Zones */}
                {showDropZones && (
                    <div className="absolute inset-0 z-50 pointer-events-none grid grid-cols-[25%_1fr_25%] grid-rows-[25%_1fr_25%] transition-opacity duration-200">
                        {/* Top Zone */}
                        <div
                            ref={setDropTopRef}
                            className={cn(
                                "col-start-1 col-end-4 row-start-1 border-transparent transition-all pointer-events-auto",
                                isOverTop ? "bg-blue-500/35 border-b-2 border-blue-500" : ""
                            )}
                        />
                        {/* Left Zone */}
                        <div
                            ref={setDropLeftRef}
                            className={cn(
                                "col-start-1 col-end-2 row-start-2 border-transparent transition-all pointer-events-auto",
                                isOverLeft ? "bg-blue-500/35 border-r-2 border-blue-500" : ""
                            )}
                        />
                        {/* Center Zone */}
                        <div
                            ref={setDropCenterRef}
                            className={cn(
                                "col-start-2 col-end-3 row-start-2 transition-all pointer-events-auto",
                                isOverCenter ? "bg-blue-500/25 border border-dashed border-blue-400 rounded-md m-2" : ""
                            )}
                        />
                        {/* Right Zone */}
                        <div
                            ref={setDropRightRef}
                            className={cn(
                                "col-start-3 col-end-4 row-start-2 border-transparent transition-all pointer-events-auto",
                                isOverRight ? "bg-blue-500/35 border-l-2 border-blue-500" : ""
                            )}
                        />
                        {/* Bottom Zone */}
                        <div
                            ref={setDropBottomRef}
                            className={cn(
                                "col-start-1 col-end-4 row-start-3 border-transparent transition-all pointer-events-auto",
                                isOverBottom ? "bg-blue-500/35 border-t-2 border-blue-500" : ""
                            )}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Pane;
