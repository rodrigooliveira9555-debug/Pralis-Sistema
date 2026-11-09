/*
 * Caixa — interface comum (casca): tela no padrão do S2 (criarTela), diálogo na cor de Vendas (dialogo), "Ver como" (seletorPerfil,
 * faixaDemo) e o registro/abertura das telas. O estado e as ações moram em modulo.js (CicluzCaixa); aqui só se desenha.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const telas = {};

  /* ---------- Telas, diálogos e "Ver como" ---------- */

  /** "Ver como": uma escolha só, guardada no C.estado. `perfis` limita as opções da tela. */
  function seletorPerfil(aoMudar, perfis) {
    const opcoes = perfis ? C.PERFIS.filter(([v]) => perfis.includes(v)) : C.PERFIS;
    if (!opcoes.some(([v]) => v === C.estado.perfil)) C.estado.perfil = opcoes[0][0];
    const box = U.el('div', 'caixa-perfil');
    box.append(U.el('span', 'compras-rotulo', 'Ver como'), U.chips(opcoes, C.estado.perfil, (v) => { C.estado.perfil = v; aoMudar(); }));
    return box;
  }
  function faixaDemo(texto, aoMudar, perfis) {
    const f = U.el('div', 'caixa-aviso caixa-faixa');
    f.append(U.el('p', 'profiles-note', texto));
    if (aoMudar) f.append(seletorPerfil(aoMudar, perfis));
    return f;
  }

  /** Tela no padrão do S2 (view > panel > head + content), na cor de Vendas. */
  function criarTela({ id, titulo, caminho, voltar }) {
    const view = U.el('section', 'view caixa-view');
    view.id = id;
    const panel = U.el('div', 'panel');
    const head = U.el('div', 'head');
    const badge = U.el('span', 'sector-icon config-inherit-icon header-origin-icon');
    badge.setAttribute('aria-hidden', 'true');
    const heading = U.el('div');
    heading.append(U.el('h2', null, titulo), U.el('p', null, caminho));
    head.append(badge, heading);
    const body = U.el('div', 'content profiles-content compras-content caixa-content');
    panel.append(head, body);
    view.append(panel);
    document.querySelector('main').append(view);
    setViewOriginColor(view, C.COR);
    panel.style.setProperty('--panel-text', C.COR_TEXTO);
    addShortcuts(id, voltar || C.voltar);
    return {
      view, body,
      ativar() {
        badge.innerHTML = C.icone();
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
  function dialogo(opcoes) {
    const d = U.dialogo(opcoes);
    d.style.setProperty('--menu-accent', C.COR);
    d.style.setProperty('--dialog-accent', C.COR);
    d.classList.add('caixa-dialog');
    return d;
  }
  const registrar = (nome, abrir) => { telas[nome] = abrir; };
  function abrir(nome) {
    const t = telas[nome];
    if (t) return t();
    console.warn('Caixa: tela não encontrada', nome);
  }

  Object.assign(C, { criarTela, dialogo, seletorPerfil, faixaDemo, registrar, abrir });
})();
