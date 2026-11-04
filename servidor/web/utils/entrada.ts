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

// "1.234,56" → "1234.56"; "" → null. Recusa o que não é número.
export function dinheiroParaApi(texto: string | null | undefined): string | null {
  const limpo = (texto ?? "").replace(/^R\$\s*/, "").trim();
  if (!limpo) return null;
  const normalizado = limpo.replace(/\./g, "").replace(",", ".");
  return /^\d+(\.\d{1,4})?$/.test(normalizado) ? normalizado : null;
}

// "1234.5" → "1.234,50" (para preencher o campo ao editar).
export function apiParaDinheiro(valor: string | null | undefined) {
  if (valor === null || valor === undefined || valor === "") return "";
  const n = Number(valor);
  return Number.isFinite(n) ? n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : "";
}
