/*
 * Caixa — Fechamento: peças comuns (casca). Constantes, ajudantes de tela e o valor "do PDV" que a folha e a maquininha
 * comparam. `ctx` guarda só o que é da TELA (mensagens de erro, texto digitado, botões a recalcular no lugar).
 * O fechamento inteiro é formulário linha por linha (padrão da Nova Transferência): grupo com título, quadro de linhas de 52 px
 * (nome à esquerda, valor à direita) e notas/avisos DEPOIS do quadro. `dl` devolve o quadro de linhas de leitura (par nome/valor).
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const { el } = U;
  const { moeda } = C;
  const { linha, quadro } = C.pecas();

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

  /** Quadro de linhas de leitura (nome à esquerda, valor à direita) para pares [nome, valor]; vai dentro de um grupo (secao). */
  const dl = (pares) => quadro(...pares.map(([t, v]) => C.linhaLeitura(t, v)));
  /** Linha com a etiqueta de situação à direita (sinal + palavra, nunca só cor). */
  const linhaSituacao = (rotulo, texto, tom) => { const v = el('span', 'transferencia-linha-valor'); v.append(U.situacao(texto, tom)); return linha(rotulo, v); };
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

  /** O que a folha do CREARE e a maquininha imprimem: tudo que o PDV vendeu no período, inclusive o que ainda está SEM caixa (R-224). */
  function lidoNoPdv() {
    const p = pralis();
    const s = (nome) => C.totalSemCaixa(nome);
    return { ...p, credito: p.credito + s('Crédito'), debito: p.debito + s('Débito'), dinheiro: p.dinheiro + s('Dinheiro'), pix: p.pix + s('Pix'), voucher: p.voucher + s('Voucher'), total: p.total + s() };
  }

  window.CicluzCaixaFechamentoComum = { ctx, dl, linhaSituacao, cadeado, fmt, CAMPOS_FOLHA, FORMAS_CARTAO, NOME_FORMA, ICONE_CADEADO, pralis, lidoNoPdv, gerencia };
})();
