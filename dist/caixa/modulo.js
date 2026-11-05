/*
 * Caixa — entrada do módulo no menu do S2 (casca: só tela, dados fictícios, nada gravado).
 * Entradas · Vendas / Faturamento → Caixas abre os cards abaixo. Fluxo e regras vêm do Caixa do
 * sistema principal (web-vue/components/caixa); o visual é o das telas internas do S2.
 * Cada tela se registra com CicluzCaixa.registrar(nome, abrir).
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const COR = '#eab308';
  const COR_TEXTO = '#785600';
  const ICONE = '<path d="M3 9 4.5 4h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6"/>';
  const telas = {};

  const CARDS = [
    ['abertura', 'Abertura do caixa', 'Conferir o malote e abrir o turno'],
  ];

  const voltar = () => openSection(sections[0][0], 'Caixas', 'caixa', COR);

  /** Tela no padrão do S2 (view > panel > head + content), na cor de Vendas. */
  function criarTela({ id, titulo, caminho }) {
    const view = U.el('section', 'view caixa-view');
    view.id = id;
    const panel = U.el('div', 'panel');
    const head = U.el('div', 'head');
    const badge = U.el('span', 'sector-icon config-inherit-icon header-origin-icon');
    badge.setAttribute('aria-hidden', 'true');
    const heading = U.el('div');
    const h2 = U.el('h2', null, titulo);
    const p = U.el('p', null, caminho);
    heading.append(h2, p);
    head.append(badge, heading);
    const body = U.el('div', 'content profiles-content compras-content caixa-content');
    panel.append(head, body);
    view.append(panel);
    document.querySelector('main').append(view);
    setViewOriginColor(view, COR);
    panel.style.setProperty('--panel-text', COR_TEXTO);
    addShortcuts(id, voltar);
    return {
      view, body,
      ativar() {
        badge.innerHTML = U.svg(ICONE);
        badge.style.background = '';
        document.querySelectorAll('.view').forEach((x) => x.classList.remove('show'));
        view.classList.add('show');
        const crumb = document.getElementById('crumb');
        if (crumb) crumb.textContent = caminho;
        const t = document.getElementById('title');
        if (t) t.textContent = titulo;
        normalizeHeaderActions(view);
        body.scrollTop = 0;
      },
    };
  }

  /** Diálogo do S2 (U.dialogo) na cor do Caixa. */
  function dialogo(opcoes) {
    const d = U.dialogo(opcoes);
    d.style.setProperty('--menu-accent', COR);
    d.style.setProperty('--dialog-accent', COR);
    d.classList.add('caixa-dialog');
    return d;
  }

  function registrar(nome, abrir) { telas[nome] = abrir; }
  function abrir(nome) {
    const t = telas[nome];
    if (t) return t();
    console.warn('Caixa: tela não encontrada', nome);
  }

  window.CicluzCaixa = {
    COR, COR_TEXTO,
    cards: () => CARDS.map(([id, t, d]) => [t, d, 'caixa:' + id]),
    icone: () => U.svg(ICONE),
    criarTela, dialogo, abrir, registrar, voltar,
  };
})();
