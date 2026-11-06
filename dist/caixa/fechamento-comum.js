/*
 * Caixa — Fechamento: peças comuns (casca). Constantes, ajudantes de tela e o valor "do PDV" que a folha e a maquininha
 * comparam. `ctx` guarda só o que é da TELA (mensagens de erro, texto digitado, botões a recalcular no lugar).
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const { el } = U;
  const { moeda } = C;

  const CAMPOS_FOLHA = [
    ['trocoInicial', 'Troco Inicial', true], ['saldoInicial', 'Saldo Inicial', false], ['clientes', 'CLIENTES (VND/TRANS)', false],
    ['credito', 'Crédito', true], ['debito', 'Débito', true], ['dinheiro', 'Dinheiro', true], ['pix', 'Pix', true], ['voucher', 'Voucher', true],
    ['total', 'Total', true], ['despesas', 'Despesas', true], ['sangria', 'Sangria', true], ['saldoFinal', 'Saldo Final Dinheiro', false],
  ];
  const FORMAS_CARTAO = [['credito', 'Crédito'], ['debito', 'Débito'], ['pix', 'Pix'], ['voucher', 'Voucher']];
  const NOME_FORMA = { credito: 'Crédito', debito: 'Débito', dinheiro: 'Dinheiro', pix: 'Pix', voucher: 'Voucher' };
  const ICONE_CADEADO = '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>';
  const fmt = (c) => (c / 100).toFixed(2).replace('.', ',');

  /** Estado só da tela do fechamento (o estado do caixa fica em C.estado). */
  const ctx = { atualizar: () => {}, erroGerar: '', erroMaq: '', justContagem: '', corrigindoContagem: false, gerarRefresh: null, fecharRefresh: null };
  const gerencia = () => C.estado.perfil === 'gerente';

  const corpoSecao = (...nos) => { const c = el('div', 'compras-corpo'); c.append(...nos); return c; };
  const dl = (pares) => {
    const caixa = el('dl', 'caixa-declarado');
    pares.forEach(([t, v]) => { const d = el('div'); d.append(el('dt', null, t), el('dd', null, v)); caixa.append(d); });
    return caixa;
  };
  const cadeado = (texto) => {
    const s = el('span', 'caixa-lacrado');
    s.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONE_CADEADO + '</svg>';
    s.append(document.createTextNode(texto));
    return s;
  };

  function pralis() {
    const r = C.resumo();
    const forma = (n) => (r.porForma.find((x) => x[0] === n) || [n, 0])[1];
    return {
      trocoInicial: C.estado.abertura.valorInicial, credito: forma('Crédito'), debito: forma('Débito'), dinheiro: forma('Dinheiro'),
      pix: forma('Pix'), voucher: forma('Voucher'), total: r.entradas, despesas: 0, sangria: r.sangrias,
    };
  }

  window.CicluzCaixaFechamentoComum = { ctx, corpoSecao, dl, cadeado, fmt, CAMPOS_FOLHA, FORMAS_CARTAO, NOME_FORMA, ICONE_CADEADO, pralis, gerencia };
})();
