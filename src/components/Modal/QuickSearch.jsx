import { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Search, Server, Tag, Users } from "lucide-react";
import { useConfigStore, useModalStore, useSSHStore } from "@/stores";
import { getGroupPath } from "@/lib/groupTree";
import { cn } from "@/lib/utils";

const sections = [
    { key: 'hosts', label: 'Hosts', icon: Server, color: 'text-blue-500' },
    { key: 'tags', label: 'Tags', icon: Tag, color: 'text-purple-500' },
    { key: 'groups', label: 'Grupos', icon: Users, color: 'text-emerald-500' },
];

const MAX_PER_SECTION = 8;

export default function QuickSearch({ open, onClose }) {
    const { customers, tags, groups } = useConfigStore();
    const { openModal } = useModalStore();
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);
    const listRef = useRef(null);

    // Cada item já carrega seu índice na lista achatada usada pelas setas.
    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        const out = [];
        let index = 0;
        const push = (section, items) => {
            if (items.length) out.push({ section, items: items.map((item) => ({ ...item, section, index: index++ })) });
        };

        const hostItems = customers
            .map((c) => ({ c, groupPath: getGroupPath(groups, c.groups?.[0]) }))
            .filter(({ c, groupPath }) => !q
                || (c.name || '').toLowerCase().includes(q)
                || (c.host || '').toLowerCase().includes(q)
                || groupPath.toLowerCase().includes(q))
            .slice(0, MAX_PER_SECTION)
            .map(({ c, groupPath }) => ({
                id: c.id,
                label: c.name,
                description: [`${c.host}:${c.port || 22}`, groupPath].filter(Boolean).join(' · '),
                data: c,
            }));
        push('hosts', hostItems);

        // Com a busca vazia mostramos só hosts, para conectar direto pelo teclado.
        if (!q) return out;

        push('tags', tags
            .filter(t => (t.name || '').toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q)))
            .slice(0, MAX_PER_SECTION)
            .map(t => ({ id: t.id, label: t.name, description: t.description, data: t })));
        push('groups', groups
            .filter(g => getGroupPath(groups, g.id).toLowerCase().includes(q))
            .slice(0, MAX_PER_SECTION)
            .map(g => ({ id: g.id, label: getGroupPath(groups, g.id), data: g })));
        return out;
    }, [query, customers, tags, groups]);

    const flatItems = useMemo(() => results.flatMap((section) => section.items), [results]);

    useEffect(() => {
        if (open) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    // Mantém o item selecionado visível ao navegar com as setas.
    useEffect(() => {
        listRef.current
            ?.querySelector(`[data-index="${selectedIndex}"]`)
            ?.scrollIntoView({ block: 'nearest' });
    }, [selectedIndex]);

    const handleSelect = (item) => {
        onClose();
        if (item.section === 'hosts') {
            const c = item.data;
            useSSHStore.getState().spawnSSH({
                host: c.host,
                port: c.port || 22,
                username: c.username,
                password: c.password,
                identityFile: c.identityFile,
            }).catch(() => { /* o spawnSSH já exibe o erro */ });
        } else if (item.section === 'tags') {
            openModal('tagList');
        } else if (item.section === 'groups') {
            openModal('groupsList');
        }
    };

    const handleKeyDown = (e) => {
        if (flatItems.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(i => (i + 1) % flatItems.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(i => (i - 1 + flatItems.length) % flatItems.length);
        } else if (e.key === 'Enter' && flatItems[selectedIndex]) {
            e.preventDefault();
            handleSelect(flatItems[selectedIndex]);
        }
    };

    return (
        <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
            <DialogContent className="w-[calc(100vw-2rem)] sm:w-[540px] max-h-[70vh] top-[15%] translate-y-0 p-0 gap-0 overflow-hidden rounded-xl [&>button:last-child]:hidden">
                <DialogTitle className="sr-only">Busca rápida</DialogTitle>
                <div className="flex items-center gap-3 px-4 border-b">
                    <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Buscar hosts, tags ou grupos..."
                        className="flex-1 h-12 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                    />
                    <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted rounded border">
                        ESC
                    </kbd>
                </div>

                <div ref={listRef} className="overflow-y-auto max-h-[50vh] p-2">
                    {flatItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            {query.trim() ? (
                                <p className="text-sm">Nenhum resultado para "<span className="font-medium">{query}</span>"</p>
                            ) : (
                                <>
                                    <Search className="w-8 h-8 mb-3 opacity-30" />
                                    <p className="text-sm">Nenhum host salvo ainda</p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {results.map(({ section, items }) => {
                                const meta = sections.find(s => s.key === section);
                                const Icon = meta?.icon;
                                return (
                                    <div key={section}>
                                        <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                            {Icon && <Icon className={cn("w-3.5 h-3.5", meta?.color)} />}
                                            {meta?.label}
                                        </div>
                                        <div className="space-y-0.5">
                                            {items.map((item) => (
                                                <button
                                                    key={`${section}-${item.id}`}
                                                    data-index={item.index}
                                                    onClick={() => handleSelect(item)}
                                                    onMouseMove={() => setSelectedIndex(item.index)}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                                                        item.index === selectedIndex ? "bg-accent" : "hover:bg-accent/50"
                                                    )}
                                                >
                                                    {Icon && <Icon className={cn("w-4 h-4 shrink-0", meta?.color)} />}
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-sm font-medium truncate">{item.label}</div>
                                                        {item.description && (
                                                            <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                                                        )}
                                                    </div>
                                                    {item.index === selectedIndex && section === 'hosts' && (
                                                        <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] text-muted-foreground bg-muted rounded border">
                                                            Enter
                                                        </kbd>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
