import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { v4 as uuidv4 } from 'uuid';
import { useConfigStore, useModalStore } from "@/stores";
import { TagCard } from "../Tag/TagCard";
import { TagModal } from "../Tag/TagModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function DialogListTags() {
    const { tags, addTag, editTag, removeTag } = useConfigStore();
    const { modals, closeModal } = useModalStore();
    const [isTagModalOpen, setIsTagModalOpen] = useState(false);
    const [editingTag, setEditingTag] = useState(null);
    const [search, setSearch] = useState('');
    const [tagToDelete, setTagToDelete] = useState(null);

    const filteredTags = useMemo(() => {
        if (!search.trim()) return tags;
        const q = search.toLowerCase();
        return tags.filter(t => (t.name || '').toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q)));
    }, [tags, search]);

    const handleOpenChange = (open) => {
        if (!open) closeModal('tagList');
    };

    const handleCreateTag = () => {
        setEditingTag(null);
        setIsTagModalOpen(true);
    };

    const handleEditTag = (tag) => {
        setEditingTag(tag);
        setIsTagModalOpen(true);
    };

    const handleDeleteTag = (id) => {
        setTagToDelete(id);
    };

    const confirmDeleteTag = () => {
        if (tagToDelete) {
            removeTag(tagToDelete);
            setTagToDelete(null);
        }
    };

    const handleSaveTag = (tagData) => {
        if (tagData.id) {
            editTag(tagData.id, tagData);
        } else {
            addTag(uuidv4(), tagData.name, tagData.description, tagData.color);
        }
        setIsTagModalOpen(false);
    };

    return (
        <>
            <Dialog open={modals.tagList} onOpenChange={handleOpenChange}>
                <DialogContent className="w-[calc(100vw-2rem)] sm:w-[500px] max-h-[88vh] flex flex-col p-6">
                    <DialogHeader className="pb-3 border-b">
                        <DialogTitle className="text-lg font-bold">Tags</DialogTitle>
                    </DialogHeader>

                    <div className="relative my-3">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar tag..."
                            className="pl-8 h-9 rounded-lg"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2">
                        {tags.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground border-2 border-dashed rounded-xl">
                                <p>Nenhuma tag criada ainda.</p>
                            </div>
                        ) : filteredTags.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                                <p>Nenhuma tag encontrada para "<span className="font-medium">{search}</span>"</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1.5">
                                {filteredTags.map((tag) => (
                                    <TagCard
                                        key={tag.id}
                                        tag={tag}
                                        onEdit={handleEditTag}
                                        onDelete={handleDeleteTag}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end pt-4 border-t">
                        <Button onClick={handleCreateTag} className="gap-2" variant="default">
                            <Plus className="w-4 h-4" />
                            Nova Tag
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <TagModal
                isOpen={isTagModalOpen}
                onClose={() => setIsTagModalOpen(false)}
                onSave={handleSaveTag}
                tag={editingTag}
            />

            <ConfirmDialog
                open={!!tagToDelete}
                onOpenChange={(o) => { if (!o) setTagToDelete(null); }}
                title="Excluir tag"
                description="Tem certeza que deseja excluir esta tag? Esta ação não pode ser desfeita."
                onConfirm={confirmDeleteTag}
                confirmLabel="Excluir"
                destructive
            />
        </>
    );
}
