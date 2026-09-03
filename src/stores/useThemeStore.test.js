import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('all built-in terminal theme hex colors are valid CSS colors', async () => {
    const source = await readFile(new URL('./useThemeStore.js', import.meta.url), 'utf8');
    const colorTokens = source.match(/#[a-zA-Z0-9]+/g) || [];
    const invalid = colorTokens.filter((color) => !/^#[0-9a-fA-F]{3,4}([0-9a-fA-F]{2}){0,2}$/.test(color));

    assert.deepEqual(invalid, []);
});
