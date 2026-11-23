import { z } from "zod";
import { compromissoIdSchema } from "../agenda.ts";
import type { Acesso, Nota, Pessoa } from "./regras.ts";

// Agenda no servidor: o que a tela manda e o que recebe (plano docs/AGENDA_NO_SERVIDOR_PLANO.md, seção 3).
// A regra (permissão, validação, repetição) está em ./regras.ts; aqui só a forma e os limites de tamanho.

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
/** '' ou 'AAAA-MM-DD' (a data inválida de calendário é recusada por regras.validar, com a mensagem da tela). */
const dataOuVazio = z.union([z.literal(""), z.string().regex(DATA, "Data inválida")]);
const horaOuVazio = z.union([z.literal(""), z.string().regex(HORA, "Hora inválida")]);
const texto = (max: number) => z.string().max(max, `Passa de ${max} letras`);

export const pessoaAgendaSchema = z.object({
  id: z.string().trim().min(1).max(200),
  responsavel: z.boolean().default(false),
  ver: z.boolean().default(false),
  editar: z.boolean().default(false),
  concluir: z.boolean().default(false),
  excluir: z.boolean().default(false)
});

export const subtarefaSchema = z.object({
  id: compromissoIdSchema.optional(),
  titulo: texto(200),
  concluida: z.boolean().default(false)
});

export const repeticaoSchema = z.object({
  tipo: z.enum(["nunca", "hora", "dia", "dias-uteis", "fins-de-semana", "semana", "quinzena", "mes", "trimestre", "semestre", "ano", "personalizada"]),
  intervalo: z.coerce.number().int().min(1).max(99).default(1),
  unidade: z.enum(["dia", "semana", "mes", "ano"]).default("semana"),
  diasSemana: z.array(z.number().int().min(0).max(6)).max(7).default([]),
  fim: z
    .object({
      tipo: z.enum(["nunca", "data", "vezes"]).default("nunca"),
      data: dataOuVazio.default(""),
      vezes: z.coerce.number().int().min(0).max(999).default(0)
    })
    .default({ tipo: "nunca", data: "", vezes: 0 })
});

export const localizacaoSchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  aviso: z.enum(["", "entrar", "sair"]).default(""),
  raio: z.coerce.number().int().min(50).max(50000).default(200)
});

export const PRIORIDADES_AGENDA = ["muito-baixa", "baixa", "normal", "alta", "muito-alta"] as const;
export const TIPOS_AVALIACAO_AGENDA = ["", "estrelas", "niveis", "nps", "feito"] as const;

/** O formulário inteiro do compromisso (criar e editar). */
const camposCompromisso = {
  grupoId: compromissoIdSchema,
  titulo: texto(300),
  notas: texto(20000).default(""),
  url: texto(2000).default(""),
  local: texto(500).default(""),
  localizacao: localizacaoSchema.nullable().default(null),
  data: dataOuVazio.default(""),
  hora: horaOuVazio.default(""),
  horaFim: horaOuVazio.default(""),
  repeticao: repeticaoSchema.nullable().default(null),
  alerta: z.number().int().min(0).max(40320).nullable().default(null),
  prioridade: z.enum(PRIORIDADES_AGENDA).default("normal"),
  sinalizado: z.boolean().default(false),
  etiquetas: z.array(texto(200)).max(50).default([]),
  subtarefas: z.array(subtarefaSchema).max(200).default([]),
  pessoas: z.array(pessoaAgendaSchema).max(100).default([]),
  avaliacaoTipo: z.enum(TIPOS_AVALIACAO_AGENDA).default(""),
  colunaId: z.union([z.literal(""), compromissoIdSchema]).default("")
};

/** Criar: o id vem do aparelho (ag-<uuid>), para repetir o pedido sem duplicar. */
export const compromissoCriacaoSchema = z.object({ id: compromissoIdSchema, ...camposCompromisso });
/** Editar o formulário inteiro: com a versão que a tela tinha. */
export const compromissoEdicaoSchema = z.object({ versao: z.number().int().min(1), ...camposCompromisso });
/**
 * Mudança parcial (renomear, prioridade, sinalizar, mover de dia/hora/lista/coluna, ordem, subtarefas do mapa).
 * Passa pela MESMA função do formulário. `antesDe`: põe na ordem manual antes desse compromisso (null = no fim).
 */
export const compromissoMudancaSchema = z
  .object({
    versao: z.number().int().min(1),
    titulo: camposCompromisso.titulo.optional(),
    prioridade: z.enum(PRIORIDADES_AGENDA).optional(),
    sinalizado: z.boolean().optional(),
    grupoId: compromissoIdSchema.optional(),
    colunaId: z.union([z.literal(""), compromissoIdSchema]).optional(),
    data: dataOuVazio.optional(),
    hora: horaOuVazio.optional(),
    horaFim: horaOuVazio.optional(),
    subtarefas: z.array(subtarefaSchema).max(200).optional(),
    antesDe: compromissoIdSchema.nullable().optional()
  })
  .strict();

/** Concluir/reabrir pelo ESTADO desejado (o segundo toque pede o mesmo estado e recebe o mesmo resultado). */
export const conclusaoSchema = z.discriminatedUnion("concluida", [
  z.object({ concluida: z.literal(true), ocorrencia: z.string().regex(DATA, "Data inválida").optional() }),
  z.object({ concluida: z.literal(false) })
]);
export const subtarefaEstadoSchema = z.object({ concluida: z.boolean() });
export const exclusaoCompromissoSchema = z.object({ versao: z.coerce.number().int().min(1) });
export const limparConcluidosSchema = z.object({ grupoId: compromissoIdSchema.optional() });

export type CompromissoCriacao = z.infer<typeof compromissoCriacaoSchema>;
export type CompromissoEdicao = z.infer<typeof compromissoEdicaoSchema>;
export type CompromissoMudanca = z.infer<typeof compromissoMudancaSchema>;
export type Conclusao = z.infer<typeof conclusaoSchema>;

/* ---------- Respostas ---------- */

export type RepeticaoResposta = {
  tipo: string; intervalo: number; unidade: string; diasSemana: number[];
  fim: { tipo: string; data: string; vezes: number }; feitas: number; ancora: string;
};
export type SubtarefaResposta = { id: string; titulo: string; concluida: boolean; concluidaEm: string };
export type CompromissoResposta = {
  id: string;
  grupoId: string;
  /** Gestor (quem criou): o `criadoPor` da tela. */
  gestorId: string;
  titulo: string; notas: string; url: string; local: string;
  localizacao: { lat?: number; lng?: number; aviso: string; raio: number } | null;
  data: string; hora: string; horaFim: string;
  repeticao: RepeticaoResposta | null;
  alerta: number | null;
  /** Soneca DESTA pessoa ('' = sem soneca). */
  adiadoPara: string;
  prioridade: string; sinalizado: boolean; etiquetas: string[];
  subtarefas: SubtarefaResposta[];
  pessoas: Pessoa[];
  /** Só as notas que esta pessoa pode ver (gestor: todas; responsável: a própria autoavaliação). */
  avaliacao: { tipo: string; notas: Nota[] };
  colunaId: string; ordem: number;
  concluida: boolean; concluidaEm: string;
  origemId: string; ocorrencia: string;
  criadoEm: string; atualizadoEm: string;
  versao: number;
  /** Calculado no servidor: a tela não calcula permissão. */
  acesso: Acesso;
};
export type GrupoAgendaResposta = {
  id: string; nome: string; cor: string; icone: string; ordenacao: string; ordem: number;
  donoId: string; membro: boolean; podeGerir: boolean; versao: number;
};
export type ColunaAgendaResposta = { id: string; nome: string; ordem: number };
export type RelacaoAgendaResposta = { id: string; de: string; para: string; rotulo: string };
export type AgendaResposta = {
  /** noServidor = a Agenda já foi levada do documento para as tabelas. Antes disso, tudo vem vazio. */
  estado: { noServidor: boolean; versao: number };
  usuarioId: string;
  grupos: GrupoAgendaResposta[];
  colunas: ColunaAgendaResposta[];
  compromissos: CompromissoResposta[];
  relacoes: RelacaoAgendaResposta[];
};

/* ---------- Listas (grupos), membros e colunas ---------- */

const nomeLista = z.string().trim().min(1, "Informe o nome da lista.").max(40, "O nome da lista passa de 40 letras.");
const corLista = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida");
const iconeLista = z.string().regex(/^[a-z0-9-]{1,30}$/, "Ícone inválido");
export const ORDENACOES_AGENDA = ["manual", "data", "criacao", "prioridade", "titulo"] as const;

export const grupoCriacaoSchema = z.object({ id: compromissoIdSchema, nome: nomeLista, cor: corLista, icone: iconeLista.default("lista") });
export const grupoEdicaoSchema = z.object({
  versao: z.number().int().min(1),
  nome: nomeLista.optional(),
  cor: corLista.optional(),
  icone: iconeLista.optional(),
  ordenacao: z.enum(ORDENACOES_AGENDA).optional()
}).strict();
export const grupoMembrosSchema = z.object({ usuarioIds: z.array(z.string().trim().min(1).max(200)).max(500) });

const nomeColuna = z.string().trim().min(1, "Informe o nome da coluna.").max(30, "O nome da coluna passa de 30 letras.");
export const colunaCriacaoSchema = z.object({ id: compromissoIdSchema, nome: nomeColuna });
export const colunaEdicaoSchema = z.object({ nome: nomeColuna });

/* ---------- Ligações do mapa, avaliação e soneca ---------- */

const rotulo = z.string().trim().max(40, "O rótulo passa de 40 letras.").default("");
export const relacaoCriacaoSchema = z.object({ id: compromissoIdSchema, de: compromissoIdSchema, para: compromissoIdSchema, rotulo });
export const relacaoEdicaoSchema = z.object({ rotulo });
export const avaliacaoSchema = z.object({
  avaliadoId: z.string().trim().min(1).max(200),
  valor: z.number().int(),
  comentario: z.string().trim().max(500, "O comentário passa de 500 letras.").default("")
});
export const adiamentoSchema = z.object({ ate: z.string().datetime({ offset: true }) });

export type GrupoCriacao = z.infer<typeof grupoCriacaoSchema>;
export type GrupoEdicao = z.infer<typeof grupoEdicaoSchema>;
export type RelacaoCriacao = z.infer<typeof relacaoCriacaoSchema>;
export type AvaliacaoEnvio = z.infer<typeof avaliacaoSchema>;
export type PessoaAgendaResposta = { id: string; nome: string };

/* ---------- Transferência do documento antigo para as tabelas ---------- */

export const LIMITE_CORPO_AGENDA = 15 * 1024 * 1024;
export const transferenciaAgendaSchema = z.object({
  /** A versão do documento que o administrador viu na prévia (mudou depois → refazer a prévia). null = não havia documento. */
  documentoVersao: z.number().int().min(1).nullable(),
  /** Conta que vira gestora dos compromissos sem criador (pergunta 7). */
  gestorSemCriador: z.string().trim().min(1).max(200),
  /** "de → para" dos ids que não são conta (pergunta 8). null = fica guardado sem dar acesso. */
  dePara: z.record(z.string().max(200), z.string().max(200).nullable()).default({})
});
export const copiaDoAparelhoSchema = z.object({ valor: z.string().min(2).max(LIMITE_CORPO_AGENDA) });
export type TransferenciaAgenda = z.infer<typeof transferenciaAgendaSchema>;
