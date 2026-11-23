import { AgendaRegras as R, type AvaliacaoEnvio, type PerfilSessao, type RelacaoAgendaResposta, type RelacaoCriacao } from "@cicluz/shared";
import { violouUnico } from "../acessos/acessos.service.ts";
import type { TransacaoBanco } from "../banco/conexao.ts";
import { conflito, ErroDominio, proibido } from "../erros.ts";
import * as repo from "./compromissos.repository.ts";
import * as gr from "./grupos.repository.ts";
import { carregar, gravar, invalido, notaDe, paraRegra, respostaDe } from "./compromissos.service.ts";

// O que se faz EM um compromisso além de editar: avaliar, adiar o alerta (só para si) e ligar no mapa mental.

/* ---------- Avaliação (registrada não muda: não existe rota de alterar nem de apagar) ---------- */

const jaRegistrada = () => conflito("Avaliação já registrada; ela não muda.", "AGENDA_AVALIACAO_REGISTRADA");

export async function avaliar(perfil: PerfilSessao, id: string, e: AvaliacaoEnvio) {
  const empresaId = perfil.empresa.id;
  try {
    return await gravar(perfil, async (tx) => {
      const { c, pessoas } = await carregar(tx, perfil, id, "ver");
      const notas = await repo.avaliacoesDe(tx, empresaId, [id]);
      const pode = R.podeAvaliar(paraRegra(c, pessoas, notas.map(notaDe)), perfil.usuarioId, e.avaliadoId);
      if ("erro" in pode) {
        if (pode.erro === "Avaliação já registrada; ela não muda.") throw jaRegistrada();
        if (pode.erro === "Só o gestor e o próprio responsável avaliam.") throw proibido(pode.erro, "AGENDA_SEM_ACESSO");
        throw invalido(pode.erro);
      }
      if (!R.valorValido(c.avaliacaoTipo, e.valor)) throw invalido("Escolha a nota.");
      await gr.inserirAvaliacao(tx, {
        empresaId, compromissoId: id, avaliadoId: e.avaliadoId, porId: perfil.usuarioId, papel: pode.papel, tipo: c.avaliacaoTipo,
        valor: e.valor, comentario: e.comentario
      });
      return respostaDe(tx, perfil, c);
    });
  } catch (erro) {
    // Duas notas iguais ao mesmo tempo: o índice único segura a segunda.
    if (violouUnico(erro, "agenda_avaliacoes_uq")) throw jaRegistrada();
    throw erro;
  }
}

/* ---------- Soneca: vale só para quem adiou (pergunta 6, proposta padrão) ---------- */

export async function adiar(perfil: PerfilSessao, id: string, ate: string) {
  return gravar(perfil, async (tx) => {
    const { c } = await carregar(tx, perfil, id, "ver");
    await gr.gravarAdiamento(tx, perfil.empresa.id, id, perfil.usuarioId, new Date(ate));
    return respostaDe(tx, perfil, c);
  });
}

export async function tirarAdiamento(perfil: PerfilSessao, id: string) {
  return gravar(perfil, async (tx) => {
    const { c } = await carregar(tx, perfil, id, "ver");
    await gr.tirarAdiamento(tx, perfil.empresa.id, id, perfil.usuarioId);
    return respostaDe(tx, perfil, c);
  });
}

/* ---------- Ligações do mapa mental: "editar" na ponta de, "ver" na ponta para ---------- */

const ligacaoNaoEncontrada = () => new ErroDominio("Ligação não encontrada.", 404, "AGENDA_LIGACAO_NAO_ENCONTRADA");

export async function criarRelacao(perfil: PerfilSessao, e: RelacaoCriacao): Promise<RelacaoAgendaResposta> {
  if (e.de === e.para) throw invalido("Escolha dois compromissos diferentes.");
  const empresaId = perfil.empresa.id;
  try {
    return await gravar(perfil, async (tx) => {
      await carregar(tx, perfil, e.de, "editar");
      await carregar(tx, perfil, e.para, "ver");
      const existente = await gr.relacao(tx, empresaId, e.id);
      if (existente) {
        if (existente.deId === e.de && existente.paraId === e.para) return { id: existente.id, de: existente.deId, para: existente.paraId, rotulo: existente.rotulo };
        throw conflito("Este identificador já foi usado. Recarregue a Agenda e tente de novo.", "AGENDA_ID_EM_USO");
      }
      await gr.inserirRelacao(tx, { empresaId, id: e.id, deId: e.de, paraId: e.para, rotulo: e.rotulo, criadoPor: perfil.usuarioId, atualizadoPor: perfil.usuarioId });
      return { id: e.id, de: e.de, para: e.para, rotulo: e.rotulo };
    });
  } catch (erro) {
    if (violouUnico(erro, "agenda_relacoes_par_uq")) throw conflito("Esses compromissos já estão ligados.", "AGENDA_JA_LIGADOS");
    throw erro;
  }
}

async function relacaoEditavel(tx: TransacaoBanco, perfil: PerfilSessao, id: string) {
  const r = await gr.relacao(tx, perfil.empresa.id, id);
  if (!r) throw ligacaoNaoEncontrada();
  await carregar(tx, perfil, r.deId, "editar");
  return r;
}

export async function rotularRelacao(perfil: PerfilSessao, id: string, rotulo: string): Promise<RelacaoAgendaResposta> {
  return gravar(perfil, async (tx) => {
    const r = await relacaoEditavel(tx, perfil, id);
    await gr.rotularRelacao(tx, perfil.empresa.id, id, rotulo, perfil.usuarioId);
    return { id, de: r.deId, para: r.paraId, rotulo };
  });
}

export async function excluirRelacao(perfil: PerfilSessao, id: string) {
  await gravar(perfil, async (tx) => {
    await relacaoEditavel(tx, perfil, id);
    await gr.excluirRelacao(tx, perfil.empresa.id, id);
  });
}
