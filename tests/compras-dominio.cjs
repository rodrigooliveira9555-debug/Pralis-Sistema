// Regras de Compras (espelho do S1). Rodar: node tests/compras-dominio.cjs
const assert = require('node:assert/strict');
const d = require('../dist/compras/dominio.js');
let checks = 0;
const ok = (fn) => { fn(); checks++; };
const datas = (lista) => lista.map((o) => o.data);

// Recorrência
ok(() => assert.deepEqual(datas(d.ocorrencias({ inicio: '2026-11-05', regra: { tipo: 'nunca' } })), ['2026-11-05']));
ok(() => assert.deepEqual(datas(d.ocorrencias({ inicio: '2026-11-05', regra: { tipo: 'diaria' } }, { limite: 3 })), ['2026-11-05', '2026-11-06', '2026-11-07']));
ok(() => assert.deepEqual(datas(d.ocorrencias({ inicio: '2026-11-05', regra: { tipo: 'semanal' } }, { limite: 3 })), ['2026-11-05', '2026-11-12', '2026-11-19']));
ok(() => assert.deepEqual(datas(d.ocorrencias({ inicio: '2026-11-05', regra: { tipo: 'quinzenal' } }, { limite: 3 })), ['2026-11-05', '2026-11-19', '2026-12-03']));
ok(() => assert.deepEqual(datas(d.ocorrencias({ inicio: '2026-01-31', regra: { tipo: 'mensal' } }, { limite: 3 })), ['2026-01-31', '2026-03-31', '2026-05-31']));
ok(() => assert.deepEqual(datas(d.ocorrencias({ inicio: '2026-11-05', regra: { tipo: 'anual' } }, { limite: 2 })), ['2026-11-05', '2027-11-05']));
// Personalizada: seg e qui, toda semana, a partir de qui 05/11/2026
ok(() => assert.deepEqual(
  datas(d.ocorrencias({ inicio: '2026-11-05', regra: { tipo: 'personalizada', personalizada: { frequencia: 'semanal', intervalo: 1, diasSemana: [1, 4] } } }, { limite: 4 })),
  ['2026-11-05', '2026-11-09', '2026-11-12', '2026-11-16']));
// Término por vezes e por data
ok(() => assert.equal(d.ocorrencias({ inicio: '2026-11-05', regra: { tipo: 'diaria' }, termino: { tipo: 'vezes', vezes: 2 } }).length, 2));
ok(() => assert.deepEqual(datas(d.ocorrencias({ inicio: '2026-11-05', regra: { tipo: 'diaria' }, termino: { tipo: 'data', data: '2026-11-06' } })), ['2026-11-05', '2026-11-06']));
// Exceções: cancelar e mover só uma data
ok(() => assert.deepEqual(
  datas(d.ocorrencias({ inicio: '2026-11-05', regra: { tipo: 'diaria' }, excecoes: { '2026-11-06': { cancelada: true }, '2026-11-07': { data: '2026-11-09', hora: '10:00' } } }, { limite: 3 })),
  ['2026-11-05', '2026-11-08', '2026-11-09']));
ok(() => assert.equal(d.resumoRegra({ tipo: 'quinzenal' }, '2026-11-05'), 'A cada 2 semanas'));

// Ranking topo 20% com empate na fronteira
ok(() => assert.deepEqual([...d.topoDoRanking([{ id: 'a', valor: 10 }, { id: 'b', valor: 5 }, { id: 'c', valor: 5 }, { id: 'd', valor: 1 }, { id: 'e', valor: 0 }])].sort(), ['a']));
ok(() => assert.deepEqual([...d.topoDoRanking([{ id: 'a', valor: 5 }, { id: 'b', valor: 5 }, { id: 'c', valor: 1 }])].sort(), ['a', 'b']));
ok(() => assert.equal(d.topoDoRanking([{ id: 'a', valor: 0 }]).size, 0));

// Fornecedor convidável
ok(() => assert.equal(d.motivoNaoConvidavel({ situacao: 'inativo', whatsapp: '31999998888' }), 'Fornecedor inativo'));
ok(() => assert.equal(d.motivoNaoConvidavel({ situacao: 'ativo', whatsapp: '99998888' }), 'WhatsApp válido (com DDD)'));
ok(() => assert.equal(d.podeConvidar({ situacao: 'ativo', whatsapp: '(31) 99999-8888' }), true));

// Avaliação automática da resposta
const base = { custo: 10, referencia: 10, pedida: 10, disponivel: 10, margemPct: 10, teto: null, gastoComprometido: 0 };
ok(() => assert.equal(d.avaliarItem(base).situacao, 'comprado'));
ok(() => assert.equal(d.avaliarItem({ ...base, custo: 10.01 }).motivo, 'acima_da_base'));
ok(() => assert.equal(d.avaliarItem({ ...base, referencia: null }).situacao, 'com_aumento'));
ok(() => assert.equal(d.avaliarItem({ ...base, disponivel: 11 }).situacao, 'comprado'));
ok(() => assert.equal(d.avaliarItem({ ...base, disponivel: 12 }).motivo, 'fora_da_margem'));
ok(() => assert.equal(d.avaliarItem({ ...base, teto: 99.99 }).motivo, 'barrado_pelo_teto'));
ok(() => assert.equal(d.avaliarItem({ ...base, teto: 100 }).situacao, 'comprado'));
ok(() => assert.equal(d.avaliarItem({ ...base, indisponivel: true }).motivo, 'indisponivel'));
ok(() => assert.equal(d.avaliarItem({ ...base, jaComprado: true }).motivo, 'ja_comprado'));

// Referência só desce
ok(() => assert.equal(d.novaReferencia(10, [12, 9.5]), 9.5));
ok(() => assert.equal(d.novaReferencia(10, [12, 11]), 10));
ok(() => assert.equal(d.novaReferencia(null, [12, 11]), 11));
ok(() => assert.equal(d.novaReferencia(10, []), 10));

// Matriz
ok(() => {
  const m = d.contarMatriz([{ produtoId: 'p', estado: 'aguardando' }, { produtoId: 'p', estado: 'com_aumento' }, { produtoId: 'p', estado: 'comprado' }]);
  assert.deepEqual(m.get('p'), { enviado: 3, cotado: 0, retornado: 0, com_aumento: 1, comprado: 1 });
});

// Estoque
ok(() => assert.equal(d.situacaoEstoque(5, 5, 20), 'no_minimo'));
ok(() => assert.equal(d.situacaoEstoque(20, 5, 20), 'no_maximo'));
ok(() => assert.equal(d.situacaoEstoque(10, null, null), 'sem_faixa'));
ok(() => assert.equal(d.situacaoEstoque(10, 5, 20), 'regular'));
ok(() => assert.equal(d.sugestaoReposicao({ saldo: 3, estoqueMin: 5, estoqueMax: 20 }), 17));
ok(() => assert.equal(d.sugestaoReposicao({ saldo: 8, estoqueMin: 5, estoqueMax: 20 }), 0));

// Recebimento
const itens = [{ id: 'i1', pedida: 10, recebida: 0, devolvida: 0, pendente: 10 }, { id: 'i2', pedida: 4, recebida: 0, devolvida: 0, pendente: 4 }];
ok(() => assert.match(d.aplicarRecebimento('cancelado', itens, {}).erro, /Só é possível/));
ok(() => assert.match(d.aplicarRecebimento('confirmado', itens, { i1: { recebido: 11 } }).erro, /passa do que falta/));
ok(() => assert.match(d.aplicarRecebimento('confirmado', itens, { i1: { devolvido: 1 } }).erro, /motivo/));
ok(() => assert.match(d.aplicarRecebimento('confirmado', itens, {}).erro, /ao menos uma/));
ok(() => {
  const r = d.aplicarRecebimento('confirmado', itens, { i1: { recebido: 6 } });
  assert.equal(r.status, 'recebido_parcial');
  assert.equal(r.itens[0].pendente, 4);
});
ok(() => {
  const r = d.aplicarRecebimento('confirmado', itens, { i1: { recebido: 9, devolvido: 1, motivo: 'Avariado' }, i2: { recebido: 4 } });
  assert.equal(r.status, 'recebido');
  assert.equal(r.itens[0].pendente, 0);
});

// Separação: faixa da margem
ok(() => assert.deepEqual(d.limitesDaMargem(5, 10), { minimo: 4.5, maximo: 5.5 }));
ok(() => assert.deepEqual(d.limitesDaMargem(3, 30), { minimo: 2.1, maximo: 3.9 }));
ok(() => assert.equal(d.quantidadeDentroDaMargem(5, 5.2, 10), true));
ok(() => assert.equal(d.quantidadeDentroDaMargem(5, 5.6, 10), false));
ok(() => assert.equal(d.quantidadeDentroDaMargem(5, 0, 10), false));

// Leitura de números digitados
ok(() => assert.equal(d.lerNumero('R$ 1.234,56'), 1234.56));
ok(() => assert.equal(d.lerNumero('12,5'), 12.5));
ok(() => assert.equal(d.lerNumero('12.5'), 12.5));
ok(() => assert.equal(d.lerNumero(''), null));

// Teto do estoque máximo (S1: pendenciasDeTeto): saldo + pedido não passa do máximo; sem máximo, sem teto.
ok(() => assert.deepEqual(d.pendenciasDeTeto([{ produtoId: 'a', descricao: 'Farinha', quantidade: 5, saldo: 5, estoqueMax: 10 }]), []));
ok(() => assert.equal(d.pendenciasDeTeto([{ produtoId: 'a', descricao: 'Farinha', quantidade: 6, saldo: 5, estoqueMax: 10 }]).length, 1));
ok(() => assert.match(d.pendenciasDeTeto([{ produtoId: 'a', descricao: 'Farinha', quantidade: 6, saldo: 5, estoqueMax: 10 }])[0], /^Farinha: pedido de 6 com saldo 5 passa do máximo 10$/));
ok(() => assert.deepEqual(d.pendenciasDeTeto([{ produtoId: 'a', quantidade: 999, saldo: 5, estoqueMax: null }]), []));
ok(() => assert.deepEqual(d.pendenciasDeTeto([{ produtoId: 'a', quantidade: 999, saldo: 5, estoqueMax: '' }]), []));
// Soma pelo conjunto: o mesmo produto duas vezes conta junto.
ok(() => assert.equal(d.pendenciasDeTeto([
  { produtoId: 'a', descricao: 'Farinha', quantidade: 3, saldo: 5, estoqueMax: 10 },
  { produtoId: 'a', descricao: 'Farinha', quantidade: 3, saldo: 5, estoqueMax: 10 },
]).length, 1));

console.log(checks + ' checks de regras de Compras passaram');
