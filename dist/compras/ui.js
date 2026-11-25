/*
 * Compras — utilitários de interface. Reaproveitam o shell do S2 (view > panel > head + content),
 * os atalhos do cabeçalho (addShortcuts), a cor de origem (setViewOriginColor) e os estilos
 * compartilhados de Ficha de Cargos (profiles-*). Cor do módulo: verde Mercadorias.
 */
(function () {
  'use strict';
  const COR = '#22c55e';
  const COR_TEXTO = '#12672e';
  const ICONES = {
    compras: '<path d="M2 3h3l3 13h12l2-10H6M10 21h1m6 0h1"/>',
    estoque: '<path d="M3 6l9-4 9 4v14l-9 3-9-3Z M3 6l9 4 9-4M12 10v13"/>',
    fornecedor: '<path d="M3 21V8l6-4v4l6-4v4l6-4v17ZM7 17h2m4 0h2"/>',
    produto: '<path d="M2 3h3l3 13h12l2-10H6M10 21h1m6 0h1"/>' /* carrinho (19/11/2026, Rodrigo): o produto usa o carrinho em toda tela, inclusive na árvore de escolha */,
    agenda: '<path d="M4 5h16v16H4zM4 10h16M8 3v4m8-4v4M9 15l2 2 4-4"/>',
    lista: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    caminhao: '<path d="M2 6h11v10H2zM13 10h4l4 4v2h-8M6 19a2 2 0 1 0 0-.01M17 19a2 2 0 1 0 0-.01"/>',
    conferencia: '<path d="M6 4h12v17H6zM9 2h6v4H9zM9 13l2 2 4-4"/>',
    cadastro: '<path d="M12 3c4.4 0 8 1.3 8 3v12c0 1.7-3.6 3-8 3s-8-1.3-8-3V6c0-1.7 3.6-3 8-3ZM4 6c0 1.7 3.6 3 8 3s8-1.3 8-3M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    cotacao: '<path d="M12 3v18M7 21h10M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2M2 16l3-8 3 8a4.4 4.4 0 0 1-6 0ZM16 16l3-8 3 8a4.4 4.4 0 0 1-6 0Z"/>',
    raio: '<path d="M13 2 4 14h7l-1 8 9-12h-7Z"/>',
    send: '<path d="M21 3 10 14M21 3l-7 18-4-7-7-4Z"/>',
    whatsapp: '<path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"/>',
    email: '<path d="M3 6h18v12H3zM3 7l9 6 9-6"/>',
    sms: '<path d="M4 5h16v11H9l-5 4zM8 10h.01M12 10h.01M16 10h.01"/>',
    voltar: '<path d="m15 5-7 7 7 7"/>',
    lixo: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
  };
  const svg = (path) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + path + '</svg>';

  function el(tag, cls, texto) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (texto !== undefined && texto !== null) n.textContent = texto;
    return n;
  }
  function botao(texto, acao, cls = 'btn secondary') {
    const b = el('button', cls, texto);
    b.type = 'button';
    b.onclick = acao;
    return b;
  }
  const dobrar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR');

  /* ---------- Telas ---------- */

  /**
   * Cria (uma vez) uma tela no padrão do S2 e devolve controles para preenchê-la.
   * caminho: texto do subtítulo; voltar: função do botão Voltar.
   */
  function criarTela({ id, titulo, caminho, icone, voltar, cor = COR, corTexto = COR_TEXTO, classe = '' }) {
    // cor/corTexto/classe: outro módulo (ex.: Agenda) reaproveita a tela na cor do próprio menu.
    const view = el('section', 'view compras-view' + (classe ? ' ' + classe : ''));
    view.id = id;
    const panel = el('div', 'panel');
    const head = el('div', 'head');
    // Mesmo identificador que o header-normalize.js espera; o card que abriu a tela pode sobrescrever.
    const badge = el('span', 'sector-icon config-inherit-icon header-origin-icon');
    badge.setAttribute('aria-hidden', 'true');
    badge.innerHTML = svg(ICONES[icone] || ICONES.compras);
    const heading = el('div');
    const h2 = el('h2', null, titulo);
    const p = el('p', null, caminho);
    heading.append(h2, p);
    head.append(badge, heading);
    const body = el('div', 'content profiles-content compras-content');
    panel.append(head, body);
    view.append(panel);
    document.querySelector('main').append(view);
    setViewOriginColor(view, cor);
    panel.style.setProperty('--panel-text', corTexto);
    const tela = { view, head, body, h2, p, voltar };
    addShortcuts(id, () => tela.voltar());
    tela.ativar = function (novoTitulo, novoCaminho) {
      const marca = head.querySelector('.sector-icon,.config-inherit-icon');
      if (marca) { marca.innerHTML = svg(ICONES[icone] || ICONES.compras); marca.style.background = ''; }
      if (novoTitulo) h2.textContent = novoTitulo;
      if (novoCaminho) p.textContent = novoCaminho;
      document.querySelectorAll('.view').forEach((x) => x.classList.remove('show'));
      view.classList.add('show');
      const crumb = document.getElementById('crumb');
      if (crumb) crumb.textContent = p.textContent;
      const t = document.getElementById('title');
      if (t) t.textContent = h2.textContent;
      normalizeHeaderActions(view);
      body.scrollTop = 0;
    };
    return tela;
  }

  /** Botão circular extra no cabeçalho (ex.: "Novo"), no padrão dos atalhos do S2. */
  function atalho(tela, rotulo, path, acao, { criar = false } = {}) {
    // criar=true marca a ação de criação da tela (header-add-circle): é ela que o "+" fixo do menu rápido aciona.
    const b = el('button', 'shortcut-circle compras-atalho' + (criar ? ' header-add-circle' : ''));
    b.type = 'button';
    b.title = rotulo;
    b.setAttribute('aria-label', rotulo);
    b.innerHTML = svg('<path d="' + path + '"/>');
    b.onclick = acao;
    tela.head.querySelector('.shortcut-actions').prepend(b);
    return b;
  }

  /* ---------- Blocos de conteúdo ---------- */

  function secao(titulo, contador, acoes) {
    const s = el('section', 'compras-secao');
    const cab = el('div', 'compras-secao-cab');
    const h = el('h3', null, titulo);
    if (contador !== undefined) {
      const c = el('span', 'compras-conta' + (contador ? ' ativa' : ''), String(contador));
      h.append(c);
    }
    cab.append(h);
    if (acoes) cab.append(...[].concat(acoes));
    s.append(cab);
    return s;
  }
  const vazio = (titulo, texto) => {
    const v = el('div', 'compras-vazio');
    v.append(el('b', null, titulo));
    if (texto) v.append(el('p', null, texto));
    return v;
  };
  /** Etiqueta de situação (tons: neutro, info, marca, atencao, positivo, negativo). */
  const situacao = (texto, tom = 'neutro') => el('span', 'compras-situacao tom-' + tom, texto);
  const nota = (texto) => el('p', 'profiles-note', texto);

  function campo(rotulo, no, dica) {
    const l = el('label', 'compras-campo');
    l.append(el('span', 'compras-rotulo', rotulo));
    no.setAttribute('aria-label', rotulo);
    l.append(no);
    if (dica) l.append(el('small', 'profiles-note', dica));
    return l;
  }
  function entrada(tipo = 'text', valor = '', extra = {}) {
    const i = el('input');
    i.type = tipo;
    if (valor !== null && valor !== undefined) i.value = valor;
    Object.assign(i, extra);
    return i;
  }
  function seletor(opcoes, valor = '', vazioTexto) {
    const s = el('select');
    if (vazioTexto !== undefined) s.add(new Option(vazioTexto, ''));
    opcoes.forEach((o) => s.add(Array.isArray(o) ? new Option(o[1], o[0]) : new Option(o, o)));
    s.value = valor == null ? '' : valor;
    return s;
  }
  /** Chips de escolha única (ex.: atalhos de prazo e margem). */
  function chips(opcoes, valor, aoMudar) {
    const box = el('div', 'compras-chips');
    box.setAttribute('role', 'group');
    const render = (atual) => {
      box.replaceChildren(...opcoes.map(([v, t]) => {
        const b = botao(t, () => { render(v); aoMudar(v); }, 'compras-chip' + (String(v) === String(atual) ? ' ativo' : ''));
        b.setAttribute('aria-pressed', String(String(v) === String(atual)));
        return b;
      }));
    };
    render(valor);
    box.atualizar = render;
    return box;
  }
  function busca(placeholder, aoBuscar) {
    const i = entrada('search', '', { placeholder });
    i.setAttribute('aria-label', placeholder);
    i.className = 'compras-busca';
    i.oninput = () => aoBuscar(i.value);
    return i;
  }

  /**
   * Busca de tela que se redesenha a cada filtro. O MESMO campo é reaproveitado entre um desenho e outro (por chave):
   * assim o layout-review.js não o recolhe de novo na lupa e o cursor não se perde a cada letra. A lista é refeita
   * 180 ms depois da última tecla. Devolve o nó para pôr na tela (a caixa da lupa, quando já embrulhado).
   */
  const buscasFixas = new Map();
  function buscaFixa(chave, placeholder, valor, aoBuscar) {
    let b = buscasFixas.get(chave);
    if (!b) {
      const i = busca(placeholder, () => {});
      let espera = null;
      b = { i, aoBuscar };
      i.oninput = () => {
        clearTimeout(espera);
        espera = setTimeout(() => {
          const pos = i.selectionStart;
          b.aoBuscar(i.value);
          // O desenho novo pode ter tirado o campo do lugar: devolve o foco e o cursor.
          if (document.activeElement !== i && i.isConnected) { i.focus(); try { i.setSelectionRange(pos, pos); } catch (e) { /* campo sem seleção */ } }
        }, 180);
      };
      buscasFixas.set(chave, b);
    }
    b.aoBuscar = aoBuscar;
    // Valor mudado por fora (ex.: "Limpar"): acompanha, a não ser enquanto a pessoa digita.
    if (document.activeElement !== b.i && b.i.value !== (valor || '')) b.i.value = valor || '';
    return b.i.closest('.local-search-control') || b.i;
  }

  /** Arrastar com o mouse para rolar a lista para os lados (o toque e o trackpad já rolam sozinhos). */
  function arrastarParaRolar(caixa) {
    let inicio = null;
    let arrastou = false;
    caixa.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || caixa.scrollWidth <= caixa.clientWidth || e.target.closest('button,input,select,a')) return;
      inicio = { x: e.clientX, rolagem: caixa.scrollLeft };
      arrastou = false;
    });
    caixa.addEventListener('pointermove', (e) => {
      if (!inicio) return;
      const dx = e.clientX - inicio.x;
      if (!arrastou && Math.abs(dx) < 6) return;
      arrastou = true;
      caixa.classList.add('arrastando');
      caixa.scrollLeft = inicio.rolagem - dx;
    });
    const soltar = () => { inicio = null; caixa.classList.remove('arrastando'); };
    caixa.addEventListener('pointerup', soltar);
    caixa.addEventListener('pointerleave', soltar);
    // Depois de arrastar, o clique que sobra não abre a edição da linha.
    caixa.addEventListener('click', (e) => { if (arrastou) { e.stopPropagation(); e.preventDefault(); arrastou = false; } }, true);
  }

  /**
   * Título da lista dentro de um botão retangular no padrão do sistema (texto à esquerda, círculo com "+" à direita, na
   * cor do menu de onde se veio): tocar abre o cadastro de um item novo. rotuloAcao vira a dica e o texto do leitor de
   * tela (ex.: "Cadastrar fornecedor"). O .footer-action-icon próprio faz o layout-review.js manter o "+".
   */
  function botaoTitulo(titulo, rotuloAcao, acao, desenho = '<path d="M12 5v14M5 12h14"/>') {
    const b = el('button', 'btn compras-titulo-botao', titulo);
    b.type = 'button';
    b.title = rotuloAcao;
    b.setAttribute('aria-label', rotuloAcao);
    // desenho: o que vai no círculo (o "+" por padrão; ex.: o aviãozinho de enviar).
    b.insertAdjacentHTML('beforeend', '<svg class="footer-action-icon" viewBox="0 0 24 24" aria-hidden="true">' + desenho + '</svg>');
    b.onclick = acao;
    return b;
  }

  /**
   * Ponta direita do cabeçalho branco de uma lista: a quantidade dentro de um círculo (só informação: contorno e fundo
   * claro na cor do menu, sem foco nem clique; vira pílula com 2 ou 3 dígitos). Ao lado dela pode entrar uma bolinha
   * (ex.: o "‹ ›" de ocultar/mostrar colunas). descricao: texto para o leitor de tela (ex.: "7 fornecedores ativos").
   */
  function pontaDaLista(quantidade, descricao) {
    const g = el('span', 'compras-secao-ponta');
    const c = el('span', 'compras-contagem', String(quantidade));
    c.setAttribute('role', 'img');
    c.setAttribute('aria-label', descricao);
    c.title = descricao;
    g.append(c);
    return g;
  }

  /**
   * Cabeçalho das colunas de uma lista em grade (mesma classe de grade das linhas). Coluna com ocultavel: true ganha,
   * ao lado do título, a mesma setinha do fim das linhas; ali ela encolhe a coluna (fica só a setinha, para reabrir)
   * ou expande. lista: o elemento da lista, que recebe a classe oculta-<chave>; preferencia: chave do localStorage
   * onde a escolha fica guardada por aparelho (lista das colunas ocultas; não é dado do cadastro).
   * O cabeçalho devolvido traz em .botaoGeral a bolinha "‹ ›" que oculta ou mostra todas as colunas de uma vez (para a
   * ponta direita do cabeçalho da lista); ela acompanha as setinhas: todas abertas, todas ocultas ou misto.
   */
  function cabecalhoColunas(grade, colunas, { lista, preferencia } = {}) {
    const r = el('div', 'compras-linha em-colunas compras-linha-cabecalho ' + grade);
    r.append(el('span', 'compras-linha-icones'));
    let ocultas = [];
    try { const v = JSON.parse(localStorage.getItem(preferencia) || '[]'); if (Array.isArray(v)) ocultas = v; } catch (e) { /* sem preferência salva */ }
    const ocultaveis = lista ? colunas.filter((c) => c.ocultavel).map((c) => c.chave) : [];
    // Preferência antiga com coluna que não é mais ocultável (ex.: o nome) é ignorada.
    ocultas = ocultas.filter((c) => ocultaveis.includes(c));
    const pintores = [];
    const guardar = () => { try { localStorage.setItem(preferencia, JSON.stringify(ocultas)); } catch (err) { /* vale só nesta visita */ } };
    const geral = el('button', 'shortcut-circle compras-redondo compras-colunas-geral');
    geral.type = 'button';
    geral.innerHTML = svg('<path d="m9 5-6 7 6 7M15 5l6 7-6 7"/>');
    const pintarGeral = () => {
      const fechadas = ocultaveis.filter((c) => ocultas.includes(c)).length;
      const algumaAberta = fechadas < ocultaveis.length;
      // Com alguma coluna aberta (todas ou misto), o toque oculta todas; com todas ocultas, mostra todas.
      geral.setAttribute('aria-expanded', String(algumaAberta));
      geral.dataset.estado = fechadas === 0 ? 'abertas' : algumaAberta ? 'misto' : 'ocultas';
      const dica = algumaAberta ? 'Ocultar todas as colunas' : 'Mostrar todas as colunas';
      geral.title = dica;
      geral.setAttribute('aria-label', dica);
    };
    geral.onclick = () => {
      const algumaAberta = ocultaveis.some((c) => !ocultas.includes(c));
      ocultas = algumaAberta ? [...new Set([...ocultas, ...ocultaveis])] : ocultas.filter((c) => !ocultaveis.includes(c));
      guardar();
      pintores.forEach((p) => p());
      pintarGeral();
      if (lista) lista.scrollLeft = 0;
    };
    colunas.forEach(({ chave, rotulo, ocultavel }) => {
      const c = el('span', 'compras-celula c-' + chave);
      if (rotulo) c.append(el('span', 'compras-coluna-titulo', rotulo));
      if (ocultavel && lista) {
        // Mesmo desenho da seta das linhas (createFinancialActions), mas com classe própria: a seta das linhas fecha
        // todas as .account-action-toggle da lista ao abrir uma, e isso trocaria o estado das colunas.
        const b = el('button', 'compras-coluna-seta');
        b.type = 'button';
        b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';
        const pintar = () => {
          const oculta = ocultas.includes(chave);
          lista.classList.toggle('oculta-' + chave, oculta);
          b.setAttribute('aria-expanded', String(!oculta));
          const dica = (oculta ? 'Mostrar' : 'Ocultar') + ' coluna ' + rotulo;
          b.title = dica;
          b.setAttribute('aria-label', dica);
        };
        b.onclick = (e) => {
          e.stopPropagation();
          ocultas = ocultas.includes(chave) ? ocultas.filter((x) => x !== chave) : [...ocultas, chave];
          guardar();
          pintar();
          pintarGeral();
        };
        pintores.push(pintar);
        pintar();
        c.append(b);
      }
      r.append(c);
    });
    pintarGeral();
    if (ocultaveis.length) r.botaoGeral = geral;
    return r;
  }

  /**
   * Busca da tela pela lupa do rodapé fixo (people-header-pilot.js), como na Ficha de Cargos: o campo fica numa
   * caixa .profiles-search que o rodapé adota, e um botão "Buscar" no cabeçalho (que o rodapé aciona pela lupa)
   * abre e fecha. Fechar limpa a busca. Criada uma vez por tela; devolve a caixa para entrar no corpo a cada desenho.
   */
  function buscaRodape(tela, rotulo, aoBuscar) {
    if (!tela.buscaRodape) {
      const caixa = el('div', 'profiles-search');
      caixa.hidden = true;
      const i = entrada('search', '', { placeholder: rotulo });
      i.setAttribute('aria-label', rotulo);
      caixa.append(i);
      const b = { caixa, i, aoBuscar };
      let espera = null;
      i.oninput = () => { clearTimeout(espera); espera = setTimeout(() => b.aoBuscar(i.value), 180); };
      const botaoBusca = atalho(tela, 'Buscar', 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM16 16l5 5', () => {
        caixa.hidden = !caixa.hidden;
        if (caixa.hidden) { if (i.value) { i.value = ''; b.aoBuscar(''); } } else i.focus();
      });
      botaoBusca.classList.add('header-search-circle');
      tela.buscaRodape = b;
    }
    tela.buscaRodape.aoBuscar = aoBuscar;
    return tela.buscaRodape.caixa;
  }

  /** Tabela simples com rolagem horizontal própria. colunas: [[rotulo, (linha)=>Node|string, cls]] */
  function tabela(colunas, linhas, { aoClicar, vazioTexto = 'Nada para mostrar.', classeLinha } = {}) {
    const box = el('div', 'compras-tabela-box');
    if (!linhas.length) { box.append(vazio(vazioTexto)); return box; }
    const t = el('table', 'compras-tabela');
    const thead = el('thead');
    const tr = el('tr');
    colunas.forEach(([rotulo, , cls]) => { const th = el('th', cls || null, rotulo); th.scope = 'col'; tr.append(th); });
    thead.append(tr);
    const tbody = el('tbody');
    linhas.forEach((linha) => {
      const r = el('tr', classeLinha ? classeLinha(linha) : null);
      colunas.forEach(([, valor, cls]) => {
        const td = el('td', cls || null);
        const v = valor(linha);
        if (v instanceof Node) td.append(v); else td.textContent = v == null ? '' : v;
        r.append(td);
      });
      if (aoClicar) {
        r.tabIndex = 0;
        r.classList.add('clicavel');
        r.onclick = (e) => { if (!e.target.closest('button,input,select,a')) aoClicar(linha); };
        r.onkeydown = (e) => { if (e.key === 'Enter') aoClicar(linha); };
      }
      tbody.append(r);
    });
    t.append(thead, tbody);
    box.append(t);
    return box;
  }

  /**
   * Linha de lista no padrão das listas do S2 (moldura única, divisor fino).
   * acoes: { rotulo, lista, aoEditar, aoExcluir } põe à direita a setinha dos cadastros de grupos
   * (createFinancialActions, de financial-components.js): tocar na seta revela Editar e Excluir; tocar
   * na linha edita. Com acoes a linha não é um <button>, para não haver botão dentro de botão.
   * icones: [{ icone | html, cor, rotulo }] no lugar de icone, quando a linha tem um ou mais ícones com cor própria
   * (ex.: fornecedor de Produto em verde e de Serviço em vermelho); o rótulo vira a dica e o texto do leitor de tela.
   * colunas + grade: no lugar de titulo/detalhe/direita, a linha vira uma grade de colunas fixas, igual em todas as
   * linhas (as larguras ficam no CSS, na classe passada em grade). colunas = [{ chave, conteudo }], conteudo texto,
   * nó ou lista de nós; célula sem conteúdo fica vazia. Na tela estreita as células empilham sob o nome.
   * estado: texto pequeno à direita, antes da seta (ex.: "Ativo"), como nos cadastros de grupos.
   */
  /** Cor de uma origem do menu (mercadorias, despesas, retiradas…): a mesma fonte dos cartões do menu (groupConfig, de groups.js). */
  const corOrigem = (chave, padrao) => { try { return (typeof groupConfig !== 'undefined' && groupConfig[chave] && groupConfig[chave].color) || padrao; } catch (e) { return padrao; } };
  /**
   * Campo de percentual que mostra o "%" enquanto a pessoa digita (18/11/2026, Rodrigo): só números e uma vírgula, com o símbolo
   * sempre no fim e o cursor antes dele. Para ler o número, use lerPercentual(input).
   */
  function mascaraPercentual(input) {
    const pintar = () => {
      const limpo = String(input.value).replace(/[^\d,]/g, '').replace(/,(?=.*,)/g, '');
      input.value = limpo ? limpo + '%' : '';
      if (limpo && document.activeElement === input) { try { input.setSelectionRange(limpo.length, limpo.length); } catch (e) { /* campo sem seleção */ } }
    };
    input.addEventListener('input', pintar); pintar();
    return input;
  }
  const lerPercentual = (input) => String(input.value).replace('%', '').trim();
  /** Caixa de marcar com rótulo (e dica opcional). O input fica em .input. */
  function interruptor(rotulo, marcado, dica) {
    const l = el('label', 'compras-interruptor');
    const c = entrada('checkbox');
    c.checked = Boolean(marcado);
    l.append(c, el('span', null, rotulo));
    if (dica) l.append(el('small', 'profiles-note', dica));
    l.input = c;
    return l;
  }
  /**
   * Janela de escolha (peça única: vínculos do fornecedor e objeto do contrato): busca, lista de caixas de marcar (com níveis) e
   * Confirmar. itens: [{ id, rotulo, busca, nivel, travado, dica }]. marcados: Set de ids. aoConfirmar(Set).
   */
  function seletorDeItens({ titulo, rotuloBusca, itens, marcados, aoConfirmar, limite = 80, cor, corTexto }) {
    const escolha = new Set(marcados);
    dialogo({
      titulo, ...(cor ? { cor, corTexto } : {}), rotuloSalvar: 'Confirmar',
      montar: (fm) => {
        const campoBusca = entrada('text', '', { placeholder: rotuloBusca, maxLength: 80, autocomplete: 'off' });
        campoBusca.setAttribute('aria-label', rotuloBusca);
        campoBusca.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });
        const resumo = el('p', 'profiles-note');
        resumo.setAttribute('role', 'status');
        const lista = el('div', 'compras-vinculos-lista');
        const contar = (achados) => {
          resumo.textContent = (escolha.size === 1 ? '1 marcado' : escolha.size + ' marcados') + '.' + (achados > limite ? ' Mostrando ' + limite + ' de ' + achados + ': use a busca.' : '');
        };
        const desenhar = () => {
          const termo = dobrar(campoBusca.value.trim());
          const achados = itens.filter((i) => !termo || dobrar(i.busca || i.rotulo).includes(termo));
          lista.replaceChildren(...achados.slice(0, limite).map((i) => {
            const l = interruptor(i.rotulo, Boolean(i.travado) || escolha.has(i.id), i.dica || '');
            if (i.nivel) l.classList.add('compras-vinculo-nivel');
            l.input.disabled = Boolean(i.travado);
            l.input.onchange = () => { if (l.input.checked) escolha.add(i.id); else escolha.delete(i.id); contar(achados.length); };
            return l;
          }));
          if (!achados.length) lista.append(el('p', 'profiles-note', termo ? 'Nada encontrado.' : 'Nada cadastrado.'));
          contar(achados.length);
        };
        campoBusca.addEventListener('input', desenhar);
        const box = el('div', 'compras-campo compras-largo');
        box.append(campoBusca, resumo, lista);
        fm.append(box);
        desenhar();
      },
      salvar: () => { aoConfirmar(escolha); },
    });
  }
  /**
   * Um toque faz uma coisa; dois toques seguidos, outra (18/11/2026, Rodrigo: na lista, um toque mostra os dados e dois toques abrem
   * o cadastro para editar). O toque único espera um instante pelo segundo, para não abrir uma janela e logo outra por cima.
   * Serve para mouse e para o dedo (não depende do evento de duplo clique do navegador).
   */
  function umOuDoisToques(um, dois, espera = 300) {
    let t = null;
    return () => { if (t) { clearTimeout(t); t = null; dois(); return; } t = setTimeout(() => { t = null; um(); }, espera); };
  }
  function linhaLista({ icone, icones, titulo, detalhe, colunas, grade, estado, direita, aoClicar, acoes }) {
    const r = el(aoClicar && !acoes ? 'button' : 'div', 'compras-linha');
    if (aoClicar && !acoes) { r.type = 'button'; r.onclick = aoClicar; }
    if (icone) { const i = el('span', 'compras-linha-icone'); i.innerHTML = svg(ICONES[icone] || icone); r.append(i); }
    if (icones && icones.length) {
      const grupo = el('span', 'compras-linha-icones');
      icones.forEach((x) => {
        const i = el('span', 'compras-linha-icone');
        // html: desenho pronto (ex.: o símbolo da origem, moneyMark); senão, um ícone do Compras pelo nome.
        i.innerHTML = x.html || svg(ICONES[x.icone] || x.icone);
        if (x.cor) i.style.setProperty('--menu-accent', x.cor);
        if (x.rotulo) { i.title = x.rotulo; i.setAttribute('role', 'img'); i.setAttribute('aria-label', x.rotulo); }
        grupo.append(i);
      });
      r.append(grupo);
    }
    if (colunas) {
      r.classList.add('em-colunas', grade);
      colunas.forEach(({ chave, conteudo }) => {
        const c = el('span', 'compras-celula c-' + chave);
        const itens = [].concat(conteudo == null ? [] : conteudo).filter((x) => x !== '' && x != null);
        c.append(...itens);
        r.append(c);
      });
    } else {
      const meio = el('span', 'compras-linha-texto');
      meio.append(el('b', null, titulo));
      if (detalhe) meio.append(el('small', null, detalhe));
      r.append(meio);
      if (direita) { const d = el('span', 'compras-linha-direita'); d.append(...[].concat(direita)); r.append(d); }
    }
    if (estado) r.append(el('span', 'account-list-state', estado));
    if (acoes) {
      // account-list-row: é a classe que o fechamento "tocar fora" do componente procura.
      r.classList.add('com-acoes', 'account-list-row');
      r.tabIndex = 0;
      const { arrow, actions } = createFinancialActions({ label: acoes.rotulo, container: acoes.lista, onEdit: acoes.aoEditar, onDelete: acoes.aoExcluir });
      r.append(arrow, actions);
      r.onclick = (e) => {
        if (e.target.closest('button')) return;
        if (!actions.hidden) { actions.hidden = true; arrow.setAttribute('aria-expanded', 'false'); return; }
        acoes.aoEditar();
      };
      r.onkeydown = (e) => { if (e.target === r && e.key === 'Enter') { e.preventDefault(); acoes.aoEditar(); } };
    }
    return r;
  }

  /** Bolinhas de ranking (verde = mais vende, amarela = mais compramos, azul = mais lucro). */
  function bolinhasDe(produtoId, b) {
    const box = el('span', 'compras-bolinhas');
    [['vende', 'Mais vende'], ['compra', 'Mais compramos'], ['lucro', 'Mais lucro']].forEach(([k, t]) => {
      if (b[k].has(produtoId)) { const s = el('span', 'compras-bolinha b-' + k); s.title = t; s.setAttribute('aria-label', t); box.append(s); }
    });
    return box;
  }
  function legendaBolinhas() {
    const box = el('span', 'compras-legenda');
    [['vende', 'Mais vende'], ['compra', 'Mais compramos'], ['lucro', 'Mais lucro']].forEach(([k, t]) => {
      const i = el('span', 'compras-legenda-item');
      i.append(el('span', 'compras-bolinha b-' + k), document.createTextNode(t));
      box.append(i);
    });
    box.title = 'Top 20% dos últimos 3 meses';
    return box;
  }

  /* ---------- Diálogos ---------- */

  /**
   * Diálogo modal no padrão do S2. montar(form) devolve o contexto; salvar(ctx) devolve
   * mensagem de erro (string) ou nada para fechar. Sem `salvar`, mostra só "Fechar".
   */
  /**
   * Padrão único de moldura (18/11/2026, Rodrigo): em toda janela, campo que ficaria solto direto no formulário entra num
   * quadro com nome. Junta cada sequência de campos soltos (e o que estiver entre eles: notas, avisos) num fieldset; o que
   * já está num quadro, numa etapa ou na barra de etapas não é tocado. O nome vem da opção "quadro" ou do título da janela
   * sem o verbo ("Editar unidade" → "Unidade"). Janela só de texto (confirmação, aviso) fica como está.
   */
  const CAMPO_SOLTO = 'label.compras-campo, .compras-campo, .account-status, label.compras-interruptor, .compras-interruptor, .compras-cartoes';
  const FORA_DO_QUADRO = 'fieldset, .stepper-wrap, .compras-etapa, .compras-etapas-nav, .compras-dialog-acoes, .profiles-error';
  function nomeDoQuadro(titulo) {
    const resto = String(titulo || '').replace(/^Prévia\s*[—-]\s*/i, '').replace(/^(Novo|Nova|Editar|Cadastro|Cadastrar|Registrar|Alterar|Lançar|Adicionar|Incluir)\s+/i, '').trim();
    return resto ? resto.charAt(0).toLocaleUpperCase('pt-BR') + resto.slice(1) : 'Dados';
  }
  function enquadrarSoltos(form, nome) {
    const grupos = []; let atual = [];
    [...form.children].forEach((n) => { if (n.matches(FORA_DO_QUADRO)) { grupos.push(atual); atual = []; } else atual.push(n); });
    grupos.push(atual);
    grupos.forEach((nos) => {
      const a = nos.findIndex((n) => n.matches(CAMPO_SOLTO)); if (a < 0) return;
      let b = nos.length - 1; while (!nos[b].matches(CAMPO_SOLTO)) b -= 1;
      const quadro = el('fieldset', 'compras-fieldset compras-quadro-auto compras-largo');
      quadro.append(el('legend', null, nome));
      nos[a].before(quadro);
      quadro.append(...nos.slice(a, b + 1));
    });
  }
  function dialogo({ titulo, subtitulo, montar, salvar, rotuloSalvar = 'Salvar', largo = false, aoFechar, cor = COR, corTexto = COR_TEXTO, classe = '', quadro }) {
    const d = el('dialog', 'location-dialog profiles-dialog compras-dialog' + (largo ? ' largo' : '') + (classe ? ' ' + classe : ''));
    d.style.setProperty('--menu-accent', cor);
    d.style.setProperty('--dialog-accent', cor);
    d.style.setProperty('--panel-text', corTexto);
    const h = el('h2', null, titulo);
    d.append(h);
    // Padrão das telas de edição: o título sempre vem com o caminho de navegação logo abaixo (como no Cadastro da conta).
    const caminho = subtitulo || (document.getElementById('crumb') || {}).textContent || '';
    if (caminho) d.append(el('p', 'compras-dialog-sub', caminho));
    const form = el('form', 'account-editor compras-form');
    const erro = el('p', 'profiles-error');
    erro.setAttribute('role', 'alert');
    const ctx = montar(form, d) || {};
    enquadrarSoltos(form, quadro || nomeDoQuadro(titulo));
    const acoes = el('div', 'actions compras-dialog-acoes');
    // Design System (Rodrigo, 19/11/2026 — supera, para as janelas simples, a decisão de 04/11 de esconder a linha): toda janela mostra
    // Cancelar · Salvar por extenso, à direita, fora do quadro (Fechar quando não há o que salvar). O ✓ e o ✕ da barra de baixo continuam
    // funcionando (a barra procura um botão "Salvar…"). Só a janela que já tem a sua própria navegação por etapas
    // (.compras-etapas-nav: Voltar · Avançar · Salvar) mantém esta linha fora da vista, para não haver dois botões de salvar.
    const temEtapas = Boolean(form.querySelector('.compras-etapas-nav'));
    if (temEtapas) acoes.classList.add('compras-dialog-acoes-rodape');
    acoes.append(botao(salvar ? 'Cancelar' : 'Fechar', () => d.close(), 'btn ghost'));
    if (salvar) {
      const s = el('button', 'btn', temEtapas ? (/^Salvar(\s|$)/i.test(rotuloSalvar) ? rotuloSalvar : 'Salvar · ' + rotuloSalvar) : 'Salvar');
      s.type = 'submit'; if (!temEtapas && !/^Salvar(\s|$)/i.test(rotuloSalvar)) s.title = rotuloSalvar;
      acoes.append(s);
    }
    form.append(erro, acoes);
    // salvar pode devolver uma promessa (ex.: guardar um áudio antes de gravar o cadastro);
    // enquanto ela não termina, um segundo toque no ✓ não salva de novo.
    let salvando = false;
    form.onsubmit = async (e) => {
      e.preventDefault();
      if (!salvar) return d.close();
      if (salvando) return;
      salvando = true;
      let msg;
      // Se salvar responde depois (servidor), mostra "Salvando…" e trava o botão até a resposta. Salvar na hora: nada muda.
      const enviar = form.querySelector('button[type=submit]');
      const espera = setTimeout(() => { erro.textContent = 'Salvando…'; if (enviar) enviar.disabled = true; form.setAttribute('aria-busy', 'true'); }, 0);
      try { msg = await salvar(ctx); } catch (err) { console.warn(err); msg = 'Não foi possível salvar. Tente de novo.'; } finally {
        salvando = false;
        clearTimeout(espera);
        if (erro.textContent === 'Salvando…') erro.textContent = '';
        if (enviar) enviar.disabled = false;
        form.removeAttribute('aria-busy');
      }
      if (msg) { erro.textContent = msg; sinalizarObrigatorios(form); return; }
      d.close();
    };
    d.append(form);
    document.body.append(d);
    d.addEventListener('close', () => { d.remove(); if (aoFechar) aoFechar(); });
    d.showModal();
    const foco = form.querySelector('input:not([type=checkbox]):not([readonly]),select,textarea');
    if (foco) foco.focus();
    // O rodapé é montado pelo shell logo depois de abrir: o ✓ ganha o nome da ação como dica.
    if (salvar) setTimeout(() => { const ok = d.querySelector('.people-save-control'); if (ok) { ok.title = rotuloSalvar; ok.setAttribute('aria-label', rotuloSalvar); } }, 120);
    return d;
  }

  /**
   * Sinaliza os campos obrigatórios vazios (pedido do Rodrigo, 17/11/2026): quando Avançar ou Salvar não passa, cada
   * campo obrigatório vazio que está à vista dentro de "raiz" ganha o contorno na cor do menu e, embaixo, uma linha com
   * o ícone de exclamação ("Preencha este campo." / "Selecione uma opção."). Todos de uma vez; a tela rola até o
   * primeiro; o aviso de cada campo some quando ele é preenchido. O nome do campo não muda de cor: só a moldura. Obrigatório é o campo cujo
   * rótulo termina em " *". Devolve quantos campos foram sinalizados.
   */
  const ICONE_AVISO = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/></svg>';
  function limparSinal(campo) {
    campo.classList.remove('campo-pendente');
    campo.querySelectorAll(':scope > .campo-aviso').forEach((a) => a.remove());
  }
  function sinalizarObrigatorios(raiz) {
    if (!raiz) return 0;
    raiz.querySelectorAll('.campo-pendente').forEach(limparSinal);
    const pendentes = [];
    raiz.querySelectorAll('.compras-campo').forEach((campo) => {
      const rotulo = campo.querySelector(':scope > .compras-rotulo');
      if (!rotulo || !rotulo.textContent.trim().endsWith('*') || campo.offsetParent === null) return;
      const entradas = [...campo.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]), select, textarea')];
      if (!entradas.length || entradas.some((i) => String(i.value || '').trim())) return;
      const alvo = entradas.find((i) => i.offsetParent !== null) || entradas[0];
      const aviso = el('small', 'campo-aviso');
      aviso.setAttribute('role', 'alert');
      aviso.innerHTML = ICONE_AVISO;
      aviso.append(el('span', null, alvo.tagName === 'SELECT' ? 'Selecione uma opção.' : 'Preencha este campo.'));
      campo.classList.add('campo-pendente');
      campo.append(aviso);
      const aoMexer = () => { if (entradas.some((i) => String(i.value || '').trim())) { limparSinal(campo); entradas.forEach((i) => { i.removeEventListener('input', aoMexer); i.removeEventListener('change', aoMexer); }); } };
      entradas.forEach((i) => { i.addEventListener('input', aoMexer); i.addEventListener('change', aoMexer); });
      pendentes.push(alvo);
    });
    // Só rola até o primeiro: com o cursor dentro, o campo mostraria a moldura de foco (cinza) em vez da cor do aviso.
    if (pendentes[0]) pendentes[0].scrollIntoView({ block: 'center' });
    // Campo preenchido sem digitação (busca do CNPJ ou do CEP) não dispara evento: enquanto houver aviso à vista, confere
    // a cada meio segundo e tira o aviso do que já foi preenchido; para sozinho quando não sobra nenhum.
    clearInterval(raiz.vigiaObrigatorios);
    raiz.vigiaObrigatorios = setInterval(() => {
      const comAviso = [...raiz.querySelectorAll('.campo-pendente')];
      if (!raiz.isConnected || !comAviso.length) { clearInterval(raiz.vigiaObrigatorios); return; }
      comAviso.forEach((campo) => { if ([...campo.querySelectorAll('input:not([type=hidden]), select, textarea')].some((i) => String(i.value || '').trim())) limparSinal(campo); });
    }, 500);
    return pendentes.length;
  }

  /**
   * Troca de etapa sempre recomeça do alto (pedido do Rodrigo, 17/11/2026): leva a barra de etapas para o topo da área
   * que rola, para a etapa seguinte começar logo abaixo do cabeçalho. Não faz nada enquanto o formulário está sendo montado.
   */
  function subirAoTopo(no, form) {
    if (no && (!form || form.isConnected) && no.isConnected) no.scrollIntoView({ block: 'start' });
  }
  /**
   * Lê o que está preenchido e à vista numa etapa, para a Revisão: devolve [[rótulo, valor]…] na ordem da tela. Entende os
   * campos (.compras-campo), o quadro com interruptor (Situação, "Tem contrato?"…) e os cartões de escolha. Campo escondido
   * (display none, hidden ou quadro desligado) e campo vazio ficam de fora. A etapa pode estar oculta na hora da leitura.
   */
  function linhasDaEtapa(etapa) {
    const oculto = (no) => {
      for (let x = no; x && x !== etapa; x = x.parentElement) {
        if (x.hidden || (x.style && x.style.display === 'none')) return true;
        if (x.parentElement && x.parentElement.classList.contains('compras-so-pergunta') && x.tagName !== 'LEGEND' && !x.classList.contains('compras-situacao-quadro')) return true;
      }
      return false;
    };
    const limpo = (t) => { const s = String(t || '').trim(); return s.endsWith(' *') ? s.slice(0, -2) : s; };
    const linhas = [];
    etapa.querySelectorAll('.compras-cartoes, .account-status, .compras-campo, label.compras-interruptor').forEach((no) => {
      if (oculto(no)) return;
      if (no.classList.contains('compras-cartoes')) {
        const caixa = no.closest('.account-status');
        const rotulo = limpo(no.getAttribute('aria-label') || (caixa && caixa.querySelector(':scope > span') || {}).textContent);
        const marcados = [...no.querySelectorAll('[aria-pressed="true"], [aria-checked="true"]')].map((b) => (b.querySelector('strong') || b).textContent.trim());
        if (rotulo && marcados.length) linhas.push([rotulo, marcados.join(', ')]);
        return;
      }
      if (no.classList.contains('account-status')) {
        const chave = no.querySelector(':scope > .account-status-row > .account-status-switch, :scope .account-status-switch');
        if (!chave || no.querySelector('.compras-cartoes')) return;
        const texto = [...chave.parentElement.children].find((x) => x !== chave);
        linhas.push([limpo((no.querySelector(':scope > span') || {}).textContent), texto ? texto.textContent.trim() : chave.getAttribute('aria-checked') === 'true' ? 'Sim' : 'Não']);
        return;
      }
      if (no.parentElement.closest('.compras-campo')) return; // campo dentro de campo: já lido pelo de fora
      const entrada1 = no.querySelector('input:not([type=hidden]):not([type=file]), select, textarea');
      if (!entrada1) return;
      const rotulo = limpo((no.querySelector('.compras-rotulo') || no.querySelector('span') || {}).textContent);
      let valor;
      if (entrada1.type === 'checkbox') valor = entrada1.checked ? 'Sim' : '';
      else if (entrada1.tagName === 'SELECT') valor = entrada1.selectedOptions[0] && entrada1.value !== '' ? entrada1.selectedOptions[0].textContent : '';
      else valor = entrada1.value.trim();
      if (rotulo && valor) linhas.push([rotulo, valor]);
    });
    return linhas;
  }
  /**
   * Monta a Revisão de um cadastro em etapas (padrão único): um quadro por etapa, com os dados no quadro branco e o "Editar"
   * do bloco embaixo. etapas: nós das etapas; nomes: títulos; ir(k): leva à etapa k. Devolve os quadros.
   */
  function revisaoDasEtapas(etapas, nomes, ir) {
    return etapas.map((etapa, k) => {
      const quadro = el('fieldset', 'compras-fieldset compras-revisao');
      quadro.append(el('legend', null, (k + 1) + ' · ' + nomes[k]));
      const dl = el('dl', 'profiles-info compras-largo');
      const linhas = linhasDaEtapa(etapa);
      if (linhas.length) linhas.forEach(([r, v]) => dl.append(el('dt', null, r), el('dd', null, v)));
      else dl.append(el('dt', null, 'Sem dados preenchidos nesta etapa'), el('dd', null, '—'));
      quadro.append(botaoEditarBloco(nomes[k], () => ir(k)), dl);
      return quadro;
    });
  }
  /** Botão retangular "Editar" embaixo de um bloco da Revisão (o botão padrão do sistema): leva à etapa do bloco. */
  function botaoEditarBloco(titulo, acao) {
    const b = el('button', 'btn compras-revisao-editar', 'Editar');
    b.type = 'button'; b.setAttribute('aria-label', 'Editar ' + titulo);
    b.onclick = acao;
    return b;
  }

  /** Confirmação local (sem janela nativa), como pede o padrão do S2. */
  function confirmar(titulo, texto, rotulo, acao, { cor = COR, corTexto = COR_TEXTO, classe = '' } = {}) {
    dialogo({
      titulo, cor, corTexto, classe,
      montar: (form) => { form.append(el('p', null, texto)); },
      // A ação pode responder depois (gravar no servidor): a janela espera, e o erro aparece nela.
      salvar: async () => { const r = await acao(); return typeof r === 'string' ? r : undefined; },
      rotuloSalvar: rotulo,
    });
  }

  /** Mensagem curta de retorno (equivalente ao snackbar do S1). */
  function avisar(texto) {
    let a = document.getElementById('compras-aviso');
    if (!a) {
      a = el('div', 'compras-aviso');
      a.id = 'compras-aviso';
      a.setAttribute('role', 'status');
      document.body.append(a);
    }
    a.textContent = texto;
    a.classList.add('show');
    clearTimeout(a._t);
    a._t = setTimeout(() => a.classList.remove('show'), 3500);
  }

  /**
   * Quadro "Situação do(a) <coisa>" (regra do Rodrigo, 15/11/2026): o ativo/inativo de todo cadastro é este quadro
   * com interruptor e o texto Ativo/Inativo ao lado, na cor do menu de origem. É o mesmo interruptor dos cadastros
   * financeiros (.account-status / .account-status-switch de Grupos, Bandeiras e Contas), não uma caixa de marcar.
   * Devolve o quadro; quadro.ativo lê (e escreve) o estado. feminino troca o texto para Ativa/Inativa.
   */
  function quadroSituacao(titulo, ativo, { dica = '', feminino = false, aoMudar, textos } = {}) {
    const quadro = el('div', 'account-status compras-situacao-quadro');
    const linha = el('div', 'account-status-row');
    const chave = el('button', 'account-status-switch');
    chave.type = 'button';
    chave.setAttribute('role', 'switch');
    chave.setAttribute('aria-label', titulo);
    chave.append(el('span'));
    const texto = el('span', 'account-status-text');
    let ligado = Boolean(ativo);
    const pintar = () => {
      chave.setAttribute('aria-checked', String(ligado));
      // textos: [ligado, desligado] para perguntas de sim ou não (ex.: "Tem contrato?" → Sim / Não).
      texto.textContent = textos ? textos[ligado ? 0 : 1] : ligado ? (feminino ? 'Ativa' : 'Ativo') : (feminino ? 'Inativa' : 'Inativo');
    };
    chave.onclick = () => { ligado = !ligado; pintar(); if (aoMudar) aoMudar(ligado); };
    pintar();
    linha.append(chave, texto);
    quadro.append(el('span', null, titulo), linha);
    if (dica) quadro.append(el('small', 'profiles-note', dica));
    Object.defineProperty(quadro, 'ativo', { get: () => ligado, set: (v) => { ligado = Boolean(v); pintar(); } });
    return quadro;
  }

  /**
   * Janelinha flutuante presa a um botão (a do Prazo de resposta do Enviar e a do "Acrescentar opção"): fica por cima
   * da tela (fixa), logo abaixo do botão, ou acima quando não cabe embaixo. Fecha no Esc (sem fechar a janela de
   * trás) e tocando fora. Devolve abrir(sim). O ouvinte de "tocar fora" só existe enquanto está aberta.
   */
  /**
   * Campo de hora (24/11/2026, Washington): o MESMO desenho do campo de aniversário (dia e mês). Um campo com a máscara HH:MM para digitar e o botão
   * redondo do relógio; tocar no campo ou no botão abre um painel flutuante (flutuante) com DUAS COLUNAS em forma de ROLETA, as 24 horas e os 60 minutos, em células de
   * cantos arredondados. UMA faixa cheia na cor do menu, contínua, atravessa as duas colunas e fica PARADA no meio; os números rolam por baixo dela (uma cópia em branco anda
   * junto, sem trocar a cor de célula nenhuma, então não pisca); rolar ou arrastar qualquer coluna encaixa um número na faixa e o campo atualiza na hora
   * (a hora que estava vazia vira 00, como o minuto). Tocar numa hora a leva ao meio; tocar num minuto leva, escolhe e fecha; setas para cima e para baixo mudam o valor; Esc fecha.
   * Qualquer minuto se escolhe na coluna ou se digita no campo. Devolve { caixa, painel, input }: quem usa põe a caixa na tela e o painel ao lado dela.
   * input.value é "HH:MM" (ou vazio); hora incompleta ou fora de 00:00 a 23:59 deixa o campo inválido (setCustomValidity).
   */
  function campoHora({ valor = '', rotulo = 'Hora' } = {}) {
    const valida = (t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
    const pad = (n) => String(n).padStart(2, '0');
    let hora = ''; let minuto = '';
    if (valida(valor)) { hora = valor.slice(0, 2); minuto = valor.slice(3); }
    const input = entrada('text', hora ? hora + ':' + minuto : '', { inputMode: 'numeric', placeholder: 'HH:MM', maxLength: 5, autocomplete: 'off' });
    input.setAttribute('aria-label', rotulo);
    input.dataset.textoLivre = '1';
    const botao = el('button', 'shortcut-circle compras-redondo');
    botao.type = 'button'; botao.title = 'Escolher a hora'; botao.setAttribute('aria-label', rotulo + ': escolher a hora');
    botao.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
    const caixa = el('div', 'compras-aniv-campo compras-hora-campo'); caixa.append(input, botao);
    const painel = el('div', 'compras-escolha-painel compras-aniv-painel compras-hora-painel');
    painel.setAttribute('role', 'dialog'); painel.setAttribute('aria-label', rotulo + ': hora e minuto');
    // Roleta: duas colunas que rolam e encaixam; a escolhida é sempre a do MEIO (a cor cheia não anda, quem anda é a lista).
    const celula = (texto, nome) => { const b = el('button', 'compras-grade-celula', texto); b.type = 'button'; b.tabIndex = -1; b.setAttribute('aria-label', nome); return b; };
    const montarColuna = (titulo, total, nomeCelula, pegar, por) => {
      const lista = el('div', 'compras-grade-escolha compras-hora-lista'); lista.tabIndex = 0;
      lista.setAttribute('role', 'group'); lista.setAttribute('aria-label', titulo + ' (use as setas para cima e para baixo)');
      const celulas = Array.from({ length: total }, (_, i) => celula(pad(i), nomeCelula + ' ' + pad(i)));
      lista.append(...celulas);
      // Dentro da FAIXA (uma só, parada no meio) anda uma cópia dos números desta coluna, em branco, no ritmo da lista (janela = o pedaço da faixa
      // que mostra esta coluna). Nenhuma célula troca de classe ou de cor enquanto se rola, então não pisca.
      const itens = el('div', 'compras-hora-faixa-itens'); itens.append(...Array.from({ length: total }, (_, i) => el('span', null, pad(i))));
      const janela = el('div', 'compras-hora-janela'); janela.append(itens);
      return { titulo, lista, celulas, janela, itens, pegar, por };
    };
    const colHora = montarColuna('Hora', 24, 'Hora', () => hora, (v) => { hora = v; if (!minuto) minuto = '00'; });
    const colMin = montarColuna('Minuto', 60, 'Minuto', () => minuto, (v) => { minuto = v; if (!hora) hora = '00'; });
    const colunas = [colHora, colMin];
    // Os títulos, e embaixo as duas listas com UMA faixa contínua por cima das duas (hora e minuto sempre cheios, nunca esmaecidos).
    const cabecalho = el('div', 'compras-hora-cabecalho'); cabecalho.append(el('span', 'compras-rotulo', 'Hora'), el('span', 'compras-rotulo', 'Minuto'));
    const faixa = el('div', 'compras-hora-faixa'); faixa.setAttribute('aria-hidden', 'true'); faixa.append(colHora.janela, colMin.janela);
    const rodas = el('div', 'compras-hora-rodas'); rodas.append(colHora.lista, colMin.lista, faixa);
    painel.append(cabecalho, rodas);
    const abrirPainel = flutuante(caixa, painel);
    const validar = () => input.setCustomValidity(!input.value || valida(input.value) ? '' : 'Informe a hora no formato HH:MM, de 00:00 a 23:59.');
    function marcar(escreve = true) {
      if (escreve) input.value = hora && minuto ? hora + ':' + minuto : '';
      validar();
      colunas.forEach((c) => { c.lista.dataset.valor = c.pegar(); });
    }
    // Rolagem feita por nós (abrir, tocar, setas) não pode escolher de novo: ignora os eventos de rolagem por um instante.
    let ignoraAte = 0;
    const passo = (c) => (c.celulas[1].offsetTop - c.celulas[0].offsetTop) || 42;
    const sincronizar = (c) => { c.itens.style.transform = 'translateY(' + (-c.lista.scrollTop) + 'px)'; };
    const levarAoMeio = (c, i, suave) => { ignoraAte = Date.now() + (suave ? 450 : 150); c.lista.scrollTo({ top: i * passo(c), behavior: suave ? 'smooth' : 'auto' }); if (!suave) sincronizar(c); };
    const posicionar = () => colunas.forEach((c) => levarAoMeio(c, c.pegar() ? Number(c.pegar()) : 0, false));
    const abrir = (sim) => { abrirPainel(sim); if (sim) posicionar(); };
    function fechar() { abrir(false); input.focus(); input.dispatchEvent(new Event('change', { bubbles: true })); }
    colunas.forEach((c, k) => {
      let quadro = 0;
      c.lista.addEventListener('scroll', () => {
        sincronizar(c);
        if (Date.now() < ignoraAte) return;
        cancelAnimationFrame(quadro);
        quadro = requestAnimationFrame(() => {
          const i = Math.max(0, Math.min(c.celulas.length - 1, Math.round(c.lista.scrollTop / passo(c))));
          if (pad(i) !== c.pegar()) { c.por(pad(i)); marcar(); }
        });
      });
      c.celulas.forEach((b, i) => { b.onclick = () => { c.por(pad(i)); marcar(); if (k === 1 && hora) { fechar(); return; } levarAoMeio(c, i, true); }; });
      c.lista.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); fechar(); return; }
        const d = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        const atual = c.pegar() ? Number(c.pegar()) : -1;
        const i = Math.max(0, Math.min(c.celulas.length - 1, (atual < 0 ? (d > 0 ? 0 : c.celulas.length - 1) : atual + d)));
        c.por(pad(i)); marcar(); levarAoMeio(c, i, true);
      });
    });
    input.addEventListener('input', () => {
      const d = input.value.replace(/\D/g, '').slice(0, 4);
      input.value = d.length > 2 ? d.slice(0, 2) + ':' + d.slice(2) : d;
      hora = d.length >= 2 ? d.slice(0, 2) : ''; minuto = d.length === 4 ? d.slice(2) : '';
      marcar(false);
      if (!painel.hidden) posicionar();
    });
    input.addEventListener('click', () => abrir(true));
    input.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); abrir(true); } });
    botao.addEventListener('click', () => abrir(painel.hidden));
    marcar();
    return { caixa, painel, input };
  }

  /**
   * Campo de data com calendário (24/11/2026, Washington): o MESMO desenho dos campos de aniversário e de hora. Um campo com a máscara DD/MM/AA para digitar e
   * o botão redondo do calendário; tocar no campo ou no botão abre um painel flutuante (flutuante) com o Dia (1 a 31, só os que o mês tem), o Mês (jan a dez) e o
   * Ano (12 de cada vez, com setas), em células de cantos arredondados; o escolhido fica na cor do menu. Tocar num dia escolhe e fecha; mês e ano ficam abertos
   * para ajustar. Se o campo estava vazio, o primeiro toque completa o que falta com hoje. O valor guardado é ISO (AAAA-MM-DD); data impossível (31/02) deixa o
   * campo inválido (setCustomValidity). Século da data digitada: 00–49 = 2000–2049, 50–99 = 1950–1999 (regra do date-fields.js).
   * Devolve { no, input, valor(), definir(iso) }: "no" é o campo pronto (rótulo, caixa e painel); valor() é o ISO ou ''.
   */
  function campoData({ valor = '', rotulo = 'Data' } = {}) {
    const DF = window.CicluzDateFields;
    const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const pad = (n) => String(n).padStart(2, '0');
    const hojeIso = () => { const n = new Date(); return n.getFullYear() + '-' + pad(n.getMonth() + 1) + '-' + pad(n.getDate()); };
    const diasNoMes = (a, m) => new Date(a, m, 0).getDate();
    const nomeCampo = rotulo.endsWith(' *') ? rotulo.slice(0, -2) : rotulo;
    let iso = DF.valid(valor) ? valor : '';
    let anoBase = Number((iso || hojeIso()).slice(0, 4)) - 5;
    const input = entrada('text', iso ? DF.display(iso) : '', { inputMode: 'numeric', placeholder: 'DD/MM/AA', maxLength: 8, autocomplete: 'off' });
    input.setAttribute('aria-label', nomeCampo);
    input.dataset.textoLivre = '1';
    const botaoPainel = el('button', 'shortcut-circle compras-redondo');
    botaoPainel.type = 'button'; botaoPainel.title = 'Escolher a data'; botaoPainel.setAttribute('aria-label', nomeCampo + ': escolher a data');
    botaoPainel.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"/></svg>';
    const caixa = el('div', 'compras-aniv-campo'); caixa.append(input, botaoPainel);
    const painel = el('div', 'compras-escolha-painel compras-aniv-painel'); painel.setAttribute('role', 'dialog'); painel.setAttribute('aria-label', nomeCampo + ': dia, mês e ano');
    const gradeDia = el('div', 'compras-grade-escolha em-7'); const gradeMes = el('div', 'compras-grade-escolha em-4');
    const gradeAno = el('div', 'compras-grade-escolha em-4'); const setasAno = el('div', 'compras-grade-escolha em-2');
    painel.append(el('span', 'compras-rotulo', 'Dia'), gradeDia, el('span', 'compras-rotulo', 'Mês'), gradeMes, el('span', 'compras-rotulo', 'Ano'), gradeAno, setasAno);
    const abrirPainel = flutuante(caixa, painel);
    const resumo = el('small', 'profiles-note'); resumo.setAttribute('aria-live', 'polite');
    const no = el('div', 'compras-campo compras-data');
    no.append(el('span', 'compras-rotulo', rotulo), caixa, painel, resumo);
    const celula = (texto, marcado, nome, aoTocar) => {
      const b = el('button', 'compras-grade-celula', texto);
      b.type = 'button'; b.setAttribute('aria-pressed', String(marcado)); b.setAttribute('aria-label', nome); b.onclick = aoTocar;
      return b;
    };
    const validar = () => input.setCustomValidity(!input.value || iso ? '' : 'Informe uma data válida no formato DD/MM/AA.');
    function pintar() {
      const [a, m, d] = (iso || hojeIso()).split('-');
      resumo.textContent = iso ? Number(d) + ' de ' + LONGOS[Number(m) - 1] + ' de ' + a : '';
      gradeDia.replaceChildren(...Array.from({ length: diasNoMes(Number(a), Number(m)) }, (_, i) => celula(String(i + 1), Boolean(iso) && Number(d) === i + 1, 'Dia ' + (i + 1), () => escolher('d', pad(i + 1), true))));
      gradeMes.replaceChildren(...MESES.map((n, i) => celula(n, Boolean(iso) && Number(m) === i + 1, LONGOS[i], () => escolher('m', pad(i + 1), false))));
      gradeAno.replaceChildren(...Array.from({ length: 12 }, (_, i) => celula(String(anoBase + i), Boolean(iso) && Number(a) === anoBase + i, 'Ano ' + (anoBase + i), () => escolher('a', String(anoBase + i), false))));
      setasAno.replaceChildren(celula('‹ Anos anteriores', false, 'Anos anteriores', () => { anoBase -= 12; pintar(); }), celula('Próximos anos ›', false, 'Próximos anos', () => { anoBase += 12; pintar(); }));
    }
    function escolher(parte, v, fecha) {
      let [a, m, d] = (iso || hojeIso()).split('-');
      if (parte === 'a') a = v; else if (parte === 'm') m = v; else d = v;
      const max = diasNoMes(Number(a), Number(m)); if (Number(d) > max) d = pad(max);
      iso = a + '-' + m + '-' + d;
      input.value = DF.display(iso);
      validar(); pintar();
      input.dispatchEvent(new Event('input', { bubbles: true }));
      if (fecha) { abrirPainel(false); input.focus(); input.dispatchEvent(new Event('change', { bubbles: true })); }
    }
    const abrir = (sim) => { if (sim) { anoBase = Number((iso || hojeIso()).slice(0, 4)) - 5; pintar(); } abrirPainel(sim); };
    input.addEventListener('input', (e) => {
      input.value = DF.mask(input.value);
      iso = DF.parse(input.value, iso) || '';
      validar();
      // Só a digitação recentra os anos; escolher no painel não pode fazer a grade pular.
      if (iso && e.isTrusted) anoBase = Number(iso.slice(0, 4)) - 5;
      pintar();
    });
    input.addEventListener('click', () => abrir(true));
    input.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); abrir(true); } });
    botaoPainel.addEventListener('click', () => abrir(painel.hidden));
    validar(); pintar();
    return {
      no, input, valor: () => iso,
      definir: (v) => { iso = DF.valid(v) ? v : ''; input.value = iso ? DF.display(iso) : ''; validar(); pintar(); },
    };
  }

  function flutuante(ancora, painel, { foco } = {}) {
    painel.hidden = true;
    ancora.setAttribute('aria-haspopup', 'dialog');
    ancora.setAttribute('aria-expanded', 'false');
    const fora = (e) => { if (!painel.isConnected || !(painel.contains(e.target) || ancora.contains(e.target))) abrir(false); };
    function abrir(sim) {
      painel.hidden = !sim;
      ancora.setAttribute('aria-expanded', String(sim));
      document.removeEventListener('pointerdown', fora);
      if (!sim) return;
      document.addEventListener('pointerdown', fora);
      const r = ancora.getBoundingClientRect();
      const embaixo = r.bottom + 6 + painel.offsetHeight <= window.innerHeight - 8;
      painel.style.top = Math.max(8, Math.round(embaixo ? r.bottom + 6 : r.top - 6 - painel.offsetHeight)) + 'px';
      painel.style.left = Math.max(8, Math.min(Math.round(r.left), window.innerWidth - painel.offsetWidth - 8)) + 'px';
      if (foco) foco.focus();
    }
    painel.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); abrir(false); ancora.focus(); } });
    return abrir;
  }

  /**
   * Seleção por cartões (desenho escolhido pelo Rodrigo, 15/11/2026): para escolha de poucas opções com ícone, no
   * lugar de caixinhas de marcar. Cada cartão é um botão inteiro (aria-pressed): ícone no quadrado de cantos
   * arredondados, título e uma linha de detalhe, e um círculo de marcação à direita (cheio, com o "certo", quando
   * marcado: a cor não é a única indicação). A cor é a de cada opção, não a da tela.
   * opcoes: [{ id, titulo, detalhe, icone | html, cor, marcado }]; multiplo: pode marcar mais de uma (botões com
   * aria-pressed). Escolha única (multiplo: false): grupo de rádio (role=radiogroup, cartões role=radio com
   * aria-checked); marcar um desmarca os outros e tocar no marcado não desmarca.
   * Devolve o grupo; grupo.marcados() lista os ids marcados.
   */
  function cartoesEscolha({ rotulo, opcoes, multiplo = true, aoMudar }) {
    const grupo = el('div', 'compras-cartoes');
    grupo.setAttribute('role', multiplo ? 'group' : 'radiogroup');
    if (rotulo) grupo.setAttribute('aria-label', rotulo);
    const estado = multiplo ? 'aria-pressed' : 'aria-checked';
    const itens = opcoes.map((o) => {
      const b = el('button', 'compras-cartao-escolha');
      b.type = 'button';
      if (o.cor) b.style.setProperty('--cartao-cor', o.cor);
      const i = el('span', 'compras-linha-icone');
      i.setAttribute('aria-hidden', 'true');
      i.innerHTML = o.html || svg(ICONES[o.icone] || o.icone);
      const texto = el('span', 'compras-cartao-texto');
      texto.append(el('strong', null, o.titulo));
      if (o.detalhe) texto.append(el('small', null, o.detalhe));
      const marca = el('span', 'compras-cartao-marca');
      marca.setAttribute('aria-hidden', 'true');
      marca.innerHTML = '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
      b.append(i, texto, marca);
      if (!multiplo) b.setAttribute('role', 'radio');
      b.setAttribute(estado, String(Boolean(o.marcado)));
      b.onclick = () => {
        const ligar = multiplo ? b.getAttribute(estado) !== 'true' : true;
        if (!multiplo) itens.forEach((x) => x.b.setAttribute(estado, 'false'));
        b.setAttribute(estado, String(ligar));
        if (aoMudar) aoMudar(grupo.marcados());
      };
      // Rádio pelo teclado: as setas passam de um cartão para o outro e já marcam.
      if (!multiplo) b.onkeydown = (e) => {
        const passo = ['ArrowRight', 'ArrowDown'].includes(e.key) ? 1 : ['ArrowLeft', 'ArrowUp'].includes(e.key) ? -1 : 0;
        if (!passo) return;
        e.preventDefault();
        const alvo = itens[(itens.findIndex((x) => x.b === b) + passo + itens.length) % itens.length].b;
        alvo.focus(); alvo.click();
      };
      grupo.append(b);
      return { id: o.id, b };
    });
    grupo.marcados = () => itens.filter((x) => x.b.getAttribute(estado) === 'true').map((x) => x.id);
    /** Marca por código (só escolha única), sem disparar aoMudar: serve para a tela desfazer ou refletir uma troca. */
    grupo.definir = (id) => itens.forEach((x) => x.b.setAttribute(estado, String(x.id === id)));
    return grupo;
  }

  /**
   * Botão retangular "Enviar" (aviãozinho) do cabeçalho de uma lista e o painel que ele abre — padrão único (18/11/2026,
   * Rodrigo), usado por Fornecedores, Clientes e Patrimônios: uma coluna branca estreita com a seta de fechar e as bolinhas
   * dos canais (WhatsApp, e-mail, SMS) e, ao lado, os campos do envio. O painel fica por cima da tela, preso ao botão.
   * dica: texto do botão para o leitor de tela; campos: nós antes do "Tipo de envio"; depois: nós depois dele;
   * aoCanal(id): chamado quando a pessoa toca num canal.
   */
  const CANAIS_ENVIO = [['whatsapp', 'WhatsApp'], ['email', 'E-mail'], ['sms', 'SMS']];
  /* Prazo de resposta do Enviar (o mesmo em Fornecedores, Clientes e Patrimônios). O prazo padrão é preferência deste aparelho
     (não é dado de cadastro): vem com o último prazo em dias úteis escolhido (3 enquanto ninguém trocar); "data e hora" vale só
     para aquele envio. A chave é a que Fornecedores já usava, para a preferência gravada continuar valendo. */
  const PRAZOS_RESPOSTA = [['1', '1 dia útil'], ['3', '3 dias úteis'], ['5', '5 dias úteis'], ['7', '7 dias úteis'], ['data', 'Escolher data e hora']];
  const CHAVE_PRAZO_RESPOSTA = 'cicluz-fornecedores-prazo-convite';
  /** Mensagem do Enviar: vem escrita e pode ser ajustada antes de enviar. Devolve { campo, texto() } (texto vazio volta ao padrão). */
  const MENSAGEM_ENVIO = 'Olá! Segue o link para preenchimento do seu cadastro. Por favor, confira as informações antes de enviar.';
  function mensagemEnvio(padrao = MENSAGEM_ENVIO) {
    const caixa = el('textarea'); caixa.rows = 4; caixa.maxLength = 400; caixa.value = padrao; caixa.setAttribute('aria-label', 'Mensagem');
    return { campo: campo('Mensagem', caixa), texto: () => caixa.value.trim() || padrao };
  }
  /** Campos do prazo. Devolve { campos, ler(), frase() }: ler() dá { tipo, dias } ou { tipo, data, hora }; frase() é o prazo por extenso, para a mensagem. */
  function prazoResposta() {
    let padrao = '3';
    try { const v = localStorage.getItem(CHAVE_PRAZO_RESPOSTA); if (PRAZOS_RESPOSTA.some(([id]) => id === v && id !== 'data')) padrao = v; } catch (e) { /* sem preferência salva */ }
    const prazo = seletor(PRAZOS_RESPOSTA, padrao);
    const data = entrada('date', ''); const hora = entrada('time', '');
    const dataCampo = campo('Responder até (data)', data); const horaCampo = campo('Hora', hora);
    const pintar = () => { const livre = prazo.value === 'data'; dataCampo.style.display = livre ? '' : 'none'; horaCampo.style.display = livre ? '' : 'none'; };
    prazo.onchange = () => { pintar(); if (prazo.value !== 'data') { try { localStorage.setItem(CHAVE_PRAZO_RESPOSTA, prazo.value); } catch (e) { /* vale só nesta visita */ } } };
    pintar();
    const ler = () => (prazo.value === 'data' ? { tipo: 'data', data: data.value, hora: hora.value } : { tipo: 'dias-uteis', dias: Number(prazo.value) });
    const frase = () => {
      if (prazo.value !== 'data') return 'Prazo para resposta: ' + prazo.selectedOptions[0].textContent + '.';
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data.value || '');
      const dia = m ? m[3] + '/' + m[2] + '/' + m[1] : (data.value || '');
      return dia ? 'Prazo para resposta: até ' + dia + (hora.value ? ' às ' + hora.value : '') + '.' : '';
    };
    return { campos: [campo('Prazo de resposta', prazo), dataCampo, horaCampo], ler, frase };
  }
  function botaoEnviar({ dica, campos = [], depois = [], aoCanal }) {
    const caixa = el('span', 'compras-enviar');
    const painel = el('div', 'compras-enviar-painel');
    painel.setAttribute('role', 'dialog'); painel.setAttribute('aria-label', dica);
    const b = botaoTitulo('Enviar', dica, () => abrir(painel.hidden), ICONES.send);
    const bolinha = (rotulo, desenho, acao, classe = '') => {
      const x = el('button', 'shortcut-circle compras-redondo ' + classe);
      x.type = 'button'; x.title = rotulo; x.setAttribute('aria-label', rotulo); x.innerHTML = svg(desenho); x.onclick = acao;
      return x;
    };
    const canais = el('div', 'compras-enviar-canais'); canais.setAttribute('role', 'group'); canais.setAttribute('aria-label', 'Tipo de envio');
    const fechar = bolinha('Fechar', ICONES.voltar, () => { abrir(false); b.focus(); }, 'compras-enviar-fechar');
    canais.append(fechar, ...CANAIS_ENVIO.map(([id, nomeCanal]) => bolinha('Enviar por ' + nomeCanal, ICONES[id], () => aoCanal(id))));
    const lado = el('div', 'compras-enviar-prazo');
    const tipo = el('div', 'compras-campo');
    tipo.append(el('span', 'compras-rotulo', 'Tipo de envio'), el('small', 'profiles-note', 'Toque em WhatsApp, e-mail ou SMS, nos ícones ao lado.'));
    lado.append(...campos, tipo, ...depois);
    painel.append(canais, lado);
    const abrir = flutuante(b, painel, { foco: fechar });
    caixa.append(b, painel);
    return caixa;
  }
  /**
   * Remover um item dentro do cadastro (linha de conversão, promoção): botão redondo VERMELHO com a lixeira (23/11/2026, Zé), o padrão
   * de excluir do sistema. Redondo de propósito: a regra geral que pinta os botões retangulares das janelas na cor da tela não o pega.
   */
  function botaoRemover(rotulo, acao) {
    const b = el('button', 'shortcut-circle compras-redondo perigo compras-remover'); b.type = 'button'; b.title = rotulo; b.setAttribute('aria-label', rotulo);
    b.innerHTML = svg(ICONES.lixo); b.onclick = acao;
    return b;
  }
  /* =============== Janela de escolha em árvore (peça única) =============== */
  /**
   * Janela de escolha em árvore, no mesmo desenho da lista de origem (19/11/2026, Rodrigo): cada linha tem a seta de abrir, a caixa de
   * marcar (quadrada, de cantos arredondados), o ícone com a sigla da origem (DES, MER, RET), o nome, a contagem e a situação. Serve a
   * qualquer cadastro em níveis — grupo › subgrupo › item. Morava em contratos.js; desde 23/11/2026 é a peça única do sistema.
   * nos: () => [{ id, nome, ativo, conta, folha, selecionavel (padrão: sim), filhos: [...] }]. marcados: Set de ids. bloqueados: Map id → motivo.
   * Padrão (vários): marcar um nível marca tudo abaixo; ao confirmar grava só o nível mais alto marcado.
   * unico: escolha de UM nó (o grupo, o subgrupo ou o item), sem cascata; a árvore abre já mostrando o escolhido.
   */
  function seletorArvore({ titulo, cores, sigla, iconeFolha, rotuloBusca = 'Buscar', vazio = 'Nada cadastrado.', nos, marcados, bloqueados = new Map(), aoConfirmar, unico = false }) {
    const escolha = new Set(marcados); const abertos = new Set();
    const pais = new Map(); const porId = new Map();
    const mapear = (lista, pai) => lista.forEach((n) => { porId.set(n.id, n); if (pai) pais.set(n.id, pai.id); mapear(n.filhos || [], n); });
    mapear(nos(), null);
    const marcavel = (n) => n.selecionavel !== false && n.ativo !== false && !bloqueados.has(n.id);
    const descer = (n, fn) => (n.filhos || []).forEach((f) => { fn(f); descer(f, fn); });
    if (unico) for (const id of escolha) { let p = pais.get(id); while (p) { abertos.add(p); p = pais.get(p); } }
    else for (const id of [...escolha]) { const n = porId.get(id); if (n) descer(n, (f) => { if (marcavel(f)) escolha.add(f.id); }); }
    const compacta = () => (unico ? new Set(escolha) : new Set([...escolha].filter((id) => { let p = pais.get(id); while (p) { if (escolha.has(p)) return false; p = pais.get(p); } return true; })));
    const formatar = (n) => (typeof formatSystemName === 'function' ? formatSystemName(String(n || '')) : String(n || ''));
    const plural = (n) => n + (n === 1 ? ' item' : ' itens');
    const c0 = typeof cores === 'function' ? cores() : cores || {};
    dialogo({
      titulo, ...c0, largo: true, classe: 'compras-hier-dialogo', rotuloSalvar: 'Confirmar',
      montar: (form) => {
        const busca = entrada('text', '', { placeholder: rotuloBusca, maxLength: 80, autocomplete: 'off' }); busca.setAttribute('aria-label', rotuloBusca);
        busca.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });
        const resumo = el('small', 'profiles-note'); resumo.setAttribute('role', 'status'); const arvore = el('div', 'compras-hier'); arvore.setAttribute('role', 'tree');
        const contar = () => { const q = compacta().size; resumo.textContent = (q === 1 ? '1 selecionado' : q + ' selecionados') + '.'; };
        // Expandir / recolher tudo é UM botão só, redondo, na cor do cabeçalho: um toque expande tudo, o seguinte recolhe.
        const barra = el('div', 'escolha-barra'); let tudoAberto = false;
        const alternarTudo = el('button', 'compras-redondo escolha-expandir'); alternarTudo.type = 'button'; alternarTudo.innerHTML = svg('<path d="m5 9 7-6 7 6M5 15l7 6 7-6"/>');
        const pintarAlternar = () => { const r = tudoAberto ? 'Recolher tudo' : 'Expandir tudo'; alternarTudo.title = r; alternarTudo.setAttribute('aria-label', r); alternarTudo.setAttribute('aria-expanded', String(tudoAberto)); };
        alternarTudo.onclick = () => { tudoAberto = !tudoAberto; abertos.clear(); if (tudoAberto) porId.forEach((n, id) => { if ((n.filhos || []).length) abertos.add(id); }); pintarAlternar(); desenhar(); };
        pintarAlternar();
        barra.append(resumo, alternarTudo);
        const casa = (no, caminho, termo) => !termo || dobrar(caminho + ' ' + no.nome).includes(termo) || (no.filhos || []).some((f) => casa(f, caminho + ' ' + no.nome, termo));
        const linha = (no, nivel, caminho, termo) => {
          const filhos = (no.filhos || []).filter((f) => casa(f, caminho + ' ' + no.nome, termo)); const aberto = Boolean(termo) || abertos.has(no.id);
          const l = el('div', 'compras-hier-linha'); l.setAttribute('role', 'treeitem'); l.style.setProperty('--nivel', String(nivel));
          const seta = el('button', 'compras-hier-seta' + (aberto ? ' aberto' : '')); seta.type = 'button'; seta.innerHTML = svg('<path d="m9 6 6 6-6 6"/>'); seta.disabled = !(no.filhos || []).length;
          seta.setAttribute('aria-label', (aberto ? 'Recolher ' : 'Expandir ') + no.nome); seta.setAttribute('aria-expanded', String(aberto));
          seta.onclick = () => { if (abertos.has(no.id)) abertos.delete(no.id); else abertos.add(no.id); desenhar(); };
          const ativo = no.ativo !== false; const travado = bloqueados.has(no.id);
          const c = entrada('checkbox'); c.className = 'compras-hier-caixa'; c.checked = escolha.has(no.id) || travado; c.disabled = travado || (!ativo && !escolha.has(no.id));
          c.setAttribute('aria-label', 'Selecionar ' + no.nome);
          c.onchange = () => {
            if (unico) { escolha.clear(); if (c.checked) escolha.add(no.id); desenhar(); return; }
            if (c.checked) { escolha.add(no.id); descer(no, (f) => { if (marcavel(f)) escolha.add(f.id); }); } else { escolha.delete(no.id); descer(no, (f) => { if (!bloqueados.has(f.id)) escolha.delete(f.id); }); let p = pais.get(no.id); while (p) { escolha.delete(p); p = pais.get(p); } }
            desenhar();
          };
          if (no.selecionavel === false) { c.disabled = true; c.style.visibility = 'hidden'; }
          const ic = el('span', 'compras-hier-icone'); ic.setAttribute('aria-hidden', 'true'); if (no.folha && iconeFolha) ic.innerHTML = svg(iconeFolha); else ic.append(el('span', 'sigla-text', sigla)); // grupo e subgrupo levam a sigla da origem; o item final leva o ícone dele
          const tx = el('span', 'compras-hier-texto'); tx.append(el('b', null, no.folha ? no.nome : sigla + ' ' + formatar(no.nome)));
          const conta = no.conta != null ? no.conta : (no.filhos ? plural(no.filhos.length) : ''); if (conta) tx.append(el('small', null, conta));
          if (travado) tx.append(el('small', null, bloqueados.get(no.id)));
          l.append(seta, c, ic, tx, el('span', 'compras-hier-estado', ativo ? 'Ativo' : 'Inativo'));
          return [l, ...(aberto ? filhos.flatMap((f) => linha(f, nivel + 1, caminho + ' ' + no.nome, termo)) : [])];
        };
        const desenhar = () => {
          const termo = dobrar(busca.value.trim()); const lista = nos().filter((n) => casa(n, '', termo));
          arvore.replaceChildren(barra, ...lista.flatMap((n) => linha(n, 0, '', termo)));
          if (!lista.length) arvore.append(el('p', 'profiles-note compras-hier-vazio', termo ? 'Nada encontrado.' : vazio));
          contar();
        };
        busca.addEventListener('input', desenhar);
        const box = el('div', 'compras-campo compras-largo'); box.append(busca, arvore); form.append(box); desenhar();
      },
      salvar: () => aoConfirmar(compacta()),
    });
  }
  /**
   * Campo de escolha única em árvore (23/11/2026, Zé: no lugar dos seletores comuns de grupo e subgrupo). Parece um campo, mostra o
   * que foi escolhido e, ao tocar, abre a janela em árvore (seletorArvore, modo único). É um botão com .value (o id do nó, ou '') que
   * dispara "change" quando a escolha muda. obrigatorio: Confirmar sem nada marcado é recusado.
   * janela(atual, escolher) e texto(valor): para árvores com janela própria (áreas, setores e locais: CicluzLocationTree.janelaUnica);
   * texto devolve o que o campo mostra, ou '' quando o valor não existe mais.
   */
  function campoArvore({ rotulo, titulo, sigla, cores, iconeFolha, rotuloBusca, vazio, nos, valor = '', textoVazio = 'Selecione', obrigatorio = false, janela, texto: textoDe }) {
    const b = el('button', 'compras-arvore-campo'); b.type = 'button'; b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('aria-label', rotulo);
    const texto = el('span', 'compras-arvore-texto'); b.append(texto); b.insertAdjacentHTML('beforeend', svg('<path d="m6 9 6 6 6-6"/>'));
    let atual = valor || '';
    const achar = (lista, id) => { for (const n of lista) { if (n.id === id) return n; const f = achar(n.filhos || [], id); if (f) return f; } return null; };
    const formatar = (n) => (typeof formatSystemName === 'function' ? formatSystemName(String(n || '')) : String(n || ''));
    const pintar = () => {
      const n = atual && !textoDe ? achar(nos(), atual) : null;
      const t = textoDe ? (atual ? textoDe(atual) : '') : n ? (n.folha ? n.nome : formatar(n.nome)) : '';
      texto.textContent = t || (atual ? 'Escolha não encontrada no cadastro' : textoVazio);
      b.classList.toggle('vazio', !t); b.title = texto.textContent;
    };
    const escolher = (novo) => {
      if (!novo && obrigatorio) return 'Marque uma opção para confirmar.';
      if (novo !== atual) { atual = novo; pintar(); b.dispatchEvent(new Event('change', { bubbles: true })); }
      return undefined;
    };
    Object.defineProperty(b, 'value', { get: () => atual, set: (v) => { atual = v || ''; pintar(); } });
    b.addEventListener('click', () => (janela ? janela(atual, escolher) : seletorArvore({
      titulo, cores, sigla, iconeFolha, rotuloBusca, vazio, nos, unico: true, marcados: new Set(atual ? [atual] : []),
      aoConfirmar: (escolha) => escolher([...escolha][0] || ''),
    })));
    pintar();
    return b;
  }
  /**
   * Campo de UM local da árvore Área › Setor › Local (23/11/2026, Zé): o mesmo campo do grupo, abrindo a janela de áreas, setores e
   * locais (CicluzLocationTree.janelaUnica). .value = id do nó, ou "txt:nome" para o texto antigo sem nó (aparece com o aviso).
   * Para quem grava o NOME (área do produto, filtros): campoLocal.nomeGravado(campo) devolve o nome a gravar.
   */
  function campoLocal({ rotulo, titulo, valor = '', textoVazio = 'Selecione' }) {
    const LT = window.CicluzLocationTree;
    return campoArvore({
      rotulo, valor, textoVazio,
      janela: (atual, escolher) => LT.janelaUnica({ titulo: titulo || rotulo, atual: atual.startsWith('txt:') ? '' : atual, aoEscolher: escolher }),
      texto: (v) => (v.startsWith('txt:') ? v.slice(4) + ' (sem vínculo na árvore)' : LT.caminhoDe(v)),
    });
  }
  /** Valor inicial de um campoLocal a partir de um NOME gravado: o nó com esse nome ou, sem nó, o texto antigo. */
  campoLocal.doNome = (nome) => (nome ? window.CicluzLocationTree.idPorNome(nome) || 'txt:' + nome : '');
  /** Nome a gravar a partir do campo (o do nó ou o texto antigo). */
  campoLocal.nomeGravado = (campo) => (campo.value.startsWith('txt:') ? campo.value.slice(4) : window.CicluzLocationTree.nomeDe(campo.value));
  /**
   * Árvore dos grupos de mercadorias do cadastro do S2 (MER - Grupos de Mercadorias) para o campoArvore: grupo (id "g") › subgrupo
   * (id "g|s"). Inativos só entram se forem o valor atual. produtos (opcional): lista de produtos que viram as folhas (id "prd:id");
   * os que não têm grupo do cadastro ficam em "Produtos sem grupo". soProdutos: só o produto é marcável e os ramos sem produto somem.
   */
  function arvoreGruposMercadoria(grupos, { atual = '', produtos = null, soProdutos = false } = {}) {
    const [ga, sa] = String(atual).split('|');
    const folha = (p) => ({ id: 'prd:' + p.id, nome: p.descricao, ativo: p.status !== 'inativo', folha: true, conta: 'Produto' });
    const nProd = (q) => (q === 1 ? '1 produto' : q + ' produtos');
    const arvore = grupos.filter((g) => g.ativo || g.id === ga).map((g) => {
      const subs = g.subgrupos.filter((s) => (g.ativo && s.ativo) || (g.id === ga && s.id === sa)).map((s) => {
        const itens = produtos ? produtos.filter((p) => p.grupoId === g.id && p.subgrupoId === s.id).map(folha) : null;
        return { id: g.id + '|' + s.id, nome: g.nome + ' › ' + s.nome, ativo: g.ativo && s.ativo, selecionavel: !soProdutos, ...(itens ? { filhos: itens, conta: nProd(itens.length) } : { conta: 'Subgrupo' }) };
      });
      const diretos = produtos ? produtos.filter((p) => p.grupoId === g.id && !g.subgrupos.some((s) => s.id === p.subgrupoId)).map(folha) : [];
      const contaG = (g.subgrupos.length === 1 ? '1 subgrupo' : g.subgrupos.length + ' subgrupos') + (produtos ? ' · ' + nProd(produtos.filter((p) => p.grupoId === g.id).length) : '');
      return { id: g.id, nome: g.nome, ativo: g.ativo, selecionavel: !soProdutos, conta: contaG, filhos: [...subs.filter((s) => !soProdutos || s.filhos.length), ...diretos] };
    });
    if (!produtos) return arvore;
    const semGrupo = produtos.filter((p) => !grupos.some((g) => g.id === p.grupoId)).map(folha);
    if (semGrupo.length) arvore.push({ id: 'sem-grupo', nome: 'Produtos sem grupo', ativo: true, selecionavel: false, conta: nProd(semGrupo.length), filhos: semGrupo });
    return soProdutos ? arvore.filter((g) => g.filhos.length) : arvore;
  }

  window.CicluzComprasUI = {
    seletorArvore, campoArvore, campoLocal, arvoreGruposMercadoria, botaoRemover,
    COR, COR_TEXTO, ICONES, svg, el, botao, dobrar, buscaRodape, cabecalhoColunas, arrastarParaRolar, botaoTitulo, pontaDaLista,
    criarTela, atalho, secao, vazio, situacao, nota, campo, entrada, seletor, chips, busca, buscaFixa,
    tabela, linhaLista, umOuDoisToques, interruptor, seletorDeItens, corOrigem, mascaraPercentual, lerPercentual, bolinhasDe, legendaBolinhas, campoHora, campoData, dialogo, confirmar, avisar, sinalizarObrigatorios, subirAoTopo, botaoEditarBloco, linhasDaEtapa, revisaoDasEtapas, quadroSituacao, cartoesEscolha, flutuante, botaoEnviar, prazoResposta, mensagemEnvio, MENSAGEM_ENVIO,
  };
})();
