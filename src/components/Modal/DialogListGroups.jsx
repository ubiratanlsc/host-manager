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
import { useConfigStore, useModalStore, useSaveData, useAppStore } from "@/stores";
import GroupCard from "../Group/Groupscard";
import { GroupModal } from "../Group/GroupModal";

export default function DialogListGroups() {
    const { groups, editGroup, removeGroup } = useConfigStore();
    const { saveGroup } = useSaveData();
    const { modals, closeModal } = useModalStore();
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    const [search, setSearch] = useState('');

    const filteredGroups = useMemo(() => {
        if (!search.trim()) return groups;
        const q = search.toLowerCase();
        return groups.filter(g => g.name.toLowerCase().includes(q));
    }, [groups, search]);

    const handleOpenChange = (open) => {
        if (!open) closeModal('groupsList');
    };

    const handleCreateGroup = () => {
        setEditingGroup(null);
        setIsGroupModalOpen(true);
    };

    const handleEditGroup = (group) => {
        setEditingGroup(group);
        setIsGroupModalOpen(true);
    };

    const handleDeleteGroup = (id) => {
        if (confirm("Tem certeza que deseja excluir este grupo?")) {
            removeGroup(id);
        }
    };

    const handleSaveGroup = (groupData) => {
        if (groupData.id) {
            editGroup(groupData.id, groupData);
            useAppStore.getState().addNotification({ type: 'success', title: 'Grupo atualizado', message: `${groupData.name} foi atualizado com sucesso.` });
        } else {
            saveGroup(uuidv4(), groupData.name, groupData.username, groupData.password);
        }
        setIsGroupModalOpen(false);
    };

    return (
        <>
            <Dialog open={modals.groupsList} onOpenChange={handleOpenChange}>
                <DialogContent className="w-[calc(100vw-2rem)] sm:w-[500px] max-h-[88vh] flex flex-col p-6">
                    <div className="pb-3 border-b">
                        <DialogTitle className="text-lg font-bold">Grupos</DialogTitle>
                    </div>

                    <div className="relative my-3">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar grupo..."
                            className="pl-8 h-9 rounded-lg"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {groups.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground border-2 border-dashed rounded-xl">
                                <p>Nenhum grupo criado ainda.</p>
                            </div>
                        ) : filteredGroups.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                                <p>Nenhum grupo encontrado para "<span className="font-medium">{search}</span>"</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1.5">
                                {filteredGroups.map((group) => (
                                    <GroupCard
                                        key={group.id}
                                        group={group}
                                        onEdit={handleEditGroup}
                                        onDelete={handleDeleteGroup}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end pt-4 border-t">
                        <Button onClick={handleCreateGroup} className="gap-2" variant="default">
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
            />
        </>
    );
}
