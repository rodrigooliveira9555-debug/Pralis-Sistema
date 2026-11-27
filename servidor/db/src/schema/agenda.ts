import { sql } from "drizzle-orm";
import {
  type AnyPgColumn, bigint, boolean, check, customType, date, foreignKey, index, integer, jsonb, numeric, pgTable, primaryKey, smallint, text, timestamp,
  uniqueIndex, uuid
} from "drizzle-orm/pg-core";
import { usuarioAutenticacao } from "./autenticacao.ts";
import { empresas, perfisUsuarios } from "./cadastro.ts";

// Agenda: chat e arquivos de cada compromisso (decisão do Zé, 05/11/2026). `compromisso_id` é o id do
// compromisso em agenda_compromissos (texto; a FK entra na 0009, depois da transferência no ar, porque pode
// haver mensagens de compromissos que já não existem). A API confere a permissão nas tabelas a cada pedido.

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
    // Foto ou áudio mandado no chat (0012, P-53): o arquivo fica em agenda_arquivos, do mesmo compromisso.
    arquivoId: uuid("arquivo_id").references((): AnyPgColumn => agendaArquivos.id, { onDelete: "set null" }),
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

/* ======================================================================================================
 * Agenda no servidor (0007, plano docs/AGENDA_NO_SERVIDOR_PLANO.md seção 2). Cada compromisso vira um
 * registro; a permissão é conferida no servidor. Ids em texto, os mesmos do documento (ag-…, lista-…).
 * Empresa em toda chave; toda ligação inclui empresa_id (nada aponta para outra empresa).
 * Pessoa = conta da MESMA empresa (FK composta para perfis_usuarios). Excluir = esconder (excluido_em).
 * O trigger que deixa a avaliação imutável está escrito à mão no fim de 0007_agenda_tabelas.sql.
 * ==================================================================================================== */

const ID_AGENDA = sql.raw(`'^[A-Za-z0-9_-]{1,100}$'`);
const HORA = sql.raw(`'^([01][0-9]|2[0-3]):[0-5][0-9]$'`);
const URL_COMPLETA = sql.raw(String.raw`'^https?://\S+\.\S+'`);
const VINCULO_TELA = sql.raw(`'^#/[A-Za-z0-9%/_.-]+$'`);
const VINCULO_REF = sql.raw(`'^[A-Za-z0-9:_.-]{1,200}$'`);
const criadoAtualizado = () => ({
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  criadoPor: text("criado_por")
    .notNull()
    .references(() => usuarioAutenticacao.id),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoPor: text("atualizado_por")
    .notNull()
    .references(() => usuarioAutenticacao.id)
});
type Coluna = Parameters<typeof foreignKey>[0]["columns"][number];
/** Pessoa da agenda = conta da MESMA empresa. */
const pessoaDaEmpresa = (nome: string, empresa: Coluna, usuario: Coluna) =>
  foreignKey({ name: nome, columns: [empresa, usuario], foreignColumns: [perfisUsuarios.empresaId, perfisUsuarios.usuarioId] });

// Contador por empresa: sobe a cada gravação da Agenda (ETag do GET /api/agenda).
export const agendaEstado = pgTable(
  "agenda_estado",
  {
    empresaId: uuid("empresa_id")
      .primaryKey()
      .references(() => empresas.id),
    versao: bigint("versao", { mode: "number" }).notNull().default(0)
  },
  (t) => [check("agenda_estado_versao_check", sql`${t.versao} >= 0`)]
);

// Grupos (as "Minhas listas", P-46 item 2).
export const agendaGrupos = pgTable(
  "agenda_grupos",
  {
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresas.id),
    id: text("id").notNull(),
    nome: text("nome").notNull(),
    cor: text("cor").notNull(),
    icone: text("icone").notNull().default("lista"),
    ordenacao: text("ordenacao").notNull().default("manual"),
    ordem: integer("ordem").notNull().default(0),
    donoId: text("dono_id").notNull(),
    // Área do Acesso por Tela ligada à lista (0009, P-46 item 3): os membros passam a ser as contas com alguma
    // permissão dessa área (origem 'area'), refeitos pela API quando as permissões mudam. Nulo: membros à mão.
    area: text("area"),
    excluidoEm: timestamp("excluido_em", { withTimezone: true }),
    excluidoPor: text("excluido_por").references(() => usuarioAutenticacao.id),
    versao: integer("versao").notNull().default(1),
    ...criadoAtualizado()
  },
  (t) => [
    primaryKey({ name: "agenda_grupos_pk", columns: [t.empresaId, t.id] }),
    check(
      "agenda_grupos_area_check",
      sql`${t.area} is null or ${t.area} in ('lancamentos', 'caixa', 'transferencias', 'compras', 'producao', 'pessoas', 'relatorios', 'configuracoes')`
    ),
    pessoaDaEmpresa("agenda_grupos_dono_fk", t.empresaId, t.donoId),
    check("agenda_grupos_id_check", sql`${t.id} ~ ${ID_AGENDA}`),
    check("agenda_grupos_nome_check", sql`char_length(btrim(${t.nome})) between 1 and 40`),
    check("agenda_grupos_cor_check", sql`${t.cor} ~ '^#[0-9a-fA-F]{6}$'`),
    check("agenda_grupos_icone_check", sql`${t.icone} ~ '^[a-z0-9-]{1,30}$'`),
    check("agenda_grupos_ordenacao_check", sql`${t.ordenacao} in ('manual', 'data', 'criacao', 'prioridade', 'titulo')`),
    check("agenda_grupos_versao_check", sql`${t.versao} >= 1`),
    check("agenda_grupos_excluido_check", sql`(${t.excluidoEm} is null) = (${t.excluidoPor} is null)`),
    uniqueIndex("agenda_grupos_nome_uq").on(t.empresaId, sql`lower(btrim(${t.nome}))`).where(sql`${t.excluidoEm} is null`)
  ]
);

// Membros do grupo, escolhidos à mão (pergunta 1 do plano; proposta padrão).
export const agendaGrupoMembros = pgTable(
  "agenda_grupo_membros",
  {
    empresaId: uuid("empresa_id").notNull(),
    grupoId: text("grupo_id").notNull(),
    usuarioId: text("usuario_id").notNull(),
    origem: text("origem").notNull().default("manual"),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    criadoPor: text("criado_por")
      .notNull()
      .references(() => usuarioAutenticacao.id)
  },
  (t) => [
    primaryKey({ name: "agenda_grupo_membros_pk", columns: [t.empresaId, t.grupoId, t.usuarioId] }),
    foreignKey({ name: "agenda_grupo_membros_grupo_fk", columns: [t.empresaId, t.grupoId], foreignColumns: [agendaGrupos.empresaId, agendaGrupos.id] }),
    pessoaDaEmpresa("agenda_grupo_membros_usuario_fk", t.empresaId, t.usuarioId),
    check("agenda_grupo_membros_origem_check", sql`${t.origem} in ('manual', 'transferencia', 'area')`),
    index("agenda_grupo_membros_usuario_idx").on(t.empresaId, t.usuarioId)
  ]
);

// Colunas do Kanban (valem para a empresa toda; "Concluído" é fixa e não é linha).
export const agendaColunas = pgTable(
  "agenda_colunas",
  {
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresas.id),
    id: text("id").notNull(),
    nome: text("nome").notNull(),
    ordem: integer("ordem").notNull().default(0),
    ...criadoAtualizado()
  },
  (t) => [
    primaryKey({ name: "agenda_colunas_pk", columns: [t.empresaId, t.id] }),
    check("agenda_colunas_id_check", sql`${t.id} ~ ${ID_AGENDA} and ${t.id} <> 'concluido'`),
    check("agenda_colunas_nome_check", sql`char_length(btrim(${t.nome})) between 1 and 30 and lower(btrim(${t.nome})) <> 'concluído'`),
    uniqueIndex("agenda_colunas_nome_uq").on(t.empresaId, sql`lower(btrim(${t.nome}))`)
  ]
);

// Compromissos: um registro por compromisso (campos de dist/agenda/dominio.js:5-16).
export const agendaCompromissos = pgTable(
  "agenda_compromissos",
  {
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresas.id),
    id: text("id").notNull(),
    grupoId: text("grupo_id").notNull(),
    gestorId: text("gestor_id").notNull(), // = criadoPor da tela
    semCriadorOriginal: boolean("sem_criador_original").notNull().default(false),
    titulo: text("titulo").notNull(),
    notas: text("notas").notNull().default(""),
    url: text("url").notNull().default(""),
    local: text("local").notNull().default(""),
    localLat: numeric("local_lat", { precision: 9, scale: 6 }),
    localLng: numeric("local_lng", { precision: 9, scale: 6 }),
    localAviso: text("local_aviso").notNull().default(""),
    localRaio: integer("local_raio"),
    data: date("data", { mode: "string" }),
    hora: text("hora"), // 'HH:MM', como a tela
    horaFim: text("hora_fim"),
    repeticaoTipo: text("repeticao_tipo"), // nulo = não repete
    repeticaoIntervalo: smallint("repeticao_intervalo").notNull().default(1),
    repeticaoUnidade: text("repeticao_unidade").notNull().default("semana"),
    repeticaoDiasSemana: smallint("repeticao_dias_semana").array().notNull().default(sql`'{}'::smallint[]`),
    repeticaoFimTipo: text("repeticao_fim_tipo").notNull().default("nunca"),
    repeticaoFimData: date("repeticao_fim_data", { mode: "string" }),
    repeticaoFimVezes: smallint("repeticao_fim_vezes"),
    repeticaoFeitas: integer("repeticao_feitas").notNull().default(0),
    repeticaoAncora: date("repeticao_ancora", { mode: "string" }),
    alertaMinutos: integer("alerta_minutos"), // nulo = sem alerta
    prioridade: text("prioridade").notNull().default("normal"),
    sinalizado: boolean("sinalizado").notNull().default(false),
    etiquetas: text("etiquetas").array().notNull().default(sql`'{}'::text[]`),
    subtarefas: jsonb("subtarefas").notNull().default(sql`'[]'::jsonb`), // [{ id, titulo, concluida, concluidaEm }]
    avaliacaoTipo: text("avaliacao_tipo").notNull().default(""),
    colunaId: text("coluna_id"),
    ordem: numeric("ordem").notNull().default("0"),
    concluida: boolean("concluida").notNull().default(false),
    concluidaEm: timestamp("concluida_em", { withTimezone: true }),
    concluidaPor: text("concluida_por").references(() => usuarioAutenticacao.id),
    origemId: text("origem_id"), // cópia concluída de uma repetição
    ocorrencia: date("ocorrencia", { mode: "string" }), // data da ocorrência que essa cópia concluiu
    legado: jsonb("legado").notNull().default(sql`'{}'::jsonb`), // o que veio do documento sem lugar próprio
    // Tela ligada (0008, P-46): endereço da tela (#/…) que a tarefa abre, o nome mostrado e, para tarefa criada
    // por uma tela (agendamento de pedido…), a referência única dela (não duplica a tarefa).
    vinculoTela: text("vinculo_tela"),
    vinculoTitulo: text("vinculo_titulo"),
    vinculoRef: text("vinculo_ref"),
    // Ação programada (0012, P-53): a ação da tela que conta (ex.: produtos:excluir) e quantas vezes, em cada
    // repetição, para a tarefa concluir sozinha. Nulo: conclui com "Feito" (ou pela própria tela).
    acaoTela: text("acao_tela"),
    acaoQuantidade: smallint("acao_quantidade"),
    // Área (0013, P-58, áudio do Rodrigo de 27/11/2026): nó do cadastro DES - Área / Setor / Local
    // (cicluz-location-tree-v1), pelo id. Sem chave estrangeira: `locais` é regravada inteira a cada envio e pode
    // chegar atrasada; a tela mostra "Área não encontrada" quando o nó some. Nulo = sem área.
    areaId: text("area_id"),
    excluidoEm: timestamp("excluido_em", { withTimezone: true }),
    excluidoPor: text("excluido_por").references(() => usuarioAutenticacao.id),
    versao: integer("versao").notNull().default(1),
    ...criadoAtualizado()
  },
  (t) => [
    primaryKey({ name: "agenda_compromissos_pk", columns: [t.empresaId, t.id] }),
    foreignKey({ name: "agenda_compromissos_grupo_fk", columns: [t.empresaId, t.grupoId], foreignColumns: [agendaGrupos.empresaId, agendaGrupos.id] }),
    pessoaDaEmpresa("agenda_compromissos_gestor_fk", t.empresaId, t.gestorId),
    foreignKey({ name: "agenda_compromissos_coluna_fk", columns: [t.empresaId, t.colunaId], foreignColumns: [agendaColunas.empresaId, agendaColunas.id] }),
    foreignKey({ name: "agenda_compromissos_origem_fk", columns: [t.empresaId, t.origemId], foreignColumns: [t.empresaId, t.id] }),
    check("agenda_compromissos_id_check", sql`${t.id} ~ ${ID_AGENDA}`),
    check("agenda_compromissos_titulo_check", sql`char_length(btrim(${t.titulo})) between 1 and 200`),
    check("agenda_compromissos_url_check", sql`${t.url} = '' or ${t.url} ~* ${URL_COMPLETA}`),
    check(
      "agenda_compromissos_hora_check",
      sql`(${t.hora} is null or ${t.hora} ~ ${HORA}) and (${t.horaFim} is null or ${t.horaFim} ~ ${HORA}) and (${t.hora} is null or ${t.data} is not null) and (${t.horaFim} is null or (${t.hora} is not null and ${t.horaFim} > ${t.hora}))`
    ),
    check(
      "agenda_compromissos_local_check",
      sql`(${t.localLat} is null or ${t.localLat} between -90 and 90) and (${t.localLng} is null or ${t.localLng} between -180 and 180) and ${t.localAviso} in ('', 'entrar', 'sair') and (${t.localAviso} = '' or (${t.localLat} is not null and ${t.localLng} is not null and ${t.localRaio} between 50 and 50000))`
    ),
    check(
      "agenda_compromissos_repeticao_check",
      sql`(${t.repeticaoTipo} is null or ${t.repeticaoTipo} in ('hora', 'dia', 'dias-uteis', 'fins-de-semana', 'semana', 'quinzena', 'mes', 'trimestre', 'semestre', 'ano', 'personalizada')) and (${t.repeticaoTipo} is null or ${t.data} is not null) and (${t.repeticaoTipo} is distinct from 'hora' or ${t.hora} is not null) and ${t.repeticaoIntervalo} between 1 and 99 and ${t.repeticaoUnidade} in ('dia', 'semana', 'mes', 'ano') and ${t.repeticaoDiasSemana} <@ '{0,1,2,3,4,5,6}'::smallint[] and ${t.repeticaoFimTipo} in ('nunca', 'data', 'vezes') and (${t.repeticaoFimTipo} <> 'data' or ${t.repeticaoFimData} is not null) and (${t.repeticaoFimTipo} <> 'vezes' or ${t.repeticaoFimVezes} between 1 and 999) and ${t.repeticaoFeitas} >= 0`
    ),
    check("agenda_compromissos_alerta_check", sql`${t.alertaMinutos} is null or (${t.alertaMinutos} between 0 and 40320 and ${t.data} is not null)`),
    check("agenda_compromissos_prioridade_check", sql`${t.prioridade} in ('muito-baixa', 'baixa', 'normal', 'alta', 'muito-alta')`),
    check("agenda_compromissos_subtarefas_check", sql`jsonb_typeof(${t.subtarefas}) = 'array'`),
    check("agenda_compromissos_legado_check", sql`jsonb_typeof(${t.legado}) = 'object'`),
    check("agenda_compromissos_avaliacao_check", sql`${t.avaliacaoTipo} in ('', 'estrelas', 'niveis', 'nps', 'feito')`),
    check("agenda_compromissos_concluida_check", sql`${t.concluida} = (${t.concluidaEm} is not null)`),
    // A cópia de uma repetição não repete. Pode ser reaberta, como hoje na tela (dist/agenda/dados.js:236).
    check("agenda_compromissos_copia_check", sql`${t.origemId} is null or ${t.repeticaoTipo} is null`),
    check("agenda_compromissos_excluido_check", sql`(${t.excluidoEm} is null) = (${t.excluidoPor} is null)`),
    check("agenda_compromissos_versao_check", sql`${t.versao} >= 1`),
    // Trava do duplo toque no banco: a mesma ocorrência de uma repetição só vira cópia uma vez.
    uniqueIndex("agenda_compromissos_ocorrencia_uq")
      .on(t.empresaId, t.origemId, t.ocorrencia)
      .where(sql`${t.origemId} is not null and ${t.ocorrencia} is not null`),
    check(
      "agenda_compromissos_vinculo_check",
      sql`(${t.vinculoTela} is null or (${t.vinculoTela} ~ ${VINCULO_TELA} and char_length(${t.vinculoTela}) <= 302)) and (${t.vinculoTitulo} is null or char_length(${t.vinculoTitulo}) between 1 and 120) and (${t.vinculoRef} is null or ${t.vinculoRef} ~ ${VINCULO_REF}) and (${t.vinculoTitulo} is null or ${t.vinculoTela} is not null)`
    ),
    check(
      "agenda_compromissos_acao_check",
      sql`(${t.acaoTela} is null) = (${t.acaoQuantidade} is null) and (${t.acaoTela} is null or (${t.acaoTela} ~ '^[a-z]{1,30}:[a-z-]{1,30}$' and ${t.acaoQuantidade} between 1 and 365 and ${t.vinculoTela} is not null))`
    ),
    check("agenda_compromissos_area_check", sql`${t.areaId} is null or ${t.areaId} ~ '^[A-Za-z0-9_.:-]{1,100}$'`),
    // Uma tarefa por referência de tela (a cópia concluída de uma repetição herda a referência e fica de fora).
    uniqueIndex("agenda_compromissos_vinculo_uq")
      .on(t.empresaId, t.vinculoRef)
      .where(sql`${t.vinculoRef} is not null and ${t.origemId} is null`),
    index("agenda_compromissos_grupo_idx").on(t.empresaId, t.grupoId).where(sql`${t.excluidoEm} is null`),
    index("agenda_compromissos_gestor_idx").on(t.empresaId, t.gestorId).where(sql`${t.excluidoEm} is null`),
    index("agenda_compromissos_data_idx").on(t.empresaId, t.data).where(sql`${t.excluidoEm} is null`)
  ]
);

// Pessoas do compromisso e o que cada uma pode (P-19). O gestor não precisa de linha aqui.
export const agendaParticipantes = pgTable(
  "agenda_participantes",
  {
    empresaId: uuid("empresa_id").notNull(),
    compromissoId: text("compromisso_id").notNull(),
    usuarioId: text("usuario_id").notNull(),
    responsavel: boolean("responsavel").notNull().default(false),
    ver: boolean("ver").notNull().default(true),
    editar: boolean("editar").notNull().default(false),
    concluir: boolean("concluir").notNull().default(false),
    excluir: boolean("excluir").notNull().default(false),
    ordem: smallint("ordem").notNull().default(0),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    criadoPor: text("criado_por")
      .notNull()
      .references(() => usuarioAutenticacao.id)
  },
  (t) => [
    primaryKey({ name: "agenda_participantes_pk", columns: [t.empresaId, t.compromissoId, t.usuarioId] }),
    foreignKey({ name: "agenda_participantes_compromisso_fk", columns: [t.empresaId, t.compromissoId], foreignColumns: [agendaCompromissos.empresaId, agendaCompromissos.id] }),
    pessoaDaEmpresa("agenda_participantes_usuario_fk", t.empresaId, t.usuarioId),
    // Quem pode fazer algo também pode ver (normalizarPessoas, shared/src/agenda/regras.ts).
    check("agenda_participantes_ver_check", sql`${t.ver} or not (${t.responsavel} or ${t.editar} or ${t.concluir} or ${t.excluir})`),
    index("agenda_participantes_usuario_idx").on(t.empresaId, t.usuarioId)
  ]
);

// Avaliações: uma por (compromisso, avaliado, papel). Registrada, não muda nem some (trigger na 0007).
export const agendaAvaliacoes = pgTable(
  "agenda_avaliacoes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    empresaId: uuid("empresa_id").notNull(),
    compromissoId: text("compromisso_id").notNull(),
    avaliadoId: text("avaliado_id").notNull(),
    porId: text("por_id").notNull(),
    papel: text("papel").notNull(),
    tipo: text("tipo").notNull(),
    valor: smallint("valor").notNull(),
    comentario: text("comentario").notNull().default(""),
    em: timestamp("em", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    foreignKey({ name: "agenda_avaliacoes_compromisso_fk", columns: [t.empresaId, t.compromissoId], foreignColumns: [agendaCompromissos.empresaId, agendaCompromissos.id] }),
    pessoaDaEmpresa("agenda_avaliacoes_avaliado_fk", t.empresaId, t.avaliadoId),
    pessoaDaEmpresa("agenda_avaliacoes_por_fk", t.empresaId, t.porId),
    check("agenda_avaliacoes_papel_check", sql`${t.papel} in ('gestor', 'auto') and (${t.papel} <> 'auto' or ${t.avaliadoId} = ${t.porId})`),
    check(
      "agenda_avaliacoes_valor_check",
      sql`(${t.tipo} in ('estrelas', 'niveis') and ${t.valor} between 1 and 5) or (${t.tipo} = 'nps' and ${t.valor} between 0 and 10) or (${t.tipo} = 'feito' and ${t.valor} in (0, 1))`
    ),
    check("agenda_avaliacoes_comentario_check", sql`char_length(${t.comentario}) <= 500`),
    uniqueIndex("agenda_avaliacoes_uq").on(t.empresaId, t.compromissoId, t.avaliadoId, t.papel)
  ]
);

// Adiar o alerta ("soneca"), por pessoa (pergunta 6 do plano; proposta padrão: só para quem adiou).
export const agendaAdiamentos = pgTable(
  "agenda_adiamentos",
  {
    empresaId: uuid("empresa_id").notNull(),
    compromissoId: text("compromisso_id").notNull(),
    usuarioId: text("usuario_id").notNull(),
    ate: timestamp("ate", { withTimezone: true }).notNull(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    primaryKey({ name: "agenda_adiamentos_pk", columns: [t.empresaId, t.compromissoId, t.usuarioId] }),
    foreignKey({ name: "agenda_adiamentos_compromisso_fk", columns: [t.empresaId, t.compromissoId], foreignColumns: [agendaCompromissos.empresaId, agendaCompromissos.id] }),
    pessoaDaEmpresa("agenda_adiamentos_usuario_fk", t.empresaId, t.usuarioId)
  ]
);

// Ligações do mapa mental ("depende de", "antes de"…).
export const agendaRelacoes = pgTable(
  "agenda_relacoes",
  {
    empresaId: uuid("empresa_id").notNull(),
    id: text("id").notNull(),
    deId: text("de_id").notNull(),
    paraId: text("para_id").notNull(),
    rotulo: text("rotulo").notNull().default(""),
    ...criadoAtualizado()
  },
  (t) => [
    primaryKey({ name: "agenda_relacoes_pk", columns: [t.empresaId, t.id] }),
    foreignKey({ name: "agenda_relacoes_de_fk", columns: [t.empresaId, t.deId], foreignColumns: [agendaCompromissos.empresaId, agendaCompromissos.id] }),
    foreignKey({ name: "agenda_relacoes_para_fk", columns: [t.empresaId, t.paraId], foreignColumns: [agendaCompromissos.empresaId, agendaCompromissos.id] }),
    check("agenda_relacoes_id_check", sql`${t.id} ~ ${ID_AGENDA}`),
    check("agenda_relacoes_pontas_check", sql`${t.deId} <> ${t.paraId}`),
    check("agenda_relacoes_rotulo_check", sql`char_length(${t.rotulo}) <= 40`),
    // Os mesmos dois compromissos só se ligam uma vez, em qualquer sentido (dist/agenda/dados.js:407).
    uniqueIndex("agenda_relacoes_par_uq").on(t.empresaId, sql`least(${t.deId}, ${t.paraId})`, sql`greatest(${t.deId}, ${t.paraId})`)
  ]
);

// Registro de cada transferência do documento para as tabelas. Só INSERT.
export const agendaTransferencias = pgTable(
  "agenda_transferencias",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresas.id),
    origem: text("origem").notNull(),
    documentoVersao: integer("documento_versao"),
    contagemAntes: jsonb("contagem_antes").notNull(),
    contagemDepois: jsonb("contagem_depois").notNull(),
    pendencias: jsonb("pendencias").notNull().default(sql`'[]'::jsonb`),
    situacao: text("situacao").notNull(),
    feitaEm: timestamp("feita_em", { withTimezone: true }).notNull().defaultNow(),
    feitaPor: text("feita_por")
      .notNull()
      .references(() => usuarioAutenticacao.id)
  },
  (t) => [
    check("agenda_transferencias_origem_check", sql`${t.origem} in ('servidor', 'aparelho', 'retransferencia')`),
    check("agenda_transferencias_situacao_check", sql`${t.situacao} in ('concluida', 'recusada')`),
    index("agenda_transferencias_empresa_idx").on(t.empresaId, t.feitaEm)
  ]
);

/* ======================================================================================================
 * Rotina da Agenda (0008, P-46, áudios do Rodrigo de 23/11/2026): chat do grupo (cada lista é um grupo),
 * configurações da Agenda por pessoa e o registro da hora fora do expediente (só registro: nada vai para a
 * folha até o Rodrigo confirmar a regra de pagamento, P-46 item 3).
 * ==================================================================================================== */

// Chat do grupo: quem é membro (ou dono) da lista conversa ali, além do chat de cada compromisso.
export const agendaGrupoMensagens = pgTable(
  "agenda_grupo_mensagens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    empresaId: uuid("empresa_id").notNull(),
    grupoId: text("grupo_id").notNull(),
    autorId: text("autor_id")
      .notNull()
      .references(() => usuarioAutenticacao.id),
    texto: text("texto").notNull(),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    foreignKey({ name: "agenda_grupo_mensagens_grupo_fk", columns: [t.empresaId, t.grupoId], foreignColumns: [agendaGrupos.empresaId, agendaGrupos.id] }),
    check("agenda_grupo_mensagens_texto_check", sql`char_length(${t.texto}) between 1 and 2000`),
    index("agenda_grupo_mensagens_grupo_idx").on(t.empresaId, t.grupoId, t.criadoEm)
  ]
);

// Até onde cada pessoa leu o chat de cada grupo.
export const agendaGrupoLeituras = pgTable(
  "agenda_grupo_leituras",
  {
    empresaId: uuid("empresa_id").notNull(),
    grupoId: text("grupo_id").notNull(),
    usuarioId: text("usuario_id").notNull(),
    lidoAte: timestamp("lido_ate", { withTimezone: true }).notNull()
  },
  (t) => [
    primaryKey({ name: "agenda_grupo_leituras_pk", columns: [t.empresaId, t.grupoId, t.usuarioId] }),
    foreignKey({ name: "agenda_grupo_leituras_grupo_fk", columns: [t.empresaId, t.grupoId], foreignColumns: [agendaGrupos.empresaId, agendaGrupos.id] }),
    pessoaDaEmpresa("agenda_grupo_leituras_usuario_fk", t.empresaId, t.usuarioId)
  ]
);

// Configurações da Agenda de cada pessoa (o administrador define). Sem linha = sem restrição.
// Expediente: dias da semana (0 = domingo) e horário. Fora dele: permitir ou bloquear a Agenda; a hora fora
// do expediente é registrada como "comum" ou "extra" (só registro) ou não é registrada. Inatividade: sai do
// sistema depois de N minutos sem mexer (nulo = nunca).
export const agendaConfigPessoas = pgTable(
  "agenda_config_pessoas",
  {
    empresaId: uuid("empresa_id").notNull(),
    usuarioId: text("usuario_id").notNull(),
    expedienteDias: smallint("expediente_dias").array().notNull().default(sql`'{}'::smallint[]`),
    expedienteInicio: text("expediente_inicio"),
    expedienteFim: text("expediente_fim"),
    foraExpediente: text("fora_expediente").notNull().default("permitir"),
    horaFora: text("hora_fora").notNull().default("nao-registrar"),
    inatividadeMinutos: smallint("inatividade_minutos"),
    // false = esta pessoa nunca sai sozinha por tempo parado (o administrador escolhe; Zé, 25/11/2026). 0010.
    saiPorTempoParado: boolean("sai_por_tempo_parado").notNull().default(true),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
    atualizadoPor: text("atualizado_por")
      .notNull()
      .references(() => usuarioAutenticacao.id)
  },
  (t) => [
    primaryKey({ name: "agenda_config_pessoas_pk", columns: [t.empresaId, t.usuarioId] }),
    pessoaDaEmpresa("agenda_config_pessoas_usuario_fk", t.empresaId, t.usuarioId),
    check(
      "agenda_config_pessoas_expediente_check",
      sql`${t.expedienteDias} <@ '{0,1,2,3,4,5,6}'::smallint[] and (${t.expedienteInicio} is null) = (${t.expedienteFim} is null) and (${t.expedienteInicio} is null or (${t.expedienteInicio} ~ ${HORA} and ${t.expedienteFim} ~ ${HORA} and ${t.expedienteFim} > ${t.expedienteInicio}))`
    ),
    check("agenda_config_pessoas_fora_check", sql`${t.foraExpediente} in ('permitir', 'bloquear')`),
    check("agenda_config_pessoas_hora_fora_check", sql`${t.horaFora} in ('nao-registrar', 'comum', 'extra')`),
    check("agenda_config_pessoas_inatividade_check", sql`${t.inatividadeMinutos} is null or ${t.inatividadeMinutos} between 1 and 480`)
  ]
);

// Hora fora do expediente: uma linha por compromisso concluído fora do expediente por quem tem o registro ligado.
// minutos = regra simplificada do áudio (terminou às 19h, expediente até 17h = 120 min); nulo = dia sem expediente.
export const agendaHorasFora = pgTable(
  "agenda_horas_fora",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    empresaId: uuid("empresa_id").notNull(),
    usuarioId: text("usuario_id").notNull(),
    compromissoId: text("compromisso_id").notNull(),
    dia: date("dia", { mode: "string" }).notNull(),
    concluidaEm: timestamp("concluida_em", { withTimezone: true }).notNull(),
    minutos: integer("minutos"),
    // 'comum'/'extra' só nas linhas de antes da 0009. Desde a 0009 (P-46 item 6) a hora é só calculada e mostrada:
    // se paga e como (comum ou extra) é decisão pendente do Rodrigo, então a linha nova não tem tipo.
    tipo: text("tipo"),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    pessoaDaEmpresa("agenda_horas_fora_usuario_fk", t.empresaId, t.usuarioId),
    foreignKey({ name: "agenda_horas_fora_compromisso_fk", columns: [t.empresaId, t.compromissoId], foreignColumns: [agendaCompromissos.empresaId, agendaCompromissos.id] }),
    check("agenda_horas_fora_tipo_check", sql`${t.tipo} is null or ${t.tipo} in ('comum', 'extra')`),
    check("agenda_horas_fora_minutos_check", sql`${t.minutos} is null or ${t.minutos} between 0 and 1440`),
    uniqueIndex("agenda_horas_fora_uq").on(t.empresaId, t.compromissoId, t.usuarioId),
    index("agenda_horas_fora_pessoa_idx").on(t.empresaId, t.usuarioId, t.dia)
  ]
);

// Progresso da ação programada (0012, P-53): quantas vezes a ação da tela foi feita na repetição pendente
// (ocorrencia = a data da repetição). Ao chegar na quantidade, a tarefa conclui sozinha.
export const agendaAcoesProgresso = pgTable(
  "agenda_acoes_progresso",
  {
    empresaId: uuid("empresa_id").notNull(),
    compromissoId: text("compromisso_id").notNull(),
    ocorrencia: date("ocorrencia", { mode: "string" }).notNull(),
    feitas: integer("feitas").notNull().default(0),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    primaryKey({ name: "agenda_acoes_progresso_pk", columns: [t.empresaId, t.compromissoId, t.ocorrencia] }),
    foreignKey({ name: "agenda_acoes_progresso_compromisso_fk", columns: [t.empresaId, t.compromissoId], foreignColumns: [agendaCompromissos.empresaId, agendaCompromissos.id] }),
    check("agenda_acoes_progresso_feitas_check", sql`${t.feitas} >= 0`)
  ]
);

// Em quais telas o ícone roxo de agendar aparece (0012, P-53): o administrador decide. Só as exceções ficam
// aqui; sem linha, vale o padrão (ligado em todas, menos nos formulários de lançamento).
export const agendaTelasIcone = pgTable(
  "agenda_telas_icone",
  {
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresas.id),
    tela: text("tela").notNull(),
    mostrar: boolean("mostrar").notNull(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
    atualizadoPor: text("atualizado_por")
      .notNull()
      .references(() => usuarioAutenticacao.id)
  },
  (t) => [
    primaryKey({ name: "agenda_telas_icone_pk", columns: [t.empresaId, t.tela] }),
    check("agenda_telas_icone_tela_check", sql`${t.tela} ~ '^#/[A-Za-z0-9%/_.-]+$' and char_length(${t.tela}) <= 302`)
  ]
);
