import { randomUUID } from "node:crypto";
import { AgendaRegras as R } from "@cicluz/shared";
import type {
  agendaAvaliacoes,
  agendaColunas,
  agendaCompromissos,
  agendaGrupoMembros,
  agendaGrupos,
  agendaParticipantes,
  agendaRelacoes
} from "@cicluz/db/schema";

// Conversão do documento "cicluz-agenda-v1" para as tabelas (plano docs/AGENDA_NO_SERVIDOR_PLANO.md, seção 4).
// Puro: não lê nem grava banco. Regra de ouro: cada coisa do documento vai para a tabela OU para a pendência,
// nunca para nenhum dos dois; o que a tabela não tem lugar fica em `legado` (nada se perde).
// Decisões do Zé (23/11/2026): compromisso cuja lista não existe vai para a primeira lista e entra na pendência;
// duas listas com o mesmo nome: a segunda ganha " (2)" e entra na pendência.

export type Pendencia = { tipo: string; id?: string; titulo?: string; detalhe: string };
type Contagem = Record<string, number>;

/* Iniciais da tela (dist/agenda/dados.js): a Agenda sem documento abre com estas listas e colunas. */
export const LISTAS_INICIAIS = [
  { id: "lista-gestao-pessoas", nome: "Gestão de Pessoas", cor: "#7c3aed", icone: "pessoas", ordenacao: "manual" },
  { id: "lista-diretor-operacoes", nome: "Diretor de Operações", cor: "#2563eb", icone: "operacao", ordenacao: "manual" }
];
export const COLUNAS_INICIAIS = [{ id: "col-a-fazer", nome: "A fazer" }, { id: "col-em-progresso", nome: "Em progresso" }];
const COR_PADRAO = "#7c3aed";

export type Existentes = {
  grupos: Set<string>; nomesGrupos: Set<string>;
  colunas: Set<string>; nomesColunas: Set<string>;
  /** id → versão e quando mudou por último (retransferência: só atualiza o que ninguém mexeu pela tela nova). */
  compromissos: Map<string, { versao: number; atualizadoEm: Date }>;
  relacoes: Set<string>; pares: Set<string>; ocorrencias: Set<string>; notas: Set<string>;
};
export const nadaExistente = (): Existentes => ({
  grupos: new Set(), nomesGrupos: new Set(), colunas: new Set(), nomesColunas: new Set(), compromissos: new Map(),
  relacoes: new Set(), pares: new Set(), ocorrencias: new Set(), notas: new Set()
});

export type Contexto = {
  empresaId: string;
  /** Quem transfere: dono das listas (pergunta 3) e autor das linhas. */
  adminId: string;
  /** Gestor dos compromissos sem criador (feitos antes do login) e dos criados por id que não é conta (pergunta 7). */
  gestorSemCriador: string;
  /** "de → para" dos ids que não são conta (lista provisória u-jose, u-rodrigo, u-ana…). null = fica sem ligação. */
  dePara: Record<string, string | null>;
  /** Todas as contas da empresa (pessoa = conta da mesma empresa). */
  contas: Set<string>;
  /** Membros iniciais das listas: todas as contas ativas (pergunta 4). */
  contasAtivas: string[];
  existentes: Existentes;
};

type NovoGrupo = typeof agendaGrupos.$inferInsert;
type NovoCompromisso = typeof agendaCompromissos.$inferInsert;
type NovoParticipante = typeof agendaParticipantes.$inferInsert;

export type Conversao = {
  grupos: NovoGrupo[];
  membros: Array<typeof agendaGrupoMembros.$inferInsert>;
  colunas: Array<typeof agendaColunas.$inferInsert>;
  /** Na ordem de inserir (o original antes da cópia da repetição). */
  compromissos: NovoCompromisso[];
  /** Retransferência: compromissos que mudaram no documento e ninguém mexeu pela tela nova. */
  atualizar: NovoCompromisso[];
  participantes: NovoParticipante[];
  avaliacoes: Array<typeof agendaAvaliacoes.$inferInsert>;
  relacoes: Array<typeof agendaRelacoes.$inferInsert>;
  pendencias: Pendencia[];
  /** O que o documento tem. */
  antes: Contagem;
  /** Para onde cada coisa foi: tabela (nova, já estava ou atualizada) ou pendência. */
  destino: Record<string, { tabela: number; pendencia: number }>;
  /** Ids que precisam estar na tabela no fim (a conferência no banco usa isto). */
  esperados: { grupos: string[]; colunas: string[]; compromissos: string[]; relacoes: string[] };
  idsSemConta: Array<{ id: string; usos: number }>;
  itensSemCriador: number;
};

/* ---------- Leitura tolerante ---------- */

type Obj = Record<string, unknown>;
const obj = (x: unknown): Obj => (x && typeof x === "object" && !Array.isArray(x) ? (x as Obj) : {});
const lista = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);
const txt = (x: unknown) => (typeof x === "string" ? x : x === undefined || x === null ? "" : String(x));
const ID = /^[A-Za-z0-9_-]{1,100}$/;
const idValido = (x: unknown): x is string => typeof x === "string" && ID.test(x);
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const COR = /^#[0-9a-fA-F]{6}$/;
const ICONE = /^[a-z0-9-]{1,30}$/;
const ORDENACOES = ["manual", "data", "criacao", "prioridade", "titulo"];
const REPETICOES = ["hora", "dia", "dias-uteis", "fins-de-semana", "semana", "quinzena", "mes", "trimestre", "semestre", "ano", "personalizada"];
const PRIORIDADES = ["muito-baixa", "baixa", "normal", "alta", "muito-alta"];
const TIPOS_AVALIACAO = ["estrelas", "niveis", "nps", "feito"];
const chaveNome = (s: string) => s.trim().toLocaleLowerCase("pt-BR");
const dataOk = (x: unknown): string | null => (typeof x === "string" && R.dataValida(x) ? x : null);
const instante = (x: unknown): Date | null => {
  if (typeof x !== "string" || !x) return null;
  const d = new Date(x);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Nome que não colide: "Loja", "Loja (2)", "Loja (3)"… */
function nomeLivre(nome: string, usados: Set<string>, max: number) {
  if (!usados.has(chaveNome(nome))) return nome;
  for (let n = 2; ; n++) {
    const sufixo = ` (${n})`;
    const candidato = nome.slice(0, max - sufixo.length) + sufixo;
    if (!usados.has(chaveNome(candidato))) return candidato;
  }
}

/* ---------- Conversão ---------- */

export function converter(documento: unknown, ctx: Contexto): Conversao {
  const doc = documento === null ? { listas: LISTAS_INICIAIS, colunas: COLUNAS_INICIAIS, itens: [], relacoes: [] } : obj(documento);
  const ex = ctx.existentes;
  const p: Pendencia[] = [];
  const destino: Conversao["destino"] = {};
  const conta = (cat: string, onde: "tabela" | "pendencia") => {
    destino[cat] ??= { tabela: 0, pendencia: 0 };
    destino[cat][onde] += 1;
  };
  const agora = new Date();
  const autor = { criadoPor: ctx.adminId, atualizadoPor: ctx.adminId };
  const semConta = new Map<string, number>();
  /** Id de pessoa → conta da empresa (ou null). Conta = ela mesma; senão o "de → para". */
  const pessoa = (id: string): string | null => {
    if (ctx.contas.has(id)) return id;
    semConta.set(id, (semConta.get(id) ?? 0) + 1);
    const para = ctx.dePara[id];
    return para && ctx.contas.has(para) ? para : null;
  };

  /* Listas */
  const listasDoc = lista(doc["listas"]);
  const grupos: NovoGrupo[] = [];
  const idsGrupos: string[] = [];
  const nomesUsados = new Set(ex.nomesGrupos);
  listasDoc.forEach((bruta, ordem) => {
    const l = obj(bruta);
    const id = l["id"];
    if (!idValido(id)) { p.push({ tipo: "lista", detalhe: "Lista com identificador inválido: " + JSON.stringify(id ?? null) }); conta("listas", "pendencia"); return; }
    if (idsGrupos.includes(id)) { p.push({ tipo: "lista", id, detalhe: "Lista repetida no documento (a primeira valeu)." }); conta("listas", "pendencia"); return; }
    idsGrupos.push(id);
    conta("listas", "tabela");
    if (ex.grupos.has(id)) return; // já transferida antes
    let nome = txt(l["nome"]).trim().slice(0, 40) || "Lista sem nome";
    if (nome !== txt(l["nome"]).trim()) p.push({ tipo: "lista", id, titulo: nome, detalhe: `Nome ajustado (era ${JSON.stringify(l["nome"] ?? "")}).` });
    const livre = nomeLivre(nome, nomesUsados, 40);
    if (livre !== nome) { p.push({ tipo: "lista", id, titulo: livre, detalhe: `Já havia uma lista "${nome}"; esta virou "${livre}".` }); nome = livre; }
    nomesUsados.add(chaveNome(nome));
    let cor = txt(l["cor"]);
    if (!COR.test(cor)) { p.push({ tipo: "lista", id, titulo: nome, detalhe: `Cor ${JSON.stringify(cor)} não é #rrggbb; ficou ${COR_PADRAO}.` }); cor = COR_PADRAO; }
    const icone = ICONE.test(txt(l["icone"])) ? txt(l["icone"]) : "lista";
    const ordenacao = ORDENACOES.includes(txt(l["ordenacao"])) ? txt(l["ordenacao"]) : "manual";
    grupos.push({ empresaId: ctx.empresaId, id, nome, cor, icone, ordenacao, ordem, donoId: ctx.adminId, ...autor });
  });
  // Sem nenhuma lista, a Agenda não abre: entram as iniciais (como a tela faz na memória).
  if (!idsGrupos.length && !ex.grupos.size) {
    LISTAS_INICIAIS.forEach((l, ordem) => {
      grupos.push({ empresaId: ctx.empresaId, ...l, ordem, donoId: ctx.adminId, ...autor });
      idsGrupos.push(l.id);
    });
  }
  const gruposValidos = new Set([...ex.grupos, ...idsGrupos]);
  const primeiraLista = idsGrupos[0] ?? [...ex.grupos][0]!;
  const membros = grupos.flatMap((g) => ctx.contasAtivas.map((usuarioId) => ({ empresaId: ctx.empresaId, grupoId: g.id!, usuarioId, origem: "transferencia", criadoPor: ctx.adminId })));

  /* Colunas */
  const colunasDoc = lista(doc["colunas"]);
  const fonteColunas = colunasDoc.length ? colunasDoc : ex.colunas.size ? [] : COLUNAS_INICIAIS;
  const colunas: Conversao["colunas"] = [];
  const idsColunas: string[] = [];
  const nomesColunas = new Set(ex.nomesColunas);
  fonteColunas.forEach((bruta, ordem) => {
    const c = obj(bruta);
    const id = c["id"];
    if (!idValido(id) || id === "concluido" || idsColunas.includes(id)) {
      p.push({ tipo: "coluna", detalhe: "Coluna com identificador inválido ou repetido: " + JSON.stringify(id ?? null) });
      if (colunasDoc.length) conta("colunas", "pendencia");
      return;
    }
    idsColunas.push(id);
    if (colunasDoc.length) conta("colunas", "tabela");
    if (ex.colunas.has(id)) return;
    let nome = txt(c["nome"]).trim().slice(0, 30) || "Coluna";
    if (chaveNome(nome) === "concluído") nome = "Concluído (antiga)";
    const livre = nomeLivre(nome, nomesColunas, 30);
    if (livre !== nome) { p.push({ tipo: "coluna", id, titulo: livre, detalhe: `Já havia uma coluna "${nome}"; esta virou "${livre}".` }); nome = livre; }
    nomesColunas.add(chaveNome(nome));
    colunas.push({ empresaId: ctx.empresaId, id, nome, ordem, ...autor });
  });
  const colunasValidas = new Set([...ex.colunas, ...idsColunas]);

  /* Compromissos */
  const itensDoc = lista(doc["itens"]).map(obj);
  const idsItens = new Set<string>();
  const itensOk: Obj[] = [];
  itensDoc.forEach((i) => {
    const id = i["id"];
    if (!idValido(id) || idsItens.has(id)) {
      p.push({ tipo: "compromisso", titulo: txt(i["titulo"]).slice(0, 80), detalhe: "Compromisso com identificador inválido ou repetido: " + JSON.stringify(id ?? null) });
      conta("itens", "pendencia");
      return;
    }
    idsItens.add(id);
    itensOk.push(i);
  });
  // Original antes da cópia (a cópia aponta para ele).
  itensOk.sort((a, b) => Number(Boolean(a["origemId"])) - Number(Boolean(b["origemId"])));

  const compromissos: NovoCompromisso[] = [];
  const atualizar: NovoCompromisso[] = [];
  const participantes: NovoParticipante[] = [];
  const avaliacoes: Conversao["avaliacoes"] = [];
  const ocorrencias = new Set(ex.ocorrencias);
  let itensSemCriador = 0;
  const conhecidos = new Set(["id", "listaId", "titulo", "notas", "url", "local", "localizacao", "data", "hora", "horaFim", "repeticao", "alerta",
    "adiadoPara", "prioridade", "sinalizado", "etiquetas", "subtarefas", "pessoas", "responsavelId", "avaliacao", "colunaId", "ordem", "concluida",
    "concluidaEm", "origemId", "criadoEm", "criadoPor", "atualizadoEm"]);

  for (const i of itensOk) {
    const id = i["id"] as string;
    const titulo0 = txt(i["titulo"]).trim();
    const legado: Obj = {};
    const ajuste = (campo: string, detalhe: string) => { legado[campo] = i[campo] ?? null; p.push({ tipo: "compromisso", id, titulo: titulo0.slice(0, 80), detalhe }); };
    Object.keys(i).filter((k) => !conhecidos.has(k)).forEach((k) => { legado[k] = i[k]; });

    // Lista
    let grupoId = txt(i["listaId"]);
    if (!gruposValidos.has(grupoId)) { ajuste("listaId", `A lista ${JSON.stringify(grupoId)} não existe mais; foi para a primeira lista.`); grupoId = primeiraLista; }
    // Título
    let titulo = titulo0;
    if (!titulo) { ajuste("titulo", "Compromisso sem título; ficou \"(sem título)\"."); titulo = "(sem título)"; }
    if (titulo.length > 200) { ajuste("titulo", "Título com mais de 200 letras; foi cortado."); titulo = titulo.slice(0, 200); }
    // Quando
    const data = dataOk(i["data"]);
    if (i["data"] && !data) ajuste("data", "Data inválida; ficou sem data.");
    const hora: string | null = HORA.test(txt(i["hora"])) && data ? txt(i["hora"]) : null;
    if (i["hora"] && !hora) ajuste("hora", "Hora inválida ou sem data; ficou sem hora.");
    const horaFim: string | null = HORA.test(txt(i["horaFim"])) && hora && txt(i["horaFim"]) > hora ? txt(i["horaFim"]) : null;
    if (i["horaFim"] && !horaFim) ajuste("horaFim", "Término inválido; ficou sem término.");
    // Endereço
    let url = txt(i["url"]).trim();
    if (url && !/^https?:\/\/\S+\.\S+/i.test(url)) { ajuste("url", "Endereço sem http:// ou https://; foi guardado à parte."); url = ""; }
    // Lugar
    const loc = obj(i["localizacao"]);
    const lat = typeof loc["lat"] === "number" && Math.abs(loc["lat"]) <= 90 ? loc["lat"] : null;
    const lng = typeof loc["lng"] === "number" && Math.abs(loc["lng"]) <= 180 ? loc["lng"] : null;
    const raio = Number(loc["raio"]);
    let aviso = ["entrar", "sair"].includes(txt(loc["aviso"])) ? txt(loc["aviso"]) : "";
    if (aviso && (lat === null || lng === null || !(raio >= 50 && raio <= 50000))) { ajuste("localizacao", "Aviso por lugar sem ponto ou raio válido; ficou sem aviso."); aviso = ""; }
    // Repetição
    const r = obj(i["repeticao"]);
    let tipo: string | null = REPETICOES.includes(txt(r["tipo"])) ? txt(r["tipo"]) : null;
    if (r["tipo"] && r["tipo"] !== "nunca" && !tipo) ajuste("repeticao", "Repetição de tipo desconhecido; ficou sem repetir.");
    if (tipo && (!data || (tipo === "hora" && !hora))) { ajuste("repeticao", "Repetição sem data (ou sem hora, de hora em hora); ficou sem repetir."); tipo = null; }
    const fim = obj(r["fim"]);
    let fimTipo = ["data", "vezes"].includes(txt(fim["tipo"])) ? txt(fim["tipo"]) : "nunca";
    const fimData = fimTipo === "data" ? dataOk(fim["data"]) : null;
    const fimVezes = fimTipo === "vezes" && Number.isInteger(Number(fim["vezes"])) && Number(fim["vezes"]) >= 1 && Number(fim["vezes"]) <= 999 ? Number(fim["vezes"]) : null;
    if ((fimTipo === "data" && !fimData) || (fimTipo === "vezes" && !fimVezes)) { if (tipo) ajuste("repeticao", "Fim da repetição inválido; passou a repetir sem fim."); fimTipo = "nunca"; }
    // Alerta
    const alertaN = i["alerta"] === null || i["alerta"] === undefined || i["alerta"] === "" ? null : Number(i["alerta"]);
    const alerta = alertaN !== null && Number.isInteger(alertaN) && alertaN >= 0 && alertaN <= 40320 && data ? alertaN : null;
    if (alertaN !== null && alerta === null) ajuste("alerta", "Alerta inválido ou sem data; ficou sem alerta.");
    // Soneca: era temporária; o alerta volta ao normal (fica guardada no legado).
    if (i["adiadoPara"]) legado["adiadoPara"] = i["adiadoPara"];
    // Origem (cópia concluída de uma repetição)
    let origemId: string | null = null;
    let ocorrencia: string | null = null;
    if (i["origemId"]) {
      const o = txt(i["origemId"]);
      if (idsItens.has(o) || ex.compromissos.has(o)) {
        origemId = o;
        const chave = o + "|" + (data ?? "");
        if (data && !ocorrencias.has(chave)) { ocorrencia = data; ocorrencias.add(chave); }
        else ajuste("origemId", "Cópia repetida da mesma ocorrência (duplo toque antigo); entrou sem ocorrência.");
      } else ajuste("origemId", "Cópia de um compromisso que não existe mais; ficou como compromisso solto.");
      if (origemId && tipo) { ajuste("repeticao", "Cópia de repetição não repete; a repetição foi guardada à parte."); tipo = null; }
    }
    // Avaliação
    const av = obj(i["avaliacao"]);
    const avaliacaoTipo = TIPOS_AVALIACAO.includes(txt(av["tipo"])) ? txt(av["tipo"]) : "";
    if (av["tipo"] && !avaliacaoTipo) ajuste("avaliacao", "Tipo de avaliação desconhecido; ficou sem avaliação.");
    // Coluna
    let colunaId: string | null = txt(i["colunaId"]) || null;
    if (colunaId && !colunasValidas.has(colunaId)) { legado["colunaId"] = colunaId; colunaId = null; }
    // Concluído
    const concluida = Boolean(i["concluida"]);
    const atualizadoEm = instante(i["atualizadoEm"]) ?? agora;
    const concluidaEm = concluida ? instante(i["concluidaEm"]) ?? atualizadoEm : null;
    // Gestor
    const criadoPor = txt(i["criadoPor"]);
    let gestorId: string;
    let semCriador = false;
    if (!criadoPor) { gestorId = ctx.gestorSemCriador; semCriador = true; itensSemCriador += 1; }
    else {
      const g = pessoa(criadoPor);
      if (g) gestorId = g;
      else { gestorId = ctx.gestorSemCriador; legado["criadoPor"] = criadoPor; p.push({ tipo: "compromisso", id, titulo: titulo.slice(0, 80), detalhe: `Criado por ${JSON.stringify(criadoPor)}, que não é conta; o gestor ficou a conta escolhida para os sem criador.` }); }
    }
    // Pessoas (responsavelId antigo vira responsável, como completar() da tela)
    const pessoasDoc = Array.isArray(i["pessoas"]) ? lista(i["pessoas"]) : i["responsavelId"] ? [R.pessoaResponsavel(txt(i["responsavelId"]))] : [];
    const mapeadas: R.Pessoa[] = [];
    const semContaAqui: unknown[] = [];
    for (const bruta of pessoasDoc) {
      const x = obj(bruta);
      const conta1 = x["id"] ? pessoa(txt(x["id"])) : null;
      if (!conta1) { semContaAqui.push(bruta); conta("pessoas", "pendencia"); continue; }
      if (mapeadas.some((m) => m.id === conta1)) { semContaAqui.push(bruta); conta("pessoas", "pendencia"); continue; }
      mapeadas.push(R.normalizarPessoas([{ ...(x as Partial<R.Pessoa>), id: conta1 }])[0]!);
      conta("pessoas", "tabela");
    }
    if (semContaAqui.length) {
      legado["pessoasSemConta"] = semContaAqui;
      p.push({ tipo: "compromisso", id, titulo: titulo.slice(0, 80), detalhe: `${semContaAqui.length} pessoa(s) sem conta (ou repetidas depois da ligação) guardadas à parte, sem acesso.` });
    }
    // Notas
    const notasDoc = lista(av["notas"]);
    const notasSobra: unknown[] = [];
    for (const bruta of notasDoc) {
      const n = obj(bruta);
      const avaliado = n["avaliadoId"] ? pessoa(txt(n["avaliadoId"])) : null;
      const por = n["porId"] ? pessoa(txt(n["porId"])) : null;
      const papel = txt(n["papel"]);
      const valor = Number(n["valor"]);
      const chave = id + "|" + avaliado + "|" + papel;
      const valida = avaliado && por && ["gestor", "auto"].includes(papel) && (papel !== "auto" || avaliado === por) &&
        avaliacaoTipo && R.valorValido(avaliacaoTipo, valor) && !ex.notas.has(chave) && !avaliacoes.some((a) => a.compromissoId === id && a.avaliadoId === avaliado && a.papel === papel);
      if (!valida) {
        if (ex.notas.has(chave)) { conta("notas", "tabela"); continue; } // já transferida
        notasSobra.push(bruta); conta("notas", "pendencia"); continue;
      }
      avaliacoes.push({ empresaId: ctx.empresaId, compromissoId: id, avaliadoId: avaliado, porId: por, papel, tipo: avaliacaoTipo, valor, comentario: txt(n["comentario"]).slice(0, 500), em: instante(n["em"]) ?? atualizadoEm });
      conta("notas", "tabela");
    }
    if (notasSobra.length) {
      legado["notasSemLugar"] = notasSobra;
      p.push({ tipo: "compromisso", id, titulo: titulo.slice(0, 80), detalhe: `${notasSobra.length} nota(s) de avaliação sem conta ou inválida(s) guardadas à parte.` });
    }

    const subtarefas = lista(i["subtarefas"]).map((b) => {
      const s = obj(b);
      conta("subtarefas", "tabela");
      return { id: idValido(s["id"]) ? s["id"] : "sub-" + randomUUID(), titulo: txt(s["titulo"]).trim().slice(0, 200) || "(sem nome)", concluida: Boolean(s["concluida"]), concluidaEm: txt(s["concluidaEm"]) };
    });

    const linha: NovoCompromisso = {
      empresaId: ctx.empresaId, id, grupoId, gestorId, semCriadorOriginal: semCriador, titulo,
      notas: txt(i["notas"]), url, local: txt(i["local"]),
      localLat: lat !== null ? lat.toFixed(6) : null, localLng: lng !== null ? lng.toFixed(6) : null,
      localAviso: aviso, localRaio: Number.isInteger(raio) && raio >= 0 ? raio : null,
      data, hora, horaFim,
      repeticaoTipo: tipo,
      repeticaoIntervalo: tipo ? Math.min(99, Math.max(1, Math.trunc(Number(r["intervalo"])) || 1)) : 1,
      repeticaoUnidade: tipo && ["dia", "semana", "mes", "ano"].includes(txt(r["unidade"])) ? txt(r["unidade"]) : "semana",
      repeticaoDiasSemana: tipo ? [...new Set(lista(r["diasSemana"]).map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort() : [],
      repeticaoFimTipo: tipo ? fimTipo : "nunca",
      repeticaoFimData: tipo && fimTipo === "data" ? fimData : null,
      repeticaoFimVezes: tipo && fimTipo === "vezes" ? fimVezes : null,
      repeticaoFeitas: tipo ? Math.max(0, Math.trunc(Number(r["feitas"])) || 0) : 0,
      repeticaoAncora: tipo ? dataOk(r["ancora"]) ?? data : null,
      alertaMinutos: alerta, prioridade: PRIORIDADES.includes(txt(i["prioridade"])) ? txt(i["prioridade"]) : "normal",
      sinalizado: Boolean(i["sinalizado"]), etiquetas: R.normalizarEtiquetas(i["etiquetas"]), subtarefas,
      avaliacaoTipo, colunaId, ordem: String(Number.isFinite(Number(i["ordem"])) ? Number(i["ordem"]) : 0),
      concluida, concluidaEm, concluidaPor: null, origemId, ocorrencia, legado,
      criadoEm: instante(i["criadoEm"]) ?? atualizadoEm, atualizadoEm, ...autor
    };
    const pessoasLinhas = mapeadas.map((m, ordem) => ({ empresaId: ctx.empresaId, compromissoId: id, usuarioId: m.id, responsavel: m.responsavel, ver: m.ver, editar: m.editar, concluir: m.concluir, excluir: m.excluir, ordem, criadoPor: ctx.adminId }));

    const jaEsta = ex.compromissos.get(id);
    conta("itens", "tabela");
    if (concluida) conta("concluidos", "tabela");
    if (!jaEsta) { compromissos.push(linha); participantes.push(...pessoasLinhas); continue; }
    // Retransferência: mudou no documento depois da primeira vez? Sem data de alteração no documento = não mudou.
    const mudouEm = instante(i["atualizadoEm"]);
    if (!mudouEm || mudouEm.getTime() <= jaEsta.atualizadoEm.getTime()) continue;
    if (jaEsta.versao === 1) { atualizar.push(linha); participantes.push(...pessoasLinhas); }
    else p.push({ tipo: "compromisso", id, titulo: titulo.slice(0, 80), detalhe: "Mudou no documento antigo e também pela Agenda nova; ficou a versão da Agenda nova. Confira." });
  }

  /* Ligações do mapa */
  const relacoes: Conversao["relacoes"] = [];
  const idsRelacoes: string[] = [];
  const pares = new Set(ex.pares);
  const existe = (x: string) => idsItens.has(x) || ex.compromissos.has(x);
  for (const bruta of lista(doc["relacoes"])) {
    const r = obj(bruta);
    const id = r["id"];
    const de = txt(r["de"]);
    const para = txt(r["para"]);
    const par = [de, para].sort().join("|");
    if (idValido(id) && ex.relacoes.has(id)) { idsRelacoes.push(id); conta("relacoes", "tabela"); continue; }
    if (!idValido(id) || idsRelacoes.includes(id) || !existe(de) || !existe(para) || de === para || pares.has(par)) {
      p.push({ tipo: "ligacao", ...(idValido(id) ? { id } : {}), detalhe: "Ligação do mapa com ponta inexistente, repetida ou inválida; não entrou." });
      conta("relacoes", "pendencia");
      continue;
    }
    pares.add(par);
    idsRelacoes.push(id);
    relacoes.push({ empresaId: ctx.empresaId, id, deId: de, paraId: para, rotulo: txt(r["rotulo"]).trim().slice(0, 40), ...autor });
    conta("relacoes", "tabela");
  }

  const antes: Contagem = {
    listas: listasDoc.length, colunas: colunasDoc.length, itens: itensDoc.length,
    concluidos: itensDoc.filter((i) => Boolean(i["concluida"]) && idValido(i["id"])).length,
    copias: itensDoc.filter((i) => Boolean(i["origemId"])).length,
    subtarefas: itensOk.reduce((n, i) => n + lista(i["subtarefas"]).length, 0),
    pessoas: itensOk.reduce((n, i) => n + (Array.isArray(i["pessoas"]) ? lista(i["pessoas"]).length : i["responsavelId"] ? 1 : 0), 0),
    responsaveis: itensOk.reduce((n, i) => n + lista(i["pessoas"]).filter((x) => obj(x)["responsavel"]).length + (!Array.isArray(i["pessoas"]) && i["responsavelId"] ? 1 : 0), 0),
    notas: itensOk.reduce((n, i) => n + lista(obj(i["avaliacao"])["notas"]).length, 0),
    relacoes: lista(doc["relacoes"]).length,
    itensSemCriador, idsSemConta: semConta.size
  };
  return {
    grupos, membros, colunas, compromissos, atualizar, participantes, avaliacoes, relacoes, pendencias: p, antes, destino,
    esperados: { grupos: idsGrupos, colunas: idsColunas, compromissos: [...idsItens], relacoes: idsRelacoes },
    idsSemConta: [...semConta].map(([id, usos]) => ({ id, usos })), itensSemCriador
  };
}

/** Cada coisa do documento na tabela ou na pendência, nunca em nenhum dos dois. Devolve o motivo, ou ''. */
export function somaFecha(c: Conversao) {
  for (const cat of ["listas", "colunas", "itens", "subtarefas", "pessoas", "notas", "relacoes"]) {
    const d = c.destino[cat] ?? { tabela: 0, pendencia: 0 };
    const antes = c.antes[cat] ?? 0;
    if (d.tabela + d.pendencia !== antes) return `${cat}: o documento tem ${antes}, chegaram ${d.tabela} na tabela e ${d.pendencia} na pendência`;
  }
  return "";
}
