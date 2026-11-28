/*
 * Open Finance - Caixa Econômica TNP — os quadros de números.
 *   Resumo: na conta, saldo, entradas e saídas do período filtrado e o cheque especial; no cartão, fatura em aberto,
 *   limite disponível (com a barra de uso), vencimento e mínimo, e as compras do período.
 *   Análise: para onde foi o dinheiro (saídas por categoria) e por operação (Pix, boleto, TED…), em barras; tocar
 *   numa barra filtra por ela (de novo, solta).
 *   Faturas (só no cartão) e Aplicações (só nas contas).
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const D = window.CicluzExtratoTnpDados;
  const { el } = U;
  const { estado, moeda } = D;

  const corpo = (...nos) => { const c = el('div', 'compras-corpo'); c.append(...nos.filter(Boolean)); return c; };
  function numero(rotulo, valor, detalhe, tom) {
    const n = el('div', 'vendas-pdv-numero' + (tom ? ' tom-' + tom : ''));
    n.append(el('span', 'vendas-pdv-numero-rotulo', rotulo), el('strong', null, valor));
    if (detalhe) n.append(el('small', null, detalhe));
    return n;
  }
  /** Barra de uso (limite do cartão, cheque especial): a cor nunca é a única pista, o texto diz o número. */
  function uso(usado, limite, rotulo) {
    const parte = limite > 0 ? Math.max(0, Math.min(1, usado / limite)) : 0;
    const caixa = el('div', 'extrato-tnp-uso');
    caixa.setAttribute('role', 'meter');
    caixa.setAttribute('aria-label', rotulo);
    caixa.setAttribute('aria-valuemin', '0');
    caixa.setAttribute('aria-valuemax', String(limite));
    caixa.setAttribute('aria-valuenow', String(Math.max(0, usado)));
    // O leitor de tela fala em reais, não em centavos.
    caixa.setAttribute('aria-valuetext', moeda(Math.max(0, usado)) + ' de ' + moeda(limite) + ' (' + Math.round(parte * 100) + '%)');
    const trilho = el('span', 'vendas-pdv-trilho');
    const cheio = el('span', 'vendas-pdv-cheio' + (parte >= 0.8 ? ' alto' : ''));
    cheio.style.setProperty('--parte', parte.toFixed(4));
    trilho.append(cheio);
    caixa.append(trilho, el('small', null, Math.round(parte * 100) + '% usado'));
    return caixa;
  }

  /** "17/11 a 24/11" (ou só "24/11" quando é um dia). */
  const periodoCurto = () => (estado.desde === estado.ate ? D.dataCurta(estado.ate).slice(0, 5) : D.dataCurta(estado.desde).slice(0, 5) + ' a ' + D.dataCurta(estado.ate).slice(0, 5));

  function resumo(d, lista, conta) {
    const cartao = Boolean(conta && conta.tipo === 'CREDIT');
    const t = D.somar(lista, cartao);
    const filtrando = Boolean(D.filtrosEmUso() || estado.filtro.busca || estado.filtro.tipo);
    const sufixo = filtrando ? ' (filtrado)' : '';
    const grade = el('div', 'vendas-pdv-numeros extrato-tnp-numeros');
    const det = (conta && conta.detalhes) || {};
    const conta_ = (sinal, tambemPendente) => lista.filter((l) => (sinal < 0 ? l.valorCentavos < 0 : l.valorCentavos >= 0) && (tambemPendente || l.situacao !== 'PENDING')).length;
    if (cartao) {
      const limite = det.limiteCentavos;
      const disponivel = det.disponivelCentavos;
      const abertas = lista.filter((l) => l.situacao === 'PENDING' && l.valorCentavos < 0).length;
      const lim = numero('Limite disponível', disponivel != null ? moeda(disponivel) : '—', limite != null ? 'de ' + moeda(limite) : '');
      if (limite > 0 && disponivel != null) lim.append(uso(limite - disponivel, limite, 'Limite do cartão usado'));
      grade.append(
        numero('Fatura em aberto', moeda(conta.saldoCentavos), 'Lida em ' + D.quando(conta.saldoLidoEm), 'negativo'),
        lim,
        numero('Vencimento', det.vencimento ? D.dataCurta(det.vencimento) : '—', det.pagamentoMinimoCentavos != null ? 'Mínimo ' + moeda(det.pagamentoMinimoCentavos) : ''),
        numero('Compras' + sufixo, '−' + moeda(Math.abs(t.saidas)), D.plural(conta_(-1, true), 'compra', 'compras') + (abertas ? ' · ' + abertas + ' na fatura aberta' : ''), 'negativo'),
      );
    } else {
      const saldo = conta ? conta.saldoCentavos : d.saldoTotalCentavos;
      const lido = conta ? conta.saldoLidoEm : d.contas[0] && d.contas[0].saldoLidoEm;
      const fora = t.pendentes ? ' · ' + D.plural(t.pendentes, 'pendente fora do total', 'pendentes fora do total') : '';
      grade.append(
        // O saldo é o de agora (o banco não informa o saldo de um dia passado).
        numero('Saldo atual', moeda(saldo), (conta ? '' : 'Corrente e poupança · ') + 'lido em ' + D.quando(lido), saldo < 0 ? 'negativo' : ''),
        numero('Entradas' + sufixo, '+' + moeda(t.entradas), D.plural(conta_(1), 'lançamento', 'lançamentos') + fora, 'positivo'),
        numero('Saídas' + sufixo, '−' + moeda(Math.abs(t.saidas)), D.plural(conta_(-1), 'lançamento', 'lançamentos'), 'negativo'),
        numero('Resultado' + sufixo, D.comSinal(t.liquido), 'Entradas menos saídas', t.liquido < 0 ? 'negativo' : 'positivo'),
      );
      const especial = (conta ? [conta] : d.contas).map((c) => c.detalhes || {}).find((x) => x.chequeEspecialLimiteCentavos > 0);
      if (especial) {
        const usado = especial.chequeEspecialUsadoCentavos || 0;
        const n = numero('Cheque especial', moeda(especial.chequeEspecialLimiteCentavos - usado), 'disponível de ' + moeda(especial.chequeEspecialLimiteCentavos), usado > 0 ? 'negativo' : '');
        n.append(uso(usado, especial.chequeEspecialLimiteCentavos, 'Cheque especial usado'));
        grade.append(n);
      }
    }
    const s = U.secao('Resumo de ' + periodoCurto());
    s.append(corpo(grade, filtrando ? U.nota('Os números seguem os filtros. Limpe os filtros para ver o período inteiro.') : null));
    return s;
  }

  /** Barras que filtram: [{id, nome, total, quantidade}]. Sem id ("Outras", "Sem categoria") não filtra: fica desligada. */
  function barras(linhas, { total, marcado, aoTocar, vazio, chave }) {
    if (!linhas.length) return U.vazio(vazio);
    const ul = el('ul', 'vendas-pdv-barras');
    linhas.forEach((l) => {
      const parte = total > 0 ? Math.max(0, Math.min(100, (l.total / total) * 100)) : 0;
      const b = el('button', 'vendas-pdv-barra' + (marcado === l.id ? ' marcada' : ''));
      b.type = 'button';
      b.disabled = !l.id;
      b.dataset.chave = chave;
      b.dataset.id = l.id || '';
      b.setAttribute('aria-pressed', String(marcado === l.id));
      const cima = el('span', 'vendas-pdv-barra-topo');
      cima.append(el('b', null, l.nome), el('span', 'vendas-pdv-barra-valor', moeda(l.total)));
      const trilho = el('span', 'vendas-pdv-trilho');
      const cheio = el('span', 'vendas-pdv-cheio');
      cheio.style.setProperty('--parte', (parte / 100).toFixed(4));
      trilho.append(cheio);
      b.append(cima, trilho, el('span', 'vendas-pdv-barra-rodape', D.plural(l.quantidade, 'lançamento', 'lançamentos') + ' · ' + parte.toFixed(1).replace('.', ',') + '%'));
      if (l.id) b.onclick = () => aoTocar(l.id);
      const li = el('li');
      li.append(b);
      ul.append(li);
    });
    return ul;
  }

  /** Top 8 e o resto somado em "Outras" (que não filtra). */
  function top(grupos, nome) {
    const linhas = grupos.slice(0, 8).map((g) => ({ ...g, nome: nome(g.id) }));
    const resto = grupos.slice(8);
    if (resto.length) linhas.push({ id: null, nome: 'Outras (' + resto.length + ')', total: resto.reduce((s, g) => s + g.total, 0), quantidade: resto.reduce((s, g) => s + g.quantidade, 0) });
    return linhas;
  }

  /** aoFiltrar(chave, id) é chamado depois de mudar o filtro (a tela redesenha e devolve o foco à barra). */
  function analise(lista, { aoFiltrar, cartao = false }) {
    const f = estado.filtro;
    const saidas = D.agrupar(lista, 'categoria', -1, cartao);
    const entradas = D.agrupar(lista, 'operacao', 1, cartao);
    const operacoes = D.agrupar(lista, 'operacao', -1, cartao);
    const alternar = (chave) => (id) => { f[chave] = f[chave] === id ? '' : id; aoFiltrar(chave, id); };
    const soma = (g) => g.reduce((s, x) => s + x.total, 0);
    const coluna = (titulo, grupos, chave, nome, vazio) => {
      const s = U.secao(titulo);
      s.append(corpo(barras(top(grupos, nome), { total: soma(grupos), marcado: f[chave] || null, aoTocar: alternar(chave), vazio, chave })));
      return s;
    };
    const lado = el('div', 'vendas-pdv-lado extrato-tnp-analise');
    lado.append(
      coluna('Saídas por categoria', saidas, 'categoria', D.nomeCategoria, 'Nenhuma saída no filtro.'),
      coluna('Saídas por operação', operacoes, 'operacao', D.nomeOperacao, 'Nenhuma saída no filtro.'),
    );
    if (entradas.length) lado.append(coluna('Entradas por operação', entradas, 'operacao', D.nomeOperacao, ''));
    return lado;
  }

  function faturas(d) {
    const s = U.secao('Faturas', d.faturas.length);
    const hoje = D.hojeIso();
    const aberta = d.faturas.filter((f) => f.vencimento && f.vencimento >= hoje).sort((a, b) => (a.vencimento < b.vencimento ? -1 : 1))[0];
    const tabela = U.tabela([
      ['Vencimento', (f) => { const x = el('span', null, D.dataCurta(f.vencimento)); if (f === aberta) x.append(' ', U.situacao('Próxima', 'atencao')); return x; }],
      ['Fechamento', (f) => D.dataCurta(f.fechamento)],
      ['Total', (f) => moeda(f.totalCentavos), 'caixa-num'],
      ['Mínimo', (f) => (f.minimoCentavos != null ? moeda(f.minimoCentavos) : '—'), 'caixa-num'],
      ['Juros e encargos', (f) => (f.encargosCentavos ? moeda(f.encargosCentavos) : '—'), 'caixa-num'],
      ['Pago', (f) => (f.pagoCentavos ? moeda(f.pagoCentavos) : '—'), 'caixa-num'],
    ], d.faturas, { vazioTexto: 'A Pluggy ainda não trouxe as faturas deste cartão.' });
    s.append(tabela);
    return s;
  }

  function aplicacoes(d) {
    if (!d.investimentos.length) return null;
    const s = U.secao('Aplicações', d.investimentos.length);
    s.append(U.tabela([
      ['Aplicação', (i) => i.nome],
      ['Saldo', (i) => moeda(i.saldoCentavos), 'caixa-num'],
      ['Rendimento em 12 meses', (i) => (i.rentabilidade12m != null ? i.rentabilidade12m.toFixed(2).replace('.', ',') + '%' : '—'), 'caixa-num'],
      ['Lido em', (i) => D.quando(i.lidoEm)],
    ], d.investimentos));
    return s;
  }

  window.CicluzExtratoTnpPaineis = { resumo, analise, faturas, aplicacoes };
})();
