/*
 * Agenda — regras puras (sem tela e sem armazenamento). Testadas em tests/agenda-dominio.cjs.
 * Referência de funcionamento: Lembretes e Calendário do iPhone/macOS (o protótipo do Figma fica em
 * Pralis-Especificacao-Prototipo/Agenda). O visual segue o S2, não o protótipo.
 *
 * Compromisso: { id, listaId, titulo, notas, url, local,
 *   data 'AAAA-MM-DD' | '', hora 'HH:MM' | '' (vazio = dia todo), horaFim 'HH:MM' | '',
 *   repeticao: null | { tipo, intervalo, unidade, diasSemana[], fim: { tipo, data, vezes }, feitas, ancora },
 *   alerta: null | minutos antes, adiadoPara: '' | ISO (soneca do alerta),
 *   prioridade, sinalizado, etiquetas[], responsavelId, subtarefas[{ id, titulo, concluida, concluidaEm }],
 *   localizacao: null | { lat, lng, aviso: '' | 'entrar' | 'sair', raio (metros) } — o endereço fica em `local`,
 *   colunaId (Kanban), ordem (ordem manual), concluida, concluidaEm, origemId (cópia concluída de uma
 *   repetição), criadoEm, criadoPor, atualizadoEm }
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

  /* Repetição: as opções do Lembretes/Calendário. */
  const REPETICOES = [
    ['nunca', 'Nunca'],
    ['hora', 'De hora em hora'],
    ['dia', 'Todo dia'],
    ['dias-uteis', 'Dias úteis (seg. a sex.)'],
    ['fins-de-semana', 'Fins de semana'],
    ['semana', 'Toda semana'],
    ['quinzena', 'A cada 2 semanas'],
    ['mes', 'Todo mês'],
    ['trimestre', 'A cada 3 meses'],
    ['semestre', 'A cada 6 meses'],
    ['ano', 'Todo ano'],
    ['personalizada', 'Personalizada'],
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

  const ORDENACOES = [
    ['manual', 'Manual'],
    ['data', 'Data'],
    ['criacao', 'Criação'],
    ['prioridade', 'Prioridade'],
    ['titulo', 'Título'],
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
  const ultimoDia = (ano, mes0) => new Date(ano, mes0 + 1, 0).getDate();
  /** Soma meses mantendo o dia (ou o último dia do mês, se faltar). diaAlvo: o dia original da repetição. */
  function somarMeses(iso, n, diaAlvo) {
    const d = paraData(iso);
    const alvo = new Date(d.getFullYear(), d.getMonth() + n, 1, 12);
    alvo.setDate(Math.min(diaAlvo || d.getDate(), ultimoDia(alvo.getFullYear(), alvo.getMonth())));
    return isoData(alvo);
  }
  const diaDaSemana = (iso) => paraData(iso).getDay();
  const minutos = (h) => (h ? +h.slice(0, 2) * 60 + +h.slice(3, 5) : 0);
  const paraHora = (m) => doisDigitos(Math.floor(m / 60)) + ':' + doisDigitos(m % 60);
  const diasEntre = (a, b) => Math.round((paraData(b) - paraData(a)) / 86400000);

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

  /** O compromisso aparece na lista automática? (Para hoje inclui os atrasados, como no Lembretes.) */
  function naLista(item, chave, agora, usuarioId = '') {
    const hoje = isoData(agora);
    switch (chave) {
      case 'hoje': return !item.concluida && Boolean(item.data) && item.data <= hoje;
      case 'programados': return !item.concluida && Boolean(item.data);
      case 'todos': return !item.concluida;
      case 'sinalizados': return !item.concluida && Boolean(item.sinalizado);
      case 'atrasados': return atrasado(item, agora);
      case 'atribuidos': return !item.concluida && Boolean(usuarioId) && item.responsavelId === usuarioId;
      case 'concluidos': return Boolean(item.concluida);
      default: return false;
    }
  }

  const dobrar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR');

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

  const temRepeticao = (item) => Boolean(item.repeticao && item.repeticao.tipo && item.repeticao.tipo !== 'nunca');

  /** Próxima data (e hora) depois de { data, hora }, ou null quando a repetição terminou. */
  function proxima(item, de = { data: item.data, hora: item.hora }) {
    const r = item.repeticao;
    if (!temRepeticao(item) || !de.data) return null;
    const ancora = r.ancora || item.data || de.data;
    const diaAlvo = +ancora.slice(8, 10);
    const n = Math.max(1, +r.intervalo || 1);
    let data = de.data;
    let hora = de.hora;
    const proximoDiaEm = (dias) => { let d = somarDias(data, 1); while (!dias.includes(diaDaSemana(d))) d = somarDias(d, 1); return d; };
    switch (r.tipo) {
      case 'hora':
        if (!hora) { data = somarDias(data, 1); break; }
        if (minutos(hora) + 60 >= 1440) { data = somarDias(data, 1); hora = paraHora(minutos(hora) + 60 - 1440); } else hora = paraHora(minutos(hora) + 60);
        break;
      case 'dia': data = somarDias(data, 1); break;
      case 'dias-uteis': data = proximoDiaEm([1, 2, 3, 4, 5]); break;
      case 'fins-de-semana': data = proximoDiaEm([0, 6]); break;
      case 'semana': data = somarDias(data, 7); break;
      case 'quinzena': data = somarDias(data, 14); break;
      case 'mes': data = somarMeses(data, 1, diaAlvo); break;
      case 'trimestre': data = somarMeses(data, 3, diaAlvo); break;
      case 'semestre': data = somarMeses(data, 6, diaAlvo); break;
      case 'ano': data = somarMeses(data, 12, diaAlvo); break;
      case 'personalizada': {
        const u = r.unidade || 'semana';
        if (u === 'dia') data = somarDias(data, n);
        else if (u === 'mes') data = somarMeses(data, n, diaAlvo);
        else if (u === 'ano') data = somarMeses(data, 12 * n, diaAlvo);
        else {
          const dias = (r.diasSemana && r.diasSemana.length ? r.diasSemana : [diaDaSemana(ancora)]).slice().sort();
          const resto = dias.filter((d) => d > diaDaSemana(data));
          // Ainda nesta semana; senão, o primeiro dia escolhido daqui a n semanas.
          data = resto.length ? somarDias(data, resto[0] - diaDaSemana(data)) : somarDias(inicioDaSemana(data), 7 * n + dias[0]);
        }
        break;
      }
      default: return null;
    }
    const fim = r.fim || { tipo: 'nunca' };
    if (fim.tipo === 'data' && fim.data && data > fim.data) return null;
    if (fim.tipo === 'vezes' && (r.feitas || 0) + 1 >= Math.max(1, +fim.vezes || 1)) return null;
    return { data, hora };
  }

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
    let t = (REPETICOES.find(([k]) => k === r.tipo) || [, ''])[1];
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
  const temPonto = (loc) => Boolean(loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng));
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
    if (item.horaFim && !horaValida(item.horaFim)) return 'Informe uma hora de término válida (HH:MM).';
    if (item.horaFim && !item.hora) return 'Para marcar o término, informe a hora de início.';
    if (item.horaFim && item.horaFim <= item.hora) return 'O término precisa ser depois do início.';
    if (item.prioridade && !(item.prioridade in PESO_PRIORIDADE)) return 'Prioridade inválida.';
    if ((item.subtarefas || []).some((s) => !String(s.titulo || '').trim())) return 'Há subtarefa sem nome.';
    if (item.url && !/^https?:\/\/[^\s]+\.[^\s]+/i.test(item.url)) return 'Informe o endereço completo, começando com http:// ou https://.';
    const r = item.repeticao;
    if (r && r.tipo && r.tipo !== 'nunca') {
      if (!item.data) return 'Para repetir, informe a data.';
      if (r.tipo === 'hora' && !item.hora) return 'Para repetir de hora em hora, informe a hora.';
      if (r.tipo === 'personalizada' && !(+r.intervalo >= 1 && +r.intervalo <= 99)) return 'Informe de quanto em quanto tempo repete (1 a 99).';
      if (r.fim && r.fim.tipo === 'data' && (!dataValida(r.fim.data) || r.fim.data < item.data)) return 'O fim da repetição precisa ser uma data a partir do primeiro dia.';
      if (r.fim && r.fim.tipo === 'vezes' && !(+r.fim.vezes >= 1 && +r.fim.vezes <= 999)) return 'Informe quantas vezes repete (1 a 999).';
    }
    if (item.alerta !== null && item.alerta !== undefined && item.alerta !== '' && !item.data) return 'Para o alerta, informe a data.';
    const loc = item.localizacao;
    if (loc && (loc.lat !== undefined || loc.lng !== undefined) && !(temPonto(loc) && Math.abs(loc.lat) <= 90 && Math.abs(loc.lng) <= 180)) return 'O ponto marcado no mapa é inválido.';
    if (loc && loc.aviso && !temPonto(loc)) return 'Para avisar ao entrar ou sair, marque o lugar no mapa.';
    if (loc && loc.aviso && !['entrar', 'sair'].includes(loc.aviso)) return 'Aviso por lugar inválido.';
    if (loc && loc.aviso && !(+loc.raio >= 50 && +loc.raio <= 50000)) return 'Informe o raio do aviso.';
    return '';
  }

  /* ---------- Calendário ---------- */

  /** Domingo da semana do dia (a semana começa no domingo, como no protótipo). */
  function inicioDaSemana(iso) { return somarDias(iso, -diaDaSemana(iso)); }
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
    PRIORIDADES, LISTAS_AUTOMATICAS, REPETICOES, ALERTAS, RAIOS, ORDENACOES, distancia, temPonto, cruzouLugar, HORA_ALERTA_DIA_TODO, DIAS_CURTOS, DIAS_LONGOS, MESES,
    isoData, horaAgora, somarDias, somarMeses, diaDaSemana, dataValida, horaValida, minutos, paraHora, diasEntre,
    atrasado, naLista, combinaBusca, comparar, comparador, filtrar, contagens, progresso, agrupar,
    temRepeticao, proxima, ocorrencias, resumoRepeticao, momentoAlerta, interpretar,
    normalizarEtiquetas, validar,
    inicioDaSemana, semana, gradeDoMes, porDia, doDia, blocosDoDia,
    dataCurta, rotuloData, quando, tituloMes, tituloDia, tituloSemana,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CicluzAgendaDominio = api;
})(typeof window !== 'undefined' ? window : globalThis);
