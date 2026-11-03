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
  if (linhas.length) await tx.insert(contas).values(comEmpresa(empresaId, linhas));
}

export async function substituirCargos(tx: TransacaoBanco, empresaId: string, linhas: ReturnType<typeof lerCargos>) {
  await apagar(tx, empresaId, cargos);
  if (linhas.length) await tx.insert(cargos).values(comEmpresa(empresaId, linhas));
}

export async function substituirSalarios(tx: TransacaoBanco, empresaId: string, dados: ReturnType<typeof lerSalarios>) {
  await apagar(tx, empresaId, salariosValores, salariosVigencias);
  if (dados.vigencias.length) await tx.insert(salariosVigencias).values(comEmpresa(empresaId, dados.vigencias));
  if (dados.valores.length) await tx.insert(salariosValores).values(comEmpresa(empresaId, dados.valores));
}

export async function substituirPerfis(tx: TransacaoBanco, empresaId: string, dados: ReturnType<typeof lerPerfis>) {
  await apagar(tx, empresaId, perfisCargosRequisitos, perfisCargos, perfisRequisitos, perfisAreas);
  if (dados.areas.length) await tx.insert(perfisAreas).values(comEmpresa(empresaId, dados.areas));
  if (dados.requisitos.length) await tx.insert(perfisRequisitos).values(comEmpresa(empresaId, dados.requisitos));
  if (dados.cargos.length) await tx.insert(perfisCargos).values(comEmpresa(empresaId, dados.cargos));
  if (dados.vinculos.length) await tx.insert(perfisCargosRequisitos).values(comEmpresa(empresaId, dados.vinculos));
}

export async function substituirLocais(tx: TransacaoBanco, empresaId: string, dados: ReturnType<typeof lerLocais>) {
  await apagar(tx, empresaId, locaisTransferencias, locais);
  // Nível por nível: a FK do pai é conferida a cada INSERT.
  for (let nivel = 1; nivel <= 4; nivel += 1) {
    const doNivel = dados.locais.filter((local) => local.nivel === nivel);
    if (doNivel.length) await tx.insert(locais).values(comEmpresa(empresaId, doNivel));
  }
  if (dados.transferencias.length) await tx.insert(locaisTransferencias).values(comEmpresa(empresaId, dados.transferencias));
}

export async function substituirOrganograma(tx: TransacaoBanco, empresaId: string, dados: ReturnType<typeof lerOrganograma>) {
  await apagar(tx, empresaId, organogramaVersoes, organogramaPosicoes);
  // A leitura entrega em largura (pai antes dos filhos); um INSERT por posição mantém a FK válida.
  for (const posicao of dados.posicoes) await tx.insert(organogramaPosicoes).values({ ...posicao, empresaId });
  if (dados.versoes.length) await tx.insert(organogramaVersoes).values(comEmpresa(empresaId, dados.versoes));
}

export async function substituirIdentidade(tx: TransacaoBanco, empresaId: string, dados: ReturnType<typeof lerIdentidade>) {
  await apagar(tx, empresaId, iconesPersonalizados, coresPersonalizadas);
  if (dados.icones.length) await tx.insert(iconesPersonalizados).values(comEmpresa(empresaId, dados.icones));
  if (dados.cores.length) await tx.insert(coresPersonalizadas).values(comEmpresa(empresaId, dados.cores));
}
