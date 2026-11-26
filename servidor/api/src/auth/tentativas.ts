// Contador de tentativas de senha, na memória do processo (um servidor só nesta fase).
//
// Antes (B5 do plano de 26/11/2026): ao passar de 10 mil chaves o mapa INTEIRO era apagado. Mandar
// 10 mil e-mails inventados zerava o bloqueio de todas as contas, e a senha podia ser testada sem
// limite. Agora, ao encher: primeiro saem as janelas vencidas; se ainda faltar espaço, saem as mais
// antigas que NÃO estão bloqueadas. Conta bloqueada nunca é esquecida antes de a janela vencer.

export type OpcoesTentativas = { janelaMs: number; maximo: number; capacidade: number };

type Registro = { quantidade: number; inicio: number };

export class ContadorTentativas {
  private readonly registros = new Map<string, Registro>();

  constructor(private readonly opcoes: OpcoesTentativas) {}

  // Conta mais uma tentativa e diz se passou do teto. Chave nula = nada a contar.
  esgotou(chave: string | null, agora = Date.now()): boolean {
    if (!chave) return false;
    const registro = this.registros.get(chave);
    if (!registro || agora - registro.inicio > this.opcoes.janelaMs) {
      if (registro) this.registros.delete(chave);
      this.abrirEspaco(agora);
      this.registros.set(chave, { quantidade: 1, inicio: agora });
      return false;
    }
    registro.quantidade += 1;
    return registro.quantidade > this.opcoes.maximo;
  }

  get tamanho(): number {
    return this.registros.size;
  }

  private bloqueado(registro: Registro, agora: number): boolean {
    return registro.quantidade >= this.opcoes.maximo && agora - registro.inicio <= this.opcoes.janelaMs;
  }

  private abrirEspaco(agora: number) {
    if (this.registros.size < this.opcoes.capacidade) return;
    for (const [chave, registro] of this.registros) {
      if (agora - registro.inicio > this.opcoes.janelaMs) this.registros.delete(chave);
    }
    // O Map guarda a ordem de inserção: os primeiros são os mais antigos.
    for (const [chave, registro] of this.registros) {
      if (this.registros.size < this.opcoes.capacidade) return;
      if (!this.bloqueado(registro, agora)) this.registros.delete(chave);
    }
  }
}
