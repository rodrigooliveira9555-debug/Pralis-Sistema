/*
 * Caixa — Fechamentos de Caixa: dossiê do caixa fechado (Tesouraria e Financeiro) e detalhe da Gerência.
 * Base no principal: relatório de fechamento + CaixaDetalhe (Caixa-Brain/06). O dossiê reúne quem fechou, a contagem e a
 * diferença, a folha digital contra o PDV e a maquininha, as paradas do computador, as transferências com seus lacres,
 * as provas e o histórico da conferência. A Gerência vê o detalhe SEM contagem, diferença, folha comparada nem decisão.
 * Tudo vem do retrato gravado no fechamento (modulo.js › fecharCaixa), não do turno vivo. Dados FICTÍCIOS, em centavos.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const F = window.CicluzCaixaFechamentos;
  const { el } = U;
  const { moeda } = C;
  const { corpoSecao, dl, sinal, classeDif } = F;

  const TIPO = { malote: 'Malote', sem_lacre: 'Sem lacre', sangria: 'Sangria', retorno_final: 'Retorno final', comum: 'Comum' };
  const SITUACAO_TR = { pendente: ['Pendente de conferência', 'atencao'], recebida: ['Recebida', 'positivo'], divergente: ['Divergente', 'negativo'], cancelada: ['Cancelada', 'info'] };
  const FORMAS = [['Crédito', 'credito', true], ['Débito', 'debito', true], ['Dinheiro', 'dinheiro', false], ['Pix', 'pix', true], ['Voucher', 'voucher', true]];

  const secaoComSituacao = (titulo, h) => {
    const s = U.secao(titulo);
    s.querySelector('.compras-secao-cab').append(F.situacaoChip(h));
    return s;
  };

  function blocoQuem(h) {
    const s = secaoComSituacao('Dossiê · ' + h.pdv + ' · ' + h.turno + ' · ' + h.data, h);
    const itens = [dl([['Fechamento executado por', h.fechadoPor], ['Gerente', h.supervisor], ['Abertura → fechamento', h.abertura + ' → ' + h.fechamento],
      ['Lacre de fechamento usado', h.lacreFechamento], ['Lacre reservado pela Tesouraria', h.lacreReservado]])];
    if (h.lacreFechamento !== h.lacreReservado) itens.push(el('p', 'caixa-alerta', 'O lacre de fechamento não bate com o reservado pela Tesouraria. Resolva antes de confirmar.'));
    if (h.observacao) itens.push(U.nota('Observação do operador: ' + h.observacao));
    s.append(corpoSecao(...itens));
    return s;
  }

  function blocoContagem(h) {
    const s = U.secao('Contagem e diferença');
    const c = h.contagem;
    const itens = [dl([['Cédulas', moeda(c.especie)], ['Moedas', moeda(c.moedas)], ['Contado', moeda(h.contado)], ['Esperado (sistema)', moeda(h.esperado)], ['Diferença', sinal(h.diferenca)]]),
      el('p', 'caixa-diferenca ' + classeDif(h.diferenca), h.diferenca < 0 ? '▼ Falta de ' + moeda(-h.diferenca) + ': quebra registrada no fechamento.' : h.diferenca > 0 ? '▲ Sobra de ' + moeda(h.diferenca) + ': sem quebra, Tesouraria avisada.' : '✓ Bateu: sem diferença.')];
    if (c.correcoes.length) itens.push(U.nota('Correções da contagem (a primeira fica no histórico): ' + c.correcoes.map((x) => moeda(x.de) + ' → ' + moeda(x.para) + ' (' + x.justificativa + ')').join(' · ')));
    s.append(corpoSecao(...itens));
    return s;
  }

  function blocoFolha(h) {
    const s = U.secao('Folha digital × PDV × Maquininha');
    const campos = h.folha.campos;
    const linhas = FORMAS.map(([nome, k, cartao]) => {
      const folha = C.centavos(campos[k]);
      const pdv = h.pdvForma[nome] || 0;
      const maq = cartao ? C.centavos(h.maquininha[k]) : undefined;
      const dif = Math.max(folha === null ? 0 : Math.abs(folha - pdv), maq ? Math.abs(maq - pdv) : 0);
      return { nome, folha, pdv, maq, dif, semFolha: folha === null, semMaq: cartao && maq === null };
    });
    const parar = linhas.filter((l) => l.dif || l.semFolha || l.semMaq).length;
    s.querySelector('.compras-secao-cab').append(U.situacao(parar ? parar + (parar === 1 ? ' linha' : ' linhas') + ' para conferir' : 'Tudo confere', parar ? 'atencao' : 'positivo'));
    s.append(U.tabela([
      ['Forma', (l) => l.nome], ['Folha', (l) => (l.folha === null ? '—' : moeda(l.folha)), 'caixa-num'], ['PDV', (l) => moeda(l.pdv), 'caixa-num'],
      ['Maquininha', (l) => (l.maq === undefined ? '—' : l.maq === null ? 'sem leitura' : moeda(l.maq)), 'caixa-num'],
      ['Situação', (l) => (l.dif ? U.situacao('▲▼ Diferença ' + moeda(l.dif), 'negativo') : l.semFolha || l.semMaq ? U.situacao('Sem leitura', 'negativo') : U.situacao('✓ Confere', 'positivo'))],
    ], linhas));
    const itens = [dl([['Troco inicial', campos.trocoInicial], ['CLIENTES (VND/TRANS)', campos.clientes], ['Total impresso', campos.total], ['Saldo final dinheiro', campos.saldoFinal]]),
      U.nota('Folha e maquininha só informam: divergência delas não vira quebra. Só a diferença da contagem física gera quebra.')];
    if (h.folha.correcao) itens.push(el('p', 'caixa-alerta', 'Correção manual da folha: ' + h.folha.correcao));
    s.append(corpoSecao(...itens));
    return s;
  }

  /** Paradas do computador (PDV desligado) gravadas no turno: de quando até quando e por quê. */
  /** Início das vendas e, se houve, cada ajuste do operador (R-224): quem, quando, motivo e as duas horas. */
  function blocoInicio(h) {
    const eds = h.edicoes || [];
    const s = U.secao('Início das vendas', eds.length);
    const itens = [dl([['Abertura oficial', h.abertura], ['Início das vendas', h.inicioVendas || h.abertura], ['Folha do CREARE começa às', h.periodoFolha || '—']])];
    if (!eds.length) { itens.push(U.nota('Sem ajuste: o início das vendas é a abertura oficial.')); s.append(corpoSecao(...itens)); return s; }
    const l = el('div', 'compras-lista');
    eds.forEach((e) => l.append(U.linhaLista({ titulo: e.de + ' → ' + e.para, detalhe: e.por + ' · ' + e.em + ' · ' + e.motivo + ' · ' + e.trazidas + ' venda(s) passaram a ser deste caixa' + (e.devolvidas ? ', ' + e.devolvidas + ' saíram' : '') })));
    itens.push(l);
    s.append(corpoSecao(...itens));
    return s;
  }

  function blocoParadas(h) {
    const s = U.secao('Paradas do computador', h.paradas.length);
    if (!h.paradas.length) { s.append(corpoSecao(U.nota('Nenhuma parada do PDV registrada neste turno.'))); return s; }
    const l = el('div', 'compras-lista');
    h.paradas.forEach((p) => l.append(U.linhaLista({ titulo: p.desde + ' → ' + p.ate, detalhe: p.motivos.join(', ') + (p.outro ? ' (' + p.outro + ')' : '') })));
    s.append(corpoSecao(l));
    return s;
  }

  function blocoTransferencias(h) {
    const s = U.secao('Transferências do fechamento');
    const trs = C.estado.transferencias.filter((t) => t.caixaId === h.id);
    s.append(U.tabela([
      ['Lançamento', (t) => t.id], ['Tipo', (t) => TIPO[t.tipo] || t.tipo], ['Valor', (t) => moeda(t.valor), 'caixa-num'],
      ['Lacre', (t) => t.lacre || 'Sem lacre'], ['Situação', (t) => U.situacao(SITUACAO_TR[t.situacao][0], SITUACAO_TR[t.situacao][1])],
    ], trs, { vazioTexto: 'Nenhuma transferência ligada a este caixa (nada contado).' }));
    const ret = h.retornoId ? C.transferencia(h.retornoId) : null;
    s.append(corpoSecao(U.nota(ret ? (ret.situacao === 'pendente' ? 'Retorno final ainda não recebido: a Tesouraria o confere (contagem e lacre) em CNT - Tesouraria.' : 'Retorno final ' + (ret.situacao === 'recebida' ? 'recebido pelo Cofre.' : 'com divergência registrada.')) : 'Sem retorno ao Cofre (nada contado).')));
    return s;
  }

  function blocoProvas(h) {
    const s = U.secao('Provas e avisos');
    const itens = [U.nota('Provas: Folha de fechamento ' + h.anexos.folha + ' · Folha CREARE ' + h.anexos.creare + ' · Comprovantes de cartão ' + h.anexos.comprovantes + '. Vendas canceladas no turno: ' + h.canceladas + ' (auditoria, fora dos totais).')];
    const notifs = C.estado.notificacoes.filter((n) => h.desta_sessao && n.titulo.includes(h.operador));
    itens.push(U.nota(notifs.length ? 'Notificações geradas: ' + notifs.map((n) => n.tipo + ' → ' + n.para + ' (' + n.titulo + ')').join(' · ') : 'Nenhuma notificação gerada por este fechamento.'));
    s.append(corpoSecao(...itens));
    return s;
  }

  function blocoHistorico(h) {
    const s = U.secao('Histórico da conferência', h.conferencias.length);
    if (!h.conferencias.length) { s.append(corpoSecao(U.nota('Ainda não conferido. Nada é apagado: cada decisão fica aqui.'))); return s; }
    const l = el('div', 'compras-lista');
    h.conferencias.forEach((c) => l.append(U.linhaLista({ titulo: c.resultado === 'conferido' ? 'Conferido' : 'Divergência registrada', detalhe: c.por + ' · ' + c.em + (c.observacao ? ' · ' + c.observacao : '') })));
    s.append(corpoSecao(l));
    return s;
  }

  /** Dossiê completo (Tesouraria e Financeiro). A decisão entra por fora, em fechamentos-decisao.js. */
  function dossie(h) {
    return [blocoQuem(h), blocoContagem(h), blocoFolha(h), blocoInicio(h), blocoParadas(h), blocoTransferencias(h), blocoProvas(h), blocoHistorico(h)];
  }

  /** Detalhe da Gerência: sem contagem cega, diferença, folha comparada, correções nem conferência da Tesouraria. */
  function detalheGerencia(l) {
    const a = C.estado.abertura;
    const s = U.secao('Detalhe · ' + l.pdv + ' · ' + l.turno + ' · ' + l.data);
    const itens = [];
    if (l.status === 'fechado') itens.push(dl([['Fechamento executado por', l.fechadoPor], ['Lacre de fechamento', l.lacreFechamento], ['Supervisor responsável', l.supervisor]]));
    else itens.push(dl([['Responsável', l.sessao ? a.responsavel : l.operador], ['Lacre de abertura', l.sessao ? a.lacre : 'Não registrado'], ['Lacre de fechamento', 'Sem lacre (ainda aberto)']]));
    itens.push(U.nota(l.sessao && a.divergencia ? 'Conferência de abertura (malote): divergente, ' + moeda(a.divergencia) + ' em relação ao declarado. Motivo: ' + a.motivoDivergencia : 'Conferência de abertura do malote: convergente.'));
    if (l.status === 'fechado') itens.push(U.nota('Provas do fechamento: Folha de fechamento ' + l.anexos.folha + ' · Folha CREARE ' + l.anexos.creare + ' · Comprovante de cartão ' + l.anexos.comprovantes + '.'));
    if (l.edicoes && l.edicoes.length) itens.push(U.nota('Início das vendas ajustado pelo operador: ' + l.edicoes.map((e) => e.de + ' → ' + e.para + ' (' + e.motivo + ')').join(' · ') + '.'));
    itens.push(U.nota('Alterado após o fechamento: não. Vendas canceladas são auditoria e não entram nos totais.'));
    itens.push(U.nota('A contagem cega, as correções e a conferência da Tesouraria não aparecem para a Gerência.'));
    s.append(corpoSecao(...itens));
    const partes = [s];
    if (l.status === 'fechado') partes.push(blocoParadas(l));
    return partes;
  }

  F.dossie = dossie;
  F.detalheGerencia = detalheGerencia;
})();
