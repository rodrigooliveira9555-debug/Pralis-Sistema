/*
 * Popup só de leitura (24/11/2026, pedido do Marco): o detalhe da venda abre por cima da lista, sem virar outra tela.
 * Não é <dialog> de propósito: no S2 toda <dialog> aberta vira tela cheia (people-header-pilot.js). Este popup é para
 * CONSULTA (nada se edita nem se salva); janelas de cadastro continuam sendo U.dialogo.
 * Acessível: role="dialog" + aria-modal, foco vai para o Fechar e fica preso dentro, Esc e o fundo fecham, o foco volta a
 * quem abriu. Movimento: entra subindo 8 px com fade (180 ms); sem movimento com prefers-reduced-motion.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const { el } = U;
  let seq = 0;

  function abrirPopup({ titulo, subtitulo, montar, cor, corTexto }) {
    const quemAbriu = document.activeElement;
    const fundo = el('div', 'vendas-pdv-popup-fundo');
    const caixa = el('div', 'vendas-pdv-popup');
    const idTitulo = 'vendas-pdv-popup-titulo-' + (++seq);
    caixa.setAttribute('role', 'dialog');
    caixa.setAttribute('aria-modal', 'true');
    caixa.setAttribute('aria-labelledby', idTitulo);
    if (cor) caixa.style.setProperty('--menu-accent', cor);
    if (corTexto) caixa.style.setProperty('--panel-text', corTexto);
    const cab = el('div', 'vendas-pdv-popup-cab');
    const textos = el('div');
    const h = el('h2', null, titulo);
    h.id = idTitulo;
    textos.append(h);
    if (subtitulo) textos.append(el('p', null, subtitulo));
    const fechar = el('button', 'vendas-pdv-popup-fechar');
    fechar.type = 'button';
    fechar.setAttribute('aria-label', 'Fechar');
    fechar.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
    cab.append(textos, fechar);
    const corpo = el('div', 'vendas-pdv-popup-corpo');
    montar(corpo);
    caixa.append(cab, corpo);
    fundo.append(caixa);
    document.body.append(fundo);

    function fecharPopup() {
      document.removeEventListener('keydown', teclas, true);
      fundo.remove();
      if (quemAbriu && quemAbriu.isConnected) quemAbriu.focus();
    }
    function teclas(e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fecharPopup(); return; }
      if (e.key !== 'Tab') return;
      const focaveis = [...caixa.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter((n) => !n.disabled);
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
    }
    fechar.onclick = fecharPopup;
    fundo.addEventListener('pointerdown', (e) => { if (e.target === fundo) fecharPopup(); });
    document.addEventListener('keydown', teclas, true);
    fechar.focus();
    return fecharPopup;
  }

  window.CicluzVendasPdvPopup = { abrir: abrirPopup };
})();
