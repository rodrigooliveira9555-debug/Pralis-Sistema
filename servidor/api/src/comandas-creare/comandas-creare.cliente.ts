import { z } from "zod";
import { pedirAoS1 } from "../vendas-pdv/vendas-pdv.cliente.ts";

// Comandas do CREARE (R-248 do Sistema Pralis). O S2 não guarda comanda: pergunta ao S1 (/api/s2/comandas*), com o
// mesmo token e a mesma URL das vendas dos PDVs, e repassa só os campos desta lista branca.

const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, "Data inválida");
const vazioVira = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((valor) => (valor === "" || valor === null ? undefined : valor), schema.optional());

export const SITUACOES_COMANDA = ["aberta", "puxada", "abandonada", "conta", "esquecida", "fechada", "cancelada"] as const;

export const consultaComandasSchema = z.object({
  aba: z.enum(["abertas", "fechadas", "status4"]).default("abertas"),
  dia: vazioVira(dia),
  situacao: vazioVira(z.enum(SITUACOES_COMANDA)),
  funcionario: vazioVira(z.string().trim().min(1).max(40)),
  numero: vazioVira(z.coerce.number().int().min(0).max(9_999_999)),
  pagina: z.coerce.number().int().min(1).max(10_000).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(50)
});
export type ConsultaComandas = z.infer<typeof consultaComandasSchema>;
export const indicadoresComandasSchema = z.object({ dia: vazioVira(dia) });

type Bruto = Record<string, unknown>;
const texto = (valor: unknown) => (valor === null || valor === undefined || valor === "" ? null : String(valor));
const inteiro = (valor: unknown) => (Number.isFinite(Number(valor)) ? Math.trunc(Number(valor)) : 0);
const inteiroOuNulo = (valor: unknown) => (valor === null || valor === undefined ? null : inteiro(valor));
const lista = (valor: unknown): Bruto[] =>
  Array.isArray(valor) ? valor.filter((x): x is Bruto => typeof x === "object" && x !== null) : [];
const situacao = (valor: unknown) =>
  (SITUACOES_COMANDA as readonly string[]).includes(String(valor)) ? String(valor) : "aberta";

function resumo(c: Bruto) {
  return {
    idComanda: inteiro(c["idComanda"]),
    numero: inteiro(c["numero"]),
    mesa: inteiroOuNulo(c["mesa"]),
    status: inteiro(c["status"]),
    situacao: situacao(c["situacao"]),
    abertaEm: texto(c["abertaEm"]),
    ultimoLancamentoEm: texto(c["ultimoLancamentoEm"]),
    puxadaEm: texto(c["puxadaEm"]),
    puxadaAproximada: c["puxadaAproximada"] !== false,
    fechadaEm: texto(c["fechadaEm"]),
    segundosAberta: inteiroOuNulo(c["segundosAberta"]),
    itensValidos: inteiro(c["itensValidos"]),
    itensCancelados: inteiro(c["itensCancelados"]),
    valorTotalCentavos: inteiro(c["valorTotalCentavos"]),
    valorVendaCentavos: inteiroOuNulo(c["valorVendaCentavos"]),
    diferencaVendaCentavos: inteiroOuNulo(c["diferencaVendaCentavos"]),
    lancadoPor: texto(c["lancadoPor"]),
    nomeCliente: texto(c["nomeCliente"])
  };
}

function params(valores: Record<string, string | number | undefined>) {
  const p = new URLSearchParams();
  for (const [chave, valor] of Object.entries(valores)) {
    if (valor !== undefined && valor !== "") p.set(chave, String(valor));
  }
  return p;
}

export async function buscarComandas(consulta: ConsultaComandas) {
  const corpo = (await pedirAoS1("/api/s2/comandas", params(consulta))) as {
    data?: unknown;
    meta?: { pagination?: Bruto };
  };
  const itens = lista(corpo.data).map(resumo);
  const paginacao = corpo.meta?.pagination ?? {};
  return {
    itens,
    total: inteiro(paginacao["total"] ?? itens.length),
    page: inteiro(paginacao["page"] ?? consulta.pagina),
    pageSize: inteiro(paginacao["pageSize"] ?? consulta.porPagina)
  };
}

export async function buscarIndicadores(diaPedido?: string) {
  const corpo = (await pedirAoS1("/api/s2/comandas/indicadores", params({ dia: diaPedido }))) as { data?: Bruto };
  const d = corpo.data ?? {};
  return {
    retratoEm: texto(d["retratoEm"]),
    abertasAgora: inteiro(d["abertasAgora"]),
    puxadasAgora: inteiro(d["puxadasAgora"]),
    abandonadas: inteiro(d["abandonadas"]),
    contas: inteiro(d["contas"]),
    esquecidas: inteiro(d["esquecidas"]),
    valorEmAbertoCentavos: inteiro(d["valorEmAbertoCentavos"]),
    dia: texto(d["dia"]),
    fechadasNoDia: inteiro(d["fechadasNoDia"]),
    valorFechadoNoDiaCentavos: inteiro(d["valorFechadoNoDiaCentavos"]),
    tempoMedioAbertaSegundos: inteiroOuNulo(d["tempoMedioAbertaSegundos"]),
    tempoMedioPuxadaPagaSegundos: inteiroOuNulo(d["tempoMedioPuxadaPagaSegundos"]),
    diferentesDaVendaNoDia: inteiro(d["diferentesDaVendaNoDia"])
  };
}

const TIPOS_EVENTO = ["abriu", "item", "item_cancelado", "puxada", "fechada", "cancelada"];

export async function buscarDetalhe(idComanda: number) {
  const corpo = (await pedirAoS1(`/api/s2/comandas/${idComanda}`)) as { data?: Bruto };
  const d = corpo.data ?? {};
  return {
    ...resumo(d),
    observacao: texto(d["observacao"]),
    vendaCreareId: inteiroOuNulo(d["vendaCreareId"]),
    valorSubtotalCentavos: inteiro(d["valorSubtotalCentavos"]),
    valorDescontoCentavos: inteiro(d["valorDescontoCentavos"]),
    itens: lista(d["itens"]).map((i) => ({
      idItem: inteiro(i["idItem"]),
      produtoCodigo: texto(i["produtoCodigo"]),
      descricao: String(i["descricao"] ?? ""),
      quantidade: Number(i["quantidade"]) || 0,
      valorTotalCentavos: inteiro(i["valorTotalCentavos"]),
      funcionario: texto(i["funcionario"]),
      cancelado: i["cancelado"] === true,
      motivoCancelamento: texto(i["motivoCancelamento"]),
      lancadoEm: texto(i["lancadoEm"])
    })),
    linhaDoTempo: lista(d["linhaDoTempo"])
      .filter((e) => TIPOS_EVENTO.includes(String(e["tipo"])))
      .map((e) => ({ tipo: String(e["tipo"]), em: String(e["em"] ?? ""), texto: String(e["texto"] ?? "") }))
  };
}

export async function buscarOpcoes() {
  const corpo = (await pedirAoS1("/api/s2/comandas/opcoes")) as { data?: Bruto };
  return {
    funcionarios: lista(corpo.data?.["funcionarios"]).map((f) => ({
      codigo: String(f["codigo"] ?? ""),
      nome: String(f["nome"] ?? "")
    }))
  };
}
