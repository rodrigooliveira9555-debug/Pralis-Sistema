// Configurações → Empresa → Horários Empresa: regras puras (dist/acessos/horarios-empresa-dominio.js).
const assert = require('node:assert/strict');
const H = require('../dist/acessos/horarios-empresa-dominio.js');
let n = 0; const ok = (f) => { f(); n++; };

ok(() => { // o quadro do esboço: oito dias (segunda a domingo e feriado) × três turnos
  assert.deepEqual(H.DIAS.map((d) => d[1]).join(''), 'STQQSSDF');
  assert.deepEqual(H.DIAS.map((d) => d[0]), ['1', '2', '3', '4', '5', '6', '0', 'feriado']);
  assert.deepEqual(H.TURNOS.map((t) => t[2]), ['Manhã', 'Tarde', 'Funcionamento']);
  const v = H.vazio();
  assert.equal(Object.keys(v.dias).length, 8);
  assert.deepEqual(v.dias['1'].m, { abre: '', fecha: '' });
  assert.equal(H.diasComHorario(v), 0);
});
ok(() => { // normalizar: dado antigo, vazio ou torto abre sem quebrar; hora fora do formato vira vazia
  assert.deepEqual(H.normalizar(null), H.vazio());
  assert.deepEqual(H.normalizar('lixo'), H.vazio());
  const n1 = H.normalizar({ dias: { '1': { m: { abre: '6:00', fecha: '14:00' }, t: { abre: '14:00', fecha: '22:00' } }, '9': { m: { abre: '01:00', fecha: '02:00' } } } });
  assert.deepEqual(n1.dias['1'].m, { abre: '', fecha: '14:00' }); // "6:00" não é HH:MM
  assert.deepEqual(n1.dias['1'].t, { abre: '14:00', fecha: '22:00' });
  assert.equal(n1.dias['9'], undefined); // dia que não existe é ignorado
  assert.equal(Object.keys(n1.dias).length, 8);
});
ok(() => { // texto da faixa
  assert.equal(H.texto({ abre: '06:00', fecha: '14:00' }), '06:00 às 14:00');
  assert.equal(H.texto({ abre: '22:00', fecha: '06:00' }), '22:00 às 06:00 (dia seguinte)');
  assert.equal(H.texto({ abre: '', fecha: '' }), '—');
  assert.equal(H.texto({ abre: '06:00', fecha: '' }), '—');
  assert.equal(H.texto(undefined), '—');
});
ok(() => { // validar: a faixa é as duas horas ou nenhuma; iguais não valem; vazio vale
  assert.equal(H.validar(H.vazio()), '');
  const q = H.vazio(); q.dias['1'].m = { abre: '06:00', fecha: '14:00' }; q.dias['0'].f = { abre: '06:00', fecha: '19:00' };
  assert.equal(H.validar(q), '');
  q.dias['2'].t = { abre: '14:00', fecha: '' };
  assert.match(H.validar(q), /Terça-feira, Tarde: informe a hora de abrir e a de fechar/);
  q.dias['2'].t = { abre: '14:00', fecha: '14:00' };
  assert.match(H.validar(q), /Terça-feira, Tarde: a hora de abrir e a de fechar não podem ser iguais/);
  q.dias['2'].t = { abre: '25:00', fecha: '26:00' };
  assert.match(H.validar(q), /Terça-feira, Tarde: use horas de 00:00 a 23:59/);
  q.dias['2'].t = { abre: '22:00', fecha: '06:00' }; // fechar antes de abrir = dia seguinte, vale
  assert.equal(H.validar(q), '');
});
ok(() => { // copiar: o esboço (do dia escolhido para os demais); o original não muda
  const q = H.vazio();
  q.dias['1'] = { m: { abre: '06:00', fecha: '14:00' }, t: { abre: '14:00', fecha: '22:00' }, f: { abre: '06:00', fecha: '22:00' } };
  q.dias['0'].m = { abre: '07:00', fecha: '12:00' };
  const c = H.copiar(q, '1', ['2', '3', '4', '5', '6', '1', 'xx']);
  ['2', '3', '4', '5', '6'].forEach((k) => assert.deepEqual(c.dias[k], q.dias['1']));
  assert.deepEqual(c.dias['0'].m, { abre: '07:00', fecha: '12:00' }); // domingo não foi tocado
  assert.deepEqual(q.dias['2'], { m: { abre: '', fecha: '' }, t: { abre: '', fecha: '' }, f: { abre: '', fecha: '' } }); // original intacto
  c.dias['2'].m.abre = '09:00';
  assert.equal(c.dias['3'].m.abre, '06:00'); // cópias independentes
  assert.equal(H.diasComHorario(c), 7);
});
ok(() => { // paraSalvar guarda só o que é conhecido
  const s = H.paraSalvar({ dias: { '1': { m: { abre: '06:00', fecha: '14:00', x: 1 } } }, lixo: true }, '2026-11-27T10:00:00.000Z');
  assert.deepEqual(Object.keys(s).sort(), ['atualizadoEm', 'dias', 'version']);
  assert.equal(s.version, 1);
  assert.deepEqual(s.dias['1'].m, { abre: '06:00', fecha: '14:00' });
  assert.equal(s.atualizadoEm, '2026-11-27T10:00:00.000Z');
});
console.log('horarios-empresa-dominio: ' + n + ' grupos de verificação ok');
