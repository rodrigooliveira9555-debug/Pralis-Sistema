/*
 * Configurações → Permissões → Acesso por Tela (ESBOÇO, pedido do Washington, 19 e 23/11/2026).
 * O menu inteiro, uma linha por tela. Em cada linha, sete interruptores, um por permissão, só com o ícone (sem texto):
 *   ← Lançar · ← Discriminar · ← Editar · ← Visualizar · ↔ Pagar · → Editar · → Visualizar
 * A seta diz de que lado do pagamento a permissão está (← antes de pagar, → depois de pagar, ↔ o próprio pagar).
 * "Para quem": usuário/colaborador (os do DP), cargo (os de DES - Cargos C/Salários) ou área (as de DES - Área / Setor / Local).
 * Ao escolher um deles, todas as permissões já vêm ligadas; quem decide é desligar o que não vale.
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
  // alvo = quem está sendo editado ({tipo, id, nome}); abertos = grupos abertos; secAbertas = seções abertas ('grupo|seção');
  // quem = linha do topo com a lista aberta. registros guarda (só na memória) o que cada pessoa, cargo ou área tem ligado.
  const estado = { aba: 'telas', alvo: null, busca: '', abertos: new Set(), secAbertas: new Set(), quem: '' };
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
  function registro(menu) {
    if (!estado.alvo) return null;
    const k = estado.alvo.tipo + ':' + estado.alvo.id;
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
   * Uma linha de "Para quem é este acesso": o nome, o "+" e o que está escolhido (só o texto). A lista de opções não fica à vista:
   * aparece logo abaixo da linha quando o "+" é tocado (com busca quando é longa) e some ao escolher.
   */
  function linhaQuem([id, rotulo, vazio, ler, semItens]) {
    const box = el('div', 'acessos-telas-quem-bloco');
    const aberto = estado.quem === id;
    const ativo = estado.alvo && estado.alvo.tipo === id;
    const linha = el('div', 'acessos-telas-quem');
    linha.append(
      el('span', 'compras-rotulo', rotulo),
      botaoMais('Escolher: ' + rotulo.toLocaleLowerCase('pt-BR'), aberto, () => { estado.quem = aberto ? '' : id; desenhar(); }),
      el('span', 'acessos-telas-valor' + (ativo ? '' : ' vazio'), ativo ? estado.alvo.nome : vazio),
    );
    box.append(linha);
    if (!aberto) return box;
    const itens = ler();
    const lista = el('div', 'acessos-telas-opcoes');
    lista.setAttribute('role', 'radiogroup');
    lista.setAttribute('aria-label', rotulo);
    const opcoes = [];
    if (ativo) opcoes.push({ id: '', nome: 'Limpar a escolha', detalhe: '' });
    opcoes.push(...itens);
    const botoes = opcoes.map((o) => {
      const marcado = ativo && estado.alvo.id === o.id;
      const b = el('button', 'acessos-telas-opcao' + (marcado ? ' marcado' : ''));
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(marcado));
      b.append(el('span', null, o.nome));
      if (o.detalhe) b.append(el('small', null, o.detalhe));
      b.dataset.busca = U.dobrar(o.nome + ' ' + (o.detalhe || ''));
      b.onclick = () => {
        estado.quem = '';
        estado.alvo = o.id ? { tipo: id, id: o.id, nome: o.nome } : null;
        desenhar();
      };
      return b;
    });
    if (!itens.length) lista.append(el('p', 'profiles-note acessos-telas-vazio', semItens));
    if (itens.length > 8) {
      const campo = U.entrada('search', '', { placeholder: 'Buscar' });
      campo.className = 'acessos-telas-busca-quem';
      campo.setAttribute('aria-label', 'Buscar em ' + rotulo.toLocaleLowerCase('pt-BR'));
      campo.oninput = () => { const t = U.dobrar(campo.value.trim()); botoes.forEach((b) => { b.hidden = Boolean(t) && !b.dataset.busca.includes(t); }); };
      box.append(campo);
    }
    lista.append(...botoes);
    box.append(lista);
    return box;
  }

  function desenhar() {
    const rolagem = tela.body.scrollTop;
    const menu = lerMenu();
    const reg = registro(menu);
    const blocos = [];
    blocos.push(U.nota('Esboço: nada é gravado e nenhum acesso muda. As telas são as do menu do sistema; colaboradores, cargos e áreas são os cadastrados no sistema.'));

    const quem = el('fieldset', 'compras-fieldset acessos-telas-quadro');
    quem.append(el('legend', null, 'Para quem é este acesso'));
    quem.append(...LINHAS.map(linhaQuem));
    const tipoTexto = { pessoa: 'esta pessoa', cargo: 'este cargo', area: 'esta área' };
    const qual = estado.alvo
      ? 'Acessos de ' + estado.alvo.nome + ' (' + (estado.alvo.tipo === 'pessoa' ? 'colaborador' : estado.alvo.tipo === 'cargo' ? 'cargo' : 'área') + '). Tudo já vem ligado: desligue o que ' + tipoTexto[estado.alvo.tipo] + ' não deve ter.'
      : 'Escolha um colaborador, um cargo ou uma área (toque no +) para ver e mudar os acessos.';
    quem.append(el('p', 'profiles-note acessos-telas-qual', qual));
    blocos.push(quem);

    const abas = U.chips([['telas', 'Telas'], ['acoes', 'Ações especiais']], estado.aba, (v) => { estado.aba = v; desenhar(); });
    abas.classList.add('compras-abas', 'acessos-telas-abas');
    abas.setAttribute('aria-label', 'O que mostrar');
    blocos.push(abas);
    if (estado.aba === 'acoes') desenharAcoes(blocos, reg); else desenharTelas(blocos, menu, reg);
    tela.body.replaceChildren(...blocos);
    tela.body.scrollTop = rolagem;
  }

  /** Aba "Telas": o menu inteiro, com os sete interruptores de cada tela. */
  function desenharTelas(blocos, menu, reg) {
    blocos.push(U.nota('Cada ícone é uma permissão. ← antes de pagar · ↔ pagar · → depois de pagar. Passe o mouse (ou segure o dedo) no ícone para ver o nome.'));
    const barra = el('div', 'acessos-barra');
    barra.append(U.buscaFixa('acessos-telas', 'Buscar tela', estado.busca, (v) => { estado.busca = v; desenhar(); }));
    const resumo = el('p', 'profiles-note acessos-telas-resumo');
    barra.append(resumo);
    blocos.push(barra);

    const atualizarResumo = () => {
      let com = 0; let novas = 0;
      menu.forEach((g) => g.secoes.forEach((s) => s.telas.forEach((t) => {
        if (reg && (reg.telas[t.chave] || new Set()).size) com++;
        if (reg && !reg.conhecidas.has(t.chave)) novas++;
      })));
      resumo.textContent = reg
        ? com + (com === 1 ? ' tela com acesso' : ' telas com acesso') + (novas ? ' · ' + novas + (novas === 1 ? ' tela nova, desligada' : ' telas novas, desligadas') : '')
        : 'Nenhum acesso aberto: escolha para quem.';
    };

    const termo = U.dobrar(estado.busca);
    let mostradas = 0;
    menu.forEach((g) => {
      const total = g.secoes.reduce((n, s) => n + s.telas.length, 0);
      const aberto = estado.abertos.has(g.n);
      const sec = U.secao('', undefined);
      sec.classList.add('acessos-telas-grupo');
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
      cab.append(nivel);

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
        if (secAberta) telas.forEach((t) => sec.append(linhaTela(g, s, t, reg, atualizarResumo)));
      });
      if (termo && !achouNoGrupo) return;
      if (!aberto && !termo) sec.classList.add('recolhido');
      blocos.push(sec);
    });
    if (termo && !mostradas) blocos.push(U.vazio('Nenhuma tela encontrada', 'Tente outro nome.'));
    atualizarResumo();
  }

  /** Cabeça de uma seção (Lançamentos, Relatórios…): o ícone do submenu, o nome, a contagem e, aberta, os sete ícones das colunas. */
  function cabecaSecao(g, s, qtd, aberta, chaveSec) {
    const linha = el('div', 'acessos-tl acessos-tl-sec');
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
    linha.append(b);
    if (aberta) {
      const ok = aceitas(s.t);
      PERMS.forEach((p) => {
        const c = el('span', 'acessos-tl-cel acessos-tl-cab-ic' + (ok.includes(p.id) ? '' : ' fora'));
        c.title = nomeDaPerm(p, s.t);
        c.setAttribute('role', 'img');
        c.setAttribute('aria-label', nomeDaPerm(p, s.t) + (ok.includes(p.id) ? '' : ' (não existe nesta seção)'));
        c.append(iconePerm(p));
        linha.append(c);
      });
    }
    return linha;
  }

  /** Uma linha de tela: o ícone da origem, o nome e os sete interruptores (vazio onde a permissão não existe naquele tipo de tela). */
  function linhaTela(g, s, t, reg, atualizarResumo) {
    const nova = Boolean(reg) && !reg.conhecidas.has(t.chave);
    const linha = el('div', 'acessos-tl acessos-tl-tela' + (nova ? ' nova' : ''));
    linha.dataset.chave = t.chave;
    const sigla = /^([A-Z]{3}) - /.exec(t.rotulo);
    const icone = el('span', 'compras-linha-icone');
    icone.style.setProperty('--menu-accent', g.c);
    icone.innerHTML = sigla ? '<span class="sigla-text">' + sigla[1] + '</span>' : U.svg(U.ICONES.lista);
    const nome = el('span', 'acessos-tl-nome');
    nome.append(el('span', 'compras-linha-icones'), el('b', null, t.rotulo));
    nome.firstChild.append(icone);
    if (nova) { const e = U.situacao('Novo · desligado', 'atencao'); e.classList.add('acessos-tl-novo'); nome.append(e); }
    linha.append(nome);
    const ok = aceitas(s.t);
    PERMS.forEach((p) => {
      const cel = el('span', 'acessos-tl-cel');
      if (!ok.includes(p.id)) { cel.classList.add('fora'); linha.append(cel); return; }
      const ligada = Boolean(reg) && (reg.telas[t.chave] || new Set()).has(p.id);
      const rotulo = nomeDaPerm(p, s.t) + ' — ' + t.rotulo;
      const sw = el('button', 'account-status-switch');
      sw.type = 'button';
      sw.disabled = !reg;
      sw.title = nomeDaPerm(p, s.t);
      sw.setAttribute('role', 'switch');
      sw.setAttribute('aria-checked', String(ligada));
      sw.setAttribute('aria-label', rotulo);
      sw.append(el('span'));
      sw.onclick = () => {
        const conj = reg.telas[t.chave] || (reg.telas[t.chave] = new Set());
        const liga = !conj.has(p.id);
        if (liga) conj.add(p.id); else conj.delete(p.id);
        reg.conhecidas.add(t.chave);
        sw.setAttribute('aria-checked', String(liga));
        linha.classList.remove('nova');
        const etiqueta = linha.querySelector('.acessos-tl-novo');
        if (etiqueta) etiqueta.remove();
        atualizarResumo();
      };
      cel.append(sw);
      linha.append(cel);
    });
    return linha;
  }

  /**
   * Aba "Ações especiais": as permissões que não são lançar, discriminar, editar, visualizar nem pagar. Um interruptor por ação, em
   * grupos por área (valem para a área inteira, como hoje). "Administração" fica separada, com aviso.
   */
  function desenharAcoes(blocos, reg) {
    const acoes = reg ? reg.acoes : new Set();
    let ligadas = 0;
    ACOES.forEach((g) => {
      const sec = U.secao(g.n, g.i.length);
      if (g.aviso) sec.append(U.nota(g.aviso));
      const lista = el('div', 'compras-lista');
      g.i.forEach(([chave, rotulo, desc, sensivel]) => {
        const ligada = acoes.has(chave);
        if (ligada) ligadas++;
        const chip = [];
        if (sensivel) { const s = U.situacao('Sensível', 'atencao'); s.title = 'Mexe em dinheiro já registrado, em dado do DP ou no acesso dos outros'; chip.push(s); }
        const chave2 = el('button', 'account-status-switch');
        chave2.type = 'button';
        chave2.disabled = !reg;
        chave2.dataset.acao = chave;
        chave2.setAttribute('role', 'switch');
        chave2.setAttribute('aria-checked', String(ligada));
        chave2.setAttribute('aria-label', rotulo);
        chave2.append(el('span'));
        chave2.onclick = () => {
          if (acoes.has(chave)) acoes.delete(chave); else acoes.add(chave);
          desenhar();
          const volta = tela.body.querySelector('[data-acao="' + chave + '"]');
          if (volta) volta.focus();
        };
        lista.append(U.linhaLista({ titulo: rotulo, detalhe: desc, direita: [...chip, chave2] }));
      });
      sec.append(lista);
      blocos.push(sec);
    });
    const total = ACOES.reduce((n, g) => n + g.i.length, 0);
    blocos.push(U.nota(reg
      ? ligadas + ' de ' + total + ' ações especiais liberadas. Valem para a área inteira (todas as telas de Lançamentos, por exemplo), como hoje. Começam desligadas.'
      : 'Escolha para quem é o acesso (toque no + lá em cima) para ligar as ações especiais.'));
  }

  A.registrar('telas', abrir);
})();
