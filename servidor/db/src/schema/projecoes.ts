import { sql } from "drizzle-orm";
import { check, integer, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { empresas } from "./cadastro.ts";

// Situação das tabelas relacionais de cada assunto. As telas continuam gravando o documento (fonte
// da verdade); a cada gravação o servidor reconstrói as tabelas do assunto na mesma transação. Se o
// documento tiver um dado que fere uma regra do banco, o documento é salvo assim mesmo (a tela não
// pode travar) e o assunto fica "falha", com a mensagem exata, até alguém corrigir na tela.
export const projecoes = pgTable(
  "projecoes",
  {
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresas.id),
    assunto: text("assunto").notNull(),
    situacao: text("situacao").notNull(),
    // Versão do documento que gerou as tabelas atuais (na falha: a versão que falhou).
    versaoDocumento: integer("versao_documento").notNull(),
    mensagem: text("mensagem"),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow()
  },
  (tabela) => [
    primaryKey({ columns: [tabela.empresaId, tabela.assunto] }),
    check("projecoes_situacao_check", sql`${tabela.situacao} in ('ok', 'falha')`)
  ]
);
