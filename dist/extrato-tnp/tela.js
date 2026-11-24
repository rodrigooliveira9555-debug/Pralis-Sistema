/*
 * Open Finance · Caixa TNP (Resultados › API): o extrato da conta Caixa PJ da TNP, lido pelo coletor do Meu Pluggy.
 * O S2 não guarda extrato: pergunta à própria API (/api/extrato-tnp), que repassa ao coletor com o token no servidor.
 * De cima para baixo: a faixa de atualização (o banco é lido 1x por dia) e o Sincronizar · Resumo (saldo, entradas e
 * saídas de hoje) · Período (atalhos e datas no calendário) com os totais · Extrato, agrupado por dia.
 * Dinheiro chega em CENTAVOS inteiros (entrada positiva, saída negativa); pendente não entra nos totais.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const S = window.CicluzSync;
  const { el, botao, campo, seletor } = U;
  const COR = '#7c3aed';
  const COR_TEXTO = '#5520ad';
  const FUSO = 'America/Sao_Paulo';
  U.ICONES.extratoTnp = '<path d="M3 10 12 4l9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/>';
  const ICONE_SINCRONIZAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4"/></svg>';

  const hojeIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(new Date());
  const somarDias = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const reais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const moeda = (centavos) => reais.format((Number(centavos) || 0) / 100);
  const quando = (iso) => (iso ? new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)).replace(',', ' às') : '—');
  // Banco que só informa o dia manda meia-noite UTC: aí não há hora (mostrar 21:00 do dia anterior seria falso).
  const hora = (iso) => (/T00:00:00(\.000)?Z$/.test(iso) ? '' : new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' }).format(new Date(iso)));
  const diaLongo = (iso) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', weekday: 'long', day: '2-digit', month: '2-digit' }).format(new Date(iso + 'T12:00:00Z'));

  const estado = { desde: somarDias(hojeIso(), -6), ate: hojeIso(), conta: '', dados: null, carregando: false, erro: '', configurado: null };
  let tela = null;
  let partes = null;

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
    try {
      const p = new URLSearchParams({ desde: estado.desde, ate: estado.ate });
      if (estado.conta) p.set('conta', estado.conta);
      estado.dados = await S.api('/extrato-tnp?' + p);
    } catch (erro) {
      estado.erro = mensagemErro(erro);
    } finally {
      estado.carregando = false;
    }
    desenhar();
  }

  /* ---------- Faixa de atualização ---------- */

  function faixa() {
    const barra = el('div', 'extrato-tnp-faixa');
    const texto = el('div', 'extrato-tnp-faixa-texto');
    texto.setAttribute('aria-live', 'polite');
    const sinc = el('button', 'btn extrato-tnp-sincronizar');
    sinc.type = 'button';
    sinc.innerHTML = ICONE_SINCRONIZAR + '<span>Sincronizar</span>';
    sinc.title = 'Ler de novo o extrato guardado pelo coletor (o banco só é lido 1x por dia)';
    sinc.onclick = () => consultar();
    barra.append(texto, sinc);
    return { barra, texto, sinc };
  }

  function pintarSincronia() {
    if (!partes) return;
    const { texto, sinc } = partes.faixa;
    const d = estado.dados;
    const conexao = d && d.conexoes[0];
    texto.replaceChildren(
      el('b', null, estado.carregando ? 'Sincronizando…' : conexao ? 'Banco lido em ' + quando(conexao.atualizadoNaPluggy) : 'Banco ainda não lido'),
      el('span', null, 'A Pluggy lê o banco 1 vez por dia: o movimento de hoje costuma aparecer amanhã.'
        + (conexao && conexao.consentimentoExpira ? ' Autorização do Meu Pluggy vence em ' + quando(conexao.consentimentoExpira).split(' às')[0] + '.' : '')),
    );
    sinc.disabled = estado.carregando;
    sinc.classList.toggle('girando', estado.carregando);
  }

  /* ---------- Resultados ---------- */

  function numero(rotulo, valor, detalhe, tom) {
    const n = el('div', 'vendas-pdv-numero' + (tom ? ' tom-' + tom : ''));
    n.append(el('span', 'vendas-pdv-numero-rotulo', rotulo), el('strong', null, valor));
    if (detalhe) n.append(el('small', null, detalhe));
    return n;
  }

  function avisos(d) {
    const lista = [];
    d.conexoes.forEach((c) => {
      if (c.erro) lista.push('A conexão ' + c.instituicao + ' está com erro: ' + c.erro);
      if (c.consentimentoExpira) {
        const faltam = Math.ceil((Date.parse(c.consentimentoExpira) - Date.now()) / 86_400_000);
        if (faltam <= 30) lista.push('A autorização do Meu Pluggy vence em ' + Math.max(0, faltam) + ' dia(s) (' + quando(c.consentimentoExpira).split(' às')[0] + '). Renove para não parar o extrato.');
      }
    });
    if (d.ultimaBusca && d.ultimaBusca.ok === false) lista.push('A última busca do coletor falhou (' + quando(d.ultimaBusca.em) + ').');
    return lista.map((t) => el('p', 'extrato-tnp-aviso', t));
  }

  function resumo(d) {
    const s = U.secao('Hoje');
    const conta = d.contas.find((c) => c.contaId === estado.conta) || d.contas[0];
    const saldo = estado.conta && conta ? conta.saldoCentavos : d.saldoTotalCentavos;
    const pend = d.hoje.pendentes ? d.hoje.pendentes + ' pendente(s) fora do total' : '';
    const grade = el('div', 'vendas-pdv-numeros');
    grade.append(
      numero('Saldo', moeda(saldo), conta ? 'Lido em ' + quando(conta.saldoLidoEm) : ''),
      numero('Entradas', moeda(d.hoje.entradas), d.hoje.quantidade + ' lançamento(s)' + (pend ? ' · ' + pend : ''), 'positivo'),
      numero('Saídas', moeda(Math.abs(d.hoje.saidas)), 'Resultado do dia ' + moeda(d.hoje.liquido), 'negativo'),
    );
    s.append(corpo(grade));
    return s;
  }

  const corpo = (...nos) => { const c = el('div', 'compras-corpo'); c.append(...nos); return c; };

  function filtros() {
    const s = U.secao('Período');
    const ini = U.campoData({ valor: estado.desde, rotulo: 'Data inicial' });
    const fim = U.campoData({ valor: estado.ate, rotulo: 'Data final' });
    const hoje = hojeIso();
    const faixas = { hoje: [hoje, hoje], 7: [somarDias(hoje, -6), hoje], 15: [somarDias(hoje, -14), hoje], 31: [somarDias(hoje, -30), hoje] };
    const chipDe = () => Object.keys(faixas).find((k) => faixas[k][0] === estado.desde && faixas[k][1] === estado.ate) || '';
    const chips = U.chips([['hoje', 'Hoje'], ['7', '7 dias'], ['15', '15 dias'], ['31', '31 dias']], chipDe(), (v) => {
      [estado.desde, estado.ate] = faixas[v]; ini.definir(estado.desde); fim.definir(estado.ate); consultar();
    });
    const aviso = el('p', 'profiles-error extrato-tnp-aviso-periodo');
    aviso.setAttribute('role', 'alert');
    aviso.hidden = true;
    const aoMudar = () => {
      const [di, df] = [ini.valor(), fim.valor()];
      if (!di || !df) return;
      const dias = (Date.parse(df + 'T00:00:00Z') - Date.parse(di + 'T00:00:00Z')) / 86_400_000;
      const erro = di > df ? 'A data inicial está depois da final.' : dias > 30 ? 'O período vai até 31 dias.' : '';
      aviso.textContent = erro; aviso.hidden = !erro;
      if (erro) return;
      estado.desde = di; estado.ate = df; chips.atualizar(chipDe()); consultar();
    };
    ini.input.addEventListener('change', aoMudar);
    fim.input.addEventListener('change', aoMudar);
    const linha = el('div', 'extrato-tnp-periodo');
    linha.append(chips, campo('Data inicial', ini.caixa), campo('Data final', fim.caixa));
    const contas = estado.dados ? estado.dados.contas : [];
    if (contas.length > 1) {
      const sel = seletor(contas.map((c) => [c.contaId, c.nome + (c.numero ? ' · ' + c.numero : '')]), estado.conta, 'Todas as contas');
      sel.onchange = () => { estado.conta = sel.value; consultar(); };
      linha.append(campo('Conta', sel));
    }
    const totais = el('div', 'extrato-tnp-totais');
    partes.totais = totais;
    s.append(corpo(linha, aviso, totais), ini.painel, fim.painel);
    return s;
  }

  function pintarTotais(d) {
    if (!partes.totais) return;
    const t = d.periodo;
    const item = (rotulo, valor, tipo) => { const x = el('div', tipo ? 'extrato-tnp-total-' + tipo : null); x.append(el('span', null, rotulo), el('b', null, valor)); return x; };
    partes.totais.replaceChildren(
      item('Entradas no período', '+' + moeda(t.entradas), 'entrada'),
      item('Saídas no período', '−' + moeda(Math.abs(t.saidas)), 'saida'),
      item('Resultado', moeda(t.liquido)),
      item('Lançamentos', t.quantidade + (t.pendentes ? ' + ' + t.pendentes + ' pendente(s)' : '')),
    );
  }

  function extrato(d) {
    const total = d.dias.reduce((n, x) => n + x.lancamentos.length, 0);
    const s = U.secao('Extrato', total);
    if (!total) { s.append(corpo(U.vazio('Nenhum lançamento neste período.', 'Lembre: o movimento de hoje costuma aparecer amanhã.'))); return s; }
    const lista = el('div', 'extrato-tnp-dias');
    d.dias.filter((x) => x.lancamentos.length).forEach((x) => {
      const bloco = el('section', 'extrato-tnp-dia');
      const cab = el('header', 'extrato-tnp-dia-cab');
      cab.append(el('h4', null, diaLongo(x.dia)), el('span', null, '+' + moeda(x.entradas) + '  ·  −' + moeda(Math.abs(x.saidas))));
      const ul = el('ul', 'extrato-tnp-lancamentos');
      x.lancamentos.forEach((l) => {
        const li = el('li', 'extrato-tnp-lancamento' + (l.situacao === 'PENDING' ? ' pendente' : ''));
        const textos = el('div', 'extrato-tnp-lanc-texto');
        textos.append(el('b', null, l.descricao || '—'), el('small', null, [hora(l.data), l.operacao, l.contraparte].filter(Boolean).join(' · ')));
        const valores = el('div', 'extrato-tnp-lanc-valor');
        valores.append(el('b', l.valorCentavos < 0 ? 'saida' : 'entrada', (l.valorCentavos < 0 ? '−' : '+') + moeda(Math.abs(l.valorCentavos))));
        if (l.situacao === 'PENDING') valores.append(U.situacao('Pendente', 'atencao'));
        else if (l.saldoCentavos !== null) valores.append(el('small', null, 'Saldo ' + moeda(l.saldoCentavos)));
        li.append(textos, valores);
        ul.append(li);
      });
      bloco.append(cab, ul);
      lista.append(bloco);
    });
    s.append(lista);
    return s;
  }

  function desenhar() {
    if (!partes) return;
    pintarSincronia();
    const d = estado.dados;
    if (estado.erro) {
      partes.resultados.replaceChildren(corpo(el('p', 'profiles-error', estado.erro), botao('Tentar de novo', () => consultar(), 'btn secondary')));
      partes.hoje.replaceChildren();
      return;
    }
    if (!d) return;
    if (!partes.filtrosMontados) { partes.filtros.replaceWith(partes.filtros = filtros()); partes.filtrosMontados = true; }
    pintarTotais(d);
    partes.avisos.replaceChildren(...avisos(d));
    partes.hoje.replaceChildren(resumo(d));
    partes.resultados.replaceChildren(extrato(d));
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
    partes = { faixa: faixa(), avisos: el('div', 'extrato-tnp-avisos'), hoje: el('div'), filtros: el('div'), filtrosMontados: false, totais: null, resultados: el('div', 'vendas-pdv-resultados') };
    tela.body.replaceChildren(partes.faixa.barra, partes.avisos, partes.hoje, partes.filtros, partes.resultados);
    await consultar();
  }

  const CARDS = [['Open Finance · Caixa TNP', 'Saldo e extrato da conta Caixa PJ da TNP, pelo Meu Pluggy', 'extrato-tnp:extrato']];
  window.CicluzExtratoTnp = {
    cards: () => CARDS.map((c) => [...c]),
    abrir: (id) => { if (id === 'extrato') abrir(); },
  };
})();
