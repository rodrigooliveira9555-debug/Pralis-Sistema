/*
 * Agenda — regras puras (sem tela e sem armazenamento). Testadas em tests/agenda-dominio.cjs.
 * Referência de funcionamento: Lembretes e Calendário do iPhone/macOS (protótipo do Figma em
 * Pralis-Especificacao-Prototipo/Agenda). O visual segue o S2, não o protótipo.
 *
 * Compromisso: { id, listaId, titulo, notas, data 'AAAA-MM-DD' | '', hora 'HH:MM' | '' (vazio = dia todo),
 *   prioridade, sinalizado, etiquetas[], responsavelId, subtarefas[{ id, titulo, concluida, concluidaEm }],
 *   concluida, concluidaEm, criadoEm, criadoPor, atualizadoEm }
 */
(function (root) {
  'use strict';

  /* Cinco níveis, como no protótipo (Muito baixa … Muito alta). Padrão: Normal. */
  const PRIORIDADES = [
    ['muito-baixa', 'Muito baixa'],
    ['baixa', 'Baixa'],
    ['normal', 'Normal'],
    ['alta', 'Alta'],
    ['muito-alta', 'Muito alta'],
  ];
  const PESO_PRIORIDADE = Object.fromEntries(PRIORIDADES.map(([id], i) => [id, i]));

  /* Listas automáticas (as "listas inteligentes" do Lembretes), na ordem do protótipo. */
  const LISTAS_AUTOMATICAS = [
    ['hoje', 'Para hoje'],
    ['programados', 'Programados'],
    ['todos', 'Todos'],
    ['sinalizados', 'Sinalizados'],
    ['atrasados', 'Atrasados'],
    ['concluidos', 'Concluídos'],
  ];

  const DIAS_CURTOS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  const DIAS_LONGOS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  const doisDigitos = (n) => String(n).padStart(2, '0');
  /** Data local (não UTC) no formato AAAA-MM-DD. */
  const isoData = (d) => d.getFullYear() + '-' + doisDigitos(d.getMonth() + 1) + '-' + doisDigitos(d.getDate());
  const horaAgora = (d) => doisDigitos(d.getHours()) + ':' + doisDigitos(d.getMinutes());
  const paraData = (iso) => { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d, 12); };
  function somarDias(iso, n) { const d = paraData(iso); d.setDate(d.getDate() + n); return isoData(d); }
  function somarMeses(iso, n) {
    const d = paraData(iso);
    const alvo = new Date(d.getFullYear(), d.getMonth() + n, 1, 12);
    const ultimo = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
    alvo.setDate(Math.min(d.getDate(), ultimo));
    return isoData(alvo);
  }
  const diaDaSemana = (iso) => paraData(iso).getDay();

  const dataValida = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return false;
    const d = paraData(iso);
    return d.getFullYear() === +m[1] && d.getMonth() + 1 === +m[2] && d.getDate() === +m[3];
  };
  const horaValida = (h) => /^([01]\d|2[0-3]):[0-5]\d$/.test(h || '');

  /* ---------- Situação ---------- */

  /** Atrasado: não concluído e com data já passada (ou hoje, com a hora já passada). Sem hora = vale o dia todo. */
  function atrasado(item, agora) {
    if (item.concluida || !item.data) return false;
    const hoje = isoData(agora);
    if (item.data < hoje) return true;
    return item.data === hoje && Boolean(item.hora) && item.hora < horaAgora(agora);
  }

  /** O compromisso aparece na lista automática? */
  function naLista(item, chave, agora) {
    const hoje = isoData(agora);
    switch (chave) {
      case 'hoje': return !item.concluida && item.data === hoje;
      case 'programados': return !item.concluida && Boolean(item.data);
      case 'todos': return !item.concluida;
      case 'sinalizados': return !item.concluida && Boolean(item.sinalizado);
      case 'atrasados': return atrasado(item, agora);
      case 'concluidos': return Boolean(item.concluida);
      default: return false;
    }
  }

  const dobrar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR');

  /** Busca por título, notas, etiquetas e subtarefas (sem acento e sem maiúscula). */
  function combinaBusca(item, termo) {
    const t = dobrar(termo).trim();
    if (!t) return true;
    const texto = [item.titulo, item.notas, ...(item.etiquetas || []), ...(item.subtarefas || []).map((s) => s.titulo)].map(dobrar).join(' ');
    return t.split(/\s+/).every((parte) => texto.includes(parte.replace(/^#/, '')));
  }

  /**
   * Ordem da lista: com data primeiro (mais cedo antes; no mesmo dia, "dia todo" antes das horas),
   * depois prioridade maior e, por fim, os mais antigos. Concluídos: o mais recente primeiro.
   */
  function comparar(a, b) {
    if (a.concluida && b.concluida) return String(b.concluidaEm || '').localeCompare(String(a.concluidaEm || ''));
    if (Boolean(a.data) !== Boolean(b.data)) return a.data ? -1 : 1;
    if (a.data !== b.data) return a.data < b.data ? -1 : 1;
    if ((a.hora || '') !== (b.hora || '')) return (a.hora || '') < (b.hora || '') ? -1 : 1;
    const p = (PESO_PRIORIDADE[b.prioridade] ?? 2) - (PESO_PRIORIDADE[a.prioridade] ?? 2);
    if (p) return p;
    return String(a.criadoEm || '').localeCompare(String(b.criadoEm || ''));
  }

  /** Filtra pela lista automática, pela lista (grupo) e pela busca, já ordenado. */
  function filtrar(itens, { automatica = 'todos', listaId = '', busca = '' } = {}, agora = new Date()) {
    return itens
      .filter((i) => (!listaId || i.listaId === listaId) && naLista(i, automatica, agora) && combinaBusca(i, busca))
      .sort(comparar);
  }

  /** Quantos compromissos há em cada lista automática (respeitando a lista escolhida). */
  function contagens(itens, listaId, agora = new Date()) {
    const base = listaId ? itens.filter((i) => i.listaId === listaId) : itens;
    return Object.fromEntries(LISTAS_AUTOMATICAS.map(([chave]) => [chave, base.filter((i) => naLista(i, chave, agora)).length]));
  }

  function progresso(item) {
    const subs = item.subtarefas || [];
    return { feitas: subs.filter((s) => s.concluida).length, total: subs.length };
  }

  /* ---------- Entrada ---------- */

  /** Etiquetas: sem "#", sem espaços nas pontas, sem repetir (ignorando maiúsculas), até 30 letras. */
  function normalizarEtiquetas(lista) {
    const vistas = new Set();
    const saida = [];
    [].concat(lista || []).forEach((bruta) => {
      String(bruta || '').split(/[,;]/).forEach((parte) => {
        const t = parte.trim().replace(/^#+/, '').replace(/\s+/g, ' ').slice(0, 30);
        const k = dobrar(t);
        if (t && !vistas.has(k)) { vistas.add(k); saida.push(t); }
      });
    });
    return saida;
  }

  /** Erro de preenchimento (texto) ou '' quando está tudo certo. */
  function validar(item) {
    if (!String(item.titulo || '').trim()) return 'Informe o título do compromisso.';
    if (String(item.titulo).trim().length > 200) return 'O título passa de 200 letras.';
    if (item.data && !dataValida(item.data)) return 'Informe uma data válida (DD/MM/AA).';
    if (item.hora && !horaValida(item.hora)) return 'Informe uma hora válida (HH:MM).';
    if (item.hora && !item.data) return 'Para marcar a hora, informe também a data.';
    if (item.prioridade && !(item.prioridade in PESO_PRIORIDADE)) return 'Prioridade inválida.';
    if ((item.subtarefas || []).some((s) => !String(s.titulo || '').trim())) return 'Há subtarefa sem nome.';
    return '';
  }

  /* ---------- Calendário ---------- */

  /** Domingo da semana do dia (a semana começa no domingo, como no protótipo). */
  const inicioDaSemana = (iso) => somarDias(iso, -diaDaSemana(iso));
  const semana = (iso) => { const ini = inicioDaSemana(iso); return [0, 1, 2, 3, 4, 5, 6].map((n) => somarDias(ini, n)); };
  /** 6 semanas (42 dias) que cobrem o mês do dia informado. */
  function gradeDoMes(iso) {
    const primeiro = iso.slice(0, 8) + '01';
    const ini = inicioDaSemana(primeiro);
    return Array.from({ length: 42 }, (_, n) => somarDias(ini, n));
  }
  /** Compromissos de um dia (concluídos também, para o histórico do calendário), na ordem da lista. */
  const doDia = (itens, iso) => itens.filter((i) => i.data === iso).sort((a, b) => (a.concluida - b.concluida) || comparar(a, b));

  /* ---------- Texto ---------- */

  const dataCurta = (iso) => (iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(2, 4) : '');
  /** "Hoje", "Amanhã", "Ontem", o dia da semana (nos próximos 6 dias) ou DD/MM/AA. */
  function rotuloData(iso, agora = new Date()) {
    if (!iso) return '';
    const hoje = isoData(agora);
    if (iso === hoje) return 'Hoje';
    if (iso === somarDias(hoje, 1)) return 'Amanhã';
    if (iso === somarDias(hoje, -1)) return 'Ontem';
    if (iso > hoje && iso <= somarDias(hoje, 6)) { const n = DIAS_LONGOS[diaDaSemana(iso)]; return n[0].toUpperCase() + n.slice(1); }
    return dataCurta(iso);
  }
  const quando = (item, agora) => (item.data ? rotuloData(item.data, agora) + (item.hora ? ' · ' + item.hora : '') : '');
  const nomeMes = (iso) => MESES[+iso.slice(5, 7) - 1];
  const tituloMes = (iso) => { const m = nomeMes(iso); return m[0].toUpperCase() + m.slice(1) + ' de ' + iso.slice(0, 4); };
  function tituloDia(iso) { const d = DIAS_LONGOS[diaDaSemana(iso)]; return d[0].toUpperCase() + d.slice(1) + ', ' + +iso.slice(8, 10) + ' de ' + nomeMes(iso); }
  function tituloSemana(iso) {
    const s = semana(iso);
    const a = s[0], b = s[6];
    if (a.slice(0, 7) === b.slice(0, 7)) return +a.slice(8, 10) + ' a ' + +b.slice(8, 10) + ' de ' + nomeMes(b);
    return +a.slice(8, 10) + ' de ' + nomeMes(a) + ' a ' + +b.slice(8, 10) + ' de ' + nomeMes(b);
  }

  const api = {
    PRIORIDADES, LISTAS_AUTOMATICAS, DIAS_CURTOS, DIAS_LONGOS, MESES,
    isoData, horaAgora, somarDias, somarMeses, diaDaSemana, dataValida, horaValida,
    atrasado, naLista, combinaBusca, comparar, filtrar, contagens, progresso,
    normalizarEtiquetas, validar,
    inicioDaSemana, semana, gradeDoMes, doDia,
    dataCurta, rotuloData, quando, tituloMes, tituloDia, tituloSemana,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CicluzAgendaDominio = api;
})(typeof window !== 'undefined' ? window : globalThis);
