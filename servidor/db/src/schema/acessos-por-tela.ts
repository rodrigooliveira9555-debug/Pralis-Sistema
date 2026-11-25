import { jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { empresas } from "./cadastro.ts";

// A configuração do Acesso por Tela, uma linha por coluna da tela: 'area:ID', 'cargo:ÁREA|CARGO' ou 'pessoa:ID'. A linha
// especial 'estrutura:areas' guarda quem é pai de quem na árvore Área › Setor › Local (a configuração mais próxima vale).
export const acessosPorTela = pgTable(
  "acessos_por_tela",
  {
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresas.id),
    chave: text("chave").notNull(),
    config: jsonb("config").notNull(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
    atualizadoPor: text("atualizado_por")
  },
  (tabela) => [primaryKey({ columns: [tabela.empresaId, tabela.chave] })]
);
