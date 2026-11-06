import { sql } from "drizzle-orm";
import { bigserial, boolean, check, index, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { usuarioAutenticacao } from "./autenticacao.ts";
import { empresas, perfisUsuarios } from "./cadastro.ts";

// Configurações → Permissões. "Cargo de acesso" (Caixa, Tesouraria, Gerência…) é o que libera telas e
// ações; não é o cargo do DP (tabela `cargos`, com CBO e salário). As chaves de permissão vivem no
// código (shared/src/acessos.ts): o banco guarda só quais chaves cada cargo libera.
export const cargosAcesso = pgTable(
  "cargos_acesso",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresas.id),
    nome: text("nome").notNull(),
    descricao: text("descricao").notNull().default(""),
    // Desativar em vez de apagar: o cargo some das pessoas sem perder o histórico da auditoria.
    ativo: boolean("ativo").notNull().default(true),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow()
  },
  (tabela) => [uniqueIndex("cargos_acesso_empresa_nome_uq").on(tabela.empresaId, sql`lower(${tabela.nome})`)]
);

export const cargosAcessoPermissoes = pgTable(
  "cargos_acesso_permissoes",
  {
    cargoId: uuid("cargo_id")
      .notNull()
      .references(() => cargosAcesso.id, { onDelete: "cascade" }),
    permissao: text("permissao").notNull()
  },
  (tabela) => [primaryKey({ columns: [tabela.cargoId, tabela.permissao] })]
);

// Uma pessoa pode ter mais de um cargo de acesso; vale a soma dos cargos ativos.
export const usuariosCargosAcesso = pgTable(
  "usuarios_cargos_acesso",
  {
    usuarioId: text("usuario_id")
      .notNull()
      .references(() => perfisUsuarios.usuarioId, { onDelete: "cascade" }),
    cargoId: uuid("cargo_id")
      .notNull()
      .references(() => cargosAcesso.id, { onDelete: "cascade" })
  },
  (tabela) => [primaryKey({ columns: [tabela.usuarioId, tabela.cargoId] }), index("usuarios_cargos_acesso_cargo_idx").on(tabela.cargoId)]
);

// Exceção da pessoa sobre o cargo: true libera, false bloqueia. Sem linha: vale o cargo.
export const usuariosPermissoes = pgTable(
  "usuarios_permissoes",
  {
    usuarioId: text("usuario_id")
      .notNull()
      .references(() => perfisUsuarios.usuarioId, { onDelete: "cascade" }),
    permissao: text("permissao").notNull(),
    permitido: boolean("permitido").notNull()
  },
  (tabela) => [primaryKey({ columns: [tabela.usuarioId, tabela.permissao] })]
);

// Quem mexeu em cada cargo de acesso. Só recebe INSERT (as mudanças por pessoa vão para
// usuarios_auditoria).
export const cargosAcessoAuditoria = pgTable(
  "cargos_acesso_auditoria",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresas.id),
    atorId: text("ator_id")
      .notNull()
      .references(() => usuarioAutenticacao.id),
    cargoId: uuid("cargo_id")
      .notNull()
      .references(() => cargosAcesso.id),
    acao: text("acao").notNull(),
    detalhe: jsonb("detalhe"),
    em: timestamp("em", { withTimezone: true }).notNull().defaultNow()
  },
  (tabela) => [
    check("cargos_acesso_auditoria_acao_check", sql`${tabela.acao} in ('criou', 'alterou')`),
    index("cargos_acesso_auditoria_empresa_idx").on(tabela.empresaId, tabela.em)
  ]
);
