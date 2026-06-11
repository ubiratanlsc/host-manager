/**
 * Zustand Stores - Centralized State Management
 * 
 * Todos os stores da aplicação exportados de um único lugar
 */

// Core App Stores
export { default as useTerminalStore } from './useTerminalStore';
export { default as useSSHStore } from './useSSHStore';
export { default as useHostStore } from './useHostStore';
export { default as useAppStore } from './useAppStore';
export { default as useLayoutStore } from './useLayoutStore';
export { default as useModalStore } from './useModalStore';
export { default as useSplitStore } from './useSplitStore';
export { default as useTabStore } from './useTabStore';
export { default as useThemeStore } from './useThemeStore';
export { default as useCommandStore } from './useCommandStore';

// Config Componentized Stores
export { default as ThemeConfig } from './ThemeConfig';
export { default as FontConfig } from './FontConfig';
export { default as TerminalConfig } from './TerminalConfig';
export { default as ClipboardConfig } from './ClipboardConfig';
export { default as AppVersionConfig } from './AppVersionConfig';
export { default as useConfigStore } from './ConfigData';

// Data Managers
export { default as useLoadData } from './LoadData';
export { default as useSaveData } from './SaveData';
