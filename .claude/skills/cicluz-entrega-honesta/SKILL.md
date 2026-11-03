---
name: cicluz-entrega-honesta
description: Fechamento de qualquer entrega no CICLUZ - Definition of Done de 5 itens, gate dos agentes do time e relatório honesto do que foi feito e do que NÃO foi. Use antes de dizer "pronto", "feito", "publicado", ou quando perguntarem "tá pronto?", "pode publicar?".
---

# Entrega honesta — CICLUZ

## Definition of Done (todos obrigatórios)
1. **Caminho antigo removido** — não escondido, não comentado. Função redefinida? Ficou uma só.
2. **Zero duplicidade** — nenhuma segunda tela, botão, editor, seed ou regra CSS para o mesmo ato.
3. **Responsivo** em 320 / 390 / 1024, claro e escuro, sem rolagem horizontal.
4. **Testes verdes** — `node tests/date-fields.cjs && node tests/field-validation.cjs` (+ teste novo
   se mexeu em regra pura; + lint/check/integração se backend).
5. **Relatório honesto** (abaixo).

## Gate do time
Chame, conforme o que a entrega tocou, e colete o veredito:
`cicluz-design` · `cicluz-estrutura` · `cicluz-regras-negocio` · `cicluz-engenheiro-senior` ·
`cicluz-seguranca` · `cicluz-qa`. **Qualquer RED bloqueia.** P0/P1 aberto bloqueia.

## Relatório (formato fixo, em português, curto)
```text
FEITO:
- <o que funciona agora, em termos do usuário> (arquivo:linha)
REMOVIDO:
- <caminho antigo apagado>
CONFERIDO:
- <telas> × 320/390/1024 × claro/escuro
- testes: <comando> → <resultado>
NÃO FEITO / NÃO VERIFICADO:
- <itens do pedido que faltaram>
- Safari/iPad físico, teclado virtual (se não testado)
DECISÕES TOMADAS (e onde foram registradas):
- ...
PRECISA DE DECISÃO (Rodrigo/Marco):
- ...
```

## Proibido
- "Aplicado em todas" sem listar as telas abertas.
- "Pronto" com item do pedido faltando — diga "fiz 4 de 7: faltam X, Y, Z".
- Esconder teste falhando: mostre a saída.
