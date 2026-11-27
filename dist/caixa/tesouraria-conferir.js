/*
 * Caixa — Tesouraria: conferir o recebimento (casca). ADAPTAÇÃO: o principal não tem esta tela (lá o retorno do caixa é recebido
 * "como declarado" pelo "Fechou certo"); aqui a Tesouraria CONTA e confere o retorno do caixa (sangria e retorno final) usando o contrato
 * já pronto da API: /confirmar (estrito) e /recusar-conferencia. Regras (Caixa-Brain/02 e 06):
 *  - informa dinheiro físico, moedas e o lacre; o total é a soma. Valor, dinheiro, moedas e lacre precisam bater com o declarado;
 *    qualquer diferença NÃO confirma: "Conferência divergente: registre a recusa com o motivo";
 *  - recusa exige motivo; sem "encerrar" a transferência continua pendente e a tentativa fica registrada; com "encerrar" vira
 *    divergente (estado final): o CONTADO entra no destino e a falta vira quebra; contado acima do declarado exige confirmar a sobra;
 *  - a contagem é cega: o valor declarado não é mostrado ao conferente (por isso a janela só soma o contado, sem mostrar diferença).
 *    Transferência comum: a Tesouraria confirma direto (R-189).
 * Tudo grava no estado único (conferirTransferencia / recusarConferencia). Dados FICTÍCIOS, em centavos, só em memória.
 * Apresentação em formulário linha por linha (padrão da Nova Transferência): grupos de linhas (contagem, motivo, decisões Sim/Não).
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const { el, botao, entrada } = U;
  const { moeda, centavos, formulario, grupo, linhaCampo, linhaDinheiro, linhaLeitura } = C;
  const T = (window.CicluzCaixaTesouraria = window.CicluzCaixaTesouraria || {});

  const NOME = { sangria: 'sangria', retorno_final: 'retorno final do caixa', comum: 'transferência' };
  const valorDe = (i) => { const c = centavos(i.value); return c === null && !String(i.value).trim() ? 0 : c; }; // vazio = 0; inválido = null
  const reais = (c) => (c ? (c / 100).toFixed(2).replace('.', ',') : '');

  function conferir(t, atualizar) {
    if (t.tipo === 'comum') return confirmarSimples(t, atualizar);
    C.dialogo({
      titulo: 'Conferir recebimento',
      rotuloSalvar: 'Confirmar recebimento',
      padrao: true,
      montar: (form, d) => {
        // O total contado é o quadro grande no topo, só de leitura (contagem cega: o declarado nunca aparece). O caminho repetido sai e a explicação vira nota.
        const sub = d.querySelector('.compras-dialog-sub'); if (sub) sub.remove();
        const hero = C.quadroTotal('Total contado', moeda(0));
        const atualizarTotal = () => { hero.definir(moeda((valorDe(especie.input) || 0) + (valorDe(moedas.input) || 0))); };
        const especie = linhaDinheiro('Dinheiro físico contado (R$)', '', atualizarTotal);
        const moedas = linhaDinheiro('Moedas contadas (R$)', '', atualizarTotal);
        const lacre = entrada('text', '', { placeholder: 'Número do lacre', autocomplete: 'off' });
        const recusa = botao('Registrar recusa…', () => { d.close(); recusar(t, { especie: valorDe(especie.input) || 0, moedas: valorDe(moedas.input) || 0, lacre: lacre.value }, atualizar); }, 'btn secondary caixa-perigo');
        const acoes = el('div', 'caixa-acoes'); acoes.append(recusa);
        form.append(formulario(
          hero.no,
          U.nota('Conte o que veio no lacre: ' + NOME[t.tipo] + ' de ' + C.conta(t.origem).nome + ' para ' + C.conta(t.destino).nome + '. O valor declarado não é mostrado.'),
          grupo('Contagem', [especie.no, moedas.no]),
          grupo('Lacre', [linhaCampo('Lacre conferido', lacre, true)], U.nota('Digite o número que está no envelope.')),
          U.nota('Se o que você contou não bate com o declarado, a confirmação é recusada e o caminho é registrar a recusa com o motivo.'),
          acoes));
        return { especie: especie.input, moedas: moedas.input, lacre };
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
      padrao: true,
      montar: (form) => {
        form.append(formulario(
          grupo('Transferência', [linhaLeitura('Valor', moeda(t.valor)), linhaLeitura('Origem', C.conta(t.origem).nome), linhaLeitura('Destino', C.conta(t.destino).nome)],
            U.nota('A Tesouraria pode confirmar a transferência comum (R-189).'))));
      },
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
      padrao: true,
      montar: (form) => {
        const especie = linhaDinheiro('Dinheiro físico contado (R$)', reais(previa.especie));
        const moedas = linhaDinheiro('Moedas contadas (R$)', reais(previa.moedas));
        const lacre = entrada('text', previa.lacre || '', { autocomplete: 'off' });
        const motivo = entrada('text', '', { maxLength: 500, autocomplete: 'off' });
        // As duas decisões são chaves Sim/Não; o contexto guarda o estado no mesmo formato de antes (.checked).
        const encerrar = { checked: false }; const sobra = { checked: false };
        const P = C.pecas();
        form.append(formulario(
          grupo('Contagem', [especie.no, moedas.no, linhaCampo('Lacre informado', lacre)]),
          grupo('Motivo', [linhaCampo('Motivo da recusa', motivo, true)], U.nota('Obrigatório, até 500 caracteres.')),
          grupo('Decisão', [
            P.linha('Encerrar a divergência', P.chave('Encerrar a divergência', false, ['Sim', 'Não'], (sim) => { encerrar.checked = sim; })),
            P.linha('Confirmo a sobra', P.chave('Confirmo a sobra', false, ['Sim', 'Não'], (sim) => { sobra.checked = sim; })),
          ],
          U.nota('Encerrar a divergência: o que foi contado entra no destino e a falta vira quebra (não volta ao caixa).'),
          U.nota('Confirmo a sobra: contei mais que o declarado.'))));
        return { especie: especie.input, moedas: moedas.input, lacre, motivo, encerrar, sobra };
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
