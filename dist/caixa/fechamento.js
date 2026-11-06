/*
 * Caixa — Fechamento (casca). Wizard de 4 etapas como no principal (CaixaFechamentoWizard):
 *  gerente responsável → 1 Vendas (contagem cega + folha CREARE) → 2 Maquininha → 3 Relatório final → 4 Fechamento.
 * Regras (ver Caixa-Brain/05): contagem por DOIS totais (cédulas e moedas), esperado congelado ao gerar o relatório,
 * diferença = contado − esperado sem tolerância, folha e maquininha só INFORMAM (só a contagem física vira quebra),
 * lacre de fechamento = o reservado pela Tesouraria, observação obrigatória se houver falta OU sobra.
 * Adaptação da casca: a leitura da folha CREARE e do comprovante (IA no principal) é SIMULADA por um botão;
 * anexos são só um nome de arquivo. Dados FICTÍCIOS, em centavos, só em memória.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const { el, botao, campo, entrada, seletor } = U;
  const { moeda, centavos } = C;

  const CAMINHO = 'Entradas · Vendas / Faturamento / Lançamentos / VND - Fechamento de Caixa';
  const ETAPAS = ['Vendas', 'Maquininha', 'Relatório final', 'Fechamento'];
  // [chave, rótulo, compara com o PDV?]
  const CAMPOS_FOLHA = [
    ['trocoInicial', 'Troco Inicial', true], ['saldoInicial', 'Saldo Inicial', false], ['clientes', 'CLIENTES (VND/TRANS)', false],
    ['credito', 'Crédito', true], ['debito', 'Débito', true], ['dinheiro', 'Dinheiro', true], ['pix', 'Pix', true], ['voucher', 'Voucher', true],
    ['total', 'Total', true], ['despesas', 'Despesas', true], ['sangria', 'Sangria', true], ['saldoFinal', 'Saldo Final Dinheiro', false],
  ];
  const FORMAS_CARTAO = [['credito', 'Crédito'], ['debito', 'Débito'], ['pix', 'Pix'], ['voucher', 'Voucher']];
  const NOME_FORMA = { credito: 'Crédito', debito: 'Débito', dinheiro: 'Dinheiro', pix: 'Pix', voucher: 'Voucher' };
  const ICONE_CADEADO = '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>';
  const fmt = (c) => (c / 100).toFixed(2).replace('.', ',');

  let tela = null;
  let corpo = null;
  let gerenteDialogoVisto = false;
  let erroGerar = '';
  let erroMaq = '';
  let justContagem = '';
  let corrigindoContagem = false;
  let revisao = false;
  let gerarRefresh = null; // recalcula o botão "Gerar relatório" no lugar
  let fecharRefresh = null; // idem para "Encerrar" na etapa 4

  const corpoSecao = (...nos) => { const c = el('div', 'compras-corpo'); c.append(...nos); return c; };
  const dl = (pares) => {
    const caixa = el('dl', 'caixa-declarado');
    pares.forEach(([t, v]) => { const d = el('div'); d.append(el('dt', null, t), el('dd', null, v)); caixa.append(d); });
    return caixa;
  };
  const cadeado = (texto) => {
    const s = el('span', 'caixa-lacrado');
    s.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONE_CADEADO + '</svg>';
    s.append(document.createTextNode(texto));
    return s;
  };

  function abrir() {
    if (!tela) tela = C.criarTela({ id: 'caixa-fechamento', titulo: 'VND - Fechamento de Caixa', caminho: CAMINHO });
    tela.ativar();
    montar();
    const f = C.estado.fechamento;
    if (C.estado.status === 'em_fechamento' && f && !f.gerenteOk && !gerenteDialogoVisto) { gerenteDialogoVisto = true; dialogoGerente(); }
  }
  function montar() {
    tela.body.replaceChildren(
      C.faixaDemo('Demonstração: dados fictícios, nada é gravado. A leitura da folha e do comprovante (IA no principal) é simulada por botão.', atualizar, ['operador', 'gerente']),
      corpo = el('div', 'caixa-corpo')
    );
    atualizar();
  }
  C.aoReiniciar(() => { gerenteDialogoVisto = false; erroGerar = erroMaq = justContagem = ''; corrigindoContagem = false; revisao = false; if (tela) montar(); });

  /* ---------- valores do PDV (Pralis) para comparar ---------- */

  function pralis() {
    const r = C.resumo();
    const forma = (n) => (r.porForma.find((x) => x[0] === n) || [n, 0])[1];
    return {
      trocoInicial: C.estado.abertura.valorInicial, credito: forma('Crédito'), debito: forma('Débito'), dinheiro: forma('Dinheiro'),
      pix: forma('Pix'), voucher: forma('Voucher'), total: r.entradas, despesas: 0, sangria: r.sangrias,
    };
  }

  /* ---------- tela ---------- */

  function atualizar() {
    const e = C.estado;
    const f = e.fechamento;
    if (e.status === 'fechado' && f && f.resultado) return corpo.replaceChildren(blocoFechado(f.resultado));
    if (e.status !== 'em_fechamento' || !f) {
      const s = U.secao('Fechamento ainda não iniciado');
      const acoes = el('div', 'caixa-acoes');
      acoes.append(botao(e.status === 'aberto' ? 'Ir para o Turno' : 'Ir para a Abertura', () => C.abrir(e.status === 'aberto' ? 'turno' : 'abertura'), 'btn'));
      s.append(corpoSecao(U.nota('O fechamento começa depois de "Fechar caixa" → "Encerrar vendas e ir para conferência" no Turno do caixa.'), acoes));
      return corpo.replaceChildren(s);
    }
    const partes = [blocoGerente(f), blocoNavegacao(f)];
    partes.push([etapa1, etapa2, etapa3, etapa4][f.etapa - 1](f));
    partes.push(blocoRodape(f));
    corpo.replaceChildren(...partes);
  }

  /* ---------- gerente responsável ---------- */

  function blocoGerente(f) {
    const s = el('section', 'compras-secao caixa-bloco');
    const cab = el('div', 'compras-secao-cab');
    cab.append(el('h3', null, 'Gerente responsável'), f.gerenteOk ? U.situacao('Confirmado: ' + f.gerente, 'positivo') : U.situacao('Falta confirmar', 'atencao'));
    s.append(cab);
    const acoes = el('div', 'caixa-acoes');
    acoes.append(el('small', null, 'Responsável pelo caixa (R-226): ' + C.estado.abertura.responsavel + ', quem abriu. Corte das vendas: ' + f.corte + '.'),
      botao(f.gerenteOk ? 'Alterar gerente' : 'Confirmar gerente', dialogoGerente, f.gerenteOk ? 'btn secondary' : 'btn'));
    s.append(corpoSecao(acoes));
    return s;
  }

  function dialogoGerente() {
    const f = C.estado.fechamento;
    const atual = C.estado.abertura.supervisor;
    C.dialogo({
      titulo: 'Gerente responsável pelo fechamento',
      subtitulo: 'Quem confirma este fechamento pela gerência.',
      rotuloSalvar: 'Confirmar gerente',
      montar: (form) => {
        const ctx = { mesmo: Boolean(atual), nome: null };
        const nome = entrada('text', '', { placeholder: 'Nome do gerente', autocomplete: 'off' });
        const campoNome = campo('Nome do gerente responsável', nome, 'Nome livre: o principal não valida se o gerente existe.');
        campoNome.hidden = ctx.mesmo;
        if (atual) {
          form.append(el('p', null, 'Gerente que abriu o caixa: ' + atual + '. É o mesmo no fechamento?'));
          const opc = U.chips([['sim', 'Sim, confirmar'], ['outro', 'Não, é outro']], 'sim', (v) => { ctx.mesmo = v === 'sim'; campoNome.hidden = ctx.mesmo; });
          form.append(opc);
        } else {
          form.append(U.nota('Este caixa não registrou o gerente na abertura. Informe quem responde pelo fechamento.'));
        }
        form.append(campoNome);
        ctx.nome = nome;
        return ctx;
      },
      salvar: (ctx) => {
        if (ctx.mesmo && atual) f.gerente = atual;
        else if (ctx.nome.value.trim().length > 1) f.gerente = ctx.nome.value.trim();
        else return 'Informe o nome do gerente responsável (mínimo 2 letras).';
        f.gerenteOk = true;
        atualizar();
      },
    });
  }

  /* ---------- navegação das etapas ---------- */

  function blocoNavegacao(f) {
    const nav = el('nav', 'caixa-trilha caixa-etapas');
    nav.setAttribute('aria-label', 'Etapas do fechamento');
    const ol = el('ol');
    ETAPAS.forEach((nome, i) => {
      const li = el('li', i + 1 < f.etapa ? 'feito' : i + 1 === f.etapa ? 'atual' : 'futuro');
      if (i + 1 === f.etapa) li.setAttribute('aria-current', 'step');
      const b = botao(nome, () => { f.etapa = i + 1; atualizar(); }, 'caixa-etapa-btn');
      const num = el('span', 'caixa-trilha-marca', String(i + 1));
      num.setAttribute('aria-hidden', 'true');
      li.append(num, b);
      ol.append(li);
    });
    nav.append(ol);
    return nav;
  }

  function blocoRodape(f) {
    const acoes = el('div', 'caixa-acoes');
    if (f.etapa > 1) acoes.append(botao('Voltar', () => { f.etapa -= 1; atualizar(); }, 'btn secondary'));
    if (f.etapa === 1) {
      const b = botao('Conferir maquininha', () => { f.etapa = 2; atualizar(); }, 'btn');
      b.disabled = !f.contagem.registrada;
      if (b.disabled) b.title = 'Gere o relatório de vendas (com a contagem) para continuar.';
      acoes.append(b);
    } else if (f.etapa === 2) acoes.append(botao('Ver relatório final', () => { f.etapa = 3; atualizar(); }, 'btn'));
    else if (f.etapa === 3) acoes.append(botao('Ir para fechamento', () => { f.etapa = 4; atualizar(); }, 'btn'));
    return acoes;
  }

  /* ---------- Etapa 1: Vendas (contagem cega + folha CREARE + relatório) ---------- */

  function etapa1(f) {
    const caixa = el('div', 'caixa-corpo');
    caixa.append(blocoContagem(f), blocoFolha(f), blocoGerar(f));
    return caixa;
  }

  function blocoContagem(f) {
    const c = f.contagem;
    const s = U.secao('1 · Contagem do dinheiro (cega)');
    const trancada = Boolean(c.registrada) && !corrigindoContagem;
    const g = el('div', 'caixa-grade');
    const campoDin = (chave, rotulo) => {
      const i = entrada('text', c[chave], { inputMode: 'decimal', placeholder: '0,00', readOnly: trancada });
      i.oninput = () => { c[chave] = i.value; total.textContent = moeda((centavos(c.especie) || 0) + (centavos(c.moedas) || 0)); if (gerarRefresh) gerarRefresh(); };
      return campo(rotulo, i);
    };
    const total = el('strong', 'caixa-dinheiro', moeda((centavos(c.especie) || 0) + (centavos(c.moedas) || 0)));
    g.append(campoDin('especie', 'Cédulas (R$)'), campoDin('moedas', 'Moedas (R$)'));
    const linha = el('p', 'caixa-total');
    linha.append(document.createTextNode('Total contado: '), total);
    const corpoS = [U.nota('Aqui nada vem do sistema. Conte as cédulas e as moedas do caixa e informe os dois totais; o esperado só aparece na etapa 4.'), g, linha];
    if (c.registrada) {
      corpoS.push(cadeado('Contagem registrada às ' + c.registrada.em + ': ' + moeda(c.registrada.total) + (gerencia() ? ' · esperado ' + moeda(c.registrada.esperado) : '')));
      if (!corrigindoContagem) corpoS.push(botao('Corrigir contagem', () => { corrigindoContagem = true; atualizar(); }, 'btn secondary'));
      else {
        const t = el('textarea');
        t.rows = 2;
        t.value = justContagem;
        t.oninput = () => { justContagem = t.value; if (gerarRefresh) gerarRefresh(); };
        corpoS.push(campo('Por que a contagem mudou? (obrigatório)', t, 'Mínimo 5 letras. A primeira contagem fica no histórico.'));
      }
      if (c.registrada.correcoes.length) corpoS.push(U.nota('Correções: ' + c.registrada.correcoes.map((x) => moeda(x.de) + ' → ' + moeda(x.para) + ' (' + x.justificativa + ')').join(' · ')));
    }
    s.append(corpoSecao(...corpoS));
    return s;
  }

  const gerencia = () => C.estado.perfil === 'gerente';

  function blocoFolha(f) {
    const fo = f.folha;
    const s = U.secao('2 · Folha do CREARE');
    const a = C.estado.abertura;
    const itens = [U.nota('Fotografe ou anexe a folha impressa do PDV. No principal, uma IA lê os valores e eles ficam travados; aqui a leitura é simulada.')];
    const acoes = el('div', 'caixa-acoes caixa-acoes-esq');
    acoes.append(botao(fo.anexo ? 'Trocar folha (simulado)' : 'Anexar folha (simulado)', () => {
      fo.anexo = 'folha-creare-' + a.pdv.replace(' ', '').toLowerCase() + '.jpg';
      fo.campos = null; fo.travados = true; fo.correcao = '';
      f.relatorioGerado = false; // anexar nova folha invalida o relatório já gerado
      atualizar();
    }, 'btn secondary'));
    if (fo.anexo) {
      acoes.append(U.situacao(fo.anexo, 'info'));
      if (!fo.campos) acoes.append(botao('Ler folha (simulado)', () => { fo.campos = lerFolhaSimulada(); fo.travados = true; atualizar(); }, 'btn'));
    }
    itens.push(acoes);
    if (fo.campos) itens.push(tabelaFolha(fo), ...avisoHorario());
    s.append(corpoSecao(...itens));
    return s;
  }

  const avisoHorario = () => [U.situacao('Horário da folha: confere com o corte (emissão entre −2 e +15 min)', 'positivo')];

  /** "Leitura" da folha: devolve o que o CREARE imprimiria, igual ao PDV (o operador pode corrigir). */
  function lerFolhaSimulada() {
    const p = pralis();
    const r = C.resumo();
    const campos = {
      trocoInicial: p.trocoInicial, saldoInicial: p.trocoInicial, clientes: 0, credito: p.credito, debito: p.debito, dinheiro: p.dinheiro,
      pix: p.pix, voucher: p.voucher, total: p.total, despesas: p.despesas, sangria: p.sangria, saldoFinal: r.saldo,
    };
    const texto = {};
    Object.keys(campos).forEach((k) => { texto[k] = fmt(campos[k]); });
    return texto;
  }

  function tabelaFolha(fo) {
    const linhas = CAMPOS_FOLHA.map(([k, rotulo, compara]) => ({ k, rotulo, compara }));
    const t = U.tabela(
      [
        ['Campo da folha', (l) => l.rotulo + (l.compara ? '' : ' (só exibido)')],
        ['Valor lido (R$)', (l) => {
          const i = entrada('text', fo.campos[l.k], { inputMode: 'decimal', readOnly: fo.travados });
          i.setAttribute('aria-label', l.rotulo);
          i.oninput = () => { fo.campos[l.k] = i.value; };
          return i;
        }, 'caixa-num'],
      ],
      linhas
    );
    const caixa = el('div', 'caixa-corpo');
    caixa.append(t);
    if (fo.travados) {
      const ac = el('div', 'caixa-acoes caixa-acoes-esq');
      ac.append(cadeado('Valores lidos pela folha ficam travados.'), botao('Corrigir manualmente', () => { fo.travados = false; atualizar(); }, 'btn secondary'));
      caixa.append(ac);
    } else {
      const j = el('textarea');
      j.rows = 2;
      j.value = fo.correcao;
      j.oninput = () => { fo.correcao = j.value; if (gerarRefresh) gerarRefresh(); };
      caixa.append(campo('Explique por que o valor mudou (mínimo 5 letras)', j, 'Fica registrado em "Correções manuais" no relatório final e no dossiê da Tesouraria.'));
    }
    return caixa;
  }

  /** Pendências para gerar o relatório (recalculadas sem redesenhar a tela: o botão não pode trocar de lugar entre o foco e o clique). */
  function pendenciasGerar(f) {
    const c = f.contagem;
    const fo = f.folha;
    const p = [];
    if (!fo.anexo) p.push('Anexe a folha do CREARE.');
    else if (!fo.campos) p.push('Leia a folha (os valores precisam estar preenchidos).');
    if (centavos(c.especie) === null || centavos(c.moedas) === null) p.push('Informe cédulas e moedas no passo 1 para gerar o relatório.');
    if (corrigindoContagem && justContagem.trim().length < 5) p.push('Explique por que a contagem mudou para gerar de novo.');
    if (fo.campos && !fo.travados && fo.correcao.trim().length < 5) p.push('Explique por que o valor da folha mudou (mínimo 5 letras).');
    return p;
  }

  function blocoGerar(f) {
    const c = f.contagem;
    const s = U.secao('3 · Gerar relatório de vendas');
    const itens = [];
    const lista = el('ul', 'caixa-lista-pend');
    const b = botao(f.relatorioGerado ? 'Gerar de novo' : 'Gerar relatório de vendas', gerarRelatorio, 'btn');
    gerarRefresh = () => {
      const p = pendenciasGerar(f);
      lista.replaceChildren(...p.map((t) => el('li', null, t)));
      lista.hidden = !p.length;
      b.disabled = p.length > 0;
    };
    gerarRefresh();
    itens.push(lista);
    const msg = el('div', 'caixa-pendencias');
    msg.setAttribute('role', 'alert');
    if (erroGerar) msg.append(el('b', null, erroGerar));
    itens.push(msg);
    const acoes = el('div', 'caixa-acoes');
    acoes.append(b);
    itens.push(acoes);
    if (f.relatorioGerado) {
      const r = C.resumo();
      itens.push(U.situacao('Relatório gerado', 'positivo'),
        dl([['Vendas', String(C.estado.turno.vendas.length)], ['Total vendido', moeda(r.entradas)], ['Canceladas (não entram nos totais)', String(C.estado.turno.canceladas.length)],
          ['Contagem registrada', moeda(c.registrada.total)]]));
    }
    s.append(corpoSecao(...itens));
    return s;
  }

  function gerarRelatorio() {
    const f = C.estado.fechamento;
    const c = f.contagem;
    erroGerar = '';
    const especie = centavos(c.especie), moedas = centavos(c.moedas);
    const total = especie + moedas;
    if (f.contagem.registrada && total !== f.contagem.registrada.total && justContagem.trim().length < 5) {
      erroGerar = 'A contagem física já foi registrada. Para corrigir, explique o motivo.';
      return atualizar();
    }
    const esperado = C.resumo().saldo; // congelado neste instante
    const correcoes = c.registrada ? c.registrada.correcoes.slice() : [];
    if (c.registrada && total !== c.registrada.total) correcoes.push({ de: c.registrada.total, para: total, justificativa: justContagem.trim() });
    c.registrada = { total, especie, moedas, esperado, diferenca: C.diferencaDe(total, esperado), correcoes, em: C.hora() };
    f.relatorioGerado = true;
    corrigindoContagem = false;
    justContagem = '';
    U.avisar('Relatório de vendas gerado. A contagem foi registrada.');
    atualizar();
  }

  /* ---------- Etapa 2: Maquininha ---------- */

  function etapa2(f) {
    const m = f.maq;
    const a = C.estado.abertura;
    const s = U.secao('Maquininha');
    s.querySelector('.compras-secao-cab').append(U.situacao(m.salvo ? 'Revisado' : 'Pendente', m.salvo ? 'positivo' : 'atencao'));
    const itens = [U.nota('Maquininha deste caixa: ' + a.maquininha + '. É a escolhida na abertura e não pode ser trocada aqui. A leitura é o acumulado do dia (na tarde, desconta a manhã; não simulado na casca).')];
    const ac = el('div', 'caixa-acoes caixa-acoes-esq');
    ac.append(botao(m.comprovante ? 'Trocar comprovante (simulado)' : 'Anexar comprovante (simulado)', () => {
      m.comprovante = 'comprovante-maquininha.jpg'; m.valores = null; m.travados = false; m.salvo = false; atualizar(); // novo comprovante invalida o relatório salvo
    }, 'btn secondary'));
    if (m.comprovante) {
      ac.append(U.situacao(m.comprovante, 'info'));
      if (!m.valores) ac.append(botao('Ler comprovante (simulado)', () => {
        const p = pralis();
        m.valores = { credito: fmt(p.credito), debito: fmt(p.debito), pix: fmt(p.pix), voucher: fmt(p.voucher) };
        m.travados = true;
        atualizar();
      }, 'btn'));
    }
    itens.push(ac);
    if (m.comprovante) {
      m.valores = m.valores || { credito: '', debito: '', pix: '', voucher: '' };
      const g = el('div', 'caixa-grade');
      FORMAS_CARTAO.forEach(([k, rotulo]) => {
        const i = entrada('text', m.valores[k], { inputMode: 'decimal', placeholder: '0,00', readOnly: m.travados && m.valores[k] !== '' });
        i.oninput = () => { m.valores[k] = i.value; m.salvo = false; };
        g.append(campo(rotulo + ' (acumulado, R$)', i));
      });
      itens.push(g);
      if (m.travados) itens.push(cadeado('Valores lidos do comprovante ficam travados: na maquininha não há correção manual (decisão do Marco, 29/10).'));
      else itens.push(U.nota('Sem leitura automática: preencha os valores do comprovante.'));
    }
    const msg = el('div', 'caixa-pendencias');
    msg.setAttribute('role', 'alert');
    if (erroMaq) msg.append(el('b', null, erroMaq));
    itens.push(msg);
    const acoes = el('div', 'caixa-acoes');
    acoes.append(botao('Salvar conferência da maquininha', salvarMaq, 'btn'));
    itens.push(acoes);
    s.append(corpoSecao(...itens));
    return s;
  }

  function salvarMaq() {
    const m = C.estado.fechamento.maq;
    erroMaq = '';
    if (!m.comprovante) erroMaq = 'Envie a foto da maquininha antes de salvar.';
    else if (FORMAS_CARTAO.some(([k]) => centavos(m.valores[k]) === null)) erroMaq = 'Informe crédito, débito, Pix e voucher no relatório da maquininha.';
    if (erroMaq) return atualizar();
    m.salvo = true;
    U.avisar('Conferência da maquininha salva.');
    atualizar();
  }

  /* ---------- Etapa 3: Relatório final (Folha × PDV × Maquininha) ---------- */

  function etapa3(f) {
    const caixa = el('div', 'caixa-corpo');
    if (!f.relatorioGerado || !f.folha.campos) {
      const s = U.secao('Relatório final');
      s.append(corpoSecao(U.nota('Gere o relatório de vendas na etapa 1 (com a folha lida) para comparar Folha × PDV × Maquininha.')));
      caixa.append(s);
      return caixa;
    }
    const p = pralis();
    const maqVal = f.maq.salvo ? f.maq.valores : null;
    const linhas = CAMPOS_FOLHA.filter(([, , comp]) => comp).map(([k, rotulo]) => {
      const folha = centavos(f.folha.campos[k]);
      const pdv = p[k];
      const cartao = FORMAS_CARTAO.some(([kk]) => kk === k);
      const maq = cartao ? (maqVal ? centavos(maqVal[k]) : null) : undefined;
      const problemas = [];
      let maior = 0;
      if (folha === null) problemas.push('Sem valor na folha');
      else if (folha !== pdv) { problemas.push('Folha ' + moeda(Math.abs(folha - pdv)) + (folha > pdv ? ' a mais' : ' a menos') + ' que o PDV'); maior = Math.max(maior, Math.abs(folha - pdv)); }
      if (cartao) {
        if (maq === null) problemas.push('Maquininha sem leitura');
        else if (maq !== pdv) { problemas.push('Maquininha ' + moeda(Math.abs(maq - pdv)) + (maq > pdv ? ' a mais' : ' a menos') + ' que o PDV'); maior = Math.max(maior, Math.abs(maq - pdv)); }
      }
      return { k, rotulo, folha, pdv, maq, problemas, maior };
    });
    const paraConferir = linhas.filter((l) => l.problemas.length).length;
    const s = U.secao('Folha × PDV × Maquininha');
    s.querySelector('.compras-secao-cab').append(U.situacao(paraConferir ? plural(paraConferir) + ' para conferir' : 'Tudo confere', paraConferir ? 'atencao' : 'positivo'));
    const tabela = U.tabela(
      [
        ['Campo', (l) => l.rotulo],
        ['Folha', (l) => (l.folha === null ? '—' : moeda(l.folha)), 'caixa-num'],
        ['PDV', (l) => moeda(l.pdv), 'caixa-num'],
        ['Maquininha', (l) => (l.maq === undefined ? '—' : l.maq === null ? 'sem leitura' : moeda(l.maq)), 'caixa-num'],
        ['Situação', (l) => {
          const w = el('span', 'caixa-situacao-linha');
          if (!l.problemas.length) { w.append(U.situacao('✓ Confere', 'positivo')); return w; }
          w.append(U.situacao(l.maior ? '▲▼ Diferença ' + moeda(l.maior) : 'Sem valor', 'negativo'), el('small', null, l.problemas.join(' · ')));
          return w;
        }],
      ],
      linhas
    );
    s.append(tabela, corpoSecao(U.nota('Esta etapa só informa: divergência de folha ou de maquininha não bloqueia o fechamento nem vira quebra. Só a diferença da contagem física gera quebra.')));
    caixa.append(s);

    const o = U.secao('Outros dados da folha');
    const campos = f.folha.campos;
    const soma = ['clientes', 'credito', 'debito', 'dinheiro', 'pix', 'voucher'].reduce((t, k) => t + (centavos(campos[k]) || 0), 0);
    o.append(corpoSecao(dl([['Saldo Inicial', moeda(centavos(campos.saldoInicial) || 0)], ['CLIENTES (VND/TRANS)', moeda(centavos(campos.clientes) || 0)], ['Saldo Final Dinheiro', moeda(centavos(campos.saldoFinal) || 0)]]),
      ...(soma !== (centavos(campos.total) || 0) ? [el('p', 'caixa-alerta', 'A soma das formas de pagamento da folha não dá o Total impresso.')] : []),
      ...(f.folha.correcao.trim() ? [el('p', 'caixa-alerta', 'Correção manual da folha: ' + f.folha.correcao.trim())] : [])));
    caixa.append(o);

    const r = C.resumo();
    const t = C.estado.turno;
    const mv = U.secao('Movimentações do turno');
    mv.append(corpoSecao(dl([['Entradas no PDV', moeda(r.entradas)], ['Transferências recebidas', moeda(C.estado.abertura.valorInicial + r.recebido)], ['Sangrias', moeda(r.sangrias)],
      ['Despesas / Mercadorias / Retiradas', moeda(0)], ['Vendas canceladas', String(t.canceladas.length)],
      ['Sangrias com lacre', C.sangriasDoCaixa().length ? C.sangriasDoCaixa().map((x) => x.lacre + ' (' + moeda(x.valor) + ')').join(' · ') : 'Nenhuma']])));
    caixa.append(mv);
    return caixa;
  }
  const plural = (n) => n + (n === 1 ? ' linha' : ' linhas');

  /* ---------- Etapa 4: Fechamento ---------- */

  function pendencias(f) {
    const l = [];
    if (!f.contagem.registrada) l.push('Registre a contagem do dinheiro em Vendas e gere o relatório.');
    if (!f.lacre) l.push('Informe o lacre de fechamento.');
    if (f.contagem.registrada && f.contagem.registrada.diferenca !== 0 && !f.observacao.trim()) l.push(f.contagem.registrada.diferenca < 0 ? 'Explique a falta na observação.' : 'Explique a sobra na observação.');
    if (!f.gerenteOk) l.push('Confirme o gerente responsável.');
    if (!f.folhaFechamento) l.push('Anexe a foto da folha de fechamento.');
    return l;
  }

  function etapa4(f) {
    const a = C.estado.abertura;
    const caixa = el('div', 'caixa-corpo');
    const s = U.secao('Fechamento');
    const itens = [];
    // Esperado × contado: só aparece aqui (etapa 4), como manda a contagem cega.
    if (f.contagem.registrada) {
      const d = f.contagem.registrada.diferenca;
      const alerta = el('p', 'caixa-diferenca ' + (d < 0 ? 'falta' : d > 0 ? 'sobra' : 'bateu'));
      alerta.setAttribute('role', 'status');
      alerta.textContent = d < 0 ? '▼ A falta de ' + moeda(-d) + ' gera quebra de caixa e notifica a Tesouraria. A observação é obrigatória.'
        : d > 0 ? '▲ Há sobra de ' + moeda(d) + '; não há quebra positiva, mas a Tesouraria será notificada. A observação é obrigatória.' : '✓ Confere com o sistema.';
      itens.push(dl([['Esperado (sistema)', moeda(f.contagem.registrada.esperado)], ['Contado', moeda(f.contagem.registrada.total)], ['Diferença', (d > 0 ? '+' : '') + moeda(d)]]), alerta);
    } else itens.push(U.nota('Registre a contagem do dinheiro na etapa 1 para ver o esperado × contado.'));

    const ac = el('div', 'caixa-acoes caixa-acoes-esq');
    ac.append(botao(f.folhaFechamento ? 'Trocar folha de fechamento (simulado)' : 'Anexar folha de fechamento do malote (simulado)', () => { f.folhaFechamento = 'folha-fechamento-malote.jpg'; atualizar(); }, 'btn secondary'));
    if (f.folhaFechamento) {
      ac.append(U.situacao(f.folhaFechamento, 'info'), botao('Remover', () => { f.folhaFechamento = null; atualizar(); }, 'btn secondary'));
    }
    itens.push(ac);

    const lacre = seletor([a.lacreFechamento], f.lacre, 'Escolha…');
    lacre.onchange = () => { f.lacre = lacre.value; atualizar(); };
    itens.push(campo('Lacre de fechamento', lacre, 'A Tesouraria reservou este lacre no malote; o servidor recusa qualquer outro.'));

    const obs = el('textarea');
    obs.rows = 2;
    obs.value = f.observacao;
    obs.oninput = () => { f.observacao = obs.value; if (fecharRefresh) fecharRefresh(); };
    const diverge = f.contagem.registrada && f.contagem.registrada.diferenca !== 0;
    itens.push(campo(diverge ? 'Observação da divergência (obrigatória)' : 'Observação do fechamento', obs, 'Máximo 500 caracteres. (No principal também dá para ditar por voz.)'));
    itens.push(dl([['Caixa responsável', a.responsavel], ['Gerente responsável', f.gerente || 'Falta confirmar']]));

    // Pendências e botão são atualizados no lugar (digitar a observação não pode trocar o botão antes do clique).
    const box = el('div', 'caixa-pendencias');
    box.setAttribute('role', 'alert');
    const b = botao('', revisar, 'btn');
    fecharRefresh = () => {
      const pend = pendencias(f);
      box.replaceChildren();
      if (pend.length) { box.append(el('b', null, 'Antes de encerrar:')); const ul = el('ul'); pend.forEach((p) => ul.append(el('li', null, p))); box.append(ul); }
      const falta = f.contagem.registrada && f.contagem.registrada.diferenca < 0;
      b.textContent = falta ? 'Encerrar com divergência' : 'Encerrar e enviar à Tesouraria';
      b.disabled = pend.length > 0;
    };
    fecharRefresh();
    itens.push(box);
    const acoes = el('div', 'caixa-acoes');
    acoes.append(b);
    itens.push(acoes);
    s.append(corpoSecao(...itens));
    caixa.append(s);
    return caixa;
  }

  function revisar() {
    const f = C.estado.fechamento;
    const a = C.estado.abertura;
    const reg = f.contagem.registrada;
    C.dialogo({
      titulo: 'Revisar fechamento do caixa',
      subtitulo: 'Confira antes de encerrar. Depois de confirmado não dá para editar.',
      rotuloSalvar: 'Confirmar fechamento',
      montar: (form) => {
        form.append(dl([
          ['Total contado', moeda(reg.total)], ['Diferença', reg.diferenca === 0 ? 'Conferência: bateu' : (reg.diferenca > 0 ? '+' : '') + moeda(reg.diferenca)],
          ['Dinheiro físico', moeda(reg.especie)], ['Moedas', moeda(reg.moedas)], ['Lacre de fechamento', f.lacre],
          ['Caixa responsável', a.responsavel], ['Supervisor responsável', f.gerente], ['Observação', f.observacao.trim() || '—'],
          ['Anexos', 'Folha 1 · CREARE 1 · Comprovantes de cartão 1'],
          ['Maquininha', a.maquininha + ' · C ' + moeda(centavos(f.maq.valores.credito)) + ' · D ' + moeda(centavos(f.maq.valores.debito)) + ' · P ' + moeda(centavos(f.maq.valores.pix)) + ' · V ' + moeda(centavos(f.maq.valores.voucher))],
        ]));
        if (reg.diferenca !== 0) form.append(el('p', reg.diferenca < 0 ? 'caixa-diferenca falta' : 'caixa-diferenca sobra', (reg.diferenca < 0 ? '▼ Falta de ' : '▲ Sobra de ') + moeda(Math.abs(reg.diferenca)) + (reg.diferenca < 0 ? ': gera quebra de caixa.' : ': só notifica a Tesouraria.')));
      },
      salvar: () => {
        const erro = C.fecharCaixa({ lacre: f.lacre, observacao: f.observacao });
        if (erro) return erro;
        U.avisar('Caixa fechado com sucesso.');
        atualizar();
      },
    });
  }

  /* ---------- Caixa fechado ---------- */

  function blocoFechado(h) {
    const s = U.secao('Caixa fechado · ' + h.pdv + ' · ' + h.turno);
    s.querySelector('.compras-secao-cab').append(U.situacao(C.ROTULO_SITUACAO[C.situacaoDe(h)], C.TOM_SITUACAO[C.situacaoDe(h)]));
    const d = h.diferenca;
    const itens = [
      dl([['Fechado por', h.fechadoPor], ['Gerente', h.supervisor], ['Lacre de fechamento', h.lacreFechamento], ['Esperado', moeda(h.esperado)], ['Contado', moeda(h.contado)], ['Diferença', (d > 0 ? '+' : '') + moeda(d)]]),
      el('p', 'caixa-diferenca ' + (d < 0 ? 'falta' : d > 0 ? 'sobra' : 'bateu'), d < 0 ? '▼ Falta de ' + moeda(-d) + ': quebra registrada e Tesouraria avisada.' : d > 0 ? '▲ Sobra de ' + moeda(d) + ': Tesouraria avisada (sem quebra).' : '✓ Bateu: sem diferença.'),
    ];
    if (h.retornoId) itens.push(U.nota('Retorno final ao Cofre: ' + moeda(C.transferencia(h.retornoId).valor) + ' (sem lacre próprio, aguardando conferência da Tesouraria).'));
    const acoes = el('div', 'caixa-acoes');
    acoes.append(botao('Recomeçar a demonstração', () => { C.reiniciar(); }, 'btn secondary'), botao('Ir para a Conferência da Tesouraria', () => C.abrir('conferencia'), 'btn'));
    itens.push(acoes);
    s.append(corpoSecao(...itens));
    return s;
  }

  C.registrar('fechamento', abrir);
})();
