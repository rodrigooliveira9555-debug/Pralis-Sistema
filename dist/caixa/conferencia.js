/*
 * Caixa — Conferência da Tesouraria (casca). Depois do fechamento: fila "Para conferir" / "Já conferidos",
 * dossiê do caixa e as decisões "Fechou certo" / "Teve quebra" (relatorio_fechamento do principal, doc 06 do Caixa-Brain).
 * Regras: só Tesouraria (e Diretor Geral) vê e decide; a conferência é APPEND-ONLY (cada decisão é uma linha nova),
 * não muda os valores nem o status do caixa; "Fechou certo" EXIGE o retorno já recebido (a Tesouraria o confere em CNT - Tesouraria; um caminho só para receber);
 * "Teve quebra" exige motivo; revisar exige motivo. Dados FICTÍCIOS, em centavos, só em memória.
 * Adaptação da casca: o Diretor Geral não tem perfil no "Ver como" (a regra é a mesma da Tesouraria).
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const { el, botao, campo, entrada, seletor } = U;
  const { moeda } = C;

  const CAMINHO = 'Entradas · Vendas / Faturamento / Lançamentos / VND - Conferência de Fechamentos';
  const PARA_CONFERIR = ['aguardando_tesouraria', 'fechado_sem_pendencias', 'com_quebra'];
  let tela = null;
  let corpo = null;
  let aba = 'conferir';
  let filtroPdv = '';
  let selecionado = null;

  const corpoSecao = (...nos) => { const c = el('div', 'compras-corpo'); c.append(...nos); return c; };
  const dl = (pares) => {
    const caixa = el('dl', 'caixa-declarado');
    pares.forEach(([t, v]) => { const d = el('div'); d.append(el('dt', null, t), el('dd', null, v)); caixa.append(d); });
    return caixa;
  };
  const sinal = (d) => (d < 0 ? '▼ Falta ' + moeda(-d) : d > 0 ? '▲ Sobra ' + moeda(d) : '✓ Bateu');
  const classeDif = (d) => (d < 0 ? 'falta' : d > 0 ? 'sobra' : 'bateu');

  function abrir() {
    if (!tela) tela = C.criarTela({ id: 'caixa-conferencia', titulo: 'VND - Conferência de Fechamentos', caminho: CAMINHO });
    tela.ativar();
    montar();
  }
  function montar() {
    tela.body.replaceChildren(
      C.faixaDemo('Demonstração: dados fictícios, nada é gravado. Só a Tesouraria vê e decide; mude o "Ver como" para ver o bloqueio dos outros perfis.', atualizar, ['operador', 'gerente', 'tesoureiro', 'financeiro']),
      corpo = el('div', 'caixa-corpo')
    );
    atualizar();
  }
  C.aoReiniciar(() => { aba = 'conferir'; filtroPdv = ''; selecionado = null; if (tela) montar(); });

  function atualizar() {
    if (!C.pode('conferir')) {
      const s = U.secao('Acesso exclusivo da Tesouraria');
      s.append(corpoSecao(U.nota('Acesso exclusivo da Tesouraria e Direção Geral. Caixa, Gerência e demais perfis não podem consultar nem decidir este fechamento.')));
      return corpo.replaceChildren(s);
    }
    const todos = C.estado.fechamentos;
    const naFila = todos.filter((h) => PARA_CONFERIR.includes(C.situacaoDe(h)));
    const feitos = todos.filter((h) => !PARA_CONFERIR.includes(C.situacaoDe(h)));
    const lista = (aba === 'conferir' ? naFila : feitos).filter((h) => !filtroPdv || h.pdv === filtroPdv);

    const s = U.secao('Fechamentos de caixa');
    const abas = U.chips([['conferir', 'Para conferir (' + naFila.length + ')'], ['feitos', 'Já conferidos (' + feitos.length + ')']], aba, (v) => { aba = v; selecionado = null; atualizar(); });
    const pdv = seletor(['PDV 1', 'PDV 2', 'PDV 3', 'PDV 4'], filtroPdv, 'Todos os PDVs');
    pdv.onchange = () => { filtroPdv = pdv.value; selecionado = null; atualizar(); };
    const filtros = el('div', 'caixa-grade');
    filtros.append(campo('PDV', pdv));
    const abertos = C.estado.status === 'aberto' || C.estado.status === 'em_fechamento';
    s.append(corpoSecao(abas, filtros, ...(abertos ? [U.nota('Há um caixa ainda ' + (C.estado.status === 'aberto' ? 'aberto' : 'em fechamento') + ': ele fica fora da fila até fechar.')] : [])));
    s.append(U.tabela(
      [
        ['Data', (h) => h.data],
        ['PDV · turno', (h) => h.pdv + ' · ' + h.turno],
        ['Operador', (h) => h.operador],
        ['Esperado', (h) => moeda(h.esperado), 'caixa-num'],
        ['Contado', (h) => moeda(h.contado), 'caixa-num'],
        ['Diferença', (h) => { const w = el('span', 'caixa-diferenca-linha ' + classeDif(h.diferenca), sinal(h.diferenca)); return w; }],
        ['Situação', (h) => U.situacao(C.ROTULO_SITUACAO[C.situacaoDe(h)], C.TOM_SITUACAO[C.situacaoDe(h)])],
      ],
      lista,
      { aoClicar: (h) => { selecionado = h.id; atualizar(); }, vazioTexto: aba === 'conferir' ? 'Nenhum caixa para conferir.' : 'Nenhum caixa conferido ainda.', classeLinha: (h) => (h.id === selecionado ? 'selecionada' : '') }
    ));
    const partes = [s];
    const h = todos.find((x) => x.id === selecionado);
    if (h) partes.push(dossie(h));
    else if (lista.length) partes.push(U.nota('Selecione um caixa na lista para ver o dossiê e decidir.'));
    corpo.replaceChildren(...partes);
  }

  /* ---------- dossiê + decisão ---------- */

  function dossie(h) {
    const sit = C.situacaoDe(h);
    const s = U.secao('Dossiê · ' + h.pdv + ' · ' + h.turno + ' · ' + h.data);
    s.querySelector('.compras-secao-cab').append(U.situacao(C.ROTULO_SITUACAO[sit], C.TOM_SITUACAO[sit]));
    const itens = [
      dl([['Fechamento executado por', h.fechadoPor], ['Gerente', h.supervisor], ['Abertura → fechamento', h.abertura + ' → ' + h.fechamento],
        ['Lacre de fechamento', h.lacreFechamento], ['Lacre reservado pela Tesouraria', h.lacreReservado],
        ['Esperado (sistema)', moeda(h.esperado)], ['Contado', moeda(h.contado)], ['Diferença', sinal(h.diferenca)]]),
      el('p', 'caixa-diferenca ' + classeDif(h.diferenca), h.diferenca < 0 ? '▼ Falta de ' + moeda(-h.diferenca) + ': quebra registrada no fechamento.' : h.diferenca > 0 ? '▲ Sobra de ' + moeda(h.diferenca) + ': sem quebra, Tesouraria avisada.' : '✓ Bateu: sem diferença.'),
    ];
    if (h.observacao) itens.push(U.nota('Observação do operador: ' + h.observacao));
    itens.push(U.nota('Provas: Folha de fechamento ' + h.anexos.folha + ' · Folha CREARE ' + h.anexos.creare + ' · Comprovantes de cartão ' + h.anexos.comprovantes + '.'));
    const ret = h.retornoId ? C.transferencia(h.retornoId) : null;
    itens.push(U.nota(ret ? 'Retorno ao Cofre: ' + moeda(ret.valor) + ' — ' + (ret.situacao === 'pendente' ? 'pendente de conferência (o caixa declarou valor e conta; sem lacre próprio).' : 'recebido como declarado.') : 'Sem retorno ao Cofre (nada contado).'));
    const notifs = C.estado.notificacoes.filter((n) => h.desta_sessao && n.titulo.includes(h.operador));
    if (notifs.length) itens.push(U.nota('Notificações geradas: ' + notifs.map((n) => n.tipo + ' → ' + n.para + ' (' + n.titulo + ')').join(' · ')));

    if (h.conferencias.length) {
      itens.push(el('h4', 'caixa-subtitulo-solto', 'Histórico da conferência (nada é apagado)'));
      const l = el('div', 'compras-lista');
      h.conferencias.forEach((c) => l.append(U.linhaLista({
        titulo: c.resultado === 'conferido' ? 'Conferido' : 'Divergência registrada', detalhe: c.por + ' · ' + c.em + (c.observacao ? ' · ' + c.observacao : ''),
      })));
      itens.push(l);
    }

    const acoes = el('div', 'caixa-acoes');
    const decidido = h.conferencias.length > 0;
    const lacreOk = h.lacreFechamento === h.lacreReservado;
    if (!lacreOk) itens.push(el('p', 'caixa-alerta', 'O lacre de fechamento não bate com o reservado pela Tesouraria. Resolva antes de confirmar.'));
    if (decidido) {
      acoes.append(botao('Alterar status da conferência', () => dialogoRevisao(h), 'btn secondary'));
    } else {
      if (['aguardando_tesouraria', 'fechado_sem_pendencias'].includes(sit) && lacreOk) {
        const pendente = ret && ret.situacao === 'pendente';
        const b = botao('Fechou certo', () => dialogoFechouCerto(h, sit), 'btn');
        b.disabled = Boolean(pendente);
        if (pendente) { b.title = 'Confira o retorno em CNT - Tesouraria antes.'; itens.push(U.nota('O retorno do caixa ainda não foi recebido: a Tesouraria o confere (contagem e lacre) em CNT - Tesouraria antes de "Fechou certo".')); }
        acoes.append(b);
      }
      if (sit === 'fechado_sem_pendencias' || sit === 'com_quebra' || sit === 'aguardando_tesouraria') acoes.append(botao('Teve quebra', () => dialogoQuebra(h), 'btn secondary caixa-perigo'));
    }
    itens.push(acoes);
    s.append(corpoSecao(...itens));
    return s;
  }

  const agora = () => new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + C.hora();

  function dialogoFechouCerto(h, sit) {
    C.dialogo({
      titulo: 'O caixa fechou certo?',
      rotuloSalvar: 'Sim, fechou certo',
      montar: (form) => {
        form.append(el('p', null, h.retornoId ? 'O retorno do caixa já foi recebido. Isto marca o caixa como Conferido pela Tesouraria.' : 'Sem retorno ao Cofre. Isto marca o caixa como Conferido pela Tesouraria.'));
        if (sit !== 'fechado_sem_pendencias') form.append(el('p', 'caixa-alerta', 'Há diferença ou pendência neste caixa. Confira os dados abaixo e use "Teve quebra" se for o caso.'));
      },
      salvar: () => {
        if (h.retornoId && C.transferencia(h.retornoId).situacao === 'pendente') return 'O retorno do caixa ainda não foi recebido. Confira em CNT - Tesouraria.';
        h.conferencias.push({ resultado: 'conferido', observacao: '', por: 'Carla (Tesouraria)', em: agora() });
        U.avisar('Conferência registrada: fechou certo.');
        atualizar();
      },
    });
  }

  function dialogoQuebra(h) {
    C.dialogo({
      titulo: 'Teve quebra',
      subtitulo: 'Este registro avisa a quebra, não altera os valores financeiros e fica no histórico.',
      rotuloSalvar: 'Registrar quebra',
      montar: (form) => {
        if (h.diferenca < 0) form.append(el('p', 'caixa-alerta', 'O caixa fechou com diferença registrada. Descreva o motivo para registrar a quebra.'));
        const t = el('textarea');
        t.rows = 3;
        t.maxLength = 1000;
        form.append(campo('Motivo da quebra', t, 'Obrigatório, até 1000 caracteres.'));
        return { t };
      },
      salvar: ({ t }) => {
        if (!t.value.trim()) return 'Informe o motivo da quebra.';
        h.conferencias.push({ resultado: 'divergente', observacao: t.value.trim(), por: 'Carla (Tesouraria)', em: agora() });
        U.avisar('Divergência registrada na conferência.');
        atualizar();
      },
    });
  }

  function dialogoRevisao(h) {
    const ultima = h.conferencias[h.conferencias.length - 1];
    C.dialogo({
      titulo: 'Alterar status da conferência',
      subtitulo: 'Atual: ' + (ultima.resultado === 'conferido' ? 'Conferido' : 'Divergência registrada') + '. A decisão anterior permanece no histórico.',
      rotuloSalvar: 'Registrar alteração',
      montar: (form) => {
        const ctx = { novo: ultima.resultado === 'conferido' ? 'divergente' : 'conferido' };
        form.append(U.chips([['conferido', 'Conferido'], ['divergente', 'Divergência']], ctx.novo, (v) => { ctx.novo = v; }));
        const t = el('textarea');
        t.rows = 3;
        t.maxLength = 1000;
        form.append(campo('Motivo da alteração', t, 'Obrigatório.'));
        ctx.t = t;
        return ctx;
      },
      salvar: (ctx) => {
        if (!ctx.t.value.trim()) return 'Informe o motivo da alteração de status.';
        if (ctx.novo === ultima.resultado && ctx.t.value.trim() === ultima.observacao) { U.avisar('Nada mudou: a mesma decisão já está registrada.'); return; } // idempotente
        if (ctx.novo === 'conferido' && h.retornoId && C.transferencia(h.retornoId).situacao === 'pendente') return 'Há transferência pendente de conferência pela Tesouraria.';
        h.conferencias.push({ resultado: ctx.novo, observacao: ctx.t.value.trim(), por: 'Carla (Tesouraria)', em: agora() });
        U.avisar('Conferência atualizada. O histórico anterior foi mantido.');
        atualizar();
      },
    });
  }

  C.registrar('conferencia', abrir);
})();
