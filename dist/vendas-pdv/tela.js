/*
 * Vendas dos PDVs (CREARE) — a tela, em Entradas › API. De cima para baixo, pouca coisa por vez:
 *   1. Abas dos PDVs (Todos · TNP-PC-CXPDV-1 a 4) e o botão Sincronizar, com a hora da última leitura.
 *   2. Filtros (filtros.js): período com data no calendário e hora; o resto em "Mais filtros".
 *   3. Resumo: total vendido, ticket médio e canceladas.
 *   4. Por PDV (só em Todos) e Por tipo de pagamento.
 *   5. Vendas: a tabela.
 * Sincronizar lê de novo do Sistema Pralis na hora; sozinha, a tela lê a cada minuto enquanto está à vista. Dados em dados.js.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const D = window.CicluzVendasPdvDados;
  const FILTROS = window.CicluzVendasPdvFiltros;
  const { el, botao } = U;
  const { estado, moeda, numero } = D;
  const COR = '#eab308';
  const COR_TEXTO = '#785600';
  const INTERVALO_AO_VIVO = 60_000;
  U.ICONES.vendasPdv = '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>';
  const ICONE_SINCRONIZAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4"/></svg>';

  let tela = null;
  let partes = null;
  let relogio = null;

  const corpo = (...nos) => { const c = el('div', 'compras-corpo'); c.append(...nos); return c; };

  /* ---------- Topo: abas dos PDVs e Sincronizar ---------- */

  function topo() {
    const barra = el('div', 'vendas-pdv-topo');
    const abas = el('div', 'vendas-pdv-abas');
    abas.setAttribute('role', 'tablist');
    abas.setAttribute('aria-label', 'PDV');
    const lista = [{ id: '', rotulo: 'Todos', nome: 'Todos os PDVs' }, ...D.abasPdv()];
    lista.forEach((a) => {
      const marcada = estado.filtro.pdvId === a.id;
      const b = el('button', 'vendas-pdv-aba' + (marcada ? ' ativa' : ''), a.rotulo);
      b.type = 'button';
      b.title = a.nome;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(marcada));
      b.tabIndex = marcada ? 0 : -1;
      b.onclick = () => escolherPdv(a.id);
      abas.append(b);
    });
    // Setas trocam de aba (padrão de abas acessível).
    abas.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const bs = [...abas.children];
      const i = bs.indexOf(document.activeElement);
      const prox = bs[(i + (e.key === 'ArrowRight' ? 1 : -1) + bs.length) % bs.length];
      prox.click();
      requestAnimationFrame(() => { const nova = document.querySelector('#vendas-pdv-view .vendas-pdv-aba.ativa'); if (nova) nova.focus(); });
    });
    const lado = el('div', 'vendas-pdv-sincronia');
    const quando = el('span', 'vendas-pdv-vivo-texto');
    quando.setAttribute('aria-live', 'polite');
    const sinc = el('button', 'btn vendas-pdv-sincronizar');
    sinc.type = 'button';
    sinc.innerHTML = ICONE_SINCRONIZAR + '<span>Sincronizar</span>';
    sinc.title = 'Ler agora as vendas do Sistema Pralis';
    sinc.onclick = () => consultar();
    lado.append(quando, sinc);
    barra.append(abas, lado);
    return { barra, quando, sinc };
  }

  function pintarSincronia() {
    if (!partes) return;
    const { quando, sinc } = partes.topo;
    quando.textContent = estado.carregando ? 'Sincronizando…' : estado.atualizadoEm ? 'Atualizado às ' + D.hora(estado.atualizadoEm.toISOString()) : '';
    sinc.disabled = estado.carregando;
    sinc.classList.toggle('girando', estado.carregando);
  }

  function escolherPdv(id) {
    if (estado.filtro.pdvId === id) return;
    estado.filtro.pdvId = id;
    estado.pagina = 1;
    montar();
  }

  /* ---------- Resultados ---------- */

  function numeroGrande(rotulo, valor, detalhe, tom) {
    const n = el('div', 'vendas-pdv-numero' + (tom ? ' tom-' + tom : ''));
    n.append(el('span', 'vendas-pdv-numero-rotulo', rotulo), el('strong', null, valor));
    if (detalhe) n.append(el('small', null, detalhe));
    return n;
  }

  function resumo() {
    const s = U.secao('Resumo');
    const t = estado.totais || { totalGeral: 0, quantidade: 0 };
    const grade = el('div', 'vendas-pdv-numeros');
    grade.append(
      numeroGrande('Total vendido', moeda(t.totalGeral), numero(t.quantidade) + (t.quantidade === 1 ? ' venda' : ' vendas')),
      numeroGrande('Ticket médio', moeda(t.quantidade ? t.totalGeral / t.quantidade : 0)),
    );
    if (estado.canceladas) {
      const c = estado.canceladas;
      grade.append(numeroGrande('Canceladas', numero(c.quantidade), c.quantidade ? moeda(c.totalGeral) + ' dentro do total' : '', c.quantidade ? 'negativo' : ''));
    }
    s.append(corpo(grade));
    if (estado.filtro.formaPagamentoId) s.append(corpo(U.nota('Com um tipo de pagamento escolhido, o total é só a parte paga nele (como no Sistema Pralis).')));
    return s;
  }

  /** Barras: nome, valor, a parte do total e "N vendas". Tocar filtra (de novo, solta). */
  function barras(linhas, { total, marcado, aoTocar, vazio }) {
    if (!linhas.length) return U.vazio(vazio);
    const lista = el('ul', 'vendas-pdv-barras');
    linhas.forEach((l) => {
      const parte = total > 0 ? Math.max(0, Math.min(100, (l.total / total) * 100)) : 0;
      const b = el('button', 'vendas-pdv-barra' + (marcado === l.id ? ' marcada' : ''));
      b.type = 'button';
      b.disabled = !l.id;
      b.setAttribute('aria-pressed', String(marcado === l.id));
      const cima = el('span', 'vendas-pdv-barra-topo');
      cima.append(el('b', null, l.nome), el('span', 'vendas-pdv-barra-valor', moeda(l.total)));
      const trilho = el('span', 'vendas-pdv-trilho');
      const cheio = el('span', 'vendas-pdv-cheio');
      cheio.style.setProperty('--parte', (parte / 100).toFixed(4));
      trilho.append(cheio);
      b.append(cima, trilho, el('span', 'vendas-pdv-barra-rodape', numero(l.quantidade) + (l.quantidade === 1 ? ' venda' : ' vendas') + ' · ' + parte.toFixed(1).replace('.', ',') + '%'));
      if (l.id) b.onclick = () => aoTocar(l.id);
      const item = el('li');
      item.append(b);
      lista.append(item);
    });
    return lista;
  }

  function porPdv() {
    const rotulos = new Map(D.abasPdv().map((a) => [a.id, a.rotulo]));
    const linhas = estado.porPdv.filter((x) => x.totais.quantidade > 0)
      .map((x) => ({ id: x.pdv.id, nome: rotulos.get(x.pdv.id) || x.pdv.nome, total: x.totais.totalGeral, quantidade: x.totais.quantidade }))
      .sort((a, b) => b.total - a.total);
    const s = U.secao('Por PDV');
    s.append(corpo(barras(linhas, { total: estado.totais ? estado.totais.totalGeral : 0, aoTocar: escolherPdv, vazio: 'Nenhum PDV vendeu neste filtro.' })));
    return s;
  }

  function porTipo() {
    const f = estado.filtro;
    const linhas = (estado.totais ? estado.totais.porFormaPagamento : [])
      .map((x) => ({ id: x.formaPagamentoId, nome: x.formaPagamento, total: x.total, quantidade: x.quantidade }))
      .sort((a, b) => b.total - a.total);
    const s = U.secao('Por tipo de pagamento');
    s.append(corpo(barras(linhas, {
      total: linhas.reduce((t, l) => t + l.total, 0), marcado: f.formaPagamentoId,
      aoTocar: (id) => { f.formaPagamentoId = f.formaPagamentoId === id ? '' : id; estado.pagina = 1; montar(); },
      vazio: 'Nenhum pagamento neste filtro.',
    })));
    return s;
  }

  function vendas() {
    const v = estado.vendas;
    const f = estado.filtro;
    const ordem = botao(estado.ordem === 'desc' ? 'Mais recentes primeiro' : 'Mais antigas primeiro', () => { estado.ordem = estado.ordem === 'desc' ? 'asc' : 'desc'; estado.pagina = 1; consultar(); }, 'compras-chip');
    ordem.title = 'Trocar a ordem';
    const s = U.secao('Vendas', v.total, ordem);
    const umDia = f.dataInicio === f.dataFim;
    const rotulos = new Map(D.abasPdv().map((a) => [a.id, a.rotulo]));
    // Situação e, ao lado, o botão Detalhes (abre o popup da venda). É o único jeito de abrir o detalhe.
    const situacao = (x) => {
      const [t, tom] = D.ROTULO_STATUS[x.status] || [x.status, 'neutro'];
      const c = el('span', 'vendas-pdv-situacao');
      const b = botao('Detalhes', () => detalhe(x), 'btn secondary vendas-pdv-detalhes');
      b.setAttribute('aria-label', 'Detalhes da venda das ' + D.hora(x.dataVenda));
      c.append(U.situacao(t, tom), b);
      return c;
    };
    const colunas = [
      ['Hora', (x) => (umDia ? '' : D.dataCurta(x.dataReferencia) + ' ') + D.hora(x.dataVenda), 'caixa-num vendas-pdv-hora'],
      ...(f.pdvId ? [] : [['PDV', (x) => rotulos.get(x.pdvId) || x.pdvNome || '—']]),
      ['Operador', (x) => x.colaboradorNome || '—'],
      ['Pagamento', (x) => (x.pagamentos.length ? x.pagamentos.map(D.nomePagamento).join(' + ') : '—')],
      ['Valor', (x) => moeda(x.valorLiquido), 'caixa-num'],
      ['Situação', situacao],
    ];
    s.append(U.tabela(colunas, v.itens, { vazioTexto: 'Nenhuma venda neste filtro.' }));
    const paginas = Math.max(1, Math.ceil(v.total / estado.porPagina));
    if (v.total > estado.porPagina) {
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

  /** Popup da venda: o essencial em cima (valor, situação, PDV, operador e hora) e embaixo os itens, o pagamento e os valores. */
  function detalhe(x) {
    const rotulos = new Map(D.abasPdv().map((a) => [a.id, a.rotulo]));
    const [st, tom] = D.ROTULO_STATUS[x.status] || [x.status, 'neutro'];
    const bloco = (titulo, ...nos) => { const b = el('section', 'vendas-pdv-detalhe-bloco'); b.append(el('h3', null, titulo), ...nos); return b; };
    const linhas = (pares) => {
      const dl = el('dl', 'vendas-pdv-detalhe-linhas');
      pares.forEach(([t, v, forte]) => { const d = el('div', forte ? 'forte' : null); d.append(el('dt', null, t), el('dd', null, v)); dl.append(d); });
      return dl;
    };
    window.CicluzVendasPdvPopup.abrir({
      titulo: 'Detalhes da venda',
      subtitulo: D.dataCurta(x.dataReferencia) + ' às ' + D.hora(x.dataVenda),
      cor: COR, corTexto: COR_TEXTO,
      montar(form) {
        const topo = el('div', 'vendas-pdv-detalhe-topo');
        const valor = el('div');
        valor.append(el('span', 'vendas-pdv-numero-rotulo', 'Total'), el('strong', null, moeda(x.valorLiquido)));
        topo.append(valor, U.situacao(st, tom));
        const quem = el('p', 'vendas-pdv-detalhe-quem', [rotulos.get(x.pdvId) || x.pdvNome || 'PDV não informado', x.colaboradorNome].filter(Boolean).join(' · '));
        const itens = x.itensVenda.length
          ? linhas(x.itensVenda.map((i) => [numero(i.quantidade) + ' × ' + i.descricaoProduto, moeda(i.valorTotal)]))
          : U.nota('A venda veio sem itens.');
        const pagos = x.pagamentos.length ? linhas(x.pagamentos.map((p) => [D.nomePagamento(p), moeda(p.totalPago)])) : U.nota('Sem pagamento informado.');
        const valores = [['Subtotal', moeda(x.valorOriginal)]];
        if (Number(x.valorDesconto)) valores.push(['Desconto', '− ' + moeda(x.valorDesconto)]);
        if (Number(x.valorAcrescimo)) valores.push(['Acréscimo', moeda(x.valorAcrescimo)]);
        valores.push(['Total', moeda(x.valorLiquido), true]);
        form.append(topo, quem, bloco('Itens', itens), bloco('Pagamento', pagos), bloco('Valores', linhas(valores)));
        if (x.status === 'cancelado') form.append(bloco('Cancelamento', U.nota([x.cancelamentoMotivo, x.cancelamentoJustificativa].filter(Boolean).join(' · ') || 'Sem motivo informado.')));
      },
    });
  }

  function desenharResultados() {
    if (!partes) return;
    pintarSincronia();
    const lado = el('div', 'vendas-pdv-lado' + (estado.filtro.pdvId ? ' so-um' : ''));
    if (!estado.filtro.pdvId) lado.append(porPdv());
    lado.append(porTipo());
    const erro = estado.erro ? [corpo(el('p', 'profiles-error', estado.erro), botao('Tentar de novo', () => consultar(), 'btn secondary'))] : [];
    partes.erro.replaceChildren(...erro);
    partes.resultados.replaceChildren(resumo(), lado, vendas());
    partes.resultados.setAttribute('aria-busy', String(estado.carregando));
  }

  async function consultar() {
    if (estado.carregando) return;
    const pedido = D.consultar(); // marca "carregando" antes do primeiro await
    if (estado.atualizadoEm) pintarSincronia(); else desenharResultados();
    await pedido;
    desenharResultados();
  }

  function programar() {
    clearInterval(relogio);
    relogio = setInterval(() => {
      const aVista = tela && tela.view.classList.contains('show') && document.visibilityState === 'visible';
      if (!aVista) { clearInterval(relogio); relogio = null; return; }
      consultar();
    }, INTERVALO_AO_VIVO);
  }

  /** Monta topo + filtros + resultados (abrir, trocar de aba, limpar filtros) e consulta. */
  function montar() {
    partes = { topo: topo(), erro: el('div'), resultados: el('div', 'vendas-pdv-resultados') };
    const filtros = FILTROS.montar({ aoMudar: (o) => (o && o.remontar ? montar() : consultar()), aoEscolherPdv: (id) => { estado.filtro.pdvId = ''; escolherPdv(id); } });
    tela.body.replaceChildren(partes.topo.barra, filtros, partes.erro, partes.resultados);
    consultar();
    programar();
  }

  /* ---------- Abrir ---------- */

  async function abrirRelatorio() {
    if (!tela) {
      tela = U.criarTela({
        id: 'vendas-pdv-view', titulo: 'VND - API Vendas Geral TNP / Sistema Criare', caminho: 'Entradas · Vendas / Faturamento / API / VND - API Vendas Geral TNP / Sistema Criare',
        icone: 'vendasPdv', voltar: () => openSection(sections[0][0], 'API', 'tree', COR), cor: COR, corTexto: COR_TEXTO, classe: 'vendas-pdv-view',
      });
    }
    tela.ativar();
    tela.body.replaceChildren(U.vazio('Carregando…'));
    try {
      if (estado.configurada === null) await D.situacao();
      if (!estado.configurada) {
        tela.body.replaceChildren(U.vazio('A leitura das vendas ainda não foi ligada', 'O S2 lê as vendas do Sistema Pralis, que recebe o robô do CREARE. Falta configurar a ligação entre os dois sistemas no servidor.'));
        return;
      }
      if (!estado.opcoes.pdvs.length) await D.carregarOpcoes();
    } catch (erro) {
      tela.body.replaceChildren(U.vazio('Não foi possível abrir as vendas', D.mensagemErro(erro)), botao('Tentar de novo', () => { estado.configurada = null; abrirRelatorio(); }, 'btn secondary'));
      return;
    }
    montar();
  }

  const CARDS = [['VND - API Vendas Geral TNP / Sistema Criare', 'Vendas do CREARE ao vivo, por PDV, horário e tipo de pagamento', 'vendas-pdv:relatorio']];
  window.CicluzVendasPdv = {
    cards: () => CARDS.map((c) => [...c]),
    abrir: (id) => { if (id === 'relatorio') abrirRelatorio(); },
  };
})();
