// Gerador de QR local (dist/qr.js). Estrutura e determinismo; a leitura por decodificador externo foi conferida à parte (35 casos, versões 1 a 6).
const assert = require('node:assert/strict');
const Q = require('../dist/qr.js');
let n = 0; const ok = (f) => { f(); n++; };
const lado = (t) => Q.matriz(t).length;
ok(() => { assert.equal(lado('A'), 21); assert.equal(lado('x'.repeat(14)), 21); assert.equal(lado('x'.repeat(15)), 25); assert.equal(lado('x'.repeat(26)), 25); assert.equal(lado('x'.repeat(27)), 29); assert.equal(lado('x'.repeat(106)), 41); });
ok(() => assert.throws(() => Q.matriz('x'.repeat(107)), /longo demais/));
ok(() => assert.deepEqual(Q.matriz('PAT-000001'), Q.matriz('PAT-000001'))); // determinístico
ok(() => assert.notDeepEqual(Q.matriz('PAT-000001'), Q.matriz('PAT-000002')));
ok(() => { // localizadores nos três cantos e temporização
  const m = Q.matriz('bem-teste'); const N = m.length;
  const finder = (x0, y0) => { for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) { const borda = x === 0 || y === 0 || x === 6 || y === 6; const miolo = x >= 2 && x <= 4 && y >= 2 && y <= 4; assert.equal(m[y0 + y][x0 + x], borda || miolo); } };
  finder(0, 0); finder(N - 7, 0); finder(0, N - 7);
  for (let i = 8; i < N - 8; i++) { assert.equal(m[6][i], i % 2 === 0); assert.equal(m[i][6], i % 2 === 0); }
  assert.equal(m[N - 8][8], true); // módulo escuro fixo
});
ok(() => { const s = Q.svg('PAT-000001'); assert.match(s, /^<svg /); assert.match(s, /viewBox="0 0 /); assert.match(s, /aria-label="QR Code"/); });
ok(() => assert.equal(Q.montar('é').versao, 1)); // UTF-8: 2 bytes
console.log('qr: ' + n + ' grupos de verificação ok');
