import { z } from "zod";
import type { Papel } from "../sessao.ts";
import { recorrenciaSchema } from "./recorrencia.ts";

// Lançamentos do CICLUZ: Despesas (DES), Mercadorias (MER) e Retiradas (RET), com as regras do
// Sistema Pralis (PROJECT_BRAIN/17 do principal). Entradas (VND) não se lançam à mão: vêm da
// integração do PDV (R-062 do principal) — por isso não estão aqui.
export const CATEGORIAS_LANCAMENTO = ["despesas", "mercadorias", "retiradas"] as const;
export type CategoriaLancamento = (typeof CATEGORIAS_LANCAMENTO)[number];

// Retirada não tem discriminação (D12).
export function categoriaTemDiscriminacao(categoria: CategoriaLancamento) {
  return categoria !== "retiradas";
}

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use AAAA-MM-DD");
const dataOpcional = data.nullable().optional();
// Dinheiro chega como número ou texto decimal com ponto (reais). A conta é feita em centavos.
const valor = z.union([z.number(), z.string().regex(/^\d+(\.\d+)?$/, "Valor inválido")]);
const tipoDesconto = z.enum(["percentual", "valor"]);
const textoOpcional = (max: number) => z.string().trim().max(max).nullable().optional();

export const itemLancamentoSchema = z.object({
  descricao: z.string().trim().min(1, "Descreva o item").max(200),
  // Sem quantidade, vale 1 × valor unitário (como no principal).
  quantidade: valor.nullable().optional(),
  valorUnitario: valor,
  descontoTipo: tipoDesconto.nullable().optional(),
  descontoValor: valor.nullable().optional(),
  descontoTotalTipo: tipoDesconto.nullable().optional(),
  descontoTotalValor: valor.nullable().optional(),
  // Grupo (ou subgrupo) do cadastro financeiro da mesma categoria; opcional, como no principal.
  grupoId: textoOpcional(80)
});

const discriminacao = {
  itens: z.array(itemLancamentoSchema).max(300).default([]),
  descontoGeralTipo: tipoDesconto.nullable().optional(),
  descontoGeralValor: valor.nullable().optional()
};

export const lancamentoSchema = z.object({
  dataReferencia: data,
  dataVencimento: data,
  dataPagamento: dataOpcional,
  observacao: z.string().trim().min(1, "Observação obrigatória").max(500),
  valorOriginal: valor,
  jurosTipo: tipoDesconto.nullable().optional(),
  jurosValorInformado: valor.nullable().optional(),
  // Conta (CNT) pelo NOME, como as telas de contas guardam.
  contaNome: textoOpcional(120),
  grupoId: textoOpcional(80),
  numeroDocumentoFiscal: textoOpcional(60),
  dataDocumentoFiscal: dataOpcional,
  ...discriminacao,
  // Só na criação; editar uma ocorrência não muda a série.
  recorrencia: recorrenciaSchema.optional()
});

export const discriminarSchema = z.object({
  itens: z.array(itemLancamentoSchema).min(1, "Informe ao menos um item").max(300),
  descontoGeralTipo: discriminacao.descontoGeralTipo,
  descontoGeralValor: discriminacao.descontoGeralValor
});

export const listarLancamentosSchema = z.object({
  dataInicio: data.optional(),
  dataFim: data.optional(),
  situacao: z.enum(["todos", "pendentes", "pagos"]).default("todos"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50)
});

export type LancamentoEntrada = z.infer<typeof lancamentoSchema>;
export type DiscriminarEntrada = z.infer<typeof discriminarSchema>;
export type ItemLancamentoEntrada = z.infer<typeof itemLancamentoSchema>;

// Permissões de Lançamentos por papel. O CICLUZ tem só dois papéis; a distribuição abaixo segue o
// principal (retaguarda × operação) e está registrada como decisão a confirmar com o Rodrigo
// (PROJECT_BRAIN/11, P-12).
export const ACOES_LANCAMENTO = [
  "visualizar",
  "criar",
  "editar",
  "discriminar",
  "pagar",
  "editar_pago",
  "recorrencia",
  "cancelar_serie",
  "pagamento_retroativo"
] as const;
export type AcaoLancamento = (typeof ACOES_LANCAMENTO)[number];

const PERMISSOES: Record<Papel, readonly AcaoLancamento[]> = {
  administrador: ACOES_LANCAMENTO,
  usuario: ["visualizar", "criar", "editar", "discriminar"]
};

export function podeNoLancamento(papel: Papel, acao: AcaoLancamento) {
  return PERMISSOES[papel].includes(acao);
}

export type ItemLancamentoResposta = {
  posicao: number;
  descricao: string;
  quantidade: string | null;
  valorUnitario: string;
  descontoTipo: string | null;
  descontoValor: string | null;
  descontoTotalTipo: string | null;
  descontoTotalValor: string | null;
  valorTotal: string;
  valorTotalComDesconto: string;
  valorUnitarioComDesconto: string;
  grupoId: string | null;
  grupoNome: string | null;
};

export type LancamentoResposta = {
  id: string;
  categoria: CategoriaLancamento;
  dataReferencia: string;
  dataVencimento: string;
  dataPagamento: string | null;
  observacao: string;
  valorOriginal: string;
  jurosTipo: string | null;
  jurosValorInformado: string | null;
  valorAcrescimo: string;
  descontoGeralTipo: string | null;
  descontoGeralValor: string | null;
  valorDesconto: string;
  valorTotal: string;
  contaNome: string | null;
  grupoId: string | null;
  grupoNome: string | null;
  numeroDocumentoFiscal: string | null;
  dataDocumentoFiscal: string | null;
  recorrenciaId: string | null;
  recorrenciaOrdem: number | null;
  pendenteDiscriminacao: boolean;
  itens?: ItemLancamentoResposta[];
};
