/*
 * MER - Agenda de Produção (Agenda) e MER - Pedidos de Produção (Saídas · Mercadorias → Lançamentos Produção).
 * "O mesmo fluxo do pedido… a máscara é a mesma… só que um vai para a cotação, o outro vai para o
 * mapa de produção" [33:35]: reaproveita o campo de repetição do Compras; muda a janela de demanda,
 * a entrega (mesmo dia ou dia seguinte) e as quantidades em múltiplos da meia fornada.
 */
(function () {
  'use strict';
  const D = window.CicluzProducaoDominio;
  const S = window.CicluzProducaoDados;
  const SV = window.CicluzProducaoServico;
  const U = window.CicluzComprasUI;
  const CD = window.CicluzComprasDominio;
  const M = window.CicluzProducao;
  const { el, botao, campo, entrada, seletor } = U;
  const amanha = () => CD.isoData(CD.somarDias(new Date(), 1));
  const janelaTxt = (x) => x.janelaDe + '–' + x.janelaAte;
  const un = (produtoId) => { const p = S.produto(produtoId); return p && p.unidade ? p.unidade.toLowerCase() : 'un'; };

  /** Tabela de quantidades: valida o passo e mostra quantos utensílios dá. qtd: { produtoId: valor } */
  function tabelaQuantidades(produtoIds, qtd, { opcional = true } = {}) {
    const box = el('div');
    box.append(U.tabela([
      ['Produto', (id) => {
        const c = S.config(id) || {};
        const s = el('span', 'compras-produto-celula');
        s.append(el('b', null, S.nomeProduto(id)), el('small', null, (c.formato ? 'De ' + D.passo(c.formato) + ' em ' + D.passo(c.formato) + ' ' + un(id) + ' · ' + S.nomeBem(c.formato.utensilioId) : 'Quantidade livre') + (c.comEstoque ? ' · estoque livre ' + CD.numero(SV.estoqueLivre(id)) : '')));
        return s;
      }],
      ['Quantidade', (id) => {
        const c = S.config(id) || {};
        const w = el('span', 'compras-produto-celula');
        const i = entrada('number', qtd[id] ?? '', { min: 0, step: c.formato ? D.passo(c.formato) : 'any', inputMode: 'decimal', placeholder: opcional ? '—' : '0' });
        i.className = 'producao-qtd';
        i.setAttribute('aria-label', 'Quantidade de ' + S.nomeProduto(id));
        const dica = el('small');
        const mostra = () => {
          const v = Number(i.value);
          if (!String(i.value).trim()) { dica.textContent = ''; return; }
          const m = D.validarQuantidade(v, c.formato, un(id));
          dica.textContent = m || (c.formato ? CD.numero(D.utensilios(v, c.formato), 2) + ' × ' + S.nomeBem(c.formato.utensilioId).toLowerCase() : '');
          dica.classList.toggle('producao-erro', Boolean(m));
        };
        i.oninput = () => { qtd[id] = String(i.value).trim() === '' ? null : Number(i.value); mostra(); };
        mostra();
        w.append(i, dica);
        return w;
      }],
    ], produtoIds, { vazioTexto: 'Nenhum produto.' }));
    return box;
  }

  /* =====================================================================
   * Agendamento de pedidos de produção
   * ===================================================================== */
  let telaA = null;
  function abrirAgendamento() {
    if (!telaA) {
      telaA = U.criarTela({ id: 'producao-agendamento', titulo: 'MER - Agenda de Produção', caminho: M.CAMINHO_AGENDA + 'MER - Agenda de Produção', icone: 'agenda', voltar: M.voltarAgenda });
      U.atalho(telaA, 'Novo agendamento', 'M12 5v14M5 12h14', () => formularioAgenda(), { criar: true });
      document.addEventListener('cicluz-producao-mudou', () => { if (telaA.view.classList.contains('show')) renderAgendas(); });
    }
    telaA.ativar();
    renderAgendas();
  }

  function renderAgendas() {
    const ativas = S.producao.dados.agendas.filter((a) => a.status === 'ativa').sort((a, b) => (a.janelaDe + a.inicio).localeCompare(b.janelaDe + b.inicio));
    const topo = el('div', 'profiles-controls');
    topo.append(U.nota('O pedido da loja para a produção, programado: produtos, janela de demanda (ex.: 06:00–08:00) e repetição. Na hora marcada, o pedido aparece em MER - Pedidos de Produção para conferir as quantidades e enviar.'));
    const sec = U.secao('Agendamentos', ativas.length);
    const lista = el('div', 'compras-lista');
    if (!S.produzidos().length) lista.append(U.vazio('Nenhum produto ligado à produção.', 'Ligue os produtos em Saídas · Mercadorias → Cadastros Geral Produção → MER - Produtos da Produção.'));
    else if (!ativas.length) lista.append(U.vazio('Nenhum agendamento.', 'Crie o primeiro com o "+".'));
    ativas.forEach((a) => {
      const box = el('div', 'compras-agenda');
      box.append(U.linhaLista({
        icone: 'agenda', titulo: 'Janela ' + janelaTxt(a) + ' · ' + a.produtoIds.length + ' produto(s)',
        detalhe: CD.resumoRegra(a.regra, a.inicio) + ' às ' + a.hora + ' · entrega ' + (a.entrega === 'seguinte' ? 'no dia seguinte' : 'no mesmo dia') + ' · ' + S.responsavel(a.responsavelId),
        direita: [botao('Editar', () => formularioAgenda(a)), botao('Excluir todas as futuras', () => U.confirmar('Excluir todas as futuras', 'As próximas datas deixam de existir. Pedidos já gerados continuam.', 'Excluir', () => { const r = SV.encerrarAgenda(a.id); if (r.erro) return r.erro; U.avisar('Agendamento encerrado.'); }), 'btn secondary perigo-texto')],
      }));
      const datas = el('div', 'compras-datas');
      datas.append(el('span', 'compras-rotulo', 'Próximos pedidos'));
      const prox = SV.proximasDatas(a);
      if (!prox.length) datas.append(el('small', 'profiles-note', 'Sem próximas datas.'));
      prox.forEach((o) => datas.append(botao(CD.dataCurta(o.data) + ' ' + o.hora, () => acoesData(a, o), 'compras-chip')));
      box.append(datas);
      lista.append(box);
    });
    sec.append(lista);
    telaA.body.replaceChildren(topo, sec);
  }

  function acoesData(a, o) {
    U.dialogo({
      titulo: 'Pedido de ' + CD.dataLonga(o.data) + ' às ' + o.hora,
      subtitulo: 'Janela ' + janelaTxt(a),
      montar: (form) => {
        form.append(el('p', null, 'Exclua só esta data ou gere o pedido agora para testar. As demais datas continuam iguais.'));
        const rod = el('div', 'compras-form-rodape');
        rod.append(
          botao('Excluir só esta data', () => { const r = SV.cancelarData(a.id, o.previsto); form.closest('dialog').close(); U.avisar(r.erro || 'Data excluída.'); }),
          botao('Gerar o pedido agora (simulação)', () => { form.closest('dialog').close(); const n = SV.processarAgendas({ agendaId: a.id, previsto: o.previsto }); U.avisar(n ? 'Pedido gerado: veja em MER - Pedidos de Produção.' : 'Nada gerado.'); }),
        );
        form.append(rod, U.nota('A simulação faz o papel do agendador: cria o pedido como se a hora tivesse chegado.'));
      },
    });
  }

  /** Sem produto ligado à produção não há o que pedir: explica o caminho e leva até o cadastro. */
  function semProdutos() {
    U.confirmar('Nenhum produto ligado à produção',
      'Para pedir à produção, primeiro diga como cada produto é feito: 1) cadastre o produto em Saídas · Mercadorias → Cadastros Geral → MER - Produtos (grupo FAB. PRÓPRIA); 2) ligue-o em Saídas · Mercadorias → Cadastros Geral Produção → MER - Produtos da Produção (assadeira e fornada); 3) crie a ficha técnica dele.',
      'Abrir MER - Produtos da Produção', () => { M.abrir('produtos'); });
  }

  function formularioAgenda(a) {
    const produzidos = S.produzidos().sort((x, y) => x.p.descricao.localeCompare(y.p.descricao, 'pt-BR'));
    if (!produzidos.length && !a) return semProdutos();
    const marcados = new Set(a ? a.produtoIds : []);
    const qtd = { ...(a?.quantidades || {}) };
    U.dialogo({
      titulo: a ? 'Editar agendamento' : 'Novo agendamento', largo: true,
      montar: (form) => {
        const sec = (t) => { const s = el('fieldset', 'compras-fieldset'); s.append(el('legend', null, t)); form.append(s); return s; };
        const s1 = sec('Quando a loja pede');
        const inicio = entrada('date', a?.inicio || amanha(), { min: a ? '' : S.hojeIso() });
        const hora = entrada('time', a?.hora || '18:00');
        s1.append(campo('Primeiro pedido em *', inicio), campo('Hora do pedido *', hora));
        const repeticao = window.CicluzComprasPedido.campoRepeticao(s1, a?.regra || { tipo: 'diaria' }, a?.termino, inicio);
        s1.append(U.nota('Semestral: escolha "Personalizado…", mensal, a cada 6.'));
        let aPartir = null;
        if (a) { aPartir = entrada('date', S.hojeIso() > a.inicio ? S.hojeIso() : a.inicio); s1.append(campo('Mudanças valem a partir de', aPartir)); }
        const s2 = sec('Para quando');
        const de = entrada('time', a?.janelaDe || '06:00');
        const ate = entrada('time', a?.janelaAte || '08:00');
        const entrega = seletor([['seguinte', 'No dia seguinte (pedido na véspera)'], ['mesmo', 'No mesmo dia']], a?.entrega || 'seguinte');
        s2.append(campo('Janela de demanda: de *', de), campo('Até *', ate), campo('Entrega', entrega));
        const s3 = sec('Quem pede');
        const resp = seletor(S.RESPONSAVEIS.map((u) => [u.id, u.nome]), a?.responsavelId || '', 'Selecione');
        s3.append(campo('Responsável pelo pedido *', resp, 'Usuários fictícios: o S2 ainda não tem cadastro de usuários.'));
        const s4 = sec('Produtos');
        s4.classList.add('compras-fieldset-lista');
        const caixa = el('div', 'compras-largo');
        s4.append(U.nota('Marque os produtos. A quantidade é opcional: preenchida, o pedido já nasce com ela (pedido pré-programado); vazia, quem pede informa na hora.'), caixa);
        const desenha = () => {
          caixa.replaceChildren(U.tabela([
            ['', ({ p }) => { const c = entrada('checkbox'); c.checked = marcados.has(p.id); c.setAttribute('aria-label', 'Marcar ' + p.descricao); c.onchange = () => { c.checked ? marcados.add(p.id) : marcados.delete(p.id); desenha(); }; return c; }, 'centro'],
            ['Produto', ({ p, c }) => { const s = el('span', 'compras-produto-celula'); s.append(el('b', null, p.descricao), el('small', null, c.formato ? 'De ' + D.passo(c.formato) + ' em ' + D.passo(c.formato) : 'Quantidade livre')); return s; }],
          ], produzidos, { vazioTexto: 'Nenhum produto ligado à produção.' }));
          const ids = produzidos.filter(({ p }) => marcados.has(p.id)).map(({ p }) => p.id);
          if (ids.length) { caixa.append(el('span', 'compras-rotulo', 'Quantidade pré-programada (opcional)')); caixa.append(tabelaQuantidades(ids, qtd)); }
        };
        desenha();
        return { inicio, hora, repeticao, aPartir, de, ate, entrega, resp };
      },
      salvar: (c) => {
        const quantidades = {};
        [...marcados].forEach((id) => { if (qtd[id] != null) quantidades[id] = qtd[id]; });
        const r = SV.salvarAgenda({ produtoIds: [...marcados], quantidades, inicio: c.inicio.value, hora: c.hora.value, regra: c.repeticao.regra(), termino: c.repeticao.termino(), janelaDe: c.de.value, janelaAte: c.ate.value, entrega: c.entrega.value, responsavelId: c.resp.value }, a, c.aPartir?.value);
        if (r.erro) return r.erro;
        U.avisar('Agendamento salvo.');
      },
    });
  }

  /* =====================================================================
   * Pedidos de produção
   * ===================================================================== */
  let telaP = null;
  function abrirPedidos() {
    if (!telaP) {
      telaP = U.criarTela({ id: 'producao-pedidos', titulo: 'MER - Pedidos de Produção', caminho: M.CAMINHO + 'MER - Pedidos de Produção', icone: 'lista', voltar: M.voltarProducao });
      U.atalho(telaP, 'Pedido extra', 'M12 5v14M5 12h14', () => pedidoExtra(), { criar: true });
      document.addEventListener('cicluz-producao-mudou', () => { if (telaP.view.classList.contains('show')) renderPedidos(); });
    }
    SV.processarAgendas();
    SV.lancarEstoque();
    telaP.ativar();
    renderPedidos();
  }

  const situacaoPedido = (p) => { const [t, tom] = D.SITUACOES_PEDIDO[p.status] || [p.status, 'neutro']; return U.situacao(t, tom); };
  function progresso(p) {
    const ordens = S.producao.dados.ordens.filter((o) => o.pedidoId === p.id && o.status !== 'cancelada');
    const prontas = ordens.filter((o) => D.situacaoOrdem(o) === 'pronta').length;
    return ordens.length ? prontas + ' de ' + ordens.length + ' produto(s) pronto(s)' : '';
  }
  const ordenar = (a, b) => (a.dataEntrega + a.janelaDe).localeCompare(b.dataEntrega + b.janelaDe);

  function renderPedidos() {
    const todos = S.producao.dados.pedidos;
    const intro = U.nota('A loja pede para a produção por janela de demanda. Pedido agendado aparece em "Para fazer"; durante o dia, use o "+" para um pedido extra.');
    const blocos = [intro];
    // Reposição: produto com estoque abaixo do mínimo vira sugestão; alguém aprova e só então vira ordem.
    const sugestoes = SV.sugestoesReposicao();
    if (sugestoes.length) {
      const sec = U.secao('Repor estoque', sugestoes.length);
      const box = el('div', 'compras-lista');
      sugestoes.forEach((x) => box.append(U.linhaLista({
        icone: 'estoque', titulo: S.nomeProduto(x.produtoId),
        detalhe: 'Livre ' + CD.numero(x.livre) + ' · mínimo ' + CD.numero(x.minimo) + (x.maximo != null ? ' · máximo ' + CD.numero(x.maximo) : '') + ' · sugerido produzir ' + CD.numero(x.quantidade) + ' ' + un(x.produtoId),
        direita: botao('Aprovar e produzir', () => aprovarReposicao(x), 'btn'),
      })));
      sec.append(box, U.nota('A sugestão só vira ordem de produção depois de aprovada.'));
      blocos.push(sec);
    }
    const grupos = [
      ['Para fazer', todos.filter((p) => p.status === 'rascunho').sort(ordenar), (p) => botao('Fazer o pedido', () => fazerPedido(p), 'btn')],
      ['Na produção', todos.filter((p) => ['enviado', 'pronto', 'conferencia_loja'].includes(p.status)).sort(ordenar), (p) => botao('Ver', () => verPedido(p))],
      ['Recentes', todos.filter((p) => ['abastecido', 'cancelado'].includes(p.status)).sort((a, b) => ordenar(b, a)).slice(0, 15), (p) => botao('Ver', () => verPedido(p))],
    ];
    grupos.forEach(([titulo, lista, acao], gi) => {
      const sec = U.secao(titulo, lista.length);
      const box = el('div', 'compras-lista');
      if (!lista.length) box.append(U.vazio(gi === 0 ? 'Nada para fazer agora.' : 'Nenhum pedido.', gi === 0 ? 'Pedidos agendados aparecem aqui na hora marcada (para testar: Agendamento → próxima data → "Gerar o pedido agora").' : null));
      lista.forEach((p) => box.append(U.linhaLista({
        icone: p.origem === 'extra' ? 'raio' : 'lista',
        titulo: 'Nº ' + p.numero + ' · ' + CD.dataCurta(p.dataEntrega) + ' · janela ' + janelaTxt(p),
        detalhe: [p.origem === 'extra' ? 'Pedido extra' : 'Agendado', p.itens.length + ' produto(s)', S.responsavel(p.responsavelId), progresso(p)].filter(Boolean).join(' · '),
        direita: [situacaoPedido(p), acao(p)],
      })));
      sec.append(box);
      blocos.push(sec);
    });
    telaP.body.replaceChildren(...blocos);
  }

  function fazerPedido(p) {
    const qtd = Object.fromEntries(p.itens.map((i) => [i.produtoId, i.quantidade]));
    U.dialogo({
      titulo: 'Pedido nº ' + p.numero, subtitulo: 'Entrega ' + CD.dataLonga(p.dataEntrega) + ' · janela ' + janelaTxt(p), largo: true,
      montar: (form) => {
        form.append(tabelaQuantidades(p.itens.map((i) => i.produtoId), qtd), U.nota('Quantidade vazia: o produto não vai neste pedido. Ao enviar, cada produto vira uma ordem de produção com a ficha padrão.'));
        const rod = el('div', 'compras-form-rodape');
        rod.append(botao('Cancelar este pedido', () => { form.closest('dialog').close(); U.confirmar('Cancelar pedido', 'Cancelar o pedido nº ' + p.numero + '?', 'Cancelar pedido', () => { const r = SV.cancelarPedido(p.id); if (r.erro) return r.erro; U.avisar('Pedido cancelado.'); }); }, 'btn secondary perigo-texto'));
        form.append(rod);
      },
      rotuloSalvar: 'Enviar à produção',
      salvar: () => {
        const r = SV.enviarPedido(p.id, p.itens.map((i) => ({ produtoId: i.produtoId, quantidade: qtd[i.produtoId] ?? null })));
        if (r.erro) return r.erro;
        U.avisar('Pedido enviado à produção.');
      },
    });
  }

  function pedidoExtra() {
    const produzidos = S.produzidos().sort((x, y) => x.p.descricao.localeCompare(y.p.descricao, 'pt-BR'));
    if (!produzidos.length) return semProdutos();
    const qtd = {};
    U.dialogo({
      titulo: 'Pedido extra', subtitulo: 'Durante o dia, direto para a produção', largo: true,
      montar: (form) => {
        const sec = (t) => { const s = el('fieldset', 'compras-fieldset'); s.append(el('legend', null, t)); form.append(s); return s; };
        const s1 = sec('Para quando');
        const dia = entrada('date', S.hojeIso(), { min: S.hojeIso() });
        const agora = new Date();
        const hh = (h) => String(Math.min(23, h)).padStart(2, '0') + ':00';
        const de = entrada('time', hh(agora.getHours() + 1));
        const ate = entrada('time', hh(agora.getHours() + 3));
        const resp = seletor(S.RESPONSAVEIS.map((u) => [u.id, u.nome]), '', 'Selecione');
        const obs = entrada('text', '');
        obs.dataset.textoLivre = '';
        s1.append(campo('Dia *', dia), campo('Janela de: *', de), campo('Até *', ate), campo('Quem está pedindo *', resp), campo('Observação', obs));
        const s2 = sec('Produtos');
        s2.classList.add('compras-fieldset-lista');
        const box = el('div', 'compras-largo');
        box.append(tabelaQuantidades(produzidos.map(({ p }) => p.id), qtd));
        s2.append(box);
        return { dia, de, ate, resp, obs };
      },
      rotuloSalvar: 'Enviar à produção',
      salvar: (c) => {
        const itens = Object.entries(qtd).filter(([, v]) => v != null).map(([produtoId, quantidade]) => ({ produtoId, quantidade }));
        const r = SV.pedidoExtra({ dataEntrega: c.dia.value, janelaDe: c.de.value, janelaAte: c.ate.value, itens, responsavelId: c.resp.value, observacao: c.obs.value });
        if (r.erro) return r.erro;
        U.avisar('Pedido extra enviado à produção.');
      },
    });
  }

  function verPedido(p) {
    const ordens = S.producao.dados.ordens.filter((o) => o.pedidoId === p.id);
    U.dialogo({
      titulo: 'Pedido nº ' + p.numero, subtitulo: 'Entrega ' + CD.dataLonga(p.dataEntrega) + ' · janela ' + janelaTxt(p), largo: true,
      montar: (form) => {
        const meta = el('p', 'compras-meta');
        [['Situação', (D.SITUACOES_PEDIDO[p.status] || [p.status])[0]], ['Origem', p.origem === 'extra' ? 'Pedido extra' : 'Agendado'], ['Pedido por', S.responsavel(p.responsavelId)], p.observacao ? ['Obs.', p.observacao] : null]
          .filter(Boolean).forEach(([k, v]) => { const s = el('span'); s.append(k + ' ', el('b', null, v)); meta.append(s); });
        form.append(meta, U.tabela([
          ['Produto', (i) => S.nomeProduto(i.produtoId)],
          ['Pedido', (i) => CD.numero(i.quantidade) + ' ' + un(i.produtoId), 'num'],
          ['Do estoque', (i) => (i.doEstoque ? CD.numero(i.doEstoque) : '—'), 'num'],
          ['Produzir', (i) => CD.numero(i.produzir ?? i.quantidade), 'num'],
          ['Ordem', (i) => { const o = ordens.find((x) => x.produtoId === i.produtoId); if (!o) return '—'; const [t, tom] = D.SITUACOES_ORDEM[D.situacaoOrdem(o)]; return U.situacao('Nº ' + o.numero + ' · ' + t, tom); }],
          ['Real', (i) => (i.real != null ? CD.numero(i.real) : '—'), 'num'],
          ['Sobra', (i) => (i.sobra != null ? CD.numero(i.sobra) : '—'), 'num'],
          ['Descarte', (i) => (i.descarte != null ? CD.numero(i.descarte) : '—'), 'num'],
        ], p.itens));
        if (p.status === 'enviado') {
          const rod = el('div', 'compras-form-rodape');
          rod.append(botao('Abrir no mapa de produção', () => { form.closest('dialog').close(); M.abrir('mapa', p.dataEntrega); }), botao('Cancelar pedido', () => { form.closest('dialog').close(); U.confirmar('Cancelar pedido', 'Cancelar o pedido nº ' + p.numero + '?', 'Cancelar pedido', () => { const r = SV.cancelarPedido(p.id); if (r.erro) return r.erro; U.avisar('Pedido cancelado.'); }); }, 'btn secondary perigo-texto'));
          form.append(rod);
        }
      },
    });
  }

  function aprovarReposicao(x) {
    const qtd = { [x.produtoId]: x.quantidade };
    U.dialogo({
      titulo: 'Repor ' + S.nomeProduto(x.produtoId), subtitulo: 'Livre ' + CD.numero(x.livre) + ' · mínimo ' + CD.numero(x.minimo), largo: true,
      montar: (form) => {
        const dia = entrada('date', S.hojeIso(), { min: S.hojeIso() });
        const agora = new Date();
        const hh = (h) => String(Math.min(23, h)).padStart(2, '0') + ':00';
        const de = entrada('time', hh(agora.getHours() + 1));
        const ate = entrada('time', hh(agora.getHours() + 4));
        const resp = seletor(S.RESPONSAVEIS.map((u) => [u.id, u.nome]), '', 'Selecione');
        form.append(campo('Dia *', dia), campo('Pronto entre: *', de), campo('E *', ate), campo('Aprovado por *', resp), tabelaQuantidades([x.produtoId], qtd, { opcional: false }));
        return { dia, de, ate, resp };
      },
      rotuloSalvar: 'Aprovar e produzir',
      salvar: (c) => {
        const r = SV.aprovarReposicao({ produtoId: x.produtoId, quantidade: qtd[x.produtoId], dataEntrega: c.dia.value, janelaDe: c.de.value, janelaAte: c.ate.value, responsavelId: c.resp.value });
        if (r.erro) return r.erro;
        U.avisar('Reposição aprovada: a ordem está no mapa de produção.');
        renderPedidos();
      },
    });
  }

  M.registrar('agendamento', abrirAgendamento);
  M.registrar('pedidos', abrirPedidos);
  window.CicluzProducaoPedidos = { tabelaQuantidades };
})();
