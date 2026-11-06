// Regras puras da Produção (dist/producao/dominio.js). Rodar: node tests/producao-dominio.cjs
const assert = require('node:assert/strict');
const D = require('../dist/producao/dominio.js');

let n = 0;
const t = (nome, fn) => { fn(); n++; };

/* Formato: exemplo da planilha, ASSAD 58X68 (6 TIRAS), 6 × 6 = 36, meia 18 */
const assadeira = { utensilioId: 'b1', colunas: 6, linhas: 6, aceitaMeia: true };
t('fornada, meia e passo do pão de sal', () => {
  assert.equal(D.fornada(assadeira), 36);
  assert.equal(D.meia(assadeira), 18);
  assert.equal(D.passo(assadeira), 18);
  assert.equal(D.passo({ ...assadeira, aceitaMeia: false }), 36);
});
t('meia só com largura par', () => {
  assert.equal(D.meia({ utensilioId: 'b', colunas: 5, linhas: 8, aceitaMeia: true }), 0);
  assert.match(D.validarFormato({ utensilioId: 'b', colunas: 5, linhas: 8, aceitaMeia: true }), /par/);
  assert.equal(D.validarFormato({ utensilioId: 'b', colunas: 8, linhas: 5, aceitaMeia: true }), '');
  assert.equal(D.meia({ utensilioId: 'b', colunas: 8, linhas: 5, aceitaMeia: true }), 20); // inteira 8×5, meia 4×5
});
t('formato exige utensílio e inteiros', () => {
  assert.match(D.validarFormato({ colunas: 6, linhas: 6 }), /utensílio/);
  assert.match(D.validarFormato({ utensilioId: 'b', colunas: 1.5, linhas: 6 }), /inteiro/);
  assert.match(D.validarFormato({ utensilioId: 'b', colunas: 6, linhas: 0 }), /altura/);
});
t('múltiplos e quantidade pedida', () => {
  assert.ok(D.ehMultiplo(54, 18));
  assert.ok(!D.ehMultiplo(40, 18));
  assert.deepEqual(D.multiplos(18, 72), [18, 36, 54, 72]);
  assert.equal(D.utensilios(54, assadeira), 1.5);
  assert.equal(D.validarQuantidade(108, assadeira), '');
  assert.match(D.validarQuantidade(40, assadeira), /múltiplos de 18/);
  assert.match(D.validarQuantidade(0, assadeira), /maior que zero/);
  assert.equal(D.validarQuantidade(7, null), '', 'sem formato, qualquer quantidade');
  assert.equal(D.resumoFormato(assadeira, 'Assadeira 58×68'), 'Assadeira 58×68 · 6 × 6 = 36 un · meia 18 un');
});
t('rosca: meia cabe 2 → pedido mínimo 2', () => {
  const rosca = { utensilioId: 'b', colunas: 4, linhas: 1, aceitaMeia: true };
  assert.equal(D.passo(rosca), 2);
  assert.match(D.validarQuantidade(3, rosca), /múltiplos de 2/);
});
t('configuração do produto: mínimo ≤ máximo e múltiplos', () => {
  assert.match(D.validarConfigProduto({ estoqueMin: 108, estoqueMax: 36 }, assadeira), /mínimo não pode ser maior/);
  assert.match(D.validarConfigProduto({ estoqueMin: 20 }, assadeira), /múltiplo de 18/);
  assert.equal(D.validarConfigProduto({ estoqueMin: 36, estoqueMax: 108, producaoMax: 216 }, assadeira), '');
});

/* Ficha */
const masseira = { id: 'm40', capacidade: { valor: 40, unidade: 'KG' } };
const ficha = {
  produtoId: 'p-pao', nome: 'Do zero', quantidadeBase: 36,
  etapas: [
    { processo: 'pre-pesar', parte: 'massa', ingredientes: [{ produtoId: 'farinha', quantidade: 5, unidade: 'KG' }, { produtoId: 'sal', quantidade: 100, unidade: 'G' }, { produtoId: 'ovos', quantidade: 40, unidade: 'UN' }],
      recursos: [{ patrimonioId: 'bal', tempoMin: 15, acompanhamento: 1, nivel: 'ajudante' }] },
    { processo: 'misturar', parte: 'massa', ingredientes: [{ produtoId: 'farinha', quantidade: 5, unidade: 'KG' }, { produtoId: 'agua', quantidade: 3, unidade: 'KG' }],
      recursos: [{ patrimonioId: 'm40', tempoMin: 5, acompanhamento: 0 }, { patrimonioId: 'm40', tempoMin: 10, acompanhamento: 0 }] },
  ],
};
const bens = (id) => (id === 'm40' ? masseira : null);
t('tempo efetivo = tempo × acompanhamento', () => {
  assert.equal(D.tempoEfetivo(60, 0.5), 30);
  assert.equal(D.tempoEfetivo(15, 1), 15);
});
t('ingredientes escalam pela quantidade-base', () => {
  const e = D.ingredientesPara(ficha.etapas[0], ficha, 72);
  assert.deepEqual(e.map((x) => x.quantidade), [10, 200, 80]);
});
t('capacidade: 40,7 kg na masseira de 40 kg vira 2 processos e o tempo dobra', () => {
  assert.equal(D.lotes(masseira.capacidade, { kg: 40 }), 1);
  assert.equal(D.lotes(masseira.capacidade, { kg: 40.7 }), 2);
  assert.equal(D.lotes({ valor: 500, unidade: 'G' }, { kg: 1.2 }), 3);
  assert.equal(D.lotes({ valor: 10, unidade: 'UN' }, { quantidade: 25 }), 3);
  assert.equal(D.lotes(null, { kg: 99 }), 1);
  const pequeno = D.planoDaFicha(ficha, 36, bens); // 8 kg na mistura
  assert.equal(pequeno.etapas[1].lotes, 1);
  assert.equal(pequeno.etapas[1].tempo, 15);
  const grande = D.planoDaFicha(ficha, 36 * 5.1, bens); // 40,8 kg
  assert.equal(grande.etapas[1].lotes, 2);
  assert.equal(grande.etapas[1].tempo, 30);
});
t('plano soma tempos e tempo de equipe', () => {
  const p = D.planoDaFicha(ficha, 36, bens);
  assert.equal(p.tempo, 30);
  assert.equal(p.tempoEquipe, 15, 'a masseira trabalha sozinha (sem acompanhamento)');
  assert.equal(p.etapas[0].kg, 5.1, 'ovos em UN não pesam');
});
t('faixas: etapa e recurso só valem dentro do de/até', () => {
  const f = { ...ficha, etapas: [{ processo: 'assar', faixaDe: 18, faixaAte: 108, recursos: [{ tempoMin: 20, acompanhamento: 0.2, faixaDe: 18, faixaAte: 54 }, { tempoMin: 35, acompanhamento: 0.2, faixaDe: 72, faixaAte: 108 }] }, { processo: 'assar', faixaDe: 126, recursos: [{ tempoMin: 50, acompanhamento: 0.2 }] }] };
  assert.equal(D.planoDaFicha(f, 36).tempo, 20);
  assert.equal(D.planoDaFicha(f, 90).tempo, 35);
  assert.equal(D.planoDaFicha(f, 144).tempo, 50);
});
t('perda da receita', () => {
  assert.deepEqual(D.perda(10, 9), { kg: -1, pct: -0.1 });
  assert.equal(D.perda(0, 1), null);
});
t('validação da ficha', () => {
  assert.equal(D.validarFicha(ficha), '');
  assert.match(D.validarFicha({ ...ficha, nome: ' ' }), /nome/);
  assert.match(D.validarFicha({ ...ficha, quantidadeBase: 0 }), /quantidade-base/);
  assert.match(D.validarFicha({ ...ficha, etapas: [] }), /ao menos uma etapa/);
  assert.match(D.validarFicha({ ...ficha, etapas: [{ processo: '' }] }), /processo/);
  assert.match(D.validarFicha({ ...ficha, etapas: [{ processo: 'assar', ingredientes: [{ produtoId: 'x', quantidade: 0 }] }] }), /maior que zero/);
  assert.match(D.validarFicha({ ...ficha, etapas: [{ processo: 'assar', recursos: [{ tempoMin: 5, acompanhamento: 1.5 }] }] }), /100%/);
  assert.match(D.validarFicha({ ...ficha, etapas: [{ processo: 'assar', faixaDe: 50, faixaAte: 10 }] }), /faixa/);
});

/* Estoque */
t('conversão da ficha para a unidade do estoque', () => {
  const farinha = { unidade: 'SC', quantidadeIndividual: 25, unidadeIndividual: 'KG' };
  assert.equal(D.converter(60, 'KG', farinha), 2.4);
  assert.equal(D.converter(500, 'G', farinha), 0.02);
  const fermento = { unidade: 'UN', quantidadeIndividual: 500, unidadeIndividual: 'G' };
  assert.equal(D.converter(300, 'G', fermento), 0.6);
  assert.equal(D.converter(0.3, 'KG', fermento), 0.6);
  assert.equal(D.converter(250, 'G', { unidade: 'KG' }), 0.25);
  assert.equal(D.converter(2, 'UN', { unidade: 'UN' }), 2);
  assert.equal(D.converter(1, 'KG', { unidade: 'UN', quantidadeIndividual: 0, transformacao: { quantidade: 5000, unidade: 'G' } }), 0.2, 'pela transformação do receituário');
  assert.equal(D.converter(40, 'UN', { unidade: 'DZ' }), null, 'sem caminho de conversão');
});
t('com estoque: sai do livre, o que falta é produzido no passo', () => {
  assert.deepEqual(D.aProduzir(72, 100, assadeira), { doEstoque: 72, produzir: 0 });
  assert.deepEqual(D.aProduzir(72, 40, assadeira), { doEstoque: 40, produzir: 36 }, 'faltam 32 → 36 (múltiplo de 18)');
  assert.deepEqual(D.aProduzir(72, 0, assadeira), { doEstoque: 0, produzir: 72 });
  assert.deepEqual(D.aProduzir(10, -5, null), { doEstoque: 0, produzir: 10 });
});
t('sugestão de reposição', () => {
  const c = { estoqueMin: 36, estoqueMax: 108, formato: assadeira };
  assert.equal(D.sugestaoReposicao(40, c), 0, 'acima do mínimo');
  assert.equal(D.sugestaoReposicao(20, c), 90, 'completa até o máximo, no passo (88 → 90)');
  assert.equal(D.sugestaoReposicao(20, { ...c, producaoMax: 54 }), 54, 'limitada à produção máxima');
  assert.equal(D.sugestaoReposicao(10, { estoqueMin: 36, formato: assadeira }), 36, 'sem máximo, completa até o mínimo');
  assert.equal(D.sugestaoReposicao(0, { estoqueMax: 100 }), 0, 'sem mínimo não sugere');
});

/* Mapa */
t('agrupa por horário, processo, setor e produto', () => {
  const ts = [
    { ordemId: 'o1', produto: 'Pão de sal', quantidadeTexto: '36 un', processo: 'assar', setor: 'Forno', janela: '06:00–08:00' },
    { ordemId: 'o1', produto: 'Pão de sal', quantidadeTexto: '36 un', processo: 'pre-pesar', setor: 'Pré-pesagem', janela: '06:00–08:00' },
    { ordemId: 'o2', produto: 'Rosca', quantidadeTexto: '4 un', processo: 'assar', setor: 'Forno', janela: '09:00–12:00' },
  ];
  assert.deepEqual(D.agrupar(ts, 'horario').map((g) => [g.titulo, g.tarefas.length]), [['06:00–08:00', 2], ['09:00–12:00', 1]]);
  assert.deepEqual(D.agrupar(ts, 'processo').map((g) => g.titulo), ['Pré-pesar / separar / adiantar', 'Assar / fritar / cozinhar / refogar']);
  assert.deepEqual(D.agrupar(ts, 'setor').map((g) => g.titulo), ['Forno', 'Pré-pesagem']);
  assert.equal(D.agrupar(ts, 'produto').length, 2);
  const tt = [{ janelaDe: '13:00', cargo: 'Padeiro · Ajudante' }, { janelaDe: '06:00', cargo: '' }, { janelaDe: '11:30', cargo: 'Padeiro · Ajudante' }];
  assert.deepEqual(D.agrupar(tt, 'turno').map((g) => [g.titulo, g.tarefas.length]), [['Manhã', 2], ['Tarde', 1]]);
  assert.deepEqual(D.agrupar(tt, 'cargo').map((g) => [g.titulo, g.tarefas.length]), [['Padeiro · Ajudante', 2], ['Sem cargo definido', 1]]);
});
t('situação da ordem', () => {
  assert.equal(D.situacaoOrdem({ etapas: [{}, {}] }), 'aguardando');
  assert.equal(D.situacaoOrdem({ etapas: [{ inicio: 'x' }, {}] }), 'em_producao');
  assert.equal(D.situacaoOrdem({ etapas: [{ inicio: 'x', fim: 'y' }, { fim: 'z' }] }), 'pronta');
  assert.equal(D.situacaoOrdem({ status: 'cancelada', etapas: [] }), 'cancelada');
});
t('fechamento: sobra + descarte ≤ real', () => {
  assert.equal(D.validarFechamento([{ nome: 'Pão', real: 36, sobra: 4, descarte: 2 }]), '');
  assert.match(D.validarFechamento([{ nome: 'Pão', real: 36, sobra: 30, descarte: 10 }]), /Pão/);
  assert.match(D.validarFechamento([{ nome: 'Pão', real: -1 }]), /negativos/);
});
t('custos C1–C5', () => {
  // Minuto do padeiro: R$ 2.640 × 1,5 ÷ (220 h × 60) = R$ 0,30
  assert.equal(D.centavos(D.custoMinuto(2640, { horasMes: 220, encargosPct: 50 })), 0.3);
  assert.equal(D.custoMinuto(2640, { horasMes: 0 }), null);
  const forno = { energia: 'gas', consumoHora: 2 };
  const plano = { etapas: [
    { ingredientes: [{ produtoId: 'f', quantidade: 60, unidade: 'KG' }], recursos: [{ tempoEquipe: 15, tempo: 15 }] },
    { ingredientes: [], recursos: [{ tempoEquipe: 0, tempo: 40, bem: { energia: 'eletrica', consumoHora: 3 } }, { tempoEquipe: 5, tempo: 30, bem: forno }] },
  ] };
  const f = { custoIngrediente: () => 240, custoMinuto: () => 0.3, precoEnergia: (t) => (t === 'gas' ? 8 : 0.9) };
  // C1 240 · C2 (15 + 5) × 0,30 = 6 · C3 40/60 × 3 × 0,90 = 1,80 + 30/60 × 2 × 8 = 8 → 9,80 · C4 255,80
  assert.deepEqual(D.custoDoPlano(plano, f), { ingredientes: 240, maoDeObra: 6, energia: 9.8, total: 255.8, faltas: [] });
  const parcial = D.custoDoPlano(plano, { ...f, custoMinuto: () => null, precoEnergia: (t) => (t === 'gas' ? null : 0.9) });
  assert.equal(parcial.total, 241.8);
  assert.deepEqual(parcial.faltas.sort(), ['preço do gás', 'salário do cargo ou horas por mês']);
  // C5: 7,27 × 1,45 + 0,01 = 10,55 (exemplo da planilha); sem pontual usa a do grupo
  assert.equal(D.valorSugerido(7.27, 0.45, 0.7), 10.55);
  assert.equal(D.valorSugerido(7.27, null, 0.7), 12.37);
  assert.equal(D.valorSugerido(7.27, null, null), null);
  assert.equal(D.valorSugerido(0, 0.45), null);
});
t('relatório por produto no período', () => {
  const pedidos = [
    { status: 'abastecido', dataEntrega: '2026-11-05', itens: [{ produtoId: 'pao', quantidade: 72, real: 72, sobra: 4, descarte: 2 }] },
    { status: 'conferencia_loja', dataEntrega: '2026-11-06', itens: [{ produtoId: 'pao', quantidade: 36, real: 36, recebido: 34 }] },
    { status: 'cancelado', dataEntrega: '2026-11-05', itens: [{ produtoId: 'pao', quantidade: 999 }] },
    { status: 'rascunho', dataEntrega: '2026-11-05', itens: [{ produtoId: 'pao', quantidade: 500 }] },
    { status: 'abastecido', dataEntrega: '2026-10-01', itens: [{ produtoId: 'pao', quantidade: 18, real: 18 }] },
  ];
  const ordens = [{ produtoId: 'pao', quantidade: 72, dataEntrega: '2026-11-05', etapas: [{ fim: 'x' }] }, { produtoId: 'pao', quantidade: 36, dataEntrega: '2026-11-06', etapas: [{}] }];
  const [l] = D.relatorio(pedidos, ordens, '2026-11-01', '2026-11-30');
  assert.deepEqual(l, { produtoId: 'pao', pedido: 108, produzido: 72, real: 106, sobra: 4, descarte: 2, desperdicio: 0.0189 });
});
t('textos de tempo', () => {
  assert.equal(D.minutos(45), '45 min');
  assert.equal(D.minutos(60), '1 h');
  assert.equal(D.minutos(95), '1 h 35 min');
  assert.equal(D.pct(0.5), '50%');
});

console.log('producao-dominio: ' + n + ' grupos de verificação ok');
