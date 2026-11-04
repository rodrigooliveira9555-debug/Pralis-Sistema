import { paraCentavos, type CategoriaLancamento } from "@cicluz/shared";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// Reais (texto do banco "123.45" ou número) → "R$ 123,45". A conta é em centavos.
export function formatarMoeda(valor: string | number | null | undefined) {
  return moeda.format(paraCentavos(valor ?? 0) / 100);
}

export function formatarCentavos(centavos: number) {
  return moeda.format(centavos / 100);
}

// "2026-11-03" → "03/11/26", o mesmo formato DD/MM/AA do site.
export function formatarData(data: string | null | undefined) {
  if (!data) return "—";
  const [ano, mes, dia] = data.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano?.slice(2)}`;
}

export type InfoCategoria = { titulo: string; subtitulo: string; origem: CategoriaLancamento };

export const CATEGORIAS: Record<CategoriaLancamento, InfoCategoria> = {
  despesas: { titulo: "Despesas", subtitulo: "Saídas / Despesas e custos", origem: "despesas" },
  mercadorias: { titulo: "Mercadorias", subtitulo: "Saídas / Mercadorias e CMV", origem: "mercadorias" },
  retiradas: { titulo: "Retiradas", subtitulo: "Saídas / Retiradas e investimentos", origem: "retiradas" }
};
