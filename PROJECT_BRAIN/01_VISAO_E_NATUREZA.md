# 01 — Visão e natureza do projeto

## O que é

- **Nome na tela:** CICLUZ · Gestão de Padaria. A arte de referência dizia "Gestão de Obra" e foi
  recortada (DESIGN_SYSTEM, "Menu inicial — revisão 31/10").
- **Dono:** Rodrigo. Usa principalmente **iPad e iPhone**.
- **Como é construído:** conversa com o **Codex (ChatGPT)**. Cada publicação no ChatGPT Sites vira um
  commit "Update Site source" (330 dos 343 commits). Desde 02/11 há commits descritivos com a
  identidade do Rodrigo, feitos por agente local.
- **Tecnologia:** página única estática (`dist/index.html` + ~28 JS + ~10 CSS), sem build, sem
  framework, sem backend. Hospedagem estática definida em `.openai/hosting.json` (`static: dist`).
- **Dados:** só no `localStorage` do navegador. **Não sincroniza** entre aparelhos e some se o
  navegador limpar os dados do site.

## O que ele já é

Um **cadastro mestre** bem pensado do lado financeiro e de pessoas: contas, grupos financeiros por
origem (CNT, VND, DES, MER, RET), tipos de venda, bandeiras, operadoras com taxa por vigência,
áreas/setores/locais, cargos com CBO, salário por vigência, ficha de cargos, organograma e cadastro
completo de colaborador com dependentes.

## O que ele ainda não é

- **Não tem operação**: nenhum lançamento, abertura/fechamento de caixa, transferência real,
  conciliação de maquininha ou relatório. O menu Entradas → Caixas existe e está vazio.
- **Não tem login, permissão, banco, auditoria nem multiusuário.**
- **Não é base de código para produção** — é uma especificação navegável de telas e regras.

## Relação com o Sistema Pralis em produção

Existe um sistema em produção (`Sistema Pralis - Principal`: Fastify + Drizzle + Postgres + Nuxt),
operado todo dia na TNP. Este protótipo cobre assuntos que **já existem lá** (contas, formas de
pagamento, maquininhas, grupos, áreas, funções, admissão, caixa). Ver doc 08 antes de qualquer
decisão de construir backend próprio.

## Papéis citados nas telas (DOSSIE §15)

Caixas, Gerência, Tesouraria, Fiscal, Compras, Financeiro, DP, Diretor Geral, Diretor de Operações.
