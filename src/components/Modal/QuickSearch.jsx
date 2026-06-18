import { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Search, Server, Tag, Users } from "lucide-react";
import { useConfigStore, useModalStore } from "@/stores";
import { cn } from "@/lib/utils";

const sections = [
    { key: 'hosts', label: 'Hosts', icon: Server, color: 'text-blue-500' },
    { key: 'tags', label: 'Tags', icon: Tag, color: 'text-purple-500' },
    { key: 'groups', label: 'Grupos', icon: Users, color: 'text-emerald-500' },
];

export default function QuickSearch({ open, onClose }) {
    const { customers, tags, groups } = useConfigStore();
    const { openModal } = useModalStore();
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);

    const results = useMemo(() => {
        if (!query.trim()) return [];
        const q = query.toLowerCase();
        const out = [];
        const hosts = customers.filter(c => (c.name || '').toLowerCase().includes(q) || (c.host || '').toLowerCase().includes(q));
        if (hosts.length) out.push({ section: 'hosts', items: hosts.slice(0, 8).map(c => ({ id: c.id, label: c.name, description: `${c.host}:${c.port || 22}`, data: c })) });
        const filteredTags = tags.filter(t => (t.name || '').toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q)));
        if (filteredTags.length) out.push({ section: 'tags', items: filteredTags.slice(0, 8).map(t => ({ id: t.id, label: t.name, description: t.description, data: t })) });
        const filteredGroups = groups.filter(g => (g.name || '').toLowerCase().includes(q));
        if (filteredGroups.length) out.push({ section: 'groups', items: filteredGroups.slice(0, 8).map(g => ({ id: g.id, label: g.name, data: g })) });
        return out;
    }, [query, customers, tags, groups]);

    const flatItems = useMemo(() => {
        const items = [];
        results.forEach(section => {
            section.items.forEach(item => {
                items.push({ ...item, section: section.section });
            });
        });
        return items;
    }, [results]);

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

    const handleSelect = (item) => {
        onClose();
        if (item.section === 'hosts') {
            openModal('connections');
        } else if (item.section === 'tags') {
            openModal('tagList');
        } else if (item.section === 'groups') {
            openModal('groupsList');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(i => Math.min(i + 1, flatItems.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && flatItems[selectedIndex]) {
            e.preventDefault();
            handleSelect(flatItems[selectedIndex]);
        }
    };

    return (
        <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
            <DialogContent className="w-[calc(100vw-2rem)] sm:w-[540px] max-h-[70vh] top-[15%] translate-y-0 p-0 gap-0 overflow-hidden rounded-xl [&>button:last-child]:hidden">
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

                <div className="overflow-y-auto max-h-[50vh] p-2">
                    {!query.trim() ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <Search className="w-8 h-8 mb-3 opacity-30" />
                            <p className="text-sm">Digite para buscar em hosts, tags e grupos</p>
                        </div>
                    ) : flatItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <p className="text-sm">Nenhum resultado para "<span className="font-medium">{query}</span>"</p>
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
                                            {items.map((item) => {
                                                const idx = flatItems.indexOf(item);
                                                return (
                                                    <button
                                                        key={`${section}-${item.id}`}
                                                        onClick={() => handleSelect(item)}
                                                        className={cn(
                                                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                                                            idx === selectedIndex ? "bg-accent" : "hover:bg-accent/50"
                                                        )}
                                                    >
                                                        {Icon && <Icon className={cn("w-4 h-4 shrink-0", meta?.color)} />}
                                                        <div className="min-w-0 flex-1">
                                                            <div className="text-sm font-medium truncate">{item.label}</div>
                                                            {item.description && (
                                                                <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}
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
