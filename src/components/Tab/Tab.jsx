import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    DndContext,
    DragOverlay,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import useTabStore from "../../stores/useTabStore";
import SplitPane from "../Split/SplitPane";
import TerminalComponent from "../../Terminal/TerminalComponent";
import SSHComponent from "../../ssh/SSHComponent";
import { cn } from "@/lib/utils";

/**
 * Sortable Tab Trigger - Tab que pode ser arrastada
 */
const SortableTabTrigger = ({ tab, groupId, onClose }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: tab.id,
        data: {
            type: 'tab',
            tab,
            groupId,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "relative group flex items-center gap-2 px-3 py-1.5 rounded-md",
                "data-[state=active]:bg-background data-[state=active]:text-foreground",
                "hover:bg-accent/50 transition-colors"
            )}
            {...attributes}
        >
            <div
                {...listeners}
                className="cursor-grab active:cursor-grabbing touch-none"
            >
                <GripVertical className="w-3 h-3 text-muted-foreground" />
            </div>

            <TabsTrigger
                value={tab.id}
                className="flex-1 px-0 py-0 h-auto border-none shadow-none"
            >
                {tab.name}
            </TabsTrigger>

            <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive p-0"
                onClick={(e) => {
                    e.stopPropagation();
                    onClose(tab.id);
                }}
            >
                <X className="h-3 w-3" />
            </Button>
        </div>
    );
};

/**
 * Sortable Sub Tab - Sub-tab dentro de um grupo
 */
const SortableSubTab = ({ subTab, groupId, onClose }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: subTab.id,
        data: {
            type: 'subTab',
            subTab,
            groupId,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="relative group flex items-center gap-2"
            {...attributes}
        >
            <div
                {...listeners}
                className="cursor-grab active:cursor-grabbing touch-none"
            >
                <GripVertical className="w-3 h-3 text-muted-foreground" />
            </div>

            <TabsTrigger value={subTab.id} className="flex-1">
                {subTab.name}
            </TabsTrigger>

            <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive"
                onClick={(e) => {
                    e.stopPropagation();
                    onClose(subTab.id);
                }}
            >
                <X className="h-3 w-3" />
            </Button>
        </div>
    );
};

/**
 * Drag Overlay - Visualização do item sendo arrastado
 */
const TabDragOverlay = ({ activeItem }) => {
    if (!activeItem) return null;

    const isTab = activeItem.data?.current?.type === 'tab';
    const item = isTab ? activeItem.data.current.tab : activeItem.data.current.subTab;

    return (
        <div className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md shadow-lg">
            {item?.group || item?.name}
        </div>
    );
};

/**
 * Tab Terms - Componente principal com Drag & Drop
 */
const TabTerms = () => {
    const { tabs, removeTab, objectSubTabs } = useTabStore();
    const [activeTab, setActiveTab] = useState(tabs[0]?.id);
    const [activeSubTab, setActiveSubTab] = useState({});
    const [activeId, setActiveId] = useState(null);

    // Configurar sensores para drag and drop
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    /**
     * Handler para início do drag
     */
    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    /**
     * Handler para fim do drag
     */
    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (!over || active.id === over.id) {
            setActiveId(null);
            return;
        }

        const activeData = active.data.current;
        const overData = over.data.current;

        // Reordenar tabs principais
        if (activeData?.type === 'tab' && overData?.type === 'tab') {
            const oldIndex = tabs.findIndex((t) => t.id === active.id);
            const newIndex = tabs.findIndex((t) => t.id === over.id);

            if (oldIndex !== newIndex) {
                const newTabs = arrayMove(tabs, oldIndex, newIndex);
                useTabStore.setState({ tabs: newTabs });
            }
        }

        // Reordenar sub-tabs dentro do mesmo grupo
        if (activeData?.type === 'subTab' && overData?.type === 'subTab') {
            if (activeData.groupId === overData.groupId) {
                const groupIndex = tabs.findIndex((t) => t.id === activeData.groupId);
                if (groupIndex === -1) return;

                const group = tabs[groupIndex];
                const oldIndex = group.content.findIndex((st) => st.id === active.id);
                const newIndex = group.content.findIndex((st) => st.id === over.id);

                if (oldIndex !== newIndex) {
                    const newContent = arrayMove(group.content, oldIndex, newIndex);
                    const newTabs = [...tabs];
                    newTabs[groupIndex] = { ...group, content: newContent };
                    useTabStore.setState({ tabs: newTabs });
                }
            }
        }

        // Mover sub-tab para outro grupo
        if (activeData?.type === 'subTab' && overData?.type === 'tab') {
            const sourceGroupIndex = tabs.findIndex((t) => t.id === activeData.groupId);
            const targetGroupIndex = tabs.findIndex((t) => t.id === over.id);

            if (sourceGroupIndex !== -1 && targetGroupIndex !== -1) {
                const sourceGroup = tabs[sourceGroupIndex];
                const targetGroup = tabs[targetGroupIndex];
                const subTab = sourceGroup.content.find((st) => st.id === active.id);

                if (subTab) {
                    const newTabs = [...tabs];
                    // Remover do grupo origem
                    newTabs[sourceGroupIndex] = {
                        ...sourceGroup,
                        content: sourceGroup.content.filter((st) => st.id !== active.id),
                    };
                    // Adicionar ao grupo destino
                    newTabs[targetGroupIndex] = {
                        ...targetGroup,
                        content: [...targetGroup.content, subTab],
                    };
                    useTabStore.setState({ tabs: newTabs });
                }
            }
        }

        setActiveId(null);
    };

    /**
     * Fecha uma tab principal
     */
    const handleCloseTab = (tabId) => {
        removeTab({ id: tabId });
        if (activeTab === tabId && tabs.length > 1) {
            const index = tabs.findIndex((t) => t.id === tabId);
            const nextTab = tabs[index + 1] || tabs[index - 1];
            setActiveTab(nextTab?.id);
        }
    };

    /**
     * Fecha uma sub-tab
     */
    const handleCloseSubTab = (groupId, subTabId) => {
        const groupIndex = tabs.findIndex((t) => t.id === groupId);
        if (groupIndex === -1) return;

        const group = tabs[groupIndex];
        const newContent = group.content.filter((st) => st.id !== subTabId);

        const newTabs = [...tabs];
        newTabs[groupIndex] = { ...group, content: newContent };
        useTabStore.setState({ tabs: newTabs });

        // Atualizar sub-tab ativa
        if (activeSubTab[groupId] === subTabId && newContent.length > 0) {
            setActiveSubTab({
                ...activeSubTab,
                [groupId]: newContent[0].id,
            });
        }
    };

    // Focar automaticamente na sub-aba recém-criada
    useEffect(() => {
        if (!objectSubTabs || !objectSubTabs.id) return;
        // Encontrar o grupo pelo nome
        const groupName = objectSubTabs.group || objectSubTabs.name || "Comum";
        const group = tabs.find((t) => t.name === groupName);
        if (!group) return;

        // Ativar a aba principal e a sub-aba recém-adicionada
        setActiveTab(group.id);
        setActiveSubTab((prev) => ({ ...prev, [group.id]: objectSubTabs.id }));
    }, [objectSubTabs, tabs]);

    if (tabs.length === 0) {
        return null;
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="w-full">
                <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="w-full"
                >
                    <TabsList className="w-full justify-start rounded-none border-b bg-background">
                        <SortableContext
                            items={tabs.map((t) => t.id)}
                            strategy={horizontalListSortingStrategy}
                        >
                            {tabs.map((tab) => (
                                <SortableTabTrigger
                                    key={tab.id}
                                    tab={tab}
                                    onClose={handleCloseTab}
                                />
                            ))}
                        </SortableContext>
                    </TabsList>

                    {tabs.map((tab) => (
                        <TabsContent key={tab.id} value={tab.id} className="mt-0">
                            {tab.content.length > 0 ? (
                                <Tabs
                                    value={activeSubTab[tab.id] || tab.content[0]?.id}
                                    onValueChange={(value) =>
                                        setActiveSubTab({ ...activeSubTab, [tab.id]: value })
                                    }
                                    className="w-full"
                                >
                                    <TabsList className="w-full justify-start rounded-none bg-muted/50">
                                        <SortableContext
                                            items={tab.content.map((st) => st.id)}
                                            strategy={horizontalListSortingStrategy}
                                        >
                                            {tab.content.map((subTab) => (
                                                <SortableSubTab
                                                    key={subTab.id}
                                                    subTab={subTab}
                                                    groupId={tab.id}
                                                    onClose={(subTabId) =>
                                                        handleCloseSubTab(tab.id, subTabId)
                                                    }
                                                />
                                            ))}
                                        </SortableContext>
                                    </TabsList>

                                    {tab.content.map((subTab) => (
                                        <TabsContent
                                            key={subTab.id}
                                            value={subTab.id}
                                            className="h-[calc(100vh-8rem)]"
                                        >
                                            {subTab.sessionType === 'ssh' ? (
                                                <SSHComponent sessionId={subTab.id} />
                                            ) : (
                                                <TerminalComponent terminalId={subTab.id} />
                                            )}
                                        </TabsContent>
                                    ))}
                                </Tabs>
                            ) : (
                                <div className="flex items-center justify-center h-64 text-muted-foreground">
                                    <p>Nenhum terminal neste grupo</p>
                                </div>
                            )}
                        </TabsContent>
                    ))}
                </Tabs>
            </div>

            <DragOverlay>
                <TabDragOverlay activeItem={activeId} />
            </DragOverlay>
        </DndContext>
    );
};

export default TabTerms;