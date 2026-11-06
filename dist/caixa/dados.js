/*
 * Caixa — dados FICTÍCIOS da casca (sementes). Só dados: o estado vivo mora em modulo.js (CicluzCaixa.estado).
 * Dinheiro sempre em CENTAVOS. Cada função devolve uma cópia nova, para "Recomeçar a demonstração" zerar tudo.
 */
(function () {
  'use strict';

  /** Contas/locais. As 8 contas de posto são PDV 1–4 × Manhã/Tarde (Caixa 1M … 4T). */
  const contas = () => [
    { id: 'cofre', nome: 'Cofre Principal', tipo: 'cofre', inicial: 10000000 },
    { id: 'troco', nome: 'Cofre Troco', tipo: 'cofre', inicial: 500000 },
    ...[1, 2, 3, 4].flatMap((n) => [['M', 'Manhã'], ['T', 'Tarde']].map(([s, turno]) => ({ id: 'cx-' + n + s.toLowerCase(), nome: 'Caixa ' + n + s, tipo: 'caixa', pdv: 'PDV ' + n, turno, inicial: 0 }))),
  ];

  /** O malote 001 (PDV 1 · Manhã) já está pronto desde o início da demonstração. */
  const transferencias = () => [
    { id: 'tr-001', data: new Date().toLocaleDateString('pt-BR'), tipo: 'malote', origem: 'cofre', destino: 'cx-1m', valor: 35000, especie: 30000, moedas: 5000, valorRecebido: null, lacre: '001', lacreFechamento: 'FCH-001', bolsas: ['SNG-014', 'SNG-015'],
      situacao: 'pendente', caixaId: null, criadoPor: 'Carla (Tesoureiro)', criadoEm: '07:30', observacao: '' },
    // Retornos finais dos caixas de ontem, ainda esperando a conferência da Tesouraria.
    { id: 'tr-090', data: '04/11/2026', tipo: 'retorno_final', origem: 'cx-2t', destino: 'cofre', valor: 41200, especie: 41200, moedas: 0, valorRecebido: null, lacre: 'FCH-090', situacao: 'pendente', caixaId: 'cx-90', criadoPor: 'Bruna Costa', criadoEm: '21:58', observacao: '' },
    { id: 'tr-091', data: '04/11/2026', tipo: 'retorno_final', origem: 'cx-3m', destino: 'cofre', valor: 38400, especie: 38400, moedas: 0, valorRecebido: null, lacre: 'FCH-091', situacao: 'pendente', caixaId: 'cx-91', criadoPor: 'Carlos Henrique', criadoEm: '13:55', observacao: '' },
    { id: 'tr-092', data: '03/11/2026', tipo: 'retorno_final', origem: 'cx-1t', destino: 'cofre', valor: 35300, especie: 35300, moedas: 0, valorRecebido: 35300, lacre: 'FCH-088', situacao: 'recebida', caixaId: 'cx-92', criadoPor: 'Ana Paula', criadoEm: '22:01', observacao: '' },
  ];

  /** Lacres: abertura, fechamento (reservado) e bolsas de sangria. O estado de cada um é gravado aqui. */
  const lacres = () => [
    { numero: '001', tipo: 'abertura', transferenciaId: 'tr-001', situacao: 'disponivel' },
    { numero: 'FCH-001', tipo: 'fechamento', transferenciaId: 'tr-001', situacao: 'reservado' },
    { numero: 'SNG-014', tipo: 'sangria', transferenciaId: 'tr-001', situacao: 'disponivel' },
    { numero: 'SNG-015', tipo: 'sangria', transferenciaId: 'tr-001', situacao: 'disponivel' },
    { numero: 'FCH-090', tipo: 'fechamento', transferenciaId: 'tr-090', situacao: 'usado' },
    { numero: 'FCH-091', tipo: 'fechamento', transferenciaId: 'tr-091', situacao: 'usado' },
    { numero: 'FCH-088', tipo: 'fechamento', transferenciaId: 'tr-092', situacao: 'usado' },
  ];

  /** Fecha o saldo das contas dos caixas de ontem (vendas e quebra já lançadas), para ficarem em zero depois do retorno. */
  const lancamentos = () => [
    { contaId: 'cx-2t', tipo: 'fechamento', valor: 41200, ref: 'cx-90' },
    { contaId: 'cx-3m', tipo: 'fechamento', valor: 38400, ref: 'cx-91' },
    { contaId: 'cx-1t', tipo: 'fechamento', valor: 35300, ref: 'cx-92' },
  ];

  /** Caixas de "ontem" já fechados (Conferência/Histórico). `retornoId` aponta para a transferência do retorno final. */
  const fechamentos = () => [
    { id: 'cx-90', data: '04/11/2026', pdv: 'PDV 2', turno: 'Tarde', contaId: 'cx-2t', operador: 'Bruna Costa', supervisor: 'Patrícia Souza', abertura: '14:00', fechamento: '21:58', fechadoPor: 'Bruna Costa',
      entradas: 612350, transfEntrada: 35000, transfSaida: 0, esperado: 41200, contado: 41200, diferenca: 0, lacreFechamento: 'FCH-090', lacreReservado: 'FCH-090', observacao: '',
      retornoId: 'tr-090', conferencias: [], anexos: { folha: 1, creare: 1, comprovantes: 1 },
      contagem: { especie: 41000, moedas: 200, total: 41200, correcoes: [] }, pdvForma: { 'Crédito': 210000, 'Débito': 135050, Dinheiro: 180100, Pix: 65000, Voucher: 22200 },
      folha: { campos: { trocoInicial: '350,00', saldoInicial: '0,00', clientes: '412', credito: '2.100,00', debito: '1.350,50', dinheiro: '1.801,00', pix: '650,00', voucher: '222,00', total: '6.123,50', despesas: '0,00', sangria: '0,00', saldoFinal: '412,00' }, correcao: '' },
      maquininha: { credito: '2.100,00', debito: '1.350,50', pix: '650,00', voucher: '222,00' }, paradas: [], canceladas: 0, },
    { id: 'cx-91', data: '04/11/2026', pdv: 'PDV 3', turno: 'Manhã', contaId: 'cx-3m', operador: 'Carlos Henrique', supervisor: 'Marcos Lima', abertura: '06:00', fechamento: '13:55', fechadoPor: 'Carlos Henrique',
      entradas: 488900, transfEntrada: 35000, transfSaida: 0, esperado: 38900, contado: 38400, diferenca: -500, lacreFechamento: 'FCH-091', lacreReservado: 'FCH-091', observacao: 'Faltou uma nota de R$ 5,00 no troco do início da manhã.',
      retornoId: 'tr-091', conferencias: [], anexos: { folha: 1, creare: 1, comprovantes: 1 },
      contagem: { especie: 38000, moedas: 400, total: 38400, correcoes: [] }, pdvForma: { 'Crédito': 150000, 'Débito': 120000, Dinheiro: 130900, Pix: 60000, Voucher: 28000 },
      folha: { campos: { trocoInicial: '350,00', saldoInicial: '0,00', clientes: '377', credito: '1.500,00', debito: '1.200,00', dinheiro: '1.304,00', pix: '600,00', voucher: '280,00', total: '4.884,00', despesas: '0,00', sangria: '0,00', saldoFinal: '389,00' }, correcao: '' },
      maquininha: { credito: '1.500,00', debito: '1.200,00', pix: '600,00', voucher: '280,00' }, canceladas: 1,
      paradas: [{ desde: '09:10', ate: '09:42', motivos: ['Falta de energia na loja'], outro: '' }], },
    { id: 'cx-92', data: '03/11/2026', pdv: 'PDV 1', turno: 'Tarde', contaId: 'cx-1t', operador: 'Ana Paula', supervisor: 'Marcos Lima', abertura: '14:02', fechamento: '22:01', fechadoPor: 'Ana Paula',
      entradas: 530120, transfEntrada: 35000, transfSaida: 20000, esperado: 35000, contado: 35300, diferenca: 300, lacreFechamento: 'FCH-088', lacreReservado: 'FCH-088', observacao: 'Sobra de R$ 3,00: cliente deixou o troco.',
      retornoId: 'tr-092', conferencias: [{ resultado: 'conferido', observacao: '', por: 'Carla (Tesoureiro)', em: '04/11 08:10' }], anexos: { folha: 1, creare: 1, comprovantes: 1 },
      contagem: { especie: 35000, moedas: 300, total: 35300, correcoes: [] }, pdvForma: { 'Crédito': 160000, 'Débito': 100000, Dinheiro: 150120, Pix: 90000, Voucher: 30000 },
      folha: { campos: { trocoInicial: '350,00', saldoInicial: '0,00', clientes: '441', credito: '1.600,00', debito: '1.000,00', dinheiro: '1.501,20', pix: '900,00', voucher: '300,00', total: '5.301,20', despesas: '0,00', sangria: '200,00', saldoFinal: '353,00' }, correcao: '' },
      maquininha: { credito: '1.600,00', debito: '1.000,00', pix: '900,00', voucher: '300,00' }, paradas: [], canceladas: 0, },
  ];

  /** Caixas abertos de OUTROS PDVs (só para o monitor da Gerência ter o que mostrar). */
  const caixasFicticios = () => [
    { id: 'ab-2', pdv: 'PDV 2', turno: 'Manhã', contaId: 'cx-2m', operador: 'Bruna Costa', abertura: '06:02', entradas: 214300, transfEntrada: 35000, transfSaida: 0, saldo: 93000, situacao: 'aberto', ficticio: true },
    { id: 'ab-3', pdv: 'PDV 3', turno: 'Manhã', contaId: 'cx-3m', operador: 'Carlos Henrique', abertura: '06:00', entradas: 188700, transfEntrada: 35000, transfSaida: 20000, saldo: 73000, situacao: 'aberto', ficticio: true },
  ];

  // [minuto depois da abertura, forma (ou formas [[forma, centavos]]), itens [[produto, qtd, unitário]]]
  const vendas = [
    [6, 'Dinheiro', [['Pão francês', 10, 80], ['Café coado', 1, 450]]],
    [14, 'Pix', [['Bolo de cenoura (fatia)', 2, 750], ['Suco de laranja', 1, 800]]],
    [22, 'Débito', [['Pão de queijo', 6, 350]]],
    [31, 'Crédito', [['Pão francês', 20, 80], ['Leite 1 L', 2, 620], ['Manteiga 200 g', 1, 1290]]],
    [40, 'Dinheiro', [['Coxinha', 2, 650]]],
    [47, 'Voucher', [['Marmitex', 1, 2490]]],
    [55, [['Dinheiro', 2000], ['Pix', 1090]], [['Torta de frango', 1, 1890], ['Refrigerante lata', 2, 600]]],
    [63, 'Pix', [['Pão de forma', 1, 1190], ['Café coado', 2, 450]]],
    [71, 'Crédito', [['Bolo inteiro', 1, 4800]]],
    [80, 'Dinheiro', [['Pão francês', 5, 80], ['Água 500 ml', 1, 400]]],
    [92, 'Débito', [['Sonho', 3, 550]]],
    [105, 'Dinheiro', [['Café coado', 3, 450], ['Pão na chapa', 2, 500]]],
  ];
  const canceladas = [
    { min: 35, id: 'CRE-000231', forma: 'Dinheiro', autorizadoPor: 'Marcos Lima', motivo: 'Cliente desistiu', justificativa: 'Cliente saiu sem pagar a venda no balcão.', itens: [['Coxinha', 4, 650]] },
    { min: 88, id: 'CRE-000236', forma: 'Pix', autorizadoPor: 'Patrícia Souza', motivo: 'Produto lançado errado', justificativa: 'Lançado pão de forma em vez de pão integral.', itens: [['Pão de forma', 1, 1190]] },
  ];

  window.CicluzCaixaDados = { contas, transferencias, lacres, lancamentos, fechamentos, caixasFicticios, vendas, canceladas };
})();
