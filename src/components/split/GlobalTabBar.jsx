import React, { useMemo, useState } from 'react';
import { X, SplitSquareVertical, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSplitStore, useTerminalStore, useSSHStore } from '@/stores';
import { useDraggable, useDroppable, useDndContext } from '@dnd-kit/core';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from '@/components/ui/context-menu';
import RenameDialog from '@/components/ui/RenameDialog';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const getTabLabel = (tab, terminals, sessions) => {
    if (tab.type === 'single') {
        if (tab.userLabel) return tab.userLabel;
        const terminalId = tab.terminalId;
        const t = terminals.get(terminalId);
        const s = sessions.get(terminalId);
        if (t) return t.shell?.name || 'Terminal';
        if (s) return s.title || (s.config ? `${s.config.username}@${s.config.host}` : 'SSH');
        return tab.label || 'Terminal';
    } else {
        return tab.label || 'Split';
    }
};

const countTerminals = (tab) => {
    if (tab.type === 'single') return 1;
    let count = 0;
    Object.values(tab.nodes).forEach(node => {
        if (node.type === 'leaf') count++;
    });
    return count;
};

const TabItem = ({ tab, isActive, terminals, sessions, onTabClick, onRequestClose, onRename }) => {
    const label = getTabLabel(tab, terminals, sessions);
    const count = tab.type === 'split' ? countTerminals(tab) : 1;
    const tabText = tab.type === 'split' ? `${tab.label || 'Split'} (${count})` : label;

    // Draggable hook (only single tabs can be split by dragging)
    const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
        id: `tab-drag-${tab.id}`,
        data: {
            type: 'terminal-tab',
            tabId: tab.id,
            tab,
        },
        disabled: tab.type !== 'single', // disable dragging split tab for splitting
    });

    // Droppable hook (all tabs can be split-targets)
    const { setNodeRef: setDropRef, isOver } = useDroppable({
        id: `tab-drop-${tab.id}`,
        data: {
            type: 'tab-item',
            tabId: tab.id,
        },
    });

    // Detect if a drag is active and what's being dragged
    const { active } = useDndContext();
    const isDraggingTab = active?.data?.current?.type === 'terminal-tab';
    const showDropHint = isOver && isDraggingTab;

    // Merge refs
    const setRefs = (el) => {
        setDragRef(el);
        setDropRef(el);
    };

    const style = transform
        ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.5 : 1 }
        : undefined;

    // Color indicators
    let dotColor = 'bg-purple-500 animate-pulse'; // split tab
    if (tab.type === 'single') {
        const isSSH = sessions.has(tab.terminalId);
        dotColor = isSSH ? 'bg-blue-500' : 'bg-green-500';
    }

    const isSplitTarget = tab.type === 'split';

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <div
                    id={`tab-el-${tab.id}`}
                    ref={setRefs}
                    style={style}
                    onClick={onTabClick}
                    className={cn(
                        "group relative flex items-center gap-2 h-7 rounded-md px-2.5 cursor-pointer whitespace-nowrap select-none transition-all duration-150",
                        "border border-transparent dark:bg-[#25262B] dark:text-gray-400 text-gray-700 bg-gray-200",
                        "hover:bg-[#2C2D32] dark:hover:text-gray-100 hover:text-gray-900",
                        isActive && "dark:bg-[#1A1B1E] dark:text-white dark:border-gray-800 bg-white text-gray-900 border-gray-300 shadow-sm",
                        !showDropHint && isOver && "border-blue-500 bg-blue-500/10 scale-[1.02] shadow-[0_0_10px_rgba(59,130,246,0.3)]",
                        showDropHint && !isSplitTarget && "border-blue-500 bg-blue-500/15 scale-[1.02] shadow-[0_0_12px_rgba(59,130,246,0.4)]",
                        showDropHint && isSplitTarget && "border-amber-500 bg-amber-500/15 scale-[1.02] shadow-[0_0_12px_rgba(245,158,11,0.4)]",
                        isDragging && "z-50 opacity-40 border-dashed border-gray-600"
                    )}
                    {...attributes}
                    {...listeners}
                >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
                    <span className="text-xs font-semibold truncate max-w-[100px]">{tabText}</span>

                    {showDropHint && (
                        <div className="flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider flex-shrink-0">
                            {isSplitTarget ? (
                                <>
                                    <Plus className="h-2.5 w-2.5 text-amber-400" />
                                    <span className="text-amber-400">Split</span>
                                </>
                            ) : (
                                <>
                                    <SplitSquareVertical className="h-2.5 w-2.5 text-blue-400" />
                                    <span className="text-blue-400">Split</span>
                                </>
                            )}
                        </div>
                    )}

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive p-0 flex items-center justify-center flex-shrink-0 transition-opacity"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRequestClose();
                        }}
                        title="Fechar Aba"
                    >
                        <X className="h-2.5 w-2.5" />
                    </Button>
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-44">
                <ContextMenuItem onSelect={onRename}>Renomear Aba</ContextMenuItem>
                <ContextMenuItem onSelect={onRequestClose}>Fechar Aba</ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
};

const GlobalTabBar = () => {
    const tabs = useSplitStore((s) => s.tabs);
    const activeTabId = useSplitStore((s) => s.activeTabId);
    const setActiveTab = useSplitStore((s) => s.setActiveTab);
    const removeTab = useSplitStore((s) => s.removeTab);
    const closePaneInSplit = useSplitStore((s) => s.closePaneInSplit);
    const renameTab = useSplitStore((s) => s.renameTab);

    const [renameOpen, setRenameOpen] = useState(false);
    const [tabToRename, setTabToRename] = useState(null);
    const [tabToClose, setTabToClose] = useState(null);

    const handleRename = (tab) => {
        setTabToRename(tab);
        setRenameOpen(true);
    };

    const terminals = useTerminalStore((s) => s.terminals);
    const sessions = useSSHStore((s) => s.sessions);
    const killPty = useTerminalStore((s) => s.killPty);
    const killSSH = useSSHStore((s) => s.killSSH);

    const handleTabClose = async (tab) => {
        if (tab.type === 'split') {
            const activePaneId = tab.activePaneId;
            const leafNode = tab.nodes[activePaneId];
            if (leafNode && leafNode.type === 'leaf') {
                closePaneInSplit(tab.id, activePaneId);
                if (terminals.has(leafNode.terminalId)) {
                    await killPty(leafNode.terminalId);
                } else if (sessions.has(leafNode.terminalId)) {
                    await killSSH(leafNode.terminalId);
                }
            }
            return;
        }

        removeTab(tab.id);

        if (terminals.has(tab.terminalId)) {
            await killPty(tab.terminalId);
        } else if (sessions.has(tab.terminalId)) {
            await killSSH(tab.terminalId);
        }
    };

    // terminalId relevante para a aba (no split, o painel ativo)
    const getTabTerminalId = (tab) => {
        if (tab.type === 'single') return tab.terminalId;
        const leaf = tab.nodes?.[tab.activePaneId];
        return leaf?.type === 'leaf' ? leaf.terminalId : null;
    };

    // Conectado = shell local vivo, ou SSH presente e não marcado como desconectado.
    const isConnected = (terminalId) => {
        if (!terminalId) return false;
        if (terminals.has(terminalId)) return true;
        const s = sessions.get(terminalId);
        if (s) return !s.disconnected;
        return false;
    };

    // Só pede confirmação se a sessão estiver conectada; senão fecha direto.
    const requestTabClose = (tab) => {
        if (isConnected(getTabTerminalId(tab))) {
            setTabToClose(tab);
        } else {
            handleTabClose(tab);
        }
    };

    // Droppable tab bar for pane extraction
    const { setNodeRef: setTabBarRef, isOver } = useDroppable({
        id: 'tab-bar',
        data: { type: 'tab-bar' },
    });

    if (tabs.length === 0) return null;

    return (
        <div
            ref={setTabBarRef}
            data-testid="global-tab-bar"
            className={cn(
                "flex items-center gap-2 px-2 dark:bg-[#121212] bg-[#D7D7D7] h-9 flex-shrink-0 overflow-x-auto [&::-webkit-scrollbar]:hidden transition-colors duration-150 border-b dark:border-gray-900 border-gray-300",
                isOver && "bg-blue-500/10 border-b-2 border-blue-500"
            )}
            style={{ scrollbarWidth: 'none' }}
        >
            {tabs.map((tab) => (
                <TabItem
                    key={tab.id}
                    tab={tab}
                    isActive={tab.id === activeTabId}
                    terminals={terminals}
                    sessions={sessions}
                    onTabClick={() => setActiveTab(tab.id)}
                    onRequestClose={() => requestTabClose(tab)}
                    onRename={() => handleRename(tab)}
                />
            ))}
            <RenameDialog
                open={renameOpen}
                onOpenChange={setRenameOpen}
                currentLabel={tabToRename?.label}
                onConfirm={(label) => {
                    if (tabToRename) renameTab(tabToRename.id, label);
                }}
            />
            <ConfirmDialog
                open={!!tabToClose}
                onOpenChange={(o) => { if (!o) setTabToClose(null); }}
                title="Fechar aba?"
                description={`A sessão "${tabToClose ? getTabLabel(tabToClose, terminals, sessions) : ''}" será encerrada.`}
                confirmLabel="Fechar"
                cancelLabel="Cancelar"
                onConfirm={() => {
                    const t = tabToClose;
                    setTabToClose(null);
                    if (t) handleTabClose(t);
                }}
            />
        </div>
    );
};

export default GlobalTabBar;
