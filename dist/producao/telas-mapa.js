/*
 * Mapa de produção e Abastecimento (Saídas · Mercadorias → Lançamentos Produção).
 * Mapa [34:04]: as etapas das ordens do dia, vistas por horário (janela de demanda), por processo
 * (modelo "por etapa": uma pessoa faz a mesma etapa para todos), por setor (local da etapa) ou por
 * produto (modelo "por produto": uma pessoa faz a ordem de cima a baixo) [35:05]. Iniciar/concluir
 * registra a hora: "isso tudo vai ser cronometrado" [09:28].
 * Abastecimento: saída da produção (real), conferência em 1 ou 2 etapas e o fechamento com sobra e
 * descarte, no lugar das colunas PEDIDO | REAL | SOBRA | DESC. da folha de produção.
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
  const un = (produtoId) => { const p = S.produto(produtoId); return p && p.unidade ? p.unidade.toLowerCase() : 'un'; };
  const horaDe = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  /* =====================================================================
   * Mapa de produção
   * ===================================================================== */
  let telaM = null;
  const estado = { dia: '', visao: 'horario', concluidas: false };

  function abrirMapa(dia) {
    if (!telaM) {
      telaM = U.criarTela({ id: 'producao-mapa', titulo: 'MER - Mapa de Produção', caminho: M.CAMINHO + 'MER - Mapa de Produção', icone: 'mapa', voltar: M.voltarProducao });
      document.addEventListener('cicluz-producao-mudou', () => { if (telaM.view.classList.contains('show')) renderMapa(); });
    }
    estado.dia = typeof dia === 'string' ? dia : estado.dia || S.hojeIso();
    SV.lancarEstoque();
    telaM.ativar();
    renderMapa();
  }

  function tarefasDoDia() {
    const ordens = S.producao.dados.ordens.filter((o) => o.dataEntrega === estado.dia && o.status !== 'cancelada');
    const tarefas = [];
    ordens.forEach((o) => o.etapas.forEach((e, k) => {
      tarefas.push({
        ordem: o, etapa: e, ordemId: o.id, anteriorFeita: k === 0 || Boolean(o.etapas[k - 1].fim),
        produto: S.nomeProduto(o.produtoId), quantidadeTexto: CD.numero(o.quantidade) + ' ' + un(o.produtoId),
        processo: e.processo, setor: e.localId ? S.nomeLocal(e.localId) : '', janela: o.janelaDe + '–' + o.janelaAte, janelaDe: o.janelaDe,
        cargo: [...new Set(e.recursos.map((r) => [r.cargoKey || r.cargoNome ? S.nomeCargo(r.cargoKey, r.cargoNome) : '', D.nomeDe(D.NIVEIS, r.nivel)].filter(Boolean).join(' · ')).filter(Boolean))].join(' + '),
      });
    }));
    return tarefas;
  }

  function cartao(t) {
    const { ordem: o, etapa: e } = t;
    const box = el('article', 'producao-tarefa' + (e.fim ? ' feita' : e.inicio ? ' andando' : ''));
    const cab = el('div', 'producao-tarefa-cab');
    const tit = el('div');
    tit.append(el('b', null, t.produto + ' · ' + t.quantidadeTexto), el('small', null, e.numero + 'ª etapa · ' + D.nomeDe(D.PROCESSOS, e.processo) + (e.parte ? ' · ' + D.nomeDe(D.PARTES, e.parte) : '')));
    cab.append(tit, U.situacao(e.fim ? 'Concluída ' + horaDe(e.fim) : e.inicio ? 'Começou ' + horaDe(e.inicio) : t.anteriorFeita ? 'A fazer' : 'Aguarda a etapa anterior', e.fim ? 'positivo' : e.inicio ? 'info' : t.anteriorFeita ? 'atencao' : 'neutro'));
    const det = [];
    det.push('Ordem nº ' + o.numero + (o.origem === 'reposicao' ? ' (reposição de estoque)' : ''), 'janela ' + t.janela, 'tempo ' + D.minutos(e.tempo) + ' (equipe ' + D.minutos(e.tempoEquipe) + ')');
    const bens = e.recursos.filter((r) => r.patrimonioId).map((r) => S.nomeBem(r.patrimonioId) + (r.lotes > 1 ? ' — ' + r.lotes + ' processos' : ''));
    if (bens.length) det.push([...new Set(bens)].join(', '));
    const niveis = [...new Set(e.recursos.map((r) => [r.cargoKey || r.cargoNome ? S.nomeCargo(r.cargoKey, r.cargoNome) : '', D.nomeDe(D.NIVEIS, r.nivel)].filter(Boolean).join(' · ')).filter(Boolean))];
    if (niveis.length) det.push(niveis.join(', '));
    if (t.setor) det.push(t.setor);
    const p = el('p', 'producao-tarefa-det', det.join(' · '));
    box.append(cab, p);
    if (e.instrucao) box.append(el('p', 'producao-tarefa-instrucao', e.instrucao));
    if (e.numero === o.etapas.length && o.pendenciasEstoque && o.pendenciasEstoque.length) box.append(el('p', 'producao-tarefa-pendencia', 'Baixa de estoque pendente — ' + o.pendenciasEstoque.join('; ') + '. Confira a unidade do ingrediente na ficha.'));
    if (e.ingredientes && e.ingredientes.length) {
      const d = el('details', 'producao-tarefa-ing');
      d.append(el('summary', null, 'Ingredientes (' + e.ingredientes.length + ')'));
      const ul = el('ul');
      e.ingredientes.forEach((x) => ul.append(el('li', null, S.nomeProduto(x.produtoId) + ' — ' + CD.numero(x.quantidade) + ' ' + String(x.unidade || '').toLowerCase())));
      d.append(ul);
      box.append(d);
    }
    const acoes = el('div', 'producao-tarefa-acoes');
    const marcar = (acao, msg) => { const r = SV.marcarEtapa(o.id, e.numero, acao); U.avisar(r.erro || msg); };
    // Etapa que espera a anterior não mostra ação: a etiqueta "Aguarda a etapa anterior" já explica.
    if (!e.fim && t.anteriorFeita) {
      if (!e.inicio) acoes.append(botao('Iniciar', () => marcar('iniciar', 'Etapa iniciada.')));
      acoes.append(botao('Concluir', () => marcar('concluir', 'Etapa concluída.'), 'btn'));
    } else if (e.fim) acoes.append(botao('Desfazer', () => marcar('desfazer', 'Etapa reaberta.')));
    box.append(acoes);
    return box;
  }

  function renderMapa() {
    const todas = tarefasDoDia();
    const topo = el('div', 'profiles-controls');
    const dia = entrada('date', estado.dia);
    dia.setAttribute('aria-label', 'Dia da entrega');
    dia.onchange = () => { estado.dia = dia.value || S.hojeIso(); renderMapa(); };
    const visao = U.chips(D.VISOES, estado.visao, (v) => { estado.visao = v; renderMapa(); });
    visao.setAttribute('aria-label', 'Ver o mapa');
    const conc = el('label', 'compras-interruptor');
    const concI = entrada('checkbox');
    concI.checked = estado.concluidas;
    concI.onchange = () => { estado.concluidas = concI.checked; renderMapa(); };
    conc.append(concI, el('span', null, 'Mostrar concluídas'));
    const campoDia = campo('Dia', dia);
    campoDia.classList.add('producao-campo-dia');
    topo.append(campoDia, visao, conc);
    const ordensDia = new Set(todas.map((t) => t.ordemId));
    const falta = todas.filter((t) => !t.etapa.fim);
    const resumo = U.nota(ordensDia.size ? ordensDia.size + ' ordem(ns) · ' + falta.length + ' etapa(s) por fazer · tempo de equipe restante ' + D.minutos(falta.reduce((s, t) => s + (t.etapa.tempoEquipe || 0), 0)) : 'Nenhuma ordem de produção neste dia. As ordens nascem quando a loja envia um pedido.');
    const vis = estado.concluidas ? todas : todas.filter((t) => !t.etapa.fim);
    const corpo = [topo, resumo];
    D.agrupar(vis, estado.visao).forEach((g) => {
      const sec = U.secao(g.titulo, g.tarefas.length);
      const grade = el('div', 'producao-mapa-grade');
      g.tarefas.sort((a, b) => (a.janela + String(a.ordem.numero).padStart(6, '0') + a.etapa.numero).localeCompare(b.janela + String(b.ordem.numero).padStart(6, '0') + b.etapa.numero)).forEach((t) => grade.append(cartao(t)));
      sec.append(grade);
      corpo.push(sec);
    });
    if (todas.length && !vis.length) corpo.push(U.vazio('Tudo concluído neste dia.', 'Os pedidos prontos estão em Abastecimento.'));
    telaM.body.replaceChildren(...corpo);
  }

  /* =====================================================================
   * Abastecimento
   * ===================================================================== */
  let telaB = null;
  function abrirAbastecimento() {
    if (!telaB) {
      telaB = U.criarTela({ id: 'producao-abastecimento', titulo: 'MER - Abastecimento', caminho: M.CAMINHO + 'MER - Abastecimento', icone: 'entrega', voltar: M.voltarProducao });
      document.addEventListener('cicluz-producao-mudou', () => { if (telaB.view.classList.contains('show')) renderAbastecimento(); });
    }
    telaB.ativar();
    renderAbastecimento();
  }

  const titulo = (p) => 'Nº ' + p.numero + ' · ' + CD.dataCurta(p.dataEntrega) + ' · janela ' + p.janelaDe + '–' + p.janelaAte;
  const nomeConferencia = (p) => D.nomeDe(D.CONFERENCIAS, SV.conferenciaDoPedido(p));

  function renderAbastecimento() {
    const todos = S.producao.dados.pedidos;
    const ord = (a, b) => (a.dataEntrega + a.janelaDe).localeCompare(b.dataEntrega + b.janelaDe);
    const grupos = [
      ['Prontos para abastecer', todos.filter((p) => p.status === 'pronto').sort(ord), (p) => botao('Abastecer', () => abastecer(p), 'btn'), 'Nada pronto agora. Os pedidos aparecem aqui quando todas as etapas são concluídas no mapa.'],
      ['Conferir na loja', todos.filter((p) => p.status === 'conferencia_loja').sort(ord), (p) => botao('Conferir chegada', () => conferirLoja(p), 'btn'), 'Nenhum pedido esperando conferência na loja.'],
      ['Fechar: sobra e descarte', todos.filter((p) => p.status === 'abastecido' && !p.fechadoEm).sort(ord), (p) => botao('Fechar', () => fechar(p), 'btn'), 'Nada para fechar.'],
      ['Fechados', todos.filter((p) => p.fechadoEm).sort((a, b) => ord(b, a)).slice(0, 10), (p) => botao('Ver folha', () => folha(p)), 'Nenhum pedido fechado ainda.'],
    ];
    const corpo = [U.nota('A produção entrega na loja. Com conferência, alguém confere a saída; em 2 etapas, outra pessoa confere a chegada. No fim da janela, registre sobra e descarte: a sobra de produto com estoque volta para o saldo.')];
    grupos.forEach(([t, lista, acao, vazio]) => {
      const sec = U.secao(t, lista.length);
      const box = el('div', 'compras-lista');
      if (!lista.length) box.append(U.vazio(vazio));
      lista.forEach((p) => box.append(U.linhaLista({ icone: 'entrega', titulo: titulo(p), detalhe: p.itens.length + ' produto(s) · ' + nomeConferencia(p), direita: acao(p) })));
      sec.append(box);
      corpo.push(sec);
    });
    telaB.body.replaceChildren(...corpo);
  }

  function dialogoValores({ p, tituloD, rotulo, colunas, salvar, comConferente, conferenteRotulo, itens = p.itens, extra }) {
    const valores = {};
    U.dialogo({
      titulo: tituloD, subtitulo: titulo(p), largo: true, rotuloSalvar: rotulo,
      montar: (form) => {
        let conferente = null;
        if (comConferente) { conferente = seletor(S.RESPONSAVEIS.map((u) => [u.id, u.nome]), '', 'Selecione'); form.append(campo(conferenteRotulo, conferente, nomeConferencia(p) + '.')); }
        if (extra) extra(form);
        form.append(U.tabela([
          ['Produto', (i) => S.nomeProduto(i.produtoId)],
          ['Pedido', (i) => CD.numero(i.quantidade) + ' ' + un(i.produtoId), 'num'],
          ...colunas.map(([rot, chave, inicial]) => [rot, (i) => {
            valores[i.produtoId] = valores[i.produtoId] || {};
            const v0 = inicial(i);
            if (v0 != null) valores[i.produtoId][chave] = v0;
            const inp = entrada('number', v0 ?? '', { min: 0, step: 'any', inputMode: 'decimal' });
            inp.className = 'producao-qtd';
            inp.setAttribute('aria-label', rot + ' de ' + S.nomeProduto(i.produtoId));
            inp.oninput = () => { valores[i.produtoId][chave] = String(inp.value).trim() === '' ? null : Number(inp.value); };
            return inp;
          }]),
        ], itens, { vazioTexto: 'Nenhum produto da curva A neste pedido.' }));
        return { conferente };
      },
      salvar: (c) => salvar(valores, c.conferente && c.conferente.value),
    });
  }

  function abastecer(p) {
    const temConferencia = SV.conferenciaDoPedido(p) !== 'nenhuma';
    let conferirSo = 'todos';
    dialogoValores({
      p, tituloD: 'Abastecer a loja', rotulo: 'Registrar abastecimento', comConferente: temConferencia, conferenteRotulo: 'Conferido por (saída) *',
      extra: temConferencia ? (form) => {
        const box = el('div', 'compras-campo');
        box.append(el('span', 'compras-rotulo', 'Conferir'), U.chips([['todos', 'Todos os produtos'], ['curva', 'Só a curva A']], conferirSo, (v) => { conferirSo = v; }));
        box.append(el('small', 'profiles-note', 'Curva A: os 20% que mais vendem nos últimos 3 meses (a bolinha verde do Compras), até o S2 ter as vendas.'));
        form.append(box);
      } : null,
      colunas: [['Real (foi para a loja)', 'real', (i) => i.quantidade]],
      salvar: (v, conf) => { const reais = Object.fromEntries(p.itens.map((i) => [i.produtoId, (v[i.produtoId] || {}).real])); const r = SV.abastecer(p.id, reais, conf, conferirSo); if (r.erro) return r.erro; U.avisar(r.status === 'conferencia_loja' ? 'Abastecido: falta a conferência na loja.' : 'Abastecimento registrado.'); },
    });
  }
  function conferirLoja(p) {
    dialogoValores({
      p, tituloD: 'Conferir chegada na loja', rotulo: 'Confirmar chegada', comConferente: true, conferenteRotulo: 'Conferido na loja por *', itens: SV.itensAConferir(p),
      colunas: [['Chegou', 'recebido', () => null]],
      salvar: (v, conf) => { const rec = Object.fromEntries(p.itens.map((i) => [i.produtoId, (v[i.produtoId] || {}).recebido])); const r = SV.conferirNaLoja(p.id, rec, conf); if (r.erro) return r.erro; U.avisar('Chegada conferida.'); },
    });
  }
  function fechar(p) {
    dialogoValores({
      p, tituloD: 'Fechar: sobra e descarte', rotulo: 'Fechar pedido',
      colunas: [['Sobra', 'sobra', () => null], ['Descarte', 'descarte', () => null]],
      salvar: (v) => { const r = SV.fecharFolha(p.id, v); if (r.erro) return r.erro; U.avisar('Pedido fechado.'); },
    });
  }
  function folha(p) {
    U.dialogo({
      titulo: 'Folha do pedido nº ' + p.numero, subtitulo: titulo(p), largo: true,
      montar: (form) => {
        form.append(U.tabela([
          ['Produto', (i) => S.nomeProduto(i.produtoId)],
          ['Pedido', (i) => CD.numero(i.quantidade), 'num'],
          ['Real', (i) => CD.numero(i.recebido ?? i.real), 'num'],
          ['Sobra', (i) => CD.numero(i.sobra), 'num'],
          ['Descarte', (i) => CD.numero(i.descarte), 'num'],
        ], p.itens));
        const quem = [p.conferenteId ? 'Saída conferida por ' + S.responsavel(p.conferenteId) : '', p.conferenteLojaId ? 'chegada por ' + S.responsavel(p.conferenteLojaId) : ''].filter(Boolean).join(' · ');
        if (quem) form.append(U.nota(quem + '.'));
      },
    });
  }

  M.registrar('mapa', abrirMapa);
  M.registrar('abastecimento', abrirAbastecimento);
})();
