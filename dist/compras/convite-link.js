/*
 * Enviar Link de Cadastro (18/11/2026): botão e janela (modelo → gerar → copiar / WhatsApp / visualizar), usados por VND - Clientes
 * (4 modelos) e RET - Patrimônios (formulário completo).
 * SIMULAÇÃO PARA TESTE DO FLUXO (pedido de 18/11/2026): ainda não existe servidor que receba cadastros de quem abre o link
 * (P-30 em PROJECT_BRAIN/11). O link gerado aqui é um endereço real desta mesma página com ?cadastro-teste=<modelo>; ao abri-lo NESTE
 * navegador (sessão já aberta) aparece só o formulário do modelo, e o cadastro enviado fica salvo aqui como "Recebido" e inativo, à espera
 * de conferência. Não funciona em outro aparelho nem para quem não tem sessão. Quando o servidor existir, só gerarLink() e quem
 * trata o parâmetro mudam: a janela e os formulários continuam.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  if (!U) return;
  const { el, botao, entrada } = U;
  const PARAM = 'cadastro-teste';
  const MENSAGEM = 'Olá! Segue o link para preenchimento do seu cadastro. Por favor, confira as informações antes de enviar.';
  const AVISO = 'Link de teste (simulação): só funciona neste navegador, porque ainda não há servidor. O cadastro enviado por ele fica salvo aqui como "Recebido", inativo, aguardando conferência.';

  /** Único ponto para trocar pelo convite real quando o servidor existir: recebe o id do modelo e devolve { url }. */
  function gerarLink(modelo) {
    const u = new URL(location.href); u.search = ''; u.hash = ''; u.searchParams.set(PARAM, modelo);
    return { url: u.href, simulado: true };
  }
  /** Modelo pedido no endereço atual (ou ''). */
  const modeloDoEndereco = () => new URLSearchParams(location.search).get(PARAM) || '';
  /** Sai do modo "só o formulário": volta a mostrar o sistema e limpa o endereço. */
  function sairModoExterno() {
    document.body.classList.remove('cadastro-teste');
    try { const u = new URL(location.href); u.searchParams.delete(PARAM); history.replaceState(null, '', u.pathname + u.search + u.hash); } catch (e) { /* sem histórico */ }
  }
  /** Janela de confirmação depois do envio pelo link (só diz que recebeu depois de gravar de verdade neste navegador). */
  function confirmarRecebimento(corpo = {}) {
    U.dialogo({
      titulo: 'Cadastro recebido', ...corpo, aoFechar: sairModoExterno,
      montar: (form) => { form.append(el('p', null, 'Recebemos o seu cadastro. Ele será conferido antes de ser ativado.'), el('small', 'profiles-note', 'Simulação: o cadastro ficou salvo só neste navegador, como "Recebido".')); },
    });
  }
  /** Abre só o formulário do modelo do endereço, quando o sistema terminar de carregar. abridores: { id: () => abre o formulário }. */
  function iniciarPeloEndereco(abridores) {
    const id = modeloDoEndereco(); if (!id) return;
    if (!abridores[id]) { // modelo que não existe: não abre formulário nenhum
      const aviso = () => U.dialogo({ titulo: 'Link inválido', aoFechar: sairModoExterno, montar: (form) => { form.append(el('p', null, 'Este link de cadastro não é válido. Peça um novo link a quem enviou.')); } });
      if (document.readyState === 'complete') aviso(); else window.addEventListener('load', () => setTimeout(aviso, 600), { once: true });
      return;
    }
    document.body.classList.add('cadastro-teste');
    let tentativas = 0;
    if (document.readyState !== 'complete') { window.addEventListener('load', () => setTimeout(() => iniciarPeloEndereco(abridores), 600), { once: true }); return; }
    const tenta = () => {
      const abre = abridores[id] || abridores.padrao;
      if (abre && abre.pronto()) { abre.abrir(id); return; }
      if (++tentativas < 80) setTimeout(tenta, 250); else sairModoExterno();
    };
    tenta();
  }

  /** modelos: [{ id, titulo, icone, detalhe }]; visualizar(id) abre a prévia; cores: cores do diálogo. */
  function abrir({ modelos, cores = {}, visualizar }) {
    U.dialogo({
      titulo: 'Enviar link de cadastro', ...cores, largo: true, classe: 'compras-convite-link',
      montar: (form) => {
        let modelo = modelos[0].id; let url = '';
        const aviso = el('p', 'profiles-note compras-largo'); aviso.setAttribute('role', 'status');
        const campoLink = entrada('text', '', { readOnly: true, placeholder: 'Toque em Gerar Link' }); campoLink.setAttribute('aria-label', 'Link de cadastro');
        const bGerar = botao('Gerar Link', () => gerar(), 'btn'); const bCopiar = botao('Copiar Link', () => copiar(), 'btn secondary');
        const bZap = botao('Enviar pelo WhatsApp', () => zap(), 'btn secondary'); const bVer = botao('Visualizar Formulário', () => visualizar(modelo), 'btn secondary');
        const limpar = () => { url = ''; campoLink.value = ''; bCopiar.disabled = true; bZap.disabled = true; aviso.textContent = ''; };
        function gerar() { const r = gerarLink(modelo); url = r.url; campoLink.value = url; bCopiar.disabled = false; bZap.disabled = false; aviso.textContent = 'Link gerado.'; }
        async function copiar() {
          if (!url) return;
          try { await navigator.clipboard.writeText(url); aviso.textContent = 'Link copiado.'; } catch (e) { campoLink.select(); aviso.textContent = 'Não foi possível copiar sozinho: o link está selecionado, copie com Ctrl+C.'; }
        }
        function zap() { if (url) window.open('https://wa.me/?text=' + encodeURIComponent(MENSAGEM + '\n' + url), '_blank', 'noopener'); }

        const secModelo = el('fieldset', 'compras-fieldset compras-largo'); secModelo.append(el('legend', null, '1. Modelo do cadastro'));
        if (modelos.length > 1) {
          secModelo.append(U.cartoesEscolha({
            rotulo: 'Modelo do cadastro', multiplo: false,
            opcoes: modelos.map((m, i) => ({ id: m.id, titulo: m.titulo, icone: m.icone, cor: 'var(--menu-accent)', marcado: i === 0 })),
            aoMudar: (m) => { modelo = m[0]; limpar(); },
          }));
        } else secModelo.append(el('p', null, modelos[0].detalhe));

        const secLink = el('fieldset', 'compras-fieldset compras-largo'); secLink.append(el('legend', null, '2. Link'));
        const linhaLink = el('div', 'compras-convite-linha'); linhaLink.append(campoLink, bGerar);
        const acoes = el('div', 'compras-convite-acoes'); acoes.append(bCopiar, bZap, bVer);
        secLink.append(linhaLink, acoes, aviso);

        form.append(secModelo, secLink, el('p', 'compras-convite-simulacao compras-largo', AVISO));
        limpar();
      },
    });
  }
  /** Botão do cabeçalho da lista (ao lado do botão de cadastro). */
  const botaoEnviar = (opcoes) => U.botaoTitulo('Enviar Link', 'Enviar link de cadastro', () => abrir(opcoes), U.ICONES.send);
  window.CicluzConviteLink = { botao: botaoEnviar, abrir, MENSAGEM, PARAM, modeloDoEndereco, sairModoExterno, confirmarRecebimento, iniciarPeloEndereco };
})();
