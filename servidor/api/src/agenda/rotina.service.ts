import type {
  ConfigPessoa,
  ConfigPessoaResposta,
  DesempenhoPessoa,
  DesempenhoResposta,
  MensagemResposta,
  MinhaConfigResposta,
  PerfilSessao,
  TarefaDeTela
} from "@cicluz/shared";
import { banco } from "../banco/conexao.ts";
import { ErroDominio, proibido } from "../erros.ts";
import * as repo from "./compromissos.repository.ts";
import { concluir, gravar, invalido, montar, naoEncontrado, naoTransferida, respostaDe } from "./compromissos.service.ts";
import * as gr from "./grupos.repository.ts";
import * as rr from "./rotina.repository.ts";
import { configDe, descreverExpediente, exigirExpediente, lerConfig, situacaoNoExpediente } from "./rotina.regras.ts";

// Rotina da Agenda (0008, P-45, áudios do Rodrigo de 23/11/2026):
// - Configurações da Agenda por pessoa: o administrador define o expediente, se a Agenda abre fora dele, se a
//   hora fora do expediente é registrada (como comum ou extra: só registro) e em quantos minutos parado o sistema sai.
// - Desempenho: no prazo, fora do prazo, não feitas, em aberto, tempo de resposta e hora fora do expediente.
// - Tarefa vinda de uma tela (agendamento de pedido…): cai na lista "Tarefas das telas", para quem a tela escolheu.
// - Chat do grupo: cada lista é um grupo; membro, dono e administrador conversam ali.

const admin = (perfil: PerfilSessao) => perfil.papel === "administrador";
const soAdministrador = () => proibido("Só o administrador mexe nas configurações da Agenda das pessoas.", "ADMIN_ONLY");

/* ---------- Configurações ---------- */

export async function listarConfigs(perfil: PerfilSessao): Promise<ConfigPessoaResposta[]> {
  if (!admin(perfil)) throw soAdministrador();
  const [pessoas, linhas] = await Promise.all([rr.contas(perfil.empresa.id), rr.configs(perfil.empresa.id)]);
  const por = new Map(linhas.map((l) => [l.usuarioId, l]));
  return pessoas.map((p) => {
    const l = por.get(p.id);
    return { usuarioId: p.id, nome: p.nome, ativo: p.ativo, ...configDe(l), atualizadoEm: l ? l.atualizadoEm.toISOString() : "" };
  });
}

export async function salvarConfig(perfil: PerfilSessao, usuarioId: string, c: ConfigPessoa): Promise<ConfigPessoaResposta> {
  if (!admin(perfil)) throw soAdministrador();
  const pessoa = (await rr.contas(perfil.empresa.id)).find((p) => p.id === usuarioId);
  if (!pessoa) throw new ErroDominio("Pessoa não encontrada nesta empresa.", 404, "PESSOA_NAO_ENCONTRADA");
  // Quem configura não se tranca para fora: o administrador não pode bloquear a própria Agenda.
  if (usuarioId === perfil.usuarioId && c.foraExpediente === "bloquear") throw invalido("Você não pode bloquear a sua própria Agenda fora do expediente.");
  const l = await rr.salvarConfig(perfil.empresa.id, usuarioId, c, perfil.usuarioId);
  return { usuarioId, nome: pessoa.nome, ativo: pessoa.ativo, ...configDe(l), atualizadoEm: l.atualizadoEm.toISOString() };
}

/** A regra da própria pessoa: a tela usa para avisar e para sair sozinha depois do tempo parado. */
export async function minhaConfig(perfil: PerfilSessao, momento = new Date()): Promise<MinhaConfigResposta> {
  const c = await lerConfig(banco, perfil.empresa.id, perfil.usuarioId);
  const s = situacaoNoExpediente(c, momento);
  const dentro = s.onde === "dentro" || s.onde === "sem-expediente";
  return { ...c, dentroDoExpediente: dentro, bloqueadaAgora: c.foraExpediente === "bloquear" && !dentro, descricaoExpediente: descreverExpediente(c) };
}

/* ---------- Desempenho ---------- */

/** Prazo de um compromisso: o dia dele, até o término (ou o início; sem hora = fim do dia), no horário da loja. */
function prazo(data: string, hora: string | null, horaFim: string | null) {
  const h = horaFim || hora || "23:59";
  // Brasil sem horário de verão: -03:00 o ano inteiro.
  return new Date(`${data}T${h}:59-03:00`);
}

export async function desempenho(perfil: PerfilSessao, de: string, ate: string, momento = new Date()): Promise<DesempenhoResposta> {
  if (!(await repo.estado(banco, perfil.empresa.id))) throw naoTransferida();
  const so = admin(perfil) ? null : perfil.usuarioId;
  const [pessoas, linhas, horas] = await Promise.all([
    rr.contas(perfil.empresa.id), rr.responsabilidades(perfil.empresa.id, de, ate, so), rr.horasForaPorDia(perfil.empresa.id, de, ate, so)
  ]);
  const vazio = (usuarioId: string, nome: string): DesempenhoPessoa => ({
    usuarioId, nome, recebidas: 0, noPrazo: 0, foraDoPrazo: 0, naoFeitas: 0, emAberto: 0, tempoMedioRespostaHoras: null, minutosForaExpediente: 0, diasForaSemExpediente: 0
  });
  const saida = new Map<string, DesempenhoPessoa>();
  const tempos = new Map<string, number[]>();
  for (const p of pessoas) if (!so || p.id === so) saida.set(p.id, vazio(p.id, p.nome));
  for (const l of linhas) {
    const d = saida.get(l.usuarioId);
    if (!d || !l.data) continue;
    d.recebidas += 1;
    const limite = prazo(l.data, l.hora, l.horaFim);
    if (l.concluida && l.concluidaEm) {
      if (l.concluidaEm <= limite) d.noPrazo += 1;
      else d.foraDoPrazo += 1;
      tempos.set(l.usuarioId, [...(tempos.get(l.usuarioId) ?? []), (l.concluidaEm.getTime() - l.criadoEm.getTime()) / 3_600_000]);
    } else if (limite < momento) d.naoFeitas += 1;
    else d.emAberto += 1;
  }
  for (const h of horas) {
    const d = saida.get(h.usuarioId);
    if (!d) continue;
    if (h.minutos !== null) d.minutosForaExpediente += Number(h.minutos);
    if (h.semExpediente) d.diasForaSemExpediente += 1;
  }
  for (const [id, t] of tempos) {
    const d = saida.get(id);
    if (d && t.length) d.tempoMedioRespostaHoras = Math.round((t.reduce((a, b) => a + b, 0) / t.length) * 10) / 10;
  }
  // Quem não tem nada no período fica de fora da lista do administrador (só polui); a própria pessoa sempre aparece.
  const lista = [...saida.values()].filter((d) => so || d.recebidas > 0 || d.minutosForaExpediente > 0 || d.diasForaSemExpediente > 0);
  return { de, ate, pessoas: lista };
}

/* ---------- Tarefa vinda de uma tela ---------- */

export const LISTA_TAREFAS_TELAS = "lista-tarefas-das-telas";

/** A lista "Tarefas das telas": criada na primeira tarefa, dona = administrador, membros = contas ativas. */
async function garantirListaDasTelas(tx: Parameters<Parameters<typeof gravar>[1]>[0], perfil: PerfilSessao) {
  const empresaId = perfil.empresa.id;
  const g = await repo.grupo(tx, empresaId, LISTA_TAREFAS_TELAS);
  if (g && !g.excluidoEm) return;
  if (g) throw invalido('A lista "Tarefas das telas" foi excluída. Peça ao administrador para recriá-la.');
  const dono = (await rr.administrador(tx, empresaId)) ?? perfil.usuarioId;
  const ordem = (await gr.maiorOrdemGrupo(tx, empresaId)) + 1;
  // Nome repetido (alguém já criou uma lista com esse nome): usa um nome que não colide.
  const nomes = new Set((await repo.gruposAtivos(empresaId)).map((x) => x.nome.trim().toLocaleLowerCase("pt-BR")));
  const nome = nomes.has("tarefas das telas") ? "Tarefas das telas (sistema)" : "Tarefas das telas";
  await gr.inserirGrupo(tx, { empresaId, id: LISTA_TAREFAS_TELAS, nome, cor: "#7c3aed", icone: "operacao", ordenacao: "data", ordem, donoId: dono, criadoPor: perfil.usuarioId, atualizadoPor: perfil.usuarioId });
  const ativas = (await rr.contas(empresaId)).filter((p) => p.ativo).map((p) => p.id);
  await gr.trocarMembros(tx, empresaId, LISTA_TAREFAS_TELAS, ativas, perfil.usuarioId);
}

/**
 * Cria a tarefa que a tela pediu, uma vez por referência. Gestor = quem estava na tela; responsáveis veem e
 * concluem. Pedir de novo (outro aparelho, a mesma tela aberta duas vezes) devolve a mesma tarefa.
 */
export async function criarTarefaDeTela(perfil: PerfilSessao, e: TarefaDeTela) {
  const empresaId = perfil.empresa.id;
  const ja = await rr.porVinculo(banco, empresaId, e.vinculoRef);
  if (ja) return { criado: false, compromisso: await respostaDe(banco, perfil, ja) };
  return gravar(perfil, async (tx) => {
    await garantirListaDasTelas(tx, perfil);
    const pessoas = [...new Set(e.responsaveis)].map((id) => ({ id, responsavel: true, ver: true, editar: false, concluir: true, excluir: false }));
    const contas = await repo.contasDaEmpresa(tx, empresaId, pessoas.map((p) => p.id));
    if (pessoas.some((p) => !contas.has(p.id))) throw invalido("Uma das pessoas da tarefa não é conta desta empresa.");
    const m = montar({
      grupoId: LISTA_TAREFAS_TELAS, titulo: e.titulo, notas: e.notas, url: "", local: "", localizacao: null,
      data: e.data, hora: e.hora, horaFim: "", repeticao: null, alerta: e.data && e.hora ? 0 : null, prioridade: "normal", sinalizado: false,
      etiquetas: [], subtarefas: [], pessoas, avaliacaoTipo: "", colunaId: "", vinculoTela: e.vinculoTela, vinculoTitulo: e.vinculoTitulo
    }, null);
    const ordem = (await repo.maiorOrdem(tx, empresaId, LISTA_TAREFAS_TELAS)) + 1;
    const criou = await repo.inserirCompromisso(tx, {
      ...m.linha, empresaId, id: e.id, vinculoRef: e.vinculoRef, gestorId: perfil.usuarioId, ordem: String(ordem), criadoPor: perfil.usuarioId, atualizadoPor: perfil.usuarioId
    });
    // Corrida com outro aparelho: a referência (ou o id) já entrou; devolve a que ficou.
    if (!criou) {
      const outra = (await rr.porVinculo(tx, empresaId, e.vinculoRef)) ?? (await repo.compromisso(tx, empresaId, e.id));
      if (!outra) throw invalido("Não foi possível criar a tarefa.");
      return { criado: false, compromisso: await respostaDe(tx, perfil, outra) };
    }
    await repo.trocarParticipantes(tx, empresaId, e.id, perfil.usuarioId, m.pessoas);
    return { criado: true, compromisso: await respostaDe(tx, perfil, (await repo.compromisso(tx, empresaId, e.id))!) };
  });
}

/** A tela fez o que a tarefa pedia (ex.: o pedido foi enviado): conclui a tarefa, se quem fez pode concluir. */
export async function concluirPorVinculo(perfil: PerfilSessao, vinculoRef: string) {
  const c = await rr.porVinculo(banco, perfil.empresa.id, vinculoRef);
  if (!c || c.excluidoEm) throw naoEncontrado();
  if (c.concluida) return { resultado: "sem-mudanca" as const, compromisso: await respostaDe(banco, perfil, c) };
  const r = await concluir(perfil, c.id, c.repeticaoTipo && c.data ? { concluida: true, ocorrencia: c.data } : { concluida: true });
  return { resultado: r.resultado, compromisso: r.compromisso };
}

/* ---------- Chat do grupo ---------- */

async function exigirGrupo(perfil: PerfilSessao, grupoId: string) {
  const empresaId = perfil.empresa.id;
  if (!(await repo.estado(banco, empresaId))) throw naoTransferida();
  await exigirExpediente(perfil);
  const g = await repo.grupo(banco, empresaId, grupoId);
  if (!g || g.excluidoEm) throw new ErroDominio("Lista não encontrada.", 404, "AGENDA_LISTA_NAO_ENCONTRADA");
  if (!admin(perfil) && g.donoId !== perfil.usuarioId && !(await repo.ehMembro(banco, empresaId, grupoId, perfil.usuarioId))) {
    throw proibido("Você não é membro desta lista.", "AGENDA_SEM_ACESSO");
  }
}

const mensagem = (m: { id: string; autorId: string; autorNome: string; texto: string; criadoEm: Date }): MensagemResposta => ({ ...m, criadoEm: m.criadoEm.toISOString() });

export async function listarMensagensGrupo(perfil: PerfilSessao, grupoId: string, depois?: string) {
  await exigirGrupo(perfil, grupoId);
  return (await rr.listarMensagensGrupo(perfil.empresa.id, grupoId, depois)).map(mensagem);
}

export async function enviarMensagemGrupo(perfil: PerfilSessao, grupoId: string, texto: string) {
  await exigirGrupo(perfil, grupoId);
  const m = await rr.inserirMensagemGrupo(perfil.empresa.id, grupoId, perfil.usuarioId, texto);
  await rr.marcarLidoGrupo(perfil.empresa.id, grupoId, perfil.usuarioId);
  return mensagem({ ...m, autorNome: perfil.nome });
}

export async function marcarLidoGrupo(perfil: PerfilSessao, grupoId: string) {
  await exigirGrupo(perfil, grupoId);
  await rr.marcarLidoGrupo(perfil.empresa.id, grupoId, perfil.usuarioId);
}

/** Não lidas por grupo, só dos grupos em que a pessoa conversa. */
export async function naoLidasGrupos(perfil: PerfilSessao) {
  const empresaId = perfil.empresa.id;
  if (!(await repo.estado(banco, empresaId))) return {};
  const membro = await repo.gruposDoMembro(empresaId, perfil.usuarioId);
  const grupos = await repo.gruposAtivos(empresaId);
  const pode = new Set(grupos.filter((g) => admin(perfil) || g.donoId === perfil.usuarioId || membro.has(g.id)).map((g) => g.id));
  const saida: Record<string, number> = {};
  for (const l of await rr.contarNaoLidasGrupos(empresaId, perfil.usuarioId)) if (pode.has(l.grupoId)) saida[l.grupoId] = l.total;
  return saida;
}

