// Digitalização (dist/scanner-nucleo.js): recorte, perspectiva, giro, filtros e PDF. Só regras puras; a câmera e a tela são testadas no navegador.
const assert = require('node:assert/strict');
const N = require('../dist/scanner-nucleo.js');
let n = 0; const ok = (f) => { f(); n++; };
const img = (w, h, f) => { const i = N.novaImagem(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b] = f(x, y); const o = (y * w + x) * 4; i.data[o] = r; i.data[o + 1] = g; i.data[o + 2] = b; i.data[o + 3] = 255; } return i; };
const px = (i, x, y) => Array.from(i.data.slice((y * i.width + x) * 4, (y * i.width + x) * 4 + 3));

ok(() => assert.deepEqual(N.resolver([[2, 1], [1, 3]], [5, 10]).map((v) => Math.round(v * 1e6) / 1e6), [1, 3]));
ok(() => assert.equal(N.resolver([[1, 2], [2, 4]], [1, 2]), null)); // singular
ok(() => { // quadrilátero válido: convexo, 4 pontos finitos
  const q = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
  assert.ok(N.quadValido(q));
  assert.ok(!N.quadValido([q[0], q[2], q[1], q[3]])); // cruzado
  assert.ok(!N.quadValido(q.slice(0, 3)));
  assert.ok(!N.quadValido([q[0], q[0], q[2], q[3]]));
});
ok(() => { // recorte retangular = cópia exata da área
  const a = img(40, 30, (x, y) => [x * 6, y * 8, 7]);
  const r = N.recortar(a, [{ x: 10, y: 5 }, { x: 30, y: 5 }, { x: 30, y: 25 }, { x: 10, y: 25 }]);
  assert.equal(r.width, 20); assert.equal(r.height, 20);
  assert.deepEqual(px(r, 0, 0), px(a, 10, 5)); assert.deepEqual(px(r, 19, 19), px(a, 29, 24)); assert.deepEqual(px(r, 7, 3), px(a, 17, 8));
});
ok(() => { // perspectiva: um trapézio que contém um quadrado vermelho vira um retângulo todo vermelho
  const a = img(100, 100, (x, y) => (x >= 20 && x < 80 && y >= 20 && y < 80 ? [255, 0, 0] : [0, 0, 255]));
  const r = N.recortar(a, [{ x: 20, y: 20 }, { x: 79, y: 20 }, { x: 79, y: 79 }, { x: 20, y: 79 }]);
  assert.ok(r.width >= 58 && r.height >= 58);
  assert.deepEqual(px(r, Math.floor(r.width / 2), Math.floor(r.height / 2)), [255, 0, 0]);
  const t = N.recortar(img(120, 100, (x, y) => [x * 2, y * 2, 0]), [{ x: 20, y: 10 }, { x: 100, y: 10 }, { x: 119, y: 90 }, { x: 0, y: 90 }]);
  assert.ok(t && t.width > 80 && t.height >= 80 && t.height <= 84);
});
ok(() => { // limite de tamanho da saída
  const r = N.recortar(img(300, 100, () => [1, 2, 3]), [{ x: 0, y: 0 }, { x: 299, y: 0 }, { x: 299, y: 99 }, { x: 0, y: 99 }], 150);
  assert.equal(r.width, 150); assert.ok(r.height <= 51);
});
ok(() => assert.equal(N.recortar(img(10, 10, () => [0, 0, 0]), [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]), null));
ok(() => { // giro: 4 giros voltam ao original; horário leva o canto superior esquerdo ao superior direito
  const a = img(5, 3, (x, y) => [x * 10, y * 20, 1]);
  const h = N.girar(a, 1); assert.equal(h.width, 3); assert.equal(h.height, 5);
  assert.deepEqual(px(h, 2, 0), px(a, 0, 0)); assert.deepEqual(px(h, 0, 0), px(a, 0, 2));
  let r = a; for (let i = 0; i < 4; i++) r = N.girar(r, 1); assert.deepEqual(Array.from(r.data), Array.from(a.data));
  assert.deepEqual(Array.from(N.girar(N.girar(a, 1), -1).data), Array.from(a.data));
});
ok(() => { // filtros
  const a = img(40, 40, (x) => [200 - x, 120, 60]);
  const c = N.filtro(a, 'cinza'); for (let i = 0; i < 40 * 40; i++) assert.ok(c.data[i * 4] === c.data[i * 4 + 1] && c.data[i * 4] === c.data[i * 4 + 2]);
  assert.deepEqual(Array.from(N.filtro(a, 'original').data), Array.from(a.data));
  assert.notEqual(N.filtro(a, 'original').data, a.data); // cópia, não a mesma memória
  const fraca = img(40, 40, (x) => [100 + x, 100 + x, 100 + x]); const cont = N.filtro(fraca, 'contraste');
  const faixa = (i) => { let lo = 255; let hi = 0; for (let k = 0; k < 1600; k++) { lo = Math.min(lo, i.data[k * 4]); hi = Math.max(hi, i.data[k * 4]); } return hi - lo; };
  assert.ok(faixa(cont) > faixa(fraca) * 2);
});
ok(() => { // preto e branco com sombra: o texto escuro continua preto e o papel (claro ou à sombra) fica branco
  const a = img(120, 80, (x, y) => { const fundo = 235 - x * 0.6; const traco = y >= 38 && y <= 42 && x >= 20 && x <= 100; return traco ? [fundo * 0.25, fundo * 0.25, fundo * 0.25] : [fundo, fundo, fundo]; });
  const b = N.filtro(a, 'pb');
  for (let i = 0; i < 120 * 80; i++) assert.ok(b.data[i * 4] === 0 || b.data[i * 4] === 255);
  assert.equal(px(b, 60, 40)[0], 0); assert.equal(px(b, 60, 10)[0], 255); assert.equal(px(b, 110, 70)[0], 255); assert.equal(px(b, 5, 70)[0], 255);
});
const fakeJpeg = (n) => { const u = new Uint8Array(n); u[0] = 0xFF; u[1] = 0xD8; u[n - 2] = 0xFF; u[n - 1] = 0xD9; for (let i = 2; i < n - 2; i++) u[i] = 0x41 + (i % 26); return u; };
const texto = (u) => Buffer.from(u).toString('latin1');
ok(() => { // PDF: estrutura, tabela xref com os deslocamentos certos e uma página por imagem
  const pdf = N.gerarPdf([{ jpeg: fakeJpeg(500), largura: 800, altura: 1000 }, { jpeg: fakeJpeg(300), largura: 1200, altura: 600 }]);
  const t = texto(pdf);
  assert.ok(t.startsWith('%PDF-1.4')); assert.ok(t.trimEnd().endsWith('%%EOF'));
  assert.match(t, /\/Count 2/); assert.equal((t.match(/\/Type \/Page /g) || []).length, 2);
  assert.match(t, /\/MediaBox \[0 0 595 842\]/); assert.match(t, /\/MediaBox \[0 0 842 595\]/); // retrato e paisagem
  assert.match(t, /\/Filter \/DCTDecode \/Length 500/);
  const sx = +/startxref\n(\d+)/.exec(t)[1]; assert.equal(t.slice(sx, sx + 4), 'xref');
  const linhas = t.slice(sx).split('\n'); const total = +/^0 (\d+)$/.exec(linhas[1])[1]; assert.equal(total, 1 + 2 + 2 * 3);
  for (let k = 1; k < total; k++) { const off = +linhas[2 + k].slice(0, 10); assert.equal(t.slice(off, off + String(k).length + 6), k + ' 0 obj'); }
  // os bytes do JPEG entram intactos
  const ini = t.indexOf('stream\n', t.indexOf('/Length 500')) + 7; assert.deepEqual(Array.from(pdf.slice(ini, ini + 500)), Array.from(fakeJpeg(500)));
});
ok(() => assert.throws(() => N.gerarPdf([]), /Sem páginas/));
console.log('scanner-nucleo: ' + n + ' grupos de verificação ok');
