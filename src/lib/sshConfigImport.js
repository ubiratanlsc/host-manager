// Parser do formato OpenSSH ~/.ssh/config, só com o que o host-manager usa:
// HostName, Port, User e IdentityFile. Semântica do OpenSSH: o primeiro valor
// encontrado vence, então um `Host *` no topo vale como padrão e no fim só
// preenche o que faltou.

const SUPPORTED = new Set(['hostname', 'port', 'user', 'identityfile']);
const WARN_ON = {
    proxyjump: 'ProxyJump não é suportado',
    proxycommand: 'ProxyCommand não é suportado',
    localforward: 'LocalForward será ignorado',
    remoteforward: 'RemoteForward será ignorado',
    dynamicforward: 'DynamicForward será ignorado',
};

const isPattern = (alias) => /[*?!]/.test(alias);

const unquote = (value) => {
    const trimmed = value.trim();
    if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
        return trimmed.slice(1, -1);
    }
    return trimmed;
};

/** Divide `Chave valor`, `Chave=valor` ou `Chave = "valor com espaço"`. */
function parseLine(rawLine) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) return null;
    const match = line.match(/^(\S+?)\s*(?:=\s*|\s+)(.*)$/);
    if (!match) return { key: line.toLowerCase(), value: '' };
    return { key: match[1].toLowerCase(), value: match[2].trim() };
}

const splitAliases = (value) => (value.match(/"[^"]*"|\S+/g) || []).map(unquote).filter(Boolean);

/** Glob simples do OpenSSH (`*` e `?`), com negação `!`, compilado uma vez por bloco. */
function compilePatterns(patterns) {
    return patterns.map((pattern) => {
        const negated = pattern.startsWith('!');
        const body = negated ? pattern.slice(1) : pattern;
        const regex = new RegExp(`^${body.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`, 'i');
        return { negated, regex };
    });
}

function matchesPatterns(matchers, alias) {
    let matched = false;
    for (const { negated, regex } of matchers) {
        if (regex.test(alias)) {
            if (negated) return false;
            matched = true;
        }
    }
    return matched;
}

/** Expande `~` e `%d` (home) no caminho; aspas já foram removidas. */
export function expandPath(path, homeDir) {
    if (!path || !homeDir) return path;
    const home = homeDir.replace(/[\\/]+$/, '');
    const expanded = path
        .replace(/^~(?=$|[\\/])/, home)
        .replace(/%d/g, home);
    // Home do Windows inserido no caminho: normaliza para um único separador.
    return expanded !== path && home.includes('\\') ? expanded.replace(/\//g, '\\') : expanded;
}

/**
 * Lê o texto do config e devolve uma entrada por alias concreto (sem curinga):
 * `{ alias, host, port, username, identityFile, warnings }`.
 * Também devolve `warnings` globais (ex.: Include ignorado).
 */
export function parseSshConfig(text, { homeDir = '' } = {}) {
    const blocks = [];
    const globalWarnings = [];
    let current = null;

    (text || '').split(/\r?\n/).forEach((rawLine) => {
        const parsed = parseLine(rawLine);
        if (!parsed) return;
        const { key, value } = parsed;

        if (key === 'host') {
            current = { patterns: splitAliases(value), options: [], warnings: [] };
            blocks.push(current);
            return;
        }
        if (key === 'match') {
            // Blocos Match têm condições que não avaliamos; ignoramos o conteúdo.
            current = { patterns: [], options: [], warnings: [] };
            globalWarnings.push('Blocos "Match" foram ignorados');
            return;
        }
        if (key === 'include') {
            globalWarnings.push(`Include ignorado: ${value}`);
            return;
        }
        if (!current) {
            // Opções antes de qualquer Host valem para todos.
            current = { patterns: ['*'], options: [], warnings: [] };
            blocks.push(current);
        }
        if (SUPPORTED.has(key)) current.options.push({ key, value: unquote(value) });
        else if (WARN_ON[key]) current.warnings.push(WARN_ON[key]);
    });

    const aliases = new Set();
    blocks.forEach((block) => block.patterns.forEach((alias) => {
        if (!isPattern(alias)) aliases.add(alias);
    }));
    const compiled = blocks.map((block) => ({ ...block, matchers: compilePatterns(block.patterns) }));

    const hosts = [...aliases].map((alias) => {
        const resolved = {};
        const warnings = [];
        compiled.forEach((block) => {
            if (!matchesPatterns(block.matchers, alias)) return;
            block.options.forEach(({ key, value }) => {
                if (resolved[key] === undefined) resolved[key] = value;
            });
            block.warnings.forEach((warning) => {
                if (!warnings.includes(warning)) warnings.push(warning);
            });
        });

        const host = (resolved.hostname || alias).replace(/%h/g, alias);
        const port = Number.parseInt(resolved.port, 10);
        return {
            alias,
            host,
            port: Number.isFinite(port) && port > 0 && port < 65536 ? port : 22,
            username: resolved.user || '',
            identityFile: resolved.identityfile ? expandPath(resolved.identityfile, homeDir) : '',
            warnings,
        };
    });

    return { hosts, warnings: [...new Set(globalWarnings)] };
}
