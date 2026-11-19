/*
 * Configurações → Permissões → Acesso por Tela (ESBOÇO, pedido do Washington, 19/11/2026). O menu inteiro aberto, uma
 * linha por tela, e em cada linha um ícone com o NÍVEL de acesso daquela tela: sem acesso, só ver (antes ou depois de
 * pagar), lançar, editar e pagar. Quem escolhe o nível: o cargo (padrão) e, por cima, o ajuste de uma pessoa.
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
  // niveis[chave da tela] = nível; base = o que o cargo dá; fechados = grupos recolhidos; aberta = tela com a escolha aberta.
  const estado = { pessoa: '', cargo: '', area: '', busca: '', base: {}, niveis: {}, fechados: new Set(), aberta: '' };

  /* ---------- Os níveis ---------- */

  // g = desenho (mais, lápis, olho, cadeado); mo = tem o $; xm = $ cortado (sem pagar); xg = desenho cortado (só o $);
  // cheio = $ preenchido (ver depois de pagar).
  const G = {
    mais: 'M12 5v14M5 12h14',
    lapis: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
    olho: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    cadeado: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4M12 15v2',
  };
  const NIVEL = {
    none: { nome: 'Sem acesso', g: 'cadeado' },
    vA: { nome: 'Visualizar antes de pagar', g: 'olho', mo: 1 },
    vD: { nome: 'Visualizar depois de pagar', g: 'olho', mo: 1, cheio: 1 },
    lp: { nome: 'Lançar e pagar', g: 'mais', mo: 1 },
    l: { nome: 'Só lançar', g: 'mais', mo: 1, xm: 1 },
    pl: { nome: 'Só pagar (ícone de lançar cortado)', g: 'mais', mo: 1, xg: 1 },
    ep: { nome: 'Editar e pagar', g: 'lapis', mo: 1 },
    e: { nome: 'Só editar', g: 'lapis', mo: 1, xm: 1 },
    pe: { nome: 'Só pagar (ícone de editar cortado)', g: 'lapis', mo: 1, xg: 1 },
  };
  const LEGENDA = [['lp', 'Pode lançar e pagar'], ['l', 'Pode lançar'], ['pl', 'Pode pagar'], ['ep', 'Pode editar e pagar'], ['e', 'Pode editar'], ['pe', 'Pode pagar'], ['vA', 'Pode visualizar antes de pagar'], ['vD', 'Pode visualizar depois de pagar']];
  // Níveis que cada tipo de seção aceita (l lançamento, r relatório, c cadastro, v só consulta).
  const ACEITA = { l: ['none', 'vA', 'vD', 'lp', 'l', 'pl', 'ep', 'e', 'pe'], r: ['none', 'vA', 'vD'], c: ['none', 'vA', 'l', 'e'], v: ['none', 'vA'] };
  const nomeDoNivel = (id, tipo) => {
    if (id === 'vA' && tipo !== 'l') return 'Visualizar';
    if (id === 'vD' && tipo === 'r') return 'Visualizar (já pago)';
    return NIVEL[id].nome;
  };
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

  function seletorComMais(id, rotulo, vazio, opcoes, valor, aoMudar) {
    const linha = el('div', 'acessos-telas-quem');
    const l = el('label', 'compras-rotulo', rotulo); l.htmlFor = id;
    const mais = U.botao('', () => { sel.focus(); if (sel.showPicker) { try { sel.showPicker(); } catch (e) { /* já aberto */ } } }, 'acessos-telas-mais');
    mais.innerHTML = U.svg('<path d="' + G.mais + '"/>');
    mais.setAttribute('aria-label', 'Escolher: ' + rotulo.toLocaleLowerCase('pt-BR'));
    const sel = U.seletor(opcoes, valor, vazio);
    sel.id = id;
    sel.onchange = () => aoMudar(sel.value);
    linha.append(l, mais, sel);
    return linha;
  }

  function desenhar() {
    const rolagem = tela.body.scrollTop;
    const blocos = [];
    blocos.push(U.nota('Esboço com dados de exemplo: nada é gravado e nenhum acesso muda. A lista de telas é o menu do sistema; as pessoas e os cargos são de mentira.'));

    const quem = el('fieldset', 'compras-fieldset acessos-telas-quadro');
    quem.append(el('legend', null, 'Para quem é este acesso'));
    quem.append(
      seletorComMais('acessos-telas-pessoa', 'Usuário / colaborador', 'Selecionar o nome', Object.entries(PESSOAS).map(([id, [n, c]]) => [id, n + ' (' + CARGOS[c][0] + ')']), estado.pessoa, (v) => { estado.pessoa = v; carregar(v ? PESSOAS[v][1] : ''); desenhar(); }),
      seletorComMais('acessos-telas-cargo', 'Cargo', 'Selecionar o cargo', Object.entries(CARGOS).map(([id, [n]]) => [id, n]), estado.cargo, (v) => { estado.pessoa = ''; carregar(v); desenhar(); }),
      seletorComMais('acessos-telas-area', 'Área', 'Todas as áreas', MENU.map((g) => [g.n, g.n]), estado.area, (v) => { estado.area = v; desenhar(); }),
    );
    const qual = estado.pessoa ? 'Ajustes só para ' + PESSOAS[estado.pessoa][0] + ', por cima do cargo ' + CARGOS[estado.cargo][0] + '.' : estado.cargo ? 'Editando o padrão do cargo ' + CARGOS[estado.cargo][0] + ': vale para todo mundo que tem esse cargo.' : 'Escolha uma pessoa ou um cargo para ver os níveis.';
    quem.append(el('p', 'profiles-note acessos-telas-qual', qual));
    blocos.push(quem);

    const leg = U.secao('Níveis de acesso (o ícone de cada tela)');
    const grade = el('div', 'acessos-telas-legenda');
    LEGENDA.forEach(([id, texto]) => { const i = el('div', 'acessos-telas-leg-item'); i.append(iconeNivel(id), el('span', null, texto)); grade.append(i); });
    const corpo = el('div', 'compras-corpo'); corpo.append(grade);
    leg.append(corpo);
    blocos.push(leg);

    const barra = el('div', 'acessos-barra');
    const busca = U.buscaFixa('acessos-telas', 'Buscar tela', estado.busca, (v) => { estado.busca = v; desenhar(); });
    barra.append(busca,
      U.botao('Expandir tudo', () => { estado.fechados.clear(); desenhar(); }),
      U.botao('Recolher tudo', () => { MENU.forEach((g) => estado.fechados.add(g.n)); desenhar(); }));
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

  /** Uma linha de tela: ícone da origem, nome e o botão do nível. Com a escolha aberta, vem logo abaixo da linha. */
  function linha(g, s, chave, rotulo) {
    const nivel = nivelDe(chave);
    const sigla = /^([A-Z]{3}) - /.exec(rotulo);
    const icone = { cor: g.c, html: sigla ? '<span class="sigla-text">' + sigla[1] + '</span>' : U.svg(U.ICONES.lista) };
    const botao = el('button', 'acessos-nivel' + (ajustada(chave) ? ' ajustado' : ''));
    botao.type = 'button';
    botao.dataset.chave = chave;
    botao.setAttribute('aria-expanded', String(estado.aberta === chave));
    botao.setAttribute('aria-label', 'Nível de acesso de ' + rotulo + ': ' + nomeDoNivel(nivel, s.t));
    botao.append(iconeNivel(nivel, s.t), el('span', 'acessos-nivel-nome', nomeDoNivel(nivel, s.t)));
    if (ajustada(chave)) { const p = el('span', 'acessos-nivel-ponto'); p.title = 'Ajuste só desta pessoa (diferente do cargo)'; botao.append(p); }
    botao.append(el('span', 'acessos-nivel-seta'));
    botao.querySelector('.acessos-nivel-seta').innerHTML = U.svg('<path d="m6 9 6 6 6-6"/>');
    botao.onclick = () => { estado.aberta = estado.aberta === chave ? '' : chave; desenhar(); };
    const l = U.linhaLista({ icones: [icone], titulo: rotulo, direita: [botao] });
    const saida = [l];
    if (estado.aberta === chave) {
      const opcoes = el('div', 'acessos-nivel-escolha');
      opcoes.setAttribute('role', 'radiogroup');
      opcoes.setAttribute('aria-label', 'Nível de acesso de ' + rotulo);
      ACEITA[s.t].forEach((id) => {
        const b = el('button', 'acessos-nivel-opcao' + (id === nivel ? ' marcado' : ''));
        b.type = 'button';
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-checked', String(id === nivel));
        b.append(iconeNivel(id, s.t), el('span', null, nomeDoNivel(id, s.t)));
        b.onclick = () => { if (id === 'none') delete estado.niveis[chave]; else estado.niveis[chave] = id; estado.aberta = ''; desenhar(); const volta = tela.body.querySelector('[data-chave="' + chave + '"]'); if (volta) volta.focus(); };
        opcoes.append(b);
      });
      saida.push(opcoes);
    }
    return saida;
  }

  A.registrar('telas', abrir);
})();
