# CICLUZ - Dossiê do padrão de interface

Atualização306: o menu de personalização abre sempre contraído, independentemente do último modo; expansão vale somente para a abertura atual. Os comandos usam posições explícitas à direita. Busca com margem0 e contorno dentro do próprio campo; cabeçalhos com texto#ffffff/opacidade1, ícones internos com traço2,2px. Essas regras substituem os estados e medidas anteriores correspondentes.

Referência: Gestão de Pessoas. Consolidação em 1 de novembro de 2026, horário de Brasília. Base de origem: publicação 303; ajuste da busca do menu publicado na 304. Abrangência autorizada: todas as telas internas e seus cadastros, preservando o menu principal. Este documento registra o padrão atual, as decisões substituídas e o mapa de aplicação.

## 1. Objetivo e limites

Transformar o layout aprovado em Gestão de Pessoas em um componente compartilhado. A mesma organização deve acompanhar navegação, listas, fichas, formulários e janelas internas. A cor de cada módulo e as ações próprias de cada cadastro continuam sendo suas referências funcionais. A padronização não cria dados, indicadores, cálculos ou integrações que ainda não existiam.

O menu principal fica fora da migração visual. A única mudança adicional nele foi solicitada separadamente: igualdade do afastamento vertical da busca, 8px acima e 8px abaixo. Logomarca, seis cores, linhas, luz, expansão, grupos, ordem e tema desse menu são preservados.

## 2. Enquadramento e rolagem

- Aplicativo limitado ao espaço útil da janela, com 100% da largura disponível nas telas internas. Sem a antiga faixa lateral recolhida consumindo espaço; a marca do rodapé abre o menu principal.
- Estrutura em três regiões: cabeçalho superior, conteúdo central e cabeçalho inferior/rodapé. Cabeçalho e rodapé permanecem visíveis; somente o centro rola verticalmente.
- No celular até 600px, painel ocupa toda a largura e altura disponíveis. Sem margens externas de desktop e sem reserva cinza adicional sob o rodapé. Áreas seguras do aparelho continuam consideradas.
- Não permitir que a página inteira deslize lateralmente. Tabelas extensas usam uma região própria de rolagem horizontal; a matriz de Ficha de Cargos mantém sua rolagem e sua primeira coluna próprias.
- Campos móveis preservam fonte 16px para evitar o aumento automático ao tocar no iPhone; o zoom manual do navegador não é bloqueado.
- Contornos e recuos não mudam ao abrir ações, busca, filtros ou menus. Textos e campos permanecem dentro da moldura.

## 3. Cabeçalho superior

| Elemento | Padrão consolidado |
| --- | --- |
| Fundo | Cor intensa do módulo atual, herdada do acento da tela |
| Identidade | Ícone à esquerda; título e caminho ao lado |
| Ícone | Círculo branco de 30px; símbolo vazado na cor do cabeçalho |
| Título compacto | Montserrat 14px, entrelinha 18px, seminegrito |
| Caminho/subtítulo | Montserrat 9px, entrelinha 12px; linha compacta com reticências |
| Altura de referência |58px no desktop; no móvel considera também a área segura |
| Recuos |6px no topo, 14px nas laterais e 18px na base no desktop |
| Cantos |20px no painel de desktop; topo do aplicativo móvel acompanha a borda da tela |
| Encontro com o conteúdo | Conteúdo sobreposto 12px, com curvas de 20px e reta central |

Os comandos saem da faixa colorida e ficam no rodapé. O título completo permanece no atributo de descrição acessível. A identidade de cada tela e as logomarcas bancárias já existentes não são substituídas por um ícone genérico.

## 4. Ocultar e restaurar o cabeçalho

- Seta única na extremidade direita do rodapé, sem círculo, controla exclusivamente o cabeçalho superior.
- Ao ocultar, desaparecem título, caminho, ícone e toda a faixa colorida. Não deve sobrar uma faixa roxa/colorida no topo.
- O centro conserva 14px de afastamento interno superior, respeitando a área segura. Não encostar as informações na borda.
- A seta continua acessível e inverte o sentido. Outro clique restaura a identidade.
- Ao mudar de destino ou retornar pelo menu, a identidade começa aberta. Recolhimento não deve vazar de um cadastro para outro.
- A ação não recolhe os registros da lista nem muda a largura do conteúdo; são controles independentes.

## 5. Cabeçalho inferior e contornos

| Elemento | Padrão consolidado |
| --- | --- |
| Superfície | Branca |
| Altura mínima |58px |
| Símbolos de ação | Botões circulares 32 x 32px; SVG 20px; traço 1,8px |
| Cor em repouso | Círculo no cinza de navegação, símbolo branco |
| Marca | Símbolo CICLUZ colorido 32 x 32px, sem círculo externo |
| Extremidade esquerda | Marca abre o menu principal |
| Grupo direito | Busca, ações disponíveis, personalização e seta final |
| Entre círculos |7px no grupo de ações;5px no celular |
| Recuo dos painéis |14px desktop;8px até 600px, medidos a partir do rodapé |
| Divisória |1px no token cinza da linha inferior, sem sombra |
| Linha superior | Reta no centro, duas curvas ascendentes de 20px nas extremidades |

Todos os centros dos círculos e a marca compartilham o mesmo eixo horizontal. A seta de ocultar/restaurar é a exceção sem círculo. Se houver mais comandos que a largura disponível, somente o grupo de comandos rola na horizontal; marca e controles finais permanecem acessíveis.

O cinza efetivo usa o token compartilhado --navigation-ink. Na referência atual em tema claro, a cor computada é#a2a0aa; no tema escuro segue a definição própria do sistema. A cor antiga solicitada para a arte da marca foi#a1a0a8; não confundir o arquivo da arte com a regra computada dos controles.

## 6. Estados dos botões

- Repouso: círculo cinza, desenho branco.
- Ativo/aberto: inversão clara, com fundo branco e desenho/contorno cinza; retorno ao estado anterior ao fechar.
- Acionamento: feedback breve de 220ms, sem mudança de tamanho.
- Indisponível: estado desabilitado preservado e opacidade reduzida. Não disparar uma ação nativa desabilitada.
- Oculto na preferência: retirado da barra, mas disponível no menu de personalização para reativação.
- Foco por teclado: contorno visível; Enter/Espaço continuam acionando botões. Escape fecha busca/calendário/menu quando aplicável.
- Filtros de métricas preservam suas cores próprias e indicação de estado.

## 7. Busca no rodapé

No computador, a lupa permanece na posição e o campo abre à sua esquerda, dentro da faixa branca. O campo respeita a distância da marca e o espaço até a lupa; tem limite 340px e altura 32px. Sua moldura retangular tem cantos arredondados e a animação colorida aprovada. O círculo da lupa não recebe o ciclo de cores quando fechado.

No celular, a busca ocupa a barra branca: campo à esquerda e lupa à direita. Marca e demais comandos somem enquanto o campo está aberto. Não criar uma segunda barra sobre o cabeçalho nem empurrar o campo para fora da tela. O texto usa 16px e a largura flexível não ultrapassa o espaço disponível.

A busca de registros usa o campo e o filtro nativos do cadastro, preservando eventos, categorias e vínculos. Em grades de navegação, pesquisa nomes e descrições sem diferenciar acentos. Fichas de edição sem consulta própria não ganham uma busca artificial de registros. Ao sair, o campo da barra é recolhido. No menu principal, a busca é transitória e limpa ao navegar.

## 8. Menu de personalização do rodapé

- Acesso pelo círculo de três pontos, penúltimo controle fixo.
- Modo expandido: moldura externa branca, contorno cinza, quadro interno cinza com linhas contíguas. Faixa superior cinza com círculo branco de três pontos e título Botões do cabeçalho inferior.
- Cabeçalho do quadro repete o recorte branco inferior, com curvas nas duas pontas. Sem sombra.
- Recuo interno 14px; contorno 1px; quadro interno com raio 10px; externo com raio 14px.
- Cada linha contém alça de seis pontos, símbolo circular 30px, descrição alinhada e check quadrado 30 x 30px à direita. Textos usam Montserrat 12px/18px.
- Os checks usam o mesmo desenho do check de Salvar. Ativos com opacidade 100%; inativos 35%.
- Clique no check alterna a presença na barra. Clique no símbolo/descrição executa a ação, inclusive se estiver oculta na barra.
- Alças permitem ordenar com arraste e com setas para cima/baixo. A ordem é preservada para a tela.
- Seta lateral única no cabeçalho contrai para um retângulo branco vertical de 60px, contendo somente símbolos. Nomes, alças e checks somem.
- No compacto, ações que já estão na barra ficam mais opacas; as demais ficam vivas. Os símbolos continuam executando suas funções.
- Outro clique na seta restaura as descrições. Os três pontos fecham o painel inteiro, sem quadro residual ou área de toque invisível.
- Marca, personalização e controle de cabeçalho não entram na ordenação opcional.

## 9. Comandos e funções

| Comando | Desenho/estado | Função preservada |
| --- | --- | --- |
| A/Z | A/Z compacto | Primeiro clique crescente; seguinte decrescente; mantém hierarquia e ativos antes dos inativos |
| Expandir/recolher | Dois chevrons verticais separados | Abre/recolhe os níveis existentes; usa o controlador nativo quando presente |
| Maior/menor | Dois chevrons horizontais separados | Alterna largura interna 100%/80%; não é zoom nem filtro percentual |
| Salvar | Somente check | Aciona o salvamento nativo e sua validação; em tela sem dados a salvar, guarda a configuração visual |
| Imprimir | Impressora SVG | Abre a impressão do conteúdo atual; controles de navegação não devem compor a impressão |
| Importar/exportar | Setas entrando/saindo | Transporta a configuração da barra em JSON, não os dados comerciais ou de colaboradores |
| Voltar | Chevron à esquerda | Mantém o retorno real do cadastro/etapa |
| Fechar | X | Mantém o fechamento e o destino nativos |
| Adicionar/atualizar/histórico | Símbolos originais | As ações específicas do módulo passam para a barra com suas funções preservadas |

A antiga ideia de+80%/-80% como filtro foi substituída pelos filtros de métricas. Nenhum controle de zoom de 180% permanece como essa função.

## 10. Filtros coloridos

| Código | Cor | Alternância |
| --- | --- | --- |
| VND | Amarelo#eab308 | Mais vendido / menos vendido |
| COM | Verde#22c55e | Mais comprado / menos comprado |
| LUC | Azul#2563eb | Mais lucro / menos lucro |
| RES | Roxo#7c3aed | Mais resultado / menos resultado |

Descrições seguem Organizar por + vendido / - vendido e equivalentes. Essas ações só ordenam indicadores existentes; ausência de dados é informada, sem assumir zero, inventar vendas, compras ou lucros. Formulários sem lista não recebem filtros de métricas. Valores e regras financeiras não são alterados pela padronização.

## 11. Busca por data

- Calendário abre um painel compacto fixo acima do rodapé, alinhado à direita.
- Afastamentos lateral e inferior usam exatamente o mesmo token do menu:14px desktop e 8px celular. Não usar margem 10px independente.
- Largura 232px, limitada à largura útil do rodapé; padding 10px; raio 10px; sem sombra.
- Fundo inteiro na cor do cabeçalho atual. Somente os campos de data são brancos; rótulos De e Até são brancos.
- Campos em duas linhas, um por linha, sem sobreposição. Rótulo 24px, intervalo 6px, campo flexível; altura 32px, fonte 16px, raio 6px.
- Três ações centralizadas em círculos 32px brancos, com desenho vazado na cor do painel: lupa, vassoura vertical e X. Mesmo ritmo de espaçamento do rodapé.
- Buscar exige as duas datas e bloqueia final anterior ao início. Intervalo inclusivo. Limpar remove as datas e o filtro. X/Escape fecha o painel.
- Filtrar apenas registros com data explícita. Em atalhos sem data, informar que não há data para filtrar.
- O painel não se desloca ao rolar o centro. Ao redimensionar, sua posição é recalculada a partir do rodapé.

Essa definição substitui o estágio intermediário do painel todo branco com círculos cinza.

## 12. Cores de origem e áreas do celular

| Origem | Cor de cabeçalho |
| --- | --- |
| Vendas e tipos/bandeiras/operadoras | Amarelo#eab308 |
| Contas e transferências | Laranja#f97316 |
| Despesas | Vermelho#ef4444 |
| Mercadorias | Verde#22c55e |
| Retiradas | Azul#2563eb |
| Resultados, configurações e Gestão de Pessoas | Roxo#7c3aed |

A cor superior externa procura acompanhar o cabeçalho visível, inclusive o tema do navegador quando ele respeita theme-color. Menu principal e cabeçalho oculto pedem branco; a base pede branco. Alterações de rota, retorno da aba, redimensionamento e ocultação devem atualizar essa indicação.

Limite de verificação: o vinho relatado no aparelho não foi reproduzido na inspeção em Chrome com largura móvel. A página controla seu preenchimento e a indicação de tema, mas a interface externa do navegador pode variar. Não registrar o problema como confirmado no aparelho físico sem essa conferência. As correções de 303 retiram a faixa colorida quando o cabeçalho é ocultado.

## 13. Marca, luz e linhas do menu preservadas

- Usar a arte aprovada da CICLUZ, sem redesenhar contornos, letras ou proporções.
- Linha colorida substitui somente a primeira divisória do menu, mantendo seu alinhamento. As demais continuam cinza, com a mesma espessura física.
- Espessura compartilhada atual 3px, sem halo exterior. A faixa e a marca permanecem visíveis enquanto as opções rolam.
- Espectro intenso com vermelho, laranja, amarelo levemente fechado, verde, azul e roxo, derivado da marca.
- Luz branca percorre o contorno da marca e a linha com o mesmo perfil e relógio, preservando velocidade em pixels e ritmo comum.
- Perfil compartilhado de cinco camadas, núcleo mais largo e cauda gradual. A luz ultrapassa lateralmente o eixo para cobrir as curvas, mas o recorte respeita a arte.
- No estado atual, as camadas usam comprimentos 42/34/26/18/12, opacidades 0,08/0,16/0,28/0,48/0,88 e larguras 5,4/5,7/6/6,3/6,6 na geometria do componente.
- Preferência de reduzir movimento é respeitada. Esse desenho não é alterado pela migração das telas internas.

## 14. Inventário das estruturas de tela

Uma estrutura pode mostrar vários destinos lógicos ou registros. Não confundir 20 estruturas com apenas 20 páginas de conteúdo.

| Estrutura | Conteúdo/função |
| --- | --- |
| people | Painel e pendências, fila de prioridades |
| process | Etapas de Gestão de Pessoas |
| records | Lançamentos e registros |
| team | Colaboradores |
| rh | RH |
| dp | Departamento Pessoal |
| pre | Pré-fechamento DES |
| reports | Relatórios |
| groups | Grupo de despesas legado |
| launch | Nova despesa/lançamento |
| overview | Visão geral |
| sector-view | Destinos por setor, navegação e cadastros compartilhados |
| cadastro-completo | Quatro etapas e dependentes |
| cadastro-simples | Cadastro inicial de admissão |
| asset-view | Cadastro de patrimônio |
| config-view | Configurar legado |
| jobs-view | Lista de cargos |
| job-edit | Cadastro e edição de cargo |
| salary-view | Atualização salarial |
| job-profiles-view | Quadro por área e ficha individual de cargos |

## 15. Destinos que reutilizam as estruturas

- Configuração: Gestão de Pessoas e Diretor de Operação.
- Gestão de Pessoas: Organograma; Área/Setor/Local/Sublocal; Cargos; Atualização salarial; Ficha de Cargos.
- Diretor de Operação: DES, MER, RET e VND (grupos/subgrupos), Tipos de Venda, Bandeiras, Operadoras e CNT Contas. Cada lista e seu editor usam a mesma estrutura, com acento próprio.
- Operadoras: cadastro e quadro de taxas por bandeira, vigência, condições e classificações. O quadro vermelho interno e vínculos de conta/despesa permanecem preservados.
- Formulários: Diretor de Operações e Gestão de Pessoas; Patrimônio, Cadastro simples, Cadastro completo e Dependentes.
- Agenda: Gestão de Pessoas e Diretor de Operações, inclusive destinos ainda previstos na estrutura.
- Setores financeiros: Caixas/Gerência/Financeiro em Entradas; Tesouraria/Financeiro/Diretor Geral em Transferências; Gerência/DP/Fiscal/Financeiro/Diretor Geral em Despesas; Gerência/Compras/Diretor de Operações/Financeiro/Diretor Geral em Mercadorias; Financeiro/Diretor Geral em Retiradas; Gerência/Diretor de Operações/Financeiro/Diretor Geral em Resultados.
- Janelas: cadastrar/editar os quatro níveis de localização; posição do organograma; área, vínculo de cargo e exigências da ficha; histórico e preservação/transferência; modal legado de registros. Preservar suas validações e confirmações.

Destinos previstos sem dados também recebem o enquadramento e a barra compartilhada. A migração visual não transforma uma área prevista em um módulo operacional concluído.

## 16. Regras de aplicação

O código do piloto foi generalizado como uma única fábrica, montada quando uma tela é aberta. Ela reutiliza as ações nativas por delegação e os próprios campos de busca por reposicionamento, preservando handlers, validação, nomes e IDs. Formulários continuam salvos pelas funções existentes. Ações que não se aplicam à tela não são exibidas como se fossem operacionais.

Configurações de visibilidade, ordem e largura são isoladas por destino. A tela original mantém suas chaves anteriores. O formato novo de exportação é de configuração visual; o formato anterior continua aceito. Não mover registros entre pais ou cadastros ao restaurar uma ordem; cada contêiner mantém seus próprios filhos.

Fontes de implementação: people-header-pilot.js e.css (componente compartilhado), sticky-headers.js (buscas e filtros nativos), navigation-layout.css (único ajuste do menu), mobile-edge-colors.js/.css (cores móveis), tokens de ui-foundation.css e demais componentes existentes.

## 17. Conferência e aceitação

A conferência distingue navegação/medição, inspeção visual e teste de função. Abrir uma estrutura não prova cada registro existente nem um aparelho físico. A matriz deve verificar: rodapé fixo, faixa superior, ausência de overflow da página, centros dos ícones, curvas, abertura/fechamento dos painéis, preferência de visibilidade e ordem, busca e filtros, validações de Salvar, navegação de retorno, cabeçalho oculto/restaurado, claro/escuro e largura móvel/desktop.

As tabelas largas de Colaboradores e Pré-fechamento foram identificadas no teste móvel e receberam contenção de rolagem própria. Os diálogos receberam ajuste específico de enquadramento para remover margens legadas negativas do cabeçalho. A verificação final da implementação e a identificação da publicação ficam no registro de validação que acompanha este dossiê no repositório.

Não executar exclusões, transferências ou gravações em dados reais durante os testes. Dados fictícios usados na prévia não fazem parte da publicação.

Resultado de conferência:31 destinos em 390 x 844 e os mesmos 31 em 1024 x 844, cobrindo 20 estruturas. Todos apresentaram um único rodapé e conteúdo contido na largura disponível. Os oito editores financeiros também foram abertos no celular. Busca nativa, validação de Salvar, calendário, menu expandido/compacto, visibilidade de Imprimir e ocultação/restauração do cabeçalho foram conferidos separadamente. Teste em navegador remoto; nenhum aparelho físico foi verificado.
