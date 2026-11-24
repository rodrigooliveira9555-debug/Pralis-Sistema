import { z } from "zod";

// Extrato da conta Caixa PJ da TNP (Open Finance pelo Meu Pluggy). O S2 não guarda extrato: pergunta ao coletor da
// TNP (D:\TNP-Extrato-Pluggy, GET /api/v1/extrato) e repassa. Dinheiro em CENTAVOS inteiros: entrada positiva,
// saída negativa. Lançamento PENDING não entra nos totais, só na contagem de pendentes.

const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, "Data inválida");

export const consultaExtratoTnpSchema = z
  .object({
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
  contraparte: string | null;
};

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
  contas: Array<{
    contaId: string;
    nome: string;
    numero: string | null;
    saldoCentavos: number | null;
    saldoLidoEm: string | null;
  }>;
  saldoTotalCentavos: number;
  hoje: TotaisExtratoTnp & { dia: string };
  periodo: TotaisExtratoTnp & { desde: string; ate: string };
  dias: Array<{
    dia: string;
    entradas: number;
    saidas: number;
    lancamentos: LancamentoExtratoTnp[];
  }>;
};
