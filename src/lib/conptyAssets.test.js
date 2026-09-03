import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('bundles the signed Microsoft ConPTY pair beside the Windows executable', async () => {
    const configPath = path.join(projectRoot, 'src-tauri', 'tauri.windows.conf.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    const resources = config.bundle.resources;

    assert.equal(resources['conpty/x64/conpty.dll'], 'conpty.dll');
    assert.equal(resources['conpty/x64/OpenConsole.exe'], 'OpenConsole.exe');

    for (const name of ['conpty.dll', 'OpenConsole.exe']) {
        const bytes = await readFile(path.join(projectRoot, 'src-tauri', 'conpty', 'x64', name));
        assert.deepEqual([...bytes.subarray(0, 2)], [0x4d, 0x5a]);
        assert.ok(bytes.length > 100_000);
    }
});
