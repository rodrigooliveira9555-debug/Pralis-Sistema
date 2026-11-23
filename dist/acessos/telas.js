/*
 * Configurações → Permissões → Acesso por Tela (ESBOÇO, pedido do Washington, 19 e 23/11/2026).
 * O menu inteiro, uma linha por tela. Em cada linha, sete interruptores, um por permissão, só com o ícone (sem texto):
 *   ← Lançar · ← Discriminar · ← Editar · ← Visualizar · ↔ Pagar · → Editar · → Visualizar
 * A seta diz de que lado do pagamento a permissão está (← antes de pagar, → depois de pagar, ↔ o próprio pagar).
 * A lista de telas fica à esquerda; cada escolha (colaborador do DP, cargo de DES - Cargos C/Salários ou área de DES - Área / Setor /
 * Local) vira uma COLUNA de sete interruptores ao lado, já com tudo ligado, e o "+" da esquerda abre a próxima coluna.
 * A lista de telas é lida do próprio menu (window.CicluzMenu): módulo novo no menu aparece aqui com tudo DESLIGADO.
 * SEM backend: nada é gravado e nenhum acesso muda. Quando o modelo de dados for aprovado, o valor passa a valer na API.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const A = window.CicluzAcessos;
  const ACOES = window.CicluzAcessosAcoesDados;
  if (!U || !A || !ACOES) return;
  const { el } = U;
  let tela = null;
  // blocos = as colunas abertas ({alvo: {tipo, id, nome}, quem: linha com a lista aberta}); abertos = grupos abertos; secAbertas =
  // seções abertas ('grupo|seção'). registros guarda (só na memória) o que cada pessoa, cargo ou área tem ligado.
  let seq = 0;
  const novoBloco = () => ({ id: ++seq, alvo: null, quem: '' });
  const estado = { aba: 'telas', busca: '', abertos: new Set(), secAbertas: new Set(), blocos: [novoBloco()] };
  const registros = new Map();

  /* ---------- As sete permissões ---------- */

  // Desenhos do Design System (aba Ícones): lápis (editar) e olho (ver) são os de "Biblioteca — ações da linha"; a prancheta é a de
  // Cadastros Geral, com um lápis pequeno dentro (lançar). O $ é o do sistema (pagar); a lista, a de discriminar.
  const G = {
    lancar: 'M8 4H6a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-2M9 3h6v3H9zM9 17l.7-2.6 5.6-5.6 1.9 1.9-5.6 5.6z',
    discriminar: 'M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01',
    lapis: 'm4 20 4-.8L19 8l-3-3L5 16zM14.5 6.5l3 3',
    olho: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    pagar: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
    mais: 'M12 5v14M5 12h14',
    niveis: 'm5 9 7-6 7 6M5 15l7 6 7-6',
    seta: 'm9 6 6 6-6 6',
  };
  const SETA = { esq: 'M19 12H6m5-5-5 5 5 5', dir: 'M5 12h13m-5-5 5 5-5 5', ambas: 'M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4' };
  // so = tipos de seção em que a permissão existe (l lançamento, r relatório, c cadastro, v só consulta).
  const PERMS = [
    { id: 'lan', nome: 'Lançar', g: 'lancar', seta: 'esq', so: ['l', 'c'] },
    { id: 'dis', nome: 'Discriminar', g: 'discriminar', seta: 'esq', so: ['l'] },
    { id: 'edA', nome: 'Editar antes de pagar', g: 'lapis', seta: 'esq', so: ['l', 'c'] },
    { id: 'veA', nome: 'Visualizar antes de pagar', g: 'olho', seta: 'esq', so: ['l', 'r', 'c', 'v'] },
    { id: 'pag', nome: 'Pagar', g: 'pagar', seta: 'ambas', so: ['l'] },
    { id: 'edD', nome: 'Editar depois de pagar', g: 'lapis', seta: 'dir', so: ['l'] },
    { id: 'veD', nome: 'Visualizar depois de pagar', g: 'olho', seta: 'dir', so: ['l', 'r'] },
  ];
  const aceitas = (tipo) => PERMS.filter((p) => p.so.includes(tipo)).map((p) => p.id);
  // Cadastro e consulta não têm pagamento: ali o nome não leva o "antes de pagar".
  const nomeDaPerm = (p, tipo) => ((tipo === 'c' || tipo === 'v') ? p.nome.replace(' antes de pagar', '') : p.nome);

  function iconePerm(p) {
    const s = el('span', 'acessos-nivel-ic');
    s.innerHTML = U.svg('<path d="' + G[p.g] + '"/>');
    const b = el('span', 'acessos-nivel-seta');
    b.innerHTML = U.svg('<path d="' + SETA[p.seta] + '"/>');
    s.append(b);
    s.setAttribute('aria-hidden', 'true');
    return s;
  }

  /** O botão redondo "+" do sistema (botão redondo de ação). Aberto, o "+" vira "×". */
  function botaoMais(rotulo, aberto, acao) {
    const b = el('button', 'shortcut-circle compras-redondo acessos-telas-mais');
    b.type = 'button';
    b.title = rotulo;
    b.setAttribute('aria-label', rotulo);
    b.setAttribute('aria-expanded', String(aberto));
    b.innerHTML = U.svg('<path d="' + G.mais + '"/>');
    b.onclick = acao;
    return b;
  }

  /* ---------- O menu do sistema ---------- */

  const tipoDaSecao = (i, sec) => (sec === 'Design System' ? 'v' : i === 5 || sec === 'Relatórios' ? 'r' : /^Lançamentos/.test(sec) ? 'l' : 'c');

  /** Grupo › seção › tela, lidos do menu na hora. A chave de cada tela é a do cartão do menu (data-menu-item-key). */
  function lerMenu() {
    const m = window.CicluzMenu;
    if (!m) return [];
    const vistas = new Set();
    return m.sections.map(([nome, setores], i) => {
      const secoes = [];
      setores.forEach((sec) => {
        let cartoes = [];
        try { cartoes = m.cards(i, sec, m.temCartoes(i, sec) ? 'tree' : 'empty') || []; } catch (e) { cartoes = []; }
        const telas = cartoes.map(([rotulo, , alvo]) => {
          let chave = alvo;
          if (vistas.has(chave)) chave = i + '/' + sec + '/' + alvo;
          vistas.add(chave);
          return { chave, rotulo };
        });
        if (telas.length) secoes.push({ n: sec, t: tipoDaSecao(i, sec), telas });
      });
      return { i, n: nome, c: m.cores[i] || '#7c3aed', secoes };
    }).filter((g) => g.secoes.length);
  }

  /* ---------- Para quem: o que já existe no sistema ---------- */

  const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR');

  /** Colaboradores do DP (Cadastros Geral Colaboradores): os ativos, pelo id do cadastro. */
  function pessoasDP() {
    try { return window.CicluzPeople.selectable().filter((p) => p.active).map((p) => ({ id: p.id, nome: p.name, detalhe: p.jobName })).sort(porNome); } catch (e) { return []; }
  }
  /** Cargos de DES - Cargos C/Salários: a mesma lista dessa tela. */
  function cargosDES() {
    try { return jobsCurrent().map(({ j, key }) => ({ id: key, nome: formatSystemName(j.nomeReduzido || j.nome), detalhe: j.categoria || '' })).sort(porNome); } catch (e) { return []; }
  }
  /** Áreas de DES - Área / Setor / Local: a árvore salva, com o caminho (Área › Setor › Local); inativas ficam de fora. */
  function areasDES() {
    const fora = [];
    try {
      const salvo = JSON.parse(localStorage.getItem('cicluz-location-tree-v1') || '[]');
      const arvore = Array.isArray(salvo) ? salvo : salvo.tree || [];
      const andar = (nos, caminho) => nos.forEach((n) => {
        if (n.inactive) return;
        const c = [...caminho, n.name];
        fora.push({ id: n.id, nome: n.name, detalhe: caminho.join(' › ') });
        andar(n.children || [], c);
      });
      andar(arvore, []);
    } catch (e) { return []; }
    return fora;
  }
  const LINHAS = [
    ['pessoa', 'Usuário / colaborador', 'Selecionar o nome', pessoasDP, 'Nenhum colaborador ativo no DP ainda.'],
    ['cargo', 'Cargo', 'Selecionar o cargo', cargosDES, 'Nenhum cargo cadastrado.'],
    ['area', 'Área', 'Selecionar a área', areasDES, 'Nenhuma área cadastrada.'],
  ];

  /* ---------- O que cada um tem ligado (só na memória) ---------- */

  /**
   * Primeira vez que alguém é escolhido: todas as permissões de todas as telas que existem AGORA vêm ligadas. Telas que entram
   * no menu depois não estão em "conhecidas": aparecem desligadas, com a etiqueta "Novo", até alguém ligar.
   */
  function registro(menu, alvo) {
    if (!alvo) return null;
    const k = alvo.tipo + ':' + alvo.id;
    let r = registros.get(k);
    if (!r) {
      r = { telas: {}, conhecidas: new Set(), acoes: new Set() };
      menu.forEach((g) => g.secoes.forEach((s) => s.telas.forEach((t) => { r.telas[t.chave] = new Set(aceitas(s.t)); r.conhecidas.add(t.chave); })));
      registros.set(k, r);
    }
    return r;
  }

  /* ---------- Tela ---------- */

  function abrir() {
    if (!tela) {
      tela = A.criarTela({ id: 'acessos-telas-view', titulo: 'Acesso por Tela', tela: 'telas' });
      tela.view.classList.add('acessos-telas');
    }
    tela.ativar();
    desenhar();
  }

  /**
   * O cabeçalho de uma coluna: as três linhas "+ Selecionar o nome / o cargo / a área". A lista de opções só aparece ao tocar no
   * "+" da linha (com busca quando é longa) e some ao escolher; o escolhido vira o dono da coluna e a linha mostra o nome.
   */
  function cabecaDaColuna(b) {
    const box = el('div', 'acessos-bloco-cab');
    const usados = new Set(estado.blocos.filter((x) => x !== b && x.alvo).map((x) => x.alvo.tipo + ':' + x.alvo.id));
    LINHAS.forEach(([id, rotulo, vazio, ler, semItens]) => {
      const linha = el('div', 'acessos-telas-quem-bloco');
      const aberto = b.quem === id;
      const doTipo = b.alvo && b.alvo.tipo === id;
      const l = el('div', 'acessos-telas-quem');
      l.append(
        botaoMais('Escolher: ' + rotulo.toLocaleLowerCase('pt-BR'), aberto, () => { b.quem = aberto ? '' : id; desenhar(); }),
        el('span', 'acessos-telas-valor' + (doTipo ? '' : ' vazio'), doTipo ? b.alvo.nome : vazio),
      );
      linha.append(l);
      if (aberto) {
        const itens = ler().filter((o) => !usados.has(id + ':' + o.id));
        const lista = el('div', 'acessos-telas-opcoes');
        lista.setAttribute('role', 'radiogroup');
        lista.setAttribute('aria-label', rotulo);
        const opcoes = [];
        if (doTipo) opcoes.push({ id: '', nome: 'Limpar a escolha', detalhe: '' });
        opcoes.push(...itens);
        const botoes = opcoes.map((o) => {
          const marcado = doTipo && b.alvo.id === o.id;
          const bt = el('button', 'acessos-telas-opcao' + (marcado ? ' marcado' : ''));
          bt.type = 'button';
          bt.setAttribute('role', 'radio');
          bt.setAttribute('aria-checked', String(marcado));
          bt.append(el('span', null, o.nome));
          if (o.detalhe) bt.append(el('small', null, o.detalhe));
          bt.dataset.busca = U.dobrar(o.nome + ' ' + (o.detalhe || ''));
          bt.onclick = () => { b.quem = ''; b.alvo = o.id ? { tipo: id, id: o.id, nome: o.nome } : null; desenhar(); };
          return bt;
        });
        if (!itens.length) lista.append(el('p', 'profiles-note acessos-telas-vazio', semItens));
        if (itens.length > 8) {
          const campo = U.entrada('search', '', { placeholder: 'Buscar' });
          campo.className = 'acessos-telas-busca-quem';
          campo.setAttribute('aria-label', 'Buscar em ' + rotulo.toLocaleLowerCase('pt-BR'));
          campo.oninput = () => { const t = U.dobrar(campo.value.trim()); botoes.forEach((x) => { x.hidden = Boolean(t) && !x.dataset.busca.includes(t); }); };
          linha.append(campo);
        }
        lista.append(...botoes);
        linha.append(lista);
      }
      box.append(linha);
    });
    box.append(el('small', 'profiles-note acessos-bloco-resumo'));
    if (b.alvo || estado.blocos.length > 1) {
      const x = el('button', 'acessos-bloco-x');
      x.type = 'button';
      x.title = 'Fechar esta coluna';
      x.setAttribute('aria-label', 'Fechar a coluna' + (b.alvo ? ' de ' + b.alvo.nome : ''));
      x.innerHTML = U.svg('<path d="M6 6l12 12M18 6 6 18"/>');
      x.onclick = () => {
        estado.blocos = estado.blocos.filter((y) => y !== b);
        if (!estado.blocos.length) estado.blocos.push(novoBloco());
        desenhar();
      };
      box.append(x);
    }
    return box;
  }

  function desenhar(irAoFim) {
    const antes = tela.body.querySelector('.acessos-matriz');
    const rolagem = tela.body.scrollTop;
    const esq = antes ? antes.scrollLeft : 0;
    const topo = antes ? antes.scrollTop : 0;
    const menu = lerMenu();
    const regs = estado.blocos.map((b) => registro(menu, b.alvo));
    const blocos = [];
    blocos.push(U.nota('Esboço: nada é gravado e nenhum acesso muda. As telas são as do menu do sistema; colaboradores, cargos e áreas são os cadastrados no sistema. Toque no + para escolher quem; cada escolha vira uma coluna ao lado, já com tudo ligado, e o + da esquerda abre a próxima. Cada ícone é uma permissão: ← antes de pagar · ↔ pagar · → depois de pagar (passe o mouse no ícone para ver o nome).'));
    const abas = U.chips([['telas', 'Telas'], ['acoes', 'Ações especiais']], estado.aba, (v) => { estado.aba = v; desenhar(); });
    abas.classList.add('compras-abas', 'acessos-telas-abas');
    abas.setAttribute('aria-label', 'O que mostrar');
    blocos.push(abas);
    const barra = el('div', 'acessos-barra');
    if (estado.aba === 'telas') barra.append(U.buscaFixa('acessos-telas', 'Buscar tela', estado.busca, (v) => { estado.busca = v; desenhar(); }));
    blocos.push(barra);

    const mat = el('div', 'acessos-matriz');
    mat.setAttribute('role', 'region');
    mat.setAttribute('aria-label', 'Acessos por tela: o nome das telas fica à esquerda, uma coluna de interruptores para cada escolha');
    mat.tabIndex = 0;
    const resumos = [];
    const atualizarResumos = () => resumos.forEach(([reg, alvo]) => {
      if (estado.aba === 'acoes') { alvo.textContent = reg ? reg.acoes.size + ' de ' + ACOES.reduce((n, g) => n + g.i.length, 0) + ' ações liberadas' : 'Escolha para quem é esta coluna.'; return; }
      let com = 0; let novas = 0;
      menu.forEach((g) => g.secoes.forEach((s) => s.telas.forEach((t) => {
        if (reg && (reg.telas[t.chave] || new Set()).size) com++;
        if (reg && !reg.conhecidas.has(t.chave)) novas++;
      })));
      alvo.textContent = reg
        ? com + (com === 1 ? ' tela com acesso' : ' telas com acesso') + (novas ? ' · ' + novas + (novas === 1 ? ' nova, desligada' : ' novas, desligadas') : '')
        : 'Escolha para quem é esta coluna.';
    });

    // Primeira linha: o "+" que abre a próxima coluna e, ao lado, o cabeçalho de cada coluna.
    const cab = el('div', 'acessos-tl acessos-tl-quem-lin');
    const aberta = estado.blocos.every((b) => b.alvo);
    const e = el('div', 'acessos-tl-esq');
    const mais = botaoMais(aberta ? 'Abrir mais uma coluna: escolher outro colaborador, cargo ou área' : 'Escolha primeiro para quem é a coluna aberta', false, () => {
      if (!estado.blocos.every((b) => b.alvo)) return;
      estado.blocos.push(novoBloco());
      desenhar(true);
    });
    mais.disabled = !aberta;
    e.append(mais, el('span', 'acessos-tl-esq-txt', aberta ? 'Nova coluna' : 'Escolha para quem é a coluna aberta'));
    cab.append(e);
    estado.blocos.forEach((b, i) => {
      const w = el('div', 'acessos-tl-bloco acessos-tl-bloco-cab');
      const c = cabecaDaColuna(b);
      resumos.push([regs[i], c.querySelector('.acessos-bloco-resumo')]);
      w.append(c);
      cab.append(w);
    });
    mat.append(cab);

    if (estado.aba === 'acoes') desenharAcoes(mat, regs, atualizarResumos); else desenharTelas(mat, menu, regs, atualizarResumos);
    atualizarResumos();
    blocos.push(mat);
    tela.body.replaceChildren(...blocos);
    tela.body.scrollTop = rolagem;
    mat.scrollTop = topo;
    mat.scrollLeft = irAoFim === true ? mat.scrollWidth : esq;
  }

  /** O cabeçalho (grupo ou seção de ações): fica preso à esquerda enquanto a matriz rola para o lado. */
  const prenderAEsquerda = (sec) => { sec.classList.add('acessos-telas-grupo'); };

  /** Aba "Telas": o menu inteiro; à esquerda o nome, e para cada coluna os sete interruptores. */
  function desenharTelas(mat, menu, regs, atualizarResumos) {
    const termo = U.dobrar(estado.busca);
    let mostradas = 0;
    menu.forEach((g) => {
      const total = g.secoes.reduce((n, s) => n + s.telas.length, 0);
      const aberto = estado.abertos.has(g.n);
      const sec = U.secao('', undefined);
      prenderAEsquerda(sec);
      sec.style.setProperty('--origem', g.c);
      sec.style.setProperty('--menu-accent', g.c);
      sec.style.setProperty('--nivel-cor', g.c);
      const cab = sec.querySelector('.compras-secao-cab');
      const [titulo, sub] = g.n.split(' · ');
      const marca = el('span', 'acessos-tl-marca');
      marca.innerHTML = window.CicluzMenu.marcaOrigem(g.i);
      const nome = el('span', 'acessos-tl-grupo-nome');
      nome.append(el('b', null, titulo));
      if (sub) nome.append(el('small', null, sub));
      const h = cab.querySelector('h3');
      h.replaceChildren(marca, nome, el('span', 'compras-conta', String(total)));

      // Um botão por grupo; cada toque abre mais um nível: 1 = o grupo (as seções), 2 = as seções (as telas), 3 = recolhe tudo.
      const todasAbertas = g.secoes.every((s) => estado.secAbertas.has(g.n + '|' + s.n));
      const rotuloNivel = !aberto ? 'Expandir ' + g.n : todasAbertas ? 'Recolher ' + g.n : 'Expandir mais um nível de ' + g.n;
      const nivel = el('button', 'compras-redondo acessos-telas-nivel');
      nivel.type = 'button';
      nivel.dataset.grupo = g.n;
      nivel.title = rotuloNivel;
      nivel.setAttribute('aria-label', rotuloNivel);
      nivel.setAttribute('aria-expanded', String(aberto));
      nivel.innerHTML = U.svg('<path d="' + G.niveis + '"/>');
      nivel.onclick = () => {
        if (!aberto) { estado.abertos.add(g.n); g.secoes.forEach((s) => estado.secAbertas.delete(g.n + '|' + s.n)); }
        else if (!todasAbertas) g.secoes.forEach((s) => estado.secAbertas.add(g.n + '|' + s.n));
        else { estado.abertos.delete(g.n); g.secoes.forEach((s) => estado.secAbertas.delete(g.n + '|' + s.n)); }
        desenhar();
        const volta = tela.body.querySelector('[data-grupo="' + g.n + '"]');
        if (volta) volta.focus();
      };
      cab.replaceChildren(el('div', 'acessos-tl-cab-esq'));
      cab.firstChild.append(h, nivel);

      let achouNoGrupo = false;
      g.secoes.forEach((s) => {
        const telas = s.telas.filter((t) => !termo || U.dobrar(t.rotulo + ' ' + s.n + ' ' + g.n).includes(termo));
        if (!telas.length) return;
        achouNoGrupo = true;
        if (!aberto && !termo) return;
        const chaveSec = g.n + '|' + s.n;
        const secAberta = estado.secAbertas.has(chaveSec) || Boolean(termo);
        mostradas += telas.length;
        sec.append(cabecaSecao(g, s, telas.length, secAberta, chaveSec));
        if (secAberta) telas.forEach((t) => sec.append(linhaTela(g, s, t, regs, atualizarResumos)));
      });
      if (termo && !achouNoGrupo) return;
      if (!aberto && !termo) sec.classList.add('recolhido');
      mat.append(sec);
    });
    if (termo && !mostradas) mat.append(U.vazio('Nenhuma tela encontrada', 'Tente outro nome.'));
  }

  /** Cabeça de uma seção (Lançamentos, Relatórios…): o ícone do submenu, o nome, a contagem e, aberta, os sete ícones de cada coluna. */
  function cabecaSecao(g, s, qtd, aberta, chaveSec) {
    const linha = el('div', 'acessos-tl acessos-tl-sec');
    const esq = el('div', 'acessos-tl-esq');
    const b = el('button', 'acessos-tl-sec-nome');
    b.type = 'button';
    b.setAttribute('aria-expanded', String(aberta));
    b.setAttribute('aria-label', (aberta ? 'Recolher ' : 'Expandir ') + s.n + ' de ' + g.n);
    const desenho = window.CicluzMenu.subIcone[s.n];
    const ic = el('span', 'acessos-tl-subic');
    ic.innerHTML = desenho ? '<svg viewBox="0 0 24 24" aria-hidden="true">' + desenho + '</svg>' : U.svg(U.ICONES.lista);
    const seta = el('span', 'acessos-tl-seta' + (aberta ? ' aberta' : ''));
    seta.innerHTML = U.svg('<path d="' + G.seta + '"/>');
    b.append(seta, ic, el('span', null, s.n), el('small', null, String(qtd)));
    b.onclick = () => {
      if (estado.secAbertas.has(chaveSec)) estado.secAbertas.delete(chaveSec); else estado.secAbertas.add(chaveSec);
      desenhar();
    };
    esq.append(b);
    linha.append(esq);
    estado.blocos.forEach(() => {
      const w = el('div', 'acessos-tl-bloco');
      if (aberta) {
        const ok = aceitas(s.t);
        PERMS.forEach((p) => {
          const c = el('span', 'acessos-tl-cel acessos-tl-cab-ic' + (ok.includes(p.id) ? '' : ' fora'));
          c.title = nomeDaPerm(p, s.t);
          c.setAttribute('role', 'img');
          c.setAttribute('aria-label', nomeDaPerm(p, s.t) + (ok.includes(p.id) ? '' : ' (não existe nesta seção)'));
          c.append(iconePerm(p));
          w.append(c);
        });
      }
      linha.append(w);
    });
    return linha;
  }

  /** Um interruptor, ligado ao conjunto de permissões da coluna (o registro de quem foi escolhido). */
  function interruptor(rotulo, ligado, desligado, aoMudar) {
    const sw = el('button', 'account-status-switch');
    sw.type = 'button';
    sw.disabled = desligado;
    sw.setAttribute('role', 'switch');
    sw.setAttribute('aria-checked', String(ligado));
    sw.setAttribute('aria-label', rotulo);
    sw.append(el('span'));
    sw.onclick = () => { const liga = sw.getAttribute('aria-checked') !== 'true'; sw.setAttribute('aria-checked', String(liga)); aoMudar(liga); };
    return sw;
  }

  /** Uma linha de tela: à esquerda o ícone da origem e o nome; para cada coluna, os sete interruptores (vazio onde não existe). */
  function linhaTela(g, s, t, regs, atualizarResumos) {
    const nova = regs.some((r) => r && !r.conhecidas.has(t.chave));
    const linha = el('div', 'acessos-tl acessos-tl-tela' + (nova ? ' nova' : ''));
    linha.dataset.chave = t.chave;
    const sigla = /^([A-Z]{3}) - /.exec(t.rotulo);
    const icone = el('span', 'compras-linha-icone');
    icone.style.setProperty('--menu-accent', g.c);
    icone.innerHTML = sigla ? '<span class="sigla-text">' + sigla[1] + '</span>' : U.svg(U.ICONES.lista);
    const esq = el('div', 'acessos-tl-esq');
    const nome = el('span', 'acessos-tl-nome');
    const ics = el('span', 'compras-linha-icones');
    ics.append(icone);
    nome.append(ics, el('b', null, t.rotulo));
    esq.append(nome);
    if (nova) { const et = U.situacao('Novo · desligado', 'atencao'); et.classList.add('acessos-tl-novo'); esq.append(et); }
    linha.append(esq);
    const ok = aceitas(s.t);
    regs.forEach((reg, i) => {
      const w = el('div', 'acessos-tl-bloco');
      PERMS.forEach((p) => {
        const cel = el('span', 'acessos-tl-cel');
        if (!ok.includes(p.id)) { cel.classList.add('fora'); w.append(cel); return; }
        const ligada = Boolean(reg) && (reg.telas[t.chave] || new Set()).has(p.id);
        const quem = estado.blocos[i].alvo ? estado.blocos[i].alvo.nome : 'coluna sem escolha';
        const sw = interruptor(nomeDaPerm(p, s.t) + ' — ' + t.rotulo + ' (' + quem + ')', ligada, !reg, (liga) => {
          const conj = reg.telas[t.chave] || (reg.telas[t.chave] = new Set());
          if (liga) conj.add(p.id); else conj.delete(p.id);
          reg.conhecidas.add(t.chave);
          if (regs.every((r) => !r || r.conhecidas.has(t.chave))) {
            linha.classList.remove('nova');
            const et = linha.querySelector('.acessos-tl-novo');
            if (et) et.remove();
          }
          atualizarResumos();
        });
        sw.title = nomeDaPerm(p, s.t);
        cel.append(sw);
        w.append(cel);
      });
      linha.append(w);
    });
    return linha;
  }

  /**
   * Aba "Ações especiais": as permissões que não são lançar, discriminar, editar, visualizar nem pagar. Uma linha por ação, em grupos
   * por área, com um interruptor por coluna (valem para a área inteira, como hoje). "Administração" fica separada, com aviso.
   */
  function desenharAcoes(mat, regs, atualizarResumos) {
    ACOES.forEach((g) => {
      const sec = U.secao(g.n, g.i.length);
      prenderAEsquerda(sec);
      const cab = sec.querySelector('.compras-secao-cab');
      const e = el('div', 'acessos-tl-cab-esq');
      e.append(cab.querySelector('h3'));
      cab.replaceChildren(e);
      if (g.aviso) sec.append(U.nota(g.aviso));
      g.i.forEach(([chave, rotulo, desc, sensivel]) => {
        const linha = el('div', 'acessos-tl acessos-tl-tela');
        const esq = el('div', 'acessos-tl-esq acessos-tl-esq-acao');
        const nome = el('span', 'acessos-tl-nome acessos-tl-nome-acao');
        const txt = el('span', 'acessos-tl-acao-txt');
        txt.append(el('b', null, rotulo), el('small', null, desc));
        nome.append(txt);
        esq.append(nome);
        if (sensivel) { const s = U.situacao('Sensível', 'atencao'); s.title = 'Mexe em dinheiro já registrado, em dado do DP ou no acesso dos outros'; esq.append(s); }
        linha.append(esq);
        regs.forEach((reg, i) => {
          const w = el('div', 'acessos-tl-bloco');
          const cel = el('span', 'acessos-tl-cel');
          const quem = estado.blocos[i].alvo ? estado.blocos[i].alvo.nome : 'coluna sem escolha';
          cel.append(interruptor(rotulo + ' (' + quem + ')', Boolean(reg) && reg.acoes.has(chave), !reg, (liga) => {
            if (liga) reg.acoes.add(chave); else reg.acoes.delete(chave);
            atualizarResumos();
          }));
          w.append(cel);
          for (let k = 1; k < PERMS.length; k++) w.append(el('span', 'acessos-tl-cel fora'));
          linha.append(w);
        });
        sec.append(linha);
      });
      mat.append(sec);
    });
    mat.append(U.nota('Começam todas desligadas (são sensíveis). Valem para a área inteira (todas as telas de Lançamentos, por exemplo), como hoje.'));
  }

  A.registrar('telas', abrir);
})();
