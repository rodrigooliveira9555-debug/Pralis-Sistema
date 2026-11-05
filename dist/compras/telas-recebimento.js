/*
 * Pedidos a receber (S1: /pedidos_finalizados) e Estoques de produtos (S1: /estoque_produtos).
 * O recebimento conferido é a entrada de estoque da compra; o outro movimento é o ajuste de conferência aprovada.
 */
(function () {
  'use strict';
  const D = window.CicluzComprasDominio;
  const S = window.CicluzComprasDados;
  const U = window.CicluzComprasUI;
  const SV = window.CicluzComprasServico;
  const M = window.CicluzCompras;
  const { el, botao, campo, entrada, seletor } = U;
  const CAMINHO = 'Saídas · Mercadorias / CMV / Compras / ';
  const dataHora = (iso) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  const ORIGEM = { agendamento: 'Agendamento', rapida: 'Pedido urgente' };

  /* =====================================================================
   * Pedidos a receber
   * ===================================================================== */
  let telaP = null;
  let aba = 'caminho';
  let filtroForn = '';
  function abrirPedidos() {
    if (!telaP) telaP = U.criarTela({ id: 'compras-pedidos', titulo: 'Pedidos a receber', caminho: CAMINHO + 'Pedidos a receber', icone: 'caminhao', voltar: M.voltarCompras });
    telaP.ativar();
    renderPedidos();
  }
  function renderPedidos() {
    const grupos = {
      caminho: S.dados.pedidos.filter((p) => p.status === 'confirmado' || p.status === 'recebido_parcial'),
      recebidos: S.dados.pedidos.filter((p) => p.status === 'recebido'),
      cancelados: S.dados.pedidos.filter((p) => p.status === 'cancelado'),
    };
    const abas = U.chips([['caminho', 'A caminho (' + grupos.caminho.length + ')'], ['recebidos', 'Recebidos (' + grupos.recebidos.length + ')'], ['cancelados', 'Cancelados (' + grupos.cancelados.length + ')']], aba, (v) => { aba = v; renderPedidos(); });
    abas.classList.add('compras-abas');
    const fornecedores = [...new Set(S.dados.pedidos.map((p) => p.fornecedorId))].map(S.fornecedor).filter(Boolean);
    const sf = seletor(fornecedores.map((f) => [f.id, f.nome]), filtroForn, 'Todos os fornecedores');
    sf.onchange = () => { filtroForn = sf.value; renderPedidos(); };
    const topo = el('div', 'profiles-controls');
    topo.append(abas, campo('Fornecedor', sf));
    const lista = grupos[aba].filter((p) => !filtroForn || p.fornecedorId === filtroForn).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
    const sec = U.secao(aba === 'caminho' ? 'A caminho' : aba === 'recebidos' ? 'Recebidos' : 'Cancelados', lista.length);
    const l = el('div', 'compras-lista');
    if (!lista.length) l.append(U.vazio(aba === 'caminho' ? 'Nada a caminho.' : 'Nada por aqui.', aba === 'caminho' ? 'O que for comprado na cotação aparece aqui para receber.' : ''));
    lista.forEach((p) => {
      const [txt, tom] = D.SITUACOES_PEDIDO[p.status];
      l.append(U.linhaLista({ icone: 'caminhao', titulo: (S.fornecedor(p.fornecedorId)?.nome || 'Pedido histórico') + ' · nº ' + p.numero, detalhe: p.itens.length + ' item(ns) · ' + (ORIGEM[p.origem] || 'Compra') + ' · comprado em ' + dataHora(p.criadoEm), direita: U.situacao(txt, tom), aoClicar: () => detalhe(p.id) }));
    });
    sec.append(l);
    telaP.body.replaceChildren(U.nota('O que já foi comprado e vai chegar, e o que já chegou. O recebimento é feito aqui.'), topo, sec);
  }

  function detalhe(id) {
    const p = S.dados.pedidos.find((x) => x.id === id);
    const etapas = [['confirmado', 'Comprado'], ['recebido_parcial', 'Recebido parcialmente'], ['recebido', 'Recebido']];
    const idx = etapas.findIndex((e) => e[0] === p.status);
    const temDev = p.itens.some((i) => i.devolvida > 0);
    U.dialogo({
      titulo: S.fornecedor(p.fornecedorId)?.nome || 'Pedido',
      subtitulo: 'Pedido nº ' + p.numero + ' · ' + (ORIGEM[p.origem] || 'Compra'),
      largo: true,
      montar: (form) => {
        if (p.status !== 'cancelado') {
          const trilha = el('ol', 'compras-trilha');
          etapas.forEach(([, t], i) => trilha.append(el('li', i < idx ? 'feito' : i === idx ? 'atual' : '', t)));
          form.append(trilha);
        } else form.append(U.situacao('Cancelado', 'negativo'));
        const cols = [
          ['Produto', (i) => S.produto(i.produtoId)?.descricao || '—'],
          ['Custo', (i) => D.moeda(i.custo), 'num'],
          ['Pedido', (i) => D.numero(i.pedida), 'num'],
          ['Recebido', (i) => D.numero(i.recebida), 'num'],
        ];
        if (temDev) cols.push(['Devolvido', (i) => D.numero(i.devolvida), 'num']);
        cols.push(['Falta', (i) => D.numero(i.pendente), 'num']);
        form.append(U.tabela(cols, p.itens));
        const hist = el('section', 'compras-bloco');
        hist.append(el('h4', null, 'Histórico'));
        p.eventos.slice().reverse().forEach((e) => hist.append(el('p', 'compras-meta', dataHora(e.em) + ' · ' + (D.SITUACOES_PEDIDO[e.status]?.[0] || e.status) + ' · ' + e.quem + (e.obs ? ' — ' + e.obs : ''))));
        form.append(hist);
        const acoes = el('div', 'compras-form-rodape');
        if (p.status === 'confirmado' || p.status === 'recebido_parcial') {
          acoes.append(
            botao('Cancelar pedido', () => U.confirmar('Cancelar pedido', 'O pedido sai de "A caminho". O que já foi recebido continua no estoque.', 'Cancelar pedido', () => { const r = SV.cancelarPedido(p.id); if (r.erro) return r.erro; document.querySelectorAll('.compras-dialog[open]').forEach((d) => d.close()); U.avisar('Pedido cancelado.'); renderPedidos(); })),
            botao('Conferir recebimento', () => { form.closest('dialog').close(); conferir(p.id); }, 'btn'),
          );
        }
        form.append(acoes);
      },
    });
  }

  function conferir(id) {
    const p = S.dados.pedidos.find((x) => x.id === id);
    const pend = p.itens.filter((i) => i.pendente > 0);
    const ent = {};
    pend.forEach((i) => { ent[i.id] = { recebido: '', devolvido: '', motivo: '' }; });
    U.dialogo({
      titulo: 'Conferir recebimento',
      subtitulo: (S.fornecedor(p.fornecedorId)?.nome || '') + ' · pedido nº ' + p.numero,
      largo: true,
      montar: (form) => {
        const resumo = el('p', 'compras-meta');
        const inputs = {};
        const atualiza = () => {
          let entra = 0, dev = 0;
          pend.forEach((i) => { entra += D.lerNumero(ent[i.id].recebido) || 0; dev += D.lerNumero(ent[i.id].devolvido) || 0; });
          resumo.replaceChildren(U.situacao('+' + D.numero(entra) + ' no estoque', 'positivo'), U.situacao(D.numero(dev) + ' devolvido', dev ? 'atencao' : 'neutro'));
        };
        const atalhos = el('div', 'compras-form-rodape');
        atalhos.append(
          botao('Recebi tudo', () => { pend.forEach((i) => { ent[i.id].recebido = String(i.pendente); ent[i.id].devolvido = ''; inputs[i.id].r.value = String(i.pendente).replace('.', ','); inputs[i.id].d.value = ''; }); atualiza(); }),
          botao('Zerar', () => { pend.forEach((i) => { ent[i.id] = { recebido: '', devolvido: '', motivo: '' }; inputs[i.id].r.value = inputs[i.id].d.value = inputs[i.id].m.value = ''; }); atualiza(); }),
        );
        const tab = U.tabela([
          ['Produto', (i) => { const s = el('span', 'compras-produto-celula'); s.append(el('b', null, S.produto(i.produtoId).descricao), el('small', null, 'Pedido ' + D.numero(i.pedida) + ' · já recebido ' + D.numero(i.recebida))); return s; }],
          ['Falta', (i) => D.numero(i.pendente), 'num'],
          ['Recebido', (i) => { const x = entrada('text', '', { inputMode: 'decimal', placeholder: '0' }); x.style.maxWidth = '100px'; x.setAttribute('aria-label', 'Recebido de ' + S.produto(i.produtoId).descricao); x.oninput = () => { ent[i.id].recebido = x.value; atualiza(); }; (inputs[i.id] = inputs[i.id] || {}).r = x; return x; }],
          ['Devolvido', (i) => { const x = entrada('text', '', { inputMode: 'decimal', placeholder: '0' }); x.style.maxWidth = '100px'; x.setAttribute('aria-label', 'Devolvido de ' + S.produto(i.produtoId).descricao); x.oninput = () => { ent[i.id].devolvido = x.value; atualiza(); }; inputs[i.id].d = x; return x; }],
          ['Motivo da devolução', (i) => { const x = entrada('text', '', { placeholder: 'Se devolveu' }); x.setAttribute('aria-label', 'Motivo da devolução de ' + S.produto(i.produtoId).descricao); x.oninput = () => { ent[i.id].motivo = x.value; }; inputs[i.id].m = x; return x; }],
        ], pend);
        const obs = el('textarea'); obs.rows = 2;
        form.append(atalhos, tab, campo('Observação da conferência', obs), resumo, U.nota('Item com devolução fecha. O que entra vai para o estoque com registro no extrato.'));
        atualiza();
        return { obs };
      },
      rotuloSalvar: 'Confirmar recebimento',
      salvar: (c) => {
        const entrada2 = {};
        pend.forEach((i) => { entrada2[i.id] = { recebido: D.lerNumero(ent[i.id].recebido) || 0, devolvido: D.lerNumero(ent[i.id].devolvido) || 0, motivo: ent[i.id].motivo }; });
        const r = SV.receberPedido(p.id, entrada2, c.obs.value);
        if (r.erro) return r.erro;
        U.avisar(r.status === 'recebido' ? 'Pedido recebido. Estoque atualizado.' : 'Recebimento parcial registrado.');
        renderPedidos();
      },
    });
  }

  /* =====================================================================
   * Estoques de produtos
   * ===================================================================== */
  let telaE = null;
  const fe = { busca: '', grupo: '', area: '', local: '', setor: '', indicador: '' };
  function abrirEstoque() {
    if (!telaE) {
      telaE = U.criarTela({ id: 'compras-estoque', titulo: 'Estoques de produtos', caminho: CAMINHO + 'Estoques de produtos', icone: 'estoque', voltar: M.voltarCompras });
    }
    telaE.ativar();
    renderEstoque();
  }
  function renderEstoque() {
    const base = S.dados.produtos.filter((p) => p.status === 'ativo');
    const sit = (p) => D.situacaoEstoque(p.saldo, p.estoqueMin, p.estoqueMax);
    const ind = [
      ['', 'Produtos na lista', base.length],
      ['no_minimo', 'No mínimo', base.filter((p) => sit(p) === 'no_minimo').length],
      ['completar', 'Dá para completar até o máximo', base.filter((p) => p.estoqueMax != null && Number(p.saldo) < Number(p.estoqueMax)).length],
      ['sem_faixa', 'Sem mínimo e máximo', base.filter((p) => sit(p) === 'sem_faixa').length],
    ];
    const faixa = el('div', 'compras-indicadores');
    ind.forEach(([k, t, n]) => { const b = el('button', 'compras-indicador' + (fe.indicador === k ? ' ativo' : '')); b.type = 'button'; b.setAttribute('aria-pressed', String(fe.indicador === k)); b.append(el('b', null, String(n)), el('small', null, t)); b.onclick = () => { fe.indicador = k; renderEstoque(); }; faixa.append(b); });
    const lista = base.filter((p) => {
      if (fe.indicador === 'completar' && !(p.estoqueMax != null && Number(p.saldo) < Number(p.estoqueMax))) return false;
      if (fe.indicador && fe.indicador !== 'completar' && sit(p) !== fe.indicador) return false;
      if (fe.grupo && p.grupoId !== fe.grupo) return false;
      if (fe.area && p.areaEstoque !== fe.area) return false;
      if (fe.local && !S.locaisDeVenda(p).includes(fe.local)) return false;
      if (fe.setor && p.setorEstoque !== fe.setor) return false;
      return U.dobrar(p.descricao + ' ' + S.nomeGrupo(p.grupoId, p.subgrupoId)).includes(U.dobrar(fe.busca));
    }).sort((a, b) => a.descricao.localeCompare(b.descricao, 'pt-BR'));
    const filtros = el('div', 'profiles-controls');
    const bx = U.busca('Produto ou grupo', (v) => { fe.busca = v; renderEstoque(); setTimeout(() => telaE.body.querySelector('.compras-busca')?.focus(), 0); });
    bx.value = fe.busca;
    const locais = S.locais();
    const mk = (rot, opcoes, chave, vazio) => { const s = seletor(opcoes, fe[chave], vazio); s.onchange = () => { fe[chave] = s.value; renderEstoque(); }; return campo(rot, s); };
    filtros.append(bx,
      mk('Grupo', S.gruposMercadoria().map((g) => [g.id, g.nome]), 'grupo', 'Todos'),
      mk('Área', locais, 'area', 'Todas'), mk('Local de estoque', locais, 'setor', 'Todos'), mk('Local de venda', locais, 'local', 'Todos'),
      botao('Limpar filtros', () => { Object.keys(fe).forEach((k) => { fe[k] = ''; }); renderEstoque(); }),
      botao('Extrato completo', () => extrato(), 'btn'));
    const tab = U.tabela([
      ['Produto', (p) => { const s = el('span', 'compras-produto-celula'); s.append(el('b', null, p.descricao), el('small', null, S.nomeGrupo(p.grupoId, p.subgrupoId))); return s; }],
      ['Onde fica', (p) => [p.areaEstoque, p.setorEstoque].filter(Boolean).join(' › ') || '—'],
      ['Saldo', (p) => D.numero(p.saldo) + ' ' + (p.unidade || ''), 'num'],
      ['Mín. / máx.', (p) => (p.estoqueMin ?? '—') + ' / ' + (p.estoqueMax ?? '—'), 'num'],
      ['Situação', (p) => { const [t, tom] = D.SITUACOES_ESTOQUE[sit(p)]; return U.situacao(t, tom); }],
      ['', (p) => botao('Extrato', () => extrato(p.id))],
    ], lista, { vazioTexto: 'Nenhum produto com esses filtros.' });
    telaE.body.replaceChildren(U.nota('Saldo por produto. Só o recebimento conferido altera o saldo; produto no mínimo pede revisão do comprador.'), faixa, filtros, tab);
  }
  function origem(m) {
    if (m.tipo === 'ajuste_conferencia') {
      const c = S.dados.conferencias.find((x) => x.id === m.conferenciaId);
      return 'ajuste da conferência' + (c ? ' de ' + D.dataLonga(c.data) : '') + (m.motivo ? ' (' + m.motivo + ')' : '');
    }
    return 'pedido nº ' + (S.dados.pedidos.find((p) => p.id === m.pedidoId)?.numero || '—');
  }
  function extrato(produtoId) {
    const f = { produto: produtoId || '', de: '', ate: '' };
    U.dialogo({
      titulo: 'Extrato auditável de estoque',
      largo: true,
      montar: (form) => {
        const sp = seletor(S.dados.produtos.map((p) => [p.id, p.descricao]), f.produto, 'Todos os produtos');
        const de = entrada('date'); const ate = entrada('date');
        const box = el('div');
        const filtros = el('div', 'profiles-controls');
        const desenha = () => {
          const movs = S.dados.movimentos.filter((m) => (!f.produto || m.produtoId === f.produto) && (!f.de || m.em.slice(0, 10) >= f.de) && (!f.ate || m.em.slice(0, 10) <= f.ate)).sort((a, b) => b.em.localeCompare(a.em));
          box.replaceChildren(U.tabela([
            ['Quando', (m) => dataHora(m.em)],
            ['Produto / origem', (m) => (S.produto(m.produtoId)?.descricao || '—') + ' · ' + origem(m)],
            ['Conferente', (m) => (m.aprovadorId ? m.conferente + ' · aprovou ' + S.responsavel(m.aprovadorId) : m.conferente)],
            ['Quantidade', (m) => (m.entrada > 0 ? '+' : '') + D.numero(m.entrada), 'num'],
            ['Saldo anterior', (m) => D.numero(m.saldoAnterior), 'num'],
            ['Saldo posterior', (m) => D.numero(m.saldoPosterior), 'num'],
          ], movs, { vazioTexto: 'Nenhum movimento. Aparecem aqui os recebimentos conferidos e os ajustes de conferências aprovadas.' }));
        };
        filtros.append(campo('Produto', sp), campo('De', de), campo('Até', ate), botao('Filtrar', () => { f.produto = sp.value; f.de = de.value; f.ate = ate.value; desenha(); }, 'btn'));
        form.append(filtros, box, U.nota('Movimentos: entrada por recebimento de compra e ajuste por conferência aprovada (só no S2). Saída e perda ainda não existem.'));
        desenha();
      },
    });
  }

  M.registrar('pedidos', abrirPedidos);
  M.registrar('estoque', abrirEstoque);
})();
