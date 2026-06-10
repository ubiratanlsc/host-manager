import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

const useTabStore = create((set, get) => ({
    objectTabs: {
        name: "",
        content: []
    },
    objectSubTabs: {
        id: uuidv4(),
        name: "",
        group: ""
    },
    tabs: [],

    setObjectTabs: (objectTabs) => set({ objectTabs }),
    setObjectSubTabs: (objectSubTabs) => set({ objectSubTabs }),

    addTab: (tab) => set((state) => ({
        tabs: [...state.tabs, tab.filter((t) => t.name !== tab.name)]
    })),

    removeTab: (tab) => set((state) => ({
        tabs: state.tabs.filter((t) => t.id !== tab.id)
    })),

    // Função para adicionar objeto a grupo
    addObjectToGroup: (object) => set((state) => {
        // Determinar o nome do grupo
        const groupName = object.group || object.name || "Comum";

        // Buscar se o grupo já existe
        const existingGroupIndex = state.tabs.findIndex(tab => tab.name === groupName);

        let newTabs = [...state.tabs];

        if (existingGroupIndex !== -1) {
            // Grupo existe, adicionar objeto ao conteúdo
            newTabs[existingGroupIndex] = {
                ...newTabs[existingGroupIndex],
                content: [...newTabs[existingGroupIndex].content, object]
            };
        } else {
            // Grupo não existe, criar novo grupo
            const newGroup = {
                id: uuidv4(),
                name: groupName,
                content: [object]
            };
            newTabs.push(newGroup);
        }

        return { tabs: newTabs };
    }),

    // Função mais completa que faz tudo em uma chamada
    setObjectAndAddToGroup: (object) => set((state) => {
        // Primeiro, setar o objeto (se necessário)
        const objectToAdd = {
            ...object,
            id: object.id || uuidv4(),
            name: object.name || "",
            group: object.group || ""
        };

        // Determinar o nome do grupo final
        const finalGroupName = objectToAdd.group || objectToAdd.name || "Comum";

        // Buscar grupo existente
        const existingGroupIndex = state.tabs.findIndex(tab => tab.name === finalGroupName);

        let newTabs = [...state.tabs];

        if (existingGroupIndex !== -1) {
            // Adicionar ao grupo existente
            newTabs[existingGroupIndex] = {
                ...newTabs[existingGroupIndex],
                content: [...newTabs[existingGroupIndex].content, objectToAdd]
            };
        } else {
            // Criar novo grupo
            const newGroup = {
                id: uuidv4(),
                name: finalGroupName,
                content: [objectToAdd]
            };
            newTabs.push(newGroup);
        }

        return {
            objectSubTabs: objectToAdd,
            tabs: newTabs
        };
    }),

    // Função para criar ou atualizar um grupo específico
    upsertGroupWithObject: (groupName, object) => set((state) => {
        const finalGroupName = groupName || object.group || "Comum";
        const objectToAdd = {
            ...object,
            id: object.id || uuidv4(),
            group: finalGroupName
        };

        const existingGroupIndex = state.tabs.findIndex(tab => tab.name === finalGroupName);
        let newTabs = [...state.tabs];

        if (existingGroupIndex !== -1) {
            // Atualizar grupo existente
            newTabs[existingGroupIndex] = {
                ...newTabs[existingGroupIndex],
                content: [...newTabs[existingGroupIndex].content, objectToAdd]
            };
        } else {
            // Criar novo grupo
            newTabs.push({
                id: uuidv4(),
                name: finalGroupName,
                content: [objectToAdd]
            });
        }

        return {
            objectSubTabs: objectToAdd,
            tabs: newTabs
        };
    })
}));

export default useTabStore;
