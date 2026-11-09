// Leitura de nome, CPF e data de nascimento no texto de RG/CPF/CNH (dados fictícios).
// Rodar: node tests/identity-reader.cjs
const assert = require('node:assert/strict');
const R = require('../dist/identity-reader.js');
let checks = 0;
const ok = (fn) => { fn(); checks++; };

ok(() => assert.deepEqual(R.extract('REPUBLICA FEDERATIVA DO BRASIL\nNOME\nMARIA APARECIDA DA SILVA\nCPF 529.982.247-25\nDATA NASCIMENTO\n14/03/1990'), { cpf: '52998224725', birth: '1990-03-14', name: 'Maria Aparecida da Silva' }));
ok(() => assert.deepEqual(R.extract('Nome: JOAO PEREIRA DOS SANTOS\nData de Nasc.: 02/11/1985'), { birth: '1985-11-02', name: 'Joao Pereira dos Santos' }));
ok(() => assert.equal(R.extract('CPF 111.111.111-11').cpf, undefined, 'CPF inválido não entra'));
ok(() => assert.equal(R.extract('NOME DO PAI\nJOSE SOUZA').name, undefined, 'nome do pai não é o nome'));
ok(() => assert.equal(R.extract('NOME SOCIAL\nANA LIMA').name, undefined));
ok(() => assert.equal(R.extract('DATA NASCIMENTO\n31/02/1990').birth, undefined, 'data impossível não entra'));
ok(() => assert.deepEqual(R.extract(''), {}));
console.log('identity-reader: ' + checks + ' verificações ok');
