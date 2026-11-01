# Processo de alterações de interface

## Fonte única

Antes de editar: ler DESIGN_SYSTEM.md e este processo. Reutilizar o componente existente; não copiar seu HTML/CSS e criar uma variante. Novas decisões substituem a regra anterior no componente compartilhado. Não alterar uma dimensão fora do pedido para resolver outra.

## Referências por função

- Cabeçalhos: normalização compartilhada, ícone + título + atalhos, nome com reticências e título completo acessível.
- Consultas: lupa para busca; chevron para filtros; abrir na mesma grade. Não inventar busca de registros dentro de uma ficha de edição.
- Formulários: Montserrat, título16/20 e peso600; subtítulo11/14; campo14/20 peso400; label12/18 peso500 neutro; notas11/16; controle42px/raio8. Textarea cresce para texto livre.
- Ícones: SVG da biblioteca comum; símbolo18px em botão circular32px. Ícones de lista30px. Preservar marca e cores próprias de logomarcas.
- Cores: acento do menu de origem; cabeçalho14% acento + branco, borda25%, hover8%, foco14%. Tema escuro segue DESIGN_SYSTEM.md. Excluir mantém vermelho semântico.

## Execução

1. Identificar o componente e todas as telas que o reutilizam; registrar a matriz de impacto antes de mudar.
2. Comparar a referência aprovada com a tela divergente, incluindo estilo computado e comportamento.
3. Alterar a fonte compartilhada. Remover a regra conflitante quando identificada; não criar uma exceção local para cada tela.
4. Conferir: título/subtítulo/labels/texto; raio/altura/padding; cor de origem; ícones; estados normal/foco/hover; busca e filtro fechados e abertos; rolagem sem deslocar cabeçalho; volta e fechamento; tela estreita e tema escuro quando afetados.
5. Abrir todas as telas da matriz de impacto. Para componentes globais, inventariar todas as instâncias e validar exemplos de cada estrutura legada. Dizer exatamente o que foi conferido; não tratar inventário estrutural como inspeção visual completa.
6. Testar ações alteradas com dados fictícios na prévia. Preservar dados reais e seus IDs. Verificar sintaxe e regressões relevantes.
7. Publicar apenas depois das conferências. Confirmar a publicação pelo resultado da ferramenta. Relatar limitações que permaneçam; não prometer uniformidade não verificada.

## Matriz inicial — formulários

Cadastro do cargo, Cadastro de patrimônio, Cadastro simples, Cadastro completo com dependentes, Configurar, Atualização salarial, fichas financeiras e formulário dos níveis de localização.

Cada alteração futura acrescenta telas relacionadas à matriz conforme o componente afetado.

- Matriz biblioteca de ícones: Cargos, Contas, DES/MER/RET/VND (grupo e subgrupo), tipos de venda/bandeiras/operadoras, Área/Setor/Local e Organograma; fonte compartilhada icon-library-manager.js/ui-foundation.css.

## Matriz — alinhamento da biblioteca
Cargos, Contas, grupos e subgrupos DES/MER/RET/VND, tipos de venda/bandeiras/operadoras, diálogo Área/Setor/Local e Organograma: identificação em coluna única, nome seguido da escolha de ícones, grade alinhada à esquerda em largura integral. Fonte: bloco “One layout for identification” em ui-foundation.css. Conferência estrutural dos seletores e sintaxe; inspeção visual de todas as telas ainda pendente nesta alteração.

## Matriz — menu inicial em tela inteira (31/10/2026)
Componente compartilhado: mobile-menu e navigation-layout. Impacto: menu principal (Gestão, Agenda, Outros), abertura/fechamento em todas as larguras; acesso às telas Mercadorias, Configurações e Formulários; retorno ao menu. Controles de expansão global e tema acima de Gestão, cinza das setas. Usuário fixo no rodapé sem barra divisória.

- Revisão dos controles: incluir toggleMenu na mesma fileira acima de Gestão; três círculos32px/ícone16px, cor computada dos títulos. Conferir expansão/recolhimento, tema e rolagem independente.

## Matriz — nitidez da marca
Marca compartilhada no menu aberto e recolhido; temas claro e escuro. Subtítulo em grade com altura própria e margem superior-5px para aproximar7px do nome CICLUZ, sem posicionamento absoluto sobre a arte. Recorte exclui Gestão de Obra; contraste das letras reforçado.

## Matriz — paleta neutra da navegação
Gestão/Agenda/Outros, suas setas, setas de cada opção, recolher/abrir no canto e atalho de abrir menu nas telas, expansão global e sol/lua. Fonte única --navigation-ink nos temas claro/escuro. Preservar cores semânticas dos módulos e ações internas.

- Matriz cor das letras: marca expandida nos temas claro e escuro; verificar alternância do tema e restauração. Cor branca do filtro aplicada apenas às letras, preservando símbolo colorido.

## Matriz — modelo consolidado de telas e formulários
Todas as19 views e diálogos: cabeçalho intenso na cor de origem; corpo branco arredondado; contorno/divisórias cinza único; texto do conteúdo cinza único; linhas compactas e destaque laranja ao toque/hover/foco. Inclui listas de Cargos/Contas/grupos/tipos/localização, fichas, formulários de admissão/patrimônio/configuração e diálogo de localização. Cabeçalho preserva texto claro para contraste. Preferência explícita por conteúdo branco também sob tema escuro. Fonte compartilhada ui-foundation.css.

- Revisão final: hover/toque/foco herda a cor original do item/módulo (laranja apenas em Contas). Texto e ícones cinza#606066 em repouso, incluindo Voltar; no cabeçalho intenso ficam sobre pequenas superfícies brancas para contraste. Substitui destaque laranja universal e texto claro de cabeçalho da proposta anterior.

- Conferência desta revisão: Gestão de Pessoas, lista/ficha de Cargos, árvore/diálogo de localização, Visão Geral, Tesouraria e grupos de Contas. Inventário de19 views e18 cabeçalhos normalizados; não equivale à inspeção visual de todas as telas. Componentes compartilhados aplicam a regra também às demais estruturas.
