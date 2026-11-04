import { eq } from "drizzle-orm";
import {
  cargos,
  contas,
  coresPersonalizadas,
  iconesPersonalizados,
  locais,
  locaisTransferencias,
  organogramaPosicoes,
  organogramaVersoes,
  perfisAreas,
  perfisCargos,
  perfisCargosRequisitos,
  perfisRequisitos,
  salariosValores,
  salariosVigencias
} from "@cicluz/db/schema";
import type { TransacaoBanco } from "../banco/conexao.ts";
import { emBlocos } from "./blocos.ts";
import type { lerCargos, lerContas, lerIdentidade, lerLocais, lerOrganograma, lerPerfis, lerSalarios } from "./estrutura.leitura.ts";

// Cada função troca as tabelas de um assunto da empresa pelas linhas lidas do documento. Apaga
// filhos antes dos pais e insere pais antes dos filhos (as leituras já entregam nessa ordem).

type TabelaDaEmpresa =
  | typeof contas
  | typeof cargos
  | typeof salariosValores
  | typeof salariosVigencias
  | typeof perfisCargosRequisitos
  | typeof perfisCargos
  | typeof perfisRequisitos
  | typeof perfisAreas
  | typeof locaisTransferencias
  | typeof locais
  | typeof organogramaVersoes
  | typeof organogramaPosicoes
  | typeof iconesPersonalizados
  | typeof coresPersonalizadas;

function comEmpresa<T extends object>(empresaId: string, linhas: T[]) {
  return linhas.map((linha) => ({ ...linha, empresaId }));
}

async function apagar(tx: TransacaoBanco, empresaId: string, ...tabelas: TabelaDaEmpresa[]) {
  for (const tabela of tabelas) await tx.delete(tabela).where(eq(tabela.empresaId, empresaId));
}

export async function substituirContas(tx: TransacaoBanco, empresaId: string, linhas: ReturnType<typeof lerContas>) {
  await apagar(tx, empresaId, contas);
  await emBlocos(comEmpresa(empresaId, linhas), (bloco) => tx.insert(contas).values(bloco));
}

export async function substituirCargos(tx: TransacaoBanco, empresaId: string, linhas: ReturnType<typeof lerCargos>) {
  await apagar(tx, empresaId, cargos);
  await emBlocos(comEmpresa(empresaId, linhas), (bloco) => tx.insert(cargos).values(bloco));
}

export async function substituirSalarios(tx: TransacaoBanco, empresaId: string, dados: ReturnType<typeof lerSalarios>) {
  await apagar(tx, empresaId, salariosValores, salariosVigencias);
  await emBlocos(comEmpresa(empresaId, dados.vigencias), (bloco) => tx.insert(salariosVigencias).values(bloco));
  await emBlocos(comEmpresa(empresaId, dados.valores), (bloco) => tx.insert(salariosValores).values(bloco));
}

export async function substituirPerfis(tx: TransacaoBanco, empresaId: string, dados: ReturnType<typeof lerPerfis>) {
  await apagar(tx, empresaId, perfisCargosRequisitos, perfisCargos, perfisRequisitos, perfisAreas);
  await emBlocos(comEmpresa(empresaId, dados.areas), (bloco) => tx.insert(perfisAreas).values(bloco));
  await emBlocos(comEmpresa(empresaId, dados.requisitos), (bloco) => tx.insert(perfisRequisitos).values(bloco));
  await emBlocos(comEmpresa(empresaId, dados.cargos), (bloco) => tx.insert(perfisCargos).values(bloco));
  await emBlocos(comEmpresa(empresaId, dados.vinculos), (bloco) => tx.insert(perfisCargosRequisitos).values(bloco));
}

export async function substituirLocais(tx: TransacaoBanco, empresaId: string, dados: ReturnType<typeof lerLocais>) {
  await apagar(tx, empresaId, locaisTransferencias, locais);
  // A leitura entrega em largura (pai antes dos filhos); a FK do pai é conferida no fim de cada
  // INSERT, então pai e filho no mesmo bloco também valem.
  await emBlocos(comEmpresa(empresaId, dados.locais), (bloco) => tx.insert(locais).values(bloco));
  await emBlocos(comEmpresa(empresaId, dados.transferencias), (bloco) => tx.insert(locaisTransferencias).values(bloco));
}

export async function substituirOrganograma(tx: TransacaoBanco, empresaId: string, dados: ReturnType<typeof lerOrganograma>) {
  await apagar(tx, empresaId, organogramaVersoes, organogramaPosicoes);
  // Em largura (pai antes dos filhos), em blocos: a FK do pai é conferida no fim de cada INSERT.
  await emBlocos(comEmpresa(empresaId, dados.posicoes), (bloco) => tx.insert(organogramaPosicoes).values(bloco));
  await emBlocos(comEmpresa(empresaId, dados.versoes), (bloco) => tx.insert(organogramaVersoes).values(bloco));
}

export async function substituirIdentidade(tx: TransacaoBanco, empresaId: string, dados: ReturnType<typeof lerIdentidade>) {
  await apagar(tx, empresaId, iconesPersonalizados, coresPersonalizadas);
  await emBlocos(comEmpresa(empresaId, dados.icones), (bloco) => tx.insert(iconesPersonalizados).values(bloco));
  await emBlocos(comEmpresa(empresaId, dados.cores), (bloco) => tx.insert(coresPersonalizadas).values(bloco));
}
