// Mensagens de falha de login do backend (src-tauri/src/ssh/commands.rs)
// sempre começam com este prefixo.
const AUTH_ERROR_PREFIX = 'falha na autenticação';

export const errorMessage = (error) => (
    typeof error === 'string' ? error : error?.message || String(error ?? '')
);

export const isAuthError = (error) => (
    errorMessage(error).trim().toLowerCase().startsWith(AUTH_ERROR_PREFIX)
);

/**
 * Falhou o login de um host sem senha cadastrada: é hora de pedir a senha.
 * Hosts sem senha que entram por chave nunca chegam aqui, porque conectam.
 */
export const needsPassword = (error, config) => (
    isAuthError(error) && !(config?.password || '').trim()
);
