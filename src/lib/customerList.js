// Operações puras sobre a lista de hosts (customers) do config.

const hostKey = ({ host, port, username }) => `${username || ''}@${host}:${Number(port || 22)}`;

/** Converte os dados de um formulário/importação no formato salvo no config. */
export const toCustomer = ({ id, name, host, port, username, password, group, tagId, identityFile }) => (
    { id, name, host, port, username, password, groups: group ? [group] : [], tagId, identityFile }
);

/**
 * Acrescenta vários hosts de uma vez, ignorando os que repetem um id ou um
 * destino host + porta + usuário já salvo ou já presente no próprio lote.
 * Sem nada novo, devolve o mesmo array (não dispara re-render).
 */
export function appendCustomers(customers, hosts) {
    const ids = new Set(customers.map((c) => c.id));
    const keys = new Set(customers.map(hostKey));
    const added = hosts.filter((h) => {
        const key = hostKey(h);
        if (ids.has(h.id) || keys.has(key)) return false;
        ids.add(h.id);
        keys.add(key);
        return true;
    });
    return added.length === 0 ? customers : [...customers, ...added.map(toCustomer)];
}
