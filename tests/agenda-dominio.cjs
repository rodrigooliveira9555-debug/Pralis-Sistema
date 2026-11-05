// Regras da Agenda (listas automáticas, atraso, ordem, grupos, repetição, alerta, frases, calendário).
// Rodar: node tests/agenda-dominio.cjs
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

// Listas automáticas (Para hoje inclui os atrasados, como no Lembretes)
const itens = [
  item({ id: 'a', data: '2026-11-05', hora: '09:00' }),
  item({ id: 'b', data: '2026-11-05' }),
  item({ id: 'c', data: '2026-11-10', sinalizado: true, responsavelId: 'u1' }),
  item({ id: 'd' }),
  item({ id: 'e', data: '2026-11-01', concluida: true, concluidaEm: '2026-11-01T12:00:00Z' }),
  item({ id: 'f', data: '2026-11-03', listaId: 'l2' }),
];
ok(() => assert.deepEqual(d.contagens(itens, agora, 'u1'), { hoje: 3, programados: 4, todos: 5, sinalizados: 1, atrasados: 2, atribuidos: 1, concluidos: 1 }));
ok(() => assert.equal(d.contagens(itens, agora, '').atribuidos, 0, 'sem usuário logado, nada atribuído'));
ok(() => assert.deepEqual(d.filtrar(itens, { automatica: 'hoje' }, agora).map((i) => i.id), ['f', 'b', 'a']));
ok(() => assert.deepEqual(d.filtrar(itens, { automatica: 'todos' }, agora).map((i) => i.id), ['f', 'b', 'a', 'c', 'd'], 'com data antes, sem data no fim'));
ok(() => assert.deepEqual(d.filtrar(itens, { automatica: 'todos', mostrarConcluidos: true }, agora).map((i) => i.id), ['f', 'b', 'a', 'c', 'd', 'e'], 'Mostrar concluídos: no fim'));
ok(() => assert.deepEqual(d.filtrar(itens, { listaId: 'l2' }, agora).map((i) => i.id), ['f']));
ok(() => assert.deepEqual(d.filtrar(itens, { automatica: 'atrasados' }, agora).map((i) => i.id), ['f', 'a']));

// Ordenação de uma lista
const lista = [item({ id: 'p1', prioridade: 'baixa', titulo: 'Beta', ordem: 2, criadoEm: '1' }), item({ id: 'p2', prioridade: 'muito-alta', titulo: 'alfa', ordem: 3, criadoEm: '2' }), item({ id: 'p3', titulo: 'Gama', ordem: 1, criadoEm: '3' })];
ok(() => assert.deepEqual(d.filtrar(lista, { listaId: 'l1', ordenacao: 'prioridade' }, agora).map((i) => i.id), ['p2', 'p3', 'p1']));
ok(() => assert.deepEqual(d.filtrar(lista, { listaId: 'l1', ordenacao: 'titulo' }, agora).map((i) => i.id), ['p2', 'p1', 'p3']));
ok(() => assert.deepEqual(d.filtrar(lista, { listaId: 'l1', ordenacao: 'manual' }, agora).map((i) => i.id), ['p3', 'p1', 'p2']));
ok(() => assert.deepEqual(d.filtrar(lista, { listaId: 'l1', ordenacao: 'criacao' }, agora).map((i) => i.id), ['p1', 'p2', 'p3']));

// Grupos
ok(() => assert.deepEqual(d.agrupar(d.filtrar([...itens, item({ id: 'n', data: '2026-11-05', hora: '19:30' }), item({ id: 't', data: '2026-11-05', hora: '13:00' })], { automatica: 'hoje' }, agora), 'hoje', agora).map((g) => g.titulo + ':' + g.itens.map((i) => i.id).join('')),
  ['Atrasados:f', 'Dia todo:b', 'Manhã:a', 'Tarde:t', 'Noite:n']));
ok(() => assert.deepEqual(d.agrupar([item({ data: '2026-11-03' }), item({ data: '2026-11-05' }), item({ data: '2026-11-06' }), item({ data: '2026-11-09' }), item({ data: '2026-11-20' }), item({ data: '2027-01-02' })], 'programados', agora).map((g) => g.titulo),
  ['Atrasados', 'Hoje', 'Amanhã', 'Segunda-feira', 'Restante de novembro', 'Janeiro de 2027']));

// Busca sem acento, por etiqueta, local e subtarefa
const busca = item({ titulo: 'Reunião com fornecedor', local: 'Loja Centro', etiquetas: ['Padaria'], subtarefas: [{ id: 's', titulo: 'Levar planilha', concluida: false }] });
ok(() => assert.equal(d.combinaBusca(busca, 'reuniao'), true));
ok(() => assert.equal(d.combinaBusca(busca, '#padaria'), true));
ok(() => assert.equal(d.combinaBusca(busca, 'planilha centro'), true));
ok(() => assert.equal(d.combinaBusca(busca, 'açougue'), false));

// Repetição
const rep = (tipo, extra = {}, base = {}) => item({ data: '2026-11-05', hora: '10:00', repeticao: { tipo, ...extra }, ...base });
const prox = (i) => { const p = d.proxima(i); return p && p.data + (p.hora ? ' ' + p.hora : ''); };
ok(() => assert.equal(prox(rep('dia')), '2026-11-06 10:00'));
ok(() => assert.equal(prox(rep('hora')), '2026-11-05 11:00'));
ok(() => assert.equal(prox(rep('hora', {}, { hora: '23:30' })), '2026-11-06 00:30'));
ok(() => assert.equal(prox(rep('dias-uteis', {}, { data: '2026-11-06' })), '2026-11-09 10:00', 'sexta → segunda'));
ok(() => assert.equal(prox(rep('fins-de-semana')), '2026-11-07 10:00'));
ok(() => assert.equal(prox(rep('semana')), '2026-11-12 10:00'));
ok(() => assert.equal(prox(rep('quinzena')), '2026-11-19 10:00'));
ok(() => assert.equal(prox(rep('mes', {}, { data: '2026-01-31' })), '2026-02-28 10:00'));
ok(() => assert.equal(prox(rep('mes', { ancora: '2026-01-31' }, { data: '2026-02-28' })), '2026-03-31 10:00', 'volta ao dia 31'));
ok(() => assert.equal(prox(rep('trimestre')), '2027-02-05 10:00'));
ok(() => assert.equal(prox(rep('semestre')), '2027-05-05 10:00'));
ok(() => assert.equal(prox(rep('ano', {}, { data: '2028-02-29' })), '2029-02-28 10:00'));
ok(() => assert.equal(prox(rep('personalizada', { unidade: 'semana', intervalo: 2, diasSemana: [1, 4] })), '2026-11-16 10:00', 'qui → seg da semana de daqui a 2'));
ok(() => assert.equal(prox(rep('personalizada', { unidade: 'semana', intervalo: 1, diasSemana: [4, 5] })), '2026-11-06 10:00'));
ok(() => assert.equal(prox(rep('personalizada', { unidade: 'dia', intervalo: 3 })), '2026-11-08 10:00'));
ok(() => assert.equal(prox(rep('personalizada', { unidade: 'mes', intervalo: 2 })), '2027-01-05 10:00'));
ok(() => assert.equal(prox(rep('dia', { fim: { tipo: 'data', data: '2026-11-05' } })), null, 'termina na data'));
ok(() => assert.equal(prox(rep('dia', { fim: { tipo: 'vezes', vezes: 3 }, feitas: 1 })), '2026-11-06 10:00'));
ok(() => assert.equal(prox(rep('dia', { fim: { tipo: 'vezes', vezes: 3 }, feitas: 2 })), null, 'terceira vez é a última'));
ok(() => assert.equal(d.proxima(item({ data: '2026-11-05' })), null, 'sem repetição'));
ok(() => assert.deepEqual(d.ocorrencias(rep('semana'), '2026-11-01', '2026-11-30').map((o) => o.data), ['2026-11-05', '2026-11-12', '2026-11-19', '2026-11-26']));
ok(() => assert.deepEqual(d.ocorrencias(rep('dia', { fim: { tipo: 'vezes', vezes: 2 } }), '2026-11-01', '2026-11-30').map((o) => o.data), ['2026-11-05', '2026-11-06']));
ok(() => assert.equal(d.resumoRepeticao({ tipo: 'personalizada', unidade: 'semana', intervalo: 2, diasSemana: [3, 1], fim: { tipo: 'vezes', vezes: 4 } }), 'A cada 2 semanas: seg, qua, 4 vez(es)'));
ok(() => assert.equal(d.resumoRepeticao({ tipo: 'mes', fim: { tipo: 'data', data: '2027-06-30' } }), 'Todo mês, até 30/06/27'));

// Alerta
ok(() => assert.equal(d.momentoAlerta(item({ data: '2026-11-05', hora: '10:00', alerta: 15 })).getTime(), new Date(2026, 10, 5, 9, 45).getTime()));
ok(() => assert.equal(d.momentoAlerta(item({ data: '2026-11-05', alerta: 0 })).getTime(), new Date(2026, 10, 5, 9, 0).getTime(), 'dia todo: 9h'));
ok(() => assert.equal(d.momentoAlerta(item({ data: '2026-11-05', hora: '10:00', alerta: 1440 })).getTime(), new Date(2026, 10, 4, 10, 0).getTime()));
ok(() => assert.equal(d.momentoAlerta(item({ data: '2026-11-05', hora: '10:00', alerta: null })), null));
ok(() => assert.equal(d.momentoAlerta(item({ data: '2026-11-05', alerta: 0, adiadoPara: '2026-11-05T15:00:00' })).getTime(), new Date('2026-11-05T15:00:00').getTime(), 'soneca'));

// Localização: distância e aviso ao entrar/sair (sem disparar na primeira leitura, como no iPhone)
const praca = { lat: -21.7616, lng: -43.3496 };
ok(() => assert.ok(Math.abs(d.distancia(praca, { lat: -21.7616, lng: -43.3486 }) - 103) < 3, '0,001° de longitude ≈ 103 m nessa latitude'));
const comLugar = (aviso) => item({ localizacao: { ...praca, aviso, raio: 200 } });
ok(() => assert.deepEqual(d.cruzouLugar(comLugar('entrar'), praca, undefined), { dentro: true, disparar: false }, 'primeira leitura não dispara'));
ok(() => assert.deepEqual(d.cruzouLugar(comLugar('entrar'), praca, false), { dentro: true, disparar: true }, 'entrou'));
ok(() => assert.deepEqual(d.cruzouLugar(comLugar('entrar'), { lat: -21.77, lng: -43.3496 }, true), { dentro: false, disparar: false }, 'saiu, mas o aviso é ao entrar'));
ok(() => assert.deepEqual(d.cruzouLugar(comLugar('sair'), { lat: -21.77, lng: -43.3496 }, true), { dentro: false, disparar: true }, 'saiu'));
ok(() => assert.equal(d.cruzouLugar({ ...comLugar('entrar'), concluida: true }, praca, false).disparar, false, 'concluído não avisa'));
ok(() => assert.match(d.validar(item({ localizacao: { aviso: 'entrar', raio: 200 } })), /marque o lugar/));
ok(() => assert.match(d.validar(item({ localizacao: { lat: 120, lng: 0, aviso: '', raio: 200 } })), /inválido/));
ok(() => assert.equal(d.validar(item({ localizacao: { ...praca, aviso: 'sair', raio: 500 } })), ''));

// Escrever do jeito que se fala
const fala = (t) => { const r = d.interpretar(t, agora); return [r.titulo, r.data, r.hora, r.etiquetas.join(','), r.prioridade].join('|'); };
ok(() => assert.equal(fala('Ligar para o contador amanhã às 10 #financeiro !'), 'Ligar para o contador|2026-11-06|10:00|financeiro|alta'));
ok(() => assert.equal(fala('Reunião sexta 15h30'), 'Reunião|2026-11-06|15:30||'));
ok(() => assert.equal(fala('Pagar boleto dia 20'), 'Pagar boleto|2026-11-20|||'));
ok(() => assert.equal(fala('Pagar boleto dia 2'), 'Pagar boleto|2026-12-02|||', 'dia que já passou vai para o mês que vem'));
ok(() => assert.equal(fala('Entrega 12/12'), 'Entrega|2026-12-12|||'));
ok(() => assert.equal(fala('Ligar às 9'), 'Ligar|2026-11-06|09:00||', 'hora que já passou: amanhã'));
ok(() => assert.equal(fala('Ligar às 16'), 'Ligar|2026-11-05|16:00||'));
ok(() => assert.equal(fala('Conferir câmara quinta'), 'Conferir câmara|2026-11-12|||', 'mesmo dia da semana: a próxima'));
ok(() => assert.equal(fala('Comprar 2 sacos de farinha'), 'Comprar 2 sacos de farinha||||', 'número solto não é hora'));
ok(() => assert.equal(fala('Almoço meio-dia hoje'), 'Almoço|2026-11-05|12:00||'));
ok(() => assert.equal(fala('Revisar estoque !!'), 'Revisar estoque||||muito-alta'));

// Etiquetas e validação
ok(() => assert.deepEqual(d.normalizarEtiquetas(['#Loja, loja; Estoque ', '', '  ']), ['Loja', 'Estoque']));
ok(() => assert.match(d.validar(item({ titulo: '  ' })), /título/));
ok(() => assert.match(d.validar(item({ hora: '10:00' })), /data/));
ok(() => assert.match(d.validar(item({ data: '2026-02-30' })), /data válida/));
ok(() => assert.match(d.validar(item({ data: '2026-11-05', hora: '25:00' })), /hora válida/));
ok(() => assert.match(d.validar(item({ data: '2026-11-05', hora: '10:00', horaFim: '09:00' })), /depois do início/));
ok(() => assert.match(d.validar(item({ subtarefas: [{ titulo: ' ' }] })), /subtarefa/));
ok(() => assert.match(d.validar(item({ url: 'cicluz' })), /http/));
ok(() => assert.match(d.validar(item({ repeticao: { tipo: 'dia' } })), /repetir/));
ok(() => assert.match(d.validar(item({ data: '2026-11-05', repeticao: { tipo: 'dia', fim: { tipo: 'data', data: '2026-11-01' } } })), /fim da repetição/));
ok(() => assert.match(d.validar(item({ alerta: 0 })), /alerta/));
ok(() => assert.equal(d.validar(item({ data: '2026-11-05', hora: '08:15', horaFim: '09:00', url: 'https://cicluz.com.br', alerta: 15, repeticao: { tipo: 'semana' } })), ''));

// Progresso
ok(() => assert.deepEqual(d.progresso(item({ subtarefas: [{ concluida: true }, { concluida: false }, { concluida: true }] })), { feitas: 2, total: 3 }));

// Calendário
ok(() => assert.deepEqual(d.semana('2026-11-05'), ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07']));
ok(() => { const g = d.gradeDoMes('2026-02-15'); assert.equal(g.length, 42); assert.equal(g[0], '2026-02-01'); assert.equal(g[41], '2026-03-14'); });
ok(() => assert.equal(d.somarDias('2026-12-31', 1), '2027-01-01'));
ok(() => assert.deepEqual(d.doDia([item({ id: 'z', data: '2026-11-05', concluida: true }), item({ id: 'y', data: '2026-11-05', hora: '10:00' })], '2026-11-05').map((i) => i.id), ['y', 'z'], 'concluídos no fim do dia'));
ok(() => assert.equal(d.porDia([rep('semana', {}, { horaFim: '11:30' })], '2026-11-01', '2026-11-30').get('2026-11-12')[0].horaFim, '11:30', 'repetição leva a duração'));
ok(() => {
  const b = d.blocosDoDia([{ hora: '09:00', horaFim: '10:00' }, { hora: '09:30', horaFim: '' }, { hora: '11:00', horaFim: '' }, { hora: '', horaFim: '' }]);
  assert.deepEqual(b.map((x) => [x.ini, x.fim, x.coluna, x.colunas]), [[540, 600, 0, 2], [570, 600, 1, 2], [660, 690, 0, 1]]);
});

// Textos
ok(() => assert.equal(d.rotuloData('2026-11-05', agora), 'Hoje'));
ok(() => assert.equal(d.rotuloData('2026-11-06', agora), 'Amanhã'));
ok(() => assert.equal(d.rotuloData('2026-11-09', agora), 'Segunda-feira'));
ok(() => assert.equal(d.rotuloData('2026-11-20', agora), '20/11/26'));
ok(() => assert.equal(d.quando(item({ data: '2026-11-05', hora: '10:00', horaFim: '11:00' }), agora), 'Hoje · 10:00–11:00'));
ok(() => assert.equal(d.tituloMes('2026-11-05'), 'Novembro de 2026'));
ok(() => assert.equal(d.tituloDia('2026-11-05'), 'Quinta-feira, 5 de novembro'));
ok(() => assert.equal(d.tituloSemana('2026-11-30'), '29 de novembro a 5 de dezembro'));

console.log(checks + ' verificações das regras da Agenda passaram');
