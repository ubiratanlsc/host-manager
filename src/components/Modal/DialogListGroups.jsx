import {
    Dialog,
    DialogContent,
    DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { v4 as uuidv4 } from 'uuid';
import { useConfigStore, useModalStore, useSaveData } from "@/stores";
import GroupCard from "../Group/Groupscard";
import { GroupModal } from "../Group/GroupModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import CloneGroupDialog from "../Group/CloneGroupDialog";
import { buildGroupOptions, getChildren, getDescendantIds } from "@/lib/groupTree";

export default function DialogListGroups() {
    const groups = useConfigStore((s) => s.groups);
    const customers = useConfigStore((s) => s.customers);
    const { saveGroup, updateGroup, deleteGroup } = useSaveData();
    const { modals, closeModal } = useModalStore();
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    const [newParentId, setNewParentId] = useState("");
    const [groupToDelete, setGroupToDelete] = useState(null);
    const [groupToClone, setGroupToClone] = useState(null);
    const [search, setSearch] = useState('');

    // Árvore achatada (grupo, subgrupos...). Na busca, um subgrupo que casa
    // mantém o pai visível para dar contexto.
    const visibleOptions = useMemo(() => {
        const options = buildGroupOptions(groups);
        if (!search.trim()) return options;
        const q = search.toLowerCase();
        const matches = new Set(options.filter((o) => (o.name || '').toLowerCase().includes(q)).map((o) => o.id));
        return options.filter((o) => matches.has(o.id)
            || (o.depth === 0 && options.some((c) => c.parentId === o.id && matches.has(c.id))));
    }, [groups, search]);

    const hostCountFor = (option) => {
        const ids = option.depth === 0 ? getDescendantIds(groups, option.id) : new Set([option.id]);
        return customers.filter((c) => (c.groups || []).some((id) => ids.has(id))).length;
    };

    const handleOpenChange = (open) => {
        if (!open) closeModal('groupsList');
    };

    const openGroupModal = (group, parentId = "") => {
        setEditingGroup(group);
        setNewParentId(parentId);
        setIsGroupModalOpen(true);
    };

    const handleSaveGroup = (groupData) => {
        if (groupData.id) {
            updateGroup(groupData.id, groupData);
        } else {
            saveGroup(uuidv4(), groupData.name, groupData.username, groupData.password, groupData.parentId);
        }
        setIsGroupModalOpen(false);
    };

    const confirmDeleteGroup = () => {
        if (groupToDelete) {
            deleteGroup(groupToDelete);
            setGroupToDelete(null);
        }
    };

    const subgroupsToDelete = groupToDelete ? getChildren(groups, groupToDelete).length : 0;
    const deleteDescription = subgroupsToDelete > 0
        ? `Tem certeza que deseja excluir este grupo? Os ${subgroupsToDelete} subgrupo(s) também serão excluídos e os hosts ficarão "Sem grupo". Esta ação não pode ser desfeita.`
        : 'Tem certeza que deseja excluir este grupo? Os hosts dele ficarão "Sem grupo". Esta ação não pode ser desfeita.';

    return (
        <>
            <Dialog open={modals.groupsList} onOpenChange={handleOpenChange}>
                <DialogContent className="w-[calc(100vw-2rem)] sm:w-[540px] max-h-[88vh] flex flex-col p-6">
                    <div className="pb-3 border-b">
                        <DialogTitle className="text-lg font-bold">Grupos</DialogTitle>
                    </div>

                    <div className="relative my-3">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar grupo ou subgrupo..."
                            className="pl-8 h-9 rounded-lg"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {groups.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground border-2 border-dashed rounded-xl">
                                <p>Nenhum grupo criado ainda.</p>
                            </div>
                        ) : visibleOptions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                                <p>Nenhum grupo encontrado para "<span className="font-medium">{search}</span>"</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1.5">
                                {visibleOptions.map((option) => (
                                    <GroupCard
                                        key={option.id}
                                        group={groups.find((g) => g.id === option.id)}
                                        depth={option.depth}
                                        hostCount={hostCountFor(option)}
                                        onEdit={(g) => openGroupModal(g)}
                                        onDelete={setGroupToDelete}
                                        onClone={setGroupToClone}
                                        onAddSubgroup={option.depth === 0 ? (g) => openGroupModal(null, g.id) : undefined}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end pt-4 border-t">
                        <Button onClick={() => openGroupModal(null)} className="gap-2" variant="default">
                            <Plus className="w-4 h-4" />
                            Novo Grupo
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <GroupModal
                isOpen={isGroupModalOpen}
                onClose={() => setIsGroupModalOpen(false)}
                onSave={handleSaveGroup}
                group={editingGroup}
                defaultParentId={newParentId}
            />

            <CloneGroupDialog group={groupToClone} onClose={() => setGroupToClone(null)} />

            <ConfirmDialog
                open={!!groupToDelete}
                onOpenChange={(o) => { if (!o) setGroupToDelete(null); }}
                title="Excluir grupo"
                description={deleteDescription}
                onConfirm={confirmDeleteGroup}
                confirmLabel="Excluir"
                destructive
            />
        </>
    );
}
