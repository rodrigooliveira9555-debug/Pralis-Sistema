// Conversões dos campos da tela, no padrão do site do Rodrigo (dist/date-fields.js e
// dist/field-validation.js): data digitada DD/MM/AA e guardada ISO; dinheiro digitado em formato
// brasileiro e enviado em reais com ponto.

// "031126" ou "03/11/26" → "03/11/26" (barras automáticas, 8 caracteres).
export function mascararData(texto: string) {
  const digitos = texto.replace(/\D/g, "").slice(0, 6);
  return [digitos.slice(0, 2), digitos.slice(2, 4), digitos.slice(4, 6)].filter(Boolean).join("/");
}

// "03/11/26" → "2026-11-03". Século: 00–49 = 2000–2049, 50–99 = 1950–1999 (regra do site).
// Data impossível (31/02) → null.
export function dataParaIso(texto: string): string | null {
  const partes = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(texto.trim());
  if (!partes) return null;
  const [, dia = "", mes = "", ano2 = ""] = partes;
  const ano = Number(ano2) <= 49 ? 2000 + Number(ano2) : 1900 + Number(ano2);
  const iso = `${ano}-${mes}-${dia}`;
  const data = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== iso) return null;
  return iso;
}

export function isoParaTela(iso: string | null | undefined) {
  if (!iso) return "";
  const [ano = "", mes = "", dia = ""] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano.slice(2)}`;
}

// Número digitado → texto com ponto para a API, sem adivinhar:
// - com vírgula, ela é a casa decimal e os pontos são milhar: "1.234,56" → "1234.56";
// - sem vírgula, pontos em grupos de 3 dígitos são milhar: "1.234" → "1234", "1.234.567" → "1234567";
// - sem vírgula, um ponto seguido de 1 ou 2 dígitos só pode ser decimal (milhar tem 3): "12.50" →
//   "12.50" (teclados que mostram ponto como separador decimal);
// - mais casas do que o campo aceita, ou qualquer outra coisa → null (o campo mostra o erro).
export function numeroParaApi(texto: string | null | undefined, casas: number): string | null {
  const limpo = (texto ?? "").replace(/^R\$\s*/, "").replace(/\s/g, "");
  if (!limpo) return null;
  let normalizado: string;
  if (limpo.includes(",")) {
    if (!/^\d{1,3}(\.\d{3})*,\d+$|^\d+,\d+$/.test(limpo)) return null;
    normalizado = limpo.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) {
    normalizado = limpo.replace(/\./g, "");
  } else {
    normalizado = limpo;
  }
  const [, decimais = ""] = normalizado.split(".");
  if (!/^\d+(\.\d+)?$/.test(normalizado) || decimais.length > casas) return null;
  return normalizado;
}

// Dinheiro em R$: no máximo 2 casas (centavos).
export function dinheiroParaApi(texto: string | null | undefined): string | null {
  return numeroParaApi(texto, 2);
}

// Campo preenchido mas inválido (para mostrar o erro no campo, em vez de mandar valor errado).
export function campoInvalido(texto: string | null | undefined, casas: number) {
  return Boolean((texto ?? "").trim()) && numeroParaApi(texto, casas) === null;
}

// "1234.5" → "1.234,50" (para preencher o campo ao editar).
export function apiParaDinheiro(valor: string | null | undefined) {
  if (valor === null || valor === undefined || valor === "") return "";
  const n = Number(valor);
  return Number.isFinite(n) ? n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : "";
}
