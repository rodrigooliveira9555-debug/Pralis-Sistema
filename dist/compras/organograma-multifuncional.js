/*
 * DES - Organograma Multifuncional — AMBIENTE DE TESTE (Rodrigo, 27/11/2026).
 * Uma tela só para montar a estrutura da loja como MAPA MENTAL em árvore: Loja › Área › Setor › Local › Cargo › Horário / Escala. "Ao lado"
 * insere o nível seguinte (a ordem é fixa: Área, depois Setor, depois Local; no bloco também entra Cargo) e "Abaixo" insere outro do mesmo nível.
 * O Horário / Escala criado aqui entra numa lista única e é escolhido de novo no próximo local, sem criar outra vez.
 *
 * TESTE: tudo fica numa chave própria deste aparelho (cicluz-teste-organograma-multifuncional-v1). Nada aqui grava em
 * Área / Setor / Local, Cargos ou Horário / Escala de verdade; a lista de cargos é só LIDA do cadastro de cargos (pelo ID).
 * Depois de aprovado o teste, a gravação passa para os cadastros reais (cicluz-location-tree-v1 e cicluz-jornadas-v1), sem cópia.
 * Os dados de exemplo (Operação de Loja) usam horas de exemplo, não regra da empresa. "Recomeçar o teste" volta ao exemplo.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  if (!U) return;
  const { el, botao, campo, entrada } = U;
  const KEY = 'cicluz-teste-organograma-multifuncional-v1';
  const cor = () => (typeof menuColor !== 'undefined' && menuColor[2]) || '#ef4444';
  const COR_TEXTO = '#9c1c1c';
  // A ordem é fixa: abaixo da Loja só Área, abaixo da Área só Setor, abaixo do Setor só Local.
  const TIPOS = {
    loja: { nome: 'Loja', filho: 'area' },
    area: { nome: 'Área', filho: 'setor', plural: 'áreas' },
    setor: { nome: 'Setor', filho: 'local', plural: 'setores' },
    local: { nome: 'Local', filho: null, plural: 'locais' },
  };
  const DIAS = [['1', 'Seg', 'Segunda-feira'], ['2', 'Ter', 'Terça-feira'], ['3', 'Qua', 'Quarta-feira'], ['4', 'Qui', 'Quinta-feira'], ['5', 'Sex', 'Sexta-feira'], ['6', 'Sáb', 'Sábado'], ['0', 'Dom', 'Domingo']];
  const ORDEM = DIAS.map((d) => d[0]);
  const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
  const ICONE_CARGO = '<circle cx="12" cy="8" r="3.5"/><path d="M5 20v-1a6 6 0 0 1 14 0v1"/>';
  const ICONE_LOJA = '<path d="M3 21V9l9-5 9 5v12M9 21v-6h6v6"/>';
  const LAPIS = '<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/>';

  const novoId = (p) => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const compactar = (v) => (window.CicluzIdentity ? CicluzIdentity.compact(v) : Array.from(String(v || '').trim()).slice(0, 3).join('')).toLocaleUpperCase('pt-BR');
  const siglaDoNome = (nome) => compactar(String(nome || '').replace(/\s+/g, ''));
  const mesmoNome = (a, b) => U.dobrar(a).trim() === U.dobrar(b).trim();
  const limpar = (t) => String(t || '').trim().replace(/\s+/g, ' ');
  /** Cargos do cadastro real (DES - Cargos C/Salários), só para LER: id e nome. */
  function cargosReais() {
    try { return (window.CicluzHierarquia ? CicluzHierarquia.cargos() : []).slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')); } catch (e) { return []; }
  }

  /* ---------- Horário / Escala: textos ---------- */
  function textoDosDias(dias) {
    const set = new Set(dias); const semana = ORDEM.filter((d) => set.has(d)); const partes = []; let i = 0;
    const nome = (d) => DIAS.find((x) => x[0] === d)[1];
    while (i < semana.length) {
      let j = i;
      while (j + 1 < semana.length && ORDEM.indexOf(semana[j + 1]) === ORDEM.indexOf(semana[j]) + 1) j++;
      if (j - i >= 2) partes.push(nome(semana[i]) + ' a ' + nome(semana[j])); else for (let k = i; k <= j; k++) partes.push(nome(semana[k]));
      i = j + 1;
    }
    return partes.join(', ') || '—';
  }
  const textoDoHorario = (h) => h.entrada + '–' + h.saida + ' · ' + textoDosDias(h.dias) + (h.intervaloInicio ? ' · intervalo ' + h.intervaloInicio + '–' + h.intervaloFim : '');

  /* ---------- Dados do teste (só neste aparelho, chave própria) ---------- */
  function exemplo() {
    const d = { version: 1, criadoEm: new Date().toISOString(), nos: [], cargos: [], horarios: [] };
    const horario = (nome, ent, sai, ii, fi) => { const x = { id: novoId('hr'), nome, sigla: siglaDoNome(nome), dias: ['1', '2', '3', '4', '5', '6'], entrada: ent, saida: sai, intervaloInicio: ii, intervaloFim: fi }; d.horarios.push(x); return x.id; };
    // Horas de EXEMPLO, só para o teste ter o que mostrar.
    const M = horario('Manhã', '06:00', '14:20', '10:00', '11:00');
    const I = horario('Intermediário', '10:00', '18:20', '14:00', '15:00');
    const T = horario('Tarde', '13:40', '22:00', '17:00', '18:00');
    const no = (tipo, nome, paiId) => { const x = { id: novoId('no'), tipo, nome, sigla: siglaDoNome(nome), paiId: paiId || null }; d.nos.push(x); return x.id; };
    const reais = cargosReais();
    const cargo = (noId, nome, horarioIds) => {
      const real = reais.find((c) => mesmoNome(c.nome, nome));
      d.cargos.push({ id: novoId('cg'), noId, cargoId: real ? real.id : null, cargoNome: real ? real.nome : nome, horarioIds });
    };
    const area = no('area', 'Operação de Loja');
    const caixa = no('setor', 'Caixa', area); const atend = no('setor', 'Atendimento', area);
    const repo = no('setor', 'Reposição', area); const limpeza = no('setor', 'Limpeza', area);
    cargo(no('local', 'Caixa Principal', caixa), 'Operador de Caixa', [M, T]);
    cargo(no('local', 'Caixa Secundário', caixa), 'Operador de Caixa', [M, I, T]);
    ['Copa', 'Mesa', 'Chapa'].forEach((n) => cargo(no('local', n, atend), 'Balconista', [M, T]));
    ['Vitrine', 'Pães e Frios'].forEach((n) => cargo(no('local', n, atend), 'Balconista', [M, I, T]));
    cargo(repo, 'Balconista', [M, T]);
    cargo(limpeza, 'Serviços Gerais', [I]);
    return d;
  }
  let dados = null; let erroLeitura = false;
  function ler() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!s) { dados = exemplo(); localStorage.setItem(KEY, JSON.stringify(dados)); return; }
      if (s.version !== 1 || !Array.isArray(s.nos) || !Array.isArray(s.cargos) || !Array.isArray(s.horarios)) throw new Error('formato');
      dados = s;
    } catch (e) { erroLeitura = true; dados = { version: 1, nos: [], cargos: [], horarios: [] }; }
  }
  /** Grava; se não der, volta ao que estava e devolve false. */
  function gravar(mudar) {
    const antes = JSON.stringify(dados);
    try { if (erroLeitura) throw new Error('leitura'); mudar(dados); localStorage.setItem(KEY, JSON.stringify(dados)); return true; } catch (e) { dados = JSON.parse(antes); return false; }
  }

  const filhos = (paiId) => dados.nos.filter((n) => n.paiId === paiId);
  const cargosDe = (noId) => dados.cargos.filter((c) => c.noId === noId);
  const horarioPorId = (id) => dados.horarios.find((h) => h.id === id);
  /** Tudo abaixo de um bloco (ele incluso): blocos e cargos. */
  function abaixoDe(id) {
    const ids = [id]; for (let i = 0; i < ids.length; i++) filhos(ids[i]).forEach((n) => ids.push(n.id));
    return { nos: ids, cargos: dados.cargos.filter((c) => ids.includes(c.noId)) };
  }

  /* ---------- Tela: MAPA MENTAL em árvore (Rodrigo, 27/11/2026) ----------
   * A Loja fica no meio; cada galho cresce PARA O LADO (o nível de baixo, o cargo, o horário) e os irmãos se empilham PARA BAIXO.
   * As posições vêm do mesmo motor do mapa mental da Agenda (CicluzAgendaMapaLayout: Mapa, Lógico ou Organograma); o desenho é SVG.
   * Tocar num tópico o seleciona e mostra, NO PRÓPRIO TÓPICO, o "+" do lado (o nível seguinte) e o "+" de baixo (outro do mesmo nível).
   * Tocar de novo edita. Visão COMPLETA (nome e resumo) ou COMPACTA (só os quadradinhos; o nome aparece ao passar o mouse).
   * Outra visão, BARRAS: as horas na horizontal e, na vertical, as áreas com os cargos; cada horário / escala do cargo é uma barra.
   * Teclado como no XMind: Tab = ao lado, Enter = abaixo, F2 = editar, Espaço = recolher/expandir. */
  const NS = 'http://www.w3.org/2000/svg';
  const PREF = 'cicluz-teste-organograma-mapa';
  const ESTRUTURAS = [['mapa', 'Mapa'], ['logico', 'Lógico'], ['organograma', 'Organograma'], ['barras', 'Barras']];
  const DETALHE = [['completo', 'Completo'], ['compacto', 'Compacto']];
  let prefs = { estrutura: 'mapa', detalhe: 'completo', zoom: 1 };
  try { prefs = { ...prefs, ...JSON.parse(localStorage.getItem(PREF) || '{}') }; } catch (e) { /* padrão */ }
  const guardarPrefs = () => { try { localStorage.setItem(PREF, JSON.stringify(prefs)); } catch (e) { /* só nesta visita */ } };
  let tela = null; const recolhidos = new Set(); let selecionado = 'raiz'; let ultimoToque = { id: '', t: 0 };
  const caminho = () => (typeof menuCrumb === 'function' ? menuCrumb(2, 'Cadastros Geral Colaboradores', 'DES - Organograma Multifuncional') : 'Saídas · Despesas / Cadastros Geral Colaboradores / DES - Organograma Multifuncional');
  const ICONE_RELOGIO = '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>';
  const FONTE = 'Montserrat, Arial, sans-serif';
  const tela2d = document.createElement('canvas').getContext('2d');
  const medir = (fonte) => (t) => { tela2d.font = fonte; return tela2d.measureText(t).width; };

  function abrir() {
    if (!dados) ler();
    if (!tela) {
      tela = U.criarTela({ id: 'des-organograma-multifuncional', titulo: 'DES - Organograma Multifuncional', caminho: caminho(), icone: 'cadastro', voltar: () => menuBack(2, 'Cadastros Geral Colaboradores')(), cor: cor(), corTexto: COR_TEXTO });
      U.atalho(tela, 'Recomeçar o teste com o exemplo', 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5', recomecar);
      U.atalho(tela, 'Nova área', 'M12 5v14M5 12h14', () => inserir(null), { criar: true });
    }
    tela.ativar();
    render();
  }

  /** A árvore do mapa: Loja › Áreas › Setores › Locais, e em cada bloco os cargos (antes dos blocos de baixo) e em cada cargo os horários. */
  function arvoreDoMapa() {
    const tamanho = (n) => {
      const raiz = n.tipo === 'loja';
      if (prefs.detalhe === 'compacto') { n.linhas = []; n.w = n.h = raiz ? 44 : 36; return n; }
      const fonte = (raiz ? '700 15px ' : '600 13px ') + FONTE;
      n.linhas = L().quebrar(n.nome, 170, medir(fonte), 2);
      const larguraTexto = Math.max(...n.linhas.map(medir(fonte)), medir('500 11px ' + FONTE)(n.meta), 30);
      n.w = Math.ceil(10 + 28 + 9 + Math.min(larguraTexto, 190) + 12);
      n.h = Math.max(raiz ? 50 : 44, 10 + n.linhas.length * 16 + 14 + 8);
      return n;
    };
    const resumoDe = (fs, cs, tipoFilho) => [fs.length && tipoFilho ? fs.length + ' ' + (fs.length === 1 ? TIPOS[tipoFilho].nome.toLowerCase() : TIPOS[tipoFilho].plural) : '', cs.length ? cs.length + (cs.length === 1 ? ' cargo' : ' cargos') : ''].filter(Boolean).join(' · ');
    const bloco = (n) => {
      const fs = filhos(n.id); const cs = cargosDe(n.id); const r = resumoDe(fs, cs, TIPOS[n.tipo].filho);
      return tamanho({
        id: n.id, tipo: n.tipo, nome: n.nome, sigla: n.sigla, ref: n, meta: TIPOS[n.tipo].nome + (r ? ' · ' + r : ''),
        filhos: [...cs.map((c) => cargo(c, n)), ...fs.map(bloco)],
      });
    };
    const cargo = (c, n) => {
      const hs = c.horarioIds.map(horarioPorId).filter(Boolean);
      return tamanho({
        id: 'c:' + c.id, tipo: 'cargo', nome: c.cargoNome, ref: c, pai: n, meta: c.cargoId ? 'Cargo' : 'Cargo · fora do cadastro', falta: !hs.length,
        filhos: hs.length ? hs.map((h) => tamanho({ id: 'h:' + c.id + ':' + h.id, tipo: 'horario', nome: h.nome, ref: h, cargo: c, pai: n, meta: h.entrada + '–' + h.saida + ' · ' + textoDosDias(h.dias), filhos: [] }))
          : [tamanho({ id: 'f:' + c.id, tipo: 'falta', nome: 'Sem horário / escala', ref: null, cargo: c, pai: n, meta: 'Toque para escolher', filhos: [] })],
      });
    };
    const fs = filhos(null);
    return tamanho({ id: 'raiz', tipo: 'loja', nome: 'Loja', ref: null, meta: fs.length + (fs.length === 1 ? ' área' : ' áreas'), filhos: fs.map(bloco) });
  }
  const L = () => window.CicluzAgendaMapaLayout;

  function render() {
    if (!tela) return;
    const sec = U.secao('Organograma da loja');
    sec.querySelector('.compras-secao-cab h3').replaceChildren(U.botaoTitulo('Nova Área', 'Inserir área na loja', () => inserir(null)));
    const zoom = (z) => { prefs.zoom = Math.min(2, Math.max(0.4, Math.round(z * 10) / 10)); guardarPrefs(); render(); };
    const r = (rotulo, desenho, acao) => { const b = el('button', 'shortcut-circle compras-redondo'); b.type = 'button'; b.title = rotulo; b.setAttribute('aria-label', rotulo); b.innerHTML = U.svg(desenho); b.onclick = acao; return b; };
    const corpo = el('div', 'org-mapa-corpo');
    if (erroLeitura || !L()) {
      corpo.append(U.vazio(erroLeitura ? 'Não foi possível ler o teste guardado neste aparelho.' : 'O desenho do mapa não carregou.', erroLeitura ? 'Use "Recomeçar o teste" no alto da tela.' : 'Recarregue a página.'));
    } else {
      const arvore = arvoreDoMapa();
      const todos = new Map(); (function ver(n) { todos.set(n.id, n); n.filhos.forEach(ver); })(arvore);
      if (!todos.has(selecionado)) selecionado = 'raiz';
      // Barra: a estrutura do mapa e o que fazer com o tópico selecionado.
      const estrutura = U.chips(ESTRUTURAS, prefs.estrutura, (v) => { prefs.estrutura = v; guardarPrefs(); render(); });
      estrutura.setAttribute('aria-label', 'Estrutura do mapa');
      const zoomBox = el('div', 'org-mapa-zoom'); zoomBox.append(r('Diminuir o mapa', '<path d="M5 12h14"/>', () => zoom(prefs.zoom - 0.1)), el('span', 'org-mapa-zoom-valor', Math.round(prefs.zoom * 100) + '%'), r('Aumentar o mapa', '<path d="M12 5v14M5 12h14"/>', () => zoom(prefs.zoom + 0.1)));
      const barra = el('div', 'org-mapa-barra'); barra.append(estrutura);
      if (prefs.estrutura === 'barras') { corpo.append(barra, barras()); } else {
        const detalhe = U.chips(DETALHE, prefs.detalhe, (v) => { prefs.detalhe = v; guardarPrefs(); render(); });
        detalhe.setAttribute('aria-label', 'Detalhe do mapa');
        barra.append(detalhe, zoomBox);
        corpo.append(barra, barraDoTopico(todos.get(selecionado), todos));
        corpo.append(desenhar(arvore, todos));
      }
    }
    sec.append(corpo);
    const texto = 'AMBIENTE DE TESTE: o que você monta aqui fica só neste teste e não muda Área / Setor / Local, Cargos nem Horário / Escala de verdade. ' +
      'Toque num tópico para selecionar: o "+" do lado cria o próximo nível (Área › Setor › Local, Cargo, Horário / Escala) e o "+" de baixo cria outro do mesmo nível. Toque de novo para editar. Todo cargo tem um ou mais horários / escalas. ' +
      'No teclado: Tab = ao lado, Enter = abaixo, F2 = editar, Espaço = recolher.';
    tela.body.replaceChildren(U.infoDaLista(sec, texto, 'organograma-multifuncional-teste'));
    const area = tela.body.querySelector('.org-mapa-area'); const alvo = area && area.querySelector('.org-mapa-no.selecionado');
    if (alvo) { const a = area.getBoundingClientRect(); const b = alvo.getBoundingClientRect(); if (b.left < a.left || b.right > a.right) area.scrollLeft += b.left - a.left - (a.width - b.width) / 2; }
  }

  /** O que cada tópico faz: ao lado (filho), abaixo (irmão), editar. */
  function acoesDe(t) {
    const pai = t.pai;
    switch (t.tipo) {
      case 'loja': return { lado: ['Área', () => inserir(null)], editar: null };
      case 'area': case 'setor': return { lado: [TIPOS[TIPOS[t.tipo].filho].nome + ' ou Cargo', () => inserir(t.ref)], abaixo: [TIPOS[t.tipo].nome, () => inserir(t.ref.paiId ? dados.nos.find((x) => x.id === t.ref.paiId) : null)], editar: () => editarNo(t.ref) };
      case 'local': return { lado: ['Cargo', () => inserir(t.ref)], abaixo: ['Local', () => inserir(dados.nos.find((x) => x.id === t.ref.paiId))], editar: () => editarNo(t.ref) };
      case 'cargo': return { lado: ['Horário / Escala', () => editarCargo(t.ref, pai)], abaixo: ['Cargo', () => inserir(pai, 'cargo')], editar: () => editarCargo(t.ref, pai) };
      case 'horario': return { abaixo: ['Horário / Escala', () => editarCargo(t.cargo, pai)], editar: () => editarHorario(t.ref) };
      default: return { lado: ['Horário / Escala', () => editarCargo(t.cargo, pai)], editar: () => editarCargo(t.cargo, pai) };
    }
  }
  function alternarRecolher(t) { if (!t.filhos.length) return; if (recolhidos.has(t.id)) recolhidos.delete(t.id); else recolhidos.add(t.id); render(); }

  function barraDoTopico(t) {
    const a = acoesDe(t);
    const barra = el('div', 'org-mapa-topico'); barra.setAttribute('role', 'toolbar'); barra.setAttribute('aria-label', 'Tópico selecionado: ' + t.nome);
    const nome = el('div', 'org-mapa-topico-nome'); nome.append(el('small', null, 'Selecionado'), el('b', null, t.nome));
    const acoes = el('div', 'org-mapa-topico-acoes');
    const r = (rotulo, desenho, acao) => { const b = el('button', 'shortcut-circle compras-redondo'); b.type = 'button'; b.title = rotulo; b.setAttribute('aria-label', rotulo); b.innerHTML = U.svg(desenho); b.onclick = acao; return b; };
    if (a.editar) acoes.append(r('Editar ' + t.nome, LAPIS, a.editar));
    if (t.filhos.length) acoes.append(r((recolhidos.has(t.id) ? 'Expandir ' : 'Recolher ') + t.nome, recolhidos.has(t.id) ? '<path d="M12 5v14M5 12h14"/>' : '<path d="M5 12h14"/>', () => alternarRecolher(t)));
    const dica = el('small', 'org-mapa-topico-dica', [a.lado ? '+ do lado: ' + a.lado[0] : '', a.abaixo ? '+ de baixo: ' + a.abaixo[0] : ''].filter(Boolean).join(' · '));
    nome.append(dica);
    barra.append(nome, acoes);
    return barra;
  }

  function desenhar(arvore, todos) {
    const pos = L().calcular(arvore, prefs.estrutura, { recolhidos, hgap: 44, vgap: 12 });
    const M = 16; const cx = pos.caixa;
    const area = el('div', 'org-mapa-area'); area.tabIndex = 0; area.setAttribute('role', 'tree'); area.setAttribute('aria-label', 'Mapa mental da loja. Tab: inserir ao lado; Enter: inserir abaixo; F2: editar; Espaço: recolher.');
    const s = (tag, at = {}) => { const e = document.createElementNS(NS, tag); Object.entries(at).forEach(([k, v]) => e.setAttribute(k, v)); return e; };
    const W = cx.w + M * 2; const H = cx.h + M * 2;
    const svg = s('svg', { viewBox: (cx.x - M) + ' ' + (cx.y - M) + ' ' + W + ' ' + H, width: Math.round(W * prefs.zoom), height: Math.round(H * prefs.zoom), class: 'org-mapa-svg' });
    pos.ligacoes.forEach((l) => {
      let d;
      if (l.tipo === 'cotovelo-v') { const my = (l.y1 + l.y2) / 2; d = `M${l.x1} ${l.y1}V${my}H${l.x2}V${l.y2}`; } else { const mx = (l.x1 + l.x2) / 2; d = `M${l.x1} ${l.y1}C${mx} ${l.y1} ${mx} ${l.y2} ${l.x2} ${l.y2}`; }
      svg.append(s('path', { d, class: 'org-mapa-ligacao' + (todos.get(l.para) && todos.get(l.para).tipo === 'falta' ? ' falta' : '') }));
    });
    pos.nos.forEach((p) => {
      const t = p.no;
      const g = s('g', { class: 'org-mapa-no tipo-' + t.tipo + (t.id === selecionado ? ' selecionado' : ''), transform: `translate(${p.x} ${p.y})`, role: 'treeitem', 'aria-label': t.nome + ', ' + t.meta, 'data-id': t.id });
      const dicaMouse = s('title'); dicaMouse.textContent = t.nome + ' — ' + t.meta; g.append(dicaMouse);
      const compacto = prefs.detalhe === 'compacto';
      g.append(s('rect', { class: 'org-mapa-caixa', width: p.w, height: p.h, rx: compacto ? 9 : 10 }));
      const lado = compacto ? p.w - 8 : 28; const ix = compacto ? 4 : 10; const iy = (p.h - lado) / 2;
      g.append(s('rect', { class: 'org-mapa-id', x: ix, y: iy, width: lado, height: lado, rx: 7 }));
      if (['area', 'setor', 'local'].includes(t.tipo)) { const tx = s('text', { class: 'org-mapa-sigla', x: ix + lado / 2, y: iy + lado / 2 + 4, 'text-anchor': 'middle' }); tx.textContent = t.sigla || '?'; g.append(tx); } else {
        const ic = s('svg', { x: ix + (lado - 16) / 2, y: iy + (lado - 16) / 2, width: 16, height: 16, viewBox: '0 0 24 24', class: 'org-mapa-icone' });
        ic.innerHTML = t.tipo === 'loja' ? ICONE_LOJA : t.tipo === 'cargo' ? ICONE_CARGO : t.tipo === 'falta' ? '<path d="M12 7v6M12 17h.01"/><circle cx="12" cy="12" r="9"/>' : ICONE_RELOGIO; g.append(ic);
      }
      const x0 = ix + 28 + 9; const alturaTexto = t.linhas.length * 16 + 14; let y = (p.h - alturaTexto) / 2 + 12;
      t.linhas.forEach((ln) => { const tx = s('text', { class: 'org-mapa-nome', x: x0, y }); tx.textContent = ln; g.append(tx); y += 16; });
      if (!compacto) { const meta = s('text', { class: 'org-mapa-meta', x: x0, y: y + 1 }); meta.textContent = L().quebrar(t.meta, 186, medir('500 11px ' + FONTE), 1)[0] || ''; g.append(meta); }
      if (t.filhos.length && recolhidos.has(t.id)) {
        const bx = p.lado < 0 ? -9 : prefs.estrutura === 'organograma' ? p.w / 2 - 9 : p.w - 9; const by = prefs.estrutura === 'organograma' ? p.h - 9 : p.h / 2 - 9;
        g.append(s('rect', { class: 'org-mapa-contagem', x: bx, y: by, width: 18, height: 18, rx: 9 }));
        const n = s('text', { class: 'org-mapa-contagem-num', x: bx + 9, y: by + 13, 'text-anchor': 'middle' }); n.textContent = String(t.filhos.length); g.append(n);
      }
      g.addEventListener('click', () => tocar(t));
      g.addEventListener('dblclick', (e) => { e.preventDefault(); const a = acoesDe(t); if (a.editar) a.editar(); });
      svg.append(g);
      if (t.id === selecionado) maisDoTopico(svg, s, t, p);
    });
    area.append(svg);
    U.arrastarParaRolar(area);
    area.addEventListener('keydown', (e) => {
      const t = todos.get(selecionado); if (!t) return; const a = acoesDe(t);
      if (e.key === 'Tab' && a.lado) { e.preventDefault(); a.lado[1](); } else if (e.key === 'Enter' && a.abaixo) { e.preventDefault(); a.abaixo[1](); } else if (e.key === 'F2' && a.editar) { e.preventDefault(); a.editar(); } else if (e.key === ' ') { e.preventDefault(); alternarRecolher(t); }
    });
    return area;
  }
  /** Os dois "+" do tópico selecionado: o do LADO (onde os galhos crescem) cria o nível seguinte; o de BAIXO cria outro do mesmo nível.
   * No Organograma (de cima para baixo) os galhos crescem para baixo, então o "+" do nível seguinte fica embaixo e o do mesmo nível, ao lado. */
  function maisDoTopico(svg, s, t, p) {
    const a = acoesDe(t); const org = prefs.estrutura === 'organograma'; const R = 11;
    const botaoMais = (cx, cy, rotulo, acao) => {
      const g = s('g', { class: 'org-mapa-mais', role: 'button', tabindex: '0', 'aria-label': rotulo, transform: `translate(${cx} ${cy})` });
      const dica = s('title'); dica.textContent = rotulo; g.append(dica);
      g.append(s('circle', { r: R }), s('path', { d: 'M-5 0H5M0 -5V5' }));
      const ir = (e) => { e.stopPropagation(); e.preventDefault(); acao(); };
      g.addEventListener('click', ir); g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') ir(e); });
      svg.append(g);
    };
    const esquerda = p.lado < 0;
    if (a.lado) { const [cx, cy] = org ? [p.x + p.w / 2, p.y + p.h + R + 4] : [esquerda ? p.x - R - 4 : p.x + p.w + R + 4, p.y + p.h / 2]; botaoMais(cx, cy, 'Inserir ' + a.lado[0] + ' ligado a ' + t.nome, a.lado[1]); }
    if (a.abaixo) { const [cx, cy] = org ? [p.x + p.w + R + 4, p.y + p.h / 2] : [p.x + p.w / 2, p.y + p.h + R + 4]; botaoMais(cx, cy, 'Inserir outro: ' + a.abaixo[0] + ' (mesmo nível de ' + t.nome + ')', a.abaixo[1]); }
  }

  /** Visão por BARRAS: na horizontal, as horas do dia; na vertical, as áreas e, em cada bloco, os cargos. Cada horário / escala é uma barra
   * numa faixa própria da linha do cargo, para os horários que se cruzam não ficarem um por cima do outro (quem passa da meia-noite vira duas barras). Passar o mouse mostra os dias e o intervalo. Tocar na linha abre o cargo. */
  function barras() {
    const min = (x) => Number(x.slice(0, 2)) * 60 + Number(x.slice(3));
    const linhas = [];
    const visitar = (n, caminhoNos) => {
      const cs = cargosDe(n.id);
      cs.forEach((c) => linhas.push({ tipo: 'cargo', c, n, caminho: caminhoNos.concat(n).map((x) => x.nome).slice(1).join(' › ') || n.nome, hs: c.horarioIds.map(horarioPorId).filter(Boolean) }));
      filhos(n.id).forEach((f) => visitar(f, caminhoNos.concat(n)));
    };
    filhos(null).forEach((a) => { linhas.push({ tipo: 'area', n: a }); visitar(a, []); });
    // Faixa de horas: da menor entrada à maior saída (arredondadas à hora); quem vira a noite usa o dia inteiro.
    const hs = dados.horarios.filter((h) => linhas.some((l) => l.hs && l.hs.includes(h)));
    let ini = 24 * 60; let fim = 0;
    hs.forEach((h) => { const e = min(h.entrada); const x = min(h.saida); if (x <= e) { ini = 0; fim = 1440; } else { ini = Math.min(ini, e); fim = Math.max(fim, x); } });
    if (!hs.length) { ini = 6 * 60; fim = 22 * 60; }
    ini = Math.floor(ini / 60) * 60; fim = Math.ceil(fim / 60) * 60; const total = fim - ini;
    const caixa = el('div', 'org-barras'); caixa.setAttribute('role', 'table'); caixa.setAttribute('aria-label', 'Horários por área e cargo');
    const escala = el('div', 'org-barras-linha org-barras-escala'); escala.setAttribute('role', 'row');
    const trilhoEscala = el('div', 'org-barras-trilho');
    const passo = total > 12 * 60 ? 120 : 60;
    for (let m = ini; m <= fim; m += passo) { const tk = el('span', 'org-barras-hora', String(Math.floor(m / 60) % 24).padStart(2, '0') + 'h'); tk.style.setProperty('--pos', ((m - ini) / total * 100) + '%'); trilhoEscala.append(tk); }
    escala.append(el('div', 'org-barras-rotulo', ''), trilhoEscala); caixa.append(escala);
    caixa.style.setProperty('--passo', (passo / total * 100) + '%');
    if (!linhas.length) caixa.append(U.vazio('Nada para mostrar.', 'Insira uma área e, nela, um cargo com horário / escala.'));
    linhas.forEach((l) => {
      if (l.tipo === 'area') { const cab = el('div', 'org-barras-area'); cab.setAttribute('role', 'row'); const id = el('span', 'org-barras-id', l.n.sigla || '?'); id.setAttribute('aria-hidden', 'true'); cab.append(id, el('b', null, l.n.nome)); caixa.append(cab); return; }
      const linha = el('div', 'org-barras-linha'); linha.setAttribute('role', 'row'); linha.tabIndex = 0;
      const rot = el('div', 'org-barras-rotulo'); rot.append(el('b', null, l.c.cargoNome), el('small', null, l.caminho)); rot.title = l.c.cargoNome + ' — ' + l.caminho;
      const trilho = el('div', 'org-barras-trilho'); trilho.style.setProperty('--faixas', String(Math.max(1, l.hs.length)));
      if (!l.hs.length) trilho.append(el('span', 'org-barras-falta', 'Sem horário / escala'));
      l.hs.forEach((h, i) => {
        const e = min(h.entrada); let x = min(h.saida); const pedacos = x > e ? [[e, x]] : [[e, 1440], [0, x]];
        pedacos.forEach(([a, b]) => {
          const bar = el('span', 'org-barras-barra tom-' + (i % 3), h.nome);
          bar.style.setProperty('--i', String(i)); bar.style.setProperty('--ini', ((a - ini) / total * 100) + '%'); bar.style.setProperty('--tam', ((b - a) / total * 100) + '%');
          bar.title = h.nome + ': ' + textoDoHorario(h); trilho.append(bar);
        });
      });
      linha.append(rot, trilho);
      linha.onclick = () => editarCargo(l.c, l.n);
      linha.onkeydown = (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); editarCargo(l.c, l.n); } };
      caixa.append(linha);
    });
    const rolar = el('div', 'org-barras-area-rolagem'); rolar.append(caixa);
    return rolar;
  }

  /** Um toque seleciona; o segundo toque no mesmo tópico (logo depois) abre a edição. */
  function tocar(t) {
    const agora = Date.now();
    if (selecionado === t.id && ultimoToque.id === t.id && agora - ultimoToque.t < 900) { const a = acoesDe(t); if (a.editar) a.editar(); else if (a.lado) a.lado[1](); ultimoToque = { id: '', t: 0 }; return; }
    ultimoToque = { id: t.id, t: agora };
    if (selecionado !== t.id) { selecionado = t.id; render(); const area = tela.body.querySelector('.org-mapa-area'); if (area) area.focus({ preventScroll: true }); }
  }

  /* ---------- Inserir: o nível de baixo ou um cargo ---------- */
  /** pai = bloco onde se insere; null = a Loja (só aceita Área). preferido = "cargo" para já abrir na escolha do cargo. */
  function inserir(pai, preferido) {
    const tipoFilho = pai ? TIPOS[pai.tipo].filho : 'area';
    const opcoes = []; if (tipoFilho) opcoes.push([tipoFilho, TIPOS[tipoFilho].nome]); if (pai) opcoes.push(['cargo', 'Cargo']);
    let escolhido = preferido && opcoes.some((o) => o[0] === preferido) ? preferido : opcoes[0][0];
    U.dialogo({
      titulo: pai ? 'Inserir em ' + pai.nome : 'Inserir área na loja',
      cor: cor(), corTexto: COR_TEXTO,
      montar: (form) => {
        const q = el('fieldset', 'compras-fieldset'); q.append(el('legend', null, 'O que inserir'));
        const corpo = el('div', 'compras-etapa');
        const ctx = {};
        const pintar = () => {
          corpo.replaceChildren();
          if (escolhido === 'cargo') Object.assign(ctx, montarCargo(corpo, null));
          else Object.assign(ctx, montarNo(corpo, null, escolhido));
        };
        if (opcoes.length > 1) {
          const tipo = U.chips(opcoes, escolhido, (v) => { escolhido = v; pintar(); });
          tipo.setAttribute('aria-label', 'Tipo');
          const l = el('div', 'compras-campo'); l.append(el('span', 'compras-rotulo', 'Tipo *'), tipo); q.append(l);
        } else q.append(U.nota(tipoFilho ? 'Na Loja entra área. A ordem é fixa: Área › Setor › Local.' : 'O local é o último nível: nele entra cargo.'));
        form.append(q, corpo);
        pintar();
        return ctx;
      },
      salvar: (ctx) => {
        if (escolhido === 'cargo') return salvarCargo(ctx, null, pai);
        return salvarNo(ctx, null, escolhido, pai);
      },
    });
  }

  function montarNo(corpo, n, tipo) {
    const q = el('fieldset', 'compras-fieldset'); q.append(el('legend', null, TIPOS[tipo].nome));
    const nome = entrada('text', n ? n.nome : '', { autocomplete: 'off', maxLength: 120, placeholder: tipo === 'area' ? 'Ex.: Operação de Loja' : tipo === 'setor' ? 'Ex.: Caixa' : 'Ex.: Caixa Principal' });
    nome.required = true;
    const sigla = entrada('text', n ? n.sigla : '', { autocomplete: 'off', placeholder: 'Ex.: CXP' });
    let manual = Boolean(n) && n.sigla !== siglaDoNome(n.nome);
    nome.addEventListener('input', () => { if (!manual) sigla.value = siglaDoNome(nome.value); });
    sigla.oninput = () => { sigla.value = compactar(sigla.value); manual = sigla.value !== ''; if (!manual) sigla.value = siglaDoNome(nome.value); };
    q.append(campo('Nome *', nome), campo('Identificador (até 3 caracteres) *', sigla));
    corpo.append(q);
    setTimeout(() => nome.focus(), 0);
    return { nome, sigla };
  }
  function salvarNo(ctx, n, tipo, pai) {
    const nome = limpar(ctx.nome.value);
    if (nome.length < 2) { ctx.nome.focus(); return 'Informe o nome ' + (tipo === 'area' ? 'da área.' : tipo === 'setor' ? 'do setor.' : 'do local.'); }
    const paiId = n ? n.paiId : (pai ? pai.id : null);
    if (dados.nos.some((x) => x.paiId === paiId && x.id !== (n && n.id) && mesmoNome(x.nome, nome))) { ctx.nome.focus(); return 'Já existe "' + nome + '" neste nível. Escolha outro nome.'; }
    const sigla = compactar(ctx.sigla.value) || siglaDoNome(nome);
    const ok = gravar((d) => {
      if (n) Object.assign(d.nos.find((x) => x.id === n.id), { nome, sigla });
      else { const id = novoId('no'); d.nos.push({ id, tipo, nome, sigla, paiId }); selecionado = id; }
    });
    if (!ok) return 'Não foi possível salvar neste aparelho. Nada foi alterado.';
    recolhidos.delete(pai ? pai.id : 'raiz');
    U.avisar((n ? 'Alterado: ' : 'Inserido: ') + TIPOS[tipo].nome + ' ' + nome + '.');
    render();
  }

  function editarNo(n) {
    U.dialogo({
      titulo: 'Editar ' + TIPOS[n.tipo].nome.toLowerCase() + ': ' + n.nome,
      cor: cor(), corTexto: COR_TEXTO,
      montar: (form) => {
        const corpo = el('div', 'compras-etapa');
        const ctx = montarNo(corpo, n, n.tipo);
        const tudo = abaixoDe(n.id);
        const q = el('fieldset', 'compras-fieldset'); q.append(el('legend', null, 'Excluir do teste'));
        const extra = tudo.nos.length - 1 + tudo.cargos.length;
        const l = el('div', 'compras-campo'); l.append(el('span', 'compras-rotulo', 'Excluir ' + TIPOS[n.tipo].nome.toLowerCase() + (extra ? ' e o que está dentro (' + extra + ')' : '')),
          U.botaoRemover('Excluir ' + n.nome, () => excluirNo(n, form.closest('dialog'))));
        q.append(l);
        form.append(corpo, q);
        return ctx;
      },
      salvar: (ctx) => salvarNo(ctx, n, n.tipo, null),
    });
  }
  function excluirNo(n, janela) {
    const tudo = abaixoDe(n.id);
    U.confirmar('Excluir ' + n.nome + '?', 'Sai do teste ' + (tudo.nos.length > 1 || tudo.cargos.length ? 'com tudo o que está dentro: ' + (tudo.nos.length - 1) + ' bloco(s) e ' + tudo.cargos.length + ' cargo(s).' : 'este bloco.') + ' Só o teste muda; os cadastros de verdade não.', 'Excluir', () => {
      if (!gravar((d) => { d.nos = d.nos.filter((x) => !tudo.nos.includes(x.id)); d.cargos = d.cargos.filter((c) => !tudo.nos.includes(c.noId)); })) return 'Não foi possível salvar neste aparelho. Nada foi alterado.';
      if (janela) janela.close();
      U.avisar(n.nome + ' excluído do teste.');
      render();
    }, { cor: cor(), corTexto: COR_TEXTO });
  }

  /* ---------- Cargo no bloco e os horários dele ---------- */
  /** c = cargo do bloco (editar) ou null (inserir). */
  function montarCargo(corpo, c) {
    const q = el('fieldset', 'compras-fieldset'); q.append(el('legend', null, 'Cargo'));
    const reais = cargosReais();
    let seletor = null;
    if (c) q.append(campo('Cargo', el('span', 'compras-valor', c.cargoNome)));
    else {
      seletor = U.seletor(reais.map((r) => [r.id, r.nome]), '', reais.length ? 'Selecione um cargo' : 'Nenhum cargo cadastrado');
      q.append(campo('Cargo *', seletor, 'A lista vem de DES - Cargos C/Salários (só leitura).'));
    }
    const marcados = new Set(c ? c.horarioIds : []);
    const qh = el('fieldset', 'compras-fieldset'); qh.append(el('legend', null, 'Horário / Escala *'), U.nota('Todo cargo tem um ou mais horários / escalas: marque quantos precisar.'));
    const lista = el('div', 'compras-vinculos-lista');
    const pintar = () => {
      lista.replaceChildren(...dados.horarios.map((h) => {
        const l = U.interruptor(h.nome, marcados.has(h.id), textoDoHorario(h));
        l.input.onchange = () => { if (l.input.checked) marcados.add(h.id); else marcados.delete(h.id); };
        return l;
      }));
      if (!dados.horarios.length) lista.append(U.nota('Nenhum horário / escala no teste. Use "Novo Horário / Escala".'));
    };
    pintar();
    const novo = U.botaoTitulo('Novo Horário / Escala', 'Criar horário / escala', () => editarHorario(null, (h) => { marcados.add(h.id); pintar(); }));
    const rodape = el('div', 'compras-form-rodape'); rodape.append(novo);
    qh.append(lista, rodape);
    corpo.append(q, qh);
    return { seletor, marcados, reais };
  }
  function salvarCargo(ctx, c, pai) {
    const horarioIds = dados.horarios.filter((h) => ctx.marcados.has(h.id)).map((h) => h.id);
    if (!horarioIds.length) return 'Marque pelo menos um horário / escala para o cargo (ou crie um em "Novo Horário / Escala").';
    if (c) {
      if (!gravar((d) => { d.cargos.find((x) => x.id === c.id).horarioIds = horarioIds; })) return 'Não foi possível salvar neste aparelho. Nada foi alterado.';
      U.avisar('Horário / escala de ' + c.cargoNome + ' atualizado.');
    } else {
      const real = ctx.reais.find((r) => String(r.id) === ctx.seletor.value);
      if (!real) { ctx.seletor.focus(); return 'Escolha o cargo.'; }
      if (cargosDe(pai.id).some((x) => x.cargoId === real.id)) return real.nome + ' já está em ' + pai.nome + '. Use o "+" do cargo para mudar o horário.';
      const id = novoId('cg');
      if (!gravar((d) => { d.cargos.push({ id, noId: pai.id, cargoId: real.id, cargoNome: real.nome, horarioIds }); })) return 'Não foi possível salvar neste aparelho. Nada foi alterado.';
      recolhidos.delete(pai.id); selecionado = 'c:' + id;
      U.avisar(real.nome + ' inserido em ' + pai.nome + '.');
    }
    render();
  }
  function editarCargo(c, n) {
    U.dialogo({
      titulo: c.cargoNome + ' em ' + n.nome,
      cor: cor(), corTexto: COR_TEXTO,
      montar: (form) => {
        const corpo = el('div', 'compras-etapa');
        const ctx = montarCargo(corpo, c);
        const q = el('fieldset', 'compras-fieldset'); q.append(el('legend', null, 'Tirar do bloco'));
        const l = el('div', 'compras-campo'); l.append(el('span', 'compras-rotulo', 'Tirar ' + c.cargoNome + ' de ' + n.nome), U.botaoRemover('Tirar ' + c.cargoNome + ' de ' + n.nome, () => {
          const janela = form.closest('dialog');
          U.confirmar('Tirar ' + c.cargoNome + '?', c.cargoNome + ' sai de ' + n.nome + ' no teste. O cargo continua no cadastro de cargos.', 'Tirar', () => {
            if (!gravar((d) => { d.cargos = d.cargos.filter((x) => x.id !== c.id); })) return 'Não foi possível salvar neste aparelho. Nada foi alterado.';
            if (janela) janela.close();
            U.avisar(c.cargoNome + ' saiu de ' + n.nome + '.'); render();
          }, { cor: cor(), corTexto: COR_TEXTO });
        }));
        q.append(l);
        form.append(corpo, q);
        return ctx;
      },
      salvar: (ctx) => salvarCargo(ctx, c, n),
    });
  }

  /* ---------- Horário / Escala (lista única do teste) ---------- */
  function editarHorario(h, aoCriar) {
    U.dialogo({
      titulo: h ? 'Editar horário / escala' : 'Novo horário / escala',
      cor: cor(), corTexto: COR_TEXTO,
      montar: (form) => {
        const q = el('fieldset', 'compras-fieldset'); q.append(el('legend', null, 'Horário / Escala'));
        const nome = entrada('text', h ? h.nome : '', { autocomplete: 'off', maxLength: 60, placeholder: 'Ex.: Manhã' }); nome.required = true;
        const dias = new Set(h ? h.dias : ['1', '2', '3', '4', '5', '6']);
        const grupo = el('div', 'compras-chips'); grupo.setAttribute('role', 'group'); grupo.setAttribute('aria-label', 'Dias de trabalho');
        const folga = el('span', 'compras-valor');
        const pintar = () => {
          grupo.replaceChildren(...DIAS.map(([chave, curto, longo]) => {
            const b = botao(curto, () => { if (dias.has(chave)) dias.delete(chave); else dias.add(chave); pintar(); }, 'compras-chip' + (dias.has(chave) ? ' ativo' : ''));
            b.title = longo; b.setAttribute('aria-label', longo); b.setAttribute('aria-pressed', String(dias.has(chave))); return b;
          }));
          folga.textContent = textoDosDias(ORDEM.filter((d) => !dias.has(d)));
        };
        pintar();
        const ent = U.campoHora({ rotulo: 'Entrada', valor: h ? h.entrada : '' });
        const sai = U.campoHora({ rotulo: 'Saída', valor: h ? h.saida : '' });
        const ii = U.campoHora({ rotulo: 'Início do intervalo', valor: h ? h.intervaloInicio : '' });
        const fi = U.campoHora({ rotulo: 'Fim do intervalo', valor: h ? h.intervaloFim : '' });
        const linha = (rotulo, ...nos) => { const l = el('div', 'compras-campo'); l.append(el('span', 'compras-rotulo', rotulo), ...nos); return l; };
        q.append(campo('Nome *', nome), linha('Dias de trabalho *', grupo), linha('Dias de folga', folga),
          linha('Entrada *', ent.caixa, ent.painel), linha('Saída *', sai.caixa, sai.painel),
          linha('Início do intervalo', ii.caixa, ii.painel), linha('Fim do intervalo', fi.caixa, fi.painel));
        const usos = h ? dados.cargos.filter((c) => c.horarioIds.includes(h.id)).length : 0;
        form.append(q, U.nota(h && usos > 1 ? 'Este horário / escala é usado em ' + usos + ' cargos: a mudança vale para todos eles.' : 'Este horário / escala entra na lista única do teste e pode ser escolhido em qualquer cargo e local.'));
        setTimeout(() => nome.focus(), 0);
        return { nome, dias, ent, sai, ii, fi };
      },
      salvar: (c) => {
        const nome = limpar(c.nome.value);
        if (nome.length < 2) { c.nome.focus(); return 'Informe o nome do horário / escala.'; }
        if (dados.horarios.some((x) => x.id !== (h && h.id) && mesmoNome(x.nome, nome))) { c.nome.focus(); return 'Já existe um horário / escala com o nome "' + nome + '". Escolha esse na lista ou use outro nome.'; }
        if (!c.dias.size) return 'Marque ao menos um dia de trabalho.';
        const v = { entrada: c.ent.input.value, saida: c.sai.input.value, intervaloInicio: c.ii.input.value, intervaloFim: c.fi.input.value };
        if (!HORA.test(v.entrada)) { c.ent.input.focus(); return 'Informe a hora de entrada (HH:MM).'; }
        if (!HORA.test(v.saida)) { c.sai.input.focus(); return 'Informe a hora de saída (HH:MM).'; }
        if (v.entrada === v.saida) { c.sai.input.focus(); return 'Entrada e saída não podem ser iguais.'; }
        if (Boolean(v.intervaloInicio) !== Boolean(v.intervaloFim)) return 'Informe início e fim do intervalo, ou deixe os dois em branco.';
        if (v.intervaloInicio && (!HORA.test(v.intervaloInicio) || !HORA.test(v.intervaloFim))) return 'Informe o intervalo no formato HH:MM.';
        const item = { id: h ? h.id : novoId('hr'), nome, sigla: siglaDoNome(nome), dias: ORDEM.filter((d) => c.dias.has(d)), ...v };
        if (!gravar((d) => { const i = d.horarios.findIndex((x) => x.id === item.id); if (i >= 0) d.horarios[i] = item; else d.horarios.push(item); })) return 'Não foi possível salvar neste aparelho. Nada foi alterado.';
        U.avisar('Horário / escala ' + (h ? 'atualizado.' : 'criado.'));
        if (aoCriar) aoCriar(item);
        render();
      },
    });
  }

  function recomecar() {
    U.confirmar('Recomeçar o teste?', 'O que foi montado no teste é apagado e volta o exemplo da Operação de Loja. Os cadastros de verdade não mudam.', 'Recomeçar', () => {
      const novo = exemplo();
      try { localStorage.setItem(KEY, JSON.stringify(novo)); } catch (e) { return 'Não foi possível salvar neste aparelho. Nada foi alterado.'; }
      dados = novo; erroLeitura = false; recolhidos.clear(); selecionado = 'raiz';
      U.avisar('Teste recomeçado com o exemplo.');
      abrir();
    }, { cor: cor(), corTexto: COR_TEXTO });
  }

  window.CicluzOrganogramaMultifuncional = { abrir, textoDosDias, exemplo, CHAVE: KEY };
})();
