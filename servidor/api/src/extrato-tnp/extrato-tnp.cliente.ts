import type {
  ConsultaExtratoTnp,
  ExtratoTnp,
  LancamentoExtratoTnp,
  TotaisExtratoTnp,
} from "@cicluz/shared";
import { env } from "../env.ts";
import { ErroDominio } from "../erros.ts";

// Cliente HTTP do coletor do extrato da TNP (Pluggy). Só GET, token no cabeçalho (nunca na URL, nunca no navegador:
// o coletor não libera CORS de propósito). Resposta passa por lista branca antes de ir para a tela.
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

// Só os campos do contrato do coletor: o resto do que vier é ignorado.
type Campo =
  | "ok"
  | "geradoEm"
  | "ultimaBusca"
  | "em"
  | "conexoes"
  | "instituicao"
  | "situacao"
  | "atualizadoNaPluggy"
  | "consentimentoExpira"
  | "erro"
  | "contas"
  | "contaId"
  | "nome"
  | "numero"
  | "saldoCentavos"
  | "saldoLidoEm"
  | "saldoTotalCentavos"
  | "hoje"
  | "periodo"
  | "dia"
  | "desde"
  | "ate"
  | "entradas"
  | "saidas"
  | "liquido"
  | "quantidade"
  | "pendentes"
  | "dias"
  | "lancamentos"
  | "transacaoId"
  | "data"
  | "descricao"
  | "valorCentavos"
  | "tipo"
  | "operacao"
  | "contraparte"
  | "mensagem";
type Bruto = Partial<Record<Campo, unknown>>;
const texto = (v: unknown) =>
  v === null || v === undefined ? null : String(v);
const inteiro = (v: unknown) =>
  Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : 0;
const inteiroOuNulo = (v: unknown) =>
  v === null || v === undefined || !Number.isFinite(Number(v))
    ? null
    : Math.trunc(Number(v));
const lista = (v: unknown): Bruto[] => (Array.isArray(v) ? (v as Bruto[]) : []);
const objeto = (v: unknown): Bruto =>
  v && typeof v === "object" ? (v as Bruto) : {};

function totais(v: unknown): TotaisExtratoTnp {
  const t = objeto(v);
  return {
    entradas: inteiro(t.entradas),
    saidas: inteiro(t.saidas),
    liquido: inteiro(t.liquido),
    quantidade: inteiro(t.quantidade),
    pendentes: inteiro(t.pendentes),
  };
}

function lancamento(l: Bruto): LancamentoExtratoTnp {
  return {
    transacaoId: String(l.transacaoId),
    contaId: String(l.contaId),
    data: String(l.data),
    dia: String(l.dia),
    descricao: String(l.descricao ?? ""),
    valorCentavos: inteiro(l.valorCentavos),
    tipo: l.tipo === "DEBIT" ? "DEBIT" : "CREDIT",
    situacao: String(l.situacao ?? ""),
    saldoCentavos: inteiroOuNulo(l.saldoCentavos),
    operacao: texto(l.operacao),
    contraparte: texto(l.contraparte),
  };
}

function extrato(corpo: Bruto): ExtratoTnp {
  const ultima = corpo.ultimaBusca ? objeto(corpo.ultimaBusca) : null;
  const hoje = objeto(corpo.hoje);
  const periodo = objeto(corpo.periodo);
  return {
    geradoEm: String(corpo.geradoEm ?? new Date().toISOString()),
    ultimaBusca: ultima
      ? { em: texto(ultima.em), ok: Boolean(ultima.ok) }
      : null,
    conexoes: lista(corpo.conexoes).map((c) => ({
      instituicao: String(c.instituicao ?? ""),
      situacao: String(c.situacao ?? ""),
      atualizadoNaPluggy: texto(c.atualizadoNaPluggy),
      consentimentoExpira: texto(c.consentimentoExpira),
      erro: texto(c.erro),
    })),
    contas: lista(corpo.contas).map((c) => ({
      contaId: String(c.contaId),
      nome: String(c.nome ?? ""),
      numero: texto(c.numero),
      saldoCentavos: inteiroOuNulo(c.saldoCentavos),
      saldoLidoEm: texto(c.saldoLidoEm),
    })),
    saldoTotalCentavos: inteiro(corpo.saldoTotalCentavos),
    hoje: { ...totais(hoje), dia: String(hoje.dia ?? "") },
    periodo: {
      ...totais(periodo),
      desde: String(periodo.desde ?? ""),
      ate: String(periodo.ate ?? ""),
    },
    dias: lista(corpo.dias).map((d) => ({
      dia: String(d.dia),
      entradas: inteiro(d.entradas),
      saidas: inteiro(d.saidas),
      lancamentos: lista(d.lancamentos).map(lancamento),
    })),
  };
}

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
  return extrato(corpo);
}
