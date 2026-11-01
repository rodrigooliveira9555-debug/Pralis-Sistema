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

## Revisão final dos editores —239
Ícones das bibliotecas de edição voltam à cor da aba de origem por orientação atual; cabeçalho branco, Excluir vermelho e outros controles cinza preservados. Linhas financeiras fixas52px/subgrupos40px com ações internas absolutas, texto truncado sem quebrar ao abrir ações. Revisão de alcance encontrou .form-fields em div e #job-form fora do seletor anterior limitado a form.form-fields; incluir esses formatos e formulários de diálogos no mesmo respiro cinza e contornos neutros. Verificar Mercadorias antes/depois de abrir ações, biblioteca de edição e formulário Cargos.

## Botões de confirmação —240
Continuar e Cancelar da janela de exclusão/transferência: duas colunas iguais,44px de altura, mesmo padding e alinhamento. Rótulo final Confirmar transferência conserva a geometria. Preservar cores, cancelamento e duas etapas; verificar dimensões sem confirmar exclusão.

- Ajuste240: editores usam uma única moldura cinza externa por bloco de campos. Remover bordas internas duplicadas de input/select/textarea dentro desses blocos; foco indicado na moldura externa sem mudar medidas.

## Taxas de bandeira —241
Cabeçalho Taxas vermelho intenso#ef4444 e ícones brancos. Moldura única cinza, bandeiras consecutivas sem margens verticais, divisórias1px; summary52px preservado ao expandir. Regras de vigência com fundo de respiro cinza e campos brancos com moldura externa única, sem contorno interno duplicado. Preservar cálculo, vínculos e histórico.

## Área / Setor / Local —242
Lista contínua sem vãos verticais entre áreas ou seus descendentes; uma moldura externa cinza e divisórias entre áreas, fundo branco. Preservar recuo da hierarquia, expandir/recolher, movimentação e ações. Verificar áreas vizinhas e ramo expandido.

- Confirmação242: ícones cinza inclusive nas bibliotecas dentro da edição; cabeçalhos brancos. Área/Setor/Local: ícones e controles cinza, molduras neutras também no editor. Substitui cor de biblioteca239. Excluir vermelho preservado.

- Editor de Área/Local: o espaço de respiro em volta dos blocos também cinza claro; conectores da hierarquia cinza neutro.

## Atualização salarial e subgrupos —243
Busca salarial recolhida, aberta apenas pela lupa do cabeçalho; usar componente compartilhado. A/Z ordena as linhas existentes preservando valores digitados. Atualizar lista relê os cargos e preserva valores por chave, sem registrar vigência. Subgrupos expandidos em cartões: respiro e conectores cinza com linhas brancas. Verificar abrir/recolher busca, filtragem, A/Z e atualizar sem salvar valores.

## Salvar pelo cabeçalho —244
Check circular branco no cabeçalho das telas de cadastro/edição com ação Salvar e da Atualização salarial. O atalho aciona o botão Salvar existente, conserva validações e estado desabilitado e não muda a ação inferior. Remover ao sair do editor. Verificar cadastro de grupo, diálogo de Área/Local e validação salarial sem gravar dados.

## Sem Editar no cabeçalho —245
Remover o alternador Editar organograma do cabeçalho; ações de editar permanecem por posição e o organograma inicia com essas ações disponíveis. Check Salvar no cabeçalho preservado. Verificar cabeçalho sem Editar e formulário de posição.

## Revisão transversal —246
Busca somente pela lupa que abre/recolhe campo. Listas sem vãos entre linhas, molduras cinza, nomes cinza e escala tipográfica compartilhada. Movimento cinza; cabeçalho branco; biblioteca de seleção de ícones na cor do cabeçalho (substitui242). Campo com uma informação: remover moldura externa, preservar contorno do input/select/textarea; blocos compostos mantêm agrupamento. Sem Editar no cabeçalho; Salvar onde houver ação existente, inclusive diálogo de posição. Ordem visual de controles: navegação, Fechar, expandir/recolher, Atualizar, Salvar, A/Z, busca e específicos; casa isolada à esquerda. Matriz: Cargos e editor, Atualização salarial, Área/Setor/Local e diálogo, grupos/subgrupos financeiros e editor de operadora/taxas, formulários simples/completo. Não alterar dados, regras de cálculo ou confirmações.

## Decisões vigentes confirmadas — varredura 01/11/2026
- Botões inferiores: Cancelar branco com X à esquerda; Salvar (incluindo cargo, atualização e rascunho) no acento da tela, com check à direita. Preservar rótulos e funções existentes.
- Taxas por bandeira: intervalo de 12px entre quadros, marcas em círculos, cabeçalho vermelho intenso, cifrão com contorno cinza, lupa com contorno no cabeçalho. Campos de taxa em grade sem sobreposição. Grupo de Despesa com moldura vermelha #ef4444 e Grupo de Contas com moldura laranja #f97316, alinhados e com mesma altura.
- Atualização salarial: identidade de cargo e coluna de valores alinhadas, usando o padrão Cargos. Atualizar lista preserva os valores digitados e não grava vigência.
- Área/Setor/Local: ícones respeitam a cor escolhida; Editar roxo da aba e Excluir vermelho. Abrir ações preserva largura/altura da linha. Tocar no nome ou fora fecha o painel; Escape também fecha. Não altera dados ou hierarquia.
- O modal legado de lançamento deve vincular Cancelar pelo elemento explícito, sem usar a propriedade global window.close.

## Busca no menu principal — 01/11/2026
Matriz: apenas menu principal, controles ao lado do sol/lua, navegação de ida/retorno, temas claro/escuro. Lupa alterna campo de busca recolhido, foco ao abrir, pesquisa sem acentos nos destinos do menu. Ao sair ou voltar, campo recolhido e consulta limpa, com expansão/estado dos menus restaurados. Não alterar buscas das fichas ou dados.

Verificação: abertura com foco, busca sem acento, navegação por resultado e retorno com campo vazio/fechado, ausência de resultados e Escape passaram no navegador. Corrigido conflito do unificador de expandir/recolher para preservar a lupa. Sintaxe JS e git diff --check passaram.

## Lua contornada —252
Impacto: apenas símbolo da lua no controle de tema do menu. Crescente com contorno SVG fechado e traço mais definido; preservar círculo externo, cor, dimensão e alternância claro/escuro.

Verificado no navegador: lua sem preenchimento e contorno cinza de 2px, crescente definido, alternância para sol e retorno à lua funcionando.

## Lua crescente delicada —253
Escopo: somente lua do alternador de tema. Arco externo concêntrico ao botão e curva interna longa, seguindo a referência enviada; traço fino 1,3px. Sol, tamanho e cor do botão preservados. Verificar desenho e alternância de tema.

## Revisão dos cadastros —254
Matriz: Cargos/lista/editor/prévia e Área/Setor/Local/editor; identificador do cabeçalho com contorno circular branco; setas laterais no cinza de navegação; Salvar cargo → Salvar. Cadastro completo: rodapé sem Voltar na primeira etapa, Voltar/Avançar nas intermediárias e Voltar/Salvar+check na última; check circular no cabeçalho final. O encerramento legado era somente prévia: salvar campos no navegador com validação e restauração, informar limite de anexos. Sem transmissão externa.

Validação254: sintaxe de todos os scripts inline e scripts alterados passou; 7 transições de etapa passaram (incluindo ida/volta da última); salvamento, recuperação, bloqueio por campo obrigatório e falha de quota passaram em teste de lógica com DOM simulado. Revisão visual pelo navegador não repetida após bloqueio da revisão automática no fluxo anterior.

## Botões nomeados do cadastro —255
Somente rodapé do cadastro completo: Voltar com seta à esquerda do texto e Avançar com seta à direita. Manter primeira etapa sem Voltar e última com Salvar/check. Cabeçalho circular preservado.

## Cadastro de Operadora / Taxas —256
Matriz: componente de taxas compartilhado pelos cadastros de operadora, bandeiras fechadas/expandidas e estado sem/com condições. Pedido atual substitui espaçamento12px/contorno cinza: ícone do título com contorno branco, linhas consecutivas sem vãos, botão inicial Adicionar vigência/condição com recuos horizontal e vertical iguais ao padding12px do summary. Preservar campos, marcas, cores de classificação e ações.

Verificação256: removido CSS crítico duplicado após confirmar conteúdo idêntico na folha compartilhada; conferidos seletores dos estados fechado/aberto, botão inicial e margens de12px. Sintaxe de groups.js, script inline e git diff --check passaram. Conferência visual no navegador não realizada nesta revisão; persiste o limite da revisão automática anterior.

## Moldura das bandeiras —257
Matriz: Taxas por bandeira no Cadastro de Operadora, linhas fechadas/expandidas, lista ordenada ou filtrada. Restaurar moldura cinza contínua em todas as linhas; primeira visível com borda superior/cantos superiores12px, última visível com cantos inferiores12px. Sem vãos e sem bordas duplas. Título com cantos inferiores14px, simétricos aos superiores do painel. Preservar contorno branco e recuo do botão256.

Escopo257 ampliado pelo usuário: ícones na relação de taxas reutilizam a mesma resolução de identificador de Tipos de Bandeiras Cartões (marca, SVG escolhido ou3 caracteres), dimensão circular30px e padding4px.

Verificação257: sintaxe de groups.js e git diff --check passaram. Teste da resolução compartilhada passou para marca de bandeira, SVG personalizado, fallback, marca escolhida de operadora e3 caracteres. Seletores de primeira/última linha visível conferidos estruturalmente; inspeção visual pendente pelo limite anterior de navegador.

## Cores nas taxas —258
Matriz: ícones da relação Taxas por bandeira e quadros Grupo de Despesa/Grupo de Contas nas condições novas ou existentes. Anel/símbolos de bandeiras em vermelho#ef4444 no padrão de Tipos de Bandeiras; marcas preservam cores originais. Quadros maciços vermelho#ef4444/laranja#f97316, títulos/subtítulo/símbolos brancos e anel branco. Seletores internos brancos, medidas e vínculos preservados.

Verificação258: diff conferido, alterações restritas às cores do componente de taxas e versões dos estilos; git diff --check passou. Regras de ambos os estados de label (incluindo single-field-block) atualizadas, mantendo seletores legíveis. Conferência visual pendente pelo limite anterior do navegador.

## Taxas —259
Matriz: somente cabeçalho secundário e círculos identificadores nas linhas de Taxas por bandeira, fechado/expandido. Círculos maciços vermelhos, símbolos brancos. Base do cabeçalho com recorte côncavo voltado para baixo, como a sobreposição arredondada do conteúdo no cabeçalho principal. Preservar os cadastros amarelos cancelados pelo usuário.

Escopo259 ampliado: títulos Grupo de Despesa/Grupo de Contas nas condições usam tokens centrais de título (16px/20px, peso600), subtítulo11px/14px peso400. Encontrado: herdavam fonte de label14px peso400, com subtítulo10px local.

Verificação259: diferença de herança tipográfica identificada no código e ligada aos tokens centrais. Diff revisado; git diff --check passou. Ícones e geometria restritos a Taxas; nenhuma lógica/dados alterados. Conferência visual no navegador pendente pelo limite anterior.

## Matriz — revisão móvel260
Componentes: tipografia de inputs compartilhada, busca do menu/cabeçalhos/bibliotecas, grades de formulários, diálogos e controles de taxas. Impacto: menu Gestão/Agenda/Outros e submenus, Cargos/Salários, cadastros simples/completos, Contas e grupos financeiros, Operadoras e vigências, localização/biblioteca. Preservar ordem DOM e hierarquia; empilhar somente campos em telas estreitas. Verificação estrutural de seletores e interações da prévia; navegador remoto não fornece controle de viewport nem Safari/iPhone físico, portanto não declarar teste real móvel concluído.

Verificado260 na prévia Chrome1363px: menu/lupa e filtragem, expansão Configuração, navegação pelo ícone Diretor→Operadoras, busca Cielo com1/10 resultados, ações/edição, expansão da bandeira pelo ícone e adicionar condição sem salvar registro. Sem overflow da página nessa largura. Código responsivo revisado, mas testes visuais≤600px e teclado/zoom Safari permanecem pendentes por ausência de controle de viewport no navegador disponível.

## Matriz — Ficha de Cargos261
Nova consulta em Configurações / Gestão de Pessoas; matriz por área e ficha individual usam um cadastro local único. Reutiliza panel/head, addShortcuts, botões, formulários e tokens de ui-foundation. Impacto restrito: novo atalho, nova view, diálogos de vínculo de cargo/exigência e ficha. Não alterar cadastros existentes nem atribuir exigências de exemplo a cargos reais. Conferir inclusão por cargo existente/nome reduzido/CBO, áreas existentes, edição de exigências, checks persistentes, ficha e retorno; rolagem horizontal com primeira coluna e cabeçalho fixos, tema escuro e largura estreita. Limite da frase principal provisório de240 caracteres visível e revisável.

Verificado261 na prévia Chrome1363px: navegação por Gestão de Pessoas, criação de área de teste, vínculo com cargo existente/CBO4211-25, cadastro e marcação de exigência, persistência após recarregar, ficha com os itens marcados e inclusão de entrega com retorno à ficha. Dados de teste restritos ao navegador da prévia; nenhum exemplo no código. Sintaxe JavaScript e diff verificados. Tema escuro e Safari/iPad físico não testados visualmente nesta sessão.

## Conclusão da revisão móvel —262
Matriz: busca do menu; navegação Diretor de Operação; lista/edição de Operadoras; busca das taxas; expansão de bandeira e inclusão de condição sem salvar. As regras responsivas260 já estão no código. Verificação real de CSS em iframe375px, distinto de aparelho físico: busca cabe na tela, campos16px e sem overflow horizontal no editor/condição. Encontrado conflito no unificador: “Recolher busca” era confundido com recolher bandeiras após atualizar condições. Excluir controles de busca e alternadores já unificados da seleção; preservar lupa e expansão independentes. Conferir regressão antes de publicar. Safari/iPhone físico e teclado virtual não disponíveis.

Verificado262: prévia Chrome com iframe375×812, busca do menu16px e limites18–356px; navegação pelo ícone Operadoras; busca Cielo1/10; ações/edição; busca das taxas40–335px; expansão Visa Débito; adicionar condição e todos os controles visíveis16px/sem transbordamento. Regressão reproduzida antes e resolvida após excluir busca do unificador: lupa permanece e recolhe após criar condição. Cancelar retorna à lista sem gravar. Não equivale a testar todos os módulos, tamanhos ou Safari real.

## Correção263 — movimento e seleção
Página e cadastros não devem deslizar horizontalmente; rolagem vertical preservada. Conter conteúdo no painel e limitar larguras dos formulários. Menu: apenas última opção tocada marcada; expansão de ancestrais não equivale a seleção. Matriz: Cadastro simples/completo, editor de cargo, menu principal e submenus. Preservar dados e ordem.

Verificação263: prévia375px, Cadastro simples e primeira etapa do completo com página375/375px e conteúdo349/349px, overflow horizontal oculto no painel e vertical preservado. Menu alternado Configuração→Formulários: uma única marcação persistente. Safari físico e todas as etapas/cadastros não validados nesta revisão. Sintaxe e diff verificados.

## Matriz264 — cabeçalho em duas faixas
Todas as views, incluindo dashboard Pessoas, Processos e Ficha de Cargos dinâmica. Componente header-normalize: identidade (ícone/título/caminho) acima dos comandos. Botão sem círculo à direita da identidade; recolher oculta identidade, preserva comandos e botão de reabrir. Painel mantém cabeçalho fora do conteúdo rolável. Conferir inventário completo, alternância nos cadastros e menus, largura375px e desktop, comandos e rolagem.

Verificado264: inventário no DOM20/20 views com cabeçalho e botão únicos, incluindo ficha dinâmica. Prévia375px: Ficha de Cargos120px expandido/66px recolhido; título e ícone display:none, comandos flex e reabertura funcionais; busca e retorno preservados. Cargos: conteúdo rolou936px com cabeçalho no topo7px. Menus internos e Cargos abertos. Não foi realizada inspeção visual individual das20 views nem Safari físico.

## Correção265 — título fixo e comandos centralizados
Contêiner do aplicativo fixo no viewport; documento sem rolagem, conteúdo interno preservado. Cabeçalho não aceita gesto de arraste vertical. Recolhido: uma linha de grade (eliminar segunda linha vazia e gap), centro vertical comum aos comandos e controle; padding equilibra12px de sobreposição do conteúdo. Matriz:20 cabeçalhos via regra compartilhada; conferir Cargos com rolagem e ficha em375px.

Regra265: ao entrar, retornar ou selecionar novamente uma aba pelo menu, título e ícone começam abertos; mudança de destino na view compartilhada também reabre. Não preservar recolhimento entre visitas.

Verificação265:80 casos (20 views ×375/1024px ×claro/escuro) na prévia, expondo cada view e acionando seu botão real. Em todos: identidade/ícone ocultos ao recolher, centros dos comandos e seta coincidentes (delta0px), deslocamento de cabeçalho0px ao rolar conteúdo sintético, conteúdo rolável e página emscrollY0, sem overflow lateral da raiz. Corrigidas team/pre sem content; fixture fora do deploy em tests/header-layout.html. Navegação real Gestão de Pessoas→Ficha→Voltar→Ficha confirmou reabertura automática após recolher. Safari físico segue sem teste.


## Correção266 — camada do menu interceptando toques
Matriz: abrir menu, expandir grupos, selecionar Gestão de Pessoas/Diretor de Operação/Formulários e retornar. Reproduzido: app fixo cria contexto de empilhamento; backdrop filho do body com z-index100 cobre inclusive side z-index101 dentro do app. Clique físico no menu fecha a camada e retorna à view anterior. Mover backdrop para dentro do app, compartilhando o contexto com side, preservando cores e ações. Verificar cliques por coordenadas (acessibilidade pode ignorar a intercepção), expansão e navegação.

Verificação266: antes, captura cinza e clique por coordenadas no item fechava o menu sem navegar. Depois, menu branco sem sobreposição, clique por coordenadas expande Configuração e seleção abre Diretor de Operação; Operadoras abre sua lista de10 registros. Sintaxe e diff passaram. Safari/iPad físico não disponível.
