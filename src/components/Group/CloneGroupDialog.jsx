import { useEffect, useMemo, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore, useConfigStore, useSaveData } from "@/stores";
import { findDuplicateGroupName, getChildren, getRootGroups, isRootGroup } from "@/lib/groupTree";
import { cn } from "@/lib/utils";

/**
 * Duplica um grupo ou subgrupo (só a estrutura, sem hosts).
 * - Grupo (cliente): novo nome e, opcionalmente, cópia de todos os subgrupos.
 * - Subgrupo (plataforma): escolhe um ou vários clientes de destino.
 */
export default function CloneGroupDialog({ group, onClose }) {
    const groups = useConfigStore((s) => s.groups);
    const { cloneGroup } = useSaveData();
    const isRoot = !!group && isRootGroup(group, groups);
    const children = useMemo(() => (group ? getChildren(groups, group.id) : []), [groups, group]);
    const roots = useMemo(() => getRootGroups(groups), [groups]);

    const [name, setName] = useState("");
    const [includeChildren, setIncludeChildren] = useState(true);
    const [parentIds, setParentIds] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!group) return;
        setName(isRoot ? `${group.name} (cópia)` : group.name);
        setIncludeChildren(true);
        setParentIds([]);
    }, [group, isRoot]);

    const toggleParent = (id) => setParentIds((current) => (
        current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));

    const handleClone = async () => {
        if (!name.trim()) {
            useAppStore.getState().addNotification({ type: 'warning', title: 'Campo obrigatório', message: 'Informe o nome da cópia.' });
            return;
        }
        if (isRoot && findDuplicateGroupName(groups, { name })) {
            useAppStore.getState().addNotification({ type: 'warning', title: 'Nome já existe', message: `Já existe um grupo principal chamado "${name.trim()}".` });
            return;
        }
        // Destinos que já têm um subgrupo com esse nome ficam de fora.
        const targets = parentIds.filter((parentId) => !findDuplicateGroupName(groups, { name, parentId }));
        if (!isRoot && targets.length === 0) {
            useAppStore.getState().addNotification({ type: 'warning', title: 'Escolha o destino', message: 'Selecione ao menos um grupo para receber a cópia.' });
            return;
        }
        setSaving(true);
        await cloneGroup(group.id, isRoot
            ? { name: name.trim(), includeChildren }
            : { name: name.trim(), parentIds: targets });
        setSaving(false);
        onClose();
    };

    return (
        <Dialog open={!!group} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="w-[calc(100vw-2rem)] sm:w-[480px] z-[60]">
                <DialogHeader>
                    <DialogTitle>{isRoot ? "Duplicar grupo" : "Duplicar subgrupo"}</DialogTitle>
                    <DialogDescription>
                        Copia a estrutura e o usuário/senha padrão. Os hosts não são copiados.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-2">
                    <div className="grid gap-2">
                        <Label htmlFor="clone-name">Nome da cópia</Label>
                        <Input
                            id="clone-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleClone(); }}
                            autoFocus
                        />
                    </div>

                    {isRoot ? (
                        children.length > 0 && (
                            <label className="flex items-start gap-2 text-sm cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={includeChildren}
                                    onChange={(e) => setIncludeChildren(e.target.checked)}
                                    className="accent-primary mt-0.5"
                                />
                                <span>
                                    Copiar também os {children.length} subgrupo{children.length === 1 ? '' : 's'}
                                    <span className="block text-xs text-muted-foreground truncate">
                                        {children.map((child) => child.name).join(', ')}
                                    </span>
                                </span>
                            </label>
                        )
                    ) : (
                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label>Criar em</Label>
                                <button
                                    type="button"
                                    className="text-xs text-muted-foreground hover:text-foreground"
                                    onClick={() => setParentIds(parentIds.length === roots.length ? [] : roots.map((root) => root.id))}
                                >
                                    {parentIds.length === roots.length ? 'Limpar' : 'Selecionar todos'}
                                </button>
                            </div>
                            <div className="max-h-56 overflow-y-auto rounded-md border p-1">
                                {roots.map((root) => {
                                    const alreadyHas = !!findDuplicateGroupName(groups, { name, parentId: root.id });
                                    return (
                                        <label
                                            key={root.id}
                                            className={cn("flex items-center gap-2 px-2 py-1.5 rounded text-sm", alreadyHas ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-accent/50")}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={!alreadyHas && parentIds.includes(root.id)}
                                                disabled={alreadyHas}
                                                onChange={() => toggleParent(root.id)}
                                                className="accent-primary"
                                            />
                                            <span className="truncate flex-1">{root.name}</span>
                                            {alreadyHas && (
                                                <span className="text-[10px] uppercase text-muted-foreground">já tem "{name.trim()}"</span>
                                            )}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleClone} disabled={saving}>
                        {saving ? 'Duplicando...' : 'Duplicar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
