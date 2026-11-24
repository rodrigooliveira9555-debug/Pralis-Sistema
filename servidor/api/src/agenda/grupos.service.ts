import { AREAS_PERMISSAO, type AreaLista, type AreaPermissao, type GrupoAgendaResposta, type GrupoCriacao, type GrupoEdicao, type JsonValue, type PerfilSessao, type PessoaAgendaResposta } from "@cicluz/shared";
import { violouUnico } from "../acessos/acessos.service.ts";
import { banco, type TransacaoBanco } from "../banco/conexao.ts";
import { conflito, ErroDominio, proibido } from "../erros.ts";
import * as repo from "./compromissos.repository.ts";
import * as gr from "./grupos.repository.ts";
import { gravar, invalido } from "./compromissos.service.ts";
import { contasDaArea } from "./contas-por-permissao.ts";

// Listas (grupos), membros e colunas do Kanban (plano docs/AGENDA_NO_SERVIDOR_PLANO.md, seção 3; perguntas 1 a 4
// e 11 com a proposta padrão): criar lista = qualquer pessoa logada (vira dona e membro); mudar, excluir e escolher
// membros = dona ou administrador; colunas valem para a empresa toda e qualquer pessoa logada mexe, como hoje.

type LinhaGrupo = repo.LinhaGrupo;

const listaNaoEncontrada = () => new ErroDominio("Lista não encontrada.", 404, "AGENDA_LISTA_NAO_ENCONTRADA");
const colunaNaoEncontrada = () => new ErroDominio("Coluna não encontrada.", 404, "AGENDA_COLUNA_NAO_ENCONTRADA");
const nomeListaEmUso = () => conflito("Já existe uma lista com esse nome.", "AGENDA_LISTA_NOME_EM_USO");
const nomeColunaEmUso = () => conflito("Já existe uma coluna com esse nome.", "AGENDA_COLUNA_NOME_EM_USO");

/** Traduz a recusa do índice único (que desfaz a transação) para a mensagem da tela. */
async function comNomeUnico<T>(fazer: () => Promise<T>, indice: string, erro: () => ErroDominio) {
  try {
    return await fazer();
  } catch (e) {
    if (violouUnico(e, indice)) throw erro();
    throw e;
  }
}

const podeGerir = (perfil: PerfilSessao, g: LinhaGrupo) => perfil.papel === "administrador" || g.donoId === perfil.usuarioId;

function respostaGrupo(perfil: PerfilSessao, g: LinhaGrupo, membro: boolean): GrupoAgendaResposta {
  return {
    id: g.id, nome: g.nome, cor: g.cor, icone: g.icone, ordenacao: g.ordenacao, ordem: g.ordem, donoId: g.donoId,
    membro, podeGerir: podeGerir(perfil, g), versao: g.versao, area: (g.area ?? "") as AreaLista
  };
}

/* ---------- Lista ligada a uma área (P-46 item 3) ---------- */

const nomeDaArea = (area: string) => AREAS_PERMISSAO.find(([a]) => a === area)?.[1] ?? area;
const iguais = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");

/** Membros de uma lista ligada à área: as contas ativas com alguma permissão dela, e a dona. */
async function membrosDaArea(empresaId: string, g: Pick<LinhaGrupo, "donoId">, area: string) {
  return [...new Set([g.donoId, ...(await contasDaArea(empresaId, area as AreaPermissao))])];
}

/**
 * Refaz os membros das listas ligadas a uma área quando as permissões mudaram (alguém ganhou ou perdeu acesso,
 * conta desativada). Roda nas leituras da Agenda: sem lista ligada a área, custa uma consulta.
 */
export async function sincronizarAreas(empresaId: string) {
  const comArea = (await repo.gruposAtivos(empresaId)).filter((g) => g.area);
  for (const g of comArea) {
    const alvo = await membrosDaArea(empresaId, g, g.area!);
    if (iguais(alvo, await gr.membrosDe(banco, empresaId, g.id))) continue;
    await banco.transaction(async (tx) => {
      // Sobe a versão da Agenda (quem está com a tela aberta recarrega) e troca os membros.
      if ((await repo.subirVersao(tx, empresaId)) === null) return;
      await gr.trocarMembros(tx, empresaId, g.id, alvo, g.donoId, "area");
    });
  }
}

/* ---------- Pessoas (substitui a lista provisória do Compras, P-18) ---------- */

export async function pessoas(perfil: PerfilSessao): Promise<PessoaAgendaResposta[]> {
  return gr.pessoasAtivas(perfil.empresa.id);
}

/* ---------- Listas ---------- */

async function grupoParaGerir(tx: TransacaoBanco, perfil: PerfilSessao, id: string) {
  const g = await gr.grupoTravado(tx, perfil.empresa.id, id);
  if (!g || g.excluidoEm) throw listaNaoEncontrada();
  if (!podeGerir(perfil, g)) throw proibido("Só quem criou a lista ou o administrador muda a lista.", "AGENDA_SEM_ACESSO");
  return g;
}

function conferirVersaoGrupo(perfil: PerfilSessao, g: LinhaGrupo, versao: number) {
  if (g.versao !== versao) {
    throw conflito("Outra pessoa alterou esta lista antes. Veja a versão atual.", "AGENDA_VERSAO", { grupo: respostaGrupo(perfil, g, false) as unknown as JsonValue });
  }
}

export async function criarGrupo(perfil: PerfilSessao, e: GrupoCriacao) {
  const empresaId = perfil.empresa.id;
  return comNomeUnico(() => gravar(perfil, async (tx) => {
    const existente = await repo.grupo(tx, empresaId, e.id);
    if (existente) {
      if (existente.donoId === perfil.usuarioId && !existente.excluidoEm) return { criado: false, grupo: respostaGrupo(perfil, existente, true) };
      throw conflito("Este identificador já foi usado. Recarregue a Agenda e tente de novo.", "AGENDA_ID_EM_USO");
    }
    const ordem = (await gr.maiorOrdemGrupo(tx, empresaId)) + 1;
    await gr.inserirGrupo(tx, {
      empresaId, id: e.id, nome: e.nome, cor: e.cor, icone: e.icone, ordenacao: "manual", ordem, donoId: perfil.usuarioId,
      area: e.area || null, criadoPor: perfil.usuarioId, atualizadoPor: perfil.usuarioId
    });
    if (e.area) await gr.trocarMembros(tx, empresaId, e.id, await membrosDaArea(empresaId, { donoId: perfil.usuarioId }, e.area), perfil.usuarioId, "area");
    else await gr.trocarMembros(tx, empresaId, e.id, [perfil.usuarioId], perfil.usuarioId);
    return { criado: true, grupo: respostaGrupo(perfil, (await repo.grupo(tx, empresaId, e.id))!, true) };
  }), "agenda_grupos_nome_uq", nomeListaEmUso);
}

export async function editarGrupo(perfil: PerfilSessao, id: string, e: GrupoEdicao) {
  const empresaId = perfil.empresa.id;
  return comNomeUnico(() => gravar(perfil, async (tx) => {
    const g = await grupoParaGerir(tx, perfil, id);
    conferirVersaoGrupo(perfil, g, e.versao);
    const { area, ...resto } = e;
    const dados = Object.fromEntries(Object.entries(resto).filter(([k, v]) => k !== "versao" && v !== undefined));
    const mudaArea = area !== undefined && area !== (g.area ?? "");
    const linha = await gr.atualizarGrupo(tx, empresaId, id, { ...dados, ...(mudaArea ? { area: area || null } : {}), atualizadoPor: perfil.usuarioId });
    // Ligou a uma área: os membros passam a ser os da área. Desligou: os membros de agora ficam, escolhidos à mão.
    if (mudaArea && area) await gr.trocarMembros(tx, empresaId, id, await membrosDaArea(empresaId, g, area), perfil.usuarioId, "area");
    else if (mudaArea) await gr.trocarMembros(tx, empresaId, id, await gr.membrosDe(tx, empresaId, id), perfil.usuarioId);
    return respostaGrupo(perfil, linha, await repo.ehMembro(tx, empresaId, id, perfil.usuarioId));
  }), "agenda_grupos_nome_uq", nomeListaEmUso);
}

/** Exclui (esconde) só a lista vazia, e nunca a última: compromisso nunca some junto com a lista. */
export async function excluirGrupo(perfil: PerfilSessao, id: string, versao: number) {
  const empresaId = perfil.empresa.id;
  await gravar(perfil, async (tx) => {
    const g = await grupoParaGerir(tx, perfil, id);
    conferirVersaoGrupo(perfil, g, versao);
    if ((await gr.compromissosNoGrupo(tx, empresaId, id)) > 0) {
      throw conflito("Mova ou exclua os compromissos desta lista antes de excluí-la.", "AGENDA_GRUPO_COM_COMPROMISSOS");
    }
    if ((await gr.outrosGruposAtivos(tx, empresaId, id)) === 0) throw conflito("A agenda precisa de pelo menos uma lista.", "AGENDA_ULTIMA_LISTA");
    await gr.atualizarGrupo(tx, empresaId, id, { excluidoEm: new Date(), excluidoPor: perfil.usuarioId, atualizadoPor: perfil.usuarioId });
  });
}

export async function membros(perfil: PerfilSessao, id: string) {
  await sincronizarAreas(perfil.empresa.id);
  const g = await repo.grupo(banco, perfil.empresa.id, id);
  if (!g || g.excluidoEm) throw listaNaoEncontrada();
  return gr.membrosDe(banco, perfil.empresa.id, id);
}

/** Membros escolhidos à mão. A dona continua sempre. */
export async function definirMembros(perfil: PerfilSessao, id: string, usuarioIds: string[]) {
  const empresaId = perfil.empresa.id;
  return gravar(perfil, async (tx) => {
    const g = await grupoParaGerir(tx, perfil, id);
    if (g.area) throw conflito(`Os membros desta lista vêm da área ${nomeDaArea(g.area)} do Acesso por Tela. Para escolher à mão, tire a área da lista.`, "AGENDA_LISTA_POR_AREA");
    const ids = [...new Set([g.donoId, ...usuarioIds])];
    const contas = await repo.contasDaEmpresa(tx, empresaId, ids);
    if (ids.some((x) => !contas.has(x))) throw invalido("Uma das pessoas escolhidas não é conta desta empresa.");
    await gr.trocarMembros(tx, empresaId, id, ids, perfil.usuarioId);
    return ids;
  });
}

/* ---------- Colunas do Kanban ---------- */

const ehConcluido = (nome: string) => nome.toLocaleLowerCase("pt-BR") === "concluído";

export async function criarColuna(perfil: PerfilSessao, id: string, nome: string) {
  if (ehConcluido(nome) || id === "concluido") throw nomeColunaEmUso();
  const empresaId = perfil.empresa.id;
  return comNomeUnico(() => gravar(perfil, async (tx) => {
    const existente = await repo.coluna(tx, empresaId, id);
    if (existente) return { criada: false, coluna: { id: existente.id, nome: existente.nome, ordem: existente.ordem } };
    const ordem = (await gr.maiorOrdemColuna(tx, empresaId)) + 1;
    await gr.inserirColuna(tx, { empresaId, id, nome, ordem, criadoPor: perfil.usuarioId, atualizadoPor: perfil.usuarioId });
    return { criada: true, coluna: { id, nome, ordem } };
  }), "agenda_colunas_nome_uq", nomeColunaEmUso);
}

export async function renomearColuna(perfil: PerfilSessao, id: string, nome: string) {
  if (ehConcluido(nome)) throw nomeColunaEmUso();
  return comNomeUnico(() => gravar(perfil, async (tx) => {
    if (!(await gr.renomearColuna(tx, perfil.empresa.id, id, nome, perfil.usuarioId))) throw colunaNaoEncontrada();
    return { id, nome };
  }), "agenda_colunas_nome_uq", nomeColunaEmUso);
}

/** Só sem cartão aberto, e o quadro fica com pelo menos uma coluna além de Concluído. */
export async function excluirColuna(perfil: PerfilSessao, id: string) {
  const empresaId = perfil.empresa.id;
  await gravar(perfil, async (tx) => {
    const cols = await repo.colunas(tx, empresaId);
    if (!cols.some((c) => c.id === id)) throw colunaNaoEncontrada();
    if (cols.length <= 1) throw conflito("O quadro precisa de pelo menos uma coluna além de Concluído.", "AGENDA_ULTIMA_COLUNA");
    if ((await gr.abertosNaColuna(tx, empresaId, id, cols[0]!.id === id)) > 0) {
      throw conflito("Mova os cartões desta coluna antes de excluí-la.", "AGENDA_COLUNA_COM_CARTOES");
    }
    await gr.soltarDaColuna(tx, empresaId, id);
    await gr.excluirColuna(tx, empresaId, id);
  });
}
