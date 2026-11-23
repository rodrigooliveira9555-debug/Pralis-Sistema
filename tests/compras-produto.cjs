// Regras do cadastro de produtos (porte do S1). Rodar: node tests/compras-produto.cjs
const assert = require('node:assert/strict');
const R = require('../dist/compras/produto-regras.js');
const F = require('../dist/compras/produto-fiscal.js');
let checks = 0;
const ok = (fn) => { fn(); checks++; };

// Descrição gerada: NOME + gramatura (até 3 casas) + medida; gramatura 0 não aparece
ok(() => assert.equal(R.montarDescricao('farinha de trigo', 25, 'kg'), 'FARINHA DE TRIGO 25 KG'));
ok(() => assert.equal(R.montarDescricao('refrigerante cola', '2', 'l'), 'REFRIGERANTE COLA 2 L'));
ok(() => assert.equal(R.montarDescricao('queijo', '0,5', 'kg'), 'QUEIJO 0,5 KG'));
ok(() => assert.equal(R.montarDescricao('bolo', 0, 'un'), 'BOLO UN'));
ok(() => assert.equal(R.montarDescricao('bala', 1.2345, 'g'), 'BALA 1,235 G'));
ok(() => assert.equal(R.montarValidacaoQtd('PÃO 50 G', 'exatos', 10, 'un'), 'DENTRO DA EMB (PÃO 50 G) TEM EXATOS 10 UN'));

// Como se compra no formato oficial
ok(() => assert.equal(R.montarComoSeCompra({ embalagem: 'SACO', cDe: 'DE', quantidadeCaixa: 25, medidaCompra: 'KG', descricao: 'FARINHA DE TRIGO 25 KG', aproximado: false }), 'FARINHA DE TRIGO 25 KG - SACO DE FARINHA DE TRIGO 25 KG 25KG'));
ok(() => assert.equal(R.montarComoSeCompra({ embalagem: 'CX', cDe: 'C/', quantidadeCaixa: 12, medidaCompra: 'UN', descricao: 'X', aproximado: true }), 'X - CAIXA COM X APROXIMADAMENTE 12UN'));
ok(() => assert.equal(R.montarComoSeCompra({ embalagem: '', descricao: 'X' }), ''));

// Pendência de compra: "como se compra" incompleto = falta embalagem, medida ou quantidade (embalagem com 1 unidade é válida)
ok(() => assert.deepEqual(R.pendenciasDeCompra({ liberadoCompra: true, embalagem: 'CX', medidaCompra: 'UN', qtdEmbalagem: 1, estoqueMin: 10, estoqueMax: 20 }, true), []));
ok(() => assert.deepEqual(R.pendenciasDeCompra({ liberadoCompra: true, embalagem: '', medidaCompra: 'UN', qtdEmbalagem: 6, estoqueMin: 6, estoqueMax: 12 }, true), ['como se compra']));
ok(() => assert.deepEqual(R.pendenciasDeCompra({ liberadoCompra: true, embalagem: 'CX', medidaCompra: '', qtdEmbalagem: 6, estoqueMin: 6, estoqueMax: 12 }, true), ['como se compra']));
ok(() => assert.deepEqual(R.pendenciasDeCompra({ liberadoCompra: true, embalagem: 'CX', medidaCompra: 'UN', qtdEmbalagem: 6, estoqueMin: null, estoqueMax: 20 }, false), ['mínimo e máximo', 'fornecedor aprovado']));
ok(() => assert.deepEqual(R.pendenciasDeCompra({ liberadoCompra: true, embalagem: 'CX', medidaCompra: 'UN', qtdEmbalagem: 6, estoqueMin: 6, estoqueMax: 12 }, true), []));
ok(() => assert.deepEqual(R.pendenciasDeCompra({ liberadoCompra: false, qtdEmbalagem: 1 }, false), []));

// Duplicidade por EAN e por nome do catálogo (sem diferenciar maiúsculas) + parecidos por semelhança
const base = [
  { id: 'a', descricao: 'REFRIGERANTE COLA 2 L', nomeCatalogo: 'REFRIGERANTE COLA', codigoBarras: '7891000000001' },
  { id: 'b', descricao: 'REFRIGERANTE GUARANÁ 2 L', nomeCatalogo: 'REFRIGERANTE GUARANÁ', codigoBarras: '7891000000002' },
];
ok(() => assert.equal(R.checarDuplicidade({ nomeCatalogo: 'refrigerante cola', codigoBarras: '' }, base).porNome.id, 'a'));
ok(() => assert.equal(R.checarDuplicidade({ nomeCatalogo: 'Outro', codigoBarras: '7891000000002' }, base).porBarras.id, 'b'));
ok(() => assert.equal(R.checarDuplicidade({ nomeCatalogo: 'REFRIGERANTE COLA', codigoBarras: '' }, base, 'a').bloqueia, false));
ok(() => { const r = R.checarDuplicidade({ nomeCatalogo: 'REFRIGERANTE COLA ZERO', codigoBarras: '' }, base); assert.equal(r.bloqueia, false); assert.equal(r.parecidos[0].produto.id, 'a'); });
ok(() => assert.equal(R.semelhanca('Pão Francês', 'PAO FRANCES'), 100));
ok(() => assert.ok(R.semelhanca('ABC', 'XYZ') < 55));

// Códigos

// Preço de venda "auto": custo unitário × (1 + margem); margem do produto vence a do grupo
ok(() => assert.equal(R.calcularPrecoVenda({ auto: true, custo: 12, quantidadeCaixa: 6, margem: 0.5, margemGrupo: 0.3 }), 3));
ok(() => assert.equal(R.calcularPrecoVenda({ auto: true, custo: 12, quantidadeCaixa: 6, margem: null, margemGrupo: 0.3 }), 2.6));
ok(() => assert.equal(R.calcularPrecoVenda({ auto: false, precoManual: 9.999 }), 10));

// Promoções por dia, horário e validade; desempate pelo menor preço
const seg10h = new Date(2026, 10, 2, 10, 0); // segunda 02/11/2026 10:00
const promoSeg = { tipo: 'desconto', descontoFracao: 0.2, dias: [true, false, false, false, false, false, false], horaInicio: '09:00', horaFim: '12:00' };
ok(() => assert.equal(R.calcularPrecoVendaComPromocao({ precoVenda: 10, promocoes: [promoSeg], agora: seg10h }), 8));
ok(() => assert.equal(R.calcularPrecoVendaComPromocao({ precoVenda: 10, promocoes: [promoSeg], agora: new Date(2026, 10, 2, 13, 0) }), 10));
ok(() => assert.equal(R.calcularPrecoVendaComPromocao({ precoVenda: 10, promocoes: [promoSeg], agora: new Date(2026, 10, 3, 10, 0) }), 10));
ok(() => assert.equal(R.calcularPrecoVendaComPromocao({ precoVenda: 10, promocoes: [{ tipo: 'valor', valor: 7, validaAte: '2026-11-01' }], agora: seg10h }), 10));
ok(() => assert.equal(R.calcularPrecoVendaComPromocao({ precoVenda: 10, promocoes: [promoSeg, { tipo: 'valor', valor: 7.5 }], agora: seg10h }), 7.5));
ok(() => assert.deepEqual(R.validarPromocoesDoProduto([{ tipo: 'valor', valor: null }]), ['Promoção 1: informe o valor promocional.']));
ok(() => assert.match(R.validarPromocoesDoProduto([{ tipo: 'desconto', descontoFracao: 1.2 }])[0], /entre 0% e 100%/));
ok(() => assert.match(R.validarPromocoesDoProduto([{ tipo: 'valor', valor: 5, horaInicio: '22:00', horaFim: '02:00' }])[0], /dividida em duas/));
ok(() => assert.match(R.validarPromocoesDoProduto([promoSeg, { tipo: 'valor', valor: 5, dias: promoSeg.dias, horaInicio: '11:00', horaFim: '13:00' }])[0], /se sobrepõem/));
// Repetição da promoção (17/11/2026). 02/11/2026 é segunda; 17/11/2026 é terça.
const diaEm = (a, m, d, h = 10) => new Date(a, m - 1, d, h, 0);
const precoEm = (promo, quando) => R.calcularPrecoVendaComPromocao({ precoVenda: 10, promocoes: [promo], agora: quando });
const promoBase = { tipo: 'valor', valor: 6, dias: [true, true, true, true, true, true, true] };
// sem 'repeticao' continua como antes (já coberto acima); com semanal de intervalo 1 dá o mesmo resultado
ok(() => assert.equal(precoEm({ ...promoSeg, repeticao: { tipo: 'semanal', intervalo: 1 } }, seg10h), 8));
ok(() => assert.equal(precoEm({ ...promoSeg, repeticao: { tipo: 'semanal', intervalo: 1 } }, diaEm(2026, 11, 3)), 10));
// nunca: só no dia da data de início
ok(() => assert.equal(precoEm({ ...promoBase, dataInicio: '2026-11-17', repeticao: { tipo: 'nunca' } }, diaEm(2026, 11, 17)), 6));
ok(() => assert.equal(precoEm({ ...promoBase, dataInicio: '2026-11-17', repeticao: { tipo: 'nunca' } }, diaEm(2026, 11, 18)), 10));
// diária: todos os dias, mas não antes da data de início; a cada 3 dias conta da data de início
ok(() => assert.equal(precoEm({ ...promoBase, dataInicio: '2026-11-17', repeticao: { tipo: 'diaria', intervalo: 1 } }, diaEm(2026, 11, 16)), 10));
ok(() => assert.equal(precoEm({ ...promoBase, dataInicio: '2026-11-17', repeticao: { tipo: 'diaria', intervalo: 1 } }, diaEm(2026, 11, 25)), 6));
ok(() => assert.equal(precoEm({ ...promoBase, dataInicio: '2026-11-17', repeticao: { tipo: 'diaria', intervalo: 3 } }, diaEm(2026, 11, 20)), 6));
ok(() => assert.equal(precoEm({ ...promoBase, dataInicio: '2026-11-17', repeticao: { tipo: 'diaria', intervalo: 3 } }, diaEm(2026, 11, 21)), 10));
// quinzenal (semanal, a cada 2): terça sim, terça não, contando da semana de 17/11
const quinzenal = { ...promoBase, dias: [false, true, false, false, false, false, false], dataInicio: '2026-11-17', repeticao: { tipo: 'semanal', intervalo: 2 } };
ok(() => assert.equal(precoEm(quinzenal, diaEm(2026, 11, 17)), 6));
ok(() => assert.equal(precoEm(quinzenal, diaEm(2026, 11, 24)), 10));
ok(() => assert.equal(precoEm(quinzenal, diaEm(2026, 12, 1)), 6));
// mensal: dias do mês marcados; sem nenhum marcado, o dia da data de início; a cada 3 meses
ok(() => assert.equal(precoEm({ ...promoBase, repeticao: { tipo: 'mensal', intervalo: 1, diasMes: [5, 17] } }, diaEm(2026, 12, 5)), 6));
ok(() => assert.equal(precoEm({ ...promoBase, repeticao: { tipo: 'mensal', intervalo: 1, diasMes: [5, 17] } }, diaEm(2026, 12, 6)), 10));
ok(() => assert.equal(precoEm({ ...promoBase, dataInicio: '2026-11-17', repeticao: { tipo: 'mensal', intervalo: 3 } }, diaEm(2027, 2, 17)), 6));
ok(() => assert.equal(precoEm({ ...promoBase, dataInicio: '2026-11-17', repeticao: { tipo: 'mensal', intervalo: 3 } }, diaEm(2026, 12, 17)), 10));
// anual: no dia da data de início, nos meses marcados
ok(() => assert.equal(precoEm({ ...promoBase, dataInicio: '2026-11-17', repeticao: { tipo: 'anual', intervalo: 1 } }, diaEm(2027, 11, 17)), 6));
ok(() => assert.equal(precoEm({ ...promoBase, dataInicio: '2026-11-17', repeticao: { tipo: 'anual', intervalo: 1, meses: [11, 12] } }, diaEm(2026, 12, 17)), 6));
ok(() => assert.equal(precoEm({ ...promoBase, dataInicio: '2026-11-17', repeticao: { tipo: 'anual', intervalo: 1, meses: [11, 12] } }, diaEm(2027, 1, 17)), 10));
// terminar repetição (validaAte) e horário continuam valendo
ok(() => assert.equal(precoEm({ ...promoBase, validaAte: '2026-11-20', repeticao: { tipo: 'diaria', intervalo: 1 } }, diaEm(2026, 11, 21)), 10));
ok(() => assert.equal(precoEm({ ...promoBase, horaInicio: '08:00', horaFim: '09:00', repeticao: { tipo: 'diaria', intervalo: 1 } }, diaEm(2026, 11, 17, 10)), 10));
// validação e sobreposição
ok(() => assert.match(R.validarPromocoesDoProduto([{ tipo: 'valor', valor: 5, repeticao: { tipo: 'nunca' } }])[0], /data de início/));
ok(() => assert.match(R.validarPromocoesDoProduto([{ tipo: 'valor', valor: 5, repeticao: { tipo: 'semanal', intervalo: 2 } }])[0], /contar o intervalo/));
ok(() => assert.match(R.validarPromocoesDoProduto([{ tipo: 'valor', valor: 5, repeticao: { tipo: 'mensal', intervalo: 1 } }])[0], /dia do mês/));
ok(() => assert.deepEqual(R.validarPromocoesDoProduto([{ tipo: 'valor', valor: 5, dias: [false, false, false, false, false, false, false], repeticao: { tipo: 'mensal', intervalo: 1, diasMes: [10] } }]), []));
ok(() => assert.equal(R.promocoesSeSobrepoem({ ...promoBase, repeticao: { tipo: 'mensal', intervalo: 1, diasMes: [10] } }, { ...promoBase, repeticao: { tipo: 'mensal', intervalo: 1, diasMes: [11] } }, diaEm(2026, 11, 17)), false));
ok(() => assert.equal(R.promocoesSeSobrepoem({ ...promoBase, repeticao: { tipo: 'mensal', intervalo: 1, diasMes: [10] } }, { ...promoBase, repeticao: { tipo: 'diaria', intervalo: 1 } }, diaEm(2026, 11, 17)), true));
ok(() => assert.equal(R.resumoRepeticaoPromocao({ ...promoBase, repeticao: { tipo: 'mensal', intervalo: 1, diasMes: [17, 5] } }), 'Vale todo mês, nos dias 5, 17.'));
ok(() => assert.equal(R.resumoRepeticaoPromocao(quinzenal), 'Vale a cada 2 semanas: terça-feira, contando de 17/11/26.'));
// Promoção agendada → compromissos da Agenda (dia da semana da Agenda: 0 = domingo)
const hoje17 = diaEm(2026, 11, 17);
ok(() => assert.deepEqual(R.compromissosDaPromocao({ ...quinzenal, agendada: false }, hoje17), []));
ok(() => assert.deepEqual(R.compromissosDaPromocao({ ...promoBase, agendada: true, repeticao: { tipo: 'diaria', intervalo: 1 } }, hoje17), []));
ok(() => assert.deepEqual(R.compromissosDaPromocao({ ...quinzenal, agendada: true, horaInicio: '08:00', horaFim: '10:00' }, hoje17), [{ data: '2026-11-17', hora: '08:00', horaFim: '10:00', repeticao: { tipo: 'personalizada', unidade: 'semana', intervalo: 2, diasSemana: [2], fim: { tipo: 'nunca', data: '', vezes: 0 } } }]));
ok(() => assert.deepEqual(R.compromissosDaPromocao({ ...promoBase, agendada: true, dataInicio: '2026-11-17', repeticao: { tipo: 'nunca', intervalo: 1 } }, hoje17), [{ data: '2026-11-17', hora: '', horaFim: '', repeticao: null }]));
// semanal de segunda a sexta com início num sábado: o primeiro compromisso cai na segunda
ok(() => assert.deepEqual(R.compromissosDaPromocao({ ...promoBase, agendada: true, dias: [true, true, true, true, true, false, false], dataInicio: '2026-11-21', validaAte: '2026-12-31', repeticao: { tipo: 'semanal', intervalo: 1 } }, hoje17), [{ data: '2026-11-23', hora: '', horaFim: '', repeticao: { tipo: 'dias-uteis', fim: { tipo: 'data', data: '2026-12-31', vezes: 0 } } }]));
// mensal em dois dias: um compromisso por dia do mês; data já passada conta de hoje em diante
ok(() => assert.deepEqual(R.compromissosDaPromocao({ ...promoBase, agendada: true, dataInicio: '2026-10-01', repeticao: { tipo: 'mensal', intervalo: 1, diasMes: [5, 20] } }, hoje17).map((c) => c.data + ' ' + c.repeticao.tipo), ['2026-12-05 mes', '2026-11-20 mes']));
// promoção encerrada não gera compromisso
ok(() => assert.deepEqual(R.compromissosDaPromocao({ ...promoBase, agendada: true, dataInicio: '2026-10-01', validaAte: '2026-11-01', repeticao: { tipo: 'diaria', intervalo: 1 } }, hoje17), []));

// Estoque por embalagem e balança
ok(() => assert.match(R.validarEstoquePorEmbalagem({ quantidadeCaixa: 10, estoqueMin: 5, estoqueMax: 20 })[0].mensagem, /menor que a Qt. embalagem/));
ok(() => assert.match(R.validarEstoquePorEmbalagem({ quantidadeCaixa: 10, estoqueMin: 15, estoqueMax: 30 })[0].mensagem, /múltiplo/));
ok(() => assert.match(R.validarEstoquePorEmbalagem({ quantidadeCaixa: 1, estoqueMin: 10, estoqueMax: 10 })[0].mensagem, /maior que o mínimo/));
ok(() => assert.deepEqual(R.validarEstoquePorEmbalagem({ quantidadeCaixa: 6, estoqueMin: 12, estoqueMax: 48 }), []));
ok(() => assert.deepEqual(R.validarBalanca({ pesavel: true, validadeBalanca: 1000 }), ['Informe a validade da balança em dias (0 a 999).']));
ok(() => assert.deepEqual(R.validarBalanca({ pesavel: false, validadeBalanca: null }), []));

// Ordenações e paginação
const lista = [{ descricao: 'B', codigoInterno: '13140', criadoEm: '2026-11-02', saldo: 5 }, { descricao: 'A', codigoInterno: '13131', criadoEm: '2026-11-03', saldo: 1 }];
ok(() => assert.equal(R.ordenarProdutos(lista, 'recentes')[0].descricao, 'A'));
ok(() => assert.equal(R.ordenarProdutos(lista, 'antigos')[0].descricao, 'B'));
ok(() => assert.equal(R.ordenarProdutos(lista, 'za')[0].descricao, 'B'));
ok(() => assert.equal(R.ordenarProdutos(lista, 'codigo_desc')[0].codigoInterno, '13140'));
ok(() => assert.deepEqual(R.paginar([1, 2, 3, 4, 5], 9, 2), { itens: [5], paginas: 3, pagina: 3 }));

// Fiscal puxado pelo grupo (subgrupo com regra própria vence o grupo)
ok(() => assert.equal(F.classificarFiscal(F.TABELAS_EXEMPLO, { nome: 'X', grupo: '' }).estado, 'pendente_grupo_invalido'));
ok(() => assert.equal(F.classificarFiscal(F.TABELAS_EXEMPLO, { nome: 'X', grupo: 'GRUPO INEXISTENTE' }).estado, 'pendente_grupo_invalido'));
ok(() => { const r = F.fiscalDoProduto({ nome: 'REFRIGERANTE COLA', codigoBarras: '7891000000001', nomeGrupo: 'BEBIDAS', nomeSubgrupo: 'REFRIGERANTES' }); assert.equal(r.grupo, 'BEBIDAS'); assert.equal(r.resultado.estado, 'completo'); assert.equal(r.fiscal.ncm, '22021000'); assert.equal(r.fiscal.origemFiscal, 'produto'); assert.equal(r.margemPadrao, 0.35); });
ok(() => { const r = F.fiscalDoProduto({ nome: 'CERVEJA LATA', nomeGrupo: 'BEBIDAS', nomeSubgrupo: 'CERVEJAS' }); assert.equal(r.grupo, 'BEBIDAS - CERVEJAS'); assert.equal(r.margemPadrao, 0.4); assert.equal(r.fiscal.icmsRe, 25); });
ok(() => assert.equal(F.fiscalDoProduto({ nome: 'CHOCOLATE AO LEITE', nomeGrupo: 'BOMBONIERI' }).resultado.estado, 'pendente_ambiguo'));
ok(() => assert.equal(F.fiscalDoProduto({ nome: 'PRODUTO NOVO', nomeGrupo: 'MERCEARIA' }).resultado.estado, 'parcial'));
ok(() => assert.equal(F.CAMPOS_FISCAIS.length, 27));
ok(() => assert.equal(F.candidatosDeCodigo('2000150012345')[1], '15'));

console.log(checks + ' checks do cadastro de produtos passaram');
