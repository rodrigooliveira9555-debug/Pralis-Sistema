/*
 * Fiscal do produto puxado pelo grupo — porte das funções puras de shared/src/produtos/fiscal-motor.ts do S1
 * (regra do José, 27/10/2026: ninguém digita imposto; o grupo decide). No S1 as tabelas vêm da planilha
 * fiscal da loja; aqui vêm de TABELAS_EXEMPLO (fictícias, só para o protótipo).
 *
 * Grupo no S2: grupo e subgrupo são cadastros separados. A chave procurada é "GRUPO - SUBGRUPO" (o mesmo
 * formato do nome de grupo do S1) e, se não houver regra para ela, "GRUPO".
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CicluzProdutoFiscal = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function normalizarGrupoFiscal(valor) {
    return String(valor ?? '').normalize('NFKC').replace(/[⁠​-‍﻿]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
  }
  const chaveDeCodigo = (v) => String(v ?? '').replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  const ncmFiscal = (v) => { const d = String(v ?? '').replace(/\D/g, ''); return d ? d.padStart(8, '0') : ''; };
  /** EAN inteiro e, se for etiqueta de balança (13 dígitos começando com 2), também o PLU (dígitos 2 a 6). */
  function candidatosDeCodigo(codigoBarras) {
    const c = chaveDeCodigo(codigoBarras);
    if (!c) return [];
    const lista = [c];
    if (c.length === 13 && c.startsWith('2')) lista.push(chaveDeCodigo(c.slice(1, 6)));
    return lista;
  }
  const chaveNomeEcf = (v) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();

  function regraDoGrupo(tabelas, grupo) {
    const chave = normalizarGrupoFiscal(grupo);
    return tabelas.grupos.find((r) => normalizarGrupoFiscal(r.grupo) === chave) || null;
  }

  /** `classify` do S1. null quando o grupo não tem regra. */
  function classificarPorGrupo(tabelas, grupo, codigoBarras, nome) {
    const regra = regraDoGrupo(tabelas, grupo);
    if (!regra) return null;
    const cand = candidatosDeCodigo(codigoBarras);
    const indice = cand.findIndex((c) => tabelas.produtos.has(c));
    const produto = indice >= 0 ? tabelas.produtos.get(cand[indice]) : null;
    const cst = (produto && produto.cst) || regra.cstPisCofins;
    const regraCst = tabelas.cst.get(cst);
    const reforma = produto && produto.ncm ? tabelas.reforma.get(produto.ncm) : null;
    const ecf = nome && tabelas.ecf ? tabelas.ecf.porNome.get(chaveNomeEcf(nome)) || null : null;
    return {
      ...regra,
      cstPisCofins: cst,
      icmsRe: produto ? produto.icmsRe : regra.icmsRe,
      tributacaoSimples: (regraCst && regraCst.tributacao) || regra.tributacaoSimples,
      aliquotaSimples: regraCst ? regraCst.aliquota : regra.aliquotaSimples,
      ncm: produto ? produto.ncm : null,
      codigoFiscal: produto ? produto.codigo : null,
      produtoFiscal: produto ? produto.nome : null,
      cstReforma: (reforma && reforma.cst) || null,
      cClassTrib: (reforma && reforma.cClassTrib) || null,
      aliquotaIbs: reforma ? reforma.ibs : null,
      aliquotaCbs: reforma ? reforma.cbs : null,
      origem: produto ? (indice === 0 ? 'produto' : 'plu_balanca') : 'grupo',
      ecf,
    };
  }

  /** `classificar` do S1: nunca lança; diz o porquê. */
  function classificarFiscal(tabelas, { nome, codigoBarras, grupo }) {
    const g = String(grupo ?? '').trim();
    if (!g) return { estado: 'pendente_grupo_invalido', motivo: 'Produto sem grupo de mercadorias: não há regra fiscal para aplicar.', classificacao: null, conflitos: [] };
    if (!tabelas) return { estado: 'fonte_indisponivel', motivo: 'Não consegui ler a tabela fiscal agora. O cadastro foi salvo; o fiscal será completado sozinho.', classificacao: null, conflitos: [] };
    const classificacao = classificarPorGrupo(tabelas, g, codigoBarras, nome);
    if (!classificacao) return { estado: 'pendente_grupo_invalido', motivo: 'O grupo "' + g + '" não está entre as regras fiscais oficiais. Corrija o grupo.', classificacao: null, conflitos: [] };
    const chave = nome ? chaveNomeEcf(nome) : '';
    if (!chave && !classificacao.ecf) return { estado: 'parcial', motivo: 'Sem nome para consultar o cadastro de ECF: só a regra do grupo foi aplicada.', classificacao, conflitos: [] };
    if (!classificacao.ecf && tabelas.ecf.ambiguos.has(chave)) return { estado: 'pendente_ambiguo', motivo: 'Há mais de um registro de ECF com este nome. Escolher um seria sortear imposto.', classificacao, conflitos: [] };
    if (!classificacao.ecf) return { estado: 'parcial', motivo: 'Este produto não existe no cadastro de ECF: alíquota e código de ECF ficam em branco até serem cadastrados lá.', classificacao, conflitos: [] };
    const cstEcf = classificacao.ecf.cstEcf;
    if (cstEcf && cstEcf !== '99' && cstEcf !== classificacao.cstPisCofins) {
      return { estado: 'pendente_conflito', motivo: 'O grupo diz CST ' + classificacao.cstPisCofins + ' e o cadastro de ECF diz CST ' + cstEcf + '. Nenhum dos dois foi escolhido sozinho: precisa de decisão fiscal.', classificacao, conflitos: [{ campo: 'cstPisCofins', doGrupo: classificacao.cstPisCofins, doEcf: cstEcf }] };
    }
    return { estado: 'completo', motivo: 'Fiscal completo.', classificacao, conflitos: [] };
  }

  /** Os 27 campos do bloco fiscal do S1 (FiscalDoProduto), com rótulo. */
  const CAMPOS_FISCAIS = [
    ['ncm', 'NCM'], ['cest', 'CEST'], ['categoriaFiscal', 'Categoria fiscal'], ['cstPisCofins', 'CST PIS/COFINS'],
    ['aliquotaCheia', 'Alíquota cheia (%)'], ['aliquotaFcp', 'Alíquota FCP (%)'], ['aliquotaPis', 'Alíquota PIS (%)'], ['aliquotaCofins', 'Alíquota COFINS (%)'],
    ['reducaoIcms', 'Redução ICMS (%)'], ['icms', 'ICMS (%)'], ['tributacaoSimples', 'Tributação Simples'], ['aliquotaSimples', 'Alíquota Simples (%)'],
    ['icmsRe', 'ICMS RE (%)'], ['baseFiscal', 'Base fiscal'], ['codigoFiscal', 'Código fiscal'], ['produtoFiscal', 'Produto fiscal'],
    ['cstReforma', 'CST reforma'], ['cClassTrib', 'cClassTrib'], ['aliquotaIbs', 'Alíquota IBS (%)'], ['aliquotaCbs', 'Alíquota CBS (%)'],
    ['origemFiscal', 'Origem do fiscal'], ['aliquotaEcf', 'Alíquota ECF'], ['aliquotaEcfId', 'ID da alíquota ECF'], ['estado', 'Estado do fiscal'],
    ['motivo', 'Motivo'], ['conferidoEm', 'Conferido em'], ['pctNcm', '% NCM'],
  ];
  /** Campos que uma pessoa digita (no S1, só admin). Todo o resto é derivado. */
  const FISCAIS_MANUAIS = ['ncm', 'cest', 'categoriaFiscal', 'aliquotaCheia', 'aliquotaFcp', 'aliquotaPis', 'aliquotaCofins', 'reducaoIcms', 'icms'];
  const ESTADOS = { nao_classificado: 'Não classificado', completo: 'Completo', parcial: 'Parcial', pendente_grupo_invalido: 'Grupo sem regra', pendente_sem_correspondencia: 'Sem correspondência', pendente_ambiguo: 'Ambíguo', pendente_conflito: 'Conflito', pendente_fonte_da_loja: 'Sem fonte da loja', fonte_indisponivel: 'Fonte indisponível' };

  /** `aplicarResultadoFiscal` do S1: o derivado é sempre sobrescrito; o do ECF só onde casou. */
  function aplicarResultadoFiscal(anterior, resultado) {
    const fiscal = { ...(anterior || {}) };
    if (!resultado.classificacao) return { ...fiscal, estado: resultado.estado, motivo: resultado.motivo };
    const r = resultado.classificacao; const e = r.ecf;
    const pick = (campo) => (e && e[campo] != null ? e[campo] : fiscal[campo] ?? null);
    return {
      ...fiscal,
      ncm: r.ncm ?? fiscal.ncm ?? null, cstPisCofins: r.cstPisCofins,
      reducaoIcms: pick('reducaoIcms'), aliquotaCheia: pick('aliquotaCheia'), aliquotaFcp: pick('aliquotaFcp'), aliquotaPis: pick('aliquotaPis'), aliquotaCofins: pick('aliquotaCofins'),
      aliquotaEcf: e ? e.aliquotaEcf ?? null : null, aliquotaEcfId: e ? e.aliquotaEcfId ?? null : null,
      categoriaFiscal: e && e.categoria != null ? e.categoria : fiscal.categoriaFiscal ?? null,
      icms: pick('icms'), cest: pick('cest'), pctNcm: pick('pctNcm'),
      tributacaoSimples: r.tributacaoSimples, aliquotaSimples: r.aliquotaSimples, icmsRe: r.icmsRe, baseFiscal: r.baseFiscal,
      codigoFiscal: r.codigoFiscal, produtoFiscal: r.produtoFiscal, cstReforma: r.cstReforma, cClassTrib: r.cClassTrib,
      aliquotaIbs: r.aliquotaIbs, aliquotaCbs: r.aliquotaCbs, origemFiscal: r.origem, estado: resultado.estado, motivo: resultado.motivo,
    };
  }

  /** Grupo do S2 → chaves de regra: "GRUPO - SUBGRUPO" primeiro, depois "GRUPO". */
  function grupoParaFiscal(tabelas, nomeGrupo, nomeSubgrupo) {
    if (nomeGrupo && nomeSubgrupo) {
      const comSub = nomeGrupo + ' - ' + nomeSubgrupo;
      if (regraDoGrupo(tabelas, comSub)) return comSub;
    }
    return nomeGrupo || '';
  }
  /** Margem padrão do grupo (fração) vinda da regra fiscal do grupo, como no S1. */
  function margemPadraoDoGrupo(tabelas, grupo) {
    const r = grupo ? regraDoGrupo(tabelas, grupo) : null;
    return r && r.margemPadrao != null ? r.margemPadrao : null;
  }

  /* ---------- Tabelas fictícias do protótipo ---------- */
  const regra = (grupo, cstPisCofins, tributacaoSimples, aliquotaSimples, icmsRe, baseFiscal, margemPadrao) => ({ grupo, cstPisCofins, tributacaoSimples, aliquotaSimples, icmsRe, baseFiscal, margemPadrao });
  const ecf = (categoria, ncm, cest, aliquotaCheia, aliquotaEcf, cstEcf) => ({ reducaoIcms: 0, aliquotaCheia, aliquotaFcp: 2, aliquotaPis: 1.65, aliquotaCofins: 7.6, aliquotaEcf, aliquotaEcfId: aliquotaEcf ? 'T' + String(aliquotaCheia).replace('.', '') : null, categoria, icms: aliquotaCheia, cest, ncm, cstEcf, pctNcm: 30.2 });
  const TABELAS_EXEMPLO = {
    grupos: [
      regra('BEBIDAS', '04', 'ST', 0, 18, 'MONOFÁSICO', 0.35),
      regra('BEBIDAS - CERVEJAS', '04', 'ST', 0, 25, 'MONOFÁSICO', 0.4),
      regra('BEBIDAS - SUCOS', '01', 'TRIBUTADO', 4.5, 18, 'NORMAL', 0.35),
      regra('FRIOS', '01', 'TRIBUTADO', 4.5, 12, 'NORMAL', 0.3),
      regra('LATICÍNIOS', '01', 'TRIBUTADO', 4.5, 12, 'NORMAL', 0.3),
      regra('MERCEARIA', '01', 'TRIBUTADO', 4.5, 18, 'NORMAL', 0.25),
      regra('MAT. PRIMA', '06', 'ISENTO', 0, 0, 'ISENTO', 0.2),
      regra('EMBALAGENS', '49', 'USO E CONSUMO', 0, 18, 'NORMAL', null),
      regra('BOMBONIERI', '01', 'TRIBUTADO', 4.5, 18, 'NORMAL', 0.4),
      regra('CIGARROS', '04', 'ST', 0, 25, 'MONOFÁSICO', 0.15),
      regra('SORVETES', '01', 'TRIBUTADO', 4.5, 18, 'NORMAL', 0.45),
      regra('BISCOITOS', '01', 'TRIBUTADO', 4.5, 18, 'NORMAL', 0.35),
      regra('CONGELADOS', '01', 'TRIBUTADO', 4.5, 18, 'NORMAL', 0.4),
      regra('POLPA DE FRUTA', '01', 'TRIBUTADO', 4.5, 18, 'NORMAL', 0.5),
      regra('FAB. PRÓPRIA', '01', 'TRIBUTADO', 4.5, 7, 'NORMAL', 0.7),
      regra('FAB. PRÓPRIA BASE', '06', 'ISENTO', 0, 0, 'ISENTO', null),
      regra('MATERIAL LIMPEZA', '49', 'USO E CONSUMO', 0, 18, 'NORMAL', null),
    ],
    produtos: new Map([
      ['7891000000001', { codigo: 'F-001', ncm: '22021000', cst: '04', icmsRe: 18, nome: 'REFRIGERANTE' }],
      ['7891000039594', { codigo: 'F-002', ncm: '22030000', cst: '04', icmsRe: 25, nome: 'CERVEJA' }],
    ]),
    reforma: new Map([
      ['22021000', { cst: '000', cClassTrib: '000001', ibs: 0.1, cbs: 0.9 }],
      ['22030000', { cst: '000', cClassTrib: '000001', ibs: 0.1, cbs: 0.9 }],
    ]),
    cst: new Map([['01', { tributacao: 'TRIBUTADO', aliquota: 4.5 }], ['04', { tributacao: 'MONOFÁSICO', aliquota: 0 }], ['06', { tributacao: 'ALÍQUOTA ZERO', aliquota: 0 }]]),
    ecf: {
      porNome: new Map([
        [chaveNomeEcf('REFRIGERANTE COLA'), ecf('BEBIDAS', '22021000', '0300700', 18, 'F', '04')],
        [chaveNomeEcf('CERVEJA LATA'), ecf('BEBIDAS', '22030000', '0302100', 25, 'F', '04')],
        [chaveNomeEcf('MUSSARELA PECA'), ecf('FRIOS', '04061010', null, 12, 'T12', '01')],
        [chaveNomeEcf('CAFE TORRADO E MOIDO'), ecf('MERCEARIA', '09012100', null, 7, 'T07', '01')],
        [chaveNomeEcf('SUCO UVA INTEGRAL'), ecf('BEBIDAS', '20096100', '1701000', 18, 'T18', '04')],
      ]),
      ambiguos: new Set([chaveNomeEcf('CHOCOLATE AO LEITE')]),
      indisponivel: false,
    },
  };

  /** Calcula o fiscal do produto do S2 pelo grupo (e subgrupo, quando houver regra). */
  function fiscalDoProduto({ anterior, nome, codigoBarras, nomeGrupo, nomeSubgrupo, tabelas = TABELAS_EXEMPLO }) {
    const grupo = grupoParaFiscal(tabelas, nomeGrupo, nomeSubgrupo);
    const resultado = classificarFiscal(tabelas, { nome, codigoBarras, grupo });
    return { fiscal: aplicarResultadoFiscal(anterior, resultado), resultado, grupo, margemPadrao: margemPadraoDoGrupo(tabelas, grupo) };
  }

  return {
    normalizarGrupoFiscal, candidatosDeCodigo, chaveNomeEcf, ncmFiscal, regraDoGrupo, classificarPorGrupo, classificarFiscal,
    aplicarResultadoFiscal, grupoParaFiscal, margemPadraoDoGrupo, fiscalDoProduto, CAMPOS_FISCAIS, FISCAIS_MANUAIS, ESTADOS, TABELAS_EXEMPLO,
  };
});
