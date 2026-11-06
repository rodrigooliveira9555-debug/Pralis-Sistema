import { and, asc, eq, inArray, sql } from "drizzle-orm";
import {
  cargosAcesso,
  cargosAcessoAuditoria,
  cargosAcessoPermissoes,
  perfisUsuarios,
  usuariosCargosAcesso,
  usuariosPermissoes
} from "@cicluz/db/schema";
import { banco, type TransacaoBanco } from "../banco/conexao.ts";

type Executor = TransacaoBanco | typeof banco;

export type CargoLinha = { id: string; nome: string; descricao: string; ativo: boolean; permissoes: string[]; pessoas: number };

// Sempre pela empresa da sessão: nenhum cargo de outra empresa aparece ou é alterado.
export async function listarCargosDaEmpresa(empresaId: string): Promise<CargoLinha[]> {
  const cargos = await banco
    .select({ id: cargosAcesso.id, nome: cargosAcesso.nome, descricao: cargosAcesso.descricao, ativo: cargosAcesso.ativo })
    .from(cargosAcesso)
    .where(eq(cargosAcesso.empresaId, empresaId))
    .orderBy(asc(cargosAcesso.nome));
  if (!cargos.length) return [];
  const ids = cargos.map((cargo) => cargo.id);
  const [permissoes, pessoas] = await Promise.all([
    banco.select().from(cargosAcessoPermissoes).where(inArray(cargosAcessoPermissoes.cargoId, ids)),
    banco
      .select({ cargoId: usuariosCargosAcesso.cargoId, total: sql<number>`count(*)::int` })
      .from(usuariosCargosAcesso)
      .innerJoin(perfisUsuarios, eq(perfisUsuarios.usuarioId, usuariosCargosAcesso.usuarioId))
      .where(and(inArray(usuariosCargosAcesso.cargoId, ids), eq(perfisUsuarios.ativo, true)))
      .groupBy(usuariosCargosAcesso.cargoId)
  ]);
  return cargos.map((cargo) => ({
    ...cargo,
    permissoes: permissoes.filter((linha) => linha.cargoId === cargo.id).map((linha) => linha.permissao),
    pessoas: pessoas.find((linha) => linha.cargoId === cargo.id)?.total ?? 0
  }));
}

export async function obterCargoDaEmpresa(empresaId: string, cargoId: string) {
  return (await listarCargosDaEmpresa(empresaId)).find((cargo) => cargo.id === cargoId) ?? null;
}

export async function inserirCargo(tx: TransacaoBanco, dados: { empresaId: string; nome: string; descricao: string }) {
  const [linha] = await tx.insert(cargosAcesso).values(dados).returning({ id: cargosAcesso.id });
  if (!linha) throw new Error("cargo não criado");
  return linha.id;
}

export async function atualizarCargo(
  tx: TransacaoBanco,
  empresaId: string,
  cargoId: string,
  dados: { nome?: string | undefined; descricao?: string | undefined; ativo?: boolean | undefined }
) {
  const mudancas = Object.fromEntries(Object.entries(dados).filter(([, valor]) => valor !== undefined));
  if (!Object.keys(mudancas).length) return;
  await tx
    .update(cargosAcesso)
    .set({ ...mudancas, atualizadoEm: sql`now()` })
    .where(and(eq(cargosAcesso.empresaId, empresaId), eq(cargosAcesso.id, cargoId)));
}

export async function substituirPermissoesCargo(tx: TransacaoBanco, cargoId: string, chaves: readonly string[]) {
  await tx.delete(cargosAcessoPermissoes).where(eq(cargosAcessoPermissoes.cargoId, cargoId));
  if (chaves.length) await tx.insert(cargosAcessoPermissoes).values(chaves.map((permissao) => ({ cargoId, permissao })));
}

export async function auditarCargo(
  executor: Executor,
  dados: { empresaId: string; atorId: string; cargoId: string; acao: "criou" | "alterou"; detalhe?: Record<string, unknown> }
) {
  await executor.insert(cargosAcessoAuditoria).values({ ...dados, detalhe: dados.detalhe ?? null });
}

// Cargos (só os ativos contam) e exceções de uma pessoa: base das permissões efetivas.
export async function acessosDoUsuario(usuarioId: string) {
  const [cargos, excecoes] = await Promise.all([
    banco
      .select({ id: cargosAcesso.id, nome: cargosAcesso.nome, ativo: cargosAcesso.ativo, permissao: cargosAcessoPermissoes.permissao })
      .from(usuariosCargosAcesso)
      .innerJoin(cargosAcesso, eq(cargosAcesso.id, usuariosCargosAcesso.cargoId))
      .leftJoin(cargosAcessoPermissoes, eq(cargosAcessoPermissoes.cargoId, cargosAcesso.id))
      .where(eq(usuariosCargosAcesso.usuarioId, usuarioId)),
    banco.select().from(usuariosPermissoes).where(eq(usuariosPermissoes.usuarioId, usuarioId))
  ]);
  const porCargo = new Map<string, { id: string; nome: string; ativo: boolean; permissoes: string[] }>();
  for (const linha of cargos) {
    const cargo = porCargo.get(linha.id) ?? { id: linha.id, nome: linha.nome, ativo: linha.ativo, permissoes: [] };
    if (linha.permissao) cargo.permissoes.push(linha.permissao);
    porCargo.set(linha.id, cargo);
  }
  return {
    cargos: [...porCargo.values()],
    excecoes: Object.fromEntries(excecoes.map((linha) => [linha.permissao, linha.permitido])) as Record<string, boolean>
  };
}

export async function substituirCargosUsuario(tx: TransacaoBanco, usuarioId: string, cargos: readonly string[]) {
  await tx.delete(usuariosCargosAcesso).where(eq(usuariosCargosAcesso.usuarioId, usuarioId));
  if (cargos.length) await tx.insert(usuariosCargosAcesso).values(cargos.map((cargoId) => ({ usuarioId, cargoId })));
}

export async function substituirExcecoesUsuario(tx: TransacaoBanco, usuarioId: string, excecoes: Record<string, boolean>) {
  await tx.delete(usuariosPermissoes).where(eq(usuariosPermissoes.usuarioId, usuarioId));
  const linhas = Object.entries(excecoes).map(([permissao, permitido]) => ({ usuarioId, permissao, permitido }));
  if (linhas.length) await tx.insert(usuariosPermissoes).values(linhas);
}

// Cargo de cada pessoa da empresa, para a lista de Usuários.
export async function cargosDasPessoas(empresaId: string) {
  const linhas = await banco
    .select({ usuarioId: usuariosCargosAcesso.usuarioId, id: cargosAcesso.id, nome: cargosAcesso.nome })
    .from(usuariosCargosAcesso)
    .innerJoin(cargosAcesso, eq(cargosAcesso.id, usuariosCargosAcesso.cargoId))
    .where(and(eq(cargosAcesso.empresaId, empresaId), eq(cargosAcesso.ativo, true)))
    .orderBy(asc(cargosAcesso.nome));
  const mapa = new Map<string, { id: string; nome: string }[]>();
  for (const linha of linhas) mapa.set(linha.usuarioId, [...(mapa.get(linha.usuarioId) ?? []), { id: linha.id, nome: linha.nome }]);
  return mapa;
}
