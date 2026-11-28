/*
 * Open Finance (Caixa Econômica TNP, Bradesco HORA, Caixa Econômica LI) — estado, nomes em português e as contas da tela (filtros, totais, grupos, CSV).
 * O coletor manda o período (até 31 dias) de uma vez; os filtros de busca, tipo, operação, categoria, situação e valor
 * são aplicados aqui, sem nova ida ao servidor. Dinheiro em CENTAVOS inteiros: entrada positiva, saída negativa;
 * pendente não entra nos totais (só na contagem).
 */
(function () {
  'use strict';
  const FUSO = 'America/Sao_Paulo';
  const U = window.CicluzComprasUI;

  const hojeIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(new Date());
  const somarDias = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const reais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const moeda = (centavos) => reais.format((Number(centavos) || 0) / 100);
  const comSinal = (centavos) => (centavos < 0 ? '−' : '+') + moeda(Math.abs(centavos));
  /** "1 lançamento", "3 lançamentos" (nada de "lançamento(s)"). */
  const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);
  const quando = (iso) => (iso ? new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)).replace(',', ' às') : '—');
  const dataComAno = (iso) => (iso ? new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso)) : '—');
  // Data sem hora (vencimento, fechamento, data da compra): o dia como veio, sem passar por fuso.
  const dataCurta = (iso) => (iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(2, 4) : '—');
  // Banco que só informa o dia manda meia-noite UTC: aí não há hora (mostrar 21:00 do dia anterior seria falso).
  const hora = (iso) => (!iso || /T00:00:00(\.000)?Z$/.test(iso) ? '' : new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' }).format(new Date(iso)));
  const diaLongo = (iso) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', weekday: 'long', day: '2-digit', month: '2-digit' }).format(new Date(iso + 'T12:00:00Z'));

  /* Nomes em português. O que não estiver aqui aparece como veio (nada some). */
  const OPERACOES = {
    PIX: 'Pix', TED: 'TED', DOC: 'DOC', BOLETO: 'Boleto', TRANSFERENCIA_MESMA_INSTITUICAO: 'Transferência entre contas Caixa',
    CONVENIO_ARRECADACAO: 'Convênio e arrecadação', PACOTE_TARIFA_SERVICOS: 'Pacote de tarifas', TARIFA_SERVICOS_AVULSOS: 'Tarifa avulsa',
    FOLHA_PAGAMENTO: 'Folha de pagamento', DEPOSITO: 'Depósito', SAQUE: 'Saque', CARTAO: 'Cartão',
    ENCARGOS_JUROS_CHEQUE_ESPECIAL: 'Juros do cheque especial', RENDIMENTO_APLIC_FINANCEIRA: 'Rendimento de aplicação',
    PORTABILIDADE_SALARIO: 'Portabilidade de salário', RESGATE_APLIC_FINANCEIRA: 'Resgate de aplicação', OPERACAO_CREDITO: 'Operação de crédito',
    PAGAMENTO: 'Pagamento', PAGAMENTO_FATURA: 'Pagamento da fatura', TARIFA: 'Tarifa', OPERACOES_CREDITO_CONTRATADAS_CARTAO: 'Crédito contratado no cartão',
    ESTORNO: 'Estorno', CASHBACK: 'Cashback', OUTROS: 'Outros',
  };
  const CATEGORIAS = {
    'Food and drinks': 'Alimentação e bebidas', Groceries: 'Mercado e atacado', Services: 'Serviços', 'Same person transfer': 'Transferência entre contas próprias',
    'Transfer - TED': 'Transferência TED', 'Transfer - Bank Slip': 'Boleto', 'Bank fees': 'Tarifas bancárias', 'Non-recurring income': 'Receita eventual',
    'Transfer - PIX': 'Transferência Pix', 'Office supplies': 'Material de escritório', Shopping: 'Compras', 'Tax on financial operations': 'IOF',
    'Mutual funds': 'Fundos de investimento', 'Entrepreneurial activities': 'Atividade empresarial', 'Late payment and overdraft costs': 'Juros e atraso',
    Taxes: 'Impostos', 'Account fees': 'Tarifa da conta', 'Transfer - Cash': 'Dinheiro', Electronics: 'Eletrônicos', Water: 'Água', Transfers: 'Transferências',
    'Digital services': 'Serviços digitais', Telecommunications: 'Telefonia e internet', Utilities: 'Contas de consumo', Lottery: 'Lotérica',
    'Interests charged': 'Juros cobrados', Education: 'Educação', 'Hospital clinics and labs': 'Clínicas e exames', Houseware: 'Utilidades domésticas',
    Healthcare: 'Saúde', Housing: 'Moradia', Electricity: 'Energia elétrica', Insurance: 'Seguros', 'Transfer - Check': 'Cheque', 'Health insurance': 'Plano de saúde',
    'Parking': 'Estacionamento', 'Gas stations': 'Combustível', Transportation: 'Transporte', 'Credit card payment': 'Pagamento do cartão', Income: 'Receitas',
    Salary: 'Salário', 'Loans and financing': 'Empréstimos e financiamentos', Investments: 'Investimentos', 'Fixed income': 'Renda fixa', Restaurants: 'Restaurantes',
    Delivery: 'Entregas', Leisure: 'Lazer', Travel: 'Viagens', 'Wholesale': 'Atacado', Pharmacy: 'Farmácia', Clothing: 'Roupas', Vehicle: 'Veículo',
    'Rent': 'Aluguel', 'Withdrawal': 'Saque', 'Proceeds interests and dividends': 'Rendimentos', 'Transfer - Internal': 'Transferência interna',
  };
  const FORMAS = { PIX: 'Pix', TED: 'TED', DOC: 'DOC', TEF: 'Transferência entre contas', BOLETO: 'Boleto', OTHER: 'Outra' };
  const nomeOperacao = (v) => (v ? OPERACOES[v] || v.replaceAll('_', ' ').toLocaleLowerCase('pt-BR').replace(/^./, (c) => c.toUpperCase()) : 'Sem operação');
  const nomeCategoria = (v) => (v ? CATEGORIAS[v] || v : 'Sem categoria');
  const nomeForma = (v) => (v ? FORMAS[v] || v : '');
  // Curto, para caber nas abas do celular; o nome do banco e o número ficam na dica da aba.
  const nomeConta = (c) => (c.tipo === 'CREDIT' ? 'Cartão ' + (c.detalhes.bandeira || c.nome).toString().replace(/^(CAIXA|BRADESCO)\s+/i, '') : c.subtipo === 'SAVINGS_ACCOUNT' ? 'Poupança' : 'Corrente');

  /* ---------- Estado ---------- */

  const filtroVazio = () => ({ busca: '', tipo: '', operacao: '', categoria: '', situacao: '', valorMin: '', valorMax: '' });
  const estado = {
    fonte: 'tnp', desde: somarDias(hojeIso(), -6), ate: hojeIso(), conta: '',
    filtro: filtroVazio(), dados: null, carregando: false, erro: '', configurado: {}, atualizadoEm: null,
  };
  const reiniciarFiltro = () => { estado.filtro = filtroVazio(); };
  // Outra empresa: conta, filtros e dados são dela; o período escolhido continua.
  function trocarFonte(fonte) {
    Object.assign(estado, { fonte, conta: '', dados: null, carregando: false, erro: '', atualizadoEm: null });
    reiniciarFiltro();
  }
  const filtrosEmUso = () => ['operacao', 'categoria', 'situacao', 'valorMin', 'valorMax'].filter((k) => estado.filtro[k]).length;

  /** "12,50" ou "12.50" ou "1.234,56" -> centavos; vazio ou inválido -> null. */
  function lerValor(texto) {
    const t = String(texto || '').trim().replace(/[R$\s]/g, '');
    if (!t) return null;
    const normal = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
    const n = Number(normal);
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
  }

  const todos = (d) => (d ? d.dias.flatMap((x) => x.lancamentos) : []);
  const textoBusca = (l) => U.dobrar([l.descricao, l.contraparte, l.detalhes.descricaoBanco, l.detalhes.documento && l.detalhes.documento.numero,
    l.detalhes.estabelecimento && l.detalhes.estabelecimento.nome, nomeCategoria(l.categoria), nomeOperacao(l.operacao)].filter(Boolean).join(' '));

  /** Os lançamentos do período que passam nos filtros. */
  function filtrados(d) {
    const f = estado.filtro;
    const termo = U.dobrar(f.busca.trim());
    const min = lerValor(f.valorMin);
    const max = lerValor(f.valorMax);
    return todos(d).filter((l) => {
      if (f.tipo === 'entrada' && l.valorCentavos < 0) return false;
      if (f.tipo === 'saida' && l.valorCentavos >= 0) return false;
      if (f.operacao && (l.operacao || '') !== f.operacao) return false;
      if (f.categoria && (l.categoria || '') !== f.categoria) return false;
      if (f.situacao && l.situacao !== f.situacao) return false;
      const valor = Math.abs(l.valorCentavos);
      if (min !== null && valor < min) return false;
      if (max !== null && valor > max) return false;
      return !termo || textoBusca(l).includes(termo);
    });
  }

  /**
   * Totais dos lançamentos. Na conta, pendente só conta (o banco ainda não confirmou). No cartão (cartao = true),
   * pendente é compra da fatura que está aberta: gasto de verdade, entra no total.
   */
  function somar(lista, cartao = false) {
    const t = { entradas: 0, saidas: 0, liquido: 0, quantidade: lista.length, pendentes: 0 };
    lista.forEach((l) => {
      if (l.situacao === 'PENDING') { t.pendentes += 1; if (!cartao) return; }
      if (l.valorCentavos >= 0) t.entradas += l.valorCentavos; else t.saidas += l.valorCentavos;
    });
    t.liquido = t.entradas + t.saidas;
    return t;
  }

  /** Por dia, mais novo primeiro, com os totais do dia. */
  function porDia(lista, cartao = false) {
    const dias = new Map();
    lista.forEach((l) => {
      if (!dias.has(l.dia)) dias.set(l.dia, []);
      dias.get(l.dia).push(l);
    });
    return [...dias.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([dia, lancamentos]) => ({ dia, lancamentos, ...somar(lancamentos, cartao) }));
  }

  /** Agrupa por categoria ou operação: total (das saídas ou das entradas) e quantidade, maior primeiro. */
  function agrupar(lista, chave, sinal, cartao = false) {
    const grupos = new Map();
    lista.filter((l) => (cartao || l.situacao !== 'PENDING') && (sinal < 0 ? l.valorCentavos < 0 : l.valorCentavos >= 0)).forEach((l) => {
      const id = l[chave] || '';
      const g = grupos.get(id) || { id, total: 0, quantidade: 0 };
      g.total += Math.abs(l.valorCentavos);
      g.quantidade += 1;
      grupos.set(id, g);
    });
    return [...grupos.values()].sort((a, b) => b.total - a.total);
  }

  /** Opções de um filtro (operação ou categoria) com a quantidade no período. */
  function opcoes(d, chave, nome) {
    const contagem = new Map();
    todos(d).forEach((l) => { const v = l[chave] || ''; if (v) contagem.set(v, (contagem.get(v) || 0) + 1); });
    return [...contagem.entries()].map(([v, n]) => [v, nome(v) + ' (' + n + ')']).sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
  }

  /* ---------- CSV (abre no Excel em português: ponto e vírgula, vírgula decimal, BOM) ---------- */

  function csv(lista, contas) {
    const nomes = new Map(contas.map((c) => [c.contaId, nomeConta(c)]));
    // Texto que começa com = + - @ viraria fórmula no Excel: ganha um apóstrofo na frente (o valor em reais fica número).
    const campo = (v, numero = false) => {
      let t = String(v == null ? '' : v);
      if (!numero && /^[=+\-@\t\r]/.test(t)) t = "'" + t;
      return /[";\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
    };
    const linhas = [['Data', 'Hora', 'Conta', 'Descrição', 'Operação', 'Categoria', 'Quem pagou/recebeu', 'Documento', 'Estabelecimento', 'Parcela', 'Valor', 'Situação']];
    lista.forEach((l) => {
      const d = l.detalhes;
      linhas.push([dataCurta(l.dia), hora(l.data), nomes.get(l.contaId) || '', l.descricao, nomeOperacao(l.operacao), nomeCategoria(l.categoria), l.contraparte || '',
        d.documento ? d.documento.numero : '', d.estabelecimento ? d.estabelecimento.nome || '' : '',
        d.cartao && d.cartao.parcelas ? d.cartao.parcela + '/' + d.cartao.parcelas : '',
        (l.valorCentavos / 100).toFixed(2).replace('.', ','), l.situacao === 'PENDING' ? 'Pendente' : 'Lançado']);
    });
    const COLUNA_VALOR = 10;
    return '﻿' + linhas.map((l, i) => l.map((v, c) => campo(v, i > 0 && c === COLUNA_VALOR)).join(';')).join('\r\n');
  }

  function baixarCsv(lista, contas) {
    const blob = new Blob([csv(lista, contas)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'extrato-' + estado.fonte + '-' + estado.desde + '-a-' + estado.ate + '.csv';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  window.CicluzExtratoTnpDados = {
    FUSO, estado, hojeIso, somarDias, moeda, comSinal, plural, quando, dataComAno, dataCurta, hora, diaLongo,
    nomeOperacao, nomeCategoria, nomeForma, nomeConta, reiniciarFiltro, trocarFonte, filtrosEmUso, lerValor,
    todos, filtrados, somar, porDia, agrupar, opcoes, csv, baixarCsv,
  };
})();
