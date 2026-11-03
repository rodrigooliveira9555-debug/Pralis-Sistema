import { and, eq, inArray, sql } from "drizzle-orm";
import { documentos, projecoes } from "@cicluz/db/schema";
import { banco, type TransacaoBanco } from "../banco/conexao.ts";

export async function lerDocumentosParaProjecao(tx: TransacaoBanco, empresaId: string, chaves: string[]) {
  return tx
    .select({ chave: documentos.chave, valor: documentos.valor, versao: documentos.versao })
    .from(documentos)
    .where(and(eq(documentos.empresaId, empresaId), inArray(documentos.chave, chaves)));
}

export async function registrarSituacao(
  tx: TransacaoBanco,
  dados: { empresaId: string; assunto: string; situacao: "ok" | "falha"; versaoDocumento: number; mensagem: string | null }
) {
  await tx
    .insert(projecoes)
    .values(dados)
    .onConflictDoUpdate({
      target: [projecoes.empresaId, projecoes.assunto],
      set: {
        situacao: dados.situacao,
        versaoDocumento: dados.versaoDocumento,
        mensagem: dados.mensagem,
        atualizadoEm: sql`now()`
      }
    });
}

export async function listarSituacoes(empresaId: string) {
  return banco
    .select({
      assunto: projecoes.assunto,
      situacao: projecoes.situacao,
      versaoDocumento: projecoes.versaoDocumento,
      mensagem: projecoes.mensagem,
      atualizadoEm: projecoes.atualizadoEm
    })
    .from(projecoes)
    .where(eq(projecoes.empresaId, empresaId));
}
