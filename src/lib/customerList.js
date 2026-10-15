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

// Campos que a edição em lote pode alterar. `id`, `name` e `host` ficam de
// fora: identificam o host e são editados um a um.
export const BULK_FIELDS = ['port', 'username', 'password', 'identityFile', 'groups'];

const sameValue = (field, from, to) => {
    if (field === 'groups') return (from || []).join(',') === (to || []).join(',');
    if (field === 'port') return Number(from || 22) === Number(to || 22);
    return (from || '') === (to || '');
};

// A presença da chave é que manda: `{ password: undefined }` limpa a senha,
// um patch sem a chave `password` deixa a senha de cada host como está.
const patchedFields = (patch) => BULK_FIELDS.filter((field) => field in patch);

// `groups` ganha uma cópia por host: um array compartilhado entre vários
// hosts viraria alteração em todos no dia em que alguém mutar a lista.
const patchValue = (field, patch) => (field === 'groups' ? [...(patch.groups || [])] : patch[field]);

/**
 * O que mudaria em cada host selecionado, campo por campo, já descartando os
 * que hoje têm o valor pedido. Serve para a prévia antes de gravar.
 * @returns {Array<{ customer: object, changes: Array<{ field: string, from: unknown, to: unknown }> }>}
 */
export function patchChanges(customers, ids, patch) {
    const selected = ids instanceof Set ? ids : new Set(ids);
    const fields = patchedFields(patch);
    return customers
        .filter((customer) => selected.has(customer.id))
        .map((customer) => ({
            customer,
            changes: fields
                .map((field) => ({ field, from: customer[field], to: patch[field] }))
                .filter(({ field, from, to }) => !sameValue(field, from, to)),
        }));
}

/**
 * Aplica o patch nos hosts selecionados, criando novos objetos só para quem
 * realmente muda — os demais mantêm a identidade (cards memoizados não
 * re-renderizam) e, sem nenhuma mudança, devolve o mesmo array.
 */
export function applyPatch(customers, ids, patch) {
    const selected = ids instanceof Set ? ids : new Set(ids);
    const fields = patchedFields(patch);
    if (fields.length === 0 || selected.size === 0) return customers;

    let changed = false;
    const next = customers.map((customer) => {
        if (!selected.has(customer.id)) return customer;
        const diff = fields.filter((field) => !sameValue(field, customer[field], patch[field]));
        if (diff.length === 0) return customer;
        changed = true;
        return { ...customer, ...Object.fromEntries(diff.map((field) => [field, patchValue(field, patch)])) };
    });
    return changed ? next : customers;
}
