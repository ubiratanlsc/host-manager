import {
    Dialog,
    DialogContent,
    DialogTitle
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState, useMemo } from "react";
import { Terminal, Server, Globe, Edit2, LayoutList, LayoutGrid, Rows3, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useConfigStore, useModalStore, useSSHStore } from "@/stores";
import HostCard from "../Cards/Hostscard";

const statusDot = (status) => {
    const colors = {
        online: 'bg-emerald-500',
        offline: 'bg-red-500',
        unknown: 'bg-amber-500',
    };
    return `w-2 h-2 rounded-full shrink-0 ${colors[status] || colors.unknown}`;
};

const viewModes = [
    { id: 'list', icon: LayoutList, label: 'Lista' },
    { id: 'blocks', icon: LayoutGrid, label: 'Blocos' },
    { id: 'details', icon: Rows3, label: 'Detalhes' },
];

function HostListRow({ customer, groupName }) {
    const spawnSSH = useSSHStore((state) => state.spawnSSH);
    const { closeModal, openModal, setEditingCustomer } = useModalStore();

    const handleConnect = async () => {
        closeModal('connections');
        await spawnSSH({ host: customer.host, port: customer.port || 22, username: customer.username, password: customer.password, identityFile: customer.identityFile });
    };

    const handleEdit = () => {
        setEditingCustomer(customer);
        openModal('host');
    };

    return (
        <div className="flex items-center justify-between p-2 px-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors group">
            <div className="flex items-center gap-2.5 min-w-0">
                <div className={statusDot(customer.status)} />
                <Server className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate">{customer.name}</span>
                <span className="text-xs text-muted-foreground hidden sm:inline">{customer.host}:{customer.port || 22}</span>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={handleConnect}
                    className="p-1.5 rounded-md hover:bg-background transition-colors text-muted-foreground hover:text-foreground"
                    title="Conectar"
                >
                    <Terminal className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={handleEdit}
                    className="p-1.5 rounded-md hover:bg-background transition-colors text-muted-foreground hover:text-foreground"
                    title="Editar"
                >
                    <Edit2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

function HostDetailCard({ customer, groupName }) {
    const spawnSSH = useSSHStore((state) => state.spawnSSH);
    const { closeModal, openModal, setEditingCustomer } = useModalStore();

    const handleConnect = async () => {
        closeModal('connections');
        await spawnSSH({ host: customer.host, port: customer.port || 22, username: customer.username, password: customer.password, identityFile: customer.identityFile });
    };

    const handleEdit = () => {
        setEditingCustomer(customer);
        openModal('host');
    };

    return (
        <div className="rounded-lg border bg-card p-4 transition-all hover:shadow-md">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <Server className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <div className={statusDot(customer.status)} />
                            <h3 className="font-semibold text-sm truncate">{customer.name}</h3>
                        </div>
                        <span className="text-xs text-muted-foreground truncate block">{groupName}</span>
                    </div>
                </div>
                <div className="flex gap-1">
                    <Button variant="secondary" size="icon" className="h-8 w-8" onClick={handleConnect} title="Conectar">
                        <Terminal className="w-4 h-4" />
                    </Button>
                    <Button variant="secondary" size="icon" className="h-8 w-8" onClick={handleEdit} title="Editar">
                        <Edit2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Globe className="w-3.5 h-3.5" />
                    <span className="font-mono truncate">{customer.host}:{customer.port || 22}</span>
                </div>
                {/* <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                    <Server className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{customer.username}</span>
                </div> */}
            </div>
        </div>
    );
}

export default function DialogListConections() {
    const { customers, groups } = useConfigStore();
    const { modals, closeModal, openModal, setEditingCustomer } = useModalStore();
    const [viewMode, setViewMode] = useState('blocks');
    const [search, setSearch] = useState('');

    const searchFilter = (c) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.host.toLowerCase().includes(q);
    };

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
        const base = (() => {
            if (tabId === '__all__') return customers;
            if (tabId === '__ungrouped__') {
                return customers.filter(c =>
                    !c.groups || c.groups.length === 0 || !groups.some(g => c.groups.includes(g.id))
                );
            }
            return customers.filter(c => c.groups && c.groups.includes(tabId));
        })();
        return base.filter(searchFilter);
    };

    const handleOpenChange = (open) => {
        if (!open) closeModal('connections');
    };

    const renderCustomers = (filteredCustomers, groupName) => {
        if (filteredCustomers.length === 0) return null;

        const withStatus = filteredCustomers.map(c => ({ ...c, status: c.status || 'unknown' }));

        if (viewMode === 'list') {
            return (
                <div className="flex flex-col gap-1.5">
                    {withStatus.map(customer => (
                        <HostListRow key={customer.id} customer={customer} groupName={groupName} />
                    ))}
                </div>
            );
        }

        if (viewMode === 'details') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {withStatus.map(customer => (
                        <HostDetailCard key={customer.id} customer={customer} groupName={groupName} />
                    ))}
                </div>
            );
        }

        const handleEdit = (customer) => {
            setEditingCustomer(customer);
            openModal('host');
        };

        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {withStatus.map(customer => (
                    <HostCard
                        key={customer.id}
                        host={{
                            status: customer.status,
                            hostname: customer.name,
                            group: groupName,
                            ip: customer.host,
                            port: customer.port
                        }}
                        onEdit={() => handleEdit(customer)}
                    />
                ))}
            </div>
        );
    };

    return (
        <Dialog open={modals.connections} onOpenChange={handleOpenChange}>
            <DialogContent className="w-[calc(100vw-2rem)] md:w-[88vw] lg:w-[85vw] xl:w-[80vw] max-w-[1200px] max-h-[88vh] overflow-hidden flex flex-col p-0">
                <DialogTitle className="sr-only">Lista de Conexões</DialogTitle>
                <div className="flex h-full min-h-[500px]">
                    <Tabs defaultValue={defaultTab || undefined} orientation="vertical" className="flex w-full" onValueChange={(v) => setDefaultTab(v)}>
                        <TabsList className="flex flex-col h-full justify-start w-48 rounded-none border-r bg-background p-2 space-y-1">
                            {tabs.map(({ id, name }) => (
                                <TabsTrigger key={id} value={id} className="w-full justify-start data-[state=active]:bg-muted">
                                    {name}
                                </TabsTrigger>
                            ))}
                            {tabs.length === 0 && (
                                <div className="text-sm text-muted-foreground p-2 text-center">
                                    Nenhum host salvo
                                </div>
                            )}
                        </TabsList>
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex items-center gap-2 p-2 border-b shrink-0">
                                <div className="flex items-center gap-1">
                                    {viewModes.map(mode => (
                                        <button
                                            key={mode.id}
                                            onClick={() => setViewMode(mode.id)}
                                            className={cn(
                                                "p-1 rounded-md transition-colors",
                                                viewMode === mode.id
                                                    ? "bg-secondary text-secondary-foreground"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                            )}
                                            title={mode.label}
                                        >
                                            <mode.icon className="w-3.5 h-3.5" />
                                        </button>
                                    ))}
                                </div>
                                <div className="relative flex-1 max-w-md mx-auto">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                    <input
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder="Buscar por nome ou IP... (Ctrl+K)"
                                        className="w-full h-7 pl-7 pr-2 text-xs rounded-md border bg-background placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto p-4 bg-background">
                                {tabs.map(({ id, name }) => {
                                    const filteredCustomers = getCustomersForTab(id);
                                    const content = renderCustomers(filteredCustomers, name);

                                    return (
                                        <TabsContent key={id} value={id} className="mt-0 h-full">
                                            {content || (
                                                <div className="flex flex-col items-center justify-center w-full h-64 text-center text-muted-foreground">
                                                    <p className="text-lg font-medium mb-2">
                                                        {search ? 'Nenhum resultado' : 'Nenhum host encontrado'}
                                                    </p>
                                                    <p className="text-sm">
                                                        {search
                                                            ? `Nenhum host corresponde a "${search}"`
                                                            : id === '__ungrouped__'
                                                                ? 'Todos os hosts pertencem a um grupo.'
                                                                : 'Não há hosts neste grupo ainda.'
                                                        }
                                                    </p>
                                                </div>
                                            )}
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
                        </div>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    );
}
