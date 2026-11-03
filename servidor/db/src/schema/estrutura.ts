import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";
import { empresas } from "./cadastro.ts";

// Tabelas relacionais de contas, cargos, salários, perfis de cargo, locais, organograma e
// identidade visual, reconstruídas a partir dos documentos das telas (ver api/src/projecoes).
// As referências que a TELA guarda por nome (conta, cargo no organograma) ficam por nome aqui
// também: o banco espelha a tela, não inventa vínculo que ela não tem.

const empresa = () =>
  uuid("empresa_id")
    .notNull()
    .references(() => empresas.id);

// "cicluz-ti-groups-v1".contas (ordem) + "cicluz-ti-account-details-v1" (por nome).
export const contas = pgTable(
  "contas",
  {
    empresaId: empresa(),
    nome: text("nome").notNull(),
    ordem: integer("ordem").notNull(),
    situacao: text("situacao").notNull(),
    documento: text("documento"),
    icone: text("icone").notNull()
  },
  (t) => [
    primaryKey({ columns: [t.empresaId, t.nome] }),
    // A tela recusa conta repetida sem diferenciar maiúsculas de minúsculas.
    uniqueIndex("contas_nome_sem_caixa_idx").on(t.empresaId, sql`lower(${t.nome})`),
    check("contas_situacao_check", sql`${t.situacao} in ('ATIVA', 'INATIVA')`),
    check("contas_documento_check", sql`${t.documento} is null or ${t.documento} in ('DOC/F', 'DOC/NF', 'DOC/F/NF')`)
  ]
);

// Catálogo completo como a tela mostra: os 32 de referência (com as alterações locais) + os locais.
// `chave` é a mesma da tela ("ref:3", "local:0"): é por ela que salários e organograma apontam.
export const cargos = pgTable(
  "cargos",
  {
    empresaId: empresa(),
    chave: text("chave").notNull(),
    origem: text("origem").notNull(),
    ordem: integer("ordem").notNull(),
    nome: text("nome").notNull(),
    nomeReduzido: text("nome_reduzido"),
    categoria: text("categoria"),
    cbo: text("cbo"),
    titulo: text("titulo"),
    // "valor" e "ano" da ficha como a tela guarda ("1.668,00"): texto de exibição; o salário de
    // verdade, com data, fica em salarios_*.
    valorFicha: text("valor_ficha"),
    ano: text("ano"),
    sinonimos: text("sinonimos"),
    descricao: text("descricao"),
    icone: text("icone"),
    modoIdentidade: text("modo_identidade"),
    sigla: text("sigla"),
    cor: text("cor")
  },
  (t) => [
    primaryKey({ columns: [t.empresaId, t.chave] }),
    check("cargos_origem_check", sql`${t.origem} in ('referencia', 'local')`)
  ]
);

// "cicluz-salarios-vigencias-v1": cada lançamento tem início e os valores por cargo. A tela não
// valida sobreposição nem data repetida; o salário vigente numa data é o lançamento mais recente
// com início ≤ data (empate: o último lançado), com chave E nome do cargo iguais.
export const salariosVigencias = pgTable(
  "salarios_vigencias",
  {
    empresaId: empresa(),
    ordem: integer("ordem").notNull(),
    inicio: date("inicio").notNull(),
    observacao: text("observacao")
  },
  (t) => [primaryKey({ columns: [t.empresaId, t.ordem] })]
);

export const salariosValores = pgTable(
  "salarios_valores",
  {
    empresaId: empresa(),
    vigenciaOrdem: integer("vigencia_ordem").notNull(),
    posicao: integer("posicao").notNull(),
    cargoChave: text("cargo_chave").notNull(),
    cargoNome: text("cargo_nome").notNull(),
    // Reais exatamente como a tela grava (número), com até 4 casas, sem arredondar.
    valorReais: numeric("valor_reais", { precision: 14, scale: 4 }).notNull()
  },
  (t) => [
    primaryKey({ columns: [t.empresaId, t.vigenciaOrdem, t.posicao] }),
    foreignKey({
      columns: [t.empresaId, t.vigenciaOrdem],
      foreignColumns: [salariosVigencias.empresaId, salariosVigencias.ordem],
      name: "salarios_valores_vigencia_fk"
    }),
    check("salarios_valores_positivo_check", sql`${t.valorReais} > 0`)
  ]
);

// "cicluz-job-profiles-v1": ficha de cargos por área.
export const perfisAreas = pgTable(
  "perfis_areas",
  { empresaId: empresa(), id: text("id").notNull(), nome: text("nome").notNull(), ordem: integer("ordem").notNull() },
  (t) => [primaryKey({ columns: [t.empresaId, t.id] })]
);

export const perfisRequisitos = pgTable(
  "perfis_requisitos",
  {
    empresaId: empresa(),
    id: text("id").notNull(),
    // Área do perfil ("profile:…") ou raiz da árvore de locais ("location:…"): sem FK de propósito.
    areaId: text("area_id").notNull(),
    grupo: text("grupo").notNull(),
    texto: text("texto").notNull(),
    ordem: integer("ordem").notNull()
  },
  (t) => [
    primaryKey({ columns: [t.empresaId, t.id] }),
    check(
      "perfis_requisitos_grupo_check",
      sql`${t.grupo} in ('education', 'experience', 'certificates', 'technical', 'behavior', 'individual', 'group', 'collective')`
    )
  ]
);

export const perfisCargos = pgTable(
  "perfis_cargos",
  {
    empresaId: empresa(),
    id: text("id").notNull(),
    areaId: text("area_id").notNull(),
    areaNome: text("area_nome"),
    origemCargo: text("origem_cargo"),
    cargoNome: text("cargo_nome").notNull(),
    cbo: text("cbo"),
    missao: text("missao"),
    autonomia: text("autonomia"),
    ordem: integer("ordem").notNull()
  },
  (t) => [primaryKey({ columns: [t.empresaId, t.id] })]
);

export const perfisCargosRequisitos = pgTable(
  "perfis_cargos_requisitos",
  { empresaId: empresa(), perfilCargoId: text("perfil_cargo_id").notNull(), requisitoId: text("requisito_id").notNull() },
  (t) => [
    primaryKey({ columns: [t.empresaId, t.perfilCargoId, t.requisitoId] }),
    foreignKey({
      columns: [t.empresaId, t.perfilCargoId],
      foreignColumns: [perfisCargos.empresaId, perfisCargos.id],
      name: "perfis_cargos_requisitos_cargo_fk"
    }),
    foreignKey({
      columns: [t.empresaId, t.requisitoId],
      foreignColumns: [perfisRequisitos.empresaId, perfisRequisitos.id],
      name: "perfis_cargos_requisitos_requisito_fk"
    })
  ]
);

// "cicluz-location-tree-v1": Área (1) › Setor (2) › Local (3) › Sublocal (4).
export const locais = pgTable(
  "locais",
  {
    empresaId: empresa(),
    id: text("id").notNull(),
    paiId: text("pai_id"),
    nivel: integer("nivel").notNull(),
    ordem: integer("ordem").notNull(),
    nome: text("nome").notNull(),
    icone: text("icone"),
    modoIdentidade: text("modo_identidade"),
    sigla: text("sigla"),
    cor: text("cor")
  },
  (t) => [
    primaryKey({ columns: [t.empresaId, t.id] }),
    foreignKey({ columns: [t.empresaId, t.paiId], foreignColumns: [t.empresaId, t.id], name: "locais_pai_fk" }),
    check("locais_nivel_check", sql`${t.nivel} between 1 and 4`),
    check("locais_raiz_check", sql`(${t.nivel} = 1) = (${t.paiId} is null)`)
  ]
);

export const locaisTransferencias = pgTable(
  "locais_transferencias",
  {
    empresaId: empresa(),
    ordem: integer("ordem").notNull(),
    nivel: integer("nivel"),
    data: timestamp("data", { withTimezone: true }),
    origemId: text("origem_id").notNull(),
    origemNome: text("origem_nome").notNull(),
    destinoId: text("destino_id"),
    destinoNome: text("destino_nome"),
    copiaOrigem: jsonb("copia_origem")
  },
  (t) => [primaryKey({ columns: [t.empresaId, t.ordem] })]
);

// "cicluz-organogram-positions-v1". O cargo vai por chave da tela + nome + CBO (a tela religa pelo
// nome e CBO quando a chave muda).
export const organogramaPosicoes = pgTable(
  "organograma_posicoes",
  {
    empresaId: empresa(),
    id: text("id").notNull(),
    paiId: text("pai_id"),
    ordem: integer("ordem").notNull(),
    cargoChave: text("cargo_chave"),
    cargoNome: text("cargo_nome").notNull(),
    cbo: text("cbo"),
    quantidade: integer("quantidade").notNull(),
    rotulo: text("rotulo")
  },
  (t) => [
    primaryKey({ columns: [t.empresaId, t.id] }),
    foreignKey({ columns: [t.empresaId, t.paiId], foreignColumns: [t.empresaId, t.id], name: "organograma_pai_fk" }),
    check("organograma_quantidade_check", sql`${t.quantidade} >= 1`)
  ]
);

export const organogramaVersoes = pgTable(
  "organograma_versoes",
  {
    empresaId: empresa(),
    ordem: integer("ordem").notNull(),
    data: timestamp("data", { withTimezone: true }),
    posicoes: jsonb("posicoes").notNull()
  },
  (t) => [primaryKey({ columns: [t.empresaId, t.ordem] })]
);

// "cicluz-icon-library-v1" (ícones próprios) e "cicluz-custom-colors-v1".
export const iconesPersonalizados = pgTable(
  "icones_personalizados",
  {
    empresaId: empresa(),
    id: text("id").notNull(),
    rotulo: text("rotulo"),
    desenho: text("desenho").notNull(),
    oculto: boolean("oculto").notNull(),
    excluido: boolean("excluido").notNull()
  },
  (t) => [primaryKey({ columns: [t.empresaId, t.id] })]
);

export const coresPersonalizadas = pgTable(
  "cores_personalizadas",
  { empresaId: empresa(), cor: text("cor").notNull(), ordem: integer("ordem").notNull() },
  (t) => [
    primaryKey({ columns: [t.empresaId, t.cor] }),
    check("cores_personalizadas_formato_check", sql`${t.cor} ~ '^#[0-9a-f]{6}$'`)
  ]
);
