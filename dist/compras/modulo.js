/*
 * Compras — entrada do módulo no menu do S2.
 * Saídas · Mercadorias / CMV → Compras abre os cards abaixo (ordem do menu Compras do S1).
 * Cadastros → Compras recebe MER - Fornecedores e MER - Produtos.
 * Cada tela se registra com CicluzCompras.registrar(nome, abrir).
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const telas = {};

  const CARDS = [
    ['solicitacao', 'Solicitação de compra', 'Fazer o pedido e enviar aos fornecedores', 'lista'],
    ['cotacao', 'Cotação por fornecedor', 'Produtos em cotação e decisões', 'compras'],
    ['pedidos', 'Pedidos a receber', 'O que foi comprado e o recebimento', 'caminhao'],
    ['conferencias', 'Conferências de estoque', 'Contagens agendadas', 'conferencia'],
    ['cadastro', 'Cadastro de compras', 'Catálogo, histórico e preço-base', 'cadastro'],
  ];
  const ESTOQUES = [
    ['estoque', 'MER - Grupo Mercadorias', '', 'estoque'],
  ];
  const CADASTROS = [
    ['fornecedores', 'MER - Fornecedores', 'Quem vende para a loja', 'fornecedor'],
    ['produtos', 'MER - Produtos', 'Cadastro, como se compra e estoque mínimo', 'produto'],
    ['unidades', 'Unidades de medida', 'Siglas de embalagem, medida de compra e conversões', 'lista'],
  ];
  const icone = (target) => {
    const nome = target.replace(/^compras:/, '');
    const item = [...CARDS, ...CADASTROS, ...ESTOQUES].find((c) => c[0] === nome);
    return U.svg(U.ICONES[item ? item[3] : 'compras']);
  };

  const voltarCompras = () => openSection(sections[3][0], 'Compras', 'compras', U.COR);

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
    icone, abrir, registrar, voltarCompras,
  };
})();
