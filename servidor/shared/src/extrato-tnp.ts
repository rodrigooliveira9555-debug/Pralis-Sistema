import { z } from "zod";

// Extrato da conta Caixa PJ da TNP (Open Finance pelo Meu Pluggy). O S2 não guarda extrato: pergunta ao coletor da
// TNP (D:\TNP-Extrato-Pluggy, GET /api/v1/extrato) e repassa. Dinheiro em CENTAVOS inteiros: entrada positiva,
// saída negativa. Lançamento PENDING não entra nos totais, só na contagem de pendentes.

const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, "Data inválida");

// De qual coletor ler: "tnp" (Caixa PJ da TNP) ou "hora" (Bradesco PJ do HORA). Mesmo código de coletor, uma cópia
// por empresa, cada uma com o próprio token. Sem o campo, TNP (como era antes de existir o HORA).
export const BANCOS_EXTRATO = ["tnp", "hora"] as const;
export type BancoExtrato = (typeof BANCOS_EXTRATO)[number];

export const consultaExtratoTnpSchema = z
  .object({
    banco: z.enum(BANCOS_EXTRATO).default("tnp"),
    desde: dia,
    ate: dia,
    conta: z.string().trim().min(1).max(80).optional(),
  })
  .refine((c) => c.desde <= c.ate, {
    message: "A data inicial é depois da final",
    path: ["ate"],
  })
  .refine(
    (c) =>
      (Date.parse(`${c.ate}T00:00:00Z`) - Date.parse(`${c.desde}T00:00:00Z`)) /
        86_400_000 <=
      30,
    {
      message: "Período máximo de 31 dias",
      path: ["ate"],
    },
  );

export type ConsultaExtratoTnp = z.infer<typeof consultaExtratoTnpSchema>;

export type TotaisExtratoTnp = {
  entradas: number;
  saidas: number;
  liquido: number;
  quantidade: number;
  pendentes: number;
};

// Documento de quem pagou/recebeu: CNPJ inteiro; CPF já chega MASCARADO do coletor (***.456.789-**).
export type DocumentoExtratoTnp = { tipo: string; numero: string };

// O que mais a Pluggy trouxe no lançamento. Tudo opcional: o banco nem sempre informa.
export type DetalhesLancamentoExtratoTnp = {
  descricaoBanco?: string;
  forma?: string;
  operacaoDetalhe?: string;
  motivo?: string;
  documento?: DocumentoExtratoTnp;
  estabelecimento?: { nome?: string; cnpj?: string; ramo?: string; cnae?: string };
  cartao?: {
    final?: string;
    parcela?: number;
    parcelas?: number;
    dataCompra?: string;
    faturaId?: string;
    tipoPagamento?: string;
    tarifa?: string;
    mcc?: number;
  };
};

export type LancamentoExtratoTnp = {
  transacaoId: string;
  contaId: string;
  data: string;
  dia: string;
  descricao: string;
  valorCentavos: number;
  tipo: "CREDIT" | "DEBIT";
  situacao: string;
  saldoCentavos: number | null;
  operacao: string | null;
  categoria: string | null;
  contraparte: string | null;
  detalhes: DetalhesLancamentoExtratoTnp;
};

// Limites. Conta: cheque especial e aplicado automático. Cartão: limite, disponível, vencimento e mínimo.
export type DetalhesContaExtratoTnp = {
  saldoContabilCentavos?: number | null;
  aplicadoAutomaticoCentavos?: number | null;
  chequeEspecialLimiteCentavos?: number | null;
  chequeEspecialUsadoCentavos?: number | null;
  chequeEspecialNaoContratadoCentavos?: number | null;
  bandeira?: string | null;
  limiteCentavos?: number | null;
  disponivelCentavos?: number | null;
  vencimento?: string | null;
  fechamento?: string | null;
  pagamentoMinimoCentavos?: number | null;
  situacao?: string | null;
  cartoesAdicionais?: number | null;
};

export type ContaExtratoTnp = {
  contaId: string;
  tipo: TipoContaExtratoTnp;
  subtipo: string | null;
  nome: string;
  numero: string | null;
  saldoCentavos: number | null;
  saldoLidoEm: string | null;
  detalhes: DetalhesContaExtratoTnp;
};

export type FaturaExtratoTnp = {
  faturaId: string;
  vencimento: string | null;
  fechamento: string | null;
  totalCentavos: number;
  minimoCentavos: number | null;
  encargosCentavos: number;
  pagoCentavos: number;
  parcelavel: boolean;
};

export type InvestimentoExtratoTnp = {
  investimentoId: string;
  nome: string;
  tipo: string | null;
  subtipo: string | null;
  saldoCentavos: number;
  rentabilidade12m: number | null;
  emissor: string | null;
  data: string | null;
  lidoEm: string | null;
};

// BANK = conta bancária (corrente, poupança); CREDIT = cartão de crédito.
export type TipoContaExtratoTnp = "BANK" | "CREDIT";

export type ExtratoTnp = {
  geradoEm: string;
  ultimaBusca: { em: string | null; ok: boolean } | null;
  conexoes: Array<{
    instituicao: string;
    situacao: string;
    atualizadoNaPluggy: string | null;
    consentimentoExpira: string | null;
    erro: string | null;
  }>;
  // As contas escolhidas: sem filtro, só as bancárias (corrente e poupança); com o filtro do cartão, só ele
  // (aí saldoCentavos é a fatura em aberto e saldoTotalCentavos é 0).
  contas: ContaExtratoTnp[];
  // Todas as contas da conexão (inclui o cartão), com saldo e limites: são as abas da tela.
  todasAsContas: ContaExtratoTnp[];
  saldoTotalCentavos: number;
  // Faturas do cartão escolhido (vazio sem cartão no filtro) e as aplicações da conexão.
  faturas: FaturaExtratoTnp[];
  investimentos: InvestimentoExtratoTnp[];
  hoje: TotaisExtratoTnp & { dia: string };
  periodo: TotaisExtratoTnp & { desde: string; ate: string };
  dias: Array<{
    dia: string;
    entradas: number;
    saidas: number;
    lancamentos: LancamentoExtratoTnp[];
  }>;
};
