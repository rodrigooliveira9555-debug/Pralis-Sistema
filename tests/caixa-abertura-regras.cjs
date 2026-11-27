// Caixa — Abertura: regras puras (dist/caixa/abertura-regras.js).
const assert = require('node:assert/strict');
const R = require('../dist/caixa/abertura-regras.js');
let n = 0; const ok = (f) => { f(); n++; };

ok(() => { // o subgrupo de PDV aponta para a conta de posto (Caixa 1M … 4T); outros nomes não são posto
  assert.deepEqual(R.postoDoSubgrupo('1M'), { numero: 1, letra: 'M', turno: 'Manhã', contaId: 'cx-1m' });
  assert.deepEqual(R.postoDoSubgrupo(' 4t '), { numero: 4, letra: 'T', turno: 'Tarde', contaId: 'cx-4t' });
  assert.equal(R.postoDoSubgrupo('2m').contaId, 'cx-2m');
  ['EMPRESAS', 'IFOOD', '1X', 'M1', '', null, undefined, '1MT', 'Caixa 1M'].forEach((x) => assert.equal(R.postoDoSubgrupo(x), null, String(x)));
});
ok(() => { // sufixo do código: só letras e números, maiúsculas, sem acento
  assert.equal(R.sufixoDoSubgrupo('1m'), '1M');
  assert.equal(R.sufixoDoSubgrupo('Vendas Externas'), 'VENDASEXTERNAS');
  assert.equal(R.sufixoDoSubgrupo('Atacadão'), 'ATACADAO');
  assert.equal(R.sufixoDoSubgrupo('  '), 'SG');
  assert.equal(R.sufixoDoSubgrupo(null), 'SG');
});
ok(() => { // identificador: CX-AAAAMMDD-<subgrupo>-NNN, único por dia e subgrupo
  const d = new Date(2026, 10, 27, 5, 55);
  assert.equal(R.codigoDoCaixa({ data: d, subgrupo: '1M' }), 'CX-20261127-1M-001');
  assert.equal(R.codigoDoCaixa({ data: '2026-11-27', subgrupo: '1m', existentes: [] }), 'CX-20261127-1M-001');
  assert.equal(R.codigoDoCaixa({ data: d, subgrupo: '1M', existentes: ['CX-20261127-1M-001'] }), 'CX-20261127-1M-002');
  assert.equal(R.codigoDoCaixa({ data: d, subgrupo: '1M', existentes: ['CX-20261127-1M-001', 'CX-20261127-1M-007', 'CX-20261127-1M-003'] }), 'CX-20261127-1M-008');
  // outro subgrupo, outro dia e códigos que não seguem o formato não contam
  assert.equal(R.codigoDoCaixa({ data: d, subgrupo: '1T', existentes: ['CX-20261127-1M-005'] }), 'CX-20261127-1T-001');
  assert.equal(R.codigoDoCaixa({ data: d, subgrupo: '1M', existentes: ['CX-20261126-1M-004', 'cx-90', undefined, 'CX-20261127-1M-abc'] }), 'CX-20261127-1M-001');
  assert.equal(R.codigoDoCaixa({ data: d, subgrupo: '1M', existentes: ['CX-20261127-1M-999'] }), 'CX-20261127-1M-1000');
});
ok(() => { // horário de referência: só com os dois horários válidos; fechar antes de abrir = dia seguinte
  assert.equal(R.horarioDeReferencia('06:00', '14:00'), '06:00 às 14:00');
  assert.equal(R.horarioDeReferencia('22:00', '06:00'), '22:00 às 06:00 (dia seguinte)');
  ['', undefined, null].forEach((x) => assert.equal(R.horarioDeReferencia(x, '14:00'), ''));
  assert.equal(R.horarioDeReferencia('06:00', ''), '');
  assert.equal(R.horarioDeReferencia('6:00', '14:00'), '');
  assert.equal(R.horarioDeReferencia('25:00', '14:00'), '');
});
ok(() => { // horário cadastrado para o dia da semana e o turno (Horários Empresa: dias × m/t/f; 0 = domingo)
  const doc = { dias: {
    '1': { m: { abre: '06:00', fecha: '13:51' }, t: { abre: '13:51', fecha: '22:00' }, f: { abre: '06:00', fecha: '22:00' } },
    '0': { m: { abre: '06:00', fecha: '12:30' }, t: { abre: '', fecha: '' }, f: { abre: '', fecha: '' } },
  } };
  const segunda = new Date(2026, 10, 23); // 23/11/2026 é segunda-feira
  const domingo = new Date(2026, 10, 29);
  assert.equal(segunda.getDay(), 1); assert.equal(domingo.getDay(), 0);
  assert.deepEqual(R.faixaDoDia(doc, segunda, 'M'), { abre: '06:00', fecha: '13:51' });
  assert.deepEqual(R.faixaDoDia(doc, segunda, 't'), { abre: '13:51', fecha: '22:00' });
  assert.deepEqual(R.faixaDoDia(doc, domingo, 'M'), { abre: '06:00', fecha: '12:30' });
  assert.equal(R.faixaDoDia(doc, domingo, 'T'), null); // tarde de domingo sem horário
  assert.equal(R.faixaDoDia(doc, new Date(2026, 10, 24), 'M'), null); // terça não cadastrada
  assert.equal(R.faixaDoDia(doc, segunda, 'F'), null); // só turno M ou T
  assert.equal(R.faixaDoDia(doc, segunda, ''), null);
  assert.equal(R.faixaDoDia(null, segunda, 'M'), null);
  assert.equal(R.faixaDoDia({}, segunda, 'M'), null);
  assert.deepEqual(R.faixaDoDia(doc, '1', 'M'), { abre: '06:00', fecha: '13:51' }); // o dia também pode vir como chave
  assert.equal(R.faixaDoDia({ dias: { '1': { m: { abre: '6:00', fecha: '13:51' } } } }, segunda, 'M'), null); // hora fora do formato
});
ok(() => { // o hardware como a tela mostra: <hardware>-<abre>as<fecha>-<turno>
  const faixa = { abre: '06:00', fecha: '13:51' };
  assert.equal(R.rotuloDoHardware({ hardware: 'TNP-PC-CXPDV-1', faixa, letra: 'M' }), 'TNP-PC-CXPDV-1-06:00as13:51-M');
  assert.equal(R.rotuloDoHardware({ hardware: ' TNP-PC-CXPDV-2 ', faixa: { abre: '13:51', fecha: '22:00' }, letra: 't' }), 'TNP-PC-CXPDV-2-13:51as22:00-T');
  assert.equal(R.rotuloDoHardware({ hardware: 'TNP-PC-CXPDV-1', faixa: null, letra: 'M' }), 'TNP-PC-CXPDV-1-M'); // sem horário cadastrado
  assert.equal(R.rotuloDoHardware({ hardware: '', faixa, letra: 'M' }), '');
  assert.equal(R.rotuloDoHardware({ hardware: null, faixa, letra: 'M' }), '');
});
console.log('caixa-abertura-regras: ' + n + ' grupos de verificação ok');
