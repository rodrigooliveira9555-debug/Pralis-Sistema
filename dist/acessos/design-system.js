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
  const { el, entrada, seletor, botao } = U;
  // Todo campo de exemplo desta tela é a LINHA do padrão da Transferência (o desenho antigo, nome em cima e caixa embaixo, não se usa mais).
  const campo = (rotulo, no, dica) => {
    const P = window.CicluzTransferencias && window.CicluzTransferencias.pecas;
    if (!P) return U.campo(rotulo, no, dica);
    const l = P.linhaDe(rotulo, no);
    if (dica) { l.style.flexWrap = 'wrap'; l.append(Object.assign(el('small', 'profiles-note'), { textContent: dica })); l.lastChild.style.cssText = 'flex:0 0 100%;text-align:right'; }
    return l;
  };
  const cores = { cor: A.COR, corTexto: A.COR_TEXTO };
  const cor = (hex) => { const b = el('span', 'ds-cor'); b.style.background = hex; b.setAttribute('aria-hidden', 'true'); return b; };
  const comCor = (hex, texto) => { const s = el('span', 'ds-linha-cor'); s.append(cor(hex), document.createTextNode(texto)); return s; };
  const amostra = (...nos) => {
    const a = el('div', 'ds-amostra compras-largo');
    const linhas = nos.filter((n) => n && n.classList && n.classList.contains('transferencia-linha')); const resto = nos.filter((n) => !linhas.includes(n));
    if (linhas.length) { const T = el('div', 'transferencia-tela ds-transferencia'); const q = el('div', 'transferencia-quadro'); q.append(...linhas); T.append(q); a.append(T); }
    a.append(...resto); return a;
  };
  const letra = (texto, px, peso, linha) => { const p = el('p', 'ds-letra', texto); p.style.font = peso + ' ' + px + 'px/' + linha + 'px var(--ui-font)'; return p; };
  const redondo = (rotulo, desenho, perigo) => { const b = el('button', 'shortcut-circle compras-redondo' + (perigo ? ' perigo' : '')); b.type = 'button'; b.title = rotulo; b.setAttribute('aria-label', rotulo); b.innerHTML = U.svg(desenho); return b; };
  const comLegenda = (no, texto) => { const c = el('div', 'ds-peca'); c.append(no, el('small', 'profiles-note', texto)); return c; };
  /* Biblioteca de ícones: uma grade com o desenho e o nome de cada um. O desenho vem de onde o sistema o guarda (não é copiado para cá). */
  const umIcone = (html, nome) => { const c = el('div', 'ds-icone'); const q = el('span', 'ds-icone-caixa'); q.setAttribute('aria-hidden', 'true'); q.innerHTML = /^\s*<svg/.test(html) ? html : U.svg(html); c.append(q, el('small', null, nome)); return c; };
  const grade = (lista) => { const g = el('div', 'ds-icones compras-largo'); if (!lista.length) g.append(el('p', 'profiles-note', 'Nenhum ícone encontrado nesta parte.')); g.append(...lista.map(([html, nome]) => umIcone(html, nome))); return g; };
  // Os ícones do menu moram em index.html (icons, subIcone, moneyMark): lidos de lá quando existem.
  const doMenuPrincipal = () => { const l = []; if (typeof moneyMark === 'function') l.push([moneyMark(0), 'Entradas'], [moneyMark(1), 'Transferências'], [moneyMark(2), 'Saídas'], [moneyMark(3), 'Resultados']);
    if (typeof icons !== 'undefined') { if (icons.settings) l.push([icons.settings, 'Configurações']); if (icons.overview) l.push([icons.overview, 'Visão Geral']); } return l; };
  const doSubmenu = () => { if (typeof subIcone === 'undefined') return []; const porDesenho = new Map(); Object.entries(subIcone).forEach(([nome, d]) => { porDesenho.set(d, [...(porDesenho.get(d) || []), nome]); }); return [...porDesenho].map(([d, nomes]) => [d, nomes.join(', ')]); };
  /* Modelos em tamanho real do cabeçalho de cima e da barra de baixo, com cada parte numerada (as medidas vêm de acessos.css, iguais às das telas). */
  const marca = (n) => el('span', 'ds-marca', String(n));
  const DESENHOS_DA_BARRA = [['<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>', 'Menu inicial'], ['<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', 'Busca'], ['<path d="M4 7h10M4 12h7M4 17h4M17 6v12m0 0-3-3m3 3 3-3"/>', 'Ordem'],
    ['<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>', 'Período'], ['<path d="M12 5v14M5 12h14"/>', 'Novo'], ['<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>', 'Símbolo do sistema'], ['<path d="m14 6-6 6 6 6"/>', 'Voltar'],
    ['<path d="m6 6 12 12M18 6 6 18"/>', 'Fechar'], ['<path d="m5 12.5 4.5 4.5L19 7.5"/>', 'Salvar'], ['<circle cx="6" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="18" cy="12" r="1"/>', 'Mais atalhos'], ['<path d="m5 15 7-7 7 7"/>', 'Recolher o cabeçalho']];
  function modeloCabecalho() {
    const caixa = el('div', 'ds-modelo compras-largo'); const cab = el('div', 'ds-modelo-cab'); const ic = el('span', 'ds-modelo-cab-icone'); ic.innerHTML = U.svg('<path d="M8 4H6a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-2M9 3h6v3H9zM9 11h6M9 15h6"/>');
    const tx = el('div', 'ds-modelo-cab-texto'); const t = el('b', null, 'Título da tela'); const s = el('small', null, 'Origem / Submenu / Nome da tela'); t.append(marca(2)); s.append(marca(3)); tx.append(t, s);
    const i1 = el('span', 'ds-modelo-cab-ponto'); i1.append(ic, marca(1)); cab.append(i1, tx);
    const leg = el('dl', 'profiles-info'); [['1 — Ícone', 'Caixa de 30 px, desenho de 21 px. É o ícone do item que abriu a tela.'], ['2 — Título', '16 px, peso 600, branco.'], ['3 — Subtítulo', '11 px, branco: o caminho até a tela.'], ['A faixa', '58 px de altura, na cor da origem, com a curva "para baixo" nos cantos (duas curvas de 16 px logo abaixo) e 14 px de respiro nas laterais.']].forEach(([k, v]) => leg.append(el('dt', null, k), el('dd', null, v)));
    const fundo = el('div', 'ds-modelo-fundo'); const corpo = el('div', 'ds-modelo-corpo'); corpo.append(el('span')); fundo.append(cab, el('div', 'ds-modelo-curva'), corpo); caixa.append(fundo, leg); return caixa;
  }
  function modeloBarra() {
    const caixa = el('div', 'ds-modelo compras-largo'); const barra = el('div', 'ds-modelo-barra');
    const bola = (k) => { const c = el('span', 'ds-modelo-bola'); const b = el('span', 'ds-modelo-bola-desenho'); b.innerHTML = U.svg(DESENHOS_DA_BARRA[k][0]); c.append(b, marca(k + 1)); c.title = DESENHOS_DA_BARRA[k][1]; return c; };
    const grupo = (ks) => { const g = el('div', 'ds-modelo-grupo'); g.append(...ks.map(bola)); return g; };
    barra.append(grupo([0, 1, 2, 3, 4]), grupo([5]), grupo([6, 7, 8, 9, 10]));
    const leg = el('dl', 'profiles-info'); DESENHOS_DA_BARRA.forEach(([, nome], k) => leg.append(el('dt', null, (k + 1) + ' — ' + nome), el('dd', null, k < 5 ? 'Esquerda: navegação.' : k === 5 ? 'Meio: abre o menu rápido.' : 'Direita: ações da tela.')));
    leg.append(el('dt', null, 'A faixa'), el('dd', null, '60 px de altura, vidro (película clara translúcida com desfoque), 14 px de margem; cada botão é um círculo de 32 px transparente com fio cinza, que enche na cor da origem ao passar o mouse; o símbolo do meio tem 32 px, sem círculo.'));
    const vidro = el('div', 'ds-modelo-vidro'); vidro.append(barra); caixa.append(vidro, leg); return caixa;
  }
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
      { titulo: 'Tabela de tamanhos (os da Nova Transferência)', texto: ['A Nova Transferência é a referência: cada tipo de texto tem um tamanho só, em todas as telas e formulários. O primeiro número é o tamanho da letra; o segundo, a altura da linha.'],
        itens: [['Título da tela e da janela (cabeçalho)', '16 px, linha de 20 px, peso 600, branco'], ['Subtítulo do cabeçalho (o caminho)', '11 px, linha de 14 px, branco'], ['Título do grupo (acima do quadro)', '13 px, linha de 18 px, peso 600, cinza'], ['Nome do campo (esquerda da linha)', '15 px, linha de 20 px, peso 500'],
          ['Valor do campo (direita da linha)', '15 px, linha de 20 px, peso 500, cinza'], ['Resumo ao lado da seta e texto da chave (Sim/Não)', '12 px'], ['Explicação embaixo da linha e notas', '11 px, linha de 16 px'], ['Valor no quadro laranja', '34 px, peso 700, branco'], ['Rótulo do quadro laranja', '12 px, peso 600, branco'],
          ['Teclas da calculadora', '18 px, peso 600; operadores 22 px'], ['Chips (Notas, Moedas, Dias…)', '12 px, linha de 16 px, peso 500'], ['Texto dos botões', '12 px, peso 600'], ['Sigla dentro do ícone', '11 px, peso 700']],
        amostra: () => amostra(letra('Título da tela — 16 px · 600', 16, 600, 20), letra('Título do grupo — 13 px · 600', 13, 600, 18), letra('Nome do campo — 15 px · 500', 15, 500, 20), letra('Valor do campo — 15 px · 500 cinza', 15, 500, 20), letra('Chip e botão — 12 px', 12, 500, 16), letra('Nota e explicação — 11 px', 11, 400, 16)) },
    ] },
    { id: 'cores', titulo: 'Cores', resumo: 'A cor de cada origem do menu e as cores fixas', quadros: [
      { titulo: 'Cor por origem', texto: ['Cada parte do menu tem a sua cor, e tudo o que abre dali usa essa cor: cabeçalho, botões, ícones e o destaque dos campos. A cor vem do cadastro de grupos, então trocar lá troca em todas as telas.'],
        amostra: () => { const dl = el('dl', 'profiles-info compras-largo'); ORIGENS.forEach(([sigla, nome, chave, padrao]) => { const c = U.corOrigem(chave, padrao); dl.append(el('dt', null, sigla + ' — ' + nome), (() => { const dd = el('dd'); dd.append(comCor(c, c)); return dd; })()); });
          dl.append(el('dt', null, 'Configurações e Resultados'), (() => { const dd = el('dd'); dd.append(comCor(A.COR, A.COR)); return dd; })()); return dl; } },
      { titulo: 'Cores fixas', texto: ['Estas não mudam com a origem.'],
        amostra: () => { const dl = el('dl', 'profiles-info compras-largo'); [['Excluir e ações sem volta', '#e34343'], ['Fundo da página e dos quadros', '#f5f5f7'], ['Fundo dos campos, das linhas e da barra de baixo', '#ffffff'], ['Linhas e bordas', '#dedee3'], ['Borda do campo', '#d4d4d8'], ['Texto', '#606066'], ['Texto das colunas e notas', '#6e6e73'], ['Texto e ícones sobre o cabeçalho', '#ffffff']]
          .forEach(([nome, hex]) => { const dd = el('dd'); dd.append(comCor(hex, hex)); dl.append(el('dt', null, nome), dd); }); return dl; } },
      { titulo: 'Regras de uso', texto: ['Vermelho é do excluir e do joinha para baixo. Um botão que não apaga nada nunca é vermelho, mesmo numa tela de Despesas (onde o vermelho é a cor da origem, e não um alerta).', 'Azul fixo (#2563eb) é do joinha para cima.',
        'O editar usa a cor do cabeçalho da tela.', 'No tema escuro as cores de origem são as mesmas; mudam o fundo e o texto.'] },
    ] },
    { id: 'espacamento', titulo: 'Espaçamento', resumo: 'As distâncias entre quadros, campos e linhas', quadros: [
      { titulo: 'Medidas', texto: ['As distâncias são sempre as mesmas, para as telas parecerem uma só.'],
        itens: [['Primeiro quadro, abaixo do cabeçalho', '14 px'], ['Entre um quadro e outro', '12 px (do quadro até o título do grupo seguinte)'], ['Respiro dentro do quadro', '14 px nas laterais'], ['Altura da linha de campo (formulário)', '52 px, igual em todas'], ['Altura da linha de lista', '52 px'], ['Altura da linha de menu (cartão)', '51 px'],
          ['Altura do cabeçalho de cima', '58 px'], ['Altura da barra de baixo', '60 px (vidro)'], ['Respiro lateral da tela', '14 px'], ['Entre o quadro e os botões da página', '24 px'], ['Entre um botão e outro', '10 px'], ['Canto do quadro', 'Arredondado, 14 px'], ['Campo', 'Sem caixa: é só o texto na linha'], ['Canto do botão', 'Arredondado, 10 px']] },
      { titulo: 'Regras de uso', texto: ['O último campo do quadro não encosta na borda: sobra o mesmo respiro das laterais.', 'Nenhum campo, botão ou texto encosta na borda da tela ou do quadro.',
        'Linha de lista com duas linhas de texto (nome em cima, detalhe embaixo) continua com a altura padrão: diminui o respiro, não aumenta a linha.'] },
    ] },
    { id: 'icones', titulo: 'Ícones', resumo: 'O tamanho do ícone em cada lugar, o desenho e a sigla', quadros: [
      { titulo: 'Tamanho do ícone em cada lugar', texto: ['O ícone tem um tamanho para cada lugar, e é o mesmo em todas as telas. O primeiro número é o tamanho da caixa; o segundo, o do desenho dentro dela.'],
        itens: [['Cabeçalho de cima (tela e janela)', 'Caixa de 30 px, desenho de 21 px'], ['Sigla no cabeçalho', 'Caixa de 30 px, letra de 11 px'], ['Menu principal', 'Quadrado colorido de 32 px'], ['Submenu', '16 px, só o traço, na cor da origem'], ['Cartão do menu', 'Círculo de 30 px, desenho de 15 px'],
          ['Linha de lista', 'Quadrado de 30 px, cantos arredondados, na cor da origem'], ['Botão redondo de ação (editar, excluir)', 'Círculo de 32 px, desenho de 18 px'], ['Botões da barra de baixo', 'Círculo de 32 px'], ['Círculo dentro do botão com título', '28 px'], ['Aviso de campo obrigatório', '16 px']],
        amostra: () => amostra(comLegenda(redondo('Exemplo de editar', LAPIS), 'Botão redondo: 32 px'), comLegenda((() => { const i = el('span', 'ds-sigla'); i.style.background = A.COR; i.append(el('span', 'sigla-text', 'CFG')); return i; })(), 'Ícone de linha e de cabeçalho: 30 px')) },
      { titulo: 'Biblioteca — menu principal', texto: ['Os ícones das origens. O cifrão com o sinal diz o que a origem faz com o dinheiro: entra (+), troca de lugar (⇄), sai (−) ou fecha a conta (=).'], amostra: () => grade(doMenuPrincipal()) },
      { titulo: 'Biblioteca — submenu', texto: ['Os ícones dos itens que abrem embaixo de cada origem. Itens do mesmo tipo usam o mesmo desenho.'], amostra: () => grade(doSubmenu()) },
      { titulo: 'Biblioteca — peças das telas', texto: ['Os desenhos usados dentro das telas novas: cabeçalhos, linhas de lista, botões e avisos. O nome embaixo é o nome interno da peça.'], amostra: () => grade(Object.entries(U.ICONES || {}).map(([nome, d]) => [d, nome])) },
      { titulo: 'Biblioteca — barra de baixo', texto: ['Os onze botões fixos no pé da tela, na ordem em que aparecem.'], amostra: () => grade(DESENHOS_DA_BARRA) },
      { titulo: 'Biblioteca — ações da linha', texto: ['Os botões redondos que aparecem ao tocar na seta da linha.'], amostra: () => grade([[LAPIS, 'Editar'], [LIXO, 'Excluir'], ['<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>', 'Ver'], ['<path d="M5.6 5.6l12.8 12.8M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z"/>', 'Desativar'], ['<path d="m5 12 4 4L19 6"/>', 'Ativar']]) },
      { titulo: 'Biblioteca — ícones para escolher', texto: ['Os desenhos que podem ser escolhidos no cadastro de cargo, de grupo, de conta e de área, setor e local.'], amostra: () => grade((window.CicluzBakeryIcons || []).map((x) => [x.path, x.label || 'Ícone'])) },
      { titulo: 'De onde vem o ícone do cabeçalho', texto: ['O ícone do cabeçalho é o do item em que você tocou para chegar à tela. Tocou em "Cadastros Geral" no submenu, o cabeçalho mostra a prancheta de Cadastros Geral; tocou num cartão, o cabeçalho mostra o ícone daquele cartão.',
        'Cartão que não tem ícone próprio usa o do submenu de onde veio.', 'Os ícones do submenu (lápis em Lançamentos, gráfico em Relatórios, prancheta em Cadastros Geral, caixa em Estoque, pasta em Pastas Documentos) não mudam.',
        'O cabeçalho tem sempre a mesma altura e o ícone sempre o mesmo tamanho, em qualquer tela ou janela.'] },
      { titulo: 'Sigla de três letras', texto: ['As origens são identificadas por três letras dentro do quadrado do ícone: VND, CNT, DES, MER e RET. A sigla tem um tamanho só, em qualquer lugar em que apareça.',
        'Áreas, setores e locais também podem usar uma sigla de até três caracteres no lugar do desenho.'],
        amostra: () => amostra(...ORIGENS.map(([sigla, , chave, padrao]) => { const i = el('span', 'ds-sigla'); i.style.background = U.corOrigem(chave, padrao); i.append(el('span', 'sigla-text', sigla)); return i; })) },
      { titulo: 'Identidade do cadastro: nome, ícone e prévia', texto: ['Todo cadastro que tem ícone próprio usa o mesmo bloco, que é o do cadastro de grupo (VND, DES, MER, RET). Não se cria um desenho diferente para cada tela.', 'Ordem dentro da janela: 1) um quadro com o nome e, logo abaixo, "Ícone do …" com seis quadradinhos de 32 px e o resto em "Mais ícones"; 2) os outros campos em duas colunas, com o quadro de Situação (interruptor) na coluna da direita; 3) o cartão de prévia, com o ícone e o nome como vão aparecer na lista; 4) Cancelar · Salvar fora do quadro, à direita.', 'O quadradinho escolhido não muda de cor: quem mostra a escolha é o cartão de prévia. Não há texto de ajuda dentro do quadro de Situação.', 'Quando o sistema consegue escolher sozinho, o primeiro quadradinho é o "Automático". Em DES - Tipos de Uniforme ele segue o que está escrito no nome: boné, touca, camisa, calça, avental ou calçado.', 'Antes de entregar uma janela nova, ela é aberta ao lado do cadastro de grupo e comparada por foto e por medida (quadro, letra, quadradinho, prévia).'],
        amostra: () => { const T = window.CicluzUniformTypes; return amostra(...(T ? T.NOMES_PECA.map(([id, n]) => umIcone(T.ICONES_PECA[id], n)) : [el('p', 'profiles-note', 'Abra o sistema completo para ver os desenhos.')])); } },
      { titulo: 'Joinha: para cima e para baixo', texto: ['O joinha tem desenho, cor e função fixos, e não acompanha a cor da tela — do mesmo jeito que a lixeira é vermelha em qualquer tela.', 'Para cima é o positivo, sempre azul: incluso, sim, aprovado. Para baixo é o negativo, sempre vermelho: não incluso, não, reprovado.', 'No contrato: "O que está incluso" leva o joinha azul; "O que não está incluso", o vermelho.'],
        amostra: () => { const J = (window.CicluzContratos && window.CicluzContratos.JOINHA) || {}; const um = (classe, d, texto) => { const c = el('div', 'ds-icone'); const i = el('span', 'ds-joinha ' + classe); i.setAttribute('aria-hidden', 'true'); i.innerHTML = U.svg(d || ''); c.append(i, el('small', null, texto)); return c; };
          return amostra(um('joinha-cima', J.cima, 'Para cima: azul (#2563eb)'), um('joinha-baixo', J.baixo, 'Para baixo: vermelho (#e34343)')); } },
      { titulo: 'Desenho', texto: ['Os desenhos são de traço simples, sem preenchimento, todos com a mesma espessura e pontas arredondadas.', 'Cada desenho tem um nome escrito para quem usa leitor de tela.'] },
    ] },
    { id: 'cabecalho', titulo: 'Cabeçalho e Barra de Baixo', resumo: 'O cabeçalho de cima e a barra de baixo, com medidas e botões', quadros: [
      { titulo: 'Cabeçalho de cima — modelo', texto: ['O cabeçalho em tamanho real, com cada parte numerada.'], amostra: () => modeloCabecalho() },
      { titulo: 'Cabeçalho de cima — o que tem', texto: ['É a faixa colorida no alto da tela, na cor da origem, com a curva "para baixo" (duas curvas de 16 px, na cor da origem, logo abaixo dos cantos). Tem três coisas, nesta ordem.'],
        itens: [['Ícone', 'À esquerda: o ícone do item que abriu a tela (ou a sigla).'], ['Título', 'O nome da tela, ou o que a janela faz ("Novo cliente", "Editar área").'], ['Subtítulo', 'Embaixo do título: o caminho até a tela.']] },
      { titulo: 'Cabeçalho de cima — medidas', itens: [['Altura', '58 px'], ['Respiro', '8 px em cima e embaixo, 14 px nas laterais'], ['Entre o ícone e o título', '10 px'], ['Ícone', 'Caixa de 30 px, desenho de 21 px (sigla: letra de 11 px)'], ['Título', '16 px, linha de 20 px, peso 600'],
        ['Subtítulo', '11 px, linha de 14 px'], ['Cor do fundo', 'A cor da origem'], ['Cor do texto e do ícone', 'Branco'], ['Curva', 'Duas curvas de 16 px na cor da origem logo abaixo do cabeçalho (em todas as abas; some com o cabeçalho oculto)'], ['Fio de baixo', 'Na cor do cabeçalho']],
        texto: ['Estas medidas são as mesmas em todas as telas e janelas do sistema.'] },
      { titulo: 'Cabeçalho de cima — regras', texto: ['Tela e janela têm o mesmo cabeçalho. Toda janela mostra, no subtítulo, o caminho da tela de onde foi aberta.', 'O ícone nunca é maior que o das outras telas, nem fica colado no título.',
        'O cabeçalho de cima não tem botões: os atalhos ficam na barra de baixo. Ele pode ser recolhido pelo último botão da barra de baixo, para sobrar mais tela.'] },
      { titulo: 'Barra de baixo — modelo', texto: ['A barra em tamanho real, com cada botão numerado.'], amostra: () => modeloBarra() },
      { titulo: 'Barra de baixo — o que é', texto: ['É um cartão de vidro (película clara e translúcida, com desfoque forte, fio de luz e sombra macia) que flutua sobre o conteúdo, no pé da tela, com os atalhos. Fica sempre no mesmo lugar, em telas e janelas, para o dedo achar sem procurar.', 'Tem três partes: os atalhos de navegação à esquerda, o símbolo do sistema no meio e as ações da tela à direita.'],
        itens: [['Altura', '60 px'], ['Fundo', 'Vidro: degradê branco translúcido (no escuro, cinza-azulado) com desfoque de 34 px'], ['Margem', '14 px dos lados e de baixo'], ['Botões', 'Círculos de 32 px, transparentes, com fio fino cinza e ícone cinza; ao passar o mouse enchem na cor da origem'], ['Logomarca do meio', '32 px, sozinha, sem círculo'], ['Conteúdo', 'Passa por trás da barra; o fim da tela tem folga para o último item não ficar escondido']] },
      { titulo: 'Barra de baixo — botões da esquerda', itens: [['Menu inicial (casa)', 'Volta para o menu principal.'], ['Busca (lupa)', 'Abre o campo de busca da tela.'], ['Ordem', 'Coloca a lista em ordem alfabética ou volta à ordem original.'], ['Período (calendário)', 'Escolhe as datas "de … a …" quando a tela tem filtro por data.'],
        ['Novo (+)', 'Cria um registro novo, o mesmo do botão "Novo…" da lista. Fica apagado na tela que não cria nada.']] },
      { titulo: 'Barra de baixo — meio e direita', itens: [['Símbolo do sistema (meio)', 'Mostra o menu rápido.'], ['Voltar (seta)', 'Volta para a tela anterior.'], ['Fechar (✕)', 'Fecha a tela ou a janela sem salvar.'], ['Salvar (✓)', 'Salva, quando a tela tem o que salvar.'], ['Mais atalhos (…)', 'Mostra os atalhos que não couberam.'],
        ['Recolher (seta para cima)', 'Esconde ou mostra o cabeçalho de cima.']],
        texto: ['Voltar, Fechar e Salvar da barra de baixo fazem o mesmo que os botões por extenso da página; são o atalho para o polegar.'] },
    ] },
    { id: 'padrao', titulo: 'Formulário linha por linha (padrão da Transferência)', resumo: 'O padrão Apple: grupo com título, linhas de 52 px, data, hora, dias, anexo e a máscara ao passar o mouse', quadros: [
      { titulo: 'A regra', texto: ['Este é o padrão de TODO formulário do sistema, e a Nova Transferência é a referência. Os quadros abaixo são as peças reais dela (não são desenhos).', 'O formulário é feito de grupos. Cada grupo tem o título pequeno em cima e um quadro branco com as linhas de campo. Cada linha tem o nome à esquerda e o valor à direita; tocar em qualquer ponto da linha age sobre o campo.'],
        itens: [['Título do grupo', '13 px, linha de 18 px, peso 600, cinza, a 6 px acima do quadro'], ['Quadro', 'Branco, borda fina cinza, cantos de 14 px'], ['Linha de campo', '52 px de altura, TODAS iguais (de qualquer tipo: campo, seleção, data, hora, chave, Anexos, opção de painel, documento); sem padding em cima e embaixo; respiro de 14 px nas laterais, fio cinza de ponta a ponta'], ['Máscara ao passar o mouse', 'Em TODA linha, o sombreado de 6% da cor do cabeçalho cobre a linha inteira; botões redondos ficam na cor do cabeçalho; a borda não muda'], ['Exceção de altura', 'Só a linha com explicação pequena embaixo cresce o que o texto pede'], ['Nome do campo', 'À esquerda, 15 px, peso 500'], ['Valor', 'À direita, 15 px, peso 500, cinza; sem caixa, sem borda e sem fundo'], ['Obrigatório', 'Asterisco no fim do nome'], ['Primeiro quadro', 'A 14 px do cabeçalho; 14 px nas laterais'], ['Entre grupos', '12 px do quadro de cima até o título do próximo']] },
      { titulo: 'Grupo, linha, seleção e chave', texto: ['Linha de texto, linha de seleção (valor e seta para baixo) e chave Sim/Não ou Ativo/Inativo, todas com a mesma altura.'],
        amostra: () => pecaTransferencia((P) => { const nome = P.linhaDe('Nome *', entrada('text', '', { placeholder: 'Ex.: Nome…' })); const sel = P.linhaDe('Tipo', seletor([['a', 'Opção A'], ['b', 'Opção B']], '', 'Selecione')); const sit = P.linha('Situação', P.chave('Situação', true, ['Ativo', 'Inativo'], () => undefined)); return P.secao('Dados do exemplo', P.quadro(nome, sel, sit)); }) },
      { titulo: 'Data e hora', texto: ['A linha inteira abre o painel; o painel tem a mesma borda direita do quadro e começa na mesma altura da tela (6 px abaixo do quadro fixo do alto, ou do cabeçalho). Na data, tocar no mês e ano mostra dias, mês e ano juntos.', 'Data: DD/MM/AA com o ícone de calendário cinza. Hora: roleta de horas e minutos com a faixa colorida no meio. Os dois têm Limpar e Hoje/Agora.'],
        amostra: () => pecaTransferencia((P) => { const d = P.campoDeData('Data *', ''); const ld = P.abreAoTocarNaLinha(P.linha('Data *', d.caixa, d.painel), d.input, d.painel); const h = U.campoHora({ rotulo: 'Hora', valor: '' }); const lh = P.abreAoTocarNaLinha(P.linha('Hora', h.caixa, h.painel), h.input, h.painel); return P.secao('Data e hora', P.quadro(ld, lh)); }) },
      { titulo: 'Dias (e qualquer número inteiro)', texto: ['Campo numérico com − e + ao lado; tocar no campo abre a roleta de uma coluna (1 a 365), no mesmo painel da hora. Rolar mostra e escolhe a quantidade. Aqui, o Tempo de aceite: Sim/Não, depois Dias, Horas ou Dias e horas.'],
        amostra: () => pecaTransferencia((P) => P.secao('Tempo de aceite', P.quadro(P.opcaoAceite('Tempo de aceite').no))) },
      { titulo: 'Anexar (foto, vídeo, áudio, documento)', texto: ['Todo lugar que pede imagem, foto, vídeo, áudio ou documento usa a linha "Anexos": o resumo e a seta para a direita. Tocar abre o painel Anexar com Gravar áudio, Gravar vídeo, Anexar áudio, Anexar vídeo, Anexar imagem e Anexar documento (nome à esquerda, ícone em círculo cinza à direita, que fica na cor da origem ao passar). O que foi anexado aparece embaixo da linha, com o nome, o tamanho e o excluir.', 'Não se usa botão solto de "Tirar foto" ou "Galeria" no meio do formulário.'],
        amostra: () => pecaTransferencia((P) => P.secao('Observação', P.quadro(P.blocoAnexos().no))) },
      { titulo: 'Linha que abre uma lista', texto: ['Escolha de uma ou mais contas, itens ou grupos: a linha mostra o resumo e uma seta para baixo; abre a lista logo embaixo, com marca redonda, ícone, nome e situação.'],
        amostra: () => pecaTransferencia((P) => { const l = P.linhaQueAbre('Conta *', () => { l.resumo.textContent = l.resumo.textContent ? '' : 'Cofre (exemplo)'; }); return P.secao('Contas', P.quadro(l.no)); }) },
      { titulo: 'Máscara ao passar o mouse', texto: ['Em formulário, passar o mouse ou focar sombreia a LINHA INTEIRA (6 % da cor da origem). O campo nunca ganha sombreado ou borda só dele.', 'Botões e células (chips, teclas, dias do calendário): só o miolo muda (14 %, 24 % no escuro) e a borda continua a mesma; escolhido = cheio. Botões cheios de rodapé fecham um pouco a cor; o de contorno ganha sombreado; os ícones não mudam de cor.'],
        itens: [['Linha de formulário', 'Sombreado 6 %'], ['Botão, chip, tecla, célula', 'Miolo 14 % (24 % no escuro), borda igual'], ['Escolhido', 'Cheio na cor da origem'], ['Excluir (círculo)', 'Cinza; vermelho ao passar'], ['Quadro do valor (laranja)', 'Miolo branco translúcido, sem moldura']] },
      { titulo: 'Painéis flutuantes', texto: ['Data, hora, dias e anexo abrem sempre iguais: borda direita igual à do quadro da linha, começo na mesma altura da tela e, se passarem da barra de baixo, rolam por dentro. Fecham tocando fora, na linha de novo ou no Esc.'],
        itens: [['Largura', '292 px (hora 232 px, dias 150 px)'], ['Altura de partida', '6 px abaixo do quadro fixo do alto (ou do cabeçalho da tela)'], ['Alinhamento', 'Borda direita = borda do quadro'], ['Rodapé', 'Limpar e Hoje/Agora/Fechar']] },
      { titulo: 'Texto escuro nos botões cheios (tema escuro)', texto: ['No tema escuro, o texto de todo botão cheio (Salvar, Avançar, Novo…, Excluir) usa a cor do fundo da tela (escuro): o texto parece vazado. No claro continua branco.'] },
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
      { titulo: 'Texto do botão', texto: ['Botão de página tem o nome por extenso ("Cancelar", "Salvar"), nunca só um desenho.', 'O nome diz o que acontece: "Salvar", "Excluir", "Trocar" — e não "OK" ou "Sim".', 'Em botão, vermelho é só do excluir.'] },
    ] },
    { id: 'campos', titulo: 'Campos de Preenchimento', resumo: 'Rótulo, obrigatório, situação, data, hora e o aviso de campo vazio', quadros: [
      { titulo: 'Como é um campo', texto: ['Campo é uma LINHA do formulário (padrão da Transferência): o nome à esquerda, em 15 px, e o valor à direita, em 15 px cinza. Não há caixa, borda nem fundo no campo; a linha tem 52 px.', 'Campo obrigatório leva um asterisco no fim do nome. Quando ajuda, o campo traz um exemplo em cinza claro ("Ex.: Nome e sobrenome…") e uma dica curta embaixo, à direita.', 'Passar o mouse ou tocar sombreia a linha inteira, no tom da cor da origem (a mesma cor do cabeçalho). Campo de seleção abre um painel com as opções em linhas.'],
        amostra: () => amostra(campo('Nome completo *', entrada('text', '', { placeholder: 'Ex.: Nome e sobrenome…' })), campo('Tipo', seletor([['a', 'Opção A'], ['b', 'Opção B']], '', 'Selecione')), campo('Observação', entrada('text', ''), 'Dica curta, embaixo do campo.')) },
      { titulo: 'Campo obrigatório vazio', texto: ['Ao tentar avançar ou salvar com um campo obrigatório vazio, a borda do campo fica na cor do cabeçalho e aparece a mensagem embaixo: "Preencha este campo." ou "Selecione uma opção.".',
        'Todos os campos que faltam são marcados de uma vez, e a tela rola até o primeiro.', 'Toque no botão para ver.'],
        amostra: () => { const caixa = el('div', 'compras-largo ds-teste'); const c1 = campo('Nome *', entrada('text', '')); const c2 = campo('Tipo *', seletor([['a', 'Opção A']], '', 'Selecione')); caixa.append(c1, c2);
          const b = botao('Testar o aviso', () => U.sinalizarObrigatorios(caixa), 'btn secondary'); return amostra(caixa, b); } },
      { titulo: 'Situação (ativo ou inativo)', texto: ['A situação é sempre um interruptor com o texto ao lado ("Ativo" / "Inativo"), nunca uma caixa de marcar nem uma lista de escolha.', 'Perguntas de sim ou não usam o mesmo interruptor, com "Sim" / "Não".'],
        amostra: () => amostra(U.quadroSituacao('Situação do cadastro', true, { dica: 'Inativo continua cadastrado.' }), U.quadroSituacao('Terá contrato?', false, { textos: ['Sim', 'Não'], dica: 'Pergunta de sim ou não.' })) },
      { titulo: 'Campo só para leitura', texto: ['Valor que vem de outro lugar e não pode ser mudado ali (por exemplo, o salário de referência do cargo) aparece no mesmo campo, travado, com uma nota dizendo de onde vem.'] },
      { titulo: 'Campo de hora (roleta)', texto: ['A hora é um campo só, no mesmo desenho do campo de aniversário: dá para digitar HH:MM (só os números; os dois pontos entram sozinhos) ou tocar no relógio ao lado, que abre a roleta.',
        'A roleta tem duas colunas, as horas (00 a 23) e os minutos (00 a 59). Uma única faixa, na cor da origem, fica parada no meio das duas; os números rolam por baixo dela e o que parar na faixa é o escolhido, com o campo mudando junto. Nenhum número muda de cor enquanto rola, então a roleta não pisca.',
        'Rolar só o minuto com o campo vazio já escolhe a hora 00 (e rolar só a hora escolhe o minuto 00). Tocar numa hora leva ela para a faixa; tocar num minuto escolhe e fecha. As setas para cima e para baixo também mudam o valor, e Esc fecha.',
        'Hora fora de 00:00 a 23:59 mostra: "Informe a hora no formato HH:MM, de 00:00 a 23:59.". Toque no relógio para ver.'],
        amostra: () => { const h = U.campoHora({ rotulo: 'Horário', valor: '08:30' }); const no = el('div', 'compras-campo'); no.append(el('span', 'compras-rotulo', 'Horário'), h.caixa, h.painel); return amostra(no); } },
      { titulo: 'Campo de data (calendário)', texto: ['A data é um campo só, no mesmo desenho do campo de hora e do de aniversário: dá para digitar DD/MM/AA (só os números; as barras entram sozinhas) ou tocar no botão redondo do calendário ao lado, que abre o calendário do mês.',
        'O calendário mostra o mês no alto ("novembro de 2026"), com uma seta para o mês anterior e outra para o seguinte, a linha dos dias da semana (D S T Q Q S S) e os dias em células de cantos arredondados. O dia escolhido fica cheio na cor da origem, o de hoje tem um contorno, e embaixo ficam os botões Limpar e Hoje.',
        'Tocar no título abre a escolha de mês e ano (12 anos de cada vez), para ir longe sem passar mês a mês. Tocar num dia escolhe e fecha o calendário; Esc também fecha. Campo apagado ou incompleto fica sem data: só vale a data completa.',
        'Data que não existe (por exemplo, 31/02) mostra: "Informe uma data válida no formato DD/MM/AA.". O valor guardado é sempre AAAA-MM-DD, com o ano completo; no que se digita, o ano com dois números usa 00 a 49 como 2000 a 2049 e 50 a 99 como 1950 a 1999.'],
        amostra: () => { const hoje = new Date(); const iso = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0') + '-' + String(hoje.getDate()).padStart(2, '0'); const d = U.campoData({ rotulo: 'Data do lançamento', valor: iso }); const no = el('div', 'compras-campo compras-data'); no.append(el('span', 'compras-rotulo', 'Data do lançamento'), d.caixa, d.painel); return amostra(no); } },
    ] },
    { id: 'mascaras', titulo: 'Máscaras', resumo: 'O formato que cada campo assume enquanto se digita', quadros: [
      { titulo: 'Formatos', texto: ['A máscara arruma o que a pessoa digita, na hora. Ninguém precisa digitar ponto, traço, barra ou símbolo.'],
        itens: [['CPF', '000.000.000-00'], ['CNPJ', '00.000.000/0000-00'], ['Telefone e WhatsApp', '(00) 00000-0000'], ['CEP', '00000-000'], ['Dinheiro', 'R$ 0,00'], ['Percentual', '50%'], ['Data', 'DD/MM/AA'], ['Aniversário', 'DD/MM (dia e mês)'], ['Hora', 'HH:MM'], ['Código CBO', '0000-00']] },
      { titulo: 'Experimente', texto: ['Digite só os números.'],
        amostra: () => { const R = window.CicluzFieldRules || {}; const C = window.CicluzConsultas || {}; const CAD = window.CicluzComprasCadastros || {};
          const com = (rotulo, fn, extra) => { const i = entrada('text', '', { inputMode: 'numeric', ...extra }); if (fn) i.addEventListener('input', () => { i.value = fn(i.value); }); return campo(rotulo, i); };
          const pct = entrada('text', '', { inputMode: 'decimal', placeholder: '0%', maxLength: 8 }); U.mascaraPercentual(pct);
          return amostra(com('CPF', R.cpfMask, { placeholder: '000.000.000-00', maxLength: 14 }), com('CNPJ', R.cnpjMask, { placeholder: '00.000.000/0000-00', maxLength: 18 }), com('Telefone', CAD.mascaraTelefone, { placeholder: '(00) 00000-0000' }),
            com('CEP', C.cepMask, { placeholder: '00000-000', maxLength: 9 }), com('Dinheiro', R.moneyMask, { placeholder: 'R$ 0,00', maxLength: 24 }), campo('Percentual', pct)); } },
      { titulo: 'Buscas automáticas', texto: ['Ao completar o CEP, o sistema busca rua, bairro, cidade e UF. Ao completar o CNPJ, busca razão social, nome fantasia e endereço.', 'A busca só preenche o que está vazio; se o CEP ou o CNPJ for trocado por outro, os dados do novo substituem os antigos.'] },
    ] },
    { id: 'quadros', titulo: 'Quadros e Molduras', resumo: 'Tudo dentro de quadro, com o título na borda', quadros: [
      { titulo: 'A regra', texto: ['Nada fica solto na tela: todo campo, pergunta ou lista fica dentro de um quadro com borda fina e cantos arredondados.', 'O nome do quadro (o título do grupo) fica ACIMA do quadro, em letra pequena cinza ("Dados da empresa", "Endereço").',
        'Cada assunto tem o seu quadro. Um cadastro com vários assuntos tem vários quadros, cada um com o título em cima.'],
        itens: [['Borda', 'Fina, cinza claro'], ['Cantos', 'Arredondados, 14 px'], ['Respiro interno', '14 px nas laterais'], ['Título do grupo', '13 px, linha de 18 px, peso 600, cinza, a 6 px acima do quadro'], ['Fundo do quadro', 'Branco (cartão); cada linha tem 52 px, separadas por fio cinza de ponta a ponta']] },
      { titulo: 'Cadastro em etapas', texto: ['Cadastro grande é dividido em etapas, com a barra de evolução no alto: uma bolinha numerada por etapa e o nome embaixo.', 'A última etapa é sempre a "Revisão dos dados": um bloco por etapa, só para leitura, com o botão "Editar" em cada bloco e o "Salvar" no fim.',
        'Cadastro novo começa na primeira etapa. Cadastro já gravado abre na Revisão.', 'Uma pergunta pode mudar as etapas: com "Terá contrato?" em Não, a etapa Contrato some.'] },
      { titulo: 'Exemplo', amostra: () => pecaTransferencia((P) => P.secao('Dados do exemplo', P.quadro(P.linhaDe('Nome', entrada('text', '', { placeholder: 'Ex.: Nome…' })), P.linhaDe('Telefone', entrada('text', '', { placeholder: '(00) 00000-0000', inputMode: 'numeric' }))))) },
    ] },
    { id: 'listas', titulo: 'Listas', resumo: 'O formato das telas de lista e o que cada toque faz', quadros: [
      { titulo: 'Lista de escolha (onde se marca um item)', texto: ['Quando a lista serve para marcar itens — grupos e produtos no contrato, áreas e setores, peças de uniforme — ela tem o mesmo desenho da lista de origem, só que proporcionalmente menor, e ganha a caixa de marcar à esquerda do ícone.', 'Medidas da lista de escolha: linha de 44 px (a lista de origem tem 52), subnível de 36 px (origem 40), ícone de 26 px (origem 30), caixa de marcar de 20 px, nome em 13 px (origem 14) e detalhe em 10 px (origem 11).', 'A caixa marcada fica preenchida na cor do item. Tocar na linha também marca, quando a linha não abre subníveis.', 'As medidas ficam num lugar só (variáveis --escolha-*). Lista de escolha nova usa essas medidas; não se inventa outro tamanho.', 'Quando a lista tem níveis: marcar um nível marca tudo o que está abaixo dele e nada acima. Marcar um nível de baixo fica só nele. Desmarcar um nível desmarca o que está abaixo e os níveis acima.', 'No topo do quadro fica uma barra parada, com a contagem de selecionados e UM botão redondo de expandir / recolher tudo, na cor do cabeçalho da janela, com a seta para cima e para baixo. A lista rola só para cima e para baixo, sem rolagem para o lado.', 'A janela de escolha tem Cancelar e Salvar por extenso, à direita, como toda janela.', 'Onde vale hoje: árvore do Objeto do contrato e dos grupos de despesa das atividades (fornecedor e cliente); árvore de Áreas, setores e locais (Horário / Escala, Ficha de Cargos e cadastro do colaborador); peças no Lançamento de Uniforme.'] },
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
      { titulo: 'Painel flutuante', texto: ['Painéis de data, hora, dias e anexo seguem a regra do tópico "Formulário linha por linha": mesma altura na tela, borda direita na borda do quadro. Os demais painéis abrem colados no botão que os chamou, sem cobrir a tela (por exemplo, o painel do Enviar, com o prazo, a mensagem e os canais).', 'Fecha ao tocar fora ou na setinha de voltar do próprio painel.'] },
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
      { titulo: 'Conferência automática', texto: ['O botão abaixo abre, uma a uma, as telas e janelas da lista de conferência, mede o que está na tela e mostra o que foge do padrão: cabeçalho, rolagem para o lado, Cancelar e Salvar à vista, altura dos campos, rótulos, linhas de lista, lista de escolha, botão de expandir e botões redondos.', 'Nada é salvo: a rotina só abre a tela, abre a janela de cadastro e fecha em seguida.', 'Tela conferida sem pontos não quer dizer tela perfeita: a rotina mede as regras que têm número. O que é de olho (alinhamento, texto, ordem dos blocos) continua sendo conferido por foto.'], amostra: () => (window.CicluzDesignCheck ? window.CicluzDesignCheck.painel() : el('p', 'profiles-note', 'Conferência indisponível nesta tela.')) },
      { titulo: 'Tamanhos de tela', texto: ['Toda tela é conferida em três larguras, no claro e no escuro, sem barra de rolagem na horizontal.'], itens: [['Celular pequeno', '320 px'], ['Celular', '390 px'], ['iPad e computador', '1024 px']] },
      { titulo: 'Lista de conferência', texto: ['Letra e espaçamento iguais aos da tela de referência (VND - Clientes).', 'Cabeçalho de cima com 58 px, ícone de 30 px, título e subtítulo.', 'Barra de baixo com os atalhos no lugar.', 'Campos dentro de quadro, com o título na moldura.', 'Máscara em todo campo que tem formato.',
        'Campo obrigatório vazio com a borda na cor do cabeçalho e a mensagem.', 'Situação no interruptor.', 'Cancelar e Salvar por extenso, à direita, fora do quadro.', 'Editar na cor do cabeçalho e excluir em vermelho.', 'Nenhum caminho antigo sobrando para fazer a mesma coisa.'] },
    ] },
  ];

  // As peças reais da Nova Transferência (linha, quadro, data, hora, dias, anexos), dentro do contêiner que carrega o estilo dela.
  function pecaTransferencia(monta) {
    const T = window.CicluzTransferencias; const caixa = el('div', 'transferencia-tela ds-transferencia compras-largo');
    if (!T || !T.pecas) { caixa.append(el('p', 'profiles-note', 'Amostra indisponível: a tela de Transferências não foi carregada.')); return amostra(caixa); }
    caixa.append(monta(T.pecas)); return amostra(caixa);
  }
  const telas = {}; // uma tela por tópico, criada na primeira abertura
  function abrirTopico(t) {
    const tela = telas[t.id] || (telas[t.id] = A.criarTela({ id: 'acessos-ds-' + t.id, titulo: t.titulo, tela: 'ds-' + t.id }));
    tela.ativar();
    // Padrão da Nova Transferência: cada quadro é um GRUPO — título pequeno acima, quadro branco com linhas (nome à esquerda, valor à direita). Nada de título na moldura.
    const corpo = el('div', 'transferencia-tela ds-corpo');
    t.quadros.forEach((q) => {
      const sec = el('section', 'transferencia-secao'); sec.append(el('h4', 'transferencia-secao-titulo', q.titulo));
      const caixa = el('div', 'transferencia-quadro ds-quadro');
      (q.texto || []).forEach((p) => caixa.append(el('p', 'ds-texto', p)));
      (q.itens || []).forEach(([k, v]) => { const l = el('div', 'transferencia-linha ds-item'); l.append(el('span', 'transferencia-linha-rotulo', k), el('span', 'ds-item-valor', v)); caixa.append(l); });
      if (q.amostra) { const am = el('div', 'ds-amostra-linha'); am.append(q.amostra()); caixa.append(am); }
      sec.append(caixa); corpo.append(sec);
    });
    tela.body.replaceChildren(U.nota(t.resumo + '. Só leitura: nada é gravado aqui.'), corpo);
  }
  TOPICOS.forEach((t) => A.registrar('ds-' + t.id, () => abrirTopico(t)));
  window.CicluzDesignSystem = { TOPICOS };
})();
