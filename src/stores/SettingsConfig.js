/**
 * SettingsConfig - Re-exporta todos os stores de configuração
 * 
 * Façade para acesso centralizado a todas as configurações.
 * Cada domínio possui seu próprio store Zustand:
 * - ThemeConfig:      tema da interface e color scheme
 * - FontConfig:       fonte, tamanho e ligaduras
 * - TerminalConfig:   cursor, scrollback, lineHeight
 * - ClipboardConfig:  copiar/colar e botão direito
 * - AppVersionConfig: versão da aplicação
 */
export { default as ThemeConfig } from "./ThemeConfig";
export { default as FontConfig } from "./FontConfig";
export { default as TerminalConfig } from "./TerminalConfig";
export { default as ClipboardConfig } from "./ClipboardConfig";
export { default as AppVersionConfig } from "./AppVersionConfig";