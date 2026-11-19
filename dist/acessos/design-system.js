/*
 * Configurações → Design System (18/11/2026, pedido do Rodrigo).
 * O padrão visual do sistema explicado dentro do próprio sistema, em tópicos: letras, tamanhos, cores, espaçamento, ícones, campos,
 * máscaras, botões, cabeçalho, quadros, listas, mensagens e conferência final. Cada tópico é um cartão do setor e abre uma tela com
 * a explicação, os valores e uma amostra viva, feita com as mesmas peças das telas (CicluzComprasUI), para a amostra nunca ficar
 * diferente do que o sistema usa de verdade. É só leitura: nada é gravado e nada é configurável aqui.
 * A regra escrita continua em DESIGN_SYSTEM.md (para quem programa); esta tela é o resumo para quem usa. Mudou a regra, mude os dois.
 */
(function () {
  'use strict';
  const A = window.CicluzAcessos; const U = window.CicluzComprasUI;
  if (!A || !U) return;
  const { el, campo, entrada, seletor, botao } = U;
  const cores = { cor: A.COR, corTexto: A.COR_TEXTO };
  const cor = (hex) => { const b = el('span', 'ds-cor'); b.style.background = hex; b.setAttribute('aria-hidden', 'true'); return b; };
  const comCor = (hex, texto) => { const s = el('span', 'ds-linha-cor'); s.append(cor(hex), document.createTextNode(texto)); return s; };
  const amostra = (...nos) => { const a = el('div', 'ds-amostra compras-largo'); a.append(...nos); return a; };
  const letra = (texto, px, peso, linha) => { const p = el('p', 'ds-letra', texto); p.style.font = peso + ' ' + px + 'px/' + linha + 'px var(--ui-font)'; return p; };
  const ORIGENS = [['VND', 'Entradas · Vendas', 'vendas', '#eab308'], ['CNT', 'Transferências · Contas', 'contas', '#f97316'], ['DES', 'Saídas · Despesas', 'despesas', '#ef4444'], ['MER', 'Saídas · Mercadorias', 'mercadorias', '#22c55e'], ['RET', 'Saídas · Retiradas', 'retiradas', '#2563eb']];

  /* Tópicos: id, título, resumo do cartão e os quadros. Quadro: { titulo, texto: [parágrafos], itens: [[nome, valor]], amostra: () => nó }. */
  const TOPICOS = [
    { id: 'letras', titulo: 'Letras', resumo: 'A fonte do sistema, os pesos e o jeito de escrever', quadros: [
      { titulo: 'Fonte', texto: ['O sistema inteiro usa uma fonte só: Montserrat. Não se mistura outra fonte em nenhuma tela, janela ou documento da tela.'],
        itens: [['Fonte', 'Montserrat'], ['Reserva (se a fonte não carregar)', 'A fonte padrão do aparelho']] },
      { titulo: 'Peso da letra', texto: ['O peso diz o que é mais importante. Só o que é título ou o nome principal da linha tem peso; o resto é letra normal.'],
        itens: [['Títulos (tela, janela, quadro)', 'Peso 600 (seminegrito)'], ['Nome principal da linha', 'Peso 500 (médio)'], ['Texto, rótulo de campo e colunas', 'Peso 400 (normal)']],
        amostra: () => amostra(letra('Título — peso 600', 16, 600, 20), letra('Nome da linha — peso 500', 14, 500, 18), letra('Texto comum — peso 400', 14, 400, 18)) },
      { titulo: 'Jeito de escrever', texto: ['Nomes aparecem com a primeira letra maiúscula e o resto minúsculo ("Advertência", "Falta Injustificada"). Tudo em maiúsculas parece letra maior e destoa das outras telas.',
        'Tudo em maiúsculas fica só no título das colunas das listas e nas siglas de três letras (VND, CNT, DES, MER, RET).', 'Os textos falam direto com quem usa, em português simples, sem termo de programação.'] },
    ] },
    { id: 'tamanhos', titulo: 'Tamanho das Letras', resumo: 'O tamanho de cada tipo de texto, do título à nota', quadros: [
      { titulo: 'Tabela de tamanhos', texto: ['Cada tipo de texto tem um tamanho só, em todas as telas. O primeiro número é o tamanho da letra; o segundo, a altura da linha.'],
        itens: [['Título da tela e da janela', '16 px, linha de 20 px, peso 600'], ['Subtítulo (caminho embaixo do título)', '11 px, linha de 14 px'], ['Título de quadro e de seção', '14 px, linha de 20 px, peso 600'],
          ['Texto e nome principal da linha', '14 px, linha de 18 px'], ['Texto digitado no campo', '14 px'], ['Rótulo do campo (o nome em cima)', '12 px, peso 400'], ['Colunas da lista, notas e avisos', '11 px, linha de 16 px'], ['Título das colunas da lista', '11 px, peso 600, em maiúsculas']],
        amostra: () => amostra(letra('Título da tela — 16 px', 16, 600, 20), letra('Título de quadro — 14 px', 14, 600, 20), letra('Texto — 14 px', 14, 400, 18), letra('Rótulo do campo — 12 px', 12, 400, 18), letra('Nota e coluna da lista — 11 px', 11, 400, 16)) },
    ] },
    { id: 'cores', titulo: 'Cores', resumo: 'A cor de cada origem do menu e as cores fixas', quadros: [
      { titulo: 'Cor por origem', texto: ['Cada parte do menu tem a sua cor, e tudo o que abre dali usa essa cor: cabeçalho, botões, ícones e o destaque dos campos. A cor vem do cadastro de grupos, então trocar lá troca em todas as telas.'],
        amostra: () => { const dl = el('dl', 'profiles-info compras-largo'); ORIGENS.forEach(([sigla, nome, chave, padrao]) => { const c = U.corOrigem(chave, padrao); dl.append(el('dt', null, sigla + ' — ' + nome), (() => { const dd = el('dd'); dd.append(comCor(c, c)); return dd; })()); });
          dl.append(el('dt', null, 'Configurações'), (() => { const dd = el('dd'); dd.append(comCor(A.COR, A.COR)); return dd; })()); return dl; } },
      { titulo: 'Cores fixas', texto: ['Estas não mudam com a origem.'],
        amostra: () => { const dl = el('dl', 'profiles-info compras-largo'); [['Excluir e ações sem volta', '#e34343'], ['Fundo da página e dos quadros', '#f5f5f7'], ['Fundo dos campos e das linhas', '#ffffff'], ['Linhas e bordas', '#dedee3'], ['Texto', '#606066']]
          .forEach(([nome, hex]) => { const dd = el('dd'); dd.append(comCor(hex, hex)); dl.append(el('dt', null, nome), dd); }); return dl; } },
      { titulo: 'Regras de uso', texto: ['Vermelho é só do excluir. Um botão que não apaga nada nunca é vermelho, mesmo numa tela de Despesas (onde o vermelho é a cor da origem, e não um alerta).',
        'O editar usa a cor do cabeçalho da tela.', 'No tema escuro as cores de origem são as mesmas; mudam o fundo e o texto.'] },
    ] },
    { id: 'espacamento', titulo: 'Espaçamento', resumo: 'As distâncias entre quadros, campos e linhas', quadros: [
      { titulo: 'Medidas', texto: ['As distâncias são sempre as mesmas, para as telas parecerem uma só.'],
        itens: [['Entre um quadro e outro', '12 px'], ['Respiro dentro do quadro', '14 px nas laterais e embaixo'], ['Entre os campos', '8 a 12 px'], ['Altura do campo', '42 px'], ['Altura da linha de lista', '52 px'], ['Altura da linha de menu', '51 px'],
          ['Entre o quadro e os botões da página', '24 px'], ['Canto do quadro', 'Arredondado, 12 px'], ['Canto do campo', 'Arredondado, 8 px']] },
      { titulo: 'Regras de uso', texto: ['O último campo do quadro não encosta na borda: sobra o mesmo respiro das laterais.', 'Nenhum campo, botão ou texto encosta na borda da tela ou do quadro.',
        'Linha de lista com duas linhas de texto (nome em cima, detalhe embaixo) continua com a altura padrão: diminui o respiro, não aumenta a linha.'] },
    ] },
    { id: 'icones', titulo: 'Ícones', resumo: 'Tamanho, desenho e a sigla de três letras', quadros: [
      { titulo: 'Tamanhos', itens: [['Ícone do cabeçalho', '30 px'], ['Ícone da linha de lista', '30 px, quadrado de cantos arredondados, na cor da origem'], ['Botão redondo de ação (editar, excluir)', '32 px'], ['Desenho dentro do botão', '18 px']],
        texto: ['O ícone do cabeçalho de uma janela tem o mesmo tamanho do ícone do cabeçalho das telas. Ícone maior que isso fica desproporcional.'] },
      { titulo: 'Ícone de origem', texto: ['Tudo repete o ícone da origem. O item do menu principal tem o seu ícone (por exemplo, "−$" em Saídas · Despesas e a engrenagem em Configurações), e tudo o que vem dele mostra o mesmo ícone: o menu secundário, os cartões e o cabeçalho das telas.',
        'Assim dá para saber de onde a tela veio só de olhar o ícone e a cor.'] },
      { titulo: 'Sigla de três letras', texto: ['As origens são identificadas por três letras dentro do quadrado do ícone: VND, CNT, DES, MER e RET. A sigla tem um tamanho só, em qualquer lugar em que apareça.',
        'Áreas, setores e locais também podem usar uma sigla de até três caracteres no lugar do desenho.'],
        amostra: () => amostra(...ORIGENS.map(([sigla, , chave, padrao]) => { const i = el('span', 'ds-sigla'); i.style.background = U.corOrigem(chave, padrao); i.append(el('span', 'sigla-text', sigla)); return i; })) },
      { titulo: 'Desenho', texto: ['Os desenhos são de traço simples, sem preenchimento, todos com a mesma espessura.', 'Cada desenho tem um nome escrito para quem usa leitor de tela.'] },
    ] },
    { id: 'campos', titulo: 'Campos de Preenchimento', resumo: 'Rótulo, obrigatório, situação e o aviso de campo vazio', quadros: [
      { titulo: 'Como é um campo', texto: ['O nome do campo fica em cima, em letra de 12 px. O campo tem 42 px de altura, fundo branco e borda fina.', 'Campo obrigatório leva um asterisco no fim do nome.', 'Quando ajuda, o campo traz um exemplo em cinza claro ("Ex.: Nome e sobrenome…") e uma dica curta embaixo.'],
        amostra: () => amostra(campo('Nome completo *', entrada('text', '', { placeholder: 'Ex.: Nome e sobrenome…' })), campo('Tipo', seletor([['a', 'Opção A'], ['b', 'Opção B']], '', 'Selecione')), campo('Observação', entrada('text', ''), 'Dica curta, embaixo do campo.')) },
      { titulo: 'Campo obrigatório vazio', texto: ['Ao tentar avançar ou salvar com um campo obrigatório vazio, a borda do campo fica na cor do cabeçalho e aparece a mensagem embaixo: "Preencha este campo." ou "Selecione uma opção.".',
        'Todos os campos que faltam são marcados de uma vez, e a tela rola até o primeiro.', 'Toque no botão para ver.'],
        amostra: () => { const caixa = el('div', 'compras-largo ds-teste'); const c1 = campo('Nome *', entrada('text', '')); const c2 = campo('Tipo *', seletor([['a', 'Opção A']], '', 'Selecione')); caixa.append(c1, c2);
          const b = botao('Testar o aviso', () => U.sinalizarObrigatorios(caixa), 'btn secondary'); return amostra(caixa, b); } },
      { titulo: 'Situação (ativo ou inativo)', texto: ['A situação é sempre um interruptor com o texto ao lado ("Ativo" / "Inativo"), nunca uma caixa de marcar nem uma lista de escolha.', 'Perguntas de sim ou não usam o mesmo interruptor, com "Sim" / "Não".'],
        amostra: () => amostra(U.quadroSituacao('Situação do cadastro', true, { dica: 'Inativo continua cadastrado.' }), U.quadroSituacao('Terá contrato?', false, { textos: ['Sim', 'Não'], dica: 'Pergunta de sim ou não.' })) },
    ] },
    { id: 'mascaras', titulo: 'Máscaras', resumo: 'O formato que cada campo assume enquanto se digita', quadros: [
      { titulo: 'Formatos', texto: ['A máscara arruma o que a pessoa digita, na hora. Ninguém precisa digitar ponto, traço, barra ou símbolo.'],
        itens: [['CPF', '000.000.000-00'], ['CNPJ', '00.000.000/0000-00'], ['Telefone e WhatsApp', '(00) 00000-0000'], ['CEP', '00000-000'], ['Dinheiro', 'R$ 0,00'], ['Percentual', '50%'], ['Data', 'DD/MM/AA'], ['Aniversário', 'DD/MM (dia e mês)']] },
      { titulo: 'Experimente', texto: ['Digite só os números.'],
        amostra: () => { const R = window.CicluzFieldRules || {}; const C = window.CicluzConsultas || {}; const CAD = window.CicluzComprasCadastros || {};
          const com = (rotulo, fn, extra) => { const i = entrada('text', '', { inputMode: 'numeric', ...extra }); if (fn) i.addEventListener('input', () => { i.value = fn(i.value); }); return campo(rotulo, i); };
          const pct = entrada('text', '', { inputMode: 'decimal', placeholder: '0%', maxLength: 8 }); U.mascaraPercentual(pct);
          return amostra(com('CPF', R.cpfMask, { placeholder: '000.000.000-00', maxLength: 14 }), com('CNPJ', R.cnpjMask, { placeholder: '00.000.000/0000-00', maxLength: 18 }), com('Telefone', CAD.mascaraTelefone, { placeholder: '(00) 00000-0000' }),
            com('CEP', C.cepMask, { placeholder: '00000-000', maxLength: 9 }), com('Dinheiro', R.moneyMask, { placeholder: 'R$ 0,00', maxLength: 24 }), campo('Percentual', pct)); } },
      { titulo: 'Buscas automáticas', texto: ['Ao completar o CEP, o sistema busca rua, bairro, cidade e UF. Ao completar o CNPJ, busca razão social, nome fantasia e endereço.', 'A busca só preenche o que está vazio; se o CEP ou o CNPJ for trocado por outro, os dados do novo substituem os antigos.'] },
    ] },
    { id: 'botoes', titulo: 'Botões', resumo: 'Onde fica cada botão e o que cada um faz', quadros: [
      { titulo: 'Botões da página', texto: ['Ficam no fim da tela, fora dos quadros, sempre na mesma ordem.'],
        itens: [['Voltar', 'À esquerda. Volta uma etapa.'], ['Cancelar', 'À direita. Fecha sem salvar.'], ['Salvar', 'À direita, depois do Cancelar. Grava e fecha.'], ['Avançar', 'À direita. Confere a etapa e vai para a próxima.']],
        amostra: () => { const linha = el('div', 'compras-form-rodape compras-etapas-nav compras-largo'); const s = el('button', 'btn', 'Salvar'); s.type = 'button'; linha.append(botao('Cancelar', () => {}, 'btn secondary footer-cancel-accent'), s); return linha; } },
      { titulo: 'Dentro do quadro ou fora dele', texto: ['Botão dentro do quadro age só naquele quadro (por exemplo, "Editar" num bloco da revisão ou "Adicionar" numa lista).', 'Botão fora do quadro age na página inteira (Cancelar, Salvar, Avançar).'] },
      { titulo: 'Botão com título', texto: ['O botão que cria alguma coisa fica no cabeçalho da lista, com o nome por extenso e o "+" no círculo: "Novo Cliente", "Novo Cadastro". O "Enviar" fica ao lado dele, com o aviãozinho.'],
        amostra: () => amostra(U.botaoTitulo('Novo Cadastro', 'Exemplo de botão de criar', () => {}), U.botaoTitulo('Enviar', 'Exemplo de botão de enviar', () => {}, U.ICONES.send)) },
      { titulo: 'Editar e excluir', texto: ['Em linha de lista ficam na seta da direita: tocar na seta mostra os dois botões redondos.', 'O editar é redondo, na cor do cabeçalho. O excluir é redondo e vermelho, e sempre pede confirmação antes.',
        'Onde o cadastro não pode ser apagado (cliente, colaborador, patrimônio), o excluir dá lugar a Desativar ou Baixar.'] },
      { titulo: 'Texto do botão', texto: ['Botão de página tem o nome por extenso ("Cancelar", "Salvar"), nunca só um desenho.', 'O nome diz o que acontece: "Salvar", "Excluir", "Trocar" — e não "OK" ou "Sim".'] },
    ] },
    { id: 'cabecalho', titulo: 'Cabeçalho', resumo: 'Ícone, título e subtítulo das telas e das janelas', quadros: [
      { titulo: 'O que tem no cabeçalho', texto: ['O cabeçalho é uma faixa na cor da origem, com três coisas, nesta ordem.'],
        itens: [['Ícone', 'À esquerda, 30 px: a sigla ou o desenho da tela.'], ['Título', '16 px, peso 600: o nome da tela ou o que a janela faz ("Novo cliente", "Editar área").'], ['Subtítulo', '11 px, embaixo do título: o caminho até a tela.']] },
      { titulo: 'Regras de uso', texto: ['Tela e janela têm o mesmo cabeçalho. Toda janela mostra, no subtítulo, o caminho da tela de onde foi aberta.', 'O ícone do cabeçalho nunca é maior que o das outras telas, nem fica colado no título.',
        'Os atalhos (início, busca, voltar, fechar) ficam na barra de baixo, e não no cabeçalho.'] },
    ] },
    { id: 'quadros', titulo: 'Quadros e Molduras', resumo: 'Tudo dentro de quadro, com o título na borda', quadros: [
      { titulo: 'A regra', texto: ['Nada fica solto na tela: todo campo, pergunta ou lista fica dentro de um quadro com borda fina e cantos arredondados.', 'O nome do quadro fica escrito em cima da borda, como uma legenda ("Dados da empresa", "Endereço").',
        'Cada assunto tem o seu quadro. Um cadastro com vários assuntos tem vários quadros, com 12 px entre eles.'] },
      { titulo: 'Cadastro em etapas', texto: ['Cadastro grande é dividido em etapas, com a barra de evolução no alto.', 'A última etapa é sempre a "Revisão dos dados": um bloco por etapa, só para leitura, com o botão "Editar" em cada bloco e o "Salvar" no fim.',
        'Cadastro novo começa na primeira etapa. Cadastro já gravado abre na Revisão.'] },
      { titulo: 'Exemplo', amostra: () => { const q = el('fieldset', 'compras-fieldset compras-largo'); q.append(el('legend', null, 'Dados do exemplo'), campo('Nome', entrada('text', '')), campo('Telefone', entrada('text', ''))); return q; } },
    ] },
    { id: 'listas', titulo: 'Listas', resumo: 'O formato das telas de lista e o que cada toque faz', quadros: [
      { titulo: 'Formato', texto: ['Toda tela de cadastro abre numa lista: o quadro com o botão de criar, o botão Enviar (quando existe) e, na ponta direita, o total e a bolinha que recolhe ou mostra as colunas.',
        'Cada linha tem o ícone, o nome em destaque e as demais colunas em letra menor. As colunas podem ser recolhidas uma a uma pela setinha ao lado do título.', 'A busca fica na barra de baixo.'] },
      { titulo: 'Toques', itens: [['Um toque na linha', 'Mostra os dados, sem editar.'], ['Dois toques na linha', 'Abre o cadastro para editar.'], ['Seta à direita', 'Mostra os botões Editar e Excluir (ou Desativar).']] },
      { titulo: 'Tela enxuta', texto: ['A tela de lista tem uma nota de uma linha no alto, e não um aviso longo.', 'Filtro em lista de escolha no alto da tela não é usado: as colunas e a busca fazem esse papel.'] },
    ] },
    { id: 'mensagens', titulo: 'Mensagens e Avisos', resumo: 'Como o sistema avisa, confirma e mostra erro', quadros: [
      { titulo: 'Tipos de mensagem', itens: [['Aviso rápido', 'Aparece e some sozinho depois de salvar ("Cliente salvo.").'], ['Erro no cadastro', 'Uma frase curta perto dos botões, dizendo o que falta, mais o destaque no campo.'], ['Confirmação', 'Uma janela pequena antes de qualquer ação sem volta, com o botão dizendo a ação ("Excluir").'],
        ['Nota', 'Letra de 11 px, para explicar uma regra sem chamar atenção.']],
        amostra: () => amostra(botao('Ver o aviso rápido', () => U.avisar('Exemplo de aviso: some sozinho.'), 'btn secondary'), botao('Ver a confirmação', () => U.confirmar('Excluir exemplo', 'É só um exemplo: nada será apagado.', 'Excluir', () => undefined, cores), 'btn secondary')) },
      { titulo: 'Como escrever', texto: ['A mensagem diz o que aconteceu e o que fazer: "Informe o CPF.", e não "Campo inválido".', 'Quando algo não pode ser feito, a mensagem explica o motivo e o caminho ("Troque a empresa nesses contratos antes de excluir, ou deixe-a inativa.").',
        'O sistema só diz que salvou depois de salvar de verdade.'] },
    ] },
    { id: 'conferencia', titulo: 'Conferência Final', resumo: 'O que conferir antes de dizer que uma tela está pronta', quadros: [
      { titulo: 'Tamanhos de tela', texto: ['Toda tela é conferida em três larguras, no claro e no escuro, sem barra de rolagem na horizontal.'], itens: [['Celular pequeno', '320 px'], ['Celular', '390 px'], ['iPad e computador', '1024 px']] },
      { titulo: 'Lista de conferência', texto: ['Letra e espaçamento iguais aos da tela de referência (VND - Clientes).', 'Cabeçalho com ícone do tamanho certo, título e subtítulo.', 'Campos dentro de quadro, com o título na moldura.', 'Máscara em todo campo que tem formato.',
        'Campo obrigatório vazio com a borda na cor do cabeçalho e a mensagem.', 'Situação no interruptor.', 'Cancelar e Salvar por extenso, à direita, fora do quadro.', 'Nenhum caminho antigo sobrando para fazer a mesma coisa.'] },
    ] },
  ];

  const telas = {}; // uma tela por tópico, criada na primeira abertura
  function abrirTopico(t) {
    const tela = telas[t.id] || (telas[t.id] = A.criarTela({ id: 'acessos-ds-' + t.id, titulo: t.titulo, tela: 'ds-' + t.id }));
    tela.ativar();
    const corpo = el('div', 'compras-etapa');
    t.quadros.forEach((q) => {
      const fs = el('fieldset', 'compras-fieldset ds-quadro'); fs.append(el('legend', null, q.titulo));
      (q.texto || []).forEach((p) => fs.append(el('p', 'ds-texto compras-largo', p)));
      if (q.itens) { const dl = el('dl', 'profiles-info compras-largo'); q.itens.forEach(([k, v]) => dl.append(el('dt', null, k), el('dd', null, v))); fs.append(dl); }
      if (q.amostra) fs.append(q.amostra());
      corpo.append(fs);
    });
    tela.body.replaceChildren(U.nota(t.resumo + '. Só leitura: nada é gravado aqui.'), corpo);
  }
  TOPICOS.forEach((t) => A.registrar('ds-' + t.id, () => abrirTopico(t)));
  window.CicluzDesignSystem = { TOPICOS };
})();
