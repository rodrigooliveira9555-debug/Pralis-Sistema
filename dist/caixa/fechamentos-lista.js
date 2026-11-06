/*
 * Caixa — Fechamentos de Caixa (casca): fila e histórico, com filtros. Base no principal: HistoricoCaixasPage (Gerência),
 * relatório de fechamento e conferência da Tesouraria (Caixa-Brain/06 e /08). Uma tela só no lugar da antiga Conferência
 * de Fechamentos e do histórico que morava na Gerência. Dossiê em fechamentos-dossie.js, decisão em fechamentos-decisao.js,
 * a tela em fechamentos.js.
 * Visões: Tesoureiro decide; Financeiro só consulta (mesma tela, sem os botões); Gerente vê o histórico e o detalhe SEM
 * contagem, diferença nem decisão (a contagem é cega para a Gerência); Operador não entra. Dados FICTÍCIOS, em centavos.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const { el, botao, campo, entrada, seletor } = U;
  const { moeda } = C;

  const PARA_CONFERIR = ['aguardando_tesouraria', 'fechado_sem_pendencias', 'com_quebra'];
  const VAZIO = { de: '', ate: '', pdv: '', operador: '', turno: '', situacao: '' };
  /** Estado só da TELA (o dos caixas fica em C.estado). `atualizar` é posto pela tela. */
  const ctx = { atualizar: () => {}, aba: 'conferir', filtro: { ...VAZIO }, selecionado: null };

  const corpoSecao = (...nos) => { const c = el('div', 'compras-corpo'); c.append(...nos); return c; };
  const dl = (pares) => {
    const caixa = el('dl', 'caixa-declarado');
    pares.forEach(([t, v]) => { const d = el('div'); d.append(el('dt', null, t), el('dd', null, v)); caixa.append(d); });
    return caixa;
  };
  const sinal = (d) => (d < 0 ? '▼ Falta ' + moeda(-d) : d > 0 ? '▲ Sobra ' + moeda(d) : '✓ Bateu');
  const classeDif = (d) => (d < 0 ? 'falta' : d > 0 ? 'sobra' : 'bateu');
  const iso = (br) => br.split('/').reverse().join('-');
  const veTudo = () => C.estado.perfil === 'gerente'; // histórico de todos os caixas, sem contagem

  /** Linhas da lista: Gerente vê também os caixas abertos e em fechamento; Tesouraria/Financeiro, só os fechados. */
  const linhas = () => (veTudo() ? C.caixas().map((l) => ({ ...l, status: l.situacao })) : C.estado.fechamentos);
  const fechados = () => C.estado.fechamentos;
  const reiniciarTela = () => { ctx.aba = 'conferir'; ctx.filtro = { ...VAZIO }; ctx.selecionado = null; };

  function filtrar(todas) {
    const f = ctx.filtro;
    return todas.filter((l) => (!f.pdv || l.pdv === f.pdv) && (!f.operador || l.operador === f.operador) && (!f.turno || l.turno === f.turno)
      && (!f.situacao || (veTudo() ? l.status === f.situacao : C.situacaoDe(l) === f.situacao))
      && (!f.de || iso(l.data) >= f.de) && (!f.ate || iso(l.data) <= f.ate));
  }

  function filtros(todas) {
    const f = ctx.filtro;
    const g = el('div', 'caixa-grade caixa-filtros');
    const sel = (chave, rotulo, opcoes, vazio) => { const x = seletor(opcoes, f[chave], vazio); x.onchange = () => { f[chave] = x.value; ctx.selecionado = null; ctx.atualizar(); }; return campo(rotulo, x); };
    const dt = (chave, rotulo) => { const x = entrada('date', f[chave]); x.onchange = () => { f[chave] = x.value; ctx.selecionado = null; ctx.atualizar(); }; return campo(rotulo, x); };
    const situacoes = veTudo() ? [['aberto', 'Aberto'], ['em_fechamento', 'Em fechamento'], ['fechado', 'Fechado']] : Object.entries(C.ROTULO_SITUACAO);
    g.append(dt('de', 'Data inicial'), dt('ate', 'Data final'), sel('pdv', 'PDV', ['PDV 1', 'PDV 2', 'PDV 3', 'PDV 4'], 'Todos'),
      sel('operador', 'Operador', [...new Set(todas.map((l) => l.operador))], 'Todos'), sel('turno', 'Turno', ['Manhã', 'Tarde'], 'Todos'), sel('situacao', 'Situação', situacoes, 'Todas'));
    const msg = f.de && f.ate && f.de > f.ate ? [el('p', 'caixa-pendencias', 'Data inicial não pode ser maior que a final.')] : [];
    return [g, ...msg, botao('Limpar filtros', () => { ctx.filtro = { ...VAZIO }; ctx.selecionado = null; ctx.atualizar(); }, 'btn secondary')];
  }

  const ROTULO_STATUS = { aberto: ['Aberto', 'info'], em_fechamento: ['Em fechamento', 'atencao'], fechado: ['Fechado', 'positivo'] };
  const situacaoChip = (h) => U.situacao(C.ROTULO_SITUACAO[C.situacaoDe(h)], C.TOM_SITUACAO[C.situacaoDe(h)]);

  function colunasConferencia() {
    return [
      ['Data', (h) => h.data], ['PDV · turno', (h) => h.pdv + ' · ' + h.turno], ['Operador', (h) => h.operador],
      ['Esperado', (h) => moeda(h.esperado), 'caixa-num'], ['Contado', (h) => moeda(h.contado), 'caixa-num'],
      ['Diferença', (h) => el('span', 'caixa-diferenca-linha ' + classeDif(h.diferenca), sinal(h.diferenca))],
      ['Situação', situacaoChip],
    ];
  }
  function colunasGerencia() { // sem esperado, contado nem diferença: a contagem é cega para a Gerência
    return [
      ['Data', (l) => l.data], ['PDV', (l) => l.pdv], ['Operador', (l) => l.operador], ['Turno', (l) => l.turno],
      ['Abertura → Fechamento', (l) => l.abertura + (l.fechamento ? ' → ' + l.fechamento : ' → …')],
      ['Entradas', (l) => moeda(l.entradas), 'caixa-num'], ['Transf. entrada', (l) => moeda(l.transfEntrada), 'caixa-num'], ['Transf. saída', (l) => moeda(l.transfSaida), 'caixa-num'],
      ['Saldo', (l) => moeda(l.saldo), 'caixa-num'], ['Status', (l) => U.situacao(ROTULO_STATUS[l.status][0], ROTULO_STATUS[l.status][1])],
    ];
  }

  /** A seção da lista: abas (Tesouraria/Financeiro), filtros e tabela. */
  function lista() {
    const todas = linhas();
    const naFila = fechados().filter((h) => PARA_CONFERIR.includes(C.situacaoDe(h)));
    const feitos = fechados().filter((h) => !PARA_CONFERIR.includes(C.situacaoDe(h)));
    const base = veTudo() ? todas : (ctx.aba === 'conferir' ? naFila : feitos);
    const f = filtrar(base);
    const s = U.secao(veTudo() ? 'Histórico de caixas' : 'Fechamentos de caixa', f.length);
    const partes = [];
    if (!veTudo()) partes.push(U.chips([['conferir', 'Para conferir (' + naFila.length + ')'], ['feitos', 'Já conferidos (' + feitos.length + ')']], ctx.aba, (v) => { ctx.aba = v; ctx.selecionado = null; ctx.atualizar(); }));
    partes.push(...filtros(todas));
    const vivo = C.estado.status === 'aberto' || C.estado.status === 'em_fechamento';
    if (!veTudo() && vivo) partes.push(U.nota('Há um caixa ainda ' + (C.estado.status === 'aberto' ? 'aberto' : 'em fechamento') + ': ele só entra na fila depois de fechar.'));
    s.append(corpoSecao(...partes));
    s.append(U.tabela(veTudo() ? colunasGerencia() : colunasConferencia(), f, {
      aoClicar: (h) => { ctx.selecionado = h.id; ctx.atualizar(); },
      vazioTexto: veTudo() ? 'Nenhum caixa para este filtro.' : ctx.aba === 'conferir' ? 'Nenhum caixa para conferir.' : 'Nenhum caixa conferido ainda.',
      classeLinha: (h) => (h.id === ctx.selecionado ? 'selecionada' : ''),
    }));
    if (veTudo()) {
      const soma = (k) => f.reduce((t, l) => t + l[k], 0);
      s.append(corpoSecao(dl([['Total do filtro · Entradas', moeda(soma('entradas'))], ['Transf. entrada', moeda(soma('transfEntrada'))], ['Transf. saída', moeda(soma('transfSaida'))], ['Saldo', moeda(soma('saldo'))]]),
        U.nota('Caixa fechado mostra o saldo gravado no fechamento (R$ 0,00, pois o contado volta ao Cofre); caixa aberto mostra o saldo ao vivo.')));
    }
    return { secao: s, vazia: f.length === 0 };
  }

  window.CicluzCaixaFechamentos = { ctx, corpoSecao, dl, sinal, classeDif, veTudo, linhas, fechados, situacaoChip, reiniciarTela, lista, PARA_CONFERIR };
})();
