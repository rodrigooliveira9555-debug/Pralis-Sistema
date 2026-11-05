/*
 * Agenda — Mapa mental (funcionamento inspirado no XMind, aplicado aos compromissos).
 * É uma VISÃO da agenda: cada nó é um compromisso de verdade; mexer no mapa muda o compromisso.
 * - Raiz → grupos (por lista, data, responsável, prioridade, coluna do Kanban ou etiqueta) →
 *   compromissos → subtarefas. Estruturas: Mapa, Lógico, Organograma, Árvore, Linha do tempo.
 * - Teclado como no XMind: Tab = subtópico, Enter = tópico irmão, F2 = renomear, Espaço = concluir,
 *   Delete = excluir, setas = andar, Ctrl+/ = recolher, + / - / 0 = zoom e ajustar.
 * - Arrastar um compromisso para outro grupo muda a lista, a data, a prioridade ou a coluna; arrastar
 *   uma subtarefa para outro compromisso leva a subtarefa. Relações (linhas tracejadas) ligam
 *   compromissos ("depende de", "antes de"…). Focar ramo, recolher/expandir, busca que destaca.
 * - Exporta PNG, SVG e os tópicos em texto (.md). Desenho todo em SVG (sem foreignObject), por isso a
 *   imagem exportada é igual à tela.
 * Preferências do mapa (estrutura, agrupamento, recolhidos) ficam no aparelho; as relações são dado da
 * agenda (vão para o banco com o resto).
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const D = window.CicluzAgendaDominio;
  const A = window.CicluzAgendaDados;
  const L = window.CicluzAgendaMapaLayout;
  const { el, botao, svg } = U;
  const NS = 'http://www.w3.org/2000/svg';
  const PREF = 'cicluz-agenda-mapa';
  const FONTE = 'Montserrat, Arial, sans-serif';
  const AGRUPAMENTOS = [['lista', 'Lista'], ['data', 'Data'], ['responsavel', 'Responsável'], ['prioridade', 'Prioridade'], ['coluna', 'Coluna do Kanban'], ['etiqueta', 'Etiqueta']];
  const COR_PRIORIDADE = { 'muito-alta': '#dc2626', alta: '#ea580c', normal: '#7c3aed', baixa: '#0891b2', 'muito-baixa': '#71717a' };
  const SINAL_PRIORIDADE = { 'muito-alta': '!!!', alta: '!!', baixa: '↓', 'muito-baixa': '↓↓' };

  let prefs = { estrutura: 'mapa', agrupar: 'lista', concluidos: false, recolhidos: [] };
  try { prefs = { ...prefs, ...JSON.parse(localStorage.getItem(PREF) || '{}') }; } catch (e) { /* padrão */ }
  const guardar = () => { try { localStorage.setItem(PREF, JSON.stringify(prefs)); } catch (e) { /* memória */ } };
  const est = { selecionado: 'raiz', foco: '', busca: '', relacaoDe: '', relacaoSel: '', camera: null, cameraChave: '', ultimoToque: { id: '', t: 0 } };
  let ctxAtual = null;

  const tema = () => {
    const escuro = document.body.classList.contains('dark-theme');
    return escuro
      ? { fundo: '#1c1b21', cartao: '#2a2930', texto: '#ececf1', suave: '#a1a1aa', linhaSub: '#4a4952', destaque: '#facc15' }
      : { fundo: '#fafafb', cartao: '#ffffff', texto: '#27272a', suave: '#71717a', linhaSub: '#d4d4d8', destaque: '#f59e0b' };
  };

  /* ---------- Medidas ---------- */
  const tela2d = document.createElement('canvas').getContext('2d');
  const medidor = (fonte) => (t) => { tela2d.font = fonte; return tela2d.measureText(t).width; };
  const ESTILO = {
    raiz: { fonte: '700 17px ' + FONTE, linha: 22, padX: 20, padY: 13, max: 260, rx: 16 },
    grupo: { fonte: '600 14px ' + FONTE, linha: 18, padX: 14, padY: 9, max: 210, rx: 10 },
    item: { fonte: '600 13px ' + FONTE, linha: 17, padX: 12, padY: 8, max: 220, rx: 10, icone: 22, meta: 15 },
    sub: { fonte: '500 12px ' + FONTE, linha: 16, padX: 10, padY: 6, max: 200, rx: 8, icone: 20 },
  };
  function medir(n) {
    const e = ESTILO[n.tipo];
    const m = medidor(e.fonte);
    n.linhas = L.quebrar(n.titulo, e.max, m, n.tipo === 'raiz' ? 2 : 3);
    const larguraTexto = Math.max(...n.linhas.map(m), 20);
    const mm = medidor('500 11px ' + FONTE);
    const larguraMeta = n.meta ? Math.min(e.max, mm(n.meta)) : 0;
    const marcadores = n.marcadores ? n.marcadores.length * 22 : 0;
    n.w = Math.ceil(Math.max(larguraTexto, larguraMeta) + e.padX * 2 + (e.icone || 0) + marcadores);
    n.h = Math.ceil(n.linhas.length * e.linha + e.padY * 2 + (n.meta ? e.meta : 0));
    (n.filhos || []).forEach(medir);
  }

  /* ---------- Árvore a partir da agenda ---------- */
  function grupos(itens) {
    const hoje = D.isoData(new Date());
    const amanha = D.somarDias(hoje, 1);
    const g = prefs.agrupar;
    if (g === 'lista') return A.dados.listas.map((l) => ({ chave: 'l:' + l.id, titulo: l.nome, cor: l.cor, extra: { listaId: l.id }, soltar: { listaId: l.id }, lista: l, de: (i) => i.listaId === l.id, sempre: true }));
    if (g === 'data') {
      const faixa = (i) => (!i.data ? 'sem' : i.data < hoje || D.atrasado(i, new Date()) ? 'atrasados' : i.data === hoje ? 'hoje' : i.data === amanha ? 'amanha' : i.data <= D.somarDias(hoje, 7) ? 'semana' : 'depois');
      return [['atrasados', 'Atrasados', '#dc2626', null, null], ['hoje', 'Hoje', '#2563eb', { data: hoje }, { data: hoje }], ['amanha', 'Amanhã', '#0891b2', { data: amanha }, { data: amanha }], ['semana', 'Próximos 7 dias', '#16a34a', null, null], ['depois', 'Mais adiante', '#7c3aed', null, null], ['sem', 'Sem data', '#71717a', {}, { data: '' }]]
        .map(([k, t, cor, extra, soltar]) => ({ chave: 'd:' + k, titulo: t, cor, extra: extra || {}, soltar, de: (i) => faixa(i) === k, sempre: ['hoje', 'amanha', 'sem'].includes(k) }));
    }
    if (g === 'responsavel') {
      const cores = ['#7c3aed', '#2563eb', '#16a34a', '#ea580c', '#db2777', '#0891b2'];
      return [...A.pessoas().map((p, n) => ({ chave: 'r:' + p.id, titulo: p.nome, cor: cores[n % cores.length], extra: { pessoas: [D.pessoaResponsavel(p.id)] }, soltar: null, de: (i) => D.responsaveis(i).includes(p.id), sempre: p.id === A.usuarioAtual() })),
        { chave: 'r:', titulo: 'Sem responsável', cor: '#71717a', extra: {}, soltar: null, de: (i) => !D.responsaveis(i).length }];
    }
    if (g === 'prioridade') return D.PRIORIDADES.slice().reverse().map(([k, t]) => ({ chave: 'p:' + k, titulo: 'Prioridade ' + t.toLowerCase(), cor: COR_PRIORIDADE[k], extra: { prioridade: k }, soltar: { prioridade: k }, de: (i) => (i.prioridade || 'normal') === k, sempre: k === 'normal' }));
    if (g === 'coluna') {
      const cores = ['#7c3aed', '#16a34a', '#0891b2', '#ea580c'];
      return [...A.dados.colunas.map((c, n) => ({ chave: 'c:' + c.id, titulo: c.nome, cor: cores[n % cores.length], extra: { colunaId: c.id }, soltar: { colunaId: c.id }, de: (i) => A.colunaDe(i) === c.id, sempre: true })),
        { chave: 'c:' + A.CONCLUIDO, titulo: 'Concluído', cor: '#dc2626', extra: null, soltar: { colunaId: A.CONCLUIDO }, de: (i) => i.concluida, sempre: true }];
    }
    const tags = [...new Set(itens.flatMap((i) => i.etiquetas || []))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const cores = ['#7c3aed', '#2563eb', '#16a34a', '#ea580c', '#db2777', '#0891b2', '#ca8a04'];
    return [...tags.map((t, n) => ({ chave: 'e:' + t, titulo: '#' + t, cor: cores[n % cores.length], extra: { etiquetas: [t] }, soltar: null, de: (i) => (i.etiquetas || []).includes(t) })),
      { chave: 'e:', titulo: 'Sem etiqueta', cor: '#71717a', extra: {}, soltar: null, de: (i) => !(i.etiquetas || []).length }];
  }

  function montarArvore(ctx) {
    const agora = new Date();
    const itens = ctx.itens.filter((i) => prefs.concluidos || !i.concluida || prefs.agrupar === 'coluna');
    const raiz = { id: 'raiz', tipo: 'raiz', titulo: ctx.titulo, cor: ctx.cor, filhos: [] };
    grupos(itens).forEach((g) => {
      const doGrupo = itens.filter(g.de).sort(D.comparar);
      if (!doGrupo.length && !g.sempre) return;
      const gn = { id: g.chave, tipo: 'grupo', titulo: g.titulo, cor: g.cor, grupo: g, filhos: [] };
      doGrupo.forEach((i) => {
        const pr = D.progresso(i);
        const meta = [i.data ? D.quando(i, agora) : '', D.responsaveis(i).map((p) => A.nomePessoa(p).split(' · ')[0]).join(', '), pr.total ? pr.feitas + '/' + pr.total : ''].filter(Boolean).join(' · ');
        const marcadores = [];
        if (SINAL_PRIORIDADE[i.prioridade]) marcadores.push({ tipo: 'prioridade', texto: SINAL_PRIORIDADE[i.prioridade], cor: COR_PRIORIDADE[i.prioridade] });
        if (i.sinalizado) marcadores.push({ tipo: 'bandeira' });
        if (i.notas) marcadores.push({ tipo: 'nota', texto: i.notas });
        const lst = A.lista(i.listaId);
        const no = { id: g.chave + '>' + i.id, tipo: 'item', titulo: i.titulo, item: i, cor: g.cor, corLista: lst ? lst.cor : g.cor, meta, marcadores, grupo: g, atrasado: D.atrasado(i, agora), filhos: [] };
        (i.subtarefas || []).forEach((s) => no.filhos.push({ id: no.id + '>' + s.id, tipo: 'sub', titulo: s.titulo, item: i, sub: s, cor: g.cor, corLista: no.corLista, filhos: [] }));
        gn.filhos.push(no);
      });
      raiz.filhos.push(gn);
    });
    return raiz;
  }

  const achar = (n, id) => { if (n.id === id) return n; for (const f of n.filhos || []) { const r = achar(f, id); if (r) return r; } return null; };
  const paiDe = (n, id, pai = null) => { if (n.id === id) return pai; for (const f of n.filhos || []) { const r = paiDe(f, id, n); if (r !== undefined) return r; } return undefined; };
  const contar = (n) => 1 + (n.filhos || []).reduce((t, f) => t + contar(f), 0);

  /* ---------- Render ---------- */
  function render(body, ctx) {
    ctxAtual = ctx;
    const t = tema();
    const caixa = el('div', 'agenda-mm');

    // Barra: escopo, estrutura, agrupar, concluídos, recolher/expandir, busca, exportar
    const barra = el('div', 'agenda-mm-barra');
    const escopo = U.seletor(ctx.escopos, ctx.escopoAtual);
    escopo.onchange = () => ctx.escolher(escopo.value);
    const estrutura = U.seletor(L.ESTRUTURAS, prefs.estrutura);
    estrutura.onchange = () => { prefs.estrutura = estrutura.value; guardar(); est.camera = null; ctx.aoMudar(); };
    const agrupar = U.seletor(AGRUPAMENTOS, prefs.agrupar);
    agrupar.onchange = () => { prefs.agrupar = agrupar.value; guardar(); est.camera = null; est.foco = ''; est.selecionado = 'raiz'; ctx.aoMudar(); };
    const busca = U.entrada('text', est.busca, { placeholder: 'Procurar no mapa', maxLength: 80 });
    busca.dataset.textoLivre = '';
    busca.setAttribute('aria-label', 'Procurar no mapa');
    busca.oninput = () => { est.busca = busca.value; desenhar(); };
    barra.append(U.campo('Mostrar', escopo), U.campo('Estrutura', estrutura), U.campo('Agrupar por', agrupar), U.campo('Procurar', busca));
    const chips = el('div', 'compras-chips agenda-mm-chips');
    const chipConcluidos = botao('Concluídos', () => { prefs.concluidos = !prefs.concluidos; guardar(); ctx.aoMudar(); }, 'compras-chip' + (prefs.concluidos ? ' ativo' : ''));
    chipConcluidos.setAttribute('aria-pressed', String(prefs.concluidos));
    chips.append(chipConcluidos,
      botao('Recolher tudo', () => { const r = arvoreAtual(); prefs.recolhidos = (r.filhos || []).flatMap((g) => [g.id, ...(g.filhos || []).map((x) => x.id)]).filter((id) => { const n = achar(r, id); return n && n.filhos && n.filhos.length; }); guardar(); est.camera = null; desenhar(); }, 'compras-chip'),
      botao('Expandir tudo', () => { prefs.recolhidos = []; guardar(); est.camera = null; desenhar(); }, 'compras-chip'),
      botao('PNG', () => exportar('png'), 'compras-chip'),
      botao('SVG', () => exportar('svg'), 'compras-chip'),
      botao('Tópicos (.md)', () => exportar('md'), 'compras-chip'));
    barra.append(chips);

    const acoes = el('div', 'agenda-mm-acoes');
    acoes.setAttribute('role', 'toolbar');
    acoes.setAttribute('aria-label', 'Ações do tópico escolhido');

    const tela = el('div', 'agenda-mm-tela');
    tela.tabIndex = 0;
    tela.setAttribute('role', 'tree');
    tela.setAttribute('aria-label', 'Mapa mental da agenda. Setas para andar, Tab cria subtópico, Enter cria tópico, F2 renomeia, Espaço conclui, Delete exclui.');
    tela.style.background = t.fundo;
    const desenho = document.createElementNS(NS, 'svg');
    desenho.setAttribute('class', 'agenda-mm-svg');
    desenho.setAttribute('aria-hidden', 'false');
    const camera = document.createElementNS(NS, 'g');
    desenho.append(camera);
    const zoom = el('div', 'agenda-mm-zoom');
    const zb = (rotulo, txt, f) => { const b = botao(txt, f, 'agenda-mm-zoom-botao'); b.setAttribute('aria-label', rotulo); b.title = rotulo; return b; };
    zoom.append(zb('Afastar', '−', () => zoomEm(1 / 1.2)), zb('Ajustar à tela', '⤢', () => { est.camera = null; desenhar(); }), zb('Aproximar', '+', () => zoomEm(1.2)));
    tela.append(desenho, zoom);
    const status = el('p', 'agenda-mm-status');
    caixa.append(barra, acoes, tela, status);
    body.append(caixa);

    let arvore = null;
    let lay = null;
    function arvoreAtual() { return arvore; }

    function desenhar() {
      const t2 = tema();
      tela.style.background = t2.fundo;
      const completa = montarArvore(ctx);
      if (est.foco && !achar(completa, est.foco)) est.foco = '';
      arvore = est.foco ? { ...achar(completa, est.foco) } : completa;
      medir(arvore);
      if (!achar(arvore, est.selecionado)) est.selecionado = arvore.id;
      const termo = D.combinaBusca ? est.busca.trim() : '';
      const recolhidos = termo ? new Set() : new Set(prefs.recolhidos);
      lay = L.calcular(arvore, prefs.estrutura, { recolhidos });
      camera.replaceChildren();
      const gRel = document.createElementNS(NS, 'g');
      const gLig = document.createElementNS(NS, 'g');
      const gNos = document.createElementNS(NS, 'g');
      camera.append(gLig, gRel, gNos);
      const casa = new Set();
      if (termo) lay.nos.forEach((p) => { if (D.combinaBusca({ titulo: p.no.titulo, notas: p.no.item && p.no.tipo === 'item' ? p.no.item.notas : '' }, termo)) casa.add(p.id); });

      // Ligações (cor do ramo)
      lay.ligacoes.forEach((l) => {
        const filho = lay.por.get(l.para).no;
        const path = document.createElementNS(NS, 'path');
        let d;
        if (l.tipo === 'curva') { const mx = (l.x1 + l.x2) / 2; d = `M${l.x1},${l.y1} C${mx},${l.y1} ${mx},${l.y2} ${l.x2},${l.y2}`; }
        else if (l.tipo === 'cotovelo-v') { const my = (l.y1 + l.y2) / 2; d = `M${l.x1},${l.y1} V${my} H${l.x2} V${l.y2}`; }
        else if (l.tipo === 'cotovelo-h') d = `M${l.x1},${l.y1} V${l.y2} H${l.x2}`;
        else d = `M${l.x1},${l.y1} L${l.x2},${l.y2}`;
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', filho.tipo === 'sub' ? t2.linhaSub : filho.cor || ctx.cor);
        path.setAttribute('stroke-width', l.eixo ? 4 : filho.tipo === 'grupo' ? 3 : filho.tipo === 'item' ? 2 : 1.5);
        path.setAttribute('stroke-linecap', 'round');
        if (termo) path.setAttribute('opacity', casa.has(l.para) ? 1 : 0.25);
        gLig.append(path);
      });

      // Nós
      lay.nos.forEach((p) => gNos.append(desenharNo(p, t2, termo, casa)));

      // Relações entre compromissos
      const primeira = new Map();
      lay.nos.forEach((p) => { if (p.no.tipo === 'item' && !primeira.has(p.no.item.id)) primeira.set(p.no.item.id, p); });
      A.relacoesVisiveis().forEach((r) => {
        const a = primeira.get(r.de);
        const b = primeira.get(r.para);
        if (!a || !b) return;
        const ax = a.x + a.w / 2, ay = a.y, bx = b.x + b.w / 2, by = b.y;
        const alto = Math.min(ay, by) - 40 - Math.abs(ax - bx) * 0.15;
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('d', `M${ax},${ay} C${ax},${alto} ${bx},${alto} ${bx},${by - 4}`);
        path.setAttribute('class', 'agenda-mm-relacao' + (est.relacaoSel === r.id ? ' escolhida' : ''));
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', est.relacaoSel === r.id ? t2.destaque : ctx.cor);
        path.setAttribute('stroke-width', '2');
        path.setAttribute('stroke-dasharray', '6 5');
        path.setAttribute('marker-end', 'url(#agenda-mm-seta)');
        path.dataset.relacao = r.id;
        const larga = document.createElementNS(NS, 'path');
        larga.setAttribute('d', path.getAttribute('d'));
        larga.setAttribute('fill', 'none');
        larga.setAttribute('stroke', 'transparent');
        larga.setAttribute('stroke-width', '14');
        larga.dataset.relacao = r.id;
        larga.setAttribute('class', 'agenda-mm-relacao-alvo');
        gRel.append(path, larga);
        const rot = r.rotulo || '';
        if (rot) {
          const mx = (ax + bx) / 2, my = alto + (Math.min(ay, by) - alto) * 0.25;
          const w = medidor('600 11px ' + FONTE)(rot) + 12;
          const fundo = document.createElementNS(NS, 'rect');
          Object.entries({ x: mx - w / 2, y: my - 10, width: w, height: 20, rx: 10, fill: t2.cartao, stroke: ctx.cor }).forEach(([k, v]) => fundo.setAttribute(k, v));
          const tx = texto(rot, mx, my + 4, '600 11px', t2.texto, 'middle');
          fundo.dataset.relacao = r.id;
          tx.dataset.relacao = r.id;
          gRel.append(fundo, tx);
        }
      });
      // Ponta da seta
      const defs = document.createElementNS(NS, 'defs');
      defs.innerHTML = '<marker id="agenda-mm-seta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="' + ctx.cor + '"/></marker>';
      camera.prepend(defs);

      // Câmera: mantém ao editar; ajusta ao trocar estrutura/agrupamento/foco
      const chave = prefs.estrutura + '|' + prefs.agrupar + '|' + est.foco;
      if (!est.camera || est.cameraChave !== chave) { est.cameraChave = chave; ajustar(); }
      aplicarCamera();
      tela.setAttribute('aria-activedescendant', 'mm-' + cssId(est.selecionado));
      desenharAcoes();
      const itensUnicos = new Set(lay.nos.filter((p) => p.no.tipo === 'item').map((p) => p.no.item.id));
      const feitos = [...itensUnicos].filter((id) => (A.item(id) || {}).concluida).length;
      status.textContent = itensUnicos.size + ' compromisso(s) · ' + lay.nos.length + ' tópico(s) · ' + feitos + ' concluído(s)' + (termo ? ' · ' + casa.size + ' encontrado(s)' : '') + '  —  Tab: subtópico · Enter: tópico · F2: renomear · Espaço: concluir · Delete: excluir · arraste para outro grupo';
    }

    const cssId = (id) => id.replace(/[^a-zA-Z0-9_-]/g, '_');
    function texto(t, x, y, peso, cor, ancora = 'start') {
      const tx = document.createElementNS(NS, 'text');
      tx.setAttribute('x', x);
      tx.setAttribute('y', y);
      tx.setAttribute('fill', cor);
      tx.setAttribute('font-family', FONTE);
      const [w, s] = peso.split(' ');
      tx.setAttribute('font-weight', w);
      tx.setAttribute('font-size', s);
      tx.setAttribute('text-anchor', ancora);
      tx.textContent = t;
      return tx;
    }

    function desenharNo(p, t2, termo, casa) {
      const n = p.no;
      const e = ESTILO[n.tipo];
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('transform', `translate(${p.x},${p.y})`);
      g.setAttribute('class', 'agenda-mm-no tipo-' + n.tipo + (est.selecionado === n.id ? ' escolhido' : ''));
      g.setAttribute('id', 'mm-' + cssId(n.id));
      g.setAttribute('role', 'treeitem');
      g.setAttribute('aria-level', String(p.nivel + 1));
      g.setAttribute('aria-selected', String(est.selecionado === n.id));
      const temFilhos = (achar(arvore, n.id).filhos || []).length > 0;
      if (temFilhos) g.setAttribute('aria-expanded', String(!prefs.recolhidos.includes(n.id) || Boolean(termo)));
      g.setAttribute('aria-label', rotuloNo(n));
      g.dataset.id = n.id;
      if (termo) g.setAttribute('opacity', casa.has(n.id) ? 1 : 0.3);
      const concluido = (n.tipo === 'item' && n.item.concluida) || (n.tipo === 'sub' && n.sub.concluida);

      const caixaNo = document.createElementNS(NS, 'rect');
      const preenchimento = n.tipo === 'raiz' ? n.cor || ctx.cor : n.tipo === 'grupo' ? n.cor : n.tipo === 'item' ? t2.cartao : t2.fundo;
      Object.entries({ width: p.w, height: p.h, rx: e.rx, fill: preenchimento }).forEach(([k, v]) => caixaNo.setAttribute(k, v));
      if (n.tipo === 'item') { caixaNo.setAttribute('stroke', n.corLista); caixaNo.setAttribute('stroke-width', '1.5'); }
      if (n.tipo === 'sub') { caixaNo.setAttribute('stroke', t2.linhaSub); caixaNo.setAttribute('stroke-width', '1'); }
      g.append(caixaNo);
      if (est.selecionado === n.id || (termo && casa.has(n.id))) {
        const anel = document.createElementNS(NS, 'rect');
        Object.entries({ x: -4, y: -4, width: p.w + 8, height: p.h + 8, rx: e.rx + 4, fill: 'none', stroke: est.selecionado === n.id ? (n.tipo === 'raiz' ? t2.texto : ctx.cor) : t2.destaque, 'stroke-width': 2.5 }).forEach(([k, v]) => anel.setAttribute(k, v));
        g.append(anel);
      }
      if (est.relacaoDe && n.tipo === 'item' && n.item.id === est.relacaoDe) {
        const anel = document.createElementNS(NS, 'rect');
        Object.entries({ x: -6, y: -6, width: p.w + 12, height: p.h + 12, rx: e.rx + 6, fill: 'none', stroke: t2.destaque, 'stroke-width': 2, 'stroke-dasharray': '5 4' }).forEach(([k, v]) => anel.setAttribute(k, v));
        g.append(anel);
      }
      const corTexto = n.tipo === 'raiz' || n.tipo === 'grupo' ? '#ffffff' : t2.texto;
      let x = e.padX;
      // Círculo de concluído (compromisso) ou caixinha (subtarefa)
      if (n.tipo === 'item' || n.tipo === 'sub') {
        const tam = n.tipo === 'item' ? 14 : 12;
        const cy = e.padY + e.linha / 2;
        const marca = document.createElementNS(NS, n.tipo === 'item' ? 'circle' : 'rect');
        if (n.tipo === 'item') { marca.setAttribute('cx', x + tam / 2); marca.setAttribute('cy', cy); marca.setAttribute('r', tam / 2); }
        else { marca.setAttribute('x', x); marca.setAttribute('y', cy - tam / 2); marca.setAttribute('width', tam); marca.setAttribute('height', tam); marca.setAttribute('rx', 3); }
        marca.setAttribute('fill', concluido ? n.corLista : 'none');
        marca.setAttribute('stroke', n.corLista);
        marca.setAttribute('stroke-width', '2');
        marca.setAttribute('class', 'agenda-mm-marca');
        marca.dataset.acao = 'concluir';
        g.append(marca);
        if (concluido) { const v = document.createElementNS(NS, 'path'); v.setAttribute('d', `M${x + 3.5},${cy} l${tam * 0.2},${tam * 0.22} l${tam * 0.38},-${tam * 0.42}`); v.setAttribute('stroke', '#fff'); v.setAttribute('stroke-width', '2'); v.setAttribute('fill', 'none'); v.dataset.acao = 'concluir'; g.append(v); }
        x += e.icone;
      }
      n.linhas.forEach((linha, k) => {
        const tx = texto(linha, x, e.padY + (k + 1) * e.linha - 4, e.fonte.split(' ').slice(0, 2).join(' '), concluido ? t2.suave : corTexto);
        if (concluido) tx.setAttribute('text-decoration', 'line-through');
        g.append(tx);
      });
      if (n.meta) g.append(texto(n.meta, x, e.padY + n.linhas.length * e.linha + e.meta - 3, '500 11px', n.atrasado ? '#dc2626' : t2.suave));
      // Marcadores (prioridade, bandeira, nota)
      let mx = p.w - e.padX - (n.marcadores ? n.marcadores.length * 22 : 0) + 4;
      (n.marcadores || []).forEach((m) => {
        const cy = e.padY + e.linha / 2;
        if (m.tipo === 'prioridade') {
          const c = document.createElementNS(NS, 'circle');
          Object.entries({ cx: mx + 8, cy, r: 9, fill: m.cor }).forEach(([k, v]) => c.setAttribute(k, v));
          g.append(c, texto(m.texto, mx + 8, cy + 3.5, '800 9px', '#fff', 'middle'));
        } else if (m.tipo === 'bandeira') {
          const f = document.createElementNS(NS, 'path');
          f.setAttribute('d', `M${mx + 3},${cy + 8} V${cy - 8} H${mx + 14} l-3,4 3,4 H${mx + 3}`);
          f.setAttribute('fill', '#ea580c');
          f.setAttribute('stroke', '#ea580c');
          f.setAttribute('stroke-width', '1.5');
          g.append(f);
        } else {
          const nota = document.createElementNS(NS, 'path');
          nota.setAttribute('d', `M${mx + 2},${cy - 7} h11 l3,3 v11 h-14 z M${mx + 5},${cy - 1} h8 M${mx + 5},${cy + 3} h6`);
          nota.setAttribute('fill', 'none');
          nota.setAttribute('stroke', t2.suave);
          nota.setAttribute('stroke-width', '1.5');
          const titulo = document.createElementNS(NS, 'title');
          titulo.textContent = m.texto;
          nota.append(titulo);
          g.append(nota);
        }
        mx += 22;
      });
      // Botão de recolher/expandir na ponta do ramo
      if (temFilhos && !termo) {
        const recolhido = prefs.recolhidos.includes(n.id);
        const vert = prefs.estrutura === 'organograma';
        const degrau = prefs.estrutura === 'arvore' || (prefs.estrutura === 'linha' && n.tipo !== 'raiz');
        const cx = vert ? p.w / 2 : degrau ? 12 : p.lado === -1 ? -10 : p.w + 10;
        const cy = vert || degrau ? p.h + 10 : p.h / 2;
        const bt = document.createElementNS(NS, 'g');
        bt.setAttribute('class', 'agenda-mm-recolher');
        bt.dataset.acao = 'recolher';
        const c = document.createElementNS(NS, 'circle');
        Object.entries({ cx, cy, r: 9, fill: t2.cartao, stroke: n.tipo === 'sub' ? t2.linhaSub : n.cor || ctx.cor, 'stroke-width': 1.5 }).forEach(([k, v]) => c.setAttribute(k, v));
        c.dataset.acao = 'recolher';
        const qtd = (achar(arvore, n.id).filhos || []).length;
        const tx = texto(recolhido ? String(qtd) : '−', cx, cy + 4, '700 10px', t2.texto, 'middle');
        tx.dataset.acao = 'recolher';
        bt.append(c, tx);
        g.append(bt);
      }
      return g;
    }

    function rotuloNo(n) {
      if (n.tipo === 'raiz') return 'Mapa: ' + n.titulo;
      if (n.tipo === 'grupo') return 'Grupo ' + n.titulo + ', ' + n.filhos.length + ' compromisso(s)';
      if (n.tipo === 'item') return 'Compromisso ' + n.titulo + (n.item.concluida ? ', concluído' : '') + (n.meta ? ', ' + n.meta : '');
      return 'Subtarefa ' + n.titulo + (n.sub.concluida ? ', concluída' : '');
    }

    /* ----- Câmera ----- */
    function ajustar() {
      const r = tela.getBoundingClientRect();
      est.cameraProvisoria = !r.width;
      const w = r.width || 800, h = r.height || 500;
      const c = lay.caixa;
      const z = Math.max(0.3, Math.min(1.25, Math.min((w - 48) / c.w, (h - 48) / c.h)));
      est.camera = { z, x: w / 2 - (c.x + c.w / 2) * z, y: h / 2 - (c.y + c.h / 2) * z };
    }
    function aplicarCamera() { const c = est.camera; camera.setAttribute('transform', `translate(${c.x},${c.y}) scale(${c.z})`); }
    function zoomEm(f, px, py) {
      const r = tela.getBoundingClientRect();
      const c = est.camera;
      const ox = px === undefined ? r.width / 2 : px, oy = py === undefined ? r.height / 2 : py;
      const z = Math.max(0.2, Math.min(3, c.z * f));
      c.x = ox - (ox - c.x) * (z / c.z);
      c.y = oy - (oy - c.y) * (z / c.z);
      c.z = z;
      aplicarCamera();
    }
    function mostrarNo(id) {
      const p = lay.por.get(id);
      if (!p) return;
      const r = tela.getBoundingClientRect();
      const c = est.camera;
      const sx = p.x * c.z + c.x, sy = p.y * c.z + c.y;
      if (sx < 16) c.x += 16 - sx; else if (sx + p.w * c.z > r.width - 16) c.x -= sx + p.w * c.z - (r.width - 16);
      if (sy < 16) c.y += 16 - sy; else if (sy + p.h * c.z > r.height - 16) c.y -= sy + p.h * c.z - (r.height - 16);
      aplicarCamera();
    }

    /* ----- Seleção e ações ----- */
    const escolhido = () => achar(arvore, est.selecionado);
    function selecionar(id) { est.selecionado = id; est.relacaoSel = ''; desenhar(); mostrarNo(id); tela.focus({ preventScroll: true }); }

    function desenharAcoes() {
      acoes.replaceChildren();
      if (est.relacaoDe) {
        const de = A.item(est.relacaoDe);
        acoes.append(el('span', 'agenda-mm-acoes-titulo', 'Ligar "' + (de ? de.titulo : '') + '": toque no outro compromisso.'), botao('Cancelar', () => { est.relacaoDe = ''; desenhar(); }, 'compras-chip'));
        return;
      }
      if (est.relacaoSel) {
        const r = A.dados.relacoes.find((x) => x.id === est.relacaoSel);
        if (r) {
          acoes.append(el('span', 'agenda-mm-acoes-titulo', 'Ligação: ' + ((A.item(r.de) || {}).titulo || '') + ' → ' + ((A.item(r.para) || {}).titulo || '') + (r.rotulo ? ' (' + r.rotulo + ')' : '')),
            botao('Dar nome', () => nomearRelacao(r), 'compras-chip'),
            botao('Excluir ligação', () => { const x = A.excluirRelacao(r.id); if (x.erro) return U.avisar(x.erro); est.relacaoSel = ''; }, 'compras-chip'));
          return;
        }
      }
      const n = escolhido();
      if (!n) return;
      const ac = n.item ? A.acesso(n.item) : { editar: true, concluir: true, excluir: true };
      const b = (txt, f, ativo = true, dica) => { const x = botao(txt, f, 'compras-chip'); x.disabled = !ativo; if (dica) x.title = dica; return x; };
      acoes.append(el('span', 'agenda-mm-acoes-titulo', n.titulo));
      if (n.tipo === 'item' || n.tipo === 'sub') acoes.append(b('Abrir', () => ctx.abrirItem(n.item.id)));
      const renomeavel = n.tipo === 'item' || n.tipo === 'sub' || (n.tipo === 'grupo' && n.grupo.lista);
      if (renomeavel) acoes.append(b('Renomear', () => editarTexto(n), n.tipo === 'grupo' || ac.editar, 'F2'));
      acoes.append(b('Subtópico', () => novoFilho(n), podeCriarFilho(n), 'Tab'), b('Tópico', () => novoIrmao(n), podeCriarIrmao(n), 'Enter'));
      if (n.tipo === 'item' || n.tipo === 'sub') acoes.append(b((n.tipo === 'item' ? n.item.concluida : n.sub.concluida) ? 'Reabrir' : 'Concluir', () => concluir(n), ac.concluir, 'Espaço'));
      if (n.tipo === 'item') acoes.append(b('Relação', () => { est.relacaoDe = n.item.id; desenhar(); }, ac.editar));
      if ((n.tipo === 'grupo' || n.tipo === 'item') && est.foco !== n.id) acoes.append(b('Focar', () => { est.foco = n.id; est.selecionado = n.id; desenhar(); }));
      if (est.foco) acoes.append(b('Mapa inteiro', () => { est.foco = ''; desenhar(); }));
      if ((n.filhos || []).length) acoes.append(b(prefs.recolhidos.includes(n.id) ? 'Expandir' : 'Recolher', () => alternarRecolhido(n.id), true, 'Ctrl+/'));
      if (n.tipo === 'item' || n.tipo === 'sub') acoes.append(b('Excluir', () => excluirNo(n), n.tipo === 'item' ? ac.excluir : ac.editar, 'Delete'));
    }

    const podeCriarFilho = (n) => (n.tipo === 'raiz' ? true : n.tipo === 'grupo' ? n.grupo.extra !== null : n.item ? A.acesso(n.item).editar : false);
    const podeCriarIrmao = (n) => (n.tipo === 'raiz' ? false : n.tipo === 'grupo' ? true : n.tipo === 'item' ? n.grupo.extra !== null : A.acesso(n.item).editar);

    function alternarRecolhido(id) {
      const i = prefs.recolhidos.indexOf(id);
      if (i >= 0) prefs.recolhidos.splice(i, 1); else prefs.recolhidos.push(id);
      guardar();
      desenhar();
    }

    function concluir(n) {
      if (n.tipo === 'item') { const r = A.alternarConcluida(n.item.id); if (!r) U.avisar('Você não tem permissão para concluir.'); else if (r === 'repetiu') U.avisar('Feito. O próximo fica para ' + D.quando(A.item(n.item.id), new Date()) + '.'); }
      else if (n.tipo === 'sub') { if (!A.alternarSubtarefa(n.item.id, n.sub.id)) U.avisar('Você não tem permissão para concluir.'); }
    }

    function excluirNo(n) {
      if (n.tipo === 'sub') { const r = A.excluirSubtarefa(n.item.id, n.sub.id); if (r.erro) U.avisar(r.erro); else { est.selecionado = paiDe(arvore, n.id).id; U.avisar('Subtarefa excluída.'); } return; }
      U.confirmar('Excluir compromisso', 'Excluir "' + n.item.titulo + '"? Não dá para desfazer.', 'Excluir', () => {
        if (!A.excluirItem(n.item.id)) return 'Você não tem permissão para excluir.';
        est.selecionado = paiDe(arvore, n.id).id;
        U.avisar('Compromisso excluído.');
        return undefined;
      }, { cor: ctx.cor, corTexto: ctx.corTexto, classe: 'agenda-dialog' });
    }

    function nomearRelacao(r) {
      U.dialogo({
        titulo: 'Nome da ligação', cor: ctx.cor, corTexto: ctx.corTexto, classe: 'agenda-dialog', rotuloSalvar: 'Salvar ligação',
        montar: (form) => { form.dataset.textoLivre = ''; const i = U.entrada('text', r.rotulo || '', { maxLength: 40, placeholder: 'Ex.: depende de, antes de' }); form.append(U.campo('Nome', i)); return { i }; },
        salvar: (c) => { const x = A.rotularRelacao(r.id, c.i.value); return x.erro || undefined; },
      });
    }

    /* ----- Editar no próprio mapa ----- */
    let editor = null;
    function caixaNaTela(id) {
      const p = lay.por.get(id);
      const c = est.camera;
      return p ? { x: p.x * c.z + c.x, y: p.y * c.z + c.y, w: p.w * c.z, h: p.h * c.z } : null;
    }
    function abrirEditor(pos, valor, confirmar) {
      fecharEditor();
      const i = U.entrada('text', valor, { maxLength: 200 });
      i.className = 'agenda-mm-edicao';
      i.dataset.textoLivre = '';
      i.setAttribute('aria-label', 'Texto do tópico (Enter confirma, Esc cancela)');
      i.style.left = Math.max(4, pos.x) + 'px';
      i.style.top = Math.max(4, pos.y) + 'px';
      i.style.minWidth = Math.max(180, pos.w) + 'px';
      let feito = false;
      const terminar = (ok) => { if (feito) return; feito = true; const v = i.value.trim(); fecharEditor(); if (ok && v) confirmar(v); tela.focus({ preventScroll: true }); };
      i.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); terminar(true); } else if (e.key === 'Escape') { e.preventDefault(); terminar(false); } };
      i.onblur = () => terminar(true);
      tela.append(i);
      editor = i;
      i.focus();
      i.select();
    }
    function fecharEditor() { if (editor) { const e = editor; editor = null; e.remove(); } }

    function editarTexto(n) {
      const pos = caixaNaTela(n.id);
      if (!pos) return;
      if (n.tipo === 'item') abrirEditor(pos, n.item.titulo, (v) => { const r = A.renomear(n.item.id, v); if (r.erro) U.avisar(r.erro); });
      else if (n.tipo === 'sub') abrirEditor(pos, n.sub.titulo, (v) => { const r = A.renomearSubtarefa(n.item.id, n.sub.id, v); if (r.erro) U.avisar(r.erro); });
      else if (n.tipo === 'grupo' && n.grupo.lista) abrirEditor(pos, n.grupo.lista.nome, (v) => { const r = A.salvarLista(n.grupo.lista.id, { nome: v }); if (r.erro) U.avisar(r.erro); });
    }
    const listaPadrao = () => (ctx.listaId || A.dados.listas[0].id);
    function criarCompromisso(grupo, texto) {
      const extra = { ...(grupo ? grupo.extra : {}) };
      const listaId = extra.listaId || listaPadrao();
      delete extra.listaId;
      const r = A.criarRapido(texto, listaId, { ...ctx.padrao(), ...extra });
      if (r.erro) return U.avisar(r.erro);
      if (grupo) { est.selecionado = grupo.chave + '>' + r.id; ctx.aoMudar(); }
    }
    function novoFilho(n) {
      if (!podeCriarFilho(n)) return U.avisar(n.tipo === 'grupo' ? 'Neste grupo não dá para criar (mude o agrupamento).' : 'Você não tem permissão para editar.');
      const pos = caixaNaTela(n.id);
      const abaixo = { x: pos.x + 24, y: pos.y + pos.h + 6, w: 200 };
      if (n.tipo === 'raiz') {
        const g = n.filhos.find((x) => x.grupo.extra !== null);
        return abrirEditor(abaixo, '', (v) => criarCompromisso(g ? g.grupo : null, v));
      }
      if (n.tipo === 'grupo') return abrirEditor(abaixo, '', (v) => criarCompromisso(n.grupo, v));
      if (n.tipo === 'item') return abrirEditor(abaixo, '', (v) => { const r = A.adicionarSubtarefa(n.item.id, v); if (r.erro) return U.avisar(r.erro); est.selecionado = n.id + '>' + r.id; ctx.aoMudar(); });
      return abrirEditor(abaixo, '', (v) => { const r = A.adicionarSubtarefa(n.item.id, v, n.sub.id); if (r.erro) return U.avisar(r.erro); est.selecionado = paiDe(arvore, n.id).id + '>' + r.id; ctx.aoMudar(); });
    }
    function novoIrmao(n) {
      if (!podeCriarIrmao(n)) return U.avisar(n.tipo === 'raiz' ? 'A raiz não tem irmão: use Tab para criar um compromisso.' : 'Aqui não dá para criar.');
      const pos = caixaNaTela(n.id);
      const abaixo = { x: pos.x, y: pos.y + pos.h + 6, w: 200 };
      if (n.tipo === 'grupo') {
        if (prefs.agrupar !== 'lista') return U.avisar('Para criar um grupo novo, agrupe por lista (vira uma lista nova).');
        return abrirEditor(abaixo, '', (v) => { const r = A.salvarLista('', { nome: v }); if (r.erro) U.avisar(r.erro); else { est.selecionado = 'l:' + r.id; ctx.aoMudar(); } });
      }
      if (n.tipo === 'item') return abrirEditor(abaixo, '', (v) => criarCompromisso(n.grupo, v));
      return abrirEditor(abaixo, '', (v) => { const r = A.adicionarSubtarefa(n.item.id, v, n.sub.id); if (r.erro) return U.avisar(r.erro); est.selecionado = paiDe(arvore, n.id).id + '>' + r.id; ctx.aoMudar(); });
    }

    /* ----- Teclado (como o XMind) ----- */
    function andar(dir) {
      const n = escolhido();
      const p = lay.por.get(n.id);
      const pai = paiDe(arvore, n.id);
      const visiveis = (x) => (prefs.recolhidos.includes(x.id) && !est.busca ? [] : x.filhos || []);
      const irmaos = pai ? visiveis(pai) : [n];
      const k = irmaos.findIndex((x) => x.id === n.id);
      const vertical = prefs.estrutura === 'organograma';
      const ladoEsq = p && p.lado === -1;
      let alvo = null;
      const filho = () => { const f = visiveis(n); return f[0]; };
      const proxIrmao = (d) => irmaos[k + d];
      if (vertical) alvo = { ArrowDown: filho(), ArrowUp: pai, ArrowRight: proxIrmao(1), ArrowLeft: proxIrmao(-1) }[dir];
      else alvo = { ArrowRight: ladoEsq ? pai : filho(), ArrowLeft: ladoEsq ? filho() : pai, ArrowDown: proxIrmao(1), ArrowUp: proxIrmao(-1) }[dir];
      if (!alvo && n.tipo === 'raiz' && dir === 'ArrowLeft') alvo = (n.filhos || []).find((f) => (lay.por.get(f.id) || {}).lado === -1);
      if (alvo) selecionar(alvo.id);
    }
    tela.addEventListener('keydown', (e) => {
      if (editor) return;
      const n = escolhido();
      if (!n) return;
      if (e.key.startsWith('Arrow')) { e.preventDefault(); andar(e.key); }
      else if (e.key === 'Tab') { e.preventDefault(); novoFilho(n); }
      else if (e.key === 'Enter') { e.preventDefault(); if (e.ctrlKey || e.metaKey) { if (n.item) ctx.abrirItem(n.item.id); } else novoIrmao(n); }
      else if (e.key === 'F2') { e.preventDefault(); editarTexto(n); }
      else if (e.key === ' ') { e.preventDefault(); concluir(n); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); if (n.tipo === 'item' || n.tipo === 'sub') excluirNo(n); }
      else if (e.key === '/' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if ((n.filhos || []).length) alternarRecolhido(n.id); }
      else if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomEm(1.2); }
      else if (e.key === '-') { e.preventDefault(); zoomEm(1 / 1.2); }
      else if (e.key === '0') { e.preventDefault(); est.camera = null; desenhar(); }
      else if (e.key === 'Escape') { est.relacaoDe = ''; est.relacaoSel = ''; desenhar(); }
    });

    /* ----- Ponteiro: selecionar, mover o mapa, aproximar com dois dedos, arrastar tópico ----- */
    const ponteiros = new Map();
    let gesto = null;
    const noEm = (alvo) => { const g = alvo && alvo.closest && alvo.closest('.agenda-mm-no'); return g ? g.dataset.id : ''; };
    tela.addEventListener('pointerdown', (e) => {
      if (e.target === editor || e.target.closest('.agenda-mm-zoom')) return;
      tela.setPointerCapture(e.pointerId);
      ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ponteiros.size === 2) { const [a, b] = [...ponteiros.values()]; gesto = { tipo: 'pinca', dist: Math.hypot(a.x - b.x, a.y - b.y) }; return; }
      const id = noEm(e.target);
      const rel = e.target.dataset && e.target.dataset.relacao;
      gesto = { tipo: id ? 'no' : rel ? 'relacao' : 'mover', id, rel, acao: e.target.dataset ? e.target.dataset.acao : '', x0: e.clientX, y0: e.clientY, cx: est.camera.x, cy: est.camera.y, arrastando: false };
    });
    tela.addEventListener('pointermove', (e) => {
      if (!ponteiros.has(e.pointerId) || !gesto) return;
      ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (gesto.tipo === 'pinca' && ponteiros.size === 2) {
        const [a, b] = [...ponteiros.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const r = tela.getBoundingClientRect();
        zoomEm(d / gesto.dist, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
        gesto.dist = d;
        return;
      }
      const dx = e.clientX - gesto.x0, dy = e.clientY - gesto.y0;
      if (gesto.tipo === 'mover') { est.camera.x = gesto.cx + dx; est.camera.y = gesto.cy + dy; aplicarCamera(); return; }
      if (gesto.tipo === 'no' && !gesto.arrastando && Math.hypot(dx, dy) > 6) {
        const n = achar(arvore, gesto.id);
        if (n && (n.tipo === 'item' || n.tipo === 'sub')) { gesto.arrastando = true; gesto.n = n; gesto.g = document.getElementById('mm-' + cssId(n.id)); gesto.base = gesto.g.getAttribute('transform'); gesto.g.classList.add('arrastando'); }
        else { gesto.tipo = 'mover'; gesto.cx = est.camera.x; gesto.cy = est.camera.y; gesto.x0 = e.clientX; gesto.y0 = e.clientY; }
      }
      if (gesto.arrastando) {
        const p = lay.por.get(gesto.n.id);
        gesto.g.setAttribute('transform', `translate(${p.x + dx / est.camera.z},${p.y + dy / est.camera.z})`);
        gesto.g.style.pointerEvents = 'none';
        const sob = document.elementFromPoint(e.clientX, e.clientY);
        const alvo = noEm(sob);
        tela.querySelectorAll('.agenda-mm-no.alvo').forEach((x) => x.classList.remove('alvo'));
        if (alvo && destinoValido(gesto.n, achar(arvore, alvo))) document.getElementById('mm-' + cssId(alvo)).classList.add('alvo');
        gesto.alvo = alvo;
      }
    });
    function destinoValido(n, alvo) {
      if (!alvo || alvo.id === n.id) return false;
      if (n.tipo === 'item') return alvo.tipo === 'grupo' && alvo.grupo.soltar && alvo.id !== n.grupo.chave;
      if (n.tipo === 'sub') return alvo.tipo === 'item' && alvo.item.id !== n.item.id;
      return false;
    }
    tela.addEventListener('pointerup', (e) => {
      ponteiros.delete(e.pointerId);
      const g = gesto;
      if (!g || g.tipo === 'pinca') { if (!ponteiros.size) gesto = null; return; }
      gesto = null;
      if (g.arrastando) {
        g.g.classList.remove('arrastando');
        g.g.style.pointerEvents = '';
        tela.querySelectorAll('.agenda-mm-no.alvo').forEach((x) => x.classList.remove('alvo'));
        const alvo = achar(arvore, g.alvo);
        if (destinoValido(g.n, alvo)) {
          const r = g.n.tipo === 'item' ? A.definir(g.n.item.id, alvo.grupo.soltar) : A.moverSubtarefa(g.n.item.id, g.n.sub.id, alvo.item.id);
          if (r.erro) U.avisar(r.erro); else U.avisar(g.n.tipo === 'item' ? 'Levado para ' + alvo.titulo + '.' : 'Subtarefa levada para ' + alvo.titulo + '.');
          if (!r.erro) return;
        }
        g.g.setAttribute('transform', g.base);
        if (alvo && !destinoValido(g.n, alvo)) U.avisar(g.n.tipo === 'item' ? (alvo.tipo === 'grupo' && !alvo.grupo.soltar ? 'Arrastar não muda ' + (prefs.agrupar === 'responsavel' ? 'o responsável' : prefs.agrupar === 'etiqueta' ? 'a etiqueta' : 'esta data') + '; use o compromisso.' : 'Solte o compromisso em um grupo.') : 'Solte a subtarefa em outro compromisso.');
        return;
      }
      if (g.tipo === 'relacao') { est.relacaoSel = g.rel; est.selecionado = ''; desenhar(); return; }
      if (g.tipo !== 'no') return;
      const n = achar(arvore, g.id);
      if (!n) return;
      if (est.relacaoDe) {
        if (n.tipo !== 'item') return U.avisar('Toque em um compromisso.');
        const r = A.criarRelacao(est.relacaoDe, n.item.id, '');
        est.relacaoDe = '';
        if (r.erro) { U.avisar(r.erro); desenhar(); } else { est.relacaoSel = r.id; est.selecionado = ''; ctx.aoMudar(); U.avisar('Compromissos ligados. Toque em "Dar nome" para escrever o tipo da ligação.'); }
        return;
      }
      if (g.acao === 'recolher') return alternarRecolhido(n.id);
      if (g.acao === 'concluir' && est.selecionado === n.id) return concluir(n);
      // Dois toques no mesmo tópico: abre o compromisso (ou renomeia a lista).
      const agora = Date.now();
      if (est.ultimoToque.id === n.id && agora - est.ultimoToque.t < 350) { est.ultimoToque = { id: '', t: 0 }; if (n.item) ctx.abrirItem(n.item.id); else if (n.tipo === 'grupo') editarTexto(n); return; }
      est.ultimoToque = { id: n.id, t: agora };
      selecionar(n.id);
    });
    tela.addEventListener('pointercancel', (e) => { ponteiros.delete(e.pointerId); gesto = null; });
    tela.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = tela.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) zoomEm(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX - r.left, e.clientY - r.top);
      else { est.camera.x -= e.deltaX; est.camera.y -= e.deltaY; aplicarCamera(); }
    }, { passive: false });
    tela.addEventListener('contextmenu', (e) => { const id = noEm(e.target); if (id) { e.preventDefault(); selecionar(id); acoes.querySelector('button')?.focus(); } });

    /* ----- Exportar ----- */
    function exportar(formato) {
      const nome = 'agenda-mapa-mental-' + D.isoData(new Date());
      if (formato === 'md') {
        const linhas = [];
        const andarMd = (n, nivel) => {
          if (n.tipo === 'raiz') linhas.push('# ' + n.titulo);
          else if (n.tipo === 'grupo') linhas.push('\n## ' + n.titulo);
          else if (n.tipo === 'item') linhas.push('- [' + (n.item.concluida ? 'x' : ' ') + '] ' + n.titulo + (n.meta ? ' — ' + n.meta : ''));
          else linhas.push('  '.repeat(Math.max(1, nivel - 2)) + '- [' + (n.sub.concluida ? 'x' : ' ') + '] ' + n.titulo);
          (n.filhos || []).forEach((f) => andarMd(f, nivel + 1));
        };
        andarMd(arvore, 0);
        return baixar(new Blob([linhas.join('\n') + '\n'], { type: 'text/markdown;charset=utf-8' }), nome + '.md');
      }
      const c = lay.caixa;
      const m = 32;
      const copia = desenho.cloneNode(true);
      copia.setAttribute('xmlns', NS);
      copia.setAttribute('viewBox', `${c.x - m} ${c.y - m} ${c.w + 2 * m} ${c.h + 2 * m}`);
      copia.setAttribute('width', String(Math.round(c.w + 2 * m)));
      copia.setAttribute('height', String(Math.round(c.h + 2 * m)));
      copia.querySelector('g').removeAttribute('transform');
      copia.querySelectorAll('.agenda-mm-recolher, .agenda-mm-relacao-alvo').forEach((x) => x.remove());
      const fundo = document.createElementNS(NS, 'rect');
      Object.entries({ x: c.x - m, y: c.y - m, width: c.w + 2 * m, height: c.h + 2 * m, fill: tema().fundo }).forEach(([k, v]) => fundo.setAttribute(k, v));
      copia.prepend(fundo);
      const texto = '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(copia);
      if (formato === 'svg') return baixar(new Blob([texto], { type: 'image/svg+xml;charset=utf-8' }), nome + '.svg');
      const img = new Image();
      const url = URL.createObjectURL(new Blob([texto], { type: 'image/svg+xml;charset=utf-8' }));
      img.onload = () => {
        const escala = Math.min(2, 8000 / Math.max(c.w, c.h));
        const tela2 = document.createElement('canvas');
        tela2.width = Math.round((c.w + 2 * m) * escala);
        tela2.height = Math.round((c.h + 2 * m) * escala);
        const cx = tela2.getContext('2d');
        cx.scale(escala, escala);
        cx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        tela2.toBlob((b) => (b ? baixar(b, nome + '.png') : U.avisar('Não foi possível gerar a imagem.')), 'image/png');
      };
      img.onerror = () => { URL.revokeObjectURL(url); U.avisar('Não foi possível gerar a imagem.'); };
      img.src = url;
    }
    function baixar(blob, nome) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = nome;
      document.body.append(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      U.avisar('Arquivo ' + nome + ' gerado.');
    }

    desenhar();
    // O zoom de ajuste depende do tamanho da tela: se ela ainda não tinha tamanho, ajusta de novo.
    requestAnimationFrame(() => { if (est.cameraProvisoria) { est.camera = null; desenhar(); } });
    // Depois de uma ação pelo teclado a tela é redesenhada: o foco volta para o mapa.
    if (Date.now() - (est.teclaEm || 0) < 2000) tela.focus({ preventScroll: true });
    tela.addEventListener('keydown', () => { est.teclaEm = Date.now(); est.ultimoToque = { id: '', t: 0 }; }, true);
    acoes.addEventListener('click', () => { est.teclaEm = Date.now(); }, true);
  }

  window.CicluzAgendaMapaMental = { render, AGRUPAMENTOS, prefs: () => prefs, estado: est };
})();
