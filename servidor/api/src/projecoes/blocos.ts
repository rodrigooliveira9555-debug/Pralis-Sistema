// INSERT de várias linhas tem teto de 65.535 parâmetros no Postgres. Em blocos de 500 linhas, nenhuma
// tabela daqui passa do teto, e uma lista grande não congela o assunto em "falha".
export const TAMANHO_BLOCO = 500;

export async function emBlocos<T>(linhas: T[], gravar: (bloco: T[]) => Promise<unknown>) {
  for (let i = 0; i < linhas.length; i += TAMANHO_BLOCO) await gravar(linhas.slice(i, i + TAMANHO_BLOCO));
}
