/*
 * Agenda — tela principal (Agenda · Atividades no menu lateral), no formato do Lembretes:
 * à esquerda as listas automáticas (Para hoje, Programados, Todos, Sinalizados, Atrasados, Atribuídos a
 * mim, Concluídos) e "Minhas listas"; à direita a lista escolhida. No celular, a lista abre por cima,
 * com "‹ Listas" para voltar. Abas: Listas, Calendário (agenda/calendario.js) e Kanban (agenda/kanban.js).
 * Peças de tela, diálogo e abas: as mesmas do Compras (compras/ui.js), na cor roxa do menu Agenda.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const D = window.CicluzAgendaDominio;
  const A = window.CicluzAgendaDados;
  const { el, botao, svg } = U;
  const COR = '#7c3aed';
  const COR_TEXTO = '#5520ad';
  const PATH_MAIS = 'M12 5v14M5 12h14';
  const ICONES = {
    hoje: '<path d="M4 5h16v16H4zM4 10h16M8 3v4m8-4v4"/><path d="M12 13v4"/>',
    programados: '<path d="M4 5h16v16H4zM4 10h16M8 3v4m8-4v4M8 14h2m4 0h2M8 18h2"/>',
    todos: '<path d="M4 4h16v16H4zM8 9h8M8 13h8M8 17h5"/>',
    sinalizados: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    atrasados: '<path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7v5l3 2"/>',
    atribuidos: '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0"/>',
    concluidos: '<path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM8 12l3 3 5-6"/>',
    bandeira: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    seta: '<path d="m9 6 6 6-6 6"/>',
    voltar: '<path d="m15 6-6 6 6 6"/>',
    lixeira: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    repetir: '<path d="M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4"/>',
    sino: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    local: '<path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
    arrastar: '<path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01"/>',
  };
  /* Ícones das listas (como os do Lembretes). */
  const ICONES_LISTA = {
    lista: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
    pessoas: '<path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2 20a7 7 0 0 1 14 0M16 4a3.5 3.5 0 0 1 0 7M18 13.5A7 7 0 0 1 22 20"/>',
    operacao: '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    carrinho: '<path d="M2 3h3l3 13h12l2-10H6M10 21h1m6 0h1"/>',
    loja: '<path d="M3 9l1.5-5h15L21 9M4 9v11h16V9M3 9h18M9 20v-6h6v6"/>',
    estrela: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"/>',
    coracao: '<path d="M12 20s-8-4.7-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.3 12 20 12 20Z"/>',
    casa: '<path d="m3 10 9-7 9 7M5 9v12h14V9M10 21v-6h4v6"/>',
    maleta: '<path d="M3 7h18v13H3zM8 7V4h8v3M3 12h18"/>',
    pao: '<path d="M4 11a8 5 0 0 1 16 0v8H4zM8 11v8M12 11v8M16 11v8"/>',
    caminhao: '<path d="M2 6h11v10H2zM13 10h4l4 4v2h-8M6 19a2 2 0 1 0 0-.01M17 19a2 2 0 1 0 0-.01"/>',
    dinheiro: '<path d="M3 6h18v12H3zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM6 9v.01M18 15v.01"/>',
  };
  const TOM_PRIORIDADE = { 'muito-alta': 'negativo', alta: 'atencao', baixa: 'neutro', 'muito-baixa': 'neutro' };
  const nomePrioridade = Object.fromEntries(D.PRIORIDADES);
  const nomeAuto = Object.fromEntries(D.LISTAS_AUTOMATICAS);

  const estado = {
    visao: 'listas', // listas | calendario | kanban
    automatica: 'todos', // lista automática escolhida ('' quando é uma lista do usuário)
    listaId: '', // lista do usuário escolhida
    detalhe: false, // celular: a lista está aberta por cima das listas
    busca: '',
    mostrarConcluidos: false,
    abertos: new Set(), // compromissos com subtarefas à mostra
    calendario: { modo: 'mes', ref: D.isoData(new Date()) },
  };
  let tela = null;

  function voltar() { if (typeof returnToNavigation === 'function') returnToNavigation(); }
  const tituloVisao = () => (estado.listaId ? (A.lista(estado.listaId) || { nome: 'Lista' }).nome : nomeAuto[estado.automatica]);
  const caminho = () => 'Agenda · Atividades / ' + tituloVisao();

  function garantirTela() {
    if (tela) return tela;
    tela = U.criarTela({ id: 'agenda-view', titulo: 'Agenda', caminho: caminho(), icone: 'agenda', voltar, cor: COR, corTexto: COR_TEXTO, classe: 'agenda-view' });
    U.atalho(tela, 'Novo compromisso', PATH_MAIS, () => editar(null, padraoNovo()), { criar: true });
    document.addEventListener('cicluz-agenda-mudou', () => { if (tela.view.classList.contains('show')) render(); });
    // Mensagens novas no chat: a linha do compromisso mostra (sem redesenhar com diálogo aberto).
    document.addEventListener('cicluz-agenda-conversa', () => { if (tela.view.classList.contains('show') && !document.querySelector('dialog[open]')) render(); });
    // Virada do dia ou da hora com a tela aberta: "Para hoje" e "Atrasados" mudam sozinhos.
    setInterval(() => { if (tela.view.classList.contains('show') && !document.querySelector('dialog[open]')) render(); }, 60000);
    return tela;
  }

  /** Abre a Agenda; listaId (opcional) vem do submenu do menu lateral. */
  function abrir(listaId) {
    garantirTela();
    if (listaId !== undefined) {
      if (listaId && A.lista(listaId)) { estado.listaId = listaId; estado.automatica = ''; estado.detalhe = true; }
      else if (!listaId) { estado.listaId = ''; estado.automatica = estado.automatica || 'todos'; }
    }
    render();
    tela.ativar('Agenda', caminho());
    if (window.CicluzAgendaConversa) window.CicluzAgendaConversa.atualizarNaoLidas(true);
  }

  function escolher({ automatica = '', listaId = '' }) {
    estado.automatica = automatica;
    estado.listaId = listaId;
    estado.detalhe = true;
    estado.busca = '';
    estado.mostrarConcluidos = automatica === 'concluidos';
    render();
  }

  /** Valores de um compromisso novo, conforme o que está aberto (lista, Para hoje, Sinalizados, dia do calendário). */
  function padraoNovo(extra = {}) {
    const hoje = D.isoData(new Date());
    const base = { listaId: estado.listaId || A.dados.listas[0].id, prioridade: 'normal', alerta: null };
    if (estado.visao === 'calendario') base.data = estado.calendario.ref;
    else if (estado.automatica === 'hoje') base.data = hoje;
    if (estado.visao !== 'calendario' && estado.automatica === 'sinalizados') base.sinalizado = true;
    if (estado.visao !== 'calendario' && estado.automatica === 'atribuidos') { const u = A.usuarioAtual(); if (u) base.pessoas = [D.pessoaResponsavel(u)]; }
    if (base.data) base.alerta = 0;
    return { ...base, ...extra };
  }

  /* ---------- Render ---------- */

  function render() {
    const body = tela.body;
    tela.p.textContent = caminho();
    const crumb = document.getElementById('crumb');
    if (crumb && tela.view.classList.contains('show')) crumb.textContent = caminho();
    const rolagem = body.scrollTop;
    body.replaceChildren();
    if (A.erroLeitura) body.append(U.situacao('O dado salvo da Agenda não pôde ser lido. Nada será gravado até corrigir.', 'negativo'));

    const abas = U.chips([['listas', 'Listas'], ['calendario', 'Calendário'], ['kanban', 'Kanban'], ['mapa', 'Mapa mental']], estado.visao, (v) => { estado.visao = v; render(); });
    abas.classList.add('compras-abas');
    body.append(abas);
    const aviso = window.CicluzAgendaAlertas && window.CicluzAgendaAlertas.convite();
    if (aviso) body.append(aviso);
    if (estado.visao === 'calendario') renderCalendario(body);
    else if (estado.visao === 'kanban') renderKanban(body);
    else if (estado.visao === 'mapa') renderMapa(body);
    else renderListas(body);
    body.scrollTop = rolagem;
  }

  /* ---------- Listas (formato do Lembretes) ---------- */

  function renderListas(body) {
    const agora = new Date();
    const usuario = A.usuarioAtual();
    const caixa = el('div', 'agenda-lembretes' + (estado.detalhe ? ' com-detalhe' : ''));
    const lateral = el('div', 'agenda-lateral');
    const conteudo = el('div', 'agenda-conteudo');

    // Listas automáticas
    const conta = D.contagens(A.visiveis(), agora, usuario);
    const grade = el('div', 'agenda-automaticas');
    D.LISTAS_AUTOMATICAS.forEach(([chave, nome]) => {
      const ativo = !estado.listaId && estado.automatica === chave;
      const b = botao('', () => escolher({ automatica: chave }), 'compras-indicador agenda-automatica a-' + chave + (ativo ? ' ativo' : ''));
      b.setAttribute('aria-pressed', String(ativo));
      const i = el('span', 'agenda-automatica-icone');
      i.innerHTML = svg(ICONES[chave]);
      b.append(i, el('b', null, String(conta[chave])), el('small', null, nome));
      grade.append(b);
    });

    // Minhas listas
    const minhas = el('section', 'compras-secao agenda-minhas');
    const cab = el('div', 'compras-secao-cab');
    cab.append(el('h3', null, 'Minhas listas'));
    minhas.append(cab);
    const linhas = el('div', 'compras-lista');
    A.dados.listas.forEach((l) => {
      const qtd = A.visiveis().filter((i) => i.listaId === l.id && !i.concluida).length;
      const r = botao('', () => escolher({ listaId: l.id }), 'compras-linha agenda-lista-linha' + (estado.listaId === l.id ? ' ativa' : ''));
      r.setAttribute('aria-pressed', String(estado.listaId === l.id));
      const ic = el('span', 'agenda-lista-icone');
      ic.style.setProperty('--lista-cor', l.cor);
      ic.innerHTML = svg(ICONES_LISTA[l.icone] || ICONES_LISTA.lista);
      r.append(ic, el('span', 'agenda-lista-nome', l.nome), el('span', 'agenda-lista-conta', String(qtd)));
      linhas.append(r);
    });
    const nova = botao('', () => editarLista(null), 'compras-linha agenda-lista-linha agenda-lista-nova');
    const icn = el('span', 'agenda-lista-icone vazio');
    icn.innerHTML = svg('<path d="' + PATH_MAIS + '"/>');
    nova.append(icn, el('span', 'agenda-lista-nome', 'Adicionar lista'));
    linhas.append(nova);
    minhas.append(linhas);
    lateral.append(grade, minhas);

    conteudo.append(detalheLista(agora, usuario));
    caixa.append(lateral, conteudo);
    body.append(caixa);
  }

  function detalheLista(agora, usuario) {
    const l = estado.listaId ? A.lista(estado.listaId) : null;
    const box = el('section', 'compras-secao agenda-detalhe');
    if (l) box.style.setProperty('--lista-cor', l.cor);

    const cab = el('div', 'agenda-detalhe-cab');
    const volta = botao('', () => { estado.detalhe = false; render(); }, 'agenda-voltar-listas');
    volta.innerHTML = svg(ICONES.voltar);
    volta.append(document.createTextNode('Listas'));
    const titulo = el('h3', 'agenda-detalhe-titulo' + (l ? ' de-lista' : ' a-' + estado.automatica), tituloVisao());
    const itens = D.filtrar(A.visiveis(), { ...estado, usuarioId: usuario, ordenacao: l ? l.ordenacao : 'data' }, agora);
    const pendentes = itens.filter((i) => !i.concluida).length;
    titulo.append(el('span', 'compras-conta' + (pendentes ? ' ativa' : ''), String(estado.automatica === 'concluidos' ? itens.length : pendentes)));
    cab.append(volta, titulo);

    // Ferramentas: busca, ordenar (lista do usuário), editar lista
    const ferramentas = el('div', 'agenda-ferramentas');
    const busca = U.busca('Buscar por título, nota, local, etiqueta ou subtarefa', (v) => { estado.busca = v; atualizar(); });
    busca.value = estado.busca;
    ferramentas.append(busca);
    if (l) {
      const ord = U.seletor(D.ORDENACOES, l.ordenacao);
      ord.onchange = () => A.definirOrdenacao(l.id, ord.value);
      ferramentas.append(U.campo('Ordenar por', ord), botao('Editar lista', () => editarLista(l), 'compras-chip'));
    }
    cab.append(ferramentas);
    box.append(cab);

    // "N concluídos · Limpar · Mostrar" (como no Lembretes)
    if (estado.automatica !== 'concluidos' && (l || estado.automatica === 'todos')) {
      const feitos = A.visiveis().filter((i) => i.concluida && (!l || i.listaId === l.id)).length;
      const barra = el('div', 'agenda-concluidos-barra');
      barra.append(el('span', null, feitos + (feitos === 1 ? ' concluído' : ' concluídos')));
      if (feitos) {
        barra.append(botao('Limpar', () => U.confirmar('Limpar concluídos', 'Apagar os ' + feitos + ' compromisso(s) concluído(s)' + (l ? ' de "' + l.nome + '"' : '') + '? Não dá para desfazer.', 'Limpar', () => { const n = A.limparConcluidos(l ? l.id : ''); U.avisar(n + ' concluído(s) apagado(s).'); }, { cor: COR, corTexto: COR_TEXTO, classe: 'agenda-dialog' }), 'agenda-link'));
        barra.append(botao(estado.mostrarConcluidos ? 'Ocultar' : 'Mostrar', () => { estado.mostrarConcluidos = !estado.mostrarConcluidos; render(); }, 'agenda-link'));
      }
      box.append(barra);
    }

    const lista = el('div', 'compras-lista agenda-itens');
    box.append(lista);
    preencher(lista, itens, agora, l);

    function atualizar() {
      const novos = D.filtrar(A.visiveis(), { ...estado, usuarioId: usuario, ordenacao: l ? l.ordenacao : 'data' }, new Date());
      preencher(lista, novos, new Date(), l);
    }
    return box;
  }

  function preencher(lista, itens, agora, l) {
    lista.replaceChildren();
    if (!itens.length) {
      const textos = {
        hoje: ['Nada para hoje.', 'Compromissos de hoje e os atrasados aparecem aqui.'],
        programados: ['Nada programado.', 'Compromissos com data aparecem aqui.'],
        sinalizados: ['Nada sinalizado.', 'Use a bandeira para destacar um compromisso.'],
        atrasados: ['Nada atrasado.', 'Compromissos com data ou hora vencida aparecem aqui.'],
        atribuidos: ['Nada atribuído a você.', A.usuarioAtual() ? 'Compromissos em que você é o responsável aparecem aqui.' : 'Entre com seu usuário para ver o que é seu.'],
        concluidos: ['Nada concluído.', ''],
        todos: ['Nenhum compromisso.', 'Escreva na linha abaixo, por exemplo "Ligar para o contador amanhã às 10".'],
      };
      const [t, p] = estado.busca ? ['Nada encontrado.', 'Tente outra palavra.'] : l ? ['Lista vazia.', 'Escreva na linha abaixo para criar.'] : textos[estado.automatica];
      lista.append(U.vazio(t, p));
    }
    const manual = l && l.ordenacao === 'manual' && !estado.busca;
    const grupos = l ? [{ titulo: '', itens }] : D.agrupar(itens.filter((i) => !i.concluida), estado.automatica, agora).concat(itens.some((i) => i.concluida) ? [{ titulo: estado.automatica === 'concluidos' ? '' : 'Concluídos', itens: itens.filter((i) => i.concluida) }] : []);
    grupos.forEach((g) => {
      if (g.titulo) lista.append(el('div', 'agenda-grupo-hora' + (g.titulo === 'Atrasados' ? ' atrasados' : ''), g.titulo));
      g.itens.forEach((i) => lista.append(linha(i, agora, { arrastavel: manual && !i.concluida })));
    });
    if (estado.automatica !== 'concluidos' && estado.automatica !== 'atrasados') lista.append(linhaNova());
  }

  /** Linha de um compromisso: círculo para concluir, texto, detalhes, bandeira e subtarefas. */
  function linha(item, agora, { compacta = false, arrastavel = false } = {}) {
    const caixa = el('div', 'agenda-item' + (item.concluida ? ' concluida' : '') + (D.atrasado(item, agora) ? ' atrasada' : ''));
    caixa.dataset.id = item.id;
    const r = el('div', 'compras-linha agenda-linha');
    const lst = A.lista(item.listaId);
    const ac = A.acesso(item);
    if (arrastavel && ac.editar) {
      // Ordem manual (computador): arrastar pela alça.
      const alca = el('span', 'agenda-alca');
      alca.innerHTML = svg(ICONES.arrastar);
      alca.title = 'Arraste para mudar a ordem';
      caixa.draggable = true;
      caixa.ondragstart = (e) => { e.dataTransfer.setData('text/agenda-ordem', item.id); e.dataTransfer.effectAllowed = 'move'; caixa.classList.add('arrastando'); };
      caixa.ondragend = () => caixa.classList.remove('arrastando');
      caixa.ondragover = (e) => { if ([...e.dataTransfer.types].includes('text/agenda-ordem')) { e.preventDefault(); caixa.classList.add('recebendo'); } };
      caixa.ondragleave = () => caixa.classList.remove('recebendo');
      caixa.ondrop = (e) => { e.preventDefault(); caixa.classList.remove('recebendo'); const id = e.dataTransfer.getData('text/agenda-ordem'); if (id && id !== item.id) A.reordenar(id, item.id); };
      r.append(alca);
    }
    const circulo = botao('', () => {
      const res = A.alternarConcluida(item.id);
      if (res === 'repetiu') U.avisar('Feito. O próximo fica para ' + D.quando(A.item(item.id), new Date()) + '.');
      else if (res) U.avisar(res === 'concluiu' ? 'Compromisso concluído.' : 'Compromisso reaberto.');
    }, 'agenda-circulo');
    circulo.setAttribute('aria-label', (item.concluida ? 'Reabrir ' : 'Concluir ') + item.titulo);
    circulo.setAttribute('aria-pressed', String(Boolean(item.concluida)));
    circulo.disabled = !ac.concluir;
    if (lst) circulo.style.setProperty('--lista-cor', lst.cor);

    const texto = botao('', () => editar(item.id), 'agenda-linha-texto');
    texto.setAttribute('aria-label', 'Abrir ' + item.titulo);
    texto.append(el('b', null, item.titulo));
    const det = el('small', 'agenda-detalhes');
    const partes = [];
    if (item.data) partes.push(el('span', 'agenda-quando', D.quando(item, agora)));
    if (D.temRepeticao(item)) { const s = el('span', 'agenda-com-icone'); s.innerHTML = svg(ICONES.repetir); s.append(document.createTextNode(D.resumoRepeticao(item.repeticao))); partes.push(s); }
    if (D.momentoAlerta(item) && !item.concluida) { const s = el('span', 'agenda-com-icone'); s.innerHTML = svg(ICONES.sino); s.title = 'Com alerta'; s.setAttribute('aria-label', 'Com alerta'); partes.push(s); }
    if (!compacta && !estado.listaId && lst) { const s = el('span', 'agenda-de-lista'); const p = el('span', 'agenda-ponto'); p.style.setProperty('--lista-cor', lst.cor); s.append(p, document.createTextNode(lst.nome)); partes.push(s); }
    const resps = D.responsaveis(item);
    if (resps.length) partes.push(el('span', null, resps.map((p) => A.nomePessoa(p)).join(', ')));
    if (item.concluida && item.avaliacao && item.avaliacao.tipo) {
      const u = A.usuarioAtual();
      const pendente = resps.some((p) => !D.podeAvaliar(item, u, p).erro);
      if (pendente) partes.push(el('span', 'agenda-avaliar', 'Avaliação pendente'));
      else { const notas = D.comparativo(item, u).flatMap((c) => [c.gestor, c.auto]).filter(Boolean); if (notas.length) partes.push(el('span', null, notas.length + ' avaliação(ões)')); }
    }
    const avisoLugar = item.localizacao && item.localizacao.aviso ? (item.localizacao.aviso === 'entrar' ? 'ao entrar' : 'ao sair') : '';
    if (item.local || avisoLugar) { const s = el('span', 'agenda-com-icone'); s.innerHTML = svg(ICONES.local); s.append(document.createTextNode([item.local || 'Lugar marcado', avisoLugar].filter(Boolean).join(' · '))); partes.push(s); }
    (item.etiquetas || []).forEach((t) => partes.push(el('span', 'agenda-etiqueta', '#' + t)));
    const pr = D.progresso(item);
    if (pr.total) partes.push(el('span', null, pr.feitas + '/' + pr.total + ' subtarefas'));
    const novas = window.CicluzAgendaConversa ? window.CicluzAgendaConversa.naoLidas()[item.id] : 0;
    if (novas) { const s = el('span', 'agenda-com-icone agenda-chat-novas'); s.innerHTML = svg(window.CicluzAgendaConversa.ICONE_CHAT); s.append(document.createTextNode(novas + (novas > 1 ? ' mensagens novas' : ' mensagem nova'))); partes.push(s); }
    if (item.notas && !compacta) partes.push(el('span', 'agenda-nota', item.notas.split('\n')[0]));
    partes.forEach((p, n) => { if (n) det.append(document.createTextNode(' · ')); det.append(p); });
    if (partes.length) texto.append(det);

    const direita = el('span', 'compras-linha-direita');
    if (TOM_PRIORIDADE[item.prioridade]) direita.append(U.situacao(nomePrioridade[item.prioridade], TOM_PRIORIDADE[item.prioridade]));
    if (item.url) {
      const a = el('a', 'agenda-icone-botao');
      a.href = item.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.innerHTML = svg(ICONES.link);
      a.title = 'Abrir o endereço';
      a.setAttribute('aria-label', 'Abrir o endereço de ' + item.titulo);
      direita.append(a);
    }
    const flag = botao('', () => A.alternarSinalizado(item.id), 'agenda-icone-botao agenda-bandeira' + (item.sinalizado ? ' ligada' : ''));
    flag.innerHTML = svg(ICONES.bandeira);
    flag.title = item.sinalizado ? 'Tirar sinalização' : 'Sinalizar';
    flag.setAttribute('aria-label', flag.title + ': ' + item.titulo);
    flag.setAttribute('aria-pressed', String(Boolean(item.sinalizado)));
    flag.disabled = !ac.editar;
    direita.append(flag);
    if (pr.total) {
      const aberto = estado.abertos.has(item.id);
      const abrirSubs = botao('', () => { if (aberto) estado.abertos.delete(item.id); else estado.abertos.add(item.id); render(); }, 'agenda-icone-botao agenda-expandir' + (aberto ? ' aberto' : ''));
      abrirSubs.innerHTML = svg(ICONES.seta);
      abrirSubs.title = aberto ? 'Esconder subtarefas' : 'Mostrar subtarefas';
      abrirSubs.setAttribute('aria-label', abrirSubs.title + ': ' + item.titulo);
      abrirSubs.setAttribute('aria-expanded', String(aberto));
      direita.append(abrirSubs);
    }
    r.append(circulo, texto, direita);
    caixa.append(r);

    if (pr.total && estado.abertos.has(item.id)) {
      const subs = el('div', 'agenda-subtarefas');
      item.subtarefas.forEach((s) => {
        const sl = el('div', 'agenda-subtarefa' + (s.concluida ? ' concluida' : ''));
        const c = botao('', () => A.alternarSubtarefa(item.id, s.id), 'agenda-circulo pequeno');
        c.disabled = !ac.concluir;
        if (lst) c.style.setProperty('--lista-cor', lst.cor);
        c.setAttribute('aria-label', (s.concluida ? 'Reabrir ' : 'Concluir ') + s.titulo);
        c.setAttribute('aria-pressed', String(s.concluida));
        sl.append(c, el('span', null, s.titulo));
        subs.append(sl);
      });
      caixa.append(subs);
    }
    return caixa;
  }

  /** "Novo compromisso": escrever e apertar Enter cria; data, hora, #etiqueta e ! são entendidos. */
  function linhaNova() {
    const r = el('div', 'compras-linha agenda-linha agenda-nova');
    const mais = el('span', 'agenda-circulo vazio');
    mais.innerHTML = svg('<path d="' + PATH_MAIS + '"/>');
    const i = U.entrada('text', '', { placeholder: 'Novo compromisso (ex.: Ligar para o contador amanhã às 10)', maxLength: 200 });
    i.className = 'agenda-nova-entrada';
    i.dataset.textoLivre = '';
    i.setAttribute('aria-label', 'Novo compromisso: escreva e aperte Enter');
    const dica = el('small', 'agenda-nova-dica');
    i.oninput = () => {
      const f = D.interpretar(i.value, new Date());
      const partes = [];
      if (f.data) partes.push(D.rotuloData(f.data, new Date()) + (f.hora ? ' às ' + f.hora : ''));
      if (f.etiquetas.length) partes.push(f.etiquetas.map((t) => '#' + t).join(' '));
      if (f.prioridade) partes.push('Prioridade ' + nomePrioridade[f.prioridade]);
      dica.textContent = partes.length ? 'Vai criar: ' + partes.join(' · ') : '';
    };
    i.onkeydown = (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const texto = i.value.trim();
      if (!texto) return;
      const base = padraoNovo();
      const r2 = A.criarRapido(texto, base.listaId, base);
      if (r2.erro) return U.avisar(r2.erro);
      setTimeout(() => { const n = tela.body.querySelector('.agenda-nova-entrada'); if (n) n.focus(); }, 0);
    };
    const meio = el('span', 'agenda-nova-meio');
    meio.append(i, dica);
    r.append(mais, meio);
    return r;
  }

  function renderCalendario(body) {
    const itens = A.visiveis().filter((i) => D.combinaBusca(i, estado.busca));
    window.CicluzAgendaCalendario.render(body, {
      itens,
      estado: estado.calendario,
      listas: A.dados.listas,
      aoMudar: render,
      linha: (item) => linha(item, new Date(), { compacta: true }),
      abrirItem: (id) => editar(id),
      novoEm: (data, hora) => editar(null, padraoNovo({ data, hora: hora || '', horaFim: hora ? D.paraHora(Math.min(1439, D.minutos(hora) + 60)) : '', alerta: 0 })),
      mover: (id, data, hora) => { if (A.moverPara(id, data, hora)) U.avisar('Compromisso levado para ' + D.dataCurta(data) + (hora ? ' às ' + hora : '') + '.'); },
      corDaLista: (id) => (A.lista(id) || {}).cor || COR,
    });
  }

  function renderKanban(body) {
    const itens = D.filtrar(A.visiveis(), { ...estado, mostrarConcluidos: true, usuarioId: A.usuarioAtual(), automatica: estado.listaId ? '' : (estado.automatica === 'concluidos' ? 'todos' : estado.automatica || 'todos') }, new Date());
    window.CicluzAgendaKanban.render(body, {
      itens,
      titulo: tituloVisao(),
      listas: A.dados.listas,
      escolher: (sel) => { estado.automatica = sel.automatica || ''; estado.listaId = sel.listaId || ''; render(); },
      selecao: { automatica: estado.listaId ? '' : estado.automatica, listaId: estado.listaId },
      abrirItem: (id) => editar(id),
      novoNaColuna: (colunaId) => editar(null, padraoNovo({ colunaId: colunaId === A.CONCLUIDO ? '' : colunaId })),
      corDaLista: (id) => (A.lista(id) || {}).cor || COR,
    });
  }

  /** Mapa mental (agenda/mapa-mental.js): a mesma escolha de lista ou lista automática. */
  function renderMapa(body) {
    const usuario = A.usuarioAtual();
    const automatica = estado.listaId ? '' : (estado.automatica === 'concluidos' ? 'todos' : estado.automatica || 'todos');
    const itens = D.filtrar(A.visiveis(), { ...estado, automatica, mostrarConcluidos: true, usuarioId: usuario }, new Date())
      .concat(estado.listaId ? [] : A.visiveis().filter((i) => i.concluida && automatica === 'todos'))
      .filter((i, n, todos) => todos.findIndex((x) => x.id === i.id) === n);
    window.CicluzAgendaMapaMental.render(body, {
      itens,
      titulo: tituloVisao(),
      cor: estado.listaId ? (A.lista(estado.listaId) || {}).cor || COR : COR,
      corTexto: COR_TEXTO,
      listaId: estado.listaId,
      escopos: [['auto:todos', 'Todas as listas'], ...D.LISTAS_AUTOMATICAS.filter(([k]) => !['todos', 'concluidos'].includes(k)).map(([k, t]) => ['auto:' + k, t]), ...A.dados.listas.map((l) => ['lista:' + l.id, 'Lista: ' + l.nome])],
      escopoAtual: estado.listaId ? 'lista:' + estado.listaId : 'auto:' + automatica,
      escolher: (v) => { const [t, x] = v.split(':'); estado.listaId = t === 'lista' ? x : ''; estado.automatica = t === 'lista' ? '' : x; render(); },
      aoMudar: render,
      abrirItem: (id) => editar(id),
      padrao: () => padraoNovo(),
    });
  }

  /* ---------- Editar ---------- */

  function editar(id, base) {
    const atual = id ? A.item(id) : null;
    if (id && !atual) return U.avisar('Compromisso não encontrado.');
    const ac = atual ? A.acesso(atual) : { ver: true, editar: true, concluir: true, excluir: true, gestor: true };
    if (atual && !ac.ver) return U.avisar('Você não participa deste compromisso.');
    const v = structuredClone(atual || { titulo: '', notas: '', url: '', local: '', etiquetas: [], subtarefas: [], pessoas: [], avaliacao: { tipo: '', notas: [] }, hora: '', horaFim: '', repeticao: null, alerta: null, colunaId: '', ...base });
    const soLeitura = !ac.editar;
    U.dialogo({
      titulo: !atual ? 'Novo compromisso' : soLeitura ? 'Compromisso' : 'Editar compromisso',
      subtitulo: soLeitura ? 'Você pode ver' + (ac.concluir ? ' e concluir' : '') + ' este compromisso; editar é com o gestor.' : undefined,
      largo: true,
      cor: COR,
      corTexto: COR_TEXTO,
      classe: 'agenda-dialog',
      rotuloSalvar: atual ? 'Salvar compromisso' : 'Salvar · Criar compromisso',
      montar: (form) => {
        // Texto livre: o S2 não troca as letras para maiúsculas (index.html, regra do focusout).
        form.dataset.textoLivre = '';
        const titulo = U.entrada('text', v.titulo, { maxLength: 200, required: true });
        const notas = el('textarea');
        notas.value = v.notas || '';
        notas.rows = 3;
        const url = U.entrada('text', v.url || '', { placeholder: 'https://', maxLength: 500, inputMode: 'url', autocomplete: 'url' });
        const data = U.entrada('date', v.data || '');
        const hora = U.entrada('time', v.hora || '');
        const horaFim = U.entrada('time', v.horaFim || '');
        const alerta = U.seletor(D.ALERTAS, v.alerta === null || v.alerta === undefined ? '' : String(v.alerta));
        const repeticao = editorRepeticao(v.repeticao, () => data.value);
        const listaSel = U.seletor(A.dados.listas.map((l) => [l.id, l.nome]), v.listaId);
        const colunaSel = U.seletor(A.dados.colunas.map((c) => [c.id, c.nome]), A.coluna(v.colunaId) ? v.colunaId : A.dados.colunas[0].id);
        let prioridade = v.prioridade || 'normal';
        const prio = U.chips(D.PRIORIDADES, prioridade, (p) => { prioridade = p; });
        const sinal = el('label', 'compras-interruptor');
        const sinalBox = U.entrada('checkbox');
        sinalBox.checked = Boolean(v.sinalizado);
        sinal.append(sinalBox, document.createTextNode('Sinalizar'));
        const etiquetas = U.entrada('text', (v.etiquetas || []).join(', '), { placeholder: 'Ex.: Loja, Estoque' });
        const local = U.entrada('text', v.local || '', { maxLength: 200, placeholder: 'Endereço ou nome do lugar (opcional)' });
        // Lugar no mapa: Atual, Ao entrar, Ao sair, Personalizada (agenda/mapa.js).
        const lugar = soLeitura ? null : window.CicluzAgendaMapa.seletor({ localizacao: v.localizacao, local: v.local }, local);
        const subtarefas = editorSubtarefas(v.subtarefas || []);
        const pessoas = editorPessoas(v, atual, ac.gestor && !soLeitura);
        const tipoAvaliacao = U.seletor(D.TIPOS_AVALIACAO, (v.avaliacao && v.avaliacao.tipo) || '');
        const travadaAvaliacao = !ac.gestor || Boolean(atual && atual.avaliacao && atual.avaliacao.notas && atual.avaliacao.notas.length);
        tipoAvaliacao.disabled = travadaAvaliacao;

        const secao = (nome, ...filhos) => { const s = el('fieldset', 'agenda-form-secao'); s.append(el('legend', null, nome), ...filhos); return s; };
        const grade = (...filhos) => { const g = el('div', 'agenda-form-grade'); g.append(...filhos); return g; };
        const prioCampo = el('div', 'compras-campo agenda-largo');
        prioCampo.append(el('span', 'compras-rotulo', 'Prioridade'), prio);
        const avaliacaoSecao = secao('Avaliação', U.campo('Tipo de avaliação', tipoAvaliacao, travadaAvaliacao && ac.gestor ? 'Já há avaliação registrada: o tipo não muda.' : 'Depois de concluído, o gestor avalia a execução de cada responsável e cada um se autoavalia.'));
        avaliacaoSecao.classList.add('agenda-avaliacao');
        if (atual && atual.concluida && atual.avaliacao && atual.avaliacao.tipo) avaliacaoSecao.append(painelAvaliacao(atual));

        form.append(
          U.campo('Título', titulo),
          secao('Quando', grade(U.campo('Data', data), U.campo('Início', hora, 'Sem hora = dia todo.'), U.campo('Término', horaFim), U.campo('Alerta', alerta)), repeticao.no),
          secao('Organização', grade(U.campo('Lista', listaSel), U.campo('Coluna do Kanban', colunaSel), U.campo('Etiquetas', etiquetas, 'Separe por vírgula.'), prioCampo), sinal),
          pessoas.no,
          secao('Local', ...(lugar ? [lugar.no] : []), U.campo('Endereço', local, soLeitura ? undefined : 'Preenchido ao marcar no mapa; pode escrever ou corrigir.')),
          secao('Detalhes', U.campo('Endereço na internet (URL)', url), U.campo('Notas', notas)),
          subtarefas.no,
          avaliacaoSecao,
        );
        if (atual) form.append(window.CicluzAgendaConversa.secao(atual));
        if (atual) {
          const rodape = el('div', 'agenda-form-rodape');
          const criado = 'Criado em ' + D.dataCurta(atual.criadoEm.slice(0, 10)) + (atual.criadoPor ? ' por ' + A.nomePessoa(atual.criadoPor) : '') + (atual.concluida ? ' · concluído em ' + D.dataCurta(atual.concluidaEm.slice(0, 10)) : '');
          rodape.append(U.nota(criado));
          if (ac.excluir) rodape.append(botao('Excluir compromisso', () => excluir(atual), 'btn secondary perigo-texto'));
          form.append(rodape);
        }
        // Só leitura: tudo travado, menos a avaliação (o responsável se autoavalia).
        if (soLeitura) form.querySelectorAll('input, select, textarea, button').forEach((x) => { if (!x.closest('.agenda-avaliacao-painel, .agenda-conversa, .agenda-form-rodape, .compras-dialog-acoes')) x.disabled = true; });
        return { titulo, notas, url, local, lugar, data, hora, horaFim, alerta, repeticao, listaSel, colunaSel, pessoas, tipoAvaliacao, sinalBox, etiquetas, subtarefas, prio: () => prioridade };
      },
      salvar: soLeitura ? undefined : (c) => {
        const r = A.salvarItem(atual ? atual.id : '', {
          titulo: c.titulo.value, notas: c.notas.value, url: c.url.value, local: c.local.value, localizacao: c.lugar ? c.lugar.valor() : (atual && atual.localizacao),
          data: c.data.value, hora: c.hora.value, horaFim: c.horaFim.value, alerta: c.alerta.value,
          repeticao: c.repeticao.valor(atual && atual.repeticao), listaId: c.listaSel.value, colunaId: c.colunaSel.value,
          pessoas: c.pessoas.valor(), avaliacao: { tipo: c.tipoAvaliacao.value }, prioridade: c.prio(), sinalizado: c.sinalBox.checked,
          etiquetas: c.etiquetas.value, subtarefas: c.subtarefas.valor(),
        });
        if (r.erro) return r.erro;
        U.avisar(atual ? 'Compromisso salvo.' : 'Compromisso criado.');
        return undefined;
      },
    });
  }

  /**
   * Pessoas e permissões: o gestor (quem criou) escolhe quem participa — responsáveis (pode ter mais de
   * um) e outros — e o que cada um pode: ver, editar, concluir, excluir. Quem não está aqui não vê.
   */
  function editorPessoas(v, atual, podeMudar) {
    const lista = D.normalizarPessoas(v.pessoas);
    const no = el('fieldset', 'agenda-form-secao agenda-pessoas');
    const gestorId = atual ? atual.criadoPor : A.usuarioAtual();
    no.append(el('legend', null, 'Pessoas e permissões'), U.nota('Gestor: ' + (gestorId ? A.nomePessoa(gestorId) : 'quem criar o compromisso') + ' (quem criou). Ele escolhe quem participa e o que cada um pode fazer; quem não está aqui não vê o compromisso.'));
    const linhas = el('div', 'agenda-pessoas-lista');
    const adicionar = el('div', 'agenda-pessoas-adicionar');
    no.append(linhas, adicionar);
    const OPCOES = [['responsavel', 'Responsável'], ...D.PERMISSOES];
    function desenhar() {
      linhas.replaceChildren(...(lista.length ? lista.map((p, n) => {
        const r = el('div', 'agenda-pessoa');
        r.append(el('b', 'agenda-pessoa-nome', A.nomePessoa(p.id)));
        const chips = el('div', 'compras-chips');
        chips.setAttribute('role', 'group');
        chips.setAttribute('aria-label', 'Permissões de ' + A.nomePessoa(p.id));
        OPCOES.forEach(([k, rotulo]) => {
          const b = botao(rotulo, () => {
            p[k] = !p[k];
            if (k !== 'ver' && p[k]) p.ver = true; // quem faz algo também vê
            if (k === 'ver' && !p.ver) { p.editar = p.concluir = p.excluir = p.responsavel = false; }
            desenhar();
          }, 'compras-chip' + (p[k] ? ' ativo' : ''));
          b.setAttribute('aria-pressed', String(Boolean(p[k])));
          b.disabled = !podeMudar;
          chips.append(b);
        });
        r.append(chips);
        if (podeMudar) {
          const tirar = botao('', () => { lista.splice(n, 1); desenhar(); }, 'agenda-icone-botao');
          tirar.innerHTML = svg(ICONES.lixeira);
          tirar.setAttribute('aria-label', 'Tirar ' + A.nomePessoa(p.id) + ' do compromisso');
          r.append(tirar);
        }
        return r;
      }) : [U.nota('Ninguém além do gestor. Adicione o responsável abaixo.')]));
      adicionar.replaceChildren();
      const livres = A.pessoas().filter((x) => x.id !== gestorId && !lista.some((p) => p.id === x.id));
      if (podeMudar && livres.length) {
        const sel = U.seletor(livres.map((x) => [x.id, x.nome]), '', 'Escolha a pessoa');
        adicionar.append(U.campo('Adicionar pessoa', sel), botao('Adicionar como responsável', () => { if (!sel.value) return; lista.push(D.pessoaResponsavel(sel.value)); desenhar(); }, 'btn secondary'));
      }
    }
    desenhar();
    return { no, valor: () => D.normalizarPessoas(lista) };
  }

  /**
   * Avaliação de um compromisso concluído: por responsável, a nota do gestor e a autoavaliação.
   * O gestor vê as duas; o responsável vê a dele. Quem pode, registra a sua (e ela não muda).
   */
  function painelAvaliacao(item) {
    const box = el('div', 'agenda-avaliacao-painel');
    const u = A.usuarioAtual();
    const tipo = item.avaliacao.tipo;
    const desenhar = () => {
      const atual = A.item(item.id) || item;
      const comp = D.comparativo(atual, u);
      box.replaceChildren();
      if (!comp.length) { box.append(U.nota(D.responsaveis(atual).length ? 'A avaliação é vista pelo gestor e por cada responsável.' : 'Sem responsável: não há execução para avaliar.')); return; }
      comp.forEach((c) => {
        const cartao = el('div', 'agenda-avaliacao-cartao');
        cartao.append(el('b', null, 'Execução de ' + A.nomePessoa(c.id)));
        const colunas = el('div', 'agenda-avaliacao-colunas');
        const verGestor = !u || !atual.criadoPor || atual.criadoPor === u;
        const slot = (papel, rotulo, nota) => {
          const s = el('div', 'agenda-avaliacao-slot');
          s.append(el('small', null, rotulo));
          if (nota) {
            s.append(el('span', 'agenda-nota-valor', D.textoNota(tipo, nota.valor)));
            if (nota.comentario) s.append(el('em', null, nota.comentario));
            s.append(el('small', 'agenda-nota-quando', 'Em ' + D.dataCurta(nota.em.slice(0, 10))));
          } else {
            const pode = D.podeAvaliar(atual, u, c.id);
            if (!pode.erro && pode.papel === papel) s.append(entradaNota(atual, c.id, desenhar));
            else s.append(el('span', 'agenda-nota-pendente', 'Ainda não avaliou'));
          }
          return s;
        };
        if (verGestor) colunas.append(slot('gestor', 'Avaliação do gestor', c.gestor));
        colunas.append(slot('auto', verGestor ? 'Autoavaliação' : 'Sua autoavaliação', c.auto));
        cartao.append(colunas);
        box.append(cartao);
      });
      if (!u && atual.criadoPor === '') box.append(U.nota('Para registrar avaliação, entre com seu usuário.'));
    };
    desenhar();
    return box;
  }

  /** Escolher a nota (estrelas, 5 níveis, NPS ou feito) e registrar, com confirmação: não muda depois. */
  function entradaNota(item, avaliadoId, depois) {
    const tipo = item.avaliacao.tipo;
    const box = el('div', 'agenda-nota-entrada');
    let valor = null;
    const opcoes = tipo === 'estrelas' ? [1, 2, 3, 4, 5].map((n) => [n, '★'.repeat(n)])
      : tipo === 'niveis' ? D.NIVEIS.map((t, n) => [n + 1, t])
      : tipo === 'nps' ? Array.from({ length: 11 }, (_, n) => [n, String(n)])
      : [[1, 'Feito'], [0, 'Não feito']];
    const chips = U.chips(opcoes, '', (v) => { valor = Number(v); });
    chips.classList.add('agenda-nota-opcoes', 'tipo-' + tipo);
    const comentario = U.entrada('text', '', { maxLength: 500, placeholder: 'Comentário (opcional)' });
    comentario.dataset.textoLivre = '';
    comentario.setAttribute('aria-label', 'Comentário da avaliação');
    const registrar = botao('Registrar avaliação', () => {
      if (valor === null) return U.avisar('Escolha a nota.');
      U.confirmar('Registrar avaliação', 'Depois de registrada, a avaliação não muda. Confirmar ' + D.textoNota(tipo, valor) + '?', 'Registrar', () => {
        const r = A.avaliar(item.id, avaliadoId, valor, comentario.value);
        if (r.erro) return r.erro;
        U.avisar('Avaliação registrada.');
        depois();
        return undefined;
      }, { cor: COR, corTexto: COR_TEXTO, classe: 'agenda-dialog' });
    }, 'btn secondary');
    box.append(chips, comentario, registrar);
    return box;
  }

  /** Repetir: as opções do Lembretes, a personalizada (a cada N dias/semanas/meses/anos, dias da semana) e o fim. */
  function editorRepeticao(r, dataAtual) {
    const no = el('div', 'agenda-repeticao');
    const tipo = U.seletor(D.REPETICOES, (r && r.tipo) || 'nunca');
    const intervalo = U.entrada('number', String((r && r.intervalo) || 1), { min: 1, max: 99 });
    const unidade = U.seletor([['dia', 'dia(s)'], ['semana', 'semana(s)'], ['mes', 'mês(es)'], ['ano', 'ano(s)']], (r && r.unidade) || 'semana');
    const dias = new Set((r && r.diasSemana) || []);
    const diasBox = el('div', 'compras-chips agenda-dias');
    diasBox.setAttribute('role', 'group');
    diasBox.setAttribute('aria-label', 'Dias da semana');
    const desenharDias = () => diasBox.replaceChildren(...D.DIAS_CURTOS.map((n, i) => {
      const b = botao(n.slice(0, 3), () => { if (dias.has(i)) dias.delete(i); else dias.add(i); desenharDias(); atualizar(); }, 'compras-chip' + (dias.has(i) ? ' ativo' : ''));
      b.setAttribute('aria-pressed', String(dias.has(i)));
      b.setAttribute('aria-label', D.DIAS_LONGOS[i]);
      return b;
    }));
    const fimTipo = U.seletor([['nunca', 'Nunca'], ['data', 'Em uma data'], ['vezes', 'Depois de algumas vezes']], (r && r.fim && r.fim.tipo) || 'nunca');
    const fimData = U.entrada('date', (r && r.fim && r.fim.data) || '');
    const fimVezes = U.entrada('number', String((r && r.fim && r.fim.vezes) || 5), { min: 1, max: 999 });
    const personal = el('div', 'agenda-form-grade');
    const campoDias = el('div', 'compras-campo agenda-largo');
    campoDias.append(el('span', 'compras-rotulo', 'Nos dias'), diasBox);
    personal.append(U.campo('A cada', intervalo), U.campo('Unidade', unidade), campoDias);
    const campoFimTipo = U.campo('Fim da repetição', fimTipo);
    const campoFimData = U.campo('Termina em', fimData);
    const campoFimVezes = U.campo('Quantas vezes', fimVezes);
    const linhaTipo = el('div', 'agenda-form-grade');
    linhaTipo.append(U.campo('Repetir', tipo), campoFimTipo, campoFimData, campoFimVezes);
    const resumo = el('small', 'profiles-note');
    no.append(linhaTipo, personal, resumo);
    function valor(anterior) {
      if (tipo.value === 'nunca') return null;
      return {
        tipo: tipo.value, intervalo: +intervalo.value || 1, unidade: unidade.value, diasSemana: [...dias],
        fim: { tipo: fimTipo.value, data: fimData.value, vezes: +fimVezes.value || 0 },
        feitas: anterior && anterior.tipo ? anterior.feitas || 0 : 0,
        ancora: (anterior && anterior.ancora) || dataAtual(),
      };
    }
    function atualizar() {
      const t = tipo.value;
      personal.hidden = t !== 'personalizada';
      campoDias.hidden = unidade.value !== 'semana';
      campoFimTipo.hidden = t === 'nunca';
      campoFimData.hidden = t === 'nunca' || fimTipo.value !== 'data';
      campoFimVezes.hidden = t === 'nunca' || fimTipo.value !== 'vezes';
      resumo.textContent = t === 'nunca' ? '' : 'Repete: ' + D.resumoRepeticao(valor());
    }
    desenharDias();
    [tipo, intervalo, unidade, fimTipo, fimVezes].forEach((x) => { x.addEventListener('input', atualizar); x.addEventListener('change', atualizar); });
    fimData.addEventListener('change', atualizar);
    atualizar();
    return { no, valor };
  }

  /** Lista editável de subtarefas: marcar, renomear, tirar e acrescentar (Enter cria a próxima). */
  function editorSubtarefas(inicial) {
    const subs = inicial.map((s) => ({ ...s }));
    const no = el('fieldset', 'agenda-form-secao agenda-subtarefas-editor');
    const lista = el('div', 'agenda-subtarefas-lista');
    const add = botao('Adicionar subtarefa', () => { subs.push({ titulo: '', concluida: false }); desenhar(subs.length - 1); }, 'btn secondary');
    no.append(el('legend', null, 'Subtarefas'), lista, add);
    function desenhar(foco) {
      lista.replaceChildren(...subs.map((s, n) => {
        const r = el('div', 'agenda-subtarefa-edicao');
        const c = U.entrada('checkbox');
        c.checked = Boolean(s.concluida);
        c.setAttribute('aria-label', 'Subtarefa ' + (n + 1) + ' concluída');
        c.onchange = () => { s.concluida = c.checked; };
        const t = U.entrada('text', s.titulo, { maxLength: 200, placeholder: 'Subtarefa' });
        t.setAttribute('aria-label', 'Subtarefa ' + (n + 1));
        t.oninput = () => { s.titulo = t.value; };
        t.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); subs.splice(n + 1, 0, { titulo: '', concluida: false }); desenhar(n + 1); } };
        const tirar = botao('', () => { subs.splice(n, 1); desenhar(); }, 'agenda-icone-botao');
        tirar.innerHTML = svg(ICONES.lixeira);
        tirar.title = 'Tirar subtarefa';
        tirar.setAttribute('aria-label', 'Tirar subtarefa ' + (n + 1));
        r.append(c, t, tirar);
        return r;
      }));
      if (foco !== undefined) { const alvo = lista.querySelectorAll('input[type=text]')[foco]; if (alvo) alvo.focus(); }
    }
    desenhar();
    // Linha em branco não vira subtarefa.
    return { no, valor: () => subs.filter((s) => String(s.titulo || '').trim()) };
  }

  function excluir(item) {
    U.confirmar('Excluir compromisso', 'Excluir "' + item.titulo + '"?' + (D.temRepeticao(item) ? ' As próximas repetições também deixam de existir.' : '') + ' Não dá para desfazer.', 'Excluir', () => {
      if (!A.excluirItem(item.id)) return 'Não foi possível excluir.';
      document.querySelectorAll('dialog.agenda-dialog[open]').forEach((d) => d.close());
      U.avisar('Compromisso excluído.');
      return undefined;
    }, { cor: COR, corTexto: COR_TEXTO, classe: 'agenda-dialog' });
  }

  /* ---------- Lista: criar, editar, excluir ---------- */

  function editarLista(lista) {
    let cor = lista ? lista.cor : A.CORES_LISTA[A.dados.listas.length % A.CORES_LISTA.length];
    let icone = lista ? lista.icone : 'lista';
    U.dialogo({
      titulo: lista ? 'Editar lista' : 'Nova lista',
      cor: COR,
      corTexto: COR_TEXTO,
      classe: 'agenda-dialog',
      rotuloSalvar: 'Salvar lista',
      montar: (form) => {
        const nome = U.entrada('text', lista ? lista.nome : '', { maxLength: 40, required: true });
        const previa = el('span', 'agenda-lista-icone grande');
        const cores = el('div', 'agenda-cores');
        cores.setAttribute('role', 'radiogroup');
        cores.setAttribute('aria-label', 'Cor da lista');
        const icones = el('div', 'agenda-cores agenda-icones');
        icones.setAttribute('role', 'radiogroup');
        icones.setAttribute('aria-label', 'Ícone da lista');
        const desenhar = () => {
          previa.style.setProperty('--lista-cor', cor);
          previa.innerHTML = svg(ICONES_LISTA[icone]);
          cores.replaceChildren(...A.CORES_LISTA.map((c) => {
            const b = botao('', () => { cor = c; desenhar(); }, 'agenda-cor' + (c === cor ? ' ativa' : ''));
            b.style.setProperty('--lista-cor', c);
            b.setAttribute('role', 'radio');
            b.setAttribute('aria-checked', String(c === cor));
            b.setAttribute('aria-label', 'Cor ' + c);
            return b;
          }));
          icones.replaceChildren(...Object.keys(ICONES_LISTA).map((k) => {
            const b = botao('', () => { icone = k; desenhar(); }, 'agenda-icone-escolha' + (k === icone ? ' ativa' : ''));
            b.innerHTML = svg(ICONES_LISTA[k]);
            b.setAttribute('role', 'radio');
            b.setAttribute('aria-checked', String(k === icone));
            b.setAttribute('aria-label', 'Ícone ' + k);
            return b;
          }));
        };
        desenhar();
        const topo = el('div', 'agenda-lista-previa');
        topo.append(previa, U.campo('Nome', nome));
        const corCampo = el('div', 'compras-campo');
        corCampo.append(el('span', 'compras-rotulo', 'Cor'), cores);
        const iconeCampo = el('div', 'compras-campo');
        iconeCampo.append(el('span', 'compras-rotulo', 'Ícone'), icones);
        form.append(topo, corCampo, iconeCampo);
        if (lista) {
          const qtd = A.visiveis().filter((i) => i.listaId === lista.id).length;
          const rodape = el('div', 'agenda-form-rodape');
          rodape.append(U.nota(qtd + ' compromisso(s) nesta lista.'), botao('Excluir lista', () => {
            const r = A.excluirLista(lista.id);
            if (r.erro) return U.avisar(r.erro);
            if (estado.listaId === lista.id) { estado.listaId = ''; estado.automatica = 'todos'; }
            document.querySelectorAll('dialog.agenda-dialog[open]').forEach((d) => d.close());
            U.avisar('Lista excluída.');
          }, 'btn secondary perigo-texto'));
          form.append(rodape);
        }
        return { nome };
      },
      salvar: (c) => {
        const r = A.salvarLista(lista ? lista.id : '', { nome: c.nome.value, cor, icone });
        if (r.erro) return r.erro;
        if (!lista) { estado.listaId = r.id; estado.automatica = ''; estado.detalhe = true; }
        render();
        U.avisar('Lista salva.');
        return undefined;
      },
    });
  }

  window.CicluzAgenda = { abrir, editar, estado, COR, COR_TEXTO, ICONES_LISTA };
})();
