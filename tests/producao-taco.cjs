// Tabela TACO e ingredientes (dist/producao/taco.js e taco-dados.js). Rodar: node tests/producao-taco.cjs
const assert = require('node:assert/strict');
const T = require('../dist/producao/taco.js');

// A tabela oficial é um arquivo de navegador (window.CicluzTacoOficial): carrega com um "window" de mentira.
global.window = {};
require('../dist/producao/taco-dados.js');
const oficial = global.window.CicluzTacoOficial;
let n = 0; const t = (nome, fn) => { fn(); n++; };

t('tabela oficial inteira: 597 alimentos, códigos de 1 a 597, sem repetição', () => {
  const itens = T.itensDe(oficial);
  assert.equal(itens.length, 597);
  assert.deepEqual(itens.map((i) => i.codigo), Array.from({ length: 597 }, (_, k) => k + 1));
  assert.ok(itens.every((i) => i.descricao && i.grupo));
  assert.equal(new Set(itens.map((i) => i.grupo)).size, 14);
  assert.equal(oficial.colunas.length, oficial.linhas[0].length - 3);
});
t('valores conferidos com a planilha oficial (arroz integral cozido, código 1)', () => {
  const arroz = T.porCodigo(T.itensDe(oficial), 1);
  assert.equal(arroz.descricao, 'Arroz, integral, cozido');
  assert.equal(arroz.grupo, 'Cereais e derivados');
  assert.equal(arroz.valores.kcal, 123.53); assert.equal(arroz.valores.proteina, 2.59); assert.equal(arroz.valores.carboidrato, 25.81);
  assert.equal(arroz.valores.fibra, 2.75); assert.equal(arroz.valores.sodio, 1.24); assert.equal(arroz.valores.saturados, 0.3);
  assert.equal(arroz.valores.colesterol, null); // "NA" na planilha
  assert.equal(arroz.valores.riboflavina, 'Tr'); // traço
});
t('descrição do alimento 540 vem da aba de ácidos graxos (a principal traz só "L")', () => {
  assert.equal(T.porCodigo(T.itensDe(oficial), 540).descricao, 'Feijoada');
});
t('busca por código e por pedaços do nome, sem acento', () => {
  const itens = T.itensDe(oficial);
  assert.deepEqual(T.buscar(itens, '597').map((i) => i.descricao), ['Noz, crua']);
  assert.deepEqual(T.buscar(itens, '9999'), []);
  const r = T.buscar(itens, 'ARROZ integral');
  assert.deepEqual(r.map((i) => i.codigo), [1, 2]);
  assert.ok(T.buscar(itens, 'acucar').length > 0); // sem acento acha "Açúcar"
  assert.equal(T.buscar(itens, '', 10).length, 10);
});
t('texto dos valores e resumo por 100 g', () => {
  assert.equal(T.valorTexto(123.53, 'kcal'), '123,53 kcal');
  assert.equal(T.valorTexto('Tr', 'mg'), 'traço');
  assert.equal(T.valorTexto(null, 'g'), 'não analisado');
  const arroz = T.porCodigo(T.itensDe(oficial), 1);
  assert.deepEqual(T.resumo(arroz)[0], ['Valor energético', '123,53 kcal']);
  assert.equal(T.resumo(arroz).length, 7);
  assert.equal(T.completo(arroz, oficial.colunas).length, oficial.colunas.length);
  assert.deepEqual(T.resumo(null), []);
});
t('ingrediente: nome obrigatório, sem repetir, código TACO precisa existir', () => {
  const itens = T.itensDe(oficial); const lista = [{ id: 'i1', nome: 'Farinha de trigo', tacoCodigo: 34 }];
  assert.equal(T.validarIngrediente({ nome: ' ' }, lista, itens), 'Informe o nome do ingrediente.');
  assert.match(T.validarIngrediente({ nome: 'x'.repeat(81) }, lista, itens), /80 caracteres/);
  assert.match(T.validarIngrediente({ nome: 'FARINHA DE TRIGO' }, lista, itens), /Já existe/);
  assert.equal(T.validarIngrediente({ id: 'i1', nome: 'Farinha de trigo', tacoCodigo: 34 }, lista, itens), ''); // editar o próprio
  assert.equal(T.validarIngrediente({ nome: 'Açúcar refinado', tacoCodigo: '' }, lista, itens), ''); // sem vínculo vale
  assert.equal(T.validarIngrediente({ nome: 'Açúcar refinado', tacoCodigo: null }, lista, itens), '');
  assert.match(T.validarIngrediente({ nome: 'Açúcar refinado', tacoCodigo: 9999 }, lista, itens), /não existe na Tabela TACO/);
  assert.equal(T.validarIngrediente({ nome: 'Açúcar refinado', tacoCodigo: '597' }, lista, itens), '');
});
t('importação em CSV: lê, confere e não importa pela metade', () => {
  const ok = T.lerCsv('codigo;descricao;grupo;kcal;proteina;sodio\n1;Alimento Teste;Grupo Teste;123,5;2.25;Tr\n2;Outro Teste;;NA;;10', oficial.colunas);
  assert.deepEqual(ok.erros, []);
  assert.deepEqual(ok.tabela.colunas, [['kcal', 'kcal'], ['proteina', 'g'], ['sodio', 'mg']]);
  assert.deepEqual(ok.tabela.linhas, [[1, 'Alimento Teste', 'Grupo Teste', 123.5, 2.25, 'Tr'], [2, 'Outro Teste', '', null, null, 10]]);
  assert.equal(T.itensDe(ok.tabela)[0].valores.kcal, 123.5);
  assert.match(T.lerCsv('', oficial.colunas).erros[0], /vazio/);
  assert.match(T.lerCsv('nome;kcal\nA;1', oficial.colunas).erros.join(' '), /codigo/);
  assert.match(T.lerCsv('codigo;descricao;cor\n1;A;azul', oficial.colunas).erros.join(' '), /Nenhuma coluna de valores/);
  const ruim = T.lerCsv('codigo;descricao;kcal\n1;A;10\n1;B;20\nx;C;30\n3;;40\n4;D;abc', oficial.colunas);
  assert.equal(ruim.tabela, null);
  assert.equal(ruim.erros.length, 4); // repetido, código inválido, sem descrição, valor inválido
});
t('modelo do CSV reaproveita o cabeçalho da tabela e volta a ser lido', () => {
  const m = T.modeloCsv(oficial);
  assert.ok(m.startsWith('codigo;descricao;grupo;umidade;kcal;'));
  const r = T.lerCsv(m, oficial.colunas);
  assert.deepEqual(r.erros, []);
  assert.equal(r.tabela.linhas[0][1], 'Arroz, integral, cozido');
  assert.equal(r.tabela.linhas[0][4], 123.53);
});
console.log('producao-taco: ' + n + ' grupos de verificação ok');
