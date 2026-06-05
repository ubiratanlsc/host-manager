import {
    Dialog,
    DialogContent,
    DialogTitle
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState, useMemo } from "react";
import { useConfigStore, useModalStore } from "@/stores";
import HostCard from "../Cards/Hostscard";

export default function DialogListConections() {
    const { customers, groups } = useConfigStore();
    const { modals, closeModal } = useModalStore();

    const tabs = useMemo(() => {
        const result = [];
        if (groups.length > 0) {
            result.push({ id: '__all__', name: 'Todos' });
            groups.forEach(g => result.push({ id: g.id, name: g.name }));
        }
        const ungrouped = customers.filter(c =>
            !c.groups || c.groups.length === 0 || !groups.some(g => c.groups.includes(g.id))
        );
        if (ungrouped.length > 0) {
            result.push({ id: '__ungrouped__', name: 'Sem grupo' });
        }
        return result;
    }, [customers, groups]);

    const [defaultTab, setDefaultTab] = useState(null);

    useEffect(() => {
        if (tabs.length > 0 && defaultTab === null) {
            setDefaultTab(tabs[0].id);
        }
    }, [tabs, defaultTab]);

    const getCustomersForTab = (tabId) => {
        if (tabId === '__all__') return customers;
        if (tabId === '__ungrouped__') {
            return customers.filter(c =>
                !c.groups || c.groups.length === 0 || !groups.some(g => c.groups.includes(g.id))
            );
        }
        return customers.filter(c => c.groups && c.groups.includes(tabId));
    };

    const handleOpenChange = (open) => {
        if (!open) closeModal('connections');
    };

    return (
        <Dialog open={modals.connections} onOpenChange={handleOpenChange}>
            <DialogContent className="w-[calc(100vw-2rem)] md:w-[88vw] lg:w-[85vw] xl:w-[80vw] max-w-[1200px] max-h-[88vh] overflow-hidden flex flex-col p-0">
                <DialogTitle className="sr-only">Lista de Conexões</DialogTitle>
                <div className="flex h-full min-h-[500px]">
                    <Tabs defaultValue={defaultTab || undefined} orientation="vertical" className="flex w-full" onValueChange={(v) => setDefaultTab(v)}>
                        <TabsList className="flex flex-col h-full justify-start w-48 rounded-none border-r bg-muted/50 p-2 space-y-1">
                            {tabs.map(({ id, name }) => (
                                <TabsTrigger key={id} value={id} className="w-full justify-start">
                                    {name}
                                </TabsTrigger>
                            ))}
                            {tabs.length === 0 && (
                                <div className="text-sm text-muted-foreground p-2 text-center">
                                    Nenhum host salvo
                                </div>
                            )}
                        </TabsList>
                        <div className="flex-1 overflow-auto p-4 bg-background">
                            {tabs.map(({ id, name }) => {
                                const filteredCustomers = getCustomersForTab(id);

                                return (
                                    <TabsContent key={id} value={id} className="mt-0 h-full">
                                        <div className="flex gap-4 flex-wrap content-start">
                                            {filteredCustomers.length > 0 ? (
                                                filteredCustomers.map(customer => (
                                                    <HostCard
                                                        key={customer.id}
                                                        host={{
                                                            status: 'online',
                                                            hostname: customer.name,
                                                            group: name,
                                                            ip: customer.host,
                                                            port: customer.port
                                                        }}
                                                    />
                                                ))
                                            ) : (
                                                <div className="flex flex-col items-center justify-center w-full h-64 text-center text-muted-foreground">
                                                    <p className="text-lg font-medium mb-2">
                                                        Nenhum host encontrado
                                                    </p>
                                                    <p className="text-sm">
                                                        {id === '__ungrouped__'
                                                            ? 'Todos os hosts pertencem a um grupo.'
                                                            : 'Não há hosts neste grupo ainda.'}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>
                                );
                            })}
                            {tabs.length === 0 && (
                                <div className="flex flex-col items-center justify-center w-full h-64 text-center text-muted-foreground">
                                    <p className="text-lg font-medium mb-2">
                                        Nenhum host salvo
                                    </p>
                                    <p className="text-sm">
                                        Crie uma nova conexão para começar.
                                    </p>
                                </div>
                            )}
                        </div>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    );
}
