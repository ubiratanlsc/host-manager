import test from 'node:test';
import assert from 'node:assert/strict';
import { appendCustomers } from './customerList.js';

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
