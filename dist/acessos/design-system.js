/*
 * Configurações → Design System (18/11/2026, pedido do Rodrigo).
 * O padrão visual do sistema explicado dentro do próprio sistema, em tópicos. Cada tópico é um cartão do setor e abre uma tela com
 * a explicação, as medidas e uma amostra viva, feita com as mesmas peças das telas (CicluzComprasUI), para a amostra nunca ficar
 * diferente do que o sistema usa de verdade. É só leitura: nada é gravado e nada é configurável aqui.
 * As medidas foram tiradas das telas em uso (cabeçalho, barra de baixo, botões, listas) em 18/11/2026.
 * A regra escrita continua em DESIGN_SYSTEM.md (para quem programa); esta tela é o resumo para quem usa. Mudou a regra, mude os dois
 * — e a lista de cartões em acessos/modulo.js, que repete os títulos.
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
  const redondo = (rotulo, desenho, perigo) => { const b = el('button', 'shortcut-circle compras-redondo' + (perigo ? ' perigo' : '')); b.type = 'button'; b.title = rotulo; b.setAttribute('aria-label', rotulo); b.innerHTML = U.svg(desenho); return b; };
  const comLegenda = (no, texto) => { const c = el('div', 'ds-peca'); c.append(no, el('small', 'profiles-note', texto)); return c; };
  const LAPIS = '<path d="m4 20 4-.8L19 8l-3-3L5 16zM14.5 6.5l3 3"/>'; const LIXO = '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>';
  const ORIGENS = [['VND', 'Entradas · Vendas', 'vendas', '#eab308'], ['CNT', 'Transferências · Contas', 'contas', '#f97316'], ['DES', 'Saídas · Despesas', 'despesas', '#ef4444'], ['MER', 'Saídas · Mercadorias', 'mercadorias', '#22c55e'], ['RET', 'Saídas · Retiradas', 'retiradas', '#2563eb']];

  /* Tópicos: id, título, resumo do cartão e os quadros. Quadro: { titulo, texto: [parágrafos], itens: [[nome, valor]], amostra: () => nó }. */
  const TOPICOS = [
    { id: 'letras', titulo: 'Letras', resumo: 'A fonte do sistema, os pesos e o jeito de escrever', quadros: [
      { titulo: 'Fonte', texto: ['O sistema inteiro usa uma fonte só: Montserrat. Não se mistura outra fonte em nenhuma tela, janela ou documento da tela.'],
        itens: [['Fonte', 'Montserrat'], ['Reserva (se a fonte não carregar)', 'A fonte padrão do aparelho']] },
      { titulo: 'Peso da letra', texto: ['O peso diz o que é mais importante. Só o que é título ou o nome principal da linha tem peso; o resto é letra normal.'],
        itens: [['Títulos (tela, janela, quadro) e botões', 'Peso 600 (seminegrito)'], ['Nome principal da linha', 'Peso 500 (médio)'], ['Texto, rótulo de campo e colunas', 'Peso 400 (normal)'], ['Sigla de três letras', 'Peso 700 (negrito)']],
        amostra: () => amostra(letra('Título — peso 600', 16, 600, 20), letra('Nome da linha — peso 500', 14, 500, 18), letra('Texto comum — peso 400', 14, 400, 18)) },
      { titulo: 'Jeito de escrever', texto: ['Nomes aparecem com a primeira letra maiúscula e o resto minúsculo ("Advertência", "Falta Injustificada"). Tudo em maiúsculas parece letra maior e destoa das outras telas.',
        'Tudo em maiúsculas fica só no título das colunas das listas e nas siglas de três letras (VND, CNT, DES, MER, RET).', 'Os textos falam direto com quem usa, em português simples, sem termo de programação.'] },
    ] },
    { id: 'tamanhos', titulo: 'Tamanho das Letras', resumo: 'O tamanho de cada tipo de texto, do título à nota', quadros: [
      { titulo: 'Tabela de tamanhos', texto: ['Cada tipo de texto tem um tamanho só, em todas as telas. O primeiro número é o tamanho da letra; o segundo, a altura da linha.'],
        itens: [['Título da tela e da janela', '16 px, linha de 20 px, peso 600'], ['Subtítulo (caminho embaixo do título)', '11 px, linha de 14 px'], ['Título de quadro e de seção', '14 px, linha de 20 px, peso 600'], ['Título na moldura do quadro', '13 px, linha de 18 px, peso 600'],
          ['Texto e nome principal da linha', '14 px, linha de 18 px'], ['Texto digitado no campo', '14 px'], ['Rótulo do campo (o nome em cima)', '12 px, peso 400'], ['Texto dos botões', '12 px, peso 600'], ['Colunas da lista, notas e avisos', '11 px, linha de 16 px'],
          ['Título das colunas da lista', '11 px, peso 600, em maiúsculas'], ['Sigla dentro do ícone', '11 px, peso 700']],
        amostra: () => amostra(letra('Título da tela — 16 px', 16, 600, 20), letra('Título de quadro — 14 px', 14, 600, 20), letra('Texto — 14 px', 14, 400, 18), letra('Rótulo do campo e botão — 12 px', 12, 400, 18), letra('Nota e coluna da lista — 11 px', 11, 400, 16)) },
    ] },
    { id: 'cores', titulo: 'Cores', resumo: 'A cor de cada origem do menu e as cores fixas', quadros: [
      { titulo: 'Cor por origem', texto: ['Cada parte do menu tem a sua cor, e tudo o que abre dali usa essa cor: cabeçalho, botões, ícones e o destaque dos campos. A cor vem do cadastro de grupos, então trocar lá troca em todas as telas.'],
        amostra: () => { const dl = el('dl', 'profiles-info compras-largo'); ORIGENS.forEach(([sigla, nome, chave, padrao]) => { const c = U.corOrigem(chave, padrao); dl.append(el('dt', null, sigla + ' — ' + nome), (() => { const dd = el('dd'); dd.append(comCor(c, c)); return dd; })()); });
          dl.append(el('dt', null, 'Configurações e Resultados'), (() => { const dd = el('dd'); dd.append(comCor(A.COR, A.COR)); return dd; })()); return dl; } },
      { titulo: 'Cores fixas', texto: ['Estas não mudam com a origem.'],
        amostra: () => { const dl = el('dl', 'profiles-info compras-largo'); [['Excluir e ações sem volta', '#e34343'], ['Fundo da página e dos quadros', '#f5f5f7'], ['Fundo dos campos, das linhas e da barra de baixo', '#ffffff'], ['Linhas e bordas', '#dedee3'], ['Borda do campo', '#d4d4d8'], ['Texto', '#606066'], ['Texto das colunas e notas', '#6e6e73'], ['Texto e ícones sobre o cabeçalho', '#ffffff']]
          .forEach(([nome, hex]) => { const dd = el('dd'); dd.append(comCor(hex, hex)); dl.append(el('dt', null, nome), dd); }); return dl; } },
      { titulo: 'Regras de uso', texto: ['Vermelho é só do excluir. Um botão que não apaga nada nunca é vermelho, mesmo numa tela de Despesas (onde o vermelho é a cor da origem, e não um alerta).',
        'O editar usa a cor do cabeçalho da tela.', 'No tema escuro as cores de origem são as mesmas; mudam o fundo e o texto.'] },
    ] },
    { id: 'espacamento', titulo: 'Espaçamento', resumo: 'As distâncias entre quadros, campos e linhas', quadros: [
      { titulo: 'Medidas', texto: ['As distâncias são sempre as mesmas, para as telas parecerem uma só.'],
        itens: [['Entre um quadro e outro', '12 px'], ['Respiro dentro do quadro', '14 px nas laterais e embaixo'], ['Entre os campos', '8 a 12 px'], ['Altura do campo', '42 px'], ['Altura da linha de lista', '52 px'], ['Altura da linha de menu (cartão)', '51 px'],
          ['Altura do cabeçalho de cima', '58 px'], ['Altura da barra de baixo', '59 px'], ['Respiro lateral da tela', '14 px'], ['Entre o quadro e os botões da página', '24 px'], ['Entre um botão e outro', '10 px'], ['Canto do quadro', 'Arredondado, 12 px'], ['Canto do campo', 'Arredondado, 8 px'], ['Canto do botão', 'Arredondado, 10 px']] },
      { titulo: 'Regras de uso', texto: ['O último campo do quadro não encosta na borda: sobra o mesmo respiro das laterais.', 'Nenhum campo, botão ou texto encosta na borda da tela ou do quadro.',
        'Linha de lista com duas linhas de texto (nome em cima, detalhe embaixo) continua com a altura padrão: diminui o respiro, não aumenta a linha.'] },
    ] },
    { id: 'icones', titulo: 'Ícones', resumo: 'O tamanho do ícone em cada lugar, o desenho e a sigla', quadros: [
      { titulo: 'Tamanho do ícone em cada lugar', texto: ['O ícone tem um tamanho para cada lugar, e é o mesmo em todas as telas. O primeiro número é o tamanho da caixa; o segundo, o do desenho dentro dela.'],
        itens: [['Cabeçalho de cima (tela e janela)', 'Caixa de 30 px, desenho de 21 px'], ['Sigla no cabeçalho', 'Caixa de 30 px, letra de 11 px'], ['Menu principal', 'Quadrado colorido de 32 px'], ['Submenu', '16 px, só o traço, na cor da origem'], ['Cartão do menu', 'Círculo de 30 px, desenho de 15 px'],
          ['Linha de lista', 'Quadrado de 30 px, cantos arredondados, na cor da origem'], ['Botão redondo de ação (editar, excluir)', 'Círculo de 32 px, desenho de 18 px'], ['Botões da barra de baixo', 'Círculo de 32 px'], ['Círculo dentro do botão com título', '28 px'], ['Aviso de campo obrigatório', '16 px']],
        amostra: () => amostra(comLegenda(redondo('Exemplo de editar', LAPIS), 'Botão redondo: 32 px'), comLegenda((() => { const i = el('span', 'ds-sigla'); i.style.background = A.COR; i.append(el('span', 'sigla-text', 'CFG')); return i; })(), 'Ícone de linha e de cabeçalho: 30 px')) },
      { titulo: 'De onde vem o ícone do cabeçalho', texto: ['O ícone do cabeçalho é o do item em que você tocou para chegar à tela. Tocou em "Cadastros Geral" no submenu, o cabeçalho mostra a prancheta de Cadastros Geral; tocou num cartão, o cabeçalho mostra o ícone daquele cartão.',
        'Cartão que não tem ícone próprio usa o do submenu de onde veio.', 'Os ícones do submenu (lápis em Lançamentos, gráfico em Relatórios, prancheta em Cadastros Geral, caixa em Estoque, pasta em Pastas Documentos) não mudam.',
        'O cabeçalho tem sempre a mesma altura e o ícone sempre o mesmo tamanho, em qualquer tela ou janela.'] },
      { titulo: 'Sigla de três letras', texto: ['As origens são identificadas por três letras dentro do quadrado do ícone: VND, CNT, DES, MER e RET. A sigla tem um tamanho só, em qualquer lugar em que apareça.',
        'Áreas, setores e locais também podem usar uma sigla de até três caracteres no lugar do desenho.'],
        amostra: () => amostra(...ORIGENS.map(([sigla, , chave, padrao]) => { const i = el('span', 'ds-sigla'); i.style.background = U.corOrigem(chave, padrao); i.append(el('span', 'sigla-text', sigla)); return i; })) },
      { titulo: 'Desenho', texto: ['Os desenhos são de traço simples, sem preenchimento, todos com a mesma espessura e pontas arredondadas.', 'Cada desenho tem um nome escrito para quem usa leitor de tela.'] },
    ] },
    { id: 'cabecalho', titulo: 'Cabeçalho e Barra de Baixo', resumo: 'O cabeçalho de cima e a barra de baixo, com medidas e botões', quadros: [
      { titulo: 'Cabeçalho de cima — o que tem', texto: ['É a faixa colorida no alto da tela, na cor da origem, com os cantos de baixo arredondados. Tem três coisas, nesta ordem.'],
        itens: [['Ícone', 'À esquerda: o ícone do item que abriu a tela (ou a sigla).'], ['Título', 'O nome da tela, ou o que a janela faz ("Novo cliente", "Editar área").'], ['Subtítulo', 'Embaixo do título: o caminho até a tela.']] },
      { titulo: 'Cabeçalho de cima — medidas', itens: [['Altura', '58 px'], ['Respiro', '8 px em cima e embaixo, 14 px nas laterais'], ['Entre o ícone e o título', '10 px'], ['Ícone', 'Caixa de 30 px, desenho de 21 px (sigla: letra de 11 px)'], ['Título', '16 px, linha de 20 px, peso 600'],
        ['Subtítulo', '11 px, linha de 14 px'], ['Cor do fundo', 'A cor da origem'], ['Cor do texto e do ícone', 'Branco'], ['Cantos', 'Só os de baixo, arredondados em 12 px']],
        texto: ['Estas medidas são as mesmas em todas as telas e janelas do sistema.'] },
      { titulo: 'Cabeçalho de cima — regras', texto: ['Tela e janela têm o mesmo cabeçalho. Toda janela mostra, no subtítulo, o caminho da tela de onde foi aberta.', 'O ícone nunca é maior que o das outras telas, nem fica colado no título.',
        'O cabeçalho de cima não tem botões: os atalhos ficam na barra de baixo. Ele pode ser recolhido pelo último botão da barra de baixo, para sobrar mais tela.'] },
      { titulo: 'Barra de baixo — o que é', texto: ['É a faixa branca fixa no pé da tela, com os atalhos. Fica sempre no mesmo lugar, em telas e janelas, para o dedo achar sem procurar.', 'Tem três partes: os atalhos de navegação à esquerda, o símbolo do sistema no meio e as ações da tela à direita.'],
        itens: [['Altura', '59 px'], ['Cor do fundo', 'Branco'], ['Respiro lateral', '14 px'], ['Botões', 'Círculos de 32 px, na cor da origem, com o desenho branco']] },
      { titulo: 'Barra de baixo — botões da esquerda', itens: [['Menu inicial (casa)', 'Volta para o menu principal.'], ['Busca (lupa)', 'Abre o campo de busca da tela.'], ['Ordem', 'Coloca a lista em ordem alfabética ou volta à ordem original.'], ['Período (calendário)', 'Escolhe as datas "de … a …" quando a tela tem filtro por data.'],
        ['Novo (+)', 'Cria um registro novo, o mesmo do botão "Novo…" da lista. Fica apagado na tela que não cria nada.']] },
      { titulo: 'Barra de baixo — meio e direita', itens: [['Símbolo do sistema (meio)', 'Mostra o menu rápido.'], ['Voltar (seta)', 'Volta para a tela anterior.'], ['Fechar (✕)', 'Fecha a tela ou a janela sem salvar.'], ['Salvar (✓)', 'Salva, quando a tela tem o que salvar.'], ['Mais atalhos (…)', 'Mostra os atalhos que não couberam.'],
        ['Recolher (seta para cima)', 'Esconde ou mostra o cabeçalho de cima.']],
        texto: ['Voltar, Fechar e Salvar da barra de baixo fazem o mesmo que os botões por extenso da página; são o atalho para o polegar.'] },
    ] },
    { id: 'botoes', titulo: 'Botões', resumo: 'A biblioteca de botões: todos os tipos, medidas e onde usar', quadros: [
      { titulo: 'Botões da página', texto: ['Ficam no fim da tela, fora dos quadros, sempre na mesma ordem. Têm o nome por extenso e um círculo com o desenho na ponta.'],
        itens: [['Voltar', 'À esquerda. Volta uma etapa. Contorno na cor da origem.'], ['Cancelar', 'À direita. Fecha sem salvar. Contorno na cor da origem, com o ✕.'], ['Salvar', 'À direita, depois do Cancelar. Grava e fecha. Preenchido na cor da origem, com o ✓.'], ['Avançar', 'À direita. Confere a etapa e vai para a próxima. Preenchido.'],
          ['Medidas', '128 × 40 px, letra de 12 px peso 600, cantos de 10 px, 10 px entre eles']],
        amostra: () => { const linha = el('div', 'compras-form-rodape compras-etapas-nav compras-largo'); const s = el('button', 'btn', 'Salvar'); s.type = 'button'; linha.append(botao('Cancelar', () => {}, 'btn secondary footer-cancel-accent'), s); return linha; } },
      { titulo: 'Botão com título', texto: ['É o botão que cria ou envia alguma coisa, no cabeçalho da lista: o nome por extenso e o círculo com o desenho. "Novo Cliente" leva o "+"; "Enviar", o aviãozinho. Abre para baixo um painel quando tem opções (como o Enviar).'],
        itens: [['Altura', '40 px'], ['Círculo', '28 px'], ['Letra', '12 px, peso 600'], ['Cor', 'Preenchido na cor da origem']],
        amostra: () => amostra(U.botaoTitulo('Novo Cadastro', 'Exemplo de botão de criar', () => {}), U.botaoTitulo('Enviar', 'Exemplo de botão de enviar', () => {}, U.ICONES.send)) },
      { titulo: 'Botões redondos de ação', texto: ['São círculos só com o desenho, para ações da linha ou do item. Sempre têm o nome escrito para o leitor de tela. Na linha de lista, aparecem ao tocar na seta da ponta direita.'],
        itens: [['Editar (lápis)', 'Na cor do cabeçalho.'], ['Excluir (lixeira)', 'Vermelho. Sempre pede confirmação.'], ['Outras ações da linha', 'Na cor do cabeçalho (ver, exame, acompanhar).'], ['Medidas', 'Círculo de 32 px, desenho de 18 px, 6 px entre eles']],
        amostra: () => { const a = el('div', 'compras-doc-acoes compras-form-rodape'); a.append(redondo('Exemplo de editar', LAPIS), redondo('Exemplo de excluir', LIXO, true)); return amostra(a); } },
      { titulo: 'Seta da linha', texto: ['Cada linha de lista tem uma setinha na ponta direita. Tocar nela mostra os botões redondos de Editar e Excluir daquela linha; tocar de novo, ou tocar fora, esconde.',
        'Onde o cadastro não pode ser apagado (cliente, colaborador, patrimônio), o excluir dá lugar a Desativar ou Baixar.'] },
      { titulo: 'Botão secundário', texto: ['Botão de contorno, sem preenchimento, para ações de apoio dentro do quadro: "Copiar link", "Visualizar formulário", "Usar texto sugerido", "Adicionar".', 'Nunca disputa atenção com o botão principal da página.'],
        amostra: () => amostra(botao('Botão secundário', () => {}, 'btn secondary'), U.botaoEditarBloco('exemplo', () => {})) },
      { titulo: 'Editar do bloco', texto: ['Na Revisão dos dados, cada bloco tem embaixo um botão retangular "Editar", que leva à etapa de onde aqueles dados vieram.'] },
      { titulo: 'Chips', texto: ['São etiquetas arredondadas. Servem para mostrar o que foi escolhido numa lista (com um "×" para tirar) ou para escolher entre poucas opções.'],
        amostra: () => amostra(el('span', 'compras-chip ativo', 'Item escolhido ×'), el('span', 'compras-chip', 'Opção não escolhida')) },
      { titulo: 'Cartões de escolha', texto: ['Quando a escolha muda o cadastro inteiro (Pessoa Física ou Pessoa Jurídica), ela aparece em cartões lado a lado, com o ícone, o nome e a marca de selecionado.'], itens: [['Altura', '70 px'], ['Selecionado', 'Borda e fundo claro na cor da origem, com o ✓']] },
      { titulo: 'Interruptor', texto: ['Para ativo/inativo e para perguntas de sim ou não. Ligado, fica na cor da origem; desligado, cinza. O texto ao lado diz o estado ("Ativo", "Sim").'], itens: [['Medidas', '40 × 24 px']],
        amostra: () => amostra(U.quadroSituacao('Exemplo de interruptor', true, { dica: 'Toque para ligar ou desligar.' })) },
      { titulo: 'Dentro do quadro ou fora dele', texto: ['Botão dentro do quadro age só naquele quadro ("Editar" num bloco, "Adicionar" numa lista).', 'Botão fora do quadro age na página inteira (Cancelar, Salvar, Avançar).'] },
      { titulo: 'Texto do botão', texto: ['Botão de página tem o nome por extenso ("Cancelar", "Salvar"), nunca só um desenho.', 'O nome diz o que acontece: "Salvar", "Excluir", "Trocar" — e não "OK" ou "Sim".', 'Vermelho é só do excluir.'] },
    ] },
    { id: 'campos', titulo: 'Campos de Preenchimento', resumo: 'Rótulo, obrigatório, situação e o aviso de campo vazio', quadros: [
      { titulo: 'Como é um campo', texto: ['O nome do campo fica em cima, em letra de 12 px. O campo tem 42 px de altura, fundo branco, borda fina e cantos de 8 px.', 'Campo obrigatório leva um asterisco no fim do nome.', 'Quando ajuda, o campo traz um exemplo em cinza claro ("Ex.: Nome e sobrenome…") e uma dica curta embaixo.',
        'Ao tocar no campo, a borda fica na cor da origem.'],
        amostra: () => amostra(campo('Nome completo *', entrada('text', '', { placeholder: 'Ex.: Nome e sobrenome…' })), campo('Tipo', seletor([['a', 'Opção A'], ['b', 'Opção B']], '', 'Selecione')), campo('Observação', entrada('text', ''), 'Dica curta, embaixo do campo.')) },
      { titulo: 'Campo obrigatório vazio', texto: ['Ao tentar avançar ou salvar com um campo obrigatório vazio, a borda do campo fica na cor do cabeçalho e aparece a mensagem embaixo: "Preencha este campo." ou "Selecione uma opção.".',
        'Todos os campos que faltam são marcados de uma vez, e a tela rola até o primeiro.', 'Toque no botão para ver.'],
        amostra: () => { const caixa = el('div', 'compras-largo ds-teste'); const c1 = campo('Nome *', entrada('text', '')); const c2 = campo('Tipo *', seletor([['a', 'Opção A']], '', 'Selecione')); caixa.append(c1, c2);
          const b = botao('Testar o aviso', () => U.sinalizarObrigatorios(caixa), 'btn secondary'); return amostra(caixa, b); } },
      { titulo: 'Situação (ativo ou inativo)', texto: ['A situação é sempre um interruptor com o texto ao lado ("Ativo" / "Inativo"), nunca uma caixa de marcar nem uma lista de escolha.', 'Perguntas de sim ou não usam o mesmo interruptor, com "Sim" / "Não".'],
        amostra: () => amostra(U.quadroSituacao('Situação do cadastro', true, { dica: 'Inativo continua cadastrado.' }), U.quadroSituacao('Terá contrato?', false, { textos: ['Sim', 'Não'], dica: 'Pergunta de sim ou não.' })) },
      { titulo: 'Campo só para leitura', texto: ['Valor que vem de outro lugar e não pode ser mudado ali (por exemplo, o salário de referência do cargo) aparece no mesmo campo, travado, com uma nota dizendo de onde vem.'] },
    ] },
    { id: 'mascaras', titulo: 'Máscaras', resumo: 'O formato que cada campo assume enquanto se digita', quadros: [
      { titulo: 'Formatos', texto: ['A máscara arruma o que a pessoa digita, na hora. Ninguém precisa digitar ponto, traço, barra ou símbolo.'],
        itens: [['CPF', '000.000.000-00'], ['CNPJ', '00.000.000/0000-00'], ['Telefone e WhatsApp', '(00) 00000-0000'], ['CEP', '00000-000'], ['Dinheiro', 'R$ 0,00'], ['Percentual', '50%'], ['Data', 'DD/MM/AA'], ['Aniversário', 'DD/MM (dia e mês)'], ['Código CBO', '0000-00']] },
      { titulo: 'Experimente', texto: ['Digite só os números.'],
        amostra: () => { const R = window.CicluzFieldRules || {}; const C = window.CicluzConsultas || {}; const CAD = window.CicluzComprasCadastros || {};
          const com = (rotulo, fn, extra) => { const i = entrada('text', '', { inputMode: 'numeric', ...extra }); if (fn) i.addEventListener('input', () => { i.value = fn(i.value); }); return campo(rotulo, i); };
          const pct = entrada('text', '', { inputMode: 'decimal', placeholder: '0%', maxLength: 8 }); U.mascaraPercentual(pct);
          return amostra(com('CPF', R.cpfMask, { placeholder: '000.000.000-00', maxLength: 14 }), com('CNPJ', R.cnpjMask, { placeholder: '00.000.000/0000-00', maxLength: 18 }), com('Telefone', CAD.mascaraTelefone, { placeholder: '(00) 00000-0000' }),
            com('CEP', C.cepMask, { placeholder: '00000-000', maxLength: 9 }), com('Dinheiro', R.moneyMask, { placeholder: 'R$ 0,00', maxLength: 24 }), campo('Percentual', pct)); } },
      { titulo: 'Buscas automáticas', texto: ['Ao completar o CEP, o sistema busca rua, bairro, cidade e UF. Ao completar o CNPJ, busca razão social, nome fantasia e endereço.', 'A busca só preenche o que está vazio; se o CEP ou o CNPJ for trocado por outro, os dados do novo substituem os antigos.'] },
    ] },
    { id: 'quadros', titulo: 'Quadros e Molduras', resumo: 'Tudo dentro de quadro, com o título na borda', quadros: [
      { titulo: 'A regra', texto: ['Nada fica solto na tela: todo campo, pergunta ou lista fica dentro de um quadro com borda fina e cantos arredondados.', 'O nome do quadro fica escrito em cima da borda, como uma legenda ("Dados da empresa", "Endereço").',
        'Cada assunto tem o seu quadro. Um cadastro com vários assuntos tem vários quadros, com 12 px entre eles.'],
        itens: [['Borda', 'Fina, cinza claro'], ['Cantos', 'Arredondados, 12 px'], ['Respiro interno', '14 px'], ['Título na moldura', '13 px, peso 600'], ['Fundo do quadro', 'O da página; os campos dentro são brancos']] },
      { titulo: 'Cadastro em etapas', texto: ['Cadastro grande é dividido em etapas, com a barra de evolução no alto: uma bolinha numerada por etapa e o nome embaixo.', 'A última etapa é sempre a "Revisão dos dados": um bloco por etapa, só para leitura, com o botão "Editar" em cada bloco e o "Salvar" no fim.',
        'Cadastro novo começa na primeira etapa. Cadastro já gravado abre na Revisão.', 'Uma pergunta pode mudar as etapas: com "Terá contrato?" em Não, a etapa Contrato some.'] },
      { titulo: 'Exemplo', amostra: () => { const q = el('fieldset', 'compras-fieldset compras-largo'); q.append(el('legend', null, 'Dados do exemplo'), campo('Nome', entrada('text', '')), campo('Telefone', entrada('text', ''))); return q; } },
    ] },
    { id: 'listas', titulo: 'Listas', resumo: 'O formato das telas de lista e o que cada toque faz', quadros: [
      { titulo: 'Formato', texto: ['Toda tela de cadastro abre numa lista: o quadro com o botão de criar, o botão Enviar (quando existe) e, na ponta direita, o total e a bolinha que recolhe ou mostra as colunas.',
        'Cada linha tem o ícone, o nome em destaque e as demais colunas em letra menor. As colunas podem ser recolhidas uma a uma pela setinha ao lado do título.', 'A busca fica na barra de baixo.'],
        itens: [['Altura da linha', '52 px'], ['Ícone da linha', 'Quadrado de 30 px'], ['Nome', '14 px, peso 500'], ['Outras colunas', '11 px, peso 400'], ['Título das colunas', '11 px, peso 600, em maiúsculas'], ['Situação', 'À direita: "Ativo" ou "Inativo"']] },
      { titulo: 'Toques', itens: [['Um toque na linha', 'Mostra os dados, sem editar.'], ['Dois toques na linha', 'Abre o cadastro para editar.'], ['Seta à direita', 'Mostra os botões Editar e Excluir (ou Desativar).']] },
      { titulo: 'Tela enxuta', texto: ['A tela de lista tem uma nota de uma linha no alto, e não um aviso longo.', 'Filtro em lista de escolha no alto da tela não é usado: as colunas e a busca fazem esse papel.', 'Lista vazia mostra uma frase dizendo que não há nada e como começar.'] },
    ] },
    { id: 'menu', titulo: 'Menu e Cartões', resumo: 'O menu principal, o submenu e os cartões de cada setor', quadros: [
      { titulo: 'Os três níveis', itens: [['Menu principal', 'As origens: Entradas, Transferências, Saídas (Despesas, Mercadorias, Retiradas), Resultados e Configurações. Cada uma com a sua cor e o seu ícone.'], ['Submenu', 'Abre embaixo da origem: Lançamentos, Relatórios, Cadastros Geral, Estoque, Pastas Documentos. Cada item com o seu ícone, na cor da origem.'],
        ['Cartões', 'A tela do item do submenu: um cartão por cadastro, com ícone, nome e a setinha.']] },
      { titulo: 'Medidas', itens: [['Ícone do menu principal', 'Quadrado colorido de 32 px'], ['Ícone do submenu', '16 px'], ['Altura do cartão', '51 px'], ['Ícone do cartão', 'Círculo de 30 px'], ['Nome do cartão', '14 px']] },
      { titulo: 'Regras de uso', texto: ['O nome do cartão começa pela sigla da origem ("DES - Cargos C/Salários", "VND - Clientes").', 'O cartão pode ser arrastado pela alça da esquerda para mudar a ordem.', 'Ao tocar num item do submenu ou num cartão, o cabeçalho da tela aberta mostra o ícone desse item.'] },
    ] },
    { id: 'janelas', titulo: 'Janelas e Painéis', resumo: 'A janela de cadastro, a de confirmação e o painel flutuante', quadros: [
      { titulo: 'Janela de cadastro', texto: ['O cadastro abre numa janela que ocupa a tela inteira, com o mesmo cabeçalho de cima e a mesma barra de baixo das telas.', 'Fecha pelo Cancelar, pelo ✕ da barra de baixo ou pelo Voltar. Com alteração não salva, o sistema pergunta antes.'] },
      { titulo: 'Janela de confirmação', texto: ['Pequena, com o título dizendo a ação, uma frase explicando o que vai acontecer e o botão com o nome da ação ("Excluir", "Trocar", "Desativar").', 'Aparece antes de qualquer ação sem volta.'],
        amostra: () => amostra(botao('Ver a confirmação', () => U.confirmar('Excluir exemplo', 'É só um exemplo: nada será apagado.', 'Excluir', () => undefined, cores), 'btn secondary')) },
      { titulo: 'Painel flutuante', texto: ['Abre colado no botão que o chamou, sem cobrir a tela (por exemplo, o painel do Enviar, com o prazo, a mensagem e os canais).', 'Fecha ao tocar fora ou na setinha de voltar do próprio painel.'] },
      { titulo: 'Janela de escolha', texto: ['Para escolher itens de um cadastro (produtos, grupos de despesa, patrimônios): busca no alto, a lista com caixas de marcar e o botão "Confirmar". Mostra quantos estão marcados.'] },
    ] },
    { id: 'mensagens', titulo: 'Mensagens e Avisos', resumo: 'Como o sistema avisa, confirma e mostra erro', quadros: [
      { titulo: 'Tipos de mensagem', itens: [['Aviso rápido', 'Aparece e some sozinho depois de salvar ("Cliente salvo.").'], ['Erro no cadastro', 'Uma frase curta perto dos botões, dizendo o que falta, mais o destaque no campo.'], ['Confirmação', 'Uma janela pequena antes de qualquer ação sem volta, com o botão dizendo a ação ("Excluir").'],
        ['Nota', 'Letra de 11 px, para explicar uma regra sem chamar atenção.'], ['Tela vazia', 'Uma frase no meio do quadro dizendo que não há nada e como começar.']],
        amostra: () => amostra(botao('Ver o aviso rápido', () => U.avisar('Exemplo de aviso: some sozinho.'), 'btn secondary'), botao('Ver a confirmação', () => U.confirmar('Excluir exemplo', 'É só um exemplo: nada será apagado.', 'Excluir', () => undefined, cores), 'btn secondary')) },
      { titulo: 'Como escrever', texto: ['A mensagem diz o que aconteceu e o que fazer: "Informe o CPF.", e não "Campo inválido".', 'Quando algo não pode ser feito, a mensagem explica o motivo e o caminho ("Troque a empresa nesses contratos antes de excluir, ou deixe-a inativa.").',
        'O sistema só diz que salvou depois de salvar de verdade.'] },
    ] },
    { id: 'conferencia', titulo: 'Conferência Final', resumo: 'O que conferir antes de dizer que uma tela está pronta', quadros: [
      { titulo: 'Tamanhos de tela', texto: ['Toda tela é conferida em três larguras, no claro e no escuro, sem barra de rolagem na horizontal.'], itens: [['Celular pequeno', '320 px'], ['Celular', '390 px'], ['iPad e computador', '1024 px']] },
      { titulo: 'Lista de conferência', texto: ['Letra e espaçamento iguais aos da tela de referência (VND - Clientes).', 'Cabeçalho de cima com 58 px, ícone de 30 px, título e subtítulo.', 'Barra de baixo com os atalhos no lugar.', 'Campos dentro de quadro, com o título na moldura.', 'Máscara em todo campo que tem formato.',
        'Campo obrigatório vazio com a borda na cor do cabeçalho e a mensagem.', 'Situação no interruptor.', 'Cancelar e Salvar por extenso, à direita, fora do quadro.', 'Editar na cor do cabeçalho e excluir em vermelho.', 'Nenhum caminho antigo sobrando para fazer a mesma coisa.'] },
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
