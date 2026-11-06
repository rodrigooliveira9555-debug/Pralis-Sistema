/*
 * Caixa — Tesouraria: conferir o recebimento (casca). ADAPTAÇÃO: o principal não tem esta tela (lá o retorno do caixa é recebido
 * "como declarado" pelo "Fechou certo"); aqui a Tesouraria CONTA e confere o retorno do caixa (sangria e retorno final) usando o contrato
 * já pronto da API: /confirmar (estrito) e /recusar-conferencia. Regras (Caixa-Brain/02 e 06):
 *  - informa dinheiro físico, moedas e o lacre; o total é a soma. Valor, dinheiro, moedas e lacre precisam bater com o declarado;
 *    qualquer diferença NÃO confirma: "Conferência divergente: registre a recusa com o motivo";
 *  - recusa exige motivo; sem "encerrar" a transferência continua pendente e a tentativa fica registrada; com "encerrar" vira
 *    divergente (estado final): o CONTADO entra no destino e a falta vira quebra; contado acima do declarado exige confirmar a sobra;
 *  - a contagem é cega: o valor declarado não é mostrado ao conferente. Transferência comum: a Tesouraria confirma direto (R-189).
 * Tudo grava no estado único (conferirTransferencia / recusarConferencia). Dados FICTÍCIOS, em centavos, só em memória.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const { el, botao, campo, entrada } = U;
  const { moeda, centavos } = C;
  const T = (window.CicluzCaixaTesouraria = window.CicluzCaixaTesouraria || {});

  const NOME = { sangria: 'sangria', retorno_final: 'retorno final do caixa', comum: 'transferência' };
  const dinheiro = (v = '') => entrada('text', v, { inputMode: 'decimal', placeholder: '0,00' });
  const valorDe = (i) => { const c = centavos(i.value); return c === null && !String(i.value).trim() ? 0 : c; }; // vazio = 0; inválido = null

  function conferir(t, atualizar) {
    if (t.tipo === 'comum') return confirmarSimples(t, atualizar);
    C.dialogo({
      titulo: 'Conferir recebimento',
      subtitulo: 'Conte o que veio no lacre: ' + NOME[t.tipo] + ' de ' + C.conta(t.origem).nome + ' para ' + C.conta(t.destino).nome + '. O valor declarado não é mostrado.',
      rotuloSalvar: 'Confirmar recebimento',
      montar: (form, d) => {
        const especie = dinheiro(); const moedas = dinheiro(); const lacre = entrada('text', '', { placeholder: 'Número do lacre', autocomplete: 'off' });
        const total = el('strong', 'caixa-dinheiro', moeda(0));
        const atualizarTotal = () => { total.textContent = moeda((valorDe(especie) || 0) + (valorDe(moedas) || 0)); };
        especie.oninput = moedas.oninput = atualizarTotal;
        const g = el('div', 'caixa-grade');
        g.append(campo('Dinheiro físico contado (R$)', especie), campo('Moedas contadas (R$)', moedas), campo('Lacre conferido', lacre, 'Digite o número que está no envelope.'));
        const linha = el('p', 'caixa-total');
        linha.append(document.createTextNode('Total contado: '), total);
        const recusa = botao('Registrar recusa…', () => { d.close(); recusar(t, { especie: valorDe(especie) || 0, moedas: valorDe(moedas) || 0, lacre: lacre.value }, atualizar); }, 'btn secondary caixa-perigo');
        form.append(g, linha, U.nota('Se o que você contou não bate com o declarado, a confirmação é recusada e o caminho é registrar a recusa com o motivo.'), recusa);
        return { especie, moedas, lacre };
      },
      salvar: (ctx) => {
        const e = valorDe(ctx.especie); const m = valorDe(ctx.moedas);
        if (e === null || m === null) return 'Informe valores válidos (ex.: 120,50).';
        if (!ctx.lacre.value.trim()) return 'Informe o lacre conferido.';
        const r = C.conferirTransferencia(t.id, { especie: e, moedas: m, lacre: ctx.lacre.value });
        if (r.erro) return r.erro;
        U.avisar('Recebimento conferido: ' + moeda(t.valor) + ' entrou em ' + C.conta(t.destino).nome + '.');
        atualizar();
      },
    });
  }

  function confirmarSimples(t, atualizar) {
    C.dialogo({
      titulo: 'Confirmar transferência',
      rotuloSalvar: 'Confirmar recebimento',
      montar: (form) => { form.append(el('p', null, moeda(t.valor) + ' de ' + C.conta(t.origem).nome + ' para ' + C.conta(t.destino).nome + '. A Tesouraria pode confirmar a transferência comum (R-189).')); },
      salvar: () => {
        const r = C.conferirTransferencia(t.id, { especie: t.especie, moedas: t.moedas, lacre: '' });
        if (r.erro) return r.erro;
        U.avisar('Transferência confirmada: ' + moeda(t.valor) + ' entrou em ' + C.conta(t.destino).nome + '.');
        atualizar();
      },
    });
  }

  function recusar(t, previa, atualizar) {
    C.dialogo({
      titulo: 'Registrar recusa da conferência',
      subtitulo: 'Divergência na ' + NOME[t.tipo] + ' de ' + C.conta(t.origem).nome + '. A decisão fica no histórico da transferência.',
      rotuloSalvar: 'Registrar recusa',
      montar: (form) => {
        const especie = dinheiro(previa.especie ? (previa.especie / 100).toFixed(2).replace('.', ',') : '');
        const moedas = dinheiro(previa.moedas ? (previa.moedas / 100).toFixed(2).replace('.', ',') : '');
        const lacre = entrada('text', previa.lacre || '', { autocomplete: 'off' });
        const motivo = el('textarea'); motivo.rows = 3; motivo.maxLength = 500;
        const encerrar = entrada('checkbox', null); const sobra = entrada('checkbox', null);
        const rotEnc = el('label', 'compras-interruptor'); rotEnc.append(encerrar, el('span', null, 'Encerrar a divergência: o que foi contado entra no destino e a falta vira quebra (não volta ao caixa).'));
        const rotSobra = el('label', 'compras-interruptor'); rotSobra.append(sobra, el('span', null, 'Confirmo a sobra: contei mais que o declarado.'));
        const g = el('div', 'caixa-grade');
        g.append(campo('Dinheiro físico contado (R$)', especie), campo('Moedas contadas (R$)', moedas), campo('Lacre informado', lacre));
        form.append(g, campo('Motivo da recusa', motivo, 'Obrigatório, até 500 caracteres.'), rotEnc, rotSobra);
        return { especie, moedas, lacre, motivo, encerrar, sobra };
      },
      salvar: (ctx) => {
        const e = valorDe(ctx.especie); const m = valorDe(ctx.moedas);
        if (e === null || m === null) return 'Informe valores válidos (use 0,00 quando nada foi contado).';
        const r = C.recusarConferencia(t.id, { motivo: ctx.motivo.value, especie: e, moedas: m, lacre: ctx.lacre.value, encerrar: ctx.encerrar.checked, sobraConfirmada: ctx.sobra.checked });
        if (r.erro) return r.erro;
        U.avisar(ctx.encerrar.checked ? 'Divergência encerrada: ' + moeda(e + m) + ' entrou em ' + C.conta(t.destino).nome + (e + m < t.valor ? ' e a falta virou quebra.' : '.') : 'Recusa registrada: a transferência continua pendente.');
        atualizar();
      },
    });
  }

  T.conferir = conferir;
})();
