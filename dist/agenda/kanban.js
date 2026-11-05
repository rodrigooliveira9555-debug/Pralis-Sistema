/*
 * Agenda — Kanban (referência: MindMeister/MeisterTask e o protótipo do Figma).
 * Colunas editáveis (A fazer, Em progresso…) e "Concluído" fixa no fim: levar um cartão para lá conclui
 * o compromisso; tirar de lá reabre. Cartão: prioridade, título, progresso das subtarefas, data,
 * responsável e etiquetas. Arrastar entre colunas no computador; no celular, as colunas rolam para o
 * lado e a coluna é escolhida no compromisso ("Coluna do Kanban"). Mostra a lista escolhida (ou todas).
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const D = window.CicluzAgendaDominio;
  const A = window.CicluzAgendaDados;
  const { el, botao, svg } = U;
  const TOM_PRIORIDADE = { 'muito-alta': 'negativo', alta: 'atencao', normal: 'marca', baixa: 'neutro', 'muito-baixa': 'neutro' };
  const nomePrioridade = Object.fromEntries(D.PRIORIDADES);
  const MAX_CONCLUIDOS = 30;

  function render(body, ctx) {
    const agora = new Date();
    // Qual lista o quadro mostra
    const barra = el('div', 'agenda-kanban-barra');
    const sel = U.seletor([['auto:todos', 'Todas as listas'], ...ctx.listas.map((l) => ['lista:' + l.id, l.nome])], ctx.selecao.listaId ? 'lista:' + ctx.selecao.listaId : 'auto:todos');
    sel.onchange = () => { const [t, v] = sel.value.split(':'); ctx.escolher(t === 'lista' ? { listaId: v } : { automatica: v }); };
    barra.append(U.campo('Quadro', sel), botao('Editar colunas', editarColunas, 'compras-chip'));
    body.append(barra);

    const quadro = el('div', 'agenda-kanban');
    const colunas = [...A.dados.colunas.map((c) => ({ id: c.id, nome: c.nome })), { id: A.CONCLUIDO, nome: 'Concluído' }];
    colunas.forEach((c, n) => {
      const doQuadro = ctx.itens.filter((i) => A.colunaDe(i) === c.id);
      const cartoes = c.id === A.CONCLUIDO ? doQuadro.slice(0, MAX_CONCLUIDOS) : doQuadro;
      const col = el('section', 'agenda-kanban-coluna' + (c.id === A.CONCLUIDO ? ' concluido' : ''));
      col.dataset.coluna = c.id;
      const cab = el('div', 'agenda-kanban-cab');
      const ponto = el('span', 'agenda-kanban-ponto k-' + Math.min(n, 2) + (c.id === A.CONCLUIDO ? ' k-feito' : ''));
      const h = el('h3', null, c.nome);
      h.prepend(ponto);
      h.append(el('span', 'compras-conta' + (doQuadro.length ? ' ativa' : ''), String(doQuadro.length)));
      const novo = botao('', () => ctx.novoNaColuna(c.id), 'agenda-icone-botao');
      novo.innerHTML = svg('<path d="M12 5v14M5 12h14"/>');
      novo.setAttribute('aria-label', 'Novo compromisso em ' + c.nome);
      cab.append(h);
      if (c.id !== A.CONCLUIDO) cab.append(novo);
      const lista = el('div', 'agenda-kanban-cartoes');
      cartoes.forEach((i) => lista.append(cartao(i, ctx, agora)));
      if (!cartoes.length) lista.append(el('p', 'agenda-kanban-vazio', c.id === A.CONCLUIDO ? 'Arraste para cá o que terminar.' : 'Nada aqui.'));
      if (doQuadro.length > cartoes.length) lista.append(U.nota('Mostrando os ' + MAX_CONCLUIDOS + ' mais recentes.'));
      col.append(cab, lista);
      col.ondragover = (e) => { if ([...e.dataTransfer.types].includes('text/agenda-cartao')) { e.preventDefault(); col.classList.add('recebendo'); } };
      col.ondragleave = (e) => { if (!col.contains(e.relatedTarget)) col.classList.remove('recebendo'); };
      col.ondrop = (e) => {
        e.preventDefault();
        col.classList.remove('recebendo');
        const id = e.dataTransfer.getData('text/agenda-cartao');
        if (!id) return;
        const antes = A.item(id);
        if (A.moverColuna(id, c.id) && antes) U.avisar(c.id === A.CONCLUIDO ? 'Concluído.' : 'Movido para ' + c.nome + '.');
      };
      quadro.append(col);
    });
    body.append(quadro);
  }

  function cartao(i, ctx, agora) {
    const b = botao('', () => ctx.abrirItem(i.id), 'agenda-cartao' + (i.concluida ? ' concluida' : '') + (D.atrasado(i, agora) ? ' atrasada' : ''));
    b.style.setProperty('--lista-cor', ctx.corDaLista(i.listaId));
    b.draggable = A.acesso(i).editar || A.acesso(i).concluir;
    b.ondragstart = (e) => { e.dataTransfer.setData('text/agenda-cartao', i.id); e.dataTransfer.effectAllowed = 'move'; b.classList.add('arrastando'); };
    b.ondragend = () => b.classList.remove('arrastando');
    const topo = el('span', 'agenda-cartao-topo');
    topo.append(U.situacao(i.prioridade === 'normal' ? 'Normal' : nomePrioridade[i.prioridade] + ' prioridade', TOM_PRIORIDADE[i.prioridade] || 'neutro'));
    if (i.sinalizado) { const f = el('span', 'agenda-cartao-bandeira'); f.innerHTML = svg('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'); f.setAttribute('aria-label', 'Sinalizado'); topo.append(f); }
    b.append(topo, el('b', 'agenda-cartao-titulo', i.titulo));
    const pr = D.progresso(i);
    const pct = i.concluida ? 100 : pr.total ? Math.round(pr.feitas / pr.total * 100) : 0;
    const prog = el('span', 'agenda-cartao-progresso');
    prog.append(el('small', null, 'Progresso'), el('small', null, i.concluida ? 'Feito' : pr.total ? pct + '%' : 'Sem subtarefas'));
    const trilho = el('span', 'agenda-progresso');
    trilho.setAttribute('role', 'progressbar');
    trilho.setAttribute('aria-valuenow', String(pct));
    trilho.setAttribute('aria-valuemin', '0');
    trilho.setAttribute('aria-valuemax', '100');
    trilho.setAttribute('aria-label', 'Progresso de ' + i.titulo);
    const enchimento = el('span');
    enchimento.style.width = pct + '%';
    trilho.append(enchimento);
    b.append(prog, trilho);
    const meta = [];
    if (i.data) meta.push(D.quando(i, agora));
    const resps = D.responsaveis(i);
    if (resps.length) meta.push(resps.map((p) => A.nomePessoa(p)).join(', '));
    (i.etiquetas || []).slice(0, 3).forEach((t) => meta.push('#' + t));
    if (meta.length) b.append(el('small', 'agenda-cartao-meta', meta.join(' · ')));
    return b;
  }

  function editarColunas() {
    U.dialogo({
      titulo: 'Colunas do Kanban',
      subtitulo: '"Concluído" fica sempre no fim: levar um cartão para lá conclui o compromisso.',
      cor: window.CicluzAgenda.COR,
      corTexto: window.CicluzAgenda.COR_TEXTO,
      classe: 'agenda-dialog',
      montar: (form) => {
        const box = el('div', 'compras-lista agenda-colunas-edicao');
        const desenhar = () => {
          box.replaceChildren(...A.dados.colunas.map((c) => {
            const qtd = A.dados.itens.filter((i) => !i.concluida && A.colunaDe(i) === c.id).length;
            return U.linhaLista({ titulo: c.nome, detalhe: qtd + ' cartão(ões)', direita: [botao('Renomear', () => nomeColuna(c, desenhar)), botao('Excluir', () => { const r = A.excluirColuna(c.id); if (r.erro) return U.avisar(r.erro); desenhar(); U.avisar('Coluna excluída.'); }, 'btn secondary perigo-texto')] });
          }));
        };
        desenhar();
        form.append(box, botao('Nova coluna', () => nomeColuna(null, desenhar), 'btn secondary'));
      },
    });
  }

  function nomeColuna(c, depois) {
    U.dialogo({
      titulo: c ? 'Renomear coluna' : 'Nova coluna',
      cor: window.CicluzAgenda.COR,
      corTexto: window.CicluzAgenda.COR_TEXTO,
      classe: 'agenda-dialog',
      rotuloSalvar: 'Salvar coluna',
      montar: (form) => { const nome = U.entrada('text', c ? c.nome : '', { maxLength: 30, required: true }); form.append(U.campo('Nome', nome)); return { nome }; },
      salvar: (x) => { const r = A.salvarColuna(c ? c.id : '', x.nome.value); if (r.erro) return r.erro; depois(); U.avisar('Coluna salva.'); return undefined; },
    });
  }

  window.CicluzAgendaKanban = { render };
})();
