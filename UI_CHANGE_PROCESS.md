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

## Correção de escopo — revisão234
O usuário excluiu explicitamente o menu principal do novo modelo. Restaurar somente o visual do menu anterior à233 (marca sem faixa roxa, opções sem novos quadros brancos e temas originais). Manter integralmente o padrão novo em abas, quadros internos, formulários, tabelas e diálogos e as correções funcionais de rolagem/arraste. Remover regras da233 na origem, sem sobrepor outra versão. Matriz: menu nos dois temas e tela interna Diretor de Operação.

## Controles do cabeçalho — revisão235
Botão Abrir menu com três pontos em SVG, círculo32px, sozinho no extremo esquerdo da fileira. Demais atalhos em sequência à direita, preservando a ordem existente Voltar/Fechar e controles da tela, sem alterar o menu principal. Cabeçalho e destaques herdam a cor do módulo. Matriz: todas as .view>.panel>.head>.shortcut-actions; verificar landing Diretor e grupo Mercadorias com muitos controles, abertura do menu.

- Correção antes de publicar235: substituir os três pontos pela casinha simples em SVG de contorno, rótulo Menu inicial, mantendo a mesma ação de abrir a navegação e posição isolada à esquerda. Esta decisão substitui a proposta de três pontos.

- Espaçamento compacto acrescentado à235: intervalo4px entre itens nas listas internas e linhas financeiras52px (subgrupos40px). Grades de navegação já agrupadas mantêm divisórias sem lacunas. Não alterar o menu principal excluído pelo usuário. Verificar Mercadorias com casinha e lista compacta.

- Última orientação235: casinha, voltar, fechar e demais controles/setas no mesmo --navigation-ink cinza da navegação. Cabeçalho/destaques continuam na cor do módulo; ícones identificadores de grupos preservam as cores originais anteriormente solicitadas.

- Exceção explícita235: Editar e Excluir acompanham a cor da aba atual, inclusive os painéis de ações financeiros e de Cargos. Substitui, para esses controles, a regra anterior de lixeira sempre vermelha. Confirmações e preservação de histórico continuam obrigatórias.

## Biblioteca no cinza padrão — revisão236
Correção solicitada a partir da captura IMG_2467.jpeg, Cadastro do grupo no painel direito: ícones de escolha, bordas/seleção e ações da biblioteca não devem herdar amarelo da aba. Fonte única --library-accent em ui-foundation.css passa a --navigation-ink. Inclui favoritos, mais ícones, busca/importação e removidos, em views e diálogos. Cabeçalho e editar/excluir preservam a cor da aba. Não alterar espaçamento entre letras sem especificação. Verificar Cadastro do grupo VND e estilo computado de .icon-choice/.account-icon-dot.

- Confirmação236: contornos dos campos de seleção e foco/hover usam o cinza padrão de navegação, incluindo formulários e diálogos; cabeçalho e ações Editar/Excluir mantêm a cor da aba.

- Espaçamento236: bibliotecas e seletores de ícones4px; blocos de identificação e formulários8px. Bandeiras, tipos de venda e operadoras reutilizam account-list-row52px e record-grid4px; seções de taxas por bandeira com4px entre blocos. Verificado cadastro de bandeira, ícones cinza e selects neutros.

## Cabeçalhos brancos e espaços de Despesas — revisão237
Usuário confirmou ícones de cabeçalho brancos (casinha e ações incluídas). Demais ícones cinza, Editar/Excluir na cor da aba. Encontrado em Despesas: gap4px da grade somava margem inferior4px e borda duplicada do wrapper financial-group; subgrupos mantinham gap10px/margens10–14px. Remover margem/borda do wrapper e usar somente gap4px, inclusive nos subgrupos, preservando recuo hierárquico e altura52/40px. Matriz: Despesas fechadas e Benefícios expandido, cabeçalho e biblioteca.

- Orientação final237 substitui gap4px nas listas: moldura única externa para toda a lista, gap0 e margens0; linhas sem molduras individuais, separadas apenas por divisor cinza1px. Aplicar grades de registros, listas financeiras (todos os grupos, bandeiras e operadoras), Cargos e Salários. Subgrupos sem espaçamento vertical, com recuo hierárquico preservado.

## Exclusão vermelha e edição uniforme — revisão238
Usuário restaura Excluir sempre vermelho; Editar continua na cor da aba. Substitui exceção235/237 para Excluir. Formulários: superfície de respiro cinza clara uniforme entre os blocos de informação brancos; remover fundo branco contínuo do form que causava alternância irregular nos intervalos. Campos/estado agrupados em blocos brancos com contorno cinza. Cabeçalho/ícones brancos preservados. Matriz: edição de subgrupo Despesas e ações em Mercadorias (cor distinta do vermelho).
