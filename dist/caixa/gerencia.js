/*
 * Caixa — Gerência (casca): Monitor de caixas abertos + Mensagens + Histórico de caixas com filtros e detalhe.
 * Base no principal: CaixaMonitorAbertos, MensagensAdminPainel/MensagemAdminEnvioDialog, HistoricoCaixasPage, CaixaDetalhe
 * (doc 06 do Caixa-Brain). Regras: exige `caixas_gerenciar` (só a Gerência); o monitor mostra só caixas ABERTOS
 * (não os em fechamento); mensagem sem edição nem exclusão, só "Encerrar"; validade no passado é recusada;
 * o detalhe NÃO mostra contagem cega, correções nem a conferência da Tesouraria (isso é do dossiê).
 * Adaptações da casca: caixas abertos de outros PDVs são fictícios; mensagens aparecem no Turno do PDV 1;
 * o histórico mostra "Em fechamento" (o principal rotula como "Fechado"). Dados FICTÍCIOS, em centavos, só em memória.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const { el, botao, campo, entrada, seletor } = U;
  const { moeda } = C;

  const CAMINHO = 'Entradas · Vendas / Faturamento / Lançamentos / VND - Gerência de Caixas';
  // Caixas abertos de outros PDVs (só para o monitor ter o que mostrar).
  const OUTROS_ABERTOS = [
    { id: 'ab-2', data: new Date().toLocaleDateString('pt-BR'), pdv: 'PDV 2', turno: 'Manhã', operador: 'Bruna Costa', abertura: '06:02', entradas: 214300, transfEntrada: 35000, transfSaida: 0, ficticio: true },
    { id: 'ab-3', data: new Date().toLocaleDateString('pt-BR'), pdv: 'PDV 3', turno: 'Manhã', operador: 'Carlos Henrique', abertura: '06:00', entradas: 188700, transfEntrada: 35000, transfSaida: 20000, ficticio: true },
  ];
  const ALVOS = [['abertos', 'Todos os caixas abertos agora'], ['empresa', 'Toda a empresa'], ['pdvs', 'PDVs específicos'], ['operadores', 'Operadores específicos']];
  const ROTULO_ENTREGA = { entregue: 'Entregue', visualizada: 'Visualizada', fechada_sem_confirmar: 'Fechada sem confirmar', confirmada: 'Confirmada' };

  let tela = null;
  let corpo = null;
  const filtro = { de: '', ate: '', pdv: '', operador: '', turno: '', status: '' };
  let selecionado = null;
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
      C.faixaDemo('Demonstração: dados fictícios, nada é gravado. Só a Gerência (caixas_gerenciar) vê o monitor e o histórico.', atualizar, ['operador', 'gerencia', 'tesouraria']),
      corpo = el('div', 'caixa-corpo')
    );
    atualizar();
  }
  C.aoReiniciar(() => { Object.assign(filtro, { de: '', ate: '', pdv: '', operador: '', turno: '', status: '' }); selecionado = null; if (tela) montar(); });

  /** Todas as linhas do histórico: fechados + o caixa desta sessão (aberto ou em fechamento) + abertos fictícios. */
  function linhas() {
    const e = C.estado;
    const l = e.historico.map((h) => ({ ...h, status: 'fechado', saldo: 0 }));
    if ((e.status === 'aberto' || e.status === 'em_fechamento') && e.abertura) {
      const r = C.resumo();
      l.unshift({ id: 'ab-1', data: new Date().toLocaleDateString('pt-BR'), pdv: e.abertura.pdv, turno: e.abertura.turno, operador: e.abertura.responsavel, abertura: e.abertura.abertoEm,
        fechamento: '', entradas: r.entradas, transfEntrada: e.abertura.valorInicial + r.recebido, transfSaida: r.sangrias, saldo: r.saldo, status: e.status, sessao: true });
    }
    OUTROS_ABERTOS.forEach((o) => l.unshift({ ...o, status: 'aberto', saldo: o.transfEntrada + 98000 - o.transfSaida - 40000, fechamento: '' }));
    return l;
  }
  const abertos = () => linhas().filter((l) => l.status === 'aberto');

  function atualizar() {
    if (!C.pode('historico')) {
      const s = U.secao('Sem permissão');
      s.append(corpoSecao(U.nota('Monitor, mensagens e histórico exigem gerenciar caixas (Gerência). Operador e Tesouraria não têm este acesso. Troque o "Ver como" para Gerência.')));
      return corpo.replaceChildren(s);
    }
    corpo.replaceChildren(blocoMonitor(), blocoMensagens(), blocoHistorico(), ...(selecionado ? [detalhe()] : []));
  }

  /* ---------- Monitor de caixas abertos ---------- */

  function blocoMonitor() {
    const ab = abertos();
    const s = U.secao('Caixas abertos agora', ab.length, [botao('Atualizar', () => { atualizadoEm = C.hora(); atualizar(); }, 'btn secondary')]);
    const chips = el('div', 'compras-chips');
    ab.forEach((a) => {
      const b = botao(a.pdv + ' - ' + a.operador + ' (desde ' + a.abertura + ')', () => { filtro.pdv = a.pdv; filtro.status = 'aberto'; atualizar(); }, 'compras-chip' + (filtro.pdv === a.pdv && filtro.status === 'aberto' ? ' ativo' : ''));
      chips.append(b);
    });
    s.append(corpoSecao(...(ab.length ? [chips] : [U.nota('Nenhum caixa aberto.')]), U.nota(ab.length + (ab.length === 1 ? ' caixa aberto' : ' caixas abertos') + ' · Última atualização ' + atualizadoEm + '. Caixas em fechamento não aparecem aqui.')));
    return s;
  }

  /* ---------- Mensagens ---------- */

  function blocoMensagens() {
    const ms = C.estado.mensagens;
    const s = U.secao('Mensagens para os caixas', ms.length, [botao('Nova mensagem', dialogoMensagem, 'btn')]);
    if (!ms.length) { s.append(corpoSecao(U.nota('Nenhuma mensagem enviada. A Gerência avisa quem está no caixa; quem abrir dentro da validade também recebe.'))); return s; }
    const lista = el('div', 'compras-lista');
    ms.forEach((m) => {
      const cont = {};
      m.entregas.forEach((x) => { cont[x.situacao] = (cont[x.situacao] || 0) + 1; });
      const resumo = m.entregas.length ? Object.entries(cont).map(([k, n]) => n + ' ' + ROTULO_ENTREGA[k].toLowerCase()).join(' · ') : 'nenhum destinatário agora';
      const direita = m.encerrada ? [U.situacao('Encerrada', 'neutro')] : [botao('Encerrar', () => { m.encerrada = true; U.avisar('Mensagem encerrada. Ela para de alcançar quem abrir caixa.'); atualizar(); }, 'btn secondary')];
      lista.append(U.linhaLista({ titulo: m.titulo, detalhe: m.alvo + ' · ' + resumo + (m.validade ? ' · válida até ' + m.validade.replace('T', ' ') : ''), direita }));
    });
    s.append(lista);
    return s;
  }

  function dialogoMensagem() {
    C.dialogo({
      titulo: 'Nova mensagem',
      subtitulo: 'Aviso para os caixas. Não há edição nem exclusão: só encerrar.',
      rotuloSalvar: 'Enviar mensagem',
      largo: true,
      montar: (form) => {
        const titulo = entrada('text', '', { maxLength: 120, placeholder: 'Ex.: Troca de maquininha às 15h' });
        const texto = el('textarea');
        texto.rows = 3;
        texto.maxLength = 2000;
        const validade = entrada('datetime-local', '');
        const ctx = { alvo: 'abertos', pdvs: new Set(), ops: new Set(), titulo, texto, validade };
        const opcoes = el('div', 'caixa-alvos');
        const renderAlvo = () => {
          opcoes.replaceChildren();
          if (ctx.alvo === 'pdvs') ['PDV 1', 'PDV 2', 'PDV 3', 'PDV 4'].forEach((p) => opcoes.append(caixaMarcar(p, ctx.pdvs)));
          if (ctx.alvo === 'operadores') abertos().forEach((a) => opcoes.append(caixaMarcar(a.operador + ' (' + a.pdv + ')', ctx.ops, a.operador)));
        };
        const alvo = U.chips(ALVOS, ctx.alvo, (v) => { ctx.alvo = v; renderAlvo(); });
        form.append(campo('Título', titulo), campo('Mensagem', texto), campo('Validade (opcional)', validade, 'Depois deste horário a mensagem para de alcançar quem abrir caixa.'), el('span', 'compras-rotulo', 'Quem recebe'), alvo, opcoes);
        return ctx;
      },
      salvar: (ctx) => {
        const titulo = ctx.titulo.value.trim();
        const texto = ctx.texto.value.trim();
        if (!titulo) return 'Informe o título da mensagem.';
        if (!texto) return 'Escreva a mensagem.';
        if (ctx.validade.value && new Date(ctx.validade.value).getTime() <= Date.now()) return 'A validade da mensagem precisa estar no futuro.';
        if (ctx.alvo === 'pdvs' && !ctx.pdvs.size) return 'Escolha ao menos um PDV.';
        if (ctx.alvo === 'operadores' && !ctx.ops.size) return 'Escolha ao menos um operador.';
        const ab = abertos();
        let alvos = ab;
        let rotuloAlvo = 'Todos os caixas abertos agora';
        if (ctx.alvo === 'empresa') { alvos = ab; rotuloAlvo = 'Toda a empresa'; }
        if (ctx.alvo === 'pdvs') { alvos = ab.filter((a) => ctx.pdvs.has(a.pdv)); rotuloAlvo = 'PDVs: ' + [...ctx.pdvs].join(', '); }
        if (ctx.alvo === 'operadores') { alvos = ab.filter((a) => ctx.ops.has(a.operador)); rotuloAlvo = 'Operadores: ' + [...ctx.ops].join(', '); }
        C.estado.mensagens.unshift({
          id: 'msg-' + (C.estado.mensagens.length + 1), titulo, corpo: texto, validade: ctx.validade.value, alvo: rotuloAlvo, encerrada: false,
          alvoTipo: ctx.alvo, pdvs: [...ctx.pdvs],
          entregas: alvos.map((a) => ({ operador: a.operador, pdv: a.pdv, situacao: 'entregue' })),
        });
        U.avisar(alvos.length ? 'Mensagem enviada para ' + alvos.length + (alvos.length === 1 ? ' destinatário.' : ' destinatários.') : 'Mensagem criada, mas nenhum destinatário foi alcançado agora. Quem abrir caixa dentro da validade vai receber.');
        atualizar();
      },
    });
  }
  function caixaMarcar(rotulo, conjunto, valor) {
    const v = valor || rotulo;
    const l = el('label', 'compras-interruptor');
    const i = entrada('checkbox', null);
    i.onchange = () => { if (i.checked) conjunto.add(v); else conjunto.delete(v); };
    l.append(i, el('span', null, rotulo));
    return l;
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
