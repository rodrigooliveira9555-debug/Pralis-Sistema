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
console.log('19 date format and historical date checks passed');
