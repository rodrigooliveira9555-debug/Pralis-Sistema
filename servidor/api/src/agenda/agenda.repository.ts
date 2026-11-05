import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { agendaArquivos, agendaChatLeituras, agendaMensagens, documentos, usuarioAutenticacao } from "@cicluz/db/schema";
import { CHAVE_AGENDA } from "@cicluz/shared";
import { banco } from "../banco/conexao.ts";

/** Versão do documento da agenda (barato: decide se o cache ainda vale). */
export async function versaoAgenda(empresaId: string) {
  const [l] = await banco
    .select({ versao: documentos.versao })
    .from(documentos)
    .where(and(eq(documentos.empresaId, empresaId), eq(documentos.chave, CHAVE_AGENDA)));
  return l?.versao ?? 0;
}

export async function documentoAgenda(empresaId: string) {
  const [l] = await banco
    .select({ valor: documentos.valor, versao: documentos.versao })
    .from(documentos)
    .where(and(eq(documentos.empresaId, empresaId), eq(documentos.chave, CHAVE_AGENDA)));
  return l ?? null;
}

export async function listarMensagens(empresaId: string, compromissoId: string, depois?: string) {
  const filtros = [eq(agendaMensagens.empresaId, empresaId), eq(agendaMensagens.compromissoId, compromissoId)];
  // O horário vai à tela em milissegundos; o banco guarda microssegundos: compara no mesmo grau.
  if (depois) filtros.push(sql`date_trunc('milliseconds', ${agendaMensagens.criadoEm}) > ${new Date(depois).toISOString()}::timestamptz`);
  // As 500 mais recentes, em ordem de envio.
  const linhas = await banco
    .select({ id: agendaMensagens.id, autorId: agendaMensagens.autorId, autorNome: usuarioAutenticacao.name, texto: agendaMensagens.texto, criadoEm: agendaMensagens.criadoEm })
    .from(agendaMensagens)
    .innerJoin(usuarioAutenticacao, eq(usuarioAutenticacao.id, agendaMensagens.autorId))
    .where(and(...filtros))
    .orderBy(desc(agendaMensagens.criadoEm), desc(agendaMensagens.id))
    .limit(500);
  return linhas.reverse();
}

export async function inserirMensagem(empresaId: string, compromissoId: string, autorId: string, texto: string) {
  const [l] = await banco.insert(agendaMensagens).values({ empresaId, compromissoId, autorId, texto }).returning();
  return l!;
}

export async function marcarLido(empresaId: string, compromissoId: string, usuarioId: string) {
  await banco
    .insert(agendaChatLeituras)
    .values({ empresaId, compromissoId, usuarioId, lidoAte: sql`now()` })
    .onConflictDoUpdate({ target: [agendaChatLeituras.empresaId, agendaChatLeituras.compromissoId, agendaChatLeituras.usuarioId], set: { lidoAte: sql`now()` } });
}

/** Mensagens de outras pessoas depois da última leitura, por compromisso. */
export async function contarNaoLidas(empresaId: string, usuarioId: string) {
  return banco
    .select({ compromissoId: agendaMensagens.compromissoId, total: sql<number>`count(*)::int` })
    .from(agendaMensagens)
    .leftJoin(
      agendaChatLeituras,
      and(eq(agendaChatLeituras.empresaId, agendaMensagens.empresaId), eq(agendaChatLeituras.compromissoId, agendaMensagens.compromissoId), eq(agendaChatLeituras.usuarioId, usuarioId))
    )
    .where(and(eq(agendaMensagens.empresaId, empresaId), ne(agendaMensagens.autorId, usuarioId), sql`(${agendaChatLeituras.lidoAte} is null or ${agendaMensagens.criadoEm} > ${agendaChatLeituras.lidoAte})`))
    .groupBy(agendaMensagens.compromissoId);
}

const camposArquivo = {
  id: agendaArquivos.id,
  compromissoId: agendaArquivos.compromissoId,
  nome: agendaArquivos.nome,
  tipo: agendaArquivos.tipo,
  tamanho: agendaArquivos.tamanho,
  papel: agendaArquivos.papel,
  enviadoPor: agendaArquivos.enviadoPor,
  enviadoPorNome: usuarioAutenticacao.name,
  criadoEm: agendaArquivos.criadoEm
};

export async function listarArquivos(empresaId: string, compromissoId: string) {
  return banco
    .select(camposArquivo)
    .from(agendaArquivos)
    .innerJoin(usuarioAutenticacao, eq(usuarioAutenticacao.id, agendaArquivos.enviadoPor))
    .where(and(eq(agendaArquivos.empresaId, empresaId), eq(agendaArquivos.compromissoId, compromissoId)))
    .orderBy(asc(agendaArquivos.criadoEm));
}

export async function inserirArquivo(valores: typeof agendaArquivos.$inferInsert) {
  const [l] = await banco.insert(agendaArquivos).values(valores).returning({ id: agendaArquivos.id });
  return l!.id;
}

export async function obterArquivo(empresaId: string, id: string, comConteudo: boolean) {
  const [l] = await banco
    .select({ ...camposArquivo, ...(comConteudo ? { conteudo: agendaArquivos.conteudo } : {}) })
    .from(agendaArquivos)
    .innerJoin(usuarioAutenticacao, eq(usuarioAutenticacao.id, agendaArquivos.enviadoPor))
    .where(and(eq(agendaArquivos.empresaId, empresaId), eq(agendaArquivos.id, id)));
  return (l as (typeof l & { conteudo?: Buffer }) | undefined) ?? null;
}

export async function excluirArquivo(empresaId: string, id: string) {
  await banco.delete(agendaArquivos).where(and(eq(agendaArquivos.empresaId, empresaId), eq(agendaArquivos.id, id)));
}
