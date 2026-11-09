/*
 * Caixa — Turno (casca). Caixa já aberto, antes do fechamento. Fluxo do Caixa do sistema principal
 * (CaixaResumoPage, CaixaResumoOperacao, CaixaRecebimentosSemLacre, CaixaIndisponibilidadeDialog,
 * CaixaSangriasDialog, CaixaVendasDoTurnoDialog, CaixaVendasCanceladasDialog, CaixaInicioFechamentoDialog).
 * Tudo vem do estado único (CicluzCaixa.estado), em centavos, fictício e só em memória.
 *
 * Adaptação da casca: no principal o formulário de sangria nasce em Transferências, fora do Caixa.
 * Aqui o botão "Nova sangria" abre esse formulário dentro do próprio módulo.
 * Contagem cega (R-232): o operador não vê o saldo; a sangria acima do disponível só diz "acima do
 * disponível no caixa", sem número.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const { el, botao, campo, entrada, seletor } = U;
  const { moeda, centavos } = C;

  const Dlg = window.CicluzCaixaTurnoDialogos;
  const CAMINHO = 'Entradas · Vendas / Faturamento / Lançamentos / VND - Turno do Caixa';
  const MOTIVOS = [
    'Falta de energia na loja', 'Oscilação ou pane elétrica', 'Internet caiu', 'Esbarrão em fio / cabo desconectado',
    'Computador travou, tive que reiniciar', 'Limpeza ou manutenção na loja', 'Atualização do sistema (Windows)', 'Outro',
  ];
  const ICONE_CADEADO = '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>';
  const MOTIVO_TRAVA = 'há dinheiro sem lacre aguardando sua confirmação em Recebimentos pendentes.';

  let tela = null;
  let conteudo = null;
  Dlg.aoMudar(() => atualizar());

  function abrir() {
    if (!tela) tela = C.criarTela({ id: 'caixa-turno', titulo: 'VND - Turno do Caixa', caminho: CAMINHO });
    tela.ativar();
    montar();
  }

  function montar() {
    // A faixa (aviso + "Ver como") fica fora do que é redesenhado, para o foco não se perder ao trocar de visão.
    conteudo = el('div', 'caixa-corpo');
    tela.body.replaceChildren(
      C.faixaDemo('Demonstração: dados fictícios, nada é gravado. O operador não vê o saldo esperado até o fechamento.', atualizar, ['operador', 'gerente']),
      conteudo
    );
    atualizar();
  }

  const gerencia = () => C.estado.perfil === 'gerente';
  const dl = (pares) => {
    const caixa = el('dl', 'caixa-declarado');
    pares.forEach(([t, v]) => { const d = el('div'); d.append(el('dt', null, t), el('dd', null, v)); caixa.append(d); });
    return caixa;
  };
  const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);
  /** Corpo da seção com o respiro de 14 px (as listas ficam sem ele, de borda a borda). */
  const corpo = (...nos) => { const c = el('div', 'compras-corpo'); c.append(...nos); return c; };

  function atualizar() {
    const e = C.estado;
    if (e.status === 'fechado') return conteudo.replaceChildren(semCaixa());
    if (e.status === 'em_fechamento') return conteudo.replaceChildren(vendasEncerradas());
    const r = C.resumo();
    conteudo.replaceChildren(
      ...blocoMensagensGerencia(),
      ...(r.pendentes.length ? [blocoRecebimentos(r.pendentes)] : []),
      blocoPdv(), blocoCaixaAberto(), blocoResumo(r), blocoAcoes(r)
    );
  }

  /* ---------- Sem caixa aberto / vendas encerradas ---------- */

  function semCaixa() {
    const s = U.secao('Caixa ainda não aberto');
    const acoes = el('div', 'caixa-acoes');
    acoes.append(botao('Ir para a Abertura do caixa', () => C.abrir('abertura'), 'btn'));
    s.append(corpo(U.nota('O turno só existe depois da abertura. Abra o caixa para acompanhar o resumo, a sangria, o PDV e as vendas.'), acoes));
    return s;
  }

  function vendasEncerradas() {
    const a = C.estado.abertura;
    const s = U.secao('Vendas encerradas · ' + a.pdv + ' · ' + a.turno);
    s.querySelector('.compras-secao-cab').append(U.situacao('Aguardando conferência', 'atencao'));
    const acoes = el('div', 'caixa-acoes');
    acoes.append(botao('Recomeçar a demonstração', () => { C.reiniciar(); atualizar(); }, 'btn secondary'), botao('Ir para o Fechamento', () => C.abrir('fechamento'), 'btn'));
    s.append(corpo(U.nota('O PDV parou de receber vendas e o caixa segue para a conferência final: gerente, contagem, folha, maquininha, lacre.'), acoes));
    return s;
  }

  /* ---------- Mensagens da Gerência (enviadas em Gerência → Mensagens) ---------- */

  function blocoMensagensGerencia() {
    const pdv = C.estado.abertura.pdv;
    const pend = [];
    C.estado.mensagens.filter((m) => !m.encerrada).forEach((m) => m.entregas.forEach((x) => {
      if (x.pdv === pdv && (x.situacao === 'entregue' || x.situacao === 'visualizada')) pend.push([m, x]);
    }));
    return pend.map(([m, x]) => {
      x.situacao = 'visualizada'; // aparecer na tela já conta como visualizada
      const s = U.secao('Mensagem da Gerência');
      const acoes = el('div', 'caixa-acoes');
      acoes.append(botao('Fechar', () => { x.situacao = 'fechada_sem_confirmar'; atualizar(); }, 'btn secondary'), botao('Entendi', () => { x.situacao = 'confirmada'; atualizar(); }, 'btn'));
      s.append(corpo(el('b', null, m.titulo), U.nota(m.corpo), acoes));
      return s;
    });
  }

  /* ---------- 1. Recebimentos pendentes (quem confirma é o operador) ---------- */

  function blocoRecebimentos(pendentes) {
    const s = U.secao('Recebimentos pendentes', pendentes.length);
    s.append(corpo(U.nota('Dinheiro sem lacre enviado para este caixa. Conte e confirme; só depois ele entra no saldo. O caixa só fecha depois de resolver.')));
    const lista = el('div', 'compras-lista');
    pendentes.forEach((r) => {
      // R-028: quem enviou não confirma nem recusa o próprio envio (RECEBIMENTO_PROPRIO_ENVIO): só o operador do caixa.
      const proprio = C.estado.perfil === 'gerente' && /Gerente/.test(r.criadoPor);
      const direita = proprio ? [U.situacao('Quem enviou não confirma', 'neutro')] : [
        botao('Confirmar recebimento', () => { C.resolverRecebimento(r.id, true); U.avisar('Recebimento de ' + moeda(r.valor) + ' confirmado.'); atualizar(); }, 'btn'),
        botao('Não recebi', () => Dlg.naoRecebi(r), 'btn secondary caixa-perigo'),
      ];
      const linha = U.linhaLista({
        titulo: moeda(r.valor),
        detalhe: 'De ' + C.conta(r.origem).nome + ' · enviado por ' + r.criadoPor + ' · ' + r.criadoEm,
        direita,
      });
      const texto = linha.querySelector('.compras-linha-texto');
      texto.append(el('small', null, 'Físico ' + moeda(r.especie) + ' · Moedas ' + moeda(r.moedas)));
      if (r.observacao) texto.append(el('small', 'caixa-obs', r.observacao));
      lista.append(linha);
    });
    s.append(lista);
    return s;
  }

  /* ---------- 2. PDV ligado / desligado ---------- */

  function blocoPdv() {
    const t = C.estado.turno;
    const s = U.secao('Controle do PDV');
    const ligado = t.pdvLigado;
    const linha = el('div', 'caixa-pdv');
    linha.append(
      U.situacao(ligado ? 'PDV ligado' : 'PDV desligado', ligado ? 'positivo' : 'negativo'),
      el('span', 'caixa-pdv-texto', ligado ? 'Operação normal' : 'Parado desde ' + t.parada.desde)
    );
    linha.append(botao(ligado ? 'Registrar PDV desligado' : 'Computador voltou', ligado ? dialogoParada : dialogoRetorno, 'btn secondary'));
    const notas = [];
    if (!ligado) notas.push(U.nota('Motivos: ' + t.parada.motivos.join(', ') + (t.parada.outro ? ' (' + t.parada.outro + ')' : '') + '.'));
    if (t.paradas.length) notas.push(U.nota(plural(t.paradas.length, 'parada registrada', 'paradas registradas') + ' neste turno.'));
    s.append(corpo(linha, ...notas));
    return s;
  }

  function dialogoParada() {
    C.dialogo({
      titulo: 'PDV desligado',
      subtitulo: 'O PDV está ligado. Ao registrar os motivos abaixo, ele ficará marcado como desligado.',
      rotuloSalvar: 'Registrar parada',
      montar: (form) => {
        form.append(U.nota('Solicitação iniciada às ' + C.hora() + '. A hora oficial será confirmada ao registrar a parada.'));
        const marcados = new Set();
        const outro = el('textarea');
        outro.rows = 2;
        const campoOutro = campo('Descreva o outro motivo', outro);
        campoOutro.hidden = true;
        MOTIVOS.forEach((m) => {
          const l = el('label', 'compras-interruptor');
          const i = entrada('checkbox', null);
          i.onchange = () => {
            if (i.checked) marcados.add(m); else marcados.delete(m);
            if (m === 'Outro') campoOutro.hidden = !i.checked;
          };
          l.append(i, el('span', null, m));
          form.append(l);
        });
        form.append(campoOutro);
        return { marcados, outro };
      },
      salvar: ({ marcados, outro }) => {
        if (!marcados.size) return 'Marque pelo menos um motivo.';
        if (marcados.has('Outro') && !outro.value.trim()) return 'Obrigatório para Outro.';
        const t = C.estado.turno;
        t.pdvLigado = false;
        t.parada = { desde: C.hora(), motivos: MOTIVOS.filter((m) => marcados.has(m)), outro: marcados.has('Outro') ? outro.value.trim() : '' };
        U.avisar('Parada do PDV registrada às ' + t.parada.desde + '.');
        atualizar();
      },
    });
  }

  function dialogoRetorno() {
    const t = C.estado.turno;
    C.dialogo({
      titulo: 'PDV desligado',
      subtitulo: 'O PDV está desligado desde ' + t.parada.desde + '.',
      rotuloSalvar: 'Computador voltou',
      montar: (form) => { form.append(el('p', null, 'Quando o computador voltar a funcionar, registre o retorno para concluir este intervalo no histórico do caixa.')); },
      salvar: () => {
        t.paradas.push({ ...t.parada, ate: C.hora() });
        t.parada = null;
        t.pdvLigado = true;
        U.avisar('Retorno do PDV registrado.');
        atualizar();
      },
    });
  }

  /* ---------- 3. Caixa aberto ---------- */

  function blocoCaixaAberto() {
    const a = C.estado.abertura;
    const t = C.estado.turno;
    const s = U.secao('Caixa aberto');
    s.querySelector('.compras-secao-cab').append(U.situacao('Operação em andamento', 'positivo'));
    s.append(corpo(dl([
      ['PDV', a.pdv], ['Turno', a.turno], ['Aberto em', a.abertoEm],
      ['Responsável', a.responsavel], ['Supervisor', a.supervisor], ['Maquininha', a.maquininha],
      ['Lacre do malote de abertura', a.lacre],
      ['Lacres para sangria', C.bolsasLivres().length ? C.bolsasLivres().join(' · ') : 'Nenhum disponível'],
      ['Lacre reservado para fechar este caixa', a.lacreFechamento],
    ])));
    return s;
  }

  /* ---------- 4. Resumo da operação ---------- */

  function blocoResumo(r) {
    const t = C.estado.turno;
    const s = U.secao('Resumo da operação');
    const cartoes = el('div', 'caixa-cartoes');

    const saldo = el('div', 'caixa-cartao ancora');
    saldo.append(el('small', null, 'Saldo do caixa'));
    if (gerencia()) {
      saldo.append(el('strong', null, moeda(r.saldo)), el('small', null, 'Saldo físico do turno'));
    } else {
      const lacrado = el('span', 'caixa-lacrado');
      lacrado.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONE_CADEADO + '</svg>';
      lacrado.append(document.createTextNode('Saldo lacrado até o fechamento'));
      saldo.append(lacrado, el('small', null, 'O valor esperado só aparece depois da sua contagem, na etapa 4 do fechamento.'));
    }

    const entradas = el('button', 'caixa-cartao');
    entradas.type = 'button';
    entradas.setAttribute('aria-label', 'Consultar vendas nas Entradas: ' + moeda(r.entradas));
    entradas.onclick = Dlg.vendas;
    entradas.append(el('small', null, 'Entradas'), el('strong', null, moeda(r.entradas)),
      el('small', null, 'Vendas do PDV neste turno · ' + plural(t.vendas.length, 'venda', 'vendas')));
    cartoes.append(saldo, entradas);
    s.append(corpo(cartoes));

    s.append(el('h4', 'caixa-subtitulo', 'Movimentações'));
    const mov = el('div', 'compras-lista');
    mov.append(
      U.linhaLista({
        titulo: 'Transferências recebidas',
        detalhe: r.recebido ? 'Recebimentos confirmados neste turno' : 'Nenhum recebimento confirmado',
        direita: el('span', 'caixa-dinheiro', moeda(r.recebido)),
      }),
      U.linhaLista({
        titulo: 'Sangrias',
        detalhe: C.sangriasDoCaixa().length ? 'Ver histórico e lacres' : 'Nenhuma sangria realizada',
        direita: el('span', 'caixa-dinheiro', moeda(r.sangrias)),
        aoClicar: Dlg.sangrias,
      }),
      U.linhaLista({
        titulo: 'Vendas canceladas',
        detalhe: plural(t.canceladas.length, 'venda cancelada', 'vendas canceladas'),
        direita: el('span', 'caixa-dinheiro', String(t.canceladas.length)),
        aoClicar: Dlg.canceladas,
      })
    );
    s.append(mov);

    s.append(el('h4', 'caixa-subtitulo', 'Vendas por forma de pagamento'));
    const formas = el('div', 'compras-lista');
    r.porForma.forEach(([forma, valor, qtd]) => formas.append(U.linhaLista({
      titulo: forma, detalhe: plural(qtd, 'venda', 'vendas'), direita: el('span', 'caixa-dinheiro', moeda(valor)),
    })));
    s.append(formas);
    return s;
  }

  /* ---------- 5. Ações: nova sangria e encerrar vendas ---------- */

  function blocoAcoes(r) {
    const s = U.secao('Encerrar turno');
    const travado = r.pendentes.length > 0;
    const aviso = U.nota(travado
      ? 'Fechamento travado: ' + MOTIVO_TRAVA
      : 'Confira os valores e lance tudo antes de continuar: depois de encerrar as vendas, a sangria também fica bloqueada.');
    const acoes = el('div', 'caixa-acoes');
    acoes.append(botao('Nova sangria', Dlg.novaSangria, 'btn secondary'));
    const fechar = botao('Fechar caixa', Dlg.encerrar, 'btn');
    fechar.disabled = travado;
    if (travado) fechar.title = 'Resolva os recebimentos pendentes para fechar.';
    acoes.append(fechar);
    s.append(corpo(aviso, acoes));
    return s;
  }

  // Recomeçar a demonstração volta o "Ver como" para Operador: a faixa precisa ser refeita junto.
  C.aoReiniciar(() => { if (tela) montar(); });
  C.registrar('turno', abrir);
})();
