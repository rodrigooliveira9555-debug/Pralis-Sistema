import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import { documentos, documentosHistorico, empresas } from "@cicluz/db/schema";
import { banco, type TransacaoBanco } from "../banco/conexao.ts";

export type TipoHistorico =
  | "gravada"
  | "conflito"
  | "substituida_pelo_servidor"
  | "removida";

type Executor = TransacaoBanco | typeof banco;

export async function listarDocumentos(empresaId: string) {
  return banco
    .select({
      chave: documentos.chave,
      valor: documentos.valor,
      versao: documentos.versao,
      atualizadoEm: documentos.atualizadoEm
    })
    .from(documentos)
    .where(eq(documentos.empresaId, empresaId));
}

export async function listarVersoes(empresaId: string) {
  return banco
    .select({ chave: documentos.chave, versao: documentos.versao })
    .from(documentos)
    .where(eq(documentos.empresaId, empresaId));
}

// Trava a linha da empresa: serializa a importação e as gravações que dependem de "já importou?".
export async function travarEmpresa(tx: TransacaoBanco, empresaId: string) {
  const [linha] = await tx
    .select({ dadosImportadosEm: empresas.dadosImportadosEm })
    .from(empresas)
    .where(eq(empresas.id, empresaId))
    .for("share");
  return linha ?? null;
}

export async function travarEmpresaParaImportar(tx: TransacaoBanco, empresaId: string) {
  const [linha] = await tx
    .select({ dadosImportadosEm: empresas.dadosImportadosEm })
    .from(empresas)
    .where(eq(empresas.id, empresaId))
    .for("update");
  return linha ?? null;
}

export async function marcarDadosImportados(tx: TransacaoBanco, empresaId: string) {
  await tx
    .update(empresas)
    .set({ dadosImportadosEm: sql`now()`, atualizadoEm: sql`now()` })
    .where(eq(empresas.id, empresaId));
}

export async function contarDocumentos(tx: TransacaoBanco, empresaId: string) {
  const [linha] = await tx.select({ total: count() }).from(documentos).where(eq(documentos.empresaId, empresaId));
  return linha?.total ?? 0;
}

// FOR UPDATE em ordem de chave: dois lotes com as mesmas chaves ficam em fila, sem deadlock, e o
// segundo enxerga as versões que o primeiro gravou.
export async function travarDocumentos(tx: TransacaoBanco, empresaId: string, chaves: string[]) {
  return tx
    .select({
      chave: documentos.chave,
      valor: documentos.valor,
      versao: documentos.versao,
      atualizadoEm: documentos.atualizadoEm
    })
    .from(documentos)
    .where(and(eq(documentos.empresaId, empresaId), inArray(documentos.chave, chaves)))
    .orderBy(asc(documentos.chave))
    .for("update");
}

// ON CONFLICT DO NOTHING: se outro aparelho criou a mesma chave no mesmo instante, não havia linha
// para travar antes; quem chega depois recebe "nada inserido" e o lote inteiro vira conflito.
export async function inserirDocumento(
  tx: TransacaoBanco,
  dados: { empresaId: string; chave: string; valor: string; usuarioId: string }
) {
  const inseridas = await tx
    .insert(documentos)
    .values({
      empresaId: dados.empresaId,
      chave: dados.chave,
      valor: dados.valor,
      versao: 1,
      atualizadoPor: dados.usuarioId
    })
    .onConflictDoNothing()
    .returning({ versao: documentos.versao, atualizadoEm: documentos.atualizadoEm });
  return inseridas[0] ?? null;
}

// `versao = versaoBase` no WHERE além da trava: nunca grava em cima de uma versão que não é a lida.
export async function atualizarDocumento(
  tx: TransacaoBanco,
  dados: { empresaId: string; chave: string; valor: string; usuarioId: string; versaoBase: number }
) {
  const [linha] = await tx
    .update(documentos)
    .set({
      valor: dados.valor,
      versao: sql`${documentos.versao} + 1`,
      atualizadoEm: sql`now()`,
      atualizadoPor: dados.usuarioId
    })
    .where(
      and(
        eq(documentos.empresaId, dados.empresaId),
        eq(documentos.chave, dados.chave),
        eq(documentos.versao, dados.versaoBase)
      )
    )
    .returning({ versao: documentos.versao, atualizadoEm: documentos.atualizadoEm });
  return linha ?? null;
}

export async function removerDocumento(tx: TransacaoBanco, empresaId: string, chave: string, versaoBase: number) {
  const removidas = await tx
    .delete(documentos)
    .where(and(eq(documentos.empresaId, empresaId), eq(documentos.chave, chave), eq(documentos.versao, versaoBase)))
    .returning({ chave: documentos.chave });
  return removidas.length > 0;
}

export async function registrarHistorico(
  executor: Executor,
  linhas: Array<{
    empresaId: string;
    chave: string;
    valor: string | null;
    versao: number | null;
    tipo: TipoHistorico;
    usuarioId: string;
  }>
) {
  if (!linhas.length) return;
  await executor.insert(documentosHistorico).values(
    linhas.map((linha) => ({
      empresaId: linha.empresaId,
      chave: linha.chave,
      valor: linha.valor,
      versao: linha.versao,
      tipo: linha.tipo,
      gravadoPor: linha.usuarioId
    }))
  );
}

export async function executarEmTransacao<T>(callback: (tx: TransacaoBanco) => Promise<T>) {
  return banco.transaction(callback);
}

export { banco as bancoDocumentos };
