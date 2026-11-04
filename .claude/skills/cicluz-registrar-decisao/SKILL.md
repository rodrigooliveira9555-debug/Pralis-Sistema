---
name: cicluz-registrar-decisao
description: Como registrar uma decisão do Rodrigo ou do Marco no CICLUZ para ela não se perder nem voltar a ser discutida - regra de negócio no PROJECT_BRAIN, regra visual no DESIGN_SYSTEM.md, marcando a anterior como superada. Use quando alguém decidir algo no chat ("decidi que", "a partir de agora", "não é mais assim", "o certo é") ou quando uma pendência do doc 11 for respondida.
---

# Registrar decisão — CICLUZ

**Decisão que fica só no chat volta a ser discutida em dois dias.**

## Onde registrar
| Tipo de decisão | Onde |
| --------------- | ---- |
| Visual (cor, medida, ícone, layout, comportamento de tela) | `DESIGN_SYSTEM.md`, no topo, sob "Regras vigentes <data>" |
| Negócio (dinheiro, origem, vínculo, quem pode o quê) | `PROJECT_BRAIN/03_DOMINIO_FINANCEIRO.md` (ou o doc do assunto) |
| Resposta a pendência | `PROJECT_BRAIN/11_DECISOES_PENDENTES.md` — marcar a linha como **RESPONDIDA (data)** e levar a regra ao doc do assunto |
| Processo de trabalho | `PROJECT_BRAIN/06_PROCESSO_DE_MUDANCA.md` |

## Formato
```md
### <assunto> — <DD/MM/AAAA>
**Regra:** <uma frase, verificável>
**Quem decidiu:** Rodrigo | Marco
**Substitui:** <regra anterior e onde estava> | nada
**Motivo:** <uma linha>
```

## Ao substituir
- Não apagar a regra antiga: marcar `~~texto~~ **SUPERADA em <data>** → ver <onde>`.
- Corrigir os trechos desatualizados em outros docs **ou** listá-los em
  `PROJECT_BRAIN/10_CONTRADICOES.md`.
- Se a regra muda código existente, a mudança de código entra na mesma entrega (nada de regra nova
  com tela velha).

## Nunca
- Inventar a regra que falta. Sem informação ⇒ pendência no doc 11 com a pergunta exata.
- Registrar dado pessoal, CPF ou valor real de salário de alguém.
