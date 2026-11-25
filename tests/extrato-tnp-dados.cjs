// Open Finance · Caixa TNP — as contas da tela (dist/extrato-tnp/dados.js): filtros, totais (conta x cartão),
// agrupamento por categoria e o CSV. Sem navegador: só o arquivo, com o "dobrar" das telas.
const assert = require('node:assert/strict');
const path = require('node:path');

global.window = { CicluzComprasUI: { dobrar: (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR') } };
global.document = undefined;
require(path.join(__dirname, '..', 'dist', 'extrato-tnp', 'dados.js'));
const D = window.CicluzExtratoTnpDados;

const l = (id, valor, extra = {}) => ({ transacaoId: id, contaId: 'c1', data: '2026-11-24T00:00:00.000Z', dia: '2026-11-24', descricao: 'LANC ' + id, valorCentavos: valor,
  tipo: valor < 0 ? 'DEBIT' : 'CREDIT', situacao: 'POSTED', saldoCentavos: null, operacao: 'PIX', categoria: 'Groceries', contraparte: null, detalhes: {}, ...extra });
const dados = { dias: [{ dia: '2026-11-24', lancamentos: [
  l('a', 10000, { contraparte: 'CLIENTE JOSÉ' }),
  l('b', -2500, { operacao: 'BOLETO', categoria: 'Electricity', detalhes: { documento: { tipo: 'CNPJ', numero: '11.222.333/0001-44' } } }),
  l('c', -1000, { situacao: 'PENDING' }),
] }] };

// Conta: pendente fora dos totais. Cartão: pendente (fatura aberta) entra.
assert.deepEqual(D.somar(D.todos(dados)), { entradas: 10000, saidas: -2500, liquido: 7500, quantidade: 3, pendentes: 1 });
assert.equal(D.somar(D.todos(dados), true).saidas, -3500);

// Busca sem acento e por CNPJ; tipo; operação; categoria; faixa de valor.
D.estado.filtro.busca = 'jose';
assert.deepEqual(D.filtrados(dados).map((x) => x.transacaoId), ['a']);
D.reiniciarFiltro(); D.estado.filtro.busca = '11.222.333';
assert.deepEqual(D.filtrados(dados).map((x) => x.transacaoId), ['b']);
D.reiniciarFiltro(); D.estado.filtro.tipo = 'saida';
assert.deepEqual(D.filtrados(dados).map((x) => x.transacaoId), ['b', 'c']);
D.reiniciarFiltro(); D.estado.filtro.operacao = 'BOLETO';
assert.deepEqual(D.filtrados(dados).map((x) => x.transacaoId), ['b']);
D.reiniciarFiltro(); D.estado.filtro.valorMin = '20'; D.estado.filtro.valorMax = '50,00';
assert.deepEqual(D.filtrados(dados).map((x) => x.transacaoId), ['b']);
assert.equal(D.filtrosEmUso(), 2);
D.reiniciarFiltro();
assert.equal(D.lerValor('1.234,56'), 123456);
assert.equal(D.lerValor('abc'), null);

// Agrupar: só lançados na conta; no cartão, os pendentes também.
assert.deepEqual(D.agrupar(D.todos(dados), 'categoria', -1).map((g) => [g.id, g.total]), [['Electricity', 2500]]);
assert.deepEqual(D.agrupar(D.todos(dados), 'categoria', -1, true).map((g) => [g.id, g.total]), [['Electricity', 2500], ['Groceries', 1000]]);

// Nomes em português e CSV para o Excel (ponto e vírgula, vírgula decimal, BOM).
assert.equal(D.nomeCategoria('Electricity'), 'Energia elétrica');
assert.equal(D.nomeOperacao('TARIFA_SERVICOS_AVULSOS'), 'Tarifa avulsa');
assert.equal(D.nomeConta({ tipo: 'CREDIT', nome: 'CAIXA VISA EMPRESARIAL', detalhes: { bandeira: 'VISA' } }), 'Cartão VISA');
const csv = D.csv(D.todos(dados), [{ contaId: 'c1', tipo: 'BANK', subtipo: 'CHECKING_ACCOUNT', detalhes: {} }]);
assert.ok(csv.startsWith('﻿Data;Hora;Conta;'));
assert.ok(csv.includes('24/11/26;;Corrente;LANC b;Boleto;Energia elétrica;;11.222.333/0001-44;;;-25,00;Lançado'));
// Texto do banco que parece fórmula sai com apóstrofo (não roda no Excel); o valor negativo continua número.
const perigoso = D.csv([l('x', -100, { descricao: '=HYPERLINK("http://mal")', contraparte: '+55 golpe' })], []);
assert.ok(perigoso.includes(`;"'=HYPERLINK(""http://mal"")";`));
assert.ok(perigoso.includes(";'+55 golpe;"));
assert.ok(perigoso.includes(';-1,00;'));

console.log('extrato-tnp-dados: ok');
