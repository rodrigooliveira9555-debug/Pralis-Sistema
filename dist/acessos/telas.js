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
  let modoDesenhado = 'telas';
  let seq = 0;
  const novoBloco = (tipo) => ({ id: ++seq, alvo: null, tipo, quem: tipo, recolhida: false });
  const estado = { modo: 'telas', focus: 0, abertos: new Set(), secAbertas: new Set(), blocos: [] };
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
    niveis: 'm6 9 6 6 6-6',
    niveis2: 'm5 9 7-6 7 6M5 15l7 6 7-6',
    seta: 'm6 9 6 6 6-6',
    exclama: 'M12 6.5v7M12 17.5h.01',
  };
  const SETA = { esq: 'M19 12H6m5-5-5 5 5 5', dir: 'M5 12h13m-5-5 5 5-5 5', ambas: 'M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4' };
  const PERMS = [
    { id: 'lan', nome: 'Lançar', g: 'lancar', seta: 'esq' },
    { id: 'dis', nome: 'Discriminar', g: 'discriminar', seta: 'esq' },
    { id: 'edA', nome: 'Editar antes de pagar', g: 'lapis', seta: 'esq' },
    { id: 'veA', nome: 'Visualizar antes de pagar', g: 'olho', seta: 'esq' },
    { id: 'pag', nome: 'Pagar', g: 'pagar', seta: 'ambas' },
    { id: 'edD', nome: 'Editar depois de pagar', g: 'lapis', seta: 'dir' },
    { id: 'veD', nome: 'Visualizar depois de pagar', g: 'olho', seta: 'dir' },
    // O "!" não tem seta: ligar abre as Ações especiais da própria coluna (colaborador, cargo ou área). Começa DESLIGADO (são sensíveis).
    { id: 'esp', nome: 'Ações especiais', g: 'exclama', seta: '' },
  ];
  const TODAS = PERMS.filter((p) => p.id !== 'esp').map((p) => p.id);

  function iconePerm(p) {
    const s = el('span', 'acessos-nivel-ic');
    s.innerHTML = U.svg('<path d="' + G[p.g] + '"/>');
    if (p.seta) {
      const b = el('span', 'acessos-nivel-seta');
      b.innerHTML = U.svg('<path d="' + SETA[p.seta] + '"/>');
      s.append(b);
    }
    s.setAttribute('aria-hidden', 'true');
    return s;
  }

  /** As colunas que a matriz mostra: todas nas telas; nas ações especiais, só a que foi aberta. */
  const colunas = () => (estado.modo === 'acoes' ? estado.blocos.filter((b) => b.id === estado.foco) : estado.blocos);
  const abrirAcoes = (b) => { estado.modo = 'acoes'; estado.foco = b.id; estado.focar = 'voltar'; desenhar(); };

  /** Uma célula de coluna (a do bloco i); recolhida, só fica a faixa estreita com a setinha para reabrir. */
  const blocoEl = (b, extra) => el('div', 'acessos-tl-bloco' + (extra ? ' ' + extra : '') + (estado.modo !== 'acoes' && b && b.recolhida ? ' recolhida' : ''));

  /** Põe em uma linha das telas a célula de cada coluna, na ordem das colunas (Colaborador, Cargo, Área); fazer(b) devolve a célula da coluna b. */
  function gruposDaLinha(linha, fazer) {
    estado.blocos.forEach((b) => { const c = fazer(b); if (c) linha.append(c); });
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
        if (telas.length) secoes.push({ n: sec, telas });
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
      // A cor de um nó sem cor própria é a do ramo (como no cadastro); a sigla é a do cadastro ou as três primeiras letras do nome.
      const andar = (nos, caminho, corPai) => nos.forEach((n) => {
        if (n.inactive) return;
        const c = [...caminho, n.name];
        const cor = n.color || corPai || '#7c3aed';
        const filhos = (n.children || []).filter((x) => !x.inactive).length;
        fora.push({ id: n.id, nome: n.name, detalhe: filhos ? filhos + (filhos === 1 ? ' item' : ' itens') : '', cor, sigla: String(n.sigla || n.name || '').slice(0, 3).toUpperCase(), nivel: caminho.length, caminho: caminho.join(' ') });
        andar(n.children || [], c, cor);
      });
      andar(arvore, [], '');
    } catch (e) { return []; }
    return fora;
  }
  // Os três cabeçalhos da matriz, na ordem: cada um tem o seu "+" (abre uma coluna do tipo) e a sua seta (oculta ou mostra as colunas dele).
  const TIPOS = ['pessoa', 'cargo', 'area'];
  const ROTULO_GRUPO = { pessoa: 'Colaborador', cargo: 'Cargo', area: 'Área' };
  const GLIFO_TIPO = {
    pessoa: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20v-1a6 6 0 0 1 14 0v1"/>',
    cargo: '<circle cx="12" cy="8" r="3"/><path d="M5 20v-2a7 7 0 0 1 14 0v2"/>',
    area: '<path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11Z"/><circle cx="12" cy="10" r="2.2"/>',
  };
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
      menu.forEach((g) => g.secoes.forEach((s) => s.telas.forEach((t) => { r.telas[t.chave] = new Set(TODAS); r.conhecidas.add(t.chave); })));
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
    estado.modo = 'telas';
    desenhar();
  }

  /** Cabeça da coluna nas Ações especiais: o dono vem da coluna aberta (não se troca aqui). */
  function cabecaFixa(b) {
    const box = el('div', 'acessos-bloco-cab');
    const fixo = el('div', 'acessos-telas-trocar acessos-sel-fixo');
    const selo = el('span', 'acessos-sel-selo');
    selo.style.setProperty('--selo-cor', U.corOrigem('despesas', '#ef4444'));
    selo.innerHTML = U.svg(GLIFO_TIPO[b.alvo.tipo]);
    const texto = el('span', 'acessos-sel-texto');
    texto.append(el('span', 'acessos-telas-valor', b.alvo.nome), el('small', 'profiles-note acessos-bloco-resumo'));
    fixo.append(selo, texto);
    box.append(fixo);
    return box;
  }

  /** O nome de uma coluna ocultada: na vertical, lido de baixo para cima e colado na linha de baixo do cabeçalho; tocar nele mostra a coluna. */
  function nomeVertical(b) {
    const bt = el('button', 'acessos-nome-vert');
    bt.type = 'button';
    bt.title = 'Mostrar a coluna de ' + b.alvo.nome;
    bt.setAttribute('aria-label', bt.title);
    bt.setAttribute('aria-expanded', 'false');
    bt.append(el('span', null, b.alvo ? b.alvo.nome : ROTULO_GRUPO[b.tipo]));
    bt.onclick = () => { b.recolhida = false; desenhar(); };
    return bt;
  }

  /**
   * A célula de uma coluna, na linha do seu tipo (Colaborador, Cargo ou Área): o selo do tipo, o nome escolhido e o resumo, com o ×
   * para fechar. Tocar no nome troca a escolha: a lista de opções abre num painel por cima da tabela e some ao escolher.
   */
  function cabecaDaColuna(b) {
    const box = el('div', 'acessos-bloco-cab');
    const usados = new Set(estado.blocos.filter((x) => x !== b && x.alvo).map((x) => x.alvo.tipo + ':' + x.alvo.id));
    const id = b.tipo;
    const aberto = Boolean(b.quem);
    const rotulo0 = ROTULO_GRUPO[id].toLocaleLowerCase('pt-BR');
    const corDES = U.corOrigem('despesas', '#ef4444');
    const GLIFO = GLIFO_TIPO;
    const valor = el('button', 'acessos-telas-trocar');
    valor.type = 'button';
    valor.setAttribute('aria-expanded', String(aberto));
    valor.title = b.alvo ? 'Trocar a escolha desta coluna' : 'Escolher ' + rotulo0;
    valor.setAttribute('aria-label', valor.title);
    const selo = el('span', 'acessos-sel-selo');
    selo.style.setProperty('--selo-cor', corDES);
    selo.innerHTML = U.svg(GLIFO[id]);
    const texto = el('span', 'acessos-sel-texto');
    texto.append(el('span', 'acessos-telas-valor' + (b.alvo ? '' : ' vazio'), b.alvo ? b.alvo.nome : 'Escolher ' + rotulo0), el('small', 'profiles-note acessos-bloco-resumo'));
    valor.append(selo, texto);
    valor.onclick = () => { b.quem = aberto ? '' : b.tipo; desenhar(); };
    box.append(valor);
    if (aberto) {
      const [, rotulo, , ler, semItens] = LINHAS.find(([x]) => x === id);
      const doTipo = b.alvo && b.alvo.tipo === id;
      const itens = ler().filter((o) => !usados.has(id + ':' + o.id));
      const painel = el('div', 'acessos-telas-painel');
      const lista = el('div', 'acessos-telas-opcoes uniforms-options');
      lista.setAttribute('role', 'radiogroup');
      lista.setAttribute('aria-label', rotulo);
      const opcoes = [];
      if (b.alvo) opcoes.push({ id: '', nome: 'Limpar a escolha', detalhe: '' });
      opcoes.push(...itens);
      // As opções seguem as listas dos cadastros, em tamanho menor: colaborador e cargo levam o selo vermelho de DES com o ícone do cadastro;
      // a área leva a sigla e a cor dela, recuada pelo nível (Área › Setor › Local), com a quantidade de itens.
      const botoes = opcoes.map((o) => {
        const marcado = doTipo && b.alvo.id === o.id;
        const seloOpcao = !o.id ? { html: U.svg('<path d="M6 6l12 12M18 6 6 18"/>'), cor: corDES }
          : id === 'area' ? { html: '<span class="sigla-text">' + o.sigla + '</span>', cor: o.cor }
            : { html: U.svg(GLIFO[id]), cor: corDES };
        const bt = U.linhaLista({
          icones: [seloOpcao], titulo: o.nome, detalhe: o.detalhe || '',
          direita: marcado ? el('span', 'account-list-state', 'Escolhida') : undefined,
          aoClicar: () => { b.quem = ''; b.alvo = o.id ? { tipo: id, id: o.id, nome: o.nome } : null; desenhar(); },
        });
        bt.classList.add('uniforms-escolha');
        if (marcado) bt.classList.add('marcado');
        if (o.nivel) bt.style.setProperty('--recuo', String(o.nivel));
        bt.setAttribute('role', 'radio');
        bt.setAttribute('aria-checked', String(marcado));
        bt.dataset.busca = U.dobrar(o.nome + ' ' + (o.caminho || '') + ' ' + (o.detalhe || ''));
        return bt;
      });
      if (!itens.length) lista.append(el('p', 'profiles-note acessos-telas-vazio', semItens));
      if (itens.length > 8) {
        const campo = U.entrada('search', '', { placeholder: 'Buscar' });
        campo.className = 'acessos-telas-busca-quem';
        campo.setAttribute('aria-label', 'Buscar em ' + rotulo.toLocaleLowerCase('pt-BR'));
        campo.oninput = () => { const t = U.dobrar(campo.value.trim()); botoes.forEach((x) => { x.hidden = Boolean(t) && !x.dataset.busca.includes(t); }); };
        painel.append(campo);
      }
      lista.append(...botoes);
      painel.append(lista);
      box.append(painel);
    }
    const x = el('button', 'acessos-bloco-x');
    x.type = 'button';
    x.title = 'Fechar esta coluna';
    x.setAttribute('aria-label', 'Fechar a coluna' + (b.alvo ? ' de ' + b.alvo.nome : ''));
    x.innerHTML = U.svg('<path d="M6 6l12 12M18 6 6 18"/>');
    x.onclick = () => { estado.blocos = estado.blocos.filter((y) => y !== b); desenhar(); };
    box.append(x);
    return box;
  }

  function desenhar(irAoFim) {
    const antes = tela.body.querySelector('.acessos-matriz');
    const rolagem = tela.body.scrollTop;
    const esq = antes ? antes.scrollLeft : 0;
    const topo = antes ? antes.scrollTop : 0;
    if (estado.modo === 'acoes' && !estado.blocos.some((b) => b.id === estado.foco && b.alvo)) estado.modo = 'telas';
    const menu = lerMenu();
    const regs = colunas().map((b) => registro(menu, b.alvo));
    const blocos = [];
    blocos.push(U.nota('Esboço: nada é gravado e nenhum acesso muda. As telas são as do menu do sistema; colaboradores, cargos e áreas são os cadastrados no sistema. As três linhas do cabeçalho (Colaborador, Cargo, Área) têm cada uma o seu + para abrir uma coluna e a sua seta para ocultar ou mostrar as colunas dela; a escolha vira uma coluna ao lado, já com tudo ligado. Cada ícone é uma permissão: ← antes de pagar · ↔ pagar · → depois de pagar; o ! abre as ações especiais da coluna (passe o mouse no ícone para ver o nome).'));
    let fimDoCabecalho = null;
    if (estado.modo === 'telas') {
      // O botão "‹ ›" do cabeçalho (o mesmo das listas): abre todos os menus e submenus de uma vez; com tudo aberto, recolhe tudo. Fica sempre à vista.
      const totalTelas = menu.reduce((n, g) => n + g.secoes.reduce((m, s) => m + s.telas.length, 0), 0);
      const tudoAberto = menu.length > 0 && menu.every((g) => estado.abertos.has(g.n) && g.secoes.every((s) => estado.secAbertas.has(g.n + '|' + s.n)));
      const fim = el('div', 'acessos-quem-fim');
      const escolhidas = estado.blocos.filter((b) => b.alvo);
      const algumaAberta = escolhidas.some((b) => !b.recolhida);
      const conta = el('span', 'compras-conta', String(totalTelas));
      conta.title = totalTelas + (totalTelas === 1 ? ' tela' : ' telas');
      const tudo = el('button', 'shortcut-circle compras-redondo acessos-expandir-tudo');
      tudo.type = 'button';
      tudo.innerHTML = U.svg('<path d="' + G.niveis2 + '"/>');
      tudo.setAttribute('aria-expanded', String(tudoAberto));
      tudo.title = tudoAberto ? 'Recolher todos os menus (para cima)' : 'Expandir todos os menus (para baixo)';
      tudo.setAttribute('aria-label', tudo.title);
      tudo.onclick = () => {
        if (tudoAberto) { estado.abertos.clear(); estado.secAbertas.clear(); }
        else menu.forEach((g) => { estado.abertos.add(g.n); g.secoes.forEach((s) => estado.secAbertas.add(g.n + '|' + s.n)); });
        desenhar();
        const volta = tela.body.querySelector('.acessos-expandir-tudo');
        if (volta) volta.focus();
      };
      // O segundo botão, na horizontal (‹ ›): recolhe ou mostra todas as colunas de uma vez.
      const lado = el('button', 'shortcut-circle compras-redondo acessos-expandir-tudo acessos-colunas-geral');
      lado.type = 'button';
      lado.innerHTML = U.svg('<path d="m9 5-6 7 6 7M15 5l6 7-6 7"/>');
      lado.disabled = !escolhidas.length;
      lado.setAttribute('aria-expanded', String(algumaAberta));
      lado.title = algumaAberta ? 'Recolher todas as colunas' : 'Mostrar todas as colunas';
      lado.setAttribute('aria-label', lado.title);
      lado.onclick = () => { escolhidas.forEach((b) => { b.recolhida = algumaAberta; if (algumaAberta) b.quem = ''; }); desenhar(); };
      fim.append(conta, tudo, lado);
      fimDoCabecalho = fim;
    }

    const mat = el('div', 'acessos-matriz');
    if (estado.modo === 'acoes') mat.classList.add('acessos-matriz-acoes');
    mat.setAttribute('role', 'region');
    mat.setAttribute('aria-label', 'Acessos por tela: o nome das telas fica à esquerda, uma coluna de interruptores para cada escolha');
    mat.tabIndex = 0;
    const resumos = [];
    const atualizarResumos = () => resumos.forEach(([reg, alvo]) => {
      if (estado.modo === 'acoes') { alvo.textContent = reg ? reg.acoes.size + ' de ' + ACOES.reduce((n, g) => n + g.i.length, 0) + ' ações liberadas' : 'Escolha para quem é esta coluna.'; return; }
      let com = 0; let novas = 0;
      menu.forEach((g) => g.secoes.forEach((s) => s.telas.forEach((t) => {
        if (reg && TODAS.some((id) => (reg.telas[t.chave] || new Set()).has(id))) com++;
        if (reg && !reg.conhecidas.has(t.chave)) novas++;
      })));
      alvo.textContent = reg
        ? com + (com === 1 ? ' tela com acesso' : ' telas com acesso') + (novas ? ' · ' + novas + (novas === 1 ? ' nova, desligada' : ' novas, desligadas') : '')
        : 'Escolha para quem é esta coluna.';
    });

    // Cabeçalho (telas): três linhas de 52 px — Colaborador, Cargo e Área. Cada linha tem à esquerda o "+" (abre uma coluna do tipo), o nome, a
    // quantidade e a seta que oculta ou mostra os nomes dela; as colunas escolhidas aparecem na linha do seu tipo, e a seta só mexe nessa linha.
    // Coluna ocultada: estreita, com o nome na vertical (de baixo para cima) colado na linha de baixo do cabeçalho.
    let cab;
    if (estado.modo === 'acoes') {
      cab = el('div', 'acessos-cabecalho');
      const linha = el('div', 'acessos-tl acessos-quem-row');
      const e = el('div', 'acessos-tl-esq');
      const li = el('div', 'acessos-quem-linha');
      const voltar = el('button', 'shortcut-circle compras-redondo acessos-telas-mais');
      voltar.type = 'button';
      voltar.title = 'Voltar às telas';
      voltar.setAttribute('aria-label', 'Voltar às telas');
      voltar.innerHTML = U.svg('<path d="M15 5 8 12l7 7"/>');
      voltar.onclick = () => { estado.focar = 'esp:' + estado.foco; estado.modo = 'telas'; desenhar(); };
      li.append(voltar, el('b', null, 'Voltar às telas'));
      e.append(li);
      linha.append(e);
      colunas().forEach((b, i) => {
        const w = blocoEl(b, 'acessos-tl-bloco-cab');
        const c = cabecaFixa(b);
        resumos.push([regs[i], c.querySelector('.acessos-bloco-resumo')]);
        w.append(c);
        linha.append(w);
      });
      cab.append(linha);
    } else {
      cab = el('div', 'acessos-cabecalho');
      TIPOS.forEach((t, ti) => {
        const bs = estado.blocos.filter((b) => b.tipo === t);
        const linha = el('div', 'acessos-tl acessos-quem-row');
        const e = el('div', 'acessos-tl-esq');
        const li = el('div', 'acessos-quem-linha');
        const mais = botaoMais('Abrir uma coluna de ' + ROTULO_GRUPO[t].toLocaleLowerCase('pt-BR'), false, () => { estado.blocos.push(novoBloco(t)); estado.blocos.sort((x, y) => TIPOS.indexOf(x.tipo) - TIPOS.indexOf(y.tipo)); desenhar(true); });
        const algumaAberta = bs.some((b) => !b.recolhida);
        const seta = el('button', 'acessos-gt-seta' + (algumaAberta ? ' aberta' : ''));
        seta.type = 'button';
        seta.disabled = !bs.length;
        seta.setAttribute('aria-expanded', String(algumaAberta));
        seta.title = (algumaAberta ? 'Ocultar' : 'Mostrar') + ' os nomes de ' + ROTULO_GRUPO[t].toLocaleLowerCase('pt-BR');
        seta.setAttribute('aria-label', seta.title);
        seta.innerHTML = U.svg('<path d="' + G.niveis + '"/>');
        seta.onclick = () => { bs.forEach((b) => { b.recolhida = algumaAberta; if (algumaAberta) b.quem = ''; }); desenhar(); };
        li.append(mais, el('b', null, ROTULO_GRUPO[t]), el('small', null, bs.length ? String(bs.length) : ''), seta);
        e.append(li);
        linha.append(e);
        estado.blocos.forEach((b) => {
          const w = blocoEl(b, 'acessos-tl-bloco-cab');
          if (b.recolhida) {
            if (ti === TIPOS.length - 1) w.append(nomeVertical(b));
          } else if (b.tipo === t) {
            const c = cabecaDaColuna(b);
            resumos.push([regs[estado.blocos.indexOf(b)], c.querySelector('.acessos-bloco-resumo')]);
            w.append(c);
          }
          linha.append(w);
        });
        if (ti === 0 && fimDoCabecalho) linha.append(fimDoCabecalho);
        cab.append(linha);
      });
    }
    mat.append(cab);

    if (estado.modo === 'acoes') desenharAcoes(mat, regs, atualizarResumos); else desenharTelas(mat, menu, regs, atualizarResumos);
    atualizarResumos();
    blocos.push(mat);
    tela.body.replaceChildren(...blocos);
    const trocou = modoDesenhado !== estado.modo;
    modoDesenhado = estado.modo;
    tela.body.scrollTop = trocou ? 0 : rolagem;
    mat.scrollTop = trocou ? 0 : topo;
    mat.scrollLeft = irAoFim === true ? mat.scrollWidth : trocou ? 0 : esq;
    // Depois de trocar de visão o DOM é refeito: o foco vai para o botão que leva de volta (ou para o "!" de onde se saiu).
    if (estado.focar) {
      const ponto = estado.focar === 'voltar' ? tela.body.querySelector('[aria-label="Voltar às telas"]') : tela.body.querySelector('[data-esp="' + estado.focar.slice(4) + '"]');
      estado.focar = '';
      if (ponto) ponto.focus();
    }
  }

  /** O cabeçalho (grupo ou seção de ações): fica preso à esquerda enquanto a matriz rola para o lado. */
  const prenderAEsquerda = (sec) => { sec.classList.add('acessos-telas-grupo'); };

  /** Visão "Telas": o menu inteiro; à esquerda o nome, e para cada coluna os sete interruptores mais o "!". */
  function desenharTelas(mat, menu, regs, atualizarResumos) {
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

      // Um botão por grupo: um toque abre o grupo inteiro (as seções e as telas); o toque seguinte recolhe.
      const rotuloNivel = (aberto ? 'Recolher ' : 'Expandir ') + g.n;
      const nivel = el('button', 'compras-redondo acessos-telas-nivel');
      nivel.type = 'button';
      nivel.dataset.grupo = g.n;
      nivel.title = rotuloNivel;
      nivel.setAttribute('aria-label', rotuloNivel);
      nivel.setAttribute('aria-expanded', String(aberto));
      nivel.innerHTML = U.svg('<path d="' + G.niveis + '"/>');
      nivel.onclick = () => {
        if (!aberto) { estado.abertos.add(g.n); g.secoes.forEach((s) => estado.secAbertas.add(g.n + '|' + s.n)); }
        else { estado.abertos.delete(g.n); g.secoes.forEach((s) => estado.secAbertas.delete(g.n + '|' + s.n)); }
        desenhar();
        const volta = tela.body.querySelector('[data-grupo="' + g.n + '"]');
        if (volta) volta.focus();
      };
      // A linha do grupo é a que recolhe e leva os sete ícones mais o "!", um conjunto por coluna, alinhados com os interruptores.
      const linhaGrupo = el('div', 'acessos-tl acessos-tl-grupo-lin');
      const esqGrupo = el('div', 'acessos-tl-esq acessos-tl-esq-grupo');
      esqGrupo.append(h, nivel);
      linhaGrupo.append(esqGrupo);
      gruposDaLinha(linhaGrupo, (b) => {
        const w = blocoEl(b);
        PERMS.forEach((p) => {
          if (p.id === 'esp') {
            const c = el('button', 'acessos-tl-cel acessos-tl-cab-ic acessos-tl-cab-btn');
            c.type = 'button';
            c.dataset.esp = String(b.id);
            c.setAttribute('aria-disabled', String(!b.alvo));
            c.title = b.alvo ? 'Abrir as ações especiais de ' + b.alvo.nome : 'Ações especiais: escolha antes para quem é a coluna';
            c.setAttribute('aria-label', c.title);
            c.onclick = () => { if (b.alvo) abrirAcoes(b); };
            c.append(iconePerm(p));
            w.append(c);
            return;
          }
          const c = el('span', 'acessos-tl-cel acessos-tl-cab-ic');
          c.title = p.nome;
          c.setAttribute('role', 'img');
          c.setAttribute('aria-label', p.nome);
          c.append(iconePerm(p));
          w.append(c);
        });
        return w;
      });
      cab.replaceWith(linhaGrupo);

      g.secoes.forEach((s) => {
        const telas = s.telas;
        if (!telas.length || !aberto) return;
        const chaveSec = g.n + '|' + s.n;
        const secAberta = estado.secAbertas.has(chaveSec);
        sec.append(cabecaSecao(g, s, telas.length, secAberta, chaveSec));
        if (secAberta) telas.forEach((t) => sec.append(linhaTela(g, s, t, regs, atualizarResumos)));
      });
      if (!aberto) sec.classList.add('recolhido');
      mat.append(sec);
    });
  }

  /** Cabeça de uma seção (Lançamentos, Relatórios…): o ícone do submenu, o nome e a contagem. Os ícones ficam na linha do grupo. */
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
    b.append(ic, el('span', null, s.n), el('small', null, String(qtd)), seta);
    b.onclick = () => {
      if (estado.secAbertas.has(chaveSec)) estado.secAbertas.delete(chaveSec); else estado.secAbertas.add(chaveSec);
      desenhar();
    };
    esq.append(b);
    linha.append(esq);
    gruposDaLinha(linha, (b) => blocoEl(b));
    return linha;
  }

  /** Um interruptor, ligado ao conjunto de permissões da coluna (o registro de quem foi escolhido). */
  function interruptor(rotulo, ligado, desligado, aoMudar) {
    // Marcação redonda com check (escolha do Rodrigo, 24/11/2026): vazia é só o contorno; ligada enche na cor da origem.
    const sw = el('button', 'acessos-marca');
    sw.type = 'button';
    sw.disabled = desligado;
    sw.setAttribute('role', 'checkbox');
    sw.setAttribute('aria-checked', String(ligado));
    sw.setAttribute('aria-label', rotulo);
    sw.innerHTML = U.svg('<path d="m5 12 4.5 4.5L19 7"/>');
    sw.onclick = () => { const liga = sw.getAttribute('aria-checked') !== 'true'; sw.setAttribute('aria-checked', String(liga)); aoMudar(liga); };
    return sw;
  }

  /** Uma linha de tela: à esquerda o ícone da origem e o nome; para cada coluna, os mesmos sete interruptores mais o "!". */
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
    const celulas = new Map();
    regs.forEach((reg, i) => {
      const w = blocoEl(colunas()[i]);
      PERMS.forEach((p) => {
        const cel = el('span', 'acessos-tl-cel');
        const ligada = Boolean(reg) && (reg.telas[t.chave] || new Set()).has(p.id);
        const quem = colunas()[i].alvo ? colunas()[i].alvo.nome : 'coluna sem escolha';
        const sw = interruptor(p.nome + ' — ' + t.rotulo + ' (' + quem + ')', ligada, !reg, (liga) => {
          const conj = reg.telas[t.chave] || (reg.telas[t.chave] = new Set());
          if (liga) conj.add(p.id); else conj.delete(p.id);
          reg.conhecidas.add(t.chave);
          if (liga && p.id === 'esp') { abrirAcoes(colunas()[i]); return; }
          if (regs.every((r) => !r || r.conhecidas.has(t.chave))) {
            linha.classList.remove('nova');
            const et = linha.querySelector('.acessos-tl-novo');
            if (et) et.remove();
          }
          atualizarResumos();
        });
        sw.title = p.nome;
        cel.append(sw);
        w.append(cel);
      });
      celulas.set(colunas()[i], w);
    });
    gruposDaLinha(linha, (b) => celulas.get(b));
    return linha;
  }

  /** Cada grupo de ações leva o ícone e a cor da origem a que pertence (a mesma do menu): Lançamentos é o lápis neutro (roxo). */
  function origemDoGrupo(nome) {
    const M = window.CicluzMenu;
    const marca = (i) => M.marcaOrigem(i);
    const lapis = '<svg viewBox="0 0 24 24" aria-hidden="true">' + (M.subIcone['Lançamentos'] || '') + '</svg>';
    const caixa = () => { try { return window.CicluzCaixa.icone(); } catch (e) { return marca(0); } };
    const mapa = {
      'Lançamentos': [M.cores[5], lapis],
      'Caixa': [M.cores[0], caixa()],
      'Transferências e lacres': [M.cores[1], marca(1)],
      'Compras e estoque': [M.cores[3], marca(3)],
      'Pessoas e DP': [M.cores[2], marca(2)],
      'Administração': [M.cores[6], marca(6)],
    };
    return mapa[nome] || [M.cores[6], marca(6)];
  }

  /**
   * Visão "Ações especiais" (aberta pelo "!" de uma coluna): as permissões que não são lançar, discriminar, editar, visualizar nem pagar.
   * Mesmo desenho das telas: o grupo é uma linha com o ícone quadrado da origem; cada ação é uma linha de 52 px (nome e descrição em uma
   * linha cada, "Sensível" em texto âmbar), com a marcação redonda por coluna. Valem para a ÁREA inteira, como hoje. "Administração" tem aviso.
   */
  function desenharAcoes(mat, regs, atualizarResumos) {
    ACOES.forEach((g) => {
      const [cor, glifo] = origemDoGrupo(g.n);
      const sec = U.secao('', undefined);
      prenderAEsquerda(sec);
      sec.style.setProperty('--origem', cor);
      sec.style.setProperty('--menu-accent', cor);
      sec.style.setProperty('--nivel-cor', cor);
      const linhaGrupo = el('div', 'acessos-tl acessos-tl-grupo-lin');
      const esqGrupo = el('div', 'acessos-tl-esq acessos-tl-esq-grupo');
      const h = el('h3');
      const marca = el('span', 'acessos-tl-marca');
      marca.innerHTML = glifo;
      const nomeG = el('span', 'acessos-tl-grupo-nome');
      nomeG.append(el('b', null, g.n));
      h.append(marca, nomeG, el('span', 'compras-conta', String(g.i.length)));
      esqGrupo.append(h);
      linhaGrupo.append(esqGrupo);
      regs.forEach((reg, i) => linhaGrupo.append(blocoEl(colunas()[i])));
      sec.querySelector('.compras-secao-cab').replaceWith(linhaGrupo);
      if (g.aviso) sec.append(U.nota(g.aviso));
      g.i.forEach(([chave, rotulo, desc, sensivel]) => {
        const linha = el('div', 'acessos-tl acessos-tl-tela');
        const esq = el('div', 'acessos-tl-esq acessos-tl-esq-acao');
        const nome = el('span', 'acessos-tl-nome acessos-tl-nome-acao');
        const txt = el('span', 'acessos-tl-acao-txt');
        const topo = el('b', null, rotulo);
        const sub = el('small');
        if (sensivel) { const s = el('span', 'compras-alerta-texto', 'Sensível'); s.title = 'Mexe em dinheiro já registrado, em dado do DP ou no acesso dos outros'; sub.append(s, ' · '); }
        sub.append(desc);
        sub.title = (sensivel ? 'Sensível: mexe em dinheiro já registrado, em dado do DP ou no acesso dos outros. ' : '') + desc;
        txt.append(topo, sub);
        nome.append(txt);
        esq.append(nome);
        linha.append(esq);
        regs.forEach((reg, i) => {
          const w = blocoEl(colunas()[i]);
          const cel = el('span', 'acessos-tl-cel');
          const quem = colunas()[i].alvo ? colunas()[i].alvo.nome : 'coluna sem escolha';
          cel.append(interruptor(rotulo + ' (' + quem + ')', Boolean(reg) && reg.acoes.has(chave), !reg, (liga) => {
            if (liga) reg.acoes.add(chave); else reg.acoes.delete(chave);
            atualizarResumos();
          }));
          w.append(cel);
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
