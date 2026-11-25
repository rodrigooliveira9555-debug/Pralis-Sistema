import type { ConsultaExtratoTnp, ExtratoTnp } from "@cicluz/shared";
import { env } from "../env.ts";
import { ErroDominio } from "../erros.ts";
import { extratoDoColetor } from "./extrato-tnp.formato.ts";

// Cliente HTTP do coletor do extrato da TNP (Pluggy). Só GET, token no cabeçalho (nunca na URL, nunca no navegador:
// o coletor não libera CORS de propósito). A resposta passa pela lista branca (extrato-tnp.formato.ts).
const TEMPO_LIMITE_MS = 15_000;

export function extratoConfigurado(): boolean {
  return (
    Boolean(env.TNP_EXTRATO_URL) &&
    env.TNP_EXTRATO_TOKEN.length >= 32 &&
    Boolean(env.TNP_EXTRATO_EMPRESA_ID)
  );
}

const indisponivel = (motivo: string) =>
  new ErroDominio(
    "O coletor do extrato não respondeu. Tente de novo em instantes.",
    503,
    "EXTRATO_INDISPONIVEL",
    { motivo },
  );

type Bruto = Record<string, unknown>;
const objeto = (v: unknown): Bruto =>
  v && typeof v === "object" ? (v as Bruto) : {};

export async function buscarExtrato(
  consulta: ConsultaExtratoTnp,
): Promise<ExtratoTnp> {
  if (!extratoConfigurado()) {
    throw new ErroDominio(
      "A leitura do extrato ainda não foi configurada.",
      503,
      "EXTRATO_NAO_CONFIGURADO",
    );
  }
  const url = new URL("/api/v1/extrato", env.TNP_EXTRATO_URL);
  url.searchParams.set("desde", consulta.desde);
  url.searchParams.set("ate", consulta.ate);
  if (consulta.conta) url.searchParams.set("conta", consulta.conta);
  let resposta: Response;
  try {
    resposta = await fetch(url, {
      method: "GET",
      headers: {
        authorization: `Bearer ${env.TNP_EXTRATO_TOKEN}`,
        accept: "application/json",
      },
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
      redirect: "error",
    });
  } catch (error) {
    const tempo =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    throw indisponivel(tempo ? "tempo esgotado" : "sem conexão");
  }
  if (resposta.status === 401 || resposta.status === 503) {
    throw new ErroDominio(
      "O coletor do extrato recusou a leitura (token ou API desligada).",
      503,
      "EXTRATO_TOKEN_RECUSADO",
    );
  }
  if (resposta.status === 400) {
    const corpo = objeto(await resposta.json().catch(() => ({})));
    throw new ErroDominio(
      String(corpo.mensagem ?? "Período inválido."),
      400,
      "EXTRATO_PERIODO_INVALIDO",
    );
  }
  if (!resposta.ok) throw indisponivel(`status ${resposta.status}`);
  const corpo = objeto(await resposta.json().catch(() => null));
  if (corpo.ok !== true) throw indisponivel("resposta inválida");
  return extratoDoColetor(corpo);
}
