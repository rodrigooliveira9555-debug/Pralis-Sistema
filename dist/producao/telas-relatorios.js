/*
 * MER - Produção, o relatório da produção (Saídas · Mercadorias → Relatórios). Decisão do Zé (05/11/2026): entra o que já tem dado
 * (mais produzidos, sobra e descarte por período, no lugar da folha de produção) e o "mais vendidos" usa o
 * campo de vendas dos últimos 3 meses do cadastro de produtos do Compras. Margem espera as fórmulas de custo.
 */
(function () {
  'use strict';
  const D = window.CicluzProducaoDominio;
  const S = window.CicluzProducaoDados;
  const U = window.CicluzComprasUI;
  const CD = window.CicluzComprasDominio;
  const M = window.CicluzProducao;
  const { el, campo, entrada } = U;

  let tela = null;
  const filtro = { de: '', ate: '', ordem: 'produzido' };
  const ORDENS = [['produzido', 'Mais produzidos'], ['vendas', 'Mais vendidos'], ['descarte', 'Mais descarte']];

  function abrir() {
    if (!tela) {
      tela = U.criarTela({ id: 'producao-relatorios', titulo: 'MER - Produção', caminho: M.CAMINHO_REL + 'MER - Produção', icone: 'relatorio', voltar: M.voltarRelatorios });
      document.addEventListener('cicluz-producao-mudou', () => { if (tela.view.classList.contains('show')) render(); });
    }
    if (!filtro.ate) { filtro.ate = S.hojeIso(); filtro.de = CD.isoData(CD.somarDias(new Date(), -29)); }
    tela.ativar();
    render();
  }

  function render() {
    const topo = el('div', 'profiles-controls');
    const de = entrada('date', filtro.de);
    const ate = entrada('date', filtro.ate);
    de.onchange = () => { filtro.de = de.value; render(); };
    ate.onchange = () => { filtro.ate = ate.value; render(); };
    const cDe = campo('De', de); const cAte = campo('Até', ate);
    cDe.classList.add('producao-campo-dia'); cAte.classList.add('producao-campo-dia');
    topo.append(cDe, cAte, U.chips(ORDENS, filtro.ordem, (v) => { filtro.ordem = v; render(); }));

    const dados = new Map(D.relatorio(S.producao.dados.pedidos, S.producao.dados.ordens, filtro.de, filtro.ate).map((l) => [l.produtoId, l]));
    // Todos os produtos da produção entram (com zero), para o "mais vendidos" fazer sentido.
    S.produzidos().forEach(({ p }) => { if (!dados.has(p.id)) dados.set(p.id, { produtoId: p.id, pedido: 0, produzido: 0, real: 0, sobra: 0, descarte: 0, desperdicio: 0 }); });
    const linhas = [...dados.values()].map((l) => ({ ...l, vendas: Number((S.produto(l.produtoId) || {}).vendas3m) || 0 }))
      .sort((a, b) => (b[filtro.ordem] - a[filtro.ordem]) || S.nomeProduto(a.produtoId).localeCompare(S.nomeProduto(b.produtoId), 'pt-BR'));
    const tot = linhas.reduce((t, l) => ({ produzido: t.produzido + l.produzido, real: t.real + l.real, sobra: t.sobra + l.sobra, descarte: t.descarte + l.descarte }), { produzido: 0, real: 0, sobra: 0, descarte: 0 });
    const resumo = U.nota('No período: produzido ' + CD.numero(tot.produzido) + ' · abastecido ' + CD.numero(tot.real) + ' · sobra ' + CD.numero(tot.sobra) + ' · descarte ' + CD.numero(tot.descarte) + (tot.real ? ' (' + CD.numero(tot.descarte / tot.real * 100, 1) + '% do abastecido)' : '') + '.');
    const n = (v) => CD.numero(v);
    const tab = U.tabela([
      ['Produto', (l) => S.nomeProduto(l.produtoId)],
      ['Pedido', (l) => n(l.pedido), 'num'],
      ['Produzido', (l) => n(l.produzido), 'num'],
      ['Abastecido', (l) => n(l.real), 'num'],
      ['Sobra', (l) => n(l.sobra), 'num'],
      ['Descarte', (l) => n(l.descarte), 'num'],
      ['Desperdício', (l) => (l.real ? CD.numero(l.desperdicio * 100, 1) + '%' : '—'), 'num'],
      ['Vendas 3 meses', (l) => n(l.vendas), 'num'],
    ], linhas, { vazioTexto: 'Nenhum produto ligado à produção.' });
    tela.body.replaceChildren(topo, resumo, tab,
      U.nota('"Vendas 3 meses" vem do cadastro de produtos do Compras (número cadastrado/importado), não da venda real do caixa. Desperdício = descarte ÷ abastecido. A margem entra quando as fórmulas de custo forem aprovadas.'));
  }

  M.registrar('relatorios', abrir);
})();
