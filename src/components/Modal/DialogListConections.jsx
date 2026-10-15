import {
    Dialog,
    DialogContent,
    DialogTitle
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Terminal, Server, Globe, Edit2, LayoutList, LayoutGrid, Rows3, Search, RefreshCw, Send, CheckSquare, FileInput, PencilLine, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useConfigStore, useModalStore, useSSHStore } from "@/stores";
import HostCard from "../Cards/Hostscard";
import { buildGroupOptions, getDescendantIds, getGroupPath } from "@/lib/groupTree";

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

const HostListRow = memo(function HostListRow({ customer, status }) {
    const spawnSSH = useSSHStore((state) => state.spawnSSH);
    const closeModal = useModalStore((s) => s.closeModal);
    const openModal = useModalStore((s) => s.openModal);
    const setEditingCustomer = useModalStore((s) => s.setEditingCustomer);

    const handleConnect = async () => {
        closeModal('connections');
        // O spawnSSH já exibe o progresso e o erro.
        await spawnSSH({ host: customer.host, port: customer.port || 22, username: customer.username, password: customer.password, identityFile: customer.identityFile }).catch(() => {});
    };

    const handleEdit = () => {
        setEditingCustomer(customer);
        openModal('host');
    };

    return (
        <div className="flex items-center justify-between p-2 px-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors group">
            <div className="flex items-center gap-2.5 min-w-0">
                <div className={statusDot(status)} />
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
});

const HostDetailCard = memo(function HostDetailCard({ customer, status, groupName }) {
    const spawnSSH = useSSHStore((state) => state.spawnSSH);
    const closeModal = useModalStore((s) => s.closeModal);
    const openModal = useModalStore((s) => s.openModal);
    const setEditingCustomer = useModalStore((s) => s.setEditingCustomer);

    const handleConnect = async () => {
        closeModal('connections');
        // O spawnSSH já exibe o progresso e o erro.
        await spawnSSH({ host: customer.host, port: customer.port || 22, username: customer.username, password: customer.password, identityFile: customer.identityFile }).catch(() => {});
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
                            <div className={statusDot(status)} />
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
});

export default function DialogListConections() {
    const customers = useConfigStore((s) => s.customers);
    const groups = useConfigStore((s) => s.groups);
    const hostStatus = useConfigStore((s) => s.hostStatus);
    const checkAllConnectivity = useConfigStore((s) => s.checkAllConnectivity);
    const isOpen = useModalStore((s) => s.modals.connections);
    const closeModal = useModalStore((s) => s.closeModal);
    const openModal = useModalStore((s) => s.openModal);
    const startBulkEdit = useModalStore((s) => s.startBulkEdit);
    const bulkEditApplied = useModalStore((s) => s.bulkEditApplied);
    const [viewMode, setViewMode] = useState('blocks');
    const [search, setSearch] = useState('');
    const [checking, setChecking] = useState(false);
    // Seleção múltipla: 'broadcast' dispara um comando, 'edit' edita em lote.
    const [selectMode, setSelectMode] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const lastClickedId = useRef(null);
    const [broadcastCmd, setBroadcastCmd] = useState('');
    const [broadcasting, setBroadcasting] = useState(false);
    const spawnSSH = useSSHStore((s) => s.spawnSSH);
    const sessions = useSSHStore((s) => s.sessions);
    const writeSSH = useSSHStore((s) => s.writeSSH);

    useEffect(() => {
        if (isOpen) {
            setChecking(true);
            checkAllConnectivity().finally(() => setChecking(false));
        }
    }, [isOpen, checkAllConnectivity]);

    const groupLabel = (c) => getGroupPath(groups, c.groups?.[0]) || 'Sem grupo';

    const searchFilter = (c) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (c.name || '').toLowerCase().includes(q)
            || (c.host || '').toLowerCase().includes(q)
            || groupLabel(c).toLowerCase().includes(q);
    };

    const tabs = useMemo(() => {
        const result = [];
        if (groups.length > 0) {
            result.push({ id: '__all__', name: 'Todos' });
            // Grupo (cliente) seguido dos subgrupos (plataformas), indentados.
            buildGroupOptions(groups).forEach(o => result.push({ id: o.id, name: o.name, depth: o.depth }));
        }
        const ungrouped = customers.filter(c =>
            !c.groups || c.groups.length === 0 || !groups.some(g => c.groups.includes(g.id))
        );
        if (ungrouped.length > 0) {
            result.push({ id: '__ungrouped__', name: 'Sem grupo' });
        }
        return result;
    }, [customers, groups]);

    const [selectedTab, setSelectedTab] = useState(null);
    // Se a aba escolhida sumir (grupo excluído), volta para a primeira.
    const activeTab = tabs.some((t) => t.id === selectedTab) ? selectedTab : tabs[0]?.id;

    const toggleSelect = (id, { shiftKey = false, visibleIds = [] } = {}) => {
        // A âncora é lida aqui, fora do updater: o React pode adiar o updater
        // para o render, quando a ref já teria o id deste clique.
        const from = lastClickedId.current ? visibleIds.indexOf(lastClickedId.current) : -1;
        const to = visibleIds.indexOf(id);
        const range = shiftKey && from !== -1 && to !== -1
            ? visibleIds.slice(Math.min(from, to), Math.max(from, to) + 1)
            : null;
        lastClickedId.current = id;

        setSelectedIds(prev => {
            const next = new Set(prev);
            // Shift-clique marca o intervalo visível entre o clique anterior e este.
            if (range) {
                range.forEach((visibleId) => next.add(visibleId));
                return next;
            }
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const clearSelection = () => {
        setSelectedIds(new Set());
        lastClickedId.current = null;
    };

    /** Clicar no modo já ativo desliga: os dois modos não convivem. */
    const enterSelectMode = (mode) => {
        setSelectMode((current) => (current === mode ? null : mode));
        clearSelection();
    };

    const exitSelectMode = () => {
        setSelectMode(null);
        clearSelection();
    };

    // Depois de gravar a edição em lote a seleção já cumpriu o papel. A porta
    // pode ter mudado, então o status de conectividade é testado de novo.
    useEffect(() => {
        if (bulkEditApplied === 0) return;
        setSelectMode(null);
        setSelectedIds(new Set());
        lastClickedId.current = null;
        setChecking(true);
        checkAllConnectivity({ force: true })
            .catch(() => { /* o status fica como estava */ })
            .finally(() => setChecking(false));
    }, [bulkEditApplied, checkAllConnectivity]);

    const handleBroadcast = async () => {
        if (!broadcastCmd.trim() || selectedIds.size === 0) return;
        setBroadcasting(true);
        const cmd = broadcastCmd.trim() + '\n';
        const selected = customers.filter(c => selectedIds.has(c.id));
        await Promise.all(selected.map(async (c) => {
            const existing = [...sessions.values()].find(s =>
                s.config?.host === c.host &&
                s.config?.port === (c.port || 22) &&
                s.config?.username === c.username &&
                !s.disconnected
            );
            if (existing) {
                await writeSSH(existing.id, cmd);
            } else {
                await spawnSSH({ host: c.host, port: c.port || 22, username: c.username, password: c.password, identityFile: c.identityFile }, cmd);
            }
        }));
        setBroadcasting(false);
        exitSelectMode();
        setBroadcastCmd('');
        closeModal('connections');
    };

    const getCustomersForTab = (tabId) => {
        const base = (() => {
            if (tabId === '__all__') return customers;
            if (tabId === '__ungrouped__') {
                return customers.filter(c =>
                    !c.groups || c.groups.length === 0 || !groups.some(g => c.groups.includes(g.id))
                );
            }
            // A aba de um grupo inclui os hosts dos subgrupos.
            const ids = getDescendantIds(groups, tabId);
            return customers.filter(c => (c.groups || []).some(id => ids.has(id)));
        })();
        return base.filter(searchFilter);
    };

    const handleOpenChange = (open) => {
        if (!open) {
            exitSelectMode();
            closeModal('connections');
        }
    };

    // Uma filtragem por render: a lista da aba ativa alimenta os cards e a
    // barra de seleção, e não refaz o filtro a cada tecla do broadcast.
    const visibleCustomers = useMemo(
        () => (activeTab ? getCustomersForTab(activeTab) : []),
        // getCustomersForTab é recriada em todo render; o que importa são
        // estes valores, dos quais ela depende.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [customers, groups, activeTab, search],
    );

    const selectVisible = () => setSelectedIds((prev) => new Set([...prev, ...visibleCustomers.map((customer) => customer.id)]));

    const hiddenSelected = (() => {
        if (!selectMode || selectedIds.size === 0) return 0;
        const visible = new Set(visibleCustomers.map((customer) => customer.id));
        return [...selectedIds].filter((id) => !visible.has(id)).length;
    })();

    const renderCustomers = (filteredCustomers) => {
        if (filteredCustomers.length === 0) return null;
        const visibleIds = filteredCustomers.map((customer) => customer.id);

        // Em modo de seleção o card inteiro é a caixa de marcação: também
        // pelo teclado (Tab para percorrer, Espaço/Enter para marcar,
        // Shift+Espaço para o intervalo). O conteúdo fica `inert` para os
        // botões de conectar e editar não roubarem o Tab, e recebe um recuo
        // para o marcador ter calha própria em vez de cobrir o card.
        const wrapWithSelect = (customer, el) => {
            if (!selectMode) return el;
            const isSelected = selectedIds.has(customer.id);
            const mark = (event) => toggleSelect(customer.id, { shiftKey: event.shiftKey, visibleIds });

            return (
                <div
                    key={customer.id}
                    role="checkbox"
                    aria-checked={isSelected}
                    aria-label={customer.name || customer.host}
                    tabIndex={0}
                    className={cn(
                        "group relative cursor-pointer rounded-lg transition-all duration-150",
                        "ring-2 ring-offset-1 ring-offset-background focus:outline-none focus-visible:ring-ring",
                        isSelected ? "ring-primary" : "ring-transparent hover:ring-primary/30",
                    )}
                    onClick={mark}
                    onKeyDown={(event) => {
                        if (event.key !== ' ' && event.key !== 'Enter') return;
                        event.preventDefault();
                        mark(event);
                    }}
                >
                    <span
                        aria-hidden="true"
                        className={cn(
                            "absolute left-1 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border-2 transition-colors",
                            isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/40 bg-background group-hover:border-primary/60",
                        )}
                    >
                        <Check className={cn("h-3 w-3 transition-opacity", isSelected ? "opacity-100" : "opacity-0")} strokeWidth={3} />
                    </span>
                    <div className="pointer-events-none select-none pl-7" inert="">{el}</div>
                    {isSelected && <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-lg bg-primary/5" />}
                </div>
            );
        };

        if (viewMode === 'list') {
            return (
                // Em modo de seleção as linhas respiram mais: o anel de cada
                // uma precisa de folga para não encostar na vizinha.
                <div className={cn("flex flex-col", selectMode ? "gap-2.5" : "gap-1.5")}>
                    {filteredCustomers.map(customer => wrapWithSelect(customer,
                        <HostListRow key={customer.id} customer={customer} status={hostStatus[customer.id]} />
                    ))}
                </div>
            );
        }

        if (viewMode === 'details') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredCustomers.map(customer => wrapWithSelect(customer,
                        <HostDetailCard key={customer.id} customer={customer} status={hostStatus[customer.id]} groupName={groupLabel(customer)} />
                    ))}
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredCustomers.map(customer => wrapWithSelect(customer,
                    <HostCard
                        key={customer.id}
                        customer={customer}
                        status={hostStatus[customer.id]}
                        groupName={groupLabel(customer)}
                    />
                ))}
            </div>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent
                className="w-[calc(100vw-2rem)] md:w-[88vw] lg:w-[85vw] xl:w-[80vw] max-w-[1200px] h-[88vh] overflow-hidden flex flex-col gap-0 p-0"
                onEscapeKeyDown={(event) => {
                    // Com seleção ativa, Esc desliga o modo em vez de fechar a lista.
                    if (!selectMode) return;
                    event.preventDefault();
                    exitSelectMode();
                }}
            >
                <DialogTitle className="sr-only">Lista de Conexões</DialogTitle>
                {/* Altura fixa: a barra de grupos e a lista de hosts rolam cada uma por si. */}
                <div className="flex flex-1 min-h-0">
                    <Tabs value={activeTab} orientation="vertical" className="flex w-full min-h-0" onValueChange={setSelectedTab}>
                        <TabsList className="flex flex-col h-full items-stretch justify-start w-52 shrink-0 overflow-y-auto overflow-x-hidden rounded-none border-r bg-background p-2 space-y-1">
                            {tabs.map(({ id, name, depth }) => (
                                <TabsTrigger
                                    key={id}
                                    value={id}
                                    title={name}
                                    className={cn(
                                        "w-full shrink-0 justify-start data-[state=active]:bg-muted",
                                        depth > 0 && "pl-6 text-xs text-muted-foreground"
                                    )}
                                >
                                    <span className="truncate">{depth > 0 ? `↳ ${name}` : name}</span>
                                </TabsTrigger>
                            ))}
                            {tabs.length === 0 && (
                                <div className="text-sm text-muted-foreground p-2 text-center">
                                    Nenhum host salvo
                                </div>
                            )}
                        </TabsList>
                        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
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
                                    <button
                                        onClick={() => { setChecking(true); checkAllConnectivity().finally(() => setChecking(false)); }}
                                        disabled={checking}
                                        className="p-1 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50"
                                        title="Verificar conectividade"
                                    >
                                        <RefreshCw className={cn("w-3.5 h-3.5", checking && "animate-spin")} />
                                    </button>
                                    {/* Os dois modos de seleção ficam juntos, separados das visualizações. */}
                                    <span className="mx-0.5 h-4 w-px bg-border" />
                                    <button
                                        onClick={() => enterSelectMode('broadcast')}
                                        className={cn(
                                            "p-1 rounded-md transition-colors",
                                            selectMode === 'broadcast'
                                                ? "bg-primary text-primary-foreground shadow-sm"
                                                : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                        )}
                                        title="Selecionar hosts para broadcast"
                                        aria-pressed={selectMode === 'broadcast'}
                                    >
                                        <CheckSquare className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => enterSelectMode('edit')}
                                        className={cn(
                                            "p-1 rounded-md transition-colors",
                                            selectMode === 'edit'
                                                ? "bg-primary text-primary-foreground shadow-sm"
                                                : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                        )}
                                        title="Selecionar hosts para editar em lote"
                                        aria-pressed={selectMode === 'edit'}
                                    >
                                        <PencilLine className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="mx-0.5 h-4 w-px bg-border" />
                                    <button
                                        onClick={() => openModal('importSsh')}
                                        className="p-1 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
                                        title="Importar do ~/.ssh/config"
                                    >
                                        <FileInput className="w-3.5 h-3.5" />
                                    </button>
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
                                {/* Só a aba ativa é montada: filtrar e renderizar todas a cada
                                    atualização trava a lista quando há centenas de hosts. */}
                                {tabs.filter(({ id }) => id === activeTab).map(({ id }) => {
                                    const content = renderCustomers(visibleCustomers);

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
                {selectMode && (
                    <div className="border-t bg-muted/40 px-3 py-2.5 flex items-center gap-2 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <span className={cn(
                            "inline-flex items-center gap-1.5 h-8 shrink-0 rounded-full px-2.5 text-xs font-medium transition-colors",
                            selectedIds.size > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                        )}>
                            {selectMode === 'broadcast' ? <Send className="w-3.5 h-3.5" /> : <PencilLine className="w-3.5 h-3.5" />}
                            {selectedIds.size} selecionado{selectedIds.size !== 1 ? 's' : ''}
                        </span>
                        {hiddenSelected > 0 && (
                            <span className="inline-flex items-center gap-1 shrink-0 text-[11px] text-amber-600 dark:text-amber-400" title="A seleção inclui hosts que a aba ou a busca atual não mostram">
                                <AlertTriangle className="w-3 h-3" />
                                {hiddenSelected} fora desta aba ou do filtro
                            </span>
                        )}
                        <span className="h-5 w-px bg-border shrink-0" />
                        <Button variant="outline" size="sm" className="h-8 text-xs shrink-0" onClick={selectVisible} disabled={visibleCustomers.length === 0}>
                            Selecionar visíveis
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 text-xs shrink-0" onClick={clearSelection} disabled={selectedIds.size === 0}>
                            Limpar
                        </Button>
                        {selectMode === 'broadcast' ? (
                            <>
                                <input
                                    value={broadcastCmd}
                                    onChange={e => setBroadcastCmd(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleBroadcast()}
                                    placeholder="Comando para executar em todos..."
                                    className="flex-1 min-w-0 h-8 px-2.5 text-xs rounded-md border bg-background placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                                />
                                <Button
                                    size="sm"
                                    className="h-8 gap-1.5 text-xs shrink-0"
                                    onClick={handleBroadcast}
                                    disabled={broadcasting || selectedIds.size === 0 || !broadcastCmd.trim()}
                                >
                                    <Send className="w-3 h-3" />
                                    {broadcasting ? 'Executando...' : 'Executar'}
                                </Button>
                            </>
                        ) : (
                            <>
                                <span className="flex-1 min-w-0 truncate text-[11px] leading-tight text-muted-foreground">
                                    Shift+clique marca um intervalo · nome e endereço ficam de fora · Esc sai da seleção
                                </span>
                                <Button
                                    size="sm"
                                    className="h-8 gap-1.5 text-xs shrink-0"
                                    onClick={() => startBulkEdit([...selectedIds])}
                                    disabled={selectedIds.size === 0}
                                >
                                    <PencilLine className="w-3 h-3" />
                                    Editar selecionados
                                </Button>
                            </>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
