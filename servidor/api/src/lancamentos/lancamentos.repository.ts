import { and, asc, count, desc, eq, gt, gte, inArray, isNotNull, isNull, lte, sql, sum } from "drizzle-orm";
import { contas, finGrupos, lancamentos, lancamentosItens, lancamentosRecorrencias } from "@cicluz/db/schema";
import type { CategoriaLancamento } from "@cicluz/shared";
import { banco, type TransacaoBanco } from "../banco/conexao.ts";

export type LinhaLancamento = typeof lancamentos.$inferSelect;
export type NovoLancamento = typeof lancamentos.$inferInsert;
export type NovoItem = Omit<typeof lancamentosItens.$inferInsert, "lancamentoId">;

// Conta (CNT) da empresa pelo nome, como as telas de contas guardam.
export async function obterConta(empresaId: string, nome: string) {
  const [linha] = await banco
    .select({ nome: contas.nome, situacao: contas.situacao })
    .from(contas)
    .where(and(eq(contas.empresaId, empresaId), eq(contas.nome, nome)))
    .limit(1);
  return linha ?? null;
}

// Grupos/subgrupos da categoria (mesma coleção do cadastro financeiro) pelos ids pedidos.
export async function obterGrupos(empresaId: string, colecao: CategoriaLancamento, ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const linhas = await banco
    .select({ itemId: finGrupos.itemId, nome: finGrupos.nome })
    .from(finGrupos)
    .where(and(eq(finGrupos.empresaId, empresaId), eq(finGrupos.colecao, colecao), inArray(finGrupos.itemId, ids)));
  return new Map(linhas.map((linha) => [linha.itemId, linha.nome]));
}

export async function inserirRecorrencia(tx: TransacaoBanco, dados: typeof lancamentosRecorrencias.$inferInsert) {
  const [linha] = await tx.insert(lancamentosRecorrencias).values(dados).returning({ id: lancamentosRecorrencias.id });
  if (!linha) throw new Error("recorrência não criada");
  return linha.id;
}

export async function inserirLancamento(tx: TransacaoBanco, dados: NovoLancamento, itens: NovoItem[]) {
  const [linha] = await tx.insert(lancamentos).values(dados).returning({ id: lancamentos.id });
  if (!linha) throw new Error("lançamento não criado");
  if (itens.length) await tx.insert(lancamentosItens).values(itens.map((item) => ({ ...item, lancamentoId: linha.id })));
  return linha.id;
}

// FOR UPDATE: duas edições do mesmo lançamento ficam em fila.
export async function travarLancamento(tx: TransacaoBanco, empresaId: string, id: string) {
  const [linha] = await tx
    .select()
    .from(lancamentos)
    .where(and(eq(lancamentos.empresaId, empresaId), eq(lancamentos.id, id)))
    .for("update");
  return linha ?? null;
}

export async function atualizarLancamento(
  tx: TransacaoBanco,
  id: string,
  dados: Partial<NovoLancamento>,
  itens: NovoItem[] | null
) {
  await tx
    .update(lancamentos)
    .set({ ...dados, atualizadoEm: sql`now()` })
    .where(eq(lancamentos.id, id));
  // Itens: substituídos por inteiro (como no principal). null = não mexe nos itens.
  if (itens !== null) {
    await tx.delete(lancamentosItens).where(eq(lancamentosItens.lancamentoId, id));
    if (itens.length) await tx.insert(lancamentosItens).values(itens.map((item) => ({ ...item, lancamentoId: id })));
  }
}

export async function obterLancamento(empresaId: string, id: string) {
  const [linha] = await banco
    .select()
    .from(lancamentos)
    .where(and(eq(lancamentos.empresaId, empresaId), eq(lancamentos.id, id)))
    .limit(1);
  if (!linha) return null;
  const itens = await banco
    .select()
    .from(lancamentosItens)
    .where(eq(lancamentosItens.lancamentoId, id))
    .orderBy(asc(lancamentosItens.posicao));
  return { ...linha, itens };
}

type Filtro = {
  empresaId: string;
  categoria: CategoriaLancamento;
  dataInicio?: string | undefined;
  dataFim?: string | undefined;
  situacao: "todos" | "pendentes" | "pagos";
};

function condicoes(filtro: Filtro) {
  // Período por vencimento em DES/MER e pela data do lançamento em RET (igual ao principal).
  const coluna = filtro.categoria === "retiradas" ? lancamentos.dataReferencia : lancamentos.dataVencimento;
  return and(
    eq(lancamentos.empresaId, filtro.empresaId),
    eq(lancamentos.categoria, filtro.categoria),
    filtro.dataInicio ? gte(coluna, filtro.dataInicio) : undefined,
    filtro.dataFim ? lte(coluna, filtro.dataFim) : undefined,
    filtro.situacao === "pendentes" ? isNull(lancamentos.dataPagamento) : undefined,
    filtro.situacao === "pagos" ? isNotNull(lancamentos.dataPagamento) : undefined
  );
}

export async function listarLancamentos(filtro: Filtro, pagina: { page: number; pageSize: number }) {
  const onde = condicoes(filtro);
  const coluna = filtro.categoria === "retiradas" ? lancamentos.dataReferencia : lancamentos.dataVencimento;
  const [linhas, [totais], comItens] = await Promise.all([
    banco
      .select()
      .from(lancamentos)
      .where(onde)
      .orderBy(desc(coluna), desc(lancamentos.criadoEm))
      .limit(pagina.pageSize)
      .offset((pagina.page - 1) * pagina.pageSize),
    banco
      .select({
        quantidade: count(),
        somaOriginal: sum(lancamentos.valorOriginal),
        somaAcrescimo: sum(lancamentos.valorAcrescimo),
        somaDesconto: sum(lancamentos.valorDesconto)
      })
      .from(lancamentos)
      .where(onde),
    banco
      .selectDistinct({ id: lancamentosItens.lancamentoId })
      .from(lancamentosItens)
      .innerJoin(lancamentos, eq(lancamentos.id, lancamentosItens.lancamentoId))
      .where(onde)
  ]);
  return { linhas, totais, idsComItens: new Set(comItens.map((linha) => linha.id)) };
}

// Cancelar série (R-063 do principal): apaga só as ocorrências FUTURAS e NÃO PAGAS.
export async function apagarFuturasDaSerie(empresaId: string, recorrenciaId: string, hoje: string) {
  const apagadas = await banco
    .delete(lancamentos)
    .where(
      and(
        eq(lancamentos.empresaId, empresaId),
        eq(lancamentos.recorrenciaId, recorrenciaId),
        gt(lancamentos.dataVencimento, hoje),
        isNull(lancamentos.dataPagamento)
      )
    )
    .returning({ id: lancamentos.id });
  return apagadas.length;
}

export async function serieExiste(empresaId: string, recorrenciaId: string) {
  const [linha] = await banco
    .select({ id: lancamentosRecorrencias.id })
    .from(lancamentosRecorrencias)
    .where(and(eq(lancamentosRecorrencias.empresaId, empresaId), eq(lancamentosRecorrencias.id, recorrenciaId)))
    .limit(1);
  return Boolean(linha);
}

export function executarEmTransacao<T>(callback: (tx: TransacaoBanco) => Promise<T>) {
  return banco.transaction(callback);
}
