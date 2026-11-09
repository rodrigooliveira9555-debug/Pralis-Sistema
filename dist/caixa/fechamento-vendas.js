/*
 * Caixa — Fechamento: etapa 1, Vendas (casca). Contagem cega (cédulas e moedas), folha do CREARE (leitura simulada) e "Gerar relatório de vendas".
 * Parte do fechamento em 4 etapas (fechamento.js monta a tela). Estado único em CicluzCaixa.estado; o que é só da tela
 * (erros, textos digitados) vive em ctx (fechamento-comum.js). Dados FICTÍCIOS, em centavos, só em memória.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const { el, botao, campo, entrada, seletor } = U;
  const { moeda, centavos } = C;
  const { ctx: K, corpoSecao, dl, cadeado, fmt, CAMPOS_FOLHA, FORMAS_CARTAO, ICONE_CADEADO, pralis, lidoNoPdv, gerencia } = window.CicluzCaixaFechamentoComum;
  const P = (window.CicluzCaixaFechamentoPartes = window.CicluzCaixaFechamentoPartes || {});

  /* ---------- Etapa 1: Vendas (contagem cega + folha CREARE + relatório) ---------- */

  function etapa1(f) {
    const caixa = el('div', 'caixa-corpo');
    caixa.append(blocoContagem(f), blocoFolha(f), blocoGerar(f));
    return caixa;
  }

  function blocoContagem(f) {
    const c = f.contagem;
    const s = U.secao('1 · Contagem do dinheiro (cega)');
    const trancada = Boolean(c.registrada) && !K.corrigindoContagem;
    const g = el('div', 'caixa-grade');
    const campoDin = (chave, rotulo) => {
      const i = entrada('text', c[chave], { inputMode: 'decimal', placeholder: '0,00', readOnly: trancada });
      i.oninput = () => { c[chave] = i.value; total.textContent = moeda((centavos(c.especie) || 0) + (centavos(c.moedas) || 0)); if (K.gerarRefresh) K.gerarRefresh(); };
      return campo(rotulo, i);
    };
    const total = el('strong', 'caixa-dinheiro', moeda((centavos(c.especie) || 0) + (centavos(c.moedas) || 0)));
    g.append(campoDin('especie', 'Cédulas (R$)'), campoDin('moedas', 'Moedas (R$)'));
    const linha = el('p', 'caixa-total');
    linha.append(document.createTextNode('Total contado: '), total);
    const corpoS = [U.nota('Aqui nada vem do sistema. Conte as cédulas e as moedas do caixa e informe os dois totais; o esperado só aparece na etapa 4.'), g, linha];
    if (c.registrada) {
      corpoS.push(cadeado('Contagem registrada às ' + c.registrada.em + ': ' + moeda(c.registrada.total) + (gerencia() ? ' · esperado ' + moeda(c.registrada.esperado) : '')));
      if (!K.corrigindoContagem) corpoS.push(botao('Corrigir contagem', () => { K.corrigindoContagem = true; K.atualizar(); }, 'btn secondary'));
      else {
        const t = el('textarea');
        t.rows = 2;
        t.value = K.justContagem;
        t.oninput = () => { K.justContagem = t.value; if (K.gerarRefresh) K.gerarRefresh(); };
        corpoS.push(campo('Por que a contagem mudou? (obrigatório)', t, 'Mínimo 5 letras. A primeira contagem fica no histórico.'));
      }
      if (c.registrada.correcoes.length) corpoS.push(U.nota('Correções: ' + c.registrada.correcoes.map((x) => moeda(x.de) + ' → ' + moeda(x.para) + ' (' + x.justificativa + ')').join(' · ')));
    }
    s.append(corpoSecao(...corpoS));
    return s;
  }


  function blocoFolha(f) {
    const fo = f.folha;
    const s = U.secao('2 · Folha do CREARE');
    const a = C.estado.abertura;
    const itens = [U.nota('Fotografe ou anexe a folha impressa do PDV. No principal, uma IA lê os valores e eles ficam travados; aqui a leitura é simulada.')];
    const acoes = el('div', 'caixa-acoes caixa-acoes-esq');
    acoes.append(botao(fo.anexo ? 'Trocar folha (simulado)' : 'Anexar folha (simulado)', () => {
      fo.anexo = 'folha-creare-' + a.pdv.replace(' ', '').toLowerCase() + '.jpg';
      fo.campos = null; fo.travados = true; fo.correcao = ''; fo.periodoDe = '';
      f.relatorioGerado = false; // anexar nova folha invalida o relatório já gerado
      K.atualizar();
    }, 'btn secondary'));
    if (fo.anexo) {
      acoes.append(U.situacao(fo.anexo, 'info'));
      if (!fo.campos) acoes.append(botao('Ler folha (simulado)', () => { fo.campos = lerFolhaSimulada(); fo.periodoDe = C.primeiraVendaPdv(); fo.travados = true; K.atualizar(); }, 'btn'));
    }
    itens.push(acoes);
    itens.push(...K_INICIO().bloco());
    if (fo.campos) itens.push(tabelaFolha(fo), ...K_INICIO().avisoFolha(fo));
    s.append(corpoSecao(...itens));
    return s;
  }

  const K_INICIO = () => window.CicluzCaixaFechamentoComum.inicio; // "Início das vendas" e o aviso de horário da folha (fechamento-inicio.js, R-224)

  /** "Leitura" da folha: devolve o que o CREARE imprimiria, igual ao PDV (o operador pode corrigir). */
  function lerFolhaSimulada() {
    const p = lidoNoPdv();
    const r = C.resumo();
    const campos = {
      trocoInicial: p.trocoInicial, saldoInicial: p.trocoInicial, clientes: 0, credito: p.credito, debito: p.debito, dinheiro: p.dinheiro,
      pix: p.pix, voucher: p.voucher, total: p.total, despesas: p.despesas, sangria: p.sangria, saldoFinal: r.saldo + C.totalSemCaixa('Dinheiro'),
    };
    const texto = {};
    Object.keys(campos).forEach((k) => { texto[k] = fmt(campos[k]); });
    return texto;
  }

  function tabelaFolha(fo) {
    const linhas = CAMPOS_FOLHA.map(([k, rotulo, compara]) => ({ k, rotulo, compara }));
    const t = U.tabela(
      [
        ['Campo da folha', (l) => l.rotulo + (l.compara ? '' : ' (só exibido)')],
        ['Valor lido (R$)', (l) => {
          const i = entrada('text', fo.campos[l.k], { inputMode: 'decimal', readOnly: fo.travados });
          i.setAttribute('aria-label', l.rotulo);
          i.oninput = () => { fo.campos[l.k] = i.value; };
          return i;
        }, 'caixa-num'],
      ],
      linhas
    );
    const caixa = el('div', 'caixa-corpo');
    caixa.append(t);
    if (fo.travados) {
      const ac = el('div', 'caixa-acoes caixa-acoes-esq');
      ac.append(cadeado('Valores lidos pela folha ficam travados.'), botao('Corrigir manualmente', () => { fo.travados = false; K.atualizar(); }, 'btn secondary'));
      caixa.append(ac);
    } else {
      const j = el('textarea');
      j.rows = 2;
      j.value = fo.correcao;
      j.oninput = () => { fo.correcao = j.value; if (K.gerarRefresh) K.gerarRefresh(); };
      caixa.append(campo('Explique por que o valor mudou (mínimo 5 letras)', j, 'Fica registrado em "Correções manuais" no relatório final e no dossiê da Tesouraria.'));
    }
    return caixa;
  }

  /** Pendências para gerar o relatório (recalculadas sem redesenhar a tela: o botão não pode trocar de lugar entre o foco e o clique). */
  function pendenciasGerar(f) {
    const c = f.contagem;
    const fo = f.folha;
    const p = [];
    if (!fo.anexo) p.push('Anexe a folha do CREARE.');
    else if (!fo.campos) p.push('Leia a folha (os valores precisam estar preenchidos).');
    if (centavos(c.especie) === null || centavos(c.moedas) === null) p.push('Informe cédulas e moedas no passo 1 para gerar o relatório.');
    if (K.corrigindoContagem && K.justContagem.trim().length < 5) p.push('Explique por que a contagem mudou para gerar de novo.');
    if (fo.campos && !fo.travados && fo.correcao.trim().length < 5) p.push('Explique por que o valor da folha mudou (mínimo 5 letras).');
    return p;
  }

  function blocoGerar(f) {
    const c = f.contagem;
    const s = U.secao('3 · Gerar relatório de vendas');
    const itens = [];
    const lista = el('ul', 'caixa-lista-pend');
    const b = botao(f.relatorioGerado ? 'Gerar de novo' : 'Gerar relatório de vendas', gerarRelatorio, 'btn');
    K.gerarRefresh = () => {
      const p = pendenciasGerar(f);
      lista.replaceChildren(...p.map((t) => el('li', null, t)));
      lista.hidden = !p.length;
      b.disabled = p.length > 0;
    };
    K.gerarRefresh();
    itens.push(lista);
    const msg = el('div', 'caixa-pendencias');
    msg.setAttribute('role', 'alert');
    if (K.erroGerar) msg.append(el('b', null, K.erroGerar));
    itens.push(msg);
    const acoes = el('div', 'caixa-acoes');
    acoes.append(b);
    itens.push(acoes);
    if (f.relatorioGerado) {
      const r = C.resumo();
      itens.push(U.situacao('Relatório gerado', 'positivo'),
        dl([['Vendas', String(C.estado.turno.vendas.length)], ['Total vendido', moeda(r.entradas)], ['Canceladas (não entram nos totais)', String(C.estado.turno.canceladas.length)],
          ['Contagem registrada', moeda(c.registrada.total)]]));
    }
    s.append(corpoSecao(...itens));
    return s;
  }

  function gerarRelatorio() {
    const f = C.estado.fechamento;
    const c = f.contagem;
    K.erroGerar = '';
    const especie = centavos(c.especie), moedas = centavos(c.moedas);
    const total = especie + moedas;
    if (f.contagem.registrada && total !== f.contagem.registrada.total && K.justContagem.trim().length < 5) {
      K.erroGerar = 'A contagem física já foi registrada. Para corrigir, explique o motivo.';
      return K.atualizar();
    }
    const esperado = C.resumo().saldo; // congelado neste instante
    const correcoes = c.registrada ? c.registrada.correcoes.slice() : [];
    if (c.registrada && total !== c.registrada.total) correcoes.push({ de: c.registrada.total, para: total, justificativa: K.justContagem.trim() });
    c.registrada = { total, especie, moedas, esperado, diferenca: C.diferencaDe(total, esperado), correcoes, em: C.hora() };
    f.relatorioGerado = true;
    K.corrigindoContagem = false;
    K.justContagem = '';
    U.avisar('Relatório de vendas gerado. A contagem foi registrada.');
    K.atualizar();
  }


  P.etapa1 = etapa1;
})();
