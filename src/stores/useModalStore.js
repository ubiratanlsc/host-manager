import { create } from "zustand";


const useModalStore = create((set, get) => ({
    modals: {
        connections: false,
        connect: false,
        group: false,
        groupsList: false,
        host: false,
        settings: false,
        tag: false,
        tagList: false,
        saveCommand: false,
    },
    
    overlayCount: 0,

    // Aba ativa do diálogo de Configurações (permite deep-link, ex.: abrir em "Comandos")
    settingsTab: 'appearance',
    setSettingsTab: (tab) => set({ settingsTab: tab }),

    // Retorna true se qualquer modal está aberto
    anyModalOpen: () => {
        return Object.values(get().modals).some(Boolean);
    },

    // Retorna true se QUALQUER sobreposição crítica estiver ativa (Modal ou Dropdown solto)
    isOverlayActive: () => {
        return get().overlayCount > 0 || get().anyModalOpen();
    },

    // Controle genérico para componentes como Dropdown/Select
    incrementOverlay: () => set((state) => ({ overlayCount: state.overlayCount + 1 })),
    decrementOverlay: () => set((state) => ({ overlayCount: Math.max(0, state.overlayCount - 1) })),

    // Abre um modal específico pelo ID
    openModal: (modalId) => {
        if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        set((state) => ({
            modals: { ...state.modals, [modalId]: true },
        }));
    },

    // Fecha um modal específico pelo ID
    closeModal: (modalId) => set((state) => ({
        modals: { ...state.modals, [modalId]: false },
    })),

    // Alterna o estado de um modal (aberto/fechado)
    toggleModal: (modalId) => {
        if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        set((state) => {
            return {
                modals: { ...state.modals, [modalId]: !state.modals[modalId] },
            }
        });
    },

    // Verifica se um modal está aberto
    isModalOpen: (modalId) => (state) => state.modals[modalId] || false,

    // Fecha todos os modais
    closeAllModals: () => set(() => ({
        modals: {
            connections: false,
            connect: false,
            group: false,
            groupsList: false,
            host: false,
            settings: false,
            tag: false,
        },
    })),

    editingCustomer: null,
    setEditingCustomer: (customer) => set({ editingCustomer: customer }),
}));

export default useModalStore;