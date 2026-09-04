# SSH host key e negociação de algoritmos — evidência TDD

Data: 2026-09-04

## Comportamentos cobertos

- O build mantém `vendored-openssl` habilitado no `ssh2`, evitando o backend WinCNG sem Ed25519.
- Uma chave desconhecida e uma chave alterada produzem mensagens e ações diferentes.
- Uma chave alterada exige confirmação explícita e nunca é aceita silenciosamente.
- A substituição remove somente o host e a porta afetados, preservando comentários, outros hosts e outros aliases.
- Entradas OpenSSH ofuscadas (`|1|...`) também são identificadas e removidas.
- O fingerprint SHA256 usa o mesmo formato sem padding exibido pelo OpenSSH.
- Falhas de negociação do libssh2 são convertidas em uma explicação acionável no modal.

## RED

Checkpoint: `a9413d7 test: reproduce SSH host key and negotiation errors`

- `npm test`: falhou porque `src/lib/sshSecurity.js` ainda não existia.
- `cargo test --manifest-path src-tauri/Cargo.toml --lib ssh::commands::tests`: falhou porque classificação, normalização e substituição de host keys ainda não existiam.

## GREEN

- `npm test`: 42 testes aprovados.
- `npm run test:coverage`: 96,94% linhas no conjunto medido; `sshSecurity.js` com 100% de linhas, branches e funções.
- `npm run build`: aprovado.
- `cargo test --manifest-path src-tauri/Cargo.toml --lib`: 16 testes aprovados durante a validação da lógica Rust.
- `cargo clippy --manifest-path src-tauri/Cargo.toml --lib -- -D warnings`: aprovado durante a validação da lógica Rust.
- `cargo tree --manifest-path src-tauri/Cargo.toml -e features -i libssh2-sys`: confirmou `ssh2/vendored-openssl` e `libssh2-sys/openssl-sys` no manifesto final.
- `git diff --check`: aprovado.

## Observação do ambiente local

O build final do OpenSSL vendorizado exige um Perl nativo do Windows. Esta máquina possui apenas o Perl Unix/MSYS do Git, que o configurador MSVC do OpenSSL rejeita. O requisito de Strawberry Perl foi documentado no README; o pipeline `windows-latest` também fornece Perl nativo. A lógica Rust foi compilada e testada integralmente com o backend anterior antes de restaurar `vendored-openssl` no manifesto final.
