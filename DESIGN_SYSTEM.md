# CICLUZ — referência de interface

## Regra vigente — tela de entrada e avisos de sincronização (03/11/2026)
A tela de entrada (`entrar.html`) segue o padrão das abas internas, com duas exceções registradas. 1) O quadro fica centralizado com no máximo 420px, e não na largura total: é uma tela de uma ação só. 2) O texto e o símbolo do cabeçalho superior são brancos nos dois temas: a superfície escura sobre o roxo dá 2,8:1 e reprova no WCAG AA. Esta exceção vale só para a entrada. **Pendente para o Rodrigo:** a mesma conta reprova a regra geral "texto na superfície do tema" no escuro (doc 10 do PROJECT_BRAIN). No escuro, o acento usado como texto, borda ou foco clareia para #b197fc. O aviso de sincronização fica acima dos rodapés, com cantos de 12px, controles de 42px e botão Fechar. Botão Sair do rodapé do usuário: círculo de 32px com contorno cinza, como os controles superiores do menu.

## Regras vigentes — contornos, diâmetro e etapas (03/11/2026)
Abrir Tipo de Venda usa o papel editor-field-action: contorno neutro de1px, raio --ui-field-radius8px, altura42px e fundo do tema, seguindo os campos; foco e hover indicam interação sem alterar o enquadramento. Ações Salvar/Cancelar e quadros coloridos preservam seus papéis.

Identificadores à esquerda de todos os cabeçalhos, inclusive Taxas e classificações da operadora, ficam limitados à circunferência padrão30px. Área interna inscrita de21px protege os cantos do desenho, sem recortá-lo. Substitui o tamanho38px de Taxas. Títulos principais16px, títulos internos14px e subtítulos11px seguem tokens compartilhados; eliminar o subtítulo excepcional9px.

Cadastro completo/dependentes: câmeras maciças na cor de origem com símbolo na superfície do tema. Indicadores de todas as etapas seguem o mesmo padrão: acento100% na etapa ativa e mistura38% com a superfície nas demais. Números mantêm a cor do fundo e opacidade total. A fotografia continua indisponível enquanto não houver conexão.

## Complemento vigente — cabeçalhos internos da operadora (03/11/2026)
Taxas por bandeira e títulos de classificação seguem o cabeçalho superior: texto e símbolo na superfície do tema, identificadores sem placa/borda e símbolos ocupando o diâmetro anterior (38px em Taxas,30px na classificação). Faixas coloridas e marcas das bandeiras permanecem preservadas.

## Regra vigente — datas sem ícone (03/11/2026)
Campos de data usam somente digitação DD/MM/AA, sem ícone/acionador de calendário interno nem reserva lateral para ele. Preservar valores ISO completos, validação, datas existentes e dimensões dos demais campos. Substitui as instruções anteriores de calendário nos campos.

## Regra vigente — cabeçalho superior sem placa no ícone (03/11/2026)
Texto, título e caminho do cabeçalho superior usam a superfície do tema: branco no claro e escuro no escuro, sobre o fundo colorido preservado. Identificador superior perde fundo, borda e sombra; o símbolo ocupa30px, o diâmetro total da placa anterior. Esta regra substitui o cinza dos textos e o círculo dos identificadores superiores. Menu inicial, conteúdo e rodapés mantêm o padrão já confirmado.

## Regra vigente — ícones maciços e contorno da aba (03/11/2026)
Substitui a inversão anterior: ícones de menus e conteúdo têm corpo maciço na própria cor e símbolo na superfície do tema. Os controles circulares do rodapé usam a cor do cabeçalho com símbolo na superfície; esta confirmação substitui o pedido intermediário de cinza no rodapé. Os três controles superiores do menu inicial continuam com contorno e símbolo cinza e centro transparente. Identificadores dos cabeçalhos mantêm seu tratamento anterior. Marcas reais permanecem preservadas.

Nas abas internas, o contorno externo arredondado de12px pertence à tela. O cabeçalho tem cantos internos inferiores arredondados; o rodapé tem cantos internos superiores arredondados. A superfície externa acompanha a cor do cabeçalho no topo e do rodapé na base, sem recortes pretos. Menu inicial excluído.

## Regra vigente — realce e quadros independentes (03/11/2026)
Substitui o preenchimento cinza dos ícones nas abas internas. Menus principais, submenus, grades e listas realçam fundo e texto na cor do próprio item ao passar o mouse/focar, em ambos os temas; mistura12% no claro e20% no escuro. Ícones de identificação e controles internos têm contorno/símbolo coloridos e centro na superfície branca/escura. Cores personalizadas e arte das marcas são preservadas. Exceção expressa: os três controles circulares superiores do menu inicial usam contorno/símbolo cinza e centro transparente, inclusive com a busca aberta.

Cabeçalho superior mantém a cor da aba, conforme confirmação do usuário. Superior, conteúdo e inferior formam retângulos independentes com quatro cantos de12px, sem curvas côncavas/sobreposição, separados por6px. Cabeçalhos ocupam a largura integral do viewport, inclusive no desktop; recuos internos14px preservados. Faixas móveis antigas não podem cobrir os cantos. Safe-area é atendida pelo próprio cabeçalho/rodapé.

Situação do Grupo/Conta/Operadora e outros blocos agrupados usam --theme-card também na regra de formulários de maior prioridade, eliminando o branco residual no tema escuro. Datas DD/MM/AA, valores ISO completos, validação e persistência permanecem como antes.

## Regra vigente — menu, cinza e datas (02/11/2026)
Substitui os pedidos anteriores de círculos vazados/símbolos cinza. Controles circulares de contorno cinza, avatar, checks e biblioteca ficam maciços em --navigation-ink; o desenho/texto interno usa a superfície por trás (branco no claro, escuro no escuro, acento em faixas coloridas). Estados ativos/hover mantêm essa inversão. Marcas reais e identificadores de origem preservam suas cores. Cabeçalhos principais e internos, títulos e caminhos usam o cinza dos textos do menu; identificadores antes brancos ficam cinza com desenho na cor do cabeçalho.

Menu inicial: três respiros visuais de aproximadamente12px entre topo útil/marca, marca/faixa e faixa/Gestão. A faixa sobe de92px para68px, sem redimensionar a arte; controles acompanham seu centro. Busca aberta preserva8px acima/abaixo. Safe-area fica fora do topo útil.

Datas: exibir DD/MM/AA, oito caracteres, com barras automáticas e calendário. Valores usados em filtros, FormData, salários e cadastros continuam ISO com ano completo. Datas já existentes preservam o século; entradas novas usam00–49 para2000–2049 e50–99 para1950–1999, e o calendário permite selecionar o ano completo. Não aceitar datas impossíveis nem intervalos invertidos. Backup do cadastro completo mantém o formato anterior e não duplica os campos visuais.

Seletores fechados e suas opções seguem o tema, inclusive nos oito cadastros do Diretor de Operação. Sincronizar color-scheme no html; opções não dependem de transparência ou do tema externo do navegador.

## Campos contidos e controles neutros — 02/11/2026
Substitui círculos inferiores maciços e símbolos brancos: controles do cabeçalho inferior, métricas, personalização, checks e avatar do usuário ficam vazados, com borda/símbolo no cinza --navigation-ink e interior mostrando o fundo atual. Preservar a arte multicolorida da marca. Estados pressionados/expandidos não introduzem placas brancas.

Datas mantêm máscara/calendário nativos e recebem a mesma caixa dos campos: altura42px, raio8px, borda1px; limitar também min-inline-size, conteúdo interno WebKit e largura ao contêiner, incluindo dependentes, admissão e vigências. Calendário compacto do rodapé mantém altura própria32px. No escuro, superfície, cartões e campos usam o mesmo fundo escuro; só a borda delimita o preenchimento, sem halo fora da célula. Select/checkbox/calendário seguem color-scheme do tema; taxas e busca não mantêm campos ou controles brancos.

Cancelar e Voltar são transparentes em ambos os temas; Salvar e Avançar usam o acento quando ativos e ficam transparentes quando desabilitados. Contas aplica a cor laranja do cartão no contêiner e painel, eliminando a cor residual da tela anterior. Busca inicial tem a mesma largura/eixo da faixa colorida e8px entre faixa/campo e campo/texto Gestão, sem somar padding do título.

## Correção de referência e tema escuro — 02/11/2026
Substitui os detalhes conflitantes da validação anterior. Data salarial mantém type=date, calendário e máscara própria; compartilha a mesma regra de caixa dos valores: altura42px, raio8px, padding10px, borda1px e alinhamento à direita. Mesma coluna nas duas áreas, com largura móvel entre140 e160px para não cortar a data. Grupo de Despesa/Grupo de Contas usam os tokens de título de seção14/20px, peso600, iguais ao cabeçalho interno Taxas por bandeira; não comparar esses títulos com o cabeçalho principal16px.

Gestão é um controle fixo fora de .nav; somente os itens do menu aceitam rolagem, preservando busca e expandir/recolher. Não depender de sticky dentro da área de toque para esta faixa. Cor de destino vem do ícone/cartão anterior; cores financeiras personalizadas também são respeitadas, e a faixa móvel não força roxo em Gestão de Pessoas.

Tema escuro: o rótulo de um campo simples permanece transparente sobre o fundo geral; somente o input/select/textarea recebe a superfície de preenchimento. Foco e contorno ficam dentro da célula, sem halo externo. Formulário completo: Voltar transparente com borda/símbolo na cor da origem, Avançar preenchido nessa cor com símbolo branco. Não alterar máscaras de dados, validações ou valores armazenados.

## Alinhamentos, opções e origem — 02/11/2026
Atualização salarial: data e valores usam a mesma largura de coluna, intervalo e recuos, incluindo a borda da lista;160px desktop e120px até600px. Operadoras: Grupo de Despesa e Grupo de Contas recebem título explícito com os tokens compartilhados de título, preservando o subtítulo Transferências Automáticas. Cabeçalhos superiores também usam esses tokens, sem escala local divergente.

Rodapé de todas as abas: marca isolada à esquerda, grupo de ações à direita com rolagem interna quando necessário, recuos laterais14px iguais aos do identificador superior, respeitando safe-area. O catálogo de personalização mantém as13 opções compartilhadas em todas as telas, além das ações nativas específicas; opções sem operação aplicável permanecem visíveis no catálogo com execução desabilitada e indicação no título, preservando preferências salvas. Esta regra substitui a omissão dessas opções e o recuo inferior móvel8px anterior.

Cor de origem: aplicar --menu-accent e --panel-color no contêiner da tela e no painel a cada entrada, inclusive ao reutilizar sector-view. Descendentes recebem a cor do cartão que os abriu; cartões financeiros com identidade própria mantêm sua cor específica. Ícones e dados cadastrados não são recoloridos por esta herança.

## Menu principal — marca, controles e rolagem (02/11/2026)
Faixa colorida imediatamente após a marca: preservar o respiro superior e usar o mesmo respiro visual até a faixa. Três círculos e seta sem círculo de expandir/recolher ficam à direita da palavra CICLUZ, acima da faixa, centralizados verticalmente entre o topo da tela e a faixa. Manter círculos32px, seta24px e intervalo8px entre controles. Esta orientação substitui a fileira abaixo da faixa. Gestão fica fixo no topo da área rolável; os itens continuam com rolagem nativa. Preservar busca, tema, expansão e usuário fixo no rodapé.

## Revisão309 — alinhamento do menu
O avatar e nome do usuário começam no mesmo eixo esquerdo dos controles anteriores e da faixa colorida: padding lateral do menu +10px. Os três controles superiores ficam agrupados à direita, com a borda do último círculo alinhada ao fim roxo da faixa. Preservar ordem, funções, tamanho32px, rodapé58px e busca8px/8px.

## Revisão308 — tema compartilhado e rodapé do usuário
O botão Luz/Sombra do menu governa as superfícies neutras de todas as telas internas e diálogos, campos, cartões, listas, tabelas, busca e rodapé. Preservar identidade colorida dos cabeçalhos, texto branco, cores semânticas e marcas. Rodapé do usuário: altura mínima58px, avatar32px, centro vertical igual à barra interna, recuos14px desktop/8px até600px, respeitando safe-area. A faixa inferior acompanha o tema; a superior acompanha a identidade visível ou a superfície do menu.

## Revisão307 — encaixe dos cadastros e calendário
O shell não herda o row-gap dos formulários: gap0 entre cabeçalho, conteúdo e rodapé. Somente a superfície arredondada do conteúdo faz o recorte visual de12px; seus filhos ficam recortados no contêiner rolável e isolados. Preservar padding14px e curvas20px. Etapas do cadastro completo em quatro colunas iguais, círculos32px no celular/42px no computador, rótulos pelo token de subtítulo, quebra contida e indicação aria-current=step. Calendário disponível por padrão em todas as abas internas e diálogos, incluindo editores; escolhas de personalização existentes são preservadas. Não atribuir datas a registros: sem datas explícitas, informar ausência de registros datados. Janela fixa com14px de recuo desktop/8px até600px, medidos da lateral e do topo da barra inferior. Recalcular pelos limites reais do rodapé, safe-area, visualViewport, rotação e redimensionamento; limitar largura e altura ao espaço disponível sem invadir a identidade.

## Revisão306 — regras de abertura e contraste
Personalização do rodapé SEMPRE abre contraída em60px, inclusive depois de fechar no modo expandido; não restaurar esse modo por preferência. Ações ocupam posições explícitas à direita, mesmo quando não existe lupa. Busca abre dentro da barra com altura32px, fonte16px, margem0, contorno limitado ao campo e lupa alinhada. Título e caminho em#ffffff/opacidade1 nos dois temas. Ícones internos usam traço2,2px e identificadores textuais peso700, sem alterar logomarcas, desenhos de animação ou conteúdo do menu principal.

## Padrão vigente de todas as telas internas —305
O usuário autorizou a extensão integral do padrão de Gestão de Pessoas às demais telas, fichas e diálogos, excluindo o menu principal. A especificação vigente está em docs/DOSSIE_INTERFACE.md, com inventário e registro em docs/VALIDACAO_INTERFACE.md. Substitui as limitações anteriores de piloto: identidade intensa recolhível, rodapé branco fixo, marca32px, círculos32px e SVG20px, menu de personalização reordenável/compacto, busca na barra móvel, calendário colorido e afastamentos14/8px. Preservar cores por origem, ações nativas e validações. O componente compartilhado usa app-screen-shell e mantém os nomes de arquivo do piloto para continuidade. Ações opcionais só aparecem quando se aplicam ao conteúdo. Menu principal recebeu somente o ajuste de busca8px/8px solicitado separadamente.

- Busca do menu principal:8px entre o campo e os círculos acima e8px entre o campo e a faixa colorida abaixo, sem somar o padding inferior dos controles ao padding superior da busca.

- Menu de data em Gestão de Pessoas: afastamentos direito e inferior iguais ao --footer-inset do menu de personalização (14px desktop, 8px até600px), medidos a partir da lateral e da linha superior do cabeçalho inferior. Posição fixa preservada.

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

### Busca no menu principal — 2026-11-01
Lupa circular ao lado do controle de tema, com a mesma cor e dimensão dos controles do menu. Abre campo de busca com foco; filtro ignora acentos. Busca é transitória: sair e retornar limpa e recolhe o campo, restaurando os grupos anteriores. Escape também recolhe.

- Controle de tema: lua crescente com contorno fechado, sem preenchimento e traço 2px para definição; manter a mesma cor e dimensão do controle.

- Lua revisada pela referência do usuário: crescente alongado, traço fino 1,3px, arco externo circular de raio 9 centrado em (12,12), concêntrico ao círculo do botão. Substitui a versão252.

## Cadastros — revisão254
Identificador do cabeçalho com contorno circular branco em Cargos e Área/Setor/Local. Setas laterais de Cargos/lista e prévias usam --navigation-ink, sem herdar a cor do item. Rodapé de Cargos: Salvar. Cadastro completo: primeira etapa só Avançar à direita; intermediárias Voltar/Avançar; última Voltar à esquerda e Salvar+check à direita, com check circular no cabeçalho. Campos do cadastro completo são guardados neste navegador com validação; arquivos não são persistidos e esse limite é informado no formulário.

- Rodapé do cadastro completo: botões com texto e símbolo, “← Voltar” e “Avançar →”, mantendo Salvar/check ao final e ocultando Voltar no início.

## Cadastro de Operadora / Taxas —256
Decisão atual: contorno branco no ícone do título Taxas por bandeira. Linhas de bandeiras sem espaço vertical nem moldura individual arredondada; divisórias cinza na moldura compartilhada. Botão inicial Adicionar vigência/condição recuado12px nas laterais e embaixo, no alinhamento do conteúdo da linha. Substitui orientação anterior de12px entre quadros e contorno cinza no cabeçalho. Marcas circulares e campos de classificação preservados.

## Moldura das bandeiras —257
Taxas por bandeira: moldura cinza visível envolvendo todas as linhas contíguas. Cantos superiores da primeira linha e inferiores da última arredondados12px, acompanhando a ordem/filtragem atual. Cabeçalho vermelho com cantos inferiores14px simétricos ao topo do painel. Divisórias internas simples e nenhum vão entre linhas.

Ícones da relação de taxas seguem o identificador de Tipos de Bandeiras Cartões, reutilizando a resolução compartilhada: marca original, SVG personalizado ou3 caracteres. Círculos30px com marca contida e recuo4px.

## Taxas — cores258
Relação de bandeiras: contorno e símbolos SVG/texto em vermelho#ef4444, mesmo círculo30px de Tipos de Bandeiras; cores das logomarcas preservadas. Condições: quadros Grupo de Despesa e Grupo de Contas inteiramente preenchidos com vermelho#ef4444 e laranja#f97316, respectivamente. Títulos/subtítulo, símbolos e contorno circular brancos. Seletores continuam brancos para leitura. Substitui fundo branco dos quadros de classificação.

## Taxas —259
Somente na relação de taxas: círculos maciços vermelhos com símbolos brancos; logomarcas preservadas. Cabeçalho secundário usa recorte côncavo inferior do conteúdo, com pontas coloridas descendo nas laterais, como o principal. Substitui arredondamento convexo inferior257. Nenhuma alteração nos tipos amarelos.

Títulos das classificações de condições seguem tokens de título: Montserrat16px, peso600 (seminegrito), entrelinha20px; Transferências Automáticas segue subtítulo11px/14px peso400.

- Revisão móvel260: fonte dos campos e buscas16px até1024px via --ui-input-size, preservando zoom manual; até600px formulários em coluna única na ordem DOM, buscas limitadas ao quadro e filtros abaixo da busca. Cabeçalhos e identidade desktop aprovados preservados.

## Ficha de Cargos261
Quadro por área com primeira coluna e cabeçalho fixos, cargos nas colunas e exigências agrupadas. Ficha individual deriva dos mesmos vínculos; formulários e cabeçalhos reutilizam os componentes existentes. Busca do quadro controlada pela lupa do cabeçalho, sem segundo controle local. Função principal com contador provisório de240 caracteres.

## Correção263 — movimento e seleção
Página e cadastros não devem deslizar horizontalmente; rolagem vertical preservada. Conter conteúdo no painel e limitar larguras dos formulários. Menu: apenas última opção tocada marcada; expansão de ancestrais não equivale a seleção. Matriz: Cadastro simples/completo, editor de cargo, menu principal e submenus. Preservar dados e ordem.

- Cabeçalho264 em todas as abas: duas faixas, identidade completa acima e comandos abaixo. Controle sem círculo à direita recolhe ícone/título/caminho; comandos e controle de reabrir permanecem fixos. Expandir restaura título sem truncamento. Recolhimento é por aba durante a sessão.

## Correção265 — título fixo e comandos centralizados
Contêiner do aplicativo fixo no viewport; documento sem rolagem, conteúdo interno preservado. Cabeçalho não aceita gesto de arraste vertical. Recolhido: uma linha de grade (eliminar segunda linha vazia e gap), centro vertical comum aos comandos e controle; padding equilibra12px de sobreposição do conteúdo. Matriz:20 cabeçalhos via regra compartilhada; conferir Cargos com rolagem e ficha em375px.

Regra265: ao entrar, retornar ou selecionar novamente uma aba pelo menu, título e ícone começam abertos; mudança de destino na view compartilhada também reabre. Não preservar recolhimento entre visitas.


## Piloto Gestão de Pessoas — círculos maciços e área móvel
Somente nesta aba: inferior com círculos cinza --navigation-ink e símbolos brancos; superior com círculos brancos e símbolos na cor do menu. Marca colorida animada preservada; recolher continua sem círculo. Até600px usar toda a área disponível do navegador, sem margens externas/reserva inferior da main; respeitar safe-area, faixas fixas e centro com rolagem vertical. Busca16px no celular.

## Gestão de Pessoas — cabeçalho inferior personalizável
Contorno superior cinza de1px segue a reta central e as duas curvas ascendentes; usa o mesmo token da borda inferior. Marca animada32×32px, sem círculo, alinhada com botões32px. A/Z reutiliza createAlphabetizeButton e alterna ordem alfabética/restauração. Três pontos são o penúltimo controle, antes da seta de ocultar/restaurar cabeçalho; painel mostra todos os controles opcionais, clique alterna visibilidade e check, escolha salva neste navegador. Marca, três pontos e seta final permanecem disponíveis. Busca com contorno no espectro exato do menu e luz via CicluzBeam compartilhado, no botão e campo aberto. Cabeçalhos fixos e conteúdo rolável mantidos.


## Menu de botões —294
Gestão de Pessoas: seta lateral única (direita para contrair, esquerda para expandir). Checks sempre desenhados à direita em quadrado30×30px, mesmo diâmetro dos símbolos à esquerda; inativos com opacidade35%, ativos100%. Moldura branca sem sombra, borda1px --layout-line e recuo14px para o quadro interno cinza, igual ao conteúdo externo. Três pontos ficam brancos somente com menu aberto; segundo clique oculta integralmente o quadro e sua interação, preservando modo expandido/compacto. Substitui checks invisíveis e respiro8px anteriores.


## Refinamento295 — menu dos botões inferiores
Gestão de Pessoas: faixa superior cinza --navigation-ink com ícone de três pontos branco e título “Botões do cabeçalho inferior”, seta lateral única preservada. Rótulos “Organizar por + vendido / − vendido”, “Organizar por + comprado / − comprado”, “Organizar por + lucro / − lucro” e novo roxo#7c3aed “+RES / −RES” para resultado. Não assumir zero onde indicador não existe. Salvar tem apenas a palavra na descrição, símbolo check separado à esquerda e check de seleção à direita. Normalizador de botões de formulário não deve reescrever controles do cabeçalho inferior. Busca inicia o grupo de ações à direita; marca permanece isolada à esquerda. Compacto mantém coluna limpa, ocultar remove completamente.

- Revisão296: menu de botões reproduz recorte inferior branco com curvas de20px em ambas as pontas do cabeçalho cinza. A/Z: Organizar de A a Z / de Z a A, alternância crescente/decrescente. Data de … a … abre início/fim no calendário nativo, Buscar valida/aplica intervalo inclusivo e Limpar remove. Filtrar apenas datas explícitas (data-date ou time[datetime]); informar ausência de datas nos atalhos. Busca abre à esquerda sem deslocar a lupa no desktop; até600px apenas campo à esquerda e lupa à direita.

- Correção301: ocultar o cabeçalho superior de Gestão de Pessoas remove a sobreposição negativa de12px, mantendo o padding compartilhado de14px. Cor móvel pertence à tela ativa mesmo com título oculto; html/body/faixa superior alinhados, mínimo6px nas faixas fixas superior/inferior e base branca. Preservar safe-area e ações inferiores. Interface externa do navegador depende do WebKit e requer confirmação no aparelho.

- Menu de datas302: janela preenchida com a cor do cabeçalho ativo via --menu-accent/--panel-color. Rótulos/mensagens brancos; campos de datas brancos e texto neutro. Três botões circulares com contorno e símbolos brancos vazados, fundo transparente mostrando a cor da janela. Substitui o branco/cinza anterior somente nessa janela. Preservar posição, recuos e dimensões.

- Correção303: no celular, ocultar totalmente o cabeçalho de Gestão de Pessoas também torna branco o preenchimento superior; restaurar devolve a cor do cabeçalho. O afastamento das informações e a safe-area permanecem. Substitui a regra301 de manter a cor mesmo oculto. No calendário, três círculos brancos maciços com símbolos na cor do cabeçalho, reproduzindo o vazado dos identificadores superiores; substitui o contorno transparente302, mantendo32px e espaçamento.
