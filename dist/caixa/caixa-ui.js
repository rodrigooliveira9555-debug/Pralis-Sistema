/*
 * Caixa — interface comum (casca): tela no padrão do S2 (criarTela), diálogo na cor de Vendas (dialogo), "Ver como" (seletorPerfil,
 * faixaDemo) e o registro/abertura das telas. O estado e as ações moram em modulo.js (CicluzCaixa); aqui só se desenha.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const telas = {};

  /* ---------- Telas, diálogos e "Ver como" ---------- */

  /** "Ver como": uma escolha só, guardada no C.estado. `perfis` limita as opções da tela. */
  function seletorPerfil(aoMudar, perfis) {
    const opcoes = perfis ? C.PERFIS.filter(([v]) => perfis.includes(v)) : C.PERFIS;
    if (!opcoes.some(([v]) => v === C.estado.perfil)) C.estado.perfil = opcoes[0][0];
    const box = U.el('div', 'caixa-perfil');
    box.append(U.el('span', 'compras-rotulo', 'Ver como'), U.chips(opcoes, C.estado.perfil, (v) => { C.estado.perfil = v; aoMudar(); }));
    return box;
  }
  function faixaDemo(texto, aoMudar, perfis) {
    const f = U.el('div', 'caixa-aviso caixa-faixa');
    f.append(U.el('p', 'profiles-note', texto));
    if (aoMudar) f.append(seletorPerfil(aoMudar, perfis));
    return f;
  }

  /** Tela no padrão do S2 (view > panel > head + content), na cor de Vendas. */
  function criarTela({ id, titulo, caminho, voltar }) {
    const view = U.el('section', 'view caixa-view');
    view.id = id;
    const panel = U.el('div', 'panel');
    const head = U.el('div', 'head');
    const badge = U.el('span', 'sector-icon config-inherit-icon header-origin-icon');
    badge.setAttribute('aria-hidden', 'true');
    const heading = U.el('div');
    heading.append(U.el('h2', null, titulo), U.el('p', null, caminho));
    head.append(badge, heading);
    const body = U.el('div', 'content profiles-content compras-content caixa-content');
    panel.append(head, body);
    view.append(panel);
    document.querySelector('main').append(view);
    setViewOriginColor(view, C.COR);
    panel.style.setProperty('--panel-text', C.COR_TEXTO);
    addShortcuts(id, voltar || C.voltar);
    return {
      view, body,
      ativar() {
        badge.innerHTML = C.icone();
        badge.style.background = '';
        document.querySelectorAll('.view').forEach((x) => x.classList.remove('show'));
        view.classList.add('show');
        const crumb = document.getElementById('crumb');
        if (crumb) crumb.textContent = caminho;
        const t = document.getElementById('title');
        if (t) t.textContent = titulo;
        normalizeHeaderActions(view);
        body.scrollTop = 0;
      },
    };
  }
  /* ---------- Formulário linha por linha (padrão da Nova Transferência, 27/11/2026) ----------
   * Peças únicas para TODAS as telas e janelas do Caixa que pedem dados: grupo com título, quadro com linhas de 52 px (nome à esquerda,
   * valor à direita) e, quando a tela tem um valor principal em dinheiro, o quadro grande desse valor no topo (quadroValor).
   * As peças vêm de CicluzTransferencias.pecas (a Transferência carrega depois deste arquivo: só se lê na hora de desenhar).
   * Linha que aparece e some entra e sai do quadro (replaceChildren): a linha é display:flex e o atributo hidden não a esconde. */
  const P = () => window.CicluzTransferencias.pecas;
  const valorDa = (texto) => U.el('span', 'transferencia-linha-valor', texto);
  /** Contêiner do formulário: leva a classe da referência (transferencia-tela) para valer as mesmas medidas, sem CSS paralelo. */
  const formulario = (...filhos) => { const f = U.el('div', 'transferencia-tela transferencia-corpo caixa-formulario'); f.append(...filhos); return f; };
  /** Grupo: título pequeno acima e o quadro com as linhas. Notas e avisos entram depois das linhas, fora do quadro. */
  const grupo = (titulo, linhas, ...depois) => P().secao(titulo, P().quadro(...linhas), ...depois);
  /** Linha de leitura (nome à esquerda, valor à direita, sem caixa). */
  const linhaLeitura = (rotulo, texto) => P().linha(rotulo, valorDa(texto));
  /** Linha com um campo de digitar ou escolher (o nome fica dentro da linha; obrigatorio põe o asterisco). */
  const linhaCampo = (rotulo, controle, obrigatorio) => P().linhaDe(rotulo + (obrigatorio ? ' *' : ''), controle);
  /** Linha de dinheiro: campo decimal em reais; devolve { no, input }. */
  const linhaDinheiro = (rotulo, valor, aoDigitar, obrigatorio) => {
    const input = U.entrada('text', valor || '', { inputMode: 'decimal', placeholder: '0,00', autocomplete: 'off' });
    if (aoDigitar) input.addEventListener('input', () => aoDigitar(input.value));
    return { no: linhaCampo(rotulo, input, obrigatorio), input };
  };
  /** Linha de escolha em lista (a seleção abre em painel). aoMudar recebe o valor escolhido. */
  const linhaEscolha = (rotulo, opcoes, valor, aoMudar, obrigatorio = true) => {
    const s = U.seletor(opcoes, valor, 'Escolha…');
    if (obrigatorio) s.required = true;
    s.addEventListener('change', () => { if (aoMudar) aoMudar(s.value); });
    return { no: linhaCampo(rotulo, s, obrigatorio), controle: s };
  };
  /**
   * Quadro grande do valor principal (o laranja da Transferência, na cor da origem), fixo no topo: rótulo, o valor digitável e uma linha
   * de resumo embaixo (para a soma, a diferença ou o total). Devolve { no, input, resumo }. Vai como PRIMEIRO item do formulário.
   */
  const quadroValor = (rotulo, input, aoDigitar) => {
    input.classList.add('transferencia-calc-tela'); input.setAttribute('aria-label', rotulo.replace(/ *$/, ''));
    if (!input.placeholder) input.placeholder = 'R$ 0,00';
    if (aoDigitar) input.addEventListener('input', () => aoDigitar(input.value));
    const resumo = U.el('p', 'transferencia-calc-resumo'); resumo.setAttribute('role', 'status');
    const no = U.el('div', 'transferencia-valor-cab'); no.append(U.el('span', 'transferencia-valor-rotulo', rotulo), input, resumo);
    return { no, input, resumo };
  };
  /**
   * Quadro grande com um TOTAL só de leitura (a soma de linhas que se digitam embaixo): mesmo quadro do valor, mas o número é um <output>, não um campo
   * (nas telas de setor as regras dos campos pintam o texto de escuro). Devolve { no, definir(texto) }.
   */
  const quadroTotal = (rotulo, texto) => {
    const saida = U.el('output', 'transferencia-valor-total', texto || ''); saida.setAttribute('aria-label', rotulo);
    const no = U.el('div', 'transferencia-valor-cab'); no.append(U.el('span', 'transferencia-valor-rotulo', rotulo), saida);
    return { no, definir: (v) => { saida.textContent = v; } };
  };
  Object.assign(C, { pecas: P, valorDa, formulario, grupo, linhaLeitura, linhaCampo, linhaDinheiro, linhaEscolha, quadroValor, quadroTotal });

  function dialogo(opcoes) {
    // padrao: true = janela no padrão linha por linha (classe transferencia-tela, cabeçalho sem o caminho repetido no corpo).
    if (opcoes && opcoes.padrao) { opcoes = { ...opcoes, classe: ((opcoes.classe || '') + ' compras-form-padrao transferencia-tela').trim() }; }
    const d = U.dialogo(opcoes);
    d.style.setProperty('--menu-accent', C.COR);
    d.style.setProperty('--dialog-accent', C.COR);
    d.classList.add('caixa-dialog');
    return d;
  }
  const registrar = (nome, abrir) => { telas[nome] = abrir; };
  function abrir(nome) {
    const t = telas[nome];
    if (t) return t();
    console.warn('Caixa: tela não encontrada', nome);
  }

  Object.assign(C, { criarTela, dialogo, seletorPerfil, faixaDemo, registrar, abrir });
})();
