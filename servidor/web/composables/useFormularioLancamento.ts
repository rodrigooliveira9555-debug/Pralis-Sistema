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
import { apiParaDinheiro, campoInvalido, dinheiroParaApi, numeroParaApi } from "~/utils/entrada";

// Casas aceitas: R$ = 2; % = 4 (como o principal); quantidade = 3 e unitário = 4 (as colunas).
const casasDoInformado = (tipo: "percentual" | "valor" | null) => (tipo === "percentual" ? 4 : 2);

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
  // Versão que a tela abriu (edição concorrente = 409).
  atualizadoEmBase: string | null;
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
    recorrencia: { frequencia: "mes", repeticoes: 12, diasSemana: [] },
    atualizadoEmBase: null
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
    descontoGeralValor: apiParaDinheiro(l.descontoGeralValor),
    atualizadoEmBase: l.atualizadoEm
  };
}

function itensParaApi(itens: ItemForm[]) {
  return itens.map((i) => ({
    descricao: i.descricao.trim(),
    quantidade: numeroParaApi(i.quantidade, 3),
    valorUnitario: numeroParaApi(i.valorUnitario, 4) ?? "0",
    descontoTipo: i.descontoTipo,
    descontoValor: i.descontoTipo ? numeroParaApi(i.descontoValor, casasDoInformado(i.descontoTipo)) : null,
    descontoTotalTipo: i.descontoTotalTipo,
    descontoTotalValor: i.descontoTotalTipo ? numeroParaApi(i.descontoTotalValor, casasDoInformado(i.descontoTotalTipo)) : null,
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
    jurosValorInformado: form.jurosTipo ? numeroParaApi(form.jurosValorInformado, casasDoInformado(form.jurosTipo)) : null,
    contaNome: form.contaNome,
    grupoId: form.grupoId,
    numeroDocumentoFiscal: form.numeroDocumentoFiscal.trim() || null,
    dataDocumentoFiscal: form.dataDocumentoFiscal,
    itens: discriminando ? itensParaApi(form.itens) : [],
    descontoGeralTipo: discriminando ? form.descontoGeralTipo : null,
    descontoGeralValor:
      discriminando && form.descontoGeralTipo ? numeroParaApi(form.descontoGeralValor, casasDoInformado(form.descontoGeralTipo)) : null,
    ...(criando ? {} : { atualizadoEmBase: form.atualizadoEmBase ?? undefined }),
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
          descontoGeralValor: form.value.descontoGeralTipo
            ? numeroParaApi(form.value.descontoGeralValor, casasDoInformado(form.value.descontoGeralTipo))
            : null
        })
      : null;
    const juros = jurosCentavos({
      valorOriginal: valor,
      jurosTipo: form.value.jurosTipo,
      jurosValorInformado: form.value.jurosTipo
        ? numeroParaApi(form.value.jurosValorInformado, casasDoInformado(form.value.jurosTipo))
        : null
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

// Campos com número em formato que não dá para ler (ou com casas demais): bloqueiam o salvar com a
// mensagem no próprio campo, em vez de mandar um valor diferente do digitado.
export function errosDosNumeros(form: FormLancamento) {
  const erros: Record<string, string> = {};
  const dinheiroMsg = "Use 1.234,56 (no máximo 2 casas)";
  if (!dinheiroParaApi(form.valorOriginal)) erros["valorOriginal"] = form.valorOriginal.trim() ? dinheiroMsg : "Informe o valor";
  if (form.jurosTipo && campoInvalido(form.jurosValorInformado, casasDoInformado(form.jurosTipo))) {
    erros["juros"] = form.jurosTipo === "percentual" ? "Use até 4 casas" : dinheiroMsg;
  }
  if (form.descontoGeralTipo && campoInvalido(form.descontoGeralValor, casasDoInformado(form.descontoGeralTipo))) {
    erros["descontoGeral"] = form.descontoGeralTipo === "percentual" ? "Use até 4 casas" : dinheiroMsg;
  }
  form.itens.forEach((i, n) => {
    if (campoInvalido(i.quantidade, 3)) erros[`quantidade-${n}`] = "Até 3 casas";
    if (!numeroParaApi(i.valorUnitario, 4)) erros[`valorUnitario-${n}`] = "Até 4 casas";
    if (i.descontoTipo && campoInvalido(i.descontoValor, casasDoInformado(i.descontoTipo))) erros[`descontoValor-${n}`] = "Valor inválido";
    if (i.descontoTotalTipo && campoInvalido(i.descontoTotalValor, casasDoInformado(i.descontoTotalTipo))) {
      erros[`descontoTotalValor-${n}`] = "Valor inválido";
    }
  });
  return erros;
}
