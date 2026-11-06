/*
 * Caixa — Tesouraria (casca): a área do tesoureiro em Transferências · Contas / Locais → Lançamentos. Três abas: Transferências (painel,
 * filtros, lacres, conferir recebimento), Nova transferência (malote ou comum) e Contas e saldos (com ajuste de saldo). Cada aba vive em
 * tesouraria-lista.js, tesouraria-conferir.js, tesouraria-transferencia.js e tesouraria-contas.js; tudo lê e grava no estado único.
 * Base no principal: TesourariaCockpit (/transferencias) e ContasPage (/contas). Acesso: Tesoureiro, Financeiro e Gerente.
 * O fio: sangria e retorno final do caixa chegam aqui PENDENTES; ao conferir, o Cofre recebe e o saldo das contas muda.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const { el } = U;
  const T = window.CicluzCaixaTesouraria;

  const CAMINHO = 'Transferências · Contas / Locais / Lançamentos / CNT - Tesouraria';
  const ABAS = [['transferencias', 'Transferências'], ['nova', 'Nova transferência'], ['contas', 'Contas e saldos']];
  let tela = null;
  let corpo = null;
  let aba = 'transferencias';

  function abrir() {
    if (!tela) tela = C.criarTela({ id: 'caixa-tesouraria', titulo: 'CNT - Tesouraria', caminho: CAMINHO, voltar: () => menuBack(1, 'Lançamentos')() });
    tela.ativar();
    aba = 'transferencias'; // ao entrar na tela começa sempre pelo painel
    montar();
  }
  function montar() {
    tela.body.replaceChildren(
      C.faixaDemo('Demonstração: dados fictícios, nada é gravado. A sangria e o retorno final dos caixas chegam aqui pendentes.', atualizar, ['operador', 'gerente', 'tesoureiro', 'financeiro']),
      corpo = el('div', 'caixa-corpo')
    );
    atualizar();
  }
  C.aoReiniciar(() => { aba = 'transferencias'; if (tela) montar(); });
  T.irParaLista = () => { aba = 'transferencias'; atualizar(); };

  function atualizar() {
    if (!C.pode('tesouraria')) {
      const s = U.secao('Sem permissão');
      s.append((() => { const c = el('div', 'compras-corpo'); c.append(U.nota('A Tesouraria é do Tesoureiro, do Financeiro e do Gerente. Operador de caixa não vê transferências nem contas. Troque o "Ver como".')); return c; })());
      return corpo.replaceChildren(s);
    }
    const abas = U.chips(ABAS, aba, (v) => { aba = v; atualizar(); });
    const conteudo = aba === 'nova' ? [T.nova(atualizar)] : aba === 'contas' ? [T.contas(atualizar)] : T.lista(atualizar);
    corpo.replaceChildren(abas, ...conteudo);
  }

  C.registrar('tesouraria', abrir);
})();
