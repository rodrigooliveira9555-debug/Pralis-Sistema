/*
 * Open Finance · Caixa TNP (Resultados › API): o extrato da Caixa PJ da TNP, lido pelo coletor do Meu Pluggy.
 * O S2 não guarda extrato: pergunta à própria API (/api/extrato-tnp), que repassa ao coletor com o token no servidor.
 * De cima para baixo, pouca coisa por vez:
 *   1. Abas das contas (Contas · Conta corrente · Poupança · Cartão) e o Sincronizar.
 *   2. Faixa de atualização (o banco é lido 1x por dia) e os avisos.
 *   3. Período (filtros.js) e Filtros: busca, entradas/saídas e "Mais filtros".
 *   4. Resumo do período (paineis.js): saldo, entradas, saídas, cheque especial; no cartão, fatura, limite e vencimento.
 *   5. Análise: saídas por categoria e por operação (tocar filtra).
 *   6. Faturas (cartão) ou Aplicações (contas).
 *   7. Extrato por dia, com Detalhes (detalhe.js) em cada lançamento e Exportar CSV.
 * Dinheiro em CENTAVOS inteiros (entrada positiva, saída negativa); pendente não entra nos totais.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const S = window.CicluzSync;
  const D = window.CicluzExtratoTnpDados;
  const F = window.CicluzExtratoTnpFiltros;
  const P = window.CicluzExtratoTnpPaineis;
  const { el, botao } = U;
  const { estado, moeda } = D;
  const COR = '#7c3aed';
  const COR_TEXTO = '#5520ad';
  const POR_VEZ = 200;
  U.ICONES.extratoTnp = '<path d="M3 10 12 4l9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/>';
  const ICONE_SINCRONIZAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4"/></svg>';

  let tela = null;
  let partes = null;
  let limite = POR_VEZ;
  const corpo = (...nos) => { const c = el('div', 'compras-corpo'); c.append(...nos.filter(Boolean)); return c; };

  function mensagemErro(erro) {
    if (!erro) return 'Algo deu errado.';
    if (erro.status === 0) return 'Sem conexão com o servidor. Confira a internet e tente de novo.';
    if (erro.status === 401) return 'Sua sessão terminou. Entre de novo.';
    if (erro.status === 403) return 'Você não tem acesso ao extrato bancário. Peça ao administrador.';
    if (erro.detalhes && erro.detalhes.length) return erro.detalhes.map((d) => d.mensagem || d.message).filter(Boolean).join(' ') || erro.message;
    return erro.message || 'Algo deu errado.';
  }

  async function consultar() {
    if (estado.carregando) return;
    estado.carregando = true;
    estado.erro = '';
    pintarSincronia();
    partes.resultados.setAttribute('aria-busy', 'true');
    try {
      const p = new URLSearchParams({ desde: estado.desde, ate: estado.ate });
      if (estado.conta) p.set('conta', estado.conta);
      estado.dados = await S.api('/extrato-tnp?' + p);
      estado.atualizadoEm = new Date();
    } catch (erro) {
      estado.erro = mensagemErro(erro);
    } finally {
      estado.carregando = false;
      partes.resultados.removeAttribute('aria-busy');
    }
    limite = POR_VEZ;
    desenhar();
  }

  /* ---------- 1. Abas das contas e Sincronizar ---------- */

  /** Abas: "Contas" (corrente e poupança somadas, só com mais de uma conta) e uma aba por conta e cartão. */
  function abas() {
    const contas = estado.dados ? estado.dados.todasAsContas : [];
    const bancarias = contas.filter((c) => c.tipo === 'BANK');
    const lista = contas.map((c) => ({ id: c.contaId, rotulo: D.nomeConta(c), dica: c.nome + (c.numero ? ' · ' + c.numero : '') }));
    if (bancarias.length > 1) lista.unshift({ id: '', rotulo: 'Contas', dica: 'Conta corrente e poupança somadas' });
    // Com uma conta só, a aba dela é a visão "sem filtro" (o coletor já soma só as bancárias).
    else if (bancarias.length === 1) lista.find((a) => a.id === bancarias[0].contaId).id = '';
    const caixa = el('div', 'vendas-pdv-abas');
    caixa.setAttribute('role', 'tablist');
    caixa.setAttribute('aria-label', 'Conta');
    lista.forEach((a) => {
      const marcada = estado.conta === a.id;
      const b = el('button', 'vendas-pdv-aba' + (marcada ? ' ativa' : ''), a.rotulo);
      b.type = 'button';
      b.title = a.dica;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(marcada));
      b.tabIndex = marcada ? 0 : -1;
      b.onclick = () => escolherConta(a.id);
      caixa.append(b);
    });
    caixa.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const bs = [...caixa.children];
      const i = bs.indexOf(document.activeElement);
      bs[(i + (e.key === 'ArrowRight' ? 1 : -1) + bs.length) % bs.length].click();
      requestAnimationFrame(() => { const nova = document.querySelector('#extrato-tnp-view .vendas-pdv-aba.ativa'); if (nova) nova.focus(); });
    });
    return caixa;
  }

  function escolherConta(id) {
    if (estado.conta === id) return;
    estado.conta = id;
    D.reiniciarFiltro();
    consultar();
  }

  function topo() {
    const barra = el('div', 'vendas-pdv-topo');
    const lugarAbas = el('div', 'extrato-tnp-abas');
    const lado = el('div', 'vendas-pdv-sincronia');
    const quando = el('span', 'vendas-pdv-vivo-texto');
    quando.setAttribute('aria-live', 'polite');
    const sinc = el('button', 'btn vendas-pdv-sincronizar');
    sinc.type = 'button';
    sinc.innerHTML = ICONE_SINCRONIZAR + '<span>Sincronizar</span>';
    sinc.title = 'Ler de novo o extrato guardado pelo coletor (o banco só é lido 1x por dia)';
    sinc.onclick = () => consultar();
    lado.append(quando, sinc);
    barra.append(lugarAbas, lado);
    return { barra, lugarAbas, quando, sinc };
  }

  /* ---------- 2. Faixa de atualização e avisos ---------- */

  function pintarSincronia() {
    if (!partes) return;
    const { quando, sinc } = partes.topo;
    const d = estado.dados;
    const conexao = d && d.conexoes[0];
    quando.textContent = estado.carregando ? 'Sincronizando…' : estado.atualizadoEm ? 'Atualizado às ' + D.quando(estado.atualizadoEm.toISOString()).split(' às ')[1] : '';
    sinc.disabled = estado.carregando;
    sinc.classList.toggle('girando', estado.carregando);
    partes.faixa.replaceChildren(
      el('b', null, conexao ? 'Banco lido em ' + D.quando(conexao.atualizadoNaPluggy) : 'Banco ainda não lido'),
      el('span', null, 'A Pluggy lê o banco 1 vez por dia: o movimento de hoje costuma aparecer amanhã.'
        + (conexao && conexao.consentimentoExpira ? ' Autorização do Meu Pluggy vale até ' + D.dataComAno(conexao.consentimentoExpira) + '.' : '')),
    );
  }

  function avisos(d) {
    const lista = [];
    d.conexoes.forEach((c) => {
      if (c.erro) lista.push('A conexão ' + c.instituicao + ' está com erro: ' + c.erro);
      if (c.consentimentoExpira) {
        const faltam = Math.ceil((Date.parse(c.consentimentoExpira) - Date.now()) / 86_400_000);
        if (faltam <= 30) lista.push('A autorização do Meu Pluggy vence em ' + Math.max(0, faltam) + ' dia(s). Renove para o extrato não parar.');
      }
    });
    if (d.ultimaBusca && d.ultimaBusca.ok === false) lista.push('A última busca do coletor falhou (' + D.quando(d.ultimaBusca.em) + ').');
    return lista.map((t) => el('p', 'extrato-tnp-aviso', t));
  }

  /* ---------- 7. Extrato ---------- */

  function linhaLancamento(l, d) {
    const det = l.detalhes || {};
    const li = el('li', 'extrato-tnp-lancamento' + (l.situacao === 'PENDING' ? ' pendente' : ''));
    const textos = el('div', 'extrato-tnp-lanc-texto');
    const parcela = det.cartao && det.cartao.parcelas ? 'parcela ' + det.cartao.parcela + '/' + det.cartao.parcelas : '';
    textos.append(
      el('b', null, l.descricao || '—'),
      el('small', null, [D.hora(l.data), D.nomeOperacao(l.operacao), l.contraparte, parcela].filter(Boolean).join(' · ')),
    );
    if (l.categoria) textos.append(el('span', 'extrato-tnp-categoria', D.nomeCategoria(l.categoria)));
    const valores = el('div', 'extrato-tnp-lanc-valor');
    valores.append(el('b', l.valorCentavos < 0 ? 'extrato-tnp-saida' : 'extrato-tnp-entrada', D.comSinal(l.valorCentavos)));
    if (l.situacao === 'PENDING') valores.append(U.situacao('Pendente', 'atencao'));
    const conta = d.todasAsContas.find((c) => c.contaId === l.contaId);
    const detalhes = botao('Detalhes', () => window.CicluzExtratoTnpDetalhe.abrir(l, { conta, cor: COR, corTexto: COR_TEXTO }), 'btn secondary extrato-tnp-detalhes');
    detalhes.setAttribute('aria-label', 'Detalhes de ' + (l.descricao || 'lançamento') + ', ' + D.comSinal(l.valorCentavos));
    li.append(textos, valores, detalhes);
    return li;
  }

  function extrato(d, lista, cartao) {
    const exportar = botao('Exportar CSV', () => D.baixarCsv(lista, d.todasAsContas), 'btn secondary');
    exportar.disabled = !lista.length;
    exportar.title = 'Baixar os lançamentos filtrados (abre no Excel)';
    const s = U.secao('Extrato', lista.length, exportar);
    if (!lista.length) {
      const algum = D.todos(d).length > 0;
      s.append(corpo(U.vazio(algum ? 'Nenhum lançamento com estes filtros.' : 'Nenhum lançamento neste período.',
        algum ? 'Limpe os filtros para ver o período inteiro.' : 'Lembre: o movimento de hoje costuma aparecer amanhã.')));
      return s;
    }
    const caixa = el('div', 'extrato-tnp-dias');
    let mostrados = 0;
    for (const dia of D.porDia(lista, cartao)) {
      if (mostrados >= limite) break;
      const bloco = el('section', 'extrato-tnp-dia');
      const cab = el('header', 'extrato-tnp-dia-cab');
      cab.append(el('h4', null, D.diaLongo(dia.dia)), el('span', null, '+' + moeda(dia.entradas) + '  ·  −' + moeda(Math.abs(dia.saidas))));
      const ul = el('ul', 'extrato-tnp-lancamentos');
      dia.lancamentos.slice(0, limite - mostrados).forEach((l) => ul.append(linhaLancamento(l, d)));
      mostrados += ul.children.length;
      bloco.append(cab, ul);
      caixa.append(bloco);
    }
    s.append(caixa);
    if (lista.length > mostrados) {
      const rodape = el('div', 'vendas-pdv-paginacao');
      rodape.append(el('span', null, 'Mostrando ' + mostrados + ' de ' + lista.length),
        botao('Mostrar mais ' + Math.min(POR_VEZ, lista.length - mostrados), () => { limite += POR_VEZ; redesenharResultados(); }, 'btn secondary'));
      s.append(rodape);
    }
    return s;
  }

  /* ---------- Desenho ---------- */

  function redesenharResultados() {
    const d = estado.dados;
    if (!d) return;
    const lista = D.filtrados(d);
    const conta = estado.conta ? d.todasAsContas.find((c) => c.contaId === estado.conta) : null;
    const cartao = conta && conta.tipo === 'CREDIT';
    partes.resultados.replaceChildren(...[
      P.resumo(d, lista, conta),
      P.analise(lista, { aoFiltrar: filtrar, cartao }),
      cartao ? P.faturas(d) : !estado.conta ? P.aplicacoes(d) : null,
      extrato(d, lista, cartao),
    ].filter(Boolean));
  }

  function montarFiltros() {
    const novo = F.filtros({ aoFiltrar: soResultados, aoLimpar: filtrar });
    partes.filtros.replaceWith(novo);
    partes.filtros = novo;
  }

  /** Filtro mudou no próprio quadro: só o resultado (o campo em que a pessoa digita fica onde está). */
  function soResultados() {
    limite = POR_VEZ;
    redesenharResultados();
  }

  /** Filtro mudou por fora (barra tocada, Limpar): o resultado e o quadro de Filtros, que acompanha. */
  function filtrar() {
    soResultados();
    montarFiltros();
  }

  function desenhar() {
    if (!partes) return;
    pintarSincronia();
    const d = estado.dados;
    if (estado.erro) {
      partes.resultados.replaceChildren(corpo(el('p', 'profiles-error', estado.erro), botao('Tentar de novo', () => consultar(), 'btn secondary')));
      return;
    }
    if (!d) return;
    partes.topo.lugarAbas.replaceChildren(abas());
    partes.avisos.replaceChildren(...avisos(d));
    montarFiltros();
    redesenharResultados();
  }

  async function abrir() {
    if (!tela) {
      tela = U.criarTela({
        id: 'extrato-tnp-view', titulo: 'Open Finance · Caixa TNP', caminho: 'Resultados · Relatórios / API / Open Finance · Caixa TNP',
        icone: 'extratoTnp', voltar: () => openSection(sections[5][0], 'API', 'tree', COR), cor: COR, corTexto: COR_TEXTO, classe: 'extrato-tnp-view',
      });
    }
    tela.ativar();
    tela.body.replaceChildren(U.vazio('Carregando…'));
    try {
      if (estado.configurado === null) estado.configurado = (await S.api('/extrato-tnp/situacao')).configurado;
    } catch (erro) {
      tela.body.replaceChildren(U.vazio('Não foi possível abrir o extrato', mensagemErro(erro)), botao('Tentar de novo', () => abrir(), 'btn secondary'));
      return;
    }
    if (!estado.configurado) {
      tela.body.replaceChildren(U.vazio('O extrato ainda não foi ligado', 'O S2 lê o extrato do coletor do Meu Pluggy da TNP. Falta configurar a ligação no servidor.'));
      return;
    }
    const faixa = el('div', 'extrato-tnp-faixa-texto');
    faixa.setAttribute('aria-live', 'polite');
    const moldura = el('div', 'extrato-tnp-faixa');
    moldura.append(faixa);
    partes = {
      topo: topo(), faixa, avisos: el('div', 'extrato-tnp-avisos'),
      periodo: F.periodo({ aoMudar: consultar }), filtros: el('div'), resultados: el('div', 'vendas-pdv-resultados'),
    };
    tela.body.replaceChildren(partes.topo.barra, moldura, partes.avisos, partes.periodo, partes.filtros, partes.resultados);
    await consultar();
  }

  const CARDS = [['Open Finance · Caixa TNP', 'Conta, poupança e cartão da Caixa PJ da TNP, pelo Meu Pluggy', 'extrato-tnp:extrato']];
  window.CicluzExtratoTnp = {
    cards: () => CARDS.map((c) => [...c]),
    abrir: (id) => { if (id === 'extrato') abrir(); },
  };
})();
