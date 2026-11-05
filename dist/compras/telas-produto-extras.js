/*
 * Produtos — peças de apoio do cadastro (S1: ProdutoScanner, ProdutoFoto, ProdutoFotoAmpliada,
 * pages/produtos/[id]/historico.vue) e o cadastro de Unidades de medida (S1: /unidades_medida).
 * O S2 não tem servidor: a foto é reduzida e guardada no navegador; o leitor usa a câmera do aparelho.
 */
(function () {
  'use strict';
  const S = window.CicluzComprasDados;
  const U = window.CicluzComprasUI;
  const M = window.CicluzCompras;
  const { el, botao, campo, entrada } = U;

  /* ---------- Leitor de código de barras pela câmera ---------- */
  /**
   * Abre a câmera traseira e preenche o EAN na primeira leitura. O S1 usa a biblioteca @zxing/browser;
   * aqui é o leitor nativo do navegador (BarcodeDetector), com o mesmo comportamento visível.
   */
  function lerCodigoDeBarras(aoLer) {
    let fluxo = null;
    let ativo = true;
    let jaLeu = false;
    U.dialogo({
      titulo: 'Ler código de barras',
      montar: (form) => {
        const video = el('video', 'compras-scanner-video');
        video.muted = true; video.autoplay = true; video.playsInline = true;
        const moldura = el('div', 'compras-scanner');
        moldura.append(video, el('span', 'compras-scanner-alvo'));
        const msg = el('p', 'profiles-note', 'Aponte a câmera para o código de barras. Nada é enviado sem você confirmar.');
        const erro = el('p', 'profiles-error');
        form.append(moldura, msg, erro);
        (async () => {
          if (!('BarcodeDetector' in window) || !navigator.mediaDevices?.getUserMedia) {
            erro.textContent = 'Este navegador não lê código pela câmera. Use o leitor USB ou digite o código.';
            return;
          }
          try {
            fluxo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            video.srcObject = fluxo;
            const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });
            const procurar = async () => {
              if (!ativo || jaLeu) return;
              try {
                const achados = await detector.detect(video);
                if (achados.length && !jaLeu) { jaLeu = true; aoLer(achados[0].rawValue); form.closest('dialog').close(); return; }
              } catch (e) { /* quadro ainda não pronto */ }
              requestAnimationFrame(procurar);
            };
            video.addEventListener('playing', procurar, { once: true });
          } catch (e) {
            erro.textContent = e && e.name === 'NotFoundError' ? 'Nenhuma câmera encontrada neste aparelho. Use o leitor USB ou digite o código.' : 'Não foi possível acessar a câmera. Permita o acesso e tente de novo.';
          }
        })();
      },
      aoFechar: () => { ativo = false; if (fluxo) fluxo.getTracks().forEach((t) => t.stop()); },
    });
  }

  /* ---------- Foto ---------- */
  const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];
  const LIMITE_FOTO = 8 * 1024 * 1024;
  /** Reduz a imagem (lado maior 320 px, JPEG): a foto vai no documento do Compras, que o banco limita a 4 MB. */
  function reduzirImagem(arquivo) {
    return new Promise((ok, falha) => {
      const leitor = new FileReader();
      leitor.onerror = () => falha(new Error('leitura'));
      leitor.onload = () => {
        const img = new Image();
        img.onerror = () => falha(new Error('imagem'));
        img.onload = () => {
          const escala = Math.min(1, 320 / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * escala); c.height = Math.round(img.height * escala);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          ok(c.toDataURL('image/jpeg', 0.8));
        };
        img.src = leitor.result;
      };
      leitor.readAsDataURL(arquivo);
    });
  }
  /** Bloco de foto do formulário (Tirar foto, Galeria, arrastar e soltar, Remover). Devolve { no, valor() }. */
  function campoFoto(atual, nomeProduto) {
    let valor = atual || null;
    let pendente = false;
    const box = el('div', 'compras-foto');
    const area = el('div', 'compras-foto-area');
    const erro = el('p', 'profiles-error');
    const acoes = el('div', 'compras-foto-acoes');
    const camera = entrada('file'); camera.accept = 'image/*'; camera.setAttribute('capture', 'environment'); camera.hidden = true;
    const galeria = entrada('file'); galeria.accept = TIPOS_FOTO.join(','); galeria.hidden = true;
    const receber = async (arquivo) => {
      erro.textContent = '';
      if (!arquivo) return;
      if (!TIPOS_FOTO.includes(arquivo.type)) { erro.textContent = 'Formato não aceito. Envie JPEG, PNG ou WebP.'; return; }
      if (arquivo.size > LIMITE_FOTO) { erro.textContent = 'Foto acima de 8 MB.'; return; }
      try { valor = await reduzirImagem(arquivo); pendente = true; desenha(); } catch (e) { erro.textContent = 'Não foi possível ler a imagem.'; }
    };
    camera.onchange = () => receber(camera.files[0]);
    galeria.onchange = () => receber(galeria.files[0]);
    area.addEventListener('dragover', (e) => { e.preventDefault(); area.classList.add('arrastando'); });
    area.addEventListener('dragleave', () => area.classList.remove('arrastando'));
    area.addEventListener('drop', (e) => { e.preventDefault(); area.classList.remove('arrastando'); receber(e.dataTransfer.files[0]); });
    function desenha() {
      area.replaceChildren();
      acoes.replaceChildren(botao('Tirar foto', () => camera.click()), botao('Galeria', () => galeria.click()));
      if (valor) {
        const img = el('img'); img.src = valor; img.alt = 'Foto de ' + (nomeProduto() || 'produto');
        img.onclick = () => fotoAmpliada(valor, nomeProduto());
        area.append(img);
        if (pendente) area.append(el('small', 'profiles-note', 'A foto nova é gravada ao salvar o produto.'));
        acoes.append(botao('Remover', () => { valor = null; pendente = true; desenha(); }, 'btn secondary perigo-texto'));
      } else {
        area.append(el('b', null, 'Adicione uma foto do produto'), el('small', 'profiles-note', 'JPEG, PNG ou WebP · até 8 MB'));
      }
    }
    desenha();
    box.append(area, acoes, erro, camera, galeria);
    return { no: box, valor: () => valor };
  }
  function fotoAmpliada(src, titulo) {
    U.dialogo({
      titulo: titulo || 'Foto do produto',
      largo: true,
      montar: (form) => { const img = el('img', 'compras-foto-ampliada'); img.src = src; img.alt = titulo || 'Foto do produto'; form.append(img); },
    });
  }

  /* ---------- Histórico de nomes ---------- */
  function historicoDeNomes(produto) {
    const lista = S.dados.historicoNomes.filter((h) => h.produtoId === produto.id).sort((a, b) => b.alteradoEm.localeCompare(a.alteradoEm)).slice(0, 200);
    U.dialogo({
      titulo: 'Histórico de nomes',
      subtitulo: 'Alterações registradas para este produto',
      montar: (form) => {
        form.append(U.tabela([
          ['Data', (h) => new Date(h.alteradoEm).toLocaleString('pt-BR')],
          ['Nome anterior', (h) => h.nomeAnterior],
          ['Novo nome', (h) => h.nomeNovo],
          ['Alterado por', (h) => h.alteradoPor || 'Usuário removido'],
        ], lista, { vazioTexto: 'Nenhuma alteração de nome registrada.' }));
        if (lista.length === 200) form.append(U.nota('Exibindo as 200 alterações mais recentes.'));
      },
    });
  }

  /* ---------- Cadastro de Unidades de medida ---------- */
  let telaU = null;
  function abrirUnidades() {
    if (!telaU) {
      telaU = U.criarTela({ id: 'compras-unidades', titulo: 'Unidades de medida', caminho: 'Saídas · Mercadorias / Cadastros Geral / Unidades de medida', icone: 'lista', voltar: () => menuBack(3, 'Cadastros Geral')() });
      U.atalho(telaU, 'Nova unidade', 'M12 5v14M5 12h14', () => editarUnidade(), { criar: true });
    }
    telaU.ativar();
    renderUnidades();
  }
  function emUso(sigla) {
    return S.dados.produtos.some((p) => [p.embalagem, p.medidaCompra, p.unidadeIndividual].includes(sigla) || (p.conversoes || []).some((c) => c.unidade === sigla));
  }
  function renderUnidades() {
    const lista = S.dados.unidades.slice().sort((a, b) => (a.ativa === b.ativa ? a.sigla.localeCompare(b.sigla) : a.ativa === false ? 1 : -1));
    const topo = el('div', 'profiles-controls');
    topo.append(U.nota('Siglas usadas no "como se compra" (embalagem e medida de compra), na medida base e nas conversões do produto.'));
    telaU.body.replaceChildren(topo, U.tabela([
      ['Sigla', (u) => { const s = el('b', null, u.sigla); return s; }],
      ['Nome', (u) => u.nome],
      ['Situação', (u) => U.situacao(u.ativa === false ? 'Inativa' : 'Ativa', u.ativa === false ? 'neutro' : 'positivo')],
      ['Em uso', (u) => (emUso(u.sigla) ? 'Sim' : '—')],
    ], lista, { aoClicar: editarUnidade, classeLinha: (u) => (u.ativa === false ? 'inativo' : '') }));
  }
  function editarUnidade(u) {
    U.dialogo({
      titulo: u ? 'Editar unidade' : 'Nova unidade',
      montar: (form) => {
        const sigla = entrada('text', u?.sigla || '', { maxLength: 6, required: true });
        sigla.addEventListener('input', () => { sigla.value = sigla.value.toUpperCase().replace(/[^A-Z0-9/]/g, ''); });
        if (u && emUso(u.sigla)) sigla.readOnly = true;
        const nome = entrada('text', u?.nome || '', { maxLength: 40, required: true });
        const ativa = el('label', 'compras-interruptor');
        const c = entrada('checkbox'); c.checked = u ? u.ativa !== false : true;
        ativa.append(c, el('span', null, 'Unidade ativa'));
        form.append(campo('Sigla *', sigla, u && emUso(u.sigla) ? 'Sigla em uso em produtos: não pode ser trocada.' : 'Até 6 letras, ex.: CX, SACO, PCT.'), campo('Nome *', nome), ativa);
        return { sigla, nome, c };
      },
      salvar: (x) => {
        const sigla = x.sigla.value.trim().toUpperCase();
        const nome = x.nome.value.trim();
        if (!sigla || !nome) return 'Informe a sigla e o nome.';
        if (S.dados.unidades.some((o) => o.id !== u?.id && o.sigla === sigla)) return 'Já existe uma unidade com esta sigla.';
        const ok = S.transacao((d) => {
          if (u) Object.assign(d.unidades.find((o) => o.id === u.id), { sigla, nome, ativa: x.c.checked });
          else d.unidades.push({ id: S.novoId('un'), sigla, nome, ativa: x.c.checked });
        });
        if (!ok) return 'Não foi possível salvar neste navegador.';
        U.avisar('Unidade salva.');
        renderUnidades();
      },
    });
  }

  M.registrar('unidades', abrirUnidades);
  window.CicluzProdutoExtras = { lerCodigoDeBarras, campoFoto, fotoAmpliada, historicoDeNomes };
})();
