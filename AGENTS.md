# Trabalho neste projeto

Antes de alterar a interface, ler `DESIGN_SYSTEM.md`. Essa é a referência permanente das decisões do usuário sobre cores, ícones, layout e comportamento. Reutilizar `dist/design-system.css` e os componentes existentes. A cor de uma ação deriva do menu atual; roxo não é uma cor universal. Registrar novas decisões nesta referência e evitar mais overrides isolados nos estilos legados.

## Processo obrigatório de interface

Antes de implementar uma solicitação visual, ler `UI_CHANGE_PROCESS.md`. Ele define referências, matriz de impacto e verificação antes de publicar. Os tokens de `dist/ui-foundation.css` são a fonte única para tipografia e dimensões de títulos, subtítulos e formulários; não ajustar essas medidas separadamente por tela. Não declarar "aplicado em todas" com base apenas em três telas testadas.
