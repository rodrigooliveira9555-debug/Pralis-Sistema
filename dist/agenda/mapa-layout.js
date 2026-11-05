/*
 * Agenda — posição dos nós do mapa mental (sem tela; testado em tests/agenda-dominio.cjs).
 * Estruturas como as do XMind:
 * - mapa: a raiz no meio e os ramos divididos à direita e à esquerda (equilibrados pela altura);
 * - logico: tudo para a direita;
 * - organograma: de cima para baixo;
 * - arvore: em degraus (cada filho embaixo e um pouco à direita do pai);
 * - linha: os grupos em fila numa linha do tempo, com os compromissos embaixo de cada um.
 * Entrada: árvore { id, w, h, filhos[] } (w/h já medidos). Recolhidos: Set de ids sem filhos à mostra.
 * Saída: { nos: [{ id, no, x, y, w, h, nivel, lado }], ligacoes: [{ de, para, tipo, x1, y1, x2, y2 }], caixa }.
 */
(function (root) {
  'use strict';
  const ESTRUTURAS = [['mapa', 'Mapa'], ['logico', 'Lógico (à direita)'], ['organograma', 'Organograma'], ['arvore', 'Árvore'], ['linha', 'Linha do tempo']];

  function calcular(raiz, estrutura = 'mapa', { recolhidos = new Set(), hgap = 56, vgap = 14 } = {}) {
    const filhos = (n) => (recolhidos.has(n.id) ? [] : n.filhos || []);
    const nos = [];
    const ligacoes = [];
    const por = new Map();
    const pos = (n, x, y, nivel, lado) => { const p = { id: n.id, no: n, x, y, w: n.w, h: n.h, nivel, lado }; nos.push(p); por.set(n.id, p); return p; };

    // Altura e largura das subárvores
    const altura = (n) => { const f = filhos(n); const soma = f.reduce((t, c) => t + altura(c), 0) + vgap * Math.max(0, f.length - 1); n._a = Math.max(n.h, soma); return n._a; };
    const largura = (n, gap) => { const f = filhos(n); const soma = f.reduce((t, c) => t + largura(c, gap), 0) + gap * Math.max(0, f.length - 1); n._l = Math.max(n.w, soma); return n._l; };

    /** Lado direito (lado 1) ou esquerdo (-1): x é a borda de onde o nó começa. */
    function horizontal(n, x, topo, nivel, lado) {
      const p = pos(n, lado > 0 ? x : x - n.w, topo + (n._a - n.h) / 2, nivel, lado);
      const f = filhos(n);
      const somaF = f.reduce((t, c) => t + c._a, 0) + vgap * Math.max(0, f.length - 1);
      let y = topo + (n._a - somaF) / 2;
      f.forEach((c) => {
        const cx = lado > 0 ? p.x + p.w + hgap : p.x - hgap;
        const pc = horizontal(c, cx, y, nivel + 1, lado);
        ligacoes.push({ de: n.id, para: c.id, tipo: 'curva', x1: lado > 0 ? p.x + p.w : p.x, y1: p.y + p.h / 2, x2: lado > 0 ? pc.x : pc.x + pc.w, y2: pc.y + pc.h / 2 });
        y += c._a + vgap;
      });
      return p;
    }

    function vertical(n, esquerda, y, nivel, gap, vg) {
      const p = pos(n, esquerda + (n._l - n.w) / 2, y, nivel, 1);
      const f = filhos(n);
      const somaF = f.reduce((t, c) => t + c._l, 0) + gap * Math.max(0, f.length - 1);
      let x = esquerda + (n._l - somaF) / 2;
      f.forEach((c) => {
        const pc = vertical(c, x, y + n.h + vg, nivel + 1, gap, vg);
        ligacoes.push({ de: n.id, para: c.id, tipo: 'cotovelo-v', x1: p.x + p.w / 2, y1: p.y + p.h, x2: pc.x + pc.w / 2, y2: pc.y });
        x += c._l + gap;
      });
      return p;
    }

    /** Degraus: devolve o próximo y livre. */
    function degraus(n, x, y, nivel, recuo) {
      const p = pos(n, x, y, nivel, 1);
      let prox = y + n.h + vgap;
      filhos(n).forEach((c) => {
        const topoFilho = prox;
        prox = degraus(c, x + recuo, prox, nivel + 1, recuo);
        const pc = por.get(c.id);
        ligacoes.push({ de: n.id, para: c.id, tipo: 'cotovelo-h', x1: p.x + Math.min(18, p.w / 2), y1: p.y + p.h, x2: pc.x, y2: topoFilho + pc.h / 2 });
      });
      return prox;
    }

    if (estrutura === 'organograma') {
      largura(raiz, 24);
      vertical(raiz, 0, 0, 0, 24, 48);
    } else if (estrutura === 'arvore') {
      degraus(raiz, 0, 0, 0, 36);
    } else if (estrutura === 'linha') {
      const p = pos(raiz, 0, 0, 0, 1);
      let x = p.w + hgap;
      const eixo = p.h / 2;
      let anterior = p;
      filhos(raiz).forEach((g) => {
        const inicio = nos.length;
        const fim = degraus(g, x, eixo - g.h / 2, 1, 28);
        const pg = por.get(g.id);
        const larguraGrupo = Math.max(...nos.slice(inicio).map((q) => q.x + q.w)) - x;
        ligacoes.push({ de: anterior.id, para: g.id, tipo: 'reta', x1: anterior.x + anterior.w, y1: eixo, x2: pg.x, y2: eixo, eixo: true });
        anterior = pg;
        x += Math.max(larguraGrupo, g.w) + hgap;
        void fim;
      });
    } else if (estrutura === 'logico') {
      altura(raiz);
      horizontal(raiz, 0, 0, 0, 1);
    } else {
      // Mapa: raiz no centro, ramos repartidos entre direita e esquerda pela altura.
      raiz._a = raiz.h;
      const f = filhos(raiz);
      f.forEach(altura);
      // Cada ramo vai para o lado mais baixo até agora (a direita primeiro), na ordem: equilibra sem embaralhar.
      const direita = [];
      const esquerda = [];
      let somaD = 0;
      let somaE = 0;
      f.forEach((c) => { if (somaD <= somaE) { direita.push(c); somaD += c._a + vgap; } else { esquerda.push(c); somaE += c._a + vgap; } });
      const pr = pos(raiz, -raiz.w / 2, -raiz.h / 2, 0, 0);
      [[direita, 1], [esquerda, -1]].forEach(([lista, lado]) => {
        const soma = lista.reduce((t, c) => t + c._a, 0) + vgap * Math.max(0, lista.length - 1);
        let y = -soma / 2;
        lista.forEach((c) => {
          const x = lado > 0 ? pr.x + pr.w + hgap * 1.4 : pr.x - hgap * 1.4;
          const pc = horizontal(c, x, y, 1, lado);
          ligacoes.push({ de: raiz.id, para: c.id, tipo: 'curva', x1: pr.x + pr.w / 2, y1: 0, x2: lado > 0 ? pc.x : pc.x + pc.w, y2: pc.y + pc.h / 2 });
          y += c._a + vgap;
        });
      });
    }

    const minX = Math.min(...nos.map((p) => p.x));
    const minY = Math.min(...nos.map((p) => p.y));
    const maxX = Math.max(...nos.map((p) => p.x + p.w));
    const maxY = Math.max(...nos.map((p) => p.y + p.h));
    return { nos, ligacoes, por, caixa: { x: minX, y: minY, w: maxX - minX, h: maxY - minY } };
  }

  /** Quebra o texto em até maxLinhas linhas de no máximo `largura` px (medir: texto → px). */
  function quebrar(texto, largura, medir, maxLinhas = 3) {
    const palavras = String(texto || '').split(/\s+/).filter(Boolean);
    const linhas = [];
    let atual = '';
    palavras.forEach((p) => {
      const teste = atual ? atual + ' ' + p : p;
      if (medir(teste) <= largura || !atual) atual = teste;
      else { linhas.push(atual); atual = p; }
    });
    if (atual) linhas.push(atual);
    if (linhas.length > maxLinhas) {
      const cortadas = linhas.slice(0, maxLinhas);
      let ultima = cortadas[maxLinhas - 1];
      while (ultima.length > 1 && medir(ultima + '…') > largura) ultima = ultima.slice(0, -1);
      cortadas[maxLinhas - 1] = ultima.replace(/\s+$/, '') + '…';
      return cortadas;
    }
    // Palavra única maior que a largura: corta com reticências.
    return linhas.map((l) => { if (medir(l) <= largura) return l; let x = l; while (x.length > 1 && medir(x + '…') > largura) x = x.slice(0, -1); return x + '…'; });
  }

  const api = { ESTRUTURAS, calcular, quebrar };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CicluzAgendaMapaLayout = api;
})(typeof window !== 'undefined' ? window : globalThis);
