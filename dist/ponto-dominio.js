/*
 * DES - Ponto Eletrônico — regras puras (sem DOM e sem armazenamento; testadas em tests/ponto-dominio.cjs).
 *
 * As quatro batidas do dia: Entrada, Saída para o intervalo, Retorno do intervalo e Saída.
 *   IDEALIZADO = o que o Cicluz espera (horário e escala vinculados ao colaborador, em Horários e Escalas).
 *   REALIZADO  = o que veio da Conplus, importado em arquivo CSV (a API ainda não existe; PROJECT_BRAIN/11, P-38).
 *   DIFERENÇA  = Realizado − Idealizado, em minutos (positivo = batida depois do esperado). Só aritmética:
 *                tolerância, atraso, falta e hora extra são regras do DP e NÃO são decididas aqui.
 * CONFRONTO (DES - Confronto de Ponto): por competência (mês) — importar, conferir, detalhar, tratar e fechar.
 *   Divergência = batida de dia de trabalho cuja |diferença| passa da TOLERÂNCIA (config do DP, começa em 0), batida que o idealizado
 *   espera e o arquivo não trouxe, dia de trabalho sem batida DENTRO do período que a importação cobre, ou batida em dia de folga/sem escala.
 *   Cada divergência é tratada pelo DP (conferida ou justificada com motivo) e a competência só fecha sem pendências.
 * Horas "HH:MM"; data ISO "AAAA-MM-DD". Vínculo com o colaborador por ID (o CPF do arquivo só serve para achar o ID e não é guardado).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CicluzPontoDominio = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** As quatro batidas, na ordem do dia. chave = campo guardado; rotulo = título da coluna. */
  const BATIDAS = [
    { chave: 'entrada', rotulo: 'Entrada' },
    { chave: 'saidaIntervalo', rotulo: 'Saída intervalo' },
    { chave: 'retornoIntervalo', rotulo: 'Retorno intervalo' },
    { chave: 'saida', rotulo: 'Saída' },
  ];
  const sem = (t) => String(t == null ? '' : t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  /** Nomes aceitos no cabeçalho do arquivo (comparados sem acento, caixa e pontuação). */
  const COLUNAS = {
    cpf: ['cpf'],
    data: ['data', 'dia', 'data da batida', 'data do ponto'],
    entrada: ['entrada', 'entrada 1', 'batida 1', 'hora entrada'],
    saidaIntervalo: ['saida intervalo', 'saida para intervalo', 'saida 1', 'batida 2', 'inicio intervalo', 'inicio do intervalo', 'intervalo inicio'],
    retornoIntervalo: ['retorno intervalo', 'retorno do intervalo', 'entrada 2', 'batida 3', 'fim intervalo', 'fim do intervalo', 'intervalo fim', 'volta intervalo'],
    saida: ['saida', 'saida 2', 'saida final', 'batida 4', 'hora saida'],
  };
  /** Modelo para o DP baixar e preencher. */
  const MODELO_CSV = 'CPF;Data;Entrada;Saída intervalo;Retorno intervalo;Saída\r\n000.000.000-00;01/11/2026;08:00;12:00;13:00;17:00\r\n';

  /* ------------------------------------------------------------------ horas e datas */
  /** "8:05", "08:05", "08h05", "08.05", "0805", "08:05:30" → "08:05"; '' → ''; inválido → null. */
  function hora(t) {
    const s = String(t == null ? '' : t).trim();
    if (!s) return '';
    const m = /^(\d{1,2})\s*[:h.]\s*(\d{2})(?:\s*[:.]\s*\d{2})?$/i.exec(s) || /^(\d{2})(\d{2})$/.exec(s);
    if (!m) return null;
    const h = +m[1], mi = +m[2];
    return h < 24 && mi < 60 ? String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0') : null;
  }
  const minutos = (t) => { const m = /^(\d{2}):(\d{2})$/.exec(t || ''); return m ? +m[1] * 60 + +m[2] : null; };
  /** "DD/MM/AAAA", "DD/MM/AA" (século 20xx) ou "AAAA-MM-DD" → ISO; inexistente → null. */
  function data(t) {
    const s = String(t == null ? '' : t).trim();
    let a, m, d;
    let x = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (x) { a = +x[1]; m = +x[2]; d = +x[3]; } else if ((x = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(s))) { d = +x[1]; m = +x[2]; a = x[3].length === 2 ? 2000 + +x[3] : +x[3]; } else return null;
    const dt = new Date(Date.UTC(a, m - 1, d));
    if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
    return a + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  }
  /** Diferença Realizado − Idealizado em minutos, com sinal; vale a menor distância no relógio (batida depois da meia-noite não vira +24h). null se faltar um dos dois. */
  function diferenca(ideal, real) {
    const i = minutos(ideal), r = minutos(real);
    if (i == null || r == null) return null;
    return ((r - i + 720) % 1440 + 1440) % 1440 - 720;
  }
  /** 0 → "0 min", 5 → "+5 min", -65 → "−1h05"; null → ''. */
  function textoDiferenca(n) {
    if (n == null) return '';
    if (n === 0) return '0 min';
    const a = Math.abs(n), sinal = n > 0 ? '+' : '−';
    return a < 60 ? sinal + a + ' min' : sinal + Math.floor(a / 60) + 'h' + String(a % 60).padStart(2, '0');
  }
  const soDigitos = (t) => String(t == null ? '' : t).replace(/\D/g, '');

  /* ------------------------------------------------------------------ arquivo CSV */
  /** Lê o CSV (separador ; , ou tab; aspas; BOM) → { linhas: [[campos]] }. */
  function lerCsv(texto) {
    let t = String(texto == null ? '' : texto).replace(/^\ufeff/, '');
    const primeira = t.split(/\r?\n/).find((l) => l.trim()) || '';
    const cont = (c) => (primeira.match(new RegExp(c === '\t' ? '\t' : '\\' + c, 'g')) || []).length;
    const sep = [';', ',', '\t'].sort((a, b) => cont(b) - cont(a))[0];
    const linhas = []; let lin = [], cel = '', asp = false;
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (asp) { if (c === '"') { if (t[i + 1] === '"') { cel += '"'; i++; } else asp = false; } else cel += c; }
      else if (c === '"') asp = true;
      else if (c === sep) { lin.push(cel); cel = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; lin.push(cel); cel = ''; if (lin.some((x) => x.trim() !== '')) linhas.push(lin); lin = []; }
      else cel += c;
    }
    lin.push(cel); if (lin.some((x) => x.trim() !== '')) linhas.push(lin);
    return { linhas, separador: sep };
  }
  /** Índice de cada coluna conhecida no cabeçalho; faltando CPF, Data ou Entrada/Saída devolve erro. */
  function mapearColunas(cabecalho) {
    const nomes = cabecalho.map(sem), idx = {};
    for (const [chave, apelidos] of Object.entries(COLUNAS)) idx[chave] = nomes.findIndex((n) => apelidos.includes(n));
    const falta = ['cpf', 'data'].filter((k) => idx[k] < 0).map((k) => (k === 'cpf' ? 'CPF' : 'Data'));
    if (!BATIDAS.some((b) => idx[b.chave] >= 0)) falta.push('ao menos uma batida (Entrada, Saída intervalo, Retorno intervalo ou Saída)');
    return { idx, erro: falta.length ? 'Faltam no cabeçalho: ' + falta.join(', ') + '.' : '' };
  }
  /**
   * Converte o texto do arquivo em batidas por colaborador e dia.
   * porCpf: Map(cpf só dígitos → id da pessoa). Devolve { validas, problemas, total, erro }.
   * Uma linha inválida não derruba as outras: vai para problemas com o número da linha e o motivo.
   */
  function processar(texto, porCpf) {
    const { linhas } = lerCsv(texto);
    if (!linhas.length) return { validas: [], problemas: [], total: 0, erro: 'O arquivo está vazio.' };
    const { idx, erro } = mapearColunas(linhas[0]);
    if (erro) return { validas: [], problemas: [], total: 0, erro };
    const validas = [], problemas = [], vistos = new Map();
    linhas.slice(1).forEach((c, k) => {
      const n = k + 2; // número da linha no arquivo (1 = cabeçalho)
      const cpf = soDigitos(c[idx.cpf]);
      const id = porCpf instanceof Map ? porCpf.get(cpf) : undefined;
      const dia = data(c[idx.data]);
      if (cpf.length !== 11) return problemas.push({ linha: n, motivo: 'CPF inválido.' });
      if (!dia) return problemas.push({ linha: n, motivo: 'Data inválida (use DD/MM/AAAA).' });
      if (!id) return problemas.push({ linha: n, motivo: 'CPF não encontrado no cadastro de colaboradores.' });
      const reg = { pessoaId: id, dia };
      for (const b of BATIDAS) {
        const v = idx[b.chave] >= 0 ? hora(c[idx[b.chave]]) : '';
        if (v === null) return problemas.push({ linha: n, motivo: b.rotulo + ': hora inválida (use HH:MM).' });
        reg[b.chave] = v;
      }
      if (!BATIDAS.some((b) => reg[b.chave])) return problemas.push({ linha: n, motivo: 'Linha sem nenhuma batida.' });
      const chave = id + '|' + dia;
      if (vistos.has(chave)) problemas.push({ linha: n, motivo: 'Repetida no arquivo (mesmo colaborador e dia da linha ' + vistos.get(chave) + '): vale a última.' });
      vistos.set(chave, n);
      validas.push(reg);
    });
    // linhas repetidas: fica a última
    const ultimas = new Map(); validas.forEach((r) => ultimas.set(r.pessoaId + '|' + r.dia, r));
    return { validas: [...ultimas.values()], problemas, total: linhas.length - 1, erro: '' };
  }

  /* ------------------------------------------------------------------ armazenamento (formato) */
  const TOLERANCIA_MAX = 120;
  /** Garante o formato atual. Dado guardado antes dos campos novos (config, tratamentos, competencias) continua valendo. */
  function normalizar(d) {
    const x = d && typeof d === 'object' ? d : {};
    const tol = Math.round(Number(x.config && x.config.toleranciaMin));
    return {
      version: 1,
      realizado: x.realizado && typeof x.realizado === 'object' ? x.realizado : {},
      importacoes: Array.isArray(x.importacoes) ? x.importacoes : [],
      config: { toleranciaMin: tol >= 0 ? Math.min(tol, TOLERANCIA_MAX) : 0 },
      tratamentos: x.tratamentos && typeof x.tratamentos === 'object' ? x.tratamentos : {},
      competencias: x.competencias && typeof x.competencias === 'object' ? x.competencias : {},
    };
  }
  function vazio() { return normalizar({}); }
  /** Aplica as batidas importadas. Dia que já tinha batida do colaborador é substituído (e contado). Não muda o objeto recebido. */
  function aplicar(dados, validas, info = {}) {
    const d = normalizar(JSON.parse(JSON.stringify(dados || vazio())));
    let novos = 0, substituidos = 0; const dias = new Set();
    for (const r of validas) {
      d.realizado[r.dia] = d.realizado[r.dia] || {};
      if (d.realizado[r.dia][r.pessoaId]) substituidos++; else novos++;
      d.realizado[r.dia][r.pessoaId] = Object.fromEntries(BATIDAS.map((b) => [b.chave, r[b.chave] || '']));
      dias.add(r.dia);
    }
    const ordenados = [...dias].sort();
    d.importacoes.unshift({ id: info.id || 'imp-' + Date.now(), quando: info.quando || new Date().toISOString(), arquivo: info.arquivo || '', gravadas: validas.length, novos, substituidos, ignoradas: info.ignoradas || 0, de: ordenados[0] || '', ate: ordenados[ordenados.length - 1] || '' });
    return { dados: d, novos, substituidos };
  }

  /* ------------------------------------------------------------------ idealizado e comparação */
  /**
   * Idealizado do dia a partir do que o Cicluz já tem em Horários e Escalas.
   * jornada = { dayInfo(pessoaId, dia), shiftFor(pessoaId, dia, slot) } (CicluzJornada).
   * → { situacao: 'trabalho' | 'folga' | 'semEscala', batidas: { entrada, saidaIntervalo, retornoIntervalo, saida } }
   */
  function idealizado(jornada, pessoaId, dia) {
    const vazias = { entrada: '', saidaIntervalo: '', retornoIntervalo: '', saida: '' };
    if (!jornada) return { situacao: 'semEscala', batidas: vazias };
    const info = jornada.dayInfo(pessoaId, dia);
    if (info.work === false) return { situacao: 'folga', batidas: vazias };
    if (info.work == null) return { situacao: 'semEscala', batidas: vazias };
    const s = jornada.shiftFor(pessoaId, dia, info.slot);
    if (!s || !s.shift) return { situacao: 'semEscala', batidas: vazias };
    return { situacao: 'trabalho', batidas: { entrada: s.shift.start || '', saidaIntervalo: s.breakStart || '', retornoIntervalo: s.breakEnd || '', saida: s.shift.end || '' } };
  }
  /** Linha de comparação do dia: por batida { ideal, real, dif } e a situação ('trabalho' | 'folga' | 'semEscala'). real é '' quando não há batida importada. */
  function comparar(jornada, dados, pessoaId, dia) {
    const ideal = idealizado(jornada, pessoaId, dia);
    const real = (dados && dados.realizado && dados.realizado[dia] && dados.realizado[dia][pessoaId]) || null;
    const batidas = {};
    for (const b of BATIDAS) {
      const i = ideal.batidas[b.chave], r = real ? real[b.chave] || '' : '';
      batidas[b.chave] = { ideal: i, real: r, dif: diferenca(i, r) };
    }
    return { situacao: ideal.situacao, temRealizado: !!real, batidas };
  }
  /** Dias do mês (mes 0-11) em ISO. */
  function diasDoMes(ano, mes) {
    const n = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
    return Array.from({ length: n }, (_, i) => ano + '-' + String(mes + 1).padStart(2, '0') + '-' + String(i + 1).padStart(2, '0'));
  }
  const SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const diaDaSemana = (iso) => SEMANA[new Date(iso + 'T12:00:00Z').getUTCDay()];
  const dataBR = (iso) => (iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '');
  /** Resumo do mês de um colaborador: contagens simples, sem classificar atraso nem falta. */
  function resumoMes(jornada, dados, pessoaId, dias) {
    const r = { dias: dias.length, trabalho: 0, folga: 0, semEscala: 0, comBatida: 0, semBatida: 0 };
    for (const d of dias) {
      const c = comparar(jornada, dados, pessoaId, d);
      r[c.situacao]++;
      if (c.temRealizado) r.comBatida++; else if (c.situacao === 'trabalho') r.semBatida++;
    }
    return r;
  }

  /* ------------------------------------------------------------------ confronto */
  const competenciaDe = (dia) => String(dia).slice(0, 7);
  const chaveItem = (pessoaId, dia) => pessoaId + '|' + dia;
  const fechada = (dados, comp) => !!(dados && dados.competencias && dados.competencias[comp] && dados.competencias[comp].fechada);
  /** Tolerância valendo na competência: a do fechamento (fica congelada) ou a de agora. */
  function toleranciaDe(dados, comp) {
    const c = dados && dados.competencias && dados.competencias[comp];
    if (c && c.fechada && c.tolerancia != null) return c.tolerancia;
    return normalizar(dados).config.toleranciaMin;
  }
  /** Período (primeiro e último dia) que a importação cobre dentro dos dias da competência; null se nada foi importado. */
  function cobertura(dados, dias) {
    const com = dias.filter((d) => dados && dados.realizado && dados.realizado[d] && Object.keys(dados.realizado[d]).length);
    return com.length ? { de: com[0], ate: com[com.length - 1], dias: com.length } : null;
  }
  /**
   * Avalia o dia de um colaborador. cmp = comparar(...). cob = cobertura da competência. hoje = ISO de hoje.
   * → null (sem divergência) ou { tipo, itens: [{ batida, rotulo, motivo, dif }], maior }.
   * tipo: 'diferenca' | 'ausente' | 'semBatida' | 'foraDeEscala'.
   */
  function avaliarDia(cmp, tolerancia, cob, dia, hoje) {
    const itens = [];
    if (cmp.situacao !== 'trabalho') {
      if (cmp.temRealizado) return { tipo: 'foraDeEscala', itens: [{ batida: '', rotulo: 'Dia', motivo: 'Há batida em dia de ' + (cmp.situacao === 'folga' ? 'folga' : 'sem escala vinculada') + '.', dif: null }], maior: 0 };
      return null;
    }
    if (!cmp.temRealizado) {
      if (cob && dia >= cob.de && dia <= cob.ate && (!hoje || dia <= hoje)) return { tipo: 'semBatida', itens: [{ batida: '', rotulo: 'Dia', motivo: 'Dia de trabalho sem batida no período importado.', dif: null }], maior: 0 };
      return null;
    }
    let maior = 0, temDif = false;
    for (const b of BATIDAS) {
      const x = cmp.batidas[b.chave];
      if (x.dif != null && Math.abs(x.dif) > tolerancia) { itens.push({ batida: b.chave, rotulo: b.rotulo, motivo: textoDiferenca(x.dif) + ' (esperado ' + x.ideal + ', veio ' + x.real + ').', dif: x.dif }); maior = Math.max(maior, Math.abs(x.dif)); temDif = true; }
      else if (x.ideal && !x.real) itens.push({ batida: b.chave, rotulo: b.rotulo, motivo: 'Batida esperada (' + x.ideal + ') que o arquivo não trouxe.', dif: null });
    }
    return itens.length ? { tipo: temDif ? 'diferenca' : 'ausente', itens, maior } : null;
  }
  /** Divergências do mês de um colaborador, já com o tratamento de cada uma. */
  function divergenciasDoMes(jornada, dados, pessoaId, dias, hoje) {
    const d = normalizar(dados); const comp = dias.length ? competenciaDe(dias[0]) : ''; const tol = toleranciaDe(d, comp); const cob = cobertura(d, dias);
    const trat = d.tratamentos[comp] || {}; const out = [];
    for (const dia of dias) {
      const av = avaliarDia(comparar(jornada, d, pessoaId, dia), tol, cob, dia, hoje);
      if (av) out.push({ pessoaId, dia, chave: chaveItem(pessoaId, dia), ...av, tratamento: trat[chaveItem(pessoaId, dia)] || null });
    }
    return out;
  }
  /**
   * Painel da competência: uma linha por colaborador.
   * situacao: 'semImportacao' (nada importado no mês) | 'semDivergencia' | 'pendente' (há divergência sem tratamento) | 'tratado'.
   */
  function painel(jornada, dados, pessoas, dias, hoje) {
    const d = normalizar(dados); const comp = dias.length ? competenciaDe(dias[0]) : ''; const cob = cobertura(d, dias);
    const linhas = pessoas.map((p) => {
      const div = divergenciasDoMes(jornada, d, p.id, dias, hoje);
      const comBatida = dias.filter((x) => d.realizado[x] && d.realizado[x][p.id]).length;
      const tratados = div.filter((x) => x.tratamento).length;
      const pendentes = div.length - tratados;
      return {
        pessoaId: p.id, nome: p.name, diasComBatida: comBatida, divergentes: div.length, tratados, pendentes,
        maior: div.reduce((m, x) => Math.max(m, x.maior), 0), semBatida: div.filter((x) => x.tipo === 'semBatida').length,
        situacao: !cob ? 'semImportacao' : !div.length ? 'semDivergencia' : pendentes ? 'pendente' : 'tratado',
      };
    });
    const totais = { colaboradores: linhas.length, divergentes: 0, pendentes: 0, tratados: 0 };
    linhas.forEach((l) => { totais.divergentes += l.divergentes; totais.pendentes += l.pendentes; totais.tratados += l.tratados; });
    return { competencia: comp, tolerancia: toleranciaDe(d, comp), cobertura: cob, fechada: fechada(d, comp), linhas, totais };
  }
  /** Lista única de divergências da competência (todos os colaboradores), das mais antigas para as mais novas por colaborador. */
  function pendencias(jornada, dados, pessoas, dias, hoje) {
    const out = [];
    pessoas.forEach((p) => divergenciasDoMes(jornada, dados, p.id, dias, hoje).forEach((x) => out.push({ ...x, nome: p.name })));
    return out.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR') || a.dia.localeCompare(b.dia));
  }

  /* ------------------------------------------------------------------ tratamento, tolerância e fechamento (devolvem { dados, erro }) */
  const copia = (d) => normalizar(JSON.parse(JSON.stringify(normalizar(d))));
  function definirTolerancia(dados, minutos, competenciaAberta = true) {
    const n = Math.round(Number(minutos));
    if (!(n >= 0) || n > TOLERANCIA_MAX) return { dados, erro: 'Informe a tolerância em minutos, de 0 a ' + TOLERANCIA_MAX + '.' };
    if (!competenciaAberta) return { dados, erro: 'A competência está fechada: a tolerância dela não muda.' };
    const d = copia(dados); d.config.toleranciaMin = n; return { dados: d, erro: '' };
  }
  /** status: 'conferido' ou 'justificado' (esta exige motivo). Competência fechada não aceita tratamento. */
  function tratar(dados, comp, chave, status, motivo, quando) {
    if (!['conferido', 'justificado'].includes(status)) return { dados, erro: 'Escolha Conferido ou Justificado.' };
    if (fechada(dados, comp)) return { dados, erro: 'A competência está fechada. Reabra para tratar.' };
    const m = String(motivo == null ? '' : motivo).trim();
    if (status === 'justificado' && m.length < 3) return { dados, erro: 'Escreva o motivo da justificativa.' };
    const d = copia(dados); d.tratamentos[comp] = d.tratamentos[comp] || {};
    d.tratamentos[comp][chave] = { status, motivo: status === 'justificado' ? m : '', quando: quando || new Date().toISOString() };
    return { dados: d, erro: '' };
  }
  function desfazer(dados, comp, chave) {
    if (fechada(dados, comp)) return { dados, erro: 'A competência está fechada. Reabra para desfazer.' };
    const d = copia(dados); if (d.tratamentos[comp]) delete d.tratamentos[comp][chave];
    return { dados: d, erro: '' };
  }
  /** Fecha só sem pendências e sem tratamento por fazer; congela a tolerância e guarda o resumo. */
  function fechar(dados, comp, resumo, quando) {
    if (fechada(dados, comp)) return { dados, erro: 'A competência já está fechada.' };
    if (resumo && resumo.pendentes > 0) return { dados, erro: 'Ainda há ' + resumo.pendentes + ' divergência(s) sem tratamento.' };
    const d = copia(dados);
    d.competencias[comp] = { fechada: true, fechadaEm: quando || new Date().toISOString(), tolerancia: d.config.toleranciaMin, resumo: resumo ? { divergentes: resumo.divergentes, tratados: resumo.tratados, colaboradores: resumo.colaboradores } : null };
    return { dados: d, erro: '' };
  }
  function reabrir(dados, comp, quando) {
    if (!fechada(dados, comp)) return { dados, erro: 'A competência não está fechada.' };
    const d = copia(dados); const c = d.competencias[comp];
    d.competencias[comp] = { fechada: false, reabertaEm: quando || new Date().toISOString(), fechadaAntes: c.fechadaEm || '' };
    return { dados: d, erro: '' };
  }

  return { TOLERANCIA_MAX, normalizar, competenciaDe, chaveItem, fechada, toleranciaDe, cobertura, avaliarDia, divergenciasDoMes, painel, pendencias, definirTolerancia, tratar, desfazer, fechar, reabrir, BATIDAS, COLUNAS, MODELO_CSV, hora, minutos, data, diferenca, textoDiferenca, lerCsv, mapearColunas, processar, vazio, aplicar, idealizado, comparar, diasDoMes, diaDaSemana, dataBR, resumoMes, soDigitos };
});
