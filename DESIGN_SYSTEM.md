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
