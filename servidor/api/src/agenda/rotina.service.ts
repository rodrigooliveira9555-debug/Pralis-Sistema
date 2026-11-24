import {
  EXPEDIENTE_DIAS_ANTES,
  EXPEDIENTE_DIAS_DEPOIS,
  permissaoDaRegra,
  type ConfigPessoa,
  type ConfigPessoaResposta,
  type DesempenhoPessoa,
  type DesempenhoResposta,
  type ExpedientesEnvio,
  type MensagemResposta,
  type MinhaConfigResposta,
  type PerfilSessao,
  type TarefaDeTela
} from "@cicluz/shared";
import { violouUnico } from "../acessos/acessos.service.ts";
import { tem } from "../auth/permissoes.ts";
import { banco } from "../banco/conexao.ts";
import { conflito, ErroDominio, proibido } from "../erros.ts";
import * as repo from "./compromissos.repository.ts";
import { concluir, gravar, invalido, montar, naoEncontrado, naoTransferida, respostaDe } from "./compromissos.service.ts";
import { contasComPermissao } from "./contas-por-permissao.ts";
import * as gr from "./grupos.repository.ts";
import { sincronizarAreas } from "./grupos.service.ts";
import * as rr from "./rotina.repository.ts";
import { exigirExpediente, expedienteAgora, horaLocal, inatividadeEfetiva } from "./rotina.regras.ts";

// Rotina da Agenda (0008, P-46, áudios do Rodrigo de 23/11/2026):
// - Configurações da Agenda por pessoa: o administrador define o expediente (quando a conta não está ligada a um
//   colaborador com Horários/Escalas), se a Agenda abre fora dele e em quantos minutos parado o sistema sai
//   (padrão 15). A hora fora do expediente é sempre calculada e só aparece no Desempenho (0009, P-46 item 6).
// - Desempenho: no prazo, fora do prazo, não feitas, em aberto, tempo de resposta e hora fora do expediente.
// - Tarefa vinda de uma tela (agendamento de pedido…): cai na lista "Tarefas das telas", para quem a tela escolheu.
// - Chat do grupo: cada lista é um grupo; membro, dono e administrador conversam ali.

const admin = (perfil: PerfilSessao) => perfil.papel === "administrador";
const soAdministrador = () => proibido("Só o administrador mexe nas configurações da Agenda das pessoas.", "ADMIN_ONLY");

/* ---------- Configurações ---------- */

async function respostaConfig(empresaId: string, p: { id: string; nome: string; ativo: boolean }, atualizadoEm: Date | null): Promise<ConfigPessoaResposta> {
  const e = await expedienteAgora(banco, empresaId, p.id);
  return {
    usuarioId: p.id, nome: p.nome, ativo: p.ativo, ...e.config, atualizadoEm: atualizadoEm ? atualizadoEm.toISOString() : "",
    colaboradorLigado: e.colaboradorLigado, origemExpediente: e.origem, descricaoExpediente: e.descricao
  };
}

export async function listarConfigs(perfil: PerfilSessao): Promise<ConfigPessoaResposta[]> {
  if (!admin(perfil)) throw soAdministrador();
  const [pessoas, linhas] = await Promise.all([rr.contas(perfil.empresa.id), rr.configs(perfil.empresa.id)]);
  const por = new Map(linhas.map((l) => [l.usuarioId, l]));
  return Promise.all(pessoas.map((p) => respostaConfig(perfil.empresa.id, p, por.get(p.id)?.atualizadoEm ?? null)));
}

export async function salvarConfig(perfil: PerfilSessao, usuarioId: string, c: ConfigPessoa): Promise<ConfigPessoaResposta> {
  if (!admin(perfil)) throw soAdministrador();
  const pessoa = (await rr.contas(perfil.empresa.id)).find((p) => p.id === usuarioId);
  if (!pessoa) throw new ErroDominio("Pessoa não encontrada nesta empresa.", 404, "PESSOA_NAO_ENCONTRADA");
  // Quem configura não se tranca para fora: o administrador não pode bloquear a própria Agenda.
  if (usuarioId === perfil.usuarioId && c.foraExpediente === "bloquear") throw invalido("Você não pode bloquear a sua própria Agenda fora do expediente.");
  const l = await rr.salvarConfig(perfil.empresa.id, usuarioId, c, perfil.usuarioId);
  return respostaConfig(perfil.empresa.id, pessoa, l.atualizadoEm);
}

/** A regra da própria pessoa: a tela usa para avisar e para sair sozinha depois do tempo parado. */
export async function minhaConfig(perfil: PerfilSessao, momento = new Date()): Promise<MinhaConfigResposta> {
  const e = await expedienteAgora(banco, perfil.empresa.id, perfil.usuarioId, momento);
  const dentro = e.situacao.onde === "dentro" || e.situacao.onde === "sem-expediente";
  return {
    ...e.config, dentroDoExpediente: dentro, bloqueadaAgora: e.config.foraExpediente === "bloquear" && !dentro, descricaoExpediente: e.descricao,
    origemExpediente: e.origem, inatividadeEfetivaMinutos: inatividadeEfetiva(e.config)
  };
}

/* ---------- Conta ligada ao colaborador e expediente dos Horários/Escalas (0009, P-46 item 5) ---------- */

const podeExpedientes = (perfil: PerfilSessao) => admin(perfil) || tem(perfil, "pessoas_editar");
const semPermissaoEscala = () => proibido("Você não tem permissão para mandar os Horários/Escalas.", "INSUFFICIENT_PERMISSION");

/** Liga a conta a um colaborador do cadastro (pelo id). Só o administrador. */
export async function ligarColaborador(perfil: PerfilSessao, usuarioId: string, colaboradorId: string | null) {
  if (!admin(perfil)) throw proibido("Só o administrador liga a conta a um colaborador.", "ADMIN_ONLY");
  try {
    if (!(await rr.ligarColaborador(perfil.empresa.id, usuarioId, colaboradorId))) throw new ErroDominio("Pessoa não encontrada nesta empresa.", 404, "PESSOA_NAO_ENCONTRADA");
  } catch (e) {
    if (violouUnico(e, "perfis_usuarios_colaborador_uq")) throw conflito("Este colaborador já está ligado a outra conta.", "COLABORADOR_JA_LIGADO");
    throw e;
  }
  return { usuarioId, colaboradorId };
}

/** Contas e o colaborador ligado a cada uma (ids). Para a tela do administrador e para o aparelho calcular. */
export async function contasEColaboradores(perfil: PerfilSessao) {
  if (!podeExpedientes(perfil)) throw semPermissaoEscala();
  return (await rr.contas(perfil.empresa.id)).filter((c) => c.ativo).map((c) => ({ usuarioId: c.id, nome: c.nome, colaboradorId: c.colaboradorId ?? "" }));
}

const somarDias = (dia: string, n: number) => {
  const d = new Date(dia + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** O aparelho manda o expediente dia a dia dos colaboradores ligados (só trabalha/folga e horário). */
export async function receberExpedientes(perfil: PerfilSessao, e: ExpedientesEnvio, momento = new Date()) {
  if (!podeExpedientes(perfil)) throw semPermissaoEscala();
  const hoje = horaLocal(momento).data;
  // Um dia a mais de cada lado: fuso e virada do dia entre o aparelho e o servidor.
  if (e.de < somarDias(hoje, -EXPEDIENTE_DIAS_ANTES - 1) || e.ate > somarDias(hoje, EXPEDIENTE_DIAS_DEPOIS + 1)) throw invalido("Período fora da janela aceita.");
  // Só os colaboradores ligados a uma conta: nada além do necessário sai do aparelho.
  const ligados = new Set(await rr.colaboradoresLigados(perfil.empresa.id));
  const colaboradores = e.colaboradores.filter((c) => ligados.has(c.colaboradorId));
  await banco.transaction((tx) => rr.substituirExpedientes(tx, perfil.empresa.id, perfil.usuarioId, { ...e, colaboradores }));
  return { recebidos: colaboradores.length, ignorados: e.colaboradores.length - colaboradores.length };
}

/* ---------- Desempenho ---------- */

/**
 * Prazo de um compromisso: o dia dele, até o término; sem término, até o fim do dia (no horário da loja).
 * A hora de início não é prazo: "pedido às 11h32" feito às 11h35 está no prazo. Provisório (P-46), até o Rodrigo
 * dizer se algum tipo de tarefa tem prazo mais curto.
 */
function prazo(data: string, horaFim: string | null) {
  const h = horaFim || "23:59";
  // Brasil sem horário de verão: -03:00 o ano inteiro.
  return new Date(`${data}T${h}:59-03:00`);
}

export async function desempenho(perfil: PerfilSessao, de: string, ate: string, momento = new Date()): Promise<DesempenhoResposta> {
  if (!(await repo.estado(banco, perfil.empresa.id))) throw naoTransferida();
  await exigirExpediente(perfil);
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
    const limite = prazo(l.data, l.horaFim);
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

/** Só devolve o compromisso a quem o vê (quem disparou a tela pode não participar da tarefa: recebe só o id). */
async function seVisivel(ex: Parameters<typeof respostaDe>[0], perfil: PerfilSessao, c: Parameters<typeof respostaDe>[2]) {
  const r = await respostaDe(ex, perfil, c);
  return r.acesso.ver ? r : null;
}

/**
 * Cria a tarefa que a tela pediu, uma vez por referência. Gestor = dono da lista "Tarefas das telas" (o
 * administrador), não quem estava na tela: um colega que só abriu o Compras não vira gestor nem avalia ninguém.
 * Responsáveis veem e concluem. Pedir de novo (outro aparelho, a mesma tela aberta duas vezes) devolve o mesmo id.
 */
export async function criarTarefaDeTela(perfil: PerfilSessao, e: TarefaDeTela) {
  const empresaId = perfil.empresa.id;
  const ja = await rr.porVinculo(banco, empresaId, e.vinculoRef);
  if (ja) return { criado: false, id: ja.id, compromisso: await seVisivel(banco, perfil, ja) };
  // Regra por permissão (P-46 itens 1 e 2): quem dispara tem a permissão; recebem todas as contas ativas com ela.
  let responsaveis = e.responsaveis ?? [];
  if (e.paraQuemTem) {
    if (!tem(perfil, e.paraQuemTem)) throw proibido("Você não tem a permissão que esta tarefa exige.", "INSUFFICIENT_PERMISSION");
    responsaveis = await contasComPermissao(empresaId, e.paraQuemTem);
    if (!responsaveis.length) throw invalido("Ninguém tem a permissão para receber esta tarefa.");
  }
  return gravar(perfil, async (tx) => {
    await garantirListaDasTelas(tx, perfil);
    const lista = (await repo.grupo(tx, empresaId, LISTA_TAREFAS_TELAS))!;
    const pessoas = [...new Set(responsaveis)].map((id) => ({ id, responsavel: true, ver: true, editar: false, concluir: true, excluir: false }));
    const contas = await repo.contasDaEmpresa(tx, empresaId, pessoas.map((p) => p.id));
    if (pessoas.some((p) => !contas.has(p.id))) throw invalido("Uma das pessoas da tarefa não é conta desta empresa.");
    const m = montar({
      grupoId: LISTA_TAREFAS_TELAS, titulo: e.titulo, notas: e.notas, url: "", local: "", localizacao: null,
      data: e.data, hora: e.hora, horaFim: "", repeticao: null, alerta: e.data && e.hora ? 0 : null, prioridade: "normal", sinalizado: false,
      etiquetas: [], subtarefas: e.subtarefas.map((titulo) => ({ titulo, concluida: false })), pessoas, avaliacaoTipo: "", colunaId: "",
      vinculoTela: e.vinculoTela, vinculoTitulo: e.vinculoTitulo
    }, null);
    const ordem = (await repo.maiorOrdem(tx, empresaId, LISTA_TAREFAS_TELAS)) + 1;
    const criou = await repo.inserirCompromisso(tx, {
      ...m.linha, empresaId, id: e.id, vinculoRef: e.vinculoRef, gestorId: lista.donoId, ordem: String(ordem), criadoPor: perfil.usuarioId, atualizadoPor: perfil.usuarioId
    });
    // Corrida com outro aparelho: a mesma referência já entrou e devolve o id dela. Id que já é de outro
    // compromisso (sem a mesma referência) é recusado, sem revelar nada dele.
    if (!criou) {
      const mesma = await rr.porVinculo(tx, empresaId, e.vinculoRef);
      if (!mesma) throw conflito("Este identificador já foi usado. Recarregue e tente de novo.", "AGENDA_ID_EM_USO");
      return { criado: false, id: mesma.id, compromisso: await seVisivel(tx, perfil, mesma) };
    }
    await repo.trocarParticipantes(tx, empresaId, e.id, perfil.usuarioId, m.pessoas);
    return { criado: true, id: e.id, compromisso: await seVisivel(tx, perfil, (await repo.compromisso(tx, empresaId, e.id))!) };
  });
}

/** A tela fez o que a tarefa pedia (ex.: o pedido foi enviado): conclui a tarefa, se quem fez pode concluir. */
export async function concluirPorVinculo(perfil: PerfilSessao, vinculoRef: string) {
  await exigirExpediente(perfil);
  const c = await rr.porVinculo(banco, perfil.empresa.id, vinculoRef);
  if (!c || c.excluidoEm) throw naoEncontrado();
  // Quem não vê a tarefa recebe 404, como se ela não existisse (não revela nada dela).
  const atual = await seVisivel(banco, perfil, c);
  if (!atual) throw naoEncontrado();
  if (c.concluida) return { resultado: "sem-mudanca" as const, compromisso: atual };
  const r = await concluir(perfil, c.id, c.repeticaoTipo && c.data ? { concluida: true, ocorrencia: c.data } : { concluida: true });
  return { resultado: r.resultado, compromisso: r.compromisso };
}

/**
 * A tela desfez o que gerou a tarefa (ex.: o pedido de produção foi cancelado): a tarefa aberta sai da Agenda.
 * Só para as regras por permissão, e só quem tem a permissão da regra. Já concluída fica como está.
 */
export async function cancelarPorVinculo(perfil: PerfilSessao, vinculoRef: string) {
  const exigida = permissaoDaRegra(vinculoRef);
  if (!exigida || !tem(perfil, exigida)) throw proibido("Você não pode cancelar esta tarefa.", "INSUFFICIENT_PERMISSION");
  const c = await rr.porVinculo(banco, perfil.empresa.id, vinculoRef);
  if (!c || c.excluidoEm || c.concluida) return { resultado: "sem-mudanca" as const };
  await gravar(perfil, async (tx) => {
    await repo.atualizarCompromisso(tx, perfil.empresa.id, c.id, { excluidoEm: new Date(), excluidoPor: perfil.usuarioId, atualizadoPor: perfil.usuarioId });
    await repo.excluirRelacoesDe(tx, perfil.empresa.id, [c.id]);
  });
  return { resultado: "cancelada" as const };
}

/* ---------- Chat do grupo ---------- */

async function exigirGrupo(perfil: PerfilSessao, grupoId: string) {
  const empresaId = perfil.empresa.id;
  if (!(await repo.estado(banco, empresaId))) throw naoTransferida();
  await exigirExpediente(perfil);
  await sincronizarAreas(empresaId);
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
  await exigirExpediente(perfil);
  const membro = await repo.gruposDoMembro(empresaId, perfil.usuarioId);
  const grupos = await repo.gruposAtivos(empresaId);
  const pode = new Set(grupos.filter((g) => admin(perfil) || g.donoId === perfil.usuarioId || membro.has(g.id)).map((g) => g.id));
  const saida: Record<string, number> = {};
  for (const l of await rr.contarNaoLidasGrupos(empresaId, perfil.usuarioId)) if (pode.has(l.grupoId)) saida[l.grupoId] = l.total;
  return saida;
}

