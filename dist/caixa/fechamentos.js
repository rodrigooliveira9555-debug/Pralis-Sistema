/*
 * Caixa — VND - Fechamentos de Caixa (casca): a tela. Junta a fila de conferência da Tesouraria e o histórico de caixas
 * (que moravam em "Conferência de Fechamentos" e na Gerência) em um lugar só. Lista e filtros em fechamentos-lista.js,
 * dossiê em fechamentos-dossie.js, decisão em fechamentos-decisao.js. Menu: Entradas › Relatórios.
 * Acesso: Tesoureiro (vê e decide), Financeiro (consulta), Gerente (histórico e detalhe sem contagem); Operador não entra.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const F = window.CicluzCaixaFechamentos;
  const { el } = U;

  const CAMINHO = 'Entradas · Vendas / Faturamento / Relatórios / VND - Fechamentos de Caixa';
  let tela = null;
  let corpo = null;

  function abrir() {
    if (!tela) tela = C.criarTela({ id: 'caixa-fechamentos', titulo: 'VND - Fechamentos de Caixa', caminho: CAMINHO });
    tela.ativar();
    montar();
  }
  function montar() {
    tela.body.replaceChildren(
      C.faixaDemo('Demonstração: dados fictícios, nada é gravado. A Tesouraria decide; o Financeiro consulta; a Gerência vê o histórico sem a contagem. Mude o “Ver como”.', atualizar, ['operador', 'gerente', 'tesoureiro', 'financeiro']),
      corpo = el('div', 'caixa-corpo')
    );
    atualizar();
  }
  F.ctx.atualizar = atualizar;
  C.aoReiniciar(() => { F.reiniciarTela(); if (tela) montar(); });

  function atualizar() {
    if (!C.pode('fechamentos')) {
      const s = U.secao('Sem permissão');
      s.append(F.corpoSecao(U.nota('Os fechamentos de caixa são da Tesouraria, do Financeiro (consulta) e da Gerência (histórico). O Operador não tem este acesso. Troque o “Ver como”.')));
      return corpo.replaceChildren(s);
    }
    const { secao, vazia } = F.lista();
    const partes = [secao];
    const sel = F.ctx.selecionado;
    if (sel) {
      if (F.veTudo()) {
        const l = F.linhas().find((x) => x.id === sel);
        if (l) partes.push(...F.detalheGerencia(l));
      } else {
        const h = F.fechados().find((x) => x.id === sel);
        if (h) partes.push(...F.dossie(h), F.decisao(h));
      }
    } else if (!vazia) partes.push(U.nota(F.veTudo() ? 'Selecione um caixa na lista para ver o detalhe.' : 'Selecione um caixa na lista para ver o dossiê' + (C.pode('conferir') ? ' e decidir.' : '.')));
    corpo.replaceChildren(...partes);
  }

  C.registrar('fechamentos', abrir);
})();
