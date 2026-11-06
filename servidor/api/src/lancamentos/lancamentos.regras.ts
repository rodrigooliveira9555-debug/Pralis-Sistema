import {
  calcularDiscriminacao,
  categoriaTemDiscriminacao,
  centavosParaDecimalBanco,
  conferirDiscriminacao,
  dataPagamentoNoPassado,
  jurosCentavos,
  paraCentavos,
  podeNoLancamento,
  type AcaoLancamento,
  type CategoriaLancamento,
  type ItemLancamentoEntrada,
  type PerfilSessao
} from "@cicluz/shared";
import { ErroDominio } from "../erros.ts";
import type { NovoItem } from "./lancamentos.repository.ts";

// Regras de Lançamentos (PROJECT_BRAIN/17 do principal), sem banco: quem grava é o service.

export function exigir(perfil: PerfilSessao, acao: AcaoLancamento, mensagem: string) {
  if (!podeNoLancamento(perfil.permissoes, acao)) throw new ErroDominio(mensagem, 403, "INSUFFICIENT_PERMISSION", { permissao: acao });
}

function erroValidacao(mensagem: string, codigo = "VALIDATION_ERROR") {
  return new ErroDominio(mensagem, 400, codigo);
}

// Datas de pagamento:
// - Despesa e mercadoria (R-203): não pode ser anterior a hoje; só quem tem pagamento retroativo retroage.
// - Retirada (R-129): nunca anterior a hoje, para ninguém (o principal tem essa diferença; mantida).
// Edição que não mexe na data continua valendo, para o histórico seguir editável.
export function conferirDataPagamento(
  categoria: CategoriaLancamento,
  perfil: PerfilSessao,
  nova: string | null | undefined,
  anterior?: string | null
) {
  const data = nova?.slice(0, 10) || null;
  if (!data || (anterior && anterior.slice(0, 10) === data)) return;
  exigir(perfil, "pagar", "Sem permissão para registrar pagamento.");
  if (!dataPagamentoNoPassado(data)) return;
  if (categoria !== "retiradas" && podeNoLancamento(perfil.permissoes, "pagamento_retroativo")) return;
  throw erroValidacao("Data de pagamento não pode ser anterior a hoje");
}

// Sem quantidade o item vale 1 × valor unitário (como no principal).
function itemParaCalculo(item: ItemLancamentoEntrada) {
  return {
    quantidade: item.quantidade ?? 1,
    valorUnitario: item.valorUnitario,
    descontoTipo: item.descontoTipo ?? null,
    descontoValor: item.descontoValor ?? null,
    descontoTotalTipo: item.descontoTotalTipo ?? null,
    descontoTotalValor: item.descontoTotalValor ?? null
  };
}

// Discriminação: só DES/MER (D12); a soma dos itens (níveis 1 e 2) tem de bater EXATAMENTE com o
// Valor do lançamento (D5, bloqueante, tolerância zero); o desconto geral é rateado (D4).
export function calcularItens(
  categoria: CategoriaLancamento,
  valorOriginal: string | number,
  entrada: {
    itens: ItemLancamentoEntrada[];
    descontoGeralTipo?: "percentual" | "valor" | null | undefined;
    descontoGeralValor?: string | number | null | undefined;
  },
  nomesDosGrupos: Map<string, string>
) {
  const temDesconto = Boolean(entrada.descontoGeralTipo);
  if (!categoriaTemDiscriminacao(categoria)) {
    if (entrada.itens.length) throw erroValidacao("Retirada não tem discriminação.");
    if (temDesconto) throw erroValidacao("Retirada não tem desconto, só juros.");
    return { itens: [] as NovoItem[], valorDescontoCentavos: 0 };
  }
  if (!entrada.itens.length) {
    if (temDesconto) throw erroValidacao("O desconto geral só existe com a discriminação dos itens.");
    return { itens: [] as NovoItem[], valorDescontoCentavos: 0 };
  }

  const paraCalculo = entrada.itens.map(itemParaCalculo);
  const divergencia = conferirDiscriminacao(paraCalculo, valorOriginal);
  if (divergencia) {
    const sentido = divergencia.diferencaCentavos > 0 ? "excede" : "não alcança";
    const reais = centavosParaDecimalBanco(Math.abs(divergencia.diferencaCentavos)).replace(".", ",");
    throw new ErroDominio(
      `A soma dos itens ${sentido} o valor do lançamento em R$ ${reais}. Confira a linha ${divergencia.linhaProvavel ?? "-"}.`,
      422,
      "DISCRIMINACAO_DIVERGENTE",
      {
        diferenca: centavosParaDecimalBanco(divergencia.diferencaCentavos),
        totalItens: centavosParaDecimalBanco(divergencia.totalItensCentavos),
        valorLancamento: centavosParaDecimalBanco(divergencia.valorLancamentoCentavos),
        linhaProvavel: divergencia.linhaProvavel,
        campoProvavel: divergencia.campoProvavel
      }
    );
  }

  const calculo = calcularDiscriminacao({
    itens: paraCalculo,
    descontoGeralTipo: entrada.descontoGeralTipo ?? null,
    descontoGeralValor: entrada.descontoGeralValor ?? null
  });
  const itens: NovoItem[] = entrada.itens.map((item, posicao) => {
    const calculado = calculo.itens[posicao];
    if (!calculado) throw new Error("item sem cálculo");
    const grupoId = item.grupoId ?? null;
    return {
      posicao,
      descricao: item.descricao,
      quantidade: item.quantidade === null || item.quantidade === undefined ? null : String(item.quantidade),
      valorUnitario: String(item.valorUnitario),
      descontoTipo: item.descontoTipo ?? null,
      descontoValor: item.descontoValor === null || item.descontoValor === undefined ? null : String(item.descontoValor),
      descontoTotalTipo: item.descontoTotalTipo ?? null,
      descontoTotalValor:
        item.descontoTotalValor === null || item.descontoTotalValor === undefined ? null : String(item.descontoTotalValor),
      valorTotal: centavosParaDecimalBanco(calculado.valorTotalCentavos),
      valorTotalComDesconto: centavosParaDecimalBanco(calculado.valorTotalComDescontoCentavos),
      valorUnitarioComDesconto: (calculado.valorUnitarioComDescontoCentavos / 100).toFixed(4),
      grupoId,
      grupoNome: grupoId ? (nomesDosGrupos.get(grupoId) ?? null) : null
    };
  });
  return { itens, valorDescontoCentavos: calculo.descontoGeralCentavos };
}

// Juros (D10/R-041): o SERVIDOR converte em R$; incide só sobre o Valor; não rateia nos itens.
export function calcularAcrescimo(entrada: {
  valorOriginal: string | number;
  jurosTipo?: "percentual" | "valor" | null | undefined;
  jurosValorInformado?: string | number | null | undefined;
}) {
  return jurosCentavos({
    valorOriginal: entrada.valorOriginal,
    jurosTipo: entrada.jurosTipo ?? null,
    jurosValorInformado: entrada.jurosValorInformado ?? null
  });
}

export function valorEmBanco(valor: string | number) {
  return centavosParaDecimalBanco(paraCentavos(valor));
}
