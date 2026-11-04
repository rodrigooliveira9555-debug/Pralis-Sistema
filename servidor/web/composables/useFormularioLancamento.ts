import {
  calcularDiscriminacao,
  diaNegocio,
  jurosCentavos,
  paraCentavos,
  type CategoriaLancamento,
  type LancamentoResposta
} from "@cicluz/shared";
import type { ItemForm } from "~/components/lancamentos/ItensDiscriminacao.vue";
import type { RecorrenciaForm } from "~/components/lancamentos/RecorrenciaCampos.vue";
import { apiParaDinheiro, dinheiroParaApi } from "~/utils/entrada";

export type FormLancamento = {
  dataReferencia: string | null;
  dataVencimento: string | null;
  dataPagamento: string | null;
  observacao: string;
  valorOriginal: string;
  jurosTipo: "percentual" | "valor" | null;
  jurosValorInformado: string;
  contaNome: string | null;
  grupoId: string | null;
  numeroDocumentoFiscal: string;
  dataDocumentoFiscal: string | null;
  discriminar: boolean;
  itens: ItemForm[];
  descontoGeralTipo: "percentual" | "valor" | null;
  descontoGeralValor: string;
  recorrente: boolean;
  recorrencia: RecorrenciaForm;
};

export function formVazio(): FormLancamento {
  const hoje = diaNegocio(new Date());
  return {
    dataReferencia: hoje,
    dataVencimento: hoje,
    dataPagamento: null,
    observacao: "",
    valorOriginal: "",
    jurosTipo: null,
    jurosValorInformado: "",
    contaNome: null,
    grupoId: null,
    numeroDocumentoFiscal: "",
    dataDocumentoFiscal: null,
    discriminar: false,
    itens: [],
    descontoGeralTipo: null,
    descontoGeralValor: "",
    recorrente: false,
    recorrencia: { frequencia: "mes", repeticoes: 12, diasSemana: [] }
  };
}

export function formDeLancamento(l: LancamentoResposta): FormLancamento {
  return {
    ...formVazio(),
    dataReferencia: l.dataReferencia,
    dataVencimento: l.dataVencimento,
    dataPagamento: l.dataPagamento,
    observacao: l.observacao,
    valorOriginal: apiParaDinheiro(l.valorOriginal),
    jurosTipo: (l.jurosTipo as FormLancamento["jurosTipo"]) ?? null,
    jurosValorInformado: apiParaDinheiro(l.jurosValorInformado),
    contaNome: l.contaNome,
    grupoId: l.grupoId,
    numeroDocumentoFiscal: l.numeroDocumentoFiscal ?? "",
    dataDocumentoFiscal: l.dataDocumentoFiscal,
    discriminar: Boolean(l.itens?.length),
    itens: (l.itens ?? []).map((i) => ({
      descricao: i.descricao,
      quantidade: apiParaDinheiro(i.quantidade),
      valorUnitario: apiParaDinheiro(i.valorUnitario),
      descontoTipo: (i.descontoTipo as ItemForm["descontoTipo"]) ?? null,
      descontoValor: apiParaDinheiro(i.descontoValor),
      descontoTotalTipo: (i.descontoTotalTipo as ItemForm["descontoTotalTipo"]) ?? null,
      descontoTotalValor: apiParaDinheiro(i.descontoTotalValor),
      grupoId: i.grupoId
    })),
    descontoGeralTipo: (l.descontoGeralTipo as FormLancamento["descontoGeralTipo"]) ?? null,
    descontoGeralValor: apiParaDinheiro(l.descontoGeralValor)
  };
}

function itensParaApi(itens: ItemForm[]) {
  return itens.map((i) => ({
    descricao: i.descricao.trim(),
    quantidade: dinheiroParaApi(i.quantidade),
    valorUnitario: dinheiroParaApi(i.valorUnitario) ?? "0",
    descontoTipo: i.descontoTipo,
    descontoValor: i.descontoTipo ? dinheiroParaApi(i.descontoValor) : null,
    descontoTotalTipo: i.descontoTotalTipo,
    descontoTotalValor: i.descontoTotalTipo ? dinheiroParaApi(i.descontoTotalValor) : null,
    grupoId: i.grupoId
  }));
}

export function corpoParaApi(form: FormLancamento, categoria: CategoriaLancamento, criando: boolean) {
  const discriminando = categoria !== "retiradas" && form.discriminar && form.itens.length > 0;
  return {
    dataReferencia: form.dataReferencia,
    dataVencimento: form.dataVencimento,
    dataPagamento: form.dataPagamento,
    observacao: form.observacao.trim(),
    valorOriginal: dinheiroParaApi(form.valorOriginal) ?? "",
    jurosTipo: form.jurosTipo,
    jurosValorInformado: form.jurosTipo ? dinheiroParaApi(form.jurosValorInformado) : null,
    contaNome: form.contaNome,
    grupoId: form.grupoId,
    numeroDocumentoFiscal: form.numeroDocumentoFiscal.trim() || null,
    dataDocumentoFiscal: form.dataDocumentoFiscal,
    itens: discriminando ? itensParaApi(form.itens) : [],
    descontoGeralTipo: discriminando ? form.descontoGeralTipo : null,
    descontoGeralValor: discriminando && form.descontoGeralTipo ? dinheiroParaApi(form.descontoGeralValor) : null,
    ...(criando && form.recorrente
      ? { recorrencia: { frequencia: form.recorrencia.frequencia, repeticoes: form.recorrencia.repeticoes, diasSemana: form.recorrencia.diasSemana } }
      : {})
  };
}

// Prévia na tela com as MESMAS funções que o servidor usa: o que a pessoa vê é o que grava.
export function usePreviaLancamento(form: Ref<FormLancamento>, categoria: Ref<CategoriaLancamento>) {
  return computed(() => {
    const valor = dinheiroParaApi(form.value.valorOriginal) ?? "0";
    const discriminando = categoria.value !== "retiradas" && form.value.discriminar && form.value.itens.length > 0;
    const calculo = discriminando
      ? calcularDiscriminacao({
          itens: itensParaApi(form.value.itens).map((i) => ({ ...i, quantidade: i.quantidade ?? 1 })),
          descontoGeralTipo: form.value.descontoGeralTipo,
          descontoGeralValor: form.value.descontoGeralTipo ? dinheiroParaApi(form.value.descontoGeralValor) : null
        })
      : null;
    const juros = jurosCentavos({
      valorOriginal: valor,
      jurosTipo: form.value.jurosTipo,
      jurosValorInformado: form.value.jurosTipo ? dinheiroParaApi(form.value.jurosValorInformado) : null
    });
    const valorCentavos = paraCentavos(valor);
    const desconto = calculo?.descontoGeralCentavos ?? 0;
    return {
      jurosCentavos: juros,
      descontoCentavos: desconto,
      totalCentavos: Math.max(0, valorCentavos + juros - desconto),
      totaisItens: calculo?.itens.map((i) => i.valorTotalCentavos) ?? [],
      // D5: a soma dos itens (sem o desconto geral) tem de bater com o Valor.
      diferencaItensCentavos: calculo ? calculo.totalItensCentavos - valorCentavos : 0
    };
  });
}
