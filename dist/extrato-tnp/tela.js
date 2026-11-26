/*
 * Open Finance (Resultados › API): o extrato bancário de cada empresa, lido pelo coletor do Meu Pluggy dela. Três
 * cartões abrem esta mesma tela, cada um com a sua fonte: Caixa TNP, Bradesco HORA e Padaria Lisboa (FONTES).
 * O S2 não guarda extrato: pergunta à própria API (/api/extrato-tnp?fonte=…), que repassa ao coletor com o token
 * no servidor.
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

  // Cada empresa tem o seu cartão e a sua tela (id próprio); o código e o desenho são os mesmos.
  const FONTES = {
    tnp: { cartao: 'extrato', titulo: 'Open Finance · Caixa TNP', descricao: 'Conta, poupança e cartão da Caixa PJ da TNP, pelo Meu Pluggy', idTela: 'extrato-tnp-view' },
    hora: { cartao: 'hora', titulo: 'Open Finance · Bradesco HORA', descricao: 'Conta, poupança e cartão do Bradesco PJ do restaurante HORA, pelo Meu Pluggy', idTela: 'extrato-hora-view' },
    lisboa: { cartao: 'lisboa', titulo: 'Open Finance · Padaria Lisboa', descricao: 'Contas e cartão da Padaria Lisboa, pelo Meu Pluggy', idTela: 'extrato-lisboa-view' },
  };
  const telas = {};
  let tela = null;
  let partes = null;
  const raiz = () => '#' + FONTES[estado.fonte].idTela;
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
    const fonte = estado.fonte;
    try {
      const p = new URLSearchParams({ fonte, desde: estado.desde, ate: estado.ate });
      if (estado.conta) p.set('conta', estado.conta);
      const dados = await S.api('/extrato-tnp?' + p);
      // Trocou de empresa no meio da busca: a resposta é da outra, descarta (a tela nova já buscou a dela).
      if (estado.fonte !== fonte) return;
      estado.dados = dados;
      estado.atualizadoEm = new Date();
    } catch (erro) {
      if (estado.fonte !== fonte) return;
      estado.erro = mensagemErro(erro);
    } finally {
      if (estado.fonte === fonte) {
        estado.carregando = false;
        partes.resultados.removeAttribute('aria-busy');
      }
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
    // Nenhuma aba casou com a escolha (ex.: só cartão, sem conta): a primeira fica marcada e alcançável pelo teclado.
    const marcadaId = lista.some((a) => a.id === estado.conta) ? estado.conta : lista[0] && lista[0].id;
    const caixa = el('div', 'vendas-pdv-abas');
    caixa.setAttribute('role', 'tablist');
    caixa.setAttribute('aria-label', 'Conta');
    lista.forEach((a) => {
      const marcada = marcadaId === a.id;
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
    });
    return caixa;
  }

  /** Refaz as abas e, se o foco estava nelas, devolve o foco à aba marcada. */
  function pintarAbas() {
    const tinhaFoco = partes.topo.lugarAbas.contains(document.activeElement);
    partes.topo.lugarAbas.replaceChildren(abas());
    if (tinhaFoco) focar(raiz() + ' .vendas-pdv-aba.ativa');
  }
  const focar = (seletor) => { const n = document.querySelector(seletor); if (n) n.focus(); };

  /** A aba muda na hora (e fica com o foco); o extrato da conta anterior fica esmaecido até o novo chegar. */
  function escolherConta(id) {
    if (estado.conta === id) return;
    estado.conta = id;
    D.reiniciarFiltro();
    pintarAbas();
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
    quando.textContent = estado.carregando ? 'Sincronizando…' : estado.atualizadoEm ? 'Lido do coletor às ' + D.quando(estado.atualizadoEm.toISOString()).split(' às ')[1] : '';
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
        if (faltam <= 30) lista.push('A autorização do Meu Pluggy vence em ' + D.plural(Math.max(0, faltam), 'dia', 'dias') + '. Renove para o extrato não parar.');
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
      cab.append(el('h4', null, D.diaLongo(dia.dia)), el('span', null, 'Entradas +' + moeda(dia.entradas) + ' · Saídas −' + moeda(Math.abs(dia.saidas))));
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
        botao('Mostrar mais ' + Math.min(POR_VEZ, lista.length - mostrados), () => {
          // O foco vai para o primeiro lançamento que apareceu (o botão some ou muda de lugar).
          const primeiro = mostrados;
          limite += POR_VEZ;
          redesenharResultados();
          const botoes = document.querySelectorAll(raiz() + ' .extrato-tnp-detalhes');
          if (botoes[primeiro]) botoes[primeiro].focus();
        }, 'btn secondary'));
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
    const cartao = Boolean(conta && conta.tipo === 'CREDIT');
    // Primeiro o que se confere (resumo e lançamentos); depois as faturas, a análise e as aplicações.
    partes.resultados.replaceChildren(...[
      P.resumo(d, lista, conta),
      extrato(d, lista, cartao),
      cartao ? P.faturas(d) : null,
      P.analise(lista, { aoFiltrar: filtrarPelaBarra, cartao }),
      !estado.conta ? P.aplicacoes(d) : null,
    ].filter(Boolean));
  }

  function montarFiltros() {
    const novo = F.filtros({ aoFiltrar: soResultados, aoLimpar: limpar });
    partes.filtros.replaceWith(novo);
    partes.filtros = novo;
  }

  /** Filtro mudou no próprio quadro: só o resultado (o campo em que a pessoa digita fica onde está). */
  function soResultados() {
    limite = POR_VEZ;
    redesenharResultados();
  }

  /** Barra tocada: o resultado e o quadro de Filtros acompanham; o foco volta para a mesma barra. */
  function filtrarPelaBarra(chave, id) {
    soResultados();
    montarFiltros();
    const barra = [...document.querySelectorAll(raiz() + ' .vendas-pdv-barra')].find((b) => b.dataset.chave === chave && b.dataset.id === id);
    if (barra) barra.focus();
  }

  /** Limpar filtros: tudo volta e o foco fica no Limpar do quadro novo. */
  function limpar() {
    soResultados();
    montarFiltros();
    const botao = [...partes.filtros.querySelectorAll('button')].find((b) => b.textContent === 'Limpar filtros');
    if (botao) botao.focus();
  }

  function desenhar() {
    if (!partes) return;
    pintarSincronia();
    const d = estado.dados;
    if (estado.erro) {
      const aviso = el('p', 'profiles-error', estado.erro);
      aviso.setAttribute('role', 'alert');
      // Erro: nada da conta ou do período anterior fica à vista como se fosse o atual.
      partes.avisos.replaceChildren();
      partes.resultados.replaceChildren(corpo(aviso, botao('Tentar de novo', () => consultar(), 'btn secondary')));
      return;
    }
    if (!d) return;
    pintarAbas();
    partes.avisos.replaceChildren(...avisos(d));
    montarFiltros();
    redesenharResultados();
  }

  /** Período digitado inválido: o resultado fica esmaecido até o período voltar a valer. */
  const marcarDesatualizado = (sim) => partes.resultados.classList.toggle('desatualizado', sim);

  async function abrir(fonte) {
    const f = FONTES[fonte];
    // Trocou de empresa: começa do zero (conta, filtros e dados são de cada uma).
    if (estado.fonte !== fonte) D.trocarFonte(fonte);
    if (!telas[fonte]) {
      telas[fonte] = U.criarTela({
        id: f.idTela, titulo: f.titulo, caminho: 'Resultados · Relatórios / API / ' + f.titulo,
        icone: 'extratoTnp', voltar: () => openSection(sections[5][0], 'API', 'tree', COR), cor: COR, corTexto: COR_TEXTO, classe: 'extrato-tnp-view',
      });
    }
    tela = telas[fonte];
    tela.ativar();
    tela.body.replaceChildren(U.vazio('Carregando…'));
    try {
      if (estado.configurado[fonte] === undefined) estado.configurado[fonte] = (await S.api('/extrato-tnp/situacao?fonte=' + fonte)).configurado;
    } catch (erro) {
      tela.body.replaceChildren(U.vazio('Não foi possível abrir o extrato', mensagemErro(erro)), botao('Tentar de novo', () => abrir(fonte), 'btn secondary'));
      return;
    }
    if (estado.fonte !== fonte) return;
    if (!estado.configurado[fonte]) {
      tela.body.replaceChildren(U.vazio('Este extrato ainda não foi ligado', 'O S2 lê o extrato do coletor do Meu Pluggy desta empresa. Falta publicar o coletor ou configurar a ligação no servidor.'));
      return;
    }
    const faixa = el('div', 'extrato-tnp-faixa-texto');
    const moldura = el('div', 'extrato-tnp-faixa');
    moldura.append(faixa);
    partes = {
      topo: topo(), faixa, avisos: el('div', 'extrato-tnp-avisos'),
      periodo: F.periodo({ aoMudar: () => { marcarDesatualizado(false); consultar(); }, aoInvalido: () => marcarDesatualizado(true) }),
      filtros: el('div'), resultados: el('div', 'vendas-pdv-resultados'),
    };
    partes.resultados.replaceChildren(el('p', 'extrato-tnp-carregando', 'Carregando o extrato…'));
    tela.body.replaceChildren(partes.topo.barra, moldura, partes.avisos, partes.periodo, partes.filtros, partes.resultados);
    await consultar();
  }

  // O cartão da TNP continua "extrato-tnp:extrato" (endereço e acesso já gravados); os outros, "extrato-tnp:<fonte>".
  window.CicluzExtratoTnp = {
    cards: () => Object.values(FONTES).map((f) => [f.titulo, f.descricao, 'extrato-tnp:' + f.cartao]),
    abrir: (id) => { const fonte = Object.keys(FONTES).find((k) => FONTES[k].cartao === id); if (fonte) abrir(fonte); },
  };
})();
