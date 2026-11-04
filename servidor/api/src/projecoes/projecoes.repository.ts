import { and, eq, inArray, sql } from "drizzle-orm";
import { documentos, empresas, projecoes } from "@cicluz/db/schema";
import { banco, type TransacaoBanco } from "../banco/conexao.ts";

// Trava por empresa + assunto até o fim da transação. Duas gravações que tocam o mesmo assunto por
// chaves diferentes (ex.: contas e detalhes das contas) projetam uma depois da outra, e a segunda
// lê os documentos já confirmados pela primeira: as tabelas nunca ficam com uma mistura.
export async function travarAssunto(tx: TransacaoBanco, empresaId: string, assunto: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${empresaId} || ':' || ${assunto}))`);
}

export async function lerDocumentosParaProjecao(tx: TransacaoBanco, empresaId: string, chaves: string[]) {
  return tx
    .select({ chave: documentos.chave, valor: documentos.valor, versao: documentos.versao })
    .from(documentos)
    .where(and(eq(documentos.empresaId, empresaId), inArray(documentos.chave, chaves)));
}

export async function registrarSituacao(
  tx: TransacaoBanco,
  dados: {
    empresaId: string;
    assunto: string;
    situacao: "ok" | "falha";
    versoes: Record<string, number>;
    versaoRegra: number;
    mensagem: string | null;
  }
) {
  await tx
    .insert(projecoes)
    .values(dados)
    .onConflictDoUpdate({
      target: [projecoes.empresaId, projecoes.assunto],
      set: {
        situacao: dados.situacao,
        versoes: dados.versoes,
        versaoRegra: dados.versaoRegra,
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
      mensagem: projecoes.mensagem,
      atualizadoEm: projecoes.atualizadoEm
    })
    .from(projecoes)
    .where(eq(projecoes.empresaId, empresaId));
}

export async function listarEmpresas() {
  return banco.select({ id: empresas.id, nome: empresas.nome }).from(empresas);
}

// O que cada assunto usou na última projeção, para comparar com as versões atuais dos documentos.
export async function lerProjecoesRegistradas(empresaId: string) {
  return banco
    .select({ assunto: projecoes.assunto, versoes: projecoes.versoes, versaoRegra: projecoes.versaoRegra })
    .from(projecoes)
    .where(eq(projecoes.empresaId, empresaId));
}

export async function lerVersoesDosDocumentos(empresaId: string) {
  return banco
    .select({ chave: documentos.chave, versao: documentos.versao })
    .from(documentos)
    .where(eq(documentos.empresaId, empresaId));
}

export async function executarEmTransacao<T>(callback: (tx: TransacaoBanco) => Promise<T>) {
  return banco.transaction(callback);
}
