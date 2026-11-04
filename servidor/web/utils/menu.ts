// Menu do app: só as telas que já existem aqui. As telas antigas (cadastros) continuam no site e
// são abertas pelo link "Cadastros", sem duplicar nenhuma.
export type ItemMenu = {
  rota: string;
  titulo: string;
  subtitulo: string;
  cor: string;
  sinal: "+" | "−";
};

export const MENU_LANCAMENTOS: ItemMenu[] = [
  { rota: "/lancamentos/vendas", titulo: "Entradas", subtitulo: "Vendas / Faturamento", cor: "var(--cor-vendas)", sinal: "+" },
  { rota: "/lancamentos/despesas", titulo: "Saídas", subtitulo: "Despesas / Custos", cor: "var(--cor-despesas)", sinal: "−" },
  { rota: "/lancamentos/mercadorias", titulo: "Saídas", subtitulo: "Mercadorias / CMV", cor: "var(--cor-mercadorias)", sinal: "−" },
  { rota: "/lancamentos/retiradas", titulo: "Saídas", subtitulo: "Retiradas / Investimentos", cor: "var(--cor-retiradas)", sinal: "−" }
];
