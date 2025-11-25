# Host Manager

Um gerenciador de hosts multiplataforma com terminal embutido, construído com Tauri (Rust) e React.

## 🚀 Funcionalidades

- **Gerenciamento de Hosts**: Organize seus servidores SSH em grupos e tags
- **Terminal Integrado**: Terminal PTY local e sessões SSH
- **Criptografia**: Dados sensíveis (IPs, senhas) criptografados com AES-256-GCM
- **Multiplataforma**: Windows, Linux e macOS
- **Interface Moderna**: UI responsiva com Tailwind CSS

## 🛠️ Tecnologias

- **Backend**: Rust + Tauri 2.0
- **Frontend**: React 18 + Vite
- **State Management**: Zustand
- **Terminal**: xterm.js
- **Estilização**: Tailwind CSS v4

## 📋 Pré-requisitos

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/) (latest stable)
- [Tauri Prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites)

## 🔧 Instalação

```bash
# Clonar o repositório
git clone https://github.com/ubiratanlsc/host-manager.git
cd host-manager

# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run tauri dev
```

## 📦 Build

```bash
# Build para produção
npm run tauri build
```

## 🏗️ Estrutura do Projeto

```
host-manager/
├── src/                  # Frontend React
│   ├── components/       # Componentes React
│   ├── stores/          # Zustand stores
│   └── utils/           # Utilitários
├── src-tauri/           # Backend Rust
│   └── src/
│       ├── pty/         # Terminal PTY
│       ├── ssh/         # Conexões SSH
│       ├── crypto/      # Criptografia
│       └── models/      # Modelos de dados
└── public/              # Assets estáticos
```

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests.

## 📄 Licença

Este projeto está sob a licença MIT.

## 💻 IDE Recomendada

- [VS Code](https://code.visualstudio.com/)
  - [Tauri Extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
  - [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
  - [ES7+ React/Redux snippets](https://marketplace.visualstudio.com/items?itemName=dsznajder.es7-react-js-snippets)

## 📚 Documentação

Para mais informações, consulte a [documentação do projeto](./project-documentation.md).
