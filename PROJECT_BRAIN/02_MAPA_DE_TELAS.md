# 02 — Mapa de telas

O menu é montado em JS (`index.html:154-176`); o `<nav>` estático é substituído. O usuário pode
arrastar itens (ordem em `cicluz-menu-ordem`). `agenda-menu.js` divide a lateral em GESTÃO /
AGENDA / OUTROS.

**Status:** ✅ funciona (salva no localStorage) · 🟨 maquete (dados fixos / não salva) · ⬜ vazia
(só "Área prevista… próximas etapas").

**Placar: 14 ✅ · 13 🟨 · 24 ⬜.**

## Visão geral — 🟨
Texto fixo "reunirá os principais números".

## Entradas · Vendas/Faturamento (VND, amarelo)
- ⬜ Caixas · ⬜ Gerência · ⬜ Financeiro

## Transferências · Contas/Locais (CNT, laranja)
- ⬜ Tesouraria · ⬜ Financeiro · ⬜ Diretor Geral

## Saídas · Despesas/Custos (DES, vermelho)
- 🟨 **Gestão de Pessoas** — 8 cartões: Painel (4 indicadores + pendências), Colaboradores (3 nomes
  fixos), Processos (Admissão/Desenvolvimento/Desligamento), Lançamentos e registros, RH, DP,
  Pré-fechamento DES, Relatórios. Modal "Novo lançamento" só faz `alert('Rascunho salvo nesta
  maquete')` (`index.html:152`).
- 🟨 Financeiro · Lançamentos financeiros (`#launch`)
- 🟨 Financeiro · Grupo de despesas (`#groups`)
- ⬜ Gerência, DP, Fiscal, Financeiro, Diretor Geral (5)

## Saídas · Mercadorias/CMV (MER, verde)
- ⬜ Gerência, Compras, Diretor de Operações, Financeiro, Diretor Geral (5)

## Saídas · Retiradas/Investimentos (RET, azul)
- ⬜ Financeiro, Diretor Geral (2)

## Resultados · Relatórios (roxo)
- ⬜ 4 setores

## Agenda · Atividades (roxo)
- ⬜ Gestão de Pessoas, Diretor de Operações (2)

> **05/11/2026:** os grupos "Configuração · Cadastros Gerais" e "Formulários · Cadastros/Avaliações" viraram cinco tópicos em OUTROS: Configurações (Diretor de Operações, vazio), Cadastros (Diretor de Operações → patrimônio, grupos DES/MER/RET/VND/CNT; Compras → MER - Fornecedores e MER - Produtos; Gestão de Pessoas → `people-settings`), Lançamentos (Financeiro, vazio; Gestão de Pessoas → `forms`), Estoques (Compras, vazio) e Avaliações (Diretor de Operações, Gerentes, Colaboradores, Clientes, vazios). As seções abaixo mantêm o conteúdo; só mudou onde ficam no menu. Detalhe em DESIGN_SYSTEM.md.

## Configuração · Cadastros Gerais (roxo)

### Gestão de Pessoas (`people-settings`)
- ✅ **Organograma** (`organogram.js`) — posições ligadas a cargo, "Responde a".
- ✅ **Área → Setor → Local → Sublocal** (`location-tree.js`) — nome, sigla, cor, ícone; excluir
  exige transferir antes (`preserve-history.js`).
- ✅ **Cargos** — 32 de referência (`index.html:198`): nome, nome reduzido (≤15, automático), ícone,
  cor, categoria, CBO, título CBO, salário de referência, ano, sinônimos, descrição.
- ✅ **Atualização salarial** — valor por cargo + início de vigência; `salaryAsOf` (linha 239).
  "Atualizar lista" preserva valores digitados e não grava vigência.
- ✅ **Ficha de Cargos** (`job-profiles.js`) — matriz área × cargo, 8 grupos (Formação, Experiência,
  Certificações, Competências técnicas/comportamentais, Entregas individuais/grupo/coletivas).

### Diretor de Operação (`settings`) — ver doc 03
- ✅ Contas (CNT) · ✅ Grupos de Vendas (VND) · ✅ Tipos de Venda (13) · ✅ Bandeiras (41)
- ✅ Operadoras (10) com taxas · ✅ Despesas (DES) · ✅ Mercadorias (MER) · ✅ Retiradas (RET)

## Formulários · Cadastros/Avaliações (roxo)
- ✅ **Cadastro completo c/ dependente** (`complete-registration.js`) — 4 etapas: (1) CPF e dados
  pessoais, (2) endereço e contato, (3) outros documentos, (4) dependentes. Anexos **não** são salvos.
- 🟨 Cadastro simples — nome, CPF, função, turno, admissão. Não salva.
- 🟨 Cadastro de patrimônio — bem, categoria, marca, modelo, série, nº, valor, área/setor/local.
  Não salva.

## Legado
- `#config-view` ("Configurar") — tela antiga sem atalho (UI_SWEEP 01/11). Candidata a remoção.
