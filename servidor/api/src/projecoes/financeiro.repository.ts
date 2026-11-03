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
import { emBlocos } from "./blocos.ts";
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
  await emBlocos(comEmpresa(pais), (bloco) => tx.insert(finGrupos).values(bloco));
  await emBlocos(comEmpresa(filhos), (bloco) => tx.insert(finGrupos).values(bloco));
  await emBlocos(comEmpresa(dados.tiposVenda), (bloco) => tx.insert(finTiposVenda).values(bloco));
  await emBlocos(comEmpresa(dados.bandeiras), (bloco) => tx.insert(finBandeiras).values(bloco));
  await emBlocos(comEmpresa(dados.operadoras), (bloco) => tx.insert(finOperadoras).values(bloco));
  await emBlocos(comEmpresa(dados.taxas), (bloco) => tx.insert(finTaxas).values(bloco));
  await emBlocos(comEmpresa(dados.transferencias), (bloco) => tx.insert(finTransferencias).values(bloco));
}
