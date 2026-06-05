import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { v4 as uuidv4 } from 'uuid';
import { useConfigStore, useModalStore } from "@/stores";
import { TagCard } from "../Tag/TagCard";
import { TagModal } from "../Tag/TagModal";

export default function DialogListTags() {
    const { tags, addTag, editTag, removeTag } = useConfigStore();
    const { modals, closeModal } = useModalStore();
    const [isTagModalOpen, setIsTagModalOpen] = useState(false);
    const [editingTag, setEditingTag] = useState(null);

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
        if (confirm("Tem certeza que deseja excluir esta tag?")) {
            removeTag(id);
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
                    <DialogHeader className="pb-4 border-b">
                        <DialogTitle className="text-2xl font-bold">Galeria de Tags</DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto py-6 pr-2">
                        {tags.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground border-2 border-dashed rounded-xl">
                                <p>Nenhuma tag criada ainda.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1.5">
                                {tags.map((tag) => (
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
        </>
    );
}
