---
name: cicluz-mudanca-de-interface
description: Roteiro obrigatório para QUALQUER mudança visual no CICLUZ · Gestão de Padaria (tela, cor, ícone, cabeçalho, rodapé, campo, data, diálogo, tema escuro, celular). Use quando o pedido for "muda", "ajusta", "deixa igual", "aplica em todas", "corrige o visual". Garante leitura do DESIGN_SYSTEM, matriz de impacto, fonte única (sem novo !important), conferência em 320/390/1024 claro/escuro e registro da decisão.
---

# Mudança de interface — CICLUZ

## 1. Ler (antes de tocar em qualquer arquivo)
- `DESIGN_SYSTEM.md` — **topo** (regras vigentes de 03/11) e a seção do componente.
- `UI_CHANGE_PROCESS.md` — referências e verificação.
- `dist/ui-foundation.css` — tokens de tipografia e dimensões (fonte única).
- `PROJECT_BRAIN/05_REGRAS_DE_DESIGN_VIGENTES.md` e `10_CONTRADICOES.md` — para não ressuscitar
  regra superada.

## 2. Matriz de impacto (escrever antes de mudar)
```
PEDIDO: ...
TELAS AFETADAS: (todas, não "as principais")
ARQUIVOS: dist/... (CSS, JS, index.html linha)
TOKENS: --menu-accent / --panel-color / ui-foundation ...
QUEM MAIS USA ESTE COMPONENTE/TOKEN: ...
CHAVES DE localStorage TOCADAS: (nenhuma | quais)
REGRA DO DS QUE MUDA: (nenhuma | qual, e qual ela substitui)
```

## 3. Implementar na origem
- Altere o componente/token compartilhado. **Nunca** adicione `!important`, bloco `<style>` inline
  novo, ou `MutationObserver` para "corrigir depois".
- Se uma regra antiga conflita, **apague a antiga** no mesmo commit.
- Descubra qual definição da função roda (há redefinições em cadeia) antes de editá-la.
- Cor sempre derivada do menu atual (`--menu-accent`). Excluir = vermelho. Roxo não é universal.

## 4. Conferir (cada tela da matriz)
| Largura | Tema   | Estados                          |
| ------- | ------ | -------------------------------- |
| 320     | claro  | repouso, foco, hover, rolagem    |
| 390     | escuro | busca, voltar, diálogo aberto    |
| 1024    | ambos  | menu lateral, cabeçalho recolhido |

- Sem rolagem horizontal. Campo com fonte 16 px (iPhone). Enter não salva.
- `node tests/date-fields.cjs && node tests/field-validation.cjs`.
- Não diga "aplicado em todas" se abriu só algumas — liste as abertas.

## 5. Registrar
- Nova decisão visual ⇒ `DESIGN_SYSTEM.md` (topo, com data), marcando a anterior como
  **SUPERADA (data)**. Atualize `PROJECT_BRAIN/10_CONTRADICOES.md` se havia conflito.
- Commit descritivo em português.

## 6. Relatar
O que mudou (arquivo:linha) · o que foi removido · telas × largura × tema conferidas · o que **não**
foi visto (Safari físico, teclado virtual).
