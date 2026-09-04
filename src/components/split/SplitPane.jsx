import React from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { cn } from '@/lib/utils';
import { useSplitStore } from '@/stores';
import Pane from './Pane';

/**
 * Custom Resize Handle - Barra de redimensionamento personalizada com estilo premium
 */
const CustomResizeHandle = ({ direction }) => {
    return (
        <ResizableHandle
            className="transition-all duration-150 bg-transparent hover:bg-blue-500/60 z-50"
            data-panel-group-direction={direction}
        />
    );
};

/**
 * Split Pane Renderer - Renderiza recursivamente a árvore de splits
 */
const SplitPaneRenderer = ({ tabId, nodes, nodeId, isActiveTab }) => {
    const node = nodes[nodeId];
    const updateNodeSizes = useSplitStore((state) => state.updateNodeSizes);

    if (!node) return null;

    // Painel único (folha)
    if (node.type === 'leaf') {
        return (
            <Pane
                tabId={tabId}
                paneId={nodeId}
                terminalId={node.terminalId}
                isSplitLayout={true}
                isActiveTab={isActiveTab}
            />
        );
    }

    // Container com filhos
    const defaultSizes = node.sizes || [50, 50];

    return (
        <ResizablePanelGroup
            direction={node.direction}
            onLayoutChange={(sizes) => {
                updateNodeSizes(tabId, nodeId, sizes);
                // Notificar relayout do terminal
                window.dispatchEvent(new Event('terminal:relayout'));
            }}
            className="w-full h-full min-h-0"
        >
            <ResizablePanel className="z-[1] min-h-0 overflow-hidden" defaultSize={defaultSizes[0]} minSize={10}>
                <SplitPaneRenderer tabId={tabId} nodes={nodes} nodeId={node.children[0]} isActiveTab={isActiveTab} />
            </ResizablePanel>

            <CustomResizeHandle direction={node.direction} />

            <ResizablePanel className="z-[2] min-h-0 overflow-hidden" defaultSize={defaultSizes[1]} minSize={10}>
                <SplitPaneRenderer tabId={tabId} nodes={nodes} nodeId={node.children[1]} isActiveTab={isActiveTab} />
            </ResizablePanel>
        </ResizablePanelGroup>
    );
};

/**
 * Split Pane Container - Componente principal
 */
const TabContent = ({ tab, isActiveTab }) => {
    if (tab.type === 'single') {
        return (
            <Pane
                tabId={tab.id}
                paneId={tab.id}
                terminalId={tab.terminalId}
                isSplitLayout={false}
                isActiveTab={isActiveTab}
            />
        );
    }

    return (
        <SplitPaneRenderer
            tabId={tab.id}
            nodes={tab.nodes}
            nodeId={tab.rootNodeId}
            isActiveTab={isActiveTab}
        />
    );
};

const SplitPane = () => {
    const tabs = useSplitStore((state) => state.tabs);
    const activeTabId = useSplitStore((state) => state.activeTabId);
    const hasActiveTab = tabs.some((tab) => tab.id === activeTabId);

    if (!hasActiveTab) {
        return (
            <div className="flex-1 flex items-center justify-center text-gray-500 h-full" onContextMenu={(e) => e.preventDefault()}>
                <p className="text-sm select-none">Nenhum terminal ativo</p>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full overflow-hidden">
            {tabs.map((tab) => {
                const isActiveTab = tab.id === activeTabId;
                return (
                    <div
                        key={tab.id}
                        className={isActiveTab ? 'absolute inset-0' : 'hidden'}
                        aria-hidden={!isActiveTab}
                    >
                        <TabContent tab={tab} isActiveTab={isActiveTab} />
                    </div>
                );
            })}
        </div>
    );
};

export default SplitPane;
