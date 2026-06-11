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
const SplitPaneRenderer = ({ tabId, nodes, nodeId }) => {
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
            className="w-full h-full"
        >
            <ResizablePanel className="z-[1] overflow-hidden" defaultSize={defaultSizes[0]} minSize={10}>
                <SplitPaneRenderer tabId={tabId} nodes={nodes} nodeId={node.children[0]} />
            </ResizablePanel>

            <CustomResizeHandle direction={node.direction} />

            <ResizablePanel className="z-[2] overflow-hidden" defaultSize={defaultSizes[1]} minSize={10}>
                <SplitPaneRenderer tabId={tabId} nodes={nodes} nodeId={node.children[1]} />
            </ResizablePanel>
        </ResizablePanelGroup>
    );
};

/**
 * Split Pane Container - Componente principal
 */
const SplitPane = () => {
    const activeTab = useSplitStore((state) => state.getActiveTab());

    if (!activeTab) {
        return (
            <div className="flex-1 flex items-center justify-center text-gray-500 h-full" onContextMenu={(e) => e.preventDefault()}>
                <p className="text-sm select-none">Nenhum terminal ativo</p>
            </div>
        );
    }

    if (activeTab.type === 'single') {
        return (
            <div className="w-full h-full overflow-hidden">
                <Pane
                    tabId={activeTab.id}
                    paneId={activeTab.id}
                    terminalId={activeTab.terminalId}
                    isSplitLayout={false}
                />
            </div>
        );
    }

    return (
        <div className="w-full h-full overflow-hidden">
            <SplitPaneRenderer
                tabId={activeTab.id}
                nodes={activeTab.nodes}
                nodeId={activeTab.rootNodeId}
            />
        </div>
    );
};

export default SplitPane;
