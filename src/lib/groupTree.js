// Grupos formam uma árvore de 2 níveis: grupo (cliente) → subgrupo (plataforma).
// Um grupo sem `parentId` (ou com pai inexistente) é raiz.

const byId = (groups) => new Map((groups || []).map((group) => [group.id, group]));

export const isRootGroup = (group, groups) => (
    !group?.parentId || !byId(groups).has(group.parentId)
);

export const getRootGroups = (groups) => (
    (groups || []).filter((group) => isRootGroup(group, groups))
);

export const getChildren = (groups, id) => (
    (groups || []).filter((group) => group.parentId === id && group.id !== id)
);

/** Id do grupo raiz de `id` (ele mesmo, se já for raiz). `null` se não existir. */
export function getRootGroupId(groups, id) {
    const index = byId(groups);
    let current = index.get(id);
    if (!current) return null;
    const seen = new Set();
    while (current.parentId && index.has(current.parentId) && !seen.has(current.id)) {
        seen.add(current.id);
        current = index.get(current.parentId);
    }
    return current.id;
}

/** `"Brb / Omni"` para um subgrupo, `"Brb"` para um grupo raiz, `''` se não existir. */
export function getGroupPath(groups, id, separator = ' / ') {
    const index = byId(groups);
    const names = [];
    const seen = new Set();
    let current = index.get(id);
    while (current && !seen.has(current.id)) {
        seen.add(current.id);
        names.unshift(current.name || '');
        current = current.parentId ? index.get(current.parentId) : null;
    }
    return names.join(separator);
}

/** O próprio id mais os ids de todos os subgrupos. */
export function getDescendantIds(groups, id) {
    const result = new Set([id]);
    const stack = [id];
    while (stack.length) {
        const current = stack.pop();
        getChildren(groups, current).forEach((child) => {
            if (!result.has(child.id)) {
                result.add(child.id);
                stack.push(child.id);
            }
        });
    }
    return result;
}

/**
 * Lista ordenada para selects: cada grupo raiz seguido dos subgrupos.
 * `{ id, name, label, depth, parentId }`, onde `label` é o caminho completo.
 */
export function buildGroupOptions(groups) {
    const compare = (a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' });
    const options = [];
    [...getRootGroups(groups)].sort(compare).forEach((root) => {
        options.push({ id: root.id, name: root.name, label: root.name, depth: 0, parentId: null });
        [...getChildren(groups, root.id)].sort(compare).forEach((child) => {
            options.push({
                id: child.id,
                name: child.name,
                label: getGroupPath(groups, child.id),
                depth: 1,
                parentId: root.id,
            });
        });
    });
    return options;
}

/** Ids que deixam de existir quando `id` é removido (ele e seus subgrupos). */
export const getIdsRemovedWithGroup = (groups, id) => getDescendantIds(groups, id);

/** Remove o grupo e os subgrupos; hosts que apontavam para eles ficam sem grupo. */
export function removeGroupFromConfig({ groups, customers }, id) {
    const removed = getIdsRemovedWithGroup(groups, id);
    return {
        groups: (groups || []).filter((group) => !removed.has(group.id)),
        customers: (customers || []).map((customer) => {
            const current = customer.groups || [];
            const next = current.filter((groupId) => !removed.has(groupId));
            return next.length === current.length ? customer : { ...customer, groups: next };
        }),
    };
}

/**
 * Cria cópias de um grupo. Hosts não são copiados (cada cliente tem os seus
 * IPs); só a estrutura e as credenciais padrão do grupo.
 *
 * - Grupo raiz: gera um novo grupo raiz `name` e, com `includeChildren`,
 *   uma cópia de cada subgrupo debaixo dele.
 * - Subgrupo: gera uma cópia `name` debaixo de `parentId` (padrão: o mesmo pai).
 *
 * `createId` permite ids determinísticos nos testes. Retorna os grupos novos.
 */
export function cloneGroup(groups, id, { name, parentId, includeChildren = true, createId }) {
    const source = (groups || []).find((group) => group.id === id);
    if (!source) return [];
    const copyOf = (group, overrides) => {
        const { id: _id, parentId: _parent, ...rest } = group;
        return { ...rest, id: createId(), ...overrides };
    };

    if (isRootGroup(source, groups)) {
        const root = copyOf(source, { name: name || source.name });
        const children = includeChildren
            ? getChildren(groups, source.id).map((child) => copyOf(child, { parentId: root.id }))
            : [];
        return [root, ...children];
    }

    return [copyOf(source, { name: name || source.name, parentId: parentId || source.parentId })];
}
