import { eq } from "drizzle-orm";
import { agendaTelasIcone } from "@cicluz/db/schema";
import type { PerfilSessao } from "@cicluz/shared";
import { banco } from "../banco/conexao.ts";
import { proibido } from "../erros.ts";
import * as repo from "./compromissos.repository.ts";
import { concluir, naoTransferida, respostaDe } from "./compromissos.service.ts";
import { horaLocal } from "./rotina.regras.ts";

// Ações programadas por tela (0012, P-53, áudio do Rodrigo de 25/11/2026; Zé: "se a pessoa apenas entrar na tela e
// excluir os produtos, o sistema tem que entender que a tarefa foi feita").
// - A tarefa (compromisso ligado a uma tela) guarda a ação que conta e a quantidade.
// - A tela avisa cada ação feita; o servidor soma na repetição pendente (a data do compromisso) e, ao chegar na
//   quantidade, conclui a tarefa (a repetição avança, como no "concluir" normal).
// - Conta para quem pode concluir a tarefa (responsável ou gestor); ação feita antes do dia da tarefa não conta.
// - Em quais telas o ícone roxo aparece: o administrador decide (só as exceções ficam gravadas).

export type ResultadoAcao = { id: string; feitas: number; quantidade: number; concluiu: boolean };

export async function acaoFeita(perfil: PerfilSessao, acao: string, n: number, momento = new Date()): Promise<ResultadoAcao[]> {
  const empresaId = perfil.empresa.id;
  if (!(await repo.estado(banco, empresaId))) return [];
  const hoje = horaLocal(momento).data;
  const saida: ResultadoAcao[] = [];
  for (const c of await repo.abertosComAcao(banco, empresaId, acao)) {
    // Ainda não chegou o dia desta repetição (ou da tarefa): não conta.
    if (c.data && c.data > hoje) continue;
    const r = await respostaDe(banco, perfil, c);
    if (!r.acesso.ver || !r.acesso.concluir) continue;
    const ocorrencia = c.data ?? c.criadoEm.toISOString().slice(0, 10);
    const quantidade = c.acaoQuantidade ?? 1;
    // Sobe a versão da Agenda junto: os outros aparelhos veem o progresso na próxima atualização.
    const feitas = await banco.transaction(async (tx) => { await repo.subirVersao(tx, empresaId); return repo.somarProgresso(tx, empresaId, c.id, ocorrencia, n); });
    let concluiu = false;
    if (feitas >= quantidade) {
      const fim = await concluir(perfil, c.id, c.repeticaoTipo && c.data ? { concluida: true, ocorrencia: c.data } : { concluida: true }, { semExpediente: true });
      concluiu = fim.resultado === "concluiu" || fim.resultado === "repetiu";
    }
    saida.push({ id: c.id, feitas, quantidade, concluiu });
  }
  return saida;
}

/* ---------- Telas em que o ícone de agendar aparece ---------- */

/** As exceções gravadas (tela → mostrar). Sem linha, vale o padrão que a tela conhece. */
export async function telasIcone(perfil: PerfilSessao) {
  const linhas = await banco.select().from(agendaTelasIcone).where(eq(agendaTelasIcone.empresaId, perfil.empresa.id));
  return Object.fromEntries(linhas.map((l) => [l.tela, l.mostrar]));
}

export async function definirTelaIcone(perfil: PerfilSessao, tela: string, mostrar: boolean) {
  if (perfil.papel !== "administrador") throw proibido("Só o administrador escolhe as telas do ícone de agendar.", "ADMIN_ONLY");
  if (!(await repo.estado(banco, perfil.empresa.id))) throw naoTransferida();
  await banco
    .insert(agendaTelasIcone)
    .values({ empresaId: perfil.empresa.id, tela, mostrar, atualizadoPor: perfil.usuarioId })
    .onConflictDoUpdate({ target: [agendaTelasIcone.empresaId, agendaTelasIcone.tela], set: { mostrar, atualizadoEm: new Date(), atualizadoPor: perfil.usuarioId } });
  return { tela, mostrar };
}
