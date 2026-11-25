import { z } from "zod";

// Vendas dos PDVs (CREARE). O S2 não guarda venda: consulta o Sistema Pralis (S1) ao vivo, que já recebe
// o robô da loja, para os números dos dois sistemas serem sempre os mesmos (mesma conta do Relatório de
// Vendas do S1). Ids de PDV, forma de pagamento e turno são os do S1.

const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, "Data inválida");
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/u, "Hora inválida");
const id = z.string().uuid();

export const STATUS_VENDA_PDV = ["aprovado", "aguardando_aprovacao", "cancelado"] as const;

export const consultaVendasPdvSchema = z
  .object({
    dataInicio: dia,
    dataFim: dia,
    // Hora junto da data (hora de Brasília): o período vai de dataInicio+horaInicio até dataFim+horaFim,
    // contínuo, como no Relatório de Vendas do Sistema Pralis. Sem hora, vale o dia inteiro.
    horaInicio: hora.optional(),
    horaFim: hora.optional(),
    // Janela que se repete em cada dia (vem do Grupo de vendas: o turno do PDV). Início maior que o fim
    // cruza a meia-noite.
    janelaInicio: hora.optional(),
    janelaFim: hora.optional(),
    pdvId: id.optional(),
    formaPagamentoId: id.optional(),
    turnoId: id.optional(),
    status: z.enum(STATUS_VENDA_PDV).optional(),
    idVenda: z.string().trim().min(1).max(120).optional(),
    produto: z.string().trim().min(1).max(200).optional(),
    ordem: z.enum(["asc", "desc"]).default("desc"),
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(50)
  })
  .refine((consulta) => `${consulta.dataInicio}T${consulta.horaInicio ?? "00:00"}` <= `${consulta.dataFim}T${consulta.horaFim ?? "23:59"}`, {
    message: "O início é depois do fim",
    path: ["dataFim"]
  })
  .refine((consulta) => {
    const inicio = Date.parse(`${consulta.dataInicio}T00:00:00Z`);
    const fim = Date.parse(`${consulta.dataFim}T00:00:00Z`);
    return (fim - inicio) / 86_400_000 <= 366;
  }, { message: "Período máximo de 1 ano", path: ["dataFim"] });

export type ConsultaVendasPdv = z.infer<typeof consultaVendasPdvSchema>;

export type PagamentoVendaPdv = {
  id: string;
  formaPagamentoId: string | null;
  formaPagamentoNome: string | null;
  tipoPagamentoAutomacao: string | null;
  totalPago: string | number;
};

export type ItemVendaPdv = {
  produtoAutomacaoCodigo: string | null;
  descricaoProduto: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
};

export type VendaPdv = {
  id: string;
  dataReferencia: string;
  dataVenda: string | null;
  descricao: string;
  valorOriginal: string;
  valorAcrescimo: string;
  valorDesconto: string;
  valorLiquido: string;
  status: string;
  cancelamentoJustificativa: string | null;
  cancelamentoMotivo: string | null;
  pdvId: string | null;
  pdvNome: string | null;
  colaboradorNome: string | null;
  pagamentos: PagamentoVendaPdv[];
  itensVenda: ItemVendaPdv[];
};

export type PaginaVendasPdv = { itens: VendaPdv[]; total: number; page: number; pageSize: number };

export type TotaisVendasPdv = {
  totalGeral: number;
  quantidade: number;
  porFormaPagamento: Array<{
    formaPagamentoId: string | null;
    formaPagamento: string;
    categoriaFechamentoCaixa: string | null;
    total: number;
    quantidade: number;
  }>;
};

export type OpcoesVendasPdv = {
  pdvs: Array<{ id: string; nome: string; codigo: string | null; ativo: boolean }>;
  formasPagamento: Array<{ id: string; nome: string; categoria: string | null }>;
  turnos: Array<{ id: string; nome: string; horaInicio: string; horaFim: string; ativo: boolean }>;
};
