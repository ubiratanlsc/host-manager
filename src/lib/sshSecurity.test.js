import assert from 'node:assert/strict';
import test from 'node:test';

import { getHostKeyDialogCopy, getNegotiationErrorCopy } from './sshSecurity.js';

test('presents a changed host key as a critical identity warning', () => {
    const copy = getHostKeyDialogCopy({ status: 'changed' });

    assert.equal(copy.title, 'A identificação do servidor mudou');
    assert.match(copy.description, /ataque/iu);
    assert.match(copy.action, /substituir/iu);
});

test('keeps the first-contact host key flow distinct from a changed key', () => {
    const copy = getHostKeyDialogCopy({ status: 'unknown' });

    assert.equal(copy.title, 'Servidor ainda não verificado');
    assert.match(copy.action, /confiar/iu);
    assert.doesNotMatch(copy.description, /mudou/iu);
});

test('explains an SSH algorithm negotiation failure and offers next steps', () => {
    const copy = getNegotiationErrorCopy({ host: '192.168.7.5', port: 22 });

    assert.match(copy.description, /192\.168\.7\.5:22/);
    assert.match(copy.solution, /algoritmos/iu);
    assert.match(copy.solution, /servidor/iu);
});
