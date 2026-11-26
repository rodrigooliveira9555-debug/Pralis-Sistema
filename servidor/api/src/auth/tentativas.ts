// Contador de tentativas de senha, na memória do processo (um servidor só nesta fase).
//
// Antes (B5 do plano de 26/11/2026): ao passar de 10 mil chaves o mapa INTEIRO era apagado. Mandar
// 10 mil e-mails inventados zerava o bloqueio de todas as contas, e a senha podia ser testada sem
// limite. Agora, ao encher: primeiro saem as janelas vencidas; se ainda faltar espaço, saem as que
// têm MENOS tentativas (1, depois 2...), mais antigas primeiro. Uma conta perto do bloqueio fica por
// último, e conta bloqueada só sai se o mapa passar do teto rígido (2x a capacidade), que só um
// ataque enorme alcança; aí sai a mais antiga, para a memória não crescer sem fim.

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

  private abrirEspaco(agora: number) {
    const { capacidade, maximo, janelaMs } = this.opcoes;
    if (this.registros.size < capacidade) return;
    // O Map guarda a ordem de inserção, que é a ordem de início (uma janela nova é apagada e
    // reinserida no fim): os vencidos estão todos no começo.
    for (const [chave, registro] of this.registros) {
      if (agora - registro.inicio <= janelaMs) break;
      this.registros.delete(chave);
    }
    for (let teto = 1; teto < maximo && this.registros.size >= capacidade; teto += 1) {
      for (const [chave, registro] of this.registros) {
        if (this.registros.size < capacidade) return;
        if (registro.quantidade <= teto) this.registros.delete(chave);
      }
    }
    for (const chave of this.registros.keys()) {
      if (this.registros.size < capacidade * 2) return;
      this.registros.delete(chave);
    }
  }
}
