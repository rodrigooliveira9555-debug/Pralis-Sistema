/*
 * Caixa — Fechamento: etapa 1, Vendas (casca). Contagem cega (cédulas e moedas), folha do CREARE (leitura simulada) e "Gerar relatório de vendas".
 * Formulário linha por linha (padrão da Nova Transferência): cada assunto é um grupo com título, quadro de linhas e notas depois do quadro.
 * Parte do fechamento em 4 etapas (fechamento.js monta a tela). Estado único em CicluzCaixa.estado; o que é só da tela
 * (erros, textos digitados) vive em ctx (fechamento-comum.js). Dados FICTÍCIOS, em centavos, só em memória.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const { el, botao, entrada } = U;
  const { moeda, centavos } = C;
  const { ctx: K, linhaSituacao, cadeado, fmt, CAMPOS_FOLHA, lidoNoPdv, gerencia } = window.CicluzCaixaFechamentoComum;
  const { linha, quadro, secao } = C.pecas();
  const { valorDa, linhaCampo, linhaDinheiro, linhaLeitura } = C;
  const P = (window.CicluzCaixaFechamentoPartes = window.CicluzCaixaFechamentoPartes || {});

  /* ---------- Etapa 1: Vendas (contagem cega + folha CREARE + relatório) ---------- */
  // Formulário linha por linha: cada assunto é um grupo (título pequeno acima, quadro de linhas, notas e avisos depois do quadro).

  /** A etapa devolve a lista de grupos (nós) que a tela coloca no formulário. */
  function etapa1(f) {
    return [...blocoContagem(f), ...blocoFolha(f), ...blocoGerar(f)];
  }

  function blocoContagem(f) {
    const c = f.contagem;
    const trancada = Boolean(c.registrada) && !K.corrigindoContagem;
    const soma = () => (centavos(c.especie) || 0) + (centavos(c.moedas) || 0);
    const total = valorDa(moeda(soma()));
    const linhaDin = (chave, rotulo) => {
      const r = linhaDinheiro(rotulo, c[chave], (v) => { c[chave] = v; total.textContent = moeda(soma()); if (K.gerarRefresh) K.gerarRefresh(); }, true);
      r.input.readOnly = trancada;
      return r.no;
    };
    // Contagem cega: sem valor em destaque (são dois totais contados) e nada do sistema à vista; só a soma do que foi digitado.
    const depois = [U.nota('Aqui nada vem do sistema. Conte as cédulas e as moedas do caixa e informe os dois totais; o esperado só aparece na etapa 4.')];
    const extra = [];
    if (c.registrada) {
      depois.push(cadeado('Contagem registrada às ' + c.registrada.em + ': ' + moeda(c.registrada.total) + (gerencia() ? ' · esperado ' + moeda(c.registrada.esperado) : '')));
      if (!K.corrigindoContagem) {
        const ac = el('div', 'caixa-acoes caixa-acoes-esq');
        ac.append(botao('Corrigir contagem', () => { K.corrigindoContagem = true; K.atualizar(); }, 'btn secondary'));
        depois.push(ac);
      } else {
        const t = entrada('text', K.justContagem, { autocomplete: 'off' });
        t.oninput = () => { K.justContagem = t.value; if (K.gerarRefresh) K.gerarRefresh(); };
        extra.push(secao('Correção da contagem', quadro(linhaCampo('Por que a contagem mudou?', t, true)), U.nota('Obrigatório, mínimo 5 letras. A primeira contagem fica no histórico.')));
      }
      if (c.registrada.correcoes.length) depois.push(U.nota('Correções: ' + c.registrada.correcoes.map((x) => moeda(x.de) + ' → ' + moeda(x.para) + ' (' + x.justificativa + ')').join(' · ')));
    }
    return [secao('1 · Contagem do dinheiro (cega)', quadro(linhaDin('especie', 'Cédulas (R$)'), linhaDin('moedas', 'Moedas (R$)'), linha('Total contado', total)), ...depois), ...extra];
  }


  function blocoFolha(f) {
    const fo = f.folha;
    const a = C.estado.abertura;
    const acoes = el('div', 'caixa-acoes caixa-acoes-esq');
    acoes.append(botao(fo.anexo ? 'Trocar folha (simulado)' : 'Anexar folha (simulado)', () => {
      fo.anexo = 'folha-creare-' + a.pdv.toLowerCase() + '.jpg';
      fo.campos = null; fo.travados = true; fo.correcao = ''; fo.periodoDe = '';
      f.relatorioGerado = false; // anexar nova folha invalida o relatório já gerado
      K.atualizar();
    }, 'btn secondary'));
    if (fo.anexo && !fo.campos) acoes.append(botao('Ler folha (simulado)', () => { fo.campos = lerFolhaSimulada(); fo.periodoDe = C.primeiraVendaPdv(); fo.travados = true; K.atualizar(); }, 'btn'));
    const nos = [
      secao('2 · Folha do CREARE', quadro(linhaLeitura('Folha anexada', fo.anexo || 'Nenhuma')),
        U.nota('Fotografe ou anexe a folha impressa do PDV. No principal, uma IA lê os valores e eles ficam travados; aqui a leitura é simulada.'), acoes),
      ...K_INICIO().bloco(), // o grupo 'Início das vendas' (e o botão Ajustar início) vem montado de fechamento-inicio.js
    ];
    if (fo.campos) nos.push(...gruposFolha(fo), ...K_INICIO().avisoFolha(fo));
    return nos;
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

  /** Valores lidos da folha em linhas (nome à esquerda, valor à direita); destravados, pedem o motivo da mudança. */
  function gruposFolha(fo) {
    const linhas = CAMPOS_FOLHA.map(([k, rotulo, compara]) => {
      const i = entrada('text', fo.campos[k], { inputMode: 'decimal', readOnly: fo.travados, autocomplete: 'off' });
      i.oninput = () => { fo.campos[k] = i.value; };
      return linhaCampo(rotulo + (compara ? '' : ' (só exibido)'), i);
    });
    const depois = [];
    if (fo.travados) {
      const ac = el('div', 'caixa-acoes caixa-acoes-esq');
      ac.append(cadeado('Valores lidos pela folha ficam travados.'), botao('Corrigir manualmente', () => { fo.travados = false; K.atualizar(); }, 'btn secondary'));
      depois.push(ac);
    }
    const nos = [secao('Valores lidos da folha (R$)', quadro(...linhas), ...depois)];
    if (!fo.travados) {
      const j = entrada('text', fo.correcao, { autocomplete: 'off' });
      j.oninput = () => { fo.correcao = j.value; if (K.gerarRefresh) K.gerarRefresh(); };
      nos.push(secao('Correção manual da folha', quadro(linhaCampo('Por que o valor mudou?', j, true)),
        U.nota('Explique em pelo menos 5 letras. Fica registrado em "Correções manuais" no relatório final e no dossiê da Tesouraria.')));
    }
    return nos;
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
    const filhos = [];
    if (f.relatorioGerado) {
      const r = C.resumo();
      filhos.push(quadro(linhaSituacao('Situação', 'Relatório gerado', 'positivo'), linhaLeitura('Vendas', String(C.estado.turno.vendas.length)), linhaLeitura('Total vendido', moeda(r.entradas)),
        linhaLeitura('Vendas canceladas', String(C.estado.turno.canceladas.length)), linhaLeitura('Contagem registrada', moeda(c.registrada.total))),
      U.nota('As vendas canceladas não entram nos totais.'));
    }
    const lista = el('ul', 'caixa-lista-pend');
    const b = botao(f.relatorioGerado ? 'Gerar de novo' : 'Gerar relatório de vendas', gerarRelatorio, 'btn');
    K.gerarRefresh = () => {
      const p = pendenciasGerar(f);
      lista.replaceChildren(...p.map((t) => el('li', null, t)));
      lista.hidden = !p.length;
      b.disabled = p.length > 0;
    };
    K.gerarRefresh();
    filhos.push(lista);
    const msg = el('div', 'caixa-pendencias');
    msg.setAttribute('role', 'alert');
    if (K.erroGerar) msg.append(el('b', null, K.erroGerar));
    filhos.push(msg);
    const acoes = el('div', 'caixa-acoes');
    acoes.append(b);
    filhos.push(acoes);
    return [secao('3 · Gerar relatório de vendas', ...filhos)];
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
