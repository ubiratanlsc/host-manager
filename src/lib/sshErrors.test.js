import test from 'node:test';
import assert from 'node:assert/strict';
import { isAuthError, needsPassword } from './sshErrors.js';

test('recognizes login failures from the backend', () => {
    assert.equal(isAuthError('Falha na autenticação: [Session(-18)] Authentication failed'), true);
    assert.equal(isAuthError(new Error('Falha na autenticação: nenhuma senha cadastrada')), true);
    assert.equal(isAuthError('Falha ao iniciar a conexão SSH com 10.0.0.1:22'), false);
    assert.equal(isAuthError(undefined), false);
});

test('asks for a password only when the host has none and login failed', () => {
    const authError = 'Falha na autenticação: nenhuma senha cadastrada e nenhuma chave SSH foi aceita';
    assert.equal(needsPassword(authError, { password: '' }), true);
    assert.equal(needsPassword(authError, { password: '   ' }), true);
    assert.equal(needsPassword(authError, {}), true);
    assert.equal(needsPassword(authError, { password: 'segredo' }), false);
    assert.equal(needsPassword('Conexão recusada', { password: '' }), false);
});
