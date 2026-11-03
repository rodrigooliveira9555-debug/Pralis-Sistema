// Conversões dos valores que as telas gravam (strings da tela, "" para vazio) para os tipos do
// banco. Qualquer valor que não dá para converter vira ErroProjecao com a localização exata, para a
// mensagem chegar a quem corrige na tela.

export class ErroProjecao extends Error {}

type Externo = unknown;

export function objeto(valor: Externo, onde: string): Record<string, unknown> {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new ErroProjecao(`${onde}: formato inesperado`);
  return valor as Record<string, unknown>;
}

export function lista(valor: Externo, onde: string): unknown[] {
  if (valor === undefined || valor === null) return [];
  if (!Array.isArray(valor)) throw new ErroProjecao(`${onde}: era esperada uma lista`);
  return valor;
}

export function texto(valor: Externo): string | null {
  if (valor === undefined || valor === null) return null;
  const limpo = String(valor).trim();
  return limpo ? limpo : null;
}

export function textoObrigatorio(valor: Externo, onde: string): string {
  const limpo = texto(valor);
  if (!limpo) throw new ErroProjecao(`${onde}: campo obrigatório vazio`);
  return limpo;
}

// A tela usa "Selecione" como opção vazia em alguns selects.
export function opcao(valor: Externo): string | null {
  const limpo = texto(valor);
  return limpo && limpo !== "Selecione" ? limpo : null;
}

// Só aceita o formato que a tela grava: dígitos com ponto decimal ("1.99", "30"). Recusa vírgula,
// exponencial ("1e3"), hexadecimal ("0x10") e espaços no meio: nada de adivinhar o que a pessoa quis.
const DECIMAL = /^-?\d+(\.\d+)?$/;

function decimalTexto(valor: Externo, onde: string): string | null {
  if (typeof valor === "number") {
    if (!Number.isFinite(valor)) throw new ErroProjecao(`${onde}: número inválido`);
    return String(valor);
  }
  const limpo = texto(valor);
  if (limpo === null) return null;
  if (!DECIMAL.test(limpo)) throw new ErroProjecao(`${onde}: "${limpo}" não é um número no formato da tela`);
  return limpo;
}

export function numero(valor: Externo, onde: string): number | null {
  const textoDecimal = decimalTexto(valor, onde);
  return textoDecimal === null ? null : Number(textoDecimal);
}

export function inteiro(valor: Externo, onde: string): number | null {
  const n = numero(valor, onde);
  if (n === null) return null;
  if (!Number.isSafeInteger(n) || Math.abs(n) > 2_147_483_647) {
    throw new ErroProjecao(`${onde}: "${n}" não é um número inteiro aceito`);
  }
  return n;
}

// Decimal exato com no máximo `casas` casas, devolvido como TEXTO para a coluna numeric: nunca passa
// por float nem é arredondado. Mais casas do que o banco guarda = recusa com a localização.
export function decimalExato(valor: Externo, onde: string, casas: number, limites: { min?: number; max?: number } = {}): string | null {
  const textoDecimal = decimalTexto(valor, onde);
  if (textoDecimal === null) return null;
  const [inteiros = "0", fracao = ""] = textoDecimal.replace("-", "").split(".");
  // Número vindo como number pode chegar em notação exponencial (ex.: 1e-7).
  if (!/^\d+$/.test(inteiros) || (fracao && !/^\d+$/.test(fracao))) {
    throw new ErroProjecao(`${onde}: "${textoDecimal}" não é um número no formato da tela`);
  }
  if (fracao.replace(/0+$/, "").length > casas) {
    throw new ErroProjecao(`${onde}: "${textoDecimal}" tem mais de ${casas} casas decimais`);
  }
  const n = Number(textoDecimal);
  if (limites.min !== undefined && n < limites.min) throw new ErroProjecao(`${onde}: ${textoDecimal} abaixo de ${limites.min}`);
  if (limites.max !== undefined && n > limites.max) throw new ErroProjecao(`${onde}: ${textoDecimal} acima de ${limites.max}`);
  return textoDecimal;
}

// Pontos percentuais com até 4 casas, como a tela aceita (step 0,0001), de 0 a 100.
export function percentual(valor: Externo, onde: string): string | null {
  return decimalExato(valor, onde, 4, { min: 0, max: 100 });
}

export function dataIso(valor: Externo, onde: string): string | null {
  const limpo = texto(valor);
  if (limpo === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(limpo) || Number.isNaN(Date.parse(`${limpo}T00:00:00Z`))) {
    throw new ErroProjecao(`${onde}: data "${limpo}" inválida`);
  }
  return limpo;
}

export function dataObrigatoria(valor: Externo, onde: string): string {
  const data = dataIso(valor, onde);
  if (!data) throw new ErroProjecao(`${onde}: data obrigatória vazia`);
  return data;
}

export function booleano(valor: Externo, padrao: boolean): boolean {
  return typeof valor === "boolean" ? valor : padrao;
}
