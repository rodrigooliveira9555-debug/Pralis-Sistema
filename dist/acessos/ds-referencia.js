/*
 * Configurações → Design System → Design System Referência (27/11/2026, pedido do Washington).
 * O catálogo visual de TODOS os elementos HTML (texto, botões, campos, seleção, tabelas, navegação, feedback, janelas, mídia, layout,
 * movimento, acessibilidade e páginas completas), em claro e escuro, com os estados lado a lado. É uma página própria
 * (acessos/design-system-referencia.html) mostrada aqui dentro de um quadro. Só leitura: nada é gravado.
 * Por que srcdoc e não src: o vercel.json publica com X-Frame-Options DENY e frame-ancestors 'none', que bloqueiam qualquer quadro que aponte
 * para um endereço. O texto da página é lido (fetch) e entregue ao quadro em srcdoc, que não passa por esse bloqueio e não exige mexer nos
 * cabeçalhos de segurança. O tema do sistema vai no data-tema do quadro (a página lê isso ao abrir).
 * Os tópicos Formulário linha por linha, Cores, Botões etc. (design-system.js) continuam sendo a regra escrita do sistema; esta página é a vitrine.
 */
(function () {
  'use strict';
  const A = window.CicluzAcessos; const U = window.CicluzComprasUI;
  if (!A || !U) return;
  const { el } = U;
  const ARQUIVO = 'acessos/design-system-referencia.html?v=20261127';
  let tela = null; let quadro = null; let texto = ''; let temaCarregado = '';
  const tema = () => (document.body.classList.contains('dark-theme') ? 'dark' : 'light');

  async function carregar() {
    if (texto) return texto;
    const r = await fetch(ARQUIVO, { cache: 'no-cache' });
    if (!r.ok) throw new Error('http ' + r.status);
    texto = await r.text();
    return texto;
  }

  async function abrir() {
    if (!tela) {
      tela = A.criarTela({ id: 'acessos-ds-referencia', titulo: 'Design System Referência', tela: 'ds-referencia' });
      quadro = el('iframe', 'ds-referencia-quadro');
      quadro.title = 'Design System Referência: catálogo visual dos elementos HTML';
      quadro.setAttribute('allow', 'clipboard-write; fullscreen');
      quadro.setAttribute('allowfullscreen', '');
    }
    tela.ativar();
    const nota = U.nota('Todos os elementos HTML do sistema, com estados e nos temas claro e escuro. Só leitura: nada é gravado aqui. A regra escrita de cada assunto está nos outros tópicos do Design System.');
    tela.body.replaceChildren(nota, quadro);
    const t = tema();
    if (quadro.srcdoc && temaCarregado === t) return;
    try {
      const html = await carregar();
      quadro.dataset.tema = t; temaCarregado = t;
      quadro.srcdoc = html;
    } catch (e) {
      tela.body.replaceChildren(nota, U.vazio('Não foi possível carregar a referência.', 'Confira a conexão e abra de novo. Nada foi alterado.'));
      quadro.removeAttribute('srcdoc'); temaCarregado = '';
    }
  }
  A.registrar('ds-referencia', abrir);
  window.CicluzDesignSystemReferencia = { abrir };
})();
