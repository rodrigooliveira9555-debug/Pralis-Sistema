/*
 * Área ConPlus (laboratório) — o que fica guardado. Chave nova e própria: cicluz-conplus-v1 (nenhuma chave existente muda).
 *   { version: 1,
 *     depara: { cargo: [], escala: [], filial: [], municipio: [], evento: [], banco: [] },   // [{ id, de, para, descricao, cnpj }]
 *     vinculos: [],                                  // [{ id, cnpj, contrato, cpf, nome, origem, criadoEm }]
 *     eventos: { lancamentos: [], ultimoSeq: {} } }  // lancamentos [{ id, cnpj, periodo, contrato, seq, evento, referencia, valor, criadoEm }]
 * Fica só neste aparelho: a chave não está na lista de documentos que o servidor sincroniza (servidor/shared/src/documentos.ts),
 * como o Cadastro completo (P-11). O formulário de admissão NÃO é guardado: fica só na memória da página.
 * Só dados fictícios no laboratório (empresa de homologação da ConPlus).
 */
(function () {
  'use strict';
  const CHAVE = 'cicluz-conplus-v1';
  const TABELAS = ['cargo', 'escala', 'filial', 'municipio', 'evento', 'banco'];
  const vazio = () => ({ version: 1, depara: Object.fromEntries(TABELAS.map((t) => [t, []])), vinculos: [], eventos: { lancamentos: [], ultimoSeq: {} } });
  const lista = (x) => (Array.isArray(x) ? x.filter((y) => y && typeof y === 'object') : []);

  function normalizar(bruto) {
    const d = vazio();
    if (!bruto || typeof bruto !== 'object') return d;
    TABELAS.forEach((t) => { d.depara[t] = lista(bruto.depara && bruto.depara[t]); });
    d.vinculos = lista(bruto.vinculos);
    const e = bruto.eventos || {};
    d.eventos.lancamentos = lista(e.lancamentos);
    d.eventos.ultimoSeq = e.ultimoSeq && typeof e.ultimoSeq === 'object' ? { ...e.ultimoSeq } : {};
    return d;
  }
  function ler() {
    try { return normalizar(JSON.parse(localStorage.getItem(CHAVE) || 'null')); } catch (e) { return vazio(); }
  }
  /** Muda e grava de uma vez. fn recebe uma cópia; devolve true se gravou. */
  function mudar(fn) {
    const d = ler();
    try { fn(d); localStorage.setItem(CHAVE, JSON.stringify(d)); return true; } catch (e) { console.warn('ConPlus: não gravou', e); return false; }
  }
  const novoId = (p) => p + '-' + (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const agoraIso = () => new Date().toISOString();

  window.CicluzConplusDados = { CHAVE, TABELAS, ler, mudar, novoId, agoraIso };
})();
