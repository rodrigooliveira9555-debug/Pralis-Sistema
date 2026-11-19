/* CONFERÊNCIA AUTOMÁTICA DO DESIGN SYSTEM (19/11/2026, pedido do Rodrigo).
   Abre, uma a uma, as telas e janelas da lista ROTEIRO, mede o que está na tela e acusa o que foge das regras do DESIGN_SYSTEM.md.
   Nada é salvo: a rotina só abre telas, toca no botão que abre a janela de cadastro e fecha em seguida (Cancelar).
   Cada regra tem um nome curto, para o relatório dizer QUAL regra falhou e ONDE. Tela nova entra no ROTEIRO; regra nova entra em REGRAS. */
(() => {
  'use strict';
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  const visivel = (x) => { if (!x || !x.isConnected) return false; const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(x).visibility !== 'hidden'; };
  const px = (x) => Math.round(x.getBoundingClientRect().height);
  const lg = (x) => Math.round(x.getBoundingClientRect().width);
  const nome = (x) => (x.getAttribute('aria-label') || x.title || x.textContent || x.placeholder || x.className || x.tagName).trim().replace(/\s+/g, ' ').slice(0, 40);
  const corDe = (x) => getComputedStyle(x).backgroundColor;
  const todos = (raiz, sel) => [...raiz.querySelectorAll(sel)].filter(visivel);

  /* Cada regra recebe a raiz (a tela ou a janela aberta) e devolve uma lista de frases, uma por problema. */
  const REGRAS = [
    ['Cabeçalho com título e caminho', (r) => {
      const cab = r.querySelector(':scope > .panel > .head') || r.querySelector(':scope > .head') || r.querySelector('.head');
      const h = (cab || r).querySelector('h2'); const p = cab && cab.querySelector('p');
      const f = []; if (!h || !visivel(h) || !h.textContent.trim()) f.push('sem título no cabeçalho'); if (cab && (!p || !p.textContent.trim())) f.push('sem o caminho da tela embaixo do título'); return f; }],
    ['Sem rolagem para o lado', (r) => {
      const f = []; if (document.documentElement.scrollWidth > innerWidth + 1) f.push('a página rola para o lado');
      for (const c of [r, ...r.querySelectorAll('.content, form')]) if (visivel(c) && c.scrollWidth > c.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(c).overflowX)) f.push('rola para o lado: ' + nome(c));
      return f; }],
    ['Janela com Cancelar · Salvar à vista', (r) => {
      if (r.tagName !== 'DIALOG') return [];
      const botoes = todos(r, '.actions button, .compras-dialog-acoes button, .compras-etapas-nav button'); // só a linha de botões da própria janela conta (a barra de baixo não)
      const tem = (re) => botoes.some((b) => re.test((b.textContent || '').trim()));
      const f = []; if (!tem(/^(Cancelar|Fechar|Voltar)/)) f.push('falta o botão Cancelar (ou Fechar) por extenso'); if (!tem(/^(Salvar|Avançar|Confirmar|Vincular|Fechar)/)) f.push('falta o botão Salvar por extenso');
      for (const b of botoes.filter((x) => /^(Cancelar|Salvar)$/.test((x.textContent || '').trim()) && x.closest('.actions'))) if (px(b) !== 40) f.push('botão ' + b.textContent.trim() + ' com ' + px(b) + ' px de altura (padrão 40)');
      return f; }],
    ['Campo com 42 px de altura', (r) => todos(r, 'input, select').filter((i) => !['checkbox', 'radio', 'hidden', 'file', 'range', 'color'].includes(i.type) && !i.closest('.people-bottom-header, table, .uniforms-items-table')).filter((i) => Math.abs(px(i) - 42) > 1).map((i) => 'campo "' + nome(i) + '" com ' + px(i) + ' px')],
    ['Sem botão de rádio solto', (r) => todos(r, 'input[type=radio]').slice(0, 3).map((i) => 'botão de rádio em "' + nome(i.closest('fieldset, label') || i) + '": use lista de escolha ou interruptor')],
    ['Rótulo de campo em 12 px', (r) => todos(r, '.compras-rotulo, form > label > span:first-child, .jornada-days > legend').filter((l) => !l.closest('.jornada-day, .jornada-person, .profiles-choice, table')).filter((l) => Math.round(parseFloat(getComputedStyle(l).fontSize)) !== 12).slice(0, 6).map((l) => 'rótulo "' + nome(l) + '" em ' + getComputedStyle(l).fontSize)],
    ['Texto espremido', (r) => todos(r, 'label, span, b, small, button').filter((x) => { const t = [...x.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(''); if (t.length < 3 || x.closest('svg, .sigla-text, .location-icon, .compras-hier-icone') || /^vertical/.test(getComputedStyle(x).writingMode)) return false; /* texto escrito na vertical de propósito (cabeçalho de quadro) não é texto espremido */ const linha = parseFloat(getComputedStyle(x).lineHeight) || parseFloat(getComputedStyle(x).fontSize) * 1.3; return x.getBoundingClientRect().height > linha * 2.6 && lg(x) < parseFloat(getComputedStyle(x).fontSize) * 3; }).slice(0, 5).map((x) => 'texto quebrando letra por letra: "' + nome(x) + '"')],
    ['Linha de lista com 52 px', (r) => todos(r, '.compras-lista > .compras-linha').filter((l) => !l.closest('.uniforms-options') && !l.classList.contains('compras-linha-cabecalho')).filter((l) => px(l) < 50 || px(l) > 60).slice(0, 3).map((l) => 'linha "' + nome(l.querySelector('b') || l) + '" com ' + px(l) + ' px')],
    ['Lista de escolha compacta (44 px, ícone 26, caixa 20)', (r) => {
      const f = [];
      for (const l of todos(r, '.compras-hier-linha, .uniforms-options .uniforms-escolha, .unidades-arvore .location-area-frame > .location-row').slice(0, 40)) {
        if (Math.abs(px(l) - 44) > 3 && !(l.matches('.uniforms-escolha') && px(l) <= 48)) { f.push('linha de escolha "' + nome(l.querySelector('b, .location-name') || l) + '" com ' + px(l) + ' px'); break; }
      }
      const cx = todos(r, 'input.compras-hier-caixa').find((c) => lg(c) !== 20); if (cx) f.push('caixa de marcar com ' + lg(cx) + ' px (padrão 20)');
      const ic = todos(r, '.compras-hier-icone, .unidades-arvore .location-icon, .uniforms-escolha > .compras-linha-icone').find((i) => lg(i) !== 26); if (ic) f.push('ícone da lista de escolha com ' + lg(ic) + ' px (padrão 26)');
      return f; }],
    ['Expandir / recolher: um botão só, na cor do cabeçalho', (r) => {
      const f = [];
      for (const barra of todos(r, '.escolha-barra')) {
        const bs = todos(barra, 'button'); if (bs.length !== 1) { f.push(bs.length + ' botões de expandir/recolher na barra (padrão: 1)'); continue; }
        const d = barra.closest('dialog'); const cab = d && (d.querySelector('.head') || d.querySelector('h2'));
        if (lg(bs[0]) !== 32) f.push('botão de expandir com ' + lg(bs[0]) + ' px (padrão 32)');
        if (cab && corDe(cab) !== 'rgba(0, 0, 0, 0)' && corDe(bs[0]) !== corDe(cab)) f.push('botão de expandir fora da cor do cabeçalho');
      }
      return f; }],
    ['Botão redondo de ação com 32 px', (r) => todos(r, '.compras-redondo, .account-row-actions button').filter((b) => !b.closest('.people-bottom-header')).filter((b) => lg(b) !== 32 || px(b) !== 32).slice(0, 3).map((b) => 'botão redondo "' + nome(b) + '" com ' + lg(b) + '×' + px(b) + ' px')],
    ['Ícone da linha com 30 px', (r) => todos(r, '.compras-lista > .compras-linha > .compras-linha-icone').filter((i) => !i.closest('.uniforms-options')).filter((i) => lg(i) !== 30).slice(0, 2).map((i) => 'ícone de linha com ' + lg(i) + ' px')],
  ];

  function conferir(raiz) {
    const achados = [];
    for (const [regra, fn] of REGRAS) { let f = []; try { f = fn(raiz) || []; } catch (e) { f = ['a regra não pôde ser medida (' + e.message + ')']; } for (const x of f) achados.push({ regra, problema: x }); }
    return achados;
  }
  /** A janela aberta por cima de tudo, ou a tela à vista. */
  function raizAtual() { const d = [...document.querySelectorAll('dialog[open]')].pop(); return d || document.querySelector('.view.show'); }

  const cartaoNovo = (v) => v && [...v.querySelectorAll('.compras-secao-cab button')].find(visivel);
  const chamar = (n, ...a) => () => { if (typeof window[n] !== 'function') throw new Error('tela indisponível: ' + n); window[n](...a); };
  /* Telas e janelas conferidas. abrir() mostra a tela; janela:true toca no botão do título para abrir a janela de cadastro. */
  const ROTEIRO = [
    ['DES - Exames Ocupacionais', chamar('showExams'), true],
    ['DES - Uniformes Entrega (-) Recebimento (+)', chamar('showUniforms'), true],
    ['DES - Ocorrências', chamar('showOccurrences'), true],
    ['DES - Período de Teste', chamar('showTrial'), true],
    ['DES - Tipos de Uniforme', chamar('showUniformTypes'), true],
    ['DES - Horário / Escala', chamar('showJornada', 'shifts'), true],
    ['DES - Tipos de Ocorrência', chamar('showOccurrenceCatalog'), false],
    ['DES - Documentos Colaboradores', chamar('showDocuments'), false],
    ['DES - Uniformes (estoque)', chamar('showUniforms', 'stock'), false],
    ['DES - Contratos Fornecedores', () => window.CicluzContratos.abrirPastaContratos('des-contratos-fornecedores'), false],
    ['MER - Contratos Fornecedores', () => window.CicluzContratos.abrirPastaContratos('mer-contratos-fornecedores'), false],
    ['VND - Contratos Clientes', () => window.CicluzContratos.abrirPastaContratos('vnd-contratos-clientes'), false],
    ['Janela de escolha (árvore do contrato)', () => window.CicluzContratos.seletorArvore({ titulo: 'Conferência', sigla: 'MER', nos: () => [{ id: 'a', nome: 'Grupo', ativo: true, filhos: [{ id: 'a|b', nome: 'Subgrupo', ativo: true }] }], marcados: new Set(), aoConfirmar: () => {} }), 'ja-e-janela'],
  ];
  const fecharJanelas = async () => { for (let i = 0; i < 4 && document.querySelector('dialog[open]'); i++) { const d = [...document.querySelectorAll('dialog[open]')].pop(); d.close(); await esperar(150); } };

  async function conferirTudo(aoAndar) {
    const voltar = document.querySelector('.view.show'); const relatorio = [];
    for (const [titulo, abrir, janela] of ROTEIRO) {
      if (aoAndar) aoAndar(titulo);
      const item = { titulo, achados: [] };
      try {
        await fecharJanelas(); abrir(); await esperar(450);
        if (janela === 'ja-e-janela') { item.achados = conferir(raizAtual()); }
        else {
          const tela = document.querySelector('.view.show'); item.achados = conferir(tela);
          if (janela) { const b = cartaoNovo(tela); if (!b) item.achados.push({ regra: 'Lista com o botão de criar no título', problema: 'não achei o botão do título que abre o cadastro' }); else { b.click(); await esperar(600); const d = document.querySelector('dialog[open]'); if (!d) item.achados.push({ regra: 'Cadastro em janela', problema: 'o botão do título não abriu uma janela' }); else for (const a of conferir(raizAtual())) item.achados.push({ regra: a.regra, problema: 'na janela de cadastro: ' + a.problema }); } }
        }
      } catch (e) { item.achados.push({ regra: 'Abrir a tela', problema: e.message }); }
      await fecharJanelas(); relatorio.push(item);
    }
    document.querySelectorAll('.view').forEach((x) => x.classList.remove('show')); if (voltar) voltar.classList.add('show');
    return relatorio;
  }

  /** Quadro para a tela Configurações → Design System → Conferência Final. */
  function painel() {
    const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
    const caixa = el('div', 'ds-conferencia compras-largo'); const estado = el('p', 'profiles-note'); estado.setAttribute('role', 'status'); const saida = el('div', 'ds-conferencia-saida');
    const U = window.CicluzComprasUI; let rodando = false;
    const rodar = async () => {
      if (rodando) return; rodando = true; saida.replaceChildren(); estado.textContent = 'Conferindo…';
      const rel = await conferirTudo((t) => { estado.textContent = 'Conferindo: ' + t + '…'; });
      const comProblema = rel.filter((r) => r.achados.length); const total = rel.reduce((n, r) => n + r.achados.length, 0);
      estado.textContent = rel.length + ' telas conferidas com ' + REGRAS.length + ' regras: ' + (total ? total + ' ponto(s) fora do padrão em ' + comProblema.length + ' tela(s).' : 'nenhum ponto fora do padrão.');
      for (const r of rel) {
        const fs = el('fieldset', 'quadro-interno'); fs.append(el('legend', null, r.titulo + (r.achados.length ? ' — ' + r.achados.length + ' ponto(s)' : ' — no padrão')));
        if (!r.achados.length) fs.append(el('small', 'profiles-note', 'Nenhuma das regras medidas falhou.'));
        else { const ul = el('ul', 'ds-conferencia-lista'); for (const a of r.achados) { const li = el('li'); li.append(el('b', null, a.regra + ': '), document.createTextNode(a.problema)); ul.append(li); } fs.append(ul); }
        saida.append(fs);
      }
      rodando = false;
    };
    const botao = U ? U.botaoTitulo('Conferir as telas agora', 'Abrir cada tela e medir contra o Design System', rodar) : Object.assign(el('button', 'btn', 'Conferir as telas agora'), { type: 'button', onclick: rodar });
    caixa.append(botao, estado, saida); return caixa;
  }

  window.CicluzDesignCheck = { conferir, conferirTudo, raizAtual, painel, REGRAS: REGRAS.map((r) => r[0]), ROTEIRO: ROTEIRO.map((r) => r[0]) };
})();
