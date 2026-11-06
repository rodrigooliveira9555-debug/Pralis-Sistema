/*
 * Produção: entrada do módulo no menu do S2.
 *  - Saídas · Mercadorias → Lançamentos Produção: pedidos, mapa e abastecimento; → Relatórios: MER - Produção.
 *  - Agenda → MER - Agenda de Produção (agendamento dos pedidos de produção).
 *  - Saídas · Mercadorias → Cadastros Geral Produção: produtos da produção, fichas técnicas e parâmetros de custo.
 *  - Saídas · Retiradas → Cadastros Geral → RET - Patrimônios (a tela que já existia, agora salva).
 * Reaproveita as peças de tela do Compras (CicluzComprasUI); cada tela se registra com registrar().
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const telas = {};
  // Ícones próprios, acrescentados ao conjunto do Compras para criarTela/linhaLista acharem pelo nome.
  Object.assign(U.ICONES, {
    forno: '<path d="M3 4h18v16H3zM3 9h18M7 6.5h.01M10 6.5h.01M7 13h10v4H7z"/>',
    ficha: '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7"/>',
    mapa: '<path d="M3 5h5v14H3zM10 5h5v9h-5zM17 5h4v6h-4zM10 17h5M17 14h4"/>',
    patrimonio: '<path d="M4 20V9l8-5 8 5v11M4 20h16M9 20v-6h6v6M8 11h.01M16 11h.01"/>',
    cifrao: '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    relatorio: '<path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3M20 16V6"/>',
    entrega: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-.01M17 19a2 2 0 1 0 0-.01M6 11l2 2 3-3"/>',
  });
  // Cor de origem: Produção fica em Mercadorias (verde, como o Compras); Patrimônio é RET (azul).
  const COR = U.COR;
  const COR_RET = '#2563eb';
  const COR_RET_TEXTO = '#174ca1';

  // Lugar de cada tela pela lógica do Rodrigo (vídeo de 06/11/2026), igual ao Compras:
  // Lançamentos Produção = rotina da produção; Relatórios = ver resultado; Cadastros Geral Produção = fichas e o que
  // a produção precisa ter cadastrado; o agendamento fica na Agenda (MER - Agenda de Produção, em agenda-menu.js).
  const CARDS = [
    ['pedidos', 'MER - Pedidos de Produção', 'A loja pede; pedido extra pelo celular', 'lista'],
    ['mapa', 'MER - Mapa de Produção', 'Por horário, processo, setor ou produto', 'mapa'],
    ['abastecimento', 'MER - Abastecimento', 'Entrega na loja, conferência, sobra e descarte', 'entrega'],
  ];
  const RELATORIOS = [
    ['relatorios', 'MER - Produção', 'Mais produzidos, mais vendidos, sobra e descarte', 'relatorio'],
  ];
  const AGENDA = [
    ['agendamento', 'MER - Agenda de Produção', 'Produtos, janela de demanda e repetição', 'agenda'],
  ];
  const CADASTROS = [
    ['produtos', 'MER - Produtos da Produção', 'Como se pede: utensílio, fornada, mínimo e máximo', 'forno'],
    ['fichas', 'MER - Ficha Técnica de Produtos', 'Etapas, ingredientes, equipamentos e tempos', 'ficha'],
    ['custos', 'MER - Parâmetros de Custo', 'Horas por mês, encargos, preço do kWh e do gás', 'cifrao'],
  ];
  const icone = (target) => {
    const nome = target.replace(/^producao:/, '');
    const item = [...CARDS, ...RELATORIOS, ...AGENDA, ...CADASTROS].find((c) => c[0] === nome);
    return U.svg(U.ICONES[item ? item[3] : 'forno']);
  };

  const voltarProducao = () => menuBack(3, 'Lançamentos Produção')();
  const voltarCadastros = () => menuBack(3, 'Cadastros Geral Produção')();
  const voltarRelatorios = () => menuBack(3, 'Relatórios')();
  const voltarAgenda = () => returnToNavigation();
  const voltarPatrimonio = () => menuBack(4, 'Cadastros Geral')();

  function registrar(nome, abrir) { telas[nome] = abrir; }
  function abrir(nome, ...args) {
    const t = telas[nome];
    if (t) return t(...args);
    console.warn('Produção: tela não encontrada', nome);
  }

  window.CicluzProducao = {
    cards: () => CARDS.map(([id, t, d]) => [t, d, 'producao:' + id]),
    relatorioCards: () => RELATORIOS.map(([id, t, d]) => [t, d, 'producao:' + id]),
    cadastroCards: () => CADASTROS.map(([id, t, d]) => [t, d, 'producao:' + id]),
    icone, abrir, registrar, voltarProducao, voltarCadastros, voltarRelatorios, voltarAgenda, voltarPatrimonio,
    COR, COR_RET, COR_RET_TEXTO,
    CAMINHO: 'Saídas · Mercadorias / Lançamentos Produção / ',
    CAMINHO_CAD: 'Saídas · Mercadorias / Cadastros Geral Produção / ',
    CAMINHO_REL: 'Saídas · Mercadorias / Relatórios / ',
    CAMINHO_AGENDA: 'Agenda · Atividades / ',
  };
})();
