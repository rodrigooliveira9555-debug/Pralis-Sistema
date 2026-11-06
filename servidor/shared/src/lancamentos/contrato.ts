import { z } from "zod";
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
// Decimal não negativo, como número ou texto com ponto, com no máximo `casas` casas e um teto que cabe
// nas colunas numeric(14, x). Sai sempre como TEXTO: nunca "1e-7" nem casa cortada calada.
const TETO = 99_999_999_999;
function decimal(casas: number, rotulo: string, opcoes: { positivo?: boolean } = {}) {
  const formato = new RegExp(`^\\d+(\\.\\d{1,${casas}})?$`);
  return z
    .union([z.number(), z.string().trim()])
    .transform((v) => (typeof v === "number" ? (Number.isFinite(v) ? String(v) : "x") : v))
    .refine((v) => formato.test(v), `${rotulo}: use no máximo ${casas} casas decimais`)
    .refine((v) => Number(v) <= TETO, `${rotulo}: valor grande demais`)
    .refine((v) => !opcoes.positivo || Number(v) > 0, `${rotulo}: precisa ser maior que zero`);
}
const dinheiro = (rotulo: string) => decimal(2, rotulo);
// Juros e descontos podem ser % (até 4 casas) ou R$ (até 2): a regra fina fica no refine do objeto.
const informado = (rotulo: string) => decimal(4, rotulo);

// Em tipo "valor" (R$) o informado é dinheiro: no máximo 2 casas.
function centavosExatos(tipo: string | null | undefined, valor: string | null | undefined) {
  return tipo !== "valor" || !valor || /^\d+(\.\d{1,2})?$/.test(valor);
}
const tipoDesconto = z.enum(["percentual", "valor"]);
const textoOpcional = (max: number) => z.string().trim().max(max).nullable().optional();

export const itemLancamentoSchema = z
  .object({
    descricao: z.string().trim().min(1, "Descreva o item").max(200),
    // Sem quantidade, vale 1 × valor unitário (como no principal). 3 casas, como a coluna.
    quantidade: decimal(3, "Quantidade", { positivo: true }).nullable().optional(),
    valorUnitario: decimal(4, "Valor unitário"),
    descontoTipo: tipoDesconto.nullable().optional(),
    descontoValor: informado("Desconto do item").nullable().optional(),
    descontoTotalTipo: tipoDesconto.nullable().optional(),
    descontoTotalValor: informado("Desconto do total do item").nullable().optional(),
    // Grupo (ou subgrupo) do cadastro financeiro da mesma categoria; opcional, como no principal.
    grupoId: textoOpcional(80)
  })
  .refine((i) => centavosExatos(i.descontoTipo, i.descontoValor) && centavosExatos(i.descontoTotalTipo, i.descontoTotalValor), {
    message: "Desconto em R$: no máximo 2 casas decimais"
  });

const discriminacao = {
  itens: z.array(itemLancamentoSchema).max(300).default([]),
  descontoGeralTipo: tipoDesconto.nullable().optional(),
  descontoGeralValor: informado("Desconto geral").nullable().optional()
};

const lancamentoBase = z.object({
  dataReferencia: data,
  dataVencimento: data,
  dataPagamento: dataOpcional,
  observacao: z.string().trim().min(1, "Observação obrigatória").max(500),
  valorOriginal: dinheiro("Valor"),
  jurosTipo: tipoDesconto.nullable().optional(),
  jurosValorInformado: informado("Juros").nullable().optional(),
  // Conta (CNT) pelo NOME, como as telas de contas guardam.
  contaNome: textoOpcional(120),
  grupoId: textoOpcional(80),
  numeroDocumentoFiscal: textoOpcional(60),
  dataDocumentoFiscal: dataOpcional,
  ...discriminacao,
  // Só na criação; editar uma ocorrência não muda a série.
  recorrencia: recorrenciaSchema.optional(),
  // Na edição: o "atualizadoEm" que a tela tinha. Outra pessoa salvou antes = 409 (nada se perde
  // calado). Ignorado na criação.
  atualizadoEmBase: z.string().optional()
});

const regraDeCasas = {
  check: (l: { jurosTipo?: string | null | undefined; jurosValorInformado?: string | null | undefined; descontoGeralTipo?: string | null | undefined; descontoGeralValor?: string | null | undefined }) =>
    centavosExatos(l.jurosTipo, l.jurosValorInformado) && centavosExatos(l.descontoGeralTipo, l.descontoGeralValor),
  message: "Juros e desconto em R$: no máximo 2 casas decimais"
};

export const lancamentoSchema = lancamentoBase.refine(regraDeCasas.check, { message: regraDeCasas.message });
// Edição de uma ocorrência: sem recorrência (a série não muda).
export const lancamentoEdicaoSchema = lancamentoBase
  .omit({ recorrencia: true })
  .refine(regraDeCasas.check, { message: regraDeCasas.message });

export const discriminarSchema = z
  .object({
    itens: z.array(itemLancamentoSchema).min(1, "Informe ao menos um item").max(300),
    descontoGeralTipo: discriminacao.descontoGeralTipo,
    descontoGeralValor: discriminacao.descontoGeralValor,
    atualizadoEmBase: z.string().optional()
  })
  .refine((d) => centavosExatos(d.descontoGeralTipo, d.descontoGeralValor), {
    message: "Desconto em R$: no máximo 2 casas decimais"
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

// Cada ação é a permissão `lancamentos_<acao>` do catálogo (acessos.ts), que vem dos cargos de acesso.
export function podeNoLancamento(permissoes: readonly string[], acao: AcaoLancamento) {
  return permissoes.includes(`lancamentos_${acao}`);
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
  atualizadoEm: string;
  itens?: ItemLancamentoResposta[];
};
