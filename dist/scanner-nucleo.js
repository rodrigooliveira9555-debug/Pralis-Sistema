/*
 * Digitalização de documentos — regras puras, sem DOM (18/11/2026). Usadas por scanner-documento.js e testadas em tests/scanner-nucleo.cjs.
 * Trabalham sobre objetos { data: Uint8ClampedArray (RGBA), width, height }, o mesmo formato do ImageData do navegador.
 * Tudo acontece neste aparelho: nenhuma imagem sai daqui, não há OCR e o conteúdo do documento nunca é reescrito;
 * só recorte/correção de perspectiva escolhidos pelo usuário, giro, tons e contraste.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CicluzScannerNucleo = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const novaImagem = (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  /** Resolve o sistema linear n×n (eliminação de Gauss com pivô); devolve null se for singular. */
  function resolver(A, b) {
    const n = b.length; const M = A.map((l, i) => [...l, b[i]]);
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      if (Math.abs(M[p][c]) < 1e-12) return null;
      [M[c], M[p]] = [M[p], M[c]];
      for (let r = c + 1; r < n; r++) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
    }
    const x = new Array(n).fill(0);
    for (let r = n - 1; r >= 0; r--) { let s = M[r][n]; for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k]; x[r] = s / M[r][r]; }
    return x;
  }
  /** Homografia que leva o retângulo de saída (0,0)(W,0)(W,H)(0,H) aos 4 cantos de origem [tl, tr, br, bl]. */
  function homografia(W, H, quad) {
    const dst = [[0, 0], [W, 0], [W, H], [0, H]]; const A = []; const b = [];
    dst.forEach(([x, y], i) => {
      const { x: u, y: v } = quad[i];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
    });
    return resolver(A, b);
  }
  /** Quadrilátero válido: 4 pontos, convexo e com área; evita recortes impossíveis. */
  function quadValido(q) {
    if (!Array.isArray(q) || q.length !== 4 || q.some((p) => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y))) return false;
    let sinal = 0;
    for (let i = 0; i < 4; i++) {
      const a = q[i]; const b = q[(i + 1) % 4]; const c = q[(i + 2) % 4];
      const z = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
      if (Math.abs(z) < 1e-6) return false;
      if (sinal === 0) sinal = Math.sign(z); else if (Math.sign(z) !== sinal) return false;
    }
    return true;
  }
  /**
   * Recorta o quadrilátero [tl, tr, br, bl] (em pixels da origem) e o endireita num retângulo: recorte comum
   * quando os 4 cantos formam um retângulo, correção de perspectiva quando não. maxLado limita o tamanho da saída.
   */
  function recortar(img, quad, maxLado = 2200) {
    if (!quadValido(quad)) return null;
    let W = Math.round((dist(quad[0], quad[1]) + dist(quad[3], quad[2])) / 2); let H = Math.round((dist(quad[0], quad[3]) + dist(quad[1], quad[2])) / 2);
    if (W < 8 || H < 8) return null;
    const k = Math.min(1, maxLado / Math.max(W, H)); W = Math.max(8, Math.round(W * k)); H = Math.max(8, Math.round(H * k));
    const h = homografia(W, H, quad); if (!h) return null;
    const out = novaImagem(W, H); const s = img.data; const sw = img.width; const sh = img.height;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const px = x + 0.5; const py = y + 0.5; const d = h[6] * px + h[7] * py + 1;
        const u = (h[0] * px + h[1] * py + h[2]) / d - 0.5; const v = (h[3] * px + h[4] * py + h[5]) / d - 0.5;
        const x0 = Math.floor(u); const y0 = Math.floor(v); const fx = u - x0; const fy = v - y0; const o = (y * W + x) * 4;
        for (let c = 0; c < 4; c++) {
          const g = (xx, yy) => s[(Math.min(sh - 1, Math.max(0, yy)) * sw + Math.min(sw - 1, Math.max(0, xx))) * 4 + c];
          out.data[o + c] = (g(x0, y0) * (1 - fx) + g(x0 + 1, y0) * fx) * (1 - fy) + (g(x0, y0 + 1) * (1 - fx) + g(x0 + 1, y0 + 1) * fx) * fy;
        }
      }
    }
    return out;
  }
  /** Gira em 90°: sentido 1 = horário, -1 = anti-horário. */
  function girar(img, sentido) {
    const { width: w, height: h } = img; const out = novaImagem(h, w);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const nx = sentido > 0 ? h - 1 - y : y; const ny = sentido > 0 ? x : w - 1 - x;
      const a = (y * w + x) * 4; const b = (ny * h + nx) * 4;
      out.data[b] = img.data[a]; out.data[b + 1] = img.data[a + 1]; out.data[b + 2] = img.data[a + 2]; out.data[b + 3] = img.data[a + 3];
    }
    return out;
  }

  /* ---------- Ajustes de imagem ---------- */
  const FILTROS = [['original', 'Original'], ['cinza', 'Tons de cinza'], ['pb', 'Preto e branco'], ['contraste', 'Mais contraste']];
  const luma = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  /** Limites (percentis 1% e 99%) do brilho, para esticar o contraste sem estourar. */
  function limites(img) {
    const hist = new Array(256).fill(0); const n = img.width * img.height;
    for (let i = 0; i < n; i++) hist[Math.round(luma(img.data, i * 4))]++;
    let ac = 0; let lo = 0; let hi = 255;
    for (let v = 0; v < 256; v++) { ac += hist[v]; if (ac >= n * 0.01) { lo = v; break; } }
    ac = 0; for (let v = 255; v >= 0; v--) { ac += hist[v]; if (ac >= n * 0.01) { hi = v; break; } }
    return hi - lo < 16 ? [0, 255] : [lo, hi];
  }
  function filtro(img, id) {
    const out = { width: img.width, height: img.height, data: new Uint8ClampedArray(img.data) };
    const d = out.data; const n = img.width * img.height;
    if (id === 'cinza') { for (let i = 0; i < n; i++) { const y = luma(d, i * 4); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = y; } }
    else if (id === 'contraste') {
      const [lo, hi] = limites(img); const f = 255 / (hi - lo);
      for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) d[i * 4 + c] = (d[i * 4 + c] - lo) * f;
    } else if (id === 'pb') {
      // Limiar local (média da vizinhança), que aguenta sombra e iluminação desigual de uma foto de papel.
      const w = img.width; const h = img.height; const I = new Float64Array((w + 1) * (h + 1));
      for (let y = 0; y < h; y++) { let lin = 0; for (let x = 0; x < w; x++) { lin += luma(img.data, (y * w + x) * 4); I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + lin; } }
      const r = Math.max(8, Math.round(Math.min(w, h) / 24));
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const x0 = Math.max(0, x - r); const x1 = Math.min(w, x + r + 1); const y0 = Math.max(0, y - r); const y1 = Math.min(h, y + r + 1);
        const soma = I[y1 * (w + 1) + x1] - I[y0 * (w + 1) + x1] - I[y1 * (w + 1) + x0] + I[y0 * (w + 1) + x0];
        const media = soma / ((x1 - x0) * (y1 - y0)); const v = luma(img.data, (y * w + x) * 4) > media * 0.9 ? 255 : 0; const o = (y * w + x) * 4;
        d[o] = d[o + 1] = d[o + 2] = v;
      }
    }
    return out;
  }

  /* ---------- PDF ---------- */
  const A4 = [595, 842];
  const enc = (s) => { const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; };
  const num = (n) => String(Math.round(n * 100) / 100);
  /**
   * Monta um PDF só com as imagens, uma por página (A4 em pé ou deitado, conforme a imagem), sem recompressão:
   * paginas = [{ jpeg: Uint8Array, largura, altura }]. Devolve Uint8Array.
   */
  function gerarPdf(paginas) {
    if (!Array.isArray(paginas) || !paginas.length) throw new Error('Sem páginas para gerar o PDF.');
    const partes = []; const offs = []; let pos = 0;
    const put = (x) => { const u = typeof x === 'string' ? enc(x) : x; partes.push(u); pos += u.length; };
    const obj = (n, corpo) => { offs[n] = pos; put(n + ' 0 obj\n'); put(corpo); put('\nendobj\n'); };
    put('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    const total = 2 + paginas.length * 3; const kids = [];
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    paginas.forEach((p, i) => { kids.push((3 + i * 3) + ' 0 R'); });
    obj(2, '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + paginas.length + ' >>');
    paginas.forEach((p, i) => {
      const pg = 3 + i * 3; const ct = pg + 1; const im = pg + 2;
      const [pw, ph] = p.largura > p.altura ? [A4[1], A4[0]] : A4; const k = Math.min(pw / p.largura, ph / p.altura);
      const w = p.largura * k; const h = p.altura * k; const x = (pw - w) / 2; const y = (ph - h) / 2;
      obj(pg, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pw + ' ' + ph + '] /Resources << /XObject << /Im0 ' + im + ' 0 R >> >> /Contents ' + ct + ' 0 R >>');
      const fluxo = 'q ' + num(w) + ' 0 0 ' + num(h) + ' ' + num(x) + ' ' + num(y) + ' cm /Im0 Do Q';
      obj(ct, '<< /Length ' + fluxo.length + ' >>\nstream\n' + fluxo + '\nendstream');
      offs[im] = pos; put(im + ' 0 obj\n'); put('<< /Type /XObject /Subtype /Image /Width ' + p.largura + ' /Height ' + p.altura + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + p.jpeg.length + ' >>\nstream\n');
      put(p.jpeg); put('\nendstream\nendobj\n');
    });
    const xref = pos;
    let t = 'xref\n0 ' + (total + 1) + '\n0000000000 65535 f \n';
    for (let n = 1; n <= total; n++) t += String(offs[n]).padStart(10, '0') + ' 00000 n \n';
    put(t + 'trailer\n<< /Size ' + (total + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
    const saida = new Uint8Array(pos); let o = 0; partes.forEach((u) => { saida.set(u, o); o += u.length; });
    return saida;
  }

  return { novaImagem, homografia, quadValido, recortar, girar, filtro, FILTROS, gerarPdf, resolver };
});
