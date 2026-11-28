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

  /** O cargo como está no cadastro (DES - Cargos C/Salários): ícone e salário, só para mostrar. */
  function dadosDoCargo(id) { try { const x = (typeof jobsCurrent === 'function' ? jobsCurrent() : []).find((e) => String(e.id) === String(id)); return x ? x.j : null; } catch (e) { return null; } }
  function iconeDoCargo(j) {
    const icones = typeof jobIcons !== 'undefined' ? jobIcons : null;
    if (j && j.identityMode === 'text' && window.CicluzIdentity) return '<span class="sigla-text">' + String(CicluzIdentity.compact(j.sigla || '')).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) + '</span>';
    return icones ? (j && icones[j.icon]) || icones.inherit : U.svg(ICONE_CARGO);
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
    (h.porDia && Object.keys(h.porDia).length ? ' · horário próprio: ' + textoDosDias(Object.keys(h.porDia)) : '') + (h.cargaSemanal ? ' · ' + String(h.cargaSemanal).replace('.', ',') + 'h/semana' : '') +
    (h.domingo ? ' · domingo ' + (h.domingo.compensado ? 'compensado na ' + ((DIAS.find((x) => x[0] === h.domingo.diaCompensa) || [])[1] || '?') : 'sem compensação') + ', folga ' + (h.domingo.folgaDomingos || []).map((k) => k + 'º').join(' e ') + ' domingo do mês' : '') +
    (h.feriado && h.feriado.trabalha !== null && h.feriado.trabalha !== undefined ? ' · feriado: ' + (h.feriado.trabalha ? 'trabalha' + (h.feriado.compensado ? ', compensado' : ', sem compensação') : 'folga') : '');

  /* ---------- Dados do teste (só neste aparelho, chave própria) ---------- */
  function exemplo() {
    const d = { version: 1, criadoEm: new Date().toISOString(), nos: [], cargos: [], horarios: [] };
    const horario = (nome, ent, sai, ii) => { const x = { id: novoId('hr'), nome, sigla: '', nomeModo: 'montado', escala: '5x2', dias: ['1', '2', '3', '4', '5'], cargaSemanal: 42, entrada: ent, saida: sai, intervaloInicio: ii, intervaloMin: 60, porDia: {} }; x.nome = nomeMontado(x); x.sigla = siglaDoNome(x.nome); d.horarios.push(x); return x.id; };
    // Horas de EXEMPLO, só para o teste ter o que mostrar.
    const M = horario('Manhã', '06:00', '15:24', '10:00');
    const I = horario('Intermediário', '10:00', '19:24', '14:00');
    const T = horario('Tarde', '12:00', '21:24', '16:00');
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
        id: 'c:' + c.id, tipo: 'cargo', nome: c.cargoNome, ref: c, pai: n, meta: (c.cargoId ? 'Cargo' : 'Cargo · fora do cadastro') + (nomePagamento(c) ? ' · ' + nomePagamento(c) : ''), falta: !hs.length,
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
  /* Contratação e forma de pagamento do cargo no módulo (Rodrigo, 27/11/2026). Colaborador (CLT): Mensalista, Horista, Tempo parcial ou
   * Intermitente. Prestador de serviço (sem CLT): por hora, dia, mês ou serviço. A tela só mostra as CONTAS de horas (nenhum valor em dinheiro):
   * mensal = horas por semana × 5 (o ×5 já inclui o descanso semanal remunerado: 44h → 220h, 40h → 200h). Avisos (não impedem salvar):
   * CLT acima de 44h por semana (Constituição, art. 7º); tempo parcial acima de 30h por semana (CLT, art. 58-A); prestador com horário fixo pode
   * virar vínculo de emprego (CLT, art. 3º). */
  const CONTRATACOES = [['clt', 'Colaborador (CLT)'], ['prestador', 'Prestador de serviço']];
  const PAGAMENTOS = { clt: [['mensalista', 'Mensalista'], ['horista', 'Horista'], ['parcial', 'Tempo parcial'], ['intermitente', 'Intermitente']], prestador: [['hora', 'Por hora'], ['dia', 'Por dia'], ['mes', 'Por mês'], ['servico', 'Por serviço']] };
  const nomePagamento = (c) => { const p = (PAGAMENTOS[c.contratacao || 'clt'] || []).find((x) => x[0] === c.pagamento); return p ? p[1] + (c.contratacao === 'prestador' ? ' (prestador)' : ' (CLT)') : ''; };
  const horasTexto = (h) => String(Math.round(h * 10) / 10).replace('.', ',') + 'h';
  /** As contas e os avisos de um cargo, para cada horário / escala marcado. Devolve { linhas: [texto], avisos: [texto] }. */
  function contasDoCargo(contratacao, pagamento, horarios) {
    const linhas = []; const avisos = [];
    if (contratacao === 'prestador') {
      horarios.forEach((h) => linhas.push(h.nome + ': ' + duracaoTexto(liquido(h)) + ' por dia · ' + horasTexto(h.cargaSemanal) + ' por semana'));
      avisos.push('Prestador de serviço não segue a CLT. Cuidado: horário fixo, subordinação e trabalho todo dia podem caracterizar vínculo de emprego (CLT, art. 3º).');
      return { linhas, avisos };
    }
    if (pagamento === 'intermitente') {
      linhas.push('Intermitente: recebe pelas horas de cada convocação (CLT, art. 452-A). O horário / escala serve de referência.');
      return { linhas, avisos };
    }
    horarios.forEach((h) => {
      const sem = Number(h.cargaSemanal || 0);
      if (pagamento === 'horista') linhas.push(h.nome + ': ' + duracaoTexto(liquido(h)) + ' por dia · ' + horasTexto(sem) + ' por semana · recebe as horas trabalhadas + ' + duracaoTexto(Math.round(sem * 60 / 6)) + ' de descanso semanal (DSR) por domingo e feriado: a semana ÷ 6 dias úteis, a mesma conta do × 5 do mensalista (Lei 605/49)');
      else linhas.push(h.nome + ': ' + horasTexto(sem) + ' por semana × 5 = ' + horasTexto(sem * 5) + ' por mês' + (h.escala === '12x36' ? ' (no 12x36 o divisor pode variar conforme a convenção coletiva)' : ''));
      if (pagamento === 'parcial' && sem > 30) avisos.push(h.nome + ': tempo parcial vai até 30h por semana (CLT, art. 58-A); este horário tem ' + horasTexto(sem) + '.');
      if (pagamento !== 'parcial' && sem > 44) avisos.push(h.nome + ': ' + horasTexto(sem) + ' por semana passa do limite de 44h da CLT.');
    });
    return { linhas, avisos };
  }

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
      // Cargo: a janela de escolha do sistema (U.campoArvore → seletorArvore), agrupada pela categoria do cargo, com o ícone do cargo e a
      // marcação redonda de escolha única. .value continua sendo o id do cargo (ou 'fora:' + id do cargo que só existe no teste).
      // Só a relação de cargos (sem categoria), cada um com o ícone e o salário como estão em DES - Cargos C/Salários (só leitura).
      const nosCargos = () => {
        const arvore = reais.map((r) => { const j = dadosDoCargo(r.id); return { id: String(r.id), nome: r.nome, ativo: true, folha: true, html: iconeDoCargo(j), conta: j && j.valor ? 'R$ ' + j.valor : '' }; });
        if (c && !c.cargoId) arvore.unshift({ id: 'fora:' + c.id, nome: c.cargoNome + ' (fora do cadastro de cargos)', ativo: true, folha: true, conta: 'Só no teste' });
        return arvore;
      };
      const seletor = U.campoArvore({ rotulo: 'Cargo', titulo: 'Cargo', sigla: 'DES', cores: { cor: cor(), corTexto: COR_TEXTO }, iconeFolha: ICONE_CARGO, rotuloBusca: 'Buscar cargo', vazio: 'Nenhum cargo cadastrado em DES - Cargos C/Salários.', nos: nosCargos, valor: c ? (c.cargoId ? String(c.cargoId) : 'fora:' + c.id) : '', textoVazio: reais.length ? 'Selecione um cargo' : 'Nenhum cargo cadastrado', obrigatorio: true, detalhe: true });
      const horarios = el('div', 'compras-vinculos-lista'); horarios.setAttribute('role', 'group');
      const pintarHorarios = () => {
        horarios.replaceChildren(...dados.horarios.map((h) => {
          const l = U.interruptor(h.nome, marcados.has(h.id), textoDoHorario(h)); l.input.classList.add('compras-selecao-bolinha');
          l.input.onchange = () => { if (l.input.checked) marcados.add(h.id); else marcados.delete(h.id); if (bloco.atualizarContas) bloco.atualizarContas(); };
          return l;
        }));
        if (!dados.horarios.length) horarios.append(U.nota('Nenhum horário / escala no teste. Use "Novo Horário / Escala".'));
        if (bloco.atualizarContas) bloco.atualizarContas();
      };
      const bloco = {};
      pintarHorarios();
      const novoHorario = U.botaoTitulo('Novo Horário / Escala', 'Criar horário / escala para este cargo', () => editarHorario(null, (h) => { marcados.add(h.id); repintarHorarios(); }));
      const rodapeH = el('div', 'compras-form-rodape'); rodapeH.append(novoHorario);
      const remover = U.botaoRemover('Tirar este cargo', () => { blocos.splice(blocos.indexOf(bloco), 1); q.remove(); rodapeH.remove(); contar(); });
      // Contratação e forma de pagamento, com as contas de horas logo abaixo.
      const st = { contratacao: c && c.contratacao ? c.contratacao : 'clt', pagamento: c && c.pagamento ? c.pagamento : 'mensalista' };
      const pagamentoBox = el('div', 'org-pagamento');
      const contas = el('div', 'org-contas'); contas.setAttribute('role', 'status');
      const atualizarContas = () => {
        const r = contasDoCargo(st.contratacao, st.pagamento, dados.horarios.filter((h) => marcados.has(h.id)));
        contas.replaceChildren(...r.linhas.map((x) => el('small', 'profiles-note', x)), ...r.avisos.map((x) => el('small', 'profiles-note org-aviso', x)));
        if (!r.linhas.length && !r.avisos.length) contas.append(el('small', 'profiles-note', 'Marque o horário / escala para ver as horas.'));
      };
      const pintarPagamento = () => { const ch = U.chips(PAGAMENTOS[st.contratacao], st.pagamento, (v) => { st.pagamento = v; atualizarContas(); }); ch.setAttribute('aria-label', 'Forma de pagamento'); pagamentoBox.replaceChildren(ch); atualizarContas(); };
      const contratacao = U.chips(CONTRATACOES, st.contratacao, (v) => { st.contratacao = v; st.pagamento = PAGAMENTOS[v][0][0]; pintarPagamento(); });
      contratacao.setAttribute('aria-label', 'Contratação');
      const linhaContr = el('div', 'compras-campo compras-largo org-linha-horarios'); linhaContr.append(el('span', 'compras-rotulo', 'Contratação *'), contratacao);
      const linhaPag = el('div', 'compras-campo compras-largo org-linha-horarios'); linhaPag.append(el('span', 'compras-rotulo', 'Forma de pagamento *'), pagamentoBox);
      pintarPagamento();
      const listaH = el('div', 'org-horarios'); listaH.append(horarios);
      const linhaH = el('div', 'compras-campo compras-largo org-linha-horarios'); linhaH.append(el('span', 'compras-rotulo', 'Horário / Escala *'), listaH);
      const linhaRem = el('div', 'compras-campo'); linhaRem.append(el('span', 'compras-rotulo', 'Tirar este cargo do módulo'), remover);
      const linhaContas = el('div', 'compras-campo compras-largo org-linha-horarios'); linhaContas.append(el('span', 'compras-rotulo', 'Horas'), contas);
      const linhaCargo = campo('Cargo *', seletor, 'A lista vem de DES - Cargos C/Salários (só leitura).'); linhaCargo.classList.add('org-linha-horarios'); // no celular o cargo desce para baixo do nome
      q.append(linhaCargo, linhaH, linhaContr, linhaPag, linhaContas, linhaRem);
      Object.assign(bloco, {
        id: c ? c.id : null, seletor, marcados, no: q, pintarHorarios, atualizarContas, st,
        numerar: (i) => { legenda.textContent = 'Cargo ' + i; horarios.setAttribute('aria-label', 'Horários / escalas do cargo ' + i); },
        cargoOriginal: c,
      });
      blocos.push(bloco); lista.append(q, rodapeH); contar();
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
      cargos.push({ id: b.id || novoId('cg'), cargoId: fora ? null : real.id, cargoNome, horarioIds, contratacao: b.st.contratacao, pagamento: b.st.pagamento });
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
   * Ordem da janela: 1) nome MONTADO pelo sistema (escala · entrada às saída · carga) ou PERSONALIZADO; 2) escala (5x2, 4x3 ou 12x36 — a 6x1 saiu: está fora da
   * nova lei trabalhista, Rodrigo 27/11/2026); 3) os dias de trabalho, na quantidade que a escala pede (no 12x36 é um dia sim, um dia não, sem dias da semana);
   * 4) a carga horária por semana, na roleta de horas (arrastar ou digitar), no máximo 42:00 (Rodrigo, 27/11/2026); 5) duração do intervalo (sem, 30 min, 1h, 1h30, 2h), entrada e início
   * do intervalo — as horas do dia, o fim do intervalo e a SAÍDA são calculados: horas do dia = carga ÷ dias de trabalho (no 12x36, ÷ 3,5 plantões por semana);
   * saída = entrada + horas do dia + intervalo; 6) dias com horário diferente, só entre os dias de trabalho da escala, cada um com as próprias horas no dia —
   * o que sobra da carga se divide pelos outros dias.
   * REGRA: da entrada ao início do intervalo e do fim do intervalo à saída, no máximo 6 horas seguidas; sem intervalo, a jornada inteira no máximo 6 horas. */
  const ESCALAS = [['5x2', '5x2', 5], ['4x3', '4x3', 4], ['12x36', '12x36', null]];
  const ESCALA_FORA = { '6x1': 'A escala 6x1 não vale mais (nova lei trabalhista): escolha outra escala.' };
  const DURACOES = [['0', 'Sem intervalo'], ['30', '30 min'], ['60', '1 hora'], ['90', '1h30'], ['120', '2 horas']];
  /** Carga máxima por semana no cadastro (Rodrigo, 27/11/2026): 42 horas. O aviso de 44h da CLT continua nos avisos. */
  const CARGA_MAX = 42;
  const SEIS_HORAS = 360;
  const minDe = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  const vao = (a, b) => (minDe(b) - minDe(a) + 1440) % 1440;
  const horaMais = (t, m) => { const x = (minDe(t) + m) % 1440; return String(Math.floor(x / 60)).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0'); };
  const duracaoTexto = (m) => { const h = Math.floor(m / 60); const r = Math.round(m % 60); return h ? h + 'h' + (r ? String(r).padStart(2, '0') : '') : r + ' min'; };
  /** Duração em HH:MM (a carga da semana passa de 24 horas, por isso não é hora do relógio). */
  const DURACAO = /^\d\d:[0-5]\d$/;
  const hhmm = (m) => { const x = Math.max(0, Math.round(m)); return String(Math.floor(x / 60)).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0'); };
  const minutosDe = (t) => (DURACAO.test(t) ? minDe(t) : 0);
  /** Minutos trabalhados num dia (sem o intervalo). */
  const liquido = (x) => vao(x.entrada, x.saida) - (x.intervaloInicio ? Number(x.intervaloMin || 0) : 0);
  /** O horário de um dia: o próprio do dia (personalizado) ou o de todos os dias. */
  const doDia = (h, d) => (h.porDia && h.porDia[d]) || h;
  /** Carga da semana em minutos (no 12x36, a média: 3,5 plantões por semana). */
  const cargaCalculada = (h) => (h.escala === '12x36' ? liquido(h) * 3.5 : h.dias.reduce((t, d) => t + liquido(doDia(h, d)), 0));
  /** Nome montado: escala · entrada às saída · carga da semana. */
  const nomeMontado = (v) => [v.escala || '', HORA.test(v.entrada) && HORA.test(v.saida) ? v.entrada + ' às ' + v.saida +
      (v.intervaloInicio && HORA.test(v.intervaloInicio) ? ' (almoço ' + v.intervaloInicio + ' às ' + horaMais(v.intervaloInicio, Number(v.intervaloMin || 0)) + ')' : '') : '',
    v.escala !== '12x36' && v.dias && v.dias.length ? ORDEM.filter((d) => v.dias.includes(d)).map((d) => DIAS.find((x) => x[0] === d)[1]).join(', ') : '',
    v.porDia && Object.keys(v.porDia).length ? textoDosDias(Object.keys(v.porDia)) + ' diferente' : '',
    v.cargaSemanal ? duracaoTexto(Math.round(v.cargaSemanal * 60)) : ''].filter(Boolean).join(' · ');
  /** Confere um horário (o de todos os dias ou o de um dia). Devolve a mensagem do problema ou ''. */
  function conferirJornada(x, qual) {
    if (!HORA.test(x.entrada)) return qual + 'informe a hora de entrada (HH:MM).';
    if (!HORA.test(x.saida)) return qual + 'informe as horas de trabalho para calcular a saída.';
    if (x.entrada === x.saida) return qual + 'entrada e saída não podem ser iguais.';
    const total = vao(x.entrada, x.saida);
    if (!x.intervaloInicio) return total > SEIS_HORAS ? qual + 'são ' + duracaoTexto(total) + ' seguidas. Acima de 6 horas é preciso ter intervalo.' : '';
    if (!HORA.test(x.intervaloInicio)) return qual + 'informe o início do intervalo (HH:MM).';
    const antes = vao(x.entrada, x.intervaloInicio); const dur = Number(x.intervaloMin || 0);
    if (!dur) return qual + 'escolha a duração do intervalo.';
    if (antes <= 0 || antes + dur >= total) return qual + 'o intervalo precisa ficar entre a entrada e a saída (' + x.saida + ').';
    const depois = total - antes - dur;
    if (antes > SEIS_HORAS) return qual + 'da entrada (' + x.entrada + ') ao início do intervalo (' + x.intervaloInicio + ') são ' + duracaoTexto(antes) + ': o máximo é 6 horas.';
    if (depois > SEIS_HORAS) return qual + 'do fim do intervalo (' + horaMais(x.intervaloInicio, dur) + ') à saída (' + x.saida + ') são ' + duracaoTexto(depois) + ': o máximo é 6 horas.';
    return '';
  }
  /** Horários gravados antes desta estrutura (fim do intervalo, sem escala, sem modo do nome) passam a ter os campos novos. Nada se perde:
   *  a escala 6x1 gravada continua gravada (aparece como fora da lei até alguém escolher outra). */
  function normalizarHorario(h) {
    if (!h.escala) { const e = ESCALAS.find((x) => x[2] === (h.dias || []).length); h.escala = e ? e[0] : (h.dias || []).length === 6 ? '6x1' : ''; }
    if (h.intervaloInicio && !h.intervaloMin && h.intervaloFim) h.intervaloMin = vao(h.intervaloInicio, h.intervaloFim);
    delete h.intervaloFim;
    if (!h.porDia) h.porDia = {};
    if (!h.nomeModo) h.nomeModo = 'personalizado';
    if (!h.cargaSemanal) h.cargaSemanal = Math.round(cargaCalculada(h) / 6) / 10;
    return h;
  }

  /** Avisos da CLT para o horário (só aviso; a convenção coletiva da categoria pode prever outra coisa — ex.: o intervalo de 30 minutos). */
  function avisosCLT(v) {
    const r = []; const nome = (d) => DIAS.find((x) => x[0] === d)[2];
    if (ESCALA_FORA[v.escala]) r.push(ESCALA_FORA[v.escala]);
    if (!HORA.test(v.entrada) || !HORA.test(v.saida)) return r;
    // O mesmo aviso em vários dias vira uma linha só, com os dias juntos (ex.: "Seg a Sex: …").
    const porTexto = new Map(); const juntar = (d, t) => { if (!porTexto.has(t)) porTexto.set(t, []); if (d) porTexto.get(t).push(d); };
    const dias = v.escala === '12x36' ? [null] : v.dias;
    dias.forEach((d) => {
      const x = d ? doDia(v, d) : v; if (!HORA.test(x.entrada) || !HORA.test(x.saida)) return;
      const total = vao(x.entrada, x.saida); const l = liquido(x);
      if (v.escala !== '12x36' && l > 10 * 60) juntar(d, duracaoTexto(l) + ' de trabalho no dia passa de 10h, o máximo da CLT mesmo com compensação de horas (art. 59).');
      else if (v.escala !== '12x36' && l > 8 * 60) juntar(d, duracaoTexto(l) + ' de trabalho no dia passa das 8h: precisa de acordo de compensação de horas (art. 59, §2º); sem acordo, o que passa é hora extra.');
      if (!x.intervaloInicio && total > 4 * 60 && total <= 6 * 60) juntar(d, 'jornada de 4h a 6h: a CLT pede 15 minutos de intervalo (art. 71).');
    });
    porTexto.forEach((ds, t) => r.push(ds.length ? textoDosDias(ds) + ': ' + t : t.charAt(0).toUpperCase() + t.slice(1)));
    // Descanso entre um dia e outro: no mínimo 11 horas (CLT, art. 66).
    if (v.escala !== '12x36') {
      v.dias.forEach((d) => {
        const prox = ORDEM[(ORDEM.indexOf(d) + 1) % 7]; if (!v.dias.includes(prox)) return;
        const a = doDia(v, d); const b = doDia(v, prox); if (!HORA.test(a.entrada) || !HORA.test(a.saida) || !HORA.test(b.entrada)) return;
        const fim = minDe(a.entrada) + vao(a.entrada, a.saida); const descanso = 1440 + minDe(b.entrada) - fim;
        if (descanso < 11 * 60) r.push('Entre ' + nome(d) + ' e ' + nome(prox) + ' o descanso é de ' + duracaoTexto(descanso) + ': a CLT pede no mínimo 11h (art. 66).');
      });
      const semana = cargaCalculada(v); if (semana > 44 * 60 + 5) r.push('São ' + duracaoTexto(semana) + ' por semana: passa do limite de 44h da CLT.');
    }
    return r;
  }

  function editarHorario(h, aoCriar) {
    U.dialogo({
      titulo: h ? 'Editar horário / escala' : 'Novo horário / escala',
      cor: cor(), corTexto: COR_TEXTO,
      montar: (form) => {
        const linha = (rotulo, ...nos) => { const l = el('div', 'compras-campo'); l.append(el('span', 'compras-rotulo', rotulo), ...nos); return l; };
        // Linha de botões de escolha: na tela estreita os botões descem para baixo do nome do campo (não empilham um por linha).
        const linhaChips = (rotulo, ...nos) => { const l = linha(rotulo, ...nos); l.classList.add('org-linha-horarios'); return l; };
        const ver = (no, sim) => { no.style.display = sim ? '' : 'none'; };
        const st = {
          escala: h ? (ESCALAS.some((e) => e[0] === h.escala) ? h.escala : '') : '5x2',
          dias: new Set(h ? h.dias : ORDEM.slice(0, 5)),
        };
        // 1) Nome (montado ou personalizado)  2) Escala  3) Dias  4) Carga semanal
        const q = el('fieldset', 'compras-fieldset'); q.append(el('legend', null, 'Escala'));
        // O nome não se digita: é o texto montado, que quebra em mais de uma linha (um campo de uma linha só cortava o fim).
        const nome = el('output', 'compras-valor org-nome-montado'); nome.value = h ? h.nome : '';
        const notaNome = el('small', 'profiles-note org-carga-calculada');
        const escala = U.chips(ESCALAS.map((e) => [e[0], e[1]]), st.escala, (v) => { st.escala = v; const n = ESCALAS.find((e) => e[0] === v)[2]; if (n && st.dias.size !== n) st.dias = new Set(ORDEM.slice(0, n)); if (fora) fora.remove(); pintar(); });
        escala.setAttribute('aria-label', 'Escala');
        const fora = h && ESCALA_FORA[h.escala] ? el('small', 'profiles-note org-carga-calculada org-aviso', ESCALA_FORA[h.escala]) : null;
        const grupo = el('div', 'compras-chips'); grupo.setAttribute('role', 'group'); grupo.setAttribute('aria-label', 'Dias de trabalho');
        const linhaDias = linhaChips('Dias de trabalho *', grupo);
        const folga = el('span', 'compras-valor'); const linhaFolga = linha('Dias de folga', folga);
        const nota12 = U.nota('12x36: trabalha 12 horas e folga 36, ou seja, um dia sim e um dia não. Os dias da semana mudam de uma semana para outra, por isso não se marcam aqui.');
        // A carga é uma duração na mesma roleta do campo de hora (arrasta ou digita, horas e minutos). Informa-se POR SEMANA (até 42:00) ou POR DIA
        // (Rodrigo, 27/11/2026): a outra é calculada — por semana = por dia × dias de trabalho (+ as horas dos dias diferentes; no 12x36, × 3,5).
        st.cargaModo = h && h.cargaModo === 'dia' ? 'dia' : 'semana';
        const cargaInicial = h ? Math.min(CARGA_MAX * 60, Math.round(Number(h.cargaSemanal || 0) * 60)) : CARGA_MAX * 60;
        const carga = U.campoHora({ rotulo: 'Carga horária por semana', valor: cargaInicial ? hhmm(cargaInicial) : '', horas: CARGA_MAX + 1, maximo: hhmm(CARGA_MAX * 60) });
        const diaInicial = h && HORA.test(h.entrada) && HORA.test(h.saida) ? liquido(h) : 480;
        const cargaDia = U.campoHora({ rotulo: 'Carga horária por dia', valor: hhmm(diaInicial), horas: 24, maximo: '23:59' });
        const definirCarga = (c, m) => { c.input.value = hhmm(m).replace(':', ''); c.input.dispatchEvent(new Event('input', { bubbles: true })); };
        const cargaModo = U.chips([['semana', 'Por semana'], ['dia', 'Por dia']], st.cargaModo, (v) => {
          if (v === st.cargaModo) return;
          // Ao trocar, a carga do outro jeito já vem preenchida com a conta de agora.
          if (v === 'dia') definirCarga(cargaDia, Math.round(minutosPadrao()) || 480); else definirCarga(carga, Math.min(CARGA_MAX * 60, Math.round(semanaMin())));
          st.cargaModo = v; pintar();
        });
        cargaModo.setAttribute('aria-label', 'Carga informada por semana ou por dia');
        const linhaSemana = linhaChips('Carga horária por semana *', carga.caixa, carga.painel);
        const linhaDia = linhaChips('Carga horária por dia *', cargaDia.caixa, cargaDia.painel);
        const calculada = el('small', 'profiles-note org-carga-calculada compras-nota-linha'); calculada.setAttribute('role', 'status');
        const linhaEscala = linhaChips('Escala *', escala); if (fora) U.notaNaLinha(linhaEscala, fora);
        U.notaNaLinha(linhaSemana); U.notaNaLinha(linhaDia);
        q.append(U.notaNaLinha(linhaChips('Nome (montado)', nome), notaNome), linhaEscala, linhaDias, linhaFolga, nota12,
          linhaChips('Carga informada', cargaModo), linhaSemana, linhaDia);
        // 5) Horário: duração do intervalo, entrada e início do intervalo; o resto é conta.
        const qh = el('fieldset', 'compras-fieldset'); qh.append(el('legend', null, 'Horário'));
        /** Um quadro de jornada. Com horasProprias (dia diferente), as horas do dia se escolhem; no horário geral, vêm da carga. */
        const quadroJornada = (x, rotulo, horasProprias) => {
          const durIni = String(x ? (x.intervaloInicio ? Number(x.intervaloMin || 0) : (h || x.entrada ? 0 : 60)) : 60);
          let dur = durIni;
          const duracao = U.chips(DURACOES.some((d) => d[0] === durIni) ? DURACOES : [...DURACOES, [durIni, duracaoTexto(Number(durIni))]], durIni, (v) => { dur = v; });
          duracao.setAttribute('aria-label', 'Duração do intervalo' + rotulo);
          const ent = U.campoHora({ rotulo: 'Entrada' + rotulo, valor: x ? x.entrada : '' });
          const ii = U.campoHora({ rotulo: 'Início do intervalo' + rotulo, valor: x ? x.intervaloInicio || '' : '' });
          const linhaII = linhaChips('Início do intervalo *', ii.caixa, ii.painel);
          const janela = el('small', 'profiles-note org-carga-calculada');
          const definirHora = (c, hora) => { c.input.value = hora.replace(':', ''); c.input.dispatchEvent(new Event('input', { bubbles: true })); };
          const minIni = x && HORA.test(x.entrada) && HORA.test(x.saida) ? liquido(x) : 0;
          const horas = horasProprias ? U.campoHora({ rotulo: 'Horas de trabalho no dia' + rotulo, valor: minIni > 0 ? hhmm(minIni) : '', horas: 24, maximo: '23:59' }) : null;
          const diaTxt = el('span', 'compras-valor'); const fim = el('span', 'compras-valor'); const sai = el('span', 'compras-valor');
          const linhaFim = linha('Fim do intervalo', fim);
          const nos = [linhaChips('Duração do intervalo', duracao), linhaChips('Entrada *', ent.caixa, ent.painel), U.notaNaLinha(linhaII, janela),
            horas ? linha('Horas de trabalho no dia *', horas.caixa, horas.painel) : linha('Horas de trabalho no dia', diaTxt), linhaFim, linha('Saída', sai)];
          const j = {
            nos, ii,
            dur: () => Number(dur),
            minutosDia: () => (horas ? minutosDe(horas.input.value) : 0),
            /** O horário do dia com a saída calculada: entrada + minutos de trabalho + intervalo. */
            valor: (min) => {
              const d = Number(dur); const e = ent.input.value; const i = d ? ii.input.value : '';
              return { entrada: e, saida: HORA.test(e) && min > 0 && min + d < 1440 ? horaMais(e, Math.round(min) + d) : '', intervaloInicio: i, intervaloMin: i ? d : 0 };
            },
            pintar: (min) => {
              // Mais de 6 horas de trabalho no dia: intervalo obrigatório (CLT, art. 71); "Sem intervalo" não pode ser escolhido.
              const obriga = min > SEIS_HORAS;
              if (obriga && Number(dur) === 0) { dur = '60'; duracao.atualizar(dur); }
              const sem = duracao.querySelector('button');
              if (sem) { sem.disabled = obriga; sem.title = obriga ? 'Acima de 6 horas de trabalho o intervalo é obrigatório' : ''; }
              const d = Number(dur); const e = ent.input.value;
              janela.textContent = '';
              if (d && HORA.test(e) && min > 0) {
                const ini = Math.max(1, min - SEIS_HORAS); const fimJ = Math.min(SEIS_HORAS, min - 1);
                if (ini <= fimJ) {
                  const txt = ii.input.value;
                  if (!txt) definirHora(ii, horaMais(e, Math.min(fimJ, Math.max(ini, 240))));
                  else if (HORA.test(txt)) { const antes = vao(e, txt); const alvo = Math.min(fimJ, Math.max(ini, antes)); if (alvo !== antes) definirHora(ii, horaMais(e, alvo)); }
                  janela.textContent = 'O início do intervalo fica entre ' + horaMais(e, ini) + ' e ' + horaMais(e, fimJ) + ': no máximo 6h da entrada até o intervalo e 6h do fim do intervalo até a saída.';
                } else janela.textContent = 'Com ' + duracaoTexto(min) + ' de trabalho no dia não cabe: com um intervalo, o máximo é 6h antes e 6h depois dele (12h).';
              }
              const v = j.valor(min);
              ver(linhaII, d > 0); ver(linhaFim, d > 0); ver(janela, Boolean(janela.textContent));
              diaTxt.textContent = min > 0 ? duracaoTexto(min) : '—';
              fim.textContent = v.intervaloInicio && HORA.test(v.intervaloInicio) ? horaMais(v.intervaloInicio, d) : '—';
              sai.textContent = v.saida || '—';
            },
            foco: () => ent.input.focus(),
          };
          return j;
        };
        const padrao = quadroJornada(h, '', false);
        qh.append(...padrao.nos);
        // 6) Dias com horário diferente: o horário acima vale para todos os dias de trabalho; só o dia que muda ganha um quadro, com as próprias horas
        //    (um quadro pode valer para mais de um dia). Só aparecem os dias de trabalho da escala.
        const qp = el('fieldset', 'compras-fieldset'); qp.append(el('legend', null, 'Dias com horário diferente'));
        const resumoExc = el('small', 'profiles-note org-carga-calculada org-resumo-exc'); qp.append(resumoExc);
        const excBox = el('div', 'compras-etapa'); const excecoes = [];
        const novaExcecao = (diasIniciais, x) => {
          const dias = new Set(diasIniciais);
          const f = el('fieldset', 'compras-fieldset org-excecao'); const leg = el('legend'); f.append(leg);
          const chipsDias = el('div', 'compras-chips'); chipsDias.setAttribute('role', 'group');
          const jornada = quadroJornada(x || padrao.valor(Math.round(minutosPadrao())), ' — horário diferente', true);
          const tirar = U.botaoRemover('Tirar este horário diferente', () => { excecoes.splice(excecoes.indexOf(e), 1); f.remove(); pintar(); });
          const lt = el('div', 'compras-campo'); lt.append(el('span', 'compras-rotulo', 'Tirar (o dia volta ao horário de todos os dias)'), tirar);
          f.append(linhaChips('Dias *', chipsDias), ...jornada.nos, lt);
          U.iconarLinhas(f);
          const e = { dias, f, leg, chipsDias, jornada };
          excecoes.push(e); excBox.append(f);
          return e;
        };
        const diasComExcecao = () => excecoes.flatMap((e) => [...e.dias].filter((d) => st.dias.has(d)).map((d) => ({ d, min: e.jornada.minutosDia() })));
        /** Minutos de trabalho de cada dia do horário geral: a carga menos as horas dos dias diferentes, dividida pelos outros dias (no 12x36, ÷ 3,5). */
        function minutosPadrao() {
          if (st.cargaModo === 'dia') return minutosDe(cargaDia.input.value);
          const total = minutosDe(carga.input.value);
          if (st.escala === '12x36') return total / 3.5;
          const exc = diasComExcecao(); const resto = st.dias.size - exc.length;
          return resto > 0 ? (total - exc.reduce((t, x) => t + x.min, 0)) / resto : 0;
        }
        /** Carga da semana em minutos: a informada (por semana) ou a conta (por dia × dias do horário geral + horas dos dias diferentes; no 12x36, × 3,5). */
        function semanaMin() {
          if (st.cargaModo === 'semana') return minutosDe(carga.input.value);
          const dia = minutosDe(cargaDia.input.value);
          if (st.escala === '12x36') return dia * 3.5;
          const exc = diasComExcecao(); return dia * Math.max(0, st.dias.size - exc.length) + exc.reduce((t, x) => t + x.min, 0);
        }
        // Abre com os dias personalizados já gravados, juntando os dias que têm o mesmo horário.
        Object.values(Object.entries(h ? h.porDia || {} : {}).reduce((g, [d, x]) => { const k = JSON.stringify(x); (g[k] = g[k] || { x, dias: [] }).dias.push(d); return g; }, {})).forEach((g) => novaExcecao(g.dias, g.x));
        const livres = () => ORDEM.filter((d) => st.dias.has(d) && !excecoes.some((x) => x.dias.has(d)));
        const addExc = U.botaoTitulo('Dia com horário diferente', 'Adicionar um dia com horário diferente', () => { const l = livres(); const e = novaExcecao(l.length ? [l[l.length - 1]] : []); pintar(); e.f.scrollIntoView({ block: 'nearest' }); });
        const rodapeExc = el('div', 'compras-form-rodape'); rodapeExc.append(addExc);
        qp.append(excBox);
        // Domingo e feriado (Rodrigo, 28/11/2026). DOMINGO (só quando o domingo é dia de trabalho, fora do 12x36): é compensado? em que dia da semana
        // (um dos dias de folga)? quantos domingos de folga no mês (1 ou 2) e quais (1º, 2º, 3º, 4º)? No domingo de folga ele trabalha o dia que
        // compensaria: nessa semana não há compensação. FERIADO: trabalha? se trabalha, é compensado com folga em outro dia?
        const dom0 = h && h.domingo ? h.domingo : {};
        st.dom = { compensado: typeof dom0.compensado === 'boolean' ? dom0.compensado : null, diaCompensa: dom0.diaCompensa || '', folgaQtd: dom0.folgaQtd || 1, folgaDomingos: new Set(dom0.folgaDomingos || []) };
        const fer0 = h && h.feriado ? h.feriado : {};
        st.fer = { trabalha: typeof fer0.trabalha === 'boolean' ? fer0.trabalha : null, compensado: typeof fer0.compensado === 'boolean' ? fer0.compensado : null };
        const qd = el('fieldset', 'compras-fieldset'); qd.append(el('legend', null, 'Domingo e feriado'));
        const grupoChips = (rotulo) => { const g = el('div', 'compras-chips'); g.setAttribute('role', 'group'); g.setAttribute('aria-label', rotulo); return g; };
        const compChips = grupoChips('Domingo compensado'); const diaCompChips = grupoChips('Dia que compensa o domingo');
        const qtdChips = grupoChips('Domingos de folga no mês'); const qualChips = grupoChips('Qual domingo do mês folga');
        const ferChips = grupoChips('Trabalha nos feriados'); const ferCompChips = grupoChips('Feriado compensado');
        const linhaComp = linhaChips('Domingo compensado? *', compChips); const linhaDiaComp = linhaChips('Dia que compensa *', diaCompChips);
        const linhaQtd = linhaChips('Domingos de folga no mês *', qtdChips); const linhaQual = linhaChips('Qual domingo folga *', qualChips);
        const notaDom = el('small', 'profiles-note org-carga-calculada'); const avisoDom = el('small', 'profiles-note org-carga-calculada org-aviso');
        const linhaFer = linhaChips('Trabalha nos feriados? *', ferChips); const linhaFerComp = linhaChips('Feriado compensado? *', ferCompChips);
        const notaFer = el('small', 'profiles-note org-carga-calculada org-aviso');
        qd.append(linhaComp, linhaDiaComp, linhaQtd, U.notaNaLinha(linhaQual, notaDom, avisoDom), linhaFer, U.notaNaLinha(linhaFerComp, notaFer));
        const chip = (texto, ativo, acao, travado, dica) => { const b = botao(texto, acao, 'compras-chip' + (ativo ? ' ativo' : '')); b.setAttribute('aria-pressed', String(ativo)); b.disabled = Boolean(travado); if (dica) b.title = dica; return b; };
        const ORDINAL = ['1º', '2º', '3º', '4º'];
        const simNao = (valor, por) => [chip('Sim', valor === true, () => { por(true); pintar(); }), chip('Não', valor === false, () => { por(false); pintar(); })];
        function pintarDomingoFeriado() {
          const temDom = st.dias.has('0') && st.escala !== '12x36';
          [linhaComp, linhaQtd, linhaQual, notaDom, avisoDom].forEach((x) => ver(x, temDom));
          ver(linhaDiaComp, temDom && st.dom.compensado === true);
          if (temDom) {
            // O dia que compensa é um dos dias de folga da semana (é o dia que ele passa a trabalhar na semana do domingo de folga).
            const folgas = ORDEM.filter((d) => d !== '0' && !st.dias.has(d));
            if (st.dom.diaCompensa && !folgas.includes(st.dom.diaCompensa)) st.dom.diaCompensa = '';
            compChips.replaceChildren(...simNao(st.dom.compensado, (v) => { st.dom.compensado = v; }));
            diaCompChips.replaceChildren(...(folgas.length ? folgas.map((d) => { const [, curto, longo] = DIAS.find((x) => x[0] === d); const b = chip(curto, st.dom.diaCompensa === d, () => { st.dom.diaCompensa = d; pintar(); }); b.setAttribute('aria-label', longo); b.title = longo; return b; }) : [el('span', 'compras-valor', 'Nenhum dia de folga na semana')]));
            qtdChips.replaceChildren(...[1, 2].map((q) => chip(q + ' por mês', st.dom.folgaQtd === q, () => { st.dom.folgaQtd = q; while (st.dom.folgaDomingos.size > q) st.dom.folgaDomingos.delete(Math.max(...st.dom.folgaDomingos)); pintar(); })));
            qualChips.replaceChildren(...[1, 2, 3, 4].map((k) => {
              const on = st.dom.folgaDomingos.has(k); const cheio = !on && st.dom.folgaDomingos.size >= st.dom.folgaQtd;
              return chip(ORDINAL[k - 1], on, () => { if (on) st.dom.folgaDomingos.delete(k); else if (!cheio) st.dom.folgaDomingos.add(k); pintar(); }, cheio, cheio ? 'Já estão marcados ' + st.dom.folgaQtd + ': desmarque um para trocar' : ORDINAL[k - 1] + ' domingo do mês');
            }));
            linhaQual.querySelector('.compras-rotulo').textContent = 'Qual domingo folga * (' + st.dom.folgaDomingos.size + ' de ' + st.dom.folgaQtd + ')';
            const ks = [...st.dom.folgaDomingos].sort(); const fd = ks.map((k) => ORDINAL[k - 1]).join(' e ');
            const nomeDia = st.dom.diaCompensa ? DIAS.find((x) => x[0] === st.dom.diaCompensa)[2].toLowerCase() : '';
            let txt = '';
            if (st.dom.compensado === true) txt = nomeDia ? 'Na semana em que trabalha o domingo, folga na ' + nomeDia + '.' + (fd ? ' No ' + fd + ' domingo do mês folga o domingo e trabalha a ' + nomeDia + ': nessa semana não há compensação.' : '') : 'Escolha o dia de folga da semana que compensa o domingo.';
            else if (st.dom.compensado === false) txt = 'Domingo sem compensação.' + (fd ? ' Folga o ' + fd + ' domingo do mês.' : '');
            // 5º domingo (meses com 5): trabalha normalmente (Rodrigo, 28/11/2026).
            if (txt && fd) txt += ' O 5º domingo, nos meses que têm, é trabalhado normalmente' + (st.dom.compensado && nomeDia ? ' (com a folga na ' + nomeDia + ').' : '.');
            notaDom.textContent = txt; ver(notaDom, Boolean(txt));
            // Comércio: pelo menos 1 domingo de folga a cada 3 semanas (Lei 10.101/2000, art. 6º, parágrafo único). O pior caso é o mês com 5 domingos.
            const avisosDom = [];
            if (ks.length) {
              const saltos = ks.slice(1).map((k, i) => k - ks[i]); saltos.push(5 - ks[ks.length - 1] + ks[0]);
              const maior = Math.max(...saltos);
              if (maior > 3) avisosDom.push('No comércio, a lei pede pelo menos 1 domingo de folga a cada 3 semanas (Lei 10.101/2000, art. 6º): assim ele pode ficar até ' + maior + ' semanas sem folgar no domingo. Confira a convenção coletiva.');
            }
            if (st.dom.compensado === false) avisosDom.push('Domingo trabalhado sem outra folga na semana no lugar dele é pago em dobro (Súmula 146 do TST).');
            avisoDom.textContent = avisosDom.join(' '); ver(avisoDom, Boolean(avisoDom.textContent));
          }
          ferChips.replaceChildren(...simNao(st.fer.trabalha, (v) => { st.fer.trabalha = v; }));
          ver(linhaFerComp, st.fer.trabalha === true);
          ferCompChips.replaceChildren(...simNao(st.fer.compensado, (v) => { st.fer.compensado = v; }));
          const af = [];
          if (st.fer.trabalha === true) af.push('No comércio, trabalhar em feriado precisa de autorização na convenção coletiva e respeitar a lei do município (Lei 10.101/2000, art. 6º-A).');
          if (st.fer.trabalha === true && st.fer.compensado === false) af.push('Feriado trabalhado sem folga em outro dia é pago em dobro (Lei 605/49, art. 9º).');
          notaFer.textContent = af.join(' '); ver(notaFer, Boolean(notaFer.textContent));
        }
        /** O que vai gravado de domingo e feriado. */
        const domingoFeriado = () => ({
          domingo: st.dias.has('0') && st.escala !== '12x36' ? { compensado: st.dom.compensado, diaCompensa: st.dom.compensado ? st.dom.diaCompensa : '', folgaQtd: st.dom.folgaQtd, folgaDomingos: [...st.dom.folgaDomingos].sort() } : null,
          feriado: { trabalha: st.fer.trabalha, compensado: st.fer.trabalha ? st.fer.compensado : null },
        });
        const avisos = el('div', 'org-contas'); avisos.setAttribute('role', 'status');
        form.append(q, qd, qh, qp, rodapeExc, avisos);
        const usos = h ? dados.cargos.filter((c) => c.horarioIds.includes(h.id)).length : 0;
        form.append(U.nota(h && usos > 1 ? 'Este horário / escala é usado em ' + usos + ' cargos: a mudança vale para todos eles.' : 'Este horário / escala entra na lista única do teste e pode ser escolhido em qualquer cargo e local.'));
        function pintar() {
          const esc = ESCALAS.find((e) => e[0] === st.escala); const n = esc ? esc[2] : 0; const doze = st.escala === '12x36';
          pintarDomingoFeriado();
          grupo.replaceChildren(...DIAS.map(([chave, curto, longo]) => {
            const cheio = Boolean(n) && !st.dias.has(chave) && st.dias.size >= n;
            const b = botao(curto, () => { if (st.dias.has(chave)) st.dias.delete(chave); else if (!cheio) st.dias.add(chave); pintar(); }, 'compras-chip' + (st.dias.has(chave) ? ' ativo' : ''));
            b.disabled = cheio; b.title = cheio ? 'Na escala ' + st.escala + ' são ' + n + ' dias: desmarque um dia para trocar' : longo; b.setAttribute('aria-label', longo); b.setAttribute('aria-pressed', String(st.dias.has(chave))); return b;
          }));
          ver(linhaSemana, st.cargaModo === 'semana'); ver(linhaDia, st.cargaModo === 'dia');
          (st.cargaModo === 'dia' ? linhaDia : linhaSemana).append(calculada);
          ver(linhaDias, !doze); ver(linhaFolga, !doze); ver(nota12, doze); ver(qp, !doze); ver(rodapeExc, !doze);
          // Cada quadro de dia diferente: só os dias de trabalho da escala; um dia não fica em dois quadros.
          excecoes.forEach((e, i) => {
            [...e.dias].forEach((d) => { if (!st.dias.has(d)) e.dias.delete(d); });
            e.leg.textContent = 'Horário diferente ' + (i + 1) + (e.dias.size ? ': ' + textoDosDias([...e.dias]) : '');
            e.chipsDias.setAttribute('aria-label', 'Dias do horário diferente ' + (i + 1));
            e.chipsDias.replaceChildren(...DIAS.filter(([d]) => st.dias.has(d)).map(([d, curto, longo]) => {
              const usado = excecoes.some((o) => o !== e && o.dias.has(d));
              const b = botao(curto, () => { if (e.dias.has(d)) e.dias.delete(d); else e.dias.add(d); pintar(); }, 'compras-chip' + (e.dias.has(d) ? ' ativo' : ''));
              b.title = usado ? longo + ' já tem outro horário diferente' : longo; b.disabled = usado; b.setAttribute('aria-label', longo); b.setAttribute('aria-pressed', String(e.dias.has(d))); return b;
            }));
          });
          addExc.disabled = !livres().length;
          const comExc = excecoes.flatMap((e) => [...e.dias]);
          resumoExc.textContent = comExc.length ? 'O horário acima vale para ' + (textoDosDias(ORDEM.filter((d) => st.dias.has(d) && !comExc.includes(d))) || 'nenhum dia') + '; os dias abaixo têm horário e horas próprios, e o resto da carga se divide pelos outros dias.' : 'O horário acima vale para todos os dias de trabalho (' + textoDosDias(ORDEM.filter((d) => st.dias.has(d))) + '). Se algum deles for diferente (ex.: sábado só de manhã), use "Dia com horário diferente" só para ele.';
          linhaDias.querySelector('.compras-rotulo').textContent = 'Dias de trabalho * (' + st.dias.size + (n ? ' de ' + n : '') + ')';
          folga.textContent = textoDosDias(ORDEM.filter((d) => !st.dias.has(d)));
          recalcular();
        }
        function atual() {
          const mp = Math.round(minutosPadrao());
          const base = padrao.valor(mp); const porDia = {};
          if (st.escala !== '12x36') excecoes.forEach((e) => { const v = e.jornada.valor(e.jornada.minutosDia()); if (JSON.stringify(v) !== JSON.stringify(base)) e.dias.forEach((d) => { if (st.dias.has(d)) porDia[d] = v; }); });
          const v = { escala: st.escala, dias: st.escala === '12x36' ? [] : ORDEM.filter((d) => st.dias.has(d)), ...base, porDia, ...domingoFeriado(), cargaModo: st.cargaModo, cargaSemanal: Math.round(semanaMin() / 60 * 100) / 100 };
          return v;
        }
        function recalcular() {
          const v = atual(); const mp = Math.round(minutosPadrao()); const total = Math.round(semanaMin()); const porDia = st.cargaModo === 'dia';
          padrao.pintar(mp);
          excecoes.forEach((e) => e.jornada.pintar(e.jornada.minutosDia()));
          const exc = diasComExcecao(); const resto = st.dias.size - exc.length; const somaExc = exc.reduce((t, x) => t + x.min, 0);
          let texto = ''; let aviso = false;
          if (porDia) {
            if (!mp) texto = 'Informe a carga por dia: a da semana e a saída saem dela.';
            else if (st.escala === '12x36') texto = 'Carga por semana: ' + duracaoTexto(mp) + ' × 3,5 plantões, em média = ' + duracaoTexto(total) + '.';
            else if (!st.dias.size) texto = 'Marque os dias de trabalho.';
            else texto = 'Carga por semana: ' + duracaoTexto(mp) + ' × ' + resto + (resto === 1 ? ' dia' : ' dias') + (exc.length ? ' + ' + duracaoTexto(somaExc) + ' dos dias diferentes' : '') + ' = ' + duracaoTexto(total) + '.';
            if (total > CARGA_MAX * 60) { aviso = true; texto += ' Passa do máximo de ' + CARGA_MAX + 'h por semana.'; }
          } else if (!total) texto = 'Informe a carga por semana: as horas de cada dia e a saída saem dela.';
          else if (st.escala === '12x36') texto = 'Horas de trabalho no plantão: ' + duracaoTexto(mp) + ' (' + duracaoTexto(total) + ' ÷ 3,5 plantões por semana, em média).';
          else if (!st.dias.size) texto = 'Marque os dias de trabalho.';
          else if (resto <= 0) { aviso = somaExc !== total; texto = 'Todos os dias têm horário diferente: somam ' + duracaoTexto(somaExc) + (aviso ? ', e a carga informada é ' + duracaoTexto(total) + '.' : '.'); }
          else if (mp <= 0) { aviso = true; texto = 'As horas dos dias diferentes (' + duracaoTexto(somaExc) + ') já ocupam a carga da semana (' + duracaoTexto(total) + ').'; }
          else texto = 'Horas de trabalho por dia: ' + duracaoTexto(mp) + ' (' + (exc.length ? duracaoTexto(total) + ' − ' + duracaoTexto(somaExc) + ' dos dias diferentes' : duracaoTexto(total)) + ' ÷ ' + resto + (resto === 1 ? ' dia' : ' dias') + ').';
          calculada.textContent = 'Até ' + hhmm(CARGA_MAX * 60) + ' por semana (horas e minutos). ' + texto; calculada.classList.toggle('org-aviso', aviso);
          // O quadro pode ter acabado de ajustar o início do intervalo: o nome e os avisos usam o horário já ajustado.
          const vf = atual();
          nome.value = nomeMontado(vf);
          notaNome.textContent = 'O nome se monta sozinho: escala · entrada às saída (almoço) · dias de trabalho · carga da semana.';
          avisos.replaceChildren(...avisosCLT(vf).map((x) => el('small', 'profiles-note org-aviso', x)));
        }
        form.addEventListener('input', recalcular); form.addEventListener('change', recalcular); form.addEventListener('click', () => setTimeout(recalcular, 0));
        pintar();
        setTimeout(() => (st.cargaModo === 'dia' ? cargaDia : carga).input.focus(), 0);
        return { nome, atual, padrao, excecoes, st, cargaMin: () => Math.round(semanaMin()), minutosPadrao, diasComExcecao };
      },
      salvar: (c) => {
        const v = c.atual();
        if (!v.escala) return 'Escolha a escala (5x2, 4x3 ou 12x36).';
        const n = ESCALAS.find((e) => e[0] === v.escala)[2];
        if (n && v.dias.length !== n) return 'Na escala ' + v.escala + ' a pessoa trabalha ' + n + ' dias: marque ' + n + ' dias (marcados: ' + v.dias.length + ').';
        if (v.domingo) {
          if (v.domingo.compensado === null) return 'Trabalha no domingo: diga se o domingo é compensado.';
          if (v.domingo.compensado && !v.domingo.diaCompensa) return 'Escolha o dia de folga da semana que compensa o domingo.';
          if (v.domingo.folgaDomingos.length !== v.domingo.folgaQtd) return 'Marque qual domingo do mês ele folga (' + v.domingo.folgaQtd + (v.domingo.folgaQtd === 1 ? ' domingo' : ' domingos') + ').';
        }
        if (v.feriado.trabalha === null) return 'Diga se trabalha nos feriados.';
        if (v.feriado.trabalha && v.feriado.compensado === null) return 'Diga se o feriado trabalhado é compensado com folga em outro dia.';
        const total = c.cargaMin(); const porDia = c.st.cargaModo === 'dia';
        if (porDia && !(c.minutosPadrao() > 0)) return 'Informe a carga horária por dia.';
        if (!(total > 0)) return 'Informe a carga horária por semana (até ' + hhmm(CARGA_MAX * 60) + ').';
        if (total > CARGA_MAX * 60) return (porDia ? 'Com essa carga por dia, a semana dá ' + duracaoTexto(total) + ': ' : '') + 'a carga horária por semana vai até ' + CARGA_MAX + ' horas.';
        const vazio = c.excecoes.find((e) => !e.dias.size); if (vazio) { vazio.f.scrollIntoView({ block: 'nearest' }); return 'Um horário diferente está sem dia marcado: marque o dia ou tire o quadro.'; }
        if (v.escala !== '12x36') {
          const exc = c.diasComExcecao();
          if (exc.length >= v.dias.length) return 'Todos os dias estão com horário diferente: deixe ao menos um dia no horário geral.';
          const semHoras = c.excecoes.find((e) => !e.jornada.minutosDia()); if (semHoras) { semHoras.f.scrollIntoView({ block: 'nearest' }); return 'Informe as horas de trabalho do dia diferente.'; }
          if (Math.round(c.minutosPadrao()) <= 0) return 'As horas dos dias diferentes já ocupam a carga da semana: diminua as horas deles ou aumente a carga.';
        }
        if (c.padrao.dur() && !c.padrao.ii.input.value) { c.padrao.ii.input.focus(); return 'Informe o início do intervalo.'; }
        const erroPadrao = conferirJornada(v, n ? 'Horário de todos os dias: ' : '');
        if (erroPadrao) { c.padrao.foco(); return erroPadrao; }
        const semInicio = c.excecoes.find((e) => e.jornada.dur() && !e.jornada.ii.input.value); if (semInicio) { semInicio.jornada.ii.input.focus(); return 'Informe o início do intervalo do dia diferente.'; }
        for (const d of Object.keys(v.porDia)) { const e = conferirJornada(v.porDia[d], DIAS.find((x) => x[0] === d)[2] + ': '); if (e) return e; }
        const nome = limpar(c.nome.value);
        if (nome.length < 2) return 'Preencha a escala, a carga e a entrada para montar o nome.';
        if (dados.horarios.some((x) => x.id !== (h && h.id) && mesmoNome(x.nome, nome))) { c.nome.focus(); return 'Já existe um horário / escala igual ("' + nome + '"). Escolha esse na lista.'; }
        const item = { id: h ? h.id : novoId('hr'), nome, nomeModo: 'montado', sigla: siglaDoNome(nome), ...v };
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
