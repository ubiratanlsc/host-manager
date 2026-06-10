import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { isTauri } from '@tauri-apps/api/core';
import { BaseDirectory, exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import useTerminalStore from './useTerminalStore';
import useSSHStore from './useSSHStore';

// ─── Tauri FS persistence helpers ─────────────────────────────────────

const STORAGE_FILE = 'split-layout.json';

async function saveLayoutToDisk(tabs, activeTabId) {
    try {
        const data = JSON.stringify({ tabs, activeTabId });
        if (isTauri()) {
            console.log('[SplitStore] Saving layout, tabs:', tabs.length);
            await writeTextFile(STORAGE_FILE, data, { baseDir: BaseDirectory.AppData });
            console.log('[SplitStore] Layout saved successfully');
        } else {
            localStorage.setItem('host-manager-split-layout', data);
        }
    } catch (e) {
        console.error('[SplitStore] Failed to save layout:', e);
    }
}

async function loadLayoutFromDisk() {
    try {
        if (isTauri()) {
            const fileExists = await exists(STORAGE_FILE, { baseDir: BaseDirectory.AppData });
            if (!fileExists) {
                console.log('[SplitStore] Layout file does not exist yet');
                return null;
            }
            const data = await readTextFile(STORAGE_FILE, { baseDir: BaseDirectory.AppData });
            console.log('[SplitStore] Loaded layout from disk:', JSON.stringify(data).substring(0, 200));
            return JSON.parse(data);
        } else {
            const raw = localStorage.getItem('host-manager-split-layout');
            return raw ? JSON.parse(raw) : null;
        }
    } catch (e) {
        console.error('[SplitStore] Failed to load layout:', e);
        return null;
    }
}

// ─── Pure Tree Helpers ─────────────────────────────────────────────
// Operate on a flat { [nodeId]: SplitNode } object per split tab.
// SplitNode is either:
//   Leaf:   { id, type: 'leaf',   terminalId }
//   Branch: { id, type: 'branch', direction: 'horizontal'|'vertical',
//             children: [id, id], sizes: [number, number] }

/**
 * Collects all terminalIds from leaf nodes in a subtree.
 */
function collectTerminalIds(nodes, nodeId) {
    const node = nodes[nodeId];
    if (!node) return [];
    if (node.type === 'leaf') return [node.terminalId];
    if (node.type === 'branch') {
        return [
            ...collectTerminalIds(nodes, node.children[0]),
            ...collectTerminalIds(nodes, node.children[1]),
        ];
    }
    return [];
}

/**
 * Gets all leaf node IDs in tree order (depth-first left-to-right).
 */
function getAllLeafNodeIds(nodes, nodeId) {
    const node = nodes[nodeId];
    if (!node) return [];
    if (node.type === 'leaf') return [nodeId];
    if (node.type === 'branch') {
        return [
            ...getAllLeafNodeIds(nodes, node.children[0]),
            ...getAllLeafNodeIds(nodes, node.children[1]),
        ];
    }
    return [];
}

/**
 * Finds the parent node ID of a given node within the tree.
 */
function findParentOfNode(nodes, rootId, targetId) {
    if (rootId === targetId) return null;
    const node = nodes[rootId];
    if (!node || node.type === 'leaf') return null;
    if (node.children.includes(targetId)) return rootId;
    for (const childId of node.children) {
        const found = findParentOfNode(nodes, childId, targetId);
        if (found) return found;
    }
    return null;
}

/**
 * Finds a leaf node ID by its terminalId.
 */
function findLeafByTerminalId(nodes, rootId, terminalId) {
    const node = nodes[rootId];
    if (!node) return null;
    if (node.type === 'leaf' && node.terminalId === terminalId) return rootId;
    if (node.type === 'branch') {
        for (const childId of node.children) {
            const found = findLeafByTerminalId(nodes, childId, terminalId);
            if (found) return found;
        }
    }
    return null;
}

/**
 * Removes a leaf node and normalizes the tree (collapses parent branch).
 * Returns { newNodes, newRootId } or null if the tree is now empty.
 */
function removeLeafNode(nodes, rootId, leafId) {
    if (leafId === rootId) {
        // The leaf IS the root – tree becomes empty
        return null;
    }

    const parentId = findParentOfNode(nodes, rootId, leafId);
    if (!parentId) return null;

    const parent = nodes[parentId];
    const siblingId = parent.children.find((id) => id !== leafId);

    const newNodes = { ...nodes };
    delete newNodes[leafId];

    const grandParentId = findParentOfNode(nodes, rootId, parentId);

    if (!grandParentId) {
        // Parent is the root – sibling becomes new root
        delete newNodes[parentId];
        return { newNodes, newRootId: siblingId };
    }

    // Replace parent with sibling in grandparent's children list
    const grandParent = newNodes[grandParentId];
    newNodes[grandParentId] = {
        ...grandParent,
        children: grandParent.children.map((id) => (id === parentId ? siblingId : id)),
    };
    delete newNodes[parentId];

    return { newNodes, newRootId: rootId };
}

/**
 * Wraps the entire root with a new branch containing the existing root
 * and a new leaf placed at `position`.
 */
function wrapRootWithNewLeaf(nodes, rootId, newTerminalId, position) {
    const direction = position === 'left' || position === 'right' ? 'horizontal' : 'vertical';
    const newFirst = position === 'left' || position === 'top';

    const newLeafId = uuidv4();
    const newBranchId = uuidv4();

    const newNodes = { ...nodes };
    newNodes[newLeafId] = { id: newLeafId, type: 'leaf', terminalId: newTerminalId };
    newNodes[newBranchId] = {
        id: newBranchId,
        type: 'branch',
        direction,
        children: newFirst ? [newLeafId, rootId] : [rootId, newLeafId],
        sizes: [50, 50],
    };

    return { newNodes, newRootId: newBranchId, newLeafId };
}

/**
 * Inserts a new leaf next to a target leaf, creating a new branch node
 * that replaces the target's position in the tree.
 */
function insertLeafAtTarget(nodes, rootId, targetLeafId, newTerminalId, position) {
    const direction = position === 'left' || position === 'right' ? 'horizontal' : 'vertical';
    const newFirst = position === 'left' || position === 'top';

    const newLeafId = uuidv4();
    const newBranchId = uuidv4();

    const newNodes = { ...nodes };
    newNodes[newLeafId] = { id: newLeafId, type: 'leaf', terminalId: newTerminalId };
    newNodes[newBranchId] = {
        id: newBranchId,
        type: 'branch',
        direction,
        children: newFirst ? [newLeafId, targetLeafId] : [targetLeafId, newLeafId],
        sizes: [50, 50],
    };

    // Replace targetLeafId with newBranchId in parent
    if (targetLeafId === rootId) {
        return { newNodes, newRootId: newBranchId, newLeafId };
    }

    const parentId = findParentOfNode(nodes, rootId, targetLeafId);
    if (parentId) {
        const parent = newNodes[parentId];
        newNodes[parentId] = {
            ...parent,
            children: parent.children.map((id) => (id === targetLeafId ? newBranchId : id)),
        };
    }

    return { newNodes, newRootId: rootId, newLeafId };
}

// ─── Store ─────────────────────────────────────────────────────────

/**
 * Split Store – Tab-based terminal layout manager.
 *
 * State shape:
 *   tabs: TabItem[]       – flat list of tab items
 *   activeTabId: string   – ID of the currently active tab
 *   pendingSplitDrop: {}  – transient state for the split position menu
 *
 * TabItem is one of:
 *   SingleTab:  { id, type:'single', terminalId, label }
 *   SplitTab:   { id, type:'split',  label:'Split',
 *                 rootNodeId, nodes: {[id]: SplitNode}, activePaneId }
 */

const useSplitStore = create(
    devtools(
        (set, get) => ({
            // ========== STATE ==========
            tabs: [],
            activeTabId: null,
            pendingSplitDrop: null, // { sourceTabId?, sourcePaneId?, sourceTerminalId, targetTabId, rect? }
            rehydrated: false,

            // ========== TAB MANAGEMENT ==========

            /**
             * Creates a new single-terminal tab and activates it.
             */
            addSingleTab: (terminalId, label = 'Terminal') => {
                const id = uuidv4();
                const newTab = { id, type: 'single', terminalId, label };
                set((state) => ({
                    tabs: [...state.tabs, newTab],
                    activeTabId: id,
                }));
                return id;
            },

            /**
             * Removes a tab by ID. Adjusts activeTabId if necessary.
             */
            removeTab: (tabId) => {
                set((state) => {
                    const idx = state.tabs.findIndex((t) => t.id === tabId);
                    const newTabs = state.tabs.filter((t) => t.id !== tabId);
                    let newActiveTabId = state.activeTabId;
                    if (state.activeTabId === tabId) {
                        if (newTabs.length > 0) {
                            newActiveTabId = newTabs[Math.min(idx, newTabs.length - 1)]?.id || null;
                        } else {
                            newActiveTabId = null;
                        }
                    }
                    return { tabs: newTabs, activeTabId: newActiveTabId };
                });
            },

            /**
             * Activates a tab.
             */
            setActiveTab: (tabId) => {
                set({ activeTabId: tabId });
            },

            // ========== SPLIT CREATION / EXPANSION ==========

            /**
             * Merges sourceTab into targetTab at a given position, creating
             * or expanding a split group. Source tab is removed.
             */
            createOrExpandSplit: (sourceTabId, targetTabId, position) => {
                if (sourceTabId === targetTabId) return;

                set((state) => {
                    const sourceTab = state.tabs.find((t) => t.id === sourceTabId);
                    const targetTab = state.tabs.find((t) => t.id === targetTabId);
                    if (!sourceTab || !targetTab) return state;

                    // Only single tabs can be dragged onto others for now
                    if (sourceTab.type !== 'single') return state;

                    const sourceTerminalId = sourceTab.terminalId;
                    const newTabs = state.tabs.filter((t) => t.id !== sourceTabId);
                    const targetIdx = newTabs.findIndex((t) => t.id === targetTabId);
                    if (targetIdx === -1) return state;

                    const direction =
                        position === 'left' || position === 'right' ? 'horizontal' : 'vertical';
                    const sourceFirst = position === 'left' || position === 'top';

                    if (targetTab.type === 'single') {
                        // Both single → create split tab
                        const srcLeafId = uuidv4();
                        const tgtLeafId = uuidv4();
                        const rootBranchId = uuidv4();

                        const nodes = {};
                        nodes[srcLeafId] = {
                            id: srcLeafId,
                            type: 'leaf',
                            terminalId: sourceTerminalId,
                        };
                        nodes[tgtLeafId] = {
                            id: tgtLeafId,
                            type: 'leaf',
                            terminalId: targetTab.terminalId,
                        };
                        nodes[rootBranchId] = {
                            id: rootBranchId,
                            type: 'branch',
                            direction,
                            children: sourceFirst
                                ? [srcLeafId, tgtLeafId]
                                : [tgtLeafId, srcLeafId],
                            sizes: [50, 50],
                        };

                        const splitTab = {
                            id: targetTab.id,
                            type: 'split',
                            label: 'Split',
                            rootNodeId: rootBranchId,
                            nodes,
                            activePaneId: srcLeafId,
                        };

                        newTabs[targetIdx] = splitTab;
                        return { tabs: newTabs, activeTabId: splitTab.id };
                    }

                    if (targetTab.type === 'split') {
                        // Target is already a split → wrap root with new leaf
                        const { newNodes, newRootId, newLeafId } = wrapRootWithNewLeaf(
                            targetTab.nodes,
                            targetTab.rootNodeId,
                            sourceTerminalId,
                            position,
                        );

                        const updatedTab = {
                            ...targetTab,
                            rootNodeId: newRootId,
                            nodes: newNodes,
                            activePaneId: newLeafId,
                        };

                        newTabs[targetIdx] = updatedTab;
                        return { tabs: newTabs, activeTabId: updatedTab.id };
                    }

                    return state;
                });

                window.dispatchEvent(new Event('terminal:relayout'));
            },

            /**
             * Adds a terminal to a tab at a specific pane position.
             * Used when dragging a tab into a pane's drop zone.
             * Source tab is removed.
             */
            moveTabToSplitPane: (sourceTabId, targetTabId, targetPaneId, position) => {
                if (sourceTabId === targetTabId) return;

                set((state) => {
                    const sourceTab = state.tabs.find((t) => t.id === sourceTabId);
                    const targetTab = state.tabs.find((t) => t.id === targetTabId);
                    if (!sourceTab || !targetTab || sourceTab.type !== 'single') return state;

                    const sourceTerminalId = sourceTab.terminalId;
                    const newTabs = state.tabs.filter((t) => t.id !== sourceTabId);
                    const targetIdx = newTabs.findIndex((t) => t.id === targetTabId);
                    if (targetIdx === -1) return state;

                    if (targetTab.type === 'single') {
                        // Convert single to split
                        const existingLeafId = uuidv4();
                        const newLeafId = uuidv4();
                        const branchId = uuidv4();
                        const direction =
                            position === 'left' || position === 'right'
                                ? 'horizontal'
                                : 'vertical';
                        const newFirst = position === 'left' || position === 'top';

                        const nodes = {};
                        nodes[existingLeafId] = {
                            id: existingLeafId,
                            type: 'leaf',
                            terminalId: targetTab.terminalId,
                        };
                        nodes[newLeafId] = {
                            id: newLeafId,
                            type: 'leaf',
                            terminalId: sourceTerminalId,
                        };
                        nodes[branchId] = {
                            id: branchId,
                            type: 'branch',
                            direction,
                            children: newFirst
                                ? [newLeafId, existingLeafId]
                                : [existingLeafId, newLeafId],
                            sizes: [50, 50],
                        };

                        newTabs[targetIdx] = {
                            id: targetTab.id,
                            type: 'split',
                            label: 'Split',
                            rootNodeId: branchId,
                            nodes,
                            activePaneId: newLeafId,
                        };
                        return { tabs: newTabs, activeTabId: targetTab.id };
                    }

                    if (targetTab.type === 'split') {
                        const { newNodes, newRootId, newLeafId } = insertLeafAtTarget(
                            targetTab.nodes,
                            targetTab.rootNodeId,
                            targetPaneId,
                            sourceTerminalId,
                            position,
                        );

                        newTabs[targetIdx] = {
                            ...targetTab,
                            rootNodeId: newRootId,
                            nodes: newNodes,
                            activePaneId: newLeafId,
                        };
                        return { tabs: newTabs, activeTabId: targetTab.id };
                    }

                    return state;
                });

                window.dispatchEvent(new Event('terminal:relayout'));
            },

            // ========== PANE OPERATIONS (within split tabs) ==========

            /**
             * Closes a pane within a split tab. Destroys the terminal.
             * If only 1 pane remains the split dissolves to a single tab.
             */
            closePaneInSplit: (tabId, leafNodeId) => {
                let remainingTerminalId = null;

                set((state) => {
                    const tabIdx = state.tabs.findIndex((t) => t.id === tabId);
                    if (tabIdx === -1) return state;
                    const tab = state.tabs[tabIdx];
                    if (tab.type !== 'split') return state;

                    const result = removeLeafNode(tab.nodes, tab.rootNodeId, leafNodeId);
                    const newTabs = [...state.tabs];

                    if (!result) {
                        // Tree is empty – remove the tab
                        return get()._removeTabAtIndex(state, tabIdx);
                    }

                    const { newNodes, newRootId } = result;
                    const remainingLeaves = getAllLeafNodeIds(newNodes, newRootId);

                    if (remainingLeaves.length === 1) {
                        // Dissolve to single tab
                        const lastLeaf = newNodes[remainingLeaves[0]];
                        remainingTerminalId = lastLeaf.terminalId;
                        newTabs[tabIdx] = {
                            id: tab.id,
                            type: 'single',
                            terminalId: lastLeaf.terminalId,
                            label: 'Terminal',
                        };
                        return { tabs: newTabs };
                    }

                    // Multiple leaves remain – update the tree
                    const newActivePaneId = remainingLeaves.includes(tab.activePaneId)
                        ? tab.activePaneId
                        : remainingLeaves[0];

                    const targetNode = newNodes[newActivePaneId];
                    remainingTerminalId = targetNode.terminalId;

                    newTabs[tabIdx] = {
                        ...tab,
                        rootNodeId: newRootId,
                        nodes: newNodes,
                        activePaneId: newActivePaneId,
                    };
                    return { tabs: newTabs };
                });

                if (remainingTerminalId) {
                    console.log('[SplitStore] closePaneInSplit: setting focus to', remainingTerminalId);
                    if (useTerminalStore.getState().terminals.has(remainingTerminalId)) {
                        useTerminalStore.getState().setFocused(remainingTerminalId);
                        console.log('[SplitStore] closePaneInSplit: focusedTerminal now', useTerminalStore.getState().focusedTerminal);
                    } else if (useSSHStore.getState().sessions.has(remainingTerminalId)) {
                        useSSHStore.getState().setFocused(remainingTerminalId);
                    }
                }
            },

            /**
             * Extracts a pane from a split tab → creates a new independent single tab.
             */
            extractPaneToTab: (tabId, leafNodeId) => {
                set((state) => {
                    const tabIdx = state.tabs.findIndex((t) => t.id === tabId);
                    if (tabIdx === -1) return state;
                    const tab = state.tabs[tabIdx];
                    if (tab.type !== 'split') return state;

                    const leafNode = tab.nodes[leafNodeId];
                    if (!leafNode || leafNode.type !== 'leaf') return state;

                    const terminalId = leafNode.terminalId;
                    const newTabs = [...state.tabs];

                    // Remove leaf from the split tree
                    const result = removeLeafNode(tab.nodes, tab.rootNodeId, leafNodeId);

                    if (!result) {
                        // Was the only leaf – convert to single (edge case)
                        newTabs[tabIdx] = {
                            id: tab.id,
                            type: 'single',
                            terminalId,
                            label: 'Terminal',
                        };
                        return { tabs: newTabs, activeTabId: tab.id };
                    }

                    const { newNodes, newRootId } = result;
                    const remainingLeaves = getAllLeafNodeIds(newNodes, newRootId);

                    if (remainingLeaves.length === 1) {
                        // Dissolve split to single
                        const lastLeaf = newNodes[remainingLeaves[0]];
                        newTabs[tabIdx] = {
                            id: tab.id,
                            type: 'single',
                            terminalId: lastLeaf.terminalId,
                            label: 'Terminal',
                        };
                    } else {
                        const newActivePaneId = remainingLeaves.includes(tab.activePaneId)
                            ? tab.activePaneId
                            : remainingLeaves[0];
                        newTabs[tabIdx] = {
                            ...tab,
                            rootNodeId: newRootId,
                            nodes: newNodes,
                            activePaneId: newActivePaneId,
                        };
                    }

                    // Add new single tab for the extracted terminal
                    const newSingleTab = {
                        id: uuidv4(),
                        type: 'single',
                        terminalId,
                        label: 'Terminal',
                    };
                    newTabs.push(newSingleTab);

                    return { tabs: newTabs, activeTabId: newSingleTab.id };
                });

                window.dispatchEvent(new Event('terminal:relayout'));
            },

            /**
             * Moves a pane from one split tab to another tab (drag pane header → tab bar tab).
             */
            movePaneToTargetTab: (sourceTabId, sourceLeafId, targetTabId, position) => {
                if (sourceTabId === targetTabId) return;

                set((state) => {
                    const sourceTab = state.tabs.find((t) => t.id === sourceTabId);
                    const targetTab = state.tabs.find((t) => t.id === targetTabId);
                    if (!sourceTab || sourceTab.type !== 'split' || !targetTab) return state;

                    const leafNode = sourceTab.nodes[sourceLeafId];
                    if (!leafNode || leafNode.type !== 'leaf') return state;

                    const terminalId = leafNode.terminalId;
                    const newTabs = [...state.tabs];

                    // ── Remove from source ──
                    const sourceIdx = newTabs.findIndex((t) => t.id === sourceTabId);
                    const removeResult = removeLeafNode(
                        sourceTab.nodes,
                        sourceTab.rootNodeId,
                        sourceLeafId,
                    );

                    if (!removeResult) {
                        // Source was the only leaf – remove source tab
                        newTabs.splice(sourceIdx, 1);
                    } else {
                        const { newNodes, newRootId } = removeResult;
                        const remainingLeaves = getAllLeafNodeIds(newNodes, newRootId);

                        if (remainingLeaves.length === 1) {
                            const lastLeaf = newNodes[remainingLeaves[0]];
                            newTabs[sourceIdx] = {
                                id: sourceTab.id,
                                type: 'single',
                                terminalId: lastLeaf.terminalId,
                                label: 'Terminal',
                            };
                        } else {
                            const newActivePaneId = remainingLeaves.includes(sourceTab.activePaneId)
                                ? sourceTab.activePaneId
                                : remainingLeaves[0];
                            newTabs[sourceIdx] = {
                                ...sourceTab,
                                rootNodeId: newRootId,
                                nodes: newNodes,
                                activePaneId: newActivePaneId,
                            };
                        }
                    }

                    // ── Add to target ──
                    const targetIdx = newTabs.findIndex((t) => t.id === targetTabId);
                    if (targetIdx === -1) return state;
                    const currentTarget = newTabs[targetIdx];
                    const direction =
                        position === 'left' || position === 'right' ? 'horizontal' : 'vertical';
                    const sourceFirst = position === 'left' || position === 'top';

                    if (currentTarget.type === 'single') {
                        const srcLeafId = uuidv4();
                        const tgtLeafId = uuidv4();
                        const rootBranchId = uuidv4();

                        const nodes = {};
                        nodes[srcLeafId] = { id: srcLeafId, type: 'leaf', terminalId };
                        nodes[tgtLeafId] = {
                            id: tgtLeafId,
                            type: 'leaf',
                            terminalId: currentTarget.terminalId,
                        };
                        nodes[rootBranchId] = {
                            id: rootBranchId,
                            type: 'branch',
                            direction,
                            children: sourceFirst
                                ? [srcLeafId, tgtLeafId]
                                : [tgtLeafId, srcLeafId],
                            sizes: [50, 50],
                        };

                        newTabs[targetIdx] = {
                            id: currentTarget.id,
                            type: 'split',
                            label: 'Split',
                            rootNodeId: rootBranchId,
                            nodes,
                            activePaneId: srcLeafId,
                        };
                    } else if (currentTarget.type === 'split') {
                        const { newNodes, newRootId, newLeafId } = wrapRootWithNewLeaf(
                            currentTarget.nodes,
                            currentTarget.rootNodeId,
                            terminalId,
                            position,
                        );
                        newTabs[targetIdx] = {
                            ...currentTarget,
                            rootNodeId: newRootId,
                            nodes: newNodes,
                            activePaneId: newLeafId,
                        };
                    }

                    return { tabs: newTabs, activeTabId: targetTabId };
                });

                window.dispatchEvent(new Event('terminal:relayout'));
            },

            /**
             * Moves a pane from a split tab to a specific pane inside another tab.
             */
            movePaneToSplitPane: (sourceTabId, sourcePaneId, targetTabId, targetPaneId, position) => {
                if (sourceTabId === targetTabId) return;

                set((state) => {
                    const sourceTab = state.tabs.find((t) => t.id === sourceTabId);
                    const targetTab = state.tabs.find((t) => t.id === targetTabId);
                    if (!sourceTab || !targetTab) return state;

                    if (sourceTab.type !== 'split') return state;

                    const leafNode = sourceTab.nodes[sourcePaneId];
                    if (!leafNode || leafNode.type !== 'leaf') return state;

                    const terminalId = leafNode.terminalId;
                    const newTabs = [...state.tabs];

                    // 1. Remove from source tab
                    const sourceIdx = newTabs.findIndex((t) => t.id === sourceTabId);
                    const removeResult = removeLeafNode(sourceTab.nodes, sourceTab.rootNodeId, sourcePaneId);
                    if (!removeResult) {
                        newTabs.splice(sourceIdx, 1);
                    } else {
                        const { newNodes, newRootId } = removeResult;
                        const remainingLeaves = getAllLeafNodeIds(newNodes, newRootId);
                        if (remainingLeaves.length === 1) {
                            const lastLeaf = newNodes[remainingLeaves[0]];
                            newTabs[sourceIdx] = {
                                id: sourceTab.id,
                                type: 'single',
                                terminalId: lastLeaf.terminalId,
                                label: 'Terminal',
                            };
                        } else {
                            const newActivePaneId = remainingLeaves.includes(sourceTab.activePaneId)
                                ? sourceTab.activePaneId
                                : remainingLeaves[0];
                            newTabs[sourceIdx] = {
                                ...sourceTab,
                                rootNodeId: newRootId,
                                nodes: newNodes,
                                activePaneId: newActivePaneId,
                            };
                        }
                    }

                    // 2. Add to target tab
                    const targetIdx = newTabs.findIndex((t) => t.id === targetTabId);
                    if (targetIdx === -1) return { tabs: newTabs };

                    const currentTarget = newTabs[targetIdx];
                    const direction = position === 'left' || position === 'right' ? 'horizontal' : 'vertical';
                    const newFirst = position === 'left' || position === 'top';

                    if (currentTarget.type === 'single') {
                        const existingLeafId = uuidv4();
                        const newLeafId = uuidv4();
                        const branchId = uuidv4();

                        const nodes = {};
                        nodes[existingLeafId] = {
                            id: existingLeafId,
                            type: 'leaf',
                            terminalId: currentTarget.terminalId,
                        };
                        nodes[newLeafId] = {
                            id: newLeafId,
                            type: 'leaf',
                            terminalId: terminalId,
                        };
                        nodes[branchId] = {
                            id: branchId,
                            type: 'branch',
                            direction,
                            children: newFirst
                                ? [newLeafId, existingLeafId]
                                : [existingLeafId, newLeafId],
                            sizes: [50, 50],
                        };

                        newTabs[targetIdx] = {
                            id: currentTarget.id,
                            type: 'split',
                            label: 'Split',
                            rootNodeId: branchId,
                            nodes,
                            activePaneId: newLeafId,
                        };
                    } else if (currentTarget.type === 'split') {
                        const { newNodes, newRootId, newLeafId } = insertLeafAtTarget(
                            currentTarget.nodes,
                            currentTarget.rootNodeId,
                            targetPaneId,
                            terminalId,
                            position,
                        );

                        newTabs[targetIdx] = {
                            ...currentTarget,
                            rootNodeId: newRootId,
                            nodes: newNodes,
                            activePaneId: newLeafId,
                        };
                    }

                    return { tabs: newTabs, activeTabId: targetTabId };
                });

                window.dispatchEvent(new Event('terminal:relayout'));
            },

            /**
             * Rearranges a pane within the same split tab (drag header → drop zone).
             */
            movePaneInSplit: (tabId, sourceLeafId, targetLeafId, position) => {
                if (sourceLeafId === targetLeafId) return;

                set((state) => {
                    const tabIdx = state.tabs.findIndex((t) => t.id === tabId);
                    if (tabIdx === -1) return state;
                    const tab = state.tabs[tabIdx];
                    if (tab.type !== 'split') return state;

                    const sourceLeaf = tab.nodes[sourceLeafId];
                    if (!sourceLeaf || sourceLeaf.type !== 'leaf') return state;

                    const terminalId = sourceLeaf.terminalId;

                    // Remove source leaf
                    const removeResult = removeLeafNode(tab.nodes, tab.rootNodeId, sourceLeafId);
                    if (!removeResult) return state;

                    let { newNodes, newRootId } = removeResult;

                    // Check target still exists after removal
                    if (!newNodes[targetLeafId]) return state;

                    // Insert at target position
                    const insertResult = insertLeafAtTarget(
                        newNodes,
                        newRootId,
                        targetLeafId,
                        terminalId,
                        position,
                    );

                    const newTabs = [...state.tabs];
                    newTabs[tabIdx] = {
                        ...tab,
                        rootNodeId: insertResult.newRootId,
                        nodes: insertResult.newNodes,
                        activePaneId: insertResult.newLeafId,
                    };

                    return { tabs: newTabs };
                });

                window.dispatchEvent(new Event('terminal:relayout'));
            },

            // ========== SPLIT POSITION MENU ==========

            setPendingSplitDrop: (data) => {
                set({ pendingSplitDrop: data });
            },

            clearPendingSplitDrop: () => {
                set({ pendingSplitDrop: null });
            },

            // ========== SIZING ==========

            updateNodeSizes: (tabId, nodeId, sizes) => {
                set((state) => {
                    const tabIdx = state.tabs.findIndex((t) => t.id === tabId);
                    if (tabIdx === -1) return state;
                    const tab = state.tabs[tabIdx];
                    if (tab.type !== 'split') return state;

                    const node = tab.nodes[nodeId];
                    if (!node || node.type !== 'branch') return state;

                    const newNodes = { ...tab.nodes, [nodeId]: { ...node, sizes } };
                    const newTabs = [...state.tabs];
                    newTabs[tabIdx] = { ...tab, nodes: newNodes };
                    return { tabs: newTabs };
                });
            },

            // ========== FOCUS MANAGEMENT ==========

            setActivePaneInTab: (tabId, paneId) => {
                set((state) => {
                    const tabIdx = state.tabs.findIndex((t) => t.id === tabId);
                    if (tabIdx === -1) return state;
                    const tab = state.tabs[tabIdx];
                    if (tab.type !== 'split') return state;

                    const newTabs = [...state.tabs];
                    newTabs[tabIdx] = { ...tab, activePaneId: paneId };
                    return { tabs: newTabs };
                });
            },

            // ========== GETTERS ==========

            getActiveTab: () => {
                const state = get();
                return state.tabs.find((t) => t.id === state.activeTabId) || null;
            },

            findTabByTerminalId: (terminalId) => {
                const state = get();
                for (const tab of state.tabs) {
                    if (tab.type === 'single' && tab.terminalId === terminalId) return tab;
                    if (tab.type === 'split') {
                        const leafId = findLeafByTerminalId(
                            tab.nodes,
                            tab.rootNodeId,
                            terminalId,
                        );
                        if (leafId) return tab;
                    }
                }
                return null;
            },

            /**
             * Removes a terminal from whichever tab it lives in.
             * Called when a PTY or SSH session is closed from the backend.
             */
            removeTerminalFromAnyTab: (terminalId) => {
                const state = get();

                for (const tab of state.tabs) {
                    if (tab.type === 'single' && tab.terminalId === terminalId) {
                        get().removeTab(tab.id);
                        return;
                    }
                    if (tab.type === 'split') {
                        const leafId = findLeafByTerminalId(
                            tab.nodes,
                            tab.rootNodeId,
                            terminalId,
                        );
                        if (leafId) {
                            get().closePaneInSplit(tab.id, leafId);
                            return;
                        }
                    }
                }
            },

            /**
             * Returns the terminalId of the focused pane in the active tab.
             */
            getActiveTerminalId: () => {
                const tab = get().getActiveTab();
                if (!tab) return null;
                if (tab.type === 'single') return tab.terminalId;
                if (tab.type === 'split') {
                    const leaf = tab.nodes[tab.activePaneId];
                    return leaf?.terminalId || null;
                }
                return null;
            },

            /**
             * Navigates to the next/previous pane within the active split tab.
             */
            focusAdjacentPane: (direction = 'next') => {
                const state = get();
                const tab = state.getActiveTab();
                if (!tab || tab.type !== 'split') return null;

                const leaves = getAllLeafNodeIds(tab.nodes, tab.rootNodeId);
                if (leaves.length <= 1) return null;

                const idx = leaves.indexOf(tab.activePaneId);
                const cur = idx === -1 ? 0 : idx;
                const next =
                    direction === 'next'
                        ? (cur + 1) % leaves.length
                        : (cur - 1 + leaves.length) % leaves.length;

                get().setActivePaneInTab(tab.id, leaves[next]);
                return leaves[next];
            },

            // ========== UTILS (internal) ==========

            /** Internal helper: removes tab at index and adjusts activeTabId */
            _removeTabAtIndex: (state, idx) => {
                const newTabs = state.tabs.filter((_, i) => i !== idx);
                let newActiveTabId = state.activeTabId;
                if (state.activeTabId === state.tabs[idx]?.id) {
                    if (newTabs.length > 0) {
                        newActiveTabId =
                            newTabs[Math.min(idx, newTabs.length - 1)]?.id || null;
                    } else {
                        newActiveTabId = null;
                    }
                }
                return { tabs: newTabs, activeTabId: newActiveTabId };
            },

            // ========== CLEANUP ==========

            clear: () => {
                set({ tabs: [], activeTabId: null, pendingSplitDrop: null });
            },

            resetLayout: () => {
                set({ tabs: [], activeTabId: null, pendingSplitDrop: null });
                window.dispatchEvent(new Event('terminal:relayout'));
            },

        }),
        { name: 'SplitStore' },
    ),
);

// ─── Async rehydration from disk ──────────────────────────────────────
loadLayoutFromDisk().then((data) => {
    const state = useSplitStore.getState();
    console.log('[SplitStore] Rehydrating from disk:', {
        hasData: !!data,
        tabsCount: data?.tabs?.length || 0,
        activeTabId: data?.activeTabId,
        currentTabsCount: state.tabs.length,
        currentActiveTabId: state.activeTabId
    });

    if (data && data.tabs?.length) {
        useSplitStore.setState({
            tabs: data.tabs,
            activeTabId: data.activeTabId ?? state.activeTabId,
            rehydrated: true
        });
        console.log('[SplitStore] Layout restored successfully');
        saveLayoutToDisk(data.tabs, data.activeTabId);
    } else {
        console.log('[SplitStore] No layout to restore');
        useSplitStore.setState({ rehydrated: true });
    }
});

// ─── Auto-save layout to disk whenever tabs change ────────────────────
let saveTimer;
useSplitStore.subscribe((state) => {
    if (!state.rehydrated) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        saveLayoutToDisk(state.tabs, state.activeTabId);
    }, 500);
});

export default useSplitStore;