/*
 * Agenda — regras de exibição (listas automáticas, ordem, grupos, calendário, alertas, frases), sem tela e sem
 * armazenamento. Testadas em tests/agenda-dominio.cjs.
 * A regra de negócio (quem pode o quê, pessoas, avaliação, validação, repetição e datas) NÃO mora aqui: vem de
 * dist/agenda/regras.js (window.CicluzAgendaRegras), gerado de servidor/shared/src/agenda/regras.ts, e é
 * reexportada abaixo com o mesmo nome (uma implementação só, a mesma do servidor).
 * Referência de funcionamento: Lembretes e Calendário do iPhone/macOS (o protótipo do Figma fica em
 * Pralis-Especificacao-Prototipo/Agenda). O visual segue o S2, não o protótipo.
 *
 * Compromisso: { id, listaId, titulo, notas, url, local,
 *   data 'AAAA-MM-DD' | '', hora 'HH:MM' | '' (vazio = dia todo), horaFim 'HH:MM' | '',
 *   repeticao: null | { tipo, intervalo, unidade, diasSemana[], fim: { tipo, data, vezes }, feitas, ancora },
 *   alerta: null | minutos antes, adiadoPara: '' | ISO (soneca do alerta),
 *   prioridade, sinalizado, etiquetas[], subtarefas[{ id, titulo, concluida, concluidaEm }],
 *   pessoas: [{ id, responsavel, ver, editar, concluir, excluir }] — o gestor é quem criou (criadoPor) e
 *     escolhe quem participa e o que cada um pode fazer (decisão do Zé/Rodrigo, 05/11/2026),
 *   avaliacao: { tipo: '' | 'estrelas' | 'niveis' | 'nps' | 'feito', notas: [{ avaliadoId, porId, papel: 'gestor' | 'auto', valor, comentario, em }] },
 *   localizacao: null | { lat, lng, aviso: '' | 'entrar' | 'sair', raio (metros) } — o endereço fica em `local`,
 *   colunaId (Kanban), ordem (ordem manual), concluida, concluidaEm, origemId (cópia concluída de uma
 *   repetição), criadoEm, criadoPor, atualizadoEm }
 */
(function (root) {
  'use strict';
  const R = typeof module !== 'undefined' && module.exports ? require('./regras.js') : root.CicluzAgendaRegras;
  const { isoData, somarDias, somarMeses, diaDaSemana, dataValida, inicioDaSemana, dobrar, responsaveis, temRepeticao, proxima, temPonto } = R;

  const PESO_PRIORIDADE = Object.fromEntries(R.PRIORIDADES.map(([id], i) => [id, i]));

  /* Listas automáticas: as do Lembretes (Hoje, Programados, Todos, Sinalizados, Concluídos,
     Atribuídos a mim) mais Atrasados, que está no protótipo. */
  const LISTAS_AUTOMATICAS = [
    ['hoje', 'Para hoje'],
    ['programados', 'Programados'],
    ['todos', 'Todos'],
    ['sinalizados', 'Sinalizados'],
    ['atrasados', 'Atrasados'],
    ['atribuidos', 'Atribuídos a mim'],
    ['concluidos', 'Concluídos'],
  ];

  /* Alerta: as opções do Calendário (minutos antes). */
  const ALERTAS = [
    ['', 'Nenhum'],
    ['0', 'Na hora'],
    ['5', '5 minutos antes'],
    ['15', '15 minutos antes'],
    ['30', '30 minutos antes'],
    ['60', '1 hora antes'],
    ['120', '2 horas antes'],
    ['1440', '1 dia antes'],
    ['2880', '2 dias antes'],
    ['10080', '1 semana antes'],
  ];
  /* Sem hora (dia todo), o alerta é dado às 9h, como no Lembretes. */
  const HORA_ALERTA_DIA_TODO = '09:00';

  /* Raio do aviso por lugar (o iPhone começa em ~100 m). */
  const RAIOS = [['100', '100 m'], ['200', '200 m'], ['500', '500 m'], ['1000', '1 km'], ['2000', '2 km'], ['5000', '5 km']];

  const DIAS_CURTOS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  const DIAS_LONGOS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  const doisDigitos = (n) => String(n).padStart(2, '0');
  const horaAgora = (d) => doisDigitos(d.getHours()) + ':' + doisDigitos(d.getMinutes());
  const paraData = (iso) => { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d, 12); };
  const minutos = (h) => (h ? +h.slice(0, 2) * 60 + +h.slice(3, 5) : 0);
  const paraHora = (m) => doisDigitos(Math.floor(m / 60)) + ':' + doisDigitos(m % 60);
  const diasEntre = (a, b) => Math.round((paraData(b) - paraData(a)) / 86400000);

  /* ---------- Situação ---------- */

  /** Atrasado: não concluído e com data já passada (ou hoje, com a hora já passada). Sem hora = vale o dia todo. */
  function atrasado(item, agora) {
    if (item.concluida || !item.data) return false;
    const hoje = isoData(agora);
    if (item.data < hoje) return true;
    return item.data === hoje && Boolean(item.hora) && item.hora < horaAgora(agora);
  }

  /** O compromisso aparece na lista automática? (Para hoje inclui os atrasados, como no Lembretes.) */
  function naLista(item, chave, agora, usuarioId = '') {
    const hoje = isoData(agora);
    switch (chave) {
      case 'hoje': return !item.concluida && Boolean(item.data) && item.data <= hoje;
      case 'programados': return !item.concluida && Boolean(item.data);
      case 'todos': return !item.concluida;
      case 'sinalizados': return !item.concluida && Boolean(item.sinalizado);
      case 'atrasados': return atrasado(item, agora);
      case 'atribuidos': return !item.concluida && Boolean(usuarioId) && responsaveis(item).includes(usuarioId);
      case 'concluidos': return Boolean(item.concluida);
      default: return false;
    }
  }

  /** Busca por título, notas, local, etiquetas e subtarefas (sem acento e sem maiúscula). */
  function combinaBusca(item, termo) {
    const t = dobrar(termo).trim();
    if (!t) return true;
    const texto = [item.titulo, item.notas, item.local, ...(item.etiquetas || []), ...(item.subtarefas || []).map((s) => s.titulo)].map(dobrar).join(' ');
    return t.split(/\s+/).every((parte) => texto.includes(parte.replace(/^#/, '')));
  }

  const porData = (a, b) => {
    if (Boolean(a.data) !== Boolean(b.data)) return a.data ? -1 : 1;
    if (a.data !== b.data) return a.data < b.data ? -1 : 1;
    if ((a.hora || '') !== (b.hora || '')) return (a.hora || '') < (b.hora || '') ? -1 : 1;
    return 0;
  };
  const porPrioridade = (a, b) => (PESO_PRIORIDADE[b.prioridade] ?? 2) - (PESO_PRIORIDADE[a.prioridade] ?? 2);
  const porCriacao = (a, b) => String(a.criadoEm || '').localeCompare(String(b.criadoEm || ''));
  const porManual = (a, b) => (a.ordem ?? Infinity) - (b.ordem ?? Infinity) || porCriacao(a, b);
  const porTitulo = (a, b) => String(a.titulo).localeCompare(String(b.titulo), 'pt-BR', { sensitivity: 'base' });

  /** Comparador da ordenação escolhida. Concluídos: o mais recente primeiro. */
  function comparador(ordenacao = 'data') {
    const base = { manual: [porManual], data: [porData, porPrioridade, porCriacao], criacao: [porCriacao], prioridade: [porPrioridade, porData, porCriacao], titulo: [porTitulo, porCriacao] }[ordenacao] || [porData, porPrioridade, porCriacao];
    return (a, b) => {
      if (a.concluida !== b.concluida) return a.concluida ? 1 : -1;
      if (a.concluida && b.concluida) return String(b.concluidaEm || '').localeCompare(String(a.concluidaEm || ''));
      for (const f of base) { const r = f(a, b); if (r) return r; }
      return 0;
    };
  }
  const comparar = comparador('data');

  /**
   * Itens de uma visão: lista automática (chave) ou lista do usuário (listaId), busca e concluídos.
   * mostrarConcluidos: inclui os concluídos no fim (o "Mostrar" do Lembretes).
   */
  function filtrar(itens, { automatica = '', listaId = '', busca = '', mostrarConcluidos = false, ordenacao = 'data', usuarioId = '' } = {}, agora = new Date()) {
    const naVisao = (i) => {
      if (listaId) return i.listaId === listaId && (mostrarConcluidos || !i.concluida);
      if (automatica === 'concluidos') return Boolean(i.concluida);
      return naLista(i, automatica || 'todos', agora, usuarioId) || (mostrarConcluidos && i.concluida && automatica === 'todos');
    };
    return itens.filter((i) => naVisao(i) && combinaBusca(i, busca)).sort(comparador(listaId ? ordenacao : 'data'));
  }

  /** Quantos compromissos há em cada lista automática. */
  function contagens(itens, agora = new Date(), usuarioId = '') {
    return Object.fromEntries(LISTAS_AUTOMATICAS.map(([chave]) => [chave, itens.filter((i) => naLista(i, chave, agora, usuarioId)).length]));
  }

  function progresso(item) {
    const subs = item.subtarefas || [];
    return { feitas: subs.filter((s) => s.concluida).length, total: subs.length };
  }

  /**
   * Grupos com título, como no Lembretes:
   * - Para hoje: Atrasados, Dia todo, Manhã, Tarde, Noite;
   * - Programados: Atrasados, Hoje, Amanhã, os dias da semana, o resto do mês e os meses seguintes.
   * Devolve [{ titulo, itens }] sem grupos vazios.
   */
  function agrupar(itens, chave, agora = new Date()) {
    const hoje = isoData(agora);
    const grupos = new Map();
    const pôr = (t, i) => { if (!grupos.has(t)) grupos.set(t, []); grupos.get(t).push(i); };
    if (chave === 'hoje') {
      itens.forEach((i) => {
        if (i.data < hoje) return pôr('Atrasados', i);
        if (!i.hora) return pôr('Dia todo', i);
        const m = minutos(i.hora);
        pôr(m < 720 ? 'Manhã' : m < 1080 ? 'Tarde' : 'Noite', i);
      });
      return ['Atrasados', 'Dia todo', 'Manhã', 'Tarde', 'Noite'].filter((t) => grupos.has(t)).map((t) => ({ titulo: t, itens: grupos.get(t) }));
    }
    if (chave === 'programados') {
      const ordem = [];
      itens.forEach((i) => {
        let t;
        const dif = diasEntre(hoje, i.data);
        if (dif < 0) t = 'Atrasados';
        else if (dif === 0) t = 'Hoje';
        else if (dif === 1) t = 'Amanhã';
        else if (dif < 7) t = rotuloData(i.data, agora);
        else if (i.data.slice(0, 7) === hoje.slice(0, 7)) t = 'Restante de ' + MESES[+hoje.slice(5, 7) - 1];
        else t = tituloMes(i.data);
        if (!grupos.has(t)) ordem.push(t);
        pôr(t, i);
      });
      return ordem.map((t) => ({ titulo: t, itens: grupos.get(t) }));
    }
    return [{ titulo: '', itens }];
  }

  /* ---------- Repetição ---------- */

  /** Datas do compromisso entre ini e fim (inclusive), contando as repetições futuras. */
  function ocorrencias(item, ini, fim, limite = 500) {
    if (!item.data) return [];
    const saida = [];
    let atual = { data: item.data, hora: item.hora };
    const copia = temRepeticao(item) ? { ...item, repeticao: { ...item.repeticao } } : null;
    for (let n = 0; atual && atual.data <= fim && n < limite; n++) {
      if (atual.data >= ini) saida.push({ data: atual.data, hora: atual.hora, original: n === 0 });
      if (!copia || item.concluida) break;
      // De hora em hora: no calendário, uma marca por dia basta.
      if (copia.repeticao.tipo === 'hora') break;
      const p = proxima(copia, atual);
      copia.repeticao.feitas = (copia.repeticao.feitas || 0) + 1;
      atual = p;
    }
    return saida;
  }

  /** Texto curto da repetição ("Toda semana", "A cada 2 semanas: seg, qua"…). */
  function resumoRepeticao(r) {
    if (!r || !r.tipo || r.tipo === 'nunca') return '';
    let t = (R.REPETICOES.find(([k]) => k === r.tipo) || [, ''])[1];
    if (r.tipo === 'personalizada') {
      const n = Math.max(1, +r.intervalo || 1);
      const nomes = { dia: ['dia', 'dias'], semana: ['semana', 'semanas'], mes: ['mês', 'meses'], ano: ['ano', 'anos'] }[r.unidade || 'semana'];
      t = n === 1 ? 'Todo ' + (r.unidade === 'semana' || !r.unidade ? 'semana' : nomes[0]) : 'A cada ' + n + ' ' + nomes[1];
      if (t === 'Todo semana') t = 'Toda semana';
      if ((r.unidade || 'semana') === 'semana' && r.diasSemana && r.diasSemana.length) t += ': ' + r.diasSemana.slice().sort().map((d) => DIAS_CURTOS[d].toLowerCase()).join(', ');
    }
    const f = r.fim || {};
    if (f.tipo === 'data' && f.data) t += ', até ' + dataCurta(f.data);
    if (f.tipo === 'vezes' && f.vezes) t += ', ' + f.vezes + ' vez(es)';
    return t;
  }

  /* ---------- Alerta ---------- */

  /** Momento do alerta (Date) ou null. A soneca (adiadoPara) vale no lugar do alerta. */
  function momentoAlerta(item) {
    if (item.concluida || !item.data) return null;
    if (item.adiadoPara) return new Date(item.adiadoPara);
    if (item.alerta === null || item.alerta === undefined || item.alerta === '') return null;
    const [a, m, d] = item.data.split('-').map(Number);
    const h = item.hora || HORA_ALERTA_DIA_TODO;
    return new Date(a, m - 1, d, +h.slice(0, 2), +h.slice(3, 5) - Number(item.alerta));
  }

  /* ---------- Localização ---------- */

  /** Distância em metros entre dois pontos { lat, lng } (fórmula de haversine). */
  function distancia(a, b) {
    const r = 6371000;
    const rad = (g) => g * Math.PI / 180;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * r * Math.asin(Math.sqrt(h));
  }
  /**
   * Aviso por lugar, como o "Personalizado" do iPhone: dispara ao cruzar o raio no sentido escolhido.
   * antes: estava dentro? (undefined = primeira leitura: não dispara, como no iPhone).
   * Devolve { dentro, disparar }.
   */
  function cruzouLugar(item, posicao, antes) {
    const loc = item.localizacao;
    if (item.concluida || !temPonto(loc) || !loc.aviso) return { dentro: antes, disparar: false };
    const dentro = distancia(loc, posicao) <= (Number(loc.raio) || 200);
    const disparar = antes !== undefined && antes !== dentro && (loc.aviso === 'entrar' ? dentro : !dentro);
    return { dentro, disparar };
  }

  /* ---------- Avaliação ---------- */
  // Quem avalia, quando e o que cada um vê: regra única (podeAvaliar, comparativo). Aqui só o texto da nota.
  const NIVEIS = ['Muito abaixo do esperado', 'Abaixo do esperado', 'Como esperado', 'Acima do esperado', 'Muito acima do esperado'];
  function textoNota(tipo, v) {
    if (tipo === 'estrelas') return '★'.repeat(v) + '☆'.repeat(5 - v) + ' (' + v + '/5)';
    if (tipo === 'niveis') return NIVEIS[v - 1] || '';
    if (tipo === 'nps') return v + '/10';
    if (tipo === 'feito') return v ? 'Feito' : 'Não feito';
    return '';
  }
  /* ---------- Escrever do jeito que se fala ---------- */

  const DIAS_FALADOS = [['domingo', 0], ['segunda', 1], ['terca', 2], ['quarta', 3], ['quinta', 4], ['sexta', 5], ['sabado', 6]];

  /**
   * Entende data, hora, prioridade e etiquetas escritas no título, como o Lembretes:
   * "Ligar para o contador amanhã às 10 #financeiro !" → título "Ligar para o contador", amanhã 10:00,
   * etiqueta financeiro, prioridade Alta. Hora sem dia: hoje (ou amanhã, se a hora já passou).
   */
  function interpretar(texto, agora = new Date()) {
    let t = ' ' + String(texto || '') + ' ';
    const hoje = isoData(agora);
    const saida = { titulo: '', data: '', hora: '', etiquetas: [], prioridade: '' };
    const tirar = (re, f) => { t = t.replace(re, (...m) => { f(m); return ' '; }); };

    tirar(/\s#([\p{L}\p{N}_-]+)/gu, (m) => saida.etiquetas.push(m[1]));
    tirar(/\s(!{1,3})(?=\s)/g, (m) => { saida.prioridade = m[1].length > 1 ? 'muito-alta' : 'alta'; });

    // Hora
    tirar(/\s(?:(?:[àa]s?|ao)\s+)?(meio[- ]dia|meia[- ]noite)(?=\s)/giu, (m) => { saida.hora = /dia/i.test(m[1]) ? '12:00' : '00:00'; });
    tirar(/\s(?:[àa]s?\s+)?([01]?\d|2[0-3])(?::|h)([0-5]\d)?(?:min)?(?=\s)/giu, (m) => { saida.hora = doisDigitos(+m[1]) + ':' + (m[2] || '00'); });
    tirar(/\s[àa]s?\s+([01]?\d|2[0-3])(?=\s)/giu, (m) => { saida.hora = doisDigitos(+m[1]) + ':00'; });
    tirar(/\s(?:de|pela|à|a)\s+(manh[ãa]|tarde|noite)(?=\s)/giu, (m) => { if (!saida.hora) saida.hora = { manha: '09:00', tarde: '15:00', noite: '19:00' }[dobrar(m[1])]; });

    // Data
    tirar(/\s(?:depois\s+de\s+amanh[ãa])(?=\s)/giu, () => { saida.data = somarDias(hoje, 2); });
    tirar(/\s(?:amanh[ãa])(?=\s)/giu, () => { saida.data = somarDias(hoje, 1); });
    tirar(/\s(?:hoje)(?=\s)/giu, () => { saida.data = hoje; });
    tirar(/\s(?:semana\s+que\s+vem|pr[óo]xima\s+semana)(?=\s)/giu, () => { saida.data = somarDias(hoje, 7); });
    tirar(/\s(?:m[êe]s\s+que\s+vem|pr[óo]ximo\s+m[êe]s)(?=\s)/giu, () => { saida.data = somarMeses(hoje, 1); });
    tirar(/\s(?:(?:no|na|n[ao]\s+pr[óo]xim[ao])\s+)?(domingo|segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado)(?:-feira)?(?=\s)/giu, (m) => {
      const alvo = DIAS_FALADOS.find(([n]) => n === dobrar(m[1]))[1];
      let dif = (alvo - diaDaSemana(hoje) + 7) % 7;
      if (dif === 0) dif = 7;
      saida.data = somarDias(hoje, dif);
    });
    tirar(/\s(?:(?:no\s+)?dia\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?=\s)/gu, (m) => {
      let ano = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : +hoje.slice(0, 4);
      let iso = ano + '-' + doisDigitos(+m[2]) + '-' + doisDigitos(+m[1]);
      if (!m[3] && dataValida(iso) && iso < hoje) iso = (ano + 1) + iso.slice(4);
      if (dataValida(iso)) saida.data = iso;
    });
    tirar(/\s(?:no\s+)?dia\s+(\d{1,2})(?=\s)/giu, (m) => {
      const d = +m[1];
      let iso = hoje.slice(0, 8) + doisDigitos(d);
      if (!dataValida(iso) || iso < hoje) iso = somarMeses(hoje.slice(0, 8) + '01', 1).slice(0, 8) + doisDigitos(d);
      if (dataValida(iso)) saida.data = iso;
    });

    if (saida.hora && !saida.data) saida.data = saida.hora > horaAgora(agora) ? hoje : somarDias(hoje, 1);
    saida.titulo = t.replace(/\s+/g, ' ').replace(/\s+(?:de|às|as|à|a|no|na|para|em|,)$/i, '').trim();
    if (!saida.titulo) saida.titulo = String(texto || '').trim();
    return saida;
  }

  /* ---------- Calendário ---------- */

  const semana = (iso) => { const ini = inicioDaSemana(iso); return [0, 1, 2, 3, 4, 5, 6].map((n) => somarDias(ini, n)); };
  /** 6 semanas (42 dias) que cobrem o mês do dia informado. */
  function gradeDoMes(iso) {
    const primeiro = iso.slice(0, 8) + '01';
    const ini = inicioDaSemana(primeiro);
    return Array.from({ length: 42 }, (_, n) => somarDias(ini, n));
  }
  /**
   * Mapa dia → [{ item, data, hora, horaFim, original }] entre ini e fim, com as repetições.
   * A ocorrência futura de uma repetição aparece no calendário (como no Calendário do iPhone).
   */
  function porDia(itens, ini, fim) {
    const mapa = new Map();
    itens.forEach((item) => {
      ocorrencias(item, ini, fim).forEach((o) => {
        if (!mapa.has(o.data)) mapa.set(o.data, []);
        const dur = item.hora && item.horaFim ? minutos(item.horaFim) - minutos(item.hora) : 0;
        mapa.get(o.data).push({ item, data: o.data, hora: o.hora, horaFim: o.hora && dur ? paraHora(Math.min(1439, minutos(o.hora) + dur)) : '', original: o.original });
      });
    });
    mapa.forEach((l) => l.sort((a, b) => (a.item.concluida - b.item.concluida) || ((a.hora || '') < (b.hora || '') ? -1 : (a.hora || '') > (b.hora || '') ? 1 : porPrioridade(a.item, b.item))));
    return mapa;
  }
  /** Compromissos de um dia (com repetições), em ordem. */
  const doDia = (itens, iso) => (porDia(itens, iso, iso).get(iso) || []).map((o) => o.item);

  /**
   * Distribui os blocos com hora de um dia em colunas para não se sobreporem (grade de horas).
   * Devolve [{ ...ocorrencia, ini, fim, coluna, colunas }] com minutos; sem término = 30 min.
   */
  function blocosDoDia(ocorrenciasDoDia) {
    const blocos = ocorrenciasDoDia.filter((o) => o.hora).map((o) => {
      const ini = minutos(o.hora);
      return { ...o, ini, fim: Math.max(ini + 30, o.horaFim ? minutos(o.horaFim) : ini + 30) };
    }).sort((a, b) => a.ini - b.ini || b.fim - a.fim);
    let grupo = [];
    let fimGrupo = -1;
    const fechar = () => { const n = Math.max(1, ...grupo.map((b) => b.coluna + 1)); grupo.forEach((b) => { b.colunas = n; }); grupo = []; };
    blocos.forEach((b) => {
      if (b.ini >= fimGrupo && grupo.length) fechar();
      const usadas = grupo.filter((g) => g.fim > b.ini).map((g) => g.coluna);
      let c = 0;
      while (usadas.includes(c)) c++;
      b.coluna = c;
      grupo.push(b);
      fimGrupo = Math.max(fimGrupo, b.fim);
    });
    if (grupo.length) fechar();
    return blocos;
  }

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
  const quando = (item, agora) => (item.data ? rotuloData(item.data, agora) + (item.hora ? ' · ' + item.hora + (item.horaFim ? '–' + item.horaFim : '') : '') : '');
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
    // A regra única (mesmo objeto de função do servidor): permissões, pessoas, avaliação, validação, repetição e datas.
    ...R,
    NIVEIS, textoNota,
    LISTAS_AUTOMATICAS, ALERTAS, RAIOS, distancia, cruzouLugar, HORA_ALERTA_DIA_TODO, DIAS_CURTOS, DIAS_LONGOS, MESES,
    horaAgora, minutos, paraHora, diasEntre,
    atrasado, naLista, combinaBusca, comparar, comparador, filtrar, contagens, progresso, agrupar,
    ocorrencias, resumoRepeticao, momentoAlerta, interpretar,
    semana, gradeDoMes, porDia, doDia, blocosDoDia,
    dataCurta, rotuloData, quando, tituloMes, tituloDia, tituloSemana,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CicluzAgendaDominio = api;
})(typeof window !== 'undefined' ? window : globalThis);
