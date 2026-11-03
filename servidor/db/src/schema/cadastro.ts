import { sql } from "drizzle-orm";
import { bigserial, boolean, check, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { usuarioAutenticacao } from "./autenticacao.ts";

export const empresas = pgTable("empresas", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull().unique(),
  ativo: boolean("ativo").notNull().default(true),
  // Quando o administrador enviou os dados do aparelho escolhido (importação inicial). Enquanto for
  // nulo, nenhum aparelho grava: é o que impede o seed de um navegador qualquer virar a versão 1.
  dadosImportadosEm: timestamp("dados_importados_em", { withTimezone: true }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow()
});

// Quem entra no sistema e em qual empresa. Um usuário pertence a UMA empresa nesta primeira
// versão; multiempresa por usuário fica para quando houver a tela de troca de empresa.
export const perfisUsuarios = pgTable(
  "perfis_usuarios",
  {
    usuarioId: text("usuario_id")
      .primaryKey()
      .references(() => usuarioAutenticacao.id, { onDelete: "cascade" }),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresas.id),
    nome: text("nome").notNull(),
    papel: text("papel").notNull(),
    ativo: boolean("ativo").notNull().default(true),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow()
  },
  (tabela) => [
    check("perfis_usuarios_papel_check", sql`${tabela.papel} in ('administrador', 'usuario')`),
    index("perfis_usuarios_empresa_idx").on(tabela.empresaId)
  ]
);

// Quem fez o quê nas contas de acesso (tela Usuários). Só recebe INSERT.
export const usuariosAuditoria = pgTable(
  "usuarios_auditoria",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresas.id),
    atorId: text("ator_id")
      .notNull()
      .references(() => usuarioAutenticacao.id),
    alvoId: text("alvo_id")
      .notNull()
      .references(() => usuarioAutenticacao.id),
    acao: text("acao").notNull(),
    detalhe: jsonb("detalhe"),
    em: timestamp("em", { withTimezone: true }).notNull().defaultNow()
  },
  (tabela) => [
    check("usuarios_auditoria_acao_check", sql`${tabela.acao} in ('criou', 'alterou', 'definiu_senha')`),
    index("usuarios_auditoria_empresa_idx").on(tabela.empresaId, tabela.em)
  ]
);
