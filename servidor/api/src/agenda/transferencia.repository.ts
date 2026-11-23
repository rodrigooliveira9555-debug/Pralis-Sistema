import { and, asc, eq, inArray, notInArray, sql } from "drizzle-orm";
import {
  agendaArquivos,
  agendaAvaliacoes,
  agendaColunas,
  agendaCompromissos,
  agendaEstado,
  agendaGrupoMembros,
  agendaGrupos,
  agendaMensagens,
  agendaParticipantes,
  agendaRelacoes,
  agendaTransferencias,
  documentos,
  documentosHistorico,
  perfisUsuarios
} from "@cicluz/db/schema";
import { CHAVE_AGENDA } from "@cicluz/shared";
import { banco, type TransacaoBanco } from "../banco/conexao.ts";
import type { Conversao, Existentes } from "./transferencia.regras.ts";

// Transferência do documento da Agenda para as tabelas: só SQL.

type Executor = typeof banco | TransacaoBanco;

export async function documento(ex: Executor, empresaId: string) {
  const [l] = await ex
    .select({ valor: documentos.valor, versao: documentos.versao })
    .from(documentos)
    .where(and(eq(documentos.empresaId, empresaId), eq(documentos.chave, CHAVE_AGENDA)));
  return l ?? null;
}

export async function contas(ex: Executor, empresaId: string) {
  return ex
    .select({ id: perfisUsuarios.usuarioId, nome: perfisUsuarios.nome, ativo: perfisUsuarios.ativo })
    .from(perfisUsuarios)
    .where(eq(perfisUsuarios.empresaId, empresaId))
    .orderBy(asc(perfisUsuarios.nome));
}

/** Uma transferência por vez por empresa. */
export async function travar(tx: TransacaoBanco, empresaId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${"agenda-transferencia:" + empresaId}))`);
}

/** O que já está nas tabelas (retransferência não duplica nem sobrescreve). */
export async function existentes(ex: Executor, empresaId: string): Promise<Existentes> {
  const [gs, cs, cos, rs, ns] = [
    await ex.select({ id: agendaGrupos.id, nome: agendaGrupos.nome, excluidoEm: agendaGrupos.excluidoEm }).from(agendaGrupos).where(eq(agendaGrupos.empresaId, empresaId)),
    await ex.select({ id: agendaColunas.id, nome: agendaColunas.nome }).from(agendaColunas).where(eq(agendaColunas.empresaId, empresaId)),
    await ex
      .select({ id: agendaCompromissos.id, versao: agendaCompromissos.versao, atualizadoEm: agendaCompromissos.atualizadoEm, origemId: agendaCompromissos.origemId, ocorrencia: agendaCompromissos.ocorrencia })
      .from(agendaCompromissos)
      .where(eq(agendaCompromissos.empresaId, empresaId)),
    await ex.select({ id: agendaRelacoes.id, de: agendaRelacoes.deId, para: agendaRelacoes.paraId }).from(agendaRelacoes).where(eq(agendaRelacoes.empresaId, empresaId)),
    await ex
      .select({ c: agendaAvaliacoes.compromissoId, a: agendaAvaliacoes.avaliadoId, p: agendaAvaliacoes.papel })
      .from(agendaAvaliacoes)
      .where(eq(agendaAvaliacoes.empresaId, empresaId))
  ];
  const nome = (s: string) => s.trim().toLocaleLowerCase("pt-BR");
  return {
    grupos: new Set(gs.map((g) => g.id)),
    nomesGrupos: new Set(gs.filter((g) => !g.excluidoEm).map((g) => nome(g.nome))),
    colunas: new Set(cs.map((c) => c.id)),
    nomesColunas: new Set(cs.map((c) => nome(c.nome))),
    compromissos: new Map(cos.map((c) => [c.id, { versao: c.versao, atualizadoEm: c.atualizadoEm }])),
    relacoes: new Set(rs.map((r) => r.id)),
    pares: new Set(rs.map((r) => [r.de, r.para].sort().join("|"))),
    ocorrencias: new Set(cos.filter((c) => c.origemId && c.ocorrencia).map((c) => c.origemId + "|" + c.ocorrencia)),
    notas: new Set(ns.map((n) => n.c + "|" + n.a + "|" + n.p))
  };
}

/** Grava a conversão. Só insere o que falta; atualiza só o que ainda está na versão 1 (ninguém mexeu pela tela nova). */
export async function gravarConversao(tx: TransacaoBanco, empresaId: string, c: Conversao) {
  if (c.grupos.length) await tx.insert(agendaGrupos).values(c.grupos).onConflictDoNothing();
  if (c.membros.length) await tx.insert(agendaGrupoMembros).values(c.membros).onConflictDoNothing();
  if (c.colunas.length) await tx.insert(agendaColunas).values(c.colunas).onConflictDoNothing();
  for (const linha of c.compromissos) await tx.insert(agendaCompromissos).values(linha).onConflictDoNothing();
  for (const linha of c.atualizar) {
    const id = linha.id!;
    const dados = Object.fromEntries(Object.entries(linha).filter(([k]) => !["empresaId", "id", "criadoPor"].includes(k)));
    await tx
      .update(agendaCompromissos)
      .set({ ...dados, versao: sql`${agendaCompromissos.versao} + 1` })
      .where(and(eq(agendaCompromissos.empresaId, empresaId), eq(agendaCompromissos.id, id), eq(agendaCompromissos.versao, 1)));
    await tx.delete(agendaParticipantes).where(and(eq(agendaParticipantes.empresaId, empresaId), eq(agendaParticipantes.compromissoId, id)));
  }
  if (c.participantes.length) await tx.insert(agendaParticipantes).values(c.participantes).onConflictDoNothing();
  if (c.avaliacoes.length) await tx.insert(agendaAvaliacoes).values(c.avaliacoes).onConflictDoNothing();
  if (c.relacoes.length) await tx.insert(agendaRelacoes).values(c.relacoes).onConflictDoNothing();
}

/** Quantos dos ids esperados estão na tabela agora (conferência no banco, dentro da transação). */
export async function presentes(tx: TransacaoBanco, empresaId: string, e: Conversao["esperados"]) {
  const contar = async (tabela: typeof agendaGrupos | typeof agendaColunas | typeof agendaCompromissos | typeof agendaRelacoes, ids: string[]) => {
    if (!ids.length) return 0;
    const [l] = await tx
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(tabela)
      .where(and(eq(tabela.empresaId, empresaId), inArray(tabela.id, ids)));
    return l?.n ?? 0;
  };
  return {
    listas: await contar(agendaGrupos, e.grupos),
    colunas: await contar(agendaColunas, e.colunas),
    itens: await contar(agendaCompromissos, e.compromissos),
    relacoes: await contar(agendaRelacoes, e.relacoes)
  };
}

export async function criarOuSubirEstado(tx: TransacaoBanco, empresaId: string) {
  await tx
    .insert(agendaEstado)
    .values({ empresaId, versao: 1 })
    .onConflictDoUpdate({ target: agendaEstado.empresaId, set: { versao: sql`${agendaEstado.versao} + 1` } });
}

export async function registrar(ex: Executor, linha: typeof agendaTransferencias.$inferInsert) {
  await ex.insert(agendaTransferencias).values(linha);
}

/** Mensagens e arquivos da 0003 cujo compromisso não está no documento nem nas tabelas (órfãos, para a 0009). */
export async function orfaos(empresaId: string, idsConhecidos: string[]) {
  const fora = (coluna: typeof agendaMensagens.compromissoId | typeof agendaArquivos.compromissoId) =>
    idsConhecidos.length ? notInArray(coluna, idsConhecidos) : undefined;
  const [m] = await banco
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(agendaMensagens)
    .where(and(eq(agendaMensagens.empresaId, empresaId), fora(agendaMensagens.compromissoId), sql`not exists (select 1 from ${agendaCompromissos} c where c.empresa_id = ${agendaMensagens.empresaId} and c.id = ${agendaMensagens.compromissoId})`));
  const [a] = await banco
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(agendaArquivos)
    .where(and(eq(agendaArquivos.empresaId, empresaId), fora(agendaArquivos.compromissoId), sql`not exists (select 1 from ${agendaCompromissos} c where c.empresa_id = ${agendaArquivos.empresaId} and c.id = ${agendaArquivos.compromissoId})`));
  return { mensagens: m?.n ?? 0, arquivos: a?.n ?? 0 };
}

/** Gravações da Agenda recusadas por conflito (G4: o que "sumiu da tela"). */
export async function conflitosGuardados(empresaId: string) {
  return banco
    .select({ valor: documentosHistorico.valor, gravadoEm: documentosHistorico.gravadoEm })
    .from(documentosHistorico)
    .where(and(eq(documentosHistorico.empresaId, empresaId), eq(documentosHistorico.chave, CHAVE_AGENDA), eq(documentosHistorico.tipo, "conflito")))
    .orderBy(asc(documentosHistorico.gravadoEm))
    .limit(200);
}

/** A cópia antiga de um aparelho fica guardada inteira no histórico (nada é aplicado sozinho). */
export async function guardarCopiaDoAparelho(empresaId: string, valor: string, por: string) {
  await banco.insert(documentosHistorico).values({ empresaId, chave: CHAVE_AGENDA, valor, versao: null, tipo: "conflito", gravadoPor: por });
}

export async function compromissosPorId(empresaId: string, ids: string[]) {
  if (!ids.length) return [] as Array<{ id: string; atualizadoEm: Date; excluidoEm: Date | null }>;
  return banco
    .select({ id: agendaCompromissos.id, atualizadoEm: agendaCompromissos.atualizadoEm, excluidoEm: agendaCompromissos.excluidoEm })
    .from(agendaCompromissos)
    .where(and(eq(agendaCompromissos.empresaId, empresaId), inArray(agendaCompromissos.id, ids)));
}

