/*
 * Rotas do site: cada tela ganha um endereço próprio (#/setor/item/tela/…). Com isso o Voltar do
 * navegador volta para a tela anterior, o F5 reabre a mesma tela e dá para mandar o link de uma tela.
 *
 * Não muda como as telas abrem. Grava o caminho dos cliques (menu lateral → item → cartões) e, para
 * reabrir, repete os mesmos cliques nos botões reais. Exemplo: Transferências › Lançamentos ›
 * Abertura de Caixa = #/transferencias-contas/lancamentos/caixa-abertura.
 *
 * Fica de fora: endereços que não começam com "#/" (o link de cadastro completo, #cadastro-completo/…,
 * continua com o people.js) e o que muda dentro de uma tela sem passar por cartão (abas, filtros).
 */
(function (raiz) {
  const slug = (texto) => String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  // "Saídas · Despesas / Custos" → "saidas-despesas"; "Agenda/Atividades" → "agenda"; "Visão geral" → "visao-geral".
  const slugMenu = (nome) => {
    const [antes, depois] = String(nome || '').split(' · ');
    return slug(antes.split('/')[0]) + (depois ? '-' + slug(depois.trim().split(/[\s/]/)[0]) : '');
  };
  const lerEndereco = (hash) => {
    const m = /^#\/(.*)$/.exec(hash || '');
    if (!m) return null;
    return m[1].split('/').filter(Boolean).map((parte) => { try { return decodeURIComponent(parte); } catch { return parte; } });
  };
  const montarEndereco = (rota) => '#/' + rota.map(encodeURIComponent).join('/');

  const api = { slug, slugMenu, lerEndereco, montarEndereco };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document === 'undefined') return;

  const nav = document.querySelector('.nav-tree');
  if (!nav) return;
  const TITULO = document.title;
  const CARTAO = '.record-grid button[data-target]';
  const visivel = (el) => el.getClientRects().length > 0;
  const textoBotao = (b) => b.textContent.trim();
  const menus = () => [...nav.querySelectorAll('details[data-menu-name]')];

  let rota = [];          // tela aberta agora
  let reabrindo = false;  // repetindo cliques: não grava
  let emClique = false;   // o openSection chamado dentro de um clique já gravado não grava de novo

  function titulo() {
    const trilha = document.getElementById('crumb')?.textContent.trim() || '';
    const nome = !rota.length ? '' : rota[0] === 'visao-geral' ? 'Visão Geral' : trilha.split(' / ').pop();
    document.title = nome ? nome + ' · ' + TITULO : TITULO;
  }
  // Cada grade de cartões guarda a rota em que apareceu: um cartão clicado nela soma a partir dali,
  // mesmo que a pessoa tenha voltado para a grade sem passar pelo menu.
  function marcarGrades() {
    document.querySelectorAll('.record-grid').forEach((g) => { if (visivel(g) && g.dataset.rota === undefined) g.dataset.rota = rota.join('/'); });
  }
  function depois() { setTimeout(() => { marcarGrades(); titulo(); }, 0); }

  function gravar(nova) {
    if (reabrindo || nova.join('/') === rota.join('/')) return;
    rota = nova;
    history.pushState({ rota }, '', rota.length ? montarEndereco(rota) : location.pathname + location.search);
    depois();
  }

  // Na janela, em captura: roda antes dos ouvintes do document que param o clique (documents.js).
  raiz.addEventListener('click', (e) => {
    if (reabrindo || !(e.target instanceof Element)) return;
    const item = e.target.closest('.nav-tree .children > button');
    const geral = !item && e.target.closest('.nav-tree .overview-link');
    // Itens diretos do menu, sem submenu (Entrevistas).
    const direto = !item && !geral && e.target.closest('.nav-tree details[data-menu-name] > summary');
    const cartao = !item && !geral && !direto && e.target.closest(CARTAO);
    let nova = null;
    if (item) {
      const menu = item.closest('details[data-menu-name]');
      if (menu) nova = [slugMenu(menu.dataset.menuName), slug(textoBotao(item))];
    } else if (geral) nova = ['visao-geral'];
    else if (direto && !direto.parentElement.querySelector('.children')) nova = [slugMenu(direto.parentElement.dataset.menuName)];
    else if (cartao) {
      const grade = cartao.closest('.record-grid');
      const base = grade.dataset.rota !== undefined ? grade.dataset.rota.split('/').filter(Boolean) : rota;
      if (base.length >= 2) nova = [...base, slug(cartao.dataset.target)];
    }
    if (!nova) return;
    emClique = true;
    setTimeout(() => { emClique = false; }, 0);
    gravar(nova);
  }, true);

  // Voltar de dentro de uma tela (seta do cabeçalho) chama openSection sem clique no menu.
  const abrirSecao = raiz.openSection;
  if (typeof abrirSecao === 'function') {
    raiz.openSection = function (pai, secao, ...resto) {
      const volta = abrirSecao.call(this, pai, secao, ...resto);
      if (!emClique && !reabrindo) {
        const menu = menus().find((d) => d.dataset.menuName === pai);
        const existe = menu && [...menu.querySelectorAll('.children > button')].some((b) => slug(textoBotao(b)) === slug(secao));
        if (existe) gravar([slugMenu(pai), slug(secao)]);
        else if (rota.length > 2) gravar(rota.slice(0, -1)); // subgrade (ex.: Grupos): volta um nível
      }
      return volta;
    };
  }

  const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
  async function achar(busca) {
    for (let i = 0; i < 30; i += 1) { const el = busca(); if (el) return el; await pausa(50); }
    return null;
  }

  async function reabrir(caminho) {
    reabrindo = true;
    const feito = [];
    try {
      const [m, i, ...cartoes] = caminho;
      if (m === 'visao-geral') { nav.querySelector('.overview-link')?.click(); feito.push(m); return; }
      const menu = menus().find((d) => slugMenu(d.dataset.menuName) === m);
      if (!menu) return;
      const filhos = menu.querySelector('.children');
      if (!filhos) { menu.querySelector('summary')?.click(); feito.push(m); return; }
      const botao = [...filhos.querySelectorAll(':scope > button')].find((b) => slug(textoBotao(b)) === i);
      if (!botao) return;
      menu.open = true;
      botao.click();
      feito.push(m, i);
      for (const alvo of cartoes) {
        const c = await achar(() => [...document.querySelectorAll(CARTAO)].find((x) => visivel(x) && slug(x.dataset.target) === alvo));
        if (!c) break;
        c.click();
        feito.push(alvo);
        await pausa(0);
      }
    } finally {
      reabrindo = false;
      rota = feito;
      // Endereço que não leva a lugar nenhum (tela removida, link errado) fica só com o que abriu.
      if (feito.join('/') !== caminho.join('/')) history.replaceState({ rota }, '', feito.length ? montarEndereco(feito) : location.pathname + location.search);
      if (feito.length) document.dispatchEvent(new Event('cicluz-close-menu'));
      depois();
    }
  }

  raiz.addEventListener('popstate', () => {
    const caminho = lerEndereco(location.hash);
    if (caminho) { if (caminho.join('/') !== rota.join('/')) reabrir(caminho); return; }
    if (!location.hash) { rota = []; titulo(); document.dispatchEvent(new Event('cicluz-open-menu')); }
  });
  raiz.addEventListener('load', () => setTimeout(() => {
    const caminho = lerEndereco(location.hash);
    if (caminho) reabrir(caminho);
  }, 0));

  function abrirPorCodigo(destino) {
    const caminho = Array.isArray(destino) ? destino : lerEndereco(destino) || [];
    if (caminho.join('/') !== rota.join('/')) history.pushState({ rota: caminho }, '', montarEndereco(caminho));
    return reabrir(caminho);
  }

  raiz.CicluzRotas = { ...api, atual: () => [...rota], abrir: abrirPorCodigo };
})(typeof window !== 'undefined' ? window : globalThis);
