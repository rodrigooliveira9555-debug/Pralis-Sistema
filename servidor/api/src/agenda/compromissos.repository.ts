import { and, asc, eq, inArray, isNull, lt, ne, or, sql, desc } from "drizzle-orm";
import {
  agendaAcoesProgresso,
  agendaArquivos,
  agendaAdiamentos,
  agendaAvaliacoes,
  agendaColunas,
  agendaCompromissos,
  agendaEstado,
  agendaGrupoMembros,
  agendaGrupos,
  agendaParticipantes,
  agendaRelacoes,
  perfisUsuarios
} from "@cicluz/db/schema";
import { banco, type TransacaoBanco } from "../banco/conexao.ts";

// Agenda nas tabelas da 0007: só SQL. A regra (quem pode o quê, validação, repetição) fica no service.

export type LinhaCompromisso = typeof agendaCompromissos.$inferSelect;
export type NovoCompromisso = typeof agendaCompromissos.$inferInsert;
export type LinhaParticipante = typeof agendaParticipantes.$inferSelect;
export type LinhaAvaliacao = typeof agendaAvaliacoes.$inferSelect;
export type LinhaGrupo = typeof agendaGrupos.$inferSelect;
type Executor = typeof banco | TransacaoBanco;

/* ---------- Estado da empresa (existe = a Agenda já está nas tabelas) ---------- */

export async function estado(ex: Executor, empresaId: string) {
  const [linha] = await ex.select({ versao: agendaEstado.versao }).from(agendaEstado).where(eq(agendaEstado.empresaId, empresaId)).limit(1);
  return linha ?? null;
}
/** Sobe o contador da empresa. Trava a linha até o fim da transação: as gravações da Agenda de uma empresa vão uma por vez. */
export async function subirVersao(tx: TransacaoBanco, empresaId: string) {
  const [linha] = await tx
    .update(agendaEstado)
    .set({ versao: sql`${agendaEstado.versao} + 1` })
    .where(eq(agendaEstado.empresaId, empresaId))
    .returning({ versao: agendaEstado.versao });
  return linha?.versao ?? null;
}

/* ---------- Compromissos ---------- */

/** Quem vê: o gestor, ou quem está nas pessoas com "ver". Excluído não aparece. */
const visivelPara = (usuarioId: string) =>
  or(
    eq(agendaCompromissos.gestorId, usuarioId),
    sql`exists (select 1 from ${agendaParticipantes} p where p.empresa_id = ${agendaCompromissos.empresaId}
                and p.compromisso_id = ${agendaCompromissos.id} and p.usuario_id = ${usuarioId} and p.ver)`
  )!;

export async function compromissosVisiveis(empresaId: string, usuarioId: string) {
  return banco
    .select()
    .from(agendaCompromissos)
    .where(and(eq(agendaCompromissos.empresaId, empresaId), isNull(agendaCompromissos.excluidoEm), visivelPara(usuarioId)));
}

/** Um compromisso (inclusive excluído). Com `travar`, segura a linha até o fim da transação. */
export async function compromisso(ex: Executor, empresaId: string, id: string, travar = false) {
  const q = ex.select().from(agendaCompromissos).where(and(eq(agendaCompromissos.empresaId, empresaId), eq(agendaCompromissos.id, id))).limit(1);
  const [linha] = travar ? await q.for("update") : await q;
  return linha ?? null;
}

/** O arquivo é deste compromisso? (prova de atividade concluída, P-58) */
export async function arquivoDoCompromisso(ex: Executor, empresaId: string, compromissoId: string, arquivoId: string) {
  const [a] = await ex
    .select({ id: agendaArquivos.id })
    .from(agendaArquivos)
    .where(and(eq(agendaArquivos.empresaId, empresaId), eq(agendaArquivos.compromissoId, compromissoId), eq(agendaArquivos.id, arquivoId)))
    .limit(1);
  return Boolean(a);
}

/* ---------- Ação programada (0012, P-53) ---------- */

/** Progresso das ações programadas dos compromissos (todas as ocorrências guardadas). */
export async function progressoDe(ex: Executor, empresaId: string, ids: string[]) {
  if (!ids.length) return [];
  return ex
    .select({ compromissoId: agendaAcoesProgresso.compromissoId, ocorrencia: agendaAcoesProgresso.ocorrencia, feitas: agendaAcoesProgresso.feitas })
    .from(agendaAcoesProgresso)
    .where(and(eq(agendaAcoesProgresso.empresaId, empresaId), inArray(agendaAcoesProgresso.compromissoId, ids)));
}

/** Compromissos abertos que esperam esta ação (as cópias concluídas de repetições ficam de fora). */
export async function abertosComAcao(ex: Executor, empresaId: string, acao: string) {
  return ex
    .select()
    .from(agendaCompromissos)
    .where(and(eq(agendaCompromissos.empresaId, empresaId), eq(agendaCompromissos.acaoTela, acao), eq(agendaCompromissos.concluida, false), isNull(agendaCompromissos.excluidoEm), isNull(agendaCompromissos.origemId)));
}

/** Soma n ao progresso da ocorrência e devolve o total (uma linha por compromisso e ocorrência). */
export async function somarProgresso(tx: TransacaoBanco, empresaId: string, compromissoId: string, ocorrencia: string, n: number) {
  const [l] = await tx
    .insert(agendaAcoesProgresso)
    .values({ empresaId, compromissoId, ocorrencia, feitas: n })
    .onConflictDoUpdate({
      target: [agendaAcoesProgresso.empresaId, agendaAcoesProgresso.compromissoId, agendaAcoesProgresso.ocorrencia],
      set: { feitas: sql`${agendaAcoesProgresso.feitas} + ${n}`, atualizadoEm: new Date() }
    })
    .returning({ feitas: agendaAcoesProgresso.feitas });
  return l?.feitas ?? n;
}

export async function inserirCompromisso(tx: TransacaoBanco, linha: NovoCompromisso) {
  const r = await tx.insert(agendaCompromissos).values(linha).onConflictDoNothing().returning({ id: agendaCompromissos.id });
  return r.length > 0;
}

export async function atualizarCompromisso(tx: TransacaoBanco, empresaId: string, id: string, dados: Partial<NovoCompromisso>) {
  const [linha] = await tx
    .update(agendaCompromissos)
    .set({ ...dados, versao: sql`${agendaCompromissos.versao} + 1`, atualizadoEm: new Date() })
    .where(and(eq(agendaCompromissos.empresaId, empresaId), eq(agendaCompromissos.id, id)))
    .returning();
  return linha!;
}

export async function maiorOrdem(tx: TransacaoBanco, empresaId: string, grupoId: string) {
  const [linha] = await tx
    .select({ maior: sql<string | null>`max(${agendaCompromissos.ordem})` })
    .from(agendaCompromissos)
    .where(and(eq(agendaCompromissos.empresaId, empresaId), eq(agendaCompromissos.grupoId, grupoId)));
  return Number(linha?.maior ?? 0);
}

/** Ordem de quem vem antes de `antesDe` na mesma lista (para pôr o compromisso entre os dois). */
export async function ordemAnterior(tx: TransacaoBanco, empresaId: string, grupoId: string, ordemDoAlvo: string, ignorarId: string) {
  const [linha] = await tx
    .select({ ordem: agendaCompromissos.ordem })
    .from(agendaCompromissos)
    .where(and(eq(agendaCompromissos.empresaId, empresaId), eq(agendaCompromissos.grupoId, grupoId), lt(agendaCompromissos.ordem, ordemDoAlvo),
      ne(agendaCompromissos.id, ignorarId), isNull(agendaCompromissos.excluidoEm)))
    .orderBy(desc(agendaCompromissos.ordem))
    .limit(1);
  return linha ? Number(linha.ordem) : null;
}

export async function copiaDaOcorrencia(tx: TransacaoBanco, empresaId: string, origemId: string, ocorrencia: string) {
  const [linha] = await tx
    .select({ id: agendaCompromissos.id })
    .from(agendaCompromissos)
    .where(and(eq(agendaCompromissos.empresaId, empresaId), eq(agendaCompromissos.origemId, origemId), eq(agendaCompromissos.ocorrencia, ocorrencia)))
    .limit(1);
  return linha?.id ?? null;
}

export async function concluidosVisiveis(tx: TransacaoBanco, empresaId: string, usuarioId: string, grupoId?: string) {
  return tx
    .select()
    .from(agendaCompromissos)
    .where(and(eq(agendaCompromissos.empresaId, empresaId), isNull(agendaCompromissos.excluidoEm), eq(agendaCompromissos.concluida, true),
      grupoId ? eq(agendaCompromissos.grupoId, grupoId) : undefined, visivelPara(usuarioId)));
}

/* ---------- Pessoas, notas e soneca ---------- */

export async function participantesDe(ex: Executor, empresaId: string, ids: string[]) {
  if (!ids.length) return [] as LinhaParticipante[];
  return ex
    .select()
    .from(agendaParticipantes)
    .where(and(eq(agendaParticipantes.empresaId, empresaId), inArray(agendaParticipantes.compromissoId, ids)))
    .orderBy(asc(agendaParticipantes.ordem));
}

export async function trocarParticipantes(
  tx: TransacaoBanco, empresaId: string, compromissoId: string, criadoPor: string,
  pessoas: Array<{ id: string; responsavel: boolean; ver: boolean; editar: boolean; concluir: boolean; excluir: boolean }>
) {
  await tx.delete(agendaParticipantes).where(and(eq(agendaParticipantes.empresaId, empresaId), eq(agendaParticipantes.compromissoId, compromissoId)));
  if (!pessoas.length) return;
  await tx.insert(agendaParticipantes).values(pessoas.map((p, ordem) => ({
    empresaId, compromissoId, usuarioId: p.id, responsavel: p.responsavel, ver: p.ver, editar: p.editar, concluir: p.concluir, excluir: p.excluir, ordem, criadoPor
  })));
}

export async function avaliacoesDe(ex: Executor, empresaId: string, ids: string[]) {
  if (!ids.length) return [] as LinhaAvaliacao[];
  return ex
    .select()
    .from(agendaAvaliacoes)
    .where(and(eq(agendaAvaliacoes.empresaId, empresaId), inArray(agendaAvaliacoes.compromissoId, ids)))
    .orderBy(asc(agendaAvaliacoes.em));
}

export async function adiamentosDe(ex: Executor, empresaId: string, usuarioId: string, ids: string[]) {
  if (!ids.length) return [] as Array<{ compromissoId: string; ate: Date }>;
  return ex
    .select({ compromissoId: agendaAdiamentos.compromissoId, ate: agendaAdiamentos.ate })
    .from(agendaAdiamentos)
    .where(and(eq(agendaAdiamentos.empresaId, empresaId), eq(agendaAdiamentos.usuarioId, usuarioId), inArray(agendaAdiamentos.compromissoId, ids)));
}

/** Mudou quando ou o alerta: a soneca de todos deixa de valer. */
export async function limparAdiamentos(tx: TransacaoBanco, empresaId: string, compromissoId: string) {
  await tx.delete(agendaAdiamentos).where(and(eq(agendaAdiamentos.empresaId, empresaId), eq(agendaAdiamentos.compromissoId, compromissoId)));
}

/** Dos ids pedidos, quais são contas da empresa (pessoa da agenda = conta da mesma empresa). */
export async function contasDaEmpresa(ex: Executor, empresaId: string, ids: string[]) {
  if (!ids.length) return new Set<string>();
  const r = await ex
    .select({ id: perfisUsuarios.usuarioId })
    .from(perfisUsuarios)
    .where(and(eq(perfisUsuarios.empresaId, empresaId), inArray(perfisUsuarios.usuarioId, ids)));
  return new Set(r.map((x) => x.id));
}

/* ---------- Grupos, colunas e ligações (leitura) ---------- */

export async function grupo(ex: Executor, empresaId: string, id: string) {
  const [linha] = await ex.select().from(agendaGrupos).where(and(eq(agendaGrupos.empresaId, empresaId), eq(agendaGrupos.id, id))).limit(1);
  return linha ?? null;
}

export async function ehMembro(ex: Executor, empresaId: string, grupoId: string, usuarioId: string) {
  const [linha] = await ex
    .select({ u: agendaGrupoMembros.usuarioId })
    .from(agendaGrupoMembros)
    .where(and(eq(agendaGrupoMembros.empresaId, empresaId), eq(agendaGrupoMembros.grupoId, grupoId), eq(agendaGrupoMembros.usuarioId, usuarioId)))
    .limit(1);
  return Boolean(linha);
}

export async function gruposAtivos(empresaId: string) {
  return banco
    .select()
    .from(agendaGrupos)
    .where(and(eq(agendaGrupos.empresaId, empresaId), isNull(agendaGrupos.excluidoEm)))
    .orderBy(asc(agendaGrupos.ordem), asc(agendaGrupos.criadoEm));
}

export async function gruposDoMembro(empresaId: string, usuarioId: string) {
  const r = await banco
    .select({ grupoId: agendaGrupoMembros.grupoId })
    .from(agendaGrupoMembros)
    .where(and(eq(agendaGrupoMembros.empresaId, empresaId), eq(agendaGrupoMembros.usuarioId, usuarioId)));
  return new Set(r.map((x) => x.grupoId));
}

export async function colunas(ex: Executor, empresaId: string) {
  return ex.select().from(agendaColunas).where(eq(agendaColunas.empresaId, empresaId)).orderBy(asc(agendaColunas.ordem), asc(agendaColunas.criadoEm));
}

export async function coluna(ex: Executor, empresaId: string, id: string) {
  const [linha] = await ex.select().from(agendaColunas).where(and(eq(agendaColunas.empresaId, empresaId), eq(agendaColunas.id, id))).limit(1);
  return linha ?? null;
}

export async function relacoes(empresaId: string) {
  return banco.select().from(agendaRelacoes).where(eq(agendaRelacoes.empresaId, empresaId));
}

/** O compromisso saiu: as ligações do mapa que tocam nele saem junto. */
export async function excluirRelacoesDe(tx: TransacaoBanco, empresaId: string, ids: string[]) {
  if (!ids.length) return;
  await tx.delete(agendaRelacoes).where(and(eq(agendaRelacoes.empresaId, empresaId), or(inArray(agendaRelacoes.deId, ids), inArray(agendaRelacoes.paraId, ids))));
}
