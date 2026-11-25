import type { ConsultaVendasPdv, OpcoesVendasPdv, PaginaVendasPdv, TotaisVendasPdv, VendaPdv } from "@cicluz/shared";
import { env } from "../env.ts";
import { ErroDominio } from "../erros.ts";

// Cliente HTTP do Sistema Pralis (S1). É a única saída da API para fora: só GET, com o token de leitura
// do S1 no cabeçalho, nunca na URL. O token nunca volta para o navegador nem entra em mensagem de erro.
const TEMPO_LIMITE_MS = 15_000;

export function leituraConfigurada(): boolean {
  return Boolean(env.S1_VENDAS_URL) && env.S1_VENDAS_TOKEN.length >= 32 && Boolean(env.S1_VENDAS_EMPRESA_ID);
}

function naoConfigurada() {
  return new ErroDominio(
    "A leitura das vendas do Sistema Pralis ainda não foi configurada.",
    503,
    "VENDAS_PDV_NAO_CONFIGURADO"
  );
}

function indisponivel(detalhe: string) {
  return new ErroDominio(
    "O Sistema Pralis não respondeu. Tente de novo em instantes.",
    503,
    "VENDAS_PDV_INDISPONIVEL",
    { motivo: detalhe }
  );
}

export async function pedirAoS1(caminho: string, params?: URLSearchParams): Promise<unknown> {
  if (!leituraConfigurada()) throw naoConfigurada();
  const url = new URL(caminho, env.S1_VENDAS_URL);
  if (params) url.search = params.toString();
  let resposta: Response;
  try {
    resposta = await fetch(url, {
      method: "GET",
      headers: { authorization: `Bearer ${env.S1_VENDAS_TOKEN}`, accept: "application/json" },
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
      // Nunca seguir redirecionamento levando o token.
      redirect: "error"
    });
  } catch (error) {
    const tempo = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    throw indisponivel(tempo ? "tempo esgotado" : "sem conexão");
  }
  if (resposta.status === 401 || resposta.status === 403) {
    // Token trocado ou revogado no S1: problema de configuração, não do usuário.
    throw new ErroDominio("O Sistema Pralis recusou o token de leitura.", 503, "VENDAS_PDV_TOKEN_RECUSADO");
  }
  if (resposta.status === 429) throw new ErroDominio("Muitas consultas seguidas. Aguarde um minuto.", 429, "RATE_LIMITED");
  if (!resposta.ok) throw indisponivel(`status ${resposta.status}`);
  try {
    return await resposta.json();
  } catch {
    throw indisponivel("resposta inválida");
  }
}

function paramsDaConsulta(consulta: ConsultaVendasPdv, comPaginacao: boolean): URLSearchParams {
  const params = new URLSearchParams({ dataInicio: consulta.dataInicio, dataFim: consulta.dataFim });
  // Hora junto da data: instante exato em Brasília (o fim inclui o minuto inteiro).
  if (consulta.horaInicio) params.set("dataHoraInicio", `${consulta.dataInicio}T${consulta.horaInicio}:00-03:00`);
  if (consulta.horaFim) params.set("dataHoraFim", `${consulta.dataFim}T${consulta.horaFim}:59-03:00`);
  if (consulta.janelaInicio) params.set("horaDoDiaInicio", consulta.janelaInicio);
  if (consulta.janelaFim) params.set("horaDoDiaFim", consulta.janelaFim);
  for (const chave of ["pdvId", "formaPagamentoId", "turnoId", "status", "idVenda", "produto"] as const) {
    const valor = consulta[chave];
    if (valor) params.set(chave, valor);
  }
  if (comPaginacao) {
    params.set("ordem", consulta.ordem);
    params.set("page", String(consulta.page));
    params.set("pageSize", String(consulta.pageSize));
  }
  return params;
}

type RespostaPaginadaS1 = { data?: VendaPdv[]; meta?: { pagination?: { total?: number; page?: number; pageSize?: number } } };

// Lista BRANCA: o navegador recebe só estes campos, mesmo que o S1 mande mais.
const texto = (valor: unknown) => (valor === null || valor === undefined ? null : String(valor));
function venda(v: VendaPdv): VendaPdv {
  return {
    id: String(v.id),
    dataReferencia: String(v.dataReferencia),
    dataVenda: texto(v.dataVenda),
    descricao: String(v.descricao ?? ""),
    valorOriginal: String(v.valorOriginal ?? "0"),
    valorAcrescimo: String(v.valorAcrescimo ?? "0"),
    valorDesconto: String(v.valorDesconto ?? "0"),
    valorLiquido: String(v.valorLiquido ?? v.valorOriginal ?? "0"),
    status: String(v.status),
    cancelamentoJustificativa: texto(v.cancelamentoJustificativa),
    cancelamentoMotivo: texto(v.cancelamentoMotivo),
    pdvId: texto(v.pdvId),
    pdvNome: texto(v.pdvNome),
    colaboradorNome: texto(v.colaboradorNome),
    pagamentos: (v.pagamentos ?? []).map((p) => ({
      id: String(p.id),
      formaPagamentoId: texto(p.formaPagamentoId),
      formaPagamentoNome: texto(p.formaPagamentoNome),
      tipoPagamentoAutomacao: texto(p.tipoPagamentoAutomacao),
      totalPago: String(p.totalPago)
    })),
    itensVenda: (v.itensVenda ?? []).map((i) => ({
      produtoAutomacaoCodigo: texto(i.produtoAutomacaoCodigo),
      descricaoProduto: String(i.descricaoProduto ?? ""),
      quantidade: Number(i.quantidade) || 0,
      valorUnitario: Number(i.valorUnitario) || 0,
      valorTotal: Number(i.valorTotal) || 0
    }))
  };
}

export async function buscarVendas(consulta: ConsultaVendasPdv): Promise<PaginaVendasPdv> {
  const corpo = (await pedirAoS1("/api/s2/vendas", paramsDaConsulta(consulta, true))) as RespostaPaginadaS1;
  const itens = Array.isArray(corpo.data) ? corpo.data : [];
  const paginacao = corpo.meta?.pagination ?? {};
  return {
    itens: itens.map(venda),
    total: Number(paginacao.total ?? itens.length),
    page: Number(paginacao.page ?? consulta.page),
    pageSize: Number(paginacao.pageSize ?? consulta.pageSize)
  };
}

export async function buscarTotais(consulta: ConsultaVendasPdv): Promise<TotaisVendasPdv> {
  const corpo = (await pedirAoS1("/api/s2/vendas/totais", paramsDaConsulta(consulta, false))) as { data?: TotaisVendasPdv };
  const t = corpo.data;
  return {
    totalGeral: Number(t?.totalGeral) || 0,
    quantidade: Number(t?.quantidade) || 0,
    porFormaPagamento: (t?.porFormaPagamento ?? []).map((f) => ({
      formaPagamentoId: texto(f.formaPagamentoId),
      formaPagamento: String(f.formaPagamento ?? ""),
      categoriaFechamentoCaixa: texto(f.categoriaFechamentoCaixa),
      total: Number(f.total) || 0,
      quantidade: Number(f.quantidade) || 0
    }))
  };
}

export async function buscarOpcoes(): Promise<OpcoesVendasPdv> {
  const corpo = (await pedirAoS1("/api/s2/vendas/opcoes")) as { data?: OpcoesVendasPdv };
  const o = corpo.data;
  return {
    pdvs: (o?.pdvs ?? []).map((p) => ({ id: String(p.id), nome: String(p.nome), codigo: texto(p.codigo), ativo: Boolean(p.ativo) })),
    formasPagamento: (o?.formasPagamento ?? []).map((f) => ({ id: String(f.id), nome: String(f.nome), categoria: texto(f.categoria) })),
    turnos: (o?.turnos ?? []).map((t) => ({
      id: String(t.id),
      nome: String(t.nome),
      horaInicio: String(t.horaInicio),
      horaFim: String(t.horaFim),
      ativo: Boolean(t.ativo)
    }))
  };
}
