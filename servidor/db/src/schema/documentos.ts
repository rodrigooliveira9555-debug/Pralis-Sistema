import { sql } from "drizzle-orm";
import { bigserial, check, index, integer, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { usuarioAutenticacao } from "./autenticacao.ts";
import { empresas } from "./cadastro.ts";

// Versão atual de cada dado de negócio do site, por empresa. `valor` é a string exata que a tela
// guarda no localStorage. `versao` sobe 1 a cada gravação e é o que impede um aparelho de
// sobrescrever, sem saber, o que outro gravou antes (gravação com versão velha é recusada).
export const documentos = pgTable(
  "documentos",
  {
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresas.id),
    chave: text("chave").notNull(),
    valor: text("valor").notNull(),
    versao: integer("versao").notNull(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
    atualizadoPor: text("atualizado_por")
      .notNull()
      .references(() => usuarioAutenticacao.id)
  },
  (tabela) => [
    primaryKey({ columns: [tabela.empresaId, tabela.chave] }),
    check("documentos_versao_check", sql`${tabela.versao} >= 1`)
  ]
);

// Livro de tudo o que já foi gravado ou oferecido pelos aparelhos. Só recebe INSERT: nada aqui é
// editado nem apagado pela API. É a rede de segurança dos dados que viviam só no iPad.
// - gravada: virou a versão atual (`versao` preenchida);
// - conflito: chegou com versão velha e foi recusada; o conteúdo fica guardado;
// - substituida_pelo_servidor: o aparelho tinha outra coisa e recebeu a versão do servidor;
// - removida: a tela apagou a chave.
export const documentosHistorico = pgTable(
  "documentos_historico",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresas.id),
    chave: text("chave").notNull(),
    valor: text("valor"),
    versao: integer("versao"),
    tipo: text("tipo").notNull(),
    gravadoEm: timestamp("gravado_em", { withTimezone: true }).notNull().defaultNow(),
    gravadoPor: text("gravado_por")
      .notNull()
      .references(() => usuarioAutenticacao.id)
  },
  (tabela) => [
    check(
      "documentos_historico_tipo_check",
      sql`${tabela.tipo} in ('gravada', 'conflito', 'substituida_pelo_servidor', 'removida')`
    ),
    index("documentos_historico_empresa_chave_idx").on(tabela.empresaId, tabela.chave, tabela.gravadoEm)
  ]
);
