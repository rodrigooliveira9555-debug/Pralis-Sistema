import type { Origem } from "~/utils/cores";

// Menu do app: só as telas que já existem aqui. As telas antigas (cadastros) continuam no site e
// são abertas pelo item "Configuração", sem duplicar nenhuma.
export type ItemMenu = {
  rota: string;
  titulo: string;
  subtitulo: string;
  origem: Origem;
  sinal: "+" | "−";
  // Telas que vivem no site (não neste app): o item abre o site.
  site?: string;
};

export const MENU_LANCAMENTOS: ItemMenu[] = [
  { rota: "/lancamentos/vendas", titulo: "Entradas", subtitulo: "Vendas / Faturamento", origem: "vendas", sinal: "+" },
  { rota: "/lancamentos/despesas", site: "/#/saidas-despesas/lancamentos", titulo: "Saídas", subtitulo: "Despesas / Custos", origem: "despesas", sinal: "−" },
  { rota: "/lancamentos/mercadorias", site: "/#/saidas-mercadorias/lancamentos", titulo: "Saídas", subtitulo: "Mercadorias / CMV", origem: "mercadorias", sinal: "−" },
  { rota: "/lancamentos/retiradas", site: "/#/saidas-retiradas/lancamentos", titulo: "Saídas", subtitulo: "Retiradas / Investimentos", origem: "retiradas", sinal: "−" }
];
