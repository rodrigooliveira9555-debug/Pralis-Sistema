import type {
  ConsultaExtratoTnp,
  ExtratoTnp,
  FonteExtrato,
} from "@cicluz/shared";
import { env } from "../env.ts";
import { ErroDominio } from "../erros.ts";
import { extratoDoColetor } from "./extrato-tnp.formato.ts";

// Cliente HTTP dos coletores de extrato (Pluggy): um da TNP e um do HORA, mesmo contrato, token e empresa próprios.
// Só GET, token no cabeçalho (nunca na URL, nunca no navegador: o coletor não libera CORS de propósito). A resposta
// passa pela lista branca (extrato-tnp.formato.ts).
const TEMPO_LIMITE_MS = 15_000;

/** Endereço, token e empresa de cada fonte (lidos na hora, para os testes poderem trocar o env). */
export function ligacaoDa(fonte: FonteExtrato) {
  if (fonte === "hora")
    return { url: env.HORA_EXTRATO_URL, token: env.HORA_EXTRATO_TOKEN, empresaId: env.HORA_EXTRATO_EMPRESA_ID };
  if (fonte === "lisboa")
    return { url: env.LISBOA_EXTRATO_URL, token: env.LISBOA_EXTRATO_TOKEN, empresaId: env.LISBOA_EXTRATO_EMPRESA_ID };
  return { url: env.TNP_EXTRATO_URL, token: env.TNP_EXTRATO_TOKEN, empresaId: env.TNP_EXTRATO_EMPRESA_ID };
}

export function extratoConfigurado(fonte: FonteExtrato = "tnp"): boolean {
  const l = ligacaoDa(fonte);
  return Boolean(l.url) && l.token.length >= 32 && Boolean(l.empresaId);
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
  if (!extratoConfigurado(consulta.fonte)) {
    throw new ErroDominio(
      "A leitura do extrato ainda não foi configurada.",
      503,
      "EXTRATO_NAO_CONFIGURADO",
    );
  }
  const ligacao = ligacaoDa(consulta.fonte);
  const url = new URL("/api/v1/extrato", ligacao.url);
  url.searchParams.set("desde", consulta.desde);
  url.searchParams.set("ate", consulta.ate);
  if (consulta.conta) url.searchParams.set("conta", consulta.conta);
  let resposta: Response;
  try {
    resposta = await fetch(url, {
      method: "GET",
      headers: {
        authorization: `Bearer ${ligacao.token}`,
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
