import { eq } from "drizzle-orm";
import { sessaoAutenticacao, sessoesAtividade } from "@cicluz/db/schema";
import type { PerfilSessao } from "@cicluz/shared";
import { limiteParado } from "../agenda/rotina.regras.ts";
import { banco } from "../banco/conexao.ts";
import { ErroDominio, naoAutenticado } from "../erros.ts";

// Sair por tempo parado no servidor (0009, P-46 item 4, Zé 24/11/2026): vale para o sistema todo, com o tempo de
// cada pessoa (Configurações da Agenda; padrão 15 min). A tela já sai sozinha; aqui o servidor garante o mesmo
// quando a aba foi fechada ou o aparelho ficou largado: a sessão parada além do tempo é encerrada.
//
// O que conta como "mexeu": todo pedido, menos os que a tela marca como automáticos (cabeçalho
// X-Cicluz-Automatico: 1 — a atualização da Agenda a cada 30 s, a contagem do chat). Assim uma tela nova que
// esqueça a marca só deixa a sessão viva por mais tempo; nunca derruba quem está usando.

/** Não regrava a cada pedido: uma escrita a cada 30 s basta para um limite em minutos. */
const INTERVALO_GRAVACAO_MS = 30_000;
/**
 * Folga do servidor sobre o tempo da pessoa: a tela avisa "mexeu" no máximo a cada minuto e o servidor regrava a
 * cada 30 s, então o último toque conhecido aqui pode estar até ~90 s atrás do da tela. A tela sai no tempo exato;
 * o servidor só derruba depois do tempo + 2 min (quem está usando nunca cai antes da própria tela).
 */
const FOLGA_MS = 2 * 60_000;

export const sessaoParada = (minutos: number) =>
  new ErroDominio(`Você saiu do sistema por ficar ${minutos} minutos sem mexer. Entre de novo.`, 401, "SESSAO_PARADA");

export async function conferirAtividade(sessaoId: string, perfil: PerfilSessao, automatico: boolean, agora = new Date()) {
  const [linha] = await banco.select().from(sessoesAtividade).where(eq(sessoesAtividade.sessaoId, sessaoId)).limit(1);
  if (linha) {
    const minutos = await limiteParado(banco, perfil.empresa.id, perfil.usuarioId);
    if (minutos !== null && agora.getTime() - linha.ultimaInteracaoEm.getTime() > minutos * 60_000 + FOLGA_MS) {
      // Apaga a sessão (a linha de atividade vai junto, em cascata): o cookie deixa de valer em todo pedido.
      await banco.delete(sessaoAutenticacao).where(eq(sessaoAutenticacao.id, sessaoId));
      throw sessaoParada(minutos);
    }
    if (automatico || agora.getTime() - linha.ultimaInteracaoEm.getTime() < INTERVALO_GRAVACAO_MS) return;
  }
  // Primeiro pedido da sessão (ou de antes desta regra) começa a contar agora. Se a sessão acabou de ser apagada
  // (saiu em outra aba, ou outro pedido a encerrou), a chave estrangeira recusa: é sessão vencida, não erro 500.
  try {
    await banco
      .insert(sessoesAtividade)
      .values({ sessaoId, ultimaInteracaoEm: agora })
      .onConflictDoUpdate({ target: sessoesAtividade.sessaoId, set: { ultimaInteracaoEm: agora } });
  } catch (e) {
    const pg = ((e as { cause?: unknown })?.cause ?? e) as { code?: string };
    if (pg?.code === "23503") throw naoAutenticado();
    throw e;
  }
}
