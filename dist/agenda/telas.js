/*
 * Agenda — tela principal (Agenda · Atividades no menu lateral), no formato do Lembretes:
 * à esquerda as listas automáticas (Para hoje, Programados, Todos, Sinalizados, Atrasados, Atribuídos a
 * mim, Concluídos) e "Minhas listas"; à direita a lista escolhida. No celular, a lista abre por cima,
 * com "‹ Listas" para voltar. Abas: Listas, Calendário (agenda/calendario.js), Kanban (agenda/kanban.js), Mapa mental
 * e Desempenho (agenda/rotina.js). Cada lista é um grupo (P-46): membros e chat do grupo. A tarefa pode estar ligada a
 * uma tela do sistema (ícone roxo de agendar ou pedido agendado): "Abrir a tela" leva até ela.
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
  const PATH_MAIS_SVG = '<path d="M12 5v14M5 12h14"/>';
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
    tela: '<path d="M4 4h16v12H4zM8 20h8M12 16v4M9 9l2 2 4-4"/>',
    grupo: '<path d="M4 5h16v11H8l-4 4zM9 10h.01M12 10h.01M15 10h.01"/>',
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
    visao: 'listas', // listas | calendario | kanban | mapa | desempenho
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

  /** A pessoa está escrevendo na tela (Novo compromisso, busca, texto do mapa mental)? */
  function digitando() {
    const a = document.activeElement;
    return Boolean(a && tela && tela.view.contains(a) && a.matches('input:not([type=checkbox]):not([type=radio]):not([type=button]), textarea'));
  }
  let redesenhoPendente = false;
  /** Redesenho que vem de fora (servidor a cada 30 s, relógio, chat): nunca apaga o que se está digitando (G3). */
  function renderQuandoLivre() {
    if (!tela.view.classList.contains('show')) return;
    if (digitando() || document.querySelector('dialog[open]')) { redesenhoPendente = true; return; }
    redesenhoPendente = false;
    render();
  }

  function garantirTela() {
    if (tela) return tela;
    tela = U.criarTela({ id: 'agenda-view', titulo: 'Agenda', caminho: caminho(), icone: 'agenda', voltar, cor: COR, corTexto: COR_TEXTO, classe: 'agenda-view' });
    U.atalho(tela, 'Novo compromisso', PATH_MAIS, () => (A.somenteLeitura ? U.avisar(avisoLeitura()) : editar(null, padraoNovo())), { criar: true });
    // Mudança feita aqui redesenha na hora; a que vem do servidor espera a pessoa parar de digitar.
    document.addEventListener('cicluz-agenda-mudou', (e) => {
      if (!tela.view.classList.contains('show')) return;
      if (e.detail && e.detail.externo) renderQuandoLivre(); else render();
    });
    // Mensagens novas no chat: a linha do compromisso mostra.
    document.addEventListener('cicluz-agenda-conversa', renderQuandoLivre);
    // Virada do dia ou da hora com a tela aberta: "Para hoje" e "Atrasados" mudam sozinhos.
    setInterval(renderQuandoLivre, 60000);
    // Saiu do campo (ou fechou o diálogo): faz o redesenho que ficou esperando.
    const talvez = () => setTimeout(() => { if (redesenhoPendente) renderQuandoLivre(); }, 0);
    tela.view.addEventListener('focusout', talvez);
    document.addEventListener('close', talvez, true);
    return tela;
  }

  /** Trava o botão enquanto o servidor responde (segunda barreira contra o duplo toque). */
  async function comBotao(b, promessa) {
    if (b) { b.disabled = true; b.setAttribute('aria-busy', 'true'); }
    try { return await promessa; }
    finally { if (b && b.isConnected) { b.disabled = false; b.removeAttribute('aria-busy'); } }
  }
  const avisoLeitura = () => (A.situacao === 'nao-transferida' ? 'A Agenda está sendo levada para o servidor.' : 'Sem internet: a Agenda mostra a última cópia. Para criar ou alterar, conecte.');
  /** Mostra o erro do servidor, se houver. */
  const seErro = (r) => { if (r && r.erro) U.avisar(r.erro); return r; };

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
    const daPessoa = A.dados.listas.find((l) => l.membro || l.podeGerir) || A.dados.listas[0] || { id: '' };
    const escolhida = estado.listaId && A.lista(estado.listaId);
    const base = { listaId: escolhida && (escolhida.membro || escolhida.podeGerir) ? escolhida.id : daPessoa.id, prioridade: 'normal', alerta: null };
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
    if (A.situacao === 'nao-transferida' || (A.situacao === 'carregando' && !A.dados.listas.length)) {
      if (window.CicluzAgendaTransferencia) window.CicluzAgendaTransferencia.render(body, { aoConcluir: render });
      return;
    }
    if (A.situacao === 'fora-expediente') {
      body.append(U.vazio('A Agenda está fechada agora.', A.motivoBloqueio));
      return;
    }
    if (A.situacao === 'sem-internet') body.append(U.situacao('Sem internet: mostrando a última cópia da Agenda. Para criar ou alterar, conecte.', 'atencao'));
    if (A.situacao === 'erro') body.append(U.situacao('O servidor não respondeu. A Agenda mostra a última cópia; tente de novo em instantes.', 'negativo'));

    const abas = U.chips([['listas', 'Listas'], ['calendario', 'Calendário'], ['kanban', 'Kanban'], ['mapa', 'Mapa mental'], ['desempenho', 'Desempenho']], estado.visao, (v) => { estado.visao = v; render(); });
    abas.classList.add('compras-abas');
    body.append(abas);
    const aviso = window.CicluzAgendaAlertas && window.CicluzAgendaAlertas.convite();
    if (aviso) body.append(aviso);
    if (estado.visao === 'calendario') renderCalendario(body);
    else if (estado.visao === 'kanban') renderKanban(body);
    else if (estado.visao === 'mapa') renderMapa(body);
    else if (estado.visao === 'desempenho') window.CicluzAgendaRotina.renderDesempenho(body);
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
      r.append(ic, el('span', 'agenda-lista-nome', l.nome));
      const novasGrupo = window.CicluzAgendaConversa ? window.CicluzAgendaConversa.naoLidasGrupos()[l.id] : 0;
      if (novasGrupo) { const n = el('span', 'agenda-grupo-novas', String(novasGrupo)); n.title = novasGrupo + (novasGrupo > 1 ? ' mensagens novas no grupo' : ' mensagem nova no grupo'); n.setAttribute('aria-label', n.title); r.append(n); }
      r.append(el('span', 'agenda-lista-conta', String(qtd)));
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
    const busca = U.busca('Buscar por título, nota, local, etiqueta ou atividade', (v) => { estado.busca = v; atualizar(); });
    busca.value = estado.busca;
    ferramentas.append(busca);
    if (l) {
      const ord = U.seletor(D.ORDENACOES, l.ordenacao);
      ord.onchange = () => A.definirOrdenacao(l.id, ord.value).then(seErro);
      ferramentas.append(U.campo('Ordenar por', ord));
      // Chat do grupo: a lista é o grupo; conversam os membros, quem criou e o administrador.
      if ((l.membro || l.podeGerir) && A.situacao === 'servidor') {
        const n = window.CicluzAgendaConversa ? window.CicluzAgendaConversa.naoLidasGrupos()[l.id] || 0 : 0;
        const chat = botao(n ? 'Chat do grupo (' + n + ')' : 'Chat do grupo', () => window.CicluzAgendaConversa.abrirChatGrupo(l), 'btn secondary agenda-chat-grupo' + (n ? ' com-novas' : ''));
        ferramentas.append(chat);
      }
      // Mudar a lista é de quem a criou ou do administrador (o servidor confere).
      if (l.podeGerir && !A.somenteLeitura) ferramentas.append(botao('Editar lista', () => editarLista(l), 'btn secondary'));
    }
    cab.append(ferramentas);
    box.append(cab);

    // "N concluídos · Limpar · Mostrar" (como no Lembretes)
    if (estado.automatica !== 'concluidos' && (l || estado.automatica === 'todos')) {
      const feitos = A.visiveis().filter((i) => i.concluida && (!l || i.listaId === l.id)).length;
      const barra = el('div', 'agenda-concluidos-barra');
      barra.append(el('span', null, feitos + (feitos === 1 ? ' concluído' : ' concluídos')));
      if (feitos) {
        barra.append(botao('Limpar', () => U.confirmar('Limpar concluídos', 'Apagar os ' + feitos + ' compromisso(s) concluído(s)' + (l ? ' de "' + l.nome + '"' : '') + '? Não dá para desfazer.', 'Limpar', async () => { const r = await A.limparConcluidos(l ? l.id : ''); if (r.erro) return r.erro; U.avisar(r.excluidos + ' concluído(s) apagado(s).'); return undefined; }, { cor: COR, corTexto: COR_TEXTO, classe: 'agenda-dialog' }), 'agenda-link'));
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
    if (estado.automatica !== 'concluidos' && estado.automatica !== 'atrasados' && !A.somenteLeitura) lista.append(linhaNova());
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
      caixa.ondrop = (e) => { e.preventDefault(); caixa.classList.remove('recebendo'); const id = e.dataTransfer.getData('text/agenda-ordem'); if (id && id !== item.id) A.reordenar(id, item.id).then(seErro); };
      r.append(alca);
    }
    const circulo = botao('', async () => {
      // Estado desejado: o contrário do que está na tela agora (o segundo toque não desfaz o primeiro).
      const r = await comBotao(circulo, A.concluir(item.id, !item.concluida));
      if (r.erro) return U.avisar(r.erro);
      if (r.resultado === 'repetiu') U.avisar('Feito. O próximo fica para ' + D.quando(A.item(item.id), new Date()) + '.');
      else if (r.resultado === 'concluiu' || r.resultado === 'reabriu') U.avisar(r.resultado === 'concluiu' ? 'Compromisso concluído.' : 'Compromisso reaberto.');
      return undefined;
    }, 'agenda-circulo');
    circulo.setAttribute('aria-label', (item.concluida ? 'Reabrir ' : 'Concluir ') + item.titulo);
    circulo.setAttribute('aria-pressed', String(Boolean(item.concluida)));
    circulo.disabled = !ac.concluir || A.somenteLeitura;
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
    if (pr.total) partes.push(el('span', null, pr.feitas + '/' + pr.total + (pr.total === 1 ? ' atividade' : ' atividades')));
    const novas = window.CicluzAgendaConversa ? window.CicluzAgendaConversa.naoLidas()[item.id] : 0;
    if (novas) { const s = el('span', 'agenda-com-icone agenda-chat-novas'); s.innerHTML = svg(window.CicluzAgendaConversa.ICONE_CHAT); s.append(document.createTextNode(novas + (novas > 1 ? ' mensagens novas' : ' mensagem nova'))); partes.push(s); }
    if (item.notas && !compacta) partes.push(el('span', 'agenda-nota', item.notas.split('\n')[0]));
    partes.forEach((p, n) => { if (n) det.append(document.createTextNode(' · ')); det.append(p); });
    if (partes.length) texto.append(det);

    const direita = el('span', 'compras-linha-direita');
    if (TOM_PRIORIDADE[item.prioridade]) direita.append(U.situacao(nomePrioridade[item.prioridade], TOM_PRIORIDADE[item.prioridade]));
    if (/^https?:\/\//i.test(item.url || '')) {
      const a = el('a', 'agenda-icone-botao');
      a.href = item.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.innerHTML = svg(ICONES.link);
      a.title = 'Abrir o endereço';
      a.setAttribute('aria-label', 'Abrir o endereço de ' + item.titulo);
      direita.append(a);
    }
    if (item.vinculoTela) {
      const t = botao('', () => window.CicluzAgendaRotina.abrirTela(item.vinculoTela), 'agenda-icone-botao agenda-abrir-tela');
      t.innerHTML = svg(ICONES.tela);
      t.title = 'Abrir a tela: ' + (item.vinculoTitulo || 'tela ligada');
      t.setAttribute('aria-label', 'Abrir a tela ' + (item.vinculoTitulo || '') + ' de ' + item.titulo);
      direita.append(t);
    }
    const flag = botao('', () => comBotao(flag, A.alternarSinalizado(item.id)).then(seErro), 'agenda-icone-botao agenda-bandeira' + (item.sinalizado ? ' ligada' : ''));
    flag.innerHTML = svg(ICONES.bandeira);
    flag.title = item.sinalizado ? 'Tirar sinalização' : 'Sinalizar';
    flag.setAttribute('aria-label', flag.title + ': ' + item.titulo);
    flag.setAttribute('aria-pressed', String(Boolean(item.sinalizado)));
    flag.disabled = !ac.editar || A.somenteLeitura;
    direita.append(flag);
    if (pr.total) {
      const aberto = estado.abertos.has(item.id);
      const abrirSubs = botao('', () => { if (aberto) estado.abertos.delete(item.id); else estado.abertos.add(item.id); render(); }, 'agenda-icone-botao agenda-expandir' + (aberto ? ' aberto' : ''));
      abrirSubs.innerHTML = svg(ICONES.seta);
      abrirSubs.title = aberto ? 'Esconder atividades' : 'Mostrar atividades';
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
        const c = botao('', () => comBotao(c, A.marcarSubtarefa(item.id, s.id, !s.concluida)).then(seErro), 'agenda-circulo pequeno');
        c.disabled = !ac.concluir || A.somenteLeitura;
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
    i.onkeydown = async (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const texto = i.value.trim();
      if (!texto || i.readOnly) return;
      const base = padraoNovo();
      // Enquanto o servidor responde, a linha fica travada ("Salvando…"): Enter de novo não cria outro.
      i.readOnly = true;
      dica.textContent = 'Salvando…';
      const r2 = await A.criarRapido(texto, base.listaId, base);
      i.readOnly = false;
      if (r2.erro) { dica.textContent = ''; return U.avisar(r2.erro); }
      setTimeout(() => { const n = tela.body.querySelector('.agenda-nova-entrada'); if (n) n.focus(); }, 0);
      return undefined;
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
      mover: async (id, data, hora) => { const r = await A.moverPara(id, data, hora); if (r.erro) return U.avisar(r.erro); U.avisar('Compromisso levado para ' + D.dataCurta(data) + (hora ? ' às ' + hora : '') + '.'); return undefined; },
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

  /*
   * Janela do compromisso no padrão "linha por linha" da Nova Transferência (DESIGN_SYSTEM.md, PADRÃO CONSOLIDADO;
   * P-53, áudio do Rodrigo de 25/11/2026): grupos com título pequeno e quadro branco, nome à esquerda e valor à
   * direita, data e hora em painel que expande, menos rolagem. Pessoas, subtarefas, local e arquivos abrem por
   * dentro (uma janela sobre a outra), com o resumo na linha. As peças são as da Transferência (CicluzTransferencias.pecas).
   */
  const pecas = () => window.CicluzTransferencias.pecas;
  const SETA_DIREITA = '<path d="m9 6 6 6-6 6"/>';
  /** Linha que abre outra janela: nome, resumo à direita e a seta (padrão "Anexos"). */
  function linhaQueLeva(rotulo, aoToque) {
    const b = el('button', 'transferencia-linha transferencia-linha-acao agenda-linha-leva');
    b.type = 'button';
    const resumo = el('span', 'transferencia-linha-valor');
    const seta = el('span', 'transferencia-seta');
    seta.setAttribute('aria-hidden', 'true');
    seta.innerHTML = svg(SETA_DIREITA);
    b.append(el('span', 'transferencia-linha-rotulo', rotulo), resumo, seta);
    b.onclick = aoToque;
    return { no: b, resumo: (t) => { resumo.textContent = t; } };
  }
  /** Linha com um texto só de leitura à direita. */
  function linhaLeitura(rotulo, valor) {
    const P = pecas();
    return P.linha(rotulo, el('span', 'transferencia-linha-valor', valor));
  }
  /** Janela sobre a janela do compromisso (subtarefas, pessoas, local, arquivos): "Salvar" devolve o que mudou. */
  function subJanela({ titulo, subtitulo, montar, aplicar, soLeitura }) {
    U.dialogo({
      titulo, subtitulo, cor: COR, corTexto: COR_TEXTO, classe: 'agenda-dialog agenda-sub-janela', rotuloSalvar: 'Salvar',
      montar: (form, dlg) => {
        const repetido = dlg.querySelector('.compras-dialog-sub');
        if (repetido && !subtitulo) repetido.remove();
        form.dataset.textoLivre = '';
        const corpo = el('div', 'transferencia-tela transferencia-corpo agenda-form');
        form.append(corpo);
        return montar(corpo) || {};
      },
      salvar: soLeitura || !aplicar ? undefined : (c) => aplicar(c),
    });
  }

  function editar(id, base) {
    const atual = id ? A.item(id) : null;
    if (id && !atual) return U.avisar('Compromisso não encontrado.');
    const ac = atual ? A.acesso(atual) : { ver: true, editar: true, concluir: true, excluir: true, gestor: true };
    if (atual && !ac.ver) return U.avisar('Você não participa deste compromisso.');
    const v = structuredClone(atual || { titulo: '', notas: '', url: '', local: '', etiquetas: [], subtarefas: [], pessoas: [], avaliacao: { tipo: '', notas: [] }, hora: '', horaFim: '', repeticao: null, alerta: null, colunaId: '', acaoTela: '', acaoQuantidade: null, ...base });
    const soLeitura = !ac.editar || A.somenteLeitura;
    const P = pecas();
    U.dialogo({
      titulo: !atual ? 'Novo compromisso' : soLeitura ? 'Compromisso' : 'Editar compromisso',
      subtitulo: soLeitura ? 'Você pode ver' + (ac.concluir ? ' e concluir' : '') + ' este compromisso; editar é com o gestor.' : undefined,
      largo: true,
      cor: COR,
      corTexto: COR_TEXTO,
      classe: 'agenda-dialog agenda-compromisso-dialog',
      rotuloSalvar: atual ? 'Salvar compromisso' : 'Salvar · Criar compromisso',
      montar: (form, dlg) => {
        // O caminho já está no cabeçalho (padrão da Nova Transferência): tira a linha repetida.
        if (!soLeitura) { const repetido = dlg.querySelector('.compras-dialog-sub'); if (repetido) repetido.remove(); }
        // Texto livre: o S2 não troca as letras para maiúsculas (index.html, regra do focusout).
        form.dataset.textoLivre = '';
        const corpo = el('div', 'transferencia-tela transferencia-corpo agenda-form');
        form.append(corpo);

        /* O quê */
        const titulo = U.entrada('text', v.titulo, { maxLength: 200, required: true, placeholder: 'Ex.: Conferir o estoque' });
        const notas = U.entrada('text', v.notas || '', { maxLength: 2000, placeholder: 'Opcional' });
        const url = U.entrada('text', v.url || '', { placeholder: 'https://', maxLength: 500, inputMode: 'url', autocomplete: 'url' });

        /* Quando: data e hora em painel (U.campoData / U.campoHora), como na Nova Transferência */
        const data = U.campoData({ rotulo: 'Data', valor: v.data || '' });
        const hora = U.campoHora({ rotulo: 'Início', valor: v.hora || '' });
        const horaFim = U.campoHora({ rotulo: 'Término', valor: v.horaFim || '' });
        const alerta = U.seletor(D.ALERTAS, v.alerta === null || v.alerta === undefined ? '' : String(v.alerta));
        const repeticao = editorRepeticao(v.repeticao, () => data.valor());

        /* Organização */
        const listaSel = U.seletor(A.dados.listas.filter((l) => l.membro || l.podeGerir || l.id === v.listaId).map((l) => [l.id, l.nome]), v.listaId);
        const colunaSel = U.seletor(A.dados.colunas.map((c) => [c.id, c.nome]), A.coluna(v.colunaId) ? v.colunaId : (A.dados.colunas[0] || { id: '' }).id);
        const prioSel = U.seletor(D.PRIORIDADES, v.prioridade || 'normal');
        const etiquetas = U.entrada('text', (v.etiquetas || []).join(', '), { placeholder: 'Ex.: Loja, Estoque' });
        let sinalizado = Boolean(v.sinalizado);
        const sinal = P.chave('Sinalizar', sinalizado, ['Sim', 'Não'], (x) => { sinalizado = x; });

        /* Pessoas, subtarefas e local: abrem por dentro, com o resumo na linha */
        let pessoas = D.normalizarPessoas(v.pessoas);
        const linhaPessoas = linhaQueLeva('Pessoas', () => subJanela({
          titulo: 'Pessoas e permissões', subtitulo: v.titulo || 'Compromisso', soLeitura: soLeitura || !ac.gestor,
          montar: (c) => { const e = editorPessoas({ pessoas }, atual, ac.gestor && !soLeitura); c.append(e.no); return { e }; },
          aplicar: (c) => { pessoas = c.e.valor(); resumirPessoas(); return undefined; },
        }));
        const resumirPessoas = () => {
          const resp = pessoas.filter((p) => p.responsavel);
          linhaPessoas.resumo(pessoas.length ? (resp.length ? resp.map((p) => A.nomePessoa(p.id)).join(', ') : pessoas.length + (pessoas.length === 1 ? ' pessoa' : ' pessoas')) : 'Só o gestor');
        };
        resumirPessoas();

        let subs = (v.subtarefas || []).map((s) => ({ ...s }));
        const linhaSubs = linhaQueLeva('Atividades', () => subJanela({
          titulo: 'Atividades', subtitulo: v.titulo || 'Compromisso', soLeitura,
          montar: (c) => { const e = editorSubtarefas(subs); c.append(e.no); return { e }; },
          aplicar: (c) => { subs = c.e.valor(); resumirSubs(); return undefined; },
        }));
        const resumirSubs = () => {
          const feitas = subs.filter((s) => s.concluida).length;
          linhaSubs.resumo(subs.length ? feitas + ' de ' + subs.length + ' feitas' : 'Nenhuma');
        };
        resumirSubs();

        let local = v.local || '';
        let localizacao = v.localizacao || null;
        const linhaLocal = linhaQueLeva('Local', () => subJanela({
          titulo: 'Local', subtitulo: v.titulo || 'Compromisso', soLeitura,
          montar: (c) => {
            const endereco = U.entrada('text', local, { maxLength: 200, placeholder: 'Endereço ou nome do lugar' });
            const lugar = soLeitura ? null : window.CicluzAgendaMapa.seletor({ localizacao, local }, endereco);
            if (lugar) c.append(P.secao('Lugar no mapa', lugar.no));
            c.append(P.secao('Endereço', P.quadro(P.linhaDe('Endereço', endereco))));
            if (!soLeitura) c.append(U.nota('Preenchido ao marcar no mapa; pode escrever ou corrigir.'));
            return { endereco, lugar };
          },
          aplicar: (c) => { local = c.endereco.value; localizacao = c.lugar ? c.lugar.valor() : localizacao; resumirLocal(); return undefined; },
        }));
        const resumirLocal = () => linhaLocal.resumo(local || (localizacao && Number.isFinite(localizacao.lat) ? 'No mapa' : 'Nenhum'));
        resumirLocal();

        /*
         * Tela e área primeiro (P-58, Rodrigo 27/11/2026: "a primeira coisa é a tela, depois a área"). A tela se escolhe na árvore do
         * menu (menu › seção › tela) ou já vem do ícone roxo de agendar; a tarefa leva a ela e, com ação, conclui sozinha (P-53).
         * Tarefa criada pela própria tela (pedido agendado…) não troca de tela.
         */
        const ROT = window.CicluzAgendaRotina;
        let vinculo = v.vinculoTela ? { tela: v.vinculoTela, titulo: v.vinculoTitulo || 'Tela do sistema' } : null;
        const telaPresa = Boolean(atual && atual.vinculoRef);
        const tituloDaTela = (endereco) => ((ROT ? ROT.telasDoMenu() : []).find((t) => t.endereco === endereco) || {}).titulo || '';
        const campoTela = U.campoArvore({
          rotulo: 'Tela', titulo: 'Tela do compromisso', cores: { cor: COR, corTexto: COR_TEXTO }, iconeFolha: ICONES.tela,
          rotuloBusca: 'Buscar tela', vazio: 'Nenhuma tela no menu.', textoVazio: 'Nenhuma', valor: vinculo ? vinculo.tela : '',
          nos: () => (ROT ? ROT.arvoreDoMenu() : []),
          texto: (e) => tituloDaTela(e) || (vinculo && vinculo.tela === e ? vinculo.titulo : ''),
        });
        campoTela.disabled = telaPresa;
        const area = U.campoLocal({ rotulo: 'Área', titulo: 'Área / Setor / Local', valor: v.areaId || '', textoVazio: 'Nenhuma' });
        const telaQuadro = el('div', 'agenda-tela-ligada');
        const acoesDaTela = (tela) => (ROT && tela ? ROT.acoesDaTela(tela) : []);
        const acaoSel = U.seletor([], '');
        const opcoesDaAcao = (atualAcao) => {
          acaoSel.replaceChildren(...[['', 'Nenhuma: concluir com "Feito"'], ...acoesDaTela(vinculo && vinculo.tela).map((a) => [a.id, a.rotulo])].map(([id, rotulo]) => new Option(rotulo, id)));
          acaoSel.value = [...acaoSel.options].some((o) => o.value === atualAcao) ? atualAcao : '';
        };
        opcoesDaAcao(v.acaoTela || '');
        const quantidade = U.roletaNumero({ rotulo: 'Quantidade', titulo: 'Quantidade', min: 1, max: 365, valor: String(v.acaoQuantidade || 1) });
        const linhaQtd = P.linhaDe('Quantidade', quantidade.input);
        linhaQtd.append(quantidade.painel);
        P.abreAoTocarNaLinha(linhaQtd, quantidade.input, quantidade.painel);
        const linhaTela = P.linhaDe('Tela', campoTela);
        const linhaArea = P.linhaDe('Área', area);
        const desenharTela = () => {
          const linhas = [linhaTela];
          if (!vinculo) {
            telaQuadro.replaceChildren(P.quadro(linhaTela, linhaArea), U.nota('Escolha a tela em que a tarefa é feita (ou use o ícone roxo de agendar na própria tela). A área liga o compromisso ao DES - Área / Setor / Local.'));
            return;
          }
          const abrir = el('button', 'transferencia-circulo agenda-abrir-tela');
          abrir.type = 'button';
          abrir.title = 'Abrir a tela';
          abrir.setAttribute('aria-label', 'Abrir a tela ' + vinculo.titulo);
          abrir.innerHTML = svg(ICONES.tela);
          abrir.onclick = () => window.CicluzAgendaRotina.abrirTela(vinculo.tela);
          linhaTela.querySelectorAll('.agenda-abrir-tela').forEach((b) => b.remove());
          if (atual && atual.vinculoTela === vinculo.tela) linhaTela.append(abrir);
          // Tarefa criada pela própria tela (pedido agendado, lançar produção…): a tela conclui; não há ação a escolher.
          if (!(atual && atual.vinculoRef) && acoesDaTela(vinculo.tela).length) {
            linhas.push(P.linhaDe('Ação que conta', acaoSel));
            if (acaoSel.value) linhas.push(linhaQtd);
          }
          linhas.push(linhaArea);
          const nota = atual && atual.vinculoRef ? 'Criada pela própria tela: conclui sozinha quando o que ela pede é feito.'
            : acaoSel.value ? 'Conclui sozinha quando a ação é feita na tela essa quantidade de vezes (em cada repetição). Também dá para tocar em "Feito" no aviso da tela.'
            : 'Ao abrir a tela no dia, aparece o aviso com "Feito".';
          telaQuadro.replaceChildren(P.quadro(...linhas), U.nota(nota));
        };
        acaoSel.addEventListener('change', desenharTela);
        // Trocar a tela na árvore (desmarcar tira a tela): as ações passam a ser as da tela nova.
        campoTela.addEventListener('change', () => {
          vinculo = campoTela.value ? { tela: campoTela.value, titulo: (tituloDaTela(campoTela.value) || 'Tela do sistema').slice(0, 120) } : null;
          opcoesDaAcao(acaoSel.value);
          desenharTela();
        });
        desenharTela();

        /* Avaliação */
        const tipoAvaliacao = U.seletor(D.TIPOS_AVALIACAO, (v.avaliacao && v.avaliacao.tipo) || '');
        const travadaAvaliacao = !ac.gestor || Boolean(atual && atual.avaliacao && atual.avaliacao.notas && atual.avaliacao.notas.length);
        tipoAvaliacao.disabled = travadaAvaliacao;
        const avaliacao = P.secao('Avaliação', P.quadro(P.linhaDe('Tipo de avaliação', tipoAvaliacao)),
          U.nota(travadaAvaliacao && ac.gestor ? 'Já há avaliação registrada: o tipo não muda.' : 'Depois de concluído, o gestor avalia a execução de cada responsável e cada um se autoavalia.'));
        avaliacao.classList.add('agenda-avaliacao');
        if (atual && atual.concluida && atual.avaliacao && atual.avaliacao.tipo) avaliacao.append(painelAvaliacao(atual));

        const linhaData = P.abreAoTocarNaLinha(P.linha('Data', data.caixa, data.painel), data.input, data.painel);
        const linhaHora = P.abreAoTocarNaLinha(P.linha('Início', hora.caixa, hora.painel), hora.input, hora.painel);
        const linhaFim = P.abreAoTocarNaLinha(P.linha('Término', horaFim.caixa, horaFim.painel), horaFim.input, horaFim.painel);
        corpo.append(
          P.secao('Tela e área', telaQuadro),
          P.secao('', P.quadro(P.linhaDe('Título *', titulo), P.linhaDe('Notas', notas), P.linhaDe('Endereço na internet', url))),
          P.secao('Quando', P.quadro(linhaData, linhaHora, linhaFim, P.linhaDe('Alerta', alerta), ...repeticao.linhas), repeticao.resumo),
          P.secao('Organização', P.quadro(P.linhaDe('Lista', listaSel), P.linhaDe('Coluna do Kanban', colunaSel), P.linhaDe('Prioridade', prioSel), P.linhaDe('Etiquetas', etiquetas), P.linha('Sinalizar', sinal))),
          P.secao('Detalhes', P.quadro(linhaPessoas.no, linhaSubs.no, linhaLocal.no)),
        );
        if (atual) {
          const conversa = window.CicluzAgendaConversa;
          const n = conversa.naoLidas()[atual.id] || 0;
          const linhaChat = linhaQueLeva('Mensagens', () => conversa.abrirChat(atual));
          linhaChat.resumo(n ? n + (n > 1 ? ' novas' : ' nova') : 'Abrir o chat');
          const linhaArquivos = linhaQueLeva('Arquivos e evidências', () => subJanela({
            titulo: 'Arquivos e evidências', subtitulo: atual.titulo, soLeitura: true,
            montar: (c) => { c.append(conversa.secao(atual)); },
          }));
          linhaArquivos.resumo('Ver');
          corpo.append(P.secao('Conversa', P.quadro(linhaChat.no, linhaArquivos.no)));
        }
        corpo.append(avaliacao);
        if (atual) {
          const criado = 'Criado em ' + D.dataCurta(atual.criadoEm.slice(0, 10)) + (atual.criadoPor ? ' por ' + A.nomePessoa(atual.criadoPor) : '') + (atual.concluida ? ' · concluído em ' + D.dataCurta(atual.concluidaEm.slice(0, 10)) : '');
          const fim = P.secao('', ...(ac.excluir ? [P.quadro((() => {
            const b = el('button', 'transferencia-linha transferencia-linha-acao agenda-linha-perigo');
            b.type = 'button';
            b.append(el('span', 'transferencia-linha-rotulo', 'Excluir compromisso'));
            b.onclick = () => excluir(atual);
            return b;
          })())] : []), U.nota(criado));
          fim.classList.add('agenda-form-rodape');
          corpo.append(fim);
        }
        // Só leitura: tudo travado, menos a avaliação (o responsável se autoavalia), a conversa e as linhas que só mostram.
        if (soLeitura) corpo.querySelectorAll('input, select, textarea, button').forEach((x) => { if (!x.closest('.agenda-avaliacao-painel, .agenda-linha-leva, .agenda-abrir-tela, .agenda-form-rodape')) x.disabled = true; });
        return {
          titulo, notas, url, data, hora, horaFim, alerta, repeticao, listaSel, colunaSel, prioSel, tipoAvaliacao, etiquetas, acaoSel, quantidade, area,
          sinal: () => sinalizado, pessoas: () => pessoas, subs: () => subs, local: () => local, localizacao: () => localizacao, vinculo: () => vinculo,
        };
      },
      salvar: soLeitura ? undefined : async (c) => {
        if (c.data.input.value && !c.data.valor()) return 'Data inválida. Use DD/MM/AA.';
        const acao = c.vinculo() ? c.acaoSel.value : '';
        const r = await A.salvarItem(atual ? atual.id : '', {
          titulo: c.titulo.value, notas: c.notas.value, url: c.url.value, local: c.local(), localizacao: c.localizacao(),
          data: c.data.valor(), hora: c.hora.input.value, horaFim: c.horaFim.input.value, alerta: c.alerta.value,
          repeticao: c.repeticao.valor(atual && atual.repeticao), listaId: c.listaSel.value, colunaId: c.colunaSel.value,
          pessoas: c.pessoas(), avaliacao: { tipo: c.tipoAvaliacao.value }, prioridade: c.prioSel.value, sinalizado: c.sinal(),
          etiquetas: c.etiquetas.value, subtarefas: c.subs(),
          vinculoTela: c.vinculo() ? c.vinculo().tela : '', vinculoTitulo: c.vinculo() ? c.vinculo().titulo : '',
          acaoTela: acao, acaoQuantidade: acao ? c.quantidade.valor() || 1 : null, areaId: c.area.value,
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
    const P = pecas();
    const lista = D.normalizarPessoas(v.pessoas);
    const gestorId = atual ? atual.criadoPor : A.usuarioAtual();
    const no = el('div', 'agenda-pessoas');
    const quadro = P.quadro();
    const adicionar = P.quadro();
    no.append(
      P.secao('Gestor', P.quadro(P.linha('Gestor', el('span', 'transferencia-linha-valor', gestorId ? A.nomePessoa(gestorId) : 'Quem criar o compromisso'))),
        U.nota('O gestor (quem criou) escolhe quem participa e o que cada um pode fazer; quem não está aqui não vê o compromisso.')),
      P.secao('Quem participa', quadro),
    );
    if (podeMudar) no.append(P.secao('Adicionar', adicionar));
    const OPCOES = [['responsavel', 'Responsável'], ...D.PERMISSOES];
    function desenhar() {
      // Uma linha por pessoa: nome, as permissões em chips (a linha cresce se elas não couberem) e remover.
      quadro.replaceChildren(...(lista.length ? lista.map((p, n) => {
        const r = el('div', 'transferencia-linha agenda-pessoa');
        r.append(el('span', 'transferencia-linha-rotulo agenda-pessoa-nome', A.nomePessoa(p.id)));
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
          const tirar = el('button', 'transferencia-circulo transferencia-circulo-excluir');
          tirar.type = 'button';
          tirar.title = 'Tirar ' + A.nomePessoa(p.id) + ' do compromisso';
          tirar.setAttribute('aria-label', tirar.title);
          tirar.innerHTML = svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>');
          tirar.onclick = () => { lista.splice(n, 1); desenhar(); };
          r.append(tirar);
        }
        return r;
      }) : [P.linha('Ninguém além do gestor', el('span', 'transferencia-linha-valor', podeMudar ? 'Adicione abaixo' : ''))]));
      const livres = A.pessoas().filter((x) => x.id !== gestorId && !lista.some((p) => p.id === x.id));
      if (!podeMudar) return;
      if (!livres.length) { adicionar.replaceChildren(P.linha('Todas as pessoas já estão aqui', el('span'))); return; }
      const sel = U.seletor(livres.map((x) => [x.id, x.nome]), '', 'Escolha a pessoa');
      sel.addEventListener('change', () => { if (!sel.value) return; lista.push(D.pessoaResponsavel(sel.value)); desenhar(); });
      adicionar.replaceChildren(P.linhaDe('Adicionar como responsável', sel));
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
      U.confirmar('Registrar avaliação', 'Depois de registrada, a avaliação não muda. Confirmar ' + D.textoNota(tipo, valor) + '?', 'Registrar', async () => {
        const r = await A.avaliar(item.id, avaliadoId, valor, comentario.value);
        if (r.erro) return r.erro;
        U.avisar('Avaliação registrada.');
        depois();
        return undefined;
      }, { cor: COR, corTexto: COR_TEXTO, classe: 'agenda-dialog' });
    }, 'btn secondary');
    box.append(chips, comentario, registrar);
    return box;
  }

  /**
   * Repetir: as opções do Lembretes, a personalizada (a cada N dias/semanas/meses/anos, dias da semana) e o fim.
   * Linhas do quadro "Quando": a de Repetir fica sempre; as outras entram e saem logo abaixo dela conforme a escolha
   * (a linha tem display:flex, então o atributo hidden não a esconderia).
   */
  function editorRepeticao(r, dataAtual) {
    const P = pecas();
    const tipo = U.seletor(D.REPETICOES, (r && r.tipo) || 'nunca');
    const intervalo = U.roletaNumero({ rotulo: 'A cada', titulo: 'A cada', min: 1, max: 99, valor: String((r && r.intervalo) || 1) });
    const unidade = U.seletor([['dia', 'dia(s)'], ['semana', 'semana(s)'], ['mes', 'mês(es)'], ['ano', 'ano(s)']], (r && r.unidade) || 'semana');
    const dias = new Set((r && r.diasSemana) || []);
    const diasBox = el('div', 'compras-chips agenda-dias');
    diasBox.setAttribute('role', 'group');
    diasBox.setAttribute('aria-label', 'Dias da semana');
    const desenharDias = () => diasBox.replaceChildren(...D.DIAS_CURTOS.map((n, i) => {
      const b = botao(n.slice(0, 1), () => { if (dias.has(i)) dias.delete(i); else dias.add(i); desenharDias(); atualizar(); }, 'compras-chip' + (dias.has(i) ? ' ativo' : ''));
      b.setAttribute('aria-pressed', String(dias.has(i)));
      b.setAttribute('aria-label', D.DIAS_LONGOS[i]);
      return b;
    }));
    const fimTipo = U.seletor([['nunca', 'Nunca'], ['data', 'Em uma data'], ['vezes', 'Depois de algumas vezes']], (r && r.fim && r.fim.tipo) || 'nunca');
    const fimData = U.campoData({ rotulo: 'Termina em', valor: (r && r.fim && r.fim.data) || '' });
    const fimVezes = U.roletaNumero({ rotulo: 'Quantas vezes', titulo: 'Quantas vezes', min: 1, max: 365, valor: String((r && r.fim && r.fim.vezes) || 5) });
    const comRoleta = (rotulo, roleta) => { const l = P.linhaDe(rotulo, roleta.input); l.append(roleta.painel); return P.abreAoTocarNaLinha(l, roleta.input, roleta.painel); };
    const linhaTipo = P.linhaDe('Repetir', tipo);
    const linhaIntervalo = comRoleta('A cada', intervalo);
    const linhaUnidade = P.linhaDe('Unidade', unidade);
    const linhaDias = P.linha('Nos dias', diasBox);
    const linhaFimTipo = P.linhaDe('Fim da repetição', fimTipo);
    const linhaFimData = P.abreAoTocarNaLinha(P.linha('Termina em', fimData.caixa, fimData.painel), fimData.input, fimData.painel);
    const linhaFimVezes = comRoleta('Quantas vezes', fimVezes);
    const extras = [linhaIntervalo, linhaUnidade, linhaDias, linhaFimTipo, linhaFimData, linhaFimVezes];
    const resumo = el('p', 'profiles-note agenda-repeticao-resumo');
    resumo.setAttribute('role', 'status');
    // A âncora e quantas vezes já foi feita são do servidor (uma regra só, M5); aqui só para o resumo.
    function valor(anterior) {
      if (tipo.value === 'nunca') return null;
      return {
        tipo: tipo.value, intervalo: intervalo.valor() || 1, unidade: unidade.value, diasSemana: [...dias],
        fim: { tipo: fimTipo.value, data: fimData.valor(), vezes: fimVezes.valor() || 0 },
        feitas: anterior && anterior.tipo ? anterior.feitas || 0 : 0,
        ancora: (anterior && anterior.ancora) || dataAtual(),
      };
    }
    function atualizar() {
      const t = tipo.value;
      const visiveis = [];
      if (t === 'personalizada') visiveis.push(linhaIntervalo, linhaUnidade, ...(unidade.value === 'semana' ? [linhaDias] : []));
      if (t !== 'nunca') visiveis.push(linhaFimTipo, ...(fimTipo.value === 'data' ? [linhaFimData] : []), ...(fimTipo.value === 'vezes' ? [linhaFimVezes] : []));
      extras.forEach((l) => { if (!visiveis.includes(l)) l.remove(); });
      if (linhaTipo.parentElement) linhaTipo.after(...visiveis);
      resumo.textContent = t === 'nunca' ? '' : 'Repete: ' + D.resumoRepeticao(valor());
      resumo.hidden = t === 'nunca';
    }
    desenharDias();
    [tipo, unidade, fimTipo].forEach((x) => x.addEventListener('change', atualizar));
    [intervalo.input, fimVezes.input, fimData.input].forEach((x) => { x.addEventListener('input', atualizar); x.addEventListener('change', atualizar); });
    // As linhas extras só entram depois que a de Repetir está no quadro.
    queueMicrotask(atualizar);
    return { linhas: [linhaTipo], resumo, valor };
  }

  /** Subtarefas (janela própria): uma linha por subtarefa — círculo de concluir, texto e remover; Enter cria a próxima. */
  function editorSubtarefas(inicial) {
    const P = pecas();
    const subs = inicial.map((s) => ({ ...s }));
    const quadro = P.quadro();
    const no = P.secao('Atividades', quadro);
    function desenhar(foco) {
      const linhas = subs.map((s, n) => {
        const r = el('div', 'transferencia-linha agenda-subtarefa-edicao');
        // O mesmo círculo de concluir das linhas (como no Lembretes), não caixa de marcar.
        const c = botao('', () => { s.concluida = !s.concluida; c.setAttribute('aria-pressed', String(s.concluida)); }, 'agenda-circulo pequeno');
        c.setAttribute('aria-pressed', String(Boolean(s.concluida)));
        c.setAttribute('aria-label', 'Atividade ' + (n + 1) + ' concluída');
        const t = U.entrada('text', s.titulo, { maxLength: 200, placeholder: 'Atividade' });
        t.classList.add('transferencia-linha-controle');
        t.setAttribute('aria-label', 'Atividade ' + (n + 1));
        t.oninput = () => { s.titulo = t.value; };
        t.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); subs.splice(n + 1, 0, { titulo: '', concluida: false }); desenhar(n + 1); } };
        const tirar = el('button', 'transferencia-circulo transferencia-circulo-excluir');
        tirar.type = 'button';
        tirar.title = 'Tirar atividade ' + (n + 1);
        tirar.setAttribute('aria-label', 'Tirar atividade ' + (n + 1));
        tirar.innerHTML = svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>');
        tirar.onclick = () => { subs.splice(n, 1); desenhar(); };
        r.append(c, t, tirar);
        return r;
      });
      const add = el('button', 'transferencia-linha transferencia-linha-acao agenda-linha-adicionar');
      add.type = 'button';
      const mais = el('span', 'transferencia-circulo');
      mais.setAttribute('aria-hidden', 'true');
      mais.innerHTML = svg(PATH_MAIS_SVG);
      add.append(el('span', 'transferencia-linha-rotulo', 'Adicionar atividade'), mais);
      add.onclick = () => { subs.push({ titulo: '', concluida: false }); desenhar(subs.length - 1); };
      quadro.replaceChildren(...linhas, add);
      if (foco !== undefined) { const alvo = quadro.querySelectorAll('input[type=text]')[foco]; if (alvo) alvo.focus(); }
    }
    desenhar();
    // Linha em branco não vira subtarefa.
    return { no, valor: () => subs.filter((s) => String(s.titulo || '').trim()) };
  }

  function excluir(item) {
    U.confirmar('Excluir compromisso', 'Excluir "' + item.titulo + '"?' + (D.temRepeticao(item) ? ' As próximas repetições também deixam de existir.' : '') + ' Não dá para desfazer.', 'Excluir', async () => {
      const r = await A.excluirItem(item.id);
      if (r.erro) return r.erro;
      document.querySelectorAll('dialog.agenda-dialog[open]').forEach((d) => d.close());
      U.avisar('Compromisso excluído.');
      return undefined;
    }, { cor: COR, corTexto: COR_TEXTO, classe: 'agenda-dialog' });
  }

  /* ---------- Lista: criar, editar, excluir ---------- */

  function editarLista(lista) {
    let cor = lista ? lista.cor : A.CORES_LISTA[A.dados.listas.length % A.CORES_LISTA.length];
    let icone = lista ? lista.icone : 'lista';
    const P = pecas();
    U.dialogo({
      titulo: lista ? 'Editar lista' : 'Nova lista',
      cor: COR,
      corTexto: COR_TEXTO,
      classe: 'agenda-dialog',
      rotuloSalvar: 'Salvar lista',
      montar: (form, dlg) => {
        const repetido = dlg.querySelector('.compras-dialog-sub');
        if (repetido) repetido.remove();
        form.dataset.textoLivre = '';
        const corpo = el('div', 'transferencia-tela transferencia-corpo agenda-form');
        form.append(corpo);
        const nome = U.entrada('text', lista ? lista.nome : '', { maxLength: 40, required: true, placeholder: 'Ex.: Loja' });
        const previa = el('span', 'agenda-lista-icone');
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
        const linhaNome = P.linhaDe('Nome', nome);
        // Cor e ícone abrem por dentro (como no Lembretes): as escolhas não cabem numa linha de 52 px.
        const linhaVisual = linhaQueLeva('Cor e ícone', () => subJanela({
          titulo: 'Cor e ícone', subtitulo: nome.value || 'Lista',
          montar: (c) => {
            const grade = (filho) => { const g = el('div', 'agenda-escolhas-grade'); g.append(filho); return g; };
            c.append(P.secao('Cor', P.quadro(grade(cores))), P.secao('Ícone', P.quadro(grade(icones))));
          },
          aplicar: () => undefined,
        }));
        linhaVisual.no.querySelector('.transferencia-linha-valor').replaceWith(previa);
        corpo.append(P.secao('', P.quadro(linhaNome, linhaVisual.no)));

        // Membros do grupo (P-46): quem participa da lista e do chat do grupo. Quem criou entra sempre. A lista pode
        // ser ligada a uma área do Acesso por Tela (P-46 item 3): aí os membros são as contas com acesso a ela.
        let area = lista ? lista.area || '' : '';
        const eu = A.usuarioAtual();
        const dono = lista ? lista.donoId : eu;
        const escolhidos = new Set(dono ? [dono] : []);
        // Só grava os membros depois de conhecer os de agora: salvar antes de eles chegarem do servidor apagaria os que já existem.
        let membrosProntos = false;
        if (A.situacao === 'servidor') {
          membrosProntos = !lista;
          let nomesAreas = new Map();
          const quem = U.seletor([['', 'Escolhidos à mão']], area);
          quem.disabled = true;
          const linhaQuem = P.linhaDe('Quem entra no grupo', quem);
          const resumo = el('span', 'transferencia-linha-valor');
          const escolher = el('button', 'transferencia-linha transferencia-linha-acao agenda-linha-leva');
          escolher.type = 'button';
          escolher.setAttribute('aria-label', 'Escolher membros');
          const seta = el('span', 'transferencia-seta');
          seta.setAttribute('aria-hidden', 'true');
          seta.innerHTML = svg(SETA_DIREITA);
          escolher.append(el('span', 'transferencia-linha-rotulo', 'Membros'), resumo, seta);
          escolher.onclick = () => U.seletorDeItens({
            titulo: 'Membros do grupo', rotuloBusca: 'Procurar pessoa', cor: COR, corTexto: COR_TEXTO,
            itens: A.pessoas().map((p) => ({ id: p.id, rotulo: p.nome, busca: p.nome, travado: p.id === dono, dica: p.id === dono ? 'Criou a lista: entra sempre.' : '' })),
            marcados: escolhidos,
            aoConfirmar: (s) => { escolhidos.clear(); s.forEach((id) => escolhidos.add(id)); if (dono) escolhidos.add(dono); pintar(); },
          });
          const quadroMembros = P.quadro(linhaQuem, escolher);
          const nota = el('p', 'profiles-note');
          const pintar = () => {
            // Com área, a linha de escolher sai do quadro (a linha tem display:flex: entra e sai, sem hidden).
            if (area) { escolher.remove(); nota.textContent = 'Entram sozinhos todos que têm acesso a ' + (nomesAreas.get(area) || area) + ' no Acesso por Tela, e quem criou a lista. Quem ganha ou perde o acesso entra ou sai do grupo.'; return; }
            if (!escolher.isConnected) quadroMembros.append(escolher);
            const nomes = [...escolhidos].map((id) => A.nomePessoa(id));
            resumo.textContent = nomes.length === 1 ? nomes[0] : nomes.length + ' membros';
            nota.textContent = 'Os membros conversam no chat do grupo e podem criar compromissos nesta lista. Cada compromisso continua visível só para quem participa dele.';
          };
          quem.addEventListener('change', () => { area = quem.value; pintar(); });
          A.areasAcesso().then((r) => {
            if (r.erro) return;
            nomesAreas = new Map(r.dados.map((a) => [a.id, a.nome]));
            quem.replaceChildren(...[['', 'Escolhidos à mão'], ...r.dados.map((a) => [a.id, 'Quem tem acesso a ' + a.nome])].map(([v, t]) => { const o = el('option', null, t); o.value = v; return o; }));
            quem.value = area;
            quem.disabled = Boolean(lista && !lista.podeGerir);
            pintar();
          });
          escolher.disabled = !membrosProntos;
          pintar();
          corpo.append(P.secao('Membros do grupo', quadroMembros, nota));
          if (lista) A.membros(lista.id).then((r) => { if (r.erro) return corpo.append(U.situacao(r.erro, 'negativo')); r.ids.forEach((id) => escolhidos.add(id)); membrosProntos = true; escolher.disabled = false; pintar(); return undefined; });
        }
        if (lista) {
          const qtd = A.visiveis().filter((i) => i.listaId === lista.id).length;
          const excluirLinha = el('button', 'transferencia-linha transferencia-linha-acao agenda-linha-perigo');
          excluirLinha.type = 'button';
          excluirLinha.append(el('span', 'transferencia-linha-rotulo', 'Excluir lista'));
          excluirLinha.onclick = () => U.confirmar('Excluir lista', 'Excluir a lista "' + lista.nome + '"? Não dá para desfazer.', 'Excluir', async () => {
            const r = await A.excluirLista(lista.id);
            if (r.erro) { U.avisar(r.erro); return undefined; }
            if (estado.listaId === lista.id) { estado.listaId = ''; estado.automatica = 'todos'; }
            document.querySelectorAll('dialog.agenda-dialog[open]').forEach((d) => d.close());
            U.avisar('Lista excluída.');
            return undefined;
          }, { cor: COR, corTexto: COR_TEXTO, classe: 'agenda-dialog' });
          const fim = P.secao('', P.quadro(excluirLinha), U.nota(qtd + ' compromisso(s) nesta lista.'));
          fim.classList.add('agenda-form-rodape');
          corpo.append(fim);
        }
        // Lista ligada a uma área: os membros vêm da área (o servidor monta); não manda a escolha à mão.
        return { nome, area: () => area, membros: () => (membrosProntos && !area ? [...escolhidos] : []) };
      },
      salvar: async (c) => {
        const r = await A.salvarLista(lista ? lista.id : '', { nome: c.nome.value, cor, icone, area: A.situacao === 'servidor' ? c.area() : undefined });
        if (r.erro) return r.erro;
        const ids = c.membros();
        if (ids.length) {
          const m = await A.definirMembros(lista ? lista.id : r.id, ids);
          if (m.erro) return 'A lista foi salva, mas os membros não: ' + m.erro;
        }
        if (!lista) { estado.listaId = r.id; estado.automatica = ''; estado.detalhe = true; }
        render();
        U.avisar('Lista salva.');
        return undefined;
      },
    });
  }

  /** Compromisso novo com os valores da tela aberta mais os extras (ex.: tela ligada pelo ícone roxo). */
  const novo = (extra = {}) => { garantirTela(); return editar(null, padraoNovo(extra)); };

  window.CicluzAgenda = { abrir, editar, novo, estado, COR, COR_TEXTO, ICONES_LISTA };
})();
