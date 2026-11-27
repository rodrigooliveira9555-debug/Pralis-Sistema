/*
 * Área ConPlus (laboratório, 27/11/2026) — regras puras da troca de arquivos com o DP da ConPlus (Questor), "como se fosse a
 * API, mas por arquivo" (decisão do Marco de 27/11/2026: sem a API paga). Sem DOM e sem armazenamento.
 *   - montar: valores → linhas A/B/C/D (admissão) e E (eventos), separadas por ";", sem cabeçalho, CR+LF;
 *   - windows1252: o arquivo vai em Windows-1252 (ANSI), como o Questor; caractere fora dele é erro, nunca "?" calado;
 *   - ler + validar: a mesma conferência que a API faz antes do Questor (doc, seção 09) e os formatos da seção 05,
 *     apontando linha e coluna. O arquivo gerado é sempre conferido lendo-o de volta: um só caminho de conferência;
 *   - SEQ dos eventos: gerado uma vez por (CNPJ, período, contrato) e guardado; nunca reaproveitado;
 *   - de-para (códigos do Questor) e vínculo CPF ↔ contrato (os relatórios não trazem CPF).
 * Testado em tests/conplus-dominio.cjs.
 */
(function (root, factory) {
  const isNode = typeof module === 'object' && module.exports;
  const L = isNode ? require('./layout.js') : root.CicluzConplusLayout;
  const R = isNode ? require('../field-validation.js') : root.CicluzFieldRules;
  const api = factory(L, R);
  if (isNode) module.exports = api;
  else root.CicluzConplusDominio = api;
}(typeof self !== 'undefined' ? self : this, function (L, R) {
  'use strict';

  const FIM_DE_LINHA = '\r\n';
  const LIMITE_BYTES = 5242880; // 5 MB: acima disso a API devolve 413
  const digitos = (v) => String(v == null ? '' : v).replace(/\D/g, '');

  /* ============================== Windows-1252 ============================== */
  // 0x80–0x9F do Windows-1252 (o resto do 0x00–0xFF é igual ao Unicode). 0x81, 0x8D, 0x8F, 0x90 e 0x9D não existem.
  const ALTOS = { 0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E, 0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6, 0x89: 0x2030, 0x8A: 0x0160, 0x8B: 0x2039, 0x8C: 0x0152, 0x8E: 0x017D, 0x91: 0x2018, 0x92: 0x2019, 0x93: 0x201C, 0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014, 0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A, 0x9C: 0x0153, 0x9E: 0x017E, 0x9F: 0x0178 };
  const PARA_BYTE = new Map(Object.entries(ALTOS).map(([b, u]) => [u, Number(b)]));
  /** Caracteres do texto que não existem no Windows-1252 (cada um uma vez). */
  function foraDo1252(texto) {
    const fora = new Set();
    for (const ch of String(texto)) {
      const u = ch.codePointAt(0);
      if (!((u <= 0x7F) || (u >= 0xA0 && u <= 0xFF) || PARA_BYTE.has(u))) fora.add(ch);
    }
    return [...fora];
  }
  /** Texto → bytes Windows-1252. Lança erro se houver caractere fora dele (a tela confere antes com foraDo1252). */
  function paraWindows1252(texto) {
    const s = String(texto); const out = new Uint8Array(s.length); let i = 0;
    for (const ch of s) {
      const u = ch.codePointAt(0);
      if (u <= 0x7F || (u >= 0xA0 && u <= 0xFF)) out[i++] = u;
      else if (PARA_BYTE.has(u)) out[i++] = PARA_BYTE.get(u);
      else throw new Error('Caractere fora do Windows-1252: ' + ch);
    }
    return out.slice(0, i);
  }
  /** Bytes → texto. UTF-8 válido com acento é lido como UTF-8 (e avisado: o Questor espera Windows-1252); senão, Windows-1252. */
  function lerBytes(bytes) {
    const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let alto = false; for (const x of b) if (x > 0x7F) { alto = true; break; }
    if (alto && typeof TextDecoder !== 'undefined') {
      try { return { texto: new TextDecoder('utf-8', { fatal: true }).decode(b).replace(/^﻿/, ''), codificacao: 'UTF-8' }; } catch (e) { /* não é UTF-8 */ }
    }
    let t = '';
    for (const x of b) t += String.fromCharCode(ALTOS[x] || x);
    return { texto: t, codificacao: alto ? 'Windows-1252' : 'ASCII (serve como Windows-1252)' };
  }

  /* ============================== Montagem ============================== */
  /**
   * Uma linha de um registro a partir de valores por coluna ({ n: valor }). Colunas fixas e derivadas são preenchidas aqui
   * (identificador, CNPJ da empresa, C3 vazia, D3/D4 = CPF e admissão do A, E9–E13): a tela não tem como errá-las.
   */
  function montarLinha(reg, valores, { cnpj = L.CNPJ_HOMOLOGACAO, titular = {} } = {}) {
    const cols = L.colunas(reg); const v = valores || {};
    const partes = cols.map((c) => {
      if (c.fixo === 'valor') return c.valor == null ? '' : String(c.valor);
      if (c.fixo === 'cnpj') return String(cnpj);
      if (c.deriva) return String(titular[c.deriva[1]] == null ? '' : titular[c.deriva[1]]);
      return String(v[c.n] == null ? '' : v[c.n]).trim();
    });
    return partes.join(';') + (L.REGISTROS[reg].pontoFinal ? ';' : '');
  }
  /** Uma linha C ou D sem nenhum dado além do que é fixo/derivado não vai no arquivo (a doc proíbe linha vazia). */
  function temDado(reg, valores) {
    return L.colunas(reg).some((c) => !c.fixo && !c.deriva && String((valores || {})[c.n] == null ? '' : valores[c.n]).trim() !== '');
  }
  /** Admissão de uma pessoa: { cnpj, a, b, c, d: [ ... ] } → linhas A, B, C (se houver dado) e uma D por dependente com dado. */
  function montarAdmissao({ cnpj = L.CNPJ_HOMOLOGACAO, a = {}, b = {}, c = {}, d = [] } = {}) {
    const titular = { 6: String(a[6] == null ? '' : a[6]).trim(), 9: String(a[9] == null ? '' : a[9]).trim() };
    const linhas = [montarLinha('A', a, { cnpj }), montarLinha('B', b, { cnpj })];
    if (temDado('C', c)) linhas.push(montarLinha('C', c, { cnpj }));
    (d || []).filter((dep) => temDado('D', dep)).forEach((dep) => linhas.push(montarLinha('D', dep, { cnpj, titular })));
    return linhas;
  }
  /** Eventos variáveis: [{ periodo, seq, contrato, evento, referencia, valor }] → linhas E. */
  function montarEventos(lancamentos, { cnpj = L.CNPJ_HOMOLOGACAO } = {}) {
    return (lancamentos || []).map((x) => montarLinha('E', { 3: x.periodo, 4: x.seq, 5: x.contrato, 6: x.evento, 7: x.referencia, 8: x.valor }, { cnpj }));
  }
  const juntar = (linhas) => linhas.map((l) => l + FIM_DE_LINHA).join('');
  /** Valores por coluna de uma linha pronta (o inverso de montarLinha): serve para "Preencher com o modelo da ConPlus". */
  function valoresDaLinha(linha) {
    const p = String(linha).split(';'); const v = {};
    p.forEach((x, i) => { v[i + 1] = x; });
    return v;
  }

  /* ============================== Conferência de um valor ============================== */
  const DATA = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const dataValida = (t) => { const m = DATA.exec(t); return Boolean(m) && R.dateValid(m[3] + '-' + m[2] + '-' + m[1]); };
  /** Problema de um valor numa coluna (texto) ou ''. Vale para o formulário e para o arquivo lido. */
  function problemaDoValor(c, bruto) {
    const v = String(bruto == null ? '' : bruto);
    const t = v.trim();
    if (/[;\r\n]/.test(v)) return 'tem ";" ou quebra de linha, que deslocariam as colunas';
    const fora = foraDo1252(v); if (fora.length) return 'tem caractere que não existe em Windows-1252: ' + fora.join(' ');
    if (c.n === 1) return t === c.registro ? '' : 'identificador diferente de ' + c.registro;
    if (t === '') return c.obrig ? 'campo obrigatório vazio' : '';
    if (/^-\s*\d/.test(t)) return 'valor negativo'; // a API recusa negativo em qualquer coluna
    if (c.fixo === 'valor' && t !== String(c.valor)) return c.valor === '' ? 'deve ficar vazia' : 'deve ser ' + c.valor;
    switch (c.tipo) {
      case 'data': if (!dataValida(t)) return 'data inválida: use dd/mm/aaaa'; break;
      case 'decimal': if (!/^\d+(,\d+)?$/.test(t)) return /^\d+\.\d+$/.test(t) || /\d\.\d{3}/.test(t) ? 'use vírgula como separador decimal e nenhum ponto (ex.: 2500,00)' : 'número inválido (ex.: 5,00)'; break;
      case 'cpf': if (!/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(t)) return 'CPF sem a pontuação 000.000.000-00'; if (!R.cpfValid(t)) return 'CPF inválido (dígitos verificadores)'; break;
      case 'cnpj': if (!R.cnpjValid(t)) return 'CNPJ inválido'; break;
      case 'inteiro': case 'codigo': if (!/^\d+$/.test(t)) return 'use só números'; break;
      case 'email': if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return 'e-mail inválido'; break;
      default: break;
    }
    if (c.opcoes && !c.opcoes.some(([k]) => k === t)) return 'código não aceito (use ' + c.opcoes.map(([k]) => k).join(', ') + ')';
    if (c.registro === 'B' && c.n === 74 && t === '0') return '0 (Não se aplica) não é válido para o eSocial';
    return '';
  }

  /* ============================== Leitura de um arquivo ============================== */
  /**
   * Lê o texto de um arquivo de dados e devolve cada linha com as colunas rotuladas e os problemas. Linhas em branco são
   * ignoradas (como na API). Contagem como a API: N colunas = N-1 separadores; um ";" a mais no fim (coluna extra vazia) passa.
   */
  function ler(texto) {
    const linhas = [];
    String(texto == null ? '' : texto).replace(/^﻿/, '').split(/\r\n|\n|\r/).forEach((bruta, i) => {
      if (bruta.trim() === '') return;
      const partes = bruta.split(';'); const reg = partes[0].trim().toUpperCase();
      const R0 = L.REGISTROS[reg]; const numero = i + 1;
      const linha = { numero, bruta, registro: reg, layout: R0 ? R0.layout : '', esperado: R0 ? R0.colunas : 0, contagem: partes.length, sobraFinal: false, colunas: [], erros: [] };
      if (!R0) { linha.erros.push({ coluna: 1, msg: 'registro "' + partes[0] + '" não pertence aos layouts (A, B, C, D ou E)' }); linhas.push(linha); return; }
      let vals = partes;
      if (partes.length === R0.colunas + 1 && partes[partes.length - 1] === '') { vals = partes.slice(0, -1); linha.sobraFinal = true; linha.contagem = R0.colunas; }
      if (vals.length !== R0.colunas) linha.erros.push({ coluna: 0, msg: 'registro ' + reg + ' com ' + vals.length + ' colunas; o layout ' + R0.layout + ' tem ' + R0.colunas });
      const cols = L.colunas(reg);
      linha.colunas = vals.map((valor, k) => {
        const c = cols[k] || { n: k + 1, registro: reg, nome: 'Coluna ' + (k + 1) + ' (a mais)', tipo: 'texto', aConfirmar: true };
        const problema = cols[k] ? problemaDoValor(c, valor) : '';
        if (problema) linha.erros.push({ coluna: c.n, campo: L.rotuloErro(c), msg: problema });
        return { n: k + 1, nome: c.nome, campo: c.campo || '', aConfirmar: c.aConfirmar, valor, problema };
      });
      linhas.push(linha);
    });
    return linhas;
  }

  /**
   * Conferência do arquivo inteiro: as linhas (ler) mais as regras de conjunto da doc. Devolve { linhas, erros, avisos, grupo }.
   * Cada erro: { linha, registro, coluna, campo, msg, texto } — texto é a frase pronta, no jeito da API ("Linha 1: ...").
   */
  function validar(texto, { bytes } = {}) {
    const linhas = ler(texto); const erros = []; const avisos = [];
    const add = (lista, l, e) => lista.push({ linha: l ? l.numero : 0, registro: l ? l.registro : '', coluna: e.coluna || 0, campo: e.campo || '', msg: e.msg,
      texto: (l ? 'Linha ' + l.numero + ': ' : '') + (e.campo ? e.msg + ' em ' + e.campo : e.msg) });
    if (!linhas.length) add(erros, null, { msg: 'arquivo vazio' });
    if (bytes && bytes > LIMITE_BYTES) add(erros, null, { msg: 'arquivo acima de 5 MB (' + bytes + ' bytes)' });
    linhas.forEach((l) => l.erros.forEach((e) => add(erros, l, e)));
    const regs = linhas.map((l) => l.registro).filter((r) => L.REGISTROS[r]);
    const temE = regs.includes('E'); const temAdm = regs.some((r) => r !== 'E');
    if (temE && temAdm) add(erros, null, { msg: 'o arquivo mistura eventos (E) com admissão (A a D): são grupos de layouts diferentes, um arquivo para cada' });
    const grupo = temAdm ? 'Admissao' : temE ? 'EventoVariavel' : '';
    if (temAdm) {
      const qA = regs.filter((r) => r === 'A').length; const qB = regs.filter((r) => r === 'B').length;
      if (!qA) add(erros, null, { msg: 'falta a linha A: A e B são o mínimo da admissão' });
      if (!qB) add(erros, null, { msg: 'falta a linha B: A e B são o mínimo da admissão' });
      if (qA > 1) add(avisos, null, { msg: qA + ' admissões no mesmo arquivo: a ConPlus orienta uma pessoa por arquivo (duas podem receber o mesmo contrato)' });
      if (regs.filter((r) => r === 'C').length > 1 && qA <= 1) add(erros, null, { msg: 'mais de uma linha C: a C é uma linha só por pessoa' });
      const a = linhas.find((l) => l.registro === 'A');
      linhas.forEach((l) => {
        if ((l.registro === 'C' || l.registro === 'D') && l.colunas.length && !l.colunas.some((c, k) => { const col = L.colunas(l.registro)[k]; return col && !col.fixo && !col.deriva && String(c.valor).trim() !== ''; })) {
          add(erros, l, { msg: 'linha ' + l.registro + ' sem nenhum dado: omita a linha em vez de mandá-la vazia' });
        }
        if (l.registro === 'D' && a && qA === 1) {
          const cpfA = (a.colunas[5] || {}).valor; const admA = (a.colunas[8] || {}).valor;
          if ((l.colunas[2] || {}).valor !== cpfA) add(erros, l, { coluna: 3, campo: 'CPF do titular (coluna 3)', msg: 'diferente do CPF do A' });
          if ((l.colunas[3] || {}).valor !== admA) add(erros, l, { coluna: 4, campo: 'Admissão do titular (coluna 4)', msg: 'diferente da admissão do A' });
        }
      });
      const ordem = { A: 0, B: 1, C: 2, D: 3 }; let ult = -1;
      if (qA === 1) linhas.forEach((l) => { const o = ordem[l.registro]; if (o === undefined) return; if (o < ult) add(avisos, l, { msg: 'fora da ordem do modelo (A, B, C, D)' }); ult = Math.max(ult, o); });
      // Pagamento em conta: com MODOPGTO = 3 (Bancária), tipo de conta, banco, agência, conta e dígito (doc, registro B).
      linhas.filter((l) => l.registro === 'B' && l.colunas.length >= 65).forEach((l) => {
        const v = (n) => String((l.colunas[n - 1] || {}).valor || '').trim();
        if (v(60) === '3') [61, 62, 63, 64, 65].forEach((n) => { if (!v(n)) add(erros, l, { coluna: n, campo: L.rotuloErro(L.colunas('B')[n - 1]), msg: 'obrigatório no pagamento em conta (MODOPGTO = 3)' }); });
        if (v(63) && !v(62)) add(erros, l, { coluna: 63, campo: 'NUMEROAGENCIA (coluna 63)', msg: 'agência sem banco' });
      });
    }
    if (temE) {
      const vistos = new Map();
      linhas.filter((l) => l.registro === 'E' && l.colunas.length >= 5).forEach((l) => {
        const k = [digitos((l.colunas[1] || {}).valor), (l.colunas[2] || {}).valor, (l.colunas[3] || {}).valor, (l.colunas[4] || {}).valor].join('|');
        if (vistos.has(k)) add(avisos, l, { msg: 'mesmo CNPJ, período, SEQ e contrato da linha ' + vistos.get(k) + ': o Questor ignora o repetido (chave primária)' });
        else vistos.set(k, l.numero);
      });
    }
    return { linhas, erros, avisos, grupo };
  }
  const igualAoModelo = (linhas) => {
    const m = [L.MODELO.A, L.MODELO.B, L.MODELO.C, L.MODELO.D];
    return linhas.length === m.length && linhas.every((l, i) => l === m[i]);
  };

  /* ============================== SEQ dos eventos variáveis ============================== */
  const chaveSeq = ({ cnpj, periodo, contrato }) => [digitos(cnpj), String(periodo).trim(), String(contrato).trim()].join('|');
  /**
   * Registra um lançamento novo: o SEQ é o próximo do contador de (CNPJ, período, contrato) e fica gravado no lançamento.
   * O contador só cresce: apagar um lançamento não devolve o SEQ (ele pode já ter ido para a ConPlus). Devolve um estado novo.
   */
  function novoLancamento(estado, dados, { id, agora } = {}) {
    const e = { lancamentos: [...((estado && estado.lancamentos) || [])], ultimoSeq: { ...((estado && estado.ultimoSeq) || {}) } };
    const k = chaveSeq(dados);
    const seq = (e.ultimoSeq[k] || 0) + 1;
    e.ultimoSeq[k] = seq;
    const l = { id: id || 'ev-' + Date.now().toString(36) + '-' + seq, cnpj: dados.cnpj, periodo: String(dados.periodo).trim(), contrato: String(dados.contrato).trim(), seq: String(seq),
      evento: String(dados.evento).trim(), referencia: String(dados.referencia || '').trim(), valor: String(dados.valor || '').trim(), criadoEm: agora || '' };
    e.lancamentos.push(l);
    return { estado: e, lancamento: l };
  }
  /** Problema dos dados de um lançamento antes de ganhar SEQ (mesma conferência da linha E). */
  function problemaDoLancamento(d) {
    const linha = montarLinha('E', { 3: d.periodo, 4: '1', 5: d.contrato, 6: d.evento, 7: d.referencia, 8: d.valor }, { cnpj: d.cnpj });
    const r = validar(linha);
    if (!String(d.referencia || '').trim() && !String(d.valor || '').trim()) return 'Informe a referência ou o valor.';
    return r.erros.length ? r.erros[0].texto.replace(/^Linha 1: /, '') : '';
  }

  /* ============================== De-para dos códigos do Questor ============================== */
  const TABELAS = {
    cargo: { titulo: 'Cargo', de: 'Cargo no S2', para: 'CODIGOCARGO', consulta: 'nFpaDCCargoEmpresa', porEmpresa: true },
    escala: { titulo: 'Escala', de: 'Escala no S2', para: 'CODIGOESCALA', consulta: 'nFpaDCEscalaEmpresa', porEmpresa: true },
    filial: { titulo: 'Filial / estabelecimento', de: 'Loja ou filial no S2', para: 'CODIGOESTAB', consulta: 'nGemDCEstab', porEmpresa: true },
    municipio: { titulo: 'Município', de: 'Código IBGE', para: 'CODIGOMUNIC', consulta: 'nGemDCMunicipio', porEmpresa: false },
    evento: { titulo: 'Evento', de: 'Evento no S2', para: 'CODIGOEVENTO', consulta: 'nFpaDCEventoMenor1000', porEmpresa: false },
    banco: { titulo: 'Banco', de: 'Código do banco (COMPE)', para: 'CODIGOBANCO', consulta: 'nGemDCBanco', porEmpresa: false },
  };
  const dobrar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  /** Problema de uma linha de de-para dentro da tabela (lista) ou ''. */
  function problemaDoDepara(tabela, item, lista, idAtual) {
    const T = TABELAS[tabela]; if (!T) return 'Tabela desconhecida.';
    const de = String(item.de || '').trim(); const para = String(item.para || '').trim();
    if (!de) return 'Informe o ' + T.de.toLowerCase() + '.';
    if (!para) return 'Informe o código do Questor (' + T.para + ').';
    if (!/^\d+$/.test(para)) return 'O código do Questor (' + T.para + ') leva só números.';
    if (tabela === 'municipio' && !/^\d{7}$/.test(de)) return 'O código IBGE do município tem 7 números.';
    if (T.porEmpresa && !R.cnpjValid(item.cnpj || '')) return 'Informe o CNPJ da empresa: este código é de cada empresa.';
    const mesma = (x) => x.id !== idAtual && dobrar(x.de) === dobrar(de) && (!T.porEmpresa || digitos(x.cnpj) === digitos(item.cnpj));
    if ((lista || []).some(mesma)) return 'Já existe uma linha para "' + de + '"' + (T.porEmpresa ? ' nesta empresa' : '') + '.';
    return '';
  }
  /** O código do Questor para um valor do S2 (ou ''). */
  function codigoQuestor(lista, de, cnpj) {
    const x = (lista || []).find((y) => dobrar(y.de) === dobrar(de) && (!cnpj || !y.cnpj || digitos(y.cnpj) === digitos(cnpj)));
    return x ? x.para : '';
  }
  /**
   * Linhas de um CSV (já separadas em colunas) → itens de de-para. A 1ª linha é o cabeçalho: DE (ou S2, IBGE, CODIGORAIS),
   * PARA (ou CODIGO…, como as colunas das consultas do Questor), DESCRICAO (ou DESCR…, NOME…) e CNPJ. Devolve { itens, erros }.
   */
  function deparaDoCsv(tabela, linhas, cnpjPadrao) {
    const T = TABELAS[tabela]; const itens = []; const erros = [];
    if (!T || !linhas || linhas.length < 2) return { itens, erros: ['O arquivo precisa de uma linha de cabeçalho e ao menos uma linha de dados.'] };
    const cab = linhas[0].map((h) => dobrar(h).replace(/[^a-z0-9]/g, ''));
    const achar = (teste) => cab.findIndex(teste);
    const iDe = achar((h) => ['de', 's2', 'ibge', 'codigorais', 'codigoibge'].includes(h));
    const iPara = achar((h, i) => i !== iDe && (h === 'para' || h === dobrar(T.para) || (h.startsWith('codigo') && h !== 'codigorais')));
    const iDesc = achar((h) => h.startsWith('descr') || h.startsWith('nome'));
    const iCnpj = achar((h) => h === 'cnpj');
    if (iPara < 0) return { itens, erros: ['Não achei a coluna do código do Questor (PARA ou ' + T.para + ').'] };
    const deIdx = iDe >= 0 ? iDe : iDesc; // sem coluna DE: a descrição do Questor vira o valor do S2, para conferir depois
    if (deIdx < 0) return { itens, erros: ['Não achei a coluna DE (o valor do S2) nem a de descrição.'] };
    const acumulado = [];
    linhas.slice(1).forEach((l, k) => {
      const item = { de: String(l[deIdx] || '').trim(), para: String(l[iPara] || '').trim(), descricao: iDesc >= 0 ? String(l[iDesc] || '').trim() : '', cnpj: T.porEmpresa ? String((iCnpj >= 0 && l[iCnpj]) || cnpjPadrao || '').trim() : '' };
      const p = problemaDoDepara(tabela, item, acumulado);
      if (p) erros.push('Linha ' + (k + 2) + ': ' + p); else acumulado.push({ ...item, id: 'csv' + k });
    });
    acumulado.forEach((x) => { const { id, ...resto } = x; void id; itens.push(resto); });
    return { itens, erros };
  }

  /* ============================== Vínculo CPF ↔ contrato ============================== */
  /** Problema de um vínculo ou ''. O contrato é único dentro da empresa; o mesmo CPF pode ter mais de um (readmissão). */
  function problemaDoVinculo(v, lista, idAtual) {
    if (!R.cnpjValid(v.cnpj || '')) return 'Informe o CNPJ da empresa.';
    if (!/^\d+$/.test(String(v.contrato || '').trim())) return 'O código do contrato (CODIGOFUNCCONTR) leva só números.';
    if (!/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(String(v.cpf || '').trim()) || !R.cpfValid(v.cpf)) return 'Informe um CPF válido, com pontuação (000.000.000-00).';
    if ((lista || []).some((x) => x.id !== idAtual && digitos(x.cnpj) === digitos(v.cnpj) && String(x.contrato).trim() === String(v.contrato).trim())) return 'Este contrato já está ligado a um CPF nesta empresa.';
    return '';
  }
  /** O CPF ligado a um contrato (ou ''). Com cnpj, só nessa empresa; sem cnpj, só se o contrato for de uma empresa só. */
  function cpfDoContrato(lista, contrato, cnpj) {
    const c = String(contrato == null ? '' : contrato).trim(); if (!c) return '';
    const achados = (lista || []).filter((x) => String(x.contrato).trim() === c && (!cnpj || digitos(x.cnpj) === digitos(cnpj)));
    return achados.length === 1 ? achados[0].cpf : '';
  }

  /** Linhas de um CSV → vínculos. Cabeçalho: CPF (ou CPFFUNC), CONTRATO (ou CODIGOFUNCCONTR), NOME (opcional) e CNPJ (opcional). */
  function vinculosDoCsv(linhas, cnpjPadrao, existentes) {
    const itens = []; const erros = [];
    if (!linhas || linhas.length < 2) return { itens, erros: ['O arquivo precisa de uma linha de cabeçalho e ao menos uma linha de dados.'] };
    const cab = linhas[0].map((h) => dobrar(h).replace(/[^a-z0-9]/g, ''));
    const iCpf = cab.findIndex((h) => h === 'cpf' || h === 'cpffunc');
    const iCon = cab.findIndex((h) => h === 'contrato' || h === 'codigofunccontr');
    const iNome = cab.findIndex((h) => h.startsWith('nome'));
    const iCnpj = cab.findIndex((h) => h === 'cnpj');
    if (iCpf < 0 || iCon < 0) return { itens, erros: ['Não achei as colunas CPF e CONTRATO (ou CODIGOFUNCCONTR).'] };
    const acumulado = [...(existentes || [])];
    linhas.slice(1).forEach((l, k) => {
      const v = { id: 'csv' + k, cnpj: String((iCnpj >= 0 && l[iCnpj]) || cnpjPadrao || '').trim(), contrato: String(l[iCon] || '').trim(), cpf: String(l[iCpf] || '').trim(), nome: iNome >= 0 ? String(l[iNome] || '').trim() : '' };
      const p = problemaDoVinculo(v, acumulado);
      if (p) erros.push('Linha ' + (k + 2) + ': ' + p); else { acumulado.push(v); const { id, ...resto } = v; void id; itens.push(resto); }
    });
    return { itens, erros };
  }

  return {
    FIM_DE_LINHA, LIMITE_BYTES, TABELAS, vinculosDoCsv,
    foraDo1252, paraWindows1252, lerBytes,
    montarLinha, montarAdmissao, montarEventos, juntar, valoresDaLinha, temDado,
    problemaDoValor, ler, validar, igualAoModelo,
    chaveSeq, novoLancamento, problemaDoLancamento,
    problemaDoDepara, codigoQuestor, deparaDoCsv,
    problemaDoVinculo, cpfDoContrato,
  };
}));
