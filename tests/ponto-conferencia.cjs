// DES - Ponto Eletrônico: conferência Conplus × manual (dist/ponto-conferencia.js). Dados fictícios.
const assert = require('node:assert/strict');
const C = require('../dist/ponto-conferencia.js');
let n = 0; const ok = (f) => { f(); n++; };

ok(() => { // normalizar não mexe no importado do Rodrigo e acrescenta os campos novos
  const velho = { version: 1, marcacoes: { p1: { '2026-11-02': ['08:00', '12:00', '13:00', '17:00'] } } };
  const d = C.normalizar(velho);
  assert.deepEqual(d.marcacoes, velho.marcacoes); assert.deepEqual(d.manuais, {}); assert.deepEqual(d.historico, []); assert.deepEqual(d.importacoes, []);
  assert.equal(C.normalizar(null).version, 1);
});
ok(() => { // comparar: os cinco estados
  const c = ['08:00', '12:00', '13:00', '17:00'];
  assert.equal(C.comparar(null, null, 0).situacao, 'semDados');
  assert.equal(C.comparar(c, null, 0).situacao, 'somenteConplus');
  assert.equal(C.comparar(null, { m: c }, 0).situacao, 'somenteManual');
  assert.equal(C.comparar(c, { m: ['08:00', '12:00', '13:00', '17:00'] }, 0).situacao, 'conferido');
  const d = C.comparar(c, { m: ['08:05', '12:00', '13:00', '16:50'] }, 0);
  assert.equal(d.situacao, 'divergente'); assert.deepEqual(d.div, [true, false, false, true]); assert.equal(d.divergentes, 2);
});
ok(() => { // tolerância e marca faltando de um lado
  const c = ['08:00', '12:00', '13:00', '17:00'];
  assert.equal(C.comparar(c, { m: ['08:04', '12:00', '13:00', '17:00'] }, 5).situacao, 'conferido');
  assert.equal(C.comparar(c, { m: ['08:06', '12:00', '13:00', '17:00'] }, 5).situacao, 'divergente');
  const f = C.comparar(c, { m: ['08:00', '', '', '17:00'] }, 0); assert.deepEqual(f.div, [false, true, true, false], 'marca presente só no importado é divergência');
  assert.deepEqual(C.comparar(['23:50', '', '', ''], { m: ['00:10', '', '', ''] }, 20).div, [false, false, false, false], 'virada de meia-noite: 20 min, não 23h40');
  assert.equal(C.comparar(c, { m: ['', '', '', ''], ocorrencia: 'Atestado' }, 0).situacao, 'somenteConplus', 'manual só com ocorrência não é divergência de hora');
  assert.equal(C.comparar(null, { m: ['', '', '', ''], ocorrencia: 'Falta justificada' }, 0).situacao, 'somenteManual');
});
ok(() => { // validação do que o DP digita
  assert.match(C.validarManual({ m: ['8h', '', '', ''] }).erro, /Entrada: hora inválida/);
  assert.match(C.validarManual({ m: ['', '', '25:00', ''] }).erro, /Retorno almoço: hora inválida/);
  assert.match(C.validarManual({ m: ['', '', '', ''], ocorrencia: '', obs: '' }).erro, /ao menos uma marcação/);
  assert.match(C.validarManual({ m: ['08:00'], ocorrencia: 'x'.repeat(121) }).erro, /120/);
  assert.match(C.validarManual({ m: ['08:00'], obs: 'x'.repeat(301) }).erro, /300/);
  assert.deepEqual(C.validarManual({ m: ['08:00'], ocorrencia: '  Consulta  ', obs: '' }).registro, { m: ['08:00', '', '', ''], ocorrencia: 'Consulta', obs: '' });
  assert.equal(C.validarManual({ m: ['', '', '', ''], obs: 'Esqueceu o crachá' }).erro, '', 'só observação também vale');
});
ok(() => { // salvar: cria, altera, ignora igual; o importado fica intacto; histórico com antes/depois
  const base = C.normalizar({ marcacoes: { p1: { '2026-11-02': ['08:05', '12:00', '13:02', '17:10'] } } });
  const original = JSON.stringify(base.marcacoes);
  const a = C.salvarManual(base, 'p1', '2026-11-02', { m: ['08:00', '12:00', '13:00', '17:00'], obs: 'Conferido com o gestor' }, { por: 'Ana DP', quando: '2026-11-19T10:00:00Z' });
  assert.equal(a.erro, ''); assert.equal(a.acao, 'criado');
  assert.equal(JSON.stringify(a.dados.marcacoes), original, 'o importado não é sobrescrito');
  assert.deepEqual(a.dados.manuais.p1['2026-11-02'].m, ['08:00', '12:00', '13:00', '17:00']); assert.equal(a.dados.manuais.p1['2026-11-02'].por, 'Ana DP');
  assert.equal(a.dados.historico[0].acao, 'criado'); assert.equal(a.dados.historico[0].antes, null);
  const igual = C.salvarManual(a.dados, 'p1', '2026-11-02', { m: ['08:00', '12:00', '13:00', '17:00'], obs: 'Conferido com o gestor' }, { por: 'Ana DP' });
  assert.equal(igual.acao, 'igual'); assert.equal(igual.dados.historico.length, 1, 'sem mudança não cria histórico');
  const b = C.salvarManual(a.dados, 'p1', '2026-11-02', { m: ['08:01', '12:00', '13:00', '17:00'], obs: 'Conferido com o gestor' }, { por: 'Beto DP', quando: '2026-11-19T11:00:00Z' });
  assert.equal(b.acao, 'alterado'); assert.equal(b.dados.historico.length, 2); assert.equal(b.dados.historico[0].antes.m[0], '08:00'); assert.equal(b.dados.historico[0].depois.m[0], '08:01'); assert.equal(b.dados.historico[0].por, 'Beto DP');
  assert.equal(JSON.stringify(base.manuais), '{}', 'não altera o objeto recebido');
  assert.match(C.salvarManual(base, 'p1', '2026-11-02', { m: ['xx'] }).erro, /hora inválida/);
});
ok(() => { // remover: só o manual, com histórico
  let d = C.normalizar({ marcacoes: { p1: { '2026-11-02': ['08:00', '', '', '17:00'] } } });
  d = C.salvarManual(d, 'p1', '2026-11-02', { m: ['08:00', '', '', '17:00'] }, { por: 'Ana' }).dados;
  const r = C.removerManual(d, 'p1', '2026-11-02', { por: 'Ana', quando: '2026-11-19T12:00:00Z' });
  assert.equal(r.acao, 'removido'); assert.equal(C.manualDe(r.dados, 'p1', '2026-11-02'), null); assert.deepEqual(r.dados.marcacoes, d.marcacoes);
  assert.equal(r.dados.historico[0].acao, 'removido'); assert.equal(r.dados.historico[0].depois, null); assert.equal(C.historicoDe(r.dados, 'p1', '2026-11-02').length, 2);
  assert.match(C.removerManual(r.dados, 'p1', '2026-11-02').erro, /Não há lançamento manual/);
  assert.deepEqual(r.dados.manuais, {}, 'pessoa sem lançamentos sai do mapa');
});
ok(() => { // CSV com aspas e ponto e vírgula
  assert.equal(C.csv([['Colaborador', 'Obs'], ['Ana; Silva', 'disse "ok"'], ['Beto', 12]]), 'Colaborador;Obs\r\n"Ana; Silva";"disse ""ok"""\r\nBeto;12\r\n');
});

console.log('ponto-conferencia: ' + n + ' grupos de verificação ok');
