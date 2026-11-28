/*
 * Caixa — Fechamento: etapas 2 e 3, Maquininha e Relatório final (casca). Comprovante da maquininha e a conferência Folha × PDV × Maquininha (só informa).
 * Formulário linha por linha (padrão da Nova Transferência): grupos com título, quadro de linhas e notas depois do quadro (a conferência Folha × PDV × Maquininha segue em tabela).
 * Parte do fechamento em 4 etapas (fechamento.js monta a tela). Estado único em CicluzCaixa.estado; o que é só da tela
 * (erros, textos digitados) vive em ctx (fechamento-comum.js). Dados FICTÍCIOS, em centavos, só em memória.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const { el, botao, entrada } = U;
  const { moeda, centavos } = C;
  const { ctx: K, dl, linhaSituacao, cadeado, fmt, CAMPOS_FOLHA, FORMAS_CARTAO, pralis, lidoNoPdv } = window.CicluzCaixaFechamentoComum;
  const { quadro, secao } = C.pecas();
  const { linhaCampo, linhaLeitura } = C;
  const P = (window.CicluzCaixaFechamentoPartes = window.CicluzCaixaFechamentoPartes || {});

  /* ---------- Etapa 2: Maquininha ---------- */

  /** Cada etapa devolve a lista de grupos (nós) que a tela coloca no formulário. */
  function etapa2(f) {
    const m = f.maq;
    const a = C.estado.abertura;
    const ac = el('div', 'caixa-acoes caixa-acoes-esq');
    ac.append(botao(m.comprovante ? 'Trocar comprovante (simulado)' : 'Anexar comprovante (simulado)', () => {
      m.comprovante = 'comprovante-maquininha.jpg'; m.valores = null; m.travados = false; m.salvo = false; K.atualizar(); // novo comprovante invalida o relatório salvo
    }, 'btn secondary'));
    if (m.comprovante && !m.valores) ac.append(botao('Ler comprovante (simulado)', () => {
      const p = lidoNoPdv();
      m.valores = { credito: fmt(p.credito), debito: fmt(p.debito), pix: fmt(p.pix), voucher: fmt(p.voucher) };
      m.travados = true;
      K.atualizar();
    }, 'btn'));
    const nos = [secao('Maquininha', quadro(linhaSituacao('Situação', m.salvo ? 'Revisado' : 'Pendente', m.salvo ? 'positivo' : 'atencao'), linhaLeitura('Maquininha deste caixa', a.maquininha), linhaLeitura('Comprovante anexado', m.comprovante || 'Nenhum')),
      U.nota('É a maquininha escolhida na abertura e não pode ser trocada aqui. A leitura é o acumulado do dia (na tarde, desconta a manhã; não simulado na casca).'), ac)];
    if (m.comprovante) {
      m.valores = m.valores || { credito: '', debito: '', pix: '', voucher: '' };
      const linhas = FORMAS_CARTAO.map(([k, rotulo]) => {
        const i = entrada('text', m.valores[k], { inputMode: 'decimal', placeholder: '0,00', readOnly: m.travados && m.valores[k] !== '', autocomplete: 'off' });
        i.oninput = () => { m.valores[k] = i.value; m.salvo = false; };
        return linhaCampo(rotulo, i, true);
      });
      nos.push(secao('Acumulado do dia na maquininha (R$)', quadro(...linhas),
        m.travados ? cadeado('Valores lidos do comprovante ficam travados: na maquininha não há correção manual (decisão do Marco, 29/10).') : U.nota('Sem leitura automática: preencha os valores do comprovante.')));
    }
    const msg = el('div', 'caixa-pendencias');
    msg.setAttribute('role', 'alert');
    if (K.erroMaq) msg.append(el('b', null, K.erroMaq));
    const acoes = el('div', 'caixa-acoes');
    acoes.append(botao('Salvar conferência da maquininha', salvarMaq, 'btn'));
    nos.push(msg, acoes);
    return nos;
  }

  function salvarMaq() {
    const m = C.estado.fechamento.maq;
    K.erroMaq = '';
    if (!m.comprovante) K.erroMaq = 'Envie a foto da maquininha antes de salvar.';
    else if (FORMAS_CARTAO.some(([k]) => centavos(m.valores[k]) === null)) K.erroMaq = 'Informe crédito, débito, Pix e voucher no relatório da maquininha.';
    if (K.erroMaq) return K.atualizar();
    m.salvo = true;
    U.avisar('Conferência da maquininha salva.');
    K.atualizar();
  }

  /* ---------- Etapa 3: Relatório final (Folha × PDV × Maquininha) ---------- */

  function etapa3(f) {
    if (!f.relatorioGerado || !f.folha.campos) return [secao('Relatório final', U.nota('Gere o relatório de vendas na etapa 1 (com a folha lida) para comparar Folha × PDV × Maquininha.'))];
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
    // A comparação lado a lado (Folha, PDV, Maquininha, Situação) é uma tabela, não um formulário: segue como está.
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
    s.append(tabela, U.nota('Esta etapa só informa: divergência de folha ou de maquininha não bloqueia o fechamento nem vira quebra. Só a diferença da contagem física gera quebra.'));

    const campos = f.folha.campos;
    const soma = ['clientes', 'credito', 'debito', 'dinheiro', 'pix', 'voucher'].reduce((t, k) => t + (centavos(campos[k]) || 0), 0);
    const o = secao('Outros dados da folha', dl([['Saldo Inicial', moeda(centavos(campos.saldoInicial) || 0)], ['CLIENTES (VND/TRANS)', moeda(centavos(campos.clientes) || 0)], ['Saldo Final Dinheiro', moeda(centavos(campos.saldoFinal) || 0)]]),
      ...(soma !== (centavos(campos.total) || 0) ? [el('p', 'caixa-alerta', 'A soma das formas de pagamento da folha não dá o Total impresso.')] : []),
      ...(f.folha.correcao.trim() ? [el('p', 'caixa-alerta', 'Correção manual da folha: ' + f.folha.correcao.trim())] : []));

    const r = C.resumo();
    const t = C.estado.turno;
    const mv = secao('Movimentações do turno', dl([['Entradas no PDV', moeda(r.entradas)], ['Transferências recebidas', moeda(C.estado.abertura.valorInicial + r.recebido)], ['Sangrias', moeda(r.sangrias)],
      ['Despesas / Mercadorias / Retiradas', moeda(0)], ['Vendas canceladas', String(t.canceladas.length)],
      ['Sangrias com lacre', C.sangriasDoCaixa().length ? C.sangriasDoCaixa().map((x) => x.lacre + ' (' + moeda(x.valor) + ')').join(' · ') : 'Nenhuma']]));
    return [s, o, mv];
  }
  const plural = (n) => n + (n === 1 ? ' linha' : ' linhas');


  P.etapa2 = etapa2;
  P.etapa3 = etapa3;
})();
