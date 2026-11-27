// Área ConPlus (laboratório): montagem, Windows-1252, conferência, leitura, SEQ, de-para e vínculo CPF ↔ contrato.
// Rodar: node tests/conplus-dominio.cjs. Só dados fictícios (o modelo da ConPlus e CPFs gerados para teste).
const assert = require('node:assert/strict');
const L = require('../dist/conplus/layout.js');
const D = require('../dist/conplus/dominio.js');

let n = 0;
const t = (nome, fn) => { try { fn(); n++; } catch (e) { console.error('FALHOU:', nome); throw e; } };
const M = L.MODELO;
const admissaoDoModelo = () => ({ cnpj: L.CNPJ_HOMOLOGACAO, a: D.valoresDaLinha(M.A), b: D.valoresDaLinha(M.B), c: D.valoresDaLinha(M.C), d: [D.valoresDaLinha(M.D)] });
const erroEm = (r, linha, coluna) => r.erros.find((e) => e.linha === linha && e.coluna === coluna);

t('o layout tem o número de colunas da doc', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(L.REGISTROS).map(([k, r]) => [k, r.colunas])), { A: 21, B: 85, C: 67, D: 31, E: 13 });
  for (const r of 'ABCDE') assert.equal(L.colunas(r).length, L.REGISTROS[r].colunas, r);
  // O próprio modelo tem essas contagens (E com o ";" a mais do exemplo).
  assert.equal(M.A.split(';').length, 21); assert.equal(M.B.split(';').length, 85); assert.equal(M.C.split(';').length, 67);
  assert.equal(M.D.split(';').length, 31); assert.equal(M.E.split(';').length, 14);
});

t('aceite: a admissão gerada sai idêntica ao modelo testado pela ConPlus', () => {
  const linhas = D.montarAdmissao(admissaoDoModelo());
  assert.deepEqual(linhas, [M.A, M.B, M.C, M.D]);
  assert.ok(D.igualAoModelo(linhas));
  assert.equal(D.juntar(linhas), M.A + '\r\n' + M.B + '\r\n' + M.C + '\r\n' + M.D + '\r\n');
  const r = D.validar(D.juntar(linhas));
  assert.deepEqual(r.erros, []); assert.deepEqual(r.avisos, []); assert.equal(r.grupo, 'Admissao');
});

t('aceite: a linha E sai idêntica ao exemplo da doc', () => {
  const [e] = D.montarEventos([{ periodo: '2505', seq: '1', contrato: '1', evento: '318', referencia: '5,00', valor: '0,00' }]);
  assert.equal(e, M.E);
  const r = D.validar(e);
  assert.deepEqual(r.erros, []); assert.equal(r.grupo, 'EventoVariavel');
});

t('colunas fixas e derivadas não dependem do formulário', () => {
  const x = admissaoDoModelo();
  x.c[3] = 'QUALQUER'; x.d[0][3] = '111.111.111-11'; x.d[0][4] = '02/02/2002'; x.a[1] = 'Z'; x.b[2] = 'outro';
  assert.deepEqual(D.montarAdmissao(x), [M.A, M.B, M.C, M.D]);
});

t('sem dado complementar e sem dependente, só A e B', () => {
  const x = admissaoDoModelo(); x.c = {}; x.d = [{}, { 1: 'D', 2: 'x' }];
  assert.deepEqual(D.montarAdmissao(x), [M.A, M.B]);
  assert.deepEqual(D.validar(D.juntar(D.montarAdmissao(x))).erros, []);
});

t('Windows-1252: acentos do modelo viram um byte; fora dele é erro', () => {
  const b = D.paraWindows1252('ACÁCIAS Ç €');
  assert.deepEqual([...b], [65, 67, 0xC1, 67, 73, 65, 83, 32, 0xC7, 32, 0x80]);
  assert.equal(D.lerBytes(b).texto, 'ACÁCIAS Ç €');
  assert.equal(D.lerBytes(b).codificacao, 'Windows-1252');
  assert.deepEqual(D.foraDo1252('ok ✓ 😀'), ['✓', '😀']);
  assert.throws(() => D.paraWindows1252('✓'));
  const utf8 = new TextEncoder().encode('SÃO');
  assert.equal(D.lerBytes(utf8).codificacao, 'UTF-8');
  assert.equal(D.lerBytes(utf8).texto, 'SÃO');
  const ida = D.paraWindows1252(D.juntar([M.A, M.B, M.C, M.D]));
  assert.equal(D.lerBytes(ida).texto, D.juntar([M.A, M.B, M.C, M.D]));
});

t('número de colunas: aponta a linha e conta como a API', () => {
  const C68 = M.C + ';x';
  const r = D.validar([M.A, M.B, C68].join('\r\n'));
  assert.equal(r.erros[0].texto, 'Linha 3: registro C com 68 colunas; o layout C_DadosNaoObrigatoriosAdmissao.nli tem 67');
  // Um ";" a mais no fim (coluna extra vazia) passa, como na linha E da doc.
  const ok = D.ler(M.A + ';');
  assert.equal(ok[0].erros.length, 0); assert.ok(ok[0].sobraFinal);
  // Uma coluna a menos é recusada.
  const curta = D.validar(M.D.slice(0, M.D.lastIndexOf(';')));
  assert.match(curta.erros[0].texto, /registro D com 30 colunas; o layout D_DependenteRascunho\.nli tem 31/);
  // Linhas em branco são ignoradas e não mudam a numeração.
  const comBranco = D.ler('\r\n' + M.E + '\r\n\r\n');
  assert.equal(comBranco.length, 1); assert.equal(comBranco[0].numero, 2);
});

t('formatos: data, decimal, CPF, CNPJ, negativo, obrigatório — com linha e coluna', () => {
  const troca = (linha, col, valor) => { const p = linha.split(';'); p[col - 1] = valor; return p.join(';'); };
  const casos = [
    [troca(M.A, 8, '1995-01-01'), 1, 8, /data inválida: use dd\/mm\/aaaa em Data de nascimento \(coluna 8\)/],
    [troca(M.A, 9, '31/02/2026'), 1, 9, /data inválida/],
    [troca(M.A, 20, '2500.00'), 1, 20, /vírgula .* em VALORSAL \(coluna 20\)/],
    [troca(M.A, 20, '2.500,00'), 1, 20, /vírgula/],
    [troca(M.A, 20, '-2500,00'), 1, 20, /^Linha 1: valor negativo em VALORSAL \(coluna 20\)$/],
    [troca(M.A, 6, '90010023747'), 1, 6, /pontuação/],
    [troca(M.A, 6, '900.100.237-48'), 1, 6, /dígitos verificadores/],
    [troca(M.A, 4, '84.859.909/0001-91'), 1, 4, /CNPJ inválido/],
    [troca(M.A, 7, ''), 1, 7, /campo obrigatório vazio em Nome \(coluna 7\)/],
    [troca(M.A, 18, ''), 1, 18, /obrigatório vazio em CODIGOCARGO \(coluna 18\)/],
    [troca(M.A, 13, '-5'), 1, 13, /valor negativo/],
  ];
  for (const [a, linha, coluna, re] of casos) {
    const r = D.validar([a, M.B].join('\r\n'));
    const e = erroEm(r, linha, coluna);
    assert.ok(e, 'esperava erro na linha ' + linha + ' coluna ' + coluna + ' — ' + JSON.stringify(r.erros));
    assert.match(e.texto, re);
  }
  // Coluna que a doc não nomeia também recusa negativo.
  assert.ok(erroEm(D.validar([M.A, troca(M.B, 27, '-10')].join('\n')), 2, 27));
});

t('regras do registro B: obrigatórias, TIPOJORNADA e pagamento em conta', () => {
  const troca = (col, valor, base = M.B) => { const p = base.split(';'); p[col - 1] = valor; return p.join(';'); };
  for (const col of [40, 41, 48, 49, 54, 56]) assert.match(erroEm(D.validar([M.A, troca(col, '')].join('\n')), 2, col).texto, /obrigatório vazio/, String(col));
  assert.match(erroEm(D.validar([M.A, troca(74, '0')].join('\n')), 2, 74).texto, /eSocial/);
  assert.match(erroEm(D.validar([M.A, troca(57, '9')].join('\n')), 2, 57).texto, /use 1, 2, 3, 4/);
  const banco = D.validar([M.A, troca(60, '3')].join('\n'));
  assert.deepEqual(banco.erros.filter((e) => e.linha === 2).map((e) => e.coluna), [61, 62, 63, 64, 65]);
  const agSemBanco = D.validar([M.A, troca(63, '1234')].join('\n'));
  assert.match(erroEm(agSemBanco, 2, 63).texto, /agência sem banco/);
});

t('regras de conjunto da admissão', () => {
  assert.match(D.validar(M.A).erros.map((e) => e.texto).join('|'), /falta a linha B/);
  assert.match(D.validar(M.B).erros.map((e) => e.texto).join('|'), /falta a linha A/);
  const cVazia = 'C;' + L.CNPJ_HOMOLOGACAO + ';'.repeat(65);
  assert.equal(cVazia.split(';').length, 67);
  assert.match(D.validar([M.A, M.B, cVazia].join('\n')).erros.map((e) => e.texto).join('|'), /Linha 3: linha C sem nenhum dado/);
  const dOutroTitular = M.D.replace('900.100.237-47', '529.982.247-25');
  const r = D.validar([M.A, M.B, dOutroTitular].join('\n'));
  assert.match(erroEm(r, 3, 3).texto, /diferente do CPF do A/);
  assert.match(D.validar([M.A, M.B, M.E].join('\n')).erros.map((e) => e.texto).join('|'), /mistura eventos/);
  assert.match(D.validar([M.A, M.B, M.A, M.B].join('\n')).avisos.map((e) => e.texto).join('|'), /2 admissões/);
  assert.match(D.validar('X;1;2').erros[0].texto, /não pertence aos layouts/);
  assert.match(D.validar('').erros[0].texto, /arquivo vazio/);
  assert.match(D.validar(M.E, { bytes: D.LIMITE_BYTES + 1 }).erros[0].texto, /5 MB/);
});

t('valor com ";" ou fora do Windows-1252 é recusado na coluna', () => {
  const c = L.colunas('A')[6];
  assert.match(D.problemaDoValor(c, 'MARIA; JOSE'), /deslocariam/);
  assert.match(D.problemaDoValor(c, 'MARIA ✓'), /Windows-1252/);
  assert.equal(D.problemaDoValor(c, 'MARIA DA CONCEIÇÃO'), '');
});

t('leitura: cada coluna com o rótulo e a marca do que a doc não nomeia', () => {
  const [a] = D.ler(M.A);
  assert.equal(a.colunas.length, 21);
  assert.deepEqual(a.colunas[19], { n: 20, nome: 'Salário', campo: 'VALORSAL', aConfirmar: false, valor: '2500,00', problema: '' });
  assert.equal(a.colunas[1].nome, 'Coluna 2'); assert.equal(a.colunas[1].aConfirmar, true);
  const [b] = D.ler(M.B);
  assert.equal(b.colunas[6].nome, 'Endereço, município e naturalidade (coluna 7)');
  // Tipo inferido pelo modelo: C26 (data) e B59 (decimal, com nome).
  assert.equal(L.colunas('C')[25].tipo, 'data'); assert.equal(L.colunas('B')[58].tipo, 'decimal');
});

t('SEQ: gerado uma vez por CNPJ, período e contrato, e nunca reaproveitado', () => {
  const base = { cnpj: L.CNPJ_HOMOLOGACAO, periodo: '2505', contrato: '1', evento: '318', referencia: '5,00', valor: '0,00' };
  let e = { lancamentos: [], ultimoSeq: {} };
  let r = D.novoLancamento(e, base, { id: 'a' }); e = r.estado; assert.equal(r.lancamento.seq, '1');
  r = D.novoLancamento(e, base, { id: 'b' }); e = r.estado; assert.equal(r.lancamento.seq, '2');
  r = D.novoLancamento(e, { ...base, contrato: '7' }, { id: 'c' }); e = r.estado; assert.equal(r.lancamento.seq, '1');
  r = D.novoLancamento(e, { ...base, periodo: '2506' }, { id: 'd' }); e = r.estado; assert.equal(r.lancamento.seq, '1');
  // Apagar o último não devolve o número.
  e = { ...e, lancamentos: e.lancamentos.filter((x) => x.id !== 'b') };
  r = D.novoLancamento(e, base, { id: 'e' }); assert.equal(r.lancamento.seq, '3');
  // O estado original não muda.
  assert.equal(e.lancamentos.length, 3);
  // Reenvio seguro: o mesmo lançamento gera a mesma linha.
  const l = r.estado.lancamentos.find((x) => x.id === 'e');
  assert.equal(D.montarEventos([l])[0], D.montarEventos([l])[0]);
  assert.equal(D.montarEventos([l])[0], 'E;84.859.909/0001-90;2505;3;1;318;5,00;0,00;;;;;0;');
  // Repetir SEQ no mesmo arquivo é avisado.
  const dup = D.validar([M.E, M.E].join('\n'));
  assert.match(dup.avisos[0].texto, /chave primária/);
});

t('lançamento é conferido antes de ganhar SEQ', () => {
  const base = { cnpj: L.CNPJ_HOMOLOGACAO, periodo: '2505', contrato: '1', evento: '318', referencia: '5,00', valor: '' };
  assert.equal(D.problemaDoLancamento(base), '');
  assert.match(D.problemaDoLancamento({ ...base, periodo: '' }), /CODIGOPERCALCULO/);
  assert.match(D.problemaDoLancamento({ ...base, valor: '-1,00' }), /negativo/);
  assert.match(D.problemaDoLancamento({ ...base, referencia: '', valor: '' }), /referência ou o valor/);
  assert.match(D.problemaDoLancamento({ ...base, referencia: '5.00' }), /vírgula/);
});

t('de-para: conferência, busca e importação de CSV', () => {
  const lista = [{ id: '1', de: 'Padeiro', para: '10786', descricao: 'PADEIRO', cnpj: L.CNPJ_HOMOLOGACAO }];
  assert.match(D.problemaDoDepara('cargo', { de: 'padeiro', para: '1', cnpj: '84859909000190' }, lista), /Já existe/);
  assert.equal(D.problemaDoDepara('cargo', { de: 'padeiro', para: '1', cnpj: '84859909000190' }, lista, '1'), '');
  assert.match(D.problemaDoDepara('cargo', { de: 'Caixa', para: '12A', cnpj: L.CNPJ_HOMOLOGACAO }, lista), /só números/);
  assert.match(D.problemaDoDepara('cargo', { de: 'Caixa', para: '12' }, lista), /CNPJ/);
  assert.equal(D.problemaDoDepara('banco', { de: '001', para: '1' }, []), '');
  assert.match(D.problemaDoDepara('municipio', { de: '313670', para: '420' }, []), /7 números/);
  assert.equal(D.codigoQuestor(lista, 'PADEIRO', L.CNPJ_HOMOLOGACAO), '10786');
  assert.equal(D.codigoQuestor(lista, 'Caixa', L.CNPJ_HOMOLOGACAO), '');
  const csv = [['CODIGORAIS', 'CODIGOMUNIC', 'NOMEMUNIC'], ['3136702', '420', 'JUIZ DE FORA'], ['3136702', '421', 'REPETIDO'], ['123', '9', 'CURTO']];
  const r = D.deparaDoCsv('municipio', csv);
  assert.deepEqual(r.itens, [{ de: '3136702', para: '420', descricao: 'JUIZ DE FORA', cnpj: '' }]);
  assert.equal(r.erros.length, 2); assert.match(r.erros[0], /^Linha 3: Já existe/);
  // Consulta do Questor sem coluna DE: a descrição vira o valor do S2, com o CNPJ padrão.
  const cargos = D.deparaDoCsv('cargo', [['CNPJ', 'CODIGOCARGO', 'DESCRCARGO'], [L.CNPJ_HOMOLOGACAO, '10786', 'AUXILIAR TESTE']], L.CNPJ_HOMOLOGACAO);
  assert.deepEqual(cargos.itens, [{ de: 'AUXILIAR TESTE', para: '10786', descricao: 'AUXILIAR TESTE', cnpj: L.CNPJ_HOMOLOGACAO }]);
  assert.match(D.deparaDoCsv('evento', [['X', 'Y']]).erros[0], /cabeçalho/);
});

t('vínculo CPF ↔ contrato', () => {
  const v = { id: '1', cnpj: L.CNPJ_HOMOLOGACAO, contrato: '9', cpf: '900.100.237-47' };
  assert.equal(D.problemaDoVinculo(v, []), '');
  assert.match(D.problemaDoVinculo({ ...v, cpf: '90010023747' }, []), /pontuação/);
  assert.match(D.problemaDoVinculo({ ...v, contrato: 'A9' }, []), /só números/);
  assert.match(D.problemaDoVinculo({ ...v, id: '2', cpf: '529.982.247-25' }, [v]), /já está ligado/);
  // Readmissão: o mesmo CPF com outro contrato pode.
  assert.equal(D.problemaDoVinculo({ ...v, id: '2', contrato: '10' }, [v]), '');
  assert.equal(D.cpfDoContrato([v], '9', L.CNPJ_HOMOLOGACAO), '900.100.237-47');
  assert.equal(D.cpfDoContrato([v], 9), '900.100.237-47');
  assert.equal(D.cpfDoContrato([v], '10'), '');
  // O mesmo número em duas empresas, sem dizer a empresa: não adivinha.
  assert.equal(D.cpfDoContrato([v, { ...v, id: '3', cnpj: '11.222.333/0001-81', cpf: '529.982.247-25' }], '9'), '');
});

console.log('conplus-dominio: ' + n + ' grupos de teste ok');
