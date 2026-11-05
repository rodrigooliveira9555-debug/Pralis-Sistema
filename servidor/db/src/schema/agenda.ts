import { sql } from "drizzle-orm";
import { check, customType, index, integer, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { usuarioAutenticacao } from "./autenticacao.ts";
import { empresas } from "./cadastro.ts";

// Agenda: chat e arquivos de cada compromisso (decisão do Zé, 05/11/2026). O compromisso mora no
// documento sincronizado "cicluz-agenda-v1"; `compromisso_id` é o id dele lá (texto, sem FK: o
// documento não é tabela). A API confere a permissão no documento a cada pedido.

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

export const agendaMensagens = pgTable(
  "agenda_mensagens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresas.id),
    compromissoId: text("compromisso_id").notNull(),
    autorId: text("autor_id")
      .notNull()
      .references(() => usuarioAutenticacao.id),
    texto: text("texto").notNull(),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    check("agenda_mensagens_texto_check", sql`char_length(${t.texto}) between 1 and 2000`),
    index("agenda_mensagens_compromisso_idx").on(t.empresaId, t.compromissoId, t.criadoEm)
  ]
);

// Até onde cada pessoa leu o chat de cada compromisso (para "não lidas").
export const agendaChatLeituras = pgTable(
  "agenda_chat_leituras",
  {
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresas.id),
    compromissoId: text("compromisso_id").notNull(),
    usuarioId: text("usuario_id")
      .notNull()
      .references(() => usuarioAutenticacao.id),
    lidoAte: timestamp("lido_ate", { withTimezone: true }).notNull()
  },
  (t) => [primaryKey({ columns: [t.empresaId, t.compromissoId, t.usuarioId] })]
);

// Arquivos guardados no próprio banco (vão no backup junto), até 10 MB cada. "material" = do gestor
// ou de quem pode editar; "evidencia" = do responsável, mostrando o que fez.
export const agendaArquivos = pgTable(
  "agenda_arquivos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresas.id),
    compromissoId: text("compromisso_id").notNull(),
    enviadoPor: text("enviado_por")
      .notNull()
      .references(() => usuarioAutenticacao.id),
    papel: text("papel").notNull(),
    nome: text("nome").notNull(),
    tipo: text("tipo").notNull(),
    tamanho: integer("tamanho").notNull(),
    sha256: text("sha256").notNull(),
    conteudo: bytea("conteudo").notNull(),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    check("agenda_arquivos_papel_check", sql`${t.papel} in ('material', 'evidencia')`),
    check("agenda_arquivos_tamanho_check", sql`${t.tamanho} between 1 and 10485760 and octet_length(${t.conteudo}) = ${t.tamanho}`),
    check("agenda_arquivos_nome_check", sql`char_length(${t.nome}) between 1 and 200`),
    index("agenda_arquivos_compromisso_idx").on(t.empresaId, t.compromissoId, t.criadoEm)
  ]
);
