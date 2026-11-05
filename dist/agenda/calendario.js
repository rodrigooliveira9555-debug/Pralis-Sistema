/*
 * Agenda — calendário (Dia, Semana, Mês), como o Calendário do iPhone/macOS:
 * ‹ Hoje › para andar, tocar num dia do mês mostra o dia embaixo da grade, arrastar um compromisso para outro dia
 * (no computador) muda a data e mantém a hora. A semana é em colunas (no celular, um dia embaixo
 * do outro) em vez da grade de horas do protótipo: cabe em 320 px e mostra também o "dia todo".
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const D = window.CicluzAgendaDominio;
  const { el, botao, svg } = U;
  const MAX_NO_MES = 2;

  function render(body, ctx) {
    const est = ctx.estado;
    const hoje = D.isoData(new Date());
    const agora = new Date();

    const barra = el('div', 'agenda-cal-barra');
    const nav = el('div', 'agenda-cal-nav');
    const passo = (n) => {
      est.ref = est.modo === 'mes' ? D.somarMeses(est.ref, n) : D.somarDias(est.ref, est.modo === 'semana' ? 7 * n : n);
      ctx.aoMudar();
    };
    const ant = botao('', () => passo(-1), 'agenda-icone-botao');
    ant.innerHTML = svg('<path d="m15 6-6 6 6 6"/>');
    ant.setAttribute('aria-label', est.modo === 'mes' ? 'Mês anterior' : est.modo === 'semana' ? 'Semana anterior' : 'Dia anterior');
    const prox = botao('', () => passo(1), 'agenda-icone-botao');
    prox.innerHTML = svg('<path d="m9 6 6 6-6 6"/>');
    prox.setAttribute('aria-label', est.modo === 'mes' ? 'Próximo mês' : est.modo === 'semana' ? 'Próxima semana' : 'Próximo dia');
    const hj = botao('Hoje', () => { est.ref = hoje; ctx.aoMudar(); }, 'btn secondary agenda-hoje');
    const titulo = el('h3', 'agenda-cal-titulo', est.modo === 'mes' ? D.tituloMes(est.ref) : est.modo === 'semana' ? D.tituloSemana(est.ref) : D.tituloDia(est.ref));
    titulo.setAttribute('aria-live', 'polite');
    nav.append(ant, hj, prox, titulo);
    barra.append(nav, U.chips([['dia', 'Dia'], ['semana', 'Semana'], ['mes', 'Mês']], est.modo, (m) => { est.modo = m; ctx.aoMudar(); }));
    body.append(barra);

    // Mês: o dia escolhido aparece embaixo da grade, como no Calendário do iPhone.
    if (est.modo === 'mes') body.append(mes(ctx, hoje, agora), dia(ctx, est.ref, agora));
    else if (est.modo === 'semana') body.append(semana(ctx, hoje, agora));
    else body.append(dia(ctx, est.ref, agora));
  }

  /* Pílula de um compromisso no mês e na semana (arrastável no computador). */
  function pilula(ctx, item, agora) {
    const b = botao('', () => ctx.abrirItem(item.id), 'agenda-pilula' + (item.concluida ? ' concluida' : '') + (D.atrasado(item, agora) ? ' atrasada' : ''));
    b.style.setProperty('--lista-cor', ctx.corDaLista(item.listaId));
    if (item.hora) b.append(el('span', 'agenda-pilula-hora', item.hora));
    b.append(el('span', 'agenda-pilula-titulo', item.titulo));
    b.title = item.titulo + (item.hora ? ' · ' + item.hora : '');
    b.draggable = !item.concluida;
    b.ondragstart = (e) => { e.dataTransfer.setData('text/agenda-id', item.id); e.dataTransfer.effectAllowed = 'move'; };
    return b;
  }
  /** Área que recebe um compromisso arrastado. */
  function alvoDeArrastar(no, data, ctx) {
    no.ondragover = (e) => { if ([...e.dataTransfer.types].includes('text/agenda-id')) { e.preventDefault(); no.classList.add('recebendo'); } };
    no.ondragleave = () => no.classList.remove('recebendo');
    no.ondrop = (e) => { e.preventDefault(); no.classList.remove('recebendo'); const id = e.dataTransfer.getData('text/agenda-id'); if (id) ctx.mover(id, data); };
  }

  function cabecalhoDias() {
    const c = el('div', 'agenda-mes-cab');
    D.DIAS_CURTOS.forEach((d) => c.append(el('span', null, d)));
    c.setAttribute('aria-hidden', 'true');
    return c;
  }

  function mes(ctx, hoje, agora) {
    const est = ctx.estado;
    const box = el('div', 'agenda-mes');
    box.append(cabecalhoDias());
    const grade = el('div', 'agenda-mes-grade');
    const mesAtual = est.ref.slice(0, 7);
    D.gradeDoMes(est.ref).forEach((iso) => {
      const doDia = D.doDia(ctx.itens, iso);
      const celula = el('div', 'agenda-mes-dia' + (iso.slice(0, 7) !== mesAtual ? ' fora' : '') + (iso === hoje ? ' hoje' : '') + (iso === est.ref ? ' escolhido' : ''));
      const numero = botao(String(+iso.slice(8, 10)), () => { est.ref = iso; ctx.aoMudar(); }, 'agenda-mes-numero');
      numero.setAttribute('aria-pressed', String(iso === est.ref));
      numero.setAttribute('aria-label', D.tituloDia(iso) + (doDia.length ? ': ' + doDia.length + ' compromisso(s)' : ''));
      celula.append(numero);
      const pils = el('div', 'agenda-mes-itens');
      doDia.slice(0, MAX_NO_MES).forEach((i) => pils.append(pilula(ctx, i, agora)));
      if (doDia.length > MAX_NO_MES) pils.append(botao('+' + (doDia.length - MAX_NO_MES) + ' mais', () => { est.ref = iso; ctx.aoMudar(); }, 'agenda-mais'));
      celula.append(pils);
      // No celular a célula é estreita: pontos no lugar das pílulas.
      if (doDia.length) {
        const pontos = el('span', 'agenda-mes-pontos');
        pontos.setAttribute('aria-hidden', 'true');
        doDia.slice(0, 3).forEach((i) => { const p = el('span', 'agenda-ponto' + (i.concluida ? ' apagado' : '')); p.style.setProperty('--lista-cor', ctx.corDaLista(i.listaId)); pontos.append(p); });
        celula.append(pontos);
      }
      alvoDeArrastar(celula, iso, ctx);
      grade.append(celula);
    });
    box.append(grade);
    return box;
  }

  function semana(ctx, hoje, agora) {
    const est = ctx.estado;
    const box = el('div', 'agenda-semana');
    D.semana(est.ref).forEach((iso, n) => {
      const doDia = D.doDia(ctx.itens, iso);
      const col = el('section', 'agenda-semana-dia' + (iso === hoje ? ' hoje' : ''));
      const cab = el('div', 'agenda-semana-cab');
      const abrirDia = botao('', () => { est.ref = iso; est.modo = 'dia'; ctx.aoMudar(); }, 'agenda-semana-data');
      abrirDia.append(el('small', null, D.DIAS_CURTOS[n]), el('b', null, String(+iso.slice(8, 10))));
      abrirDia.setAttribute('aria-label', 'Abrir ' + D.tituloDia(iso));
      const novo = botao('', () => ctx.novoNoDia(iso), 'agenda-icone-botao');
      novo.innerHTML = svg('<path d="M12 5v14M5 12h14"/>');
      novo.setAttribute('aria-label', 'Novo compromisso em ' + D.tituloDia(iso));
      cab.append(abrirDia, novo);
      const itens = el('div', 'agenda-semana-itens');
      doDia.forEach((i) => itens.append(pilula(ctx, i, agora)));
      if (!doDia.length) itens.append(el('span', 'agenda-semana-vazio', 'Livre'));
      col.append(cab, itens);
      alvoDeArrastar(col, iso, ctx);
      box.append(col);
    });
    return box;
  }

  function dia(ctx, iso, agora) {
    const doDia = D.doDia(ctx.itens, iso);
    const diaTodo = doDia.filter((i) => !i.hora);
    const comHora = doDia.filter((i) => i.hora);
    const secao = U.secao(D.tituloDia(iso), doDia.length, botao('Novo neste dia', () => ctx.novoNoDia(iso), 'btn secondary'));
    const lista = el('div', 'compras-lista agenda-itens');
    if (!doDia.length) lista.append(U.vazio('Dia livre.', 'Toque em "Novo neste dia" para marcar um compromisso.'));
    if (diaTodo.length) { lista.append(el('div', 'agenda-grupo-hora', 'Dia todo')); diaTodo.forEach((i) => lista.append(ctx.linha(i))); }
    let horaAtual = '';
    comHora.forEach((i) => {
      const h = i.hora.slice(0, 2) + ':00';
      if (h !== horaAtual) { horaAtual = h; lista.append(el('div', 'agenda-grupo-hora', h)); }
      lista.append(ctx.linha(i));
    });
    secao.append(lista);
    return secao;
  }

  window.CicluzAgendaCalendario = { render };
})();
