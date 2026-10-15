import test from 'node:test';
import assert from 'node:assert/strict';
import { checkConnectivity } from './connectivity.js';

const host = (id, address, port = 22) => ({ id, host: address, port });

test('maps each customer id to online/offline from the probe result', async () => {
    const patches = [];
    const result = await checkConnectivity(
        [host('a', '10.0.0.1'), host('b', '10.0.0.2')],
        async (address) => address === '10.0.0.1',
        { onResults: (patch) => patches.push(patch), flushMs: 0 },
    );

    assert.deepEqual(result, { a: 'online', b: 'offline' });
    assert.deepEqual(Object.assign({}, ...patches), result);
});

test('a failing probe marks the host as unknown', async () => {
    const result = await checkConnectivity(
        [host('a', 'bad')],
        async () => { throw new Error('boom'); },
        { flushMs: 0 },
    );

    assert.deepEqual(result, { a: 'unknown' });
});

test('probes each host:port only once and shares the result', async () => {
    const calls = [];
    const result = await checkConnectivity(
        [host('a', '10.0.0.1'), host('b', '10.0.0.1'), host('c', '10.0.0.1', 2222), { id: 'd', host: '10.0.0.1' }],
        async (address, port) => { calls.push(`${address}:${port}`); return true; },
        { flushMs: 0 },
    );

    assert.deepEqual(calls.sort(), ['10.0.0.1:22', '10.0.0.1:2222']);
    assert.deepEqual(result, { a: 'online', b: 'online', c: 'online', d: 'online' });
});

test('never runs more probes at once than the concurrency limit', async () => {
    let running = 0;
    let peak = 0;
    const customers = Array.from({ length: 50 }, (_, i) => host(`h${i}`, `10.0.0.${i}`));

    await checkConnectivity(customers, async () => {
        running += 1;
        peak = Math.max(peak, running);
        await new Promise((resolve) => setTimeout(resolve, 1));
        running -= 1;
        return true;
    }, { concurrency: 5, flushMs: 0 });

    assert.equal(peak, 5);
});

test('groups results into few state updates instead of one per host', async () => {
    let updates = 0;
    const customers = Array.from({ length: 200 }, (_, i) => host(`h${i}`, `10.0.1.${i}`));

    const result = await checkConnectivity(customers, async () => true, {
        onResults: () => { updates += 1; },
        flushMs: 50,
    });

    assert.equal(Object.keys(result).length, 200);
    assert.ok(updates < 10, `expected batched updates, got ${updates}`);
});

test('an empty list resolves without probing or updating', async () => {
    let updates = 0;
    const result = await checkConnectivity([], async () => { throw new Error('unexpected'); }, {
        onResults: () => { updates += 1; },
    });

    assert.deepEqual(result, {});
    assert.equal(updates, 0);
});
