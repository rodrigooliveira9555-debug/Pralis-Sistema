# Validação do padrão compartilhado

## Revisão 306

-31 destinos móveis: personalização compacta, recuos direito/inferior8px, títulos/caminhos#ffffff e opacidade1. Operadoras e Contas confirmadas também em abertura isolada.
-31 destinos desktop: controle final a14px da borda direita, barra58px e textos#ffffff/opacidade1. Menu compacto a14px da lateral e da barra.
-Reabrir depois de expandir e fechar retornou ao compacto60px.
-Seis buscas (Gestão de Pessoas, Cargos, Atualização salarial, Ficha de Cargos, Despesas e Contas) abertas e fechadas em390px/1024px, com foco no campo. Desktop: lupa sem deslocamento; campo/contorno na mesma largura. Celular: campo337x32px, apenas lupa restante, barra58px. Margem financeira legada12px removida.
-Oito editores financeiros: barra58px, controle final a8px da lateral e título branco. Diálogo Área: menu compacto, recuos8px e título branco. Tema escuro de Contas manteve branco puro/opacidade1.
-SVG dos controles com2,2px computados. Marcas e animação preservadas. Nenhum dado real alterado. Conferência em navegador remoto, sem aparelho físico.

Referência: dossiê DOSSIE_INTERFACE.md. Matriz:20 estruturas de tela e 31 destinos de conferência, usando as funções nativas de navegação na prévia, sem alterar cadastros reais.

## Medições concluídas

-390 x 844:31 destinos; todos com uma barra inferior de 58px, base em 844px, largura de 390px, exatamente um rodapé e conteúdo contido na largura útil.
-1024 x 844: os mesmos 31 destinos; nenhum transbordamento lateral no conteúdo, exatamente um rodapé e barra de 58px.
- Destinos: Painel, Processos, Registros, Colaboradores, RH, DP, Pré-fechamento, Relatórios, Grupo de despesas legado, Lançamento, Visão geral, Gestão de Pessoas, Diretor de Operação, Cadastro completo, Cadastro simples, Patrimônio, Configurar, Cargos/lista e editor, Atualização salarial, Ficha de Cargos, Localização, Organograma e os 8 cadastros financeiros.
- Cores computadas: DES vermelho 239/68/68; MER verde 34/197/94; RET azul 37/99/235; VND/tipos/bandeiras/operadoras amarelo 234/179/8; CNT laranja 249/115/22; Gestão de Pessoas roxo 124/58/237.
- Calendário móvel: recuos direito e inferior 8px, fundo roxo na tela de referência, campos 180 x 32px em linhas separadas, sem sobreposição.
- Busca de Cargos: campo original reposicionado na barra; consulta padeiro retornou Padeiro e Mestre Padeiro; Escape recolheu o campo.
- Salvar no rodapé do editor de Cargos: validação nativa bloqueou o envio sem Nome. Nenhum cargo foi criado no teste.
- Cabeçalho oculto no editor: display:none e afastamento superior 14px preservado.
- Colaboradores e Pré-fechamento: transbordamentos iniciais de 498/460px no viewport 390px corrigidos por contêiner de rolagem da tabela, mantendo página e conteúdo em 390px.
- Diálogo Área: removidas margens negativas legadas que cortavam título e ícone. Moldura limitada à largura do celular.

## Alcance

Verificação final de regressão: cabeçalho oculto com margem superior0px e padding14px; A/Z crescente e decrescente confirmadas nos5 cartões; calendário bloqueou data final anterior à inicial, Limpar e Fechar funcionaram. Os comandos nativos são isolados por título de destino para não reaparecerem em outra tela.

Conferências complementares: oito editores financeiros abertos no celular, todos com campos nativos, check Salvar delegado e conteúdo 390px; comando do Organograma não permanece ao voltar para Gestão de Pessoas. Personalização ocultou/restaurou Imprimir; compacto 60px ocultou todos os nomes; calendário abriu e fechou. Busca móvel ocupou 337px, com somente a lupa restante na barra 390px. Tema alternado; cabeçalho oculto indicou branco em theme-color e rodapé branco. Salvar sem nome foi bloqueado pela validação nativa.

Essas conferências verificam estruturas e comportamentos compartilhados. Não representam revisão de cada cadastro preenchido, cálculo comercial, integração futura ou aparelho físico. Safari/iPhone real e o vinho da interface externa do navegador não foram reproduzidos neste ambiente. O preenchimento da página e theme-color continuam acompanhando a faixa visível e pedindo branco quando oculta.


## Revisão307
- Reproduzido gap8px em panel.form-demo, que reduzia o encaixe de12px das curvas para4px. Removido no shell compartilhado; conteúdo mantém recorte arredondado e isolamento.
- Inventário20/20 estruturas: um rodapé, gap0, calendário disponível e sem transbordamento lateral. Varredura geométrica320/390/1024px confirmou cabeçalho estável e identidade protegida ao rolar. A primeira rotina rápida de calendário apresentou medições antes da conclusão dos observers; repetição aguardando o layout confirmou20/20 abas em390px com abertura/fechamento, limpar e recuos8/8px, cabeçalho aberto e oculto.
- Oito editores financeiros abertos em390px: DES/MER/RET/VND/Contas/Tipos de Venda/Bandeiras/Operadoras. Todos com formulário nativo, gap0, recorte12px, rodapé58px na base844px, calendário disponível e sem overflow horizontal.
- Diálogo Cadastrar Área: cabeça e conteúdo limitados à moldura, janela de datas232x134px, recuos8/8px. Nenhum registro salvo.
- Cadastro completo320px: alternância1→2→3→4→1, aria-current e painel correspondente corretos, quatro círculos32x32 com mesmo eixo horizontal e rótulos contidos em cada coluna. Desktop1024px/tema escuro: quatro círculos42px, cabeçalho#fff e calendário roxo com recuos14/14px.
- JavaScript alterado conferido com node --check;21 asserts existentes de validação passaram; git diff --check sem erros. Sem Safari/iPhone físico ou teclado virtual real. Fixture em tests/registration-review.html, fora da publicação.


## Revisão308 — tema e rodapé do usuário
Prévia390x844: alternância pelo botão real Luz/Sombra e navegação pelas20 estruturas de tela, mais destinos despesas, mercadorias, retiradas, vendas e contas. Superfície e rodapé escuros rgb(34,33,40), texto rgb(242,241,246), campos visíveis dos cadastros rgb(48,47,55). Retorno ao claro confirmado. Cabeçalho principal de Pessoas mantém texto branco. Rodapé do usuário58px, avatar32px, alinhamento vertical ao centro; recuo8px móvel e14px em1024x844. Preservadas as regras307 de cadastros, etapas e calendário; sem nova alteração nesses componentes. Navegador de prévia, sem aparelho físico.


## Revisão309 — alinhamento do menu
Prévia390x844 e1024x844: avatar32px em x28, igual à origem da faixa colorida e do antigo primeiro círculo; grupo superior à direita com borda final em361px/995px, igual ao fim roxo da faixa. Rodapé permanece58px, centro do avatar em815px, espaçamento8px entre círculos. Alteração restrita ao menu principal.
