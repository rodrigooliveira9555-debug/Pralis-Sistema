// Posição dos nós do mapa mental da Agenda (estruturas do tipo XMind). Rodar: node tests/agenda-mapa-layout.cjs
const assert = require('node:assert/strict');
const L = require('../dist/agenda/mapa-layout.js');
let checks = 0;
const ok = (fn) => { fn(); checks++; };

// Árvore de teste: raiz → 4 grupos → 0..5 compromissos → 0..3 subtarefas (tamanhos variados)
let n = 0;
const no = (w, h, filhos = []) => ({ id: 'n' + n++, w, h, filhos });
const raiz = no(160, 48, [0, 1, 2, 3].map((g) => no(140, 36, Array.from({ length: g + 2 }, (_, t) => no(120 + t * 10, 34 + (t % 2) * 18, Array.from({ length: t % 3 }, () => no(100, 26)))))));
const ids = [];
const andar = (x) => { ids.push(x.id); x.filhos.forEach(andar); };
andar(raiz);

const sobrepoe = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
for (const [estrutura] of L.ESTRUTURAS) {
  const r = L.calcular(raiz, estrutura);
  ok(() => assert.equal(r.nos.length, ids.length, estrutura + ': todos os nós posicionados'));
  ok(() => {
    for (let i = 0; i < r.nos.length; i++) for (let j = i + 1; j < r.nos.length; j++) assert.ok(!sobrepoe(r.nos[i], r.nos[j]), estrutura + ': ' + r.nos[i].id + ' encosta em ' + r.nos[j].id);
  });
  ok(() => assert.equal(r.ligacoes.length, ids.length - 1, estrutura + ': uma ligação por filho'));
  ok(() => assert.ok(r.caixa.w > 0 && r.caixa.h > 0));
}

// Direção dos ramos
const logico = L.calcular(raiz, 'logico');
ok(() => assert.ok(raiz.filhos.every((g) => logico.por.get(g.id).x > logico.por.get(raiz.id).x + raiz.w), 'lógico: filhos à direita'));
const org = L.calcular(raiz, 'organograma');
ok(() => assert.ok(raiz.filhos.every((g) => org.por.get(g.id).y > org.por.get(raiz.id).y + raiz.h), 'organograma: filhos embaixo'));
const mapa = L.calcular(raiz, 'mapa');
const lados = raiz.filhos.map((g) => mapa.por.get(g.id).lado);
ok(() => assert.ok(lados.includes(1) && lados.includes(-1), 'mapa: ramos dos dois lados'));
ok(() => assert.ok(raiz.filhos.filter((g) => mapa.por.get(g.id).lado === -1).every((g) => mapa.por.get(g.id).x + g.w < mapa.por.get(raiz.id).x), 'mapa: ramos da esquerda à esquerda da raiz'));
const linha = L.calcular(raiz, 'linha');
const xs = raiz.filhos.map((g) => linha.por.get(g.id).x);
ok(() => assert.deepEqual(xs, [...xs].sort((a, b) => a - b), 'linha do tempo: grupos em ordem da esquerda para a direita'));
ok(() => assert.equal(linha.ligacoes.filter((l) => l.eixo).length, raiz.filhos.length, 'linha do tempo: eixo liga os grupos'));

// Recolher
const recolhido = L.calcular(raiz, 'logico', { recolhidos: new Set([raiz.filhos[3].id]) });
ok(() => assert.equal(recolhido.nos.length, ids.length - (1 + 5 + [0, 1, 2, 0, 1].reduce((t, x) => t + x, 0)) + 1, 'recolher esconde os descendentes'));

// Quebra de texto
const medir = (t) => t.length * 7;
ok(() => assert.deepEqual(L.quebrar('Conferir câmara fria da produção', 100, medir), ['Conferir', 'câmara fria da', 'produção']));
ok(() => assert.deepEqual(L.quebrar('uma duas três quatro cinco seis sete oito', 70, medir, 2), ['uma duas', 'três…']));
ok(() => assert.deepEqual(L.quebrar('Supercalifragilisticexpialidocious', 70, medir), ['Supercali…']));

console.log(checks + ' verificações da posição do mapa mental passaram');
