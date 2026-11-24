/*
 * Vendas dos PDVs (CREARE) — a tela, em Entradas › API. Cinco quadros, sempre nesta ordem, para cada coisa ter
 * o seu lugar: Filtros · Resumo · Por PDV · Por tipo de pagamento · Vendas. O quadro de filtros é montado uma
 * vez (não perde o foco nem o painel de hora aberto); os quatro de resultado são redesenhados a cada consulta.
 * Ao vivo: refaz a consulta a cada minuto enquanto a tela está à vista. Dados em dados.js.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const D = window.CicluzVendasPdvDados;
  const { el, botao, campo, entrada, seletor } = U;
  const { estado, moeda, numero } = D;
  const COR = '#eab308';
  const COR_TEXTO = '#785600';
  const INTERVALO_AO_VIVO = 60_000;
  U.ICONES.vendasPdv = '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>';

  let tela = null;
  let quadros = null;
  let relogio = null;
  let aoVivo = true;

  const corpo = (...nos) => { const c = el('div', 'compras-corpo'); c.append(...nos); return c; };
  const grupoFiltro = (titulo, ...campos) => {
    const g = el('div', 'vendas-pdv-grupo');
    g.setAttribute('role', 'group');
    g.setAttribute('aria-label', titulo);
    const grade = el('div', 'vendas-pdv-campos');
    grade.append(...campos);
    g.append(el('span', 'vendas-pdv-grupo-titulo', titulo), grade);
    return g;
  };

  /* ---------- Filtros ---------- */

  function montarFiltros() {
    const f = estado.filtro;
    const s = U.secao('Filtros');
    const aplicar = () => { estado.pagina = 1; consultar(); };

    const de = entrada('date', f.dataInicio);
    const ate = entrada('date', f.dataFim);
    const hoje = D.hojeIso();
    const faixas = { hoje: [hoje, hoje], ontem: [D.somarDias(hoje, -1), D.somarDias(hoje, -1)], 7: [D.somarDias(hoje, -6), hoje], mes: [hoje.slice(0, 8) + '01', hoje] };
    const chipAtual = Object.keys(faixas).find((k) => faixas[k][0] === f.dataInicio && faixas[k][1] === f.dataFim) || '';
    const periodo = U.chips([['hoje', 'Hoje'], ['ontem', 'Ontem'], ['7', '7 dias'], ['mes', 'Este mês']], chipAtual, (v) => {
      const faixa = faixas[v];
      [f.dataInicio, f.dataFim] = faixa; de.value = faixa[0]; ate.value = faixa[1];
      aplicar();
    });
    const aoMudarData = () => { f.dataInicio = de.value; f.dataFim = ate.value; periodo.atualizar(''); if (f.dataInicio && f.dataFim) aplicar(); };
    de.onchange = aoMudarData; ate.onchange = aoMudarData;

    const horaDe = U.campoHora({ valor: f.horaInicio, rotulo: 'Hora inicial' });
    const horaAte = U.campoHora({ valor: f.horaFim, rotulo: 'Hora final' });
    const turno = seletor(estado.opcoes.turnos.filter((t) => t.ativo).map((t) => [t.id, t.nome + ' (' + t.horaInicio.slice(0, 5) + '–' + t.horaFim.slice(0, 5) + ')']), f.turnoId, 'Todos');
    const pdv = seletor(estado.opcoes.pdvs.map((p) => [p.id, p.nome + (p.ativo ? '' : ' (inativo)')]), f.pdvId, 'Todos');
    const grupos = D.gruposDeVendas();
    const grupo = seletor(grupos.map((g) => [g.id, g.nome + ' · ' + g.computador + ' · ' + g.inicio + '–' + g.fim]), f.grupoId, grupos.length ? 'Todos' : 'Sem grupos com computador');
    grupo.disabled = !grupos.length;
    const forma = seletor(estado.opcoes.formasPagamento.map((x) => [x.id, x.nome]), f.formaPagamentoId, 'Todas');
    const status = seletor([['aprovado', 'Aprovadas'], ['aguardando_aprovacao', 'Aguardando aprovação'], ['cancelado', 'Canceladas']], f.status, 'Todas');
    const produto = entrada('text', f.produto, { placeholder: 'Nome do produto' });
    const avisoGrupo = el('p', 'profiles-note vendas-pdv-aviso');
    avisoGrupo.hidden = true;

    const validaHora = (t) => !t || /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
    const aoMudarHora = () => {
      if (!validaHora(horaDe.input.value) || !validaHora(horaAte.input.value)) return;
      f.horaInicio = horaDe.input.value; f.horaFim = horaAte.input.value;
      if (f.grupoId) { f.grupoId = ''; grupo.value = ''; avisoGrupo.hidden = true; }
      aplicar();
    };
    horaDe.input.addEventListener('change', aoMudarHora);
    horaAte.input.addEventListener('change', aoMudarHora);
    turno.onchange = () => { f.turnoId = turno.value; aplicar(); };
    pdv.onchange = () => { f.pdvId = pdv.value; if (f.grupoId) { f.grupoId = ''; grupo.value = ''; avisoGrupo.hidden = true; } aplicar(); };
    // O grupo de vendas preenche PDV e horário à vista de quem usa (nada escondido): mexer neles depois solta o grupo.
    grupo.onchange = () => {
      const g = grupos.find((x) => x.id === grupo.value);
      f.grupoId = grupo.value;
      avisoGrupo.hidden = true;
      if (g) {
        f.horaInicio = g.inicio; f.horaFim = g.fim;
        horaDe.input.value = g.inicio; horaAte.input.value = g.fim;
        f.pdvId = g.pdv ? g.pdv.id : '';
        pdv.value = f.pdvId;
        if (!g.pdv) { avisoGrupo.textContent = 'O computador ' + g.computador + ' não existe no Sistema Pralis: o filtro usa só o horário do grupo.'; avisoGrupo.hidden = false; }
      }
      aplicar();
    };
    forma.onchange = () => { f.formaPagamentoId = forma.value; aplicar(); };
    status.onchange = () => { f.status = status.value; aplicar(); };
    let espera = null;
    produto.oninput = () => { clearTimeout(espera); espera = setTimeout(() => { f.produto = produto.value.trim(); aplicar(); }, 500); };

    const limpar = botao('Limpar filtros', () => { D.reiniciarFiltro(); abrirRelatorio(); }, 'btn secondary');
    const atualizar = botao('Atualizar', () => consultar(), 'btn');
    const acoes = el('div', 'vendas-pdv-acoes');
    acoes.append(limpar, atualizar);

    s.append(corpo(
      grupoFiltro('Período', periodo, campo('Data inicial', de), campo('Data final', ate)),
      grupoFiltro('Horário', campo('Hora inicial', horaDe.caixa), campo('Hora final', horaAte.caixa), campo('Turno', turno)),
      grupoFiltro('Origem da venda', campo('PDV', pdv), campo('Grupo de vendas', grupo)),
      avisoGrupo,
      grupoFiltro('Tipo de venda', campo('Forma de pagamento', forma), campo('Situação', status), campo('Produto', produto)),
      acoes,
    ), horaDe.painel, horaAte.painel);
    return s;
  }

  /* ---------- Resultados ---------- */

  function cabecalhoAoVivo() {
    const caixa = el('div', 'vendas-pdv-vivo');
    const texto = el('span', 'vendas-pdv-vivo-texto', estado.carregando ? 'Atualizando…' : estado.atualizadoEm ? 'Atualizado às ' + D.hora(estado.atualizadoEm.toISOString()) : '');
    texto.setAttribute('aria-live', 'polite');
    const chave = botao(aoVivo ? 'Ao vivo: ligado' : 'Ao vivo: desligado', () => { aoVivo = !aoVivo; programar(); desenharResultados(); }, 'compras-chip' + (aoVivo ? ' ativo' : ''));
    chave.setAttribute('aria-pressed', String(aoVivo));
    chave.title = 'Atualiza sozinho a cada minuto';
    caixa.append(texto, chave);
    return caixa;
  }

  function numeroGrande(rotulo, valor, detalhe, tom) {
    const n = el('div', 'vendas-pdv-numero' + (tom ? ' tom-' + tom : ''));
    n.append(el('span', 'vendas-pdv-numero-rotulo', rotulo), el('strong', null, valor));
    if (detalhe) n.append(el('small', null, detalhe));
    return n;
  }

  function resumo() {
    const s = U.secao('Resumo', undefined, cabecalhoAoVivo());
    const t = estado.totais || { totalGeral: 0, quantidade: 0 };
    const ticket = t.quantidade ? t.totalGeral / t.quantidade : 0;
    const grade = el('div', 'vendas-pdv-numeros');
    grade.append(
      numeroGrande('Total vendido', moeda(t.totalGeral), numero(t.quantidade) + (t.quantidade === 1 ? ' venda' : ' vendas')),
      numeroGrande('Ticket médio', moeda(ticket), 'Total ÷ quantidade de vendas'),
    );
    if (estado.canceladas) {
      const c = estado.canceladas;
      grade.append(numeroGrande('Canceladas', numero(c.quantidade), c.quantidade ? moeda(c.totalGeral) + ' já incluído no total' : 'Nenhuma no filtro', c.quantidade ? 'negativo' : ''));
    }
    s.append(corpo(grade));
    if (estado.filtro.formaPagamentoId) s.append(corpo(U.nota('Com forma de pagamento escolhida, o total é só a parte paga nessa forma (como no Sistema Pralis).')));
    return s;
  }

  /** Lista de barras (PDV ou tipo): cada linha mostra o nome, a quantidade, o valor e a parte do total. */
  function barras(linhas, { total, marcado, aoTocar, vazio }) {
    if (!linhas.length) return U.vazio(vazio);
    const lista = el('ul', 'vendas-pdv-barras');
    linhas.forEach((l) => {
      const parte = total > 0 ? Math.max(0, Math.min(100, (l.total / total) * 100)) : 0;
      const item = el('li');
      const b = el('button', 'vendas-pdv-barra' + (marcado === l.id ? ' marcada' : ''));
      b.type = 'button';
      b.disabled = !l.id || !aoTocar;
      b.setAttribute('aria-pressed', String(marcado === l.id));
      b.title = l.id && aoTocar ? (marcado === l.id ? 'Tocar para ver todos' : 'Tocar para filtrar por ' + l.nome) : '';
      const topo = el('span', 'vendas-pdv-barra-topo');
      topo.append(el('b', null, l.nome), el('span', 'vendas-pdv-barra-valor', moeda(l.total)));
      const trilho = el('span', 'vendas-pdv-trilho');
      const cheio = el('span', 'vendas-pdv-cheio');
      cheio.style.setProperty('--parte', (parte / 100).toFixed(4));
      trilho.append(cheio);
      const rodape = el('span', 'vendas-pdv-barra-rodape', numero(l.quantidade) + (l.quantidade === 1 ? ' venda' : ' vendas') + ' · ' + parte.toFixed(1).replace('.', ',') + '%');
      b.append(topo, trilho, rodape);
      if (l.id && aoTocar) b.onclick = () => aoTocar(l.id);
      item.append(b);
      lista.append(item);
    });
    return lista;
  }

  function porPdv() {
    const f = estado.filtro;
    const s = U.secao('Por PDV');
    if (f.pdvId) {
      const p = estado.opcoes.pdvs.find((x) => x.id === f.pdvId);
      s.append(corpo(U.nota('Mostrando só o PDV ' + (p ? p.nome : '') + '.'), botao('Ver todos os PDVs', () => { f.pdvId = ''; f.grupoId = ''; abrirRelatorio(); }, 'btn secondary')));
      return s;
    }
    const linhas = estado.porPdv.filter((x) => x.totais.quantidade > 0)
      .map((x) => ({ id: x.pdv.id, nome: x.pdv.nome, total: x.totais.totalGeral, quantidade: x.totais.quantidade }))
      .sort((a, b) => b.total - a.total);
    const total = estado.totais ? estado.totais.totalGeral : 0;
    s.append(corpo(barras(linhas, { total, aoTocar: (id) => { f.pdvId = id; f.grupoId = ''; abrirRelatorio(); }, vazio: 'Nenhum PDV vendeu neste filtro.' })));
    return s;
  }

  function porTipo() {
    const f = estado.filtro;
    const s = U.secao('Por tipo de pagamento');
    const formas = estado.totais ? estado.totais.porFormaPagamento : [];
    const linhas = formas.map((x) => ({ id: x.formaPagamentoId, nome: x.formaPagamento, total: x.total, quantidade: x.quantidade })).sort((a, b) => b.total - a.total);
    const total = linhas.reduce((t, l) => t + l.total, 0);
    s.append(corpo(barras(linhas, {
      total, marcado: f.formaPagamentoId,
      aoTocar: (id) => { f.formaPagamentoId = f.formaPagamentoId === id ? '' : id; abrirRelatorio(); },
      vazio: 'Nenhum pagamento neste filtro.',
    })));
    return s;
  }

  function vendas() {
    const v = estado.vendas;
    const ordem = botao(estado.ordem === 'desc' ? 'Mais recentes primeiro' : 'Mais antigas primeiro', () => { estado.ordem = estado.ordem === 'desc' ? 'asc' : 'desc'; estado.pagina = 1; consultar(); }, 'compras-chip');
    ordem.title = 'Trocar a ordem';
    const s = U.secao('Vendas', v.total, ordem);
    const pagamentos = (x) => (x.pagamentos.length ? x.pagamentos.map(D.nomePagamento).join(' + ') : '—');
    const itens = (x) => numero(x.itensVenda.reduce((t, i) => t + (Number(i.quantidade) || 0), 0));
    const situacao = (x) => { const [t, tom] = D.ROTULO_STATUS[x.status] || [x.status, 'neutro']; return U.situacao(t, tom); };
    s.append(U.tabela([
      ['Data', (x) => D.dataCurta(x.dataReferencia)],
      ['Hora', (x) => D.hora(x.dataVenda), 'caixa-num'],
      ['PDV', (x) => x.pdvNome || '—'],
      ['Operador', (x) => x.colaboradorNome || '—'],
      ['Pagamento', pagamentos],
      ['Itens', itens, 'caixa-num'],
      ['Valor', (x) => moeda(x.valorLiquido), 'caixa-num'],
      ['Situação', situacao],
    ], v.itens, { aoClicar: detalhe, vazioTexto: 'Nenhuma venda neste filtro.' }));
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

  function detalhe(x) {
    U.dialogo({
      titulo: 'Venda · ' + D.dataCurta(x.dataReferencia) + ' ' + D.hora(x.dataVenda),
      subtitulo: (x.pdvNome || 'PDV não informado') + (x.colaboradorNome ? ' · ' + x.colaboradorNome : ''),
      cor: COR, corTexto: COR_TEXTO, largo: true, quadro: 'Venda',
      montar(form) {
        form.append(U.tabela([
          ['Produto', (i) => i.descricaoProduto],
          ['Qtd.', (i) => numero(i.quantidade), 'caixa-num'],
          ['Unitário', (i) => moeda(i.valorUnitario), 'caixa-num'],
          ['Total', (i) => moeda(i.valorTotal), 'caixa-num'],
        ], x.itensVenda, { vazioTexto: 'A venda veio sem itens.' }));
        const dl = el('dl', 'caixa-declarado');
        const par = (t, v) => { const d = el('div'); d.append(el('dt', null, t), el('dd', null, v)); dl.append(d); };
        par('Subtotal', moeda(x.valorOriginal));
        par('Desconto', moeda(x.valorDesconto));
        par('Acréscimo', moeda(x.valorAcrescimo));
        par('Total', moeda(x.valorLiquido));
        x.pagamentos.forEach((p) => par(D.nomePagamento(p), moeda(p.totalPago)));
        if (x.status === 'cancelado') par('Cancelamento', [x.cancelamentoMotivo, x.cancelamentoJustificativa].filter(Boolean).join(' · ') || 'Sem motivo informado');
        form.append(dl);
      },
    });
  }

  function desenharResultados() {
    if (!quadros) return;
    const lado = el('div', 'vendas-pdv-lado');
    lado.append(porPdv(), porTipo());
    const erro = estado.erro ? [corpo(el('p', 'profiles-error vendas-pdv-erro', estado.erro), botao('Tentar de novo', () => consultar(), 'btn secondary'))] : [];
    quadros.erro.replaceChildren(...erro);
    quadros.resultados.replaceChildren(resumo(), lado, vendas());
    quadros.resultados.setAttribute('aria-busy', String(estado.carregando));
  }

  async function consultar() {
    if (estado.carregando) return;
    const pedido = D.consultar(); // marca "carregando" antes do primeiro await
    desenharResultados();
    await pedido;
    desenharResultados();
  }

  function programar() {
    clearInterval(relogio);
    relogio = null;
    if (!aoVivo) return;
    relogio = setInterval(() => {
      const aVista = tela && tela.view.classList.contains('show') && document.visibilityState === 'visible';
      if (!aVista) { clearInterval(relogio); relogio = null; return; }
      if (!estado.carregando) consultar();
    }, INTERVALO_AO_VIVO);
  }

  /* ---------- Abrir ---------- */

  function garantirTela() {
    if (tela) return tela;
    tela = U.criarTela({
      id: 'vendas-pdv-view', titulo: 'VND - Vendas dos PDVs', caminho: 'Entradas · Vendas / Faturamento / API / VND - Vendas dos PDVs',
      icone: 'vendasPdv', voltar: () => openSection(sections[0][0], 'API', 'tree', COR), cor: COR, corTexto: COR_TEXTO, classe: 'vendas-pdv-view',
    });
    return tela;
  }

  async function abrirRelatorio() {
    garantirTela();
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
    quadros = { erro: el('div'), resultados: el('div', 'vendas-pdv-resultados') };
    tela.body.replaceChildren(montarFiltros(), quadros.erro, quadros.resultados);
    await consultar();
    programar();
  }

  const CARDS = [['VND - Vendas dos PDVs', 'Vendas do CREARE ao vivo, por PDV, horário e tipo de venda', 'vendas-pdv:relatorio']];
  window.CicluzVendasPdv = {
    cards: () => CARDS.map((c) => [...c]),
    abrir: (id) => { if (id === 'relatorio') abrirRelatorio(); },
  };
})();
