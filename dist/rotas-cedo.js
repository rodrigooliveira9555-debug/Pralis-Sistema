/*
 * Carregado no <head>, antes das telas. Marca se a pessoa clicou no menu ou num cartão enquanto a página
 * ainda carregava: o rotas.js (último script) só passa a gravar o endereço depois, e sem esta marca o fim
 * do carregamento reabria por cima a tela do endereço antigo, desfazendo o clique.
 */
(function () {
  function marcar(e) {
    if (document.readyState === 'complete') { removeEventListener('click', marcar, true); return; }
    if (e.target instanceof Element && e.target.closest('.nav-tree, .record-grid')) window.cicluzCliqueCedo = true;
  }
  addEventListener('click', marcar, true);
})();
