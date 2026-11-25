/*
 * Sistema comandas (CREARE) — a tela, em Entradas › API, só do administrador. De cima para baixo:
 *   1. Abas Abertas · Fechadas · Status 4 (com contador) e, à direita, a hora do último retrato do robô e Sincronizar.
 *      Retrato com mais de 5 minutos vira aviso: o robô da loja pode estar parado.
 *   2. Indicadores: abertas agora, abandonadas, valor em aberto, esquecidas e o tempo médio aberta → paga do dia.
 *   3. Filtros: dia (só em Fechadas), situação, funcionário e nº da comanda.
 *   4. A lista: abertas das mais antigas para as mais novas; fechadas das mais recentes. Cada linha tem a régua de
 *      tempo (o quanto do limite da situação já passou) e o botão Detalhes, que abre o popup (detalhe.js).
 * Sozinha, a tela lê a cada minuto enquanto está à vista. Dados em dados.js.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const D = window.CicluzComandasDados;
  const { el, botao, campo, seletor, entrada } = U;
  const { estado, SITUACAO, SITUACOES_DA_ABA, moeda, numero, quando, duracao } = D;
  const COR = '#eab308';
  const COR_TEXTO = '#785600';
  const INTERVALO_AO_VIVO = 60_000;
  const RETRATO_VELHO_MS = 5 * 60_000;
  U.ICONES.comandasCreare = '<path d="M7 3h10l1 18-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>';
  const ICONE_SINCRONIZAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4"/></svg>';
  const ABAS = [['abertas', 'Abertas'], ['fechadas', 'Fechadas'], ['status4', 'Status 4']];

  let tela = null;
  let partes = null;
  let relogio = null;
  // Linhas e réguas só animam ao abrir ou trocar de aba; a leitura de cada minuto troca os dados sem piscar.
  let animar = false;

  const corpo = (...nos) => { const c = el('div', 'compras-corpo'); c.append(...nos); return c; };

  /* ---------- Topo ---------- */

  function topo() {
    const barra = el('div', 'vendas-pdv-topo');
    const abas = el('div', 'vendas-pdv-abas');
    abas.setAttribute('role', 'tablist');
    abas.setAttribute('aria-label', 'Comandas');
    ABAS.forEach(([id, rotulo]) => {
      const marcada = estado.aba === id;
      const b = el('button', 'vendas-pdv-aba' + (marcada ? ' ativa' : ''));
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(marcada));
      b.setAttribute('aria-controls', 'comandas-painel');
      b.id = 'comandas-aba-' + id;
      b.tabIndex = marcada ? 0 : -1;
      const contador = el('span', 'comandas-aba-contador');
      contador.dataset.aba = id;
      b.append(el('span', null, rotulo), contador);
      b.onclick = () => escolherAba(id);
      abas.append(b);
    });
    abas.addEventListener('keydown', (e) => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const i = ABAS.findIndex(([id]) => id === estado.aba);
      const j = e.key === 'Home' ? 0 : e.key === 'End' ? ABAS.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + ABAS.length) % ABAS.length;
      const prox = ABAS[j][0];
      escolherAba(prox);
      requestAnimationFrame(() => { const nova = document.querySelector('#comandas-creare-view .vendas-pdv-aba.ativa'); if (nova) nova.focus(); });
    });
    const lado = el('div', 'vendas-pdv-sincronia');
    // Sem aria-live: a hora muda a cada minuto e o leitor de tela repetiria. Quem fala é o aviso de retrato velho.
    const quandoEl = el('span', 'vendas-pdv-vivo-texto');
    const sinc = el('button', 'btn vendas-pdv-sincronizar');
    sinc.type = 'button';
    sinc.innerHTML = ICONE_SINCRONIZAR + '<span>Sincronizar</span>';
    sinc.title = 'Ler agora as comandas do Sistema Pralis';
    sinc.onclick = () => consultar();
    lado.append(quandoEl, sinc);
    barra.append(abas, lado);
    const aviso = el('p', 'comandas-aviso-retrato');
    aviso.setAttribute('role', 'status');
    aviso.hidden = true;
    return { barra, quando: quandoEl, sinc, aviso };
  }

  function pintarSincronia() {
    if (!partes) return;
    const { quando: q, sinc, aviso } = partes.topo;
    const retrato = estado.indicadores && estado.indicadores.retratoEm;
    // Contadores das abas atualizados no lugar: redesenhar as abas tiraria o foco de quem navega pelo teclado.
    partes.topo.barra.querySelectorAll('.comandas-aba-contador').forEach((n) => {
      const valor = estado.contagem[n.dataset.aba];
      n.textContent = valor === null || valor === undefined ? '' : numero(valor);
      n.hidden = valor === null || valor === undefined;
    });
    q.textContent = estado.carregando ? 'Sincronizando…' : retrato ? 'Retrato do CREARE às ' + D.hora(retrato) : estado.atualizadoEm ? 'Lido às ' + D.hora(estado.atualizadoEm.toISOString()) : '';
    sinc.disabled = estado.carregando;
    sinc.classList.toggle('girando', estado.carregando);
    const velho = estado.indicadores && (!retrato || Date.now() - Date.parse(retrato) > RETRATO_VELHO_MS);
    aviso.hidden = !velho;
    const texto = !velho ? '' : retrato
      ? 'O último retrato do CREARE é de ' + quando(retrato) + '. O robô da loja pode estar parado: os números abaixo podem estar atrasados.'
      : 'O robô da loja ainda não mandou nenhuma comanda. Assim que ele rodar com a versão nova, elas aparecem aqui.';
    if (aviso.textContent !== texto) aviso.textContent = texto; // reescrever igual faria o leitor de tela repetir
  }

  function escolherAba(id) {
    if (estado.aba === id) return;
    estado.aba = id;
    estado.filtro.situacao = '';
    estado.pagina = 1;
    montar();
  }

  /* ---------- Indicadores ---------- */

  function placa(rotulo, valor, detalhe, tom) {
    const n = el('div', 'vendas-pdv-numero' + (tom ? ' tom-' + tom : ''));
    n.append(el('span', 'vendas-pdv-numero-rotulo', rotulo), el('strong', null, valor));
    if (detalhe) n.append(el('small', null, detalhe));
    return n;
  }

  function indicadores() {
    const i = estado.indicadores;
    const s = U.secao('Agora');
    if (!i) { s.append(corpo(U.nota('Lendo os indicadores…'))); return s; }
    const grade = el('div', 'vendas-pdv-numeros comandas-numeros');
    const dia = i.dia === D.hojeIso() ? 'hoje' : 'em ' + D.dataCurta(i.dia);
    grade.append(
      placa('Abertas agora', numero(i.abertasAgora), i.puxadasAgora ? numero(i.puxadasAgora) + ' puxada(s) no caixa' + (i.contas ? ' · ' + numero(i.contas) + ' conta(s)' : '') : (i.contas ? numero(i.contas) + ' conta(s)' : 'Nenhuma no caixa')),
      placa('Abandonadas', numero(i.abandonadas), 'Puxadas no caixa há mais de 1 h', i.abandonadas ? 'alerta' : ''),
      placa('Valor em aberto', moeda(i.valorEmAbertoCentavos), 'Somando as abertas e as puxadas'),
      placa('Esquecidas', numero(i.esquecidas), 'Status 4 ou sem lançamento há 24 h', i.esquecidas ? 'atencao' : ''),
      placa('Tempo médio aberta', duracao(i.tempoMedioAbertaSegundos),
        numero(i.fechadasNoDia) + ' paga(s) ' + dia + (i.tempoMedioPuxadaPagaSegundos !== null ? ' · caixa: ' + duracao(i.tempoMedioPuxadaPagaSegundos) : '')),
    );
    s.append(corpo(grade));
    if (estado.aba === 'fechadas' && i.diferentesDaVendaNoDia) {
      s.append(corpo(U.nota(numero(i.diferentesDaVendaNoDia) + ' comanda(s) paga(s) ' + dia + ' com valor diferente da venda no caixa (item somado ou desconto). Veja em Detalhes.')));
    }
    return s;
  }

  /* ---------- Filtros ---------- */

  function filtros() {
    const f = estado.filtro;
    const s = U.secao('Filtros');
    const grade = el('div', 'vendas-pdv-campos comandas-filtros');
    const aplicar = () => { estado.pagina = 1; consultar(); };
    if (estado.aba === 'fechadas') {
      const dia = U.campoData({ valor: f.dia, rotulo: 'Dia' });
      dia.input.addEventListener('change', () => { const v = dia.valor(); if (v && v !== f.dia) { f.dia = v; aplicar(); } });
      grade.append(campo('Dia', dia.caixa));
      s.append(dia.painel);
    }
    const opcoesSituacao = SITUACOES_DA_ABA[estado.aba];
    if (opcoesSituacao.length) {
      const sel = seletor(opcoesSituacao.map((id) => [id, SITUACAO[id][0]]), f.situacao, 'Todas');
      sel.onchange = () => { f.situacao = sel.value; aplicar(); };
      grade.append(campo('Situação', sel));
    }
    const func = seletor(estado.opcoes.funcionarios.map((x) => [x.codigo, x.nome]), f.funcionario, estado.opcoes.funcionarios.length ? 'Todos' : 'Ninguém lançou ainda');
    func.disabled = !estado.opcoes.funcionarios.length;
    func.onchange = () => { f.funcionario = func.value; aplicar(); };
    const num = entrada('text', f.numero, { inputMode: 'numeric', placeholder: 'Ex.: 430', maxLength: 7, autocomplete: 'off' });
    let espera = null;
    num.oninput = () => {
      num.value = num.value.replace(/\D/g, '');
      clearTimeout(espera);
      espera = setTimeout(() => { if (num.value !== f.numero) { f.numero = num.value; aplicar(); } }, 450);
    };
    grade.append(campo('Funcionário', func), campo('Nº da comanda', num));
    const limpar = botao('Limpar filtros', () => { D.reiniciarFiltro(); montar(); }, 'btn ghost');
    const acoes = el('div', 'vendas-pdv-acoes');
    acoes.append(limpar);
    s.append(corpo(grade, acoes));
    return s;
  }

  /* ---------- Lista ---------- */

  function regua(c) {
    const r = D.regua(c);
    const box = el('div', 'comandas-regua-celula');
    box.append(el('span', 'comandas-regua-texto', r.texto));
    const trilho = el('span', 'comandas-regua tom-' + r.tom);
    trilho.setAttribute('aria-hidden', 'true');
    const cheio = el('span', 'comandas-regua-cheio');
    cheio.style.setProperty('--parte', r.parte.toFixed(4));
    trilho.append(cheio);
    box.append(trilho);
    return box;
  }

  function situacaoCelula(c) {
    // Selo do tamanho do botão Detalhes, numa linha só, com um ponto da cor da situação (o texto diz a situação).
    const [rotulo, tom, explica] = SITUACAO[c.situacao] || [c.situacao, 'neutro', ''];
    const selo = U.situacao(rotulo, tom);
    selo.classList.add('comandas-selo');
    if (explica) selo.title = explica;
    return selo;
  }

  function botaoDetalhes(c) {
    const b = botao('Detalhes', () => abrirDetalhe(c), 'btn secondary vendas-pdv-detalhes comandas-detalhes');
    b.setAttribute('aria-label', 'Detalhes da comanda ' + c.numero);
    return b;
  }

  // O botão não é desativado: o popup guarda quem abriu e devolve o foco a ele. Clique duplo é barrado pela marca.
  let abrindo = false;
  async function abrirDetalhe(c) {
    if (abrindo) return;
    abrindo = true;
    try {
      window.CicluzComandasDetalhe.abrir(await D.detalhe(c.idComanda), { cor: COR, corTexto: COR_TEXTO });
    } catch (erro) {
      U.avisar(D.mensagemErro(erro));
    } finally {
      abrindo = false;
    }
  }

  const comanda = (c) => {
    const box = el('span', 'comandas-numero');
    box.append(el('b', null, String(c.numero)));
    if (c.mesa) box.append(el('small', null, 'mesa ' + c.mesa));
    if (c.nomeCliente) box.append(el('small', null, c.nomeCliente));
    return box;
  };
  const valor = (c) => {
    if (c.diferencaVendaCentavos) {
      const box = el('span', 'comandas-valor-duplo');
      box.append(el('span', null, moeda(c.valorTotalCentavos)), el('small', 'comandas-diferenca', 'venda ' + moeda(c.valorVendaCentavos)));
      return box;
    }
    return moeda(c.valorTotalCentavos);
  };
  const itens = (c) => numero(c.itensValidos) + (c.itensCancelados ? ' (+' + numero(c.itensCancelados) + ' canc.)' : '');

  function colunas() {
    if (estado.aba === 'fechadas') {
      return [
        ['Comanda', comanda, 'comandas-c-numero'],
        ['Situação', situacaoCelula, 'comandas-c-situacao'],
        ['Abriu', (c) => quando(c.abertaEm), 'comandas-hora'],
        ['Fechou', (c) => quando(c.fechadaEm), 'comandas-hora'],
        ['Ficou aberta', regua, 'comandas-c-regua'],
        ['Itens', itens, 'comandas-num'],
        ['Valor', valor, 'comandas-num'],
        ['Lançou', (c) => c.lancadoPor || '—'],
      ];
    }
    return [
      ['Comanda', comanda, 'comandas-c-numero'],
      ['Situação', situacaoCelula, 'comandas-c-situacao'],
      ['Abriu', (c) => quando(c.abertaEm), 'comandas-hora'],
      ['Tempo aberta', regua, 'comandas-c-regua'],
      ['Itens', itens, 'comandas-num'],
      ['Valor', valor, 'comandas-num'],
      ['Lançou', (c) => c.lancadoPor || '—'],
      ['Último item', (c) => quando(c.ultimoLancamentoEm), 'comandas-hora'],
    ];
  }

  // Destaque da linha: abandonada (vermelho) e mais de 1 dia aberta (âmbar; a "conta" fica fora, R-248). O texto da
  // situação também diz.
  const classeLinha = (c) => (c.situacao === 'abandonada' ? 'comandas-linha alerta' : (c.segundosAberta || 0) > 86400 && estado.aba !== 'fechadas' && c.situacao !== 'conta' ? 'comandas-linha velha' : 'comandas-linha');

  /**
   * Linhas em grade (não <table>): colunas na tela larga e cartão empilhado abaixo de 1024 px, sem rolar de lado.
   * Cada campo leva o rótulo (escondido na tela larga, onde o cabeçalho mostra; sempre lido pelo leitor de tela).
   */
  function linhas(cols, itens, vazio) {
    if (!itens.length) return corpo(U.vazio(vazio));
    const box = el('div', 'comandas-lista aba-' + estado.aba + (animar ? ' animar' : ''));
    const cab = el('div', 'comandas-cab');
    cab.setAttribute('aria-hidden', 'true');
    cols.forEach(([titulo, , classe]) => cab.append(el('span', classe || null, titulo)));
    cab.append(el('span'));
    const ul = el('ul', 'comandas-linhas');
    ul.setAttribute('aria-label', 'Comandas');
    itens.forEach((c) => {
      const li = el('li', classeLinha(c));
      cols.forEach(([titulo, valorDe, classe]) => {
        const cel = el('div', 'comandas-cel' + (classe ? ' ' + classe : ''));
        const v = valorDe(c);
        cel.append(el('span', 'comandas-rotulo', titulo + ': '), typeof v === 'string' ? el('span', null, v) : v);
        li.append(cel);
      });
      li.append(botaoDetalhes(c));
      ul.append(li);
    });
    box.append(cab, ul);
    return box;
  }

  function lista() {
    const v = estado.lista;
    const titulos = { abertas: 'Comandas em aberto', fechadas: 'Comandas fechadas', status4: 'Status 4 — antigas, nunca fechadas' };
    const s = U.secao(titulos[estado.aba], v.total);
    if (estado.aba === 'status4') s.append(corpo(U.nota('O CREARE nunca fechou estas comandas e não diz o que o status 4 significa. Ficam separadas para conferência.')));
    const vazios = { abertas: 'Nenhuma comanda em aberto agora.', fechadas: 'Nenhuma comanda fechada neste dia.', status4: 'Nenhuma comanda em status 4.' };
    s.append(linhas(colunas(), v.itens, vazios[estado.aba]));
    if (v.total > estado.porPagina) {
      const paginas = Math.ceil(v.total / estado.porPagina);
      const inicio = (estado.pagina - 1) * estado.porPagina + 1;
      const fim = Math.min(v.total, estado.pagina * estado.porPagina);
      const ant = botao('‹ Anterior', () => { estado.pagina -= 1; consultar(); }, 'btn secondary');
      const prox = botao('Próxima ›', () => { estado.pagina += 1; consultar(); }, 'btn secondary');
      ant.disabled = estado.pagina <= 1; prox.disabled = estado.pagina >= paginas;
      const pag = el('div', 'vendas-pdv-paginacao');
      pag.append(ant, el('span', null, numero(inicio) + '–' + numero(fim) + ' de ' + numero(v.total)), prox);
      s.append(pag);
    }
    return s;
  }

  /* ---------- Desenho e leitura ---------- */

  function desenharResultados() {
    if (!partes) return;
    pintarSincronia();
    const erroTexto = el('p', 'profiles-error', estado.erro);
    erroTexto.setAttribute('role', 'alert');
    partes.erro.replaceChildren(...(estado.erro ? [corpo(erroTexto, botao('Tentar de novo', () => consultar(), 'btn secondary'))] : []));
    partes.indicadores.replaceChildren(indicadores());
    partes.resultados.replaceChildren(lista());
    if (estado.lista.itens.length) animar = false;
    partes.resultados.setAttribute('aria-busy', String(estado.carregando));
  }

  // Uma leitura por vez. Pedido no meio de outra (trocou aba, filtro ou página) fica pendente e roda logo depois:
  // a resposta velha nunca pinta a lista de outra aba.
  let pendente = false;
  async function consultar() {
    if (estado.carregando) { pendente = true; return; }
    pendente = false;
    const pedido = D.consultar();
    pintarSincronia();
    if (partes) partes.resultados.setAttribute('aria-busy', 'true');
    await pedido;
    if (pendente) { consultar(); return; }
    desenharResultados();
  }

  const aVista = () => tela && tela.view.classList.contains('show') && document.visibilityState === 'visible';
  function programar() {
    clearInterval(relogio);
    relogio = setInterval(() => {
      if (!aVista()) { clearInterval(relogio); relogio = null; return; }
      // Com o detalhe aberto a lista não é redesenhada: o foco volta ao botão Detalhes certo ao fechar.
      if (document.querySelector('.vendas-pdv-popup-fundo')) return;
      consultar();
    }, INTERVALO_AO_VIVO);
  }
  // Voltou para a aba do navegador com a tela aberta: lê na hora e religa o relógio.
  document.addEventListener('visibilitychange', () => {
    if (!relogio && partes && aVista()) { consultar(); programar(); }
  });

  function montar() {
    animar = true;
    partes = { topo: topo(), erro: el('div'), indicadores: el('div'), resultados: el('div', 'vendas-pdv-resultados comandas-resultados') };
    partes.resultados.id = 'comandas-painel';
    partes.resultados.setAttribute('role', 'tabpanel');
    partes.resultados.setAttribute('aria-labelledby', 'comandas-aba-' + estado.aba);
    tela.body.replaceChildren(partes.topo.barra, partes.topo.aviso, partes.erro, partes.indicadores, filtros(), partes.resultados);
    consultar();
    programar();
  }

  async function abrirPainel() {
    if (!tela) {
      tela = U.criarTela({
        id: 'comandas-creare-view', titulo: 'VND - Vendas / Sistema comandas', caminho: 'Entradas · Vendas / Faturamento / API / VND - Vendas / Sistema comandas',
        icone: 'comandasCreare', voltar: () => openSection(sections[0][0], 'API', 'tree', COR), cor: COR, corTexto: COR_TEXTO, classe: 'vendas-pdv-view comandas-creare-view',
      });
    }
    tela.ativar();
    tela.body.replaceChildren(U.vazio('Carregando…'));
    try {
      if (estado.configurada === null) await D.situacao();
      if (!estado.configurada) {
        tela.body.replaceChildren(U.vazio('A leitura das comandas ainda não foi ligada', 'O S2 lê as comandas do Sistema Pralis, que recebe o robô do CREARE. Falta configurar a ligação entre os dois sistemas no servidor.'));
        return;
      }
      await D.carregarOpcoes();
    } catch (erro) {
      tela.body.replaceChildren(U.vazio('Não foi possível abrir as comandas', D.mensagemErro(erro)), botao('Tentar de novo', () => { estado.configurada = null; abrirPainel(); }, 'btn secondary'));
      return;
    }
    montar();
  }

  const CARDS = [['VND - Vendas / Sistema comandas', 'Comandas do CREARE ao vivo: abertas, puxadas no caixa, abandonadas e pagas', 'comandas-creare:painel']];
  window.CicluzComandasCreare = {
    cards: () => CARDS.map((c) => [...c]),
    abrir: (id) => { if (id === 'painel') abrirPainel(); },
  };
})();
