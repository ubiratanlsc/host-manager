import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import useConfigStore from "../../stores/ConfigData";
import GroupCard from "../Cards/Groupscard";
import useModalStore from "../../stores/useModalStore";
import { Loader2 } from "lucide-react";

export default function DialogListGroups() {
    const { groups } = useConfigStore();
    const { modals, closeModal } = useModalStore();

    if (!groups) {
        return (
            <Dialog open={modals.groupsList} onOpenChange={(open) => !open && closeModal('groupsList')}>
                <DialogContent>
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
            <DialogContent className="max-w-4xl max-h-[88vh] overflow-hidden flex flex-col p-4">
                <div className="flex flex-col gap-2 overflow-auto">
                    <h2 className="text-lg font-semibold mb-2">My Groups</h2>
                    <div className="flex flex-wrap gap-4">
                        {groups.map(({ id, name }, index) => (
                            <div key={index} className="w-full sm:w-auto">
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
