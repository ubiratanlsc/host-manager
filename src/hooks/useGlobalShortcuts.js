import { useEffect } from 'react';

/**
 * Hook customizado para gerenciar atalhos globais de teclado da aplicação.
 * @param {boolean} disabled - Se os atalhos devem estar desativados.
 * @param {function} openModal - Função chamada para abrir modais específicos.
 */
export function useGlobalShortcuts(disabled, openModal) {
    useEffect(() => {
        const handleKeyboard = (e) => {
            if (disabled) return;
            if (e.altKey) {
                switch (e.key) {
                    case "1":
                        e.preventDefault();
                        openModal("connections");
                        break;
                    case "2":
                        e.preventDefault();
                        openModal("groupsList");
                        break;
                    case "3":
                        e.preventDefault();
                        openModal("tagList");
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
    }, [disabled, openModal]);
}
