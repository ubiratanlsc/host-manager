import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('builds ssh2 with vendored OpenSSL so Windows supports Ed25519 host keys', async () => {
    const cargoManifest = await readFile(
        new URL('../../src-tauri/Cargo.toml', import.meta.url),
        'utf8',
    );

    assert.match(
        cargoManifest,
        /ssh2\s*=\s*\{[^\n]*features\s*=\s*\[[^\]]*"vendored-openssl"/,
    );
});
