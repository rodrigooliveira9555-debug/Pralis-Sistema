// RET - Patrimônios: regras puras do cadastro em seis etapas (dist/producao/patrimonio-dominio.js).
const assert = require('node:assert/strict');
const P = require('../dist/producao/patrimonio-dominio.js');
const regras = require('../dist/field-validation.js');
let n = 0; const ok = (f) => { f(); n++; };
const base = (x = {}) => P.normalizar({ id: 'b1', nome: 'Notebook Dell', categoria: 'informatica', ...x });
const v = (b, ctx = {}) => P.validar(b, { bens: [], cnpjValid: regras.cnpjValid, hoje: '2026-11-17', ...ctx });
const D0 = ['', '', '', '', '', ''];

ok(() => { // categorias: as 5 do cadastro vêm primeiro; as antigas ficam para o que já foi cadastrado, sem repetir
  const D = require('../dist/producao/dominio.js');
  assert.deepEqual(P.CATEGORIAS_PATRIMONIO.map(([k]) => k), ['CIS', 'UTS', 'MAC', 'MOB', 'VE']);
  assert.deepEqual(P.CATEGORIAS_PATRIMONIO.map(([, t]) => t), ['CIS - Estrutura Física', 'UTS - Utensílios e Ferramentas', 'MAC - Máquinas e Equipamentos', 'MOB - Mobiliários / Balcões', 'VE - Veículos']);
  assert.deepEqual(D.CATEGORIAS.slice(0, 5), P.CATEGORIAS_PATRIMONIO);
  assert.deepEqual(D.CATEGORIAS.slice(5, 9), [['utensilio', 'Utensílio'], ['maquina', 'Máquina'], ['equipamento', 'Equipamento'], ['mobiliario', 'Mobiliário']]);
  assert.equal(D.CATEGORIAS.length, 5 + 4 + P.CATEGORIAS_NOVAS.length);
  assert.ok(D.ENERGIAS.some(([k]) => k === 'solar'));
  assert.equal(new Set(D.CATEGORIAS.map(([k]) => k)).size, D.CATEGORIAS.length);
  assert.equal(P.etapas().length, 6);
});
ok(() => { // etapa 1: só nome e categoria são obrigatórios; imóvel não precisa de marca nem série
  assert.deepEqual(v(base()), D0);
  assert.match(v(base({ nome: ' ' }))[0], /nome simplificado/);
  assert.match(v(base({ categoria: '' }))[0], /categoria/);
  assert.deepEqual(v(base({ categoria: 'imovel', tipoBem: 'imovel', marca: '', numeroSerie: '' })), D0);
  assert.match(v(base({ valor: -1 }))[0], /negativo/);
  assert.match(v(base({ quantidade: 0, unidade: 'UN' }))[0], /inteiro a partir de 1/);
  assert.match(v(base({ quantidade: 2 }))[0], /unidade de medida/);
  assert.match(v(base({ tipoBem: 'x' }))[0], /Tipo de bem/);
  assert.match(v(base({ situacaoPatrimonial: 'x' }))[0], /Situação patrimonial/);
  assert.match(v(base({ conservacao: 'x' }))[0], /conservação/);
  assert.match(v(base({ dataCadastro: '2026-02-30' }))[0], /Data de cadastro/);
  assert.match(v(base({ situacaoPatrimonial: 'baixado' }))[0], /registre a baixa/);
  assert.deepEqual(v(base({ situacaoPatrimonial: 'baixado', baixa: { motivo: 'venda', data: '2026-10-01' } })), D0);
});
ok(() => { // número de patrimônio único (sem diferenciar maiúsculas) e geração sem repetir
  const outros = [{ id: 'x', numeroPatrimonio: 'PAT-000007' }, { id: 'y', numeroPatrimonio: 'ABC-1' }];
  assert.match(v(base({ numeroPatrimonio: 'pat-000007' }), { bens: outros })[0], /Já existe um bem com o número/);
  assert.deepEqual(v(base({ id: 'x', numeroPatrimonio: 'PAT-000007' }), { bens: outros }), D0); // o próprio registro
  assert.equal(P.proximoNumero(outros), 'PAT-000008');
  assert.equal(P.proximoNumero([]), 'PAT-000001');
  assert.equal(P.proximoNumero([{ numeroPatrimonio: 'PAT-000099' }, { numeroPatrimonio: 'PAT-000003' }]), 'PAT-000100');
});
ok(() => { // etapa 2: imagens e documentos
  const img = (x) => ({ id: 'i1', name: 'a.jpg', type: 'image/jpeg', size: 1000, ...x });
  assert.deepEqual(v(base({ imagens: [img({}), img({ id: 'i2' })] })), D0);
  assert.equal(base({ imagens: [img({}), img({ id: 'i2' })] }).imagens.filter((i) => i.principal).length, 1); // sempre uma principal
  assert.equal(base({ imagens: [img({ principal: true }), img({ id: 'i2', principal: true })] }).imagens.filter((i) => i.principal).length, 1);
  assert.equal(base({ imagens: [img({ id: 'i2' }), img({ principal: true })] }).imagens.find((i) => i.principal).id, 'i1');
  assert.match(v(base({ imagens: [img({ type: 'image/gif' })] }))[1], /formato aceito/);
  assert.match(v(base({ imagens: [img({ size: 11 * 1024 * 1024 })] }))[1], /10 MB/);
  assert.match(v(base({ imagens: [img({ tipo: 'qualquer' })] }))[1], /Tipo de imagem/);
  assert.match(v(base({ imagens: Array.from({ length: 21 }, (_, i) => img({ id: 'i' + i })) }))[1], /No máximo 20/);
  const doc = (x) => ({ id: 'd1', name: 'nf.pdf', type: 'application/pdf', size: 10, tipo: 'nota-fiscal', data: '2026-01-10', ...x });
  assert.deepEqual(v(base({ documentos: [doc({})] })), D0);
  assert.match(v(base({ documentos: [doc({ type: 'text/plain' })] }))[1], /formato aceito/);
  assert.match(v(base({ documentos: [doc({ data: '10/01/2026' })] }))[1], /Data inválida/);
  assert.match(v(base({ documentos: [doc({ tipo: 'x' })] }))[1], /Tipo de documento/);
  assert.equal(base({ imagens: [{ name: 'sem id' }] }).imagens.length, 0);
});
ok(() => { // etapa 3: CNPJ, responsável, movimentações
  assert.deepEqual(v(base({ localizacao: { cnpj: '11.222.333/0001-81' } })), D0);
  assert.match(v(base({ localizacao: { cnpj: '11.222.333/0001-80' } }))[2], /CNPJ/);
  assert.match(v(base({ responsavel: { tipo: 'x' } }))[2], /Tipo de responsabilidade/);
  assert.match(v(base({ responsavel: { dataAtribuicao: '2026-13-01' } }))[2], /atribuição/);
  const mv = (x) => ({ id: 'm', tipo: 'transf-setor', data: '2026-05-10', ...x });
  assert.deepEqual(v(base({ movimentacoes: [mv({}), mv({ id: 'm2', data: '2026-06-01' })] })), D0);
  assert.match(v(base({ movimentacoes: [mv({ tipo: '' })] }))[2], /tipo de cada movimentação/);
  assert.match(v(base({ movimentacoes: [mv({ data: '2026-12-01' })] }))[2], /futura/);
  assert.match(v(base({ movimentacoes: [mv({ data: '2026-06-01' }), mv({ id: 'm2', data: '2026-05-01' })] }))[2], /ordem cronológica/);
});
ok(() => { // etapa 4: peças, quantidades, totais, técnicas por categoria e vínculos
  const pc = (x) => ({ id: 'p', nome: 'SSD', quantidade: 2, unidade: 'UN', valor: 150.5, ...x });
  assert.deepEqual(v(base({ pecas: [pc({})] })), D0);
  assert.match(v(base({ pecas: [pc({ nome: '' })] }))[3], /nome de cada peça/);
  assert.match(v(base({ pecas: [pc({ quantidade: 0 })] }))[3], /inteiro a partir de 1/);
  assert.match(v(base({ pecas: [pc({ quantidade: 1.5 })] }))[3], /inteiro a partir de 1/);
  assert.match(v(base({ pecas: [pc({ unidade: '' })] }))[3], /unidade de medida/);
  assert.match(v(base({ pecas: [pc({ situacao: 'x' })] }))[3], /Situação inválida/);
  assert.match(v(base({ pecas: [pc({ codigo: 'A1' }), pc({ id: 'q', codigo: 'a1' })] }))[3], /repetido/);
  assert.equal(base({ pecas: [{ nome: 'Carregador' }] }).pecas[0].quantidade, 1); // peça antiga: quantidade 1
  assert.equal(P.totalPeca({ valor: 150.5, quantidade: 2 }), 301);
  assert.equal(P.totalPeca({ valor: 0.1, quantidade: 3 }), 0.3); // sem erro de ponto flutuante
  assert.equal(P.totalPeca({ valor: null, quantidade: 3 }), null);
  const t = P.totaisComponentes([{ quantidade: 2, valor: 10 }, { quantidade: 5, valor: 1, situacao: 'substituido' }, { quantidade: 1, situacao: 'baixado' }, { nome: 'sem qtd' }]);
  assert.deepEqual(t, { tipos: 4, unidades: 9, ativos: 2, substituidos: 1, valor: 25 }); // tipos ≠ unidades físicas
  assert.match(v(base({ tecnicas: { anoFabricacao: '1700' } }))[3], /Ano de fabricação/);
  assert.deepEqual(v(base({ tecnicas: { anoFabricacao: '2024' } })), D0);
  assert.ok(P.camposTecnicos('imovel').includes('dimensoes') && !P.camposTecnicos('imovel').includes('voltagem'));
  assert.ok(P.camposTecnicos('informatica').includes('voltagem') && !P.camposTecnicos('informatica').includes('capacidade'));
  assert.equal(P.camposTecnicos('outros').length, P.TECNICAS.length);
  assert.ok(P.camposTecnicos('mobiliario').includes('material') && P.camposTecnicos('mobiliario').includes('fabricante'));
  // vínculos: não consigo mesmo, existente, sem ciclo, sem dupla contagem
  const bens = [{ id: 'b1', vinculados: [] }, { id: 'b2', vinculados: ['b3'] }, { id: 'b3', vinculados: [] }];
  assert.deepEqual(v(base({ composto: true, vinculados: ['b2'] }), { bens }), D0);
  assert.match(v(base({ composto: true, vinculados: ['b1'] }), { bens })[3], /ele mesmo/);
  assert.match(v(base({ composto: true, vinculados: ['zz'] }), { bens })[3], /não existe mais/);
  assert.match(v(base({ id: 'b3', composto: true, vinculados: ['b2'] }), { bens })[3], /circular/); // b2 já contém b3
  assert.equal(P.criaCiclo(bens, 'b3', ['b2']), true);
  assert.equal(P.criaCiclo(bens, 'b1', ['b2']), false);
  assert.equal(P.criaCiclo([{ id: 'a', vinculados: ['b'] }, { id: 'b', vinculados: ['c'] }, { id: 'c', vinculados: ['a'] }], 'x', ['a']), false); // ciclo alheio não prende
  assert.equal(P.valorDoConjunto({ valor: 100, vinculados: ['b2'] }), 100); // o valor dos vinculados não soma de novo
});
ok(() => { // etapa 5: aquisição, contábil, garantia e seguro
  const fin = (x) => ({ tipoAquisicao: 'compra', dataAquisicao: '2026-01-10', dataRecebimento: '2026-01-15', dataOperacao: '2026-01-20', valorAquisicao: 1000, frete: 50, ...x });
  assert.deepEqual(v(base({ financeiro: fin({}) })), D0);
  assert.equal(P.valorTotalAquisicao({ valorAquisicao: 1000, frete: 50, instalacao: 20.1, custosAdicionais: 0.2, descontos: 30.3 }), 1040); // exato em centavos
  assert.equal(P.valorTotalAquisicao({}), 0);
  assert.match(v(base({ financeiro: fin({ tipoAquisicao: 'x' }) }))[4], /Tipo de aquisição/);
  assert.match(v(base({ financeiro: fin({ dataRecebimento: '2026-01-05' }) }))[4], /recebimento não pode ser anterior/);
  assert.match(v(base({ financeiro: fin({ dataOperacao: '2026-01-12' }) }))[4], /operação não pode ser anterior/);
  assert.match(v(base({ financeiro: fin({ frete: -1 }) }))[4], /frete não pode ser negativo/);
  assert.match(v(base({ financeiro: fin({ descontos: 5000 }) }))[4], /descontos não podem passar/);
  assert.match(v(base({ contabil: { metodo: 'x' } }))[4], /Método de depreciação/);
  assert.deepEqual(v(base({ contabil: { metodo: 'nao' } })), D0); // não depreciável vale
  assert.match(v(base({ contabil: { vidaUtilMeses: 0 } }))[4], /vida útil/);
  assert.match(v(base({ contabil: { valorResidual: -5 } }))[4], /residual/);
  assert.match(v(base({ garantia: { possui: true, inicio: '2026-05-01', fim: '2026-04-01' } }))[4], /garantia não pode ser anterior/);
  assert.deepEqual(v(base({ garantia: { possui: false, inicio: '2026-05-01', fim: '2026-04-01' } })), D0); // sem garantia, nada é conferido
  assert.match(v(base({ seguro: { possui: true, inicio: '2026-05-01', fim: '2026-04-01' } }))[4], /seguro não pode ser anterior/);
  assert.match(v(base({ seguro: { possui: true, valorSegurado: -1 } }))[4], /valor segurado/);
  assert.deepEqual(P.prazoRestante('2026-01-01', '2026-12-01', '2026-11-17'), { dias: 14, texto: 'Vence em 14 dia(s)' });
  assert.equal(P.prazoRestante('2026-01-01', '2026-11-17', '2026-11-17').texto, 'Vence hoje');
  assert.equal(P.prazoRestante('2026-01-01', '2026-11-10', '2026-11-17').texto, 'Vencida há 7 dia(s)');
  assert.equal(P.prazoRestante('2027-01-01', '2027-12-01', '2026-11-17').texto.startsWith('Começa em'), true);
  assert.equal(P.prazoRestante('', '', '2026-11-17'), null);
});
ok(() => { // etapa 6: manutenção, histórico, inspeção e baixa
  assert.deepEqual(v(base({ manutencao: { exige: true, tipo: 'preventiva', custoEstimado: 100 }, revisao: { ultima: '2026-01-01', proxima: '2026-07-01' } })), D0);
  assert.match(v(base({ manutencao: { tipo: 'x' } }))[5], /Tipo de manutenção/);
  assert.match(v(base({ manutencao: { custoEstimado: -1 } }))[5], /custo estimado/);
  assert.match(v(base({ revisao: { ultima: '2026-07-01', proxima: '2026-01-01' } }))[5], /próxima manutenção não pode ser anterior/);
  const mt = (x) => ({ id: 'h', data: '2026-03-01', tipo: 'corretiva', descricao: 'Troca da correia', custo: 80, situacao: 'realizada', ...x });
  assert.deepEqual(v(base({ manutencoes: [mt({})] })), D0);
  assert.match(v(base({ manutencoes: [mt({ descricao: '' })] }))[5], /Descreva o serviço/);
  assert.match(v(base({ manutencoes: [mt({ tipo: '' })] }))[5], /tipo de cada manutenção/);
  assert.match(v(base({ manutencoes: [mt({ data: '' })] }))[5], /Data inválida/);
  assert.match(v(base({ manutencoes: [mt({ custo: -2 })] }))[5], /custo/);
  assert.match(v(base({ inspecao: { ultima: '2026-05-01', proxima: '2026-04-01' } }))[5], /próxima inspeção não pode ser anterior/);
  assert.match(v(base({ inspecao: { resultado: 'x' } }))[5], /Resultado de inspeção/);
  assert.match(v(base({ baixa: { motivo: 'x', data: '2026-01-01' } }))[5], /Motivo de baixa/);
  assert.match(v(base({ baixa: { motivo: 'venda', data: '' } }))[5], /Data da baixa/);
  assert.equal(base({ manutencoes: [] }).manutencoes.length, 0); // nada é inventado
});
ok(() => { // histórico de alterações
  assert.deepEqual(P.mudancas({ id: 'a', nome: 'X', valor: 1, historico: [1] }, { id: 'a', nome: 'Y', valor: 1, historico: [2], atualizadoEm: 'z' }), ['nome']);
  assert.deepEqual(P.mudancas({ a: { b: 1 } }, { a: { b: 1 } }), []);
  assert.deepEqual(P.mudancas({}, { novo: 'x' }), ['novo']);
});
ok(() => { // cadastro de 18/11/2026: unidades, materiais, produção, utensílios e especificação técnica
  assert.deepEqual(P.UNIDADES_MEDIDA.map(([k]) => k), ['UN', 'KG', 'LT', 'MT']);
  assert.deepEqual(P.UNIDADES_MEDIDA.map(([, t]) => t), ['UN - Unidade', 'KG - Quilo', 'LT - Litro', 'MT - Metro']);
  const todos = P.MATERIAIS.flatMap(([, l]) => l); assert.equal(todos.length, 8 + 7 + 5 + 11); assert.equal(new Set(todos).size, todos.length);
  assert.ok(P.CATEGORIAS_PRODUCAO.includes('MAC') && P.CATEGORIAS_PRODUCAO.includes('MOB') && !P.CATEGORIAS_PRODUCAO.includes('UTS') && !P.CATEGORIAS_PRODUCAO.includes('CIS') && !P.CATEGORIAS_PRODUCAO.includes('VE'));
  assert.deepEqual(P.TECNICAS_OCULTAS.slice(0, 2), ['modeloTecnico', 'capacidade']);
  assert.ok(!P.camposTecnicos('MAC').includes('inexistente') && P.camposTecnicos('MAC').includes('serieTecnica') && !P.camposTecnicos('MOB').includes('serieTecnica'));
  const o = P.normalizar({ nome: 'X', categoria: 'MAC', materiais: ['Aço inox 304', 'aço inox 304', ' ', 'Fibra'], utensiliosIds: ['a', 'a', 'b', ''], usadoNaProducao: 1 });
  assert.deepEqual(o.materiais, ['Aço inox 304', 'Fibra']); assert.deepEqual(o.utensiliosIds, ['a', 'b']); assert.equal(o.usadoNaProducao, true); assert.equal(o.informarEspecificacao, false);
  const bens = [{ id: 'u1' }, { id: 'e1' }];
  assert.deepEqual(v(base({ categoria: 'MAC', utensiliosIds: ['u1'], capacidade: { valor: 50, unidade: 'KG' } }), { bens }), D0);
  assert.match(v(base({ categoria: 'MAC', utensiliosIds: ['zz'] }), { bens })[0], /utensílio selecionado não existe/);
  assert.match(v(base({ id: 'e1', categoria: 'MAC', utensiliosIds: ['e1'] }), { bens })[0], /si mesmo/);
  assert.match(v(base({ categoria: 'MAC', capacidade: { valor: 0, unidade: 'KG' } }))[0], /capacidade de produção/);
  assert.deepEqual(v(base({ dimensoesFisicas: { altura: 1.8, largura: 0.9, profundidade: 0.75, unidade: 'm' } })), D0);
  assert.match(v(base({ dimensoesFisicas: { altura: 0, largura: null, profundidade: null, unidade: 'm' } }))[3], /altura/);
  assert.match(v(base({ dimensoesFisicas: { altura: 1, unidade: 'km' } }))[3], /Unidade das dimensões/);
  assert.match(v(base({ energia: 'nuclear' }))[3], /Tipo de energia/);
  assert.deepEqual(v(base({ energia: 'gas', consumoGas: { valor: 1.5, unidade: 'kg/h' } })), D0);
  assert.match(v(base({ energia: 'gas', consumoGas: { valor: 1.5, unidade: '' } }))[3], /unidade do consumo de gás/);
  assert.match(v(base({ energia: 'gas', consumoGas: { valor: -1, unidade: 'kg/h' } }))[3], /consumo de gás/);
  assert.deepEqual(v(base({ energia: 'eletrica', potenciaW: 2000 })), D0);
  assert.match(v(base({ energia: 'eletrica', potenciaW: 0 }))[3], /potência elétrica/);
  assert.deepEqual(v(base({ energia: 'solar' })), D0);
  assert.match(P.etapas()[3], /especificação técnica/i);
});
console.log('patrimonio-dominio: ' + n + ' grupos de verificação ok');
