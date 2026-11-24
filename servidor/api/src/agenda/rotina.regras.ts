import { and, eq } from "drizzle-orm";
import { agendaConfigPessoas, agendaHorasFora } from "@cicluz/db/schema";
import type { ConfigPessoa, PerfilSessao } from "@cicluz/shared";
import { banco, type TransacaoBanco } from "../banco/conexao.ts";
import { ErroDominio } from "../erros.ts";

// Expediente da pessoa na Agenda (P-46, áudio do Rodrigo de 23/11/2026): fora do expediente a Agenda pode ser
// bloqueada, e a hora fora do expediente pode ser registrada (só registro, sem ir para a folha: P-46 item 3).
// O horário é o da loja (Brasil, sem horário de verão): America/Sao_Paulo.

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

type Expediente = Pick<ConfigPessoa, "expedienteDias" | "expedienteInicio" | "expedienteFim">;
export const temExpediente = (c: Expediente) => Boolean(c.expedienteInicio && c.expedienteFim && c.expedienteDias.length);

/**
 * Onde o momento cai no expediente. "dentro"; "antes"/"depois" com os minutos até o início / desde o fim
 * (regra simplificada do áudio: terminou às 19h com expediente até 17h = 120 min); "folga" = dia sem expediente.
 */
export function situacaoNoExpediente(c: Expediente, momento: Date): { onde: "dentro" | "antes" | "depois" | "folga" | "sem-expediente"; minutos: number | null; dia: string } {
  const l = horaLocal(momento);
  if (!temExpediente(c)) return { onde: "sem-expediente", minutos: null, dia: l.data };
  if (!c.expedienteDias.includes(l.diaSemana)) return { onde: "folga", minutos: null, dia: l.data };
  const ini = paraMinutos(c.expedienteInicio), fim = paraMinutos(c.expedienteFim);
  if (l.minutos < ini) return { onde: "antes", minutos: ini - l.minutos, dia: l.data };
  if (l.minutos > fim) return { onde: "depois", minutos: l.minutos - fim, dia: l.data };
  return { onde: "dentro", minutos: 0, dia: l.data };
}

export function descreverExpediente(c: Expediente) {
  if (!temExpediente(c)) return "Sem expediente definido.";
  const dias = [...c.expedienteDias].sort((a, b) => a - b).map((d) => DIAS[d]).join(", ");
  return `${dias}, das ${c.expedienteInicio} às ${c.expedienteFim}`;
}

export const CONFIG_PADRAO: ConfigPessoa = { expedienteDias: [], expedienteInicio: "", expedienteFim: "", foraExpediente: "permitir", horaFora: "nao-registrar", inatividadeMinutos: null };

type Linha = typeof agendaConfigPessoas.$inferSelect;
export const configDe = (l: Linha | undefined): ConfigPessoa =>
  l
    ? {
        expedienteDias: [...l.expedienteDias].sort((a, b) => a - b), expedienteInicio: l.expedienteInicio ?? "", expedienteFim: l.expedienteFim ?? "",
        foraExpediente: l.foraExpediente as ConfigPessoa["foraExpediente"], horaFora: l.horaFora as ConfigPessoa["horaFora"], inatividadeMinutos: l.inatividadeMinutos
      }
    : { ...CONFIG_PADRAO };

export async function lerConfig(ex: typeof banco | TransacaoBanco, empresaId: string, usuarioId: string) {
  const [l] = await ex.select().from(agendaConfigPessoas).where(and(eq(agendaConfigPessoas.empresaId, empresaId), eq(agendaConfigPessoas.usuarioId, usuarioId))).limit(1);
  return configDe(l);
}

/** Bloqueia a Agenda de quem está configurado para "só no expediente" e está fora dele agora. */
export async function exigirExpediente(perfil: PerfilSessao, momento = new Date()) {
  const c = await lerConfig(banco, perfil.empresa.id, perfil.usuarioId);
  if (c.foraExpediente !== "bloquear") return;
  const s = situacaoNoExpediente(c, momento);
  if (s.onde === "dentro" || s.onde === "sem-expediente") return;
  throw new ErroDominio(`Fora do seu expediente (${descreverExpediente(c)}). A Agenda abre de novo no horário.`, 403, "AGENDA_FORA_EXPEDIENTE");
}

/** Na conclusão: quem tem o registro ligado e concluiu fora do expediente ganha uma linha (uma por compromisso). */
export async function registrarHoraFora(tx: TransacaoBanco, perfil: PerfilSessao, compromissoId: string, momento: Date) {
  const c = await lerConfig(tx, perfil.empresa.id, perfil.usuarioId);
  if (c.horaFora === "nao-registrar") return;
  const s = situacaoNoExpediente(c, momento);
  if (s.onde === "dentro" || s.onde === "sem-expediente") return;
  await tx
    .insert(agendaHorasFora)
    .values({ empresaId: perfil.empresa.id, usuarioId: perfil.usuarioId, compromissoId, dia: s.dia, concluidaEm: momento, minutos: s.minutos, tipo: c.horaFora })
    .onConflictDoNothing();
}
