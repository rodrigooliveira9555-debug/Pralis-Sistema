import { randomUUID } from "node:crypto";
import {
  AgendaRegras as R,
  type AgendaResposta,
  type AreaLista,
  type CompromissoCriacao,
  type CompromissoEdicao,
  type CompromissoMudanca,
  type CompromissoResposta,
  type Conclusao,
  type JsonValue,
  type PerfilSessao
} from "@cicluz/shared";
import { banco, type TransacaoBanco } from "../banco/conexao.ts";
import { conflito, ErroDominio, proibido } from "../erros.ts";
import * as repo from "./compromissos.repository.ts";
import { exigirExpediente, registrarHoraFora } from "./rotina.regras.ts";
import type { LinhaAvaliacao, LinhaCompromisso, LinhaParticipante, NovoCompromisso } from "./compromissos.repository.ts";

// Compromissos da Agenda nas tabelas (plano docs/AGENDA_NO_SERVIDOR_PLANO.md, seção 3).
// Toda gravação: trava o contador da empresa (uma gravação por vez), confere permissão no servidor e a versão
// do compromisso (409 só no que mudou). Formulário (PUT) e mudança parcial (PATCH) passam por `montar`: uma
// validação e UMA regra de âncora da repetição (M5).

type Formulario = Omit<CompromissoCriacao, "id">;
type Pessoa = R.Pessoa;

/* ---------- Erros ---------- */

export const naoEncontrado = () =>
  new ErroDominio("Compromisso não encontrado.", 404, "AGENDA_COMPROMISSO_NAO_ENCONTRADO");
const SEM = {
  editar: "Você não tem permissão para editar este compromisso.",
  concluir: "Você não tem permissão para concluir este compromisso.",
  excluir: "Você não tem permissão para excluir este compromisso."
} as const;
const semAcesso = (acao: keyof typeof SEM) => proibido(SEM[acao], "AGENDA_SEM_ACESSO");
export const invalido = (mensagem: string) => new ErroDominio(mensagem, 400, "AGENDA_INVALIDO");
export const naoTransferida = () =>
  conflito("A Agenda ainda está sendo levada para o servidor. Volte em alguns minutos.", "AGENDA_NAO_TRANSFERIDA");

/* ---------- Linha do banco → forma da regra e da resposta ---------- */

const pessoasDe = (linhas: LinhaParticipante[]): Pessoa[] =>
  linhas.map((p) => ({ id: p.usuarioId, responsavel: p.responsavel, ver: p.ver, editar: p.editar, concluir: p.concluir, excluir: p.excluir }));

export const notaDe = (n: LinhaAvaliacao): R.Nota => ({
  avaliadoId: n.avaliadoId, porId: n.porId, papel: n.papel as R.PapelNota, valor: n.valor, comentario: n.comentario, em: n.em.toISOString()
});

function repeticaoDe(c: LinhaCompromisso) {
  if (!c.repeticaoTipo) return null;
  return {
    tipo: c.repeticaoTipo, intervalo: c.repeticaoIntervalo, unidade: c.repeticaoUnidade, diasSemana: c.repeticaoDiasSemana,
    fim: { tipo: c.repeticaoFimTipo, data: c.repeticaoFimData ?? "", vezes: c.repeticaoFimVezes ?? 0 },
    feitas: c.repeticaoFeitas, ancora: c.repeticaoAncora ?? ""
  };
}

function localizacaoDe(c: LinhaCompromisso) {
  if (c.localLat === null && c.localLng === null && !c.localAviso) return null;
  return {
    ...(c.localLat !== null ? { lat: Number(c.localLat) } : {}),
    ...(c.localLng !== null ? { lng: Number(c.localLng) } : {}),
    aviso: c.localAviso, raio: c.localRaio ?? 200
  };
}

type Subtarefa = { id: string; titulo: string; concluida: boolean; concluidaEm: string };
const subtarefasDe = (c: Pick<NovoCompromisso, "subtarefas">) => (Array.isArray(c.subtarefas) ? (c.subtarefas as Subtarefa[]) : []);

/** O compromisso na forma que regras.ts entende (criadoPor = gestor). */
export function paraRegra(c: LinhaCompromisso, pessoas: Pessoa[], notas: R.Nota[]): R.Compromisso {
  const loc = localizacaoDe(c);
  return {
    titulo: c.titulo, url: c.url, data: c.data ?? "", hora: c.hora ?? "", horaFim: c.horaFim ?? "",
    repeticao: repeticaoDe(c), alerta: c.alertaMinutos, prioridade: c.prioridade, subtarefas: subtarefasDe(c),
    ...(loc ? { localizacao: loc } : {}),
    avaliacao: { tipo: c.avaliacaoTipo, notas }, concluida: c.concluida, criadoPor: c.gestorId, pessoas
  };
}

export const acessoDe = (c: LinhaCompromisso, pessoas: Pessoa[], usuarioId: string) =>
  R.acesso({ criadoPor: c.gestorId, pessoas }, usuarioId);

function resposta(c: LinhaCompromisso, participantes: LinhaParticipante[], notas: LinhaAvaliacao[], adiadoAte: Date | null, usuarioId: string): CompromissoResposta {
  const pessoas = pessoasDe(participantes);
  const acesso = acessoDe(c, pessoas, usuarioId);
  // Gestor vê todas as notas; responsável, só a própria autoavaliação (comparativo da tela); quem só vê, nenhuma.
  const visiveis = notas.filter((n) => acesso.gestor || (n.avaliadoId === usuarioId && n.papel === "auto")).map(notaDe);
  return {
    id: c.id, grupoId: c.grupoId, gestorId: c.gestorId,
    titulo: c.titulo, notas: c.notas, url: c.url, local: c.local, localizacao: localizacaoDe(c),
    data: c.data ?? "", hora: c.hora ?? "", horaFim: c.horaFim ?? "",
    repeticao: repeticaoDe(c), alerta: c.alertaMinutos,
    adiadoPara: adiadoAte ? adiadoAte.toISOString() : "",
    prioridade: c.prioridade, sinalizado: c.sinalizado, etiquetas: c.etiquetas,
    subtarefas: subtarefasDe(c), pessoas,
    avaliacao: { tipo: c.avaliacaoTipo, notas: visiveis },
    colunaId: c.colunaId ?? "", ordem: Number(c.ordem),
    concluida: c.concluida, concluidaEm: c.concluidaEm ? c.concluidaEm.toISOString() : "",
    origemId: c.origemId ?? "", ocorrencia: c.ocorrencia ?? "",
    vinculoTela: c.vinculoTela ?? "", vinculoTitulo: c.vinculoTitulo ?? "", vinculoRef: c.vinculoRef ?? "",
    criadoEm: c.criadoEm.toISOString(), atualizadoEm: c.atualizadoEm.toISOString(),
    versao: c.versao, acesso
  };
}

/** Resposta de um compromisso lendo pessoas, notas e a soneca desta pessoa. */
export async function respostaDe(ex: typeof banco | TransacaoBanco, perfil: PerfilSessao, c: LinhaCompromisso) {
  const empresaId = perfil.empresa.id;
  // Uma consulta por vez: dentro da transação é a mesma conexão.
  const ps = await repo.participantesDe(ex, empresaId, [c.id]);
  const ns = await repo.avaliacoesDe(ex, empresaId, [c.id]);
  const ad = await repo.adiamentosDe(ex, empresaId, perfil.usuarioId, [c.id]);
  return resposta(c, ps, ns, ad[0]?.ate ?? null, perfil.usuarioId);
}

/* ---------- Leitura ---------- */

export async function agenda(perfil: PerfilSessao): Promise<AgendaResposta> {
  const empresaId = perfil.empresa.id;
  const u = perfil.usuarioId;
  const est = await repo.estado(banco, empresaId);
  if (!est) return { estado: { noServidor: false, versao: 0 }, usuarioId: u, grupos: [], colunas: [], compromissos: [], relacoes: [] };
  await exigirExpediente(perfil);

  const itens = await repo.compromissosVisiveis(empresaId, u);
  const ids = itens.map((c) => c.id);
  const [ps, ns, ads, grupos, membroDe, cols, rels] = await Promise.all([
    repo.participantesDe(banco, empresaId, ids), repo.avaliacoesDe(banco, empresaId, ids), repo.adiamentosDe(banco, empresaId, u, ids),
    repo.gruposAtivos(empresaId), repo.gruposDoMembro(empresaId, u), repo.colunas(banco, empresaId), repo.relacoes(empresaId)
  ]);
  const porItem = <T extends { compromissoId: string }>(l: T[]) => {
    const m = new Map<string, T[]>();
    l.forEach((x) => m.set(x.compromissoId, [...(m.get(x.compromissoId) ?? []), x]));
    return m;
  };
  const psPor = porItem(ps);
  const nsPor = porItem(ns);
  const adPor = new Map(ads.map((a) => [a.compromissoId, a.ate]));
  const compromissos = itens.map((c) => resposta(c, psPor.get(c.id) ?? [], nsPor.get(c.id) ?? [], adPor.get(c.id) ?? null, u));

  // Grupo visível: membro, dono, administrador, ou onde há compromisso que a pessoa vê.
  const admin = perfil.papel === "administrador";
  const comItem = new Set(compromissos.map((c) => c.grupoId));
  const visiveis = new Set(ids);
  return {
    estado: { noServidor: true, versao: est.versao },
    usuarioId: u,
    grupos: grupos
      .filter((g) => admin || g.donoId === u || membroDe.has(g.id) || comItem.has(g.id))
      .map((g) => ({
        id: g.id, nome: g.nome, cor: g.cor, icone: g.icone, ordenacao: g.ordenacao, ordem: g.ordem, donoId: g.donoId,
        membro: membroDe.has(g.id), podeGerir: admin || g.donoId === u, versao: g.versao, area: (g.area ?? "") as AreaLista
      })),
    colunas: cols.map((c) => ({ id: c.id, nome: c.nome, ordem: c.ordem })),
    compromissos,
    // Ligação só aparece com as duas pontas visíveis.
    relacoes: rels.filter((r) => visiveis.has(r.deId) && visiveis.has(r.paraId)).map((r) => ({ id: r.id, de: r.deId, para: r.paraId, rotulo: r.rotulo }))
  };
}

/** Um compromisso; quem não vê recebe 404 (não revela que existe). */
export async function obter(perfil: PerfilSessao, id: string) {
  await exigirTransferida(perfil);
  await exigirExpediente(perfil);
  const c = await repo.compromisso(banco, perfil.empresa.id, id);
  if (!c || c.excluidoEm) throw naoEncontrado();
  const r = await respostaDe(banco, perfil, c);
  if (!r.acesso.ver) throw naoEncontrado();
  return r;
}

async function exigirTransferida(perfil: PerfilSessao) {
  if (!(await repo.estado(banco, perfil.empresa.id))) throw naoTransferida();
}

/* ---------- Gravação: um caminho só ---------- */

/** Abre a transação com o contador travado; sem Agenda nas tabelas, recusa. */
/** Grava numa transação, subindo a versão da Agenda. semExpediente: tarefa criada/cancelada por uma tela (não é usar a Agenda). */
export async function gravar<T>(perfil: PerfilSessao, ...args: [(tx: TransacaoBanco) => Promise<T>] | [{ semExpediente?: boolean }, (tx: TransacaoBanco) => Promise<T>]) {
  const [opcoes, fazer] = args.length === 1 ? [{}, args[0]] : args;
  if (!opcoes.semExpediente) await exigirExpediente(perfil);
  return banco.transaction(async (tx) => {
    if ((await repo.subirVersao(tx, perfil.empresa.id)) === null) throw naoTransferida();
    return fazer(tx);
  });
}

/** Lê o compromisso travado e confere que a pessoa o vê (senão 404) e pode a ação (senão 403). */
export async function carregar(tx: TransacaoBanco, perfil: PerfilSessao, id: string, acao: keyof typeof SEM | "ver") {
  const c = await repo.compromisso(tx, perfil.empresa.id, id, true);
  if (!c || c.excluidoEm) throw naoEncontrado();
  const participantes = await repo.participantesDe(tx, perfil.empresa.id, [id]);
  const pessoas = pessoasDe(participantes);
  const acesso = acessoDe(c, pessoas, perfil.usuarioId);
  if (!acesso.ver) throw naoEncontrado();
  if (acao !== "ver" && !acesso[acao]) throw semAcesso(acao);
  return { c, pessoas, acesso };
}

async function conferirVersao(tx: TransacaoBanco, perfil: PerfilSessao, c: LinhaCompromisso, versao: number) {
  if (c.versao === versao) return;
  const atual = await respostaDe(tx, perfil, c);
  throw conflito("Outra pessoa alterou este compromisso antes. Veja a versão atual e faça a mudança de novo.", "AGENDA_VERSAO",
    { compromisso: atual as unknown as JsonValue });
}

const nuloSeVazio = (s: string) => (s ? s : null);

/** O formulário de um compromisso que já existe (base para a mudança parcial). */
function formularioDe(c: LinhaCompromisso, pessoas: Pessoa[]): Formulario {
  const r = repeticaoDe(c);
  const loc = localizacaoDe(c);
  return {
    grupoId: c.grupoId, titulo: c.titulo, notas: c.notas, url: c.url, local: c.local,
    localizacao: loc ? { ...loc, aviso: loc.aviso as "" | "entrar" | "sair" } : null,
    data: c.data ?? "", hora: c.hora ?? "", horaFim: c.horaFim ?? "",
    repeticao: r ? { tipo: r.tipo as never, intervalo: r.intervalo, unidade: r.unidade as never, diasSemana: r.diasSemana, fim: { tipo: r.fim.tipo as never, data: r.fim.data, vezes: r.fim.vezes } } : null,
    alerta: c.alertaMinutos, prioridade: c.prioridade as Formulario["prioridade"], sinalizado: c.sinalizado, etiquetas: c.etiquetas,
    subtarefas: subtarefasDe(c).map((s) => ({ id: s.id, titulo: s.titulo, concluida: s.concluida })),
    pessoas, avaliacaoTipo: c.avaliacaoTipo as Formulario["avaliacaoTipo"], colunaId: c.colunaId ?? "",
    vinculoTela: c.vinculoTela ?? "", vinculoTitulo: c.vinculoTitulo ?? ""
  };
}

/**
 * O que gravar a partir do formulário. `atual` nulo = criando. Regras (as da tela, agora no servidor):
 * - só o gestor muda pessoas e o tipo de avaliação; o tipo não muda depois da primeira nota;
 * - âncora da repetição: nasce com a data; se a data muda e a âncora era a data antiga, vai junto (M5);
 *   `feitas` é do servidor (a tela não escolhe);
 * - mudou data, hora ou alerta: a soneca de todos deixa de valer.
 */
export function montar(f: Formulario, atual: { c: LinhaCompromisso; pessoas: Pessoa[]; acesso: R.Acesso; notas: number } | null) {
  const c = atual?.c;
  const gestor = !atual || atual.acesso.gestor;
  const pessoas = gestor ? R.normalizarPessoas(f.pessoas) : atual.pessoas;
  const avaliacaoTipo = !c ? f.avaliacaoTipo : !gestor || atual.notas > 0 ? c.avaliacaoTipo : f.avaliacaoTipo;

  const data = nuloSeVazio(f.data);
  const r = f.repeticao && f.repeticao.tipo !== "nunca" ? f.repeticao : null;
  let ancora: string | null = null;
  if (r) {
    const antiga = c?.repeticaoTipo ? c.repeticaoAncora : null;
    ancora = antiga && !(c && c.data !== data && antiga === c.data) ? antiga : data;
  }
  const anteriores = new Map(c ? subtarefasDe(c).map((s) => [s.id, s]) : []);
  const agora = new Date().toISOString();
  const subtarefas: Subtarefa[] = f.subtarefas.map((s) => {
    const antes = s.id ? anteriores.get(s.id) : undefined;
    return {
      id: s.id || "sub-" + randomUUID(), titulo: s.titulo.trim(), concluida: s.concluida,
      concluidaEm: s.concluida ? (antes?.concluida && antes.concluidaEm ? antes.concluidaEm : agora) : ""
    };
  });
  const loc = f.localizacao && (Number.isFinite(f.localizacao.lat) || f.localizacao.aviso) ? f.localizacao : null;

  const linha = {
    grupoId: f.grupoId, titulo: f.titulo.trim(), notas: f.notas.trim(), url: f.url.trim(), local: f.local.trim(),
    localLat: loc && loc.lat !== undefined ? loc.lat.toFixed(6) : null,
    localLng: loc && loc.lng !== undefined ? loc.lng.toFixed(6) : null,
    localAviso: loc?.aviso ?? "", localRaio: loc ? loc.raio : null,
    data, hora: nuloSeVazio(f.hora), horaFim: nuloSeVazio(f.horaFim),
    repeticaoTipo: r?.tipo ?? null, repeticaoIntervalo: r?.intervalo ?? 1, repeticaoUnidade: r?.unidade ?? "semana",
    repeticaoDiasSemana: r ? [...new Set(r.diasSemana)].sort() : [],
    repeticaoFimTipo: r?.fim.tipo ?? "nunca",
    repeticaoFimData: r && r.fim.tipo === "data" ? nuloSeVazio(r.fim.data) : null,
    repeticaoFimVezes: r && r.fim.tipo === "vezes" ? r.fim.vezes : null,
    repeticaoFeitas: r && c?.repeticaoTipo ? c.repeticaoFeitas : 0,
    repeticaoAncora: ancora,
    alertaMinutos: f.alerta, prioridade: f.prioridade, sinalizado: f.sinalizado,
    etiquetas: R.normalizarEtiquetas(f.etiquetas), subtarefas, avaliacaoTipo, colunaId: nuloSeVazio(f.colunaId),
    // Tela ligada: o nome só vale com o endereço; sem nome, mostra "Abrir a tela".
    vinculoTela: nuloSeVazio(f.vinculoTela), vinculoTitulo: f.vinculoTela ? nuloSeVazio(f.vinculoTitulo.trim()) : null
  } satisfies Partial<NovoCompromisso>;

  const erro = R.validar({
    titulo: linha.titulo, url: linha.url, data: f.data, hora: f.hora, horaFim: f.horaFim,
    repeticao: r ? { tipo: r.tipo, intervalo: r.intervalo, fim: r.fim } : null,
    alerta: f.alerta, prioridade: f.prioridade, subtarefas,
    localizacao: loc ? { ...(loc.lat !== undefined ? { lat: loc.lat } : {}), ...(loc.lng !== undefined ? { lng: loc.lng } : {}), aviso: loc.aviso, raio: loc.raio } : null,
    avaliacao: { tipo: avaliacaoTipo }
  });
  if (erro) throw invalido(erro);
  const limparSoneca = Boolean(c && (c.data !== linha.data || c.hora !== linha.hora || c.alertaMinutos !== linha.alertaMinutos));
  const pessoasMudaram = !atual || JSON.stringify(pessoas) !== JSON.stringify(atual.pessoas);
  return { linha, pessoas, limparSoneca, pessoasMudaram };
}

/** Lista existe, não foi excluída e (criando ou levando para ela) a pessoa é membro ou dona. */
async function conferirGrupo(tx: TransacaoBanco, perfil: PerfilSessao, grupoId: string, exigirMembro: boolean) {
  const g = await repo.grupo(tx, perfil.empresa.id, grupoId);
  if (!g || g.excluidoEm) throw invalido("Escolha a lista do compromisso.");
  if (exigirMembro && g.donoId !== perfil.usuarioId && !(await repo.ehMembro(tx, perfil.empresa.id, grupoId, perfil.usuarioId))) {
    throw proibido("Você não participa desta lista.", "AGENDA_SEM_ACESSO");
  }
}

async function conferirReferencias(tx: TransacaoBanco, perfil: PerfilSessao, colunaId: string | null, pessoas: Pessoa[]) {
  if (colunaId && !(await repo.coluna(tx, perfil.empresa.id, colunaId))) throw invalido("Coluna do quadro não encontrada.");
  const ids = pessoas.map((p) => p.id);
  const contas = await repo.contasDaEmpresa(tx, perfil.empresa.id, ids);
  if (ids.some((id) => !contas.has(id))) throw invalido("Uma das pessoas escolhidas não é conta desta empresa.");
}

/* ---------- Criar, editar, mudar ---------- */

/** Cria com o id do aparelho. Repetir o mesmo pedido devolve o já criado. Gestor = quem está logado, sempre. */
export async function criar(perfil: PerfilSessao, entrada: CompromissoCriacao) {
  const empresaId = perfil.empresa.id;
  return gravar(perfil, async (tx) => {
    const existente = await repo.compromisso(tx, empresaId, entrada.id);
    if (existente) {
      if (existente.gestorId === perfil.usuarioId && !existente.excluidoEm) return { criado: false, compromisso: await respostaDe(tx, perfil, existente) };
      throw conflito("Este identificador já foi usado. Recarregue a Agenda e tente de novo.", "AGENDA_ID_EM_USO");
    }
    const { id, ...form } = entrada;
    const m = montar(form, null);
    await conferirGrupo(tx, perfil, m.linha.grupoId, true);
    await conferirReferencias(tx, perfil, m.linha.colunaId, m.pessoas);
    const ordem = (await repo.maiorOrdem(tx, empresaId, m.linha.grupoId)) + 1;
    await repo.inserirCompromisso(tx, {
      ...m.linha, empresaId, id, gestorId: perfil.usuarioId, ordem: String(ordem), criadoPor: perfil.usuarioId, atualizadoPor: perfil.usuarioId
    });
    await repo.trocarParticipantes(tx, empresaId, id, perfil.usuarioId, m.pessoas);
    return { criado: true, compromisso: await respostaDe(tx, perfil, (await repo.compromisso(tx, empresaId, id))!) };
  });
}

/** Formulário inteiro. */
export async function editar(perfil: PerfilSessao, id: string, entrada: CompromissoEdicao) {
  const { versao, ...form } = entrada;
  return aplicar(perfil, id, versao, () => form);
}

/** Mudança parcial: o formulário atual com os campos pedidos, pelo MESMO caminho do formulário. */
export async function mudar(perfil: PerfilSessao, id: string, entrada: CompromissoMudanca) {
  const { versao, antesDe, ...campos } = entrada;
  return aplicar(perfil, id, versao, (atual, pessoas) => {
    const f = formularioDe(atual, pessoas);
    const definidos = Object.fromEntries(Object.entries(campos).filter(([, v]) => v !== undefined)) as Partial<Formulario>;
    const novo: Formulario = { ...f, ...definidos };
    // Tirar a data (arrastar para "sem data" no mapa): sai também o que depende dela.
    if (campos.data === "" && campos.hora === undefined) Object.assign(novo, { hora: "", horaFim: "", repeticao: null, alerta: null });
    return novo;
  }, { antesDe, reabrirSeMudarColuna: campos.colunaId !== undefined });
}

async function aplicar(
  perfil: PerfilSessao, id: string, versao: number,
  formulario: (atual: LinhaCompromisso, pessoas: Pessoa[]) => Formulario,
  extra: { antesDe?: string | null | undefined; reabrirSeMudarColuna?: boolean } = {}
) {
  const empresaId = perfil.empresa.id;
  return gravar(perfil, async (tx) => {
    const atual = await carregar(tx, perfil, id, "editar");
    await conferirVersao(tx, perfil, atual.c, versao);
    const notas = (await repo.avaliacoesDe(tx, empresaId, [id])).length;
    const m = montar(formulario(atual.c, atual.pessoas), { ...atual, notas });
    if (m.linha.grupoId !== atual.c.grupoId) await conferirGrupo(tx, perfil, m.linha.grupoId, true);
    await conferirReferencias(tx, perfil, m.linha.colunaId, m.pessoasMudaram ? m.pessoas : []);

    const dados: Partial<NovoCompromisso> = { ...m.linha, atualizadoPor: perfil.usuarioId };
    // Kanban: levar um cartão concluído para outra coluna reabre (precisa de "Concluir").
    if (extra.reabrirSeMudarColuna && atual.c.concluida) {
      if (!atual.acesso.concluir) throw semAcesso("concluir");
      Object.assign(dados, { concluida: false, concluidaEm: null, concluidaPor: null });
    }
    if (m.linha.grupoId !== atual.c.grupoId) dados.ordem = String((await repo.maiorOrdem(tx, empresaId, m.linha.grupoId)) + 1);
    if (extra.antesDe !== undefined) dados.ordem = String(await novaOrdem(tx, empresaId, m.linha.grupoId, id, extra.antesDe));

    const linha = await repo.atualizarCompromisso(tx, empresaId, id, dados);
    if (m.pessoasMudaram) await repo.trocarParticipantes(tx, empresaId, id, perfil.usuarioId, m.pessoas);
    if (m.limparSoneca) await repo.limparAdiamentos(tx, empresaId, id);
    return respostaDe(tx, perfil, linha);
  });
}

/** Ordem manual fracionária: entre o anterior e `antesDe` (ou no fim). Muda só este compromisso. */
async function novaOrdem(tx: TransacaoBanco, empresaId: string, grupoId: string, id: string, antesDe: string | null) {
  if (!antesDe || antesDe === id) return (await repo.maiorOrdem(tx, empresaId, grupoId)) + 1;
  const alvo = await repo.compromisso(tx, empresaId, antesDe);
  if (!alvo || alvo.grupoId !== grupoId) return (await repo.maiorOrdem(tx, empresaId, grupoId)) + 1;
  const anterior = await repo.ordemAnterior(tx, empresaId, grupoId, alvo.ordem, id);
  const depois = Number(alvo.ordem);
  return anterior === null ? depois - 1 : (anterior + depois) / 2;
}

/* ---------- Concluir ---------- */

const duracao = (hora: string | null, horaFim: string | null) => {
  const min = (h: string) => +h.slice(0, 2) * 60 + +h.slice(3, 5);
  return hora && horaFim ? min(horaFim) - min(hora) : 0;
};
function horaFimCom(hora: string | null | undefined, dur: number) {
  if (!hora || !dur) return null;
  const fim = Math.min(1439, +hora.slice(0, 2) * 60 + +hora.slice(3, 5) + dur);
  const h = String(Math.floor(fim / 60)).padStart(2, "0") + ":" + String(fim % 60).padStart(2, "0");
  return h > hora ? h : null;
}

/**
 * Pelo ESTADO desejado (M2/M4). Concluir um que repete: fica uma cópia concluída (id fixo `<id>-c<n>`, com a
 * ocorrência) e ele passa para a próxima data, subtarefas desmarcadas. Na última vez, ele mesmo é concluído.
 * Pedido repetido ou cartão velho (ocorrência que já passou) não muda nada.
 */
export async function concluir(perfil: PerfilSessao, id: string, pedido: Conclusao) {
  const empresaId = perfil.empresa.id;
  return gravar(perfil, async (tx) => {
    const { c, pessoas } = await carregar(tx, perfil, id, "concluir");
    const sem = async () => ({ resultado: "sem-mudanca" as const, compromisso: await respostaDe(tx, perfil, c), copia: null });
    const agora = new Date();

    if (!pedido.concluida) {
      if (!c.concluida) return sem();
      const linha = await repo.atualizarCompromisso(tx, empresaId, id, { concluida: false, concluidaEm: null, concluidaPor: null, atualizadoPor: perfil.usuarioId });
      return { resultado: "reabriu" as const, compromisso: await respostaDe(tx, perfil, linha), copia: null };
    }
    if (c.concluida) return sem();

    if (c.repeticaoTipo && c.data) {
      if (!pedido.ocorrencia) throw invalido("Informe qual ocorrência foi concluída.");
      if (pedido.ocorrencia !== c.data) return sem(); // essa ocorrência já foi concluída (segundo toque ou cartão velho)
      const p = R.proxima(paraRegra(c, pessoas, []));
      if (p) {
        if (await repo.copiaDaOcorrencia(tx, empresaId, id, c.data)) return sem();
        const n = c.repeticaoFeitas + 1;
        const copiaId = (id + "-c" + n).length <= 100 ? id + "-c" + n : "ag-" + randomUUID();
        await repo.inserirCompromisso(tx, {
          ...c, versao: 1, criadoEm: agora, atualizadoEm: agora, id: copiaId, repeticaoTipo: null, repeticaoIntervalo: 1, repeticaoUnidade: "semana", repeticaoDiasSemana: [],
          repeticaoFimTipo: "nunca", repeticaoFimData: null, repeticaoFimVezes: null, repeticaoFeitas: 0, repeticaoAncora: null,
          alertaMinutos: null, concluida: true, concluidaEm: agora, concluidaPor: perfil.usuarioId, origemId: id, ocorrencia: c.data,
          legado: {}, criadoPor: perfil.usuarioId, atualizadoPor: perfil.usuarioId
        });
        await repo.trocarParticipantes(tx, empresaId, copiaId, perfil.usuarioId, pessoas);
        const linha = await repo.atualizarCompromisso(tx, empresaId, id, {
          repeticaoFeitas: n, data: p.data, hora: p.hora || null, horaFim: horaFimCom(p.hora || null, duracao(c.hora, c.horaFim)),
          subtarefas: subtarefasDe(c).map((s) => ({ ...s, concluida: false, concluidaEm: "" })), atualizadoPor: perfil.usuarioId
        });
        await repo.limparAdiamentos(tx, empresaId, id);
        await registrarHoraFora(tx, perfil, copiaId, agora);
        const copia = (await repo.compromisso(tx, empresaId, copiaId))!;
        return { resultado: "repetiu" as const, compromisso: await respostaDe(tx, perfil, linha), copia: await respostaDe(tx, perfil, copia) };
      }
    }
    const linha = await repo.atualizarCompromisso(tx, empresaId, id, { concluida: true, concluidaEm: agora, concluidaPor: perfil.usuarioId, atualizadoPor: perfil.usuarioId });
    await repo.limparAdiamentos(tx, empresaId, id);
    await registrarHoraFora(tx, perfil, id, agora);
    return { resultado: "concluiu" as const, compromisso: await respostaDe(tx, perfil, linha), copia: null };
  });
}

/** Subtarefa marcada/desmarcada pelo estado desejado. */
export async function marcarSubtarefa(perfil: PerfilSessao, id: string, subId: string, concluida: boolean) {
  const empresaId = perfil.empresa.id;
  return gravar(perfil, async (tx) => {
    const { c } = await carregar(tx, perfil, id, "concluir");
    const subs = subtarefasDe(c);
    const s = subs.find((x) => x.id === subId);
    if (!s) throw new ErroDominio("Subtarefa não encontrada.", 404, "AGENDA_SUBTAREFA_NAO_ENCONTRADA");
    if (s.concluida === concluida) return respostaDe(tx, perfil, c);
    const novas = subs.map((x) => (x.id === subId ? { ...x, concluida, concluidaEm: concluida ? new Date().toISOString() : "" } : x));
    return respostaDe(tx, perfil, await repo.atualizarCompromisso(tx, empresaId, id, { subtarefas: novas, atualizadoPor: perfil.usuarioId }));
  });
}

/* ---------- Excluir (esconder) ---------- */

export async function excluir(perfil: PerfilSessao, id: string, versao: number) {
  const empresaId = perfil.empresa.id;
  await gravar(perfil, async (tx) => {
    const { c } = await carregar(tx, perfil, id, "excluir");
    await conferirVersao(tx, perfil, c, versao);
    await repo.atualizarCompromisso(tx, empresaId, id, { excluidoEm: new Date(), excluidoPor: perfil.usuarioId, atualizadoPor: perfil.usuarioId });
    await repo.excluirRelacoesDe(tx, empresaId, [id]);
  });
}

/** "Limpar" do Lembretes: esconde os concluídos (de uma lista ou de todas) que a pessoa pode excluir. */
export async function limparConcluidos(perfil: PerfilSessao, grupoId?: string) {
  const empresaId = perfil.empresa.id;
  return gravar(perfil, async (tx) => {
    const itens = await repo.concluidosVisiveis(tx, empresaId, perfil.usuarioId, grupoId);
    const ps = await repo.participantesDe(tx, empresaId, itens.map((c) => c.id));
    const ids = itens
      .filter((c) => acessoDe(c, pessoasDe(ps.filter((p) => p.compromissoId === c.id)), perfil.usuarioId).excluir)
      .map((c) => c.id);
    const agora = new Date();
    for (const id of ids) await repo.atualizarCompromisso(tx, empresaId, id, { excluidoEm: agora, excluidoPor: perfil.usuarioId, atualizadoPor: perfil.usuarioId });
    await repo.excluirRelacoesDe(tx, empresaId, ids);
    return { excluidos: ids.length };
  });
}
