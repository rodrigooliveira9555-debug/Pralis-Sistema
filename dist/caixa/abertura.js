/*
 * Caixa — Abertura (casca). Três blocos como no sistema principal (CaixaResumoMaloteAbertura +
 * CaixaAberturaConfirmacaoDialog): onde operar, conferir o malote de abertura pelo lacre e
 * responsáveis/terminal. A abertura só é confirmada depois da conferência do malote.
 * Dados FICTÍCIOS, em centavos; nada é gravado e tudo some ao recarregar.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const { el, botao, campo, entrada, seletor } = U;

  // Login de posto: cada conta de operador é um PDV + turno (PDV 1-4 × Manhã/Tarde).
  const POSTO = { pdv: 'PDV 1', turno: 'Manhã', usuario: 'pdv1.manha' };
  // Malote que a Tesouraria declarou para o lacre 001 (o único válido na casca).
  const MALOTE = { lacre: '001', dinheiro: 30000, moedas: 5000, lacresSangria: ['SNG-014', 'SNG-015'], lacreFechamento: 'FCH-001', rota: 'Malote Cofre → Conta PDV 1' };
  const RESPONSAVEIS = ['Ana Paula', 'Bruna Costa', 'Carlos Henrique'];
  const SUPERVISORES = ['Marcos Lima', 'Patrícia Souza'];
  const MAQUININHAS = [['pagbank-1', 'PagBank Moderninha · série 8C12-4471'], ['pagbank-2', 'PagBank Smart · série 9A03-1180']];
  const CAMINHO = 'Entradas · Vendas / Faturamento / Caixas / Abertura do caixa';

  const moeda = (centavos) => (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  /** "1.234,56" → 123456; vazio ou inválido → null. */
  function centavos(texto) {
    const limpo = String(texto || '').replace(/[R$\s.]/g, '').replace(',', '.');
    if (!limpo || !/^\d+(\.\d{1,2})?$/.test(limpo)) return null;
    return Math.round(Number(limpo) * 100);
  }
  const hora = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const novoEstado = () => ({ lacre: '', encontrado: false, conferido: null, dinheiro: '', moedas: '', motivo: '', responsavel: '', supervisor: '', maquininha: '', tentou: false, abertoEm: null });
  let estado = novoEstado();
  let tela = null;
  let espera = 0;

  function abrir() {
    if (!tela) tela = C.criarTela({ id: 'caixa-abertura', titulo: 'Abertura do caixa', caminho: CAMINHO });
    tela.ativar();
    render();
  }

  function bloco(numero, titulo, texto, situacao) {
    const s = el('section', 'compras-secao caixa-bloco');
    const cab = el('div', 'caixa-bloco-cab');
    cab.append(el('span', 'caixa-bloco-num ' + situacao, String(numero)));
    const t = el('div');
    t.append(el('h3', null, titulo), el('p', null, texto));
    cab.append(t);
    s.append(cab);
    return s;
  }

  function bloqueios() {
    const lista = [];
    if (!estado.encontrado) lista.push('Informe o lacre do malote de abertura.');
    else if (estado.conferido === null) lista.push('Responda se o malote confere.');
    else if (estado.conferido === false) {
      const d = centavos(estado.dinheiro), m = centavos(estado.moedas);
      if (d === null || m === null) lista.push('Informe o dinheiro e as moedas contados.');
      else if (d + m !== MALOTE.dinheiro + MALOTE.moedas && !estado.motivo.trim()) lista.push('Explique o motivo da divergência.');
    }
    if (!estado.responsavel) lista.push('Escolha o responsável pelo caixa.');
    if (!estado.supervisor) lista.push('Escolha o supervisor responsável.');
    if (!estado.maquininha) lista.push('Escolha a maquininha de cartão.');
    return lista;
  }

  function render() {
    if (estado.abertoEm) return renderAberto();
    const aviso = U.nota('Demonstração: dados fictícios, nada é gravado. Na casca, o único lacre válido é 001.');
    aviso.classList.add('caixa-aviso');
    const intro = U.nota('Preencha os três blocos. A abertura só é confirmada depois da conferência do malote.');
    const passo = !estado.encontrado || estado.conferido === null ? 2 : 3;

    const b1 = bloco(1, 'Onde você vai operar', 'O posto do caixa deste login.', 'feito');
    const g1 = el('div', 'caixa-grade');
    g1.append(campo('Ponto de venda', entrada('text', POSTO.pdv, { readOnly: true }), 'Travado pelo login do posto.'), campo('Turno do caixa', entrada('text', POSTO.turno, { readOnly: true })));
    b1.append(g1);

    const b2 = bloco(2, 'Conferir malote de abertura', MALOTE.rota, passo > 2 ? 'feito' : 'ativo');
    b2.append(blocoMalote());

    const b3 = bloco(3, 'Responsáveis e terminal', 'Quem responde pelo caixa e qual maquininha vai usar.', passo === 3 ? 'ativo' : '');
    const g3 = el('div', 'caixa-grade');
    const escolha = (rotulo, opcoes, chave, dica) => {
      const s = seletor(opcoes, estado[chave], 'Escolha…');
      s.required = true;
      s.onchange = () => { estado[chave] = s.value; };
      return campo(rotulo, s, dica);
    };
    g3.append(
      escolha('Responsável pelo caixa', RESPONSAVEIS, 'responsavel'),
      escolha('Supervisor responsável', SUPERVISORES, 'supervisor'),
      escolha('Maquininha de cartão', MAQUININHAS, 'maquininha', 'Obrigatória para o relatório final deste turno.'),
      campo('Usuário logado', entrada('text', POSTO.usuario, { readOnly: true })),
    );
    b3.append(g3);

    const pend = el('div', 'caixa-pendencias');
    pend.setAttribute('role', 'alert');
    const lista = estado.tentou ? bloqueios() : [];
    if (lista.length) {
      pend.append(el('b', null, 'Antes de abrir:'));
      const ul = el('ul');
      lista.forEach((t) => ul.append(el('li', null, t)));
      pend.append(ul);
    }

    const acoes = el('div', 'caixa-acoes');
    acoes.append(el('small', null, 'Abra somente quando estiver no PDV.'), botao('Conferir e abrir caixa', tentarAbrir, 'btn'));
    tela.body.replaceChildren(aviso, intro, b1, b2, b3, pend, acoes);
  }

  function blocoMalote() {
    const box = el('div', 'caixa-malote');
    const lacre = entrada('text', estado.lacre, { placeholder: 'Ex.: 001', autocomplete: 'off', required: true });
    const status = el('small', 'caixa-status');
    status.setAttribute('role', 'status');
    if (estado.lacre && !estado.encontrado) { status.textContent = 'Lacre não encontrado. Confira o número no malote.'; status.classList.add('erro'); }
    lacre.oninput = () => {
      clearTimeout(espera);
      estado.lacre = lacre.value;
      estado.encontrado = false;
      estado.conferido = null;
      status.classList.remove('erro');
      status.textContent = lacre.value.trim() ? 'Consultando a composição declarada do malote…' : '';
      if (!lacre.value.trim()) return;
      // Simula a consulta do lacre na Tesouraria.
      espera = setTimeout(() => {
        estado.encontrado = lacre.value.trim() === MALOTE.lacre;
        render();
        const novo = tela.body.querySelector('.caixa-malote input');
        if (novo) { novo.focus(); novo.setSelectionRange(novo.value.length, novo.value.length); }
      }, 500);
    };
    const g = el('div', 'caixa-grade');
    g.append(campo('Lacre do malote de abertura', lacre, 'Use o lacre do malote recebido da Tesouraria. Ele é diferente do lacre de fechamento.'));
    box.append(g, status);
    if (!estado.encontrado) return box;

    const dl = el('dl', 'caixa-declarado');
    [['Malote declarado', moeda(MALOTE.dinheiro + MALOTE.moedas)], ['Dinheiro', moeda(MALOTE.dinheiro)], ['Moedas', moeda(MALOTE.moedas)],
      ['Lacres para sangria', MALOTE.lacresSangria.join(' · ')], ['Lacre reservado para fechar este caixa', MALOTE.lacreFechamento]]
      .forEach(([t, v]) => { const d = el('div'); d.append(el('dt', null, t), el('dd', null, v)); dl.append(d); });

    const conf = el('fieldset', 'caixa-conferencia');
    conf.append(el('legend', null, 'O valor e a composição conferem com o que foi recebido?'));
    const opcoes = el('div', 'compras-chips');
    [[true, 'Sim, confere'], [false, 'Não confere']].forEach(([v, t]) => {
      const b = botao(t, () => { estado.conferido = v; render(); }, 'compras-chip' + (estado.conferido === v ? ' ativo' : ''));
      b.setAttribute('aria-pressed', String(estado.conferido === v));
      opcoes.append(b);
    });
    conf.append(opcoes);
    if (estado.conferido === false) conf.append(contagem());
    box.append(dl, conf);
    return box;
  }

  /** "Não confere": conta dinheiro e moedas; havendo diferença, o motivo é obrigatório. */
  function contagem() {
    const g = el('div', 'caixa-grade');
    const linha = el('p', 'caixa-diferenca');
    linha.setAttribute('role', 'status');
    const motivo = el('textarea');
    motivo.rows = 2;
    motivo.value = estado.motivo;
    motivo.oninput = () => { estado.motivo = motivo.value; };
    const campoMotivo = campo('Motivo da divergência', motivo);
    campoMotivo.classList.add('caixa-largo');
    const atualizar = () => {
      const d = centavos(estado.dinheiro), m = centavos(estado.moedas);
      const dif = d === null || m === null ? 0 : d + m - (MALOTE.dinheiro + MALOTE.moedas);
      linha.hidden = campoMotivo.hidden = !dif;
      linha.className = 'caixa-diferenca ' + (dif < 0 ? 'falta' : 'sobra');
      linha.textContent = dif ? (dif < 0 ? '▼ Falta de ' : '▲ Sobra de ') + moeda(Math.abs(dif)) + ' em relação ao declarado.' : '';
    };
    const dinheiro = (rotulo, chave) => {
      const i = entrada('text', estado[chave], { inputMode: 'decimal', placeholder: '0,00', required: true });
      i.oninput = () => { estado[chave] = i.value; atualizar(); };
      return campo(rotulo, i);
    };
    g.append(dinheiro('Dinheiro físico contado (R$)', 'dinheiro'), dinheiro('Moedas contadas (R$)', 'moedas'), linha, campoMotivo);
    linha.classList.add('caixa-largo');
    atualizar();
    return g;
  }

  function tentarAbrir() {
    estado.tentou = true;
    if (bloqueios().length) { render(); tela.body.querySelector('.caixa-pendencias').scrollIntoView({ block: 'center' }); return; }
    const maq = MAQUININHAS.find((m) => m[0] === estado.maquininha)[1];
    const contado = (centavos(estado.dinheiro) || 0) + (centavos(estado.moedas) || 0);
    C.dialogo({
      titulo: 'Confirmar abertura do caixa',
      subtitulo: 'Revise o turno e o malote antes de iniciar as vendas.',
      rotuloSalvar: 'Confirmar e abrir',
      montar: (form) => {
        form.append(el('p', 'caixa-alerta', 'A primeira venda já começa a contar neste turno.'));
        const dl = el('dl', 'caixa-declarado');
        [['PDV', POSTO.pdv], ['Turno', POSTO.turno], ['Lacre do malote', estado.lacre.trim()], ['Maquininha', maq], ['Responsável do caixa', estado.responsavel], ['Supervisor', estado.supervisor]]
          .forEach(([t, v]) => { const d = el('div'); d.append(el('dt', null, t), el('dd', null, v)); dl.append(d); });
        form.append(dl);
        form.append(estado.conferido
          ? el('p', 'caixa-diferenca bateu', '✓ Composição confirmada: dinheiro ' + moeda(MALOTE.dinheiro) + ' · moedas ' + moeda(MALOTE.moedas) + '.')
          : el('p', 'caixa-diferenca falta', 'Contagem informada: ' + moeda(contado) + ' para ' + moeda(MALOTE.dinheiro + MALOTE.moedas) + ' declarado.' + (estado.motivo.trim() ? ' Motivo: ' + estado.motivo.trim() : '')));
      },
      salvar: () => { estado.abertoEm = hora(); render(); U.avisar('Caixa aberto às ' + estado.abertoEm + '.'); },
    });
  }

  function renderAberto() {
    const s = el('section', 'compras-secao caixa-bloco');
    const cab = el('div', 'compras-secao-cab');
    cab.append(el('h3', null, 'Caixa aberto · ' + POSTO.pdv + ' · ' + POSTO.turno), U.situacao('Aberto às ' + estado.abertoEm, 'positivo'));
    s.append(cab, U.nota('Responsável: ' + estado.responsavel + ' · Supervisor: ' + estado.supervisor + ' · Lacre ' + estado.lacre.trim() + '.'),
      U.nota('As próximas telas da casca (turno, sangria, fechamento e Tesouraria) ainda serão desenhadas.'));
    const acoes = el('div', 'caixa-acoes');
    acoes.append(botao('Recomeçar a demonstração', () => { estado = novoEstado(); render(); }, 'btn secondary'));
    tela.body.replaceChildren(s, acoes);
  }

  C.registrar('abertura', abrir);
})();
