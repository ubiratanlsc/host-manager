import { useDroppable } from '@dnd-kit/core';
import { useDraggable, useDndContext } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { GripVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList } from '@/components/ui/tabs';
import TerminalComponent from './TerminalComponent';
import SSHComponent from '../ssh/SSHComponent';
import useSplitStore from '../stores/useSplitStore';
import useTerminalStore from '../stores/useTerminalStore';
import useSSHStore from '../stores/useSSHStore';
import DraggableTab from './DraggableTab';

/**
 * Pane - Container arrastável que contém terminais/SSH
 * Estilo Termius: arrasta o pane inteiro, não apenas tabs
 */
const Pane = ({ paneId }) => {
    // Detectar quando está acontecendo um drag
    const { active } = useDndContext();
    const isDraggingPane = active?.data?.current?.type === 'pane';
    const isDraggingTab = active?.data?.current?.type === 'terminal-tab';
    const isDraggingThisPane = isDraggingPane && active?.id === paneId;
    const showDropZones = (isDraggingPane && !isDraggingThisPane) || isDraggingTab;

    // Split Store
    const pane = useSplitStore(state => state.splits.get(paneId));
    const setActiveTerminal = useSplitStore(state => state.setActiveTerminal);
    const closePane = useSplitStore(state => state.closePane);
    const removeTerminalFromSplit = useSplitStore(state => state.removeTerminalFromSplit);
    const setActivePane = useSplitStore(state => state.setActivePane);

    // Terminal Store
    const terminals = useTerminalStore(state => state.terminals);
    const killPty = useTerminalStore(state => state.killPty);
    const setFocusedTerminal = useTerminalStore(state => state.setFocused);

    // SSH Store
    const sessions = useSSHStore(state => state.sessions);
    const killSSH = useSSHStore(state => state.killSSH);
    const setFocusedSession = useSSHStore(state => state.setFocused);

    // Tornar o pane inteiro arrastável
    const {
        attributes,
        listeners,
        setNodeRef: setDragRef,
        transform,
        isDragging,
    } = useDraggable({
        id: paneId,
        data: {
            type: 'pane',
            paneId,
            terminalIds: pane?.terminalIds || [],
        }
    });

    // Drop zones para as bordas e centro
    const { setNodeRef: setDropCenterRef, isOver: isOverCenter } = useDroppable({
        id: `${paneId}-center`,
        data: { type: 'drop-zone', zone: 'center', paneId }
    });

    const { setNodeRef: setDropTopRef, isOver: isOverTop } = useDroppable({
        id: `${paneId}-top`,
        data: { type: 'drop-zone', zone: 'top', paneId }
    });

    const { setNodeRef: setDropBottomRef, isOver: isOverBottom } = useDroppable({
        id: `${paneId}-bottom`,
        data: { type: 'drop-zone', zone: 'bottom', paneId }
    });

    const { setNodeRef: setDropLeftRef, isOver: isOverLeft } = useDroppable({
        id: `${paneId}-left`,
        data: { type: 'drop-zone', zone: 'left', paneId }
    });

    const { setNodeRef: setDropRightRef, isOver: isOverRight } = useDroppable({
        id: `${paneId}-right`,
        data: { type: 'drop-zone', zone: 'right', paneId }
    });

    const { setNodeRef: setTabListDropRef, isOver: isOverTabList } = useDroppable({
        id: `tablist-${paneId}`,
        data: { type: 'pane-tablist', paneId },
    });

    if (!pane) {
        return (
            <div className="flex items-center justify-center h-full bg-[#1A1B1E] rounded-lg border border-gray-800">
                <p className="text-gray-500">Pane not found</p>
            </div>
        );
    }

    // Desestruturar com fallback seguro para evitar undefined
    const terminalIds = pane.terminalIds || [];
    const activeTerminalId = pane.activeTerminalId || terminalIds[0] || null;

    const handleActivateTerminal = (terminalId) => {
        setActiveTerminal(paneId, terminalId);
        setActivePane(paneId);

        if (terminals.has(terminalId)) setFocusedTerminal(terminalId);
        if (sessions.has(terminalId)) setFocusedSession(terminalId);
    };

    const handleCloseTerminal = async (terminalId) => {
        removeTerminalFromSplit(paneId, terminalId);

        if (terminals.has(terminalId)) {
            await killPty(terminalId);
            return;
        }

        if (sessions.has(terminalId)) {
            await killSSH(terminalId);
        }
    };

    const handleClosePane = () => {
        // Fechar todos os terminais do pane antes de removê-lo
        terminalIds.forEach(id => {
            const terminal = terminals.get(id);
            const session = sessions.get(id);
            if (terminal) killPty(id);
            if (session) killSSH(id);
        });
        closePane(paneId);
    };

    // Renderizar todos os terminais, mas mostrar apenas o ativo
    const renderTerminals = () => {
        if (terminalIds.length === 0) {
            return (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                    <p>No terminals</p>
                </div>
            );
        }

        return (
            <>
                {terminalIds.map((terminalId) => {
                    const terminal = terminals.get(terminalId);
                    const session = sessions.get(terminalId);
                    const isActive = terminalId === activeTerminalId;

                    // Renderizar terminal, mas ocultar se não estiver ativo
                    // IMPORTANTE: Usar visibility ao invés de display para preservar xterm.js
                    if (terminal) {
                        return (
                            <div
                                key={terminalId}
                                className="absolute inset-0"
                                style={{
                                    visibility: isActive ? 'visible' : 'hidden',
                                    pointerEvents: isActive ? 'auto' : 'none'
                                }}
                            >
                                <TerminalComponent terminalId={terminalId} />
                            </div>
                        );
                    }

                    if (session) {
                        return (
                            <div
                                key={terminalId}
                                className="absolute inset-0"
                                style={{
                                    visibility: isActive ? 'visible' : 'hidden',
                                    pointerEvents: isActive ? 'auto' : 'none'
                                }}
                            >
                                <SSHComponent sessionId={terminalId} />
                            </div>
                        );
                    }

                    return null;
                })}
            </>
        );
    };

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
    } : undefined;

    return (
        <div
            ref={setDragRef}
            style={style}
            className={`
                relative flex flex-col h-full bg-[#25262B] rounded-lg overflow-hidden
                border-2 transition-colors
                ${isDragging ? 'border-blue-500 z-50' : 'border-gray-800'}
            `}
            onClick={() => setActivePane(paneId)}
        >
            <Tabs
                value={activeTerminalId || terminalIds[0] || ''}
                onValueChange={handleActivateTerminal}
                className="flex flex-col h-full"
            >
                <div className="flex items-center gap-2 bg-[#2C2D32] border-b border-gray-800 px-2 py-1">
                    <div
                        className="flex items-center gap-2 cursor-grab active:cursor-grabbing"
                        {...attributes}
                        {...listeners}
                    >
                        <GripVertical className="h-4 w-4 text-gray-500" />
                    </div>

                    <div
                        ref={setTabListDropRef}
                        className={`flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent ${isOverTabList ? 'bg-blue-500/10 rounded' : ''}`}
                    >
                        <TabsList className="inline-flex flex-nowrap h-8 items-center justify-start rounded-md bg-transparent p-0 gap-1 w-auto">
                            <SortableContext items={terminalIds} strategy={horizontalListSortingStrategy}>
                                {terminalIds.map((terminalId) => {
                                    const terminal = terminals.get(terminalId);
                                    const session = sessions.get(terminalId);

                                    const label = terminal
                                        ? (terminal.shell?.name || 'Terminal')
                                        : (session?.title || (session?.config ? `${session.config.username}@${session.config.host}` : 'SSH'));

                                    const type = terminal ? 'terminal' : 'ssh';

                                    return (
                                        <DraggableTab
                                            key={terminalId}
                                            terminalId={terminalId}
                                            paneId={paneId}
                                            type={type}
                                            label={label}
                                            onClose={() => handleCloseTerminal(terminalId)}
                                        />
                                    );
                                })}
                            </SortableContext>
                        </TabsList>
                    </div>

                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-400 hover:text-red-300"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleClosePane();
                            }}
                            title="Close Pane"
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                </div>

                {/* Conteúdo do terminal ativo */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 relative">
                        {renderTerminals()}

                        {/* Drop Zones - aparecem durante drag */}
                        {showDropZones && (
                            <>
                                {/* Centro - Merge */}
                                <div
                                    ref={setDropCenterRef}
                                    className={`
                                absolute inset-[20%] 
                                border-2 border-dashed rounded-lg
                                flex items-center justify-center
                                transition-all pointer-events-auto
                                ${isOverCenter
                                            ? 'bg-blue-500/20 border-blue-500'
                                            : 'bg-transparent border-gray-600/50'
                                        }
                            `}
                                >
                                    {isOverCenter && (
                                        <span className="text-sm text-blue-400 font-medium">
                                            Merge aqui
                                        </span>
                                    )}
                                </div>

                                {/* Top - Split Vertical */}
                                <div
                                    ref={setDropTopRef}
                                    className={`
                                absolute top-0 left-0 right-0 h-[20%]
                                border-2 border-dashed
                                flex items-center justify-center
                                transition-all pointer-events-auto
                                ${isOverTop
                                            ? 'bg-green-500/20 border-green-500'
                                            : 'bg-transparent border-gray-600/50'
                                        }
                            `}
                                >
                                    {isOverTop && (
                                        <span className="text-sm text-green-400 font-medium">
                                            Split acima
                                        </span>
                                    )}
                                </div>

                                {/* Bottom - Split Vertical */}
                                <div
                                    ref={setDropBottomRef}
                                    className={`
                                absolute bottom-0 left-0 right-0 h-[20%]
                                border-2 border-dashed
                                flex items-center justify-center
                                transition-all pointer-events-auto
                                ${isOverBottom
                                            ? 'bg-green-500/20 border-green-500'
                                            : 'bg-transparent border-gray-600/50'
                                        }
                            `}
                                >
                                    {isOverBottom && (
                                        <span className="text-sm text-green-400 font-medium">
                                            Split abaixo
                                        </span>
                                    )}
                                </div>

                                {/* Left - Split Horizontal */}
                                <div
                                    ref={setDropLeftRef}
                                    className={`
                                absolute top-0 left-0 bottom-0 w-[20%]
                                border-2 border-dashed
                                flex items-center justify-center
                                transition-all pointer-events-auto
                                ${isOverLeft
                                            ? 'bg-green-500/20 border-green-500'
                                            : 'bg-transparent border-gray-600/50'
                                        }
                            `}
                                >
                                    {isOverLeft && (
                                        <span className="text-sm text-green-400 font-medium rotate-[-90deg]">
                                            Split esquerda
                                        </span>
                                    )}
                                </div>

                                {/* Right - Split Horizontal */}
                                <div
                                    ref={setDropRightRef}
                                    className={`
                                absolute top-0 right-0 bottom-0 w-[20%]
                                border-2 border-dashed
                                flex items-center justify-center
                                transition-all pointer-events-auto
                                ${isOverRight
                                            ? 'bg-green-500/20 border-green-500'
                                            : 'bg-transparent border-gray-600/50'
                                        }
                            `}
                                >
                                    {isOverRight && (
                                        <span className="text-sm text-green-400 font-medium rotate-90">
                                            Split direita
                                        </span>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </Tabs>
        </div>
    );
};

export default Pane;
