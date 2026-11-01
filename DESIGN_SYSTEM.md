# CICLUZ — referência de interface

Esta é a fonte de regras para alterações de interface. Os estilos compartilhados ficam em `dist/design-system.css`, carregados depois dos estilos legados. Reutilizar componentes e variáveis existentes antes de criar novos estilos.

## Cor por origem

- Vendas: amarelo #eab308; transferências e contas: laranja #f97316; despesas: vermelho #ef4444; mercadorias: verde #22c55e; retiradas: azul #2563eb; resultado, configurações e formulários: roxo #7c3aed.
- A cor do menu específico prevalece sobre a cor do ancestral. Grupo de contas dentro de TI usa laranja.
- Editar, salvar, voltar, seleção e destaques herdam a cor da tela via `--menu-accent` / `--panel-color`. Nunca fixar roxo porque um componente veio de Cargos.
- Excluir é a exceção semântica: vermelho, com confirmação depois da ação de excluir.
- Marcas bancárias preservam as próprias cores: fundo branco, círculo laranja, imagem contida e sem extravasar.

## Ícones e navegação

- Transferências e Grupo de contas usam o mesmo símbolo $ +/−. Conta nova herda esse símbolo; substituição individual é opcional.
- Cabeçalho da próxima tela repete o ícone da opção que a abriu. Sem ícone próprio, herdar da origem imediatamente anterior.
- Submenus laterais textuais não ganham ícones extras sem solicitação.
- Toda escolha de ícone tem prévia imediata com nome. Opções circulares, seleção simples e Mais ícones para biblioteca ampliada.
- Botões Voltar e Fechar circulares e discretos. Voltar retorna à etapa anterior real.

## Componentes e comportamento

- Referência visual: Cadastro do cargo. Montserrat, títulos 16px, campos/nomes 12px, informações auxiliares 11px; campos 42px, raio 8px, fichas raio 10px.
- Cabeçalho no tom claro da origem, conteúdo branco; tema escuro com contraste equivalente.
- Editar/Excluir: painel lateral deslizante, lápis e lixeira SVG, botões 38px e raio 9px. Fecha ao clicar fora ou no nome novamente.
- Enter em campo de uma linha avança ao próximo campo disponível; textarea preserva quebra de linha; não salva automaticamente.
- Contas ativas antes das inativas, depois ordem alfabética ou manual salva. Inativas ficam mais apagadas. Alça de movimento à esquerda.
- Máscaras e capitalização centralizadas; preservar siglas e identificadores.
- Preservar desenho original da marca e trajeto aprovado da animação. Não redesenhar livremente.

## Verificação antes de concluir

Conferir origem da cor e do ícone, estados ativo/inativo/selecionado, navegação de volta, tema claro/escuro e menu aberto/recolhido quando relevante. Não declarar validação visual sem executá-la.

## Grupos financeiros

- Títulos centralizados em `dist/groups.js`: CNT - Grupo Contas (laranja), VND - Grupo Vendas (amarelo), RET - Grupo Retiradas (azul), MER - Grupo Mercadorias (verde), DES - Grupo Despesas (vermelho).
- Grupos expansíveis com subgrupos, ações laterais, ícone com prévia e situação ativo/inativo. Itens sem subgrupo permanecem no nível principal. Não combinar registros similares sem decisão do usuário.
- Documento: DOC/F, DOC/NF ou DOC/F/NF. Apenas MER - Grupo Mercadorias inclui o campo Finalidade: VENDA ou TRANSFORMAÇÃO, sem inferência automática.
- Dados iniciais recebidos em 31/10/2026: mercadorias, despesas e vendas. Retiradas recebidas: 4 grupos e 12 subgrupos; preservar cada item informado.

## Revisão de 31/10/2026

- Somente CNT, VND, RET, MER e DES permanecem maiúsculos no início dos nomes financeiros; restante em minúsculas, sem abreviar nem cortar nomes recebidos.
- Títulos: sigla, espaço, traço, espaço, grupo e nome (sem “de”).
- Expandir/recolher: ícones circulares no cabeçalho. Grupos com filhos têm seta própria separada da seta de ações.
- Lista completa opcional mantém cada linha recebida: 79 MER, 98 DES e 10 VND. DES despesas bancárias também existe como item próprio, além dos subgrupos.
- Listas e formulários usam as classes de Contas; ações usam uma função compartilhada, inclusive SVG, dimensões e animação.

- Atualização: iniciais das palavras maiúsculas (Grupo Contas, Investimento - Hidráulico), com CNT, VND, RET, MER e DES sempre em maiúsculas no início. Essa decisão substitui o padrão anterior de nomes inteiramente minúsculos.

- Todos os menus laterais internos e cartões de navegação têm alça à esquerda, ordem manual persistida por menu e suporte a arrastar ou teclas de seta. Grupos e subgrupos financeiros preservam a hierarquia.
- Exceções de capitalização confirmadas: PDV e códigos 1M, 1T, 2M, 2T, 3M, 3T, 4M e 4T.

- Ordenação: retirar seletores Manual/A–Z. Arrastar a alça já aplica e salva a ordem manual. Botão compacto A–Z reorganiza os nomes, mantendo ativos antes de inativos nos cadastros financeiros e preservando os vínculos de grupos/subgrupos. Padrão aplicado também às opções laterais e aos cartões de navegação.

- Cargos incluído explicitamente: alça à esquerda na lista, botão A–Z no cabeçalho, ordem manual preservada ao reabrir. Pesquisa e filtro de categoria continuam disponíveis.

- Destaque ao arrastar: borda herda a cor do menu/registro de origem; nunca reutilizar laranja fixo de Contas em outros módulos.

- Controle de organização exibe “A/Z” (com barra). Nos cadastros e telas internas fica no cabeçalho, no mesmo grupo de botões circulares Voltar/Fechar/Expandir. Nos menus laterais fica no cabeçalho do respectivo menu. Tamanho e alinhamento compartilhados; cor da origem.

- Ordem fixa dos controles do cabeçalho: Voltar primeiro, Fechar segundo. A/Z e todos os demais ícones vêm depois, sem deslocar os dois primeiros. Aplicar a regra central `normalizeHeaderActions`.

- Exceção confirmada: o menu lateral principal e seus cabeçalhos não exibem A/Z. Preservar as alças de arraste; A/Z permanece nos cabeçalhos das telas internas e cadastros.

- Arraste contínuo: permitir mover do topo ao fim em um único gesto, com rolagem automática nas bordas. Usar o controlador compartilhado `enableContinuousReorder`, mantendo rastreamento mesmo ao mudar o elemento de posição. Salvar ao soltar; cancelar restaura a ordem. Preservar hierarquia e ativos antes de inativos.

- Novo grupo “Tipos de Venda”, amarelo, acessível no TI junto dos grupos financeiros. 13 itens recebidos em 31/10/2026, incluindo Pix e Pix Banco separados. Preservar códigos, referências entre parênteses e percentuais; não ativar regras de lançamento a partir desses textos. Usa componentes de Contas, inclusive chave ativo/inativo, inativos apagados, arraste contínuo e A/Z no cabeçalho depois de Voltar/Fechar.

- Famílias de venda: “VND - Tipos de Venda”, “VND - Tipos de Bandeiras” e “VND - Tipos de Operadoras”, em amarelo e com os mesmos componentes. Os dois últimos começam sem registros, aguardando nomes informados pelo usuário.

- Tipos de Bandeiras: 41 itens importados da lista do usuário, como registros individuais (marca e modalidade). Manter grafia e combinações recebidas, sem consolidar modalidades ou substituir marcas.

- Bandeiras vinculam-se a um Tipo de Venda pelo ID persistido, selecionado no cadastro; seleção obrigatória ao salvar, sem inferir vínculos. Atalho abre o tipo vinculado. Não confundir o vínculo com texto digitado.
- Operadoras: Stone, Getnet, Cielo, PagBank e SafraPay solicitadas; Rede, Mercado Pago, SumUp, Ton e InfinitePay verificadas em fontes oficiais.
- Logomarcas reais mantêm cores originais, fundo branco e contorno amarelo; utilizar assets locais contidos. Origem dos arquivos em payment-mark-sources.json. Não substituir logomarca desconhecida por marca parecida.
- Nomes de menus no plural com “de”: CNT - Grupos de Contas e equivalentes, preservando códigos.

- Configuração / Cadastros Gerais contém somente Gestão de Pessoas e Diretor de Operação. TI foi renomeado para Diretor de Operação, preservando todos os cadastros, grupos e navegação de retorno. Remover desse menu os atalhos Financeiro e Diretor Geral; não alterar os papéis de mesmo nome em outros módulos.

- Dinheiro usa somente cifrão no ícone padrão, sem sinal de soma/subtração. Redecompras usa a marca do perfil empresarial de serviços financeiros, vinculada a redecompras.net.br; imagem conferida antes da aplicação.

- BK Bank: substituir a fotografia JPG com fundo cinza por SVG sem fundo, contendo somente a marca. Manter respiro dentro do círculo amarelo. Arquivo: assets/payment-marks/bkbank-transparent.svg.

- Dinheiro usa apenas cifrão amarelo em fundo branco, tanto na lista quanto na prévia do cadastro.

- Cadastro de Operadoras oferece todas as logomarcas disponíveis como seleção explícita, independente do nome, com prévia e escolha persistida.

- Operadoras: quadro com todas as bandeiras e condições por vigência, modalidade e parcelas; MDR, tarifa fixa e antecipação separados. Valores contratuais sem preenchimento automático. Histórico preservado e vigências conflitantes bloqueadas.

- Quadro de taxas por bandeira usa vermelho, conforme pedido; cadastro de operadoras/bandeiras permanece amarelo.

- Cada condição de taxa deve selecionar um Grupo de Despesa (ou subgrupo) existente. Vínculo salvo por ID; opções inativas existentes são preservadas. O quadro configura a classificação, sem gerar lançamentos automaticamente.

- Taxas: cabeçalho vermelho forte, interior vermelho claro; ações + Adicionar vigência/condição e − Remover vigência/condição lado a lado, vermelhas e alinhadas por condição.

- Cabeçalho Taxas por bandeira reutiliza os SVG de cifrão e menos dos menus, círculo 38px e título Montserrat 16px.

- Cada bandeira no quadro de taxas mostra sua logomarca em círculo e seta SVG à direita que gira ao expandir.

- Faixa do nome de cada bandeira: branca em repouso, vermelho claro ao passar o mouse ou focar pelo teclado.

- Remover vigência/condição usa confirmação no próprio quadro, com Confirmar remoção e Cancelar remoção, sem depender de janela nativa do navegador.

- Rótulos dos menus: VND - Tipos de Bandeiras de Cartões e VND - Tipos de Operadoras de Cartões.

- Cada condição de taxa inclui Grupo de Contas ao lado de Grupo de Despesa, com seleção dos cadastros existentes e persistência por condição.

- Ajuste de rótulos: Tipos de Bandeiras Cartões e Tipos de Operadoras Cartões, sem de antes de Cartões. Campo das taxas: Transferências Automáticas — Grupo de Contas.

- Classificação das taxas: célula Grupo de Despesa em vermelho; Transferências Automáticas — Grupo de Contas em laranja, incluindo fundo claro e borda do seletor.

- Campos de classificação têm ícones originais dos menus: cifrão/menos vermelho para Despesa e cifrão/mais-menos laranja para Contas.

- Classificação das taxas: interior das células e seletores branco; diferenciação apenas pelas bordas e ícones vermelhos/laranjas.

- Correção definitiva da classificação: quadro externo com fundo claro vermelho/laranja, seletor interno branco; círculo do ícone maciço na cor forte do menu e símbolo branco. Substitui a orientação anterior de exterior branco.

- Campo Contas: título Grupo de Contas na primeira linha e subtítulo Transferências Automáticas abaixo, sem traço, ícone ao lado.

- Finalização Taxas por bandeira: cabeçalho vermelho claro, conteúdo branco e ícone circular vermelho forte com símbolo branco, no padrão do menu Despesas.

- Taxas mantém destaque vermelho no hover, ativação e foco dos campos; campo Contas conserva sua identificação laranja.

- Quadro de taxas: alças à esquerda nas bandeiras, ordem salva por operadora; cabeçalho com A/Z, expandir todas e recolher todas. Arraste contínuo e setas do teclado.

- Ordem dos cartões usa identificador estável do destino, independente de mudanças nos rótulos. Reconhecer rótulos anteriores e manter novos itens após os já ordenados.

- Área / Setor / Local unifica os três cartões e abre árvore de quatro níveis, sem nomes predefinidos. CRUD, ícone/cor com prévia, ordem entre irmãos, A/Z recursivo e expandir/recolher. Dados locais persistidos.

- Níveis definitivos: Área → Setor → Local → Sublocal. Menu mantém Área / Setor / Local.

- Área/Setor/Local/Sublocal: adicionar com + SVG circular; cadastro com cabeçalho claro, ícone e fechar, identidade nome/ícones, Montserrat e campos de 42px no padrão Cargos.

- Área / Setor / Local pertence a Configurações → Gestão de Pessoas, junto de Cargos; retorno abre Gestão de Pessoas.

- Árvore de locais reutiliza createFinancialActions: setinha lateral revela lixeira vermelha e lápis na cor do item, em todos os níveis.

- Alças dos quatro níveis reutilizam menu-item-move: pontinhos cinza, 20px, área 18×24px, mesmo espaçamento dos demais menus.

- Cor dos quatro níveis: paleta visual de 48 bolinhas, tons claros/escuros e neutros, check na seleção e cor personalizada, conforme referência enviada.

- Botão + fica no fim da lista de áreas e de cada lista de filhos, acompanhando os novos itens para baixo.

- Blocos da árvore padronizados com menus anteriores: borda 1px, raio 10px, preenchimento 12×14px, texto 12px, ícone 30px e mesma densidade em todos os níveis. Cadastro com largura máxima 760px.

- Galeria dos quatro níveis reutiliza ícones de Cargos e do sistema, opções extras em Mais ícones e prévia imediata.

- Cabeçalho de cadastro dos quatro níveis: Voltar e Fechar primeiro, com SVG e botões circulares iguais aos demais cadastros.

- Cadastro dos níveis: paleta recolhível em campo Escolher cor; prévia reproduz cartão da lista com alça, círculo colorido, nome e seta, sem nome solto.

## Padrão obrigatório para novos menus laterais

- Reutilizar a estrutura dos menus existentes: alça `.drag-handle` à esquerda, ícone circular, `.menu-name` com título em `span` e subtítulo em `small`, seta de expansão do próprio `summary`. Mesmos alinhamentos, tipografia, espaçamento e controlador compartilhado de arraste contínuo com ordem salva.
- Agenda usa ícone de calendário roxo, título Agenda e subtítulo Atividades em linhas separadas. Preservar o identificador Agenda/Atividades para a ordem salva.
- Gestão, Agenda e Outros têm controles independentes para expandir/recolher.
- Formulários mantém somente Diretor de Operações e Gestão de Pessoas.

- Agenda / Atividades contém os submenus Gestão de Pessoas e Diretor de Operações, com alça e ordenação compartilhadas.

- Controle global do menu percorre níveis em cliques sucessivos: abrir seções, abrir todos os menus, fechar todos os menus, fechar seções. A seta só inverte ao terminar a expansão/retração completa.

- Regra central formatSystemName: iniciais maiúsculas em nomes; artigos, preposições e conjunções internos em minúsculas (de, da, do, dos, e etc.). Preservar siglas e códigos. Usar a mesma função em novos campos e cadastros; não aplicar a descrições livres, senhas, URLs, e-mails ou identificadores.
- Cargos têm Nome e Nome reduzido opcional, com máximo de 15 caracteres, incluindo espaços. A lista prioriza o reduzido e pesquisa ambos; mantém o nome completo e identificadores.

- Nome reduzido do cargo é preenchido automaticamente com o nome já cadastrado quando não houver personalização. Em novos cargos acompanha o Nome enquanto o usuário não editar o reduzido; edição manual prevalece e é preservada ao reabrir.

- Biblioteca compartilhada CicluzBakeryIcons: 48 símbolos SVG de panificação, confeitaria, salgados, mercearia, equipamentos, utensílios e gestão. Disponível em Cargos, Contas, grupos financeiros; os níveis de localização atualmente usam identificador de três caracteres. Acrescentar sem mudar IDs ou índices anteriores; preservar marcas bancárias.

- Todos os cadastros com identificador (Cargos, Contas, grupos/subgrupos, tipos de venda, bandeiras, operadoras e quatro níveis de localização) oferecem Ícone ou 3 caracteres, com prévia, escolha persistida e preservação dos registros anteriores. Biblioteca inclui pessoa, dupla e grupo com cabeça circular e ombros em arco, traço uniforme. Mais ícones usa chevron para baixo/acima.

- Biblioteca central local: Buscar, importar ou excluir ícones em Mais ícones. Busca externa Lucide; importar SVG simples sanitizado com nome e prévia. Reabrir cadastro mostra novos ícones em todos os seletores. Exclusão confirmada oculta opção em todas as galerias, preserva aplicações existentes e permite Restaurar. Dados locais neste navegador, sem sincronização entre dispositivos. IDs de importados estáveis; nunca deslocar índices legados.

- Mais usados: até seis ícones por frequência de seleção, compartilhados entre seletores neste navegador; não preencher com sugestões antes do uso. Ícones excluídos saem dessa faixa. Cabeçalho lateral/marca e cabeçalhos de tela permanecem visíveis durante rolagem; somente opções laterais rolam.

- Correção de navegação: manter layout original da barra lateral e seu contêiner de rolagem; não aplicar flex à .side (o botão sticky de recolhimento é um filho independente). Cabeçalho principal .top já é sticky. Não deslocar cabeçalhos internos com top fixo de 78px.

- Cabeçalhos internos sticky abaixo da altura real do cabeçalho principal, medida por ResizeObserver. Usar overflow:clip no painel para não criar ancestral de rolagem que impeça sticky. Marca lateral sticky sem mudar display da lateral.

- Cabeçalhos sem deslocamento inicial: painel em coluna limitado à altura útil; apenas .content rola, .head permanece fora do contêiner de rolagem. Substitui sticky nos cabeçalhos internos.

- Adicionar junto dos controles do cabeçalho; busca e filtros em linha fixa abaixo do título. Reutilizar elementos e eventos, com limpeza ao navegar entre cadastros. Registros rolam separadamente.

- Adicionar no cabeçalho é sempre botão circular 32px com o mesmo SVG de mais (18px), cor herdada, nome em aria-label/title. Mover para o cabeçalho não altera formato nem acrescenta botão em pílula.

- Busca do cabeçalho recolhida em botão circular de lupa 32px. Clicar abre campo e foca; clicar novamente ou Escape recolhe preservando consulta/filtro. Consulta existente abre o campo ao entrar.

- Mover somente a ação explícita Adicionar grupo/tipo ou Novo grupo para o cabeçalho. Nunca selecionar pela posição primeiro filho: ao mover o primeiro botão, Histórico virava o próximo e gerava um segundo mais. Preservar vínculo form dos botões submit movidos.

- Histórico de transferências no cabeçalho como relógio SVG circular, mantendo ação original. Atualizar organograma usa duas setas circulares, mesmo traço de 1,8 e cantos arredondados.

- Cabeçalho compacto: padding 10px/14px, gap 8px, manter tipografia existente. Não reservar segunda linha vazia; mostrar apenas quando houver filtros ou busca aberta.

- Contas usa o mesmo cabeçalho financeiro, busca recolhida em lupa e mais circular que abre ficha vazia; remover criação direta por campo na lista. Preservar cadastro e armazenamento existentes. Ordem comum: Voltar, Fechar, A/Z, expansão quando houver, Adicionar, Buscar, Histórico quando houver.

- Regra global dos cabeçalhos: atalhos circulares em uma única faixa no canto superior direito; título/descrição abaixo sem deslocar controles. Aplicar a todas as telas .view, não só três cadastros. Preservar ordem e cores de origem.

- Cabeçalho compacto definitivo: ícone, nome e atalhos na mesma linha alinhados ao centro. Título/subtítulo com reticências e nome completo no title; não aumentar altura por texto longo. Seletores recolhidos sob chevron próprio, busca recolhida em lupa; abrir controles em segunda linha só sob demanda. Substitui faixa de atalhos acima do título.

- Normalizar também cabeçalhos legados: extrair ícone de dentro do título, criar faixa de atalhos quando ausente e mover ações diretas para essa faixa. Três colunas explícitas: ícone 38px, título flexível, atalhos. Não presumir estrutura igual antes da normalização.

- Revisão dimensional: controles de formulário 42px/raio8/fonte12; linhas de cadastro no mesmo nível 62px e ícone30; subgrupos40. Montserrat compartilhada. Hover dos grupos ocupa a moldura inteira sem padding externo. Expandir/recolher global usa duas setas opostas; filtro usa chevron simples, imediatamente ao lado da lupa. Preservar cores por módulo.

- Modelo único de busca: referência Tipos de Venda/Operadoras. Campo aberto ocupa largura total disponível; altura42, raio8, padding10, Montserrat12/18, fundo branco no tema claro. Borda e foco herdam cor do módulo. Classe shared-header-search em Contas, Despesas e demais cabeçalhos.

- Expandir/recolher: duas setas em chevron, cima e baixo, mesma geometria do menu (sem hastes). Preservar ciclo de níveis. Substitui setas verticais com haste.

- Busca e filtro abertos: grade compartilhada, busca à esquerda e seletor180px à direita, gap8/altura42. Tela estreita: busca acima, seletor abaixo. CSS não depende da ordem de criação dos controles. Hover suave8% no tema claro/18% escuro; retirar override legado18% claro.

- Faixa única: todos os 17 cabeçalhos, inclusive Cargos/Salários, usam fundo14% de acento+branco, borda25%; tema escuro24%. Ferramentas transparentes sem moldura própria. Mesma classe de busca em Salários, filtrando apenas a visualização dos cargos, sem alterar valores. Não manter receitas antigas24% no tema claro.

- Área/Setor/Local/Sublocal oferece busca pela mesma lupa compartilhada. Busca sem distinguir acentos, mantém ancestrais dos resultados e abre o caminho durante consulta; limpar mantém expansão manual anterior.

## Processo e tipografia de formulários

UI_CHANGE_PROCESS.md é obrigatório para alterações futuras. Tokens tipográficos e dimensões por função em dist/ui-foundation.css: Montserrat; título16/20 peso600, subtítulo11/14, texto/label/campo12/18, nota11/16, campo42 raio8. Comparar papéis iguais: título de ficha com título de ficha; nome de item de menu12 com nome de item12. Busca e filtro pertencem às consultas; não acrescentar busca de registros a fichas.

- Hierarquia de cores de texto: título roxo de referência #4B2679, subtítulo #785C9B (75% título+25% branco); ícones/botões #7C3AED. Cadastros e menus usam a mesma cor de título por origem. Outros módulos preservam --panel-text próprio e subtítulo segue a mesma receita75%. Tema escuro tem receita de contraste própria.

## Campos unificados — 31/10/2026

Substitui as medidas anteriores de texto dos campos: Montserrat14/20 peso400; labels Montserrat12/18 peso500 cinza #52525B (escuro #D4D4D8). Campos42px, raio8, padding10x12, borda1px neutra #D4D4D8, fundo branco, texto #27272A. Placeholder #71717A. Foco: borda no acento de origem e halo3px14%; escuro24%. Hover: mistura50% acento/borda. Textarea mínimo84px. Erro explícito vermelho; desabilitado opacidade60%. Checkboxes, rádio, paletas e sliders mantêm geometria própria. Fonte única: ui-foundation.css; inclui buscas/filtros, tabelas editáveis, views legadas, fichas e diálogos dinâmicos.

Matriz de impacto: todas as .view e diálogos, incluindo Cargos/Salários, Contas, grupos financeiros, tipos de vendas/bandeiras/operadoras e taxas, localização/organograma, cadastro simples/completo/dependentes, patrimônio, configuração e modais. Inventário estrutural não equivale a conferência visual de todas as rotas.

## Revisão complementar global de 31/10/2026

Títulos16/20 peso600, subtítulos11/14 peso400. Rótulos12/18 peso400 (substitui peso500); valores14/20 peso400; botões principais12 peso600. Acento por origem, rótulos neutros; borda neutra1px, raio8, foco3px14% (24% escuro). Campo resolve o acento no próprio elemento para respeitar painéis financeiros internos. Seletores usam chevron SVG18 traço1.8, abaixo em repouso e acima quando :open.

field-validation.js centraliza CPF (máscara11 dígitos e verificadores), datas nativas com ano0001–9999 e calendário válido, moeda por centavos com separadores pt-BR. Dinheiro não afeta percentuais, quantidades ou identificadores; tarifa fixa é normalizada para decimal ao salvar. Enter percorre campos visíveis/editáveis em formulários, fichas e modais; textarea mantém quebra de linha; busca mantém comportamento próprio. Componentes dinâmicos são preparados por observador. Regras de moeda duplicadas removidas.

- Setinha dos seletores usa a mesma cor do texto do campo (--ui-input-color), com atualização no tema claro/escuro. Substitui acento do módulo para a setinha; geometria compartilhada preservada.

- Busca: usa exclusivamente os tokens dos campos em ui-foundation.css, removendo receitas antigas de fonte12 e cor própria. Uma lupa abre/foca o campo; placeholder curto Buscar…, descrição específica preservada no aria-label; limpar nativo e Escape mantêm interação simples. Filtro conserva o mesmo controle e geometria de campos.
- Rolagem global: trilho transparente, indicador fino6px apenas em hover/foco; toque sem barra permanente, sem mudar overflow nem impedir mouse/teclado/toque. Preservar alto contraste.
- Proposta pendente (não aplicada): toque simples abre edição com Excluir visível e confirmação local. Não aplicar duplo clique nem lixeira por arraste sem definição.

- Rolagem: remover visualmente trilho e indicador em todos os contêineres, inclusive hover/foco. Substitui barra fina da revisão anterior. Preservar overflow e navegação por mouse/teclado/toque; alto contraste usa barra nativa.

## Piloto Gerenciar ícones — somente Cargos

Cargos mantém escolhas rápidas/mais usados e substitui Mais ícones por Gerenciar ícones. Uma única janela no padrão de cabeçalho72px/ícone38/fechar32, fontes e campos compartilhados. Busca local; Buscar novos consulta Lucide via API Iconify dentro da mesma janela (sem navegação externa). Prévia e Importar e usar; Importar arquivo SVG usa sanitização existente. Remover só aparece após seleção, confirmação local, com Ver removidos/Restaurar e usar. IDs e aplicações anteriores preservados. Importações e ocultações do piloto ficam em cicluz-job-icon-pilot-v1, separadas das opções dos outros cadastros. Demais gerenciadores mantidos.

## Revisão do piloto de Cargos — grade integrada

Substitui a janela Gerenciar ícones: usar Mais ícones no próprio cadastro, com grade circular existente. Clique simples seleciona; duplo clique ou pressionar550ms revela lixeira junto ao ícone; tocar na lixeira revela confirmação local. Movimento8px cancela pressionar. Delete/ShiftF10 também revela a ação. Buscar mais opções abre pesquisa online e importação SVG dentro da grade; resultado importado/aplicado com clique simples. Remoção recuperável via Ver removidos; registros e IDs preservados. Piloto permanece somente em Cargos.

- Títulos Mais ícones: mesmo papel dos rótulos de campo, Montserrat12/18 peso400 cinza neutro e equivalente no tema escuro. Atalhos Buscar na web/Importar SVG em Cargos usam acento do módulo.
- Editar/Excluir nas ações laterais das listas e árvores: dois círculos38px, SVG18px branco. Editar herda acento do item/menu; Excluir fundo vermelho semântico e lixeira branca. Lixeira revelada na biblioteca também vermelha sólida/branca. Não alterar os fluxos ou confirmações.

- Correção de escopo e formato: testar ações laterais somente em Cargos. Substituir círculos por dois blocos justapostos52px, preenchendo a altura interna da linha, sem padding/gap/raio próprio. Editar à esquerda na cor do módulo; Excluir à direita vermelho com lixeira branca. Borda externa da linha recorta os blocos. Outros cadastros mantêm as ações anteriores até avaliação do teste.

- Busca online de ícones em Cargos: vocabulário pt-BR normalizado (acentos e funções de padaria/gestão) traduzido para termos da coleção externa Lucide. Resultados continuam vindo da API, sem simular busca local. Mensagens distinguem coleção sem correspondência de falha de conexão/download. Informar Lucide como origem para explicitar o alcance da busca.

- Busca online piloto Cargos: Traço simples reúne Lucide, Tabler e Iconoir; Mais estilos acrescenta Phosphor e Material Symbols. Resultados intercalados por coleção, com identificação da origem; importação monocromática preserva fill/stroke seguros. Buscar mais opções/Ver removidos ocupam a mesma largura da grade.
- Linha de Cargos mantém largura100% do quadro; ações ocupam76px internos, dois blocos38px, altura completa. Não ampliar o quadro ao revelar ações.

## Aplicação geral autorizada

Aplicar biblioteca inline com clique/duplo clique/pressionar, pesquisa externa multicoleções, importação e removidos em Cargos, Contas, grupos/subgrupos financeiros, tipos de venda/bandeiras/operadoras e localização. Controladores existentes mantêm seus IDs/vínculos. Piloto de Cargos migrado uma vez para biblioteca compartilhada, preservando IDs.

Ações laterais em blocos de altura completa, dois38px lado a lado, largura da linha preservada, também nas listas financeiras e árvore de localização. Ícones brancos; Excluir vermelho e Editar no acento do item.

- Biblioteca global: importações/ocultações/restaurações compartilham a mesma fonte de dados. Identidade de ícones existentes baseada na geometria (sem depender do rótulo de cada formulário), com migração dos registros legados. Abas do mesmo navegador recebem mudanças via storage; dispositivos/navegadores distintos ainda não sincronizados.

- Itens removidos: clique simples apenas seleciona; duplo clique/pressionar550ms revela ação circular Restaurar, com símbolo de importação. Tocar no símbolo restaura a biblioteca global sem alterar a seleção do cadastro. Enter/ShiftF10 também revela a ação.

- Seleção visual de ícone é exclusiva por cadastro: novo clique desmarca todas as opções anteriores, inclusive cópias em Mais usados. Renderização da faixa Mais usados preserva uma única indicação de seleção. Importação aplica a mesma regra.

- X de limpar campos de busca: mesmo traço1.8 e cor do módulo dos demais atalhos; substituir desenho nativo azul sem alterar a ação de limpar.

- Busca externa reconhece ações de interface em português e sinônimos (atualizar/atualização/recarregar, voltar/retornar, seguir/avançar, expandir/maximizar, entre outras), consultando termos equivalentes nas coleções. Não tratar ausência de tradução como prova de ausência do ícone.

- Resultados externos carregam dados JSON em lote por coleção, com cache em memória de respostas e desenhos, em vez de uma requisição SVG por resultado. Mantém sanitização e transformações de aliases.

- Busca compartilhada de ícones: impressora, impressoras, impressão e impressões usam a consulta online printer, assim como imprimir.

## Biblioteca compartilhada — uniformidade e esvaziamento
Matriz: Cargos; Contas; grupos/subgrupos DES, MER, RET e VND; tipos de venda, bandeiras, operadoras; Área/Setor/Local e Organograma. Mesma grade32/ícone18, rótulos12/18 peso400 neutro, ações no acento sólido do módulo. Resultados online e removidos não herdam roxo de Cargos. Excluir/esvaziar mantém vermelho. Ver/Fechar removidos indica aria-expanded; Esvaziar removidos só aparece com a área aberta e pede confirmação explícita. Esvaziamento elimina a possibilidade de restaurar na biblioteca compartilhada; desenhos referenciados por cadastros existentes permanecem disponíveis para esses registros. Tombstones persistidos e sincronizados entre abas do mesmo navegador. Não executar esvaziamento em dados reais durante QA.

- Cabeçalhos no tema escuro resolvem o acento do menu antes de --panel-color legado do título, evitando roxo herdado. Popup de remoção fecha ao rolar por wheel, sem cancelar a confirmação por scroll automático do foco. QA: DES claro/escuro, MER/RET/VND, tipos/bandeiras/operadoras, Contas, Cargos e diálogo Área; dimensões/cores/tipografia computadas e remoção/restauração/confirmar-cancelar esvaziamento. Esvaziamento validado com estado fictício em Node, incluindo quota e preservação de referências; nenhum esvaziamento executado nos dados reais. Organograma e subníveis usam a mesma fábrica de diálogo; inspeção estrutural, sem afirmar revisão visual de cada registro.

- Organização única da escolha de ícones: nome acima e biblioteca abaixo em largura integral, alinhada à esquerda; remover coluna lateral220px de Cargos/Contas/grupos financeiros. Mais usados/Mais ícones/busca/removidos ocupam linhas completas, inclusive quando aninhados na grade flex dos grupos. Aplicação compartilhada também ao diálogo de localização.

- Auditoria complementar: Contas, RET, VND, tipos de venda, bandeiras, operadoras e subgrupo DES abertos e comparados após atualização; grade, busca e removidos com desvio horizontal0px e largura igual ao seletor. Localização ainda possuía regra própria1.5fr/1fr: removida na fonte design-system.css para nome acima/identificação abaixo em Área, Setor, Local e Sublocal. Organograma não possui biblioteca própria: Cadastrar cargo direciona a Cargos; não confundir posição do organograma com seletor de ícone.

- Conferência concluída na prévia também para Área/Setor/Local/Sublocal: nome e biblioteca com mesma margem e largura680px no viewport testado; busca/removidos alinhados0px e sem overflow horizontal. Sublocal aberto usando Local fictício criado somente no navegador de QA. Nenhum cadastro real alterado.

## Menu inicial — revisão 31/10/2026
Menu principal ocupa a tela inteira em celular, tablet e computador, ocultando o conteúdo ao abrir. Remover as faixas superior e inferior. Expandir/recolher todos e claro/escuro ficam juntos à esquerda acima de Gestão, no mesmo cinza das setas das seções (claro #a2a0aa; escuro #9896a1). Usuário permanece fixo no rodapé; opções rolam independentemente.

- Recolhido: mostrar somente ícones, ocultando nomes e alças de arrastar. Expandido: restaurar nomes e alças. Usuário continua no rodapé.

- Revisão: TRÊS controles circulares32px lado a lado acima de Gestão: expandir/recolher menu (painel com seta SVG), expansão global e tema. Cor do símbolo e contorno acompanha a cor efetiva dos títulos dos itens (.menu-name), inclusive no tema escuro. Substitui a referência anterior às setas de seção. Topo/controles não rolam; somente opções da navegação.

- Gestão, Agenda e Outros usam o mesmo separador cinza de pontas arredondadas acima do título. Os três controles ficam acima do separador de Gestão, com espaçamento.

- Logomarca compacta180px no topo, com margem superior removida e respiro12px antes dos controles. Marca, três controles e separador superior permanecem fora da região rolável, assim como o usuário no rodapé. Preservar arte e animação originais.

- Rodapé fixo do usuário separado da lista rolável pela mesma linha cinza de pontas arredondadas usada no topo. Lista rola entre as duas divisórias; marca/controles e usuário permanecem fixos.

- Controle de menu principal usa seta horizontal de abrir/recolher junto a uma barra vertical, em círculo, distinta das setas verticais de expansão das opções. Não consolidar esse botão com o controle de submenus.

- Menu recolhido: esconder os controles do topo; mostrar somente a logomarca compacta acima dos ícones do menu. Clicar/tocar na logomarca (ou Enter/Espaço) reabre o menu e restaura os três controles.

- Tema: substituir polaridade por lua no tema claro (ativar escuro) e sol no tema escuro (ativar claro). SVG neutro no mesmo círculo32px e cor dos demais controles; manter rótulo acessível e preferência persistida.

- Revisão: retornar abrir/recolher menu à setinha isolada no canto superior direito, sem círculo. Remover o terceiro botão circular da fileira. Permanecem dois círculos acima de Gestão: expansão das opções e sol/lua; ambos ocultos quando recolhido. Seta preserva a cor dos outros controles.

- Marca: aumentar contraste das letras CICLUZ e subtítulo Gestão de Padaria, mantendo desenho original. Recorte das letras exclui o subtítulo Gestão de Obra que vinha na imagem de referência, evitando texto antigo sobreposto. Tema escuro usa letras claras; tema claro, escuras.

- Subtítulo da marca em linha própria com altura15px e margem superior-5px (aproximação de7px solicitada); Gestão e de Padaria mantêm os alinhamentos com grade57%/43%, sem sobreposição absoluta. Contraste reforçado nas letras originais, nos dois temas.

- Paleta única da navegação principal: --navigation-ink, claro#a2a0aa e escuro#9896a1. Títulos Gestão/Agenda/Outros, setas de seções/opções, seta do canto, atalho abrir menu, expansão global, sol/lua e seus contornos derivam desse token. Substitui a leitura de cor de .menu-name por JavaScript. Ícones de módulos e ações internas preservam cores de origem.

- Palavra CICLUZ branca pura#ffffff no tema escuro e escura#242426 no claro. Cor definida no feFlood do filtro SVG compartilhado, sem depender de currentColor herdado fora da marca.

## Piloto restrito — Diretor de Operação
A revisão global226 foi rejeitada e restaurada para225. Aplicar novo padrão somente à tela inicial Diretor de Operação, identificada pelo título exato. Cabeçalho intenso roxo, conteúdo branco arredondado, linhas próximas com divisória cinza, texto/ícones/voltar cinza em repouso; interação na cor original de cada cartão. Classe operations-layout-pilot removida ao mudar o título; subcadastros financeiros e demais telas preservam225.

- Última correção do piloto: somente inversão de cores do cabeçalho no Diretor de Operação. Fundo roxo escuro#5520ad; texto/ícones/contornos roxo claro#f0e8ff, sem placa branca. Mantida a geometria publicada227; descartada a proposta não publicada de alterar os cantos inferiores.

- Paleta final do piloto: cabeçalho usa o roxo padrão de origem --panel-color (#7c3aed), não#5520ad. Textos e controles claros derivados da mesma cor (14% roxo+branco). Ícones de cada cartão preservam fundo na cor original --card-color e símbolo branco em repouso e seleção. Sem alterações nos demais módulos.

- Menus iniciais de navegação: remover A/Z de todas as grades de atalhos record-grid (Diretor de Operação, Gestão de Pessoas e equivalentes). Ordenação por arrastar permanece. A/Z de listas de registros como Cargos, Contas e grupos permanece. A fábrica menu-order.js deixa de criar o controle em grades de navegação.

- Menus iniciais em área integral: ao abrir uma grade de navegação, ocultar a barra lateral recolhida e ocupar100% da largura disponível. O botão Abrir menu restaura a navegação. Seis pontos de arraste integrados à mesma linha antes do ícone, sem quadro separado nem sobreposição. Marcação data-navigation-menu somente em grades de atalhos; listas financeiras preservadas. Conferir entrada, saída e reabertura.

## Layout aprovado compartilhado — revisão232
Substitui o escopo restrito do piloto: todas as abas usam cabeçalho intenso na cor de origem, texto claro, quadro branco arredondado, separadores cinza e fundo de respiro cinza claro #f5f5f7 (mesmo cinza do canvas). Ícones com largura e altura iguais e sem encolhimento; ícone do cabeçalho com contorno branco. Grades de navegação são listas compactas; cadastros preservam sua hierarquia, formulários e ações. Matriz:19 views existentes (17 com panel direto, painel de prioridades de people e cartões process), navegação, cadastros financeiros, cargos/salários, fichas simples/completa/patrimônio/configuração, resumo e relatórios. Validar geometrias compartilhadas de todas as views e interação em navegação, grupos, Cargos e formulário antes de publicar.

- Menu: rolagem vertical nativa dentro de .nav, com pan-y nas opções e arraste somente nas alças. Reconciliar abertura mesmo se o estado foi interrompido. Arraste cancelado ao perder foco/ocultar aba limpa ouvintes e animação e restaura a ordem. Na prévia, rolagem do menu foi145→0 sem erro do app; congelamento relatado no iPad não foi reproduzido no navegador remoto.
