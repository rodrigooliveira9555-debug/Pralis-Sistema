// Regras da Agenda (listas automáticas, atraso, ordem, etiquetas, calendário). Rodar: node tests/agenda-dominio.cjs
const assert = require('node:assert/strict');
const d = require('../dist/agenda/dominio.js');
let checks = 0;
const ok = (fn) => { fn(); checks++; };

// Quinta-feira, 05/11/2026, 14:30 (horário local)
const agora = new Date(2026, 10, 5, 14, 30);
const item = (extra) => ({ id: 'x', listaId: 'l1', titulo: 'Teste', data: '', hora: '', prioridade: 'normal', sinalizado: false, etiquetas: [], subtarefas: [], concluida: false, criadoEm: '2026-11-01T10:00:00Z', ...extra });

// Atraso
ok(() => assert.equal(d.atrasado(item({ data: '2026-11-04' }), agora), true));
ok(() => assert.equal(d.atrasado(item({ data: '2026-11-05', hora: '14:00' }), agora), true));
ok(() => assert.equal(d.atrasado(item({ data: '2026-11-05', hora: '15:00' }), agora), false));
ok(() => assert.equal(d.atrasado(item({ data: '2026-11-05' }), agora), false, 'sem hora vale o dia todo'));
ok(() => assert.equal(d.atrasado(item({ data: '2026-11-04', concluida: true }), agora), false));
ok(() => assert.equal(d.atrasado(item({}), agora), false, 'sem data nunca atrasa'));

// Listas automáticas
const itens = [
  item({ id: 'a', data: '2026-11-05', hora: '09:00' }),
  item({ id: 'b', data: '2026-11-05' }),
  item({ id: 'c', data: '2026-11-10', sinalizado: true }),
  item({ id: 'd' }),
  item({ id: 'e', data: '2026-11-01', concluida: true, concluidaEm: '2026-11-01T12:00:00Z' }),
  item({ id: 'f', data: '2026-11-03', listaId: 'l2' }),
];
ok(() => assert.deepEqual(d.contagens(itens, '', agora), { hoje: 2, programados: 4, todos: 5, sinalizados: 1, atrasados: 2, concluidos: 1 }));
ok(() => assert.deepEqual(d.contagens(itens, 'l2', agora), { hoje: 0, programados: 1, todos: 1, sinalizados: 0, atrasados: 1, concluidos: 0 }));
ok(() => assert.deepEqual(d.filtrar(itens, { automatica: 'hoje' }, agora).map((i) => i.id), ['b', 'a'], 'dia todo antes das horas'));
ok(() => assert.deepEqual(d.filtrar(itens, { automatica: 'todos' }, agora).map((i) => i.id), ['f', 'b', 'a', 'c', 'd'], 'com data antes, sem data no fim'));
ok(() => assert.deepEqual(d.filtrar(itens, { automatica: 'atrasados' }, agora).map((i) => i.id), ['f', 'a']));

// Prioridade desempata no mesmo dia e hora
ok(() => assert.deepEqual(
  d.filtrar([item({ id: 'p1', prioridade: 'baixa' }), item({ id: 'p2', prioridade: 'muito-alta' }), item({ id: 'p3' })], {}, agora).map((i) => i.id),
  ['p2', 'p3', 'p1']));

// Busca sem acento, por etiqueta e subtarefa
const busca = item({ titulo: 'Reunião com fornecedor', etiquetas: ['Padaria'], subtarefas: [{ id: 's', titulo: 'Levar planilha', concluida: false }] });
ok(() => assert.equal(d.combinaBusca(busca, 'reuniao'), true));
ok(() => assert.equal(d.combinaBusca(busca, '#padaria'), true));
ok(() => assert.equal(d.combinaBusca(busca, 'planilha reuniao'), true));
ok(() => assert.equal(d.combinaBusca(busca, 'açougue'), false));

// Etiquetas
ok(() => assert.deepEqual(d.normalizarEtiquetas(['#Loja, loja; Estoque ', '', '  ']), ['Loja', 'Estoque']));

// Validação
ok(() => assert.match(d.validar(item({ titulo: '  ' })), /título/));
ok(() => assert.match(d.validar(item({ hora: '10:00' })), /data/));
ok(() => assert.match(d.validar(item({ data: '2026-02-30' })), /data válida/));
ok(() => assert.match(d.validar(item({ data: '2026-11-05', hora: '25:00' })), /hora válida/));
ok(() => assert.match(d.validar(item({ subtarefas: [{ titulo: ' ' }] })), /subtarefa/));
ok(() => assert.equal(d.validar(item({ data: '2026-11-05', hora: '08:15' })), ''));

// Progresso das subtarefas
ok(() => assert.deepEqual(d.progresso(item({ subtarefas: [{ concluida: true }, { concluida: false }, { concluida: true }] })), { feitas: 2, total: 3 }));

// Calendário: semana começa no domingo; grade do mês com 42 dias
ok(() => assert.deepEqual(d.semana('2026-11-05'), ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07']));
ok(() => { const g = d.gradeDoMes('2026-02-15'); assert.equal(g.length, 42); assert.equal(g[0], '2026-02-01'); assert.equal(g[41], '2026-03-14'); });
ok(() => assert.equal(d.gradeDoMes('2026-11-20')[0], '2026-11-01'));
ok(() => assert.equal(d.somarMeses('2026-01-31', 1), '2026-02-28'));
ok(() => assert.equal(d.somarDias('2026-12-31', 1), '2027-01-01'));
ok(() => assert.deepEqual(d.doDia([item({ id: 'z', data: '2026-11-05', concluida: true }), item({ id: 'y', data: '2026-11-05', hora: '10:00' })], '2026-11-05').map((i) => i.id), ['y', 'z'], 'concluídos no fim do dia'));

// Textos
ok(() => assert.equal(d.rotuloData('2026-11-05', agora), 'Hoje'));
ok(() => assert.equal(d.rotuloData('2026-11-06', agora), 'Amanhã'));
ok(() => assert.equal(d.rotuloData('2026-11-04', agora), 'Ontem'));
ok(() => assert.equal(d.rotuloData('2026-11-09', agora), 'Segunda-feira'));
ok(() => assert.equal(d.rotuloData('2026-11-20', agora), '20/11/26'));
ok(() => assert.equal(d.tituloMes('2026-11-05'), 'Novembro de 2026'));
ok(() => assert.equal(d.tituloDia('2026-11-05'), 'Quinta-feira, 5 de novembro'));
ok(() => assert.equal(d.tituloSemana('2026-11-05'), '1 a 7 de novembro'));
ok(() => assert.equal(d.tituloSemana('2026-11-30'), '29 de novembro a 5 de dezembro'));

console.log(checks + ' verificações das regras da Agenda passaram');
