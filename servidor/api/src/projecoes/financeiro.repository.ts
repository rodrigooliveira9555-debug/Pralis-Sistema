import { eq } from "drizzle-orm";
import {
  finBandeiras,
  finGrupos,
  finOperadoras,
  finTaxas,
  finTiposVenda,
  finTransferencias
} from "@cicluz/db/schema";
import type { TransacaoBanco } from "../banco/conexao.ts";
import type { Financeiro } from "./financeiro.leitura.ts";

// Troca as tabelas do financeiro da empresa pelas linhas lidas do documento. Ordem de apagar e de
// inserir segue as FKs (taxas dependem de operadoras e bandeiras; bandeiras de tipos de venda;
// subgrupos dos grupos, que vêm antes na lista).
export async function substituirFinanceiro(tx: TransacaoBanco, empresaId: string, dados: Financeiro | null) {
  await tx.delete(finTaxas).where(eq(finTaxas.empresaId, empresaId));
  await tx.delete(finTransferencias).where(eq(finTransferencias.empresaId, empresaId));
  await tx.delete(finOperadoras).where(eq(finOperadoras.empresaId, empresaId));
  await tx.delete(finBandeiras).where(eq(finBandeiras.empresaId, empresaId));
  await tx.delete(finTiposVenda).where(eq(finTiposVenda.empresaId, empresaId));
  // Filhos antes dos pais por causa da FK autorreferente.
  await tx.delete(finGrupos).where(eq(finGrupos.empresaId, empresaId));
  if (!dados) return;

  const comEmpresa = <T extends object>(linhas: T[]) => linhas.map((linha) => ({ ...linha, empresaId }));
  const pais = dados.grupos.filter((grupo) => grupo.paiId === null);
  const filhos = dados.grupos.filter((grupo) => grupo.paiId !== null);
  if (pais.length) await tx.insert(finGrupos).values(comEmpresa(pais));
  if (filhos.length) await tx.insert(finGrupos).values(comEmpresa(filhos));
  if (dados.tiposVenda.length) await tx.insert(finTiposVenda).values(comEmpresa(dados.tiposVenda));
  if (dados.bandeiras.length) await tx.insert(finBandeiras).values(comEmpresa(dados.bandeiras));
  if (dados.operadoras.length) await tx.insert(finOperadoras).values(comEmpresa(dados.operadoras));
  if (dados.taxas.length) await tx.insert(finTaxas).values(comEmpresa(dados.taxas));
  if (dados.transferencias.length) await tx.insert(finTransferencias).values(comEmpresa(dados.transferencias));
}
