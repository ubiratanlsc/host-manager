import { create } from "zustand";

const useModalStore = create((set) => ({
    modals: {
        connections: false,
        connect: false,
        group: false,
        groupsList: false,
        host: false,
        settings: false,
        tag: false,
        tagList: false,
    },

    // Abre um modal específico pelo ID
    openModal: (modalId) => set((state) => ({
        modals: { ...state.modals, [modalId]: true },
    })),

    // Fecha um modal específico pelo ID
    closeModal: (modalId) => set((state) => ({
        modals: { ...state.modals, [modalId]: false },
    })),

    // Alterna o estado de um modal (aberto/fechado)
    toggleModal: (modalId) => set((state) => ({
        modals: { ...state.modals, [modalId]: !state.modals[modalId] },
    })),

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
}));

export default useModalStore;