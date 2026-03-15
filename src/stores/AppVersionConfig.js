import { create } from "zustand";

/**
AppVersionConfig - Metadados da aplicação 
Estado:
- version: Versão atual da aplicação

*/
const AppVersionConfig = create((set) => ({
    version: "0.0.1",
    setVersion: (version) => set({ version }),
}));

export default AppVersionConfig;
