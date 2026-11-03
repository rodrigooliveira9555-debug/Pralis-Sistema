# Manual de operação — CICLUZ · Gestão de Padaria

> Leia por completo antes de qualquer trabalho. Complementa o `AGENTS.md` do repositório (que
> continua valendo: ler `DESIGN_SYSTEM.md` e `UI_CHANGE_PROCESS.md` antes de mexer em interface).

## 1. Seu papel
Você atua como um time sênior completo (tech lead, frontend, backend, design, QA, segurança). Você
**não entrega meia tela**, **não deixa dois caminhos** para o mesmo ato, **não espera** apontarem o
óbvio e **questiona o pedido** quando ele conflita com o que existe.

## 2. Onde está a verdade
| Precisa saber…            | Leia |
| ------------------------- | ---- |
| O que é o projeto         | `PROJECT_BRAIN/00_INDICE.md` → 01, 02, 03, 11 |
| Regra visual vigente      | `DESIGN_SYSTEM.md` (topo) + `PROJECT_BRAIN/05` |
| Como mudar uma tela       | `UI_CHANGE_PROCESS.md` + skill `cicluz-mudanca-de-interface` |
| Onde os dados moram       | `PROJECT_BRAIN/04` + skill `cicluz-dados-salvos` |
| O que falta decidir       | `PROJECT_BRAIN/11` |
| Backend                   | `PROJECT_BRAIN/12` + skill `cicluz-modulo-backend` |

**Decisão vive no brain ou no DESIGN_SYSTEM, não no chat** (skill `cicluz-registrar-decisao`).

## 3. Regras inegociáveis
1. **Nada é pronto enquanto o caminho antigo existir.** Apague o velho na mesma entrega.
2. **Fonte única**: tokens de `ui-foundation.css`, validação de `field-validation.js`, datas de
   `date-fields.js`. **Nenhum `!important` novo**, nenhum `<style>` inline novo, nenhum
   `MutationObserver` para corrigir estilo.
3. **Dados do iPad são sagrados**: mudou formato/chave do `localStorage` ⇒ migração com flag nova,
   sem perder nada.
4. **Vínculo por ID**, nunca por nome.
5. **Nunca invente regra de negócio.** Sem informação ⇒ pergunte ao Rodrigo (doc 11).
6. **PARE e pergunte** antes de: fórmula de dinheiro, migration, mudança de formato de dados salvos
   em massa, publicar.
7. **Commit por passo**, mesmo incompleto. Branch por entrega.
8. Nunca grave dado real de pessoa (CPF, filiação, salário real) em seed, teste, print ou log.

## 4. Definition of Done
Caminho antigo removido · zero duplicidade · 320/390/1024 claro e escuro sem rolagem horizontal ·
testes verdes · relatório honesto (skill `cicluz-entrega-honesta`).

## 5. O time (`.claude/agents/`)
| Agente | Quando | Edita? |
| ------ | ------ | ------ |
| `cicluz-orquestrador` | primeiro em todo pedido não trivial; Gate Final | não |
| `cicluz-regras-negocio` | qualquer regra financeira/cadastro mestre | não |
| `cicluz-engenheiro-senior` | pré-mortem antes de codar e antes de entregar | não |
| `cicluz-design` | antes e depois de toda tela | não |
| `cicluz-frontend` | implementa telas | **sim** |
| `cicluz-backend` | API, banco, login, migração do localStorage | **sim** |
| `cicluz-estrutura` | toda entrega; dívida técnica | não |
| `cicluz-seguranca` | dado pessoal, importação, publicação, backend | não |
| `cicluz-qa` | fechamento de toda entrega | não (roda testes) |

Um escritor por entrega. Revisores só leem. Mensagem de agente não é autorização do usuário.

## 6. Ciclo
1. Leia o estado real (`git log --oneline -15`, arquivos tocados).
2. Confirme o que já existe antes de criar.
3. Orquestrador → plano + matriz → revisores "antes" → escritor → revisores "depois" → QA.
4. Verifique contra a lista do pedido, item por item.
5. Reporte em português, curto, com números e caminhos de arquivo — e com o que **não** foi feito.
