# Updater — Tauri v2 Plugin

> Fonte: https://v2.tauri.app/plugin/updater/ (baixado 2026-06-15)
> Links: [GitHub](https://github.com/tauri-apps/plugins-workspace/tree/v2/plugins/updater) · [npm](https://www.npmjs.com/package/@tauri-apps/plugin-updater) · [crates.io](https://crates.io/crates/tauri-plugin-updater) · [API docs.rs](https://docs.rs/tauri-plugin-updater)

Atualiza automaticamente o app Tauri via update server ou JSON estático.

## Plataformas Suportadas

Requer Rust **>= 1.77.2**. Suporta: windows, linux, macos, android, ios.

## Setup

### Automático

```
npm run tauri add updater
# yarn run tauri add updater
# pnpm tauri add updater
# deno task tauri add updater
# bun tauri add updater
# cargo tauri add updater
```

### Manual

1. Adicionar dependência (no `src-tauri`):

```
cargo add tauri-plugin-updater --target 'cfg(any(target_os = "macos", windows, target_os = "linux"))'
```

2. Inicializar plugin no `lib.rs`:

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_updater::Builder::new().build());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

3. Bindings JS (Guest):

```
npm install @tauri-apps/plugin-updater
```

## Assinatura de Updates (obrigatória)

O updater exige assinatura p/ verificar origem confiável. **Não pode ser desabilitado.**

Precisa de 2 chaves:
1. **Pública** — vai no `tauri.conf.json`, valida artefatos antes de instalar. Pode compartilhar.
2. **Privada** — assina os instaladores. **NUNCA compartilhe.** Se perder, não consegue mais publicar updates p/ quem já instalou. Guarde em local seguro.

Gerar chaves:

```
npm run tauri signer generate -- -w ~/.tauri/myapp.key
# cargo tauri signer generate -w ~/.tauri/myapp.key
```

### Building

Durante o build dos artefatos, a chave privada precisa estar em variável de ambiente. **Arquivos `.env` NÃO funcionam!**

Mac/Linux:
```
export TAURI_SIGNING_PRIVATE_KEY="Path or content of your private key"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""   # opcional
```

Windows (PowerShell):
```
$env:TAURI_SIGNING_PRIVATE_KEY="Path or content of your private key"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""     # opcional
```

Depois roda `tauri build` normal — gera bundles de update + assinaturas. Os arquivos gerados dependem de `createUpdaterArtifacts`.

#### Artefatos v2 (`"createUpdaterArtifacts": true`)

- **Linux** (`target/release/bundle/appimage/`):
  - `myapp.AppImage` — bundle padrão, reusado pelo updater
  - `myapp.AppImage.sig` — assinatura
- **macOS** (`target/release/bundle/macos/`):
  - `myapp.app` — bundle padrão
  - `myapp.app.tar.gz` — bundle de update
  - `myapp.app.tar.gz.sig` — assinatura
- **Windows** (`target/release/bundle/msi/` e `nsis/`):
  - `myapp-setup.exe` + `myapp-setup.exe.sig`
  - `myapp.msi` + `myapp.msi.sig`

#### Artefatos v1-compatible (`"createUpdaterArtifacts": "v1Compatible"`)

- **Linux**: `myapp.AppImage`, `myapp.AppImage.tar.gz`, `.tar.gz.sig`
- **macOS**: `myapp.app`, `myapp.app.tar.gz`, `.tar.gz.sig`
- **Windows**: `myapp-setup.exe`, `myapp-setup.nsis.zip`, `.nsis.zip.sig`; `myapp.msi`, `myapp.msi.zip`, `.msi.zip.sig`

## Configuração `tauri.conf.json`

| Chave | Descrição |
| --- | --- |
| `createUpdaterArtifacts` | `true` faz o bundler criar artefatos de update. Migrando de v1: use `"v1Compatible"`. **Será removida na v3** — troque p/ `true` quando todos migrarem p/ v2. |
| `pubkey` | Chave pública gerada pela CLI. **Não pode ser caminho de arquivo!** |
| `endpoints` | Array de URLs (strings). TLS obrigatório em produção. Só passa p/ próxima URL se retornar status não-2XX. |
| `dangerousInsecureTransportProtocol` | `true` permite endpoints não-HTTPS. Usar com cautela! |

Variáveis dinâmicas na URL do endpoint:
- `{{current_version}}` — versão do app que pede o update
- `{{target}}` — SO (`linux`, `windows` ou `darwin`)
- `{{arch}}` — arquitetura (`x86_64`, `i686`, `aarch64` ou `armv7`)

```json
{
  "bundle": {
    "createUpdaterArtifacts": true
  },
  "plugins": {
    "updater": {
      "pubkey": "CONTENT FROM PUBLICKEY.PEM",
      "endpoints": [
        "https://releases.myapp.com/{{target}}/{{arch}}/{{current_version}}",
        "https://github.com/user/repo/releases/latest/download/latest.json"
      ]
    }
  }
}
```

### `installMode` no Windows

```json
{
  "plugins": {
    "updater": {
      "windows": {
        "installMode": "passive"
      }
    }
  }
}
```

- `"passive"` — janela pequena com barra de progresso, sem interação. Recomendado e padrão.
- `"basicUi"` — UI básica, exige interação do usuário.
- `"quiet"` — sem feedback. Instalador não consegue pedir privilégio admin sozinho; só funciona em instalações user-wide ou se o app já roda como admin. Não recomendado.

## Suporte de Servidor

Dois modos: update server dinâmico ou JSON estático (S3, GitHub gists).

### JSON Estático

| Chave | Descrição |
| --- | --- |
| `version` | SemVer válido, com ou sem `v` (`1.0.0` e `v1.0.0` válidos). |
| `notes` | Notas do update. |
| `pub_date` | Data em RFC 3339, se presente. |
| `platforms` | Chave por plataforma no formato `OS-ARCH`. `OS`: `linux`/`darwin`/`windows`. `ARCH`: `x86_64`/`aarch64`/`i686`/`armv7`. |
| `signature` | Conteúdo do `.sig` gerado (muda a cada build). Caminho/URL não funciona! |

Obrigatórios: `version`, `platforms.[target].url`, `platforms.[target].signature`.

```json
{
  "version": "",
  "notes": "",
  "pub_date": "",
  "platforms": {
    "linux-x86_64":   { "signature": "", "url": "" },
    "windows-x86_64": { "signature": "", "url": "" },
    "darwin-x86_64":  { "signature": "", "url": "" }
  }
}
```

Tauri valida o arquivo inteiro antes de checar `version` — todas as plataformas precisam estar válidas e completas.

### Update Server Dinâmico

Tauri segue as instruções do servidor. Pra desabilitar a checagem interna de versão, sobrescreva o [`version_comparator`](https://docs.rs/tauri-plugin-updater/latest/tauri_plugin_updater/struct.UpdaterBuilder.html#method.version_comparator) (útil p/ rollback).

O servidor usa as variáveis da URL p/ decidir. Pra mais dados, inclua [request headers em Rust](https://docs.rs/tauri-plugin-updater/latest/tauri_plugin_updater/struct.UpdaterBuilder.html#method.header).

- Sem update: responder `204 No Content`.
- Com update: `200 OK` + JSON:

| Chave | Descrição |
| --- | --- |
| `version` | SemVer válido. |
| `notes` | Notas do update. |
| `pub_date` | RFC 3339, se presente. |
| `url` | URL válida do bundle de update. |
| `signature` | Conteúdo do `.sig`. Caminho/URL não funciona! |

Obrigatórios: `url`, `version`, `signature`.

```json
{
  "version": "",
  "pub_date": "",
  "url": "",
  "signature": "",
  "notes": ""
}
```

## Checando por Updates

API padrão usa os endpoints configurados; acessível por JS e Rust.

### JavaScript

```js
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

const update = await check();
if (update) {
  console.log(
    `found update ${update.version} from ${update.date} with notes ${update.body}`
  );
  let downloaded = 0;
  let contentLength = 0;
  // alternativamente: update.download() e update.install() separados
  await update.downloadAndInstall((event) => {
    switch (event.event) {
      case 'Started':
        contentLength = event.data.contentLength;
        console.log(`started downloading ${event.data.contentLength} bytes`);
        break;
      case 'Progress':
        downloaded += event.data.chunkLength;
        console.log(`downloaded ${downloaded} from ${contentLength}`);
        break;
      case 'Finished':
        console.log('download finished');
        break;
    }
  });
  console.log('update installed');
  await relaunch();
}
```

### Rust

```rust
use tauri_plugin_updater::UpdaterExt;

pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      let handle = app.handle().clone();
      tauri::async_runtime::spawn(async move {
        update(handle).await.unwrap();
      });
      Ok(())
    })
    .run(tauri::generate_context!())
    .unwrap();
}

async fn update(app: tauri::AppHandle) -> tauri_plugin_updater::Result<()> {
  if let Some(update) = app.updater()?.check().await? {
    let mut downloaded = 0;
    update
      .download_and_install(
        |chunk_length, content_length| {
          downloaded += chunk_length;
          println!("downloaded {downloaded} from {content_length:?}");
        },
        || {
          println!("download finished");
        },
      )
      .await?;
    println!("update installed");
    app.restart();
  }
  Ok(())
}
```

Reiniciar imediatamente não é obrigatório — pode esperar o usuário reiniciar manualmente ou perguntar quando.

### Timeout, proxy e headers

JavaScript:
```js
import { check } from '@tauri-apps/plugin-updater';

const update = await check({
  proxy: '<proxy url>',
  timeout: 30000, // ms
  headers: {
    Authorization: 'Bearer <token>',
  },
});
```

Rust:
```rust
use tauri_plugin_updater::UpdaterExt;

let update = app
  .updater_builder()
  .timeout(std::time::Duration::from_secs(30))
  .proxy("<proxy-url>".parse().expect("invalid URL"))
  .header("Authorization", "Bearer <token>")
  .build()?
  .check()
  .await?;
```

## Configuração em Runtime

Algumas APIs só existem em Rust por segurança.

### Endpoints (release channels)

```rust
use tauri_plugin_updater::UpdaterExt;

let channel = if beta { "beta" } else { "stable" };
let update_url = format!("https://{channel}.myserver.com/{{{{target}}}}-{{{{arch}}}}/{{{{current_version}}}}");

let update = app
  .updater_builder()
  .endpoints(vec![update_url])?
  .build()?
  .check()
  .await?;
```

### Public key (key rotation)

```rust
tauri_plugin_updater::Builder::new().pubkey("<your public key>").build()
```

```rust
use tauri_plugin_updater::UpdaterExt;

let update = app
  .updater_builder()
  .pubkey("<your public key>")
  .build()?
  .check()
  .await?;
```

### Custom target

JavaScript:
```js
import { check } from '@tauri-apps/plugin-updater';

const update = await check({ target: 'macos-universal' });
```

Rust:
```rust
tauri_plugin_updater::Builder::new().target("macos-universal").build()
```

```rust
use tauri_plugin_updater::UpdaterExt;

let update = app
  .updater_builder()
  .target("macos-universal")
  .build()?
  .check()
  .await?;
```

### Permitir downgrades

```rust
use tauri_plugin_updater::UpdaterExt;

let update = app
  .updater_builder()
  .version_comparator(|current, update| {
    // comparação padrão: `update.version > current`
    update.version != current
  })
  .build()?
  .check()
  .await?;
```

### Hook before-exit no Windows

Windows fecha o app antes de instalar. Pra agir antes:

```rust
use tauri_plugin_updater::UpdaterExt;

let update = app
  .updater_builder()
  .on_before_exit(|| {
    println!("app is about to exit on Windows!");
  })
  .build()?
  .check()
  .await?;
```

## Permissões

Comandos perigosos são bloqueados por padrão. Habilite nas `capabilities`:

```json
{
  "permissions": [
    "updater:default"
  ]
}
```

### Default Permission

`updater:default` inclui o workflow completo:
- `allow-check`
- `allow-download`
- `allow-install`
- `allow-download-and-install`

### Tabela de Permissões

| Identifier | Descrição |
| --- | --- |
| `updater:allow-check` | Habilita `check`. |
| `updater:deny-check` | Nega `check`. |
| `updater:allow-download` | Habilita `download`. |
| `updater:deny-download` | Nega `download`. |
| `updater:allow-download-and-install` | Habilita `download_and_install`. |
| `updater:deny-download-and-install` | Nega `download_and_install`. |
| `updater:allow-install` | Habilita `install`. |
| `updater:deny-install` | Nega `install`. |
