import useModalStore from '@/stores/useModalStore';
import useCommandStore from '@/stores/useCommandStore';
import SaveCommandDialog from './SaveCommandDialog';

/**
 * Diálogo rápido de "Salvar comando" acionado pelo terminal (via modal store + draft).
 * O gerenciamento completo (listar/editar/excluir) fica em Configurações → Comandos.
 */
export default function CommandModals() {
    const saveOpen = useModalStore((s) => s.modals.saveCommand);
    const closeModal = useModalStore((s) => s.closeModal);
    const draft = useCommandStore((s) => s.draft);

    return (
        <SaveCommandDialog
            open={saveOpen}
            onOpenChange={(o) => { if (!o) closeModal('saveCommand'); }}
            initial={draft}
        />
    );
}
