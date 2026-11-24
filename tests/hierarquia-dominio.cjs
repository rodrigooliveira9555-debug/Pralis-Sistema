// Hierarquia Área › Cargo › Pessoa (regras puras). Rodar: node tests/hierarquia-dominio.cjs
const assert = require('node:assert/strict');
const h = require('../dist/hierarquia-dominio.js');
let checks = 0;
const ok = (fn) => { fn(); checks++; };

const cargos = [
  { id: 'ref:0', nome: 'FAXINEIRO' }, { id: 'ref:1', nome: 'Padeiro' }, { id: 'c-1', nome: 'Caixa', nomeReduzido: 'Cx' },
  { id: 'c-2', nome: 'Balconista' }, { id: 'c-3', nome: 'balconista ' },
];

// casar o cargo pelo nome: sem acento, caixa e espaços; ambíguo não casa
ok(() => assert.equal(h.casarCargo('faxineiro', cargos).id, 'ref:0'));
ok(() => assert.equal(h.casarCargo('  PÁDEIRO ', cargos).id, 'ref:1'));
ok(() => assert.equal(h.casarCargo('cx', cargos).id, 'c-1'));
ok(() => assert.deepEqual(h.casarCargo('Balconista', cargos), { id: null, motivo: 'ambiguo' }));
ok(() => assert.deepEqual(h.casarCargo('Gerente', cargos), { id: null, motivo: 'nao-achou' }));
ok(() => assert.deepEqual(h.casarCargo('', cargos), { id: null, motivo: 'sem-nome' }));

// vincular pessoas: só quem ainda não tem jobKey válido
const pessoas = [
  { id: 'p1', name: 'A', jobName: 'Padeiro' }, { id: 'p2', name: 'B', jobName: 'Padeiro', jobKey: 'ref:1' },
  { id: 'p3', name: 'C', jobName: 'Balconista' }, { id: 'p4', name: 'D', jobName: 'Mago' }, { id: 'p5', name: 'E', jobName: 'Caixa', jobKey: 'c-apagado' },
];
ok(() => assert.deepEqual(h.vincularPessoas(pessoas, cargos), { mudancas: [{ id: 'p1', jobKey: 'ref:1' }, { id: 'p5', jobKey: 'c-1' }], semCargo: ['p4'], ambiguos: ['p3'] }));

// vínculos que já existem nas fichas
const areas = [{ id: 'a1', name: 'Loja', cargoIds: ['ref:1'], children: [{ id: 'a2', name: 'Caixa', children: [] }] }];
ok(() => assert.deepEqual(h.vinculosDasFichas([{ id: 'a1', cargoIds: ['ref:1'] }, { id: 'a2' }], [{ jobName: 'Padeiro', unitIds: ['a1', 'a2', 'zzz'] }, { jobName: 'Mago', unitIds: ['a1'] }], cargos), [{ areaId: 'a2', cargoId: 'ref:1' }]));

// árvore
const raizes = h.arvore({
  areas: [{ id: 'a1', name: 'Loja', cargoIds: ['ref:1', 'c-1', 'apagado'], children: [{ id: 'a2', name: 'Caixa', cargoIds: ['c-1'], children: [] }] }, { id: 'a3', name: 'Produção', cargoIds: [], children: [] }],
  cargos,
  pessoas: [{ id: 'p1', name: 'Ana', jobKey: 'ref:1' }, { id: 'p2', name: 'Bia', jobKey: 'c-1' }, { id: 'p3', name: 'Cris', jobKey: 'c-1' }, { id: 'p4', name: 'Sem cargo' }],
});
ok(() => assert.equal(raizes.length, 2));
ok(() => assert.deepEqual(raizes[0].cargos.map((c) => c.id), ['ref:1', 'c-1']));
ok(() => assert.equal(raizes[0].cargos[0].pessoas[0].nome, 'Ana'));
ok(() => assert.equal(raizes[0].areas[0].cargos[0].pessoas.length, 2));

// cobertura: área cobre tudo que está embaixo (inclusive subáreas); cargo cobre as pessoas dele; pessoa cobre só ela
ok(() => assert.deepEqual(h.pessoasCobertas(raizes, 'area', 'a1').sort(), ['p1', 'p2', 'p3']));
ok(() => assert.deepEqual(h.pessoasCobertas(raizes, 'area', 'a2').sort(), ['p2', 'p3']));
ok(() => assert.deepEqual(h.pessoasCobertas(raizes, 'area', 'a3'), []));
ok(() => assert.deepEqual(h.pessoasCobertas(raizes, 'cargo', 'ref:1'), ['p1']));
ok(() => assert.deepEqual(h.pessoasCobertas(raizes, 'pessoa', 'p3'), ['p3']));
ok(() => assert.deepEqual(h.pessoasCobertas(raizes, 'pessoa', 'p4'), []));

// regra do cadastro
ok(() => assert.match(h.erroDeCargo('', cargos), /Escolha o cargo/));
ok(() => assert.match(h.erroDeCargo('c-sumiu', cargos), /não existe mais/));
ok(() => assert.equal(h.erroDeCargo('c-1', cargos), ''));
ok(() => assert.deepEqual(h.juntarCargoIds(['a', 'b'], ['b', 'c']), ['a', 'b', 'c']));

console.log('hierarquia-dominio: ' + checks + ' grupos de verificação ok');
