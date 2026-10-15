import test from 'node:test';
import assert from 'node:assert/strict';
import { appendCustomers, applyPatch, patchChanges } from './customerList.js';

const host = (id, address, extra = {}) => ({ id, name: id, host: address, port: 22, username: 'root', ...extra });
const saved = (id, address, extra = {}) => ({ ...host(id, address, extra), groups: [] });

test('appends the batch converting group into the groups list', () => {
    const result = appendCustomers([], [host('a', '10.0.0.1', { group: 'g1' }), host('b', '10.0.0.2')]);

    assert.deepEqual(result.map((c) => c.id), ['a', 'b']);
    assert.deepEqual(result[0].groups, ['g1']);
    assert.deepEqual(result[1].groups, []);
});

test('skips hosts already saved and duplicates inside the batch', () => {
    const result = appendCustomers([saved('old', '10.0.0.1')], [
        host('dup-existing', '10.0.0.1'),
        host('dup-id', '10.9.9.9', { id: 'old' }),
        host('new', '10.0.0.2'),
        host('dup-batch', '10.0.0.2'),
        host('other-user', '10.0.0.2', { username: 'admin' }),
        host('other-port', '10.0.0.2', { port: 2222 }),
    ]);

    assert.deepEqual(result.map((c) => c.id), ['old', 'new', 'other-user', 'other-port']);
});

test('treats a missing port as 22 when looking for duplicates', () => {
    const result = appendCustomers([saved('old', '10.0.0.1', { port: undefined })], [host('same', '10.0.0.1')]);

    assert.deepEqual(result.map((c) => c.id), ['old']);
});

test('returns the same array when nothing new is added', () => {
    const existing = [saved('a', '10.0.0.1')];

    assert.equal(appendCustomers(existing, [host('b', '10.0.0.1')]), existing);
});

test('does not mutate the original list', () => {
    const existing = [saved('a', '10.0.0.1')];
    appendCustomers(existing, [host('b', '10.0.0.2')]);

    assert.equal(existing.length, 1);
});

test('patches only the given fields of the selected hosts', () => {
    const list = [saved('a', '10.0.0.1'), saved('b', '10.0.0.2'), saved('c', '10.0.0.3')];

    const result = applyPatch(list, ['a', 'c'], { port: 2222, password: 'novo' });

    assert.deepEqual(result.map((c) => c.port), [2222, 22, 2222]);
    assert.deepEqual(result.map((c) => c.password), ['novo', undefined, 'novo']);
    assert.deepEqual(result.map((c) => c.username), ['root', 'root', 'root']);
});

test('never changes the name or the address of a host', () => {
    const list = [saved('a', '10.0.0.1')];

    const result = applyPatch(list, ['a'], { name: 'outro', host: '10.9.9.9', id: 'z', username: 'admin' });

    assert.equal(result[0].name, 'a');
    assert.equal(result[0].host, '10.0.0.1');
    assert.equal(result[0].id, 'a');
    assert.equal(result[0].username, 'admin');
});

test('clears a field when the patch carries an undefined value', () => {
    const list = [saved('a', '10.0.0.1', { password: 'segredo', identityFile: '~/.ssh/id_rsa' })];

    const result = applyPatch(list, ['a'], { password: undefined, identityFile: undefined });

    assert.equal(result[0].password, undefined);
    assert.equal(result[0].identityFile, undefined);
});

test('replaces the groups list', () => {
    const list = [saved('a', '10.0.0.1', { groups: ['g1'] })];

    assert.deepEqual(applyPatch(list, ['a'], { groups: ['g2'] })[0].groups, ['g2']);
    assert.deepEqual(applyPatch(list, ['a'], { groups: [] })[0].groups, []);
});

test('keeps the same array and the same objects when nothing changes', () => {
    const list = [saved('a', '10.0.0.1', { port: undefined, password: '' }), saved('b', '10.0.0.2')];

    assert.equal(applyPatch(list, ['a'], { port: 22, password: undefined }), list);
    assert.equal(applyPatch(list, [], { port: 2222 }), list);
    assert.equal(applyPatch(list, ['a'], {}), list);
    assert.equal(applyPatch(list, ['a'], { port: 2222 })[1], list[1]);
});

test('does not mutate the patched list', () => {
    const list = [saved('a', '10.0.0.1')];
    applyPatch(list, ['a'], { port: 2222 });

    assert.equal(list[0].port, 22);
});

test('gives each patched host its own groups array', () => {
    const list = [saved('a', '10.0.0.1'), saved('b', '10.0.0.2')];

    const result = applyPatch(list, ['a', 'b'], { groups: ['g1'] });

    assert.deepEqual(result[0].groups, ['g1']);
    assert.notEqual(result[0].groups, result[1].groups);
});

test('treats a missing groups list as already empty', () => {
    const list = [saved('a', '10.0.0.1', { groups: undefined })];

    assert.equal(applyPatch(list, ['a'], { groups: [] }), list);
});

test('accepts the selection as a Set', () => {
    const list = [saved('a', '10.0.0.1'), saved('b', '10.0.0.2')];

    const result = applyPatch(list, new Set(['b']), { port: 2222 });

    assert.deepEqual(result.map((c) => c.port), [22, 2222]);
});

test('separates clearing a field from leaving it alone', () => {
    const list = [saved('a', '10.0.0.1', { password: 'segredo' })];

    assert.deepEqual(patchChanges(list, ['a'], { password: undefined })[0].changes, [
        { field: 'password', from: 'segredo', to: undefined },
    ]);
    assert.deepEqual(patchChanges(list, ['a'], {})[0].changes, []);
});

test('lists the real before and after of each selected host', () => {
    const list = [
        saved('a', '10.0.0.1', { port: 22, password: 'antiga' }),
        saved('b', '10.0.0.2', { port: 2222, password: 'antiga' }),
        saved('c', '10.0.0.3'),
    ];

    const changes = patchChanges(list, ['a', 'b'], { port: 2222, password: 'antiga' });

    assert.deepEqual(changes.map(({ customer }) => customer.id), ['a', 'b']);
    assert.deepEqual(changes[0].changes, [{ field: 'port', from: 22, to: 2222 }]);
    assert.deepEqual(changes[1].changes, []);
});
