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

## Piloto restrito — Diretor de Operação
A revisão global226 foi rejeitada e restaurada para225. Aplicar novo padrão somente à tela inicial Diretor de Operação, identificada pelo título exato. Cabeçalho intenso roxo, conteúdo branco arredondado, linhas próximas com divisória cinza, texto/ícones/voltar cinza em repouso; interação na cor original de cada cartão. Classe operations-layout-pilot removida ao mudar o título; subcadastros financeiros e demais telas preservam225.

- Última correção do piloto: somente inversão de cores do cabeçalho no Diretor de Operação. Fundo roxo escuro#5520ad; texto/ícones/contornos roxo claro#f0e8ff, sem placa branca. Mantida a geometria publicada227; descartada a proposta não publicada de alterar os cantos inferiores.

- Paleta final do piloto: cabeçalho usa o roxo padrão de origem --panel-color (#7c3aed), não#5520ad. Textos e controles claros derivados da mesma cor (14% roxo+branco). Ícones de cada cartão preservam fundo na cor original --card-color e símbolo branco em repouso e seleção. Sem alterações nos demais módulos.

- Menus iniciais de navegação: remover A/Z de todas as grades de atalhos record-grid (Diretor de Operação, Gestão de Pessoas e equivalentes). Ordenação por arrastar permanece. A/Z de listas de registros como Cargos, Contas e grupos permanece. A fábrica menu-order.js deixa de criar o controle em grades de navegação.

- Menus iniciais em área integral: ao abrir uma grade de navegação, ocultar a barra lateral recolhida e ocupar100% da largura disponível. O botão Abrir menu restaura a navegação. Seis pontos de arraste integrados à mesma linha antes do ícone, sem quadro separado nem sobreposição. Marcação data-navigation-menu somente em grades de atalhos; listas financeiras preservadas. Conferir entrada, saída e reabertura.

## Layout aprovado compartilhado — revisão232
Substitui o escopo restrito do piloto: todas as abas usam cabeçalho intenso na cor de origem, texto claro, quadro branco arredondado, separadores cinza e fundo de respiro cinza claro #f5f5f7 (mesmo cinza do canvas). Ícones com largura e altura iguais e sem encolhimento; ícone do cabeçalho com contorno branco. Grades de navegação são listas compactas; cadastros preservam sua hierarquia, formulários e ações. Matriz:19 views existentes (17 com panel direto, painel de prioridades de people e cartões process), navegação, cadastros financeiros, cargos/salários, fichas simples/completa/patrimônio/configuração, resumo e relatórios. Validar geometrias compartilhadas de todas as views e interação em navegação, grupos, Cargos e formulário antes de publicar.

- Menu: rolagem vertical nativa dentro de .nav, com pan-y nas opções e arraste somente nas alças. Reconciliar abertura mesmo se o estado foi interrompido. Arraste cancelado ao perder foco/ocultar aba limpa ouvintes e animação e restaura a ordem. Na prévia, rolagem do menu foi145→0 sem erro do app; congelamento relatado no iPad não foi reproduzido no navegador remoto.

## Abrangência completa — revisão233
Estender o padrão aprovado ao menu principal (grupos brancos, separação cinza #f5f5f7, marca sobre roxo com letras brancas), quadros aninhados, tabelas e diálogos. Diálogos nativos de localização, organograma, biblioteca de ícones, histórico e transferência, além do modal legado, herdam o acento da aba aberta via unified-dialogs.js. Preservar cores dos ícones, dados, controles e hierarquias. Matriz adicional: menu aberto em dois temas, localização/editor, histórico/transferência e modal legado.
