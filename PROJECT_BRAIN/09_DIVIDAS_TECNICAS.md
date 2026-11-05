# 09 — Dívidas técnicas

| ID   | Dívida | Onde | Efeito |
| ---- | ------ | ---- | ------ |
| DT-01 | **1.438 `!important`** (190 só em `unified-layout.css`) e **71 blocos `<style>`** inline | `dist/index.html`, CSS | toda mudança visual vira briga de especificidade |
| DT-02 | Funções sobrescritas em cadeia: `editJob` 4×, `jobsCurrent`, `updateJobIconPreview`, `openSection`, `showTiGroup` (`groups.js:1588,1697`), `showConfig` (`organogram.js`) | `index.html:240-300` e JS | quem lê a 1ª versão não sabe qual roda |
| DT-03 | ~25 `MutationObserver` reestilizando o DOM depois de renderizado | `header-normalize`, `ui-standards`, `layout-review`… | piscadas, custo, ordem de execução frágil |
| DT-04 | Editor de Contas (`index.html:280-296`) duplica o editor de grupos (`groups.js:1639+`) | | duas regras para o mesmo formulário |
| DT-05 | Seed duplicado: embutido em `groups.js` **e** `group-seeds.json` | | qual vale? |
| DT-06 | Código morto `operations-pilot.css/.js` (não carregado) e `#config-view` legado | `dist/` | ruído e risco de reativar |
| DT-07 | Nome "pilot" em arquivos que valem para o sistema todo (`people-header-pilot.*`) | | engana quem chega |
| DT-08 | "Diretor de Operação" × "Diretor de Operações" para coisas diferentes | menus | confusão de papel |
| DT-09 | `index.html` com 307 linhas gigantes (uma linha passa de 30 KB) | | diff ilegível, revisão impossível |
| DT-10 | Dados só no `localStorage`, com 6 flags de migração acumuladas | | perda de dados, sem backup, sem multiusuário |
| DT-11 | Testes: 2 arquivos `.cjs` (40 asserções); 0 teste de interface automatizado | `tests/` | regressão visual só aparece no olho |
| DT-12 | Nunca testado em Safari/iPad/iPhone físico nem com teclado virtual | | o aparelho do dono é o menos testado |
| DT-13 | Várias versões históricas de CSS coexistem; nenhum arquivo apagado no histórico | | a regra-mãe ("nada pronto com caminho antigo vivo") é violada |
| DT-14 | A Agenda reaproveita as peças de tela do Compras (`compras/ui.js`, classes `compras-*`). Fonte única, mas o nome ficou do Compras: renomear para uma base comum quando um terceiro módulo usar | `dist/compras/ui.js` | confusão de nome, sem risco de comportamento |
| DT-15 | Agenda: "quem não participa não vê" vale na tela e nas ações, mas a sincronização manda o documento inteiro (`cicluz-agenda-v1`) para todos os aparelhos da empresa; quem abrir o armazenamento do navegador vê tudo. Para esconder de verdade: servidor com compromisso por linha e permissão por pessoa (backend, doc 12) | `dist/agenda/dados.js`, `servidor/shared/src/documentos.ts` | privacidade entre colegas; não expõe fora da empresa |

## Ordem sugerida de pagamento
1. DT-06 e DT-05 (apagar morto e seed duplicado) — 30 min, risco baixo.
2. DT-02 (consolidar cada função em uma definição só) — 2–3 h.
3. DT-01 por tela, junto de cada mudança visual (nunca um "grande refactor" de CSS).
4. DT-10 só quando houver decisão de backend (doc 12).
