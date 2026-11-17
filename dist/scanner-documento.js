/*
 * Escanear documento (18/11/2026): fotografa ou escolhe fotos de um documento, ajusta cada página (recorte com os 4 cantos,
 * correção de perspectiva, giro, tons de cinza, preto e branco, contraste), ordena as páginas e gera um único PDF.
 * Peça única, usada por RET - Patrimônios (documentos da etapa 2 e ficha técnica da etapa 4). Tudo acontece neste aparelho:
 * a câmera só é pedida depois do toque em "Escanear", nenhuma imagem é enviada a serviço externo, não há OCR e o conteúdo do
 * documento nunca é reescrito. A decisão do recorte é do usuário (não há detecção automática de bordas).
 * As regras de imagem e o PDF estão em scanner-nucleo.js (testado em tests/scanner-nucleo.cjs).
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI; const N = window.CicluzScannerNucleo;
  if (!U || !N) return;
  const { el, botao } = U;
  const LADO_MAX = 2200; const BORDA = 18; // folga em volta da prévia para os cantos ficarem inteiros na tela

  const paraCanvas = (img) => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').putImageData(new ImageData(img.data, img.width, img.height), 0, 0); return c; };
  function deFonte(fonte, w, h) {
    const k = Math.min(1, LADO_MAX / Math.max(w, h)); const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
    const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(fonte, 0, 0, c.width, c.height);
    const d = ctx.getImageData(0, 0, c.width, c.height); return { width: d.width, height: d.height, data: d.data };
  }
  async function deArquivo(arq) {
    if (window.createImageBitmap) { const bm = await createImageBitmap(arq); const r = deFonte(bm, bm.width, bm.height); if (bm.close) bm.close(); return r; }
    const url = URL.createObjectURL(arq);
    try { const im = new Image(); im.src = url; await im.decode(); return deFonte(im, im.naturalWidth, im.naturalHeight); } finally { URL.revokeObjectURL(url); }
  }
  const jpegDe = (img) => new Promise((ok, falha) => paraCanvas(img).toBlob(async (b) => { if (!b) { falha(new Error('jpeg')); return; } ok(new Uint8Array(await b.arrayBuffer())); }, 'image/jpeg', 0.82));
  const quadTotal = (img) => [{ x: 0, y: 0 }, { x: img.width, y: 0 }, { x: img.width, y: img.height }, { x: 0, y: img.height }];

  /**
   * abrir({ titulo, nomeBase, cores, aoConcluir }): aoConcluir(File) recebe o PDF pronto e devolve um texto de erro
   * (a janela fica aberta) ou nada (a janela fecha).
   */
  function abrir({ titulo = 'Escanear documento', nomeBase = 'Documento digitalizado', cores = {}, aoConcluir }) {
    let paginas = []; let fluxo = null; let videoEl = null; let urlPdf = ''; let pdfFeito = null; let abertoInicio = true;
    function pararCamera() { if (fluxo) { fluxo.getTracks().forEach((t) => t.stop()); fluxo = null; } if (videoEl) videoEl.srcObject = null; }
    U.dialogo({
      titulo, ...cores, largo: true, classe: 'scanner-dialogo', rotuloSalvar: 'Usar PDF',
      aoFechar: () => { pararCamera(); if (urlPdf) URL.revokeObjectURL(urlPdf); },
      montar: (form) => {
        const msg = el('p', 'profiles-note'); msg.setAttribute('role', 'status');
        const vistas = {};
        const ir = (nome) => { Object.entries(vistas).forEach(([k, v]) => { v.hidden = k !== nome; }); };
        const gerarPdf = async () => {
          if (!paginas.length) throw new Error('Adicione ao menos uma página.');
          const itens = [];
          for (const p of paginas) { const f = N.filtro(p.base, p.filtro); itens.push({ jpeg: await jpegDe(f), largura: f.width, altura: f.height }); }
          return new Blob([N.gerarPdf(itens)], { type: 'application/pdf' });
        };

        /* ---- Vista: páginas ---- */
        const vPag = el('div', 'scanner-vista'); vistas.paginas = vPag;
        const lista = el('div', 'scanner-paginas'); const conta = el('p', 'profiles-note');
        const arqIn = el('input'); arqIn.type = 'file'; arqIn.accept = 'image/jpeg,image/png,image/webp,image/*'; arqIn.multiple = true; arqIn.hidden = true;
        const barra = el('div', 'compras-form-rodape scanner-barra');
        const bCam = botao('Tirar foto', () => abrirCamera(), 'btn secondary'); const bArq = botao('Escolher foto', () => arqIn.click(), 'btn secondary');
        const bVer = botao('Visualizar PDF', () => visualizar(), 'btn secondary');
        barra.append(bCam, bArq, bVer);
        vPag.append(barra, conta, lista, arqIn, el('small', 'profiles-note', 'Fotografe cada folha ou escolha fotos já tiradas. Ajuste, ordene e gere um PDF único. Nada sai deste aparelho.'));
        function desenharPaginas() {
          conta.textContent = paginas.length ? paginas.length + (paginas.length === 1 ? ' página' : ' páginas') + ' no documento.' : 'Nenhuma página ainda.';
          bVer.disabled = !paginas.length;
          lista.replaceChildren(...paginas.map((p, k) => {
            const card = el('div', 'scanner-pagina'); const mini = paraCanvas(N.filtro(p.base, p.filtro)); mini.className = 'scanner-miniatura'; mini.setAttribute('aria-label', 'Página ' + (k + 1));
            const acoes = el('div', 'scanner-acoes');
            const b = (rot, fn, dis) => { const x = botao(rot, fn, 'btn secondary'); x.disabled = Boolean(dis); x.setAttribute('aria-label', rot + ' (página ' + (k + 1) + ')'); return x; };
            acoes.append(b('Ajustar', () => editar(p)), b('Subir', () => { paginas.splice(k - 1, 0, paginas.splice(k, 1)[0]); pdfFeito = null; desenharPaginas(); }, k === 0),
              b('Descer', () => { paginas.splice(k + 1, 0, paginas.splice(k, 1)[0]); pdfFeito = null; desenharPaginas(); }, k === paginas.length - 1), b('Remover', () => { paginas.splice(k, 1); pdfFeito = null; desenharPaginas(); }));
            card.append(mini, el('b', null, 'Página ' + (k + 1)), acoes); return card;
          }));
        }
        const novaPagina = (img) => { paginas.push({ base: img, filtro: 'original' }); pdfFeito = null; desenharPaginas(); };
        arqIn.onchange = async () => {
          const l = [...arqIn.files]; arqIn.value = ''; msg.textContent = '';
          for (const a of l) { if (!/^image\//.test(a.type)) { msg.textContent = a.name + ': escolha uma foto (JPEG, PNG ou WebP).'; continue; } try { novaPagina(await deArquivo(a)); } catch (e) { msg.textContent = 'Não foi possível abrir ' + a.name + '.'; } }
          ir('paginas');
        };

        /* ---- Vista: câmera (só abre depois do toque) ---- */
        const vCam = el('div', 'scanner-vista'); vistas.camera = vCam;
        const video = el('video', 'scanner-video'); video.setAttribute('playsinline', ''); video.muted = true; videoEl = video;
        const bCap = botao('Capturar', () => capturar(), 'btn'); const bCamVolta = botao('Voltar', () => { pararCamera(); ir('paginas'); }, 'btn secondary');
        const barraCam = el('div', 'compras-form-rodape scanner-barra'); barraCam.append(bCamVolta, bCap);
        vCam.append(video, barraCam);
        async function abrirCamera() {
          msg.textContent = '';
          if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) { msg.textContent = 'A câmera não está disponível neste navegador. Use "Escolher foto".'; ir('paginas'); return; }
          try {
            fluxo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } }, audio: false });
            video.srcObject = fluxo; await video.play().catch(() => {}); ir('camera');
          } catch (e) { pararCamera(); msg.textContent = 'Não foi possível usar a câmera (permissão negada ou câmera ausente). Escolha uma foto já tirada.'; ir('paginas'); }
        }
        function capturar() {
          if (!video.videoWidth) { msg.textContent = 'A câmera ainda não está pronta.'; return; }
          novaPagina(deFonte(video, video.videoWidth, video.videoHeight)); pararCamera(); ir('paginas'); msg.textContent = 'Página capturada. Use "Ajustar" para recortar e melhorar a leitura.';
        }

        /* ---- Vista: ajustar uma página ---- */
        const vEd = el('div', 'scanner-vista'); vistas.editar = vEd;
        const tela = el('canvas', 'scanner-tela'); tela.setAttribute('aria-label', 'Prévia da página: arraste os cantos para enquadrar'); tela.style.touchAction = 'none';
        const barraEd = el('div', 'compras-form-rodape scanner-barra'); const msgEd = el('p', 'profiles-error'); msgEd.setAttribute('role', 'alert');
        let atual = null; let quad = []; let fundo = null; let arrastando = -1;
        const chips = U.chips(N.FILTROS, 'original', (id) => { if (atual) { atual.filtro = id; pdfFeito = null; refazerFundo(); } });
        function refazerFundo() { fundo = paraCanvas(N.filtro(atual.base, atual.filtro)); const k = Math.min(1, 900 / fundo.width); tela.width = Math.round(fundo.width * k) + 2 * BORDA; tela.height = Math.round(fundo.height * k) + 2 * BORDA; pintar(); }
        const escala = () => (tela.width - 2 * BORDA) / atual.base.width;
        function pintar() {
          const ctx = tela.getContext('2d'); const k = escala(); ctx.clearRect(0, 0, tela.width, tela.height); ctx.drawImage(fundo, BORDA, BORDA, tela.width - 2 * BORDA, tela.height - 2 * BORDA);
          ctx.lineWidth = 2; ctx.strokeStyle = '#ffd400'; ctx.fillStyle = 'rgba(255,212,0,.9)'; ctx.beginPath(); quad.forEach((p, i) => (i ? ctx.lineTo(BORDA + p.x * k, BORDA + p.y * k) : ctx.moveTo(BORDA + p.x * k, BORDA + p.y * k))); ctx.closePath(); ctx.stroke();
          quad.forEach((p) => { ctx.beginPath(); ctx.arc(BORDA + p.x * k, BORDA + p.y * k, 9, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#333'; ctx.stroke(); ctx.strokeStyle = '#ffd400'; });
        }
        const ponto = (e) => { const r = tela.getBoundingClientRect(); const cv = tela.width / r.width; const k = escala(); return { x: Math.min(atual.base.width, Math.max(0, ((e.clientX - r.left) * cv - BORDA) / k)), y: Math.min(atual.base.height, Math.max(0, ((e.clientY - r.top) * cv - BORDA) / k)), k: cv / k }; };
        tela.addEventListener('pointerdown', (e) => {
          if (!atual) return; const p = ponto(e); let melhor = -1; let dMin = 36 * p.k;
          quad.forEach((q, i) => { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < dMin) { dMin = d; melhor = i; } });
          if (melhor >= 0) { arrastando = melhor; tela.setPointerCapture(e.pointerId); e.preventDefault(); }
        });
        tela.addEventListener('pointermove', (e) => { if (arrastando < 0) return; const p = ponto(e); quad[arrastando] = { x: p.x, y: p.y }; pintar(); });
        const solta = () => { arrastando = -1; };
        tela.addEventListener('pointerup', solta); tela.addEventListener('pointercancel', solta);
        const mudaBase = (nova) => { atual.base = nova; quad = quadTotal(nova); pdfFeito = null; refazerFundo(); };
        const bRecorte = botao('Aplicar recorte', () => { msgEd.textContent = ''; const r = N.recortar(atual.base, quad, LADO_MAX); if (!r) { msgEd.textContent = 'Os 4 cantos precisam formar uma área válida (sem cruzar).'; return; } mudaBase(r); }, 'btn secondary');
        const bGE = botao('Girar à esquerda', () => mudaBase(N.girar(atual.base, -1)), 'btn secondary'); const bGD = botao('Girar à direita', () => mudaBase(N.girar(atual.base, 1)), 'btn secondary');
        const bPronto = botao('Concluir página', () => { atual = null; desenharPaginas(); ir('paginas'); }, 'btn');
        barraEd.append(bRecorte, bGE, bGD, bPronto);
        const rotChips = el('div', 'compras-campo compras-largo'); rotChips.append(el('span', 'compras-rotulo', 'Ajuste da imagem'), chips);
        vEd.append(el('small', 'profiles-note', 'Arraste os 4 cantos até as bordas do documento e toque em "Aplicar recorte": a perspectiva é corrigida.'), tela, barraEd, msgEd, rotChips);
        function editar(p) {
          atual = p; quad = quadTotal(p.base); msgEd.textContent = ''; chips.atualizar(p.filtro);
          ir('editar'); refazerFundo();
        }

        /* ---- Vista: PDF ---- */
        const vPdf = el('div', 'scanner-vista'); vistas.pdf = vPdf;
        const quadro = el('iframe', 'scanner-pdf'); quadro.title = 'Prévia do PDF';
        const barraPdf = el('div', 'compras-form-rodape scanner-barra');
        const bBaixar = botao('Baixar PDF', () => baixar(), 'btn secondary'); barraPdf.append(botao('Voltar às páginas', () => ir('paginas'), 'btn secondary'), bBaixar);
        vPdf.append(barraPdf, quadro);
        async function preparar() { if (!pdfFeito) pdfFeito = await gerarPdf(); if (urlPdf) URL.revokeObjectURL(urlPdf); urlPdf = URL.createObjectURL(pdfFeito); return pdfFeito; }
        async function visualizar() {
          msg.textContent = 'Gerando o PDF…';
          try { await preparar(); quadro.src = urlPdf; msg.textContent = 'PDF com ' + paginas.length + (paginas.length === 1 ? ' página.' : ' páginas.'); ir('pdf'); } catch (e) { msg.textContent = e.message || 'Não foi possível gerar o PDF.'; }
        }
        async function baixar() {
          try { await preparar(); const a = document.createElement('a'); a.href = urlPdf; a.download = nomeArquivo(); document.body.append(a); a.click(); a.remove(); } catch (e) { msg.textContent = 'Não foi possível baixar o PDF.'; }
        }
        const nomeArquivo = () => nomeBase + ' ' + new Date().toISOString().slice(0, 10) + '.pdf';

        form.append(msg, vPag, vCam, vEd, vPdf);
        desenharPaginas(); ir('paginas');
        // A câmera só é pedida agora, depois do toque em "Escanear".
        if (abertoInicio) { abertoInicio = false; abrirCamera(); }
        return { gerar: () => preparar().then(() => pdfFeito), nome: nomeArquivo, quantas: () => paginas.length, msg };
      },
      salvar: async (c) => {
        if (!c.quantas()) return 'Adicione ao menos uma página.';
        let blob; try { blob = await c.gerar(); } catch (e) { return 'Não foi possível gerar o PDF.'; }
        return aoConcluir(new File([blob], c.nome(), { type: 'application/pdf' }));
      },
    });
  }

  window.CicluzScanner = { abrir };
})();
