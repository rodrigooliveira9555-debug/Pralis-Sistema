/*
 * Caixa — Gerência (casca): Monitor de caixas abertos (com o painel de cada caixa) + enviar recebimento ao caixa +
 * mensagens + Histórico de caixas com filtros e detalhe. Base no principal: CaixaMonitorAbertos, transferência sem lacre
 * (R-231), MensagensAdminPainel/MensagemAdminEnvioDialog, HistoricoCaixasPage, CaixaDetalhe (Caixa-Brain/06).
 * Regras: exige `caixas_gerenciar` (só a Gerência); o monitor mostra só caixas ABERTOS (não os em fechamento); o detalhe NÃO
 * mostra contagem cega, correções nem a conferência da Tesouraria (isso é do dossiê). Recebimento e mensagens estão em
 * gerencia-recebimento.js e gerencia-mensagens.js. O histórico fica aqui até a etapa 5 (Financeiro) decidir o lugar dele.
 * Adaptações da casca: caixas abertos de outros PDVs são fictícios; o histórico mostra "Em fechamento" (o principal rotula
 * como "Fechado"). Dados FICTÍCIOS, em centavos, só em memória.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const { el, botao, campo, entrada, seletor } = U;
  const { moeda } = C;

  const CAMINHO = 'Entradas · Vendas / Faturamento / Lançamentos / VND - Gerência de Caixas';
  const G = window.CicluzCaixaGerencia;

  let tela = null;
  let corpo = null;
  const filtro = { de: '', ate: '', pdv: '', operador: '', turno: '', status: '' };
  let selecionado = null;
  let monSel = null; // caixa aberto escolhido no monitor
  let atualizadoEm = C.hora();

  const corpoSecao = (...nos) => { const c = el('div', 'compras-corpo'); c.append(...nos); return c; };
  const dl = (pares) => {
    const caixa = el('dl', 'caixa-declarado');
    pares.forEach(([t, v]) => { const d = el('div'); d.append(el('dt', null, t), el('dd', null, v)); caixa.append(d); });
    return caixa;
  };
  const iso = (br) => br.split('/').reverse().join('-');

  function abrir() {
    if (!tela) tela = C.criarTela({ id: 'caixa-gerencia', titulo: 'VND - Gerência de Caixas', caminho: CAMINHO });
    tela.ativar();
    atualizadoEm = C.hora();
    montar();
  }
  function montar() {
    tela.body.replaceChildren(
      C.faixaDemo('Demonstração: dados fictícios, nada é gravado. Só a Gerência (caixas_gerenciar) vê o monitor e o histórico.', atualizar, ['operador', 'gerente', 'tesoureiro', 'financeiro']),
      corpo = el('div', 'caixa-corpo')
    );
    atualizar();
  }
  C.aoReiniciar(() => { Object.assign(filtro, { de: '', ate: '', pdv: '', operador: '', turno: '', status: '' }); selecionado = null; monSel = null; if (tela) montar(); });

  /** Todas as linhas do histórico: fechados + o caixa desta sessão (aberto ou em fechamento) + abertos fictícios (vêm do estado único). */
  const linhas = () => C.caixas().map((l) => ({ ...l, status: l.situacao }));
  const abertos = () => linhas().filter((l) => l.status === 'aberto');

  function atualizar() {
    if (!C.pode('historico')) {
      const s = U.secao('Sem permissão');
      s.append(corpoSecao(U.nota('Monitor, envio de recebimento, mensagens e histórico exigem gerenciar caixas (Gerente). Operador, Tesoureiro e Financeiro não têm este acesso. Troque o "Ver como" para Gerente.')));
      return corpo.replaceChildren(s);
    }
    corpo.replaceChildren(blocoMonitor(), ...(monSel && abertos().some((a) => a.id === monSel) ? [painelCaixa()] : []), G.recebimento(atualizar), G.mensagens(atualizar), blocoHistorico(), ...(selecionado ? [detalhe()] : []));
  }

  /* ---------- Monitor de caixas abertos ---------- */

  function blocoMonitor() {
    const ab = abertos();
    const s = U.secao('Caixas abertos agora', ab.length, [botao('Atualizar', () => { atualizadoEm = C.hora(); atualizar(); }, 'btn secondary')]);
    const chips = el('div', 'compras-chips');
    ab.forEach((a) => {
      const b = botao(a.pdv + ' - ' + a.operador + ' (desde ' + a.abertura + ')', () => { monSel = monSel === a.id ? null : a.id; atualizar(); }, 'compras-chip' + (monSel === a.id ? ' ativo' : ''));
      b.setAttribute('aria-pressed', String(monSel === a.id));
      chips.append(b);
    });
    s.append(corpoSecao(...(ab.length ? [chips] : [U.nota('Nenhum caixa aberto.')]), U.nota(ab.length + (ab.length === 1 ? ' caixa aberto' : ' caixas abertos') + ' · Última atualização ' + atualizadoEm + '. Caixas em fechamento não aparecem aqui.')));
    return s;
  }

  /* ---------- Painel do caixa escolhido no monitor ---------- */

  function painelCaixa() {
    const a = abertos().find((x) => x.id === monSel);
    const s = U.secao('Caixa · ' + a.pdv + ' · ' + a.turno + ' · ' + a.operador);
    if (a.sessao) {
      const r = C.resumo();
      const t = C.estado.turno;
      const pend = r.pendentes.reduce((x, p) => x + p.valor, 0);
      s.append(corpoSecao(dl([
        ['Saldo do caixa', moeda(r.saldo)], ['Entradas (vendas do turno)', moeda(r.entradas)],
        ['Recebimentos pendentes', r.pendentes.length ? r.pendentes.length + ' · ' + moeda(pend) : 'Nenhum'],
        ['Sangrias', C.sangriasDoCaixa().length + ' · ' + moeda(r.sangrias)], ['Vendas canceladas', String(t.canceladas.length)],
        ['PDV', t.pdvLigado ? 'Ligado' : 'Desligado desde ' + t.parada.desde],
      ])));
    } else {
      s.append(corpoSecao(dl([['Saldo do caixa', moeda(a.saldo)], ['Entradas (vendas)', moeda(a.entradas)], ['Transferências recebidas', moeda(a.transfEntrada)], ['Sangrias', moeda(a.transfSaida)]]),
        U.nota('Caixa fictício, só para o monitor ter o que mostrar.')));
    }
    return s;
  }

  /* ---------- Histórico de caixas ---------- */

  function blocoHistorico() {
    const todos = linhas();
    const f = todos.filter((l) => (!filtro.pdv || l.pdv === filtro.pdv) && (!filtro.operador || l.operador === filtro.operador) && (!filtro.turno || l.turno === filtro.turno)
      && (!filtro.status || (filtro.status === 'aberto' ? l.status === 'aberto' : l.status !== 'aberto'))
      && (!filtro.de || iso(l.data) >= filtro.de) && (!filtro.ate || iso(l.data) <= filtro.ate));
    const s = U.secao('Histórico de caixas', f.length);
    const g = el('div', 'caixa-grade caixa-filtros');
    const sel = (chave, rotulo, opcoes, vazio) => { const x = seletor(opcoes, filtro[chave], vazio); x.onchange = () => { filtro[chave] = x.value; selecionado = null; atualizar(); }; return campo(rotulo, x); };
    const dt = (chave, rotulo) => { const x = entrada('date', filtro[chave]); x.onchange = () => { filtro[chave] = x.value; selecionado = null; atualizar(); }; return campo(rotulo, x); };
    g.append(dt('de', 'Data inicial'), dt('ate', 'Data final'), sel('pdv', 'PDV', ['PDV 1', 'PDV 2', 'PDV 3', 'PDV 4'], 'Todos'),
      sel('operador', 'Operador', [...new Set(todos.map((l) => l.operador))], 'Todos'), sel('turno', 'Turno', ['Manhã', 'Tarde'], 'Todos'),
      sel('status', 'Status', [['aberto', 'Aberto'], ['fechado', 'Fechado']], 'Todos'));
    const msgDatas = filtro.de && filtro.ate && filtro.de > filtro.ate ? [el('p', 'caixa-pendencias', 'Data inicial não pode ser maior que a final.')] : [];
    s.append(corpoSecao(g, ...msgDatas, botao('Limpar filtros', () => { Object.assign(filtro, { de: '', ate: '', pdv: '', operador: '', turno: '', status: '' }); atualizar(); }, 'btn secondary')));
    const rotulo = { aberto: ['Aberto', 'info'], em_fechamento: ['Em fechamento', 'atencao'], fechado: ['Fechado', 'positivo'] };
    s.append(U.tabela(
      [
        ['Data', (l) => l.data], ['PDV', (l) => l.pdv], ['Operador', (l) => l.operador], ['Turno', (l) => l.turno],
        ['Abertura → Fechamento', (l) => l.abertura + (l.fechamento ? ' → ' + l.fechamento : ' → …')],
        ['Entradas', (l) => moeda(l.entradas), 'caixa-num'], ['Transf. entrada', (l) => moeda(l.transfEntrada), 'caixa-num'], ['Transf. saída', (l) => moeda(l.transfSaida), 'caixa-num'],
        ['Saldo', (l) => moeda(l.saldo), 'caixa-num'],
        ['Status', (l) => U.situacao(rotulo[l.status][0], rotulo[l.status][1])],
      ],
      f,
      { aoClicar: (l) => { selecionado = l.id; atualizar(); }, vazioTexto: 'Nenhum caixa para este filtro.', classeLinha: (l) => (l.id === selecionado ? 'selecionada' : '') }
    ));
    const soma = (k) => f.reduce((t, l) => t + l[k], 0);
    s.append(corpoSecao(dl([['Total do filtro · Entradas', moeda(soma('entradas'))], ['Transf. entrada', moeda(soma('transfEntrada'))], ['Transf. saída', moeda(soma('transfSaida'))], ['Saldo', moeda(soma('saldo'))]]),
      U.nota('Caixa fechado mostra o saldo gravado no fechamento (R$ 0,00, pois o contado volta ao Cofre); caixa aberto mostra o saldo ao vivo.')));
    return s;
  }

  function detalhe() {
    const l = linhas().find((x) => x.id === selecionado);
    if (!l) return el('div');
    const a = C.estado.abertura;
    const s = U.secao('Detalhe · ' + l.pdv + ' · ' + l.turno + ' · ' + l.data);
    const itens = [];
    if (l.status === 'fechado') itens.push(dl([['Fechamento executado por', l.fechadoPor], ['Lacre de fechamento', l.lacreFechamento], ['Supervisor responsável', l.supervisor]]));
    else itens.push(dl([['Responsável', l.sessao ? a.responsavel : l.operador], ['Lacre de abertura', l.sessao ? a.lacre : 'Não registrado'], ['Lacre de fechamento', 'Sem lacre (ainda aberto)']]));
    itens.push(U.nota(l.sessao && a.divergencia ? 'Conferência de abertura (malote): divergente, ' + moeda(a.divergencia) + ' em relação ao declarado. Motivo: ' + a.motivoDivergencia : 'Conferência de abertura do malote: convergente.'));
    if (l.status === 'fechado') itens.push(U.nota('Provas do fechamento: Folha de fechamento ' + l.anexos.folha + ' · Folha CREARE ' + l.anexos.creare + ' · Comprovante de cartão ' + l.anexos.comprovantes + '.'));
    itens.push(U.nota('Alterado após o fechamento: não. Vendas canceladas são auditoria e não entram nos totais.'));
    itens.push(U.nota('A contagem cega, as correções e a conferência da Tesouraria ficam no dossiê da Tesouraria, não aqui.'));
    s.append(corpoSecao(...itens));
    return s;
  }

  C.registrar('gerencia', abrir);
})();
