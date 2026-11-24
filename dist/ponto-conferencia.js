/*
 * DES - Ponto Eletrônico: conferência entre o PONTO IMPORTADO (Conplus) e o PONTO MANUAL (Cicluz). Regras puras, sem DOM
 * e sem armazenamento; testadas em tests/ponto-conferencia.cjs. A tela está em ponto.js.
 *
 * Dois lados que nunca se misturam:
 *   • importado: dados.marcacoes[pessoa][dia] = [entrada, saída almoço, retorno almoço, saída] (vem do arquivo; só a importação mexe)
 *   • manual:    dados.manuais[pessoa][dia]    = { m: [4 horas], ocorrencia, obs, por, quando } (o que o DP registra)
 * Editar ou remover o manual NUNCA altera o importado. Toda mudança manual entra no histórico (dados.historico), com antes e depois.
 * Esta conferência só compara horas e conta divergências; não decide desconto, hora extra nem valor em dinheiro.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CicluzPontoConferencia = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MARCAS = ['Entrada', 'Saída almoço', 'Retorno almoço', 'Saída final'];
  const LIMITES = { ocorrencia: 120, obs: 300 };
  const VAZIAS = () => ['', '', '', ''];
  const minutos = (t) => { const m = /^(\d{2}):(\d{2})$/.exec(t || ''); return m && +m[1] < 24 && +m[2] < 60 ? +m[1] * 60 + +m[2] : null; };
  /** Distância no relógio (menor caminho), em minutos, maior que a tolerância? Marca ilegível conta como longe. */
  const longe = (a, b, tol) => { const x = minutos(a), y = minutos(b); if (x == null || y == null) return true; return Math.abs(((y - x + 720 + 1440) % 1440) - 720) > tol; };
  const quatro = (l) => { const a = Array.isArray(l) ? l.slice(0, 4) : []; while (a.length < 4) a.push(''); return a.map((x) => String(x == null ? '' : x)); };

  /** Garante os campos novos sem tocar no que já existe (marcacoes continua como o Rodrigo gravou). */
  function normalizar(d) {
    const x = d && typeof d === 'object' ? d : {};
    return { ...x, version: 1, marcacoes: x.marcacoes && typeof x.marcacoes === 'object' ? x.marcacoes : {}, manuais: x.manuais && typeof x.manuais === 'object' ? x.manuais : {}, historico: Array.isArray(x.historico) ? x.historico : [], importacoes: Array.isArray(x.importacoes) ? x.importacoes : [] };
  }
  const importadoDe = (d, pid, dia) => { const l = d && d.marcacoes && d.marcacoes[pid] && d.marcacoes[pid][dia]; return l && l.some(Boolean) ? quatro(l) : null; };
  const manualDe = (d, pid, dia) => (d && d.manuais && d.manuais[pid] && d.manuais[pid][dia]) || null;

  /**
   * Compara os dois lados de um dia.
   * situacao: 'semDados' | 'somenteConplus' | 'somenteManual' | 'conferido' | 'divergente'.
   * div[i] só é verdadeiro quando os dois lados existem e a marca difere (acima da tolerância) ou falta num dos lados.
   */
  function comparar(importado, manual, tolerancia) {
    const c = importado && importado.some(Boolean) ? quatro(importado) : null;
    const m = manual && manual.m && manual.m.some(Boolean) ? quatro(manual.m) : null;
    const div = [false, false, false, false];
    let situacao;
    if (!c && !m) situacao = manual && (manual.ocorrencia || manual.obs) ? 'somenteManual' : 'semDados';
    else if (c && !m) situacao = 'somenteConplus'; // manual só com ocorrência/observação não é divergência de hora
    else if (!c && m) situacao = 'somenteManual';
    else {
      for (let i = 0; i < 4; i++) if (c[i] || m[i]) div[i] = !c[i] || !m[i] || longe(c[i], m[i], tolerancia);
      situacao = div.some(Boolean) ? 'divergente' : 'conferido';
    }
    return { situacao, div, divergentes: div.filter(Boolean).length };
  }

  /** Valida o que o DP digitou. → { erro, registro } (registro limpo). */
  function validarManual(entrada) {
    const e = entrada || {};
    const m = quatro(e.m).map((x) => String(x).trim());
    for (let i = 0; i < 4; i++) if (m[i] && minutos(m[i]) == null) return { erro: MARCAS[i] + ': hora inválida (use HH:MM).' };
    const ocorrencia = String(e.ocorrencia == null ? '' : e.ocorrencia).trim(), obs = String(e.obs == null ? '' : e.obs).trim();
    if (ocorrencia.length > LIMITES.ocorrencia) return { erro: 'A ocorrência aceita até ' + LIMITES.ocorrencia + ' caracteres.' };
    if (obs.length > LIMITES.obs) return { erro: 'As observações aceitam até ' + LIMITES.obs + ' caracteres.' };
    if (!m.some(Boolean) && !ocorrencia && !obs) return { erro: 'Informe ao menos uma marcação, a ocorrência ou uma observação.' };
    return { erro: '', registro: { m, ocorrencia, obs } };
  }
  const igual = (a, b) => JSON.stringify([quatro(a && a.m), (a && a.ocorrencia) || '', (a && a.obs) || '']) === JSON.stringify([quatro(b && b.m), (b && b.ocorrencia) || '', (b && b.obs) || '']);
  const copia = (d) => normalizar(JSON.parse(JSON.stringify(normalizar(d))));
  const resumoDe = (r) => (r ? { m: quatro(r.m), ocorrencia: r.ocorrencia || '', obs: r.obs || '' } : null);
  let seq = 0;
  const novoId = (quando) => 'h-' + String(quando || Date.now()).replace(/\D/g, '').slice(0, 14) + '-' + (++seq);

  /** Grava (ou corrige) o lançamento manual do dia. Devolve { dados, acao: 'criado'|'alterado'|'igual', erro }. O importado não é tocado. */
  function salvarManual(dados, pessoaId, dia, entrada, { por = '', quando } = {}) {
    const v = validarManual(entrada);
    if (v.erro) return { dados, acao: '', erro: v.erro };
    const d = copia(dados); const antes = manualDe(d, pessoaId, dia);
    if (antes && igual(antes, v.registro)) return { dados, acao: 'igual', erro: '' };
    const q = quando || new Date().toISOString();
    (d.manuais[pessoaId] = d.manuais[pessoaId] || {})[dia] = { ...v.registro, por, quando: q };
    d.historico.unshift({ id: novoId(q), quando: q, por, pessoaId, dia, acao: antes ? 'alterado' : 'criado', antes: resumoDe(antes), depois: resumoDe(v.registro) });
    return { dados: d, acao: antes ? 'alterado' : 'criado', erro: '' };
  }
  /** Remove só o lançamento manual (fica no histórico). */
  function removerManual(dados, pessoaId, dia, { por = '', quando } = {}) {
    const d = copia(dados); const antes = manualDe(d, pessoaId, dia);
    if (!antes) return { dados, acao: '', erro: 'Não há lançamento manual neste dia.' };
    const q = quando || new Date().toISOString();
    delete d.manuais[pessoaId][dia]; if (!Object.keys(d.manuais[pessoaId]).length) delete d.manuais[pessoaId];
    d.historico.unshift({ id: novoId(q), quando: q, por, pessoaId, dia, acao: 'removido', antes: resumoDe(antes), depois: null });
    return { dados: d, acao: 'removido', erro: '' };
  }
  const historicoDe = (d, pessoaId, dia) => ((d && d.historico) || []).filter((h) => h.pessoaId === pessoaId && h.dia === dia);

  /** CSV (separador ;) com aspas quando preciso. linhas: [[...]] de texto ou número. */
  function csv(linhas) {
    const esc = (x) => { const s = String(x == null ? '' : x); return /[;"\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    return linhas.map((l) => l.map(esc).join(';')).join('\r\n') + '\r\n';
  }

  return { MARCAS, LIMITES, minutos, longe, normalizar, importadoDe, manualDe, comparar, validarManual, salvarManual, removerManual, historicoDe, csv };
});
