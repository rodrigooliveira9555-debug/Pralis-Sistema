import { eq } from "drizzle-orm";
import { sessaoAutenticacao, sessoesAtividade } from "@cicluz/db/schema";
import type { PerfilSessao } from "@cicluz/shared";
import { inatividadeEfetiva, lerConfig } from "../agenda/rotina.regras.ts";
import { banco } from "../banco/conexao.ts";
import { ErroDominio } from "../erros.ts";

// Sair por tempo parado no servidor (0009, P-46 item 4, Zé 24/11/2026): vale para o sistema todo, com o tempo de
// cada pessoa (Configurações da Agenda; padrão 15 min). A tela já sai sozinha; aqui o servidor garante o mesmo
// quando a aba foi fechada ou o aparelho ficou largado: a sessão parada além do tempo é encerrada.
//
// O que conta como "mexeu": todo pedido, menos os que a tela marca como automáticos (cabeçalho
// X-Cicluz-Automatico: 1 — a atualização da Agenda a cada 30 s, a contagem do chat). Assim uma tela nova que
// esqueça a marca só deixa a sessão viva por mais tempo; nunca derruba quem está usando.

/** Não regrava a cada pedido: uma escrita a cada 30 s basta para um limite em minutos. */
const INTERVALO_GRAVACAO_MS = 30_000;

export const sessaoParada = (minutos: number) =>
  new ErroDominio(`Você saiu do sistema por ficar ${minutos} minutos sem mexer. Entre de novo.`, 401, "SESSAO_PARADA");

export async function conferirAtividade(sessaoId: string, perfil: PerfilSessao, automatico: boolean, agora = new Date()) {
  const [linha] = await banco.select().from(sessoesAtividade).where(eq(sessoesAtividade.sessaoId, sessaoId)).limit(1);
  if (linha) {
    const minutos = inatividadeEfetiva(await lerConfig(banco, perfil.empresa.id, perfil.usuarioId));
    if (agora.getTime() - linha.ultimaInteracaoEm.getTime() > minutos * 60_000) {
      // Apaga a sessão (a linha de atividade vai junto, em cascata): o cookie deixa de valer em todo pedido.
      await banco.delete(sessaoAutenticacao).where(eq(sessaoAutenticacao.id, sessaoId));
      throw sessaoParada(minutos);
    }
    if (automatico || agora.getTime() - linha.ultimaInteracaoEm.getTime() < INTERVALO_GRAVACAO_MS) return;
  }
  // Primeiro pedido da sessão (ou de antes desta regra) começa a contar agora.
  await banco
    .insert(sessoesAtividade)
    .values({ sessaoId, ultimaInteracaoEm: agora })
    .onConflictDoUpdate({ target: sessoesAtividade.sessaoId, set: { ultimaInteracaoEm: agora } });
}
