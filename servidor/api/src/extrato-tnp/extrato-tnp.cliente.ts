import type { BancoExtrato, ConsultaExtratoTnp, ExtratoTnp } from "@cicluz/shared";
import { env } from "../env.ts";
import { ErroDominio } from "../erros.ts";
import { extratoDoColetor } from "./extrato-tnp.formato.ts";

// Cliente HTTP dos coletores do extrato (Pluggy): um da TNP (Caixa PJ) e uma cópia do HORA (Bradesco PJ), mesmo
// código. Só GET, token no cabeçalho (nunca na URL, nunca no navegador: o coletor não libera CORS de propósito).
// A resposta passa pela lista branca (extrato-tnp.formato.ts).
const TEMPO_LIMITE_MS = 15_000;

/** Endereço e token do coletor de cada banco (lidos na hora: os testes trocam o env). */
function coletor(banco: BancoExtrato): { url: string; token: string } {
  return banco === "hora"
    ? { url: env.HORA_EXTRATO_URL, token: env.HORA_EXTRATO_TOKEN }
    : { url: env.TNP_EXTRATO_URL, token: env.TNP_EXTRATO_TOKEN };
}

/** Ligado = coletor com endereço e token, e a empresa do S2 que pode ver definida (vale para os dois bancos). */
export function extratoConfigurado(banco: BancoExtrato = "tnp"): boolean {
  const { url, token } = coletor(banco);
  return Boolean(url) && token.length >= 32 && Boolean(env.TNP_EXTRATO_EMPRESA_ID);
}

const indisponivel = (motivo: string) =>
  new ErroDominio(
    "O coletor do extrato não respondeu. Tente de novo em instantes.",
    503,
    "EXTRATO_INDISPONIVEL",
    { motivo },
  );

type Bruto = Partial<Record<"ok" | "mensagem", unknown>>;
const objeto = (v: unknown): Bruto =>
  v && typeof v === "object" ? (v as Bruto) : {};

export async function buscarExtrato(
  consulta: ConsultaExtratoTnp,
): Promise<ExtratoTnp> {
  if (!extratoConfigurado(consulta.banco)) {
    throw new ErroDominio(
      "A leitura do extrato ainda não foi configurada.",
      503,
      "EXTRATO_NAO_CONFIGURADO",
    );
  }
  const { url: base, token } = coletor(consulta.banco);
  const url = new URL("/api/v1/extrato", base);
  url.searchParams.set("desde", consulta.desde);
  url.searchParams.set("ate", consulta.ate);
  if (consulta.conta) url.searchParams.set("conta", consulta.conta);
  let resposta: Response;
  try {
    resposta = await fetch(url, {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`,
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
  const corpo = objeto(await lerJsonLimitado(resposta));
  if (corpo.ok !== true) throw indisponivel("resposta inválida");
  return extratoDoColetor(corpo);
}

// 31 dias de extrato cabem com folga em 5 MB; acima disso a resposta é recusada sem ser lida inteira na memória.
const LIMITE_BYTES = 5 * 1024 * 1024;
async function lerJsonLimitado(resposta: Response): Promise<unknown> {
  if (Number(resposta.headers.get("content-length") ?? 0) > LIMITE_BYTES)
    throw indisponivel("resposta grande demais");
  if (!resposta.body) return null;
  const leitor = resposta.body.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    total += value.byteLength;
    if (total > LIMITE_BYTES) {
      await leitor.cancel();
      throw indisponivel("resposta grande demais");
    }
    partes.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(partes).toString("utf8"));
  } catch {
    return null;
  }
}
