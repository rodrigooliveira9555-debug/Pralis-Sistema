/*
 * CNT - API Open Finance TNP / Banco Caixa Econômica — Detalhes do lançamento: o popup só de leitura de Vendas dos PDVs (vendas-pdv/popup.js),
 * com tudo o que a Pluggy trouxe: valor e situação, quem pagou ou recebeu (com CPF mascarado ou CNPJ), a operação e a
 * forma, a categoria, o estabelecimento e, no cartão, final, parcela, data da compra e fatura.
 * Só mostra o que veio: campo sem valor não aparece (nada de "—" em fila).
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const D = window.CicluzExtratoTnpDados;
  const { el } = U;

  function bloco(titulo, linhas) {
    const cheias = linhas.filter(([, v]) => v !== null && v !== undefined && v !== '');
    if (!cheias.length) return null;
    const b = el('section', 'vendas-pdv-detalhe-bloco');
    const dl = el('dl', 'vendas-pdv-detalhe-linhas');
    cheias.forEach(([rotulo, valor]) => {
      const linha = el('div');
      linha.append(el('dt', null, rotulo), el('dd', 'extrato-tnp-detalhe-valor', String(valor)));
      dl.append(linha);
    });
    b.append(el('h3', null, titulo), dl);
    return b;
  }

  function abrir(l, { conta, cor, corTexto }) {
    const d = l.detalhes || {};
    const cartao = d.cartao || {};
    const loja = d.estabelecimento || {};
    const quem = l.valorCentavos < 0 ? 'Quem recebeu' : 'Quem pagou';
    window.CicluzVendasPdvPopup.abrir({
      titulo: l.descricao || 'Lançamento',
      subtitulo: D.diaLongo(l.dia) + (D.hora(l.data) ? ' às ' + D.hora(l.data) : '') + (conta ? ' · ' + D.nomeConta(conta) : ''),
      cor,
      corTexto,
      montar(corpo) {
        const topo = el('div', 'vendas-pdv-detalhe-topo');
        const valor = el('div');
        valor.append(el('span', 'vendas-pdv-numero-rotulo', l.valorCentavos < 0 ? 'Saída' : 'Entrada'),
          el('strong', l.valorCentavos < 0 ? 'extrato-tnp-saida' : 'extrato-tnp-entrada', D.comSinal(l.valorCentavos)));
        topo.append(valor, l.situacao === 'PENDING' ? U.situacao('Pendente', 'atencao') : U.situacao('Lançado', 'positivo'));
        corpo.append(topo);
        if (l.situacao === 'PENDING') corpo.append(U.nota(conta && conta.tipo === 'CREDIT'
          ? 'Compra da fatura que ainda está aberta: entra nas compras do cartão.'
          : 'Pendente: o banco ainda não confirmou, por isso fica fora dos totais da conta.'));
        [
          bloco(quem, [
            ['Nome', l.contraparte],
            [d.documento ? d.documento.tipo : 'Documento', d.documento && d.documento.numero],
          ]),
          bloco('Operação', [
            ['Tipo', D.nomeOperacao(l.operacao)],
            ['Forma', D.nomeForma(d.forma)],
            ['Detalhe do banco', d.operacaoDetalhe],
            ['Motivo', d.motivo],
            ['Categoria', l.categoria ? D.nomeCategoria(l.categoria) : ''],
            ['Descrição no banco', d.descricaoBanco && d.descricaoBanco !== l.descricao ? d.descricaoBanco : ''],
          ]),
          bloco('Estabelecimento', [
            ['Empresa', loja.nome],
            ['CNPJ', loja.cnpj],
            ['Ramo', loja.ramo ? D.nomeCategoria(loja.ramo) : ''],
            ['CNAE', loja.cnae],
          ]),
          bloco('Cartão', [
            ['Final', cartao.final],
            ['Parcela', cartao.parcelas ? cartao.parcela + ' de ' + cartao.parcelas : ''],
            ['Data da compra', cartao.dataCompra ? D.dataCurta(cartao.dataCompra) : ''],
            ['Pagamento', cartao.tipoPagamento],
            ['Tarifa', cartao.tarifa],
            ['Código do ramo (MCC)', cartao.mcc],
          ]),
        ].filter(Boolean).forEach((b) => corpo.append(b));
      },
    });
  }

  window.CicluzExtratoTnpDetalhe = { abrir };
})();
