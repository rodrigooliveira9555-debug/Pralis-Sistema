/*
 * Agendamento de pedidos e Solicitação de compra (S1: /agendamento_pedidos e /solicitacao_compra).
 */
(function () {
  'use strict';
  const D = window.CicluzComprasDominio;
  const S = window.CicluzComprasDados;
  const U = window.CicluzComprasUI;
  const SV = window.CicluzComprasServico;
  const M = window.CicluzCompras;
  const { el, botao, campo, entrada, seletor } = U;
  const CAMINHO = 'Saídas · Mercadorias / CMV / Compras (revisar) / ';
  const horaDe = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const amanha = () => D.isoData(D.somarDias(new Date(), 1));

  /* =====================================================================
   * Agendamento de pedidos
   * ===================================================================== */
  let telaA = null;
  function abrirAgendamento() {
    if (!telaA) {
      telaA = U.criarTela({ id: 'compras-agendamento', titulo: 'MER - Agenda de Pedidos', caminho: 'Agenda · Atividades / MER - Agenda de Pedidos', icone: 'agenda', voltar: () => returnToNavigation() });
      U.atalho(telaA, 'Novo agendamento', 'M12 5v14M5 12h14', () => formularioAgenda(), { criar: true });
    }
    telaA.ativar();
    renderAgendas();
  }

  function renderAgendas() {
    const ativas = S.dados.agendas.filter((a) => a.status === 'ativa').sort((a, b) => a.inicio.localeCompare(b.inicio));
    const topo = el('div', 'profiles-controls');
    topo.append(U.nota('Escolha os produtos, a repetição e o responsável. Na data, ele faz o pedido na Solicitação de compra.'));
    const sec = U.secao('Agendamentos', ativas.length);
    const lista = el('div', 'compras-lista');
    if (!ativas.length) lista.append(U.vazio('Nenhum agendamento.', 'Crie o primeiro com "Novo agendamento".'));
    ativas.forEach((a) => lista.append(cartaoAgenda(a)));
    sec.append(lista);
    telaA.body.replaceChildren(topo, sec);
  }

  function cartaoAgenda(a) {
    const box = el('div', 'compras-agenda');
    const prox = SV.proximasDatas(a);
    const linha = U.linhaLista({
      icone: 'agenda',
      titulo: S.nomeGrupo(a.grupoId, a.subgrupoId),
      detalhe: D.resumoRegra(a.regra, a.inicio) + ' às ' + a.hora + ' · ' + S.responsavel(a.responsavelId) + ' · ' + a.produtoIds.length + ' produto(s)',
      direita: [botao('Editar', () => formularioAgenda(a)), botao('Excluir todas as futuras', () => U.confirmar('Excluir todas as futuras', 'As próximas datas deste agendamento deixam de existir. Pedidos já gerados continuam.', 'Excluir', () => { const r = SV.encerrarAgenda(a.id); if (r.erro) return r.erro; U.avisar('Agendamento encerrado.'); renderAgendas(); }), 'btn secondary perigo-texto')],
    });
    const datas = el('div', 'compras-datas');
    datas.append(el('span', 'compras-rotulo', 'Próximas datas'));
    if (!prox.length) datas.append(el('small', 'profiles-note', 'Sem próximas datas.'));
    prox.forEach((o) => {
      const chip = botao(D.dataCurta(o.data) + ' ' + o.hora + (o.movida ? ' (movida)' : ''), () => acoesData(a, o), 'compras-chip');
      datas.append(chip);
    });
    box.append(linha, datas);
    return box;
  }

  function acoesData(a, o) {
    U.dialogo({
      titulo: 'Pedido de ' + D.dataLonga(o.data) + ' às ' + o.hora,
      subtitulo: S.nomeGrupo(a.grupoId, a.subgrupoId),
      montar: (form) => {
        const data = entrada('date', o.data);
        const hora = entrada('time', o.hora);
        form.append(
          el('p', null, 'Mude só esta data ou exclua só esta data. As demais continuam iguais.'),
          campo('Nova data', data), campo('Nova hora', hora),
          el('div', 'compras-form-rodape'),
        );
        const rodape = form.querySelector('.compras-form-rodape');
        rodape.append(
          botao('Excluir só esta data', () => { const r = SV.cancelarData(a.id, o.previsto); if (r.erro) return U.avisar(r.erro); form.closest('dialog').close(); U.avisar('Data excluída.'); renderAgendas(); }, 'btn secondary'),
          botao('Gerar o pedido agora (simulação)', () => { form.closest('dialog').close(); const n = SV.processarAgendas({ agendaId: a.id, previsto: o.previsto }); U.avisar(n ? 'Pedido gerado: veja em Solicitação de compra.' : 'Nada gerado.'); renderAgendas(); }, 'btn secondary'),
        );
        form.append(U.nota('A simulação faz o papel do agendador do servidor: cria o pedido como se a data tivesse chegado.'));
        return { data, hora };
      },
      rotuloSalvar: 'Salvar só esta',
      salvar: (c) => { const r = SV.moverData(a.id, o.previsto, c.data.value, c.hora.value); if (r.erro) return r.erro; U.avisar('Data alterada.'); renderAgendas(); },
    });
  }

  /** Campo de repetição + término, compartilhado com Conferências. */
  function campoRepeticao(form, regraInicial, terminoInicial, inicioInput) {
    let regra = structuredClone(regraInicial || { tipo: 'nunca' });
    const rep = seletor(D.REPETICOES, regra.tipo);
    const resumo = el('small', 'profiles-note');
    const atualizaResumo = () => { resumo.textContent = regra.tipo === 'personalizada' ? D.resumoRegra(regra, inicioInput.value || S.hojeIso()) : ''; };
    rep.onchange = () => { if (rep.value === 'personalizada') personalizada(); else { regra = { tipo: rep.value }; atualizaResumo(); } };
    function personalizada() {
      const base = regra.personalizada || { frequencia: 'semanal', intervalo: 1, diasSemana: [D.lerData(inicioInput.value || S.hojeIso()).getDay()] };
      U.dialogo({
        titulo: 'Repetição personalizada',
        montar: (f) => {
          const freq = seletor([['diaria', 'Diária'], ['semanal', 'Semanal'], ['mensal', 'Mensal'], ['anual', 'Anual']], base.frequencia);
          const cada = entrada('number', base.intervalo || 1, { min: 1, max: 99 });
          const marcas = el('div', 'compras-chips compras-marcas');
          const sel = { semanal: new Set(base.diasSemana || []), mensal: new Set(base.diasMes || []), anual: new Set(base.meses || []) };
          const desenha = () => {
            marcas.replaceChildren();
            const opcoes = freq.value === 'semanal' ? D.DIAS_SEMANA.map((t, i) => [i, t]) : freq.value === 'mensal' ? Array.from({ length: 31 }, (_, i) => [i + 1, String(i + 1)]) : freq.value === 'anual' ? D.MESES.map((t, i) => [i, t]) : [];
            opcoes.forEach(([v, t]) => {
              const s = sel[freq.value];
              const b = botao(t, () => { s.has(v) ? s.delete(v) : s.add(v); desenha(); }, 'compras-chip' + (s.has(v) ? ' ativo' : ''));
              b.setAttribute('aria-pressed', String(s.has(v)));
              marcas.append(b);
            });
          };
          freq.onchange = desenha; desenha();
          f.append(campo('Frequência', freq), campo('A cada', cada), marcas, U.nota('Segue o padrão de repetição do calendário (RFC 5545). Sem marcação, vale o dia da primeira data.'));
          return { freq, cada, sel };
        },
        salvar: (c) => {
          regra = { tipo: 'personalizada', personalizada: { frequencia: c.freq.value, intervalo: Math.max(1, Number(c.cada.value) || 1), diasSemana: [...c.sel.semanal], diasMes: [...c.sel.mensal], meses: [...c.sel.anual] } };
          rep.value = 'personalizada';
          atualizaResumo();
        },
        aoFechar: () => { if (regra.tipo !== 'personalizada') rep.value = regra.tipo; },
      });
    }
    const term = terminoInicial || { tipo: 'nunca' };
    const tipoTerm = seletor([['nunca', 'Nunca'], ['data', 'Na data'], ['vezes', 'Depois de N vezes']], term.tipo);
    const dataTerm = entrada('date', term.data || '');
    const vezes = entrada('number', term.vezes || 4, { min: 1, max: 999 });
    const mostra = () => { dataTerm.closest('label').style.display = tipoTerm.value === 'data' ? '' : 'none'; vezes.closest('label').style.display = tipoTerm.value === 'vezes' ? '' : 'none'; };
    tipoTerm.onchange = mostra;
    const repCampo = campo('Repetir', rep);
    repCampo.append(resumo);
    form.append(repCampo, campo('Terminar repetição', tipoTerm), campo('Termina em', dataTerm), campo('Quantidade de vezes', vezes));
    mostra(); atualizaResumo();
    return {
      regra: () => regra,
      termino: () => (tipoTerm.value === 'data' ? { tipo: 'data', data: dataTerm.value } : tipoTerm.value === 'vezes' ? { tipo: 'vezes', vezes: Number(vezes.value) || 1 } : { tipo: 'nunca' }),
    };
  }

  function formularioAgenda(a) {
    const grupos = S.gruposMercadoria().filter((g) => g.ativo);
    const marcados = new Set(a ? a.produtoIds : []);
    const filtro = { busca: '', area: '', setor: '', local: '', soMarcados: false };
    U.dialogo({
      titulo: a ? 'Editar agendamento' : 'Novo agendamento',
      largo: true,
      montar: (form) => {
        const sec = (t) => { const s = el('fieldset', 'compras-fieldset'); s.append(el('legend', null, t)); form.append(s); return s; };
        // Pedido
        const s1 = sec('Pedido');
        const grupo = seletor(grupos.map((g) => [g.id, g.nome]), a?.grupoId || '', 'Selecione o grupo');
        const sub = el('select');
        const contador = el('p', 'compras-texto-auto compras-largo');
        const contar = () => { contador.textContent = marcados.size + ' produto(s) marcado(s) na lista abaixo'; };
        const subs = () => { const g = grupos.find((x) => x.id === grupo.value); sub.replaceChildren(new Option('Todos os subgrupos', '')); (g ? g.subgrupos.filter((s) => s.ativo) : []).forEach((s) => sub.add(new Option(s.nome, s.id))); sub.value = a && a.grupoId === grupo.value ? a.subgrupoId || '' : ''; };
        grupo.onchange = () => { subs(); desenhaProdutos(); };
        sub.onchange = desenhaProdutos;
        subs();
        s1.append(campo('Grupo *', grupo), campo('Subgrupo', sub), contador);
        // Quando
        const s2 = sec('Quando');
        const inicio = entrada('date', a?.inicio || amanha(), { min: a ? '' : S.hojeIso() });
        const hora = entrada('time', a?.hora || '08:00');
        s2.append(campo('Primeiro pedido em *', inicio), campo('Hora *', hora));
        const repeticao = campoRepeticao(s2, a?.regra, a?.termino, inicio);
        let aPartir = null;
        if (a) { aPartir = entrada('date', S.hojeIso() > a.inicio ? S.hojeIso() : a.inicio); s2.append(campo('Mudanças valem a partir de', aPartir)); }
        // Responsável
        const s3 = sec('Responsável');
        const resp = seletor(S.RESPONSAVEIS.map((u) => [u.id, u.nome]), a?.responsavelId || '', 'Selecione');
        s3.append(campo('Responsável por executar *', resp, 'Usuários fictícios: o S2 ainda não tem cadastro de usuários.'));
        // Para o fornecedor
        const s4 = sec('Para o fornecedor');
        const prazo = entrada('number', a?.prazoHoras || 24, { min: 1, max: 720 });
        const prazoChips = U.chips([[4, '4h'], [12, '12h'], [24, '1 dia'], [48, '2 dias']], prazo.value, (v) => { prazo.value = v; });
        prazo.oninput = () => prazoChips.atualizar(prazo.value);
        const recIni = entrada('time', a?.recebimentoInicio || '');
        const recFim = entrada('time', a?.recebimentoFim || '');
        let margem = a?.margemPct ?? 10;
        const prazoCampo = campo('Tempo de resposta da cotação (horas)', prazo);
        prazoCampo.append(prazoChips);
        const margemCampo = el('div', 'compras-campo');
        margemCampo.append(el('span', 'compras-rotulo', 'Variação aceita na quantidade'), U.chips([[10, '10%'], [20, '20%'], [30, '30%'], [40, '40%']], margem, (v) => { margem = v; }));
        s4.append(prazoCampo, campo('Recebemos das', recIni), campo('Até', recFim), margemCampo);
        // Produtos
        const s5 = sec('Produtos do agendamento');
        s5.classList.add('compras-fieldset-lista');
        const filtros = el('div', 'profiles-controls compras-largo');
        const busca = U.busca('Buscar produto', (v) => { filtro.busca = v; desenhaProdutos(); });
        const locais = S.locais();
        const fArea = seletor(locais, '', 'Área / setor da loja'); fArea.onchange = () => { filtro.area = fArea.value; desenhaProdutos(); };
        const fSetor = seletor(locais, '', 'Local de estoque'); fSetor.onchange = () => { filtro.setor = fSetor.value; desenhaProdutos(); };
        const fLocal = seletor(locais, '', 'Local de venda'); fLocal.onchange = () => { filtro.local = fLocal.value; desenhaProdutos(); };
        filtros.append(busca, fArea, fSetor, fLocal);
        const acoes = el('div', 'compras-filtros compras-largo');
        const soMarc = el('label', 'compras-interruptor');
        const soMarcInput = entrada('checkbox');
        soMarcInput.onchange = () => { filtro.soMarcados = soMarcInput.checked; desenhaProdutos(); };
        soMarc.append(soMarcInput, el('span', null, 'Só os marcados'));
        const marcarListados = botao('Marcar os listados', () => { listados().forEach((p) => marcados.add(p.id)); desenhaProdutos(); });
        acoes.append(soMarc, marcarListados, U.legendaBolinhas());
        const tabelaBox = el('div', 'compras-largo');
        const aviso = U.nota('O agendamento não tem quantidade: ela é informada pelo responsável no dia do pedido.');
        aviso.classList.add('compras-largo');
        s5.append(aviso, filtros, acoes, tabelaBox);
        const b = S.bolinhas();
        function listados() {
          return S.dados.produtos.filter((p) => p.status === 'ativo' && p.liberadoCompra
            && (!grupo.value || p.grupoId === grupo.value) && (!sub.value || p.subgrupoId === sub.value)
            && (!filtro.area || p.areaEstoque === filtro.area) && (!filtro.setor || p.setorEstoque === filtro.setor) && (!filtro.local || S.locaisDeVenda(p).includes(filtro.local))
            && (!filtro.soMarcados || marcados.has(p.id))
            && U.dobrar(p.descricao + ' ' + (p.codigoInterno || '') + ' ' + (p.codigoBarras || '')).includes(U.dobrar(filtro.busca)));
        }
        function desenhaProdutos() {
          const todos = listados();
          const lista = todos.slice(0, 300);
          tabelaBox.replaceChildren(U.tabela([
            ['', (p) => { const c = entrada('checkbox'); c.checked = marcados.has(p.id); c.setAttribute('aria-label', 'Marcar ' + p.descricao); c.onchange = () => { c.checked ? marcados.add(p.id) : marcados.delete(p.id); contar(); }; return c; }, 'centro'],
            ['Produto', (p) => { const s = el('span', 'compras-produto-celula'); s.append(el('b', null, p.descricao), U.bolinhasDe(p.id, b)); return s; }],
            ['Saldo', (p) => D.numero(p.saldo) + ' ' + (p.unidade || ''), 'num'],
            ['Mín · Máx', (p) => (p.estoqueMin ?? '—') + ' · ' + (p.estoqueMax ?? '—'), 'num'],
          ], lista, { vazioTexto: grupo.value ? 'Nenhum produto liberado para compra neste recorte.' : 'Escolha o grupo para ver os produtos.' }));
          if (todos.length > 300) tabelaBox.append(U.nota('Mostrando 300 de ' + todos.length + '. Use os filtros para achar os demais.'));
          contar();
        }
        desenhaProdutos();
        return { grupo, sub, inicio, hora, repeticao, aPartir, resp, prazo, recIni, recFim, margem: () => margem };
      },
      salvar: (c) => {
        const dados = {
          grupoId: c.grupo.value, subgrupoId: c.sub.value, produtoIds: [...marcados], inicio: c.inicio.value, hora: c.hora.value,
          regra: c.repeticao.regra(), termino: c.repeticao.termino(), responsavelId: c.resp.value,
          prazoHoras: Number(c.prazo.value), recebimentoInicio: c.recIni.value, recebimentoFim: c.recFim.value, margemPct: Number(c.margem()),
        };
        const r = SV.salvarAgenda(dados, a, c.aPartir?.value);
        if (r.erro) return r.erro;
        U.avisar('Agendamento salvo.');
        renderAgendas();
      },
    });
  }

  /* =====================================================================
   * Solicitação de compra
   * ===================================================================== */
  let telaS = null;
  function abrirSolicitacao() {
    if (!telaS) telaS = U.criarTela({ id: 'compras-solicitacao', titulo: 'Solicitação de compra', caminho: CAMINHO + 'Solicitação de compra', icone: 'lista', voltar: M.voltarCompras });
    SV.processarAgendas();
    telaS.ativar();
    renderSolicitacao();
  }

  function renderSolicitacao() {
    const pend = S.dados.ocorrencias.filter((o) => o.situacao === 'aguardando_conferencia').sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
    const agendas = S.dados.agendas.filter((a) => a.status === 'ativa' && !pend.some((o) => o.agendaId === a.id));
    const intro = U.nota('Os pedidos agendados que você executa. Na data, faça o pedido: ponha as quantidades e envie aos fornecedores.');
    const s1 = U.secao('Para enviar', pend.length);
    const l1 = el('div', 'compras-lista');
    if (!pend.length) l1.append(U.vazio('Nada esperando você agora.', 'Para testar, gere um pedido em Agendamento de pedidos → próxima data → "Gerar o pedido agora".'));
    pend.forEach((o) => {
      const a = S.dados.agendas.find((x) => x.id === o.agendaId);
      l1.append(U.linhaLista({ icone: 'compras', titulo: S.nomeGrupo(a.grupoId, a.subgrupoId), detalhe: 'Pedido de ' + D.dataCurta(o.data) + ' ' + o.hora + ' · ' + a.produtoIds.length + ' produto(s) · ' + S.responsavel(a.responsavelId), direita: botao('Fazer o pedido', () => fazerPedido(o), 'btn') }));
    });
    s1.append(l1);
    const s2 = U.secao('Agendados', agendas.length);
    const l2 = el('div', 'compras-lista');
    if (!agendas.length) l2.append(U.vazio('Nenhum agendamento sem pedido pendente.'));
    agendas.forEach((a) => {
      const prox = SV.proximasDatas(a, 1)[0];
      l2.append(U.linhaLista({ icone: 'agenda', titulo: S.nomeGrupo(a.grupoId, a.subgrupoId), detalhe: a.produtoIds.length + ' produto(s) · ' + D.resumoRegra(a.regra, a.inicio) + ' · ' + S.responsavel(a.responsavelId), direita: el('small', 'profiles-note', prox ? 'Próximo ' + D.dataCurta(prox.data) + ' ' + prox.hora : 'Sem próximas datas') }));
    });
    s2.append(l2);
    telaS.body.replaceChildren(intro, s1, s2);
  }

  function fazerPedido(o) {
    const a = S.dados.agendas.find((x) => x.id === o.agendaId);
    const b = S.bolinhas();
    const produtos = a.produtoIds.map(S.produto).filter((p) => p && p.liberadoCompra && p.status === 'ativo');
    const qtd = {};
    const escolha = {};
    let busca = '';
    U.dialogo({
      titulo: S.nomeGrupo(a.grupoId, a.subgrupoId),
      largo: true,
      montar: (form) => {
        const meta = el('p', 'compras-meta');
        [['Pedido de', D.dataCurta(o.data) + ' ' + o.hora], ['Resposta em', a.prazoHoras + ' h'], ['Variação aceita', a.margemPct + '%'], a.recebimentoInicio ? ['Recebemos das', a.recebimentoInicio + ' às ' + a.recebimentoFim] : null].filter(Boolean)
          .forEach(([k, v]) => { const s = el('span'); s.append(k + ' ', el('b', null, v)); meta.append(s); });
        const topo = el('div', 'compras-linha-info');
        topo.append(U.busca('Buscar produto', (v) => { busca = v; desenha(); }), U.legendaBolinhas());
        const box = el('div');
        form.append(meta, topo, box, U.nota('Quantidade vazia: o produto não vai neste pedido. Cada fornecedor recebe só os produtos dele.'));
        function desenha() {
          const lista = produtos.filter((p) => U.dobrar(p.descricao).includes(U.dobrar(busca)));
          box.replaceChildren(U.tabela([
            ['Produto', (p) => { const s = el('span', 'compras-produto-celula'); s.append(el('b', null, p.descricao), U.bolinhasDe(p.id, b), el('small', null, 'Estoque ' + D.numero(p.saldo) + ' · máx. ' + (p.estoqueMax ?? '—') + ' ' + (p.unidade || ''))); return s; }],
            ['Quantidade', (p) => { const i = entrada('text', qtd[p.id] ?? '', { inputMode: 'decimal', placeholder: '—' }); i.style.maxWidth = '110px'; i.setAttribute('aria-label', 'Quantidade de ' + p.descricao); i.oninput = () => { qtd[p.id] = i.value; }; return i; }],
            ['Vai para', (p) => {
              const fs = SV.fornecedoresConvidaveis(p.id);
              if (fs.length) return el('span', 'compras-vai-para', fs.map((f) => f.nome).join(', '));
              const indisponiveis = S.fornecedoresDoProduto(p.id).filter((f) => !D.podeConvidar(f));
              const s = el('select');
              s.add(new Option('Escolha o fornecedor', ''));
              S.dados.fornecedores.slice().sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR')).forEach((f) => { const op = new Option(f.nome + (D.podeConvidar(f) ? '' : ' — ' + D.motivoNaoConvidavel(f)), f.id); op.disabled = !D.podeConvidar(f); s.add(op); });
              s.value = escolha[p.id] || '';
              s.onchange = () => { escolha[p.id] = s.value; };
              const w = el('span', 'compras-produto-celula');
              w.append(s);
              if (indisponiveis.length) w.append(el('small', null, 'Indisponível: ' + indisponiveis.map((f) => f.nome + ' (' + D.motivoNaoConvidavel(f) + ')').join(', ')));
              return w;
            }],
          ], lista, { vazioTexto: 'Nenhum produto.' }));
        }
        desenha();
      },
      rotuloSalvar: 'Enviar aos fornecedores',
      salvar: () => {
        const itens = produtos.filter((p) => String(qtd[p.id] ?? '').trim()).map((p) => ({ produtoId: p.id, quantidade: D.lerNumero(qtd[p.id]), fornecedorId: escolha[p.id] || '' }));
        const r = SV.enviarSolicitacao(o.id, itens);
        if (r.erro) return r.erro;
        renderSolicitacao();
        setTimeout(() => window.CicluzComprasCotacao.mostrarConvites(r.rodadaId), 50);
      },
    });
  }

  M.registrar('agendamento', abrirAgendamento);
  M.registrar('solicitacao', abrirSolicitacao);
  window.CicluzComprasPedido = { campoRepeticao };
})();
