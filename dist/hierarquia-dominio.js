/*
 * Hierarquia Área › Cargo › Pessoa — regras puras (sem DOM, sem armazenamento).
 * Pedido do Rodrigo (24/11/2026): a área (Área / Setor / Local) tem cargos e o cargo tem pessoas (colaboradores). O vínculo é sempre por ID:
 *  - o cargo tem id fixo (id do cargo; os de referência usam 'ref:N');
 *  - a área guarda cargoIds (os cargos que existem nela);
 *  - a pessoa guarda jobKey (o id do cargo dela) e continua guardando jobName (o nome), que nunca é apagado.
 * Carregado no navegador como window.CicluzHierarquiaDominio e testado em Node (tests/hierarquia-dominio.cjs).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CicluzHierarquiaDominio = api;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const dobrar = (t) => String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('pt-BR');

  /** O cargo de um nome. Só casa quando há UM cargo com esse nome (nome repetido é ambíguo e fica para o usuário escolher). */
  function casarCargo(nome, cargos) {
    const alvo = dobrar(nome);
    if (!alvo) return { id: null, motivo: 'sem-nome' };
    const achados = (cargos || []).filter((c) => dobrar(c.nome) === alvo || (c.nomeReduzido && dobrar(c.nomeReduzido) === alvo));
    if (achados.length === 1) return { id: achados[0].id, motivo: '' };
    return { id: null, motivo: achados.length ? 'ambiguo' : 'nao-achou' };
  }

  /** Quais pessoas ganham o jobKey (id do cargo) a partir do nome do cargo. Quem já tem jobKey válido não é tocado. */
  function vincularPessoas(pessoas, cargos) {
    const ids = new Set((cargos || []).map((c) => c.id));
    const mudancas = []; const semCargo = []; const ambiguos = [];
    (pessoas || []).forEach((p) => {
      if (p.jobKey && ids.has(p.jobKey)) return;
      const r = casarCargo(p.jobName, cargos);
      if (r.id) mudancas.push({ id: p.id, jobKey: r.id });
      else if (r.motivo === 'ambiguo') ambiguos.push(p.id);
      else semCargo.push(p.id);
    });
    return { mudancas, semCargo, ambiguos };
  }

  /** Os vínculos Área › Cargo que já existem nas Fichas de Cargos (unitIds por nome do cargo) e ainda não estão nas áreas. */
  function vinculosDasFichas(areas, fichas, cargos) {
    const porId = new Map((areas || []).map((a) => [a.id, a]));
    const novos = [];
    (fichas || []).forEach((f) => {
      const r = casarCargo(f.jobName, cargos);
      if (!r.id) return;
      (f.unitIds || []).forEach((u) => {
        const a = porId.get(u);
        if (!a) return;
        if ((a.cargoIds || []).includes(r.id)) return;
        if (!novos.some((n) => n.areaId === u && n.cargoId === r.id)) novos.push({ areaId: u, cargoId: r.id });
      });
    });
    return novos;
  }

  /**
   * A árvore Área › Cargo › Pessoa. areas = árvore salva (id, name, children, cargoIds); cargos = [{id, nome}]; pessoas = [{id, name, jobKey}].
   * Cargo sem pessoa aparece com a lista vazia; id de cargo que não existe mais é ignorado (cargo excluído não derruba a árvore).
   */
  function arvore({ areas, cargos, pessoas }) {
    const cargoPorId = new Map((cargos || []).map((c) => [c.id, c]));
    const gente = new Map();
    (pessoas || []).forEach((p) => { if (p.jobKey) { if (!gente.has(p.jobKey)) gente.set(p.jobKey, []); gente.get(p.jobKey).push(p); } });
    const montar = (n, nivel) => ({
      tipo: 'area', id: n.id, nome: n.name, nivel, ativo: !n.inactive, cor: n.color, sigla: n.sigla,
      cargos: (n.cargoIds || []).filter((id) => cargoPorId.has(id)).map((id) => ({
        tipo: 'cargo', id, areaId: n.id, nome: cargoPorId.get(id).nome,
        pessoas: (gente.get(id) || []).map((p) => ({ tipo: 'pessoa', id: p.id, cargoId: id, areaId: n.id, nome: p.name })),
      })),
      areas: (n.children || []).map((f) => montar(f, nivel + 1)),
    });
    return (areas || []).map((n) => montar(n, 1));
  }

  /** Os ids das pessoas que uma escolha cobre. Área: tudo o que está abaixo dela (cargos das subáreas também); cargo: as pessoas dele; pessoa: ela. */
  function pessoasCobertas(raizes, tipo, id) {
    const out = new Set();
    const todasDe = (n) => { n.cargos.forEach((c) => c.pessoas.forEach((p) => out.add(p.id))); n.areas.forEach(todasDe); };
    const andar = (n) => {
      if (tipo === 'area' && n.id === id) todasDe(n);
      n.cargos.forEach((c) => {
        if (tipo === 'cargo' && c.id === id) c.pessoas.forEach((p) => out.add(p.id));
        c.pessoas.forEach((p) => { if (tipo === 'pessoa' && p.id === id) out.add(p.id); });
      });
      n.areas.forEach(andar);
    };
    (raizes || []).forEach(andar);
    return [...out];
  }

  /** Regra do cadastro: toda pessoa precisa de um cargo que exista. */
  function erroDeCargo(jobKey, cargos) {
    if (!jobKey) return 'Escolha o cargo do colaborador.';
    if (!(cargos || []).some((c) => c.id === jobKey)) return 'O cargo escolhido não existe mais. Escolha outro.';
    return '';
  }

  /** Acrescenta e tira cargos de uma área sem repetir. */
  function juntarCargoIds(atuais, novos) {
    return [...new Set([...(atuais || []), ...(novos || [])])];
  }

  return { dobrar, casarCargo, vincularPessoas, vinculosDasFichas, arvore, pessoasCobertas, erroDeCargo, juntarCargoIds };
}));
