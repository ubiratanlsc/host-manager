import assert from 'node:assert/strict';
import test from 'node:test';

import {
    appendTerminalChunk,
    concatTerminalChunks,
    createConptyProbeFilter,
    createOrderedAsyncQueue,
    createTerminalWritePump,
    createXtgettcapReply,
    createAltScreenExitDetector,
    createTerminalModeSafeWriter,
    getTerminalInputModeReset,
    needsTerminalInputModeReset,
    toTerminalBytes,
} from './terminalIo.js';

test('appends TUI input-mode cleanup to one xterm write without reentrant writes', () => {
    const writes = [];
    const callbacks = [];
    let recoveries = 0;
    const writer = createTerminalModeSafeWriter(
        (bytes, done) => {
            writes.push(new TextDecoder().decode(bytes));
            callbacks.push(done);
        },
        () => { recoveries += 1; },
    );

    writer(new TextEncoder().encode('draw\x1b[?10'), () => {});
    assert.deepEqual(writes, ['draw\x1b[?10']);
    callbacks.shift()();

    let completed = false;
    writer(new TextEncoder().encode('49lshell prompt'), () => { completed = true; });
    assert.equal(writes.length, 2);
    assert.equal(
        writes[1],
        `49lshell prompt${getTerminalInputModeReset()}`,
    );
    assert.equal(recoveries, 0);

    callbacks.shift()();
    assert.equal(recoveries, 1);
    assert.equal(completed, true);
});

test('detects a split alternate-screen exit and prescribes stale input-mode cleanup', () => {
    const detector = createAltScreenExitDetector();
    const encoder = new TextEncoder();

    assert.equal(detector.write(encoder.encode('draw\x1b[?10')), false);
    assert.equal(detector.write(encoder.encode('49lshell prompt')), true);
    assert.equal(detector.write(encoder.encode('ordinary output')), false);

    assert.equal(needsTerminalInputModeReset({ mouseTrackingMode: 'any', sendFocusMode: false }), true);
    assert.equal(needsTerminalInputModeReset({ mouseTrackingMode: 'none', sendFocusMode: true }), true);
    assert.equal(needsTerminalInputModeReset({ mouseTrackingMode: 'none', sendFocusMode: false }), false);
    assert.equal(needsTerminalInputModeReset(null), false);
    assert.equal(
        getTerminalInputModeReset(),
        '\x1b[?2026l\x1b[?1000l\x1b[?1002l\x1b[?1003l\x1b[?1004l\x1b[?1006l\x1b[?1015l',
    );
});

test('keeps only one xterm write in flight and coalesces queued TUI output', () => {
    const writes = [];
    const callbacks = [];
    const pump = createTerminalWritePump((bytes, done) => {
        writes.push([...bytes]);
        callbacks.push(done);
    });

    pump.write([1, 2]);
    pump.write([3]);
    pump.write([4, 5]);

    assert.deepEqual(writes, [[1, 2]]);
    assert.deepEqual(pump.getStats(), {
        queuedBytes: 3,
        queuedChunks: 2,
        inFlightBytes: 2,
        highWaterBytes: 5,
        totalBytes: 5,
        writeCalls: 1,
    });

    callbacks.shift()();
    assert.deepEqual(writes, [[1, 2], [3, 4, 5]]);
    assert.equal(pump.getStats().writeCalls, 2);

    callbacks.shift()();
    assert.equal(pump.getStats().queuedBytes, 0);
    assert.equal(pump.getStats().inFlightBytes, 0);
});

test('reports terminal backpressure once per pressure cycle without dropping bytes', () => {
    const writes = [];
    const callbacks = [];
    const pressure = [];
    const pump = createTerminalWritePump(
        (bytes, done) => {
            writes.push([...bytes]);
            callbacks.push(done);
        },
        {
            pressureThresholdBytes: 4,
            onBackpressure: (stats) => pressure.push(stats.queuedBytes + stats.inFlightBytes),
        },
    );

    pump.write([1, 2]);
    pump.write([3, 4]);
    pump.write([5, 6]);
    pump.write([7]);

    assert.deepEqual(pressure, [4]);
    callbacks.shift()();
    callbacks.shift()();

    pump.write([8, 9, 10, 11]);
    assert.deepEqual(pressure, [4, 4]);
    callbacks.shift()();

    assert.deepEqual(writes.flat(), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
});

test('contains xterm writer failures and continues draining later output', () => {
    const errors = [];
    const writes = [];
    let fail = true;
    const pump = createTerminalWritePump(
        (bytes, done) => {
            if (fail) {
                fail = false;
                throw new Error('renderer failed');
            }
            writes.push([...bytes]);
            done();
        },
        { onError: (error) => errors.push(error.message) },
    );

    pump.write([1]);
    pump.write([2, 3]);

    assert.deepEqual(errors, ['renderer failed']);
    assert.deepEqual(writes, [[2, 3]]);
    assert.equal(pump.getStats().queuedBytes, 0);
});

test('normalizes Tauri byte arrays without stringifying terminal data', () => {
    const bytes = toTerminalBytes([0x1b, 0x5b, 0x32, 0x4a, 0xc3, 0xa7]);

    assert.ok(bytes instanceof Uint8Array);
    assert.deepEqual([...bytes], [0x1b, 0x5b, 0x32, 0x4a, 0xc3, 0xa7]);
});

test('normalizes ArrayBuffer views and rejects non-byte terminal output', () => {
    const buffer = Uint8Array.from([1, 2, 3, 4]).buffer;

    assert.deepEqual([...toTerminalBytes(buffer)], [1, 2, 3, 4]);
    assert.deepEqual([...toTerminalBytes(new DataView(buffer, 1, 2))], [2, 3]);
    assert.throws(() => toTerminalBytes('1,2,3'), /byte array/);
});

test('keeps every terminal byte when more than 200 chunks arrive while detached', () => {
    let chunks = [];
    const expected = [];

    for (let index = 0; index < 500; index += 1) {
        const chunk = [index % 256, (index + 1) % 256];
        chunks = appendTerminalChunk(chunks, chunk);
        expected.push(...chunk);
    }

    assert.deepEqual([...concatTerminalChunks(chunks)], expected);
});

test('preserves split UTF-8 and ANSI sequences in their original order', () => {
    const chunks = [
        [0x1b, 0x5b, 0x32],
        [0x4a, 0xf0, 0x9f],
        [0x92, 0xbb, 0x1b],
        [0x5b, 0x48],
    ];

    assert.deepEqual(
        [...concatTerminalChunks(chunks)],
        [0x1b, 0x5b, 0x32, 0x4a, 0xf0, 0x9f, 0x92, 0xbb, 0x1b, 0x5b, 0x48],
    );
});

test('handles empty buffers and appends chunks in constant time', () => {
    assert.deepEqual([...concatTerminalChunks([])], []);

    const original = [Uint8Array.from([1, 2])];
    assert.equal(appendTerminalChunk(original, []), original);

    const chunks = appendTerminalChunk(original, [3, 4]);
    assert.equal(chunks, original);
    assert.equal(chunks.length, 2);
    assert.deepEqual([...concatTerminalChunks(chunks)], [1, 2, 3, 4]);
});

test('serializes asynchronous terminal writes and continues after one failure', async () => {
    const calls = [];
    const queue = createOrderedAsyncQueue(async (value) => {
        calls.push(`start:${value}`);
        await new Promise((resolve) => setTimeout(resolve, value === 'first' ? 10 : 0));
        calls.push(`end:${value}`);
        if (value === 'broken') throw new Error('write failed');
        return value;
    });

    const first = queue('first');
    const broken = queue('broken');
    const last = queue('last');

    assert.equal(await first, 'first');
    await assert.rejects(broken, /write failed/);
    assert.equal(await last, 'last');
    assert.deepEqual(calls, [
        'start:first',
        'end:first',
        'start:broken',
        'end:broken',
        'start:last',
        'end:last',
    ]);
});

test('answers an XTGETTCAP query whose DCS framing was stripped by ConPTY', () => {
    const probes = [];
    const filter = createConptyProbeFilter((capability) => probes.push(capability));
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const first = filter.write(encoder.encode('before\x1b[6n+q4'));
    const second = filter.write(encoder.encode('d73after'));

    assert.equal(decoder.decode(first), 'before\x1b[6n');
    assert.equal(decoder.decode(second), 'after');
    assert.deepEqual(probes, ['4d73']);
    assert.equal(createXtgettcapReply(probes[0]), '\x1bP0+r4d73\x1b\\');
});

test('filters the partially stripped ConPTY form and preserves unrelated text', () => {
    const probes = [];
    const filter = createConptyProbeFilter((capability) => probes.push(capability));
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const ordinary = filter.write(encoder.encode('literal +q4d73 stays'));
    const probe = filter.write(encoder.encode('\x1b[6nP+q4D73\\ready'));

    assert.equal(decoder.decode(ordinary), 'literal +q4d73 stays');
    assert.equal(decoder.decode(probe), '\x1b[6nready');
    assert.deepEqual(probes, ['4D73']);
    assert.equal(createXtgettcapReply('not-hex'), null);
    assert.equal(createXtgettcapReply('544e'), null);
});
