import { and, asc, desc, eq, gte, isNull, lte, or } from "drizzle-orm";
import {
  cargos,
  contas,
  finBandeiras,
  finGrupos,
  finOperadoras,
  finTaxas,
  finTiposVenda,
  locais,
  organogramaPosicoes,
  perfisAreas,
  perfisCargos,
  perfisCargosRequisitos,
  perfisRequisitos,
  salariosValores,
  salariosVigencias
} from "@cicluz/db/schema";
import { banco } from "../banco/conexao.ts";

// Leituras das tabelas relacionais, sempre pela empresa da sessão. Nada aqui grava.

export function listarGrupos(empresaId: string, colecao?: string) {
  return banco
    .select()
    .from(finGrupos)
    .where(and(eq(finGrupos.empresaId, empresaId), colecao ? eq(finGrupos.colecao, colecao) : undefined))
    .orderBy(asc(finGrupos.colecao), asc(finGrupos.paiId), asc(finGrupos.ordem));
}

export function listarTiposVenda(empresaId: string) {
  return banco.select().from(finTiposVenda).where(eq(finTiposVenda.empresaId, empresaId)).orderBy(asc(finTiposVenda.ordem));
}

export function listarBandeiras(empresaId: string) {
  return banco.select().from(finBandeiras).where(eq(finBandeiras.empresaId, empresaId)).orderBy(asc(finBandeiras.ordem));
}

export function listarOperadoras(empresaId: string) {
  return banco.select().from(finOperadoras).where(eq(finOperadoras.empresaId, empresaId)).orderBy(asc(finOperadoras.ordem));
}

export function listarTaxas(empresaId: string, filtro: { operadora?: string; bandeira?: string; data?: string }) {
  return banco
    .select()
    .from(finTaxas)
    .where(
      and(
        eq(finTaxas.empresaId, empresaId),
        filtro.operadora ? eq(finTaxas.operadoraId, filtro.operadora) : undefined,
        filtro.bandeira ? eq(finTaxas.bandeiraId, filtro.bandeira) : undefined,
        filtro.data ? lte(finTaxas.inicio, filtro.data) : undefined,
        filtro.data ? or(isNull(finTaxas.fim), gte(finTaxas.fim, filtro.data)) : undefined
      )
    )
    .orderBy(asc(finTaxas.operadoraId), asc(finTaxas.bandeiraId), asc(finTaxas.ordem));
}

export function listarContas(empresaId: string) {
  return banco.select().from(contas).where(eq(contas.empresaId, empresaId)).orderBy(asc(contas.ordem));
}

export function listarCargos(empresaId: string) {
  return banco.select().from(cargos).where(eq(cargos.empresaId, empresaId)).orderBy(asc(cargos.ordem));
}

// Mesma regra de salaryAsOf() da tela: para cada cargo, o lançamento mais recente com início ≤ data
// (empate: o último lançado) cuja chave E nome batem com o cargo atual.
export function listarSalariosVigentes(empresaId: string, data: string) {
  return banco
    .selectDistinctOn([cargos.chave], {
      cargoChave: cargos.chave,
      cargoNome: cargos.nome,
      valorCentavos: salariosValores.valorCentavos,
      inicio: salariosVigencias.inicio
    })
    .from(cargos)
    .innerJoin(
      salariosValores,
      and(
        eq(salariosValores.empresaId, cargos.empresaId),
        eq(salariosValores.cargoChave, cargos.chave),
        eq(salariosValores.cargoNome, cargos.nome)
      )
    )
    .innerJoin(
      salariosVigencias,
      and(eq(salariosVigencias.empresaId, salariosValores.empresaId), eq(salariosVigencias.ordem, salariosValores.vigenciaOrdem))
    )
    .where(and(eq(cargos.empresaId, empresaId), lte(salariosVigencias.inicio, data)))
    .orderBy(asc(cargos.chave), desc(salariosVigencias.inicio), desc(salariosVigencias.ordem));
}

export function listarLocais(empresaId: string) {
  return banco.select().from(locais).where(eq(locais.empresaId, empresaId)).orderBy(asc(locais.nivel), asc(locais.ordem));
}

export function listarOrganograma(empresaId: string) {
  return banco
    .select()
    .from(organogramaPosicoes)
    .where(eq(organogramaPosicoes.empresaId, empresaId))
    .orderBy(asc(organogramaPosicoes.paiId), asc(organogramaPosicoes.ordem));
}

export async function listarFichaDeCargos(empresaId: string) {
  const [areas, requisitos, cargosDaFicha, vinculos] = await Promise.all([
    banco.select().from(perfisAreas).where(eq(perfisAreas.empresaId, empresaId)).orderBy(asc(perfisAreas.ordem)),
    banco.select().from(perfisRequisitos).where(eq(perfisRequisitos.empresaId, empresaId)).orderBy(asc(perfisRequisitos.ordem)),
    banco.select().from(perfisCargos).where(eq(perfisCargos.empresaId, empresaId)).orderBy(asc(perfisCargos.ordem)),
    banco
      .select({ perfilCargoId: perfisCargosRequisitos.perfilCargoId, requisitoId: perfisCargosRequisitos.requisitoId })
      .from(perfisCargosRequisitos)
      .where(eq(perfisCargosRequisitos.empresaId, empresaId))
  ]);
  return { areas, requisitos, cargos: cargosDaFicha, vinculos };
}

