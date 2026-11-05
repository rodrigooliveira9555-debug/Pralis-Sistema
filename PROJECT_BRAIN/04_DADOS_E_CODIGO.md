# 04 — Dados e código

## Persistência

**Desde 03/11/2026 (branch `feat/backend-login-20261103`):** as chaves de negócio abaixo são guardadas no banco, por empresa, com versão e histórico (lista fechada em `servidor/shared/src/documentos.ts`). O `localStorage` continua sendo onde as telas leem e gravam; `dist/cicluz-sessao.js` envia cada gravação ao servidor. Preferências de tela e o cadastro completo ficam só no aparelho (P-11).

### Chaves `localStorage` (prefixo `cicluz-`)

**Dados de negócio**
- `financial-hierarchy-v1` — todos os grupos financeiros (VND/DES/MER/RET, tipos, bandeiras,
  operadoras+taxas)
- `ti-groups-v1`, `ti-account-details-v1` — contas (CNT)
- `cargos-v1`, `cargos-referencia-v1` (overrides dos 32 de referência), `salarios-vigencias-v1`,
  `job-profiles-v1`
- `location-tree-v1` (`{tree, history}`), `organogram-positions-v1`, `cadastro-completo-v1`
- `icon-library-v1`, `custom-colors-v1`
- `compras-v1` — módulo Compras inteiro num documento (fornecedores, produtos com foto, agendas,
  cotações, pedidos, estoque, conferências). No banco desde 04/11/2026 (Zé). Regras: o Compras só grava
  quando algo muda (cada gravação vira versão); foto reduzida a 320 px (teto de 4 MB por documento); sem
  documento no banco, o primeiro aparelho manda os dados de exemplo (decisão do Zé). Chave **adotada do
  aparelho**: na entrada, se o banco não tem e o aparelho da mesma empresa tem, ele envia o dele em vez de
  apagar (`CHAVES_ADOTADAS_DO_APARELHO`, só para chave que a tela nunca apaga).
- `agenda-v1` — Agenda inteira num documento: listas (`id`, `nome`, `cor`) e compromissos (título, notas,
  data/hora, prioridade em 5 níveis, sinalizado, etiquetas, responsável **por id**, subtarefas, concluído).
  No banco e adotada do aparelho desde 05/11/2026. Abrir a Agenda não grava; as duas listas iniciais têm ids
  fixos (`lista-gestao-pessoas`, `lista-diretor-operacoes`) para dois aparelhos não criarem listas repetidas.
  Também: colunas do Kanban, repetição (concluir guarda uma cópia concluída com `origemId` e passa o original
  para a próxima data), término, alerta e soneca (`adiadoPara`), URL, local, ordem manual. Campos novos são
  opcionais (dado antigo continua válido). Preferências do aparelho, fora da sincronização:
  `cicluz-agenda-calendario-ocultas` e `cicluz-agenda-alertas-mostrados`.
  Local: `local` (endereço) + `localizacao` { lat, lng, aviso entrar/sair, raio }. Pessoas: `pessoas`
  [{ id, responsavel, ver, editar, concluir, excluir }] (o antigo `responsavelId` vira um responsável, na memória,
  e o formato novo é gravado na próxima alteração); gestor = `criadoPor`. Avaliação: `avaliacao` { tipo, notas
  [{ avaliadoId, porId, papel gestor|auto, valor, comentario, em }] }, só depois de concluído e sem mudar.
  Relações do mapa mental: `relacoes` [{ id, de, para, rotulo }] (somem junto com o compromisso). Preferência do
  aparelho: `cicluz-agenda-mapa` (estrutura, agrupamento, recolhidos).
  Código: `dist/agenda/` (dominio, dados, calendario, kanban, telas, alertas, agenda.css).

**Preferência de interface:** `tema`, `menu-ordem`, `menu-item-order-v1`, `sidebar-sections-v1`,
`menu-visibility`, `people-display-v1`, `people-footer-*`, `{key}-sort`, `{key}-display`,
`fee-brand-order-{id}`, `account-sort`.

**Flags de migração de seed:** `financial-import-complete-v3-ret`, `financial-legacy-import-v1`,
`bandeiras-import-v1`, `operadoras-import-v1`, `ti-contas-seed-v1`, `icon-pilot-migrated-v1`.

**Seeds:** embutidos em `groups.js:4` (`groupSeed`, até ~linha 1544). `group-seeds.json` é cópia de
referência — **não** é carregado.

**Chamadas externas:** `api.iconify.design/search` (`icon-library-manager.js:23`), Google Fonts
(Montserrat) e, só quando o mapa da Agenda é aberto, `tile.openstreetmap.org` (mapa) e
`nominatim.openstreetmap.org` (busca de endereço: vai o texto procurado ou o ponto tocado, nada de pessoa;
no máximo 1 busca/s, só ao pedir). Leaflet 1.9.4 fica no site (`dist/vendor/leaflet`, SHA-256 oficial).
Uso justo do OpenStreetMap: se o uso crescer muito, trocar por serviço pago com chave.

**Entidades que ainda não existem:** colaborador/pessoa real (só maquete), loja como entidade,
agenda, lançamento, caixa operacional, usuário/login.

## Módulos JS (`dist/`)

| Arquivo                     | Responsabilidade                                                       |
| --------------------------- | ---------------------------------------------------------------------- |
| `index.html` (210 KB)       | shell, views, 71 blocos `<style>`, editores de Cargos e Contas          |
| `groups.js` (1697 linhas)   | DES/MER/RET/VND, tipos de venda, bandeiras, operadoras e taxas          |
| `location-tree.js`          | Área/Setor/Local/Sublocal                                              |
| `organogram.js`             | organograma (substitui `showConfig`)                                    |
| `job-profiles.js`           | Ficha de Cargos (`window.showJobProfiles`)                              |
| `complete-registration.js`  | salvar/avançar do cadastro completo                                     |
| `financial-components.js`   | `formatSystemName`/`formatFinancialName`, `CicluzIdentity.controls`     |
| `payment-marks.js` + JSON   | logos de bandeiras e operadoras (`assets/payment-marks`, `assets/banks`)|
| `bakery-icons.js`, `icon-library-manager.js`, `icon-search-terms.js` | biblioteca de ícones (48 + Iconify) |
| `preserve-history.js`       | exige transferência antes de excluir                                   |
| `field-validation.js`       | CPF, moeda (centavos), data                                            |
| `date-fields.js`            | DD/MM/AA na tela, ISO guardado                                         |
| `menu-order.js`, `agenda-menu.js` | ordenar menus; seções da lateral                                 |
| `navigation-layout.js`, `mobile-menu.js`, `menu-reveal.js`, `sticky-headers.js`, `mobile-edge-colors.js` | layout e celular |
| `header-normalize.js`, `header-save.js`, `layout-review.js`, `ui-standards.js`, `unified-dialogs.js` | padronização via MutationObserver |
| `people-header-pilot.js`    | barra de busca/período e botões configuráveis (vale para todas as telas)|
| `operations-pilot.*`        | **código morto** — não é carregado                                     |

## Testes (`tests/`)
- `date-fields.cjs` — 19 asserções (máscara DD/MM/AA, bissexto, pivô 49→2049 / 50→1950,
  preserva século gravado).
- `field-validation.cjs` — 21 asserções (moeda, `moneyNumber`, CPF, `dateValid`).
- `header-layout.html`, `registration-review.html`, `people-toolbar-preview.html` — bancadas
  **manuais** com iframe (320/375/390/1024, claro/escuro).

Rodar: `node tests/date-fields.cjs && node tests/field-validation.cjs`.
