// Cor de origem de cada área (DESIGN_SYSTEM do site) e as variantes que passam no contraste WCAG AA:
// - forte: fundo de cabeçalho, círculo do menu e botão preenchido, com texto BRANCO (≥ 4,5:1);
// - clara: texto, contorno e foco sobre a superfície escura do tema Sombra (≥ 4,5:1 sobre #222128).
// O tom original (ex.: #eab308) continua sendo a identidade; o forte é a mesma cor escurecida, porque
// branco sobre o amarelo/verde originais dá 1,9:1 / 2,3:1 (registrado no DESIGN_SYSTEM, 03/11/2026).
export type Origem = "vendas" | "despesas" | "mercadorias" | "retiradas" | "formularios";

type Tons = { original: string; forte: string; forteRgb: string; claraRgb: string };

export const CORES: Record<Origem, Tons> = {
  vendas: { original: "#eab308", forte: "#a16207", forteRgb: "161,98,7", claraRgb: "234,179,8" },
  despesas: { original: "#ef4444", forte: "#dc2626", forteRgb: "220,38,38", claraRgb: "248,113,113" },
  mercadorias: { original: "#22c55e", forte: "#15803d", forteRgb: "21,128,61", claraRgb: "74,222,128" },
  retiradas: { original: "#2563eb", forte: "#2563eb", forteRgb: "37,99,235", claraRgb: "96,165,250" },
  formularios: { original: "#7c3aed", forte: "#7c3aed", forteRgb: "124,58,237", claraRgb: "177,151,252" }
};

// Estilo da tela/janela: cabeçalho no tom forte e a cor "primary" do Vuetify trocada pela da origem
// (nada de roxo fixo numa tela amarela — regra do site). No Sombra, o primary vira o tom claro.
export function estiloDaOrigem(origem: Origem, escuro: boolean) {
  const tons = CORES[origem];
  return {
    "--cor-origem": tons.forte,
    "--cor-origem-texto": escuro ? `rgb(${tons.claraRgb})` : tons.forte,
    // O Vuetify redeclara --v-theme-* em cada componente (classe v-theme--…); por isso a troca é
    // feita por estas variáveis, aplicadas aos componentes dentro da tela em assets/cicluz.css.
    "--origem-primary": escuro ? tons.claraRgb : tons.forteRgb,
    "--origem-on-primary": escuro ? "34,33,40" : "255,255,255"
  };
}
