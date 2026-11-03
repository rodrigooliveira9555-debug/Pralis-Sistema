import { and, asc, count, eq, sql } from "drizzle-orm";
import { empresas, perfisUsuarios, usuarioAutenticacao } from "@cicluz/db/schema";
import type { Papel } from "@cicluz/shared";
import { banco } from "../banco/conexao.ts";

export async function emailJaCadastrado(email: string) {
  const [linha] = await banco
    .select({ id: usuarioAutenticacao.id })
    .from(usuarioAutenticacao)
    .where(eq(usuarioAutenticacao.email, email))
    .limit(1);
  return Boolean(linha);
}

export async function obterEmpresaPorNome(nome: string) {
  const [empresa] = await banco.select({ id: empresas.id }).from(empresas).where(eq(empresas.nome, nome)).limit(1);
  return empresa ?? null;
}

export async function criarEmpresa(nome: string) {
  const [empresa] = await banco.insert(empresas).values({ nome }).returning({ id: empresas.id });
  if (!empresa) throw new Error("empresa não criada");
  return empresa;
}

export async function inserirPerfil(dados: { usuarioId: string; empresaId: string; nome: string; papel: Papel }) {
  await banco.insert(perfisUsuarios).values(dados);
}

const colunasUsuario = {
  id: perfisUsuarios.usuarioId,
  nome: perfisUsuarios.nome,
  email: usuarioAutenticacao.email,
  papel: perfisUsuarios.papel,
  ativo: perfisUsuarios.ativo,
  criadoEm: perfisUsuarios.criadoEm
};

export async function listarUsuariosDaEmpresa(empresaId: string) {
  return banco
    .select(colunasUsuario)
    .from(perfisUsuarios)
    .innerJoin(usuarioAutenticacao, eq(usuarioAutenticacao.id, perfisUsuarios.usuarioId))
    .where(eq(perfisUsuarios.empresaId, empresaId))
    .orderBy(asc(perfisUsuarios.nome));
}

// Sempre pela empresa da sessão: um administrador nunca enxerga conta de outra empresa.
export async function obterUsuarioDaEmpresa(empresaId: string, usuarioId: string) {
  const [linha] = await banco
    .select(colunasUsuario)
    .from(perfisUsuarios)
    .innerJoin(usuarioAutenticacao, eq(usuarioAutenticacao.id, perfisUsuarios.usuarioId))
    .where(and(eq(perfisUsuarios.empresaId, empresaId), eq(perfisUsuarios.usuarioId, usuarioId)))
    .limit(1);
  return linha ?? null;
}

export async function contarAdministradoresAtivos(empresaId: string) {
  const [linha] = await banco
    .select({ total: count() })
    .from(perfisUsuarios)
    .where(
      and(eq(perfisUsuarios.empresaId, empresaId), eq(perfisUsuarios.papel, "administrador"), eq(perfisUsuarios.ativo, true))
    );
  return linha?.total ?? 0;
}

export async function atualizarPerfil(
  empresaId: string,
  usuarioId: string,
  dados: { nome?: string | undefined; papel?: Papel | undefined; ativo?: boolean | undefined }
) {
  const mudancas = Object.fromEntries(Object.entries(dados).filter(([, valor]) => valor !== undefined));
  await banco
    .update(perfisUsuarios)
    .set({ ...mudancas, atualizadoEm: sql`now()` })
    .where(and(eq(perfisUsuarios.empresaId, empresaId), eq(perfisUsuarios.usuarioId, usuarioId)));
  if (dados.nome) {
    await banco.update(usuarioAutenticacao).set({ name: dados.nome }).where(eq(usuarioAutenticacao.id, usuarioId));
  }
}
