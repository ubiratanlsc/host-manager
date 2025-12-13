import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import useTabStore from "../../stores/useTabStore";
import { useEffect } from "react";

const TabTerms = () => {
    const { tabs } = useTabStore();

    useEffect(() => {
        console.log(tabs);
    }, [tabs]);

    return (
        <Tabs defaultValue={tabs[0]?.id} orientation="vertical" className="">
            <TabsList className="w-full justify-start rounded-none">
                {tabs.map((tab) => (
                    <TabsTrigger key={tab.id} value={tab.id}>{tab.name}</TabsTrigger>
                ))}
            </TabsList>
            {tabs.map((tab) => (
                <TabsContent key={tab.id} value={tab.id}>
                    <Tabs defaultValue={tab.content[0]?.id} orientation="vertical" className="">
                        <TabsList className="w-full justify-start rounded-none mt-[-16px]">
                            {tab.content.map((subTab) => (
                                <TabsTrigger
                                    key={subTab.id}
                                    value={subTab.id}
                                    draggable
                                    onDragStart={(e) => {
                                        e.stopPropagation();
                                        e.dataTransfer.effectAllowed = "move";
                                        e.dataTransfer.setData("application/json", JSON.stringify({
                                            subTabId: subTab.id,
                                            sourceGroupId: tab.id
                                        }));
                                    }}
                                    style={{ cursor: 'grab' }}
                                    className="active:cursor-grabbing"
                                >
                                    {subTab.group}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                        {tab.content.map((subTab) => (
                            <TabsContent key={subTab.id} value={subTab.id}>
                                <p>Panel {subTab.id}</p>
                            </TabsContent>
                        ))}
                    </Tabs>
                </TabsContent>
            ))}
        </Tabs>
    );
}

export default TabTerms;
