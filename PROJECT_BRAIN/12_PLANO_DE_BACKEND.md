# 12 — Plano de backend (copiando a estrutura do Sistema Pralis)

> **Status (03/11/2026): implementado** na branch `feat/backend-login-20261103`. Fase 0 (login, empresas, perfis, usuários) e fases 1 a 3 como **tabelas derivadas**: as telas continuam gravando o documento e o servidor reconstrói as tabelas relacionais de cada assunto na mesma transação (decisão do Marco: telas intactas). Fase 4 (colaboradores) depende da P-11. Fase 5 (importação) = importação inicial pela tela de entrada. Deploy: Coolify (decidido), ainda não feito. Detalhes em `docs/BACKEND.md`.

## Recomendação (SUPERADA em 03/11/2026, ver status acima)
1. **Preferida:** não criar backend novo. As telas boas do protótipo são reconstruídas no `web-vue`
   do Sistema Pralis, sobre a API que já existe. O que só existe aqui (taxa por vigência, salário por
   vigência, ficha de cargos, organograma) entra lá como **entrega vertical nova** (tela + API +
   teste + migration aprovada).
2. **Alternativa (se o protótipo for um produto separado de propósito):** backend próprio, com
   **banco separado**, copiando a estrutura abaixo. Aceitar que contas e maquininhas vão divergir
   das de produção.

## Estrutura (espelho do monorepo principal)

```
api/      Fastify — um módulo por assunto: <assunto>.controller.ts → .service.ts → .repository.ts
db/       Drizzle — schema + migrations SQL numeradas (nunca editar migration aplicada)
shared/   Zod — contratos de entrada/saída e regras puras (usados pela API e pela tela)
tests/    Vitest + Testcontainers (Postgres real em container)
dist/     front atual do Rodrigo; troca localStorage por um adaptador HTTP
```

Camadas: **controller** valida com Zod e responde · **service** tem a regra · **repository** só fala
com o banco. Nenhuma regra de dinheiro na tela.

## Módulos (na ordem de entrega)
| Fase | Módulo | Tabelas | Observação |
| ---- | ------ | ------- | ---------- |
| 0 | auth, empresas | usuarios, sessoes, empresas | login antes de tudo; multiempresa desde o início |
| 1 | grupos-financeiros | grupos (origem CNT/VND/DES/MER/RET, pai, doc, finalidade) | árvore; Finalidade só em MER (CHECK) |
| 1 | contas | contas (tipo banco/fluxo/cofre/posto/responsável) | Caixa 1M–4T = conta de posto |
| 2 | tipos-venda, bandeiras | tipos_venda, bandeiras (FK obrigatória para tipo) | |
| 2 | operadoras, taxas | operadoras, taxas_vigencia (sem sobreposição: EXCLUDE por bandeira+modalidade+período) | MDR/tarifa em **centavos/basis points**, nunca float |
| 3 | locais | locais (nível área/setor/local/sublocal, pai) | excluir exige transferência (como hoje) |
| 3 | cargos, salarios, fichas, organograma | cargos, salarios_vigencia, fichas_cargo, posicoes | salário vigente = consulta por data, não coluna |
| 4 | colaboradores | colaboradores, dependentes, anexos | CPF nunca em GET de lista; anexos em storage, não no banco |
| 5 | importação | — | importa o JSON exportado do localStorage do iPad (idempotente) |

## Regras que vêm do sistema principal
- **Dinheiro em centavos inteiros**; percentuais em basis points. Dia de negócio `America/Sao_Paulo`.
- **Migration, fórmula de dinheiro e alteração de dado histórico param para aprovação** (mostrar SQL).
- Saldo é derivado; ajuste é imutável; nunca "fazer bater" com conta genérica.
- `lint` + `check` + testes verdes antes de PR; commit por passo; branch por entrega.
- Segredos só em variável de ambiente, nunca no repositório.

## Estimativa
Fase 0: ~1 dia · Fases 1–3: 3–5 dias · Fase 4: 2–3 dias · Fase 5: ~1 dia.
