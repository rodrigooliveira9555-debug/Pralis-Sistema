# 06 — Processo de mudança

Condensado do `AGENTS.md` e do `UI_CHANGE_PROCESS.md` do repositório, mais as regras de trabalho
do time (ver `CLAUDE.md` do pacote).

## Antes de mexer
1. Ler `DESIGN_SYSTEM.md` e `UI_CHANGE_PROCESS.md` (obrigatório para qualquer mudança visual).
2. Ler a parte deste brain que toca o assunto (02 para tela, 03 para regra financeira).
3. `git log --oneline -15` e os arquivos que serão tocados. O código é a verdade.

## Matriz de impacto (obrigatória)
- Listar **antes** de mudar: quais telas, componentes, tokens e arquivos são afetados.
- Reusar o componente/token compartilhado. **Não** copiar, não criar variante, não empilhar override:
  remover a regra conflitante na origem.
- Tokens de tipografia e dimensão vêm de `dist/ui-foundation.css`. Não ajustar por tela.

## Verificação
- Abrir **todas** as telas da matriz — inventário estrutural não vale como inspeção visual.
- Larguras **320 / 390 / 1024** (e 1440 quando houver layout de desktop), temas **claro e escuro**,
  estados repouso / foco / hover, busca, rolagem e retorno.
- Referência do UCP: 20 estruturas e 31 destinos.
- Não declarar "aplicado em todas" com base em três telas testadas.
- `node tests/date-fields.cjs && node tests/field-validation.cjs` verdes.

## Dados
- Só dados fictícios na prévia. Nunca gravar/excluir dado real nem trocar IDs.
- Mudança de formato no localStorage exige migração com flag (`…-v2`) — nunca quebrar o que já está
  no iPad do Rodrigo.

## Publicação
- Publicar só depois das conferências. Versionar assets por hash de conteúdo.
- Relatar os limites (o que não foi visto: Safari físico, teclado virtual…).

## Registro
- Toda decisão nova vai para o `DESIGN_SYSTEM.md` (visual) ou para este brain (negócio), marcando a
  anterior como superada. Atualizar o doc 10 quando houver contradição.

## Definition of Done (do time)
1. Caminho antigo removido (não escondido, não comentado).
2. Zero duplicidade: nenhuma segunda tela/botão/função para o mesmo ato.
3. Responsivo em 320/390/1024 sem rolagem horizontal, claro e escuro.
4. Testes verdes.
5. Resumo honesto do que fez e do que não fez.
