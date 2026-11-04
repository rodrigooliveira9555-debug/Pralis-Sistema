import { sql } from "drizzle-orm";
import { check, date, index, integer, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { usuarioAutenticacao } from "./autenticacao.ts";
import { empresas } from "./cadastro.ts";

// Lançamentos (Despesas, Mercadorias, Retiradas): FONTE DA VERDADE é este banco — as telas do app
// gravam pela API. Dinheiro em reais numeric(14,2), conta feita em centavos (igual ao principal).
//
// Conta e grupo vêm de cadastros que ainda moram nas telas do site (tabelas derivadas contas e
// fin_grupos, reconstruídas a cada gravação). Por isso NÃO há FK para elas: a API confere que
// existem no momento de gravar e guarda o nome junto, para o lançamento continuar legível mesmo se
// o cadastro mudar depois.

export const lancamentosRecorrencias = pgTable(
  "lancamentos_recorrencias",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresas.id),
    categoria: text("categoria").notNull(),
    frequencia: text("frequencia").notNull(),
    repeticoes: integer("repeticoes").notNull(),
    diasSemana: integer("dias_semana").array(),
    criadoPor: text("criado_por")
      .notNull()
      .references(() => usuarioAutenticacao.id),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    check("lancamentos_recorrencias_categoria_check", sql`${t.categoria} in ('despesas', 'mercadorias', 'retiradas')`),
    // Inclui "ano" (o principal esqueceu no CHECK dele; a regra da tela oferece).
    check(
      "lancamentos_recorrencias_frequencia_check",
      sql`${t.frequencia} in ('dia', 'semana', 'quinzena', 'mes', 'trimestre', 'ano')`
    ),
    check("lancamentos_recorrencias_repeticoes_check", sql`${t.repeticoes} between 1 and 366`)
  ]
);

export const lancamentos = pgTable(
  "lancamentos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresas.id),
    categoria: text("categoria").notNull(),
    dataReferencia: date("data_referencia").notNull(),
    dataVencimento: date("data_vencimento").notNull(),
    // Pago = data de pagamento preenchida (não há coluna de status de pagamento, como no principal).
    dataPagamento: date("data_pagamento"),
    observacao: text("observacao").notNull(),
    valorOriginal: numeric("valor_original", { precision: 14, scale: 2 }).notNull(),
    jurosTipo: text("juros_tipo"),
    jurosValorInformado: numeric("juros_valor_informado", { precision: 14, scale: 4 }),
    // Juros já convertido em R$ pelo SERVIDOR (D10/R-041): o que o cliente manda é ignorado.
    valorAcrescimo: numeric("valor_acrescimo", { precision: 14, scale: 2 }).notNull().default("0"),
    descontoGeralTipo: text("desconto_geral_tipo"),
    descontoGeralValor: numeric("desconto_geral_valor", { precision: 14, scale: 4 }),
    // Desconto geral resolvido em R$ (só existe com discriminação).
    valorDesconto: numeric("valor_desconto", { precision: 14, scale: 2 }).notNull().default("0"),
    contaNome: text("conta_nome"),
    grupoId: text("grupo_id"),
    grupoNome: text("grupo_nome"),
    numeroDocumentoFiscal: text("numero_documento_fiscal"),
    dataDocumentoFiscal: date("data_documento_fiscal"),
    recorrenciaId: uuid("recorrencia_id").references(() => lancamentosRecorrencias.id),
    recorrenciaOrdem: integer("recorrencia_ordem"),
    criadoPor: text("criado_por")
      .notNull()
      .references(() => usuarioAutenticacao.id),
    atualizadoPor: text("atualizado_por")
      .notNull()
      .references(() => usuarioAutenticacao.id),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    check("lancamentos_categoria_check", sql`${t.categoria} in ('despesas', 'mercadorias', 'retiradas')`),
    check("lancamentos_valor_check", sql`${t.valorOriginal} >= 0 and ${t.valorAcrescimo} >= 0 and ${t.valorDesconto} >= 0`),
    check("lancamentos_juros_tipo_check", sql`${t.jurosTipo} is null or ${t.jurosTipo} in ('percentual', 'valor')`),
    check(
      "lancamentos_desconto_tipo_check",
      sql`${t.descontoGeralTipo} is null or ${t.descontoGeralTipo} in ('percentual', 'valor')`
    ),
    // Retirada não tem desconto (só juros), D12.
    check("lancamentos_retirada_sem_desconto_check", sql`${t.categoria} <> 'retiradas' or ${t.valorDesconto} = 0`),
    check("lancamentos_serie_check", sql`(${t.recorrenciaId} is null) = (${t.recorrenciaOrdem} is null)`),
    index("lancamentos_empresa_categoria_vencimento_idx").on(t.empresaId, t.categoria, t.dataVencimento),
    index("lancamentos_recorrencia_idx").on(t.recorrenciaId)
  ]
);

export const lancamentosItens = pgTable(
  "lancamentos_itens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lancamentoId: uuid("lancamento_id")
      .notNull()
      .references(() => lancamentos.id, { onDelete: "cascade" }),
    posicao: integer("posicao").notNull(),
    descricao: text("descricao").notNull(),
    quantidade: numeric("quantidade", { precision: 14, scale: 3 }),
    valorUnitario: numeric("valor_unitario", { precision: 14, scale: 4 }).notNull(),
    descontoTipo: text("desconto_tipo"),
    descontoValor: numeric("desconto_valor", { precision: 14, scale: 4 }),
    descontoTotalTipo: text("desconto_total_tipo"),
    descontoTotalValor: numeric("desconto_total_valor", { precision: 14, scale: 4 }),
    // Líquido dos níveis 1 e 2 (é a soma deste que a D5 confere com o valor do lançamento).
    valorTotal: numeric("valor_total", { precision: 14, scale: 2 }).notNull(),
    // AUTORITATIVO: líquido dos três níveis (rateio do desconto geral, D4).
    valorTotalComDesconto: numeric("valor_total_com_desconto", { precision: 14, scale: 2 }).notNull(),
    // DERIVADO (total / quantidade), para custo e exibição.
    valorUnitarioComDesconto: numeric("valor_unitario_com_desconto", { precision: 14, scale: 4 }).notNull(),
    grupoId: text("grupo_id"),
    grupoNome: text("grupo_nome")
  },
  (t) => [
    check("lancamentos_itens_valores_check", sql`${t.valorUnitario} >= 0 and ${t.valorTotal} >= 0 and ${t.valorTotalComDesconto} >= 0`),
    index("lancamentos_itens_lancamento_idx").on(t.lancamentoId, t.posicao)
  ]
);
