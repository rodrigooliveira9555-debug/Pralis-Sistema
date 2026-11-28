/*
 * DES - Organograma Multifuncional — AMBIENTE DE TESTE (Rodrigo, 27/11/2026).
 * Uma tela só para montar a estrutura da loja em árvore: Loja › Área › Setor › Local. Em cada bloco o "+" insere o nível de baixo
 * (a ordem é fixa: Área, depois Setor, depois Local) ou um Cargo; dentro do cargo, o "+" escolhe ou cria o Horário / Escala.
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
  const MAIS = '<path d="M12 5v14M5 12h14"/>';
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

  /* ---------- Tela ---------- */
  let tela = null; const abertos = new Set(['raiz']); let primeira = true;
  const caminho = () => (typeof menuCrumb === 'function' ? menuCrumb(2, 'Cadastros Geral Colaboradores', 'DES - Organograma Multifuncional') : 'Saídas · Despesas / Cadastros Geral Colaboradores / DES - Organograma Multifuncional');
  function abrir() {
    if (!dados) ler();
    if (!tela) {
      tela = U.criarTela({ id: 'des-organograma-multifuncional', titulo: 'DES - Organograma Multifuncional', caminho: caminho(), icone: 'cadastro', voltar: () => menuBack(2, 'Cadastros Geral Colaboradores')(), cor: cor(), corTexto: COR_TEXTO });
      U.atalho(tela, 'Recomeçar o teste com o exemplo', 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5', recomecar);
      U.atalho(tela, 'Recolher tudo', 'm5 15 7-7 7 7', () => { abertos.clear(); render(); });
      U.atalho(tela, 'Expandir tudo', 'm5 9 7 7 7-7', () => { abertos.add('raiz'); dados.nos.forEach((n) => abertos.add(n.id)); render(); });
      U.atalho(tela, 'Nova área', 'M12 5v14M5 12h14', () => inserir(null), { criar: true });
    }
    // Na primeira vez, as áreas já abrem mostrando os setores.
    if (primeira) { dados.nos.filter((n) => n.tipo === 'area').forEach((n) => abertos.add(n.id)); primeira = false; }
    tela.ativar();
    render();
  }

  function render() {
    if (!tela) return;
    const nAreas = filhos(null).length;
    const ponta = U.pontaDaLista(dados.nos.length, dados.nos.length + (dados.nos.length === 1 ? ' bloco' : ' blocos'));
    const sec = U.secao('Organograma da loja');
    sec.querySelector('.compras-secao-cab h3').replaceChildren(U.botaoTitulo('Nova Área', 'Inserir área na loja', () => inserir(null)));
    sec.querySelector('.compras-secao-cab').append(ponta);
    const arvore = el('div', 'org-multi'); arvore.setAttribute('role', 'tree'); arvore.setAttribute('aria-label', 'Organograma da loja');
    if (erroLeitura) arvore.append(U.vazio('Não foi possível ler o teste guardado neste aparelho.', 'Use "Recomeçar o teste" no alto da tela.'));
    else arvore.append(bloco({ id: 'raiz', tipo: 'loja', nome: 'Loja', sigla: '' }, 0));
    sec.append(arvore);
    const texto = 'AMBIENTE DE TESTE: o que você monta aqui fica só neste teste e não muda Área / Setor / Local, Cargos nem Horário / Escala de verdade. ' +
      'Toque no "+" de um bloco para inserir o nível de baixo (Área › Setor › Local) ou um Cargo; no "+" do cargo, escolha ou crie o Horário / Escala. ' +
      'O Horário / Escala criado entra na lista única e pode ser escolhido nos outros locais. ' + nAreas + (nAreas === 1 ? ' área.' : ' áreas.');
    tela.body.replaceChildren(U.infoDaLista(sec, texto, 'organograma-multifuncional-teste'));
  }

  /** Resumo do bloco: "2 setores · 3 cargos". */
  function resumo(n) {
    const partes = []; const fs = n.tipo === 'loja' ? filhos(null) : filhos(n.id);
    const tipoFilho = TIPOS[n.tipo].filho;
    if (tipoFilho && fs.length) partes.push(fs.length + ' ' + (fs.length === 1 ? TIPOS[tipoFilho].nome.toLowerCase() : TIPOS[tipoFilho].plural));
    const cs = n.tipo === 'loja' ? [] : cargosDe(n.id);
    if (cs.length) partes.push(cs.length + (cs.length === 1 ? ' cargo' : ' cargos'));
    return TIPOS[n.tipo].nome + (partes.length ? ' · ' + partes.join(' · ') : '');
  }
  const redondo = (rotulo, desenho, acao, extra = '') => {
    const b = el('button', 'shortcut-circle compras-redondo' + (extra ? ' ' + extra : '')); b.type = 'button'; b.title = rotulo; b.setAttribute('aria-label', rotulo);
    b.innerHTML = U.svg(desenho); b.onclick = (e) => { e.stopPropagation(); acao(); }; return b;
  };

  /** Um bloco da árvore (Loja, Área, Setor ou Local), com os cargos e os blocos de baixo quando aberto. */
  function bloco(n, nivel) {
    const item = el('div', 'org-multi-item'); item.dataset.tipo = n.tipo; item.setAttribute('role', 'treeitem');
    const fs = n.tipo === 'loja' ? filhos(null) : filhos(n.id);
    const cs = n.tipo === 'loja' ? [] : cargosDe(n.id);
    const temDentro = fs.length + cs.length > 0;
    const aberto = abertos.has(n.id);
    if (temDentro) item.setAttribute('aria-expanded', String(aberto));
    const linha = el('div', 'org-multi-no');
    const id = el('span', 'org-multi-id'); id.setAttribute('aria-hidden', 'true');
    if (n.tipo === 'loja') id.innerHTML = U.svg(ICONE_LOJA); else id.append(el('span', 'sigla-text', n.sigla || '?'));
    const texto = el('div', 'org-multi-texto'); texto.append(el('b', null, n.nome), el('small', null, resumo(n)));
    const acoes = el('div', 'org-multi-acoes');
    if (temDentro) {
      const seta = redondo((aberto ? 'Recolher ' : 'Expandir ') + n.nome, aberto ? '<path d="m5 15 7-7 7 7"/>' : '<path d="m5 9 7 7 7-7"/>', () => { if (aberto) abertos.delete(n.id); else abertos.add(n.id); render(); }, 'escolha-expandir');
      seta.setAttribute('aria-expanded', String(aberto)); acoes.append(seta);
    }
    acoes.append(redondo('Inserir em ' + n.nome, MAIS, () => inserir(n.tipo === 'loja' ? null : n)));
    if (n.tipo !== 'loja') acoes.append(redondo('Editar ' + n.nome, LAPIS, () => editarNo(n), 'org-multi-editar'));
    linha.append(id, texto, acoes);
    if (n.tipo !== 'loja') { linha.tabIndex = 0; linha.onclick = () => editarNo(n); linha.onkeydown = (e) => { if (e.target === linha && e.key === 'Enter') { e.preventDefault(); editarNo(n); } }; }
    item.append(linha);
    if (temDentro && aberto) {
      const dentro = el('div', 'org-multi-dentro'); dentro.setAttribute('role', 'group');
      cs.forEach((c) => dentro.append(linhaCargo(c, n)));
      fs.forEach((f) => dentro.append(bloco(f, nivel + 1)));
      item.append(dentro);
    }
    return item;
  }

  function linhaCargo(c, n) {
    const linha = el('div', 'org-multi-no org-multi-cargo'); linha.setAttribute('role', 'treeitem'); linha.tabIndex = 0;
    const id = el('span', 'org-multi-id'); id.setAttribute('aria-hidden', 'true'); id.innerHTML = U.svg(ICONE_CARGO);
    const hs = c.horarioIds.map(horarioPorId).filter(Boolean);
    const texto = el('div', 'org-multi-texto');
    const sub = hs.length ? hs.map((h) => h.nome + ' ' + h.entrada + '–' + h.saida).join(' · ') : 'Sem horário / escala';
    const small = el('small', hs.length ? null : 'org-multi-falta', 'Cargo · ' + sub); small.title = hs.map((h) => h.nome + ': ' + textoDoHorario(h)).join('\n');
    texto.append(el('b', null, c.cargoNome + (c.cargoId ? '' : ' (fora do cadastro de cargos)')), small);
    const acoes = el('div', 'org-multi-acoes');
    acoes.append(redondo('Inserir horário / escala em ' + c.cargoNome, MAIS, () => editarCargo(c, n)), redondo('Editar ' + c.cargoNome + ' em ' + n.nome, LAPIS, () => editarCargo(c, n), 'org-multi-editar'));
    linha.append(id, texto, acoes);
    linha.onclick = () => editarCargo(c, n);
    linha.onkeydown = (e) => { if (e.target === linha && e.key === 'Enter') { e.preventDefault(); editarCargo(c, n); } };
    return linha;
  }

  /* ---------- Inserir: o nível de baixo ou um cargo ---------- */
  /** pai = bloco onde se insere; null = a Loja (só aceita Área). */
  function inserir(pai) {
    const tipoFilho = pai ? TIPOS[pai.tipo].filho : 'area';
    const opcoes = []; if (tipoFilho) opcoes.push([tipoFilho, TIPOS[tipoFilho].nome]); if (pai) opcoes.push(['cargo', 'Cargo']);
    let escolhido = opcoes[0][0];
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
      else d.nos.push({ id: novoId('no'), tipo, nome, sigla, paiId });
    });
    if (!ok) return 'Não foi possível salvar neste aparelho. Nada foi alterado.';
    if (pai) abertos.add(pai.id); else abertos.add('raiz');
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
    const qh = el('fieldset', 'compras-fieldset'); qh.append(el('legend', null, 'Horário / Escala'));
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
    if (c) {
      if (!gravar((d) => { d.cargos.find((x) => x.id === c.id).horarioIds = horarioIds; })) return 'Não foi possível salvar neste aparelho. Nada foi alterado.';
      U.avisar('Horário / escala de ' + c.cargoNome + ' atualizado.');
    } else {
      const real = ctx.reais.find((r) => String(r.id) === ctx.seletor.value);
      if (!real) { ctx.seletor.focus(); return 'Escolha o cargo.'; }
      if (cargosDe(pai.id).some((x) => x.cargoId === real.id)) return real.nome + ' já está em ' + pai.nome + '. Use o "+" do cargo para mudar o horário.';
      if (!gravar((d) => { d.cargos.push({ id: novoId('cg'), noId: pai.id, cargoId: real.id, cargoNome: real.nome, horarioIds }); })) return 'Não foi possível salvar neste aparelho. Nada foi alterado.';
      abertos.add(pai.id);
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
        form.append(q, U.nota('Este horário / escala entra na lista única do teste e pode ser escolhido em qualquer cargo e local.'));
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
      dados = novo; erroLeitura = false; abertos.clear(); abertos.add('raiz'); primeira = true;
      U.avisar('Teste recomeçado com o exemplo.');
      abrir();
    }, { cor: cor(), corTexto: COR_TEXTO });
  }

  window.CicluzOrganogramaMultifuncional = { abrir, textoDosDias, exemplo, CHAVE: KEY };
})();
