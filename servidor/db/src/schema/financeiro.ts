import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core";
import { empresas } from "./cadastro.ts";

// Tabelas relacionais do financeiro, reconstruídas a partir de "cicluz-financial-hierarchy-v1".
// Os ids são os da tela (seed "g3s1", "brand-7" ou UUID): só são únicos DENTRO da coleção, por isso
// a coleção faz parte da chave dos grupos.

const identidade = {
  nome: text("nome").notNull(),
  ativo: boolean("ativo").notNull(),
  ordem: integer("ordem").notNull(),
  // 0 = ícone padrão; número = ícone nativo; "custom-<uuid>" = biblioteca; "operator:<marca>".
  icone: text("icone").notNull(),
  modoIdentidade: text("modo_identidade"),
  sigla: text("sigla"),
  cor: text("cor"),
  documento: text("documento")
};

function checksIdentidade(nome: string, tabela: { modoIdentidade: unknown; cor: unknown; documento: unknown }) {
  return [
    check(`${nome}_modo_check`, sql`${tabela.modoIdentidade} is null or ${tabela.modoIdentidade} in ('icon', 'text')`),
    check(`${nome}_cor_check`, sql`${tabela.cor} is null or ${tabela.cor} ~* '^#[0-9a-f]{6}$'`),
    check(`${nome}_documento_check`, sql`${tabela.documento} is null or ${tabela.documento} in ('DOC/F', 'DOC/NF', 'DOC/F/NF')`)
  ];
}

// Grupos e subgrupos de mercadorias, despesas, vendas e retiradas (no máximo 2 níveis).
export const finGrupos = pgTable(
  "fin_grupos",
  {
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresas.id),
    colecao: text("colecao").notNull(),
    itemId: text("item_id").notNull(),
    paiId: text("pai_id"),
    ...identidade,
    // Só mercadorias: "Finalidade da mercadoria".
    finalidade: text("finalidade"),
    // Só despesas: grupo lançável direto (ex.: Desp. Bancárias).
    lancamentoDireto: boolean("lancamento_direto").notNull().default(false)
  },
  (tabela) => [
    primaryKey({ columns: [tabela.empresaId, tabela.colecao, tabela.itemId] }),
    foreignKey({
      columns: [tabela.empresaId, tabela.colecao, tabela.paiId],
      foreignColumns: [tabela.empresaId, tabela.colecao, tabela.itemId],
      name: "fin_grupos_pai_fk"
    }),
    check("fin_grupos_colecao_check", sql`${tabela.colecao} in ('mercadorias', 'despesas', 'vendas', 'retiradas')`),
    check(
      "fin_grupos_finalidade_check",
      sql`${tabela.finalidade} is null or (${tabela.colecao} = 'mercadorias' and ${tabela.finalidade} in ('VENDA', 'TRANSFORMAÇÃO'))`
    ),
    check("fin_grupos_lancamento_direto_check", sql`not ${tabela.lancamentoDireto} or ${tabela.colecao} = 'despesas'`),
    ...checksIdentidade("fin_grupos", tabela)
  ]
);

export const finTiposVenda = pgTable(
  "fin_tipos_venda",
  {
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresas.id),
    itemId: text("item_id").notNull(),
    ...identidade
  },
  (tabela) => [primaryKey({ columns: [tabela.empresaId, tabela.itemId] }), ...checksIdentidade("fin_tipos_venda", tabela)]
);

export const finBandeiras = pgTable(
  "fin_bandeiras",
  {
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresas.id),
    itemId: text("item_id").notNull(),
    ...identidade,
    // Obrigatório na tela; os itens do seed que nunca foram editados ainda não têm.
    tipoVendaId: text("tipo_venda_id")
  },
  (tabela) => [
    primaryKey({ columns: [tabela.empresaId, tabela.itemId] }),
    foreignKey({
      columns: [tabela.empresaId, tabela.tipoVendaId],
      foreignColumns: [finTiposVenda.empresaId, finTiposVenda.itemId],
      name: "fin_bandeiras_tipo_venda_fk"
    }),
    ...checksIdentidade("fin_bandeiras", tabela)
  ]
);

export const finOperadoras = pgTable(
  "fin_operadoras",
  {
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresas.id),
    itemId: text("item_id").notNull(),
    ...identidade,
    // "Custos fixos da operadora": texto livre na tela.
    custosFixos: text("custos_fixos")
  },
  (tabela) => [primaryKey({ columns: [tabela.empresaId, tabela.itemId] }), ...checksIdentidade("fin_operadoras", tabela)]
);

// Condições de taxa por operadora × bandeira × modalidade × faixa de parcelas × vigência.
// Percentuais em pontos percentuais com até 4 casas (a tela aceita 0,0001); tarifa em centavos.
// A regra da tela "sem vigências e parcelas sobrepostas na mesma modalidade" é garantida pelo banco
// (EXCLUDE na migration 0001; o Drizzle não declara EXCLUDE).
export const finTaxas = pgTable(
  "fin_taxas",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresas.id),
    operadoraId: text("operadora_id").notNull(),
    bandeiraId: text("bandeira_id").notNull(),
    ordem: integer("ordem").notNull(),
    inicio: date("inicio").notNull(),
    fim: date("fim"),
    modalidade: text("modalidade").notNull(),
    parcelaDe: integer("parcela_de"),
    parcelaAte: integer("parcela_ate"),
    mdrPercentual: numeric("mdr_percentual", { precision: 7, scale: 4 }),
    tarifaCentavos: integer("tarifa_centavos"),
    antecipacaoModo: text("antecipacao_modo"),
    antecipacaoPercentual: numeric("antecipacao_percentual", { precision: 7, scale: 4 }),
    antecipacaoPeriodo: text("antecipacao_periodo"),
    prazoDias: integer("prazo_dias"),
    tipoDia: text("tipo_dia"),
    observacoes: text("observacoes"),
    // Grupo ou subgrupo de despesas que recebe a taxa. A tela não atualiza esta referência quando o
    // grupo é excluído; a consistência é conferida na projeção (mensagem clara), não por FK.
    despesaId: text("despesa_id").notNull(),
    // A tela guarda o NOME da conta (Grupo de Contas / Transferências Automáticas), não um id.
    contaNome: text("conta_nome")
  },
  (tabela) => [
    foreignKey({
      columns: [tabela.empresaId, tabela.operadoraId],
      foreignColumns: [finOperadoras.empresaId, finOperadoras.itemId],
      name: "fin_taxas_operadora_fk"
    }),
    foreignKey({
      columns: [tabela.empresaId, tabela.bandeiraId],
      foreignColumns: [finBandeiras.empresaId, finBandeiras.itemId],
      name: "fin_taxas_bandeira_fk"
    }),
    check("fin_taxas_vigencia_check", sql`${tabela.fim} is null or ${tabela.fim} >= ${tabela.inicio}`),
    check(
      "fin_taxas_parcelas_check",
      sql`(${tabela.parcelaDe} is null and ${tabela.parcelaAte} is null) or (${tabela.parcelaDe} >= 1 and ${tabela.parcelaAte} >= ${tabela.parcelaDe})`
    ),
    check("fin_taxas_mdr_check", sql`${tabela.mdrPercentual} is null or ${tabela.mdrPercentual} between 0 and 100`),
    check(
      "fin_taxas_antecipacao_check",
      sql`${tabela.antecipacaoPercentual} is null or ${tabela.antecipacaoPercentual} between 0 and 100`
    ),
    check("fin_taxas_tarifa_check", sql`${tabela.tarifaCentavos} is null or ${tabela.tarifaCentavos} >= 0`),
    check("fin_taxas_prazo_check", sql`${tabela.prazoDias} is null or ${tabela.prazoDias} >= 0`),
    index("fin_taxas_operadora_idx").on(tabela.empresaId, tabela.operadoraId, tabela.bandeiraId)
  ]
);

// "_transferHistory": o que foi excluído e para onde os filhos foram (preserve-history.js).
export const finTransferencias = pgTable("fin_transferencias", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  empresaId: uuid("empresa_id")
    .notNull()
    .references(() => empresas.id),
  ordem: integer("ordem").notNull(),
  colecao: text("colecao").notNull(),
  paiId: text("pai_id"),
  data: timestamp("data", { withTimezone: true }),
  origemId: text("origem_id").notNull(),
  origemNome: text("origem_nome").notNull(),
  destinoId: text("destino_id"),
  destinoNome: text("destino_nome"),
  copiaOrigem: jsonb("copia_origem")
});
