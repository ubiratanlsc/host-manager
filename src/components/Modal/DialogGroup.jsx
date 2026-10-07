import { v4 as uuidv4 } from 'uuid';
import { useSaveData, useModalStore } from "@/stores";
import { GroupModal } from "@/components/Group/GroupModal";

/** "Novo → Grupo": mesmo formulário da lista de grupos (inclui grupo pai). */
export default function DialogGroup() {
    const { saveGroup } = useSaveData();
    const isOpen = useModalStore((s) => s.modals.group);
    const closeModal = useModalStore((s) => s.closeModal);

    const handleSave = (groupData) => {
        saveGroup(uuidv4(), groupData.name, groupData.username, groupData.password, groupData.parentId);
    };

    return (
        <GroupModal
            isOpen={isOpen}
            onClose={() => closeModal('group')}
            onSave={handleSave}
            group={null}
        />
    );
}
