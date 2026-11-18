/*
 * Enviar Link de Cadastro (18/11/2026): o botão "Enviar" comum (U.botaoEnviar) com os campos do link — a escolha do modelo quando há
 * mais de um (em VND - Clientes: PF ou PJ), Copiar link e Visualizar formulário. Usado por VND - Clientes e RET - Patrimônios.
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
  const { el, botao, campo, seletor } = U;
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

  const ASSUNTO = 'Link para o seu cadastro';
  /** Endereço que abre o canal com a mensagem e o link já escritos (quem envia escolhe o contato no próprio aplicativo). */
  function enderecoDoCanal(canal, url, mensagem) {
    const texto = encodeURIComponent(mensagem + '\n' + url);
    if (canal === 'whatsapp') return 'https://wa.me/?text=' + texto;
    if (canal === 'email') return 'mailto:?subject=' + encodeURIComponent(ASSUNTO) + '&body=' + texto;
    return 'sms:?&body=' + texto;
  }
  /**
   * Botão do cabeçalho da lista (ao lado do botão de cadastro). modelos: [{ id, titulo }]; rotuloModelo: nome do campo de
   * escolha quando há mais de um modelo (ex.: "Tipo de cliente"); visualizar(id) abre a prévia do formulário.
   */
  function botaoEnviar({ modelos, rotuloModelo = 'Modelo do cadastro', visualizar }) {
    const aviso = el('p', 'profiles-note'); aviso.setAttribute('role', 'status');
    const escolha = modelos.length > 1 ? seletor(modelos.map((m) => [m.id, m.titulo]), modelos[0].id) : null;
    const modelo = () => (escolha ? escolha.value : modelos[0].id);
    if (escolha) escolha.addEventListener('change', () => { aviso.textContent = ''; });
    // Prazo de resposta e Mensagem (18/11/2026, Rodrigo): o mesmo prazo do Enviar de Fornecedores; a mensagem vem escrita e pode ser
    // ajustada antes de enviar. O que vai para o canal é a mensagem, o prazo por extenso e o link.
    const prazo = U.prazoResposta();
    const mensagem = el('textarea'); mensagem.rows = 4; mensagem.maxLength = 400; mensagem.value = MENSAGEM; mensagem.setAttribute('aria-label', 'Mensagem');
    const textoDoEnvio = () => [mensagem.value.trim() || MENSAGEM, prazo.frase()].filter(Boolean).join('\n');
    async function copiar() {
      const { url } = gerarLink(modelo());
      try { await navigator.clipboard.writeText(url); aviso.textContent = 'Link copiado.'; } catch (e) { aviso.textContent = 'Não foi possível copiar sozinho. Use um dos canais ao lado.'; }
    }
    const acoes = el('div', 'compras-enviar-acoes');
    acoes.append(botao('Copiar link', copiar, 'btn secondary'), botao('Visualizar formulário', () => visualizar(modelo()), 'btn secondary'));
    return U.botaoEnviar({
      dica: 'Enviar link de cadastro', campos: [...(escolha ? [campo(rotuloModelo, escolha)] : []), ...prazo.campos, campo('Mensagem', mensagem)], depois: [acoes, aviso, el('small', 'profiles-note', AVISO)],
      aoCanal: (canal) => { window.open(enderecoDoCanal(canal, gerarLink(modelo()).url, textoDoEnvio()), '_blank', 'noopener'); aviso.textContent = 'Link gerado.'; },
    });
  }
  window.CicluzConviteLink = { botao: botaoEnviar, MENSAGEM, PARAM, modeloDoEndereco, sairModoExterno, confirmarRecebimento, iniciarPeloEndereco };
})();
