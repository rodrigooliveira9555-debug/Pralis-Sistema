---
name: cicluz-modulo-backend
description: Passo a passo para criar UM módulo de backend do CICLUZ no padrão do Sistema Pralis (controller → service → repository, Zod no shared, migration numerada, teste com Testcontainers) e ligar a tela atual a ele no lugar do localStorage. Use quando o pedido for "cria a API de X", "salva X no banco", "tira X do localStorage". Só depois da decisão P-01 (PROJECT_BRAIN/11).
---

# Novo módulo de backend — CICLUZ

Pré-condição: **P-01 decidida** (doc 11) e o módulo listado em `PROJECT_BRAIN/12_PLANO_DE_BACKEND.md`.

## 1. Contrato primeiro (`shared/`)
- `shared/src/<assunto>/<assunto>.schemas.ts`: schemas Zod de criar, editar, resposta e filtros.
- Dinheiro em **centavos inteiros**; percentual em **basis points** (1,99% = 199).
- Regras puras (ex.: "vigências se sobrepõem?") como funções em `shared/`, com teste unitário.

## 2. Banco (`db/`)
- Tabela com `id uuid`, `empresa_id`, `criado_em`, `criado_por`, `atualizado_em`, `ativo`.
- FK em todo vínculo; CHECK para regra fixa; constraint de **não sobreposição** em vigências.
- Migration `NNNN_<assunto>.sql` nova. **Mostrar o SQL e PARAR para aprovação.**

## 3. API (`api/src/<assunto>/`)
- `controller`: rota, autenticação, `schema.parse`, código HTTP, erro em português.
- `service`: regra de negócio e transação; nunca SQL aqui.
- `repository`: só Drizzle/SQL; nunca regra aqui.
- Exclusão de algo referenciado: 409 com mensagem que diz o que fazer.

## 4. Testes (`tests/`)
- Integração com Postgres real (Testcontainers): criar, editar, listar, excluir referenciado,
  vigência sobreposta rejeitada, outra empresa não enxerga.
- Rodar: lint, check, testes do módulo.

## 5. Ligar a tela
- Trocar a leitura/escrita do `localStorage` daquele assunto por um adaptador HTTP **num lugar só**.
- Importação única dos dados existentes do aparelho (skill `cicluz-dados-salvos`), idempotente.
- Remover o código antigo de `localStorage` daquele assunto depois de a importação estar comprovada
  (entrega separada, com registro).

## 6. Fechar
Skill `cicluz-entrega-honesta` + gate `cicluz-backend`, `cicluz-seguranca`, `cicluz-engenheiro-senior`.
