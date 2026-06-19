# Host Manager — Brand & Icon Assets

Identidade visual do **Host Manager** (SSH host manager · Tauri + Rust).
Marca: **Bracket Prompt** `[ ▮ ]` — colchetes Signal Red (`#FF4147`) abraçando um cursor de terminal branco (`#F3F4F6`) sobre fundo near-black.

---

## 📁 Conteúdo desta pasta

| Arquivo | Tamanho | Uso |
|---|---|---|
| `app-icon.svg` | vetor | **Fonte mestre** — gere tudo a partir daqui |
| `app-icon.png` | 1024² | Fonte para o comando `tauri icon` |
| `icon.png` | 512² | Ícone genérico / Linux |
| `128x128@2x.png` | 256² | Tauri (retina) |
| `128x128.png` | 128² | Tauri |
| `32x32.png` | 32² | Tauri / tray |
| `favicon.svg` | vetor | Favicon do site (marca densa p/ tamanhos pequenos) |
| `favicon-32.png` / `favicon-16.png` | 32² / 16² | Favicon fallback |
| `apple-touch-icon.png` | 180² | iOS / PWA |

> O `favicon.svg` usa a marca com menos respiro que o `app-icon.svg`, para continuar legível a 16px.

---

## 🦀 Gerar os ícones do Tauri (recomendado)

O Tauri tem um gerador que cria **todos** os formatos de plataforma (`.ico`, `.icns`, PNGs e os `Square*Logo` da Microsoft Store) a partir de uma única imagem quadrada:

```bash
# na raiz do projeto (precisa de um app-icon.png de pelo menos 1024×1024)
npm run tauri icon host-manager-icons/app-icon.png
# ou, se usa o CLI global:
cargo tauri icon host-manager-icons/app-icon.png
```

Isso popula automaticamente `src-tauri/icons/` com:

```
src-tauri/icons/
├── 32x32.png
├── 128x128.png
├── 128x128@2x.png
├── icon.icns      ← macOS
├── icon.ico       ← Windows
├── icon.png
└── Square*Logo.png ← Windows Store
```

> ⚠️ `.icns` (macOS) e `.ico` (Windows) **só** saem por esse comando — não dá para "arrastar PNG". Use sempre o `tauri icon`.

### Manual (alternativa)
Se preferir não usar o comando, copie os PNGs desta pasta direto para `src-tauri/icons/` (eles já estão nos nomes certos). Faltarão apenas o `.ico` e o `.icns`, que você gera com `tauri icon` ou ferramentas como `iconutil` (mac) / `ImageMagick`.

---

## 🔧 `tauri.conf.json`

Garanta que o bundle aponta para os ícones:

```json
{
  "bundle": {
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

---

## 🌐 Favicon do site / landing

No `<head>` da landing:

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

---

## 🎨 Tokens da marca

```
Signal Red   #FF4147   colchetes, accent, ações, status online
Red 600      #E22D38   hover
Void         #08090B   fundo da app
Surface      #101113   cards / painéis
Elevated     #1C1F24   superfícies elevadas
Border       #2A2D31   bordas
Muted        #9BA1A8   texto secundário
Text         #F3F4F6   texto / cursor
```

**Tipografia:** Space Grotesk (UI/display) · JetBrains Mono (IPs, portas, terminal, metadados).

**Regras do ícone:** o cursor é sempre branco e os colchetes sempre vermelhos. Folga interna ≥ largura de um colchete. Tamanho mínimo 16px.
