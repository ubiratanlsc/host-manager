const normalizedPort = (port) => Number(port || 22);

const matchesSession = (customer, session) => (
    customer?.host === session?.config?.host
    && normalizedPort(customer?.port) === normalizedPort(session?.config?.port)
    && (customer?.username || '') === (session?.config?.username || '')
);

export const getTabTerminalId = (tab) => {
    if (!tab) return null;
    if (tab.type === 'single') return tab.terminalId || null;
    const leaf = tab.nodes?.[tab.activePaneId];
    return leaf?.type === 'leaf' ? leaf.terminalId : null;
};

export function replaceActiveTabTerminal(tab, terminalId) {
    if (!tab || !terminalId) return tab;
    if (tab.type === 'single') return { ...tab, terminalId };

    const activeNode = tab.nodes?.[tab.activePaneId];
    if (activeNode?.type !== 'leaf') return tab;

    return {
        ...tab,
        nodes: {
            ...tab.nodes,
            [tab.activePaneId]: { ...activeNode, terminalId },
        },
    };
}

export function replaceActiveTerminalInTabs(tabs, tabId, terminalId) {
    if (!(tabs || []).some((tab) => tab.id === tabId)) return tabs;

    return tabs
        .map((tab) => (tab.id === tabId ? replaceActiveTabTerminal(tab, terminalId) : tab))
        .filter((tab) => (
            tab.id === tabId || tab.type !== 'single' || tab.terminalId !== terminalId
        ));
}

export const isCloseTabShortcut = (event) => (
    event?.ctrlKey === true
    && event?.metaKey !== true
    && event?.altKey !== true
    && event?.shiftKey !== true
    && event?.key?.toLowerCase() === 'd'
);

export function getSSHSpawnConfig(session, customers = []) {
    if (!session?.config) return null;
    const customer = customers.find((candidate) => matchesSession(candidate, session));
    const source = customer || session.config;

    return {
        host: session.config.host,
        port: normalizedPort(session.config.port),
        username: session.config.username,
        ...(source.password ? { password: source.password } : {}),
        ...(source.identityFile ? { identityFile: source.identityFile } : {}),
    };
}

export function getGroupCustomersToOpen(customers, validGroupIds, groupId, sessions) {
    if (groupId === '__local__') return [];
    const validGroups = new Set(validGroupIds || []);
    const activeSessions = sessions instanceof Map ? [...sessions.values()] : [...(sessions || [])];

    return (customers || []).filter((customer) => {
        const customerGroups = customer.groups || [];
        const belongsToGroup = groupId === '__ungrouped__'
            ? customerGroups.length === 0 || !customerGroups.some((id) => validGroups.has(id))
            : customerGroups.includes(groupId);
        if (!belongsToGroup) return false;

        return !activeSessions.some((session) => !session.disconnected && matchesSession(customer, session));
    });
}
