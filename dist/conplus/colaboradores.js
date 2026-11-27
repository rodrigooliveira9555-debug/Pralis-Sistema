/*
 * Área ConPlus — colaboradores ativos vindos da ConPlus (Questor), numa lista própria para tratar depois (pedido do Marco,
 * 27/11/2026: "uma tela só para cadastrar lá, para tratar os dados depois"). NÃO grava no cadastro de pessoas
 * (cicluz-pessoas-v1): fica em cicluz-conplus-v1.colaboradores, só neste aparelho (P-11). Sem DOM.
 * Origem: a consulta de contratos do Questor Zen (nFpaDCFuncContrato) exportada em CSV, uma linha por contrato.
 * Campos guardados: empresa, filial, contrato, nome, CPF, PIS, admissão, demissão e tipo de contrato. Dados bancários e e-mail
 * ficam de fora (o mínimo necessário). Testado em tests/conplus-dominio.cjs.
 */
(function (root, factory) {
  const isNode = typeof module === 'object' && module.exports;
  const R = isNode ? require('../field-validation.js') : root.CicluzFieldRules;
  const api = factory(R);
  if (isNode) module.exports = api;
  else root.CicluzConplusColaboradores = api;
}(typeof self !== 'undefined' ? self : this, function (R) {
  'use strict';
  const digitos = (v) => String(v == null ? '' : v).replace(/\D/g, '');
  const dobrar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const DATA = /^\d{2}\/\d{2}\/\d{4}$/;
  const dataOk = (t) => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t); return Boolean(m) && R.dateValid(m[3] + '-' + m[2] + '-' + m[1]); };
  const cpfFormatado = (v) => { const d = digitos(v); return d.length === 11 ? d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '-' + d.slice(9) : String(v || '').trim(); };

  // Cabeçalho aceito (com ou sem os nomes do Questor): o primeiro nome que casar vale.
  const COLUNAS = {
    cnpj: ['cnpj'], empresa: ['codigoempresa', 'empresa'], filial: ['codigoestab', 'filial', 'estab'],
    contrato: ['codigofunccontr', 'contrato', 'contratodoempregado'], nome: ['nomefunc', 'nome', 'nomefuncionario'],
    cpf: ['cpffunc', 'cpf'], pis: ['pisfunc', 'pis'], admissao: ['dataadm', 'admissao', 'datadeadmissao'],
    demissao: ['datadem', 'demissao', 'datadedemissao'], tipoContrato: ['codigotipocontr', 'tipocontrato'], descrTipo: ['descrtipocontr', 'descricao'],
  };

  /** Linhas de um CSV (já separadas) → colaboradores. Devolve { itens, erros }. */
  function colaboradoresDoCsv(linhas, { cnpjPadrao = '' } = {}) {
    const itens = []; const erros = [];
    if (!linhas || linhas.length < 2) return { itens, erros: ['O arquivo precisa de uma linha de cabeçalho e ao menos uma linha de dados.'] };
    const cab = linhas[0].map(dobrar);
    const idx = Object.fromEntries(Object.entries(COLUNAS).map(([k, nomes]) => [k, cab.findIndex((h) => nomes.includes(h))]));
    const faltam = ['contrato', 'nome', 'cpf'].filter((k) => idx[k] < 0);
    if (faltam.length) return { itens, erros: ['Faltam as colunas: ' + faltam.map((k) => COLUNAS[k][0].toUpperCase()).join(', ') + '.'] };
    const vistos = new Set();
    linhas.slice(1).forEach((l, k) => {
      const v = (c) => (idx[c] >= 0 ? String(l[idx[c]] == null ? '' : l[idx[c]]).trim() : '');
      const linha = k + 2;
      const x = { cnpj: v('cnpj') || cnpjPadrao, empresa: v('empresa'), filial: v('filial'), contrato: v('contrato'), nome: v('nome').replace(/\s+/g, ' '),
        cpf: cpfFormatado(v('cpf')), pis: v('pis'), admissao: v('admissao'), demissao: v('demissao'), tipoContrato: v('tipoContrato'), descrTipo: v('descrTipo') };
      const p = problemaDoColaborador(x);
      if (p) { erros.push('Linha ' + linha + ': ' + p); return; }
      const chave = digitos(x.cnpj) + '|' + x.empresa + '|' + x.contrato;
      if (vistos.has(chave)) { erros.push('Linha ' + linha + ': contrato ' + x.contrato + ' repetido no arquivo.'); return; }
      vistos.add(chave); itens.push(x);
    });
    return { itens, erros };
  }

  function problemaDoColaborador(x) {
    if (!/^\d+$/.test(x.contrato)) return 'o código do contrato (CODIGOFUNCCONTR) leva só números';
    if (!x.nome) return 'sem nome';
    if (!R.cpfValid(x.cpf)) return 'CPF inválido';
    if (x.cnpj && !R.cnpjValid(x.cnpj)) return 'CNPJ inválido';
    if (x.admissao && !dataOk(x.admissao)) return 'data de admissão inválida (use dd/mm/aaaa)';
    if (x.demissao && !dataOk(x.demissao)) return 'data de demissão inválida (use dd/mm/aaaa)';
    return '';
  }

  const chaveDe = (x) => digitos(x.cnpj) + '|' + String(x.empresa || '') + '|' + String(x.contrato);
  /**
   * Junta o arquivo com o que já está guardado: novo contrato entra; contrato que já existe é atualizado (o nome e o CPF que o
   * Questor mandar valem). Nada é apagado: contrato que não veio fica como estava (pode ter sido demitido; o arquivo diz).
   * Devolve { lista, novos, atualizados, iguais } sem mexer na lista original.
   */
  function juntar(atual, itens, { agora = '', novoId = (i) => 'cc-' + i } = {}) {
    const lista = (atual || []).map((x) => ({ ...x }));
    const porChave = new Map(lista.map((x, i) => [chaveDe(x), i]));
    let novos = 0; let atualizados = 0; let iguais = 0;
    itens.forEach((it, n) => {
      const k = chaveDe(it);
      if (porChave.has(k)) {
        const i = porChave.get(k); const antes = lista[i];
        const campos = ['nome', 'cpf', 'pis', 'admissao', 'demissao', 'tipoContrato', 'descrTipo', 'filial'];
        const mudou = campos.some((c) => String(antes[c] || '') !== String(it[c] || ''));
        if (mudou) { lista[i] = { ...antes, ...it, atualizadoEm: agora }; atualizados++; } else iguais++;
      } else {
        lista.push({ id: novoId(n), ...it, importadoEm: agora, atualizadoEm: agora });
        porChave.set(k, lista.length - 1); novos++;
      }
    });
    return { lista, novos, atualizados, iguais };
  }

  /** Vínculos CPF ↔ contrato que faltam (para a ligação dos relatórios da folha). */
  function vinculosQueFaltam(colaboradores, vinculos) {
    const tem = new Set((vinculos || []).map((v) => digitos(v.cnpj) + '|' + String(v.contrato).trim()));
    return (colaboradores || []).filter((c) => c.cnpj && !tem.has(digitos(c.cnpj) + '|' + c.contrato))
      .map((c) => ({ cnpj: c.cnpj, contrato: c.contrato, cpf: c.cpf, nome: c.nome }));
  }

  /** Situação no cadastro de pessoas do S2 (só leitura): 'no-cadastro', 'fora' ou 'duplicado' (mais de uma pessoa com o CPF). */
  function situacaoNoCadastro(colaborador, pessoas) {
    const d = digitos(colaborador.cpf);
    const n = (pessoas || []).filter((p) => digitos(p.cpf) === d).length;
    return n === 0 ? 'fora' : n === 1 ? 'no-cadastro' : 'duplicado';
  }
  const mascararCpf = (cpf) => { const d = digitos(cpf); return d.length === 11 ? '***.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '-**' : ''; };

  return { colaboradoresDoCsv, problemaDoColaborador, juntar, vinculosQueFaltam, situacaoNoCadastro, mascararCpf, chaveDe };
}));
