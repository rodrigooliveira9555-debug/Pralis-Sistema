import { z } from "zod";
import { AREAS_PERMISSAO } from "../acessos.ts";
import { compromissoIdSchema } from "../agenda.ts";
import type { Acesso, Nota, Pessoa } from "./regras.ts";

// Agenda no servidor: o que a tela manda e o que recebe (plano docs/AGENDA_NO_SERVIDOR_PLANO.md, seção 3).
// A regra (permissão, validação, repetição) está em ./regras.ts; aqui só a forma e os limites de tamanho.

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
/** Endereço de tela do site (#/setor/item/tela…), o mesmo que o rotas.js grava. */
export const VINCULO_TELA = /^#\/[A-Za-z0-9%/_.-]{1,300}$/;
/** Ação que uma tela sabe contar (P-53): "<tela>:<ação>", ex.: produtos:excluir. */
export const ACAO_TELA = /^[a-z]{1,30}:[a-z-]{1,30}$/;
const VINCULO_REF = /^[A-Za-z0-9:_.-]{1,200}$/;
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
  colunaId: z.union([z.literal(""), compromissoIdSchema]).default(""),
  // Tela ligada (ícone roxo de agendar, P-46): a tarefa abre essa tela. '' = sem tela.
  vinculoTela: z.union([z.literal(""), z.string().regex(VINCULO_TELA, "Endereço de tela inválido")]).default(""),
  vinculoTitulo: texto(120).default(""),
  // Ação programada (0012, P-53): a ação da tela que conta e quantas vezes, para concluir sozinha. '' = sem ação.
  acaoTela: z.union([z.literal(""), z.string().regex(ACAO_TELA, "Ação de tela inválida")]).default(""),
  acaoQuantidade: z.number().int().min(1, "Quantidade de 1 a 365").max(365, "Quantidade de 1 a 365").nullable().default(null)
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
  /** Tela que a tarefa abre ('' = nenhuma), o nome dela e a referência de quem criou pela tela ('' = criada à mão). */
  vinculoTela: string; vinculoTitulo: string; vinculoRef: string;
  /** Ação programada ('' = nenhuma), quantas vezes e quantas já foram feitas na repetição pendente. */
  acaoTela: string; acaoQuantidade: number | null; acaoFeitas: number;
  criadoEm: string; atualizadoEm: string;
  versao: number;
  /** Calculado no servidor: a tela não calcula permissão. */
  acesso: Acesso;
};
export type GrupoAgendaResposta = {
  id: string; nome: string; cor: string; icone: string; ordenacao: string; ordem: number;
  donoId: string; membro: boolean; podeGerir: boolean; versao: number;
  /** Área do Acesso por Tela ligada à lista ('' = membros escolhidos à mão). P-46 item 3. */
  area: AreaLista;
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

/** Área do Acesso por Tela (P-46 item 3): lista ligada a uma área tem como membros as contas com permissão nela. */
export const AREAS_LISTA = AREAS_PERMISSAO.map(([area]) => area);
const areaLista = z.enum(["", ...AREAS_LISTA]);
export type AreaLista = z.infer<typeof areaLista>;
export const grupoCriacaoSchema = z.object({
  id: compromissoIdSchema, nome: nomeLista, cor: corLista, icone: iconeLista.default("lista"), area: areaLista.default("")
});
export const grupoEdicaoSchema = z.object({
  versao: z.number().int().min(1),
  nome: nomeLista.optional(),
  cor: corLista.optional(),
  icone: iconeLista.optional(),
  ordenacao: z.enum(ORDENACOES_AGENDA).optional(),
  area: areaLista.optional()
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
  gestorSemCriador: z.string().trim().min(1).max(200)
  // Pessoas que não são conta (as de teste da lista provisória) não são ligadas a ninguém: ficam de fora (P-46, 24/11/2026).
});
export const copiaDoAparelhoSchema = z.object({ valor: z.string().min(2).max(LIMITE_CORPO_AGENDA) });
export type TransferenciaAgenda = z.infer<typeof transferenciaAgendaSchema>;

/* ---------- Rotina (0008, P-46): tarefa vinda de uma tela, configurações, desempenho, chat do grupo ---------- */

/**
 * Tarefa criada por uma tela (ex.: agendamento de pedido do Compras chegou na hora). `vinculoRef` é única por
 * empresa: pedir de novo devolve a mesma tarefa (dois aparelhos não duplicam). Vai para a lista "Tarefas das telas".
 */
/**
 * Telas que criam tarefa sozinhas: ocorrência do pedido de compra agendado, pedido de produção agendado,
 * lançar a produção de um pedido enviado e integração de colaborador novo (P-46 itens 1 e 2).
 */
export const VINCULO_REF_TELAS = /^(compras:oc|producao:pp|producao:lancar|pessoas:integracao):[A-Za-z0-9_.-]{1,180}$/;
/**
 * Regra automática por permissão (P-46 itens 1 e 2): a tarefa vai para TODAS as contas ativas com a permissão, e
 * quem dispara precisa ter a mesma permissão. Cada tipo de referência só aceita a sua permissão.
 */
export const REGRAS_POR_PERMISSAO = { "producao:lancar": "producao_lancar", "pessoas:integracao": "pessoas_editar" } as const;
export type PermissaoDeRegra = (typeof REGRAS_POR_PERMISSAO)[keyof typeof REGRAS_POR_PERMISSAO];
const tipoDeVinculo = (ref: string) => ref.split(":").slice(0, 2).join(":");
/** A permissão que a referência exige (regra automática) ou undefined (tarefa com responsáveis escolhidos). */
export const permissaoDaRegra = (ref: string): PermissaoDeRegra | undefined =>
  (REGRAS_POR_PERMISSAO as Record<string, PermissaoDeRegra>)[tipoDeVinculo(ref)];
export const tarefaDeTelaSchema = z.object({
  id: compromissoIdSchema,
  vinculoRef: z.string().regex(VINCULO_REF_TELAS, "Referência de tela desconhecida"),
  vinculoTela: z.string().regex(VINCULO_TELA, "Endereço de tela inválido"),
  vinculoTitulo: texto(120).min(1),
  titulo: texto(200).min(1),
  notas: texto(2000).default(""),
  data: dataOuVazio.default(""),
  hora: horaOuVazio.default(""),
  /** Contas que recebem a tarefa (responsáveis: veem e concluem). Ou isto, ou `paraQuemTem`. */
  responsaveis: z.array(z.string().trim().min(1).max(200)).min(1).max(50).optional(),
  /** Regra por permissão: o servidor resolve quem recebe (P-46 itens 1 e 2). */
  paraQuemTem: z.enum(["producao_lancar", "pessoas_editar"]).optional(),
  /** Subtarefas que já nascem com a tarefa (ex.: integração de colaborador novo). */
  subtarefas: z.array(texto(200).min(1)).max(10).default([])
}).superRefine((t, ctx) => {
  if (Boolean(t.responsaveis) === Boolean(t.paraQuemTem)) ctx.addIssue({ code: "custom", message: "Informe quem recebe a tarefa.", path: ["responsaveis"] });
  if (permissaoDaRegra(t.vinculoRef) !== t.paraQuemTem) ctx.addIssue({ code: "custom", message: "Esta tela não cria tarefa para esse grupo de pessoas.", path: ["paraQuemTem"] });
});
export const concluirPorVinculoSchema = z.object({ vinculoRef: z.string().regex(VINCULO_REF, "Referência inválida") });
/** Ação geral de toda tela do menu: "Salvar algo nesta tela" (Zé, 26/11/2026). Só conta para a tarefa ligada à tela. */
export const ACAO_GERAL = "tela:salvar";
/** A tela avisa: a ação foi feita n vezes (P-53). A ação geral vem com a tela em que aconteceu. */
export const acaoFeitaSchema = z
  .object({
    acao: z.string().regex(ACAO_TELA, "Ação de tela inválida"),
    quantidade: z.number().int().min(1).max(500).default(1),
    tela: z.string().regex(VINCULO_TELA, "Endereço de tela inválido").optional()
  })
  .strict()
  .refine((a) => a.acao !== ACAO_GERAL || Boolean(a.tela), { message: "A ação geral precisa da tela.", path: ["tela"] });
/** O administrador liga ou desliga o ícone de agendar numa tela (P-53). */
export const telaIconeSchema = z.object({ tela: z.string().regex(VINCULO_TELA, "Endereço de tela inválido"), mostrar: z.boolean() }).strict();
export type TarefaDeTela = z.infer<typeof tarefaDeTelaSchema>;

export const DIAS_EXPEDIENTE = [0, 1, 2, 3, 4, 5, 6] as const;
export const configPessoaSchema = z
  .object({
    expedienteDias: z.array(z.number().int().min(0).max(6)).max(7).default([]),
    expedienteInicio: horaOuVazio.default(""),
    expedienteFim: horaOuVazio.default(""),
    foraExpediente: z.enum(["permitir", "bloquear"]).default("permitir"),
    /** null = o padrão do sistema (INATIVIDADE_PADRAO_MINUTOS). P-46 item 4: vale para o sistema todo. */
    inatividadeMinutos: z.number().int().min(1, "Mínimo de 1 minuto").max(480, "Máximo de 480 minutos (8 horas)").nullable().default(null),
    /** false = nunca sai sozinho por tempo parado (o administrador escolhe quem; Zé, 25/11/2026). */
    saiPorTempoParado: z.boolean().default(true)
  })
  // Sem .strict(): a tela antiga (em cache depois de publicar) ainda manda "horaFora"; o campo é ignorado.
  .superRefine((c, ctx) => {
    if (Boolean(c.expedienteInicio) !== Boolean(c.expedienteFim)) ctx.addIssue({ code: "custom", message: "Informe o início e o fim do expediente, ou nenhum dos dois.", path: ["expedienteFim"] });
    else if (c.expedienteInicio && c.expedienteFim <= c.expedienteInicio) ctx.addIssue({ code: "custom", message: "O fim do expediente deve ser depois do início.", path: ["expedienteFim"] });
    if (c.expedienteInicio && !c.expedienteDias.length) ctx.addIssue({ code: "custom", message: "Marque os dias do expediente.", path: ["expedienteDias"] });
    // Bloquear sem expediente aqui é aceito: o expediente pode vir dos Horários/Escalas do colaborador ligado
    // (0009). Sem expediente nenhum, a Agenda simplesmente não fecha.
  });
/** Tempo parado padrão (P-46 item 4, Zé 24/11/2026): 15 minutos, no sistema todo. */
export const INATIVIDADE_PADRAO_MINUTOS = 15;
export type ConfigPessoa = z.infer<typeof configPessoaSchema>;
/** De onde vem o expediente: Horários/Escalas do colaborador ligado à conta, ou o das Configurações da Agenda. */
export type OrigemExpediente = "escala" | "agenda" | "nenhum";
export type ConfigPessoaResposta = ConfigPessoa & {
  usuarioId: string; nome: string; ativo: boolean; atualizadoEm: string;
  /** Conta ligada a um colaborador (P-46 item 5): o expediente vem dos Horários/Escalas dele. */
  colaboradorLigado: boolean; origemExpediente: OrigemExpediente; descricaoExpediente: string;
};
/** O que a própria pessoa recebe ao entrar: a regra dela e se agora está dentro do expediente. */
export type MinhaConfigResposta = ConfigPessoa & {
  dentroDoExpediente: boolean; bloqueadaAgora: boolean; descricaoExpediente: string; origemExpediente: OrigemExpediente;
  /** Tempo parado que vale para a pessoa (o dela ou o padrão); null = não sai sozinho (conta de posto do caixa). */
  inatividadeEfetivaMinutos: number | null;
};

/* ---------- Expediente vindo dos Horários/Escalas (0009, P-46 item 5) ---------- */

/** Janela que o aparelho manda: de 31 dias atrás até 62 dias à frente. */
export const EXPEDIENTE_DIAS_ANTES = 31;
export const EXPEDIENTE_DIAS_DEPOIS = 62;
const colaboradorId = z.string().regex(/^[A-Za-z0-9_.:-]{1,100}$/, "Colaborador inválido");
const diaExpediente = z
  .object({ dia: z.string().regex(DATA, "Data inválida"), trabalha: z.boolean(), inicio: horaOuVazio.default(""), fim: horaOuVazio.default("") })
  .strict()
  .superRefine((d, ctx) => {
    if (d.trabalha && (!d.inicio || !d.fim || d.inicio === d.fim)) ctx.addIssue({ code: "custom", message: "Dia de trabalho sem horário.", path: ["inicio"] });
    if (!d.trabalha && (d.inicio || d.fim)) ctx.addIssue({ code: "custom", message: "Folga não tem horário.", path: ["inicio"] });
  });
/**
 * O aparelho manda, para cada colaborador ligado a uma conta, o resultado dia a dia dos Horários/Escalas (só
 * trabalha/folga e o horário). Os dias de `de` a `ate` de cada colaborador enviado são substituídos.
 */
export const expedientesSchema = z
  .object({
    de: z.string().regex(DATA, "Data inválida"),
    ate: z.string().regex(DATA, "Data inválida"),
    colaboradores: z.array(z.object({ colaboradorId, dias: z.array(diaExpediente).max(120) }).strict()).max(500)
  })
  .strict()
  .refine((e) => e.ate >= e.de, { message: "O fim do período deve ser depois do início.", path: ["ate"] })
  .superRefine((e, ctx) => {
    for (const c of e.colaboradores) if (c.dias.some((d) => d.dia < e.de || d.dia > e.ate)) ctx.addIssue({ code: "custom", message: "Dia fora do período enviado.", path: ["colaboradores"] });
  });
export type ExpedientesEnvio = z.infer<typeof expedientesSchema>;
export const colaboradorDaContaSchema = z.object({ colaboradorId: colaboradorId.nullable() }).strict();

export const desempenhoQuerySchema = z.object({
  de: z.string().regex(DATA, "Data inválida"),
  ate: z.string().regex(DATA, "Data inválida")
}).refine((q) => q.ate >= q.de, { message: "O fim do período deve ser depois do início.", path: ["ate"] });
export type DesempenhoPessoa = {
  usuarioId: string; nome: string;
  /** Compromissos com data no período em que a pessoa é responsável. */
  recebidas: number; noPrazo: number; foraDoPrazo: number; naoFeitas: number; emAberto: number;
  /** Média, em horas, entre a criação e a conclusão (só as concluídas). null = nenhuma concluída. */
  tempoMedioRespostaHoras: number | null;
  /** Hora fora do expediente registrada no período (soma do maior registro de cada dia) e dias sem expediente com tarefa feita. */
  minutosForaExpediente: number; diasForaSemExpediente: number;
};
export type DesempenhoResposta = { de: string; ate: string; pessoas: DesempenhoPessoa[] };
