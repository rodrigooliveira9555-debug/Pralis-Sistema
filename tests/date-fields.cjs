const assert=require('node:assert/strict');
const dates=require('../dist/date-fields.js');
assert.equal(dates.mask('021126'),'02/11/26');
assert.equal(dates.mask('02/11/26'),'02/11/26');
assert.equal(dates.mask(''),'');
assert.equal(dates.parse('02/11/26'),'2026-11-02');
assert.equal(dates.parse('29/02/24'),'2024-02-29');
assert.equal(dates.parse('29/02/23'),'');
assert.equal(dates.parse('31/04/26'),'');
assert.equal(dates.parse('01/13/26'),'');
assert.equal(dates.parse('00/11/26'),'');
assert.equal(dates.parse('02/11/2'),'');
assert.equal(dates.parse('01/01/49'),'2049-01-01');
assert.equal(dates.parse('01/01/50'),'1950-01-01');
for(const iso of ['1930-11-02','2030-11-02','1900-01-01','2000-02-29','0001-01-01','2099-12-31']){
  assert.equal(dates.parse(dates.display(iso),iso),iso,'Preserve stored century: '+iso);
}
assert.equal(dates.parse('29/02/00','1900-01-01'),'');
// Mês e ano (MM/AAAA na tela, AAAA-MM no dado).
assert.equal(dates.monthMask('031990'),'03/1990');
assert.equal(dates.monthMask('0'),'0');
assert.equal(dates.monthMask('03/19905'),'03/1990');
assert.equal(dates.monthParse('03/1990'),'1990-03');
assert.equal(dates.monthParse('13/1990'),'');
assert.equal(dates.monthParse('00/1990'),'');
assert.equal(dates.monthParse('03/90'),'');
assert.equal(dates.monthParse('03/1899'),'');
assert.equal(dates.monthDisplay('1990-03'),'03/1990');
assert.equal(dates.monthDisplay('1990-03-15'),'03/1990');
assert.equal(dates.monthDisplay('texto'),'');
assert.ok(dates.monthValid('2000-12')&&!dates.monthValid('2000-13')&&!dates.monthValid('2000-12-01'));
console.log('31 date format and historical date checks passed');
