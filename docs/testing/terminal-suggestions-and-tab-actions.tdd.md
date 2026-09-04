# Evidências TDD — sugestões do terminal e ações de aba

## Origem e jornadas

Não houve plano externo. As jornadas foram derivadas do pedido do usuário:

1. Ao continuar digitando, apagar ou editar no meio da linha, as sugestões devem ser recalculadas imediatamente.
2. Quando o cursor estiver nas últimas linhas, a lista deve permanecer dentro dos limites visíveis do terminal.
3. O menu de aba deve duplicar a sessão e reconectar SSH sem destruir outros painéis de um split.
4. O menu de grupo deve abrir as conexões ainda ausentes, sem duplicar sessões conectadas.
5. `Ctrl+D` deve fechar a sessão/aba focada.

## Relatório de execução

### RED

- `node --test src/lib/terminalSuggestions.test.js src/lib/tabActions.test.js`
  - Falhou com `ERR_MODULE_NOT_FOUND` para os dois módulos ainda não implementados.
- `node --test src/lib/terminalSuggestions.test.js src/lib/tabActions.test.js`
  - Depois da implementação inicial, o caso de teclas de cursor em application mode falhou: o espelho retornou `it` em vez de `git`.
- `node --test src/lib/tabActions.test.js`
  - Falhou ao importar `replaceActiveTabTerminal`, reproduzindo a ausência da substituição segura no split.
- `node --test src/lib/tabActions.test.js`
  - Falhou ao importar `replaceActiveTerminalInTabs`, reproduzindo a condição de corrida da aba SSH transitória.
- Checkpoint RED: `3ff4191 test: add reproducers for terminal suggestions and tab actions`.

### GREEN

- `npm.cmd test`: 38 testes, 38 aprovados, 0 falhas.
- `npm.cmd run test:coverage`: 38 testes aprovados; 96,82% de linhas, 87,00% de ramos e 96,67% de funções nos módulos cobertos.
- `npm.cmd run build`: build Vite concluído; 4.028 módulos transformados.
- `git diff --check`: nenhuma inconsistência de whitespace nas alterações da feature.
- Checkpoint GREEN: `e328a39 fix: keep terminal suggestions visible and add tab actions`.

## Especificação dos testes

| # | Garantia | Teste/comando | Tipo | Resultado |
|---|---|---|---|---|
| 1 | Digitação, Backspace, Delete, Home/End, Ctrl+W/Ctrl+K e Unicode mantêm o espelho coerente | `src/lib/terminalSuggestions.test.js` | unidade | PASS |
| 2 | A entrada volta a gerar sugestões logo após uma sequência de edição desconhecida | `resumes tracking promptly after an unknown shell editing sequence` | unidade | PASS |
| 3 | A lista abre para cima na última linha e respeita largura/altura do xterm | testes `places suggestions...` e `fits a suggestion...` | unidade | PASS |
| 4 | Reconexão substitui só a sessão ativa e elimina uma aba transitória duplicada | testes `replaces only...` e `atomically removes...` | unidade | PASS |
| 5 | Abertura de grupo ignora conexões já ativas e reconhece hosts sem grupo válido | `getGroupCustomersToOpen` | unidade | PASS |
| 6 | Somente `Ctrl+D`, sem Alt/Shift/Meta, é reconhecido como fechamento | `recognizes only Ctrl+D as the close-tab shortcut` | unidade | PASS |
| 7 | A integração React/Vite compila com os novos menus, handlers e utilitários | `npm.cmd run build` | integração de build | PASS |

## Cobertura e lacunas conhecidas

- Cobertura final: linhas 96,82%; ramos 87,00%; funções 96,67%.
- Não foi possível executar QA visual automatizado porque nenhum navegador estava habilitado na sessão.
- A validação nativa ainda deve exercitar duas abas, troca de foco, uma TUI em tela cheia, resize rápido e colagem UTF-8, conforme `AGENTS.md`.
- O build mantém avisos já existentes sobre módulos Node externalizados pelo addon de ligaduras e chunk principal acima de 500 kB; não são falhas desta alteração.

## Evidência para merge/squash

- RED: módulos e operações de reconexão ausentes foram observados falhando nos comandos acima.
- GREEN: 38/38 testes, cobertura acima de 80% e build Vite aprovado.
