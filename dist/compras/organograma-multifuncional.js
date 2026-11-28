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
  const textoDoHorario = (h) => (h.escala || '') + ' · ' + (h.escala === '12x36' ? 'um dia sim, um dia não' : textoDosDias(h.dias)) + ' · ' + h.entrada + '–' + h.saida +
    (h.intervaloInicio ? ' · intervalo ' + h.intervaloInicio + ' (' + duracaoTexto(Number(h.intervaloMin || 0)) + ')' : '') +
    (h.porDia && Object.keys(h.porDia).length ? ' · horário próprio: ' + textoDosDias(Object.keys(h.porDia)) : '') + (h.cargaSemanal ? ' · ' + String(h.cargaSemanal).replace('.', ',') + 'h/semana' : '');

  /* ---------- Dados do teste (só neste aparelho, chave própria) ---------- */
  function exemplo() {
    const d = { version: 1, criadoEm: new Date().toISOString(), nos: [], cargos: [], horarios: [] };
    const horario = (nome, ent, sai, ii) => { const x = { id: novoId('hr'), nome, sigla: siglaDoNome(nome), escala: '6x1', dias: ['1', '2', '3', '4', '5', '6'], cargaSemanal: 44, entrada: ent, saida: sai, intervaloInicio: ii, intervaloMin: 60, porDia: {} }; d.horarios.push(x); return x.id; };
    // Horas de EXEMPLO, só para o teste ter o que mostrar.
    const M = horario('Manhã', '06:00', '14:20', '10:00');
    const I = horario('Intermediário', '10:00', '18:20', '14:00');
    const T = horario('Tarde', '13:40', '22:00', '17:00');
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
      s.horarios.forEach(normalizarHorario);
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
        filhos: hs.length ? hs.map((h) => tamanho({ id: 'h:' + c.id + ':' + h.id, tipo: 'horario', nome: h.nome, ref: h, cargo: c, pai: n, meta: (h.escala ? h.escala + ' · ' : '') + h.entrada + '–' + h.saida + (h.escala === '12x36' ? '' : ' · ' + textoDosDias(h.dias)), filhos: [] }))
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
      case 'area': return { lado: ['Setor', () => inserir(t.ref)], abaixo: ['Área', () => inserir(null)], editar: () => editarNo(t.ref) };
      case 'setor': return { lado: ['Local', () => inserir(t.ref)], abaixo: ['Setor', () => inserir(dados.nos.find((x) => x.id === t.ref.paiId))], editar: () => editarNo(t.ref) };
      case 'local': return { lado: ['Cargo', () => editarNo(t.ref, { novoCargo: true })], abaixo: ['Local', () => inserir(dados.nos.find((x) => x.id === t.ref.paiId))], editar: () => editarNo(t.ref) };
      case 'cargo': return { lado: ['Horário / Escala', () => editarNo(pai, { foco: t.ref.id })], abaixo: ['Cargo', () => editarNo(pai, { novoCargo: true })], editar: () => editarNo(pai, { foco: t.ref.id }) };
      case 'horario': return { abaixo: ['Horário / Escala', () => editarNo(pai, { foco: t.cargo.id })], editar: () => editarHorario(t.ref) };
      default: return { lado: ['Horário / Escala', () => editarNo(pai, { foco: t.cargo.id })], editar: () => editarNo(pai, { foco: t.cargo.id }) };
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
      // A linha do galho vai na cor do módulo a que ele pertence.
      const filho = todos.get(l.para); const dono = filho && (['area', 'setor', 'local'].includes(filho.tipo) ? filho.ref : filho.pai);
      const linha = s('path', { d, class: 'org-mapa-ligacao' + (filho && filho.tipo === 'falta' ? ' falta' : '') });
      if (dono) linha.style.setProperty('--no-cor', corDe(dono));
      svg.append(linha);
    });
    pos.nos.forEach((p) => {
      const t = p.no;
      const g = s('g', { class: 'org-mapa-no tipo-' + t.tipo + (t.id === selecionado ? ' selecionado' : ''), transform: `translate(${p.x} ${p.y})`, role: 'treeitem', 'aria-label': t.nome + ', ' + t.meta, 'data-id': t.id });
      if (['area', 'setor', 'local'].includes(t.tipo)) g.style.setProperty('--no-cor', corDe(t.ref));
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
      const nCargos = COM_CARGO(t.tipo) ? cargosDe(t.id).length : 0;
      if (compacto && nCargos) {
        g.append(s('circle', { class: 'org-mapa-qtd', cx: p.w - 2, cy: 2, r: 8 }));
        const q = s('text', { class: 'org-mapa-qtd-num', x: p.w - 2, y: 5.5, 'text-anchor': 'middle' }); q.textContent = String(nCargos); g.append(q);
      }
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
      if (l.tipo === 'area') { const cab = el('div', 'org-barras-area'); cab.setAttribute('role', 'row'); const id = el('span', 'org-barras-id', l.n.sigla || '?'); id.setAttribute('aria-hidden', 'true'); id.style.setProperty('--no-cor', corDe(l.n)); cab.append(id, el('b', null, l.n.nome)); caixa.append(cab); return; }
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
      linha.onclick = () => editarNo(l.n, { foco: l.c.id });
      linha.onkeydown = (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); editarNo(l.n, { foco: l.c.id }); } };
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

  /* ---------- Módulo: Área, Setor ou Local (Rodrigo, 27/11/2026) ----------
   * Uma janela só para criar e editar o módulo: o TIPO (a ordem é fixa: na Loja entra Área, na Área entra Setor, no Setor entra Local),
   * o NOME, o IDENTIFICADOR, a COR (o Setor e o Local nascem na cor de quem está acima e podem trocar) e, no Setor e no Local, os CARGOS.
   * Cada cargo inserido tem um ou mais Horários / Escalas: sem isso não salva. Vários cargos no mesmo módulo, cada um com os seus horários.
   * O cargo não entra na Área (decisão do Rodrigo, 27/11/2026). */
  const COM_CARGO = (tipo) => tipo === 'setor' || tipo === 'local';
  /** A cor do módulo: a dele; sem cor própria, a de quem está acima; no topo, a cor da tela. */
  function corDe(n) { let x = n; while (x) { if (x.cor) return x.cor; x = x.paiId ? dados.nos.find((y) => y.id === x.paiId) : null; } return cor(); }

  /** pai = onde se insere (null = Loja). */
  function inserir(pai) { modulo(null, pai ? TIPOS[pai.tipo].filho : 'area', pai, {}); }
  /** opts.novoCargo: já abre com um cargo novo para preencher; opts.foco: id do cargo a mostrar. */
  function editarNo(n, opts = {}) { modulo(n, n.tipo, n.paiId ? dados.nos.find((x) => x.id === n.paiId) : null, opts); }

  function modulo(n, tipo, pai, opts) {
    const nomeTipo = TIPOS[tipo].nome;
    U.dialogo({
      titulo: n ? nomeTipo + ': ' + n.nome : 'Novo módulo' + (pai ? ' em ' + pai.nome : ' na Loja'),
      cor: cor(), corTexto: COR_TEXTO,
      montar: (form) => {
        // Quadro do módulo: tipo, nome, identificador e cor.
        const q = el('fieldset', 'compras-fieldset'); q.append(el('legend', null, 'Módulo'));
        const tipos = U.chips([['area', 'Área'], ['setor', 'Setor'], ['local', 'Local']], tipo, () => {});
        tipos.setAttribute('aria-label', 'Tipo do módulo');
        tipos.querySelectorAll('button').forEach((b) => { if (b.getAttribute('aria-pressed') !== 'true') { b.disabled = true; b.title = 'A ordem é fixa: Área › Setor › Local.'; } });
        const linhaTipo = el('div', 'compras-campo'); linhaTipo.append(el('span', 'compras-rotulo', 'Tipo *'), tipos);
        const nome = entrada('text', n ? n.nome : '', { autocomplete: 'off', maxLength: 120, placeholder: tipo === 'area' ? 'Ex.: Operação de Loja' : tipo === 'setor' ? 'Ex.: Caixa' : 'Ex.: Caixa Principal' });
        nome.required = true;
        const sigla = entrada('text', n ? n.sigla : '', { autocomplete: 'off', placeholder: 'Ex.: CXP' });
        let manual = Boolean(n) && n.sigla !== siglaDoNome(n.nome);
        nome.addEventListener('input', () => { if (!manual) sigla.value = siglaDoNome(nome.value); });
        sigla.oninput = () => { sigla.value = compactar(sigla.value); manual = sigla.value !== ''; if (!manual) sigla.value = siglaDoNome(nome.value); };
        const corEntrada = entrada('color', n ? corDe(n) : (pai ? corDe(pai) : cor())); corEntrada.className = 'org-cor'; corEntrada.title = 'Escolher a cor';
        q.append(linhaTipo, campo('Nome *', nome), campo('Identificador (até 3 caracteres) *', sigla),
          campo('Cor', corEntrada, tipo === 'area' ? 'Os setores e locais desta área nascem nesta cor.' : 'Nasce na cor de ' + (pai ? pai.nome : 'cima') + '; pode trocar.'));
        form.append(q);
        const ctx = { nome, sigla, corEntrada, cargos: [] };
        if (COM_CARGO(tipo)) Object.assign(ctx, quadroCargos(form, n, opts));
        else form.append(U.nota('Na área entra setor; o cargo entra no setor ou no local.'));
        if (n) {
          const tudo = abaixoDe(n.id); const extra = tudo.nos.length - 1 + tudo.cargos.length;
          const qx = el('fieldset', 'compras-fieldset'); qx.append(el('legend', null, 'Excluir do teste'));
          const l = el('div', 'compras-campo'); l.append(el('span', 'compras-rotulo', 'Excluir ' + nomeTipo.toLowerCase() + (extra ? ' e o que está dentro (' + extra + ')' : '')), U.botaoRemover('Excluir ' + n.nome, () => excluirNo(n, form.closest('dialog'))));
          qx.append(l); form.append(qx);
        }
        if (!opts.novoCargo && !opts.foco) setTimeout(() => nome.focus(), 0);
        return ctx;
      },
      salvar: (ctx) => salvarModulo(ctx, n, tipo, pai),
    });
  }

  /** Os cargos do módulo: um quadro por cargo, com a escolha do cargo e os horários / escalas dele. */
  function quadroCargos(form, n, opts) {
    const reais = cargosReais();
    const lista = el('div', 'compras-etapa');
    const titulo = el('legend');
    const cab = el('fieldset', 'compras-fieldset org-cargos-cab'); cab.append(titulo, U.nota('Cada cargo tem um ou mais horários / escalas. Para ver quantos cargos o módulo tem, toque nele no mapa: o resumo mostra o total.'));
    const blocos = [];
    const contar = () => { titulo.textContent = 'Cargos (' + blocos.length + ')'; blocos.forEach((b, i) => b.numerar(i + 1)); };
    const repintarHorarios = () => blocos.forEach((b) => b.pintarHorarios());
    const novoBloco = (c) => {
      const marcados = new Set(c ? c.horarioIds : []);
      const q = el('fieldset', 'compras-fieldset org-cargo-bloco'); const legenda = el('legend'); q.append(legenda);
      const opcoes = reais.map((r) => [String(r.id), r.nome]);
      if (c && !c.cargoId) opcoes.unshift(['fora:' + c.id, c.cargoNome + ' (fora do cadastro de cargos)']);
      const seletor = U.seletor(opcoes, c ? (c.cargoId ? String(c.cargoId) : 'fora:' + c.id) : '', reais.length ? 'Selecione um cargo' : 'Nenhum cargo cadastrado');
      const horarios = el('div', 'compras-vinculos-lista'); horarios.setAttribute('role', 'group');
      const pintarHorarios = () => {
        horarios.replaceChildren(...dados.horarios.map((h) => {
          const l = U.interruptor(h.nome, marcados.has(h.id), textoDoHorario(h));
          l.input.onchange = () => { if (l.input.checked) marcados.add(h.id); else marcados.delete(h.id); };
          return l;
        }));
        if (!dados.horarios.length) horarios.append(U.nota('Nenhum horário / escala no teste. Use "Novo Horário / Escala".'));
      };
      pintarHorarios();
      const novoHorario = U.botaoTitulo('Novo Horário / Escala', 'Criar horário / escala para este cargo', () => editarHorario(null, (h) => { marcados.add(h.id); repintarHorarios(); }));
      const remover = U.botaoRemover('Tirar este cargo', () => { blocos.splice(blocos.indexOf(bloco), 1); q.remove(); contar(); });
      const listaH = el('div', 'org-horarios'); listaH.append(horarios, novoHorario);
      const linhaH = el('div', 'compras-campo compras-largo org-linha-horarios'); linhaH.append(el('span', 'compras-rotulo', 'Horário / Escala *'), listaH);
      const linhaRem = el('div', 'compras-campo'); linhaRem.append(el('span', 'compras-rotulo', 'Tirar este cargo do módulo'), remover);
      q.append(campo('Cargo *', seletor, 'A lista vem de DES - Cargos C/Salários (só leitura).'), linhaH, linhaRem);
      const bloco = {
        id: c ? c.id : null, seletor, marcados, no: q, pintarHorarios,
        numerar: (i) => { legenda.textContent = 'Cargo ' + i; horarios.setAttribute('aria-label', 'Horários / escalas do cargo ' + i); },
        cargoOriginal: c,
      };
      blocos.push(bloco); lista.append(q); contar();
      return bloco;
    };
    (n ? cargosDe(n.id) : []).forEach(novoBloco);
    const adicionar = U.botaoTitulo('Adicionar cargo', 'Adicionar cargo a este módulo', () => { const b = novoBloco(null); b.no.scrollIntoView({ block: 'nearest' }); b.seletor.focus(); });
    const rodape = el('div', 'compras-form-rodape'); rodape.append(adicionar);
    form.append(cab, lista, rodape);
    contar();
    if (opts.novoCargo) setTimeout(() => { const b = novoBloco(null); b.no.scrollIntoView({ block: 'center' }); b.seletor.focus(); }, 0);
    else if (opts.foco) setTimeout(() => { const b = blocos.find((x) => x.id === opts.foco); if (b) { b.no.scrollIntoView({ block: 'center' }); b.seletor.focus(); } }, 0);
    return { cargos: blocos, reais };
  }

  function salvarModulo(ctx, n, tipo, pai) {
    const nome = limpar(ctx.nome.value);
    if (nome.length < 2) { ctx.nome.focus(); return 'Informe o nome ' + (tipo === 'area' ? 'da área.' : tipo === 'setor' ? 'do setor.' : 'do local.'); }
    const paiId = n ? n.paiId : (pai ? pai.id : null);
    if (dados.nos.some((x) => x.paiId === paiId && x.id !== (n && n.id) && mesmoNome(x.nome, nome))) { ctx.nome.focus(); return 'Já existe "' + nome + '" neste nível. Escolha outro nome.'; }
    const sigla = compactar(ctx.sigla.value) || siglaDoNome(nome);
    const corEscolhida = ctx.corEntrada.value;
    // Só guarda a cor quando ela é diferente da de cima: assim o módulo acompanha a área enquanto não tiver cor própria.
    const corDeCima = pai ? corDe(pai) : cor();
    const corPropria = tipo === 'area' || corEscolhida.toLowerCase() !== String(corDeCima).toLowerCase() ? corEscolhida : '';
    // Cargos: cada um escolhido, sem repetir no mesmo módulo, com um ou mais horários.
    const cargos = [];
    for (let i = 0; i < ctx.cargos.length; i++) {
      const b = ctx.cargos[i]; const v = b.seletor.value; const qual = 'Cargo ' + (i + 1) + ': ';
      if (!v) { b.seletor.focus(); return qual + 'escolha o cargo.'; }
      const fora = v.startsWith('fora:'); const real = fora ? null : ctx.reais.find((r) => String(r.id) === v);
      if (!fora && !real) { b.seletor.focus(); return qual + 'escolha o cargo.'; }
      const cargoNome = fora ? b.cargoOriginal.cargoNome : real.nome;
      if (cargos.some((x) => (fora ? x.cargoNome === cargoNome && !x.cargoId : x.cargoId === real.id))) { b.seletor.focus(); return cargoNome + ' aparece duas vezes neste módulo. Deixe um só e marque nele todos os horários.'; }
      const horarioIds = dados.horarios.filter((h) => b.marcados.has(h.id)).map((h) => h.id);
      if (!horarioIds.length) { b.no.scrollIntoView({ block: 'nearest' }); return qual + cargoNome + ' precisa de pelo menos um horário / escala.'; }
      cargos.push({ id: b.id || novoId('cg'), cargoId: fora ? null : real.id, cargoNome, horarioIds });
    }
    let novoIdModulo = null;
    const ok = gravar((d) => {
      let alvo;
      if (n) { alvo = d.nos.find((x) => x.id === n.id); Object.assign(alvo, { nome, sigla }); }
      else { novoIdModulo = novoId('no'); alvo = { id: novoIdModulo, tipo, nome, sigla, paiId }; d.nos.push(alvo); }
      if (corPropria) alvo.cor = corPropria; else delete alvo.cor;
      if (COM_CARGO(tipo)) { d.cargos = d.cargos.filter((c) => c.noId !== alvo.id).concat(cargos.map((c) => ({ ...c, noId: alvo.id }))); }
    });
    if (!ok) return 'Não foi possível salvar neste aparelho. Nada foi alterado.';
    if (novoIdModulo) selecionado = novoIdModulo;
    recolhidos.delete(pai ? pai.id : 'raiz'); if (n) recolhidos.delete(n.id);
    U.avisar((n ? 'Alterado: ' : 'Inserido: ') + TIPOS[tipo].nome + ' ' + nome + (cargos.length ? ' com ' + cargos.length + (cargos.length === 1 ? ' cargo.' : ' cargos.') : '.'));
    render();
  }

  function excluirNo(n, janela) {
    const tudo = abaixoDe(n.id);
    U.confirmar('Excluir ' + n.nome + '?', 'Sai do teste ' + (tudo.nos.length > 1 || tudo.cargos.length ? 'com tudo o que está dentro: ' + (tudo.nos.length - 1) + ' módulo(s) e ' + tudo.cargos.length + ' cargo(s).' : 'este módulo.') + ' Só o teste muda; os cadastros de verdade não.', 'Excluir', () => {
      if (!gravar((d) => { d.nos = d.nos.filter((x) => !tudo.nos.includes(x.id)); d.cargos = d.cargos.filter((c) => !tudo.nos.includes(c.noId)); })) return 'Não foi possível salvar neste aparelho. Nada foi alterado.';
      if (janela) janela.close();
      U.avisar(n.nome + ' excluído do teste.');
      render();
    }, { cor: cor(), corTexto: COR_TEXTO });
  }

  /* ---------- Horário / Escala (lista única do teste) — estrutura do Rodrigo, 27/11/2026 ----------
   * Ordem da janela: 1) nome; 2) escala (6x1, 5x2, 4x3 ou 12x36); 3) os dias de trabalho, na quantidade que a escala pede (no 12x36 é um dia sim,
   * um dia não, então não se marcam dias da semana); 4) a carga horária por semana; 5) entrada, saída, início do intervalo e a DURAÇÃO do intervalo
   * (30 min, 1 hora, 1h30 ou 2 horas) — o fim do intervalo é calculado; 6) "Igual todos os dias" ou "Personalizar por dia" (horário próprio num dia).
   * REGRA: da entrada ao início do intervalo e do fim do intervalo à saída, no máximo 6 horas seguidas; sem intervalo, a jornada inteira no máximo 6 horas.
   * A carga semanal informada é comparada com a calculada: a diferença aparece na janela (aviso; não impede salvar). */
  const ESCALAS = [['6x1', '6x1', 6], ['5x2', '5x2', 5], ['4x3', '4x3', 4], ['12x36', '12x36', null]];
  const DURACOES = [['30', '30 min'], ['60', '1 hora'], ['90', '1h30'], ['120', '2 horas']];
  const SEIS_HORAS = 360;
  const minDe = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  const vao = (a, b) => (minDe(b) - minDe(a) + 1440) % 1440;
  const horaMais = (t, m) => { const x = (minDe(t) + m) % 1440; return String(Math.floor(x / 60)).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0'); };
  const duracaoTexto = (m) => { const h = Math.floor(m / 60); const r = Math.round(m % 60); return h ? h + 'h' + (r ? String(r).padStart(2, '0') : '') : r + ' min'; };
  /** Minutos trabalhados num dia (sem o intervalo). */
  const liquido = (x) => vao(x.entrada, x.saida) - (x.intervaloInicio ? Number(x.intervaloMin || 0) : 0);
  /** O horário de um dia: o próprio do dia (personalizado) ou o de todos os dias. */
  const doDia = (h, d) => (h.porDia && h.porDia[d]) || h;
  /** Carga da semana em minutos (no 12x36, a média: 3,5 plantões por semana). */
  const cargaCalculada = (h) => (h.escala === '12x36' ? liquido(h) * 3.5 : h.dias.reduce((t, d) => t + liquido(doDia(h, d)), 0));
  /** Confere um horário (o de todos os dias ou o de um dia). Devolve a mensagem do problema ou ''. */
  function conferirJornada(x, qual) {
    if (!HORA.test(x.entrada)) return qual + 'informe a hora de entrada (HH:MM).';
    if (!HORA.test(x.saida)) return qual + 'informe a hora de saída (HH:MM).';
    if (x.entrada === x.saida) return qual + 'entrada e saída não podem ser iguais.';
    const total = vao(x.entrada, x.saida);
    if (!x.intervaloInicio) return total > SEIS_HORAS ? qual + 'são ' + duracaoTexto(total) + ' seguidas. Acima de 6 horas é preciso informar o intervalo.' : '';
    if (!HORA.test(x.intervaloInicio)) return qual + 'informe o início do intervalo (HH:MM).';
    const antes = vao(x.entrada, x.intervaloInicio); const dur = Number(x.intervaloMin || 0);
    if (!dur) return qual + 'escolha a duração do intervalo.';
    if (antes <= 0 || antes + dur >= total) return qual + 'o intervalo precisa ficar entre a entrada e a saída.';
    const depois = total - antes - dur;
    if (antes > SEIS_HORAS) return qual + 'da entrada (' + x.entrada + ') ao início do intervalo (' + x.intervaloInicio + ') são ' + duracaoTexto(antes) + ': o máximo é 6 horas.';
    if (depois > SEIS_HORAS) return qual + 'do fim do intervalo (' + horaMais(x.intervaloInicio, dur) + ') à saída (' + x.saida + ') são ' + duracaoTexto(depois) + ': o máximo é 6 horas.';
    return '';
  }
  /** Horários gravados antes desta estrutura (fim do intervalo, sem escala) passam a ter a duração e a escala. Nada se perde. */
  function normalizarHorario(h) {
    if (!h.escala) { const e = ESCALAS.find((x) => x[2] === (h.dias || []).length); h.escala = e ? e[0] : '6x1'; }
    if (h.intervaloInicio && !h.intervaloMin && h.intervaloFim) h.intervaloMin = vao(h.intervaloInicio, h.intervaloFim);
    delete h.intervaloFim;
    if (!h.porDia) h.porDia = {};
    if (!h.cargaSemanal) h.cargaSemanal = Math.round(cargaCalculada(h) / 6) / 10;
    return h;
  }

  function editarHorario(h, aoCriar) {
    U.dialogo({
      titulo: h ? 'Editar horário / escala' : 'Novo horário / escala',
      cor: cor(), corTexto: COR_TEXTO,
      montar: (form) => {
        const linha = (rotulo, ...nos) => { const l = el('div', 'compras-campo'); l.append(el('span', 'compras-rotulo', rotulo), ...nos); return l; };
        const st = { escala: h ? h.escala : '6x1', dias: new Set(h ? h.dias : ['1', '2', '3', '4', '5', '6']), modo: h && Object.keys(h.porDia || {}).length ? 'dia' : 'todos', porDia: JSON.parse(JSON.stringify(h ? h.porDia || {} : {})) };
        // 1) Nome  2) Escala  3) Dias  4) Carga semanal
        const q = el('fieldset', 'compras-fieldset'); q.append(el('legend', null, 'Escala'));
        const nome = entrada('text', h ? h.nome : '', { autocomplete: 'off', maxLength: 60, placeholder: 'Ex.: Manhã' }); nome.required = true;
        const escala = U.chips(ESCALAS.map((e) => [e[0], e[1]]), st.escala, (v) => { st.escala = v; const n = ESCALAS.find((e) => e[0] === v)[2]; if (n && st.dias.size !== n) st.dias = new Set(ORDEM.slice(0, n)); pintar(); });
        escala.setAttribute('aria-label', 'Escala');
        const grupo = el('div', 'compras-chips'); grupo.setAttribute('role', 'group'); grupo.setAttribute('aria-label', 'Dias de trabalho');
        const linhaDias = linha('Dias de trabalho *', grupo);
        const folga = el('span', 'compras-valor'); const linhaFolga = linha('Dias de folga', folga);
        const nota12 = U.nota('12x36: trabalha 12 horas e folga 36, ou seja, um dia sim e um dia não. Os dias da semana mudam de uma semana para outra, por isso não se marcam aqui.');
        const carga = entrada('number', h ? String(h.cargaSemanal) : '44', { min: '1', max: '70', step: '0.5', inputMode: 'decimal' });
        const calculada = el('small', 'profiles-note org-carga-calculada'); calculada.setAttribute('role', 'status');
        q.append(campo('Nome *', nome), linha('Escala *', escala), linhaDias, linhaFolga, nota12, campo('Carga horária por semana (horas) *', carga), calculada);
        // 5) Horário de todos os dias
        const qh = el('fieldset', 'compras-fieldset'); qh.append(el('legend', null, 'Horário'));
        const quadroJornada = (x, rotulo) => {
          const ent = U.campoHora({ rotulo: 'Entrada' + rotulo, valor: x ? x.entrada : '' });
          const sai = U.campoHora({ rotulo: 'Saída' + rotulo, valor: x ? x.saida : '' });
          const ii = U.campoHora({ rotulo: 'Início do intervalo' + rotulo, valor: x ? x.intervaloInicio || '' : '' });
          let dur = String(x && x.intervaloMin ? x.intervaloMin : 60);
          const duracao = U.chips(DURACOES, dur, (v) => { dur = v; recalcular(); }); duracao.setAttribute('aria-label', 'Duração do intervalo' + rotulo);
          const fim = el('span', 'compras-valor');
          const nos = [linha('Entrada *', ent.caixa, ent.painel), linha('Saída *', sai.caixa, sai.painel), linha('Início do intervalo', ii.caixa, ii.painel), linha('Duração do intervalo', duracao), linha('Fim do intervalo', fim)];
          return { nos, fim, valor: () => ({ entrada: ent.input.value, saida: sai.input.value, intervaloInicio: ii.input.value, intervaloMin: ii.input.value ? Number(dur) : 0 }), foco: () => ent.input.focus() };
        };
        const padrao = quadroJornada(h, '');
        qh.append(...padrao.nos);
        // 6) Igual todos os dias ou personalizar por dia
        const qp = el('fieldset', 'compras-fieldset'); qp.append(el('legend', null, 'Todos os dias ou por dia'));
        const modo = U.chips([['todos', 'Igual todos os dias'], ['dia', 'Personalizar por dia']], st.modo, (v) => { st.modo = v; pintar(); });
        modo.setAttribute('aria-label', 'Horário igual todos os dias ou personalizado por dia');
        qp.append(linha('Horário', modo));
        const diasBox = el('div', 'compras-etapa'); const quadrosDia = {};
        form.append(q, qh, qp, diasBox);
        const usos = h ? dados.cargos.filter((c) => c.horarioIds.includes(h.id)).length : 0;
        form.append(U.nota(h && usos > 1 ? 'Este horário / escala é usado em ' + usos + ' cargos: a mudança vale para todos eles.' : 'Este horário / escala entra na lista única do teste e pode ser escolhido em qualquer cargo e local.'));
        function pintar() {
          const n = ESCALAS.find((e) => e[0] === st.escala)[2];
          grupo.replaceChildren(...DIAS.map(([chave, curto, longo]) => {
            const b = botao(curto, () => { if (st.dias.has(chave)) st.dias.delete(chave); else st.dias.add(chave); pintar(); }, 'compras-chip' + (st.dias.has(chave) ? ' ativo' : ''));
            b.title = longo; b.setAttribute('aria-label', longo); b.setAttribute('aria-pressed', String(st.dias.has(chave))); return b;
          }));
          const ver = (no, sim) => { no.style.display = sim ? '' : 'none'; };
          ver(linhaDias, n); ver(linhaFolga, n); ver(nota12, !n); ver(qp, n);
          linhaDias.querySelector('.compras-rotulo').textContent = 'Dias de trabalho * (' + st.dias.size + (n ? ' de ' + n : '') + ')';
          folga.textContent = textoDosDias(ORDEM.filter((d) => !st.dias.has(d)));
          // Um quadro por dia de trabalho quando personaliza; nasce com o horário de todos os dias.
          diasBox.replaceChildren();
          if (n && st.modo === 'dia') {
            ORDEM.filter((d) => st.dias.has(d)).forEach((d) => {
              const longo = DIAS.find((x) => x[0] === d)[2];
              if (!quadrosDia[d]) quadrosDia[d] = quadroJornada(st.porDia[d] || { ...padrao.valor() }, ' — ' + longo);
              const f = el('fieldset', 'compras-fieldset'); f.append(el('legend', null, longo), ...quadrosDia[d].nos); diasBox.append(f);
            });
          }
          recalcular();
        }
        function atual() {
          const base = padrao.valor(); const porDia = {};
          if (st.modo === 'dia' && st.escala !== '12x36') ORDEM.filter((d) => st.dias.has(d) && quadrosDia[d]).forEach((d) => { const v = quadrosDia[d].valor(); if (JSON.stringify(v) !== JSON.stringify(base)) porDia[d] = v; });
          return { escala: st.escala, dias: st.escala === '12x36' ? [] : ORDEM.filter((d) => st.dias.has(d)), ...base, porDia, cargaSemanal: Number(String(carga.value).replace(',', '.')) };
        }
        function recalcular() {
          const v = atual();
          const fimDe = (x) => (x.intervaloInicio && HORA.test(x.intervaloInicio) ? horaMais(x.intervaloInicio, x.intervaloMin) : '—');
          padrao.fim.textContent = fimDe(v);
          Object.entries(quadrosDia).forEach(([, qd]) => { qd.fim.textContent = fimDe(qd.valor()); });
          const ok = HORA.test(v.entrada) && HORA.test(v.saida) && Object.values(v.porDia).every((x) => HORA.test(x.entrada) && HORA.test(x.saida));
          if (!ok) { calculada.textContent = 'A carga calculada aparece quando entrada e saída estiverem preenchidas.'; calculada.classList.remove('org-aviso'); return; }
          const m = cargaCalculada(v); const informada = v.cargaSemanal * 60;
          const dif = informada && Math.abs(m - informada) >= 1;
          calculada.textContent = 'Carga calculada: ' + duracaoTexto(m) + ' por semana' + (v.escala === '12x36' ? ' (média de 3,5 plantões de ' + duracaoTexto(liquido(v)) + ')' : '') + (dif ? ' — diferente da informada (' + duracaoTexto(informada) + ').' : '.');
          calculada.classList.toggle('org-aviso', Boolean(dif));
        }
        form.addEventListener('input', recalcular); form.addEventListener('change', recalcular); form.addEventListener('click', () => setTimeout(recalcular, 0));
        pintar();
        setTimeout(() => nome.focus(), 0);
        return { nome, atual, padrao };
      },
      salvar: (c) => {
        const nome = limpar(c.nome.value);
        if (nome.length < 2) { c.nome.focus(); return 'Informe o nome do horário / escala.'; }
        if (dados.horarios.some((x) => x.id !== (h && h.id) && mesmoNome(x.nome, nome))) { c.nome.focus(); return 'Já existe um horário / escala com o nome "' + nome + '". Escolha esse na lista ou use outro nome.'; }
        const v = c.atual();
        const n = ESCALAS.find((e) => e[0] === v.escala)[2];
        if (n && v.dias.length !== n) return 'Na escala ' + v.escala + ' a pessoa trabalha ' + n + ' dias: marque ' + n + ' dias (marcados: ' + v.dias.length + ').';
        if (!(v.cargaSemanal > 0)) return 'Informe a carga horária por semana (em horas, ex.: 44).';
        const erroPadrao = conferirJornada(v, n ? 'Horário de todos os dias: ' : '');
        if (erroPadrao) { c.padrao.foco(); return erroPadrao; }
        for (const d of Object.keys(v.porDia)) { const e = conferirJornada(v.porDia[d], DIAS.find((x) => x[0] === d)[2] + ': '); if (e) return e; }
        const item = { id: h ? h.id : novoId('hr'), nome, sigla: siglaDoNome(nome), ...v };
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
