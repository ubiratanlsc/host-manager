import { create } from "zustand";

// Todo modal precisa estar registrado aqui E ter um <Dialog> montado no App.
// Um id sem diálogo deixaria a flag `true` para sempre e o `inert` do App
// congelaria a área principal (só a barra de cima continuaria clicável).
const MODAL_IDS = [
    'connections',
    'connect',
    'group',
    'groupsList',
    'host',
    'settings',
    'tag',
    'tagList',
    'saveCommand',
    'importSsh',
];

const closedModals = () => Object.fromEntries(MODAL_IDS.map((id) => [id, false]));

const isKnownModal = (modalId) => {
    if (MODAL_IDS.includes(modalId)) return true;
    console.warn(`[modal] modal desconhecido ignorado: ${modalId}`);
    return false;
};

const blurActiveElement = () => {
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }
};

const useModalStore = create((set, get) => ({
    modals: closedModals(),

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
        if (!isKnownModal(modalId)) return;
        blurActiveElement();
        set((state) => ({
            modals: { ...state.modals, [modalId]: true },
        }));
    },

    // Fecha um modal específico pelo ID
    closeModal: (modalId) => {
        if (!isKnownModal(modalId)) return;
        set((state) => ({
            modals: { ...state.modals, [modalId]: false },
        }));
    },

    // Alterna o estado de um modal (aberto/fechado)
    toggleModal: (modalId) => {
        if (!isKnownModal(modalId)) return;
        blurActiveElement();
        set((state) => ({
            modals: { ...state.modals, [modalId]: !state.modals[modalId] },
        }));
    },

    // Verifica se um modal está aberto
    isModalOpen: (modalId) => (state) => state.modals[modalId] || false,

    // Fecha todos os modais
    closeAllModals: () => set(() => ({ modals: closedModals() })),

    editingCustomer: null,
    setEditingCustomer: (customer) => set({ editingCustomer: customer }),

    // Valores iniciais para um Novo Host (ex.: cadastrar a partir de uma aba aberta).
    hostDraft: null,
    setHostDraft: (draft) => set({ hostDraft: draft }),

    // Pedido para completar um host (ex.: login falhou por falta de senha):
    // { field: 'password', message, reconnect }.
    hostPrompt: null,
    setHostPrompt: (prompt) => set({ hostPrompt: prompt }),

    /** Abre a edição do host com o campo de senha em foco e um aviso. */
    requestHostPassword: (customer, message) => {
        blurActiveElement();
        set((state) => ({
            editingCustomer: customer,
            hostDraft: null,
            hostPrompt: { field: 'password', message, reconnect: true },
            modals: { ...state.modals, host: true },
        }));
    },
}));

export default useModalStore;
