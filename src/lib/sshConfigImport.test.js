import test from 'node:test';
import assert from 'node:assert/strict';
import { expandPath, parseSshConfig } from './sshConfigImport.js';

const HOME = 'C:\\Users\\c00137';

test('parses concrete hosts with HostName, Port, User and IdentityFile', () => {
    const { hosts } = parseSshConfig(`
# produção
Host brb-omni
    HostName 192.168.9.20
    Port 2222
    User root
    IdentityFile ~/.ssh/id_ed25519
`, { homeDir: HOME });

    assert.deepEqual(hosts, [{
        alias: 'brb-omni',
        host: '192.168.9.20',
        port: 2222,
        username: 'root',
        identityFile: 'C:\\Users\\c00137\\.ssh\\id_ed25519',
        warnings: [],
    }]);
});

test('wildcard blocks are not hosts but provide defaults, first value wins', () => {
    const { hosts } = parseSshConfig(`
Host lab
    User admin

Host *
    User root
    Port 2200
`);
    assert.equal(hosts.length, 1);
    assert.equal(hosts[0].username, 'admin');
    assert.equal(hosts[0].port, 2200);
    assert.equal(hosts[0].host, 'lab');
});

test('accepts Key=Value, case-insensitive keys, quotes and several aliases', () => {
    const { hosts } = parseSshConfig([
        'HOST a b "c d"',
        '  hostname=10.0.0.1',
        '  IdentityFile = "%d/my keys/id_rsa"',
    ].join('\r\n'), { homeDir: '/home/u/' });

    assert.deepEqual(hosts.map((h) => h.alias), ['a', 'b', 'c d']);
    assert.ok(hosts.every((h) => h.host === '10.0.0.1'));
    assert.equal(hosts[0].identityFile, '/home/u/my keys/id_rsa');
});

test('negated patterns exclude a host from a shared block', () => {
    const { hosts } = parseSshConfig(`
Host web db
Host * !db
    User deploy
`);
    assert.equal(hosts.find((h) => h.alias === 'web').username, 'deploy');
    assert.equal(hosts.find((h) => h.alias === 'db').username, '');
});

test('reports unsupported options and ignores Include/Match', () => {
    const { hosts, warnings } = parseSshConfig(`
Include ~/.ssh/conf.d/*
Host jump-target
    ProxyJump bastion
Match host x
    User nobody
`);
    assert.deepEqual(hosts[0].warnings, ['ProxyJump não é suportado']);
    assert.equal(hosts[0].username, '');
    assert.deepEqual(warnings, ['Include ignorado: ~/.ssh/conf.d/*', 'Blocos "Match" foram ignorados']);
});

test('invalid port falls back to 22 and %h expands to the alias', () => {
    const { hosts } = parseSshConfig('Host srv\n  HostName %h.example.com\n  Port abc');
    assert.equal(hosts[0].port, 22);
    assert.equal(hosts[0].host, 'srv.example.com');
});

test('expandPath leaves absolute paths untouched', () => {
    assert.equal(expandPath('/etc/key', HOME), '/etc/key');
    assert.equal(expandPath('~', HOME), HOME);
});
