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
    // A pessoa tem UM cargo (jobKey) e pode estar em várias áreas (areaIds). Sem áreas marcadas, ela aparece em toda área que tem o cargo dela.
    const linha = (p, areaId) => !(p.areaIds && p.areaIds.length) || p.areaIds.includes(areaId);
    (pessoas || []).forEach((p) => { if (p.jobKey) { if (!gente.has(p.jobKey)) gente.set(p.jobKey, []); gente.get(p.jobKey).push(p); } });
    const montar = (n, nivel) => ({
      tipo: 'area', id: n.id, nome: n.name, nivel, ativo: !n.inactive, cor: n.color, sigla: n.sigla,
      cargos: (n.cargoIds || []).filter((id) => cargoPorId.has(id)).map((id) => ({
        tipo: 'cargo', id, areaId: n.id, nome: cargoPorId.get(id).nome,
        pessoas: (gente.get(id) || []).filter((p) => linha(p, n.id)).map((p) => ({ tipo: 'pessoa', id: p.id, cargoId: id, areaId: n.id, nome: p.name })),
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

  /** Os ids da área e de todas as áreas acima dela (da mais específica para a mais geral). */
  function cadeiaDaArea(raizes, areaId) {
    const pai = new Map();
    const andar = (n, p) => { pai.set(n.id, p); (n.areas || n.children || []).forEach((f) => andar(f, n.id)); };
    (raizes || []).forEach((r) => andar(r, null));
    const out = [];
    for (let id = areaId, guarda = 0; id && guarda < 20; id = pai.get(id), guarda++) out.push(id);
    return out;
  }

  const uniao = (lista) => {
    const telas = {}; const acoes = new Set();
    lista.forEach((c) => {
      Object.keys(c.telas || {}).forEach((k) => { telas[k] = [...new Set([...(telas[k] || []), ...(c.telas[k] || [])])]; });
      (c.acoes || []).forEach((a) => acoes.add(a));
    });
    return { telas, acoes: [...acoes] };
  };

  /**
   * Qual configuração vale para uma pessoa (24/11/2026, regras do Rodrigo): a MAIS ESPECÍFICA vence — primeiro a da própria pessoa; sem ela, a do
   * cargo (configurada numa área); sem ela, a da área. Dentro de um nível: em cada área da pessoa vale a configuração da área mais próxima dela
   * (um local sem configuração segue o setor, que segue a área); se a pessoa está em várias áreas com configurações diferentes, valem as
   * permissões MAIORES (a soma). A pessoa tem UM cargo.
   * configs: { 'pessoa:ID': c, 'cargo:AREA|CARGO': c, 'area:ID': c }, com c = { telas: { chave: [permissões] }, acoes: [ações] }.
   * pessoa: { id, jobKey, areaIds }. Devolve { nivel: 'pessoa' | 'cargo' | 'area' | null, origens: [chaves], config }.
   */
  function resolverConfig(pessoa, configs, raizes) {
    const cfg = configs || {};
    const propria = cfg['pessoa:' + pessoa.id];
    if (propria) return { nivel: 'pessoa', origens: ['pessoa:' + pessoa.id], config: uniao([propria]) };
    const cadeias = (pessoa.areaIds || []).map((a) => cadeiaDaArea(raizes, a));
    const doNivel = (chaveDe) => {
      const achadas = [];
      cadeias.forEach((cadeia) => { for (const a of cadeia) { const k = chaveDe(a); if (cfg[k]) { achadas.push(k); break; } } });
      return [...new Set(achadas)];
    };
    if (pessoa.jobKey) {
      const k = doNivel((a) => 'cargo:' + a + '|' + pessoa.jobKey);
      if (k.length) return { nivel: 'cargo', origens: k, config: uniao(k.map((x) => cfg[x])) };
    }
    const k = doNivel((a) => 'area:' + a);
    if (k.length) return { nivel: 'area', origens: k, config: uniao(k.map((x) => cfg[x])) };
    return { nivel: null, origens: [], config: { telas: {}, acoes: [] } };
  }

  /** Quantas pessoas seguem cada configuração (a que de fato vale para elas, depois de aplicar a prevalência). */
  function quemSegue(pessoas, configs, raizes) {
    const cont = {};
    (pessoas || []).forEach((p) => { resolverConfig(p, configs, raizes).origens.forEach((k) => { cont[k] = (cont[k] || 0) + 1; }); });
    return cont;
  }

  /** A configuração libera alguma coisa? (uma configuração toda desligada não dá acesso). */
  function temAcesso(config) {
    if (!config) return false;
    const telas = config.telas || {};
    return Object.keys(telas).some((k) => (telas[k] || []).length > 0) || (config.acoes || []).length > 0;
  }

  /**
   * Pode o colaborador começar a usar o sistema? Só com permissões: a dele própria, a do cargo ou a da área (a mais específica vale).
   * Devolve { ok, nivel, origens, motivo } — o motivo é o texto para mostrar quando não pode.
   */
  function podeUsar(pessoa, configs, raizes) {
    if (!pessoa || !pessoa.jobKey) return { ok: false, nivel: null, origens: [], motivo: 'O colaborador precisa estar ligado a um cargo.' };
    const r = resolverConfig(pessoa, configs, raizes);
    if (!r.nivel) return { ok: false, nivel: null, origens: [], motivo: 'Nenhuma permissão foi configurada para o colaborador, para o cargo dele ou para a área dele. Configure em Configurações › Permissões › Acesso por Tela.' };
    if (!temAcesso(r.config)) return { ok: false, nivel: r.nivel, origens: r.origens, motivo: 'A configuração que vale para o colaborador não libera nenhuma tela. Ligue as permissões em Configurações › Permissões › Acesso por Tela.' };
    return { ok: true, nivel: r.nivel, origens: r.origens, motivo: '' };
  }

  return { temAcesso, podeUsar, cadeiaDaArea, resolverConfig, quemSegue, dobrar, casarCargo, vincularPessoas, vinculosDasFichas, arvore, pessoasCobertas, erroDeCargo, juntarCargoIds };
}));
