import type { Origem } from "~/utils/cores";

// Menu do app: só as telas que já existem aqui. As telas antigas (cadastros) continuam no site e
// são abertas pelo item "Configuração", sem duplicar nenhuma.
export type ItemMenu = {
  rota: string;
  titulo: string;
  subtitulo: string;
  origem: Origem;
  sinal: "+" | "−";
};

export const MENU_LANCAMENTOS: ItemMenu[] = [
  { rota: "/lancamentos/vendas", titulo: "Entradas", subtitulo: "Vendas / Faturamento", origem: "vendas", sinal: "+" },
  { rota: "/lancamentos/despesas", titulo: "Saídas", subtitulo: "Despesas / Custos", origem: "despesas", sinal: "−" },
  { rota: "/lancamentos/mercadorias", titulo: "Saídas", subtitulo: "Mercadorias / CMV", origem: "mercadorias", sinal: "−" },
  { rota: "/lancamentos/retiradas", titulo: "Saídas", subtitulo: "Retiradas / Investimentos", origem: "retiradas", sinal: "−" }
];

// Caixa (CASCA de demonstração, sem API): mesmo fluxo do Caixa do sistema principal, na cor de
// Vendas porque no menu do site o Caixa fica em Entradas · Vendas / Faturamento.
export type ItemMenuCaixa = { rota: string; titulo: string; subtitulo: string; icone: "caixa" | "acompanhamento" };

export const MENU_CAIXA: ItemMenuCaixa[] = [
  { rota: "/caixa", titulo: "Meu caixa", subtitulo: "Abertura / Turno / Fechamento", icone: "caixa" },
  { rota: "/caixa/acompanhamento", titulo: "Caixas", subtitulo: "Gerência / Tesouraria", icone: "acompanhamento" }
];
