/* HIERARQUIA ÁREA › CARGO › PESSOA (24/11/2026, pedido do Rodrigo). Cola as regras de hierarquia-dominio.js nos dados do sistema:
   - cargos(): os cargos com id fixo (DES - Cargos C/Salários; os de referência usam 'ref:N', os cadastrados têm id próprio);
   - a ÁREA guarda cargoIds (location-tree.js: cargosDaArea / definirCargosDaArea) — a única cópia do vínculo Área › Cargo;
   - a PESSOA guarda jobKey (id do cargo) além de jobName (o nome, que nunca é apagado) — people.js;
   - arvore(): Área › Cargo › Pessoa, para a tela de permissões e para o organograma.
   Migração (uma vez, marca cicluz-hierarquia-v1, sem apagar nada): põe o jobKey nas pessoas pelo nome do cargo (só quando há UM cargo com o nome)
   e copia para as áreas os vínculos que já existiam nas Fichas de Cargos (unitIds por nome). O que não casa fica listado em relatorio().
   Este arquivo carrega depois de people.js e location-tree.js; os dois guardam os dados pelo próprio código, então a migração passa por eles. */
(() => {
  'use strict';
  const D = window.CicluzHierarquiaDominio; if (!D) return;
  const FLAG = 'cicluz-hierarquia-v1';

  const cargos = () => {
    try { return jobsCurrent().map((e) => ({ id: e.id, key: e.key, nome: e.j.nome, nomeReduzido: e.j.nomeReduzido || '', categoria: e.j.categoria || '' })).filter((c) => c.id); } catch (e) { return []; }
  };
  const cargoIdPorNome = (nome) => D.casarCargo(nome, cargos()).id;
  const lerArvore = () => { try { const s = JSON.parse(localStorage.getItem('cicluz-location-tree-v1') || '[]'); return Array.isArray(s) ? s : s.tree || []; } catch (e) { return []; } };
  const lerFichas = () => { try { const s = JSON.parse(localStorage.getItem('cicluz-job-profiles-v1') || 'null'); return s && s.cards && typeof s.cards === 'object' ? Object.values(s.cards) : []; } catch (e) { return []; } };
  const pessoas = () => { const P = window.CicluzPeople; if (!P) return []; try { return P.selectable().map((p) => ({ id: p.id, name: p.name, jobName: p.jobName, jobKey: p.jobKey, areaIds: p.orgUnitIds || [], active: p.active })); } catch (e) { return []; } };

  /** Área › Cargo › Pessoa, com o que existe agora nos dados. */
  const arvore = () => D.arvore({ areas: lerArvore(), cargos: cargos(), pessoas: pessoas() });

  function migrar() {
    const P = window.CicluzPeople, LT = window.CicluzLocationTree;
    if (!P || !LT || !LT.areasComCargos || typeof jobsCurrent !== 'function') return null;
    let marca = null; try { marca = JSON.parse(localStorage.getItem(FLAG) || 'null'); } catch (e) { marca = null; }
    if (marca && marca.version === 1) return marca;
    const lista = cargos(); if (!lista.length) return null;
    P.load(); if (P.failed && P.failed()) return null;
    const rel = { version: 1, em: new Date().toISOString(), pessoasVinculadas: 0, pessoasSemCargo: [], pessoasAmbiguas: [], vinculosDeArea: 0 };
    const r = D.vincularPessoas(P.get().people, lista);
    if (r.mudancas.length) {
      const ok = P.transact((d) => { r.mudancas.forEach((m) => { const x = d.people.find((p) => p.id === m.id); if (x) x.jobKey = m.jobKey; }); });
      if (!ok) return null;
      rel.pessoasVinculadas = r.mudancas.length;
    }
    rel.pessoasSemCargo = r.semCargo; rel.pessoasAmbiguas = r.ambiguos;
    const novos = D.vinculosDasFichas(LT.areasComCargos(), lerFichas(), lista);
    const porArea = new Map();
    novos.forEach((n) => { if (!porArea.has(n.areaId)) porArea.set(n.areaId, []); porArea.get(n.areaId).push(n.cargoId); });
    let falhou = false;
    porArea.forEach((ids, areaId) => { if (LT.definirCargosDaArea(areaId, D.juntarCargoIds(LT.cargosDaArea(areaId), ids))) rel.vinculosDeArea += ids.length; else falhou = true; });
    if (falhou) return null;
    try { localStorage.setItem(FLAG, JSON.stringify(rel)); } catch (e) { return null; }
    return rel;
  }

  const relatorio = () => { try { return JSON.parse(localStorage.getItem(FLAG) || 'null'); } catch (e) { return null; } };
  window.CicluzHierarquia = { cargos, cargoIdPorNome, arvore, migrar, relatorio, dominio: D };
  try { migrar(); } catch (e) { /* a migração tenta de novo no próximo carregamento */ }
})();
