import { and, asc, eq, sql } from "drizzle-orm";
import { empresas, perfisUsuarios, usuarioAutenticacao, usuariosAuditoria } from "@cicluz/db/schema";
import type { Papel, Posto } from "@cicluz/shared";
import { banco, type TransacaoBanco } from "../banco/conexao.ts";

type Executor = TransacaoBanco | typeof banco;

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

// configurada: conta criada pela tela já segue cargos de acesso (sem cargo = sem acesso). O script de
// administrador cria conta sem essa marca.
export async function inserirPerfil(dados: {
  usuarioId: string;
  empresaId: string;
  nome: string;
  papel: Papel;
  posto?: Posto | null;
  configurada?: boolean;
}) {
  const { posto, configurada, ...perfil } = dados;
  await banco.insert(perfisUsuarios).values({
    ...perfil,
    postoPdv: posto?.pdv ?? null,
    postoTurno: posto?.turno ?? null,
    acessosConfiguradosEm: configurada ? new Date() : null
  });
}

// A conta passa a seguir os cargos de acesso (uma vez só; nunca volta a ser conta de antes).
export async function marcarAcessosConfigurados(executor: Executor, empresaId: string, usuarioId: string) {
  await executor
    .update(perfisUsuarios)
    .set({ acessosConfiguradosEm: sql`coalesce(${perfisUsuarios.acessosConfiguradosEm}, now())` })
    .where(and(eq(perfisUsuarios.empresaId, empresaId), eq(perfisUsuarios.usuarioId, usuarioId)));
}

const colunasUsuario = {
  id: perfisUsuarios.usuarioId,
  nome: perfisUsuarios.nome,
  email: usuarioAutenticacao.email,
  papel: perfisUsuarios.papel,
  ativo: perfisUsuarios.ativo,
  postoPdv: perfisUsuarios.postoPdv,
  postoTurno: perfisUsuarios.postoTurno,
  acessosConfiguradosEm: perfisUsuarios.acessosConfiguradosEm,
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

// FOR UPDATE nos administradores ativos: duas alterações simultâneas não deixam a empresa sem nenhum.
export async function travarAdministradoresAtivos(tx: TransacaoBanco, empresaId: string) {
  const linhas = await tx
    .select({ usuarioId: perfisUsuarios.usuarioId })
    .from(perfisUsuarios)
    .where(
      and(eq(perfisUsuarios.empresaId, empresaId), eq(perfisUsuarios.papel, "administrador"), eq(perfisUsuarios.ativo, true))
    )
    .for("update");
  return linhas.length;
}

export async function registrarAuditoria(
  executor: Executor,
  dados: {
    empresaId: string;
    atorId: string;
    alvoId: string;
    acao: "criou" | "alterou" | "definiu_senha" | "alterou_acessos";
    detalhe?: Record<string, unknown>;
  }
) {
  await executor.insert(usuariosAuditoria).values({ ...dados, detalhe: dados.detalhe ?? null });
}

export async function atualizarPerfil(
  executor: Executor,
  empresaId: string,
  usuarioId: string,
  dados: { nome?: string | undefined; papel?: Papel | undefined; ativo?: boolean | undefined; posto?: Posto | null | undefined }
) {
  const { posto, ...resto } = dados;
  const mudancas: Record<string, unknown> = Object.fromEntries(Object.entries(resto).filter(([, valor]) => valor !== undefined));
  // posto: undefined = não mexe; null = deixa de ser conta de posto.
  if (posto !== undefined) Object.assign(mudancas, { postoPdv: posto?.pdv ?? null, postoTurno: posto?.turno ?? null });
  await executor
    .update(perfisUsuarios)
    .set({ ...mudancas, atualizadoEm: sql`now()` })
    .where(and(eq(perfisUsuarios.empresaId, empresaId), eq(perfisUsuarios.usuarioId, usuarioId)));
  if (dados.nome) {
    await executor.update(usuarioAutenticacao).set({ name: dados.nome }).where(eq(usuarioAutenticacao.id, usuarioId));
  }
}

// Quem já usa o posto (PDV × turno) na empresa, fora a própria conta que está sendo editada.
export async function contaDoPosto(empresaId: string, posto: Posto, excetoUsuarioId?: string) {
  const linhas = await banco
    .select({ usuarioId: perfisUsuarios.usuarioId, nome: perfisUsuarios.nome })
    .from(perfisUsuarios)
    .where(
      and(eq(perfisUsuarios.empresaId, empresaId), eq(perfisUsuarios.postoPdv, posto.pdv), eq(perfisUsuarios.postoTurno, posto.turno))
    );
  return linhas.find((linha) => linha.usuarioId !== excetoUsuarioId) ?? null;
}
