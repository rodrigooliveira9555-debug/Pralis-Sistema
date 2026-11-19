/*
 * Configurações → Permissões → Acesso por Tela (ESBOÇO, pedido do Washington, 19/11/2026). O menu inteiro aberto, uma
 * linha por tela. Em cada linha, só o ícone do NÍVEL de acesso daquela tela (se tiver) e o "+": tocar no "+" mostra as
 * opções. Nível: sem acesso, ver (antes ou depois de pagar), lançar, editar e pagar. Quem escolhe: o cargo (padrão) e,
 * por cima, o ajuste de uma pessoa. No topo, "Para quem é este acesso": o "+" de cada linha também só mostra a lista
 * quando é tocado. Ícones: os do Design System (lápis = editar, olho = ver, lápis com prancheta = lançar).
 * SEM backend: a lista de telas vem de telas-dados.js (exemplo tirado do menu), as pessoas e os cargos são de mentira e
 * nada é gravado nem muda o acesso de ninguém. Quando o modelo de dados for aprovado, o nível passa a valer na API.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const A = window.CicluzAcessos;
  const MENU = window.CicluzAcessosTelasDados;
  if (!U || !A || !MENU) return;
  const { el } = U;
  let tela = null;
  // niveis[chave da tela] = nível; base = o que o cargo dá; fechados = grupos recolhidos; aberta = tela com as opções
  // abertas; quem = linha do topo com a lista aberta (pessoa, cargo ou area).
  const estado = { pessoa: '', cargo: '', area: '', busca: '', base: {}, niveis: {}, fechados: new Set(), aberta: '', quem: '' };

  /* ---------- Os níveis ---------- */

  // Desenhos do Design System (aba Ícones): lápis (editar) e olho (ver) são os de "Biblioteca — ações da linha"; a
  // prancheta é a de Cadastros Geral, com um lápis pequeno dentro (lançar). O cadeado é o de Senhas.
  const G = {
    lancar: 'M8 4H6a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-2M9 3h6v3H9zM9 17l.7-2.6 5.6-5.6 1.9 1.9-5.6 5.6z',
    lapis: 'm4 20 4-.8L19 8l-3-3L5 16zM14.5 6.5l3 3',
    olho: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    cadeado: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4M12 15v2',
    mais: 'M12 5v14M5 12h14',
  };
  // g = desenho; mo = tem o $; xm = $ cortado (sem pagar); xg = desenho cortado (só o $); cheio = $ preenchido (depois de pagar).
  const NIVEL = {
    none: { nome: 'Sem acesso', g: 'cadeado' },
    vA: { nome: 'Somente Visualizar antes de Pagar', g: 'olho', mo: 1 },
    vD: { nome: 'Somente Visualizar depois de Pagar', g: 'olho', mo: 1, cheio: 1 },
    lp: { nome: 'Lançar e Pagar', g: 'lancar', mo: 1 },
    l: { nome: 'Somente Lançar', g: 'lancar', mo: 1, xm: 1 },
    pl: { nome: 'Somente Pagar', g: 'lancar', mo: 1, xg: 1, dica: 'Somente Pagar (no ícone de lançar)' },
    ep: { nome: 'Editar e Pagar', g: 'lapis', mo: 1 },
    e: { nome: 'Somente Editar', g: 'lapis', mo: 1, xm: 1 },
    pe: { nome: 'Somente Pagar', g: 'lapis', mo: 1, xg: 1, dica: 'Somente Pagar (no ícone de editar)' },
  };
  // A legenda e as opções de cada tela usam o mesmo texto (o do próprio nível).
  const LEGENDA = ['lp', 'l', 'pl', 'ep', 'e', 'pe', 'vA', 'vD'];
  // Níveis que cada tipo de seção aceita (l lançamento, r relatório, c cadastro, v só consulta).
  // Mesma ordem da legenda (lançar, editar, visualizar), com "Sem acesso" primeiro.
  const ACEITA = { l: ['none', 'lp', 'l', 'pl', 'ep', 'e', 'pe', 'vA', 'vD'], r: ['none', 'vA', 'vD'], c: ['none', 'l', 'e', 'vA'], v: ['none', 'vA'] };
  // Cadastro e consulta não têm pagamento: ali "visualizar" não leva o "antes de Pagar".
  const nomeDoNivel = (id, tipo) => (id === 'vA' && (tipo === 'c' || tipo === 'v') ? 'Somente Visualizar' : NIVEL[id].nome);
  const PODE_PAGAR = ['lp', 'pl', 'ep', 'pe'];

  // tipo: em cadastro e consulta não existe pagamento, então o ícone vai sem o $ (só o desenho).
  function iconeNivel(id, tipo) {
    const d = NIVEL[id];
    const semPagamento = tipo === 'c' || tipo === 'v';
    const s = el('span', 'acessos-nivel-ic' + (id === 'none' ? ' sem' : '') + (d.g === 'olho' ? ' olho' : '') + (d.xg && !semPagamento ? ' xg' : '') + (d.xm && !semPagamento ? ' xm' : ''));
    s.innerHTML = U.svg('<path d="' + G[d.g] + '"/>');
    if (d.mo && !semPagamento) s.append(el('span', 'acessos-nivel-mo' + (d.cheio ? ' cheio' : ''), '$'));
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

  /* ---------- Cargos e pessoas de exemplo ---------- */

  // Padrão de cada cargo de exemplo: só algumas telas, pela chave do menu. Os outros cargos sugeridos começam vazios.
  const CARGOS = {
    caixa: ['Caixa', { 'vz-lan-vnd-vendas': 'vD', 'caixa:abertura': 'l', 'caixa:turno': 'l', 'caixa:fechamento': 'l', 'vz-rel-vnd-vendas': 'vA' }],
    tesouraria: ['Tesouraria', { 'caixa:tesouraria': 'lp', 'caixa:fechamentos': 'vD', 'caixa:gerencia': 'vA', 'ti-contas': 'vA', 'vz-lan-cnt-transfere-ncias': 'lp', 'vz-rel-cnt-transfere-ncias': 'vD' }],
    gerencia: ['Gerência', { 'vz-lan-vnd-vendas': 'vD', 'caixa:gerencia': 'ep', 'vz-rel-vnd-vendas': 'vD', 'caixa:fechamentos': 'vD', 'caixa:tesouraria': 'vA', 'vz-lan-des-despesas': 'lp', 'vz-rel-des-despesas': 'vD' }],
    compras: ['Compras', {}], dp: ['DP', {}], financeiro: ['Financeiro', {}], 'dir-op': ['Diretor de Operações', {}], 'dir-geral': ['Diretor Geral', {}],
  };
  const PESSOAS = { a: ['Colaborador exemplo A', 'caixa'], b: ['Colaborador exemplo B', 'tesouraria'], c: ['Colaborador exemplo C', 'gerencia'] };

  function carregar(cargo) {
    estado.cargo = cargo;
    estado.base = cargo ? { ...CARGOS[cargo][1] } : {};
    estado.niveis = { ...estado.base };
    estado.aberta = '';
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

  const nivelDe = (chave) => estado.niveis[chave] || 'none';
  const ajustada = (chave) => (estado.base[chave] || 'none') !== nivelDe(chave);

  /**
   * Uma linha de "Para quem é este acesso": o nome, o "+" e o que está escolhido (só o texto). A lista de opções não fica
   * à vista: aparece logo abaixo da linha quando o "+" é tocado, e some ao escolher.
   */
  function linhaQuem(id, rotulo, vazio, valorTexto, opcoes, aoEscolher) {
    const box = el('div', 'acessos-telas-quem-bloco');
    const aberto = estado.quem === id;
    const linha = el('div', 'acessos-telas-quem');
    linha.append(
      el('span', 'compras-rotulo', rotulo),
      botaoMais('Escolher: ' + rotulo.toLocaleLowerCase('pt-BR'), aberto, () => { estado.quem = aberto ? '' : id; desenhar(); }),
      el('span', 'acessos-telas-valor' + (valorTexto ? '' : ' vazio'), valorTexto || vazio),
    );
    box.append(linha);
    if (aberto) {
      const lista = el('div', 'acessos-telas-opcoes');
      lista.setAttribute('role', 'radiogroup');
      lista.setAttribute('aria-label', rotulo);
      opcoes.forEach(([valor, texto, marcado]) => {
        const b = el('button', 'acessos-telas-opcao' + (marcado ? ' marcado' : ''), texto);
        b.type = 'button';
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-checked', String(Boolean(marcado)));
        b.onclick = () => { estado.quem = ''; aoEscolher(valor); };
        lista.append(b);
      });
      box.append(lista);
    }
    return box;
  }

  function desenhar() {
    const rolagem = tela.body.scrollTop;
    const blocos = [];
    blocos.push(U.nota('Esboço com dados de exemplo: nada é gravado e nenhum acesso muda. A lista de telas é o menu do sistema; as pessoas e os cargos são de mentira.'));

    const quem = el('fieldset', 'compras-fieldset acessos-telas-quadro');
    quem.append(el('legend', null, 'Para quem é este acesso'));
    const pessoas = Object.entries(PESSOAS).map(([id, [n, c]]) => [id, n + ' (' + CARGOS[c][0] + ')', id === estado.pessoa]);
    const cargos = Object.entries(CARGOS).map(([id, [n]]) => [id, n, id === estado.cargo]);
    const areas = [['', 'Todas as áreas', !estado.area], ...MENU.map((g) => [g.n, g.n, g.n === estado.area])];
    quem.append(
      linhaQuem('pessoa', 'Usuário / colaborador', 'Selecionar o nome', estado.pessoa ? pessoas.find((p) => p[0] === estado.pessoa)[1] : '', [['', 'Nenhuma pessoa', !estado.pessoa], ...pessoas], (v) => { estado.pessoa = v; carregar(v ? PESSOAS[v][1] : ''); desenhar(); }),
      linhaQuem('cargo', 'Cargo', 'Selecionar o cargo', estado.cargo ? CARGOS[estado.cargo][0] : '', [['', 'Nenhum cargo', !estado.cargo], ...cargos], (v) => { estado.pessoa = ''; carregar(v); desenhar(); }),
      linhaQuem('area', 'Área', 'Todas as áreas', estado.area, areas, (v) => { estado.area = v; desenhar(); }),
    );
    const qual = estado.pessoa ? 'Ajustes só para ' + PESSOAS[estado.pessoa][0] + ', por cima do cargo ' + CARGOS[estado.cargo][0] + '.' : estado.cargo ? 'Editando o padrão do cargo ' + CARGOS[estado.cargo][0] + ': vale para todo mundo que tem esse cargo.' : 'Escolha uma pessoa ou um cargo (toque no +) para ver os níveis.';
    quem.append(el('p', 'profiles-note acessos-telas-qual', qual));
    blocos.push(quem);

    const leg = U.secao('Níveis de acesso (o ícone de cada tela)');
    const grade = el('div', 'acessos-telas-legenda');
    LEGENDA.forEach((id) => { const i = el('div', 'acessos-telas-leg-item'); i.append(iconeNivel(id), el('span', null, NIVEL[id].nome)); if (NIVEL[id].dica) i.title = NIVEL[id].dica; grade.append(i); });
    const corpo = el('div', 'compras-corpo'); corpo.append(grade);
    leg.append(corpo);
    blocos.push(leg);

    const barra = el('div', 'acessos-barra');
    const busca = U.buscaFixa('acessos-telas', 'Buscar tela', estado.busca, (v) => { estado.busca = v; desenhar(); });
    barra.append(busca,
      U.botao('Expandir tudo', () => { estado.fechados.clear(); desenhar(); }),
      U.botao('Recolher tudo', () => { MENU.forEach((g) => estado.fechados.add(g.n)); desenhar(); }));
    // Com a Área filtrada só aparece um grupo: o botão deixa isso claro e volta ao menu inteiro.
    if (estado.area) barra.append(U.botao('Mostrar todas as áreas', () => { estado.area = ''; desenhar(); }));
    const resumo = el('p', 'profiles-note acessos-telas-resumo');
    barra.append(resumo);
    blocos.push(barra);

    const termo = U.dobrar(estado.busca);
    let com = 0; let pagam = 0; let mostradas = 0;
    MENU.forEach((g) => {
      if (estado.area && g.n !== estado.area) return;
      const aberto = !estado.fechados.has(g.n) || Boolean(termo);
      const sec = U.secao(g.n, undefined);
      sec.classList.add('acessos-telas-grupo');
      sec.style.setProperty('--origem', g.c);
      const cab = sec.querySelector('.compras-secao-cab');
      const seta = U.botao('', () => { if (estado.fechados.has(g.n)) estado.fechados.delete(g.n); else estado.fechados.add(g.n); desenhar(); }, 'acessos-telas-seta');
      seta.innerHTML = U.svg('<path d="' + (aberto ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6') + '"/>');
      seta.setAttribute('aria-expanded', String(aberto));
      seta.setAttribute('aria-label', (aberto ? 'Recolher ' : 'Expandir ') + g.n);
      cab.append(seta);
      let totalGrupo = 0;
      g.s.forEach((s) => {
        const telas = s.i.filter(([, rotulo]) => !termo || U.dobrar(rotulo + ' ' + s.n + ' ' + g.n).includes(termo));
        telas.forEach(([chave]) => { const n = nivelDe(chave); totalGrupo++; if (n !== 'none') com++; if (PODE_PAGAR.includes(n)) pagam++; });
        if (!aberto || !telas.length) return;
        mostradas += telas.length;
        const titulo = el('div', 'acessos-telas-sec'); titulo.append(el('span', null, s.n), el('small', null, String(telas.length)));
        const lista = el('div', 'compras-lista');
        telas.forEach(([chave, rotulo]) => lista.append(...linha(g, s, chave, rotulo)));
        sec.append(titulo, lista);
      });
      sec.querySelector('.compras-secao-cab h3').append(el('span', 'compras-conta', String(totalGrupo)));
      if (!aberto) sec.classList.add('recolhido');
      if (!aberto && termo) return;
      blocos.push(sec);
    });
    if (termo && !mostradas) blocos.push(U.vazio('Nenhuma tela encontrada', 'Tente outro nome.'));
    resumo.textContent = com + (com === 1 ? ' tela com acesso' : ' telas com acesso') + ' · ' + pagam + (pagam === 1 ? ' pode pagar' : ' podem pagar');
    tela.body.replaceChildren(...blocos);
    tela.body.scrollTop = rolagem;
  }

  /**
   * Uma linha de tela: ícone da origem, nome, o nível atual (só o ícone e o nome, sem caixa; nada quando é "Sem acesso")
   * e o "+". As opções abrem logo abaixo da linha.
   */
  function linha(g, s, chave, rotulo) {
    const nivel = nivelDe(chave);
    const sigla = /^([A-Z]{3}) - /.exec(rotulo);
    const icone = { cor: g.c, html: sigla ? '<span class="sigla-text">' + sigla[1] + '</span>' : U.svg(U.ICONES.lista) };
    const aberta = estado.aberta === chave;
    const direita = [];
    if (nivel !== 'none') {
      const atual = el('span', 'acessos-telas-atual' + (ajustada(chave) ? ' ajustado' : ''));
      atual.dataset.chave = chave;
      atual.style.setProperty('--nivel-cor', g.c);
      atual.title = nomeDoNivel(nivel, s.t) + (ajustada(chave) ? ' (ajuste só desta pessoa)' : '');
      atual.append(iconeNivel(nivel, s.t), el('span', 'acessos-telas-atual-nome', nomeDoNivel(nivel, s.t)));
      if (ajustada(chave)) atual.append(el('span', 'acessos-nivel-ponto'));
      direita.push(atual);
    }
    const mais = botaoMais('Escolher o nível de acesso de ' + rotulo + ' (agora: ' + nomeDoNivel(nivel, s.t) + ')', aberta, () => { estado.aberta = aberta ? '' : chave; desenhar(); });
    mais.dataset.mais = chave;
    mais.style.setProperty('--nivel-cor', g.c);
    direita.push(mais);
    const l = U.linhaLista({ icones: [icone], titulo: rotulo, direita });
    const saida = [l];
    if (aberta) {
      const opcoes = el('div', 'acessos-nivel-escolha');
      opcoes.setAttribute('role', 'radiogroup');
      opcoes.setAttribute('aria-label', 'Nível de acesso de ' + rotulo);
      opcoes.style.setProperty('--nivel-cor', g.c);
      ACEITA[s.t].forEach((id) => {
        const b = el('button', 'acessos-nivel-opcao' + (id === nivel ? ' marcado' : ''));
        b.type = 'button';
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-checked', String(id === nivel));
        b.append(iconeNivel(id, s.t), el('span', null, nomeDoNivel(id, s.t)));
        // Os dois "Somente Pagar" têm o mesmo texto: a dica diz de qual ícone é cada um.
        if (NIVEL[id].dica) { b.title = NIVEL[id].dica; b.setAttribute('aria-label', NIVEL[id].dica); }
        b.onclick = () => {
          if (id === 'none') delete estado.niveis[chave]; else estado.niveis[chave] = id;
          estado.aberta = '';
          desenhar();
          const volta = tela.body.querySelector('[data-mais="' + chave + '"]');
          if (volta) volta.focus();
        };
        opcoes.append(b);
      });
      saida.push(opcoes);
    }
    return saida;
  }

  A.registrar('telas', abrir);
})();
