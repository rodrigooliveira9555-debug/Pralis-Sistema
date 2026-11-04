# 07 — Linha do tempo (343 commits, 29/10 → 03/11/2026)

**Autores:** Codex `<codex@openai.com>` 330 (327 "Update Site source") · Rodrigo Oliveira 12
(02–03/11, mensagens descritivas, feitas por agente local) · "CICLUZ Workspace" 1 (`ae5f8cc`, logo).
A numeração "Revisão NNN" do `DESIGN_SYSTEM.md` acompanha o número do commit.

| Dia   | Commits | O que aconteceu |
| ----- | ------- | --------------- |
| 29/10 | 1   | `a4631aa` — "PRALIS · Portal DP", 3 telas (dashboard, flows, expenses) |
| 30/10 | 124 | Restyle Cicluz (`0629ef7`), marca (`c7ff080`), 11→19 views; cadastro completo (`ea0ccaa`), simples (`d73e209`), patrimônio (`b935c77`), cargos (`a7db946`), salário (`da51f7a`); à noite `AGENTS.md` + `DESIGN_SYSTEM.md` (`8cb7738`), `groups.js` (`0262276`), bandeiras/operadoras, `location-tree.js` (`4da5e2f`) |
| 31/10 | 140 | cores, organograma, agenda, ícones, cabeçalhos fixos; `UI_CHANGE_PROCESS.md` + `ui-foundation.css` (`c8cef37`); primeiro teste (`0217d49`); à noite celular e layout unificado (`unified-layout.css`, `fa7f2fc`) |
| 01/11 | 64  | `UI_SWEEP` (`a125a92`), cadastro completo salvando (`d386e47`), Ficha de Cargos (`61020a2`), cabeçalho inferior configurável estendido a todas as telas (rev305, `01ef8f5`), DOSSIE + VALIDACAO (`ecb7a52`) |
| 02/11 | 8   | tema escuro (`theme-surfaces.css`), datas, menu |
| 03/11 | 6   | cabeçalhos, ícones maciços, contornos; último `ccb1bf9` 11h12 |

**Leitura:** nenhuma tela nova surgiu depois de **30/10 16h37**. Do dia 31 em diante foi
acabamento visual.

## Arquivos mais alterados
`dist/index.html` 287 · `DESIGN_SYSTEM.md` 158 · `design-system.css` 82 · `UI_CHANGE_PROCESS.md` 75 ·
`groups.js` 48 · `unified-layout.css` 37 · `navigation-layout.css` 37 · `location-tree.js` 31.

## Sinais de retrabalho
- "Substitui" aparece 48 vezes no `DESIGN_SYSTEM.md`.
- Rev226 rejeitada e restaurada; rev233→234 desfez extensão ao menu principal.
- Ícones vazado × maciço: 4 trocas em 2 dias (`400ba4a`, `f6964e1`, `6e81229`, `e7a58eb`).
- Excluir: vermelho → cor da aba → vermelho.
- Datas: calendário nativo → máscara com calendário → sem calendário (`0758a68`).
- Texto do cabeçalho: branco → cinza → cor da superfície.
- Nenhum arquivo foi apagado em todo o histórico.
