/*
 * Caixa — Gerência (casca): Monitor de caixas abertos (com o painel de cada caixa) + enviar recebimento ao caixa + mensagens.
 * Base no principal: CaixaMonitorAbertos, transferência sem lacre (R-231), MensagensAdminPainel/MensagemAdminEnvioDialog
 * (Caixa-Brain/06). Regras: exige `caixas_gerenciar` (só a Gerência); o monitor mostra só caixas ABERTOS (não os em
 * fechamento). Recebimento e mensagens estão em gerencia-recebimento.js e gerencia-mensagens.js. O histórico de caixas e o
 * detalhe (sem contagem cega) saíram daqui para "VND - Fechamentos de Caixa" (fechamentos*.js, Entradas › Relatórios).
 * Adaptação da casca: caixas abertos de outros PDVs são fictícios. Dados FICTÍCIOS, em centavos, só em memória.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const { el, botao } = U;
  const { moeda } = C;

  const CAMINHO = 'Entradas · Vendas / Faturamento / Lançamentos / VND - Gerência de Caixas';
  const G = window.CicluzCaixaGerencia;

  let tela = null;
  let corpo = null;
  let monSel = null; // caixa aberto escolhido no monitor
  let atualizadoEm = C.hora();

  const corpoSecao = (...nos) => { const c = el('div', 'compras-corpo'); c.append(...nos); return c; };
  const dl = (pares) => {
    const caixa = el('dl', 'caixa-declarado');
    pares.forEach(([t, v]) => { const d = el('div'); d.append(el('dt', null, t), el('dd', null, v)); caixa.append(d); });
    return caixa;
  };

  function abrir() {
    if (!tela) tela = C.criarTela({ id: 'caixa-gerencia', titulo: 'VND - Gerência de Caixas', caminho: CAMINHO });
    tela.ativar();
    atualizadoEm = C.hora();
    montar();
  }
  function montar() {
    tela.body.replaceChildren(
      C.faixaDemo('Demonstração: dados fictícios, nada é gravado. Só a Gerência (caixas_gerenciar) vê o monitor. O histórico de caixas fica em Entradas › Relatórios › Fechamentos de Caixa.', atualizar, ['operador', 'gerente', 'tesoureiro', 'financeiro']),
      corpo = el('div', 'caixa-corpo')
    );
    atualizar();
  }
  C.aoReiniciar(() => { monSel = null; if (tela) montar(); });

  /** Caixas vivos: o desta sessão (aberto ou em fechamento) + abertos fictícios (vêm do estado único). */
  const linhas = () => C.caixas().map((l) => ({ ...l, status: l.situacao }));
  const abertos = () => linhas().filter((l) => l.status === 'aberto');

  function atualizar() {
    if (!C.pode('historico')) {
      const s = U.secao('Sem permissão');
      s.append(corpoSecao(U.nota('Monitor, envio de recebimento e mensagens exigem gerenciar caixas (Gerente). Operador, Tesoureiro e Financeiro não têm este acesso. Troque o "Ver como" para Gerente.')));
      return corpo.replaceChildren(s);
    }
    corpo.replaceChildren(blocoMonitor(), ...(monSel && abertos().some((a) => a.id === monSel) ? [painelCaixa()] : []), G.recebimento(atualizar), G.mensagens(atualizar));
  }

  /* ---------- Monitor de caixas abertos ---------- */

  function blocoMonitor() {
    const ab = abertos();
    const s = U.secao('Caixas abertos agora', ab.length, [botao('Atualizar', () => { atualizadoEm = C.hora(); atualizar(); }, 'btn secondary')]);
    const chips = el('div', 'compras-chips');
    ab.forEach((a) => {
      const b = botao(a.pdv + ' - ' + a.operador + ' (desde ' + a.abertura + ')', () => { monSel = monSel === a.id ? null : a.id; atualizar(); }, 'compras-chip' + (monSel === a.id ? ' ativo' : ''));
      b.setAttribute('aria-pressed', String(monSel === a.id));
      chips.append(b);
    });
    s.append(corpoSecao(...(ab.length ? [chips] : [U.nota('Nenhum caixa aberto.')]), U.nota(ab.length + (ab.length === 1 ? ' caixa aberto' : ' caixas abertos') + ' · Última atualização ' + atualizadoEm + '. Caixas em fechamento não aparecem aqui.')));
    return s;
  }

  /* ---------- Painel do caixa escolhido no monitor ---------- */

  function painelCaixa() {
    const a = abertos().find((x) => x.id === monSel);
    const s = U.secao('Caixa · ' + a.pdv + ' · ' + a.turno + ' · ' + a.operador);
    if (a.sessao) {
      const r = C.resumo();
      const t = C.estado.turno;
      const pend = r.pendentes.reduce((x, p) => x + p.valor, 0);
      s.append(corpoSecao(dl([
        ['Saldo do caixa', moeda(r.saldo)], ['Entradas (vendas do turno)', moeda(r.entradas)],
        ['Recebimentos pendentes', r.pendentes.length ? r.pendentes.length + ' · ' + moeda(pend) : 'Nenhum'],
        ['Sangrias', C.sangriasDoCaixa().length + ' · ' + moeda(r.sangrias)], ['Vendas canceladas', String(t.canceladas.length)],
        ['PDV', t.pdvLigado ? 'Ligado' : 'Desligado desde ' + t.parada.desde],
      ])));
    } else {
      s.append(corpoSecao(dl([['Saldo do caixa', moeda(a.saldo)], ['Entradas (vendas)', moeda(a.entradas)], ['Transferências recebidas', moeda(a.transfEntrada)], ['Sangrias', moeda(a.transfSaida)]]),
        U.nota('Caixa fictício, só para o monitor ter o que mostrar.')));
    }
    return s;
  }

  C.registrar('gerencia', abrir);
})();
