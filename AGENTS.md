# Trabalho neste projeto

Antes de alterar a interface, ler `DESIGN_SYSTEM.md`. Essa é a referência permanente das decisões do usuário sobre cores, ícones, layout e comportamento. Reutilizar `dist/design-system.css` e os componentes existentes. A cor de uma ação deriva do menu atual; roxo não é uma cor universal. Registrar novas decisões nesta referência e evitar mais overrides isolados nos estilos legados.

## Processo obrigatório de interface

Antes de implementar uma solicitação visual, ler `UI_CHANGE_PROCESS.md`. Ele define referências, matriz de impacto e verificação antes de publicar. Os tokens de `dist/ui-foundation.css` são a fonte única para tipografia e dimensões de títulos, subtítulos e formulários; não ajustar essas medidas separadamente por tela. Não declarar "aplicado em todas" com base apenas em três telas testadas.

## Branches, revisão e publicação

A partir de 03/11/2026, seguir `CONTRIBUTING.md`: cada tarefa em uma branch, PR para `main`, testes e revisão antes do merge. Não fazer push direto em `main` nem deploy de produção de uma branch de trabalho. Autorizações antigas de push direto não substituem este fluxo. Usar PR em rascunho enquanto houver pendências; preservar mudanças de outros colaboradores e informar bloqueios de acesso. Não declarar merge, proteção de branch, PR criado ou deploy concluído sem verificar a operação correspondente.
