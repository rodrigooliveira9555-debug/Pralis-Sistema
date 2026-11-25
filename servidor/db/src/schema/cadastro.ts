import { sql } from "drizzle-orm";
import { bigserial, boolean, check, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
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
// O mínimo do colaborador para o servidor saber quem ele é e que permissão vale para ele (24/11/2026, Rodrigo aprovou
// enviar só isto: nome, cargo, áreas e situação; nada de CPF, filiação ou dependentes). O id é o mesmo do colaborador no
// aparelho. A conta de login (perfis_usuarios) aponta para este cadastro: usuário e colaborador são a mesma pessoa.
export const colaboradoresAcesso = pgTable(
  "colaboradores_acesso",
  {
    // Mesmo id do colaborador no aparelho (texto: os de demonstração não são UUID).
    id: text("id").primaryKey(),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresas.id),
    nome: text("nome").notNull(),
    // Id fixo do cargo (os de referência são "ref:N"; os cadastrados têm id próprio). Um colaborador tem UM cargo.
    cargoId: text("cargo_id"),
    // Áreas / setores / locais em que o colaborador está (pode ser mais de uma).
    areaIds: text("area_ids")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    ativo: boolean("ativo").notNull().default(false),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow()
  },
  (tabela) => [index("colaboradores_acesso_empresa_idx").on(tabela.empresaId)]
);

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
    // Conta de posto do caixa (PDV × turno). Os dois nulos: conta de uma pessoa. Um posto tem uma
    // conta só por empresa (doc 73 do principal).
    postoPdv: integer("posto_pdv"),
    postoTurno: text("posto_turno"),
    // A pessoa (colaborador) dona desta conta: usuário e colaborador são o mesmo cadastro. Nulo: conta de antes do vínculo (continua
    // como estava) ou administrador. Com colaborador, o acesso só abre se houver permissão no Acesso por Tela.
    colaboradorId: text("colaborador_id").references(() => colaboradoresAcesso.id),
    // Quando a conta passou a seguir cargos de acesso. Nulo: conta de antes dos cargos, que mantém o
    // acesso que o papel "usuario" tinha (acessos.ts). Preenchido uma vez, não volta a nulo: tirar
    // os cargos deixa a pessoa sem acesso, e não com o acesso amplo de antes.
    acessosConfiguradosEm: timestamp("acessos_configurados_em", { withTimezone: true }),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow()
  },
  (tabela) => [
    check("perfis_usuarios_papel_check", sql`${tabela.papel} in ('administrador', 'usuario')`),
    check(
      "perfis_usuarios_posto_check",
      sql`(${tabela.postoPdv} is null and ${tabela.postoTurno} is null) or (${tabela.postoPdv} between 1 and 4 and ${tabela.postoTurno} in ('manha', 'tarde'))`
    ),
    index("perfis_usuarios_empresa_idx").on(tabela.empresaId),
    uniqueIndex("perfis_usuarios_colaborador_uq")
      .on(tabela.colaboradorId)
      .where(sql`${tabela.colaboradorId} is not null`),
    uniqueIndex("perfis_usuarios_posto_uq")
      .on(tabela.empresaId, tabela.postoPdv, tabela.postoTurno)
      .where(sql`${tabela.postoPdv} is not null`)
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
    check("usuarios_auditoria_acao_check", sql`${tabela.acao} in ('criou', 'alterou', 'definiu_senha', 'alterou_acessos')`),
    index("usuarios_auditoria_empresa_idx").on(tabela.empresaId, tabela.em)
  ]
);
