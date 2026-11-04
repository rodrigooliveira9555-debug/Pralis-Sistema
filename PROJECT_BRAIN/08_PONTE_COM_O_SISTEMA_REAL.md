# 08 — Ponte com o Sistema Pralis em produção

O Sistema Pralis (`Sistema Pralis - Principal`) roda todo dia na TNP: `api` Fastify + Drizzle ·
`db` Postgres + migrations · `shared` Zod · `web-vue` Nuxt 4 + Vuetify · `tests` Vitest +
Testcontainers · deploy Coolify (merge na `main` = deploy + migrations).

Equivalência **por assunto**. Campos ainda **não** conferidos um a um.

| No protótipo (Rodrigo)                 | No sistema em produção                                     | Leitura |
| -------------------------------------- | ---------------------------------------------------------- | ------- |
| Caixa 1M a 4T (VND e CNT)              | 8 contas de posto PDV1–4 × Manhã/Tarde                      | mesmo conceito, outro nome |
| Contas CNT, Cofre Principal/Troco      | `api/src/contas`, Cofre e Tesouraria                        | no real há movimento; aqui só cadastro |
| Tipos de Venda e Bandeiras             | `api/src/formas-pagamento`                                  | comparar a lista de 13 tipos |
| Operadoras com taxa por vigência       | `api/src/maquininhas`                                       | conferir se o real guarda MDR/antecipação por vigência |
| Grupos DES / MER / RET                 | `grupos`, `despesas`, `mercadorias`, `retiradas`            | conferir siglas e a Finalidade de MER |
| Área → Setor → Local → Sublocal        | `api/src/areas`, tela `areas_setores`                       | protótipo tem 4 níveis |
| Cargos, salário, Ficha de Cargos       | `api/src/funcoes`, tela `funcoes_operacionais`              | salário por vigência e ficha só existem aqui |
| Cadastro completo com dependentes      | `api/src/admissoes`, telas `admissao` e `admissoes_processos` | o real já tem ficha pública e revisão do DP |
| Patrimônio                             | tela `patrimonio`                                           | aqui não salva |
| Entradas → Caixas (vazia)              | `api/src/caixa`, fechamento em 4 etapas, transferências, lacres | o coração do real não existe aqui |
| —                                      | Compras, Produtos, Estoque, CREARE, Conplus, permissões, login | só no real |

## O que o protótipo traz de novo para o real
- Taxa de operadora **por vigência** com MDR, tarifa, antecipação e prazo, ligada a grupo de despesa.
- **Salário por vigência** por cargo.
- **Ficha de Cargos** (área × cargo) e **organograma**.
- **Cor por origem** (VND/CNT/DES/MER/RET) como linguagem de navegação.
- Tipos de venda com destino contábil (Roubo/Furto, Sobra/Perda, Colaboradores, Sócios).

## Risco principal
Construir backend próprio para o protótipo cria **duas fontes de verdade** para contas e
maquininhas que já existem em produção. Ver doc 12.
