/*
 * Gerador de QR Code local (sem biblioteca e sem rede), 17/11/2026. Modo bytes (UTF-8), correção de erro M,
 * versões 1 a 6 (até 106 bytes). Serve à etiqueta patrimonial: o conteúdo é só um identificador interno.
 * Uso: CicluzQR.matriz(texto) → matriz de booleanos (true = módulo escuro); CicluzQR.svg(texto) → texto SVG.
 * Testado em tests/qr.cjs com um decodificador independente.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CicluzQR = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* Por versão, correção M: [palavras de dados no total, palavras de correção por bloco, blocos, posições dos alinhamentos]. */
  const VERSOES = [
    null,
    { dados: 16, ec: 10, blocos: 1, alinha: [] },
    { dados: 28, ec: 16, blocos: 1, alinha: [6, 18] },
    { dados: 44, ec: 26, blocos: 1, alinha: [6, 22] },
    { dados: 64, ec: 18, blocos: 2, alinha: [6, 26] },
    { dados: 86, ec: 24, blocos: 2, alinha: [6, 30] },
    { dados: 108, ec: 16, blocos: 4, alinha: [6, 34] },
  ];
  const MAX_BYTES = (v) => VERSOES[v].dados - 2; // 4 bits do modo + 8 do tamanho + terminador cabem em 2 palavras

  /* ---- Corpo de Galois GF(256), polinômio 0x11D ---- */
  const EXP = new Array(512); const LOG = new Array(256);
  (function () { let x = 1; for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; } for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
  const mul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);
  function divisor(grau) {
    const r = new Array(grau).fill(0); r[grau - 1] = 1;
    let raiz = 1;
    for (let i = 0; i < grau; i++) {
      for (let j = 0; j < grau; j++) { r[j] = mul(r[j], raiz); if (j + 1 < grau) r[j] ^= r[j + 1]; }
      raiz = mul(raiz, 2);
    }
    return r;
  }
  function resto(dados, div) {
    const r = new Array(div.length).fill(0);
    for (const b of dados) { const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => { r[i] ^= mul(c, f); }); }
    return r;
  }

  /* ---- Bytes do texto em UTF-8 ---- */
  function bytesDe(texto) {
    if (typeof TextEncoder !== 'undefined') return Array.from(new TextEncoder().encode(texto));
    return Array.from(Buffer.from(texto, 'utf8'));
  }

  /* ---- Palavras de código: dados + correção, intercaladas ---- */
  function palavras(bytes, v) {
    const V = VERSOES[v];
    const bits = [];
    const poe = (valor, n) => { for (let i = n - 1; i >= 0; i--) bits.push((valor >>> i) & 1); };
    poe(4, 4); poe(bytes.length, 8); bytes.forEach((b) => poe(b, 8));
    const capacidade = V.dados * 8;
    poe(0, Math.min(4, capacidade - bits.length));
    while (bits.length % 8) bits.push(0);
    const dados = [];
    for (let i = 0; i < bits.length; i += 8) dados.push(parseInt(bits.slice(i, i + 8).join(''), 2));
    for (let pad = 0xec; dados.length < V.dados; pad ^= 0xec ^ 0x11) dados.push(pad);
    const por = V.dados / V.blocos; // todas as versões usadas têm blocos do mesmo tamanho
    const div = divisor(V.ec);
    const blocosD = []; const blocosE = [];
    for (let b = 0; b < V.blocos; b++) { const d = dados.slice(b * por, (b + 1) * por); blocosD.push(d); blocosE.push(resto(d, div)); }
    const saida = [];
    for (let i = 0; i < por; i++) blocosD.forEach((d) => saida.push(d[i]));
    for (let i = 0; i < V.ec; i++) blocosE.forEach((e) => saida.push(e[i]));
    return saida;
  }

  /* ---- Matriz ---- */
  function montar(texto) {
    const bytes = bytesDe(String(texto));
    let v = 1;
    while (v <= 6 && bytes.length > MAX_BYTES(v)) v++;
    if (v > 6) throw new Error('Texto longo demais para o QR local (máximo ' + MAX_BYTES(6) + ' bytes).');
    const n = 17 + 4 * v;
    const m = Array.from({ length: n }, () => new Array(n).fill(false));
    const fn = Array.from({ length: n }, () => new Array(n).fill(false));
    const poe = (x, y, escuro) => { if (x >= 0 && x < n && y >= 0 && y < n) { m[y][x] = escuro; fn[y][x] = true; } };
    // Temporização
    for (let i = 0; i < n; i++) { poe(6, i, i % 2 === 0); poe(i, 6, i % 2 === 0); }
    // Localizadores com separador
    for (const [cx, cy] of [[3, 3], [n - 4, 3], [3, n - 4]]) {
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const d = Math.max(Math.abs(dx), Math.abs(dy)); poe(cx + dx, cy + dy, d !== 2 && d !== 4); }
    }
    // Alinhamentos
    const A = VERSOES[v].alinha;
    for (let i = 0; i < A.length; i++) for (let j = 0; j < A.length; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === A.length - 1) || (i === A.length - 1 && j === 0)) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) poe(A[i] + dx, A[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
    // Reserva a área dos bits de formato e o módulo escuro (os bits entram depois, com a máscara escolhida)
    const formato = (mascara) => {
      const dado = (0 << 3) | mascara; // correção M = 00
      let r = dado; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      const bits = ((dado << 10) | r) ^ 0x5412;
      const b = (i) => ((bits >>> i) & 1) !== 0;
      for (let i = 0; i <= 5; i++) poe(8, i, b(i));
      poe(8, 7, b(6)); poe(8, 8, b(7)); poe(7, 8, b(8));
      for (let i = 9; i < 15; i++) poe(14 - i, 8, b(i));
      for (let i = 0; i < 8; i++) poe(n - 1 - i, 8, b(i));
      for (let i = 8; i < 15; i++) poe(8, n - 15 + i, b(i));
      poe(8, n - 8, true);
    };
    formato(0);
    // Palavras de código no zigue-zague
    const cod = palavras(bytes, v);
    let k = 0;
    for (let dir = n - 1; dir >= 1; dir -= 2) {
      if (dir === 6) dir = 5;
      for (let vert = 0; vert < n; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = dir - j; const sobe = ((dir + 1) & 2) === 0; const y = sobe ? n - 1 - vert : vert;
          if (!fn[y][x] && k < cod.length * 8) { m[y][x] = ((cod[k >>> 3] >>> (7 - (k & 7))) & 1) !== 0; k++; }
        }
      }
    }
    // Máscaras: escolhe a de menor penalidade
    const inverte = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
      (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
      (x, y) => ((((x * y) % 2) + ((x * y) % 3)) % 2) === 0, (x, y) => ((((x + y) % 2) + ((x * y) % 3)) % 2) === 0];
    const aplica = (mascara) => { for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!fn[y][x] && inverte[mascara](x, y)) m[y][x] = !m[y][x]; };
    const penalidade = () => {
      let p = 0;
      for (let t = 0; t < 2; t++) {
        for (let a = 0; a < n; a++) {
          let corrida = 1; let seq = '';
          for (let b = 0; b < n; b++) {
            const c = t === 0 ? m[a][b] : m[b][a];
            seq += c ? '1' : '0';
            if (b > 0) { const ant = t === 0 ? m[a][b - 1] : m[b - 1][a]; if (c === ant) { corrida++; if (corrida === 5) p += 3; else if (corrida > 5) p++; } else corrida = 1; }
          }
          for (const padrao of ['00001011101', '10111010000']) { let i = seq.indexOf(padrao); while (i >= 0) { p += 40; i = seq.indexOf(padrao, i + 1); } }
        }
      }
      for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) { const c = m[y][x]; if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3; }
      let escuros = 0; for (const l of m) for (const c of l) if (c) escuros++;
      p += 10 * Math.floor(Math.abs(escuros * 20 - n * n * 10) / (n * n));
      return p;
    };
    let melhor = 0; let menor = Infinity;
    for (let mk = 0; mk < 8; mk++) { aplica(mk); formato(mk); const p = penalidade(); if (p < menor) { menor = p; melhor = mk; } formato(mk); aplica(mk); }
    aplica(melhor); formato(melhor);
    return { matriz: m, versao: v, mascara: melhor };
  }

  const matriz = (texto) => montar(texto).matriz;
  /** SVG com a zona de silêncio de 4 módulos; escuro = currentColor (ou a cor passada). */
  function svg(texto, { cor = '#000', modulo = 1 } = {}) {
    const m = matriz(texto); const n = m.length; const q = 4;
    let d = '';
    m.forEach((l, y) => l.forEach((c, x) => { if (c) d += 'M' + (x + q) + ' ' + (y + q) + 'h1v1h-1z'; }));
    const t = (n + 2 * q) * modulo;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + (n + 2 * q) + ' ' + (n + 2 * q) + '" width="' + t + '" height="' + t + '" shape-rendering="crispEdges" role="img" aria-label="QR Code"><rect width="100%" height="100%" fill="#fff"/><path d="' + d + '" fill="' + cor + '"/></svg>';
  }
  return { matriz, svg, montar, MAX_BYTES: MAX_BYTES(6) };
});
