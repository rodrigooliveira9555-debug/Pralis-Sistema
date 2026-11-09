import { sql } from "drizzle-orm";
import { boolean, check, index, integer, jsonb, numeric, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { empresas } from "./cadastro.ts";

// Produtos da empresa (plano docs/PRODUTOS_NO_SERVIDOR_PLANO.md, SQL aprovado pelo Zé em 09/11/2026).
// Em coluna fica o que busca, filtra, ordena, garante unicidade ou é dinheiro; o resto do cadastro da tela
// (embalagem, medidas, estoques mín/máx, locais de venda, fiscal, transformação, promoções, conversões,
// origemApp, vinculoManual, foto) vai em `dados`, no mesmo formato que a tela já usa.
// grupo_id, subgrupo_id e local_id SEM chave estrangeira: fin_grupos e locais são tabelas derivadas,
// refeitas a partir dos documentos; o vínculo quebrado vira alerta na consulta, não erro de banco.
export const produtos = pgTable(
  "produtos",
  {
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresas.id),
    id: text("id").notNull(),
    codigoInterno: text("codigo_interno").notNull(),
    codigoBarras: text("codigo_barras"),
    nome: text("nome").notNull(),
    descricao: text("descricao").notNull(),
    marca: text("marca"),
    tipo: text("tipo").notNull(),
    status: text("status").notNull(),
    liberadoCompra: boolean("liberado_compra").notNull().default(true),
    grupoId: text("grupo_id"),
    subgrupoId: text("subgrupo_id"),
    localId: text("local_id"),
    custo: numeric("custo", { precision: 14, scale: 2 }),
    margem: numeric("margem", { precision: 9, scale: 6 }),
    precoVenda: numeric("preco_venda", { precision: 14, scale: 2 }),
    calculoAutomatico: boolean("calculo_automatico").notNull().default(false),
    dados: jsonb("dados").notNull().default(sql`'{}'::jsonb`),
    appId: text("app_id"),
    appLojaId: text("app_loja_id"),
    versao: integer("versao").notNull().default(1),
    criadoPor: text("criado_por"),
    atualizadoPor: text("atualizado_por"),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    primaryKey({ columns: [t.empresaId, t.id] }),
    check("produtos_tipo_check", sql`${t.tipo} in ('revenda', 'transformacao')`),
    check("produtos_status_check", sql`${t.status} in ('ativo', 'inativo')`),
    check("produtos_valores_check", sql`coalesce(${t.custo}, 0) >= 0 and coalesce(${t.precoVenda}, 0) >= 0`),
    uniqueIndex("produtos_codigo_interno_uq").on(t.empresaId, t.codigoInterno),
    uniqueIndex("produtos_app_id_uq").on(t.empresaId, t.appId).where(sql`${t.appId} is not null`),
    index("produtos_busca_idx").on(t.empresaId, t.status, t.nome),
    index("produtos_barras_idx").on(t.empresaId, t.codigoBarras),
    index("produtos_grupo_idx").on(t.empresaId, t.grupoId, t.subgrupoId)
  ]
);

// Maior código interno já usado (app de produtos + S2): o próximo produto nunca repete código do PDV,
// nem quando dois aparelhos criam ao mesmo tempo (a linha é travada na transação).
export const produtosCodigo = pgTable("produtos_codigo", {
  empresaId: uuid("empresa_id")
    .primaryKey()
    .references(() => empresas.id),
  ultimo: integer("ultimo").notNull()
});
