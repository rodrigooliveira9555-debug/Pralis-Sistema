/*
 * Compras — entrada do módulo no menu do S2.
 * Lugar no menu (vídeo do Rodrigo, 06/11/2026; revisto pelo Zé em 23/11/2026): Saídas · Mercadorias → Lançamentos recebe
 * o agendamento e os cards de rotina (agenda → pede → cota → recebe); Cadastros Geral recebe MER - Fornecedores,
 * MER - Produtos, Unidades de Medida e MER - Catálogo e Preço-Base; Estoques recebe MER - Grupo Mercadorias e
 * MER - Contagem de Estoque. O agendamento saiu do menu Agenda (um caminho só).
 * Cada tela se registra com CicluzCompras.registrar(nome, abrir).
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const telas = {};

  const CARDS = [
    ['agendamento', 'MER - Agenda de Pedidos', 'Pedidos de compra que se repetem', 'agenda'],
    ['solicitacao', 'MER - Pedido de Compra', 'Fazer o pedido e enviar aos fornecedores', 'lista'],
    ['cotacao', 'MER - Cotação por Fornecedor', 'Produtos em cotação e decisões', 'cotacao'],
    ['pedidos', 'MER - Pedidos a Receber', 'O que foi comprado e o recebimento', 'caminhao'],
  ];
  const ESTOQUES = [
    ['estoque', 'MER - Grupo Mercadorias', '', 'estoque'],
    ['conferencias', 'MER - Contagem de Estoque', 'Contagem cega, recontagem e aprovação', 'conferencia'],
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
  const voltarEstoques = () => menuBack(3, 'Estoques')();

  function registrar(nome, abrir) { telas[nome] = abrir; }
  function abrir(nome) {
    if (nome === 'fornecedores') return window.CicluzComprasCadastros.abrirFornecedores('mer');
    // DES - Fornecedores (Saídas · Despesas) abre o mesmo cadastro, na cor e com o Voltar de Despesas.
    if (nome === 'fornecedores-des') return window.CicluzComprasCadastros.abrirFornecedores('des');
    // VND - Clientes (Entradas · Vendas): cadastro próprio, na cor de Entradas.
    if (nome === 'clientes-vnd') return window.CicluzComprasClientes.abrir();
    if (nome === 'produtos') return window.CicluzComprasProdutos.abrir();
    const t = telas[nome];
    if (t) return t();
    console.warn('Compras: tela não encontrada', nome);
  }

  window.CicluzCompras = {
    cards: () => CARDS.map(([id, t, d]) => [t, d, 'compras:' + id]),
    estoqueCards: () => ESTOQUES.map(([id, t, d]) => [t, d, 'compras:' + id]),
    cadastroCards: () => CADASTROS.map(([id, t, d]) => [t, d, 'compras:' + id]),
    icone, abrir, registrar, voltarLancamentos, voltarCadastros, voltarEstoques,
  };
})();
