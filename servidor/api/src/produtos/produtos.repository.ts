import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { finGrupos, locais, produtos, produtosCodigo } from "@cicluz/db/schema";
import type { FiltroProdutos, GrupoParaCasar, LocalParaCasar } from "@cicluz/shared";
import { banco, type TransacaoBanco } from "../banco/conexao.ts";

export type LinhaProduto = typeof produtos.$inferSelect;
export type NovoProduto = typeof produtos.$inferInsert;
type Executor = typeof banco | TransacaoBanco;

/* ---------- Alerta de vínculo, calculado na consulta (grupos e locais são tabelas derivadas) ---------- */
const semGrupoSql = sql<boolean>`(
  ${produtos.grupoId} is null
  or not exists (select 1 from ${finGrupos} g where g.empresa_id = ${produtos.empresaId} and g.colecao = 'mercadorias'
                 and g.item_id = ${produtos.grupoId} and g.pai_id is null)
  or (${produtos.subgrupoId} is not null and not exists (select 1 from ${finGrupos} s where s.empresa_id = ${produtos.empresaId}
                 and s.colecao = 'mercadorias' and s.item_id = ${produtos.subgrupoId} and s.pai_id = ${produtos.grupoId}))
)`;
const semLocalSql = sql<boolean>`(
  ${produtos.localId} is null
  or not exists (select 1 from ${locais} l where l.empresa_id = ${produtos.empresaId} and l.id = ${produtos.localId})
)`;
const colunasComAlerta = { produto: produtos, semGrupo: semGrupoSql, semLocal: semLocalSql };

// Sem acento e sem caixa nos dois lados (o banco não tem a extensão unaccent).
const ACENTOS = ["áàâãäéèêëíìîïóòôõöúùûüç", "aaaaaeeeeiiiiooooouuuuc"] as const;
const dobrarSql = (coluna: SQL | AnyPgColumn) => sql`translate(lower(coalesce(${coluna}, '')), ${ACENTOS[0]}, ${ACENTOS[1]})`;
export const dobrar = (texto: string) => {
  let t = texto.toLowerCase();
  for (let i = 0; i < ACENTOS[0].length; i++) t = t.split(ACENTOS[0][i]!).join(ACENTOS[1][i]!);
  return t;
};

function condicoes(empresaId: string, filtro: FiltroProdutos, { semVinculo = true } = {}) {
  const c: SQL[] = [eq(produtos.empresaId, empresaId)];
  if (filtro.status !== "todos") c.push(eq(produtos.status, filtro.status));
  if (filtro.tipo) c.push(eq(produtos.tipo, filtro.tipo));
  if (filtro.grupoId) c.push(eq(produtos.grupoId, filtro.grupoId));
  if (filtro.busca) {
    const termo = `%${dobrar(filtro.busca).replace(/[\\%_]/g, (x) => "\\" + x)}%`;
    c.push(
      or(
        sql`${dobrarSql(produtos.nome)} like ${termo}`,
        sql`${dobrarSql(produtos.descricao)} like ${termo}`,
        sql`${dobrarSql(produtos.marca)} like ${termo}`,
        ilike(produtos.codigoInterno, termo),
        ilike(produtos.codigoBarras, termo)
      )!
    );
  }
  if (semVinculo && filtro.vinculo === "sem_grupo") c.push(semGrupoSql);
  if (semVinculo && filtro.vinculo === "sem_local") c.push(semLocalSql);
  if (semVinculo && filtro.vinculo === "sem_vinculo") c.push(sql`(${semGrupoSql} or ${semLocalSql})`);
  return and(...c)!;
}

const ORDEM = {
  recentes: [desc(produtos.criadoEm), asc(produtos.nome)],
  nome: [asc(produtos.nome)],
  codigo: [asc(sql`length(${produtos.codigoInterno})`), asc(produtos.codigoInterno)]
} as const;

export async function listarProdutos(empresaId: string, filtro: FiltroProdutos) {
  const onde = condicoes(empresaId, filtro);
  const [{ total } = { total: 0 }] = await banco.select({ total: count() }).from(produtos).where(onde);
  const linhas = await banco
    .select(colunasComAlerta)
    .from(produtos)
    .where(onde)
    .orderBy(...ORDEM[filtro.ordem])
    .limit(filtro.tamanho)
    .offset((filtro.pagina - 1) * filtro.tamanho);
  return { total, linhas };
}

// Contagens dos chips (ativos/inativos e alertas dos ATIVOS), sem os filtros da tela.
export async function contarProdutos(empresaId: string) {
  const [linha] = await banco
    .select({
      ativos: sql<number>`count(*) filter (where ${produtos.status} = 'ativo')`.mapWith(Number),
      inativos: sql<number>`count(*) filter (where ${produtos.status} = 'inativo')`.mapWith(Number),
      semGrupo: sql<number>`count(*) filter (where ${produtos.status} = 'ativo' and ${semGrupoSql})`.mapWith(Number),
      semLocal: sql<number>`count(*) filter (where ${produtos.status} = 'ativo' and ${semLocalSql})`.mapWith(Number),
      semVinculo: sql<number>`count(*) filter (where ${produtos.status} = 'ativo' and (${semGrupoSql} or ${semLocalSql}))`.mapWith(Number)
    })
    .from(produtos)
    .where(eq(produtos.empresaId, empresaId));
  return linha ?? { ativos: 0, inativos: 0, semGrupo: 0, semLocal: 0, semVinculo: 0 };
}

export async function listarAtivos(empresaId: string) {
  return banco
    .select(colunasComAlerta)
    .from(produtos)
    .where(and(eq(produtos.empresaId, empresaId), eq(produtos.status, "ativo")))
    .orderBy(asc(produtos.nome));
}

export async function obterProduto(empresaId: string, id: string, executor: Executor = banco) {
  const [linha] = await executor
    .select(colunasComAlerta)
    .from(produtos)
    .where(and(eq(produtos.empresaId, empresaId), eq(produtos.id, id)))
    .limit(1);
  return linha ?? null;
}

export async function existeCodigo(tx: TransacaoBanco, empresaId: string, codigoInterno: string) {
  const [linha] = await tx
    .select({ id: produtos.id })
    .from(produtos)
    .where(and(eq(produtos.empresaId, empresaId), eq(produtos.codigoInterno, codigoInterno)))
    .limit(1);
  return linha?.id ?? null;
}

/* ---------- Próximo código interno: linha travada até o fim da transação ---------- */
export async function travarUltimoCodigo(tx: TransacaoBanco, empresaId: string, piso: number) {
  await tx.insert(produtosCodigo).values({ empresaId, ultimo: piso }).onConflictDoNothing();
  const [linha] = await tx.select({ ultimo: produtosCodigo.ultimo }).from(produtosCodigo).where(eq(produtosCodigo.empresaId, empresaId)).for("update");
  // Código digitado em outro lugar (produto importado ou antigo) também conta.
  const [maior] = await tx
    .select({ maior: sql<number | null>`max(${produtos.codigoInterno}::bigint) filter (where ${produtos.codigoInterno} ~ '^[0-9]+$' and ${produtos.codigoInterno}::bigint < 700000)`.mapWith(Number) })
    .from(produtos)
    .where(eq(produtos.empresaId, empresaId));
  return Math.max(linha?.ultimo ?? piso, piso, maior?.maior ?? 0);
}
export async function gravarUltimoCodigo(tx: TransacaoBanco, empresaId: string, ultimo: number) {
  await tx
    .insert(produtosCodigo)
    .values({ empresaId, ultimo })
    .onConflictDoUpdate({ target: produtosCodigo.empresaId, set: { ultimo: sql`greatest(${produtosCodigo.ultimo}, ${ultimo})` } });
}

// Catálogo já está no servidor? (a linha de produtos_codigo nasce na primeira importação, transferência ou criação)
export async function catalogoAtivado(empresaId: string) {
  const [linha] = await banco.select({ ultimo: produtosCodigo.ultimo }).from(produtosCodigo).where(eq(produtosCodigo.empresaId, empresaId)).limit(1);
  return Boolean(linha);
}

// Insere só o que não existe (mesmo id, mesmo código interno ou mesmo id do app): nunca sobrescreve.
export async function inserirSeNaoExiste(tx: TransacaoBanco, linhas: NovoProduto[]) {
  if (!linhas.length) return [] as string[];
  const r = await tx.insert(produtos).values(linhas).onConflictDoNothing().returning({ id: produtos.id });
  return r.map((x) => x.id);
}
export async function idsExistentes(empresaId: string, ids: string[]) {
  if (!ids.length) return new Set<string>();
  const r = await banco.select({ id: produtos.id }).from(produtos).where(and(eq(produtos.empresaId, empresaId), inArray(produtos.id, ids)));
  return new Set(r.map((x) => x.id));
}

export async function inserirProduto(tx: TransacaoBanco, dados: NovoProduto) {
  await tx.insert(produtos).values(dados);
}

// Grava só se a versão ainda é a que a tela tinha; devolve a linha nova ou null (alguém salvou antes).
export async function atualizarComVersao(tx: TransacaoBanco, empresaId: string, id: string, versao: number, dados: Partial<NovoProduto>) {
  const [linha] = await tx
    .update(produtos)
    .set({ ...dados, versao: sql`${produtos.versao} + 1`, atualizadoEm: new Date() })
    .where(and(eq(produtos.empresaId, empresaId), eq(produtos.id, id), eq(produtos.versao, versao)))
    .returning({ id: produtos.id });
  return linha ?? null;
}

/* ---------- Importação e revinculação ---------- */
export async function produtosPorAppOuCodigo(tx: TransacaoBanco, empresaId: string, appIds: string[], codigos: string[]) {
  return tx
    .select()
    .from(produtos)
    .where(and(eq(produtos.empresaId, empresaId), or(inArray(produtos.appId, appIds.length ? appIds : [""]), inArray(produtos.codigoInterno, codigos.length ? codigos : [""]))));
}

export async function gravarProdutos(tx: TransacaoBanco, linhas: NovoProduto[]) {
  if (!linhas.length) return;
  await tx
    .insert(produtos)
    .values(linhas)
    .onConflictDoUpdate({
      target: [produtos.empresaId, produtos.id],
      set: {
        codigoInterno: sql`excluded.codigo_interno`,
        codigoBarras: sql`excluded.codigo_barras`,
        nome: sql`excluded.nome`,
        descricao: sql`excluded.descricao`,
        marca: sql`excluded.marca`,
        tipo: sql`excluded.tipo`,
        status: sql`excluded.status`,
        liberadoCompra: sql`excluded.liberado_compra`,
        grupoId: sql`excluded.grupo_id`,
        subgrupoId: sql`excluded.subgrupo_id`,
        localId: sql`excluded.local_id`,
        custo: sql`excluded.custo`,
        margem: sql`excluded.margem`,
        precoVenda: sql`excluded.preco_venda`,
        calculoAutomatico: sql`excluded.calculo_automatico`,
        dados: sql`excluded.dados`,
        appId: sql`excluded.app_id`,
        appLojaId: sql`excluded.app_loja_id`,
        atualizadoPor: sql`excluded.atualizado_por`,
        atualizadoEm: sql`now()`,
        versao: sql`${produtos.versao} + 1`
      }
    });
}

export async function todosOsProdutos(empresaId: string, executor: Executor = banco) {
  return executor.select().from(produtos).where(eq(produtos.empresaId, empresaId));
}

export async function atualizarVinculo(tx: TransacaoBanco, empresaId: string, id: string, v: { grupoId: string | null; subgrupoId: string | null; localId: string | null }) {
  await tx
    .update(produtos)
    .set({ ...v, versao: sql`${produtos.versao} + 1`, atualizadoEm: new Date() })
    .where(and(eq(produtos.empresaId, empresaId), eq(produtos.id, id)));
}

/* ---------- Grupos de mercadorias e árvore de locais da empresa (para casar por nome) ---------- */
export async function gruposParaCasar(empresaId: string, executor: Executor = banco): Promise<GrupoParaCasar[]> {
  const linhas = await executor
    .select({ id: finGrupos.itemId, paiId: finGrupos.paiId, nome: finGrupos.nome })
    .from(finGrupos)
    .where(and(eq(finGrupos.empresaId, empresaId), eq(finGrupos.colecao, "mercadorias")));
  return linhas
    .filter((l) => !l.paiId)
    .map((g) => ({ id: g.id, nome: g.nome, subgrupos: linhas.filter((s) => s.paiId === g.id).map((s) => ({ id: s.id, nome: s.nome })) }));
}

export async function locaisParaCasar(empresaId: string, executor: Executor = banco): Promise<LocalParaCasar[]> {
  const linhas = await executor.select({ id: locais.id, paiId: locais.paiId, nome: locais.nome }).from(locais).where(eq(locais.empresaId, empresaId));
  const porId = new Map(linhas.map((l) => [l.id, l]));
  const caminho = (l: (typeof linhas)[number]): string[] => {
    const c: string[] = [];
    let atual: (typeof linhas)[number] | undefined = l;
    for (let i = 0; atual && i < 6; i++) { c.unshift(atual.nome); atual = atual.paiId ? porId.get(atual.paiId) : undefined; }
    return c;
  };
  return linhas.map((l) => ({ id: l.id, nome: l.nome, caminho: caminho(l) }));
}
