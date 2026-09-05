import assert from 'node:assert/strict';
import test from 'node:test';

import {
    loadConfigFile,
    writeConfigFile,
} from './configStorage.js';

const encoder = new TextEncoder();

function createFakeFs(initialFiles = {}) {
    const files = new Map(Object.entries(initialFiles));
    const writes = [];
    const directories = [];
    const key = (path, options) => `${options.baseDir}:${path}`;

    return {
        writes,
        directories,
        api: {
            exists: async (path, options) => files.has(key(path, options)),
            mkdir: async (path, options) => directories.push({ path, options }),
            readFile: async (path, options) => {
                const value = files.get(key(path, options));
                if (!value) throw new Error(`missing ${key(path, options)}`);
                return value;
            },
            writeFile: async (path, contents, options) => {
                files.set(key(path, options), contents);
                writes.push({ path, contents, options });
            },
        },
    };
}

test('writes config.json under the writable application data directory', async () => {
    const fake = createFakeFs();

    await writeConfigFile(fake.api, 'APP_DATA', { customers: [{ id: 'host-1' }] });

    assert.deepEqual(fake.directories, [{
        path: '',
        options: { baseDir: 'APP_DATA', recursive: true },
    }]);
    assert.equal(fake.writes.length, 1);
    assert.equal(fake.writes[0].path, 'config.json');
    assert.equal(fake.writes[0].options.baseDir, 'APP_DATA');
    assert.deepEqual(
        JSON.parse(new TextDecoder().decode(fake.writes[0].contents)),
        { customers: [{ id: 'host-1' }] },
    );
});

test('prefers the writable config and does not overwrite it with a legacy resource', async () => {
    const fake = createFakeFs({
        'APP_DATA:config.json': encoder.encode('{"source":"app-data"}'),
        'RESOURCE:config.json': encoder.encode('{"source":"resource"}'),
    });

    const result = await loadConfigFile(fake.api, 'APP_DATA', 'RESOURCE');

    assert.deepEqual(result, { source: 'app-data' });
    assert.equal(fake.writes.length, 0);
});

test('migrates a legacy resource config into the writable application data directory', async () => {
    const fake = createFakeFs({
        'RESOURCE:config.json': encoder.encode('{"source":"legacy"}'),
    });

    const result = await loadConfigFile(fake.api, 'APP_DATA', 'RESOURCE');

    assert.deepEqual(result, { source: 'legacy' });
    assert.equal(fake.writes.length, 1);
    assert.equal(fake.writes[0].options.baseDir, 'APP_DATA');
});

test('returns null when neither current nor legacy config exists', async () => {
    const fake = createFakeFs();

    const result = await loadConfigFile(fake.api, 'APP_DATA', 'RESOURCE');

    assert.equal(result, null);
    assert.equal(fake.writes.length, 0);
});
