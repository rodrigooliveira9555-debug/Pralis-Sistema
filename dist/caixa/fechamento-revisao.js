/*
 * Caixa — Fechamento: etapa 4, Fechamento e revisão (casca). Esperado × contado, lacre reservado, observação e "Revisar fechamento do caixa".
 * Parte do fechamento em 4 etapas (fechamento.js monta a tela). Estado único em CicluzCaixa.estado; o que é só da tela
 * (erros, textos digitados) vive em ctx (fechamento-comum.js). Dados FICTÍCIOS, em centavos, só em memória.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const { el, botao, campo, entrada, seletor } = U;
  const { moeda, centavos } = C;
  const { ctx: K, corpoSecao, dl, cadeado, fmt, CAMPOS_FOLHA, FORMAS_CARTAO, ICONE_CADEADO, pralis, gerencia } = window.CicluzCaixaFechamentoComum;
  const P = (window.CicluzCaixaFechamentoPartes = window.CicluzCaixaFechamentoPartes || {});

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
    ac.append(botao(f.folhaFechamento ? 'Trocar folha de fechamento (simulado)' : 'Anexar folha de fechamento do malote (simulado)', () => { f.folhaFechamento = 'folha-fechamento-malote.jpg'; K.atualizar(); }, 'btn secondary'));
    if (f.folhaFechamento) {
      ac.append(U.situacao(f.folhaFechamento, 'info'), botao('Remover', () => { f.folhaFechamento = null; K.atualizar(); }, 'btn secondary'));
    }
    itens.push(ac);

    const lacre = seletor([a.lacreFechamento], f.lacre, 'Escolha…');
    lacre.onchange = () => { f.lacre = lacre.value; K.atualizar(); };
    itens.push(campo('Lacre de fechamento', lacre, 'A Tesouraria reservou este lacre no malote; o servidor recusa qualquer outro.'));

    const obs = el('textarea');
    obs.rows = 2;
    obs.value = f.observacao;
    obs.oninput = () => { f.observacao = obs.value; if (K.fecharRefresh) K.fecharRefresh(); };
    const diverge = f.contagem.registrada && f.contagem.registrada.diferenca !== 0;
    itens.push(campo(diverge ? 'Observação da divergência (obrigatória)' : 'Observação do fechamento', obs, 'Máximo 500 caracteres. (No principal também dá para ditar por voz.)'));
    itens.push(dl([['Caixa responsável', a.responsavel], ['Gerente responsável', f.gerente || 'Falta confirmar']]));

    // Pendências e botão são atualizados no lugar (digitar a observação não pode trocar o botão antes do clique).
    const box = el('div', 'caixa-pendencias');
    box.setAttribute('role', 'alert');
    const b = botao('', revisar, 'btn');
    K.fecharRefresh = () => {
      const pend = pendencias(f);
      box.replaceChildren();
      if (pend.length) { box.append(el('b', null, 'Antes de encerrar:')); const ul = el('ul'); pend.forEach((p) => ul.append(el('li', null, p))); box.append(ul); }
      const falta = f.contagem.registrada && f.contagem.registrada.diferenca < 0;
      b.textContent = falta ? 'Encerrar com divergência' : 'Encerrar e enviar à Tesouraria';
      b.disabled = pend.length > 0;
    };
    K.fecharRefresh();
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
        K.atualizar();
      },
    });
  }


  P.etapa4 = etapa4;
})();
