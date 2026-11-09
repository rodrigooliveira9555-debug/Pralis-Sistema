/*
 * Caixa — Fechamento: etapas 2 e 3, Maquininha e Relatório final (casca). Comprovante da maquininha e a conferência Folha × PDV × Maquininha (só informa).
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

  /* ---------- Etapa 2: Maquininha ---------- */

  function etapa2(f) {
    const m = f.maq;
    const a = C.estado.abertura;
    const s = U.secao('Maquininha');
    s.querySelector('.compras-secao-cab').append(U.situacao(m.salvo ? 'Revisado' : 'Pendente', m.salvo ? 'positivo' : 'atencao'));
    const itens = [U.nota('Maquininha deste caixa: ' + a.maquininha + '. É a escolhida na abertura e não pode ser trocada aqui. A leitura é o acumulado do dia (na tarde, desconta a manhã; não simulado na casca).')];
    const ac = el('div', 'caixa-acoes caixa-acoes-esq');
    ac.append(botao(m.comprovante ? 'Trocar comprovante (simulado)' : 'Anexar comprovante (simulado)', () => {
      m.comprovante = 'comprovante-maquininha.jpg'; m.valores = null; m.travados = false; m.salvo = false; K.atualizar(); // novo comprovante invalida o relatório salvo
    }, 'btn secondary'));
    if (m.comprovante) {
      ac.append(U.situacao(m.comprovante, 'info'));
      if (!m.valores) ac.append(botao('Ler comprovante (simulado)', () => {
        const p = pralis();
        m.valores = { credito: fmt(p.credito), debito: fmt(p.debito), pix: fmt(p.pix), voucher: fmt(p.voucher) };
        m.travados = true;
        K.atualizar();
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
    if (K.erroMaq) msg.append(el('b', null, K.erroMaq));
    itens.push(msg);
    const acoes = el('div', 'caixa-acoes');
    acoes.append(botao('Salvar conferência da maquininha', salvarMaq, 'btn'));
    itens.push(acoes);
    s.append(corpoSecao(...itens));
    return s;
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


  P.etapa2 = etapa2;
  P.etapa3 = etapa3;
})();
