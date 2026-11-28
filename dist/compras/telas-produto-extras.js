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
  /**
   * Bloco de foto do formulário (Tirar foto, Galeria, arrastar e soltar, Remover). Devolve { no, valor() }.
   * textos: para outro cadastro reaproveitar o bloco (ex.: peça do patrimônio) com as próprias frases.
   */
  function campoFoto(atual, nomeProduto, textos = {}) {
    const T = { vazio: 'Adicione uma foto do produto', pendente: 'A foto nova é gravada ao salvar o produto.', coisa: 'produto', ...textos };
    let valor = atual || null;
    let pendente = false;
    // Foto no padrão ANEXOS (Rodrigo, 26/11/2026): uma linha "Foto" com o resumo e a seta; tocar abre o painel Anexar (Tirar foto, Escolher da galeria); a foto
    // escolhida aparece embaixo da linha, com a miniatura e o excluir (círculo cinza, vermelho ao passar). Nada de botões soltos no meio do formulário.
    const box = el('div', 'compras-foto transferencia-tela');
    const erro = el('p', 'profiles-error');
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
    box.addEventListener('dragover', (e) => { e.preventDefault(); box.classList.add('arrastando'); });
    box.addEventListener('dragleave', () => box.classList.remove('arrastando'));
    box.addEventListener('drop', (e) => { e.preventDefault(); box.classList.remove('arrastando'); receber(e.dataTransfer.files[0]); });
    const quadro = el('div', 'transferencia-quadro');
    const abre = el('button', 'transferencia-linha transferencia-linha-acao'); abre.type = 'button';
    const resumo = el('span', 'transferencia-linha-valor');
    const seta = el('span', 'transferencia-seta'); seta.setAttribute('aria-hidden', 'true'); seta.innerHTML = U.svg('<path d="m9 5 7 7-7 7"/>');
    abre.append(el('span', 'transferencia-linha-rotulo', textos.rotulo || 'Foto'), resumo, seta);
    const painel = el('div', 'compras-escolha-painel compras-aniv-painel compras-data-painel transferencia-anexos-painel');
    const abrirPainel = U.flutuante(abre, painel);
    const OPCOES = [['Tirar foto', '<path d="M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/>', () => camera.click()], ['Escolher da galeria', '<path d="M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9.5h.01"/>', () => galeria.click()]];
    painel.append(el('p', 'transferencia-folha-titulo', 'Anexar foto'));
    const opcoes = el('div', 'transferencia-quadro');
    OPCOES.forEach(([nome, icone, acao]) => { const l = el('button', 'transferencia-linha transferencia-linha-acao'); l.type = 'button'; const c = el('span', 'transferencia-circulo'); c.setAttribute('aria-hidden', 'true'); c.innerHTML = U.svg(icone); l.append(el('span', 'transferencia-linha-rotulo', nome), c); l.onclick = () => { abrirPainel(false); acao(); }; opcoes.append(l); });
    painel.append(opcoes);
    abre.onclick = () => abrirPainel(painel.hidden);
    const previa = el('div', 'compras-foto-previa');
    function desenha() {
      resumo.textContent = valor ? '1 foto' : 'Nenhuma';
      previa.replaceChildren();
      if (valor) {
        const l = el('div', 'transferencia-linha');
        const img = el('img', 'compras-foto-miniatura'); img.src = valor; img.alt = 'Foto de ' + (nomeProduto() || T.coisa); img.onclick = () => fotoAmpliada(valor, nomeProduto());
        const nome = el('span', 'transferencia-linha-rotulo', 'Foto de ' + (nomeProduto() || T.coisa)); nome.style.flex = '1 1 auto'; nome.style.maxWidth = 'none';
        const del = el('button', 'transferencia-circulo transferencia-circulo-excluir'); del.type = 'button'; del.title = 'Remover foto'; del.setAttribute('aria-label', 'Remover foto'); del.innerHTML = U.svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'); del.onclick = () => { valor = null; pendente = true; desenha(); };
        l.append(img, nome, del);
        if (pendente) l.append(Object.assign(el('small', 'profiles-note'), { textContent: T.pendente }));
        previa.append(l);
      }
    }
    desenha();
    quadro.append(abre, previa, painel);
    box.append(quadro, erro, camera, galeria);
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
      telaU = U.criarTela({ id: 'compras-unidades', titulo: 'Unidades de Medida', caminho: 'Saídas · Mercadorias / Cadastros Geral / Unidades de Medida', icone: 'lista', voltar: () => menuBack(3, 'Cadastros Geral')() });
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
    // Lista no padrão das outras (18/11/2026, Rodrigo): tocar na linha edita; a seta à direita revela Editar e Excluir.
    const linhas = el('div', 'compras-lista');
    if (!lista.length) linhas.append(U.vazio('Nenhuma unidade cadastrada.', 'Use o "+" para cadastrar.'));
    lista.forEach((u) => {
      const uso = emUso(u.sigla);
      linhas.append(U.linhaLista({
        icone: 'lista', titulo: u.sigla, detalhe: u.nome + (uso ? ' · em uso em produtos' : ''), estado: u.ativa === false ? 'Inativa' : 'Ativa',
        acoes: { rotulo: u.sigla + ' - ' + u.nome, lista: linhas, aoEditar: () => editarUnidade(u), aoExcluir: () => excluirUnidade(u) },
      }));
      if (u.ativa === false) linhas.lastElementChild.classList.add('inativo');
    });
    // Mesmo cabeçalho de lista dos outros cadastros: botão de cadastrar à esquerda e a quantidade na ponta.
    const ativas = lista.filter((u) => u.ativa !== false).length;
    const sec = U.secao('Unidades', undefined, U.pontaDaLista(ativas, ativas + (ativas === 1 ? ' unidade ativa' : ' unidades ativas')));
    sec.querySelector('.compras-secao-cab h3').replaceChildren(U.botaoTitulo('Nova Unidade', 'Cadastrar unidade', () => editarUnidade()));
    sec.append(linhas);
    telaU.body.replaceChildren(topo, sec);
  }
  /** Unidade em uso em produto não é excluída (o produto ficaria sem a sigla): a saída é desativar. */
  function excluirUnidade(u) {
    if (emUso(u.sigla)) {
      U.dialogo({ titulo: 'Unidade não pode ser excluída', montar: (form) => { form.append(el('p', null, '"' + u.sigla + ' - ' + u.nome + '" está em uso em produtos. Para tirar de uso, edite e deixe a unidade inativa.')); } });
      return;
    }
    U.confirmar('Excluir unidade?', '"' + u.sigla + ' - ' + u.nome + '" não está em uso e será excluída. Não dá para desfazer.', 'Excluir', () => {
      const ok = S.transacao((d) => { d.unidades = d.unidades.filter((o) => o.id !== u.id); });
      if (!ok) return 'Não foi possível excluir neste navegador.';
      U.avisar('Unidade excluída.');
      renderUnidades();
    });
  }
  function editarUnidade(u) {
    U.dialogo({
      titulo: u ? 'Editar unidade' : 'Cadastro unidade', classe: 'compras-form-padrao',
      montar: (form) => {
        const sigla = entrada('text', u?.sigla || '', { maxLength: 6, required: true });
        sigla.addEventListener('input', () => { sigla.value = sigla.value.toUpperCase().replace(/[^A-Z0-9/]/g, ''); });
        if (u && emUso(u.sigla)) sigla.readOnly = true;
        const nome = entrada('text', u?.nome || '', { maxLength: 40, required: true });
        // Mesmo desenho dos outros cadastros: um quadro com o nome na moldura; a Situação (interruptor) abre o quadro.
        const situacao = U.quadroSituacao('Situação da unidade', u ? u.ativa !== false : true, { feminino: true, dica: 'Unidade inativa sai das listas de escolha. Nada é apagado.' });
        situacao.classList.add('compras-largo');
        const quadro = el('fieldset', 'compras-fieldset compras-largo');
        quadro.append(el('legend', null, 'Dados da unidade'), situacao, campo('Sigla *', sigla, u && emUso(u.sigla) ? 'Sigla em uso em produtos: não pode ser trocada.' : 'Até 6 letras, ex.: CX, SACO, PCT.'), campo('Nome *', nome));
        form.append(quadro);
        return { sigla, nome, c: { get checked() { return situacao.ativo; } } };
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
