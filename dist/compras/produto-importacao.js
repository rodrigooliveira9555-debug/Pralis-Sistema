/*
 * Importação dos produtos do app de produtos (SISTEMA_PRALIS_PRODUTOS) para o MER - Produtos do S2.
 * Pedido do Rodrigo (áudio de 09/11/2026): TODOS os produtos da loja TNP. Os ATIVOS ficam no Compras (cicluz-compras-v1,
 * usados em compra, estoque e produção); os INATIVOS ficam no ARQUIVO compactado (cicluz-produtos-arquivo-v1, gzip +
 * base64: ~4.800 produtos em ~0,5 MB), porque os ~7.200 abertos não cabem no documento (4 MB) nem no iPad (~5 MB).
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
  /** Limite de segurança do documento cicluz-compras-v1: o servidor recusa acima de 4 MB e o iPad guarda ~5 MB no total. */
  const LIMITE_BYTES = 3.5 * 1024 * 1024;

  /* ---------- Normalização ---------- */
  /** Tira caracteres de formato (U+2060 do app, zero-width, BOM, hífen suave), acentos, caixa e espaços repetidos. */
  function limpar(s) {
    return String(s == null ? '' : s)
      .replace(/[­​-‏⁠-⁤﻿]/g, '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
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
      const grupoApp = texto(o.grupo).replace(/[­​-‏⁠-⁤﻿]/g, '');
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
  function registrosDosExemplos(d) {
    const saem = {};
    for (const [colecao, lista] of Object.entries(d)) {
      if (colecao === 'produtos' || !Array.isArray(lista)) continue;
      const n = lista.filter(citaExemplo).length;
      if (n) saem[colecao] = n;
    }
    return saem;
  }

  /** Índices por id do app e por código interno. */
  function indices(lista) {
    const porApp = new Map(); const porCodigo = new Map();
    const marcar = (p, i) => { if (ehExemplo(p.id)) return; if (p.appId) porApp.set(p.appId, i); if (p.codigoInterno) porCodigo.set(String(p.codigoInterno), i); };
    lista.forEach(marcar);
    // achar: posição do produto do app na lista; incluir: acrescenta e já indexa (sem refazer o índice inteiro).
    return { achar: (n) => (porApp.has(n.appId) ? porApp.get(n.appId) : porCodigo.get(String(n.codigoInterno))), incluir: (p) => { lista.push(p); marcar(p, lista.length - 1); } };
  }

  /** Campos que são do S2 (não vêm do app) e sobrevivem à reimportação. */
  const DO_S2 = ['id', 'saldo', 'liberadoCompra', 'conversoes', 'vendas3m', 'compras3m', 'lucro3m', 'pesavel', 'teclaBalanca', 'validadeBalanca', 'areaEstoque', 'areaVenda', 'vinculoManual'];
  function mesclar(atual, novo) {
    if (!atual) return { ...novo, saldo: 0, liberadoCompra: novo.status === 'ativo', conversoes: [], vendas3m: 0, compras3m: 0, lucro3m: 0, vinculoManual: {} };
    const r = { ...atual, ...novo };
    for (const c of DO_S2) if (c in atual) r[c] = atual[c];
    const manual = atual.vinculoManual || {};
    if (manual.grupo) { r.grupoId = atual.grupoId; r.subgrupoId = atual.subgrupoId; }
    if (manual.local) r.localId = atual.localId;
    return r;
  }

  /**
   * Grava a importação. `d` é o Compras (dentro de S.transacao) e `arquivo` é a lista aberta do arquivo de inativos.
   * - Ativo do app: atualiza no Compras; se estava no arquivo, volta para o Compras; senão, entra novo.
   * - Inativo do app: se já está no Compras (tem histórico lá), fica lá com status inativo; senão vai para o arquivo.
   * Tira os exemplos e os registros que os citam. Devolve os números e o arquivo novo (para compactar e gravar).
   */
  function aplicar(d, montado, arquivo = []) {
    for (const [colecao, lista] of Object.entries(d)) {
      if (!Array.isArray(lista)) continue;
      d[colecao] = colecao === 'produtos' ? lista.filter((p) => !ehExemplo(p.id)) : lista.filter((r) => !citaExemplo(r));
    }
    // A marca "arquivado" é só da tela (lista aberta); não vai para o Compras nem para o arquivo gravado.
    const novoArquivo = arquivo.filter((p) => !ehExemplo(p.id)).map(({ arquivado, ...p }) => p);
    const iC = indices(d.produtos); const iA = indices(novoArquivo);
    const r = { novos: 0, atualizados: 0, arquivados: 0, voltaramDoArquivo: 0 };
    const removidosDoArquivo = new Set();
    for (const n of montado.produtos) {
      const c = iC.achar(n);
      if (c != null) { d.produtos[c] = mesclar(d.produtos[c], n); r.atualizados++; continue; }
      const a = iA.achar(n);
      if (a != null && !removidosDoArquivo.has(a)) { iC.incluir({ ...mesclar(novoArquivo[a], n), liberadoCompra: true }); removidosDoArquivo.add(a); r.voltaramDoArquivo++; r.atualizados++; }
      else { iC.incluir({ ...mesclar(null, n), id: 'pi-' + n.codigoInterno }); r.novos++; }
    }
    for (const n of montado.inativos || []) {
      const c = iC.achar(n);
      if (c != null) { d.produtos[c] = { ...mesclar(d.produtos[c], n), liberadoCompra: false }; r.atualizados++; continue; }
      const a = iA.achar(n);
      if (a != null && !removidosDoArquivo.has(a)) { novoArquivo[a] = mesclar(novoArquivo[a], n); r.atualizados++; r.arquivados++; }
      else { iA.incluir({ ...mesclar(null, n), id: 'pi-' + n.codigoInterno }); r.novos++; r.arquivados++; }
    }
    const arquivoFinal = novoArquivo.filter((p, i) => !removidosDoArquivo.has(i));
    d.codigoInternoApp = Math.max(Number(d.codigoInternoApp) || 0, montado.maiorCodigoApp || 0);
    d.importacaoProdutos = { em: new Date().toISOString(), novos: r.novos, atualizados: r.atualizados, ativos: montado.produtos.length, arquivados: arquivoFinal.length };
    return { ...r, arquivo: arquivoFinal };
  }

  /**
   * Prévia (nada é gravado): simula em cópias e conta o que entra, o que atualiza, o que fica sem vínculo e o que sai.
   */
  function planejar(d, montado, { grupos, arvore, arquivo = [] } = {}) {
    const nos = nosDaArvore(arvore);
    const copia = JSON.parse(JSON.stringify(d));
    const exemplos = d.produtos.filter((p) => ehExemplo(p.id)).length;
    const registrosQueSaem = registrosDosExemplos(d);
    const r = aplicar(copia, montado, JSON.parse(JSON.stringify(arquivo)));
    const ativosFinais = copia.produtos.filter((p) => p.status === 'ativo' && (p.appId || p.codigoInterno));
    const alertas = ativosFinais.map((p) => alertasDeVinculo(p, grupos, nos));
    return {
      novos: r.novos, atualizados: r.atualizados, total: montado.produtos.length + (montado.inativos || []).length,
      ativos: montado.produtos.length, inativos: (montado.inativos || []).length, noArquivo: r.arquivo.length, voltaramDoArquivo: r.voltaramDoArquivo,
      semGrupo: alertas.filter((a) => a.semGrupo).length, semLocal: alertas.filter((a) => a.semLocal).length,
      conflitos: conflitosDeCodigo(montado.produtos.concat(montado.inativos || [])), exemplosQueSaem: exemplos, registrosQueSaem,
      ignorados: { outrasLojas: montado.contagem.total - (montado.contagem.porLoja[LOJA] || 0) },
      maiorCodigoApp: montado.maiorCodigoApp, simulado: { compras: copia, arquivo: r.arquivo },
    };
  }

  /** Refaz o casamento por nome (grupo e local) onde o vínculo não foi feito à mão. Devolve quantos mudaram. */
  function revincular(produtos, { grupos, arvore } = {}) {
    const nos = nosDaArvore(arvore);
    let mudou = 0;
    for (const p of produtos) {
      const manual = p.vinculoManual || {};
      const origem = p.origemApp || {};
      if (!manual.grupo && origem.grupo) {
        const g = casarGrupo(origem.grupo, grupos);
        const gid = g ? g.grupoId : null; const sid = g ? g.subgrupoId : null;
        if (gid !== (p.grupoId || null) || sid !== (p.subgrupoId || null)) { p.grupoId = gid; p.subgrupoId = sid; mudou++; }
      }
      if (!manual.local) {
        const textos = origem.locais ? origem.locais.split(' | ') : textosDeLocal(p);
        const lid = casarLocal(textos, nos);
        if (lid !== (p.localId || null)) { p.localId = lid; mudou++; }
      }
    }
    return mudou;
  }

  /* ---------- Arquivo compactado (gzip + base64) ---------- */
  const FORMATO = 'gzip-base64';
  async function fluxo(bytesEntrada, transformacao) {
    const s2 = new Blob([bytesEntrada]).stream().pipeThrough(transformacao);
    return new Uint8Array(await new Response(s2).arrayBuffer());
  }
  function paraBase64(u8) { let t = ''; for (let i = 0; i < u8.length; i += 0x8000) t += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(t); }
  function deBase64(b64) { const t = atob(b64); const u8 = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) u8[i] = t.charCodeAt(i); return u8; }
  /** Lista de produtos → texto do arquivo (o que vai para o localStorage e para o servidor). */
  async function compactar(lista) {
    const gz = await fluxo(new TextEncoder().encode(JSON.stringify(lista)), new CompressionStream('gzip'));
    return JSON.stringify({ versao: 1, formato: FORMATO, total: lista.length, dados: paraBase64(gz) });
  }
  /** Texto do arquivo → lista de produtos. Vazio ou ausente → lista vazia. */
  async function descompactar(textoArquivo) {
    if (!textoArquivo) return [];
    const o = JSON.parse(textoArquivo);
    if (!o || o.formato !== FORMATO || !o.dados) return [];
    return JSON.parse(new TextDecoder().decode(await fluxo(deBase64(o.dados), new DecompressionStream('gzip'))));
  }
  const totalDoArquivo = (textoArquivo) => { try { return (JSON.parse(textoArquivo || 'null') || {}).total || 0; } catch (e) { return 0; } };
  const compactacaoDisponivel = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

  const bytes = (valor) => (typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(JSON.stringify(valor)).length : Buffer.byteLength(JSON.stringify(valor), 'utf8'));

  return {
    EXEMPLOS, LOJA, LIMITE_BYTES, limpar, separarGrupo, casarGrupo, nosDaArvore, casarLocal,
    montarProdutos, conflitosDeCodigo, alertasDeVinculo, planejar, aplicar, revincular, bytes,
    compactar, descompactar, totalDoArquivo, compactacaoDisponivel, CHAVE_ARQUIVO: 'cicluz-produtos-arquivo-v1',
  };
});
