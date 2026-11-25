/*
 * Caixa — VND - Vendas (Entradas › Lançamentos). Tela única que reúne as três etapas do caixa, na ordem em que acontecem:
 * 1 Abertura · 2 Turno · 3 Fechamento. Cada etapa abre a sua tela e o Voltar dela traz de volta para cá.
 * A tela só mostra em que etapa o caixa está (C.estado.status); as regras de cada etapa continuam nas próprias telas.
 * Dados FICTÍCIOS, em memória: nada é gravado.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const { el, botao } = U;

  const CAMINHO = 'Entradas · Vendas / Faturamento / Lançamentos / VND - Vendas';
  // [tela, título, texto, rótulo do botão]
  const ETAPAS = [
    ['abertura', 'Abertura de caixa', 'Conferir o malote pelo lacre e abrir o turno.', 'Abrir o caixa'],
    ['turno', 'Turno do caixa', 'Resumo, sangria, PDV e vendas do turno.', 'Ver o turno'],
    ['fechamento', 'Fechamento de caixa', 'Contagem, folha, maquininha e lacre.', 'Fechar o caixa'],
  ];
  let tela = null;

  /** Em que etapa o caixa está agora: 0 = nenhuma aberta (começa pela Abertura), 1 = turno aberto, 2 = em fechamento. */
  const etapaAtual = () => ({ fechado: 0, aberto: 1, em_fechamento: 2 }[C.estado.status] ?? 0);

  function abrir() {
    if (!tela) tela = C.criarTela({ id: 'caixa-vendas', titulo: 'VND - Vendas', caminho: CAMINHO, voltar: C.voltarLancamentos });
    tela.ativar();
    render();
  }

  function render() {
    const atual = etapaAtual();
    const aviso = U.nota('Demonstração: dados fictícios, nada é gravado. As etapas seguem a ordem do caixa: abrir, vender no turno e fechar.');
    aviso.classList.add('caixa-aviso');
    const lista = el('div', 'caixa-etapas');
    ETAPAS.forEach(([nome, titulo, texto, rotulo], i) => {
      const feito = i < atual;
      const s = el('section', 'compras-secao caixa-bloco');
      const cab = el('div', 'caixa-bloco-cab');
      cab.append(el('span', 'caixa-bloco-num ' + (feito ? 'feito' : i === atual ? 'ativo' : ''), String(i + 1)));
      const t = el('div');
      t.append(el('h3', null, titulo), el('p', null, texto));
      cab.append(t);
      s.append(cab);
      const acoes = el('div', 'caixa-acoes');
      acoes.append(botao(rotulo, () => C.abrir(nome), i === atual ? 'btn' : 'btn secondary'));
      s.append(acoes);
      lista.append(s);
    });
    tela.body.replaceChildren(aviso, lista);
  }

  C.registrar('vendas', abrir);
})();
