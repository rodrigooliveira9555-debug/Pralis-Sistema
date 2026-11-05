/*
 * Agenda — tela principal (Agenda · Atividades no menu lateral).
 * Lista: as seis listas automáticas do protótipo (Para hoje, Programados, Todos, Sinalizados,
 * Atrasados, Concluídos), filtro por lista (Gestão de Pessoas, Diretor de Operações e as que o
 * usuário criar), busca, concluir com um toque, sinalizar, subtarefas abertas na própria linha e
 * a linha "Novo compromisso" no fim, como no Lembretes. Calendário: agenda/calendario.js.
 * Peças de tela, diálogo e chips: as mesmas do Compras (compras/ui.js), na cor roxa do menu Agenda.
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
    concluidos: '<path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM8 12l3 3 5-6"/>',
    bandeira: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    seta: '<path d="m9 6 6 6-6 6"/>',
    lixeira: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    pessoa: '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0"/>',
  };
  const TOM_PRIORIDADE = { 'muito-alta': 'negativo', alta: 'atencao', baixa: 'neutro', 'muito-baixa': 'neutro' };
  const nomePrioridade = Object.fromEntries(D.PRIORIDADES);

  const estado = {
    visao: 'lista', // lista | calendario
    automatica: 'todos',
    listaId: '', // '' = todas
    busca: '',
    abertos: new Set(), // compromissos com subtarefas à mostra
    calendario: { modo: 'mes', ref: D.isoData(new Date()) },
  };
  let tela = null;

  function voltar() { if (typeof returnToNavigation === 'function') returnToNavigation(); }
  const caminho = () => 'Agenda · Atividades / ' + (estado.listaId ? (A.lista(estado.listaId) || { nome: 'Lista' }).nome : 'Todas as listas');

  function garantirTela() {
    if (tela) return tela;
    tela = U.criarTela({ id: 'agenda-view', titulo: 'Agenda', caminho: caminho(), icone: 'agenda', voltar, cor: COR, corTexto: COR_TEXTO, classe: 'agenda-view' });
    U.atalho(tela, 'Novo compromisso', PATH_MAIS, () => editar(null, padraoNovo()), { criar: true });
    document.addEventListener('cicluz-agenda-mudou', () => { if (tela.view.classList.contains('show')) render(); });
    // Virada do dia ou da hora com a tela aberta: "Para hoje" e "Atrasados" mudam sozinhos.
    setInterval(() => { if (tela.view.classList.contains('show') && !document.querySelector('dialog[open]')) render(); }, 60000);
    return tela;
  }

  /** Abre a Agenda; listaId (opcional) vem do submenu do menu lateral. */
  function abrir(listaId) {
    garantirTela();
    if (listaId !== undefined) estado.listaId = A.lista(listaId) ? listaId : '';
    render();
    tela.ativar('Agenda', caminho());
  }

  /** Valores de um compromisso novo, conforme a lista e a lista automática em que se está. */
  function padraoNovo(extra = {}) {
    const hoje = D.isoData(new Date());
    return {
      listaId: estado.listaId || A.dados.listas[0].id,
      prioridade: 'normal',
      data: estado.automatica === 'hoje' ? hoje : '',
      sinalizado: estado.automatica === 'sinalizados',
      ...extra,
    };
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

    const barra = el('div', 'agenda-barra');
    barra.append(
      U.chips([['lista', 'Lista'], ['calendario', 'Calendário']], estado.visao, (v) => { estado.visao = v; render(); }),
      seletorListas(),
    );
    body.append(barra);
    if (estado.visao === 'calendario') renderCalendario(body);
    else renderLista(body);
    body.scrollTop = rolagem;
  }

  function seletorListas() {
    const box = el('div', 'agenda-listas');
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', 'Lista');
    const chip = (id, nome, cor) => {
      const b = botao('', () => { estado.listaId = id; render(); }, 'compras-chip agenda-chip-lista' + (estado.listaId === id ? ' ativo' : ''));
      b.setAttribute('aria-pressed', String(estado.listaId === id));
      if (cor) { const p = el('span', 'agenda-ponto'); p.style.setProperty('--lista-cor', cor); b.append(p); }
      b.append(document.createTextNode(nome));
      return b;
    };
    // Editar listas fica junto das listas (o S2 não mostra uma segunda ação no cabeçalho).
    const editarListas = botao('Editar listas', gerenciarListas, 'compras-chip agenda-editar-listas');
    box.append(chip('', 'Todas as listas'), ...A.dados.listas.map((l) => chip(l.id, l.nome, l.cor)), editarListas);
    return box;
  }

  function renderLista(body) {
    const agora = new Date();
    const conta = D.contagens(A.dados.itens, estado.listaId, agora);
    const grade = el('div', 'agenda-automaticas');
    D.LISTAS_AUTOMATICAS.forEach(([chave, nome]) => {
      const b = botao('', () => { estado.automatica = chave; render(); }, 'compras-indicador agenda-automatica a-' + chave + (estado.automatica === chave ? ' ativo' : ''));
      b.setAttribute('aria-pressed', String(estado.automatica === chave));
      const i = el('span', 'agenda-automatica-icone');
      i.innerHTML = svg(ICONES[chave]);
      b.append(i, el('b', null, String(conta[chave])), el('small', null, nome));
      grade.append(b);
    });
    body.append(grade);

    const nome = D.LISTAS_AUTOMATICAS.find(([k]) => k === estado.automatica)[1];
    const itens = D.filtrar(A.dados.itens, estado, agora);
    const busca = U.busca('Buscar por título, nota, etiqueta ou subtarefa', (v) => { estado.busca = v; atualizarItens(); });
    busca.value = estado.busca;
    const secao = U.secao(nome, itens.length, busca);
    const lista = el('div', 'compras-lista agenda-itens');
    secao.append(lista);
    body.append(secao);
    preencher(lista, itens, agora);

    function atualizarItens() {
      const novos = D.filtrar(A.dados.itens, estado, new Date());
      const c = secao.querySelector('.compras-conta');
      if (c) { c.textContent = String(novos.length); c.classList.toggle('ativa', novos.length > 0); }
      preencher(lista, novos, new Date());
    }
  }

  function preencher(lista, itens, agora) {
    lista.replaceChildren();
    if (!itens.length) {
      const textos = {
        hoje: ['Nada para hoje.', 'Compromissos com a data de hoje aparecem aqui.'],
        programados: ['Nada programado.', 'Compromissos com data aparecem aqui.'],
        sinalizados: ['Nada sinalizado.', 'Use a bandeira para destacar um compromisso.'],
        atrasados: ['Nada atrasado.', 'Compromissos com data ou hora vencida aparecem aqui.'],
        concluidos: ['Nada concluído ainda.', ''],
        todos: ['Nenhum compromisso.', 'Escreva na linha abaixo ou toque em + para criar.'],
      };
      const [t, p] = estado.busca ? ['Nada encontrado.', 'Tente outra palavra.'] : textos[estado.automatica];
      lista.append(U.vazio(t, p));
    }
    itens.forEach((i) => lista.append(linha(i, agora)));
    if (!['concluidos', 'atrasados'].includes(estado.automatica)) lista.append(linhaNova());
  }

  /** Linha de um compromisso: círculo para concluir, texto, detalhes, bandeira e subtarefas. */
  function linha(item, agora, { compacta = false } = {}) {
    const caixa = el('div', 'agenda-item' + (item.concluida ? ' concluida' : '') + (D.atrasado(item, agora) ? ' atrasada' : ''));
    caixa.dataset.id = item.id;
    const r = el('div', 'compras-linha agenda-linha');
    const circulo = botao('', () => { if (A.alternarConcluida(item.id)) U.avisar(item.concluida ? 'Compromisso reaberto.' : 'Compromisso concluído.'); }, 'agenda-circulo');
    circulo.setAttribute('aria-label', (item.concluida ? 'Reabrir ' : 'Concluir ') + item.titulo);
    circulo.setAttribute('aria-pressed', String(Boolean(item.concluida)));
    const lst = A.lista(item.listaId);
    if (lst) circulo.style.setProperty('--lista-cor', lst.cor);

    const texto = botao('', () => editar(item.id), 'agenda-linha-texto');
    texto.setAttribute('aria-label', 'Abrir ' + item.titulo);
    texto.append(el('b', null, item.titulo));
    const det = el('small', 'agenda-detalhes');
    const partes = [];
    if (item.data) partes.push(el('span', 'agenda-quando', D.quando(item, agora)));
    if (!compacta && !estado.listaId && lst) { const s = el('span', 'agenda-de-lista'); const p = el('span', 'agenda-ponto'); p.style.setProperty('--lista-cor', lst.cor); s.append(p, document.createTextNode(lst.nome)); partes.push(s); }
    if (item.responsavelId) partes.push(el('span', null, A.nomePessoa(item.responsavelId)));
    (item.etiquetas || []).forEach((t) => partes.push(el('span', 'agenda-etiqueta', '#' + t)));
    const pr = D.progresso(item);
    if (pr.total) partes.push(el('span', null, pr.feitas + '/' + pr.total + ' subtarefas'));
    if (item.notas && !compacta) partes.push(el('span', 'agenda-nota', item.notas.split('\n')[0]));
    partes.forEach((p, n) => { if (n) det.append(document.createTextNode(' · ')); det.append(p); });
    if (partes.length) texto.append(det);

    const direita = el('span', 'compras-linha-direita');
    if (TOM_PRIORIDADE[item.prioridade]) direita.append(U.situacao(nomePrioridade[item.prioridade], TOM_PRIORIDADE[item.prioridade]));
    const flag = botao('', () => A.alternarSinalizado(item.id), 'agenda-icone-botao agenda-bandeira' + (item.sinalizado ? ' ligada' : ''));
    flag.innerHTML = svg(ICONES.bandeira);
    flag.title = item.sinalizado ? 'Tirar sinalização' : 'Sinalizar';
    flag.setAttribute('aria-label', flag.title);
    flag.setAttribute('aria-pressed', String(Boolean(item.sinalizado)));
    direita.append(flag);
    if (pr.total) {
      const aberto = estado.abertos.has(item.id);
      const abrir = botao('', () => { if (aberto) estado.abertos.delete(item.id); else estado.abertos.add(item.id); render(); }, 'agenda-icone-botao agenda-expandir' + (aberto ? ' aberto' : ''));
      abrir.innerHTML = svg(ICONES.seta);
      abrir.title = aberto ? 'Esconder subtarefas' : 'Mostrar subtarefas';
      abrir.setAttribute('aria-label', abrir.title);
      abrir.setAttribute('aria-expanded', String(aberto));
      direita.append(abrir);
    }
    r.append(circulo, texto, direita);
    caixa.append(r);

    if (pr.total && estado.abertos.has(item.id)) {
      const subs = el('div', 'agenda-subtarefas');
      item.subtarefas.forEach((s) => {
        const sl = el('div', 'agenda-subtarefa' + (s.concluida ? ' concluida' : ''));
        const c = botao('', () => A.alternarSubtarefa(item.id, s.id), 'agenda-circulo pequeno');
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

  /** "Novo compromisso": escrever e apertar Enter cria na lista e na lista automática atuais. */
  function linhaNova() {
    const r = el('div', 'compras-linha agenda-linha agenda-nova');
    const mais = el('span', 'agenda-circulo vazio');
    mais.innerHTML = svg('<path d="' + PATH_MAIS + '"/>');
    const i = U.entrada('text', '', { placeholder: 'Novo compromisso', maxLength: 200 });
    i.className = 'agenda-nova-entrada';
    i.dataset.textoLivre = '';
    i.setAttribute('aria-label', 'Novo compromisso: escreva e aperte Enter');
    i.onkeydown = (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const titulo = i.value.trim();
      if (!titulo) return;
      const r2 = A.criarRapido(titulo, padraoNovo().listaId, padraoNovo());
      if (r2.erro) return U.avisar(r2.erro);
      // A tela redesenha pelo evento; o foco volta para a linha nova.
      setTimeout(() => { const n = tela.body.querySelector('.agenda-nova-entrada'); if (n) n.focus(); }, 0);
    };
    r.append(mais, i);
    return r;
  }

  function renderCalendario(body) {
    const C = window.CicluzAgendaCalendario;
    const itens = A.dados.itens.filter((i) => (!estado.listaId || i.listaId === estado.listaId) && D.combinaBusca(i, estado.busca));
    C.render(body, {
      itens,
      estado: estado.calendario,
      aoMudar: render,
      linha: (item) => linha(item, new Date(), { compacta: true }),
      abrirItem: (id) => editar(id),
      novoNoDia: (data) => editar(null, padraoNovo({ data, sinalizado: false })),
      mover: (id, data) => { if (A.moverPara(id, data)) U.avisar('Compromisso levado para ' + D.dataCurta(data) + '.'); },
      corDaLista: (id) => (A.lista(id) || {}).cor || COR,
    });
  }

  /* ---------- Editar ---------- */

  function editar(id, base) {
    const atual = id ? A.item(id) : null;
    if (id && !atual) return U.avisar('Compromisso não encontrado.');
    const v = structuredClone(atual || { titulo: '', notas: '', etiquetas: [], subtarefas: [], responsavelId: '', hora: '', ...base });
    U.dialogo({
      titulo: atual ? 'Editar compromisso' : 'Novo compromisso',
      largo: true,
      cor: COR,
      classe: 'agenda-dialog',
      rotuloSalvar: atual ? 'Salvar compromisso' : 'Salvar · Criar compromisso',
      montar: (form) => {
        // Texto livre: o S2 não troca as letras para maiúsculas (index.html, regra do focusout).
        form.dataset.textoLivre = '';
        const titulo = U.entrada('text', v.titulo, { maxLength: 200, required: true });
        const notas = el('textarea');
        notas.value = v.notas || '';
        notas.rows = 3;
        const listaSel = U.seletor(A.dados.listas.map((l) => [l.id, l.nome]), v.listaId);
        const resp = U.seletor(A.pessoas().map((p) => [p.id, p.nome]), v.responsavelId, 'Ninguém');
        const data = U.entrada('date', v.data || '');
        const hora = U.entrada('time', v.hora || '');
        const diaTodo = el('small', 'profiles-note', 'Sem hora = vale o dia todo.');
        let prioridade = v.prioridade || 'normal';
        const prio = U.chips(D.PRIORIDADES, prioridade, (p) => { prioridade = p; });
        const sinal = el('label', 'compras-interruptor');
        const sinalBox = U.entrada('checkbox');
        sinalBox.checked = Boolean(v.sinalizado);
        sinal.append(sinalBox, document.createTextNode('Sinalizar'));
        const etiquetas = U.entrada('text', (v.etiquetas || []).join(', '), { placeholder: 'Ex.: Loja, Estoque' });
        const subtarefas = editorSubtarefas(v.subtarefas || []);

        const grade = el('div', 'agenda-form-grade');
        grade.append(
          U.campo('Título', titulo),
          U.campo('Lista', listaSel),
          U.campo('Data', data),
          U.campo('Hora', hora),
          U.campo('Responsável', resp),
          U.campo('Etiquetas', etiquetas, 'Separe por vírgula.'),
        );
        grade.querySelector('.compras-campo:nth-child(4)').append(diaTodo);
        const prioCampo = el('div', 'compras-campo');
        prioCampo.append(el('span', 'compras-rotulo', 'Prioridade'), prio);
        form.append(grade, prioCampo, sinal, U.campo('Notas', notas), subtarefas.no);
        if (atual) {
          const rodape = el('div', 'agenda-form-rodape');
          const criado = 'Criado em ' + D.dataCurta(atual.criadoEm.slice(0, 10)) + (atual.criadoPor ? ' por ' + A.nomePessoa(atual.criadoPor) : '') + (atual.concluida ? ' · concluído em ' + D.dataCurta(atual.concluidaEm.slice(0, 10)) : '');
          rodape.append(U.nota(criado), botao('Excluir compromisso', () => excluir(atual), 'btn secondary perigo-texto'));
          form.append(rodape);
        }
        return { titulo, notas, listaSel, resp, data, hora, sinalBox, etiquetas, subtarefas, prio: () => prioridade };
      },
      salvar: (c) => {
        const r = A.salvarItem(atual ? atual.id : '', {
          titulo: c.titulo.value, notas: c.notas.value, listaId: c.listaSel.value, responsavelId: c.resp.value,
          data: c.data.value, hora: c.hora.value, prioridade: c.prio(), sinalizado: c.sinalBox.checked,
          etiquetas: c.etiquetas.value, subtarefas: c.subtarefas.valor(),
        });
        if (r.erro) return r.erro;
        U.avisar(atual ? 'Compromisso salvo.' : 'Compromisso criado.');
        return undefined;
      },
    });
  }

  /** Lista editável de subtarefas: marcar, renomear, tirar e acrescentar (Enter cria a próxima). */
  function editorSubtarefas(inicial) {
    const subs = inicial.map((s) => ({ ...s }));
    const no = el('div', 'compras-campo agenda-subtarefas-editor');
    const rotulo = el('span', 'compras-rotulo', 'Subtarefas');
    const lista = el('div', 'agenda-subtarefas-lista');
    const add = botao('Adicionar subtarefa', () => { subs.push({ titulo: '', concluida: false }); desenhar(subs.length - 1); }, 'btn secondary');
    no.append(rotulo, lista, add);
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
    U.confirmar('Excluir compromisso', 'Excluir "' + item.titulo + '"? Não dá para desfazer.', 'Excluir', () => {
      if (!A.excluirItem(item.id)) return 'Não foi possível excluir.';
      document.querySelectorAll('dialog.agenda-dialog[open]').forEach((d) => d.close());
      U.avisar('Compromisso excluído.');
      return undefined;
    }, { cor: COR, classe: 'agenda-dialog' });
  }

  /* ---------- Listas ---------- */

  function gerenciarListas() {
    U.dialogo({
      titulo: 'Listas da agenda',
      subtitulo: 'Cada compromisso fica em uma lista. Os submenus de Agenda · Atividades abrem as duas primeiras.',
      cor: COR,
      classe: 'agenda-dialog',
      montar: (form) => {
        const box = el('div', 'compras-lista agenda-listas-edicao');
        const desenhar = () => {
          box.replaceChildren(...A.dados.listas.map((l) => {
            const qtd = A.dados.itens.filter((i) => i.listaId === l.id).length;
            const p = el('span', 'agenda-ponto grande');
            p.style.setProperty('--lista-cor', l.cor);
            return U.linhaLista({ titulo: l.nome, detalhe: qtd + ' compromisso(s)', direita: [p, botao('Editar', () => editarLista(l, desenhar)), botao('Excluir', () => {
              const r = A.excluirLista(l.id);
              if (r.erro) return U.avisar(r.erro);
              if (estado.listaId === l.id) estado.listaId = '';
              desenhar();
              U.avisar('Lista excluída.');
            }, 'btn secondary perigo-texto')] });
          }));
        };
        desenhar();
        form.append(box, botao('Nova lista', () => editarLista(null, desenhar), 'btn secondary'));
      },
    });
  }

  function editarLista(lista, depois) {
    let cor = lista ? lista.cor : A.CORES_LISTA[A.dados.listas.length % A.CORES_LISTA.length];
    U.dialogo({
      titulo: lista ? 'Editar lista' : 'Nova lista',
      cor: COR,
      classe: 'agenda-dialog',
      rotuloSalvar: 'Salvar lista',
      montar: (form) => {
        const nome = U.entrada('text', lista ? lista.nome : '', { maxLength: 40, required: true });
        const cores = el('div', 'agenda-cores');
        cores.setAttribute('role', 'radiogroup');
        cores.setAttribute('aria-label', 'Cor da lista');
        const desenhar = () => cores.replaceChildren(...A.CORES_LISTA.map((c) => {
          const b = botao('', () => { cor = c; desenhar(); }, 'agenda-cor' + (c === cor ? ' ativa' : ''));
          b.style.setProperty('--lista-cor', c);
          b.setAttribute('role', 'radio');
          b.setAttribute('aria-checked', String(c === cor));
          b.setAttribute('aria-label', 'Cor ' + c);
          return b;
        }));
        desenhar();
        const corCampo = el('div', 'compras-campo');
        corCampo.append(el('span', 'compras-rotulo', 'Cor'), cores);
        form.append(U.campo('Nome', nome), corCampo);
        return { nome };
      },
      salvar: (c) => {
        const r = A.salvarLista(lista ? lista.id : '', c.nome.value, cor);
        if (r.erro) return r.erro;
        if (depois) depois();
        U.avisar('Lista salva.');
        return undefined;
      },
    });
  }

  window.CicluzAgenda = { abrir, editar, estado, COR };
})();
