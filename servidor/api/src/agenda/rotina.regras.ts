import { and, eq } from "drizzle-orm";
import { agendaConfigPessoas, agendaHorasFora } from "@cicluz/db/schema";
import { INATIVIDADE_PADRAO_MINUTOS, type ConfigPessoa, type OrigemExpediente, type PerfilSessao } from "@cicluz/shared";
import { banco, type TransacaoBanco } from "../banco/conexao.ts";
import { ErroDominio } from "../erros.ts";
import { colaboradorDaConta, diasDoColaborador, ehPosto } from "./rotina.repository.ts";

// Expediente da pessoa na Agenda (P-46). De onde vem (item 5, Zé 24/11/2026): conta ligada a um colaborador →
// o dia daquele colaborador nos Horários/Escalas (o aparelho calcula e manda; tabela expedientes_colaboradores);
// sem colaborador ligado ou sem o dia enviado → o expediente das Configurações da Agenda. Fora do expediente a
// Agenda pode ser bloqueada, e a hora fora do expediente é calculada e mostrada (item 6: só relatório, nada vai
// para a folha). O horário é o da loja (Brasil, sem horário de verão): America/Sao_Paulo.

export const FUSO = "America/Sao_Paulo";
const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** Data (AAAA-MM-DD), dia da semana (0 = domingo) e minutos do dia no horário da loja. */
export function horaLocal(momento: Date) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23" })
      .formatToParts(momento)
      .map((p) => [p.type, p.value])
  );
  const semana = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(partes["weekday"] ?? "");
  return { data: `${partes["year"]}-${partes["month"]}-${partes["day"]}`, diaSemana: semana, minutos: Number(partes["hour"]) * 60 + Number(partes["minute"]) };
}

const paraMinutos = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
const diaAnterior = (dia: string) => {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

type Expediente = Pick<ConfigPessoa, "expedienteDias" | "expedienteInicio" | "expedienteFim">;
export const temExpediente = (c: Expediente) => Boolean(c.expedienteInicio && c.expedienteFim && c.expedienteDias.length);

/** Um dia de trabalho (ou folga) já resolvido: de onde quer que venha o expediente. */
export type DiaExpediente = { trabalha: boolean; inicio: string; fim: string };
export type Situacao = { onde: "dentro" | "antes" | "depois" | "folga" | "sem-expediente"; minutos: number | null; dia: string };

/**
 * Onde o minuto cai num dia de expediente. "antes"/"depois" com os minutos até o início / desde o fim (regra
 * simplificada do áudio: terminou às 19h com expediente até 17h = 120 min). Turno que passa da meia-noite (fim
 * menor que o início): conta como dentro do início até 23:59; o resto (até o fim) é visto pelo dia seguinte.
 */
function noDia(d: DiaExpediente, minutos: number, dia: string): Situacao {
  if (!d.trabalha) return { onde: "folga", minutos: null, dia };
  const ini = paraMinutos(d.inicio), fim = paraMinutos(d.fim);
  if (fim > ini) {
    if (minutos < ini) return { onde: "antes", minutos: ini - minutos, dia };
    if (minutos > fim) return { onde: "depois", minutos: minutos - fim, dia };
    return { onde: "dentro", minutos: 0, dia };
  }
  if (minutos >= ini) return { onde: "dentro", minutos: 0, dia };
  return { onde: "antes", minutos: ini - minutos, dia };
}

/** A parte da madrugada de um turno que começou na véspera e passa da meia-noite. */
const cobreMadrugada = (vespera: DiaExpediente | undefined, minutos: number) =>
  Boolean(vespera?.trabalha && paraMinutos(vespera.fim) < paraMinutos(vespera.inicio) && minutos <= paraMinutos(vespera.fim));

/** Situação pelo expediente das Configurações da Agenda (dias da semana + horário fixo). */
export function situacaoNoExpediente(c: Expediente, momento: Date): Situacao {
  const l = horaLocal(momento);
  if (!temExpediente(c)) return { onde: "sem-expediente", minutos: null, dia: l.data };
  return noDia({ trabalha: c.expedienteDias.includes(l.diaSemana), inicio: c.expedienteInicio, fim: c.expedienteFim }, l.minutos, l.data);
}

const passaDaMeiaNoite = (d: DiaExpediente | undefined): d is DiaExpediente =>
  Boolean(d?.trabalha && paraMinutos(d.fim) < paraMinutos(d.inicio));

/**
 * Situação pelos dias vindos dos Horários/Escalas (hoje e véspera). undefined = nem hoje nem a véspera dizem nada.
 * Depois de um turno da véspera que passou da meia-noite, a manhã é "depois" daquele fim (07:00 com turno 22–06 =
 * 60 min depois, na conta do dia de ontem) — a não ser que o início de hoje esteja mais perto.
 */
export function situacaoNaEscala(dias: Map<string, DiaExpediente>, momento: Date): Situacao | undefined {
  const l = horaLocal(momento);
  const ontem = diaAnterior(l.data);
  const hoje = dias.get(l.data);
  const vespera = dias.get(ontem);
  // Madrugada de um turno que começou ontem: dentro, e a hora conta para o dia de ontem.
  if (cobreMadrugada(vespera, l.minutos)) return { onde: "dentro", minutos: 0, dia: ontem };
  if (!hoje) return undefined;
  const s = noDia(hoje, l.minutos, l.data);
  if (passaDaMeiaNoite(vespera) && (s.onde === "antes" || s.onde === "folga")) {
    const depoisDeOntem = l.minutos - paraMinutos(vespera.fim);
    // Hoje é folga: até meio-dia depois do fim de ontem ainda conta como hora a mais de ontem; depois, é folga.
    const maisPerto = s.onde === "folga" ? depoisDeOntem <= 12 * 60 : depoisDeOntem <= (s.minutos ?? Infinity);
    if (maisPerto) return { onde: "depois", minutos: depoisDeOntem, dia: ontem };
  }
  return s;
}

export function descreverExpediente(c: Expediente) {
  if (!temExpediente(c)) return "Sem expediente definido.";
  const dias = [...c.expedienteDias].sort((a, b) => a - b).map((d) => DIAS[d]).join(", ");
  return `${dias}, das ${c.expedienteInicio} às ${c.expedienteFim}`;
}
const descreverDia = (d: DiaExpediente) => (d.trabalha ? `Hoje, das ${d.inicio} às ${d.fim} (Horários/Escalas)` : "Hoje é folga (Horários/Escalas)");

export const CONFIG_PADRAO: ConfigPessoa = { expedienteDias: [], expedienteInicio: "", expedienteFim: "", foraExpediente: "permitir", inatividadeMinutos: null, saiPorTempoParado: true };

type Linha = typeof agendaConfigPessoas.$inferSelect;
export const configDe = (l: Linha | undefined): ConfigPessoa =>
  l
    ? {
        expedienteDias: [...l.expedienteDias].sort((a, b) => a - b), expedienteInicio: l.expedienteInicio ?? "", expedienteFim: l.expedienteFim ?? "",
        foraExpediente: l.foraExpediente as ConfigPessoa["foraExpediente"], inatividadeMinutos: l.inatividadeMinutos, saiPorTempoParado: l.saiPorTempoParado
      }
    : { ...CONFIG_PADRAO };

/** Tempo parado que vale para a pessoa: o dela, ou o padrão do sistema (P-46 item 4). */
export const inatividadeEfetiva = (c: Pick<ConfigPessoa, "inatividadeMinutos">) => c.inatividadeMinutos ?? INATIVIDADE_PADRAO_MINUTOS;

type Executor = typeof banco | TransacaoBanco;

/**
 * Minutos parado até sair, ou null = não sai sozinho. Conta de posto do caixa (PDV) não sai (Zé, 24/11/2026: um
 * caixa parado entre clientes não pode cair no login); as outras, o tempo da pessoa ou o padrão de 15.
 */
export async function limiteParado(ex: Executor, empresaId: string, usuarioId: string): Promise<number | null> {
  if (await ehPosto(ex, empresaId, usuarioId)) return null;
  const c = await lerConfig(ex, empresaId, usuarioId);
  // O administrador marcou "nunca sai sozinho" para esta pessoa (Zé, 25/11/2026).
  if (!c.saiPorTempoParado) return null;
  return inatividadeEfetiva(c);
}

export async function lerConfig(ex: Executor, empresaId: string, usuarioId: string) {
  const [l] = await ex.select().from(agendaConfigPessoas).where(and(eq(agendaConfigPessoas.empresaId, empresaId), eq(agendaConfigPessoas.usuarioId, usuarioId))).limit(1);
  return configDe(l);
}

/**
 * O expediente da pessoa agora: a regra dela (bloquear ou não, tempo parado), a situação no expediente e de
 * onde veio (escala do colaborador ligado ou Configurações da Agenda).
 */
export async function expedienteAgora(ex: Executor, empresaId: string, usuarioId: string, momento = new Date()) {
  const config = await lerConfig(ex, empresaId, usuarioId);
  const colaboradorId = await colaboradorDaConta(ex, empresaId, usuarioId);
  if (colaboradorId) {
    const hoje = horaLocal(momento).data;
    const linhas = await diasDoColaborador(ex, empresaId, colaboradorId, [hoje, diaAnterior(hoje)]);
    const dias = new Map(linhas.map((l) => [l.dia, { trabalha: l.trabalha, inicio: l.inicio ?? "", fim: l.fim ?? "" }]));
    const s = situacaoNaEscala(dias, momento);
    if (s) return { config, situacao: s, origem: "escala" as OrigemExpediente, descricao: descreverDia(dias.get(hoje)!), colaboradorLigado: true };
  }
  return {
    config, situacao: situacaoNoExpediente(config, momento), origem: (temExpediente(config) ? "agenda" : "nenhum") as OrigemExpediente,
    descricao: descreverExpediente(config), colaboradorLigado: Boolean(colaboradorId)
  };
}

const dentro = (s: Situacao) => s.onde === "dentro" || s.onde === "sem-expediente";

/** Bloqueia a Agenda de quem está configurado para "só no expediente" e está fora dele agora. */
export async function exigirExpediente(perfil: PerfilSessao, momento = new Date()) {
  const e = await expedienteAgora(banco, perfil.empresa.id, perfil.usuarioId, momento);
  if (e.config.foraExpediente !== "bloquear" || dentro(e.situacao)) return;
  throw new ErroDominio(`Fora do seu expediente (${e.descricao}). A Agenda abre de novo no horário.`, 403, "AGENDA_FORA_EXPEDIENTE");
}

/**
 * Na conclusão: quem concluiu fora do expediente ganha uma linha (uma por compromisso), para o Desempenho. Vale
 * para todos que têm expediente (P-46 item 6, Zé 24/11/2026): só cálculo e relatório; o tipo (comum ou extra)
 * fica vazio até o Rodrigo decidir se e como paga.
 */
export async function registrarHoraFora(tx: TransacaoBanco, perfil: PerfilSessao, compromissoId: string, momento: Date) {
  const { situacao: s } = await expedienteAgora(tx, perfil.empresa.id, perfil.usuarioId, momento);
  if (dentro(s)) return;
  await tx
    .insert(agendaHorasFora)
    .values({ empresaId: perfil.empresa.id, usuarioId: perfil.usuarioId, compromissoId, dia: s.dia, concluidaEm: momento, minutos: s.minutos, tipo: null })
    .onConflictDoNothing();
}
