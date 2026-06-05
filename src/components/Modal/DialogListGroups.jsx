import {
    Dialog,
    DialogContent,
    DialogTitle
} from "@/components/ui/dialog";
import { useConfigStore, useModalStore } from "@/stores";
import GroupCard from "../Cards/Groupscard";
import { Loader2 } from "lucide-react";

export default function DialogListGroups() {
    const { groups } = useConfigStore();
    const { modals, closeModal } = useModalStore();

    if (!groups) {
        return (
            <Dialog open={modals.groupsList} onOpenChange={(open) => !open && closeModal('groupsList')}>
                <DialogContent>
                    <DialogTitle className="sr-only">Carregando Grupos</DialogTitle>
                    <div className="flex justify-center p-4">
                        <Loader2 className="animate-spin h-6 w-6" />
                    </div>
                </DialogContent>
            </Dialog>
        )
    }

    const handleOpenChange = (open) => {
        if (!open) closeModal('groupsList');
    };

    return (
        <Dialog open={modals.groupsList} onOpenChange={handleOpenChange}>
            <DialogContent className="w-[calc(100vw-2rem)] md:w-[88vw] lg:w-[85vw] xl:w-[80vw] max-w-[1200px] max-h-[88vh] overflow-hidden flex flex-col p-4">
                <DialogTitle className="sr-only">Meus Grupos</DialogTitle>
                <div className="flex flex-col gap-2 overflow-auto">
                    <h2 className="text-lg font-semibold mb-2">My Groups</h2>
                    <div className="flex flex-wrap gap-4">
                        {groups.map(({ id, name }) => (
                            <div key={id} className="w-full sm:w-auto">
                                <GroupCard
                                    group={{
                                        name: name,
                                        length: '0' // Placeholder as in original
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
