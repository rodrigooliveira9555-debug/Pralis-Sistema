/*
 * Agenda — calendário, como o Calendário do iPhone/macOS:
 * - Dia e Semana em grade de horas (faixa "Dia todo" no alto, linha vermelha na hora atual, tocar num
 *   horário vazio cria ali, arrastar um bloco muda dia e hora mantendo a duração). No celular, a Semana
 *   vira uma lista de dias (sete colunas de horas não cabem em 320 px).
 * - Mês: pílulas (pontos no celular) e o dia escolhido embaixo da grade.
 * - Ano: 12 meses pequenos; tocar num dia abre o dia.
 * - As repetições aparecem nos dias futuros; as listas podem ser escondidas (como os calendários do iPhone).
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const D = window.CicluzAgendaDominio;
  const { el, botao, svg } = U;
  const MAX_NO_MES = 3;
  const ALTURA_HORA = 48; // px por hora na grade
  const CHAVE_OCULTAS = 'cicluz-agenda-calendario-ocultas'; // preferência do aparelho (não é dado da empresa)

  let ocultas = new Set();
  try { ocultas = new Set(JSON.parse(localStorage.getItem(CHAVE_OCULTAS) || '[]')); } catch (e) { /* sem preferência */ }
  const guardarOcultas = () => { try { localStorage.setItem(CHAVE_OCULTAS, JSON.stringify([...ocultas])); } catch (e) { /* segue na memória */ } };

  function render(body, ctx) {
    const est = ctx.estado;
    const hoje = D.isoData(new Date());
    const agora = new Date();
    const visiveis = ctx.itens.filter((i) => !ocultas.has(i.listaId));
    const c = { ...ctx, itens: visiveis, hoje, agora };

    const barra = el('div', 'agenda-cal-barra');
    const nav = el('div', 'agenda-cal-nav');
    const passo = (n) => {
      est.ref = est.modo === 'ano' ? D.somarMeses(est.ref, 12 * n) : est.modo === 'mes' ? D.somarMeses(est.ref, n) : D.somarDias(est.ref, est.modo === 'semana' ? 7 * n : n);
      ctx.aoMudar();
    };
    const nomes = { dia: ['Dia anterior', 'Próximo dia'], semana: ['Semana anterior', 'Próxima semana'], mes: ['Mês anterior', 'Próximo mês'], ano: ['Ano anterior', 'Próximo ano'] }[est.modo];
    const ant = botao('', () => passo(-1), 'agenda-icone-botao');
    ant.innerHTML = svg('<path d="m15 6-6 6 6 6"/>');
    ant.setAttribute('aria-label', nomes[0]);
    const prox = botao('', () => passo(1), 'agenda-icone-botao');
    prox.innerHTML = svg('<path d="m9 6 6 6-6 6"/>');
    prox.setAttribute('aria-label', nomes[1]);
    const hj = botao('Hoje', () => { est.ref = hoje; ctx.aoMudar(); }, 'compras-chip');
    const titulo = el('h3', 'agenda-cal-titulo', est.modo === 'ano' ? est.ref.slice(0, 4) : est.modo === 'mes' ? D.tituloMes(est.ref) : est.modo === 'semana' ? D.tituloSemana(est.ref) : D.tituloDia(est.ref));
    titulo.setAttribute('aria-live', 'polite');
    nav.append(ant, hj, prox, titulo);
    barra.append(nav, U.chips([['dia', 'Dia'], ['semana', 'Semana'], ['mes', 'Mês'], ['ano', 'Ano']], est.modo, (m) => { est.modo = m; ctx.aoMudar(); }));
    body.append(barra, filtroListas(ctx));

    if (est.modo === 'ano') body.append(ano(c));
    // Mês: o dia escolhido aparece embaixo da grade, como no Calendário do iPhone.
    else if (est.modo === 'mes') body.append(mes(c), listaDoDia(c, est.ref));
    else if (est.modo === 'semana') body.append(semana(c));
    else body.append(grade(c, [est.ref]), listaDoDia(c, est.ref, true));
  }

  /** Quais listas aparecem no calendário (como marcar/desmarcar calendários no iPhone). */
  function filtroListas(ctx) {
    const box = el('div', 'compras-chips agenda-cal-listas');
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', 'Listas que aparecem no calendário');
    ctx.listas.forEach((l) => {
      const ligada = !ocultas.has(l.id);
      const b = botao('', () => { if (ligada) ocultas.add(l.id); else ocultas.delete(l.id); guardarOcultas(); ctx.aoMudar(); }, 'compras-chip agenda-chip-lista' + (ligada ? ' ativo' : ''));
      b.setAttribute('aria-pressed', String(ligada));
      const p = el('span', 'agenda-ponto' + (ligada ? '' : ' apagado'));
      p.style.setProperty('--lista-cor', l.cor);
      b.append(p, document.createTextNode(l.nome));
      box.append(b);
    });
    return box;
  }

  /* Pílula de um compromisso (mês, semana no celular, faixa "Dia todo"). */
  function pilula(c, o) {
    const item = o.item;
    const b = botao('', () => c.abrirItem(item.id), 'agenda-pilula' + (item.concluida ? ' concluida' : '') + (o.original && D.atrasado(item, c.agora) ? ' atrasada' : '') + (o.original ? '' : ' repeticao'));
    b.style.setProperty('--lista-cor', c.corDaLista(item.listaId));
    if (o.hora) b.append(el('span', 'agenda-pilula-hora', o.hora));
    b.append(el('span', 'agenda-pilula-titulo', item.titulo));
    b.title = item.titulo + (o.hora ? ' · ' + o.hora + (o.horaFim ? '–' + o.horaFim : '') : '') + (o.original ? '' : ' (repetição)');
    arrastavel(b, item, o);
    return b;
  }
  /* Só a ocorrência original se arrasta (as repetições seguem a regra). */
  function arrastavel(no, item, o) {
    no.draggable = !item.concluida && o.original;
    no.ondragstart = (e) => { e.dataTransfer.setData('text/agenda-id', item.id); e.dataTransfer.effectAllowed = 'move'; };
  }
  /** Área que recebe um compromisso arrastado (dia). */
  function alvoDia(no, data, c) {
    no.ondragover = (e) => { if ([...e.dataTransfer.types].includes('text/agenda-id')) { e.preventDefault(); no.classList.add('recebendo'); } };
    no.ondragleave = () => no.classList.remove('recebendo');
    no.ondrop = (e) => { e.preventDefault(); no.classList.remove('recebendo'); const id = e.dataTransfer.getData('text/agenda-id'); if (id) c.mover(id, data); };
  }

  function cabecalhoDias() {
    const cab = el('div', 'agenda-mes-cab');
    D.DIAS_CURTOS.forEach((d) => cab.append(el('span', null, d)));
    cab.setAttribute('aria-hidden', 'true');
    return cab;
  }

  /* ---------- Mês ---------- */
  function mes(c) {
    const est = c.estado;
    const box = el('div', 'agenda-mes');
    box.append(cabecalhoDias());
    const g = el('div', 'agenda-mes-grade');
    const dias = D.gradeDoMes(est.ref);
    const mapa = D.porDia(c.itens, dias[0], dias[41]);
    const mesAtual = est.ref.slice(0, 7);
    dias.forEach((iso) => {
      const doDia = mapa.get(iso) || [];
      const celula = el('div', 'agenda-mes-dia' + (iso.slice(0, 7) !== mesAtual ? ' fora' : '') + (iso === c.hoje ? ' hoje' : '') + (iso === est.ref ? ' escolhido' : ''));
      const numero = botao(String(+iso.slice(8, 10)), () => { est.ref = iso; c.aoMudar(); }, 'agenda-mes-numero');
      numero.setAttribute('aria-pressed', String(iso === est.ref));
      numero.setAttribute('aria-label', D.tituloDia(iso) + (doDia.length ? ': ' + doDia.length + ' compromisso(s)' : ''));
      celula.append(numero);
      const pils = el('div', 'agenda-mes-itens');
      doDia.slice(0, MAX_NO_MES).forEach((o) => pils.append(pilula(c, o)));
      if (doDia.length > MAX_NO_MES) pils.append(botao('+' + (doDia.length - MAX_NO_MES) + ' mais', () => { est.ref = iso; c.aoMudar(); }, 'agenda-mais'));
      celula.append(pils);
      // No celular a célula é estreita: pontos no lugar das pílulas.
      if (doDia.length) {
        const pontos = el('span', 'agenda-mes-pontos');
        pontos.setAttribute('aria-hidden', 'true');
        doDia.slice(0, 3).forEach((o) => { const p = el('span', 'agenda-ponto' + (o.item.concluida ? ' apagado' : '')); p.style.setProperty('--lista-cor', c.corDaLista(o.item.listaId)); pontos.append(p); });
        celula.append(pontos);
      }
      // Tocar no espaço vazio do dia também escolhe o dia.
      celula.addEventListener('click', (e) => { if (e.target === celula || e.target === pils) { est.ref = iso; c.aoMudar(); } });
      alvoDia(celula, iso, c);
      g.append(celula);
    });
    box.append(g);
    return box;
  }

  /** Lista do dia (embaixo do mês e do dia), com "Dia todo" e as horas. */
  function listaDoDia(c, iso, soDiaTodoNaGrade) {
    const ocorr = D.porDia(c.itens, iso, iso).get(iso) || [];
    const secao = U.secao(D.tituloDia(iso), ocorr.length);
    secao.classList.add('agenda-lista-dia');
    if (soDiaTodoNaGrade) secao.classList.add('so-celular');
    const lista = el('div', 'compras-lista agenda-itens');
    if (!ocorr.length) lista.append(U.vazio('Dia livre.', 'Toque em + para marcar um compromisso neste dia.'));
    const diaTodo = ocorr.filter((o) => !o.hora);
    if (diaTodo.length) { lista.append(el('div', 'agenda-grupo-hora', 'Dia todo')); diaTodo.forEach((o) => lista.append(c.linha(o.item))); }
    let horaAtual = '';
    ocorr.filter((o) => o.hora).forEach((o) => {
      const h = o.hora.slice(0, 2) + ':00';
      if (h !== horaAtual) { horaAtual = h; lista.append(el('div', 'agenda-grupo-hora', h)); }
      lista.append(c.linha(o.item));
    });
    secao.append(lista);
    return secao;
  }

  /* ---------- Grade de horas (Dia e Semana) ---------- */
  function grade(c, dias) {
    const box = el('div', 'agenda-grade' + (dias.length > 1 ? ' semana' : ' dia'));
    box.style.setProperty('--dias', dias.length);
    box.style.setProperty('--altura-hora', ALTURA_HORA + 'px');
    const mapa = D.porDia(c.itens, dias[0], dias[dias.length - 1]);

    // Cabeçalho (só na semana) e faixa "Dia todo"
    if (dias.length > 1) {
      const cab = el('div', 'agenda-grade-cab');
      cab.append(el('span', 'agenda-grade-canto'));
      dias.forEach((iso) => {
        const b = botao('', () => { c.estado.ref = iso; c.estado.modo = 'dia'; c.aoMudar(); }, 'agenda-grade-dia-cab' + (iso === c.hoje ? ' hoje' : ''));
        b.append(el('small', null, D.DIAS_CURTOS[D.diaDaSemana(iso)]), el('b', null, String(+iso.slice(8, 10))));
        b.setAttribute('aria-label', 'Abrir ' + D.tituloDia(iso));
        cab.append(b);
      });
      box.append(cab);
    }
    const faixa = el('div', 'agenda-grade-diatodo');
    faixa.append(el('span', 'agenda-grade-canto', 'Dia todo'));
    dias.forEach((iso) => {
      const cel = el('div', 'agenda-grade-diatodo-dia');
      (mapa.get(iso) || []).filter((o) => !o.hora).forEach((o) => cel.append(pilula(c, o)));
      alvoDia(cel, iso, c);
      faixa.append(cel);
    });
    box.append(faixa);

    // Corpo com as 24 horas (rola por dentro)
    const rolagem = el('div', 'agenda-grade-rolagem');
    const corpo = el('div', 'agenda-grade-corpo');
    const horas = el('div', 'agenda-grade-horas');
    horas.setAttribute('aria-hidden', 'true');
    for (let h = 0; h < 24; h++) horas.append(el('span', null, h ? String(h).padStart(2, '0') + ':00' : ''));
    corpo.append(horas);
    dias.forEach((iso) => {
      const col = el('div', 'agenda-grade-coluna' + (iso === c.hoje ? ' hoje' : ''));
      col.dataset.data = iso;
      col.setAttribute('aria-label', D.tituloDia(iso));
      // Tocar num horário vazio cria ali (arredonda para a meia hora).
      col.addEventListener('click', (e) => {
        if (e.target !== col) return;
        const m = Math.max(0, Math.min(1410, Math.floor(e.offsetY / ALTURA_HORA * 2) * 30));
        c.novoEm(iso, D.paraHora(m));
      });
      // Soltar um bloco: dia e hora do ponto (arredonda para 15 min).
      col.ondragover = (e) => { if ([...e.dataTransfer.types].includes('text/agenda-id')) { e.preventDefault(); col.classList.add('recebendo'); } };
      col.ondragleave = () => col.classList.remove('recebendo');
      col.ondrop = (e) => {
        e.preventDefault();
        col.classList.remove('recebendo');
        const id = e.dataTransfer.getData('text/agenda-id');
        const topo = col.getBoundingClientRect().top;
        const m = Math.max(0, Math.min(1425, Math.round((e.clientY - topo) / ALTURA_HORA * 4) * 15));
        if (id) c.mover(id, iso, D.paraHora(m));
      };
      D.blocosDoDia(mapa.get(iso) || []).forEach((b) => {
        const item = b.item;
        const bloco = botao('', () => c.abrirItem(item.id), 'agenda-bloco' + (item.concluida ? ' concluida' : '') + (b.original ? '' : ' repeticao') + (b.fim - b.ini <= 30 ? ' curto' : ''));
        bloco.style.setProperty('--lista-cor', c.corDaLista(item.listaId));
        bloco.style.top = (b.ini / 60 * ALTURA_HORA) + 'px';
        bloco.style.height = Math.max(20, (b.fim - b.ini) / 60 * ALTURA_HORA - 2) + 'px';
        bloco.style.left = 'calc(' + (b.coluna / b.colunas * 100) + '% + 2px)';
        bloco.style.width = 'calc(' + (100 / b.colunas) + '% - 4px)';
        bloco.append(el('b', null, item.titulo), el('small', null, b.hora + (b.horaFim ? '–' + b.horaFim : '')));
        bloco.title = item.titulo + ' · ' + b.hora + (b.horaFim ? '–' + b.horaFim : '');
        arrastavel(bloco, item, b);
        col.append(bloco);
      });
      if (iso === c.hoje) {
        const linha = el('div', 'agenda-agora');
        linha.style.top = (D.minutos(D.horaAgora(c.agora)) / 60 * ALTURA_HORA) + 'px';
        linha.setAttribute('aria-hidden', 'true');
        col.append(linha);
      }
      corpo.append(col);
    });
    rolagem.append(corpo);
    box.append(rolagem);
    // Começa às 7h (ou uma hora antes de agora, se for hoje e mais tarde).
    requestAnimationFrame(() => {
      rolagem.scrollTop = (dias.includes(c.hoje) ? Math.max(0, c.agora.getHours() - 2) : 7) * ALTURA_HORA;
    });
    return box;
  }

  /* ---------- Semana ---------- */
  function semana(c) {
    const dias = D.semana(c.estado.ref);
    const box = el('div', 'agenda-semana-caixa');
    // Computador e tablet: grade de horas. Celular: um dia embaixo do outro.
    const lista = el('div', 'agenda-semana');
    const mapa = D.porDia(c.itens, dias[0], dias[6]);
    dias.forEach((iso, n) => {
      const doDia = mapa.get(iso) || [];
      const col = el('section', 'agenda-semana-dia' + (iso === c.hoje ? ' hoje' : ''));
      const abrirDia = botao('', () => { c.estado.ref = iso; c.estado.modo = 'dia'; c.aoMudar(); }, 'agenda-semana-data');
      abrirDia.append(el('small', null, D.DIAS_CURTOS[n]), el('b', null, String(+iso.slice(8, 10))));
      abrirDia.setAttribute('aria-label', 'Abrir ' + D.tituloDia(iso));
      const itens = el('div', 'agenda-semana-itens');
      doDia.forEach((o) => itens.append(pilula(c, o)));
      if (!doDia.length) itens.append(el('span', 'agenda-semana-vazio', 'Livre'));
      col.append(abrirDia, itens);
      alvoDia(col, iso, c);
      lista.append(col);
    });
    box.append(grade(c, dias), lista);
    return box;
  }

  /* ---------- Ano ---------- */
  function ano(c) {
    const a = c.estado.ref.slice(0, 4);
    const box = el('div', 'agenda-ano');
    const mapa = D.porDia(c.itens, a + '-01-01', a + '-12-31');
    for (let m = 1; m <= 12; m++) {
      const ref = a + '-' + String(m).padStart(2, '0') + '-01';
      const bloco = el('section', 'agenda-ano-mes');
      const tit = botao(D.MESES[m - 1][0].toUpperCase() + D.MESES[m - 1].slice(1), () => { c.estado.ref = ref; c.estado.modo = 'mes'; c.aoMudar(); }, 'agenda-ano-titulo' + (c.hoje.slice(0, 7) === ref.slice(0, 7) ? ' atual' : ''));
      tit.setAttribute('aria-label', 'Abrir ' + D.tituloMes(ref));
      const g = el('div', 'agenda-ano-grade');
      D.DIAS_CURTOS.forEach((d) => g.append(el('span', 'agenda-ano-sem', d[0])));
      D.gradeDoMes(ref).forEach((iso) => {
        if (iso.slice(0, 7) !== ref.slice(0, 7)) { g.append(el('span')); return; }
        const qtd = (mapa.get(iso) || []).length;
        const b = botao(String(+iso.slice(8, 10)), () => { c.estado.ref = iso; c.estado.modo = 'dia'; c.aoMudar(); }, 'agenda-ano-dia' + (iso === c.hoje ? ' hoje' : '') + (qtd ? ' com' : ''));
        b.setAttribute('aria-label', D.tituloDia(iso) + (qtd ? ': ' + qtd + ' compromisso(s)' : ''));
        g.append(b);
      });
      bloco.append(tit, g);
      box.append(bloco);
    }
    return box;
  }

  window.CicluzAgendaCalendario = { render };
})();
