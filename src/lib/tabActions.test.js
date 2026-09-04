import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getGroupCustomersToOpen,
    getSSHSpawnConfig,
    getTabTerminalId,
    isCloseTabShortcut,
    replaceActiveTabTerminal,
    replaceActiveTerminalInTabs,
} from './tabActions.js';

test('resolves the active terminal from single and split tabs', () => {
    assert.equal(getTabTerminalId({ type: 'single', terminalId: 'local-1' }), 'local-1');
    assert.equal(getTabTerminalId({
        type: 'split',
        activePaneId: 'pane-2',
        nodes: {
            'pane-1': { type: 'leaf', terminalId: 'ssh-1' },
            'pane-2': { type: 'leaf', terminalId: 'ssh-2' },
        },
    }), 'ssh-2');
    assert.equal(getTabTerminalId(null), null);
    assert.equal(getTabTerminalId({ type: 'split', activePaneId: 'missing', nodes: {} }), null);
});

test('replaces only the active terminal when reconnecting a split tab', () => {
    const tab = {
        id: 'tab-1',
        type: 'split',
        activePaneId: 'pane-2',
        nodes: {
            'pane-1': { id: 'pane-1', type: 'leaf', terminalId: 'ssh-1' },
            'pane-2': { id: 'pane-2', type: 'leaf', terminalId: 'ssh-2' },
            root: { id: 'root', type: 'branch', children: ['pane-1', 'pane-2'] },
        },
    };

    const replaced = replaceActiveTabTerminal(tab, 'ssh-new');

    assert.equal(replaced.nodes['pane-1'].terminalId, 'ssh-1');
    assert.equal(replaced.nodes['pane-2'].terminalId, 'ssh-new');
    assert.notEqual(replaced.nodes, tab.nodes);
    assert.equal(tab.nodes['pane-2'].terminalId, 'ssh-2');
});

test('replaces a single tab terminal without losing its metadata', () => {
    const tab = { id: 'tab-1', type: 'single', terminalId: 'old', groupId: 'ops', userLabel: 'Banco' };
    assert.deepEqual(replaceActiveTabTerminal(tab, 'new'), {
        id: 'tab-1',
        type: 'single',
        terminalId: 'new',
        groupId: 'ops',
        userLabel: 'Banco',
    });
});

test('atomically removes a transient duplicate tab created during reconnect', () => {
    const tabs = [
        { id: 'source', type: 'single', terminalId: 'old', groupId: 'ops' },
        { id: 'transient', type: 'single', terminalId: 'new', groupId: 'ops' },
        { id: 'other', type: 'single', terminalId: 'keep', groupId: 'ops' },
    ];

    assert.deepEqual(
        replaceActiveTerminalInTabs(tabs, 'source', 'new').map((tab) => [tab.id, tab.terminalId]),
        [['source', 'new'], ['other', 'keep']],
    );
});

test('recognizes only Ctrl+D as the close-tab shortcut', () => {
    assert.equal(isCloseTabShortcut({ key: 'd', ctrlKey: true }), true);
    assert.equal(isCloseTabShortcut({ key: 'D', ctrlKey: true, shiftKey: true }), false);
    assert.equal(isCloseTabShortcut({ key: 'd', metaKey: true }), false);
    assert.equal(isCloseTabShortcut({ key: 'd', ctrlKey: true, altKey: true }), false);
});

test('restores saved authentication data when duplicating or reconnecting SSH', () => {
    const config = getSSHSpawnConfig(
        { config: { host: 'server.local', port: 2222, username: 'ana' } },
        [{
            host: 'server.local',
            port: 2222,
            username: 'ana',
            password: 'secret',
            identityFile: 'C:/keys/ana',
        }],
    );

    assert.deepEqual(config, {
        host: 'server.local',
        port: 2222,
        username: 'ana',
        password: 'secret',
        identityFile: 'C:/keys/ana',
    });

    assert.equal(getSSHSpawnConfig(null, []), null);
    assert.deepEqual(
        getSSHSpawnConfig({ config: { host: 'other', username: 'root' } }, []),
        { host: 'other', port: 22, username: 'root' },
    );
});

test('opens only missing connections from the selected group', () => {
    const customers = [
        { id: 'a', host: 'a.local', port: 22, username: 'root', groups: ['ops'] },
        { id: 'b', host: 'b.local', port: 22, username: 'root', groups: ['ops'] },
        { id: 'c', host: 'c.local', port: 22, username: 'root', groups: ['dev'] },
    ];
    const sessions = new Map([
        ['session-a', { config: { host: 'a.local', port: 22, username: 'root' }, disconnected: false }],
    ]);

    assert.deepEqual(
        getGroupCustomersToOpen(customers, ['ops', 'dev'], 'ops', sessions).map((customer) => customer.id),
        ['b'],
    );
});

test('treats customers without a valid group as ungrouped', () => {
    const customers = [
        { id: 'none', host: 'a', groups: [] },
        { id: 'stale', host: 'b', groups: ['removed-group'] },
        { id: 'valid', host: 'c', groups: ['ops'] },
    ];

    assert.deepEqual(
        getGroupCustomersToOpen(customers, ['ops'], '__ungrouped__', new Map()).map((customer) => customer.id),
        ['none', 'stale'],
    );
    assert.deepEqual(getGroupCustomersToOpen(customers, ['ops'], '__local__', []), []);
});
