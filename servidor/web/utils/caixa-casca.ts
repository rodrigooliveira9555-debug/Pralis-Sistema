// CASCA do Caixa: dados FICTÍCIOS para desenhar o fluxo do Caixa do sistema principal no layout do
// CICLUZ. Nada aqui vem da API nem é gravado. Valores em centavos. Nomes, rótulos e etapas seguem o
// Caixa do Sistema Pralis (web-vue/components/caixa) para a conversa com o Rodrigo ser sobre o
// mesmo fluxo.

export type PerfilCasca = "operador" | "gerencia" | "tesouraria";
export type StatusCaixa = "fechado" | "aberto" | "em_fechamento" | "encerrado";

export const PERFIS: { value: PerfilCasca; title: string }[] = [
  { value: "operador", title: "Operador do caixa" },
  { value: "gerencia", title: "Gerência" },
  { value: "tesouraria", title: "Tesouraria" }
];

// Login de posto: cada conta de operador é um PDV + turno (PDV 1-4 × Manhã/Tarde).
export const POSTO = { pdv: "PDV 1", turno: "Manhã", conta: "Conta PDV 1", usuario: "pdv1.manha" };

export const POSTOS = ["PDV 1", "PDV 2", "PDV 3", "PDV 4"];

// Malote que a Tesouraria declarou para o lacre 001.
export const MALOTE = {
  lacre: "001",
  dinheiro: 30000,
  moedas: 5000,
  lacresSangria: ["SNG-014", "SNG-015"],
  lacreFechamento: "FCH-001",
  rota: "Malote Cofre → Conta PDV 1"
};

export const RESPONSAVEIS = ["Ana Paula", "Bruna Costa", "Carlos Henrique"];
export const SUPERVISORES = ["Marcos Lima", "Patrícia Souza"];

export const MAQUININHAS = [
  { value: "pagbank-1", title: "PagBank Moderninha · série 8C12-4471" },
  { value: "pagbank-2", title: "PagBank Smart · série 9A03-1180" }
];

export const MOTIVOS_PARADA = [
  "Falta de energia na loja",
  "Oscilação ou pane elétrica",
  "Internet caiu",
  "Esbarrão em fio / cabo desconectado",
  "Computador travou, tive que reiniciar",
  "Limpeza ou manutenção na loja",
  "Atualização do sistema (Windows)",
  "Outro"
];

export type Recebimento = {
  id: string;
  valor: number;
  dinheiro: number;
  moedas: number;
  de: string;
  enviadoPor: string;
  quando: string;
  situacao: "pendente" | "confirmado" | "recusado";
};

export const RECEBIMENTOS: Recebimento[] = [
  { id: "r1", valor: 10000, dinheiro: 8000, moedas: 2000, de: "Gerência", enviadoPor: "Marcos Lima", quando: "04/11 08:42", situacao: "pendente" }
];

export type FormaPagamento = "Dinheiro" | "PIX" | "Cartão de crédito" | "Cartão de débito" | "Voucher";

export const VENDAS_POR_FORMA: { forma: FormaPagamento; centavos: number; quantidade: number }[] = [
  { forma: "Dinheiro", centavos: 41270, quantidade: 38 },
  { forma: "PIX", centavos: 60168, quantidade: 41 },
  { forma: "Cartão de crédito", centavos: 94705, quantidade: 22 },
  { forma: "Cartão de débito", centavos: 77972, quantidade: 35 },
  { forma: "Voucher", centavos: 22416, quantidade: 9 }
];

export type Venda = {
  id: string;
  hora: string;
  forma: FormaPagamento;
  centavos: number;
  itens: { produto: string; qtd: number; unitario: number }[];
};

export const VENDAS: Venda[] = [
  { id: "v1", hora: "06:21", forma: "Dinheiro", centavos: 1850, itens: [{ produto: "Pão francês (kg)", qtd: 1, unitario: 1850 }] },
  { id: "v2", hora: "06:34", forma: "PIX", centavos: 2690, itens: [{ produto: "Café com leite", qtd: 2, unitario: 750 }, { produto: "Pão na chapa", qtd: 2, unitario: 595 }] },
  { id: "v3", hora: "07:02", forma: "Cartão de débito", centavos: 4590, itens: [{ produto: "Bolo de cenoura", qtd: 1, unitario: 3290 }, { produto: "Suco de laranja 300ml", qtd: 1, unitario: 1300 }] },
  { id: "v4", hora: "07:15", forma: "Cartão de crédito", centavos: 8940, itens: [{ produto: "Torta de frango", qtd: 1, unitario: 6490 }, { produto: "Refrigerante 2L", qtd: 1, unitario: 1250 }, { produto: "Pão de queijo (un.)", qtd: 4, unitario: 300 }] },
  { id: "v5", hora: "07:48", forma: "Voucher", centavos: 3200, itens: [{ produto: "Misto quente", qtd: 2, unitario: 1600 }] },
  { id: "v6", hora: "08:05", forma: "Dinheiro", centavos: 960, itens: [{ produto: "Sonho", qtd: 2, unitario: 480 }] },
  { id: "v7", hora: "08:31", forma: "PIX", centavos: 5420, itens: [{ produto: "Pão francês (kg)", qtd: 2, unitario: 1850 }, { produto: "Manteiga 200g", qtd: 1, unitario: 1720 }] }
];

export const CANCELADAS = [
  {
    id: "c1",
    hora: "07:22",
    centavos: 2380,
    forma: "Cartão de débito" as FormaPagamento,
    autorizadoPor: "Marcos Lima",
    motivo: "Item lançado em dobro",
    justificativa: "Cliente pediu um café e foi lançado duas vezes.",
    itens: [{ produto: "Café expresso", qtd: 2, unitario: 690 }, { produto: "Pão de queijo (un.)", qtd: 2, unitario: 500 }]
  }
];

export const ULTIMOS_LANCAMENTOS = {
  Despesas: [{ descricao: "Gás P13", centavos: 11500, hora: "07:40" }],
  Mercadorias: [{ descricao: "Leite integral (12 un.)", centavos: 6480, hora: "08:10" }],
  Retiradas: [] as { descricao: string; centavos: number; hora: string }[]
};

// Folha "Relatório de Venda Geral" do CREARE, como a IA leria (fictício).
export const FOLHA_CREARE = {
  periodoDe: "04/11/2026 06:14:58",
  emissao: "04/11/2026 13:58:46",
  trocoInicial: 35000,
  linhas: [
    { forma: "Crédito", centavos: 94705 },
    { forma: "Débito", centavos: 77972 },
    { forma: "Dinheiro", centavos: 41270 },
    { forma: "PIX", centavos: 60168 },
    { forma: "Voucher", centavos: 22416 }
  ],
  despesas: 17980,
  sangria: 20000
};

// Relatório resumido da maquininha (PagBank), turno da manhã.
export const MAQUININHA_LEITURA = { credito: 94705, debito: 77972, pix: 60168, voucher: 22416 };

// Gaveta: o que o sistema espera em dinheiro. Só aparece na etapa 4 (contagem cega).
// Troco 350,00 + vendas em dinheiro 412,70 + recebimento 100,00 − despesas 179,80 − sangria 200,00.
export const ESPERADO_BASE = 35000 + 41270 - 17980;

export type CaixaHistorico = {
  id: string;
  data: string;
  pdv: string;
  operador: string;
  turno: "Manhã" | "Tarde";
  horario: string;
  fechadoPor: string;
  entradas: number;
  despesas: number;
  saldo: number;
  diferenca: number;
  status: "Aberto" | "Fechado" | "Fechado com acerto";
  conferencia: "pendente" | "certo" | "quebra";
};

export const HISTORICO: CaixaHistorico[] = [
  { id: "h1", data: "04/11/26", pdv: "PDV 2", operador: "Bruna Costa", turno: "Manhã", horario: "06:10 → —", fechadoPor: "—", entradas: 198420, despesas: 4200, saldo: 61330, diferenca: 0, status: "Aberto", conferencia: "pendente" },
  { id: "h2", data: "03/11/26", pdv: "PDV 1", operador: "Ana Paula", turno: "Tarde", horario: "13:05 → 21:12", fechadoPor: "Marcos Lima", entradas: 312050, despesas: 9870, saldo: 0, diferenca: -1250, status: "Fechado", conferencia: "pendente" },
  { id: "h3", data: "03/11/26", pdv: "PDV 1", operador: "Carlos Henrique", turno: "Manhã", horario: "06:02 → 13:01", fechadoPor: "Patrícia Souza", entradas: 287740, despesas: 17980, saldo: 0, diferenca: 0, status: "Fechado", conferencia: "certo" },
  { id: "h4", data: "03/11/26", pdv: "PDV 3", operador: "Bruna Costa", turno: "Manhã", horario: "06:15 → 13:20", fechadoPor: "Marcos Lima", entradas: 154310, despesas: 0, saldo: 0, diferenca: 350, status: "Fechado com acerto", conferencia: "certo" },
  { id: "h5", data: "02/11/26", pdv: "PDV 2", operador: "Ana Paula", turno: "Tarde", horario: "13:00 → 21:05", fechadoPor: "Patrícia Souza", entradas: 268900, despesas: 3200, saldo: 0, diferenca: -4000, status: "Fechado", conferencia: "quebra" }
];

export const MENSAGENS_PDV = [
  { texto: "Conferir validade dos iogurtes antes das 10h.", enviadaEm: "04/11 07:30", confirmaram: 2, total: 3 }
];

export function somaCentavos(lista: number[]) {
  return lista.reduce((total, valor) => total + valor, 0);
}
