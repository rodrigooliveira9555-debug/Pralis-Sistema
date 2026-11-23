// Agenda — a regra escrita UMA vez (plano docs/AGENDA_NO_SERVIDOR_PLANO.md, seção 3).
// Quem pode o quê (acesso), pessoas, avaliação, validação do formulário e repetição (com âncora).
// Puro: sem banco, sem tela, sem import. O servidor usa daqui; a tela recebe a cópia gerada
// dist/agenda/regras.js (window.CicluzAgendaRegras), feita por servidor/scripts/gerar-regras-agenda.mjs.
// Não edite o arquivo gerado: mude aqui e gere de novo (um teste falha se os dois estiverem diferentes).
//
// Copiado de dist/agenda/dominio.js SEM mudar comportamento (os 125 casos de tests/agenda-dominio.cjs
// passam com a cópia gerada). Datas 'AAAA-MM-DD' em horário local, meio-dia, como na tela.

/* ---------- Tipos (o compromisso como a tela o guarda) ---------- */

export type Permissoes = { ver: boolean; editar: boolean; concluir: boolean; excluir: boolean };
export type Pessoa = Permissoes & { id: string; responsavel: boolean };
export type Acesso = Permissoes & { gestor: boolean; responsavel: boolean };
export type PapelNota = "gestor" | "auto";
export type Nota = { avaliadoId: string; porId?: string; papel: PapelNota; valor: number; comentario?: string; em?: string };
export type FimRepeticao = { tipo?: string; data?: string; vezes?: number | string };
export type Repeticao = {
  tipo?: string; intervalo?: number | string; unidade?: string; diasSemana?: number[];
  fim?: FimRepeticao; feitas?: number; ancora?: string;
};
export type Localizacao = { lat?: number; lng?: number; aviso?: string; raio?: number | string };
export type Compromisso = {
  titulo?: string; url?: string;
  data?: string; hora?: string; horaFim?: string;
  repeticao?: Repeticao | null;
  alerta?: number | string | null;
  prioridade?: string;
  subtarefas?: Array<{ titulo?: string }>;
  localizacao?: Localizacao | null;
  avaliacao?: { tipo?: string; notas?: Nota[] };
  concluida?: boolean;
  criadoPor?: string;
  pessoas?: Array<Partial<Pessoa> & { id: string }>;
};
export type DataHora = { data?: string | undefined; hora?: string | undefined };

/* ---------- Listas fixas ---------- */

/** Cinco níveis (Muito baixa … Muito alta). Padrão: Normal. */
export const PRIORIDADES = [
  ["muito-baixa", "Muito baixa"],
  ["baixa", "Baixa"],
  ["normal", "Normal"],
  ["alta", "Alta"],
  ["muito-alta", "Muito alta"]
] as const;
const PESO_PRIORIDADE: Record<string, number> = Object.fromEntries(PRIORIDADES.map(([id], i) => [id, i]));

/** Repetição: as opções do Lembretes/Calendário. */
export const REPETICOES = [
  ["nunca", "Nunca"],
  ["hora", "De hora em hora"],
  ["dia", "Todo dia"],
  ["dias-uteis", "Dias úteis (seg. a sex.)"],
  ["fins-de-semana", "Fins de semana"],
  ["semana", "Toda semana"],
  ["quinzena", "A cada 2 semanas"],
  ["mes", "Todo mês"],
  ["trimestre", "A cada 3 meses"],
  ["semestre", "A cada 6 meses"],
  ["ano", "Todo ano"],
  ["personalizada", "Personalizada"]
] as const;

export const ORDENACOES = [
  ["manual", "Manual"],
  ["data", "Data"],
  ["criacao", "Criação"],
  ["prioridade", "Prioridade"],
  ["titulo", "Título"]
] as const;

export const PERMISSOES = [["ver", "Ver"], ["editar", "Editar"], ["concluir", "Concluir"], ["excluir", "Excluir"]] as const;
export const TIPOS_AVALIACAO = [
  ["", "Sem avaliação"],
  ["estrelas", "Estrelas (1 a 5)"],
  ["niveis", "5 níveis"],
  ["nps", "NPS (0 a 10)"],
  ["feito", "Feito (sim ou não)"]
] as const;

/* ---------- Datas ---------- */

const doisDigitos = (n: number) => String(n).padStart(2, "0");
/** Data local (não UTC) no formato AAAA-MM-DD. */
export const isoData = (d: Date) => d.getFullYear() + "-" + doisDigitos(d.getMonth() + 1) + "-" + doisDigitos(d.getDate());
const paraData = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(a, m - 1, d, 12);
};
export function somarDias(iso: string, n: number) {
  const d = paraData(iso);
  d.setDate(d.getDate() + n);
  return isoData(d);
}
const ultimoDia = (ano: number, mes0: number) => new Date(ano, mes0 + 1, 0).getDate();
/** Soma meses mantendo o dia (ou o último dia do mês, se faltar). diaAlvo: o dia original da repetição. */
export function somarMeses(iso: string, n: number, diaAlvo?: number) {
  const d = paraData(iso);
  const alvo = new Date(d.getFullYear(), d.getMonth() + n, 1, 12);
  alvo.setDate(Math.min(diaAlvo || d.getDate(), ultimoDia(alvo.getFullYear(), alvo.getMonth())));
  return isoData(alvo);
}
export const diaDaSemana = (iso: string) => paraData(iso).getDay();
/** Domingo da semana do dia (a semana começa no domingo). */
export const inicioDaSemana = (iso: string) => somarDias(iso, -diaDaSemana(iso));
const minutos = (h: string | undefined) => (h ? +h.slice(0, 2) * 60 + +h.slice(3, 5) : 0);
const paraHora = (m: number) => doisDigitos(Math.floor(m / 60)) + ":" + doisDigitos(m % 60);

export function dataValida(iso: string | undefined) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m || !iso) return false;
  const d = paraData(iso);
  return d.getFullYear() === +(m[1] ?? "") && d.getMonth() + 1 === +(m[2] ?? "") && d.getDate() === +(m[3] ?? "");
}
export const horaValida = (h: string | undefined) => /^([01]\d|2[0-3]):[0-5]\d$/.test(h || "");

/* ---------- Repetição ---------- */

export const temRepeticao = (item: Compromisso) => Boolean(item.repeticao && item.repeticao.tipo && item.repeticao.tipo !== "nunca");

/** Próxima data (e hora) depois de { data, hora }, ou null quando a repetição terminou. */
export function proxima(item: Compromisso, de: DataHora = { data: item.data, hora: item.hora }): { data: string; hora: string | undefined } | null {
  const r = item.repeticao;
  if (!r || !temRepeticao(item) || !de.data) return null;
  const ancora = r.ancora || item.data || de.data;
  const diaAlvo = +ancora.slice(8, 10);
  const n = Math.max(1, +(r.intervalo ?? 1) || 1);
  let data = de.data;
  let hora = de.hora;
  const proximoDiaEm = (dias: number[]) => {
    let d = somarDias(data, 1);
    while (!dias.includes(diaDaSemana(d))) d = somarDias(d, 1);
    return d;
  };
  switch (r.tipo) {
    case "hora":
      if (!hora) { data = somarDias(data, 1); break; }
      if (minutos(hora) + 60 >= 1440) { data = somarDias(data, 1); hora = paraHora(minutos(hora) + 60 - 1440); } else hora = paraHora(minutos(hora) + 60);
      break;
    case "dia": data = somarDias(data, 1); break;
    case "dias-uteis": data = proximoDiaEm([1, 2, 3, 4, 5]); break;
    case "fins-de-semana": data = proximoDiaEm([0, 6]); break;
    case "semana": data = somarDias(data, 7); break;
    case "quinzena": data = somarDias(data, 14); break;
    case "mes": data = somarMeses(data, 1, diaAlvo); break;
    case "trimestre": data = somarMeses(data, 3, diaAlvo); break;
    case "semestre": data = somarMeses(data, 6, diaAlvo); break;
    case "ano": data = somarMeses(data, 12, diaAlvo); break;
    case "personalizada": {
      const u = r.unidade || "semana";
      if (u === "dia") data = somarDias(data, n);
      else if (u === "mes") data = somarMeses(data, n, diaAlvo);
      else if (u === "ano") data = somarMeses(data, 12 * n, diaAlvo);
      else {
        const dias = (r.diasSemana && r.diasSemana.length ? r.diasSemana : [diaDaSemana(ancora)]).slice().sort();
        const hojeNaSemana = diaDaSemana(data);
        const resto = dias.filter((d) => d > hojeNaSemana);
        // Ainda nesta semana; senão, o primeiro dia escolhido daqui a n semanas.
        data = resto.length ? somarDias(data, (resto[0] ?? 0) - hojeNaSemana) : somarDias(inicioDaSemana(data), 7 * n + (dias[0] ?? 0));
      }
      break;
    }
    default: return null;
  }
  const fim: FimRepeticao = r.fim || { tipo: "nunca" };
  if (fim.tipo === "data" && fim.data && data > fim.data) return null;
  if (fim.tipo === "vezes" && (r.feitas || 0) + 1 >= Math.max(1, +(fim.vezes ?? 1) || 1)) return null;
  return { data, hora };
}

/* ---------- Pessoas e permissões ---------- */
// Gestor = quem criou. Ele escolhe quem participa (responsáveis e outros) e o que cada um pode:
// ver, editar, concluir, excluir. Quem não participa não vê. Não depende de cargo nem de papel no login.
// Sem usuário logado (revisão local) ou compromisso sem criador (feito antes do login): sem controle.
// (No servidor, depois da transferência, todo compromisso tem gestor: o "sem criador" deixa de existir.)

const TUDO: Permissoes = { ver: true, editar: true, concluir: true, excluir: true };

/** Lista de pessoas limpa: sem repetir, e quem pode fazer algo também pode ver. */
export function normalizarPessoas(lista: ReadonlyArray<Partial<Pessoa> | null | undefined> | null | undefined): Pessoa[] {
  const vistos = new Set<unknown>();
  return (lista || [])
    .filter((p): p is Partial<Pessoa> => Boolean(p && p.id && !vistos.has(p.id) && vistos.add(p.id)))
    .map((p) => {
      const x: Pessoa = { id: String(p.id), responsavel: Boolean(p.responsavel), ver: Boolean(p.ver), editar: Boolean(p.editar), concluir: Boolean(p.concluir), excluir: Boolean(p.excluir) };
      if (x.responsavel || x.editar || x.concluir || x.excluir) x.ver = true;
      return x;
    });
}
/** Permissões iniciais de quem é posto como responsável (o gestor pode mudar). */
export const pessoaResponsavel = (id: string): Pessoa => ({ id, responsavel: true, ver: true, editar: true, concluir: true, excluir: false });
export const responsaveis = (item: Compromisso) => (item.pessoas || []).filter((p) => p.responsavel).map((p) => p.id);

/** O que o usuário pode fazer no compromisso. */
export function acesso(item: Compromisso, usuarioId: string): Acesso {
  if (!usuarioId || !item.criadoPor || item.criadoPor === usuarioId) return { ...TUDO, gestor: true, responsavel: responsaveis(item).includes(usuarioId) };
  const p = (item.pessoas || []).find((x) => x.id === usuarioId);
  if (!p) return { ver: false, editar: false, concluir: false, excluir: false, gestor: false, responsavel: false };
  return {
    ver: Boolean(p.ver || p.editar || p.concluir || p.excluir || p.responsavel),
    editar: Boolean(p.editar), concluir: Boolean(p.concluir), excluir: Boolean(p.excluir),
    gestor: false, responsavel: Boolean(p.responsavel)
  };
}

/* ---------- Avaliação ---------- */
// Depois de concluído, o gestor avalia a execução de cada responsável e cada responsável se autoavalia;
// o gestor vê a comparação. Nota registrada não muda.

export function valorValido(tipo: string | undefined, v: unknown) {
  if (typeof v !== "number" || !Number.isInteger(v)) return false;
  if (tipo === "estrelas" || tipo === "niveis") return v >= 1 && v <= 5;
  if (tipo === "nps") return v >= 0 && v <= 10;
  if (tipo === "feito") return v === 0 || v === 1;
  return false;
}

/** Pode avaliar a execução de avaliadoId? Devolve { papel } ou { erro }. */
export function podeAvaliar(item: Compromisso, usuarioId: string, avaliadoId: string): { papel: PapelNota } | { erro: string } {
  const tipo = item.avaliacao && item.avaliacao.tipo;
  if (!tipo) return { erro: "Este compromisso não tem avaliação." };
  if (!item.concluida) return { erro: "A avaliação é feita depois de concluído." };
  if (!usuarioId) return { erro: "Entre com seu usuário para avaliar." };
  if (!responsaveis(item).includes(avaliadoId)) return { erro: "Só a execução dos responsáveis é avaliada." };
  const papel: PapelNota | "" = item.criadoPor === usuarioId ? "gestor" : usuarioId === avaliadoId ? "auto" : "";
  if (!papel) return { erro: "Só o gestor e o próprio responsável avaliam." };
  if ((item.avaliacao?.notas || []).some((n) => n.avaliadoId === avaliadoId && n.papel === papel)) return { erro: "Avaliação já registrada; ela não muda." };
  return { papel };
}

/**
 * Comparação por responsável { id, gestor, auto } que o usuário pode ver:
 * o gestor vê as duas; o responsável vê só a própria autoavaliação.
 */
export function comparativo(item: Compromisso, usuarioId: string) {
  const notas = (item.avaliacao && item.avaliacao.notas) || [];
  const gestor = !usuarioId || !item.criadoPor || item.criadoPor === usuarioId;
  return responsaveis(item).filter((id) => gestor || id === usuarioId).map((id) => ({
    id,
    gestor: gestor ? notas.find((n) => n.avaliadoId === id && n.papel === "gestor") || null : null,
    auto: notas.find((n) => n.avaliadoId === id && n.papel === "auto") || null
  }));
}

/* ---------- Validação do formulário ---------- */

export const temPonto = (loc: Localizacao | null | undefined): loc is Localizacao & { lat: number; lng: number } =>
  Boolean(loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng));

/** Erro de preenchimento (texto) ou '' quando está tudo certo. */
export function validar(item: Compromisso): string {
  const titulo = String(item.titulo || "").trim();
  if (!titulo) return "Informe o título do compromisso.";
  if (titulo.length > 200) return "O título passa de 200 letras.";
  if (item.data && !dataValida(item.data)) return "Informe uma data válida (DD/MM/AA).";
  if (item.hora && !horaValida(item.hora)) return "Informe uma hora válida (HH:MM).";
  if (item.hora && !item.data) return "Para marcar a hora, informe também a data.";
  if (item.horaFim && !horaValida(item.horaFim)) return "Informe uma hora de término válida (HH:MM).";
  if (item.horaFim && !item.hora) return "Para marcar o término, informe a hora de início.";
  if (item.horaFim && item.hora && item.horaFim <= item.hora) return "O término precisa ser depois do início.";
  if (item.prioridade && !(item.prioridade in PESO_PRIORIDADE)) return "Prioridade inválida.";
  if ((item.subtarefas || []).some((s) => !String(s.titulo || "").trim())) return "Há subtarefa sem nome.";
  if (item.url && !/^https?:\/\/[^\s]+\.[^\s]+/i.test(item.url)) return "Informe o endereço completo, começando com http:// ou https://.";
  const r = item.repeticao;
  if (r && r.tipo && r.tipo !== "nunca") {
    if (!item.data) return "Para repetir, informe a data.";
    if (r.tipo === "hora" && !item.hora) return "Para repetir de hora em hora, informe a hora.";
    if (r.tipo === "personalizada" && !(+(r.intervalo ?? NaN) >= 1 && +(r.intervalo ?? NaN) <= 99)) return "Informe de quanto em quanto tempo repete (1 a 99).";
    if (r.fim && r.fim.tipo === "data" && (!dataValida(r.fim.data) || (r.fim.data ?? "") < item.data)) return "O fim da repetição precisa ser uma data a partir do primeiro dia.";
    if (r.fim && r.fim.tipo === "vezes" && !(+(r.fim.vezes ?? NaN) >= 1 && +(r.fim.vezes ?? NaN) <= 999)) return "Informe quantas vezes repete (1 a 999).";
  }
  if (item.alerta !== null && item.alerta !== undefined && item.alerta !== "" && !item.data) return "Para o alerta, informe a data.";
  const loc = item.localizacao;
  if (loc && (loc.lat !== undefined || loc.lng !== undefined) && !(temPonto(loc) && Math.abs(loc.lat) <= 90 && Math.abs(loc.lng) <= 180)) return "O ponto marcado no mapa é inválido.";
  if (loc && loc.aviso && !temPonto(loc)) return "Para avisar ao entrar ou sair, marque o lugar no mapa.";
  if (loc && loc.aviso && !["entrar", "sair"].includes(loc.aviso)) return "Aviso por lugar inválido.";
  if (loc && loc.aviso && !(+(loc.raio ?? NaN) >= 50 && +(loc.raio ?? NaN) <= 50000)) return "Informe o raio do aviso.";
  if (item.avaliacao && item.avaliacao.tipo && !TIPOS_AVALIACAO.some(([k]) => k === item.avaliacao?.tipo)) return "Tipo de avaliação inválido.";
  return "";
}
