/*
 * Sistema comandas — o popup de detalhe (reaproveita o popup só de leitura de Vendas dos PDVs). De cima para baixo:
 * valor e situação; quem e quando; a linha do tempo (abriu → itens → puxada no caixa → paga), que é a mesma régua da
 * lista, agora na vertical; os itens (cancelados riscados, com motivo); a venda que nasceu da comanda (os dois valores
 * e a diferença); observação e cliente.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const D = window.CicluzComandasDados;
  const { el } = U;
  const { SITUACAO, moeda, numero, quando, duracao } = D;

  const bloco = (titulo, ...nos) => {
    const b = el('section', 'vendas-pdv-detalhe-bloco');
    b.append(el('h3', null, titulo), ...nos);
    return b;
  };
  const linhas = (pares) => {
    const dl = el('dl', 'vendas-pdv-detalhe-linhas');
    pares.forEach(([t, v, classe]) => {
      const d = el('div', classe || null);
      d.append(el('dt', null, t), el('dd', null, v));
      dl.append(d);
    });
    return dl;
  };

  const MARCA = { abriu: 'inicio', item: 'item', item_cancelado: 'cancelado', puxada: 'caixa', fechada: 'fim', cancelada: 'cancelado' };

  function linhaDoTempo(c) {
    if (!c.linhaDoTempo.length) return U.nota('O CREARE não informou os horários desta comanda.');
    const lista = el('ol', 'comandas-tempo');
    c.linhaDoTempo.forEach((e) => {
      const li = el('li', 'comandas-tempo-passo marca-' + (MARCA[e.tipo] || 'item'));
      const quandoEl = el('time', 'comandas-tempo-hora', quando(e.em));
      quandoEl.dateTime = e.em;
      li.append(quandoEl, el('span', 'comandas-tempo-texto', e.texto));
      lista.append(li);
    });
    const nota = [];
    if (c.status === 2 && c.puxadaAproximada) nota.push(U.nota('O CREARE não informou a hora em que o caixa puxou a comanda: o tempo no caixa conta do último lançamento.'));
    return [lista, ...nota];
  }

  function itens(c) {
    if (!c.itens.length) return U.nota('A comanda está sem itens.');
    const validos = c.itens.filter((i) => !i.cancelado);
    const cancelados = c.itens.filter((i) => i.cancelado);
    const nos = [];
    if (validos.length) {
      nos.push(linhas(validos.map((i) => [
        numero(i.quantidade) + ' × ' + i.descricao + (i.funcionario ? ' · ' + i.funcionario : ''),
        moeda(i.valorTotalCentavos),
      ])));
    }
    if (cancelados.length) {
      const dl = linhas(cancelados.map((i) => [
        numero(i.quantidade) + ' × ' + i.descricao + ' — cancelado' + (i.motivoCancelamento ? ': ' + i.motivoCancelamento : ''),
        moeda(i.valorTotalCentavos),
        'comandas-item-cancelado',
      ]));
      dl.setAttribute('aria-label', 'Itens cancelados');
      nos.push(el('p', 'comandas-subtitulo', cancelados.length === 1 ? '1 item cancelado' : cancelados.length + ' itens cancelados'), dl);
    }
    return nos;
  }

  function venda(c) {
    if (c.valorVendaCentavos === null) {
      return U.nota(c.status === 5 ? 'O CREARE não ligou esta comanda a uma venda.' : 'A comanda ainda não virou venda.');
    }
    const pares = [['Comanda', moeda(c.valorTotalCentavos)], ['Venda no caixa' + (c.vendaCreareId ? ' nº ' + c.vendaCreareId : ''), moeda(c.valorVendaCentavos)]];
    const dif = c.diferencaVendaCentavos || 0;
    if (dif) pares.push(['Diferença', (dif > 0 ? '+ ' : '− ') + moeda(Math.abs(dif)), 'forte comandas-diferenca']);
    else pares.push(['Diferença', 'Sem diferença', 'forte']);
    const nos = [linhas(pares)];
    if (dif) nos.push(U.nota(dif > 0 ? 'A venda saiu maior que a comanda: item somado no caixa.' : 'A venda saiu menor que a comanda: desconto ou item tirado no caixa.'));
    return nos;
  }

  function abrir(c, { cor, corTexto }) {
    const [rotulo, tom, explica] = SITUACAO[c.situacao] || [c.situacao, 'neutro', ''];
    window.CicluzVendasPdvPopup.abrir({
      titulo: 'Comanda ' + c.numero + (c.mesa ? ' · mesa ' + c.mesa : ''),
      subtitulo: 'Aberta ' + quando(c.abertaEm) + (c.fechadaEm ? ' · fechada ' + quando(c.fechadaEm) : ''),
      cor, corTexto,
      montar(form) {
        const topo = el('div', 'vendas-pdv-detalhe-topo');
        const valor = el('div');
        valor.append(el('span', 'vendas-pdv-numero-rotulo', 'Valor da comanda'), el('strong', null, moeda(c.valorTotalCentavos)));
        topo.append(valor, U.situacao(rotulo, tom));
        const resumo = [explica, 'Ficou aberta ' + duracao(c.segundosAberta), c.lancadoPor ? 'Lançou: ' + c.lancadoPor : ''].filter(Boolean).join(' · ');
        form.append(topo, el('p', 'vendas-pdv-detalhe-quem', resumo));
        form.append(bloco('Linha do tempo', ...[].concat(linhaDoTempo(c))));
        form.append(bloco('Itens', ...[].concat(itens(c))));
        form.append(bloco('Venda no caixa', ...[].concat(venda(c))));
        const extras = [];
        if (c.nomeCliente) extras.push(['Cliente', c.nomeCliente]);
        if (c.valorDescontoCentavos) extras.push(['Desconto na comanda', '− ' + moeda(c.valorDescontoCentavos)]);
        if (extras.length) form.append(bloco('Mais', linhas(extras)));
        if (c.observacao) form.append(bloco('Observação', U.nota(c.observacao)));
      },
    });
  }

  window.CicluzComandasDetalhe = { abrir };
})();
