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

export function numero(valor: Externo, onde: string): number | null {
  const limpo = texto(valor);
  if (limpo === null) return null;
  const n = Number(limpo.replace(",", "."));
  if (!Number.isFinite(n)) throw new ErroProjecao(`${onde}: "${limpo}" não é um número`);
  return n;
}

export function inteiro(valor: Externo, onde: string): number | null {
  const n = numero(valor, onde);
  if (n === null) return null;
  if (!Number.isInteger(n)) throw new ErroProjecao(`${onde}: "${n}" não é um número inteiro`);
  return n;
}

// Pontos percentuais com até 4 casas, como a tela aceita (step 0,0001). Volta como texto exato para
// a coluna numeric, sem passar por float no banco.
export function percentual(valor: Externo, onde: string): string | null {
  const n = numero(valor, onde);
  if (n === null) return null;
  if (n < 0 || n > 100) throw new ErroProjecao(`${onde}: ${n}% fora de 0 a 100`);
  return n.toFixed(4);
}

// A tela grava reais em texto ("1.5" = R$ 1,50). O banco guarda centavos inteiros.
export function centavos(valor: Externo, onde: string): number | null {
  const n = numero(valor, onde);
  if (n === null) return null;
  if (n < 0) throw new ErroProjecao(`${onde}: valor negativo`);
  return Math.round(n * 100);
}

// Valor em formato brasileiro, com ou sem "R$" ("1.668,00", "R$ 1.234,56") → centavos.
export function centavosBr(valor: Externo, onde: string): number | null {
  const limpo = texto(valor);
  if (limpo === null) return null;
  const numeroBr = limpo.replace(/^R\$\s*/, "").replace(/\./g, "").replace(",", ".");
  const n = Number(numeroBr);
  if (!Number.isFinite(n)) throw new ErroProjecao(`${onde}: valor "${limpo}" inválido`);
  if (n < 0) throw new ErroProjecao(`${onde}: valor negativo`);
  return Math.round(n * 100);
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
