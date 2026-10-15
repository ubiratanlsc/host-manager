import test from 'node:test';
import assert from 'node:assert/strict';
import {
    buildGroupOptions,
    cloneGroup,
    findDuplicateGroupName,
    getDescendantIds,
    getGroupPath,
    getRootGroupId,
    getRootGroups,
    removeGroupFromConfig,
} from './groupTree.js';

const groups = [
    { id: 'omni', name: 'Omnichannel', parentId: 'brb' },
    { id: 'brb', name: 'Brb' },
    { id: 'sip', name: 'SIP', parentId: 'brb' },
    { id: 'acme', name: 'Acme' },
    { id: 'orphan', name: 'Órfão', parentId: 'deleted' },
];

test('resolves root groups and treats orphans as roots', () => {
    assert.deepEqual(getRootGroups(groups).map((g) => g.id), ['brb', 'acme', 'orphan']);
    assert.equal(getRootGroupId(groups, 'omni'), 'brb');
    assert.equal(getRootGroupId(groups, 'brb'), 'brb');
    assert.equal(getRootGroupId(groups, 'orphan'), 'orphan');
    assert.equal(getRootGroupId(groups, 'missing'), null);
});

test('builds the client / platform path', () => {
    assert.equal(getGroupPath(groups, 'omni'), 'Brb / Omnichannel');
    assert.equal(getGroupPath(groups, 'brb'), 'Brb');
    assert.equal(getGroupPath(groups, 'missing'), '');
});

test('collects a group with its subgroups', () => {
    assert.deepEqual([...getDescendantIds(groups, 'brb')].sort(), ['brb', 'omni', 'sip']);
    assert.deepEqual([...getDescendantIds(groups, 'sip')], ['sip']);
});

test('orders select options as parent followed by sorted children', () => {
    assert.deepEqual(buildGroupOptions(groups).map((o) => [o.label, o.depth]), [
        ['Acme', 0],
        ['Brb', 0],
        ['Brb / Omnichannel', 1],
        ['Brb / SIP', 1],
        ['Órfão', 0],
    ]);
});

test('survives a parent cycle without looping forever', () => {
    const cyclic = [
        { id: 'a', name: 'A', parentId: 'b' },
        { id: 'b', name: 'B', parentId: 'a' },
    ];
    assert.ok(['a', 'b'].includes(getRootGroupId(cyclic, 'a')));
    assert.equal(getGroupPath(cyclic, 'a'), 'B / A');
});

test('removing a group drops its subgroups and ungroups their hosts', () => {
    const customers = [
        { id: 'h1', groups: ['omni'] },
        { id: 'h2', groups: ['brb'] },
        { id: 'h3', groups: ['acme'] },
    ];
    const result = removeGroupFromConfig({ groups, customers }, 'brb');
    assert.deepEqual(result.groups.map((g) => g.id), ['acme', 'orphan']);
    assert.deepEqual(result.customers.map((c) => c.groups), [[], [], ['acme']]);
    assert.equal(result.customers[2], customers[2]);
});

test('cloning a client copies its subgroups under the new client', () => {
    let n = 0;
    const created = cloneGroup(groups, 'brb', { name: 'Caixa', createId: () => `new-${++n}` });
    assert.deepEqual(created.map((g) => [g.id, g.name, g.parentId]), [
        ['new-1', 'Caixa', undefined],
        ['new-2', 'Omnichannel', 'new-1'],
        ['new-3', 'SIP', 'new-1'],
    ]);
});

test('cloning a client can skip its subgroups', () => {
    const created = cloneGroup(groups, 'brb', { name: 'Caixa', includeChildren: false, createId: () => 'x' });
    assert.equal(created.length, 1);
});

test('cloning a subgroup can place the copy under another client', () => {
    const created = cloneGroup(groups, 'omni', { name: 'Omnichannel', parentId: 'acme', createId: () => 'c1' });
    assert.deepEqual(created, [{ id: 'c1', name: 'Omnichannel', parentId: 'acme' }]);
    assert.deepEqual(cloneGroup(groups, 'missing', { createId: () => 'z' }), []);
});

test('blocks duplicate names among siblings but allows them under other parents', () => {
    assert.equal(findDuplicateGroupName(groups, { name: '  brb ' })?.id, 'brb');
    assert.equal(findDuplicateGroupName(groups, { name: 'SIP', parentId: 'brb' })?.id, 'sip');
    assert.equal(findDuplicateGroupName(groups, { name: 'SIP', parentId: 'acme' }), null);
    assert.equal(findDuplicateGroupName(groups, { name: 'SIP' }), null);
    assert.equal(findDuplicateGroupName(groups, { name: 'Omnichannel', parentId: 'brb', excludeId: 'omni' }), null);
    assert.equal(findDuplicateGroupName(groups, { name: '' }), null);
});
