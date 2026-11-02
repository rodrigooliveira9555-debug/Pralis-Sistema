# Validação do padrão compartilhado

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
