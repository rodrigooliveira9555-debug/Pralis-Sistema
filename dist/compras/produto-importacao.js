/*
 * Importação dos produtos do app de produtos (SISTEMA_PRALIS_PRODUTOS) para o MER - Produtos do S2.
 * Pedido do Rodrigo (áudio de 09/11/2026): TODOS os produtos da loja TNP. A tela monta os produtos a partir do backup
 * e manda para a API de produtos (docs/PRODUTOS_NO_SERVIDOR_PLANO.md), que casa grupo e local e não duplica.
 * Fonte: o Backup XLSX do app (Manutenção → Backup XLSX), abas Produtos e Promocoes.
 *
 * Herança do app: a BASE dá identidade, códigos, fiscal e como se compra; a cópia da TNP dá status, custo,
 * margem, venda, cálculo automático, estoques, setores e locais (nota 41, "Herança BASE → loja").
 * Vínculos: grupo de mercadorias do S2 e nó da árvore de locais do S2, casados por nome NORMALIZADO e EXATO
 * (sem caracteres invisíveis, acentos, caixa e espaços repetidos; prefixo "MER" ignorado). O que não casa
 * fica sem vínculo e vira alerta, com o texto original guardado para revincular depois.
 * Dinheiro entra como está gravado no app: nenhuma fórmula é aplicada aqui.
 * Sem DOM e sem armazenamento: testado em Node (tests/compras-importacao.cjs).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CicluzProdutoImportacao = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** Os 19 produtos fictícios da carga inicial do S2 (dados.js → semente). Saem quando os reais entram. */
  const EXEMPLOS = ['p-coca2l', 'p-guarana2l', 'p-cerveja', 'p-suco', 'p-mussarela', 'p-presunto', 'p-manteiga', 'p-requeijao',
    'p-farinha', 'p-fermento', 'p-acucar', 'p-oleo', 'p-cafe', 'p-saco-pao', 'p-sacola', 'p-chocolate', 'p-bala', 'p-agua', 'p-inativo'];
  const LOJA = 'TNP';
  const FAIXA_PRODUTO = 700000; // mesma fronteira de produto-regras.js (códigos ≥ 700000 não são de produto novo)

  /* ---------- Normalização ---------- */
  /** Tira caracteres de formato (U+2060 do app, zero-width, BOM, hífen suave), acentos, caixa e espaços repetidos. */
  function limpar(s) {
    return String(s == null ? '' : s)
      .replace(/[\u00AD\u200B-\u200F\u2060-\u2064\uFEFF]/g, '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ').trim().toUpperCase();
  }
  /** "MER BEBIDAS - SUCOS" → { grupo: 'BEBIDAS', sub: 'SUCOS' }. Sem " - ": só o grupo. */
  function separarGrupo(texto) {
    const t = limpar(texto).replace(/^MER\.?\s+/, '');
    if (!t) return null;
    const i = t.indexOf(' - ');
    return i >= 0 ? { grupo: t.slice(0, i).trim(), sub: t.slice(i + 3).trim() } : { grupo: t, sub: '' };
  }
  /**
   * Casa o texto do app com os grupos de mercadorias do S2 ({ id, nome, subgrupos: [{ id, nome }] }).
   * Só casamento exato depois de normalizar. Com subgrupo no texto, o subgrupo tem de existir também.
   */
  function casarGrupo(texto, grupos) {
    const g = separarGrupo(texto);
    if (!g) return null;
    const G = (grupos || []).find((x) => limpar(x.nome) === g.grupo);
    if (!G) return null;
    if (!g.sub) return { grupoId: G.id, subgrupoId: null };
    const S = (G.subgrupos || []).find((x) => limpar(x.nome) === g.sub);
    return S ? { grupoId: G.id, subgrupoId: S.id } : null;
  }

  /** Árvore de locais do S2 (cicluz-location-tree-v1: [{ id, name, children }]) achatada, com o caminho. */
  function nosDaArvore(arvore) {
    const nos = [];
    const andar = (lista, caminho) => (lista || []).forEach((n) => {
      if (!n || !n.name) return;
      const c = caminho.concat(n.name);
      nos.push({ id: n.id, nome: n.name, caminho: c, nivel: c.length });
      andar(n.children, c);
    });
    andar(Array.isArray(arvore) ? arvore : (arvore && arvore.tree) || [], []);
    return nos;
  }
  const VAZIOS = new Set(['', '-', '.']);
  /**
   * Casa os textos de local do app (setor de estoque, locais e setores de venda, nessa ordem) com um nó da árvore:
   * nome do nó ou caminho "ÁREA - SETOR - …" iguais depois de normalizar. Nome que aparece em mais de um nó é
   * ambíguo e não casa (vira alerta). Devolve o id do nó ou null.
   */
  function casarLocal(textos, nos) {
    for (const bruto of textos || []) {
      const t = limpar(bruto);
      if (VAZIOS.has(t)) continue;
      const achados = (nos || []).filter((n) => limpar(n.nome) === t || limpar(n.caminho.join(' - ')) === t);
      if (achados.length === 1) return achados[0].id;
    }
    return null;
  }
  const textosDeLocal = (o) => [o.setorEstoque, o.localVenda1, o.setorVenda1, o.localVenda2, o.setorVenda2].filter((t) => !VAZIOS.has(limpar(t)));

  /* ---------- Leitura das linhas do backup ---------- */
  const texto = (v) => (v == null ? '' : String(v).trim());
  const numero = (v) => {
    if (v === '' || v == null) return null;
    const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };
  const booleano = (v) => v === true || String(v).toUpperCase() === 'TRUE';
  const semVazios = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null));
  const MOTIVO_PADRAO = 'zerado-na-carga'; // estado fiscal cujo motivo é o mesmo texto fixo em todos (não se repete 2.000 vezes)

  function fiscalDe(b) {
    const f = semVazios({
      ncm: texto(b.ncm), cest: texto(b.cest), categoriaFiscal: texto(b.categoria), cstPisCofins: texto(b.cst_pis_cofins),
      aliquotaCheia: numero(b.aliquota_cheia), aliquotaFcp: numero(b.aliquota_fcp), aliquotaPis: numero(b.aliquota_pis),
      aliquotaCofins: numero(b.aliquota_cofins), reducaoIcms: numero(b.reducao_icms), icms: numero(b.icms),
      tributacaoSimples: texto(b.tributacao_simples), aliquotaSimples: numero(b.aliquota_simples), icmsRe: numero(b.icms_re),
      baseFiscal: texto(b.base_fiscal), codigoFiscal: texto(b.codigo_fiscal), produtoFiscal: texto(b.produto_fiscal),
      cstReforma: texto(b.cst_reforma), cClassTrib: texto(b.cclass_trib), aliquotaIbs: numero(b.aliquota_ibs), aliquotaCbs: numero(b.aliquota_cbs),
      origemFiscal: texto(b.origem_fiscal), aliquotaEcf: texto(b.aliquota_ecf), aliquotaEcfId: texto(b.aliquota_ecf_id),
      estado: texto(b.estado_fiscal), motivo: texto(b.estado_fiscal) === MOTIVO_PADRAO ? '' : texto(b.motivo_fiscal), pctNcm: numero(b.pct_ncm),
    });
    return Object.keys(f).length ? f : null;
  }
  /** Promoção do app (descontoPct já é fração) → formato do S2 (descontoFracao, dias como 7 booleanos, validaAte). */
  function promocaoDe(r) {
    const dias = texto(r.dias);
    return {
      tipo: texto(r.tipo) === 'desconto' ? 'desconto' : 'valor', valor: numero(r.valor), descontoFracao: numero(r.desconto_pct),
      horaInicio: texto(r.hora_inicio), horaFim: texto(r.hora_fim),
      dias: dias.length === 7 ? [...dias].map((c) => c.toUpperCase() === 'S') : [true, true, true, true, true, true, true],
      validaAte: texto(r.desconto_ate) || null,
    };
  }

  /**
   * Linhas do backup → produtos no formato do S2 (loja TNP, com a BASE por baixo): `produtos` são os ativos e
   * `inativos` vão para o arquivo.
   * grupos: S.gruposMercadoria(); arvore: o valor salvo de cicluz-location-tree-v1.
   */
  function montarProdutos(linhas, promocoes, { grupos, arvore } = {}) {
    const nos = nosDaArvore(arvore);
    const base = new Map();
    let maiorCodigoApp = 0;
    const contagem = { total: 0, porLoja: {}, tnpInativos: 0, tnpSemBase: 0 };
    for (const r of linhas) {
      contagem.total++;
      const loja = texto(r.loja);
      contagem.porLoja[loja] = (contagem.porLoja[loja] || 0) + 1;
      if (loja === 'BASE') base.set(texto(r.id), r);
      // O próximo código do S2 não pode repetir um código que o app (e o PDV) já usa, ativo ou não.
      const n = Number(texto(r.codigo_interno));
      if (Number.isFinite(n) && n < FAIXA_PRODUTO && n > maiorCodigoApp) maiorCodigoApp = n;
    }
    const promosPorProduto = new Map();
    for (const r of promocoes || []) {
      if (texto(r.loja) !== LOJA) continue;
      const id = texto(r.produto_id);
      if (!promosPorProduto.has(id)) promosPorProduto.set(id, []);
      promosPorProduto.get(id).push(r);
    }
    const produtos = []; const inativos = [];
    for (const t of linhas) {
      if (texto(t.loja) !== LOJA) continue;
      const ativo = texto(t.status) === 'ativo';
      const b = base.get(texto(t.base_product_id));
      if (!b) contagem.tnpSemBase++;
      const o = b || t;
      const tipo = texto(o.tipo) === 'transformacao' ? 'transformacao' : 'revenda';
      const locais = { setorEstoque: texto(t.setor_estoque), localVenda1: texto(t.local_venda_1), localVenda2: texto(t.local_venda_2), setorVenda1: texto(t.setor_venda_1), setorVenda2: texto(t.setor_venda_2) };
      const grupoApp = texto(o.grupo).replace(/[\u00AD\u200B-\u200F\u2060-\u2064\uFEFF]/g, '');
      const g = casarGrupo(grupoApp, grupos);
      const unidade = texto(o.medida_base) || 'UN';
      const promos = (promosPorProduto.get(texto(t.id)) || []).sort((a, z) => numero(a.indice) - numero(z.indice)).map(promocaoDe);
      (ativo ? produtos : inativos).push(semVazios({
        appId: texto(o.id), appLojaId: texto(t.id), appCodigo: texto(o.codigo),
        codigoInterno: texto(o.codigo_interno), codigoBarras: texto(o.codigo_barras) || null,
        nomeCatalogo: texto(o.nome), descricao: texto(o.nome), marca: texto(o.marca), tipo, status: ativo ? 'ativo' : 'inativo',
        grupoId: g ? g.grupoId : null, subgrupoId: g ? g.subgrupoId : null,
        quantidadeIndividual: numero(o.quantidade) || 0, unidadeIndividual: unidade, unidade,
        embalagem: texto(o.embalagem), cDe: texto(o.c_de) || 'DE', qtdEmbalagem: numero(o.qt_cad) || 1, medidaCompra: texto(o.medida_compra),
        compraAproximada: booleano(o.compra_aproximada), habilitarAjuda: booleano(o.habilitar_ajuda), fotoUrl: texto(o.foto_url) || null,
        estoqueMin: numero(t.estoque_min), estoqueMax: numero(t.estoque_max), ...locais,
        localId: casarLocal(textosDeLocal(locais), nos),
        custo: numero(t.custo), margem: numero(t.margem_pontual), precoVenda: numero(t.venda_pontual), auto: booleano(t.calculo_automatico),
        transformacao: tipo === 'transformacao' ? semVazios({ precisao: texto(o.transformacao_precisao), quantidade: numero(o.transformacao_qtd), unidade: texto(o.transformacao_unidade), produtoReceituario: texto(o.produto_receituario), refReceituario: texto(o.ref_receituario) }) : null,
        fiscal: fiscalDe(o), promocoes: promos, criadoEm: texto(o.cadastrado_em) || null,
        origemApp: semVazios({ grupo: grupoApp, locais: textosDeLocal(locais).join(' | ') }),
      }));
    }
    contagem.tnpInativos = inativos.length;
    return { produtos, inativos, maiorCodigoApp, contagem };
  }

  /* ---------- Conferências ---------- */
  function conflitosDeCodigo(produtos) {
    const repetidos = (campo) => {
      const vistos = new Map();
      produtos.forEach((p) => { const v = p[campo]; if (v) vistos.set(v, (vistos.get(v) || 0) + 1); });
      return [...vistos].filter(([, n]) => n > 1).map(([v]) => v);
    };
    return {
      internoRepetido: repetidos('codigoInterno'),
      barrasRepetido: repetidos('codigoBarras'),
      internoForaDaFaixa: produtos.filter((p) => Number(p.codigoInterno) >= FAIXA_PRODUTO).length,
      semCodigoInterno: produtos.filter((p) => !p.codigoInterno).length,
    };
  }
  /** Alerta de vínculo (pedido do Rodrigo): sem grupo de mercadorias do S2 e/ou sem local da árvore do S2. */
  function alertasDeVinculo(p, grupos, nos) {
    const g = p.grupoId && (grupos || []).find((x) => x.id === p.grupoId);
    const semGrupo = !g || (p.subgrupoId && !g.subgrupos.some((s) => s.id === p.subgrupoId));
    const semLocal = !p.localId || !(nos || []).some((n) => n.id === p.localId);
    return { semGrupo: !!semGrupo, semLocal };
  }
  const ehExemplo = (id) => EXEMPLOS.includes(id);
  /** Registro de teste preso a um produto de exemplo: cita o id dele em qualquer campo (produtoId, itens, listas). */
  const citaExemplo = (r) => { const t = JSON.stringify(r); return EXEMPLOS.some((id) => t.includes('"' + id + '"')); };
  /** Tira os produtos de exemplo e os registros que os citam (sem mexer em mais nada). Devolve quantos saíram. */
  function tirarExemplos(d) {
    let saiu = 0;
    for (const [colecao, lista] of Object.entries(d)) {
      if (!Array.isArray(lista)) continue;
      const fica = colecao === 'produtos' ? lista.filter((p) => !ehExemplo(p.id)) : lista.filter((r) => !citaExemplo(r));
      saiu += lista.length - fica.length;
      d[colecao] = fica;
    }
    return saiu;
  }


  return {
    EXEMPLOS, LOJA, limpar, separarGrupo, casarGrupo, nosDaArvore, casarLocal,
    montarProdutos, conflitosDeCodigo, alertasDeVinculo, tirarExemplos,
  };
});
