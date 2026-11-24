import { and, asc, desc, eq, isNull, ne, sql } from "drizzle-orm";
import {
  agendaCompromissos,
  agendaConfigPessoas,
  agendaGrupoLeituras,
  agendaGrupoMensagens,
  agendaHorasFora,
  agendaParticipantes,
  perfisUsuarios,
  usuarioAutenticacao
} from "@cicluz/db/schema";
import type { ConfigPessoa } from "@cicluz/shared";
import { banco, type TransacaoBanco } from "../banco/conexao.ts";

// Consultas da rotina da Agenda (0008): configurações por pessoa, desempenho, tarefas vindas de tela e chat do grupo.

type Executor = typeof banco | TransacaoBanco;

/* ---------- Pessoas e configurações ---------- */

export async function contas(empresaId: string) {
  return banco
    .select({ id: perfisUsuarios.usuarioId, nome: perfisUsuarios.nome, ativo: perfisUsuarios.ativo, papel: perfisUsuarios.papel })
    .from(perfisUsuarios)
    .where(eq(perfisUsuarios.empresaId, empresaId))
    .orderBy(asc(perfisUsuarios.nome));
}

export async function configs(empresaId: string) {
  return banco.select().from(agendaConfigPessoas).where(eq(agendaConfigPessoas.empresaId, empresaId));
}

export async function salvarConfig(empresaId: string, usuarioId: string, c: ConfigPessoa, por: string) {
  const valores = {
    expedienteDias: [...new Set(c.expedienteDias)].sort((a, b) => a - b),
    expedienteInicio: c.expedienteInicio || null,
    expedienteFim: c.expedienteFim || null,
    foraExpediente: c.foraExpediente,
    horaFora: c.horaFora,
    inatividadeMinutos: c.inatividadeMinutos,
    atualizadoEm: new Date(),
    atualizadoPor: por
  };
  const [l] = await banco
    .insert(agendaConfigPessoas)
    .values({ empresaId, usuarioId, ...valores })
    .onConflictDoUpdate({ target: [agendaConfigPessoas.empresaId, agendaConfigPessoas.usuarioId], set: valores })
    .returning();
  return l!;
}

/** Primeiro administrador ativo da empresa (dono da lista "Tarefas das telas"). */
export async function administrador(ex: Executor, empresaId: string) {
  const [l] = await ex
    .select({ id: perfisUsuarios.usuarioId })
    .from(perfisUsuarios)
    .where(and(eq(perfisUsuarios.empresaId, empresaId), eq(perfisUsuarios.papel, "administrador"), eq(perfisUsuarios.ativo, true)))
    .orderBy(asc(perfisUsuarios.criadoEm))
    .limit(1);
  return l?.id ?? null;
}

/* ---------- Tarefa vinda de tela ---------- */

export async function porVinculo(ex: Executor, empresaId: string, vinculoRef: string) {
  const [l] = await ex
    .select()
    .from(agendaCompromissos)
    .where(and(eq(agendaCompromissos.empresaId, empresaId), eq(agendaCompromissos.vinculoRef, vinculoRef), isNull(agendaCompromissos.origemId)))
    .limit(1);
  return l ?? null;
}

/* ---------- Desempenho ---------- */

/** Compromissos com data no período em que cada pessoa é responsável (não excluídos). */
export async function responsabilidades(empresaId: string, de: string, ate: string, usuarioId: string | null) {
  return banco
    .select({
      usuarioId: agendaParticipantes.usuarioId,
      id: agendaCompromissos.id,
      data: agendaCompromissos.data,
      hora: agendaCompromissos.hora,
      horaFim: agendaCompromissos.horaFim,
      concluida: agendaCompromissos.concluida,
      concluidaEm: agendaCompromissos.concluidaEm,
      criadoEm: agendaCompromissos.criadoEm
    })
    .from(agendaParticipantes)
    .innerJoin(
      agendaCompromissos,
      and(eq(agendaCompromissos.empresaId, agendaParticipantes.empresaId), eq(agendaCompromissos.id, agendaParticipantes.compromissoId))
    )
    .where(
      and(
        eq(agendaParticipantes.empresaId, empresaId),
        eq(agendaParticipantes.responsavel, true),
        isNull(agendaCompromissos.excluidoEm),
        sql`${agendaCompromissos.data} between ${de}::date and ${ate}::date`,
        usuarioId ? eq(agendaParticipantes.usuarioId, usuarioId) : sql`true`
      )
    );
}

/** Hora fora do expediente do período: o maior registro de cada dia (regra simplificada do áudio). */
export async function horasForaPorDia(empresaId: string, de: string, ate: string, usuarioId: string | null) {
  return banco
    .select({
      usuarioId: agendaHorasFora.usuarioId,
      dia: agendaHorasFora.dia,
      minutos: sql<number | null>`max(${agendaHorasFora.minutos})`,
      semExpediente: sql<boolean>`bool_or(${agendaHorasFora.minutos} is null)`
    })
    .from(agendaHorasFora)
    .where(
      and(
        eq(agendaHorasFora.empresaId, empresaId),
        sql`${agendaHorasFora.dia} between ${de}::date and ${ate}::date`,
        usuarioId ? eq(agendaHorasFora.usuarioId, usuarioId) : sql`true`
      )
    )
    .groupBy(agendaHorasFora.usuarioId, agendaHorasFora.dia);
}

/* ---------- Chat do grupo ---------- */

export async function listarMensagensGrupo(empresaId: string, grupoId: string, depois?: string) {
  const filtros = [eq(agendaGrupoMensagens.empresaId, empresaId), eq(agendaGrupoMensagens.grupoId, grupoId)];
  if (depois) filtros.push(sql`date_trunc('milliseconds', ${agendaGrupoMensagens.criadoEm}) > ${new Date(depois).toISOString()}::timestamptz`);
  const linhas = await banco
    .select({ id: agendaGrupoMensagens.id, autorId: agendaGrupoMensagens.autorId, autorNome: usuarioAutenticacao.name, texto: agendaGrupoMensagens.texto, criadoEm: agendaGrupoMensagens.criadoEm })
    .from(agendaGrupoMensagens)
    .innerJoin(usuarioAutenticacao, eq(usuarioAutenticacao.id, agendaGrupoMensagens.autorId))
    .where(and(...filtros))
    .orderBy(desc(agendaGrupoMensagens.criadoEm), desc(agendaGrupoMensagens.id))
    .limit(500);
  return linhas.reverse();
}

export async function inserirMensagemGrupo(empresaId: string, grupoId: string, autorId: string, texto: string) {
  const [l] = await banco.insert(agendaGrupoMensagens).values({ empresaId, grupoId, autorId, texto }).returning();
  return l!;
}

export async function marcarLidoGrupo(empresaId: string, grupoId: string, usuarioId: string) {
  await banco
    .insert(agendaGrupoLeituras)
    .values({ empresaId, grupoId, usuarioId, lidoAte: sql`now()` })
    .onConflictDoUpdate({ target: [agendaGrupoLeituras.empresaId, agendaGrupoLeituras.grupoId, agendaGrupoLeituras.usuarioId], set: { lidoAte: sql`now()` } });
}

export async function contarNaoLidasGrupos(empresaId: string, usuarioId: string) {
  return banco
    .select({ grupoId: agendaGrupoMensagens.grupoId, total: sql<number>`count(*)::int` })
    .from(agendaGrupoMensagens)
    .leftJoin(
      agendaGrupoLeituras,
      and(eq(agendaGrupoLeituras.empresaId, agendaGrupoMensagens.empresaId), eq(agendaGrupoLeituras.grupoId, agendaGrupoMensagens.grupoId), eq(agendaGrupoLeituras.usuarioId, usuarioId))
    )
    .where(and(eq(agendaGrupoMensagens.empresaId, empresaId), ne(agendaGrupoMensagens.autorId, usuarioId), sql`(${agendaGrupoLeituras.lidoAte} is null or ${agendaGrupoMensagens.criadoEm} > ${agendaGrupoLeituras.lidoAte})`))
    .groupBy(agendaGrupoMensagens.grupoId);
}
