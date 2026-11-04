/*
 * Produtos — lista (S1: pages/produtos/index.vue, ProdutoFiltros, ProdutoCard, ProdutoListaLinha,
 * ProdutoInativarLote). Busca, "Só ativos", "Só os que já vendi", filtros, 6 ordenações do S1 + menor
 * estoque (S2), paginação de 12, cards ou lista, foto ampliada e inativação em lote com frase.
 * Fica em Configuração · Cadastros / Gerais → Diretor de Operação.
 */
(function () {
  'use strict';
  const D = window.CicluzComprasDominio;
  const S = window.CicluzComprasDados;
  const U = window.CicluzComprasUI;
  const R = window.CicluzProdutoRegras;
  const X = window.CicluzProdutoExtras;
  const PF = window.CicluzProdutoForm;
  const { el, botao, campo, entrada, seletor } = U;
  const voltarCadastros = () => openSection(sections[6][0], 'Diretor de Operação', 'settings', '#7c3aed');
  const TAMANHO_PAGINA = 12;

  let tela = null;
  const filtro = { busca: '', soAtivos: true, soVendidos: false, tipo: '', compra: '', grupo: '', setor: '', ordem: 'recentes', modo: 'lista', pagina: 1 };
  try { filtro.modo = localStorage.getItem('cicluz-compras-produtos-modo') || 'lista'; } catch (e) { /* preferência opcional */ }
  const selecionados = new Set();

  /** Pendência de compra (regra do S1) com o fornecedor aprovado do catálogo. */
  const pendencias = (p) => R.pendenciasDeCompra(p, S.fornecedoresDoProduto(p.id).length > 0);
  /** Texto que diz o que falta e onde resolver (regra do S1, doc 59). */
  const EXPLICA_PENDENCIA = {
    'como se compra': 'como se compra (falta embalagem ou medida de compra)',
    'mínimo e máximo': 'sem mínimo e máximo',
    'fornecedor aprovado': 'fornecedor aprovado (vincule em Cadastro de compras)',
  };

  function abrir() {
    if (!tela) {
      tela = U.criarTela({ id: 'compras-produtos', titulo: 'Produtos', caminho: 'Configurações / Diretor de Operação / Produtos', icone: 'produto', voltar: voltarCadastros });
      U.atalho(tela, 'Novo produto', 'M12 5v14M5 12h14', () => PF.editarProduto(null, render), { criar: true });
    }
    tela.ativar();
    render();
  }

  function filtrados() {
    const termo = U.dobrar(filtro.busca);
    const lista = S.dados.produtos.filter((p) => {
      if (filtro.soAtivos && p.status !== 'ativo') return false;
      if (filtro.soVendidos && !(p.vendas3m > 0)) return false;
      if (filtro.tipo && p.tipo !== filtro.tipo) return false;
      if (filtro.compra === 'liberados' && !p.liberadoCompra) return false;
      if (filtro.compra === 'nao_liberados' && p.liberadoCompra) return false;
      if (filtro.compra === 'pendentes' && !pendencias(p).length) return false;
      if (filtro.grupo && p.grupoId !== filtro.grupo) return false;
      if (filtro.setor && p.setorEstoque !== filtro.setor) return false;
      return !termo || U.dobrar([p.descricao, p.nomeCatalogo, p.marca, p.codigoInterno, p.codigoBarras].join(' ')).includes(termo);
    });
    return R.ordenarProdutos(lista, filtro.ordem);
  }

  function render() {
    const b = S.bolinhas();
    const todos = filtrados();
    const pag = R.paginar(todos, filtro.pagina, TAMANHO_PAGINA);
    filtro.pagina = pag.pagina;

    const controles = el('div', 'profiles-controls');
    const bx = U.busca('Buscar por nome, código, EAN ou marca...', (v) => { filtro.busca = v; filtro.pagina = 1; render(); setTimeout(() => tela.body.querySelector('.compras-busca')?.focus(), 0); });
    bx.value = filtro.busca;
    const mk = (rot, opcoes, chave, vazio) => { const s = seletor(opcoes, filtro[chave], vazio); s.onchange = () => { filtro[chave] = s.value; filtro.pagina = 1; render(); }; return campo(rot, s); };
    controles.append(bx,
      mk('Grupo', S.gruposMercadoria().filter((g) => g.ativo).map((g) => [g.id, g.nome]), 'grupo', 'Todos os grupos'),
      mk('Setor de estoque', [...new Set(S.dados.produtos.map((p) => p.setorEstoque).filter(Boolean))].sort(), 'setor', 'Todos os setores'),
      mk('Ordenar', R.ORDENACOES, 'ordem'));

    const linha = el('div', 'compras-filtros');
    const chk = (rot, chave) => { const l = el('label', 'compras-interruptor'); const c = entrada('checkbox'); c.checked = filtro[chave]; c.onchange = () => { filtro[chave] = c.checked; filtro.pagina = 1; render(); }; l.append(c, el('span', null, rot)); return l; };
    const grupoChips = (rot, opcoes, chave) => { const g = el('div', 'compras-grupo-chips'); g.append(el('span', 'compras-rotulo', rot), U.chips(opcoes, filtro[chave], (v) => { filtro[chave] = v; filtro.pagina = 1; render(); })); return g; };
    const totalPend = S.dados.produtos.filter((p) => p.status === 'ativo' && pendencias(p).length).length;
    linha.append(chk('Só ativos', 'soAtivos'), chk('Só os que já vendi', 'soVendidos'),
      grupoChips('Tipo', [['', 'Todos'], ['revenda', 'Revenda'], ['transformacao', 'Transformação']], 'tipo'),
      grupoChips('Compra', [['', 'Todos'], ['liberados', 'Liberados'], ['nao_liberados', 'Não liberados'], ['pendentes', 'Pendentes (' + totalPend + ')']], 'compra'),
      U.chips([['lista', 'Lista'], ['cards', 'Cards']], filtro.modo, (v) => { filtro.modo = v; try { localStorage.setItem('cicluz-compras-produtos-modo', v); } catch (e) { /* opcional */ } render(); }));
    const temFiltro = filtro.busca || !filtro.soAtivos || filtro.soVendidos || filtro.tipo || filtro.compra || filtro.grupo || filtro.setor || filtro.ordem !== 'recentes';
    if (temFiltro) linha.append(botao('Limpar', () => { Object.assign(filtro, { busca: '', soAtivos: true, soVendidos: false, tipo: '', compra: '', grupo: '', setor: '', ordem: 'recentes', pagina: 1 }); render(); }));

    const info = el('div', 'compras-linha-info');
    info.append(U.nota(todos.length + ' produto(s). Produto nunca é apagado: inative quando sair de linha.'), U.legendaBolinhas());

    const lote = barraDoLote(pag.itens);
    // No celular (até 600 px) a lista vira cards, como no S1.
    const emCards = filtro.modo === 'cards' || window.matchMedia('(max-width: 600px)').matches;
    const corpo = emCards ? cards(pag.itens, b) : tabela(pag.itens, b);
    const paginacao = el('div', 'compras-paginacao');
    if (pag.paginas > 1) {
      paginacao.append(botao('‹ Anterior', () => { filtro.pagina--; render(); }), el('span', null, 'Página ' + pag.pagina + ' de ' + pag.paginas), botao('Próxima ›', () => { filtro.pagina++; render(); }));
      paginacao.querySelectorAll('button')[0].disabled = pag.pagina <= 1;
      paginacao.querySelectorAll('button')[1].disabled = pag.pagina >= pag.paginas;
    }
    tela.body.replaceChildren(controles, linha, info, lote, corpo, paginacao);
  }

  function selecao(p) {
    const c = entrada('checkbox');
    c.checked = selecionados.has(p.id);
    c.setAttribute('aria-label', 'Selecionar ' + (p.nomeCatalogo || p.descricao));
    c.onclick = (e) => e.stopPropagation();
    c.onchange = () => { c.checked ? selecionados.add(p.id) : selecionados.delete(p.id); render(); };
    return c;
  }
  const situacaoCompra = (p) => {
    const f = pendencias(p);
    if (p.status !== 'ativo') return U.situacao('Inativo', 'neutro');
    if (!p.liberadoCompra) return U.situacao('Não liberado', 'neutro');
    return f.length ? U.situacao('Pendente: ' + f.map((x) => EXPLICA_PENDENCIA[x] || x).join(', '), 'atencao') : U.situacao('Liberado', 'positivo');
  };
  const precoAtual = (p) => R.calcularPrecoVendaComPromocao({ precoVenda: p.precoVenda || 0, promocoes: p.promocoes || [] });

  function tabela(lista, b) {
    return U.tabela([
      ['', (p) => selecao(p), 'centro'],
      ['Produto', (p) => { const s = el('span', 'compras-produto-celula'); s.append(el('b', null, p.nomeCatalogo || p.descricao), U.bolinhasDe(p.id, b), el('small', null, [p.codigoInterno || 'Sem código', p.marca || 'Sem marca', S.nomeGrupo(p.grupoId, p.subgrupoId)].join(' · '))); return s; }],
      ['Tipo', (p) => (p.tipo === 'revenda' ? 'Revenda' : 'Transformação')],
      ['Estoque', (p) => D.numero(p.saldo) + ' ' + (p.unidade || ''), 'num'],
      ['Mín · Máx', (p) => (p.estoqueMin == null ? '—' : D.numero(p.estoqueMin)) + ' · ' + (p.estoqueMax == null ? '—' : D.numero(p.estoqueMax)), 'num'],
      ['Preço', (p) => (p.precoVenda ? D.moeda(precoAtual(p)) : 'Sem preço'), 'num'],
      ['Compra', situacaoCompra],
    ], lista, { aoClicar: (p) => PF.editarProduto(p, render), vazioTexto: 'Nenhum produto com esses filtros.', classeLinha: (p) => (p.status !== 'ativo' ? 'inativo' : '') });
  }

  function cards(lista, b) {
    const grid = el('div', 'compras-cards');
    if (!lista.length) { grid.append(U.vazio('Nenhum produto com esses filtros.')); return grid; }
    lista.forEach((p) => {
      const c = el('article', 'compras-card' + (p.status !== 'ativo' ? ' inativo' : ''));
      const topo = el('div', 'compras-card-topo');
      if (p.fotoUrl) {
        const img = el('img', 'compras-card-foto'); img.src = p.fotoUrl; img.alt = 'Foto de ' + (p.nomeCatalogo || p.descricao);
        const amp = botao('', () => X.fotoAmpliada(p.fotoUrl, p.nomeCatalogo || p.descricao), 'compras-card-foto-botao');
        amp.setAttribute('aria-label', 'Ampliar foto de ' + (p.nomeCatalogo || p.descricao));
        amp.append(img); topo.append(amp);
      } else { const i = el('span', 'compras-linha-icone'); i.innerHTML = U.svg(U.ICONES.produto); topo.append(i); }
      const titulo = el('div', 'compras-produto-celula');
      titulo.append(el('b', null, p.nomeCatalogo || p.descricao), U.bolinhasDe(p.id, b));
      if (p.nomeCatalogo) titulo.append(el('small', null, p.descricao));
      titulo.append(el('small', null, p.codigoInterno || 'sem código'));
      topo.append(titulo, selecao(p));
      const dl = el('dl');
      const gram = Number(p.quantidadeIndividual) > 0 ? D.numero(p.quantidadeIndividual) + ' ' + (p.unidadeIndividual || '') : '—';
      [['Tipo', p.tipo === 'revenda' ? 'Revenda' : 'Transformação'], ['Gramatura', gram], ['Marca', p.marca || '—'], ['Grupo', S.nomeGrupo(p.grupoId, p.subgrupoId)], ['EAN', p.codigoBarras || '—'], ['Estoque', D.numero(p.saldo) + ' ' + (p.unidade || '')], ['Referência', S.referencia(p.id) == null ? 'sem preço de referência' : D.moeda(S.referencia(p.id))]]
        .forEach(([k, v]) => dl.append(el('dt', null, k), el('dd', null, v)));
      const rodape = el('div', 'compras-linha-info');
      const venda = p.precoVenda ? D.moeda(p.precoVenda) : 'sem preço de venda';
      const promo = p.precoVenda && precoAtual(p) < p.precoVenda ? ' · promoção ' + D.moeda(precoAtual(p)) : '';
      rodape.append(el('b', null, venda + promo), situacaoCompra(p), botao('Editar', () => PF.editarProduto(p, render)));
      c.append(topo, dl, rodape);
      grid.append(c);
    });
    return grid;
  }

  /* ---------- Inativar em lote ---------- */
  function barraDoLote(pagina) {
    const box = el('div', 'compras-lote');
    if (!selecionados.size) {
      box.append(botao('Selecionar página atual', () => { pagina.forEach((p) => selecionados.add(p.id)); render(); }));
      return box;
    }
    box.classList.add('ativa');
    box.append(el('b', null, selecionados.size + ' produto(s) selecionado(s)'),
      botao('Selecionar página atual', () => { pagina.forEach((p) => selecionados.add(p.id)); render(); }),
      botao('Limpar seleção', () => { selecionados.clear(); render(); }),
      botao('Inativar selecionados', inativarSelecionados, 'btn perigo'));
    return box;
  }
  function inativarSelecionados() {
    const ids = [...selecionados];
    const frase = R.fraseInativacao(ids.length);
    U.dialogo({
      titulo: 'Inativar ' + ids.length + ' produto(s)',
      montar: (form) => {
        const conf = entrada('text', '', { autocomplete: 'off' });
        form.append(el('p', null, 'Os produtos saem de uso nesta loja. Nada é apagado e cada um pode ser ativado de novo.'), campo('Digite ' + frase + ' para confirmar', conf));
        return { conf };
      },
      rotuloSalvar: 'Inativar',
      salvar: (c) => {
        if (c.conf.value.trim().toUpperCase() !== frase) return 'Digite exatamente ' + frase + '.';
        let alterados = 0;
        const ok = S.transacao((d) => d.produtos.forEach((p) => { if (ids.includes(p.id) && p.status !== 'inativo') { p.status = 'inativo'; p.liberadoCompra = false; alterados++; } }));
        if (!ok) return 'Não foi possível salvar.';
        selecionados.clear();
        U.avisar(alterados + ' produto(s) inativado(s).');
        render();
      },
    });
  }

  window.CicluzComprasProdutos = { abrir, pendencias, render };
})();
