import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import useConfigStore from "../../stores/ConfigData";
import HostCard from "../Cards/Hostscard";
import useModalStore from "../../stores/useModalStore";
import { Loader2 } from "lucide-react";

export default function DialogListConections() {
    // const [host, setHost] = useState("");
    const [defaultTab, setDefaultTab] = useState(null);
    // const [username, setUsername] = useState("");
    // const [password, setPassword] = useState("");
    const { customers, groups } = useConfigStore();
    const { modals, closeModal } = useModalStore();

    useEffect(() => {
        if (groups.length > 0) {
            setDefaultTab(groups[0].name)
        }
    }, [groups])

    if (defaultTab === null && groups.length === 0) {
        // Handle case where no groups exist or loading
        return (
            <Dialog open={modals.connections} onOpenChange={(open) => !open && closeModal('connections')}>
                <DialogContent>
                    <div className="flex justify-center p-4">
                        <Loader2 className="animate-spin h-6 w-6" />
                    </div>
                </DialogContent>
            </Dialog>
        )
    }

    const handleOpenChange = (open) => {
        if (!open) closeModal('connections');
    };

    return (
        <Dialog open={modals.connections} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-4xl max-h-[88vh] overflow-hidden flex flex-col p-0">
                <div className="flex h-full min-h-[500px]">
                    <Tabs defaultValue={defaultTab || undefined} orientation="vertical" className="flex w-full">
                        <TabsList className="flex flex-col h-full justify-start w-48 rounded-none border-r bg-muted/50 p-2 space-y-1">
                            {groups.map(({ id, name }) => (
                                <TabsTrigger key={name} value={name} className="w-full justify-start">
                                    {name}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                        <div className="flex-1 overflow-auto p-4 bg-background">
                            {groups.map(({ id, name }) => {
                                const filteredCustomers = customers.filter(customer => customer.groups.includes(id));

                                return (
                                    <TabsContent key={name} value={name} className="mt-0 h-full">
                                        <div className="flex gap-4 flex-wrap content-start">
                                            {filteredCustomers.length > 0 ? (
                                                filteredCustomers.map(customer => (
                                                    <HostCard
                                                        key={customer.name}
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
                                                        Não há hosts neste grupo ainda.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>
                                );
                            })}
                        </div>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    );
}
