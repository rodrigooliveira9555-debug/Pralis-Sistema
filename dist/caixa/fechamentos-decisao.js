/*
 * Caixa — Fechamentos de Caixa: a decisão da Tesouraria ("Fechou certo", "Teve quebra" e "Alterar status da conferência").
 * Base no principal: conferência do relatório de fechamento. Só o Tesoureiro decide (`conferir`); o Financeiro consulta e
 * a Gerência nem chega aqui. "Fechou certo" exige o retorno final já recebido em CNT - Tesouraria (um caminho só para receber).
 * Cada decisão entra no histórico e nada é apagado; a mesma decisão repetida não grava de novo. Dados FICTÍCIOS.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const F = window.CicluzCaixaFechamentos;
  const { el, botao, campo } = U;
  const { corpoSecao } = F;

  const agora = () => new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + C.hora();
  const retornoPendente = (h) => Boolean(h.retornoId) && C.transferencia(h.retornoId).situacao === 'pendente';
  const textoMotivo = () => { const t = el('textarea'); t.rows = 3; t.maxLength = 1000; return t; };

  /** A seção "Decisão" do dossiê: botões para o Tesoureiro, aviso de consulta para os demais. */
  function decisao(h) {
    const s = U.secao('Decisão da Tesouraria');
    const sit = C.situacaoDe(h);
    if (!C.pode('conferir')) {
      s.append(corpoSecao(U.nota('Consulta: a conferência (“Fechou certo” ou “Teve quebra”) é decidida pela Tesouraria. Troque o “Ver como” para Tesoureiro para decidir.')));
      return s;
    }
    const itens = [];
    const acoes = el('div', 'caixa-acoes');
    if (h.conferencias.length) acoes.append(botao('Alterar status da conferência', () => dialogoRevisao(h), 'btn secondary'));
    else {
      const lacreOk = h.lacreFechamento === h.lacreReservado;
      if (!lacreOk) itens.push(el('p', 'caixa-alerta', 'O lacre de fechamento não bate com o reservado pela Tesouraria. Resolva antes de confirmar.'));
      if (lacreOk && ['aguardando_tesouraria', 'fechado_sem_pendencias'].includes(sit)) { // com falta registrada só cabe "Teve quebra"
        const b = botao('Fechou certo', () => dialogoFechouCerto(h, sit), 'btn');
        b.disabled = retornoPendente(h);
        if (b.disabled) { b.title = 'Confira o retorno em CNT - Tesouraria antes.'; itens.push(U.nota('O retorno do caixa ainda não foi recebido: a Tesouraria o confere (contagem e lacre) em CNT - Tesouraria antes de “Fechou certo”.')); }
        acoes.append(b);
      }
      acoes.append(botao('Teve quebra', () => dialogoQuebra(h), 'btn secondary caixa-perigo'));
    }
    itens.push(acoes);
    s.append(corpoSecao(...itens));
    return s;
  }

  function dialogoFechouCerto(h, sit) {
    C.dialogo({
      titulo: 'O caixa fechou certo?',
      rotuloSalvar: 'Sim, fechou certo',
      montar: (form) => {
        form.append(el('p', null, h.retornoId ? 'O retorno do caixa já foi recebido. Isto marca o caixa como Conferido pela Tesouraria.' : 'Sem retorno ao Cofre. Isto marca o caixa como Conferido pela Tesouraria.'));
        if (sit !== 'fechado_sem_pendencias') form.append(el('p', 'caixa-alerta', 'Há diferença ou pendência neste caixa. Confira o dossiê e use “Teve quebra” se for o caso.'));
      },
      salvar: () => {
        if (retornoPendente(h)) return 'O retorno do caixa ainda não foi recebido. Confira em CNT - Tesouraria.';
        h.conferencias.push({ resultado: 'conferido', observacao: '', por: 'Carla (Tesouraria)', em: agora() });
        U.avisar('Conferência registrada: fechou certo.');
        F.ctx.atualizar();
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
        const t = textoMotivo();
        form.append(campo('Motivo da quebra', t, 'Obrigatório, até 1000 caracteres.'));
        return { t };
      },
      salvar: ({ t }) => {
        if (!t.value.trim()) return 'Informe o motivo da quebra.';
        h.conferencias.push({ resultado: 'divergente', observacao: t.value.trim(), por: 'Carla (Tesouraria)', em: agora() });
        U.avisar('Divergência registrada na conferência.');
        F.ctx.atualizar();
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
        ctx.t = textoMotivo();
        form.append(campo('Motivo da alteração', ctx.t, 'Obrigatório.'));
        return ctx;
      },
      salvar: (ctx) => {
        if (!ctx.t.value.trim()) return 'Informe o motivo da alteração de status.';
        if (ctx.novo === ultima.resultado && ctx.t.value.trim() === ultima.observacao) { U.avisar('Nada mudou: a mesma decisão já está registrada.'); return; } // idempotente
        if (ctx.novo === 'conferido' && retornoPendente(h)) return 'Há transferência pendente de conferência pela Tesouraria.';
        h.conferencias.push({ resultado: ctx.novo, observacao: ctx.t.value.trim(), por: 'Carla (Tesouraria)', em: agora() });
        U.avisar('Conferência atualizada. O histórico anterior foi mantido.');
        F.ctx.atualizar();
      },
    });
  }

  F.decisao = decisao;
})();
