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
    produto: '<path d="M4 7h16l-1.5 13h-13ZM9 7a3 3 0 0 1 6 0"/>',
    agenda: '<path d="M4 5h16v16H4zM4 10h16M8 3v4m8-4v4M9 15l2 2 4-4"/>',
    lista: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    caminhao: '<path d="M2 6h11v10H2zM13 10h4l4 4v2h-8M6 19a2 2 0 1 0 0-.01M17 19a2 2 0 1 0 0-.01"/>',
    conferencia: '<path d="M6 4h12v17H6zM9 2h6v4H9zM9 13l2 2 4-4"/>',
    cadastro: '<path d="M12 3c4.4 0 8 1.3 8 3v12c0 1.7-3.6 3-8 3s-8-1.3-8-3V6c0-1.7 3.6-3 8-3ZM4 6c0 1.7 3.6 3 8 3s8-1.3 8-3M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    cotacao: '<path d="M12 3v18M7 21h10M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2M2 16l3-8 3 8a4.4 4.4 0 0 1-6 0ZM16 16l3-8 3 8a4.4 4.4 0 0 1-6 0Z"/>',
    raio: '<path d="M13 2 4 14h7l-1 8 9-12h-7Z"/>',
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

  /** Linha de lista no padrão das listas do S2 (moldura única, divisor fino). */
  function linhaLista({ icone, titulo, detalhe, direita, aoClicar }) {
    const r = el(aoClicar ? 'button' : 'div', 'compras-linha');
    if (aoClicar) { r.type = 'button'; r.onclick = aoClicar; }
    if (icone) { const i = el('span', 'compras-linha-icone'); i.innerHTML = svg(ICONES[icone] || icone); r.append(i); }
    const meio = el('span', 'compras-linha-texto');
    meio.append(el('b', null, titulo));
    if (detalhe) meio.append(el('small', null, detalhe));
    r.append(meio);
    if (direita) { const d = el('span', 'compras-linha-direita'); d.append(...[].concat(direita)); r.append(d); }
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
  function dialogo({ titulo, subtitulo, montar, salvar, rotuloSalvar = 'Salvar', largo = false, aoFechar, cor = COR, corTexto = COR_TEXTO, classe = '' }) {
    const d = el('dialog', 'location-dialog profiles-dialog compras-dialog' + (largo ? ' largo' : '') + (classe ? ' ' + classe : ''));
    d.style.setProperty('--menu-accent', cor);
    d.style.setProperty('--dialog-accent', cor);
    d.style.setProperty('--panel-text', corTexto);
    const h = el('h2', null, titulo);
    d.append(h);
    if (subtitulo) d.append(el('p', 'compras-dialog-sub', subtitulo));
    const form = el('form', 'account-editor compras-form');
    const erro = el('p', 'profiles-error');
    erro.setAttribute('role', 'alert');
    const ctx = montar(form, d) || {};
    const acoes = el('div', 'actions compras-dialog-acoes');
    // Decisão do Zé (04/11/2026): todo diálogo confirma pelo ✓ e fecha pelo ✕ do rodapé fixo do S2.
    // A linha própria fica fora da vista, só para o ✓ repassar o clique (o rodapé procura um botão
    // "Salvar…"); por isso a ação nomeada vira "Salvar · <ação>" e o ✓ recebe a dica com o nome dela.
    acoes.classList.add('compras-dialog-acoes-rodape');
    acoes.append(botao(salvar ? 'Cancelar' : 'Fechar', () => d.close()));
    if (salvar) {
      const s = el('button', 'btn', /^Salvar(\s|$)/i.test(rotuloSalvar) ? rotuloSalvar : 'Salvar · ' + rotuloSalvar);
      s.type = 'submit';
      acoes.append(s);
    }
    form.append(erro, acoes);
    form.onsubmit = (e) => {
      e.preventDefault();
      if (!salvar) return d.close();
      const msg = salvar(ctx);
      if (msg) { erro.textContent = msg; return; }
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

  /** Confirmação local (sem janela nativa), como pede o padrão do S2. */
  function confirmar(titulo, texto, rotulo, acao, { cor = COR, corTexto = COR_TEXTO, classe = '' } = {}) {
    dialogo({
      titulo, cor, corTexto, classe,
      montar: (form) => { form.append(el('p', null, texto)); },
      salvar: () => { const r = acao(); return typeof r === 'string' ? r : undefined; },
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

  window.CicluzComprasUI = {
    COR, COR_TEXTO, ICONES, svg, el, botao, dobrar,
    criarTela, atalho, secao, vazio, situacao, nota, campo, entrada, seletor, chips, busca, buscaFixa,
    tabela, linhaLista, bolinhasDe, legendaBolinhas, dialogo, confirmar, avisar,
  };
})();
