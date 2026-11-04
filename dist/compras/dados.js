/*
 * Compras — armazenamento do protótipo (localStorage deste navegador) e dados de exemplo.
 * Um único registro versionado, gravado de forma transacional (desfaz a mudança se falhar).
 * Produtos usam os grupos de MER (cadastro financeiro do S2), como no S1 (grupo_mercadoria_id).
 */
(function () {
  'use strict';
  const KEY = 'cicluz-compras-v1';
  const COLECOES = [
    'fornecedores', 'produtos', 'catalogo', 'precosBase', 'historico',
    'agendas', 'ocorrencias', 'solicitacoes', 'rodadas', 'convites', 'pedidos', 'movimentos',
    'conferenciaAgendas', 'conferencias',
  ];
  /* Coleções acrescentadas depois: dado antigo sem elas continua válido (recebe lista vazia ou a carga inicial). */
  const COLECOES_NOVAS = ['unidades', 'historicoNomes'];
  const UNIDADES_INICIAIS = [['UN', 'Unidade'], ['KG', 'Quilo'], ['CX', 'Caixa'], ['FD', 'Fardo'], ['PC', 'Peça'], ['SC', 'Saco'], ['MI', 'Milheiro'], ['LT', 'Litro'], ['DZ', 'Dúzia'], ['G', 'Grama'], ['ML', 'Mililitro']];

  const novoId = (prefixo) => prefixo + '-' + (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const agoraIso = () => new Date().toISOString();
  const hojeIso = () => window.CicluzComprasDominio.isoData(new Date());

  /* Usuários fictícios: o S2 ainda não tem cadastro de usuários nem permissões. */
  const RESPONSAVEIS = [
    { id: 'u-jose', nome: 'José · Compras' },
    { id: 'u-rodrigo', nome: 'Rodrigo · Gerência' },
    { id: 'u-ana', nome: 'Ana · Estoque' },
  ];

  /* ---------- Dados de exemplo (fictícios) ---------- */
  function semente() {
    const f = (id, nome, documento, whatsapp, categoria, situacao = 'ativo') => ({ id, nome, documento, whatsapp, categoria, situacao });
    const fornecedores = [
      f('f-ambev', 'Distribuidora Bebidas Minas', '12.345.678/0001-90', '(31) 99811-2233', 'Bebidas'),
      f('f-laticinios', 'Laticínios Serra Verde', '23.456.789/0001-01', '(31) 98722-3344', 'Laticínios'),
      f('f-frios', 'Frios Bom Gosto', '34.567.890/0001-12', '(31) 99633-4455', 'Frios'),
      f('f-moinho', 'Moinho Central Farinhas', '45.678.901/0001-23', '(31) 98544-5566', 'Matéria-prima'),
      f('f-embala', 'Embala Fácil', '56.789.012/0001-34', '(31) 99455-6677', 'Embalagens'),
      f('f-atacado', 'Atacadão Mercearia BH', '67.890.123/0001-45', '(31) 98366-7788', 'Mercearia'),
      f('f-doces', 'Doce Mania Distribuidora', '78.901.234/0001-56', '9988-7766', 'Bombonieri'),
      f('f-antigo', 'Frigorífico Antigo', '89.012.345/0001-67', '(31) 99277-8899', 'Frios', 'inativo'),
    ];
    // [id, descricao, marca, grupoId, subgrupoId, unidade, embalagem, qtdEmb, saldo, min, max, custo, ref, vendas, compras, lucro, area, setor]
    const P = [
      ['p-coca2l', 'Refrigerante Cola 2L', 'Coca-Cola', 'g3', 'g3s0', 'UN', 'FD', 6, 18, 24, 96, 8.2, 8.1, 420, 380, 950, 'Loja', 'Geladeira bebidas'],
      ['p-guarana2l', 'Refrigerante Guaraná 2L', 'Antarctica', 'g3', 'g3s0', 'UN', 'FD', 6, 40, 18, 72, 7.1, 7.0, 260, 240, 610, 'Loja', 'Geladeira bebidas'],
      ['p-cerveja', 'Cerveja Lata 350ml', 'Brahma', 'g3', 'g3s1', 'UN', 'CX', 12, 60, 48, 240, 3.2, 3.15, 520, 600, 700, 'Loja', 'Geladeira bebidas'],
      ['p-suco', 'Suco Uva Integral 1L', 'Aurora', 'g3', 'g3s2', 'UN', 'CX', 6, 9, 12, 36, 11.5, null, 60, 48, 190, 'Loja', 'Prateleira bebidas'],
      ['p-mussarela', 'Mussarela Peça', 'Serra Verde', 'g4', 'g4s0', 'KG', 'PC', 4, 6.5, 8, 32, 32.9, 31.5, 180, 210, 820, 'Produção', 'Câmara fria'],
      ['p-presunto', 'Presunto Cozido Peça', 'Sadia', 'g4', 'g4s3', 'KG', 'PC', 3, 12, 6, 24, 26.4, 26.4, 140, 150, 560, 'Produção', 'Câmara fria'],
      ['p-manteiga', 'Manteiga com Sal 500g', 'Itambé', 'g5', 'g5s0', 'UN', 'CX', 12, 10, 12, 48, 21.9, 21.0, 90, 120, 260, 'Produção', 'Geladeira produção'],
      ['p-requeijao', 'Requeijão Cremoso 1,8kg', 'Catupiry', 'g5', 'g5s1', 'UN', 'CX', 6, 4, 6, 18, 58.0, 55.5, 50, 70, 300, 'Produção', 'Geladeira produção'],
      ['p-farinha', 'Farinha de Trigo Especial 25kg', 'Moinho Central', 'g13', 'g13s1', 'SC', 'SC', 1, 14, 20, 80, 98.0, 96.5, 0, 900, 0, 'Produção', 'Depósito seco'],
      ['p-fermento', 'Fermento Biológico Seco 500g', 'Fleischmann', 'g13', 'g13s2', 'UN', 'CX', 20, 26, 20, 100, 14.8, 14.8, 0, 160, 0, 'Produção', 'Depósito seco'],
      ['p-acucar', 'Açúcar Refinado 5kg', 'União', 'g13', 'g13s0', 'UN', 'FD', 6, 30, 12, 60, 22.5, 23.0, 0, 210, 0, 'Produção', 'Depósito seco'],
      ['p-oleo', 'Óleo de Soja 900ml', 'Soya', 'g7', 'g7s0', 'UN', 'CX', 20, 22, 20, 80, 7.9, 7.6, 70, 140, 80, 'Loja', 'Mercearia'],
      ['p-cafe', 'Café Torrado e Moído 500g', 'Três Corações', 'g7', 'g7s0', 'UN', 'FD', 10, 15, 10, 50, 18.9, null, 110, 100, 260, 'Loja', 'Mercearia'],
      ['p-saco-pao', 'Saco de Papel para Pão nº 3', 'Embala Fácil', 'g12', 'g12s1', 'MI', 'FD', 1, 3, 4, 12, 64.0, 62.0, 0, 30, 0, 'Loja', 'Depósito embalagens'],
      ['p-sacola', 'Sacola Plástica 40x50', 'Embala Fácil', 'g12', 'g12s2', 'KG', 'FD', 5, 18, 10, 40, 19.5, 19.5, 0, 25, 0, 'Loja', 'Depósito embalagens'],
      ['p-chocolate', 'Chocolate ao Leite 90g', 'Lacta', 'g1', 'g1s2', 'UN', 'CX', 17, 34, 34, 136, 5.4, 5.2, 300, 260, 410, 'Loja', 'Bombonieri'],
      ['p-bala', 'Bala de Goma 700g', 'Fini', 'g1', 'g1s1', 'UN', 'CX', 12, 20, 12, 24, 18.0, 18.0, 25, 20, 70, 'Loja', 'Bombonieri'],
      ['p-agua', 'Água Mineral 500ml', 'Minalba', 'g3', 'g3s0', 'UN', 'FD', 12, 80, null, null, 1.3, 1.2, 380, 300, 520, 'Loja', 'Geladeira bebidas'],
    ];
    const produtos = P.map(([id, descricao, marca, grupoId, subgrupoId, unidade, embalagem, qtdEmbalagem, saldo, estoqueMin, estoqueMax, custo, , vendas3m, compras3m, lucro3m, areaEstoque, setorEstoque], i) => ({
      id, ean: '789' + String(1000000000 + i * 7919).slice(0, 10), descricao, marca,
      tipo: grupoId === 'g13' ? 'transformacao' : 'revenda', grupoId, subgrupoId, unidade,
      embalagem, cDe: 'C/', qtdEmbalagem, medidaCompra: unidade,
      liberadoCompra: id !== 'p-agua', status: 'ativo',
      saldo, estoqueMin, estoqueMax, areaEstoque, setorEstoque, localVenda: areaEstoque === 'Loja' ? 'Balcão' : '',
      custo, margem: 0.3, vendas3m, compras3m, lucro3m,
    }));
    produtos.push({ ...produtos[0], id: 'p-inativo', descricao: 'Refrigerante Limão 600ml (descontinuado)', status: 'inativo', liberadoCompra: false, saldo: 0, vendas3m: 0, compras3m: 0, lucro3m: 0 });
    produtos.forEach((p, i) => completarExemplo(p, i));

    const vinc = [
      ['f-ambev', ['p-coca2l', 'p-guarana2l', 'p-cerveja', 'p-suco', 'p-agua']],
      ['f-atacado', ['p-coca2l', 'p-guarana2l', 'p-oleo', 'p-cafe', 'p-acucar', 'p-suco']],
      ['f-laticinios', ['p-manteiga', 'p-requeijao', 'p-mussarela']],
      ['f-frios', ['p-mussarela', 'p-presunto']],
      ['f-moinho', ['p-farinha', 'p-fermento', 'p-acucar']],
      ['f-embala', ['p-saco-pao', 'p-sacola']],
      ['f-doces', ['p-chocolate', 'p-bala']],
    ];
    const catalogo = [];
    for (const [fornecedorId, ids] of vinc) for (const produtoId of ids) catalogo.push({ id: novoId('v'), fornecedorId, produtoId, origem: 'compras', status: 'aprovado', precoOfertado: null, criadoEm: agoraIso() });
    catalogo.push({ id: novoId('v'), fornecedorId: 'f-frios', produtoId: 'p-requeijao', origem: 'fornecedor', status: 'pendente', precoOfertado: 54.9, criadoEm: agoraIso() });

    const precosBase = P.filter((p) => p[12] != null).map((p) => ({ id: novoId('pb'), produtoId: p[0], valor: p[12], origem: 'importacao', desde: '2026-10-01', ate: null }));

    const historico = [];
    const meses = ['2026-08-12', '2026-09-10', '2026-10-08'];
    for (const [fornecedorId, ids] of vinc) for (const produtoId of ids) {
      const ref = (P.find((p) => p[0] === produtoId) || [])[11] || 10;
      meses.forEach((data, i) => historico.push({ id: novoId('h'), produtoId, fornecedorId, data, custo: +(ref * (0.96 + i * 0.03)).toFixed(4), quantidade: 10 + i * 4 }));
    }
    const dados = Object.fromEntries(COLECOES.map((c) => [c, []]));
    return completar(Object.assign(dados, { versao: 1, fornecedores, produtos, catalogo, precosBase, historico }));
  }

  /* Campos do cadastro de produtos do S1 que os exemplos preenchem (fictícios). */
  const GRUPOS_EXEMPLO = { g1: 'BOMBONIERI', g3: 'BEBIDAS', g4: 'FRIOS', g5: 'LATICÍNIOS', g7: 'MERCEARIA', g12: 'EMBALAGENS', g13: 'MAT. PRIMA' };
  const SUBGRUPOS_EXEMPLO = { g3s0: 'REFRIGERANTES', g3s1: 'CERVEJAS', g3s2: 'SUCOS' };
  const EXEMPLO = {
    'p-coca2l': ['Refrigerante Cola', 2, 'LT', { codigoBarras: '7891000000001', setorVenda1: 'BEBIDAS', areaVenda: 'bebidas' }],
    'p-guarana2l': ['Refrigerante Guaraná', 2, 'LT', { areaVenda: 'bebidas' }],
    'p-cerveja': ['Cerveja Lata', 350, 'ML', { codigoBarras: '7891000039594', areaVenda: 'bebidas', localVenda2: 'GELADEIRA CAIXA' }],
    'p-suco': ['Suco Uva Integral', 1, 'LT', { areaVenda: 'bebidas' }],
    'p-mussarela': ['Mussarela Peça', 0, 'KG', { pesavel: true, teclaBalanca: 0, validadeBalanca: 30, compraAproximada: true, areaVenda: 'frios' }],
    'p-presunto': ['Presunto Cozido Peça', 0, 'KG', { pesavel: true, teclaBalanca: 0, validadeBalanca: 20, compraAproximada: true, areaVenda: 'frios' }],
    'p-manteiga': ['Manteiga com Sal', 500, 'G', { areaVenda: 'laticinios' }],
    'p-requeijao': ['Requeijão Cremoso', 1.8, 'KG', { areaVenda: 'laticinios' }],
    'p-farinha': ['Farinha de Trigo Especial', 25, 'KG', { embalagem: 'SC', cDe: 'DE', transformacao: { precisao: 'EXATOS', quantidade: 25000, unidade: 'G', produtoReceituario: 'FARINHA DE TRIGO', refReceituario: 'MP-001' } }],
    'p-fermento': ['Fermento Biológico Seco', 500, 'G', { transformacao: { precisao: 'EXATOS', quantidade: 500, unidade: 'G', produtoReceituario: 'FERMENTO SECO', refReceituario: 'MP-014' } }],
    'p-acucar': ['Açúcar Refinado', 5, 'KG', { transformacao: { precisao: 'APROXIMADOS', quantidade: 5000, unidade: 'G', produtoReceituario: 'AÇÚCAR', refReceituario: 'MP-007' }, conversoes: [{ unidade: 'FD', quantidade: 1, unidadesIndividuais: 6 }] }],
    'p-oleo': ['Óleo de Soja', 900, 'ML', { areaVenda: 'mercearia' }],
    'p-cafe': ['Café Torrado e Moído', 500, 'G', { areaVenda: 'mercearia', promocoes: [{ tipo: 'valor', valor: 21.9, descontoFracao: null, horaInicio: '07:00', horaFim: '10:00', dias: [true, true, true, true, true, false, false], validaAte: '2026-12-31' }] }],
    'p-saco-pao': ['Saco de Papel para Pão Nº 3', 0, 'UN', { embalagem: 'FD', cDe: 'C/', medidaCompra: 'MI' }],
    'p-sacola': ['Sacola Plástica 40x50', 0, 'KG', {}],
    'p-chocolate': ['Chocolate ao Leite', 90, 'G', { areaVenda: 'caixa', localVenda2: 'CAIXA', promocoes: [{ tipo: 'desconto', valor: null, descontoFracao: 0.1, horaInicio: '', horaFim: '', dias: [false, false, false, false, true, true, true], validaAte: '' }] }],
    'p-bala': ['Bala de Goma', 700, 'G', { areaVenda: 'caixa' }],
    'p-agua': ['Água Mineral', 500, 'ML', { areaVenda: 'bebidas' }],
    'p-inativo': ['Refrigerante Limão', 600, 'ML', {}],
  };
  function completarExemplo(p, i) {
    const R = window.CicluzProdutoRegras;
    const F = window.CicluzProdutoFiscal;
    const [nome, gramatura, unidadeIndividual, extra] = EXEMPLO[p.id] || [p.descricao, 0, 'UN', {}];
    Object.assign(p, {
      nomeCatalogo: nome.toLocaleUpperCase('pt-BR'), quantidadeIndividual: gramatura, unidadeIndividual,
      marca: String(p.marca || '').toLocaleUpperCase('pt-BR'),
      codigoInterno: String(12001 + i).padStart(5, '0'), codigoBarras: '789' + String(1000000000 + i * 7919).slice(0, 10),
      cDe: 'C/', localVenda1: p.areaEstoque === 'Loja' ? 'BALCÃO' : '', criadoEm: new Date(Date.UTC(2026, 9, 1 + i, 12)).toISOString(),
      auto: true, habilitarAjuda: false,
    }, extra);
    delete p.ean; delete p.localVenda;
    p.descricao = R.montarDescricao(p.nomeCatalogo, p.quantidadeIndividual, p.unidadeIndividual);
    // No S1 o custo é o da embalagem de compra (o preço divide pela Qt. embalagem).
    p.custo = Math.round(p.custo * (p.qtdEmbalagem || 1) * 100) / 100;
    p.precoVenda = R.calcularPrecoVenda({ auto: true, custo: p.custo, quantidadeCaixa: p.qtdEmbalagem, margem: p.margem, margemGrupo: 0 });
    p.fiscal = F.fiscalDoProduto({ nome: p.nomeCatalogo, codigoBarras: p.codigoBarras, nomeGrupo: GRUPOS_EXEMPLO[p.grupoId], nomeSubgrupo: SUBGRUPOS_EXEMPLO[p.subgrupoId] }).fiscal;
  }

  /** Valores padrão dos campos do cadastro: produto salvo antes deles continua abrindo. */
  function normalizarProduto(p) {
    const r = {
      nomeCatalogo: null, codigoInterno: null, quantidadeIndividual: 0, unidadeIndividual: p.unidade || 'UN', habilitarAjuda: false,
      pesavel: false, teclaBalanca: null, validadeBalanca: null, areaVenda: null, localVenda2: '', setorVenda1: '', setorVenda2: '',
      precoVenda: null, auto: false, compraAproximada: false,
      fiscal: null, transformacao: null, promocoes: [], conversoes: [], fotoUrl: null, criadoEm: null, cDe: 'DE', qtdEmbalagem: 1,
      ...p,
    };
    if (r.codigoBarras === undefined) r.codigoBarras = p.ean || null;
    if (r.localVenda1 === undefined) r.localVenda1 = p.localVenda || '';
    if (r.qtdEmbalagem == null) r.qtdEmbalagem = 1;
    if (!Array.isArray(r.promocoes)) r.promocoes = [];
    if (!Array.isArray(r.conversoes)) r.conversoes = [];
    delete r.ean; delete r.localVenda;
    return r;
  }
  function completar(d) {
    for (const c of COLECOES_NOVAS) if (!Array.isArray(d[c])) d[c] = [];
    if (!d.unidades.length) d.unidades = UNIDADES_INICIAIS.map(([sigla, nome]) => ({ id: 'un-' + sigla.toLowerCase(), sigla, nome, ativa: true }));
    d.produtos = d.produtos.map(normalizarProduto);
    return d;
  }

  /* ---------- Leitura e gravação ---------- */
  let dados = null;
  let erroLeitura = false;
  try {
    const salvo = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (salvo) {
      if (!COLECOES.every((c) => Array.isArray(salvo[c]))) throw new Error('formato');
      dados = completar(salvo);
    }
  } catch (e) {
    erroLeitura = true;
  }
  if (!dados) {
    dados = semente();
    // Grava a semente uma vez para que os ids fiquem estáveis entre recargas.
    if (!erroLeitura) { try { localStorage.setItem(KEY, JSON.stringify(dados)); } catch (e) { /* segue só em memória */ } }
  }

  /** Executa a mudança e grava; se algo falhar, restaura o estado anterior e retorna false. */
  function transacao(mudanca) {
    // Relê o que outra aba (ex.: página do fornecedor) pode ter gravado, para não sobrescrever.
    try {
      const atual = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (atual && COLECOES.every((c) => Array.isArray(atual[c]))) dados = completar(atual);
    } catch (e) { /* mantém a cópia em memória */ }
    const antes = structuredClone(dados);
    try {
      if (erroLeitura) throw new Error('leitura');
      const r = mudanca(dados);
      localStorage.setItem(KEY, JSON.stringify(dados));
      document.dispatchEvent(new CustomEvent('cicluz-compras-mudou'));
      return r === undefined ? true : r;
    } catch (e) {
      dados = antes;
      console.warn('Compras: alteração não salva', e);
      return false;
    }
  }

  // Mudança feita em outra aba: atualiza a cópia em memória e avisa as telas.
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY || !e.newValue) return;
    try {
      const novo = JSON.parse(e.newValue);
      if (COLECOES.every((c) => Array.isArray(novo[c]))) {
        dados = completar(novo);
        document.dispatchEvent(new CustomEvent('cicluz-compras-mudou', { detail: { externo: true } }));
      }
    } catch (err) { /* ignora valor inválido */ }
  });

  function restaurarExemplo() {
    if (erroLeitura) { localStorage.removeItem(KEY); erroLeitura = false; }
    dados = semente();
    return transacao(() => {});
  }

  /* ---------- Integrações com o resto do S2 ---------- */

  /** Grupos de Mercadorias (MER) do cadastro financeiro do S2. */
  function gruposMercadoria() {
    let lista = null;
    try { if (typeof financialGroups !== 'undefined') lista = financialGroups.mercadorias; } catch (e) { /* ainda não carregado */ }
    if (!lista) {
      try { lista = (JSON.parse(localStorage.getItem('cicluz-financial-hierarchy-v1') || 'null') || {}).mercadorias; } catch (e) { lista = null; }
    }
    return (Array.isArray(lista) ? lista : []).map((g) => ({ id: g.id, nome: g.name, ativo: g.active !== false, subgrupos: (g.children || []).map((s) => ({ id: s.id, nome: s.name, ativo: s.active !== false })) }));
  }
  function nomeGrupo(grupoId, subgrupoId) {
    const g = gruposMercadoria().find((x) => x.id === grupoId);
    if (!g) return grupoId ? 'Grupo não encontrado' : 'Sem grupo';
    const s = g.subgrupos.find((x) => x.id === subgrupoId);
    return s ? g.nome + ' › ' + s.nome : g.nome;
  }

  /** Locais do cadastro Área / Setor / Local do S2 (texto), com os locais usados nos exemplos. */
  function locais() {
    const nomes = new Set();
    try {
      const salvo = JSON.parse(localStorage.getItem('cicluz-location-tree-v1') || '[]');
      const raiz = Array.isArray(salvo) ? salvo : salvo.tree || [];
      const andar = (nos) => nos.forEach((n) => { if (n && n.name) nomes.add(n.name); andar(n.children || []); });
      andar(raiz);
    } catch (e) { /* sem árvore salva */ }
    dados.produtos.forEach((p) => { [p.areaEstoque, p.setorEstoque, p.localVenda1, p.localVenda2].forEach((v) => v && nomes.add(v)); });
    return [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  /* ---------- Consultas comuns ---------- */
  const fornecedor = (id) => dados.fornecedores.find((f) => f.id === id);
  const produto = (id) => dados.produtos.find((p) => p.id === id);
  const responsavel = (id) => (RESPONSAVEIS.find((u) => u.id === id) || { nome: 'Responsável não encontrado' }).nome;
  /** Preço-base vigente (valido_ate nulo). */
  const referencia = (produtoId) => {
    const pb = dados.precosBase.find((p) => p.produtoId === produtoId && !p.ate);
    return pb ? pb.valor : null;
  };
  function definirReferencia(d, produtoId, valor, origem) {
    const hoje = hojeIso();
    d.precosBase.filter((p) => p.produtoId === produtoId && !p.ate).forEach((p) => { p.ate = hoje; });
    d.precosBase.push({ id: novoId('pb'), produtoId, valor: +Number(valor).toFixed(4), origem, desde: hoje, ate: null });
  }
  /** Fornecedores aprovados no catálogo para o produto. */
  const fornecedoresDoProduto = (produtoId) =>
    dados.catalogo.filter((v) => v.produtoId === produtoId && v.status === 'aprovado').map((v) => fornecedor(v.fornecedorId)).filter(Boolean);

  /** Bolinhas: topo 20% de vendas, compras e lucro dos últimos 3 meses. */
  function bolinhas() {
    const D = window.CicluzComprasDominio;
    const ativos = dados.produtos.filter((p) => p.status === 'ativo');
    return {
      vende: D.topoDoRanking(ativos.map((p) => ({ id: p.id, valor: p.vendas3m }))),
      compra: D.topoDoRanking(ativos.map((p) => ({ id: p.id, valor: p.compras3m }))),
      lucro: D.topoDoRanking(ativos.map((p) => ({ id: p.id, valor: p.lucro3m }))),
    };
  }

  /** Locais de venda do produto (o S1 tem dois). */
  const locaisDeVenda = (p) => [p.localVenda1, p.localVenda2].filter(Boolean);
  const unidades = () => dados.unidades.filter((u) => u.ativa !== false).map((u) => u.sigla);

  window.CicluzComprasDados = {
    normalizarProduto, locaisDeVenda, unidades,
    KEY, RESPONSAVEIS,
    get dados() { return dados; },
    get erroLeitura() { return erroLeitura; },
    transacao, restaurarExemplo, novoId, agoraIso, hojeIso,
    gruposMercadoria, nomeGrupo, locais,
    fornecedor, produto, responsavel, referencia, definirReferencia, fornecedoresDoProduto, bolinhas,
  };
})();
