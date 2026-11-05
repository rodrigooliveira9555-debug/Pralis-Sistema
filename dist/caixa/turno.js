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

  const CAMINHO = 'Entradas · Vendas / Faturamento / Caixas / Turno do caixa';
  const MOTIVOS = [
    'Falta de energia na loja', 'Oscilação ou pane elétrica', 'Internet caiu', 'Esbarrão em fio / cabo desconectado',
    'Computador travou, tive que reiniciar', 'Limpeza ou manutenção na loja', 'Atualização do sistema (Windows)', 'Outro',
  ];
  const ICONE_CADEADO = '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>';
  const MOTIVO_TRAVA = 'há dinheiro sem lacre aguardando sua confirmação em Recebimentos pendentes.';

  let tela = null;
  let conteudo = null;

  function abrir() {
    if (!tela) tela = C.criarTela({ id: 'caixa-turno', titulo: 'Turno do caixa', caminho: CAMINHO });
    tela.ativar();
    montar();
  }

  function montar() {
    // A faixa (aviso + "Ver como") fica fora do que é redesenhado, para o foco não se perder ao trocar de visão.
    conteudo = el('div', 'caixa-corpo');
    tela.body.replaceChildren(
      C.faixaDemo('Demonstração: dados fictícios, nada é gravado. O operador não vê o saldo esperado até o fechamento.', atualizar),
      conteudo
    );
    atualizar();
  }

  const gerencia = () => C.estado.perfil === 'gerencia';
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
    acoes.append(botao('Recomeçar a demonstração', () => { C.reiniciar(); atualizar(); }, 'btn secondary'));
    s.append(corpo(U.nota('O PDV parou de receber vendas e o caixa segue para a conferência final. O fechamento será a próxima tela da casca.'), acoes));
    return s;
  }

  /* ---------- 1. Recebimentos pendentes (quem confirma é o operador) ---------- */

  function blocoRecebimentos(pendentes) {
    const s = U.secao('Recebimentos pendentes', pendentes.length);
    s.append(corpo(U.nota('Dinheiro sem lacre enviado para este caixa. Conte e confirme; só depois ele entra no saldo. O caixa só fecha depois de resolver.')));
    const lista = el('div', 'compras-lista');
    pendentes.forEach((r) => {
      const direita = [
        botao('Confirmar recebimento', () => { r.situacao = 'confirmado'; U.avisar('Recebimento de ' + moeda(r.valor) + ' confirmado.'); atualizar(); }, 'btn'),
        botao('Não recebi', () => dialogoNaoRecebi(r), 'btn secondary caixa-perigo'),
      ];
      const linha = U.linhaLista({
        titulo: moeda(r.valor),
        detalhe: 'De ' + r.origem + ' · enviado por ' + r.enviadoPor + ' · ' + r.hora,
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

  function dialogoNaoRecebi(r) {
    C.dialogo({
      titulo: 'Não recebeu ' + moeda(r.valor) + '?',
      rotuloSalvar: 'Não recebi',
      montar: (form) => { form.append(el('p', null, 'A transferência é cancelada, o valor volta para ' + r.origem + ' e a Tesouraria é avisada.')); },
      salvar: () => { r.situacao = 'recusado'; U.avisar('Recebimento recusado. A Tesouraria foi avisada.'); atualizar(); },
    });
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
      ['Lacres para sangria', t.lacresLivres.length ? t.lacresLivres.join(' · ') : 'Nenhum disponível'],
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
    entradas.onclick = dialogoVendas;
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
        detalhe: t.sangrias.length ? 'Ver histórico e lacres' : 'Nenhuma sangria realizada',
        direita: el('span', 'caixa-dinheiro', moeda(r.sangrias)),
        aoClicar: dialogoSangrias,
      }),
      U.linhaLista({
        titulo: 'Vendas canceladas',
        detalhe: plural(t.canceladas.length, 'venda cancelada', 'vendas canceladas'),
        direita: el('span', 'caixa-dinheiro', String(t.canceladas.length)),
        aoClicar: dialogoCanceladas,
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
    acoes.append(botao('Nova sangria', dialogoNovaSangria, 'btn secondary'));
    const fechar = botao('Fechar caixa', dialogoEncerrar, 'btn');
    fechar.disabled = travado;
    if (travado) fechar.title = 'Resolva os recebimentos pendentes para fechar.';
    acoes.append(fechar);
    s.append(corpo(aviso, acoes));
    return s;
  }

  function dialogoEncerrar() {
    const a = C.estado.abertura;
    C.dialogo({
      titulo: 'Confirmar encerramento das vendas',
      rotuloSalvar: 'Encerrar vendas e ir para conferência',
      montar: (form) => {
        form.append(el('p', 'caixa-alerta', 'Ao confirmar, o PDV ' + a.pdv + ' para de receber vendas neste caixa na hora do encerramento.'));
        form.append(el('p', null, 'Você seguirá para a conferência final na Tesouraria. Depois desta confirmação, não será possível voltar ao caixa aberto nem incluir novas vendas neste turno.'));
        form.append(U.nota('Confirme somente quando a última venda já tiver passado no PDV.'));
      },
      salvar: () => {
        if (C.resumo().pendentes.length) return 'Resolva os recebimentos pendentes antes de encerrar as vendas.';
        C.estado.status = 'em_fechamento';
        U.avisar('Vendas encerradas às ' + C.hora() + '.');
        atualizar();
      },
    });
  }

  /* ---------- Sangria ---------- */

  function dialogoSangrias() {
    const t = C.estado.turno;
    C.dialogo({
      titulo: 'Sangrias deste caixa',
      subtitulo: 'Dinheiro enviado ao cofre, com o lacre de cada sangria.',
      montar: (form) => {
        if (!t.sangrias.length) { form.append(U.vazio('Nenhuma sangria realizada neste caixa.')); } else {
          const total = t.sangrias.reduce((s, x) => s + x.valor, 0);
          form.append(U.nota(plural(t.sangrias.length, 'sangria', 'sangrias') + ' · Total ' + moeda(total)));
          const lista = el('div', 'compras-lista');
          t.sangrias.forEach((x) => lista.append(U.linhaLista({
            titulo: moeda(x.valor) + ' · lacre ' + x.lacre,
            detalhe: 'Dinheiro ' + moeda(x.especie) + ' · moedas ' + moeda(x.moedas) + ' · ' + x.hora,
          })));
          form.append(lista);
        }
        form.append(U.nota('Lacres disponíveis: ' + (t.lacresLivres.length ? t.lacresLivres.join(' · ') : 'nenhum.')));
      },
    });
  }

  function dialogoNovaSangria() {
    const e = C.estado;
    const t = e.turno;
    C.dialogo({
      titulo: 'Nova sangria',
      subtitulo: 'Envie dinheiro físico do caixa aberto para o cofre.',
      rotuloSalvar: 'Salvar sangria',
      montar: (form) => {
        const dinheiro = () => entrada('text', '', { inputMode: 'decimal', placeholder: '0,00' });
        const total = dinheiro();
        const fisico = dinheiro();
        const moedas = dinheiro();
        const soma = el('p', 'caixa-diferenca caixa-largo');
        soma.setAttribute('role', 'status');
        soma.hidden = true;
        // A conta é a da regra: dinheiro + moedas precisam fechar o valor total.
        const conferir = () => {
          const v = centavos(total.value);
          const d = centavos(fisico.value) || 0;
          const m = centavos(moedas.value) || 0;
          soma.hidden = v === null || (!fisico.value.trim() && !moedas.value.trim());
          if (soma.hidden) return;
          const dif = d + m - v;
          soma.className = 'caixa-diferenca caixa-largo ' + (dif === 0 ? 'bateu' : dif < 0 ? 'falta' : 'sobra');
          soma.textContent = dif === 0 ? '✓ Dinheiro e moedas somam o valor total.'
            : dif < 0 ? '▼ Faltam ' + moeda(-dif) + ' para somar o valor total.' : '▲ Passam ' + moeda(dif) + ' do valor total.';
        };
        [total, fisico, moedas].forEach((i) => { i.oninput = conferir; });
        form.append(campo('Valor total (R$)', total), campo('Dinheiro físico (R$)', fisico), campo('Moedas (R$)', moedas), soma);

        let lacre = null;
        if (t.lacresLivres.length) {
          lacre = seletor(t.lacresLivres, '', 'Escolha…');
          form.append(campo('Lacre disponível (obrigatório)', lacre, 'Confira fisicamente o número antes de fechar a bolsa.'));
        } else {
          form.append(U.nota('Nenhum lacre disponível. Solicite à Tesouraria.'));
        }
        form.append(campo('Responsável pela sangria', entrada('text', e.abertura.responsavel, { readOnly: true }), 'Preenchido com quem abriu o caixa.'));
        const obs = el('textarea');
        obs.rows = 2;
        form.append(campo('Observação (opcional)', obs));
        // Só a Gerência vê o teto; o operador recebe a recusa sem o número.
        if (gerencia()) form.append(U.nota('Disponível para retorno: ' + moeda(C.resumo().saldoLivre) + '.'));
        return { total, fisico, moedas, lacre, obs };
      },
      salvar: (c) => {
        const valor = centavos(c.total.value);
        const especie = centavos(c.fisico.value) || 0;
        const moedas = centavos(c.moedas.value) || 0;
        if (!valor) return 'Informe o valor total da sangria, maior que zero.';
        if (especie + moedas !== valor) return 'Dinheiro físico e moedas precisam somar o valor total.';
        if (!c.lacre || !c.lacre.value) return 'Escolha o lacre da sangria.';
        if (valor > C.resumo().saldoLivre) return 'Valor acima do disponível no caixa.';
        t.sangrias.push({ valor, especie, moedas, lacre: c.lacre.value, obs: c.obs.value.trim(), responsavel: e.abertura.responsavel, hora: C.hora() });
        t.lacresLivres = t.lacresLivres.filter((l) => l !== c.lacre.value);
        U.avisar('Sangria de ' + moeda(valor) + ' registrada com o lacre ' + c.lacre.value + '.');
        atualizar();
      },
    });
  }

  /* ---------- Vendas do turno e canceladas ---------- */

  function itensDaVenda(itens) {
    return U.tabela(
      [['Produto', (i) => i[0]], ['Qtd.', (i) => String(i[1]), 'caixa-num'], ['Unitário', (i) => moeda(i[2]), 'caixa-num'], ['Total', (i) => moeda(i[1] * i[2]), 'caixa-num']],
      itens
    );
  }

  function cartaoVenda(v, extra) {
    const d = el('details', 'caixa-venda');
    const resumo = el('summary');
    const texto = el('span', 'caixa-venda-texto');
    texto.append(el('b', null, v.descricao), el('small', null, v.hora + ' · ' + (extra || v.formas.map((f) => f[0]).join(' + '))));
    resumo.append(texto, el('span', 'caixa-dinheiro', moeda(v.valor)));
    d.append(resumo);
    return d;
  }

  function dialogoVendas() {
    const a = C.estado.abertura;
    const todas = C.estado.turno.vendas;
    C.dialogo({
      titulo: 'Vendas do caixa',
      subtitulo: 'Consulta do turno atual · ' + a.pdv + ' · de ' + a.abertoEm + ' até agora',
      largo: true,
      montar: (form) => {
        const produto = entrada('text', '', { placeholder: 'Ex.: pão', autocomplete: 'off' });
        const formasUsadas = [...new Set(todas.flatMap((v) => v.formas.map((f) => f[0])))];
        const forma = seletor(formasUsadas, '', 'Todas as formas');
        const sumario = el('div');
        const lista = el('div', 'caixa-vendas');
        const aplicar = () => {
          const termo = U.dobrar(produto.value.trim());
          const achadas = todas.filter((v) => (!termo || v.itens.some((i) => U.dobrar(i[0]).includes(termo))) && (!forma.value || v.formas.some((f) => f[0] === forma.value)));
          const total = achadas.reduce((s, v) => s + v.valor, 0);
          const usadas = [...new Set(achadas.flatMap((v) => v.formas.map((f) => f[0])))];
          sumario.replaceChildren(dl([['Vendas encontradas', String(achadas.length)], ['Total recebido', achadas.length ? moeda(total) : '—'], ['Formas usadas', usadas.length ? usadas.join(' · ') : '—']]));
          lista.replaceChildren(...(achadas.length ? achadas.map((v) => {
            const c = cartaoVenda(v);
            c.append(itensDaVenda(v.itens));
            return c;
          }) : [U.vazio('Nenhuma venda aprovada deste caixa corresponde aos filtros.')]));
        };
        produto.oninput = aplicar;
        produto.onkeydown = (ev) => { if (ev.key === 'Enter') ev.preventDefault(); };
        forma.onchange = aplicar;
        const g = el('div', 'caixa-grade');
        g.append(campo('Produto', produto), campo('Forma de pagamento', forma));
        const limpar = botao('Limpar filtros', () => { produto.value = ''; forma.value = ''; aplicar(); }, 'btn secondary');
        form.append(g, limpar, sumario, lista);
        aplicar();
      },
    });
  }

  function dialogoCanceladas() {
    const lista = C.estado.turno.canceladas;
    C.dialogo({
      titulo: 'Vendas canceladas',
      subtitulo: 'Auditoria: estas vendas não entram nos totais nem no saldo do caixa.',
      largo: true,
      montar: (form) => {
        if (!lista.length) { form.append(U.vazio('Nenhuma venda cancelada foi vinculada a este caixa.')); return; }
        lista.forEach((c) => {
          const d = cartaoVenda(c, c.id);
          d.append(
            el('p', 'caixa-alerta', 'Cancelamento no CREARE'),
            dl([['Autorizado por', c.autorizadoPor || 'Não informado'], ['Motivo', c.motivo || 'Não informado'], ['Justificativa', c.justificativa || 'Não informada']]),
            el('h4', 'caixa-subtitulo', 'Forma de pagamento'),
            U.situacao(c.forma + ': ' + moeda(c.valor), 'neutro'),
            el('h4', 'caixa-subtitulo', 'Produtos da venda'),
            itensDaVenda(c.itens),
            U.situacao('Cancelado', 'negativo')
          );
          form.append(d);
        });
      },
    });
  }

  // Recomeçar a demonstração volta o "Ver como" para Operador: a faixa precisa ser refeita junto.
  C.aoReiniciar(() => { if (tela) montar(); });
  C.registrar('turno', abrir);
})();
