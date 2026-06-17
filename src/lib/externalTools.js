import { invoke, isTauri } from "@tauri-apps/api/core";
import { useAppStore } from "@/stores";

/**
 * Variáveis disponíveis para os templates de argumento ({{VAR}}).
 * Os nomes são case-insensitive: {{HOST}}, {{host}} e {{Host}} são equivalentes.
 */
export const TOOL_VARIABLES = [
    { key: "HOST", label: "Host / IP" },
    { key: "HOSTNAME", label: "Host / IP (alias)" },
    { key: "NAME", label: "Nome do host" },
    { key: "USERNAME", label: "Usuário" },
    { key: "PASSWORD", label: "Senha" },
    { key: "PORT", label: "Porta" },
    { key: "IDENTITYFILE", label: "Arquivo de chave" },
];

/** Monta o mapa de variáveis a partir de um customer/host. */
export function hostToVars(customer) {
    return {
        HOST: customer?.host ?? "",
        HOSTNAME: customer?.host ?? "",
        NAME: customer?.name ?? "",
        USERNAME: customer?.username ?? "",
        PASSWORD: customer?.password ?? "",
        PORT: customer?.port ?? 22,
        IDENTITYFILE: customer?.identityFile ?? "",
    };
}

/**
 * Quebra um template de argumentos em tokens, respeitando aspas simples/duplas.
 * Ex.: `-i "{{IDENTITYFILE}}" -p {{PORT}}` -> ['-i', '{{IDENTITYFILE}}', '-p', '{{PORT}}']
 */
export function tokenize(template) {
    const tokens = [];
    let current = "";
    let quote = null;
    let hasToken = false;

    for (const ch of template) {
        if (quote) {
            if (ch === quote) quote = null;
            else current += ch;
        } else if (ch === '"' || ch === "'") {
            quote = ch;
            hasToken = true;
        } else if (ch === " " || ch === "\t" || ch === "\n") {
            if (hasToken || current.length) {
                tokens.push(current);
                current = "";
                hasToken = false;
            }
        } else {
            current += ch;
            hasToken = true;
        }
    }
    if (hasToken || current.length) tokens.push(current);
    return tokens;
}

/**
 * Substitui {{VAR}} (case-insensitive) por valores do mapa de variáveis.
 * Sufixo `_ENC` aplica encodeURIComponent ao valor (ex.: {{PASSWORD_ENC}}),
 * necessário quando a variável entra numa URL (sftp://user:senha@host) e pode
 * conter caracteres especiais como / : @.
 */
export function substitute(token, vars) {
    return token.replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (_, rawKey) => {
        const key = rawKey.toUpperCase();
        const encoded = key.endsWith("_ENC");
        const baseKey = encoded ? key.slice(0, -4) : key;
        const value = vars[baseKey];
        if (value === undefined || value === null) return "";
        const str = String(value);
        return encoded ? encodeURIComponent(str) : str;
    });
}

/**
 * Gera o array de argumentos final: tokeniza o template e só então substitui
 * as variáveis em cada token (assim valores com espaços, ex.: caminhos, não
 * são re-quebrados). Tokens vazios após a substituição são descartados.
 */
export function buildArgs(template, vars) {
    if (!template) return [];
    return tokenize(template)
        .map((t) => substitute(t, vars))
        .filter((t) => t !== "");
}

/**
 * Lança uma ferramenta externa para um host/customer.
 * @param {{ name?: string, path: string, args?: string, cwd?: string, elevated?: boolean, wait?: boolean }} tool
 * @param {object} customer - host com host/username/password/port/identityFile
 */
export async function launchTool(tool, customer) {
    const notify = (payload) => useAppStore.getState().addNotification(payload);

    if (!isTauri()) {
        notify({ type: "warning", title: "Indisponível", message: "Ferramentas externas só funcionam no app desktop." });
        return;
    }
    if (!tool?.path) {
        notify({ type: "error", title: "Ferramenta inválida", message: "Caminho do executável não definido." });
        return;
    }

    const args = buildArgs(tool.args, hostToVars(customer));

    try {
        await invoke("launch_external_tool", {
            path: tool.path,
            args,
            cwd: tool.cwd && tool.cwd.trim() ? tool.cwd : null,
            elevated: !!tool.elevated,
            wait: !!tool.wait,
        });
        notify({ type: "success", title: "Ferramenta iniciada", message: tool.name || tool.path });
    } catch (error) {
        notify({ type: "error", title: "Falha ao iniciar", message: error?.message || String(error) });
    }
}
