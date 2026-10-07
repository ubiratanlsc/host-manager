import { useEffect } from 'react';
import useSplitStore from '@/stores/useSplitStore';
import useModalStore from '@/stores/useModalStore';

// Modais de navegação da barra superior (Alt+1/2/3).
const NAV_MODALS = ['connections', 'groupsList', 'tagList'];

/**
 * Alt+N alterna o modal: abre se estiver fechado, fecha se já estiver aberto.
 * Se outro modal de navegação estiver aberto, troca direto para o pedido.
 */
export function toggleNavModal(modalId) {
    const { modals, openModal, closeModal } = useModalStore.getState();
    if (modals[modalId]) {
        closeModal(modalId);
        return;
    }
    NAV_MODALS.filter((id) => id !== modalId && modals[id]).forEach(closeModal);
    openModal(modalId);
}

/**
 * Hook customizado para gerenciar atalhos globais de teclado da aplicação.
 * @param {boolean} disabled - Se os atalhos devem estar desativados.
 */
export function useGlobalShortcuts(disabled) {
    useEffect(() => {
        const handleKeyboard = (e) => {
            if (disabled) return;

            // Ctrl+Shift+R ou Cmd+Shift+R = resetar layout
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'r' || e.key === 'R')) {
                e.preventDefault();
                useSplitStore.getState().resetLayout();
                return;
            }

            if (e.altKey) {
                switch (e.key) {
                    case "1":
                        e.preventDefault();
                        toggleNavModal("connections");
                        break;
                    case "2":
                        e.preventDefault();
                        toggleNavModal("groupsList");
                        break;
                    case "3":
                        e.preventDefault();
                        toggleNavModal("tagList");
                        break;
                    case "n":
                    case "N":
                        e.preventDefault();
                        document.getElementById("new-dropdown-trigger")?.click();
                        break;
                    default:
                        break;
                }
            }
        };

        window.addEventListener("keydown", handleKeyboard);
        return () => window.removeEventListener("keydown", handleKeyboard);
    }, [disabled]);
}
