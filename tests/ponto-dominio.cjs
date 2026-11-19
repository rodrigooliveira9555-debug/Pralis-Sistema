// DES - Ponto Eletrônico: regras puras (dist/ponto-dominio.js). Dados fictícios; nenhum CPF real.
const assert = require('node:assert/strict');
const P = require('../dist/ponto-dominio.js');
let n = 0; const ok = (f) => { f(); n++; };

ok(() => { // horas: formatos aceitos, vazio e inválido
  assert.equal(P.hora('8:05'), '08:05'); assert.equal(P.hora('08:05'), '08:05'); assert.equal(P.hora('08h05'), '08:05');
  assert.equal(P.hora('0805'), '08:05'); assert.equal(P.hora('08:05:30'), '08:05'); assert.equal(P.hora('  '), ''); assert.equal(P.hora(null), '');
  for (const x of ['24:00', '08:60', 'abc', '8', '123']) assert.equal(P.hora(x), null, x);
  assert.equal(P.minutos('01:30'), 90); assert.equal(P.minutos(''), null);
});
ok(() => { // datas
  assert.equal(P.data('01/11/2026'), '2026-11-01'); assert.equal(P.data('1/2/26'), '2026-02-01'); assert.equal(P.data('2026-11-30'), '2026-11-30');
  for (const x of ['31/02/2026', '2026-13-01', '', 'ontem', '32/01/2026']) assert.equal(P.data(x), null, x);
  assert.equal(P.dataBR('2026-11-05'), '05/11/2026'); assert.equal(P.diaDaSemana('2026-11-19'), 'Qui');
  assert.equal(P.diasDoMes(2026, 1).length, 28); assert.equal(P.diasDoMes(2028, 1).length, 29); assert.equal(P.diasDoMes(2026, 10)[29], '2026-11-30');
});
ok(() => { // diferença em minutos: sinal, virada de meia-noite e ausência
  assert.equal(P.diferenca('08:00', '08:05'), 5); assert.equal(P.diferenca('08:00', '07:55'), -5); assert.equal(P.diferenca('08:00', '08:00'), 0);
  assert.equal(P.diferenca('23:50', '00:10'), 20, 'batida depois da meia-noite não vira +23h40');
  assert.equal(P.diferenca('00:10', '23:50'), -20);
  assert.equal(P.diferenca('', '08:00'), null); assert.equal(P.diferenca('08:00', ''), null);
  assert.equal(P.textoDiferenca(0), '0 min'); assert.equal(P.textoDiferenca(5), '+5 min'); assert.equal(P.textoDiferenca(-65), '−1h05'); assert.equal(P.textoDiferenca(null), '');
});

const CPF_A = '11144477735', CPF_B = '52998224725';
const pessoas = new Map([[CPF_A, 'pA'], [CPF_B, 'pB']]);
ok(() => { // arquivo CSV: separadores, aspas, BOM e cabeçalho com apelidos
  const csv = '﻿CPF;Data;Entrada;Saída intervalo;Retorno intervalo;Saída\r\n111.444.777-35;03/11/2026;08:01;12:00;13:02;17:00\r\n529.982.247-25;03/11/2026;07:58;;;16:00\r\n';
  const r = P.processar(csv, pessoas);
  assert.equal(r.erro, ''); assert.equal(r.total, 2); assert.equal(r.problemas.length, 0);
  assert.deepEqual(r.validas[0], { pessoaId: 'pA', dia: '2026-11-03', entrada: '08:01', saidaIntervalo: '12:00', retornoIntervalo: '13:02', saida: '17:00' });
  assert.equal(r.validas[1].saidaIntervalo, ''); assert.equal(r.validas[1].saida, '16:00');
  const v = P.processar('cpf,dia,entrada 1,saida 1,entrada 2,saida 2\n11144477735,2026-11-04,8:00,12:00,13:00,17:00', pessoas);
  assert.equal(v.erro, ''); assert.equal(v.validas.length, 1, 'vírgula e apelidos Batida/Entrada 1…');
  const asp = P.processar('"CPF";"Data";"Entrada";"Saída"\n"111.444.777-35";"05/11/2026";"08:00";"17:00"', pessoas);
  assert.equal(asp.validas.length, 1);
});
ok(() => { // problemas por linha não derrubam as boas
  const csv = 'CPF;Data;Entrada;Saída\n111.444.777-35;06/11/2026;08:00;17:00\n123;06/11/2026;08:00;17:00\n11144477735;31/02/2026;08:00;17:00\n99999999999;06/11/2026;08:00;17:00\n11144477735;07/11/2026;25:00;17:00\n11144477735;08/11/2026;;\n';
  const r = P.processar(csv, pessoas);
  assert.equal(r.validas.length, 1); assert.equal(r.total, 6);
  assert.deepEqual(r.problemas.map((p) => p.linha), [3, 4, 5, 6, 7]);
  assert.match(r.problemas[0].motivo, /CPF inválido/); assert.match(r.problemas[1].motivo, /Data inválida/); assert.match(r.problemas[2].motivo, /não encontrado/);
  assert.match(r.problemas[3].motivo, /Entrada: hora inválida/); assert.match(r.problemas[4].motivo, /sem nenhuma batida/);
});
ok(() => { // cabeçalho incompleto e arquivo vazio dão erro claro
  assert.match(P.processar('Nome;Entrada\nAna;08:00', pessoas).erro, /CPF, Data/);
  assert.match(P.processar('CPF;Data\n11144477735;01/11/2026', pessoas).erro, /ao menos uma batida/);
  assert.match(P.processar('', pessoas).erro, /vazio/);
  assert.equal(P.processar(P.MODELO_CSV, pessoas).problemas[0].motivo, 'CPF não encontrado no cadastro de colaboradores.', 'o modelo baixado é lido (CPF de exemplo não existe)');
});
ok(() => { // repetida no arquivo: vale a última
  const r = P.processar('CPF;Data;Entrada;Saída\n11144477735;09/11/2026;08:00;17:00\n11144477735;09/11/2026;08:10;17:10', pessoas);
  assert.equal(r.validas.length, 1); assert.equal(r.validas[0].entrada, '08:10'); assert.equal(r.problemas.length, 1);
});
ok(() => { // aplicar: novos × substituídos, sem alterar o original e guardando só o ID
  const a = P.processar('CPF;Data;Entrada;Saída\n11144477735;10/11/2026;08:00;17:00\n52998224725;10/11/2026;09:00;18:00', pessoas);
  const r1 = P.aplicar(P.vazio(), a.validas, { arquivo: 'ponto-nov.csv', quando: '2026-11-19T10:00:00Z' });
  assert.equal(r1.novos, 2); assert.equal(r1.substituidos, 0);
  assert.equal(r1.dados.realizado['2026-11-10'].pA.entrada, '08:00');
  const b = P.processar('CPF;Data;Entrada;Saída\n11144477735;10/11/2026;08:15;17:05', pessoas);
  const original = JSON.stringify(r1.dados);
  const r2 = P.aplicar(r1.dados, b.validas, { arquivo: 'ponto-nov-2.csv' });
  assert.equal(r2.novos, 0); assert.equal(r2.substituidos, 1); assert.equal(r2.dados.realizado['2026-11-10'].pA.entrada, '08:15');
  assert.equal(r2.dados.realizado['2026-11-10'].pB.entrada, '09:00', 'o outro colaborador do mesmo dia continua');
  assert.equal(JSON.stringify(r1.dados), original, 'não altera o objeto recebido');
  assert.equal(r2.dados.importacoes.length, 2); assert.equal(r2.dados.importacoes[0].arquivo, 'ponto-nov-2.csv'); assert.equal(r2.dados.importacoes[1].de, '2026-11-10');
  assert.ok(!JSON.stringify(r2.dados).includes(CPF_A), 'o CPF do arquivo não é guardado');
});
// jornada de mentira com a mesma forma do CicluzJornada (dayInfo/shiftFor)
const jornada = {
  dayInfo: (pid, dia) => (pid === 'semEscala' ? { work: null } : /-(15|22)$/.test(dia) ? { work: false } : { work: true, slot: 'main' }),
  shiftFor: () => ({ shift: { start: '08:00', end: '17:00' }, breakStart: '12:00', breakEnd: '13:00' }),
};
ok(() => { // idealizado vem da jornada do Cicluz: trabalho, folga e sem escala
  assert.deepEqual(P.idealizado(jornada, 'pA', '2026-11-10'), { situacao: 'trabalho', batidas: { entrada: '08:00', saidaIntervalo: '12:00', retornoIntervalo: '13:00', saida: '17:00' } });
  assert.equal(P.idealizado(jornada, 'pA', '2026-11-15').situacao, 'folga'); assert.equal(P.idealizado(jornada, 'pA', '2026-11-15').batidas.entrada, '');
  assert.equal(P.idealizado(jornada, 'semEscala', '2026-11-10').situacao, 'semEscala'); assert.equal(P.idealizado(null, 'pA', '2026-11-10').situacao, 'semEscala');
});
ok(() => { // comparar: diferença só quando existem idealizado e realizado
  const dados = P.aplicar(P.vazio(), [{ pessoaId: 'pA', dia: '2026-11-10', entrada: '08:07', saidaIntervalo: '12:00', retornoIntervalo: '', saida: '16:50' }]).dados;
  const c = P.comparar(jornada, dados, 'pA', '2026-11-10');
  assert.equal(c.situacao, 'trabalho'); assert.equal(c.temRealizado, true);
  assert.deepEqual([c.batidas.entrada.dif, c.batidas.saidaIntervalo.dif, c.batidas.retornoIntervalo.dif, c.batidas.saida.dif], [7, 0, null, -10]);
  assert.equal(c.batidas.retornoIntervalo.real, '', 'batida ausente no arquivo continua vazia, nunca zero');
  const sem = P.comparar(jornada, dados, 'pB', '2026-11-10');
  assert.equal(sem.temRealizado, false); assert.equal(sem.batidas.entrada.dif, null);
  const folga = P.comparar(jornada, dados, 'pA', '2026-11-15'); assert.equal(folga.situacao, 'folga'); assert.equal(folga.batidas.entrada.dif, null);
});
ok(() => { // resumo do mês: contagens simples
  const dados = P.aplicar(P.vazio(), [{ pessoaId: 'pA', dia: '2026-11-02', entrada: '08:00' }, { pessoaId: 'pA', dia: '2026-11-03', entrada: '08:00' }]).dados;
  const r = P.resumoMes(jornada, dados, 'pA', P.diasDoMes(2026, 10));
  assert.deepEqual(r, { dias: 30, trabalho: 28, folga: 2, semEscala: 0, comBatida: 2, semBatida: 26 });
});

/* ---------------- confronto: tolerância, painel, tratamento e fechamento ---------------- */
const DIAS = P.diasDoMes(2026, 10);
const pessoasT = [{ id: 'pA', name: 'Ana Teste' }, { id: 'pB', name: 'Beto Teste' }];
const base = () => P.aplicar(P.vazio(), [
  { pessoaId: 'pA', dia: '2026-11-02', entrada: '08:07', saidaIntervalo: '12:00', retornoIntervalo: '13:00', saida: '17:00' }, // +7 na entrada
  { pessoaId: 'pA', dia: '2026-11-03', entrada: '08:00', saidaIntervalo: '12:00', retornoIntervalo: '', saida: '17:00' },       // retorno ausente
  { pessoaId: 'pA', dia: '2026-11-04', entrada: '08:03', saidaIntervalo: '12:00', retornoIntervalo: '13:00', saida: '17:00' }, // +3 (dentro de 5 min)
  { pessoaId: 'pA', dia: '2026-11-08', entrada: '08:00', saidaIntervalo: '12:00', retornoIntervalo: '13:00', saida: '17:00' }, // domingo = folga
  { pessoaId: 'pA', dia: '2026-11-06', entrada: '08:00', saidaIntervalo: '12:00', retornoIntervalo: '13:00', saida: '17:00' },
]).dados;
const jornadaT = { dayInfo: (pid, dia) => (pid === 'pB' ? { work: null } : [0, 6].includes(new Date(dia + 'T12:00:00Z').getUTCDay()) ? { work: false } : { work: true, slot: 'main' }), shiftFor: jornada.shiftFor };

ok(() => { // dado antigo (sem config/tratamentos/competencias) continua valendo e ganha os padrões
  const velho = { version: 1, realizado: { '2026-11-02': { pA: { entrada: '08:00' } } }, importacoes: [] };
  const n = P.normalizar(velho);
  assert.equal(n.config.toleranciaMin, 0); assert.deepEqual(n.tratamentos, {}); assert.deepEqual(n.competencias, {}); assert.equal(n.realizado['2026-11-02'].pA.entrada, '08:00');
  assert.equal(P.normalizar(null).version, 1); assert.equal(P.normalizar({ config: { toleranciaMin: 999 } }).config.toleranciaMin, 120); assert.equal(P.normalizar({ config: { toleranciaMin: -3 } }).config.toleranciaMin, 0);
});
ok(() => { // cobertura: só o período em que houve importação
  const d = base(); const c = P.cobertura(d, DIAS);
  assert.deepEqual(c, { de: '2026-11-02', ate: '2026-11-08', dias: 5 }); assert.equal(P.cobertura(P.vazio(), DIAS), null);
});
ok(() => { // divergência por tolerância: 0 pega +3; 5 não pega; +7 passa nas duas
  const d = base(); const hoje = '2026-11-19';
  const dv0 = P.divergenciasDoMes(jornadaT, d, 'pA', DIAS, hoje);
  assert.deepEqual(dv0.map((x) => [x.dia, x.tipo]), [['2026-11-02', 'diferenca'], ['2026-11-03', 'ausente'], ['2026-11-04', 'diferenca'], ['2026-11-05', 'semBatida'], ['2026-11-08', 'foraDeEscala']]);
  assert.equal(dv0[0].maior, 7); assert.equal(dv0[0].itens[0].rotulo, 'Entrada');
  const d5 = P.definirTolerancia(d, 5).dados;
  assert.deepEqual(P.divergenciasDoMes(jornadaT, d5, 'pA', DIAS, hoje).map((x) => x.dia), ['2026-11-02', '2026-11-03', '2026-11-05', '2026-11-08'], '+3 min cai dentro da tolerância de 5');
});
ok(() => { // "sem batida" só dentro do período importado e até hoje; fora disso não é divergência
  const d = base();
  const dias = P.divergenciasDoMes(jornadaT, d, 'pA', DIAS, '2026-11-19').map((x) => x.dia);
  assert.ok(!dias.includes('2026-11-09'), 'depois do último dia importado não conta');
  assert.ok(!dias.includes('2026-11-01'), 'antes do primeiro dia importado não conta (e domingo é folga)');
  assert.ok(!P.divergenciasDoMes(jornadaT, d, 'pA', DIAS, '2026-11-03').some((x) => x.tipo === 'semBatida'), 'dia futuro não conta');
  assert.deepEqual(P.divergenciasDoMes(jornadaT, P.vazio(), 'pA', DIAS, '2026-11-19'), [], 'sem importação não há divergência');
});
ok(() => { // painel por colaborador
  const d = base(); const p = P.painel(jornadaT, d, pessoasT, DIAS, '2026-11-19');
  assert.equal(p.competencia, '2026-11'); assert.equal(p.tolerancia, 0); assert.equal(p.fechada, false);
  const a = p.linhas[0], b = p.linhas[1];
  assert.deepEqual([a.divergentes, a.pendentes, a.tratados, a.maior, a.semBatida, a.diasComBatida, a.situacao], [5, 5, 0, 7, 1, 5, 'pendente']);
  assert.equal(b.situacao, 'semDivergencia', 'Beto sem escala e sem batida: nada a confrontar'); assert.equal(b.diasComBatida, 0);
  assert.deepEqual(p.totais, { colaboradores: 2, divergentes: 5, pendentes: 5, tratados: 0 });
  assert.equal(P.painel(jornadaT, P.vazio(), pessoasT, DIAS, '2026-11-19').linhas[0].situacao, 'semImportacao');
  assert.equal(P.pendencias(jornadaT, d, pessoasT, DIAS, '2026-11-19').length, 5);
});
ok(() => { // tratar: conferido, justificado exige motivo, desfazer
  let d = base(); const k = P.chaveItem('pA', '2026-11-02');
  assert.match(P.tratar(d, '2026-11', k, 'justificado', '  ').erro, /motivo/); assert.match(P.tratar(d, '2026-11', k, 'qualquer', '').erro, /Conferido ou Justificado/);
  d = P.tratar(d, '2026-11', k, 'conferido', '', '2026-11-19T10:00:00Z').dados;
  d = P.tratar(d, '2026-11', P.chaveItem('pA', '2026-11-03'), 'justificado', 'Esqueceu de bater o retorno').dados;
  assert.equal(d.tratamentos['2026-11'][k].status, 'conferido'); assert.equal(d.tratamentos['2026-11'][P.chaveItem('pA', '2026-11-03')].motivo, 'Esqueceu de bater o retorno');
  const p = P.painel(jornadaT, d, pessoasT, DIAS, '2026-11-19'); assert.deepEqual([p.linhas[0].tratados, p.linhas[0].pendentes], [2, 3]);
  d = P.desfazer(d, '2026-11', k).dados; assert.equal(P.painel(jornadaT, d, pessoasT, DIAS, '2026-11-19').linhas[0].pendentes, 4);
});
ok(() => { // fechar só sem pendências; congela a tolerância; fechada bloqueia; reabrir
  let d = base(); const hoje = '2026-11-19';
  assert.match(P.fechar(d, '2026-11', P.painel(jornadaT, d, pessoasT, DIAS, hoje).totais).erro, /5 divergência/);
  for (const x of P.pendencias(jornadaT, d, pessoasT, DIAS, hoje)) d = P.tratar(d, '2026-11', x.chave, 'conferido').dados;
  d = P.definirTolerancia(d, 5).dados;
  const totais = P.painel(jornadaT, d, pessoasT, DIAS, hoje).totais; assert.equal(totais.pendentes, 0);
  const f = P.fechar(d, '2026-11', totais, '2026-11-30T18:00:00Z'); assert.equal(f.erro, ''); d = f.dados;
  assert.equal(P.fechada(d, '2026-11'), true); assert.equal(d.competencias['2026-11'].tolerancia, 5);
  assert.match(P.tratar(d, '2026-11', 'x|y', 'conferido').erro, /fechada/); assert.match(P.desfazer(d, '2026-11', 'x|y').erro, /fechada/); assert.match(P.fechar(d, '2026-11', totais).erro, /já está fechada/);
  assert.match(P.definirTolerancia(d, 9, false).erro, /fechada/);
  const livre = P.definirTolerancia(d, 20).dados; assert.equal(P.toleranciaDe(livre, '2026-11'), 5, 'mudar a tolerância de hoje não mexe na competência fechada');
  d = P.reabrir(d, '2026-11', '2026-12-01T09:00:00Z').dados; assert.equal(P.fechada(d, '2026-11'), false); assert.match(P.reabrir(d, '2026-11').erro, /não está fechada/);
  assert.match(P.definirTolerancia(d, 121).erro, /0 a 120/); assert.match(P.definirTolerancia(d, 'x').erro, /minutos/);
});

console.log('ponto-dominio: ' + n + ' grupos de verificação ok');
