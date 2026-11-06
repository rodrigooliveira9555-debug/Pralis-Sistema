/*
 * Compras — entrada do módulo no menu do S2.
 * Lugar no menu (vídeo do Rodrigo, 06/11/2026): Saídas · Mercadorias → Lançamentos recebe os cards de rotina
 * (pede → cota → recebe → conta); Cadastros Geral recebe MER - Fornecedores, MER - Produtos, Unidades de Medida e
 * MER - Catálogo e Preço-Base; Estoques recebe MER - Grupo Mercadorias. O agendamento fica em Agenda →
 * MER - Agenda de Pedidos.
 * Cada tela se registra com CicluzCompras.registrar(nome, abrir).
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const telas = {};

  const CARDS = [
    ['solicitacao', 'MER - Pedido de Compra', 'Fazer o pedido e enviar aos fornecedores', 'lista'],
    ['cotacao', 'MER - Cotação por Fornecedor', 'Produtos em cotação e decisões', 'cotacao'],
    ['pedidos', 'MER - Pedidos a Receber', 'O que foi comprado e o recebimento', 'caminhao'],
    ['conferencias', 'MER - Contagem de Estoque', 'Contagem cega, recontagem e aprovação', 'conferencia'],
  ];
  const ESTOQUES = [
    ['estoque', 'MER - Grupo Mercadorias', '', 'estoque'],
  ];
  const CADASTROS = [
    ['fornecedores', 'MER - Fornecedores', 'Quem vende para a loja', 'fornecedor'],
    ['produtos', 'MER - Produtos', 'Cadastro, como se compra e estoque mínimo', 'produto'],
    ['unidades', 'Unidades de Medida', 'Siglas de embalagem, medida de compra e conversões', 'lista'],
    ['cadastro', 'MER - Catálogo e Preço-Base', 'Quem vende o quê, histórico de compras e preço-base', 'cadastro'],
  ];
  const icone = (target) => {
    const nome = target.replace(/^compras:/, '');
    const item = [...CARDS, ...CADASTROS, ...ESTOQUES].find((c) => c[0] === nome);
    return U.svg(U.ICONES[item ? item[3] : 'compras']);
  };

  const voltarLancamentos = () => menuBack(3, 'Lançamentos')();
  const voltarCadastros = () => menuBack(3, 'Cadastros Geral')();

  function registrar(nome, abrir) { telas[nome] = abrir; }
  function abrir(nome) {
    if (nome === 'fornecedores') return window.CicluzComprasCadastros.abrirFornecedores();
    if (nome === 'produtos') return window.CicluzComprasProdutos.abrir();
    const t = telas[nome];
    if (t) return t();
    console.warn('Compras: tela não encontrada', nome);
  }

  window.CicluzCompras = {
    cards: () => CARDS.map(([id, t, d]) => [t, d, 'compras:' + id]),
    estoqueCards: () => ESTOQUES.map(([id, t, d]) => [t, d, 'compras:' + id]),
    cadastroCards: () => CADASTROS.map(([id, t, d]) => [t, d, 'compras:' + id]),
    icone, abrir, registrar, voltarLancamentos, voltarCadastros,
  };
})();
