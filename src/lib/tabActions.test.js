import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getGroupCustomersToOpen,
    getSSHSpawnConfig,
    getTabTerminalId,
    isCloseTabShortcut,
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
});
