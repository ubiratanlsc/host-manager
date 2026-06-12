import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useTerminalStore, useSSHStore, useSplitStore, useConfigStore } from '@/stores';
import SplitPane from './SplitPane';
import GlobalTabBar from './GlobalTabBar';
import SplitPositionMenu from './SplitPositionMenu';
import { GripVertical } from 'lucide-react';
import {
    DndContext,
    PointerSensor,
    DragOverlay,
    useSensor,
    useSensors,
    closestCenter,
    pointerWithin,
} from '@dnd-kit/core';

const shouldHandleEvent = (element) => {
    let el = element;
    while (el) {
        if (
            el.hasAttribute?.('data-radix-popper-content-wrapper') ||
            el.hasAttribute?.('data-radix-select-viewport') ||
            el.closest?.('[data-radix-popper-content-wrapper]') ||
            el.closest?.('[data-radix-select-content]') ||
            el.closest?.('[role="dialog"]') ||
            el.closest?.('[role="listbox"]') ||
            el.closest?.('[role="menu"]')
        ) {
            return false;
        }
        el = el.parentElement;
    }
    return true;
};

class SmartPointerSensor extends PointerSensor {
    static activators = [
        {
            eventName: 'onPointerDown',
            handler: ({ nativeEvent: event }) => {
                return shouldHandleEvent(event.target);
            },
        },
    ];
}

const getTabLabel = (tab, terminals, sessions) => {
    if (!tab) return 'Terminal';
    if (tab.type === 'single') {
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

/**
 * MainLayout - View principal com DndContext global, GlobalTabBar e SplitPane
 */
const MainLayout = () => {
    // Store variables
    const tabs = useSplitStore((s) => s.tabs);
    const addSingleTab = useSplitStore((s) => s.addSingleTab);
    const removeTerminalFromAnyTab = useSplitStore((s) => s.removeTerminalFromAnyTab);
    const activeTabId = useSplitStore((s) => s.activeTabId);
    const setActiveTab = useSplitStore((s) => s.setActiveTab);
    const setPendingSplitDrop = useSplitStore((s) => s.setPendingSplitDrop);
    const pendingSplitDrop = useSplitStore((s) => s.pendingSplitDrop);

    const moveTabToSplitPane = useSplitStore((s) => s.moveTabToSplitPane);
    const extractPaneToTab = useSplitStore((s) => s.extractPaneToTab);
    const movePaneInSplit = useSplitStore((s) => s.movePaneInSplit);
    const movePaneToSplitPane = useSplitStore((s) => s.movePaneToSplitPane);

    const terminalsMap = useTerminalStore((s) => s.terminals);
    const sessionsMap = useSSHStore((s) => s.sessions);

    const setFocusedTerminal = useTerminalStore((s) => s.setFocused);
    const setFocusedSession = useSSHStore((s) => s.setFocused);
    const isTerminalInit = useTerminalStore((s) => s.isInitialized);
    const isSSHInit = useSSHStore((s) => s.isInitialized);
    const rehydrated = useSplitStore((s) => s.rehydrated);

    // List of terminals
    const terminals = useMemo(() => Array.from(terminalsMap.values()), [terminalsMap]);
    const sessions = useMemo(() => Array.from(sessionsMap.values()), [sessionsMap]);

    // Track active drag element
    const [activeDrag, setActiveDrag] = useState(null);

    const sensors = useSensors(
        useSensor(SmartPointerSensor, { activationConstraint: { distance: 8 } })
    );

    // Collision detection prioritized by zones
    const customCollisionDetection = useCallback((args) => {
        const pointerCollisions = pointerWithin(args);
        if (pointerCollisions.length > 0) {
            const paneZone = pointerCollisions.find(c =>
                String(c.id).includes('-center') ||
                String(c.id).includes('-top') ||
                String(c.id).includes('-bottom') ||
                String(c.id).includes('-left') ||
                String(c.id).includes('-right')
            );
            if (paneZone) return [paneZone];

            const tabDrop = pointerCollisions.find(c => String(c.id).startsWith('tab-drop-'));
            if (tabDrop) return [tabDrop];

            const tabBar = pointerCollisions.find(c => c.id === 'tab-bar');
            if (tabBar) return [tabBar];
        }
        return closestCenter(args);
    }, []);

    // Synchronize open backend terminals/sessions with frontend tabs
    useEffect(() => {
        // Collect all terminalIds currently present in any tabs
        const allTabTerminalIds = new Set();
        tabs.forEach((tab) => {
            if (tab.type === 'single') {
                allTabTerminalIds.add(tab.terminalId);
            } else if (tab.type === 'split') {
                Object.values(tab.nodes).forEach((node) => {
                    if (node.type === 'leaf') {
                        allTabTerminalIds.add(node.terminalId);
                    }
                });
            }
        });

        // Only add/remove tabs after split store is rehydrated from disk.
        // This prevents creating duplicate single tabs for terminals that
        // are already part of a restored split layout, which would change
        // the activeTabId and break the split restoration.
        if (!rehydrated) {
            return;
        }

        // Add tabs for any new terminals (local PTY → '__local__' group)
        terminals.forEach((t) => {
            if (!allTabTerminalIds.has(t.id)) {
                addSingleTab(t.id, t.shell?.name || 'Terminal', '__local__');
                setFocusedTerminal(t.id);
            }
        });

        // Add tabs for any new SSH sessions (resolve group from saved customer)
        const customers = useConfigStore.getState().customers;
        sessions.forEach((s) => {
            if (!allTabTerminalIds.has(s.id)) {
                const title = s.title || (s.config ? `${s.config.username}@${s.config.host}` : 'SSH');
                const customer = customers.find(c =>
                    c.host === s.config?.host && c.username === s.config?.username
                );
                const groupId = customer?.groups?.[0] || '__ungrouped__';
                addSingleTab(s.id, title, groupId);
                setFocusedSession(s.id);
            }
        });

        // Remove any tabs that represent dead terminals/sessions
        // Only run removal after all stores are initialized to avoid
        // wiping out restored split layouts before terminals are loaded.
        if (isTerminalInit && isSSHInit) {
            const activeTerminalIds = new Set([
                ...terminals.map((t) => t.id),
                ...sessions.map((s) => s.id)
            ]);

            allTabTerminalIds.forEach((id) => {
                if (!activeTerminalIds.has(id)) {
                    removeTerminalFromAnyTab(id);
                }
            });
        }
    }, [terminals, sessions, tabs, addSingleTab, removeTerminalFromAnyTab, setFocusedTerminal, setFocusedSession, rehydrated, isTerminalInit, isSSHInit]);

    // Handle tab activation while dragging over tab items
    const handleDragOver = useCallback((event) => {
        const { over } = event;
        if (!over) return;

        const overData = over.data?.current;
        if (overData?.type === 'tab-item') {
            const targetTabId = overData.tabId;
            if (targetTabId && targetTabId !== activeTabId) {
                setActiveTab(targetTabId);
            }
        }
    }, [activeTabId, setActiveTab]);

    // Handle Drag End event triggers
    const handleDragEnd = useCallback((event) => {
        const { active, over } = event;
        setActiveDrag(null);
        if (!over) return;

        const activeData = active.data?.current;
        const overData = over.data?.current;

        const triggerSnapshot = (tid) => {
            if (terminalsMap.has(tid)) {
                window.dispatchEvent(new CustomEvent('terminal:snapshot', { detail: { kind: 'pty', id: tid } }));
            } else if (sessionsMap.has(tid)) {
                window.dispatchEvent(new CustomEvent('terminal:snapshot', { detail: { kind: 'ssh', id: tid } }));
            }
        };

        // Case A: Dragging a Single Tab
        if (activeData?.type === 'terminal-tab') {
            const sourceTabId = activeData.tabId;
            const terminalId = activeData.tab?.terminalId;

            // 1. Drop over another tab -> Open popover menu for split direction
            if (overData?.type === 'tab-item') {
                const targetTabId = overData.tabId;
                if (sourceTabId === targetTabId) return;

                const targetEl = document.getElementById(`tab-el-${targetTabId}`);
                const rect = targetEl ? targetEl.getBoundingClientRect() : null;

                if (rect) {
                    triggerSnapshot(terminalId);
                    setPendingSplitDrop({
                        sourceTabId,
                        sourcePaneId: null,
                        sourceTerminalId: terminalId,
                        targetTabId,
                        rect,
                    });
                }
                return;
            }

            // 2. Drop over a pane's drop zone inside a split tab
            if (overData?.type === 'drop-zone') {
                const targetPaneId = overData.paneId;
                const position = overData.zone; // 'top' | 'bottom' | 'left' | 'right' | 'center'
                const targetTabId = activeTabId; // active tab contains this drop zone

                if (sourceTabId === targetTabId) return;

                if (position === 'center') {
                    // Fallback to right split
                    triggerSnapshot(terminalId);
                    moveTabToSplitPane(sourceTabId, targetTabId, targetPaneId, 'right');
                } else {
                    triggerSnapshot(terminalId);
                    moveTabToSplitPane(sourceTabId, targetTabId, targetPaneId, position);
                }
                return;
            }
        }

        // Case B: Dragging a Split Pane Header
        if (activeData?.type === 'pane') {
            const sourceTabId = activeData.tabId;
            const sourcePaneId = activeData.paneId;
            const terminalId = activeData.terminalId;

            // 1. Drop over the empty tab bar -> Extract pane into an independent tab
            if (over.id === 'tab-bar') {
                triggerSnapshot(terminalId);
                extractPaneToTab(sourceTabId, sourcePaneId);
                return;
            }

            // 2. Drop over a tab item -> Open popover menu for split direction
            if (overData?.type === 'tab-item') {
                const targetTabId = overData.tabId;
                if (sourceTabId === targetTabId) return;

                const targetEl = document.getElementById(`tab-el-${targetTabId}`);
                const rect = targetEl ? targetEl.getBoundingClientRect() : null;

                if (rect) {
                    triggerSnapshot(terminalId);
                    setPendingSplitDrop({
                        sourceTabId,
                        sourcePaneId,
                        sourceTerminalId: terminalId,
                        targetTabId,
                        rect,
                    });
                }
                return;
            }

            // 3. Drop over a pane drop zone
            if (overData?.type === 'drop-zone') {
                const targetPaneId = overData.paneId;
                const position = overData.zone;

                if (sourcePaneId === targetPaneId) return;

                // If dropping within the same tab -> move/rearrange pane in split
                if (activeTabId === sourceTabId) {
                    if (position !== 'center') {
                        triggerSnapshot(terminalId);
                        movePaneInSplit(sourceTabId, sourcePaneId, targetPaneId, position);
                    }
                } else {
                    // Dropping on another tab's pane -> treat as pane to split move
                    if (position !== 'center') {
                        triggerSnapshot(terminalId);
                        movePaneToSplitPane(sourceTabId, sourcePaneId, activeTabId, targetPaneId, position);
                    }
                }
                return;
            }
        }
    }, [
        activeTabId,
        terminalsMap,
        sessionsMap,
        setPendingSplitDrop,
        moveTabToSplitPane,
        extractPaneToTab,
        movePaneInSplit,
        movePaneToSplitPane
    ]);

    // Drag overlay preview
    const dragOverlay = useMemo(() => {
        const data = activeDrag?.data?.current;
        if (!data) return null;

        if (data.type === 'pane') {
            return (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-500 bg-[#25262B] shadow-xl text-xs text-gray-200">
                    <GripVertical className="h-3.5 w-3.5 text-gray-500" />
                    <span>Mover {data.label || 'Terminal'}</span>
                </div>
            );
        }

        if (data.type === 'terminal-tab') {
            const label = getTabLabel(data.tab, terminalsMap, sessionsMap);
            return (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-700 bg-[#25262B] text-xs text-gray-100 shadow-lg select-none">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span>{label}</span>
                </div>
            );
        }

        return null;
    }, [activeDrag, terminalsMap, sessionsMap]);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={customCollisionDetection}
            onDragStart={(event) => setActiveDrag(event.active)}
            onDragOver={handleDragOver}
            onDragCancel={() => setActiveDrag(null)}
            onDragEnd={handleDragEnd}
        >
            <div className="flex flex-col h-full w-full overflow-hidden relative">
                <GlobalTabBar />
                <div className="flex-1 overflow-hidden relative h-full">
                    <SplitPane />
                </div>
                {pendingSplitDrop && <SplitPositionMenu />}
            </div>
            <DragOverlay>
                {dragOverlay}
            </DragOverlay>
        </DndContext>
    );
};

export default MainLayout;
