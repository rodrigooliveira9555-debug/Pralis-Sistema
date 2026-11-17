/*
 * Produtos — lista (S1: pages/produtos/index.vue, ProdutoFiltros, ProdutoCard, ProdutoListaLinha,
 * ProdutoInativarLote). Lista em linhas com colunas ocultáveis (modelo de Fornecedores). Busca, "Só ativos", "Só os que já vendi", filtros, 6 ordenações do S1 + menor
 * estoque (S2), paginação de 12, cards ou lista, foto ampliada e inativação em lote com frase.
 * Sem filtros na tela: busca pela lupa do rodapé e botão "Inativos" no cabeçalho da lista.
 * Fica em Saídas · Mercadorias → Cadastros Geral → MER - Produtos.
 */
(function () {
  'use strict';
  const D = window.CicluzComprasDominio;
  const S = window.CicluzComprasDados;
  const U = window.CicluzComprasUI;
  const R = window.CicluzProdutoRegras;
  const X = window.CicluzProdutoExtras;
  const PF = window.CicluzProdutoForm;
  const { el, botao, campo, entrada } = U;
  const voltarCadastros = () => menuBack(3, 'Cadastros Geral')();
  const TAMANHO_PAGINA = 12;

  let tela = null;
  // Sem filtros na tela (pedido do Rodrigo, 17/11/2026): a busca é a lupa do rodapé; a lista mostra os ativos e o
  // botão "Inativos" do cabeçalho da lista troca para os inativos (incluindo os arquivados do app).
  const filtro = { busca: '', soAtivos: true, pagina: 1 };
  const selecionados = new Set();

  /** Pendência de compra (regra do S1) com o fornecedor aprovado do catálogo. */
  const pendencias = (p) => R.pendenciasDeCompra(p, S.fornecedoresDoProduto(p.id).length > 0);
  /** Texto que diz o que falta e onde resolver (regra do S1, doc 59). */
  const EXPLICA_PENDENCIA = {
    'como se compra': 'como se compra (falta embalagem ou medida de compra)',
    'mínimo e máximo': 'sem mínimo e máximo',
    'fornecedor aprovado': 'fornecedor aprovado (vincule em MER - Catálogo e Preço-Base)',
  };

  function abrir() {
    if (!tela) {
      tela = U.criarTela({ id: 'compras-produtos', titulo: 'MER - Produtos', caminho: 'Saídas · Mercadorias / Cadastros Geral / MER - Produtos', icone: 'produto', voltar: voltarCadastros });
      // É esta ação que o "+" fixo do rodapé aciona (a mesma do botão "Novo Produto" do cabeçalho da lista).
      U.atalho(tela, 'Novo produto', 'M12 5v14M5 12h14', () => PF.editarProduto(null, render), { criar: true });
    }
    tela.ativar();
    render();
  }

  /** Alerta de vínculo de cada produto (grupo e local da árvore), calculado uma vez por desenho da tela. */
  let vinculos = new Map();
  function calcularVinculos() {
    const grupos = S.gruposMercadoria();
    const nos = window.CicluzProdutoImportacao.nosDaArvore(S.arvoreLocais());
    vinculos = new Map(S.dados.produtos.map((p) => [p.id, S.vinculo(p, grupos, nos)]));
  }
  const vinculoDe = (p) => vinculos.get(p.id) || { semGrupo: false, semLocal: false };

  /** Produtos da lista: os do Compras e, com "Só ativos" desmarcado, também os inativos do arquivo (sem repetir id). */
  function fonte() {
    if (filtro.soAtivos) return S.dados.produtos;
    const arq = S.arquivoAberto();
    if (!arq) {
      S.arquivo().then(() => { if (tela && tela.view.classList.contains('show')) render(); })
        .catch(() => U.avisar('Não foi possível abrir os produtos arquivados neste navegador.'));
      return S.dados.produtos;
    }
    const ids = new Set(S.dados.produtos.map((p) => p.id));
    return S.dados.produtos.concat(arq.filter((p) => !ids.has(p.id)));
  }

  function filtrados() {
    const termo = U.dobrar(filtro.busca);
    const lista = fonte().filter((p) => {
      if (filtro.soAtivos ? p.status !== 'ativo' : p.status === 'ativo') return false;
      return !termo || U.dobrar([p.descricao, p.nomeCatalogo, p.marca, p.codigoInterno, p.codigoBarras].join(' ')).includes(termo);
    });
    return R.ordenarProdutos(lista, 'recentes');
  }

  function render() {
    calcularVinculos();
    const b = S.bolinhas();
    const todos = filtrados();
    const pag = R.paginar(todos, filtro.pagina, TAMANHO_PAGINA);
    filtro.pagina = pag.pagina;

    // Busca pela lupa do rodapé (um caminho só para buscar). A caixa é criada uma vez e fica no lugar a cada desenho,
    // para o campo não perder o cursor a cada letra.
    const busca = U.buscaRodape(tela, 'Buscar por nome, código interno, código de barras ou marca', (v) => { filtro.busca = v; filtro.pagina = 1; if (tela.view.classList.contains('show')) render(); });
    const lote = barraDoLote(pag.itens);
    // No celular (até 600 px) a lista vira cards, como no S1.
    const emCards = window.matchMedia('(max-width: 600px)').matches;
    // Cabeçalho branco da lista, igual ao de Fornecedores e Tipos de Ocorrência: botão retangular "Novo Produto" com o "+",
    // e na outra ponta a quantidade num círculo e a bolinha "‹ ›" de ocultar ou mostrar todas as colunas.
    const oQue = filtro.soAtivos ? 'ativo' : 'inativo';
    const ponta = U.pontaDaLista(todos.length, todos.length + (todos.length === 1 ? ' produto ' + oQue : ' produtos ' + oQue + 's'));
    const sec = U.secao('Produtos', undefined, ponta);
    // Botões do cabeçalho: cadastrar, ver os inativos (ou voltar aos ativos) e, para quem administra, importar e revincular.
    const nArq = S.totalArquivo();
    const verInativos = filtro.soAtivos
      ? U.botaoTitulo('Inativos', 'Ver os produtos inativos' + (nArq ? ' (' + nArq + ' arquivados do app)' : ''), () => { filtro.soAtivos = false; filtro.pagina = 1; render(); }, '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>')
      : U.botaoTitulo('Ativos', 'Voltar aos produtos ativos', () => { filtro.soAtivos = true; filtro.pagina = 1; render(); }, '<path d="m15 5-7 7 7 7"/>');
    const imp = window.CicluzProdutoImportacaoTela;
    const admin = imp && imp.podeImportar()
      ? [U.botaoTitulo('Importar', 'Importar do app de produtos', () => imp.importar(render), '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>'), U.botaoTitulo('Revincular', 'Revincular grupo e local', () => imp.revincularTudo(render), '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>')]
      : [];
    sec.querySelector('.compras-secao-cab h3').replaceChildren(U.botaoTitulo('Novo Produto', 'Cadastrar produto', () => PF.editarProduto(null, render)), verInativos, ...admin);
    sec.append(emCards ? cards(pag.itens, b) : linhas(pag.itens, b, ponta));
    const paginacao = el('div', 'compras-paginacao');
    if (pag.paginas > 1) {
      paginacao.append(botao('‹ Anterior', () => { filtro.pagina--; render(); }), el('span', null, 'Página ' + pag.pagina + ' de ' + pag.paginas), botao('Próxima ›', () => { filtro.pagina++; render(); }));
      paginacao.querySelectorAll('button')[0].disabled = pag.pagina <= 1;
      paginacao.querySelectorAll('button')[1].disabled = pag.pagina >= pag.paginas;
    }
    if (busca.parentNode !== tela.body) tela.body.prepend(busca);
    while (busca.nextSibling) busca.nextSibling.remove();
    tela.body.append(lote, sec, paginacao);
  }

  function selecao(p) {
    const c = entrada('checkbox');
    c.checked = selecionados.has(p.id);
    c.setAttribute('aria-label', 'Selecionar ' + (p.nomeCatalogo || p.descricao));
    c.onclick = (e) => e.stopPropagation();
    c.onchange = () => { c.checked ? selecionados.add(p.id) : selecionados.delete(p.id); render(); };
    return c;
  }
  /** Alerta de vínculo na linha e no card (pedido do Rodrigo). */
  const alertaVinculo = (p) => {
    const v = vinculoDe(p);
    const falta = [v.semGrupo && 'Sem grupo', v.semLocal && 'Sem local'].filter(Boolean);
    return falta.length ? U.situacao(falta.join(' · '), 'atencao') : null;
  };
  const situacaoCompra = (p) => {
    const f = pendencias(p);
    if (p.status !== 'ativo') return U.situacao('Inativo', 'neutro');
    if (!p.liberadoCompra) return U.situacao('Não liberado', 'neutro');
    return f.length ? U.situacao('Pendente: ' + f.map((x) => EXPLICA_PENDENCIA[x] || x).join(', '), 'atencao') : U.situacao('Liberado', 'positivo');
  };
  const precoAtual = (p) => R.calcularPrecoVendaComPromocao({ precoVenda: p.precoVenda || 0, promocoes: p.promocoes || [] });

  /**
   * Lista em linhas finas, no mesmo modelo de Fornecedores e Tipos de Ocorrência (pedido do Rodrigo, 17/11/2026): a
   * caixa de seleção, o ícone e o nome ficam fixos; cada outra coluna tem a setinha que a oculta ou mostra (preferência
   * do aparelho); o que não couber rola para o lado. Tocar na linha edita; a seta do fim revela Editar e Inativar
   * (produto nunca é apagado).
   */
  function linhas(lista, b, ponta) {
    const box = el('div', 'compras-lista compras-lista-grade');
    U.arrastarParaRolar(box);
    if (!lista.length) { box.append(U.vazio('Nenhum produto com esses filtros.')); return box; }
    const cabecalho = U.cabecalhoColunas('grade-produto', [
      { chave: 'nome', rotulo: 'Produto' }, { chave: 'tipo', rotulo: 'Tipo', ocultavel: true }, { chave: 'estoque', rotulo: 'Estoque', ocultavel: true },
      { chave: 'minmax', rotulo: 'Mín · Máx', ocultavel: true }, { chave: 'preco', rotulo: 'Preço', ocultavel: true },
      { chave: 'compra', rotulo: 'Compra', ocultavel: true }, { chave: 'estado', rotulo: 'Situação' },
    ], { lista: box, preferencia: 'cicluz-produtos-colunas' });
    box.append(cabecalho);
    ponta.append(cabecalho.botaoGeral);
    lista.forEach((p) => {
      const rotulo = p.nomeCatalogo || p.descricao;
      const nome = el('span', 'compras-produto-celula');
      nome.append(el('b', null, rotulo), U.bolinhasDe(p.id, b), el('small', null, [p.codigoInterno || 'Sem código', p.marca || 'Sem marca', S.nomeGrupo(p.grupoId, p.subgrupoId)].join(' · ')));
      const a = alertaVinculo(p); if (a) nome.append(a);
      const r = U.linhaLista({
        icones: [{ icone: 'produto', rotulo: p.tipo === 'revenda' ? 'Revenda' : 'Transformação' }], grade: 'grade-produto',
        colunas: [
          { chave: 'nome', conteudo: nome },
          { chave: 'tipo', conteudo: p.tipo === 'revenda' ? 'Revenda' : 'Transformação' },
          { chave: 'estoque', conteudo: D.numero(p.saldo) + ' ' + (p.unidade || '') },
          { chave: 'minmax', conteudo: (p.estoqueMin == null ? '—' : D.numero(p.estoqueMin)) + ' · ' + (p.estoqueMax == null ? '—' : D.numero(p.estoqueMax)) },
          { chave: 'preco', conteudo: p.precoVenda ? D.moeda(precoAtual(p)) : 'Sem preço' },
          { chave: 'compra', conteudo: situacaoCompra(p) },
        ],
        estado: p.status === 'ativo' ? 'Ativo' : 'Inativo',
        acoes: { rotulo, lista: box, aoEditar: () => PF.editarProduto(p, render), aoExcluir: () => (p.status === 'ativo' ? inativar([p.id]) : U.avisar('Este produto já está inativo.')) },
      });
      if (p.status !== 'ativo') r.classList.add('inativo');
      r.querySelector('.compras-linha-icones').prepend(selecao(p));
      // Produto nunca é apagado: a lixeira da linha inativa (mesma confirmação da inativação em lote).
      const lixeira = r.querySelector('.account-row-actions > button');
      if (lixeira) { lixeira.title = 'Inativar'; lixeira.setAttribute('aria-label', 'Inativar ' + rotulo); }
      box.append(r);
    });
    return box;
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
      { const al = alertaVinculo(p); if (al) titulo.append(al); }
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
    if (!selecionados.size) return box;
    box.classList.add('ativa');
    box.append(el('b', null, selecionados.size + ' produto(s) selecionado(s)'),
      botao('Selecionar página atual', () => { pagina.forEach((p) => selecionados.add(p.id)); render(); }),
      botao('Limpar seleção', () => { selecionados.clear(); render(); }),
      botao('Inativar selecionados', () => inativar([...selecionados]), 'btn perigo'));
    return box;
  }
  function inativar(ids) {
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
        ids.forEach((id) => selecionados.delete(id));
        U.avisar(alterados + ' produto(s) inativado(s).');
        render();
      },
    });
  }

  window.CicluzComprasProdutos = { abrir, pendencias, render };
})();
