import { and, asc, eq, isNull, ne, or, sql } from "drizzle-orm";
import {
  agendaAdiamentos,
  agendaAvaliacoes,
  agendaColunas,
  agendaCompromissos,
  agendaGrupoMembros,
  agendaGrupos,
  agendaRelacoes,
  perfisUsuarios
} from "@cicluz/db/schema";
import { banco, type TransacaoBanco } from "../banco/conexao.ts";

// Listas (grupos), membros, colunas, ligações do mapa, avaliações e soneca: só SQL.

/* ---------- Pessoas: contas ativas da empresa (sem e-mail, sem CPF) ---------- */
export async function pessoasAtivas(empresaId: string) {
  return banco
    .select({ id: perfisUsuarios.usuarioId, nome: perfisUsuarios.nome })
    .from(perfisUsuarios)
    .where(and(eq(perfisUsuarios.empresaId, empresaId), eq(perfisUsuarios.ativo, true)))
    .orderBy(asc(perfisUsuarios.nome));
}

/* ---------- Listas ---------- */
export async function inserirGrupo(tx: TransacaoBanco, linha: typeof agendaGrupos.$inferInsert) {
  const r = await tx.insert(agendaGrupos).values(linha).onConflictDoNothing({ target: [agendaGrupos.empresaId, agendaGrupos.id] }).returning({ id: agendaGrupos.id });
  return r.length > 0;
}
export async function grupoTravado(tx: TransacaoBanco, empresaId: string, id: string) {
  const [linha] = await tx.select().from(agendaGrupos).where(and(eq(agendaGrupos.empresaId, empresaId), eq(agendaGrupos.id, id))).limit(1).for("update");
  return linha ?? null;
}
export async function atualizarGrupo(tx: TransacaoBanco, empresaId: string, id: string, dados: Partial<typeof agendaGrupos.$inferInsert>) {
  const [linha] = await tx
    .update(agendaGrupos)
    .set({ ...dados, versao: sql`${agendaGrupos.versao} + 1`, atualizadoEm: new Date() })
    .where(and(eq(agendaGrupos.empresaId, empresaId), eq(agendaGrupos.id, id)))
    .returning();
  return linha!;
}
export async function maiorOrdemGrupo(tx: TransacaoBanco, empresaId: string) {
  const [l] = await tx.select({ m: sql<number | null>`max(${agendaGrupos.ordem})` }).from(agendaGrupos).where(eq(agendaGrupos.empresaId, empresaId));
  return Number(l?.m ?? -1);
}
export async function outrosGruposAtivos(tx: TransacaoBanco, empresaId: string, id: string) {
  const [l] = await tx
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(agendaGrupos)
    .where(and(eq(agendaGrupos.empresaId, empresaId), ne(agendaGrupos.id, id), isNull(agendaGrupos.excluidoEm)));
  return l?.n ?? 0;
}
export async function compromissosNoGrupo(tx: TransacaoBanco, empresaId: string, grupoId: string) {
  const [l] = await tx
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(agendaCompromissos)
    .where(and(eq(agendaCompromissos.empresaId, empresaId), eq(agendaCompromissos.grupoId, grupoId), isNull(agendaCompromissos.excluidoEm)));
  return l?.n ?? 0;
}
export async function membrosDe(ex: typeof banco | TransacaoBanco, empresaId: string, grupoId: string) {
  const r = await ex
    .select({ id: agendaGrupoMembros.usuarioId })
    .from(agendaGrupoMembros)
    .where(and(eq(agendaGrupoMembros.empresaId, empresaId), eq(agendaGrupoMembros.grupoId, grupoId)));
  return r.map((x) => x.id);
}
export async function trocarMembros(tx: TransacaoBanco, empresaId: string, grupoId: string, ids: string[], criadoPor: string) {
  await tx.delete(agendaGrupoMembros).where(and(eq(agendaGrupoMembros.empresaId, empresaId), eq(agendaGrupoMembros.grupoId, grupoId)));
  if (!ids.length) return;
  await tx.insert(agendaGrupoMembros).values(ids.map((usuarioId) => ({ empresaId, grupoId, usuarioId, criadoPor, origem: "manual" })));
}

/* ---------- Colunas ---------- */
export async function inserirColuna(tx: TransacaoBanco, linha: typeof agendaColunas.$inferInsert) {
  const r = await tx.insert(agendaColunas).values(linha).onConflictDoNothing({ target: [agendaColunas.empresaId, agendaColunas.id] }).returning({ id: agendaColunas.id });
  return r.length > 0;
}
export async function maiorOrdemColuna(tx: TransacaoBanco, empresaId: string) {
  const [l] = await tx.select({ m: sql<number | null>`max(${agendaColunas.ordem})` }).from(agendaColunas).where(eq(agendaColunas.empresaId, empresaId));
  return Number(l?.m ?? -1);
}
export async function renomearColuna(tx: TransacaoBanco, empresaId: string, id: string, nome: string, por: string) {
  const r = await tx
    .update(agendaColunas)
    .set({ nome, atualizadoEm: new Date(), atualizadoPor: por })
    .where(and(eq(agendaColunas.empresaId, empresaId), eq(agendaColunas.id, id)))
    .returning({ id: agendaColunas.id });
  return r.length > 0;
}
/** Cartões abertos que estão na coluna (os sem coluna contam na primeira, como na tela). */
export async function abertosNaColuna(tx: TransacaoBanco, empresaId: string, colunaId: string, ehPrimeira: boolean) {
  const naColuna = eq(agendaCompromissos.colunaId, colunaId);
  const [l] = await tx
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(agendaCompromissos)
    .where(and(eq(agendaCompromissos.empresaId, empresaId), isNull(agendaCompromissos.excluidoEm), eq(agendaCompromissos.concluida, false),
      ehPrimeira ? or(naColuna, isNull(agendaCompromissos.colunaId)) : naColuna));
  return l?.n ?? 0;
}
/** Antes de excluir a coluna: quem ainda aponta para ela (concluídos e excluídos) fica sem coluna. */
export async function soltarDaColuna(tx: TransacaoBanco, empresaId: string, colunaId: string) {
  await tx.update(agendaCompromissos).set({ colunaId: null })
    .where(and(eq(agendaCompromissos.empresaId, empresaId), eq(agendaCompromissos.colunaId, colunaId)));
}
export async function excluirColuna(tx: TransacaoBanco, empresaId: string, id: string) {
  await tx.delete(agendaColunas).where(and(eq(agendaColunas.empresaId, empresaId), eq(agendaColunas.id, id)));
}

/* ---------- Ligações do mapa ---------- */
export async function relacao(tx: TransacaoBanco, empresaId: string, id: string) {
  const [l] = await tx.select().from(agendaRelacoes).where(and(eq(agendaRelacoes.empresaId, empresaId), eq(agendaRelacoes.id, id))).limit(1);
  return l ?? null;
}
export async function inserirRelacao(tx: TransacaoBanco, linha: typeof agendaRelacoes.$inferInsert) {
  await tx.insert(agendaRelacoes).values(linha);
}
export async function rotularRelacao(tx: TransacaoBanco, empresaId: string, id: string, rotulo: string, por: string) {
  await tx.update(agendaRelacoes).set({ rotulo, atualizadoEm: new Date(), atualizadoPor: por })
    .where(and(eq(agendaRelacoes.empresaId, empresaId), eq(agendaRelacoes.id, id)));
}
export async function excluirRelacao(tx: TransacaoBanco, empresaId: string, id: string) {
  await tx.delete(agendaRelacoes).where(and(eq(agendaRelacoes.empresaId, empresaId), eq(agendaRelacoes.id, id)));
}

/* ---------- Avaliação e soneca ---------- */
export async function inserirAvaliacao(tx: TransacaoBanco, linha: typeof agendaAvaliacoes.$inferInsert) {
  await tx.insert(agendaAvaliacoes).values(linha);
}
export async function gravarAdiamento(tx: TransacaoBanco, empresaId: string, compromissoId: string, usuarioId: string, ate: Date) {
  await tx
    .insert(agendaAdiamentos)
    .values({ empresaId, compromissoId, usuarioId, ate })
    .onConflictDoUpdate({ target: [agendaAdiamentos.empresaId, agendaAdiamentos.compromissoId, agendaAdiamentos.usuarioId], set: { ate, atualizadoEm: new Date() } });
}
export async function tirarAdiamento(tx: TransacaoBanco, empresaId: string, compromissoId: string, usuarioId: string) {
  await tx.delete(agendaAdiamentos).where(and(eq(agendaAdiamentos.empresaId, empresaId), eq(agendaAdiamentos.compromissoId, compromissoId), eq(agendaAdiamentos.usuarioId, usuarioId)));
}
