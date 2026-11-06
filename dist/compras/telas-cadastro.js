/*
 * Cadastro de compras (S1: /cadastro_compras): quem vende o quê, o que já foi comprado
 * e o preço de referência (preço-base) de cada produto.
 */
(function () {
  'use strict';
  const D = window.CicluzComprasDominio;
  const S = window.CicluzComprasDados;
  const U = window.CicluzComprasUI;
  const SV = window.CicluzComprasServico;
  const M = window.CicluzCompras;
  const { el, botao, campo, entrada, seletor } = U;
  const CAMINHO = 'Saídas · Mercadorias / Cadastros Geral / ';
  const STATUS = { pendente: ['Pendente', 'atencao'], aprovado: ['Aprovado', 'positivo'], rejeitado: ['Rejeitado', 'negativo'] };

  let tela = null;
  let aba = 'catalogo';
  const fc = { situacao: '', busca: '', fornecedor: '', origem: '' };
  const fh = { meses: 3, busca: '' };

  function abrir() {
    if (!tela) tela = U.criarTela({ id: 'compras-cadastro', titulo: 'MER - Catálogo e Preço-Base', caminho: CAMINHO + 'MER - Catálogo e Preço-Base', icone: 'cadastro', voltar: M.voltarCadastros });
    tela.ativar();
    render();
  }
  function render() {
    const abas = U.chips([['catalogo', 'Catálogo fornecedor–produto'], ['historico', 'Histórico de compras'], ['preco', 'Preço-base']], aba, (v) => { aba = v; render(); });
    abas.classList.add('compras-abas');
    const corpo = aba === 'catalogo' ? catalogo() : aba === 'historico' ? historico() : precoBase();
    tela.body.replaceChildren(U.nota('Quem vende o quê, o que já foi comprado e o preço de referência de cada produto.'), abas, corpo);
  }
  const refoco = () => setTimeout(() => tela.body.querySelector('.compras-busca')?.focus(), 0);

  /* ---------- Catálogo ---------- */
  function catalogo() {
    const box = el('div', 'compras-grade');
    const filtros = el('div', 'profiles-controls');
    const bx = U.busca('Buscar vínculo', (v) => { fc.busca = v; render(); refoco(); });
    bx.value = fc.busca;
    const mk = (rot, opcoes, chave, vazio) => { const s = seletor(opcoes, fc[chave], vazio); s.onchange = () => { fc[chave] = s.value; render(); }; return campo(rot, s); };
    filtros.append(bx,
      mk('Situação', [['pendente', 'Pendente'], ['aprovado', 'Aprovado'], ['rejeitado', 'Rejeitado']], 'situacao', 'Todas'),
      mk('Fornecedor', S.dados.fornecedores.map((f) => [f.id, f.nome]), 'fornecedor', 'Todos'),
      mk('Origem', [['compras', 'Compras'], ['fornecedor', 'Fornecedor']], 'origem', 'Todas'),
      botao('Vincular produto', vincular, 'btn'));
    const lista = S.dados.catalogo.filter((v) => (!fc.situacao || v.status === fc.situacao) && (!fc.fornecedor || v.fornecedorId === fc.fornecedor) && (!fc.origem || v.origem === fc.origem)
      && U.dobrar((S.fornecedor(v.fornecedorId)?.nome || '') + ' ' + (S.produto(v.produtoId)?.descricao || '')).includes(U.dobrar(fc.busca)))
      .sort((a, b) => (a.status === 'pendente' ? -1 : 0) - (b.status === 'pendente' ? -1 : 0) || (S.fornecedor(a.fornecedorId)?.nome || '').localeCompare(S.fornecedor(b.fornecedorId)?.nome || '', 'pt-BR'));
    box.append(filtros, U.tabela([
      ['Fornecedor', (v) => S.fornecedor(v.fornecedorId)?.nome || '—'],
      ['Produto', (v) => S.produto(v.produtoId)?.descricao || '—'],
      ['Origem', (v) => (v.origem === 'fornecedor' ? 'Fornecedor' : 'Compras')],
      ['Status', (v) => U.situacao(...STATUS[v.status])],
      ['Preço ofertado', (v) => D.moeda(v.precoOfertado), 'num'],
      ['', (v) => {
        if (v.origem !== 'fornecedor' || v.status !== 'pendente') return '';
        const s = el('span', 'compras-oferta-acoes');
        s.append(botao('Rejeitar', () => { const r = SV.decidirVinculo(v.id, 'rejeitado'); if (r.erro) return U.avisar(r.erro); render(); }), botao('Aprovar', () => { const r = SV.decidirVinculo(v.id, 'aprovado'); if (r.erro) return U.avisar(r.erro); U.avisar('Vínculo aprovado.'); render(); }, 'btn'));
        return s;
      }],
    ], lista, { vazioTexto: 'Nenhum vínculo com esses filtros.' }), U.nota('Vínculo criado por Compras nasce aprovado. Só a sugestão vinda do fornecedor pede aprovação.'));
    return box;
  }
  function vincular() {
    U.dialogo({
      titulo: 'Vincular produto ao fornecedor',
      montar: (form) => {
        const f = seletor(S.dados.fornecedores.filter((x) => x.situacao === 'ativo').map((x) => [x.id, x.nome]), '', 'Selecione o fornecedor');
        const p = seletor(S.dados.produtos.filter((x) => x.status === 'ativo').sort((a, b) => a.descricao.localeCompare(b.descricao, 'pt-BR')).map((x) => [x.id, x.descricao]), '', 'Selecione o produto');
        const preco = entrada('text', '', { inputMode: 'decimal', placeholder: 'Opcional' });
        form.append(campo('Fornecedor *', f), campo('Produto *', p), campo('Preço ofertado (opcional)', preco));
        return { f, p, preco };
      },
      salvar: (c) => { const r = SV.vincular(c.f.value, c.p.value, c.preco.value); if (r.erro) return r.erro; U.avisar('Vínculo criado.'); render(); },
    });
  }

  /* ---------- Histórico ---------- */
  function historico() {
    const box = el('div', 'compras-grade');
    const filtros = el('div', 'profiles-controls');
    const bx = U.busca('Buscar produto ou fornecedor', (v) => { fh.busca = v; render(); refoco(); });
    bx.value = fh.busca;
    const per = seletor([[1, '1 mês'], [3, '3 meses'], [6, '6 meses'], [12, '12 meses']], String(fh.meses));
    per.onchange = () => { fh.meses = Number(per.value); render(); };
    filtros.append(bx, campo('Período', per));
    const desde = D.isoData(new Date(new Date().getFullYear(), new Date().getMonth() - fh.meses, new Date().getDate()));
    // Histórico importado + compras feitas no protótipo (pedidos recebidos ou a caminho).
    const registros = S.dados.historico.slice();
    S.dados.pedidos.filter((p) => p.status !== 'cancelado').forEach((p) => p.itens.forEach((i) => registros.push({ produtoId: i.produtoId, fornecedorId: p.fornecedorId, data: p.criadoEm.slice(0, 10), custo: i.custo, quantidade: i.pedida })));
    const mapa = new Map();
    registros.filter((r) => r.data >= desde).forEach((r) => {
      const k = r.produtoId + '|' + r.fornecedorId;
      const m = mapa.get(k) || { produtoId: r.produtoId, fornecedorId: r.fornecedorId, ultima: '', ultimo: 0, menor: Infinity, maior: 0, compras: 0, quantidade: 0 };
      if (r.data >= m.ultima) { m.ultima = r.data; m.ultimo = r.custo; }
      m.menor = Math.min(m.menor, r.custo); m.maior = Math.max(m.maior, r.custo); m.compras++; m.quantidade += r.quantidade;
      mapa.set(k, m);
    });
    const lista = [...mapa.values()].filter((m) => U.dobrar((S.produto(m.produtoId)?.descricao || '') + ' ' + (S.fornecedor(m.fornecedorId)?.nome || '')).includes(U.dobrar(fh.busca)))
      .sort((a, b) => (S.produto(a.produtoId)?.descricao || '').localeCompare(S.produto(b.produtoId)?.descricao || '', 'pt-BR'));
    box.append(filtros, U.tabela([
      ['Produto', (m) => S.produto(m.produtoId)?.descricao || '—'],
      ['Fornecedor', (m) => S.fornecedor(m.fornecedorId)?.nome || '—'],
      ['Última compra', (m) => D.dataLonga(m.ultima)],
      ['Último custo', (m) => D.moeda(m.ultimo), 'num'],
      ['Menor', (m) => D.moeda(m.menor), 'num'],
      ['Maior', (m) => D.moeda(m.maior), 'num'],
      ['Compras', (m) => String(m.compras), 'num'],
      ['Quantidade', (m) => D.numero(m.quantidade), 'num'],
    ], lista, { vazioTexto: 'Nenhuma compra no período.' }), U.nota('Inclui o histórico de exemplo e as compras feitas aqui (pedidos comprados e recebidos).'));
    return box;
  }

  /* ---------- Preço-base ----------
   * Referência de custo de cada produto: a compra automática acontece quando a oferta fica até este valor.
   * No S1 é carregada por planilha e atualizada pelas cotações (só desce ao fechar). Aqui também pode ser
   * definida à mão; cada mudança vira uma nova versão e a anterior fica no histórico.
   */
  const ORIGEM_PB = { importacao: 'Carga inicial', rodada: 'Cotação', manual: 'Manual' };
  let buscaPB = '';
  let soSemPB = false;
  function precoBase() {
    const box = el('div', 'compras-grade');
    const ativos = S.dados.produtos.filter((p) => p.status === 'ativo' && p.liberadoCompra);
    const semRef = ativos.filter((p) => S.referencia(p.id) == null);
    const filtros = el('div', 'profiles-controls');
    const bx = U.busca('Buscar produto ou código', (v) => { buscaPB = v; render(); refoco(); });
    bx.value = buscaPB;
    filtros.append(bx, U.chips([['todos', 'Todos'], ['sem', 'Sem preço-base (' + semRef.length + ')']], soSemPB ? 'sem' : 'todos', (v) => { soSemPB = v === 'sem'; render(); }));
    const lista = ativos.filter((p) => (!soSemPB || S.referencia(p.id) == null) && U.dobrar(p.descricao + ' ' + (p.codigoInterno || '')).includes(U.dobrar(buscaPB)))
      .sort((x, y) => x.descricao.localeCompare(y.descricao, 'pt-BR'));
    const vigente = (id) => S.dados.precosBase.find((p) => p.produtoId === id && !p.ate);
    box.append(
      U.nota('Preço de referência de cada produto liberado para compra. Na cotação, oferta até este valor é comprada automaticamente; acima dele vai para você decidir. Ao fechar uma cotação, ele só desce. Clique no produto para alterar.'),
      filtros,
      U.tabela([
        ['Produto', (p) => p.descricao],
        ['Código interno', (p) => p.codigoInterno || '—'],
        ['Preço-base', (p) => (vigente(p.id) ? D.moeda(vigente(p.id).valor) : U.situacao('Sem preço-base', 'atencao')), 'num'],
        ['Origem', (p) => (vigente(p.id) ? ORIGEM_PB[vigente(p.id).origem] || vigente(p.id).origem : '—')],
        ['Válido desde', (p) => (vigente(p.id) ? D.dataLonga(vigente(p.id).desde) : '—')],
      ], lista, { aoClicar: (p) => editarPrecoBase(p), vazioTexto: 'Nenhum produto com esse filtro.' }),
    );
    return box;
  }
  function editarPrecoBase(p) {
    const versoes = S.dados.precosBase.filter((x) => x.produtoId === p.id).sort((a, b) => (b.desde + (b.ate || '9')).localeCompare(a.desde + (a.ate || '9')));
    const atual = S.referencia(p.id);
    U.dialogo({
      titulo: atual == null ? 'Definir preço-base' : 'Alterar preço-base',
      subtitulo: p.descricao + (p.codigoInterno ? ' · ' + p.codigoInterno : ''),
      montar: (form) => {
        const valor = entrada('text', atual == null ? '' : String(atual.toFixed(2)).replace('.', ','), { inputMode: 'decimal', placeholder: '0,00' });
        form.append(campo('Preço-base (R$ por ' + (p.unidade || 'unidade') + ')', valor, 'Vale para as próximas cotações. Cotações já abertas mantêm o valor congelado no envio.'));
        if (versoes.length) {
          const hist = el('section', 'compras-bloco');
          hist.append(el('h4', null, 'Histórico'));
          hist.append(U.tabela([
            ['Valor', (v) => D.moeda(v.valor), 'num'],
            ['Origem', (v) => ORIGEM_PB[v.origem] || v.origem],
            ['Desde', (v) => D.dataLonga(v.desde)],
            ['Até', (v) => (v.ate ? D.dataLonga(v.ate) : 'Vigente')],
          ], versoes));
          form.append(hist);
        }
        return { valor };
      },
      salvar: (c) => { const r = SV.definirPrecoBase(p.id, c.valor.value); if (r.erro) return r.erro; U.avisar('Preço-base salvo.'); render(); },
    });
  }

  M.registrar('cadastro', abrir);
})();
