/*
 * Observação em áudio: peça única de gravação, usada em Ocorrências e em RET - Patrimônios.
 * O áudio fica no IndexedDB de Documentações (nunca no localStorage) e não sai do aparelho:
 * não sincroniza com o servidor e não tem transcrição automática. O cadastro guarda só a
 * referência { id, type, size, seconds }.
 */
(function () {
  'use strict';
  function el(tag, cls, texto) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (texto !== undefined && texto !== null) n.textContent = texto;
    return n;
  }
  function botao(texto, acao) {
    const b = el('button', 'btn secondary', texto);
    b.type = 'button';
    b.onclick = acao;
    return b;
  }
  const novoId = () => (crypto.randomUUID ? crypto.randomUUID() : 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2));
  const arquivos = () => window.CicluzDocuments && window.CicluzDocuments.files;

  /** Endereço temporário para ouvir um áudio já guardado; null se não estiver neste aparelho. */
  async function ouvir(meta) {
    try {
      const b = meta && arquivos() ? await arquivos().get(meta.id) : null;
      return b ? URL.createObjectURL(b) : null;
    } catch (e) { return null; }
  }

  /**
   * rotulo: título do bloco; classe: classes extras da caixa; aoSalvar: o que salva o áudio
   * ("a ocorrência", "o bem"), usado na frase de orientação.
   */
  function criar({ rotulo = 'Observação em áudio (opcional)', classe = '', aoSalvar = 'o cadastro' } = {}) {
    const caixa = el('div', ('audio-nota ' + classe).trim());
    let rec = null; let partes = []; let blob = null; let url = ''; let inicio = 0; let segundos = 0;
    let guardado = null; // áudio já salvo no cadastro (referência)
    const msg = el('p', 'profiles-note');
    msg.setAttribute('role', 'status');
    const player = el('audio');
    player.controls = true;
    player.hidden = true;
    const bGravar = botao('Gravar áudio', gravar);
    const bParar = botao('Parar gravação', parar);
    const bDescartar = botao('Descartar áudio', descartar);
    const bOuvir = botao('Ouvir áudio', tocarGuardado);
    bParar.hidden = bDescartar.hidden = bOuvir.hidden = true;
    const suporta = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
    const ferramentas = el('div', 'people-banner-tools');
    ferramentas.append(bGravar, bParar, bOuvir, bDescartar);
    caixa.append(el('span', 'uniforms-enum-label', rotulo), ferramentas, msg, player);
    const info = suporta
      ? 'O áudio é gravado e guardado só neste aparelho. Não há transcrição automática: digite ou revise o texto da observação à mão.'
      : 'Gravação de áudio indisponível neste navegador: digite a observação.';
    msg.textContent = info;
    bGravar.disabled = !suporta;

    function soltarUrl() { if (url) URL.revokeObjectURL(url); url = ''; player.removeAttribute('src'); player.hidden = true; }
    async function gravar() {
      msg.textContent = '';
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        partes = [];
        rec = new MediaRecorder(stream);
        rec.ondataavailable = (e) => { if (e.data.size) partes.push(e.data); };
        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          segundos = Math.max(1, Math.round((Date.now() - inicio) / 1000));
          blob = new Blob(partes, { type: rec.mimeType || 'audio/webm' });
          soltarUrl();
          url = URL.createObjectURL(blob);
          player.src = url;
          player.hidden = false;
          bDescartar.hidden = false; bGravar.hidden = false; bParar.hidden = true; bOuvir.hidden = true;
          msg.textContent = 'Áudio gravado (' + segundos + ' s). Ouça, descarte ou salve ' + aoSalvar + ' para guardá-lo.';
        };
        inicio = Date.now();
        rec.start();
        bGravar.hidden = true; bParar.hidden = false; bOuvir.hidden = true; bDescartar.hidden = true;
        msg.textContent = 'Gravando…';
      } catch (e) {
        msg.textContent = 'Não foi possível acessar o microfone. Verifique a permissão do navegador ou digite a observação.';
      }
    }
    function parar() { try { if (rec) rec.stop(); } catch (e) { /* já parado */ } }
    function descartar() {
      blob = null; guardado = null;
      soltarUrl();
      bDescartar.hidden = true; bOuvir.hidden = true;
      msg.textContent = 'Áudio descartado.';
    }
    async function tocarGuardado() {
      const u = await ouvir(guardado);
      if (!u) { msg.textContent = 'Este áudio foi gravado em outro aparelho e não está disponível aqui.'; return; }
      soltarUrl();
      url = u; player.src = u; player.hidden = false;
      player.play().catch(() => {});
    }
    /** Mostra o áudio que o cadastro já tem (edição). */
    function definir(meta) {
      blob = null; soltarUrl();
      guardado = meta || null;
      bOuvir.hidden = bDescartar.hidden = !guardado;
      msg.textContent = guardado ? 'Áudio guardado (' + guardado.seconds + ' s). Ouça, descarte ou grave outro no lugar.' : info;
    }
    /**
     * Guarda a gravação nova e devolve { meta }; sem gravação nova devolve { meta: a referência
     * que já existia (ou null, se foi descartada) }. Falha: { error }.
     */
    async function guardar() {
      if (!blob) return { meta: guardado };
      const id = novoId();
      try { await arquivos().put(id, blob); } catch (e) { return { error: 'Não foi possível guardar o áudio neste navegador.' }; }
      return { meta: { id, type: blob.type, size: blob.size, seconds: segundos } };
    }
    function limpar() { parar(); blob = null; guardado = null; soltarUrl(); bDescartar.hidden = true; bOuvir.hidden = true; bGravar.hidden = false; bParar.hidden = true; msg.textContent = info; }

    return { no: caixa, temNovo: () => !!blob, gravando: () => !bParar.hidden, guardar, definir, limpar };
  }

  window.CicluzAudioNota = { criar, ouvir };
})();
