/*
 * VND - Horário de Funcionamento (Entradas › Vendas › Cadastros Geral). Criado em 25/11/2026; refeito em 26/11/2026 a pedido do Rodrigo.
 * Cada horário tem NOME, IDENTIFICADOR (sigla de até 3 caracteres ou ícone, como nos grupos) e uma lista de FAIXAS. Cada faixa diz em que dias
 * vale (segunda a domingo e/ou feriado) e a hora em que abre e fecha. Exemplo: "Loja Centro" com Seg a Sex 06:00–20:00, Sáb 06:00–14:00 e
 * Feriado 07:00–12:00. O mesmo dia pode estar em duas faixas do mesmo horário (ex.: fechar no almoço), desde que as horas não se cruzem.
 * Mesmo desenho dos outros cadastros da lista (Clientes): botão Novo, linha com seta (editar / ativar e desativar), janela de edição em quadros.
 * Horário não é excluído: desativar o tira de uso e mantém o cadastro.
 * Dados só neste aparelho: chave cicluz-horarios-funcionamento-v2. A versão 1 (um nome com dias e horas, chave ...-v1) é convertida uma vez:
 * cada horário antigo vira um horário com UMA faixa e a sigla tirada do nome. A chave v1 fica guardada como estava (cópia de segurança).
 * A regra de qual horário vence quando dois horários ativos valem no mesmo dia (ex.: feriado numa segunda) ainda não foi decidida (P-49).
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  if (!U) return;
  const { el, botao, campo, entrada } = U;
  const KEY = 'cicluz-horarios-funcionamento-v2';
  const KEY_V1 = 'cicluz-horarios-funcionamento-v1';
  const cor = () => (typeof menuColor !== 'undefined' && menuColor[0]) || '#eab308';
  const RELOGIO = '<path d="M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"/>';
  // Segunda a domingo, depois feriado. A chave é o dia da semana do JavaScript (0 = domingo) ou "feriado".
  const DIAS = [['1', 'Seg', 'Segunda-feira'], ['2', 'Ter', 'Terça-feira'], ['3', 'Qua', 'Quarta-feira'], ['4', 'Qui', 'Quinta-feira'], ['5', 'Sex', 'Sexta-feira'], ['6', 'Sáb', 'Sábado'], ['0', 'Dom', 'Domingo'], ['feriado', 'Feriado', 'Feriado']];
  const ORDEM = DIAS.map((d) => d[0]);
  const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
  const nomeLongo = (d) => DIAS.find((x) => x[0] === d)[2];

  /* ---------- Identificador: sigla (até 3 caracteres) ou ícone ---------- */
  // Até 3 letras visíveis (um acento ou emoji conta como uma), em maiúsculas: a mesma conta dos grupos (CicluzIdentity).
  const compactar = (v) => (window.CicluzIdentity ? CicluzIdentity.compact(v) : Array.from(String(v || '').trim()).slice(0, 3).join('')).toLocaleUpperCase('pt-BR');
  const siglaDoNome = (nome) => compactar(String(nome || '').replace(/\s+/g, ''));
  // Ícones à escolha: o relógio, os ícones da padaria e os que o usuário importou na biblioteca. O cadastro guarda só o ID do ícone.
  function icones() {
    const lista = [{ id: 'relogio', label: 'Relógio', path: RELOGIO }];
    (window.CicluzBakeryIcons || []).forEach((i) => lista.push({ id: i.id, label: i.label, path: i.path }));
    ((window.CicluzIconLibrary && CicluzIconLibrary.custom) || []).forEach((i) => { if (i && i.id && i.path) lista.push({ id: String(i.id), label: i.label || 'Ícone importado', path: i.path }); });
    return lista;
  }
  const iconePorId = (id) => icones().find((i) => i.id === id) || icones()[0];
  const desenhoIcone = (path) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + path + '</svg>';
  const escapar = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  /** HTML do identificador para a linha da lista: a sigla em texto ou o desenho do ícone. */
  const htmlIdentidade = (h) => (h.identidade.modo === 'icone' ? desenhoIcone(iconePorId(h.identidade.icone).path) : '<span class="sigla-text">' + escapar(h.identidade.sigla) + '</span>');

  /* ---------- Dados (só neste aparelho) ---------- */
  let dados = { version: 2, itens: [] };
  let erroLeitura = false;
  const novoId = (p = 'hf') => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  /** Versão 1 → 2: cada horário antigo vira um horário com uma faixa, mesmo id, mesmo nome, mesma situação. Nada é descartado. */
  function converterV1(v1) {
    return {
      version: 2,
      convertidoDaV1Em: new Date().toISOString(),
      itens: v1.itens.map((h) => ({
        id: h.id, nome: h.nome, ativo: h.ativo !== false, criadoEm: h.criadoEm,
        identidade: { modo: 'sigla', sigla: siglaDoNome(h.nome), icone: 'relogio' },
        faixas: [{ id: novoId('fx'), dias: Array.isArray(h.dias) ? h.dias.slice() : [], abre: h.abre, fecha: h.fecha }],
      })),
    };
  }
  function ler() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (s) { if (s.version !== 2 || !Array.isArray(s.itens)) throw new Error('formato'); dados = s; return; }
      const v1 = JSON.parse(localStorage.getItem(KEY_V1) || 'null');
      if (!v1) return;
      if (v1.version !== 1 || !Array.isArray(v1.itens)) throw new Error('formato v1');
      const novo = converterV1(v1);
      localStorage.setItem(KEY, JSON.stringify(novo));
      dados = novo;
    } catch (e) { erroLeitura = true; }
  }
  /** Grava; se não der, volta ao que estava e devolve false (nada fica pela metade). */
  function gravar(mudar) {
    const antes = JSON.stringify(dados);
    try { if (erroLeitura) throw new Error('leitura'); mudar(dados); localStorage.setItem(KEY, JSON.stringify(dados)); return true; } catch (e) { dados = JSON.parse(antes); return false; }
  }
  ler();

  /** "1,2,3,4,5" → "Seg a Sex"; dias seguidos viram faixa (3 ou mais), o resto vai separado por vírgula; feriado por último. */
  function textoDosDias(dias) {
    const set = new Set(dias);
    const semana = ORDEM.slice(0, 7).filter((d) => set.has(d));
    const partes = []; let i = 0;
    while (i < semana.length) {
      let j = i;
      while (j + 1 < semana.length && ORDEM.indexOf(semana[j + 1]) === ORDEM.indexOf(semana[j]) + 1) j++;
      const nome = (d) => DIAS.find((x) => x[0] === d)[1];
      if (j - i >= 2) partes.push(nome(semana[i]) + ' a ' + nome(semana[j])); else for (let k = i; k <= j; k++) partes.push(nome(semana[k]));
      i = j + 1;
    }
    if (set.has('feriado')) partes.push('Feriado');
    return partes.join(', ') || '—';
  }
  const textoDasHoras = (f) => f.abre + '–' + f.fecha + (f.fecha < f.abre ? ' (dia seguinte)' : '');
  const textoDaFaixa = (f) => textoDosDias(f.dias) + ' ' + textoDasHoras(f);
  const mesmoNome = (a, b) => U.dobrar(a).trim() === U.dobrar(b).trim();

  /**
   * Duas faixas do mesmo horário não podem se cruzar no mesmo dia. Cada faixa vira um trecho na semana (segunda 00:00 = minuto 0); quem fecha
   * depois da meia-noite entra no dia seguinte (domingo à noite entra na segunda). Feriado é uma linha do tempo à parte.
   * Devolve { a, b, dia } do primeiro cruzamento, ou null.
   */
  const minutos = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  const SEMANA = 7 * 1440;
  function trechos(f) {
    const ini = minutos(f.abre); let fim = minutos(f.fecha); if (fim <= ini) fim += 1440;
    return f.dias.map((d) => (d === 'feriado' ? { dia: d, linha: 'F', ini, fim } : { dia: d, linha: 'S', ini: ORDEM.indexOf(d) * 1440 + ini, fim: ORDEM.indexOf(d) * 1440 + fim }));
  }
  const cruza = (x, y) => [0, SEMANA, -SEMANA].some((k) => (x.linha === 'S' || k === 0) && x.ini < y.fim + k && y.ini + k < x.fim);
  function cruzamento(faixas) {
    for (let a = 0; a < faixas.length; a++) {
      for (let b = a + 1; b < faixas.length; b++) {
        for (const x of trechos(faixas[a])) {
          const y = trechos(faixas[b]).find((t) => t.linha === x.linha && cruza(x, t));
          if (y) return { a, b, dia: x.linha === 'F' ? 'Feriado' : nomeLongo(x.dia) };
        }
      }
    }
    return null;
  }

  /* ---------- Lista ---------- */
  let tela = null; let busca = '';
  function abrir() {
    if (!tela) {
      const caminho = (typeof sections !== 'undefined' && sections[0] ? sections[0][0] : 'Entradas · Vendas') + ' / Cadastros Geral / VND - Horário de Funcionamento';
      tela = U.criarTela({ id: 'vnd-horario-funcionamento', titulo: 'VND - Horário de Funcionamento', caminho, icone: 'cadastro', voltar: () => menuBack(0, 'Cadastros Geral')(), cor: cor(), corTexto: '#785600' });
      U.atalho(tela, 'Novo horário', 'M12 5v14M5 12h14', () => editar(), { criar: true });
    }
    tela.ativar();
    render();
  }
  function render() {
    if (!tela) return;
    const todos = dados.itens;
    const lista = todos.filter((h) => U.dobrar(h.nome + ' ' + h.identidade.sigla + ' ' + h.faixas.map(textoDaFaixa).join(' ')).includes(U.dobrar(busca)))
      .sort((a, b) => (a.ativo === b.ativo ? 0 : a.ativo ? -1 : 1) || a.nome.localeCompare(b.nome, 'pt-BR'));
    const caixa = U.buscaRodape(tela, 'Buscar horário', (valor) => { busca = valor; if (tela.view.classList.contains('show')) render(); });
    const linhas = el('div', 'compras-lista compras-lista-grade'); U.arrastarParaRolar(linhas);
    const ativos = todos.filter((h) => h.ativo).length;
    const ponta = U.pontaDaLista(ativos, ativos + (ativos === 1 ? ' horário ativo' : ' horários ativos'));
    const sec = U.secao('Horários de funcionamento', undefined, ponta);
    sec.querySelector('.compras-secao-cab h3').replaceChildren(U.botaoTitulo('Novo Horário', 'Cadastrar horário de funcionamento', () => editar()));
    sec.append(linhas);
    if (erroLeitura) linhas.append(U.vazio('Não foi possível ler os horários guardados neste aparelho.', 'Nada foi alterado. Recarregue a página; se continuar, avise o administrador.'));
    else if (!lista.length) linhas.append(U.vazio(busca ? 'Nenhum horário encontrado.' : 'Nenhum horário cadastrado.', busca ? '' : 'Use "Novo Horário" para cadastrar, por exemplo, "Loja Centro" com Seg a Sex, Sábado e Feriado em faixas separadas.'));
    else {
      const cab = U.cabecalhoColunas('grade-horario-funcionamento', [
        { chave: 'nome', rotulo: 'Horário' }, { chave: 'faixas', rotulo: 'Dias e horas', ocultavel: true }, { chave: 'estado', rotulo: 'Situação' },
      ], { lista: linhas, preferencia: 'cicluz-horario-funcionamento-colunas-v2' });
      linhas.append(cab); ponta.append(cab.botaoGeral);
      lista.forEach((h) => linhas.append(linha(h, linhas)));
    }
    tela.body.replaceChildren(caixa, U.infoDaLista(sec, todos.length + ' horário(s). Cada horário tem um nome, um identificador e uma ou mais faixas de dias com a hora de abrir e de fechar. Um toque abre o cadastro para editar. Horário não é excluído: use a seta da linha para desativar.', 'horario-funcionamento'));
  }
  function linha(h, linhas) {
    const inativo = !h.ativo;
    // Todas as faixas numa linha só (a linha da lista tem 52 px como as outras); o texto inteiro aparece ao parar o mouse.
    const faixas = el('span', 'compras-horario-faixas', h.faixas.map(textoDaFaixa).join(' · ')); faixas.title = faixas.textContent;
    const row = U.linhaLista({
      icones: [{ html: htmlIdentidade(h), rotulo: 'Identificador de ' + h.nome }], grade: 'grade-horario-funcionamento',
      colunas: [{ chave: 'nome', conteudo: h.nome }, { chave: 'faixas', conteudo: faixas }],
      estado: inativo ? 'Inativo' : 'Ativo',
      acoes: { rotulo: h.nome, lista: linhas, aoEditar: () => editar(h), aoExcluir: () => alternar(h) },
    });
    if (inativo) row.classList.add('inativo');
    const arrow = row.querySelector('.account-action-toggle'); const drawer = row.querySelector('.account-row-actions');
    const off = [...drawer.children].find((b) => /^Excluir/.test(b.getAttribute('aria-label') || ''));
    const rotuloOff = (inativo ? 'Ativar ' : 'Desativar ') + h.nome;
    off.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + (inativo ? 'm5 12 4 4L19 6' : 'M5.6 5.6l12.8 12.8M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z') + '"/></svg>';
    off.title = rotuloOff; off.setAttribute('aria-label', rotuloOff);
    row.onclick = (e) => { if (e.target.closest('button')) return; if (!drawer.hidden) { drawer.hidden = true; arrow.setAttribute('aria-expanded', 'false'); return; } editar(h); };
    row.onkeydown = (e) => { if (e.target === row && e.key === 'Enter') { e.preventDefault(); editar(h); } };
    row.setAttribute('aria-label', 'Editar ' + h.nome);
    return row;
  }
  function alternar(h) {
    const novo = !h.ativo;
    if (!gravar((d) => { d.itens.find((x) => x.id === h.id).ativo = novo; })) return U.avisar('Não foi possível salvar neste aparelho. Nada foi alterado.');
    U.avisar(h.nome + (novo ? ' ativado.' : ' desativado.'));
    render();
  }

  /* ---------- Cadastro ---------- */
  /** Linha com o nome à esquerda e o que vier à direita (não é <label>: os botões de dentro não podem ser acionados ao tocar no nome). */
  function linhaCampo(rotulo, ...nos) { const n = el('div', 'compras-campo'); n.append(el('span', 'compras-rotulo', rotulo), ...nos); return n; }

  /** Quadro "Identificador": escolha entre sigla e ícone; a sigla nasce do nome e acompanha o nome até ser digitada à mão. */
  function quadroIdentidade(h, nome) {
    const ident = h ? { ...h.identidade } : { modo: 'sigla', sigla: '', icone: 'relogio' };
    const modo = U.seletor([['sigla', '3 caracteres'], ['icone', 'Ícone']], ident.modo);
    const campoModo = campo('Identificador', modo);
    const sigla = entrada('text', ident.sigla, { autocomplete: 'off', placeholder: 'Ex.: LCE' });
    let manual = Boolean(h) && ident.sigla !== siglaDoNome(h.nome);
    if (!h) sigla.value = siglaDoNome(nome.value);
    sigla.oninput = () => { sigla.value = compactar(sigla.value); manual = sigla.value !== ''; if (!manual) sigla.value = siglaDoNome(nome.value); };
    nome.addEventListener('input', () => { if (!manual) sigla.value = siglaDoNome(nome.value); });
    const campoSigla = campo('Até 3 caracteres *', sigla);
    // Ícone: o botão redondo mostra o ícone escolhido; tocar abre o painel com os ícones (o escolhido fica marcado).
    const mostra = el('button', 'shortcut-circle compras-redondo compras-icone-escolhido'); mostra.type = 'button';
    const painel = el('div', 'compras-escolha-painel compras-icone-painel');
    painel.setAttribute('role', 'dialog'); painel.setAttribute('aria-label', 'Escolher o ícone do horário');
    const grade = el('div', 'compras-icone-grade'); grade.setAttribute('role', 'group');
    painel.append(el('p', 'transferencia-folha-titulo', 'Escolher o ícone'), grade);
    const abrirPainel = U.flutuante(mostra, painel);
    mostra.onclick = () => abrirPainel(painel.hidden);
    const pintarIcone = () => {
      const atual = iconePorId(ident.icone);
      mostra.innerHTML = desenhoIcone(atual.path); mostra.title = 'Ícone: ' + atual.label + ' (tocar para trocar)'; mostra.setAttribute('aria-label', 'Ícone: ' + atual.label + '. Tocar para trocar');
      grade.replaceChildren(...icones().map((i) => {
        const b = el('button', 'compras-icone-opcao'); b.type = 'button'; b.innerHTML = desenhoIcone(i.path); b.title = i.label;
        b.setAttribute('aria-label', i.label); b.setAttribute('aria-pressed', String(i.id === atual.id));
        b.onclick = () => { ident.icone = i.id; pintarIcone(); abrirPainel(false); mostra.focus(); };
        return b;
      }));
    };
    pintarIcone();
    const campoIcone = linhaCampo('Ícone *', mostra, painel);
    // Só uma das duas linhas fica no quadro: a da sigla ou a do ícone (a outra sai do quadro e volta ao trocar, com o que já estava escolhido).
    const pintarModo = () => { const [fica, sai] = modo.value === 'icone' ? [campoIcone, campoSigla] : [campoSigla, campoIcone]; if (sai.isConnected) sai.replaceWith(fica); sigla.required = modo.value === 'sigla'; };
    modo.onchange = pintarModo;
    return { nos: [campoModo, modo.value === 'icone' ? campoIcone : campoSigla], modo, sigla, valor: () => ({ modo: modo.value, sigla: compactar(sigla.value), icone: iconePorId(ident.icone).id }) };
  }

  /** Um quadro "Faixa N": dias (botões que ligam e desligam), Abre às e Fecha às; "Remover faixa" quando há mais de uma. */
  function quadroFaixa(f, aoRemover) {
    const dias = new Set(f ? f.dias : []);
    const q = el('fieldset', 'compras-fieldset');
    const titulo = el('legend');
    const grupo = el('div', 'compras-chips'); grupo.setAttribute('role', 'group');
    const pintar = () => grupo.replaceChildren(...DIAS.map(([chave, curto, longo]) => {
      const b = botao(curto, () => { if (dias.has(chave)) dias.delete(chave); else dias.add(chave); pintar(); }, 'compras-chip' + (dias.has(chave) ? ' ativo' : ''));
      b.title = longo; b.setAttribute('aria-label', longo); b.setAttribute('aria-pressed', String(dias.has(chave)));
      return b;
    }));
    pintar();
    const aberto = U.campoHora({ rotulo: 'Abre às', valor: f ? f.abre : '' });
    const fechado = U.campoHora({ rotulo: 'Fecha às', valor: f ? f.fecha : '' });
    // Remover: linha com o botão redondo vermelho da lixeira (padrão de excluir); só existe quando há mais de uma faixa.
    const remover = U.botaoRemover('Remover faixa', aoRemover);
    const rodape = linhaCampo('Remover faixa', remover);
    q.append(titulo, linhaCampo('Dias *', grupo), linhaCampo('Abre às *', aberto.caixa, aberto.painel), linhaCampo('Fecha às *', fechado.caixa, fechado.painel));
    return {
      no: q, aberto, fechado, rodape, id: f ? f.id : novoId('fx'),
      numerar: (n, total) => { titulo.textContent = 'Faixa ' + n; grupo.setAttribute('aria-label', 'Dias da faixa ' + n); remover.title = 'Remover faixa ' + n; remover.setAttribute('aria-label', 'Remover faixa ' + n); if (total < 2) rodape.remove(); else q.append(rodape); },
      valor: () => ({ dias: ORDEM.filter((d) => dias.has(d)), abre: aberto.input.value, fecha: fechado.input.value }),
    };
  }

  function editar(h) {
    U.dialogo({
      titulo: h ? 'Editar horário' : 'Novo horário de funcionamento',
      cor: cor(), corTexto: '#785600',
      montar: (form) => {
        const nome = entrada('text', h ? h.nome : '', { autocomplete: 'off', maxLength: 60, placeholder: 'Ex.: Loja Centro' });
        nome.required = true;
        const ident = quadroIdentidade(h, nome);
        const situacao = U.quadroSituacao('Situação do horário', h ? h.ativo : true, { dica: 'Horário inativo continua cadastrado, mas não entra em uso.' });
        const sHorario = el('fieldset', 'compras-fieldset');
        sHorario.append(el('legend', null, 'Horário'), campo('Nome do horário *', nome), ...ident.nos, situacao);

        // Faixas: quantas precisar. O mesmo dia pode voltar em outra faixa, desde que as horas não se cruzem (ex.: fechar no almoço).
        const faixas = []; const lista = el('div', 'compras-etapa');
        const numerar = () => faixas.forEach((x, i) => x.numerar(i + 1, faixas.length));
        const nova = (f) => { const x = quadroFaixa(f, () => { faixas.splice(faixas.indexOf(x), 1); x.no.remove(); numerar(); }); faixas.push(x); lista.append(x.no); numerar(); return x; };
        (h ? h.faixas : [null]).forEach(nova);
        const adicionar = U.botaoTitulo('Adicionar faixa', 'Adicionar faixa de dias e horas', () => { const x = nova(); x.no.scrollIntoView({ block: 'nearest' }); x.aberto.input.focus(); });
        const linhaAdd = el('div', 'compras-form-rodape'); linhaAdd.append(adicionar);
        const dica = U.nota('Cada faixa tem os dias e a hora de abrir e de fechar. Para fechar no almoço, use duas faixas com o mesmo dia (ex.: 06:00–12:00 e 14:00–20:00). Se fechar depois da meia-noite, informe a hora do dia seguinte (ex.: abre 18:00, fecha 02:00).');
        form.append(sHorario, lista, linhaAdd, dica);
        return { nome, ident, situacao, faixas };
      },
      salvar: (c) => {
        const nome = c.nome.value.trim().replace(/\s+/g, ' ');
        if (nome.length < 2) { c.nome.focus(); return 'Informe o nome do horário.'; }
        if (dados.itens.some((x) => x.id !== (h && h.id) && mesmoNome(x.nome, nome))) { c.nome.focus(); return 'Já existe um horário com o nome "' + nome + '". Escolha outro nome.'; }
        const identidade = c.ident.valor();
        if (identidade.modo === 'sigla' && !identidade.sigla) { c.ident.sigla.focus(); return 'Informe a sigla do horário (até 3 caracteres) ou escolha um ícone.'; }
        if (!c.faixas.length) return 'Inclua pelo menos uma faixa de dias e horas.';
        const faixas = [];
        for (let i = 0; i < c.faixas.length; i++) {
          const x = c.faixas[i]; const v = x.valor(); const qual = c.faixas.length > 1 ? 'Faixa ' + (i + 1) + ': ' : '';
          if (!v.dias.length) return qual + 'marque pelo menos um dia.';
          if (!HORA.test(v.abre)) { x.aberto.input.focus(); return qual + 'informe a hora em que abre (HH:MM).'; }
          if (!HORA.test(v.fecha)) { x.fechado.input.focus(); return qual + 'informe a hora em que fecha (HH:MM).'; }
          if (v.abre === v.fecha) { x.fechado.input.focus(); return qual + 'abrir e fechar na mesma hora não é um horário. Informe horas diferentes.'; }
          faixas.push({ id: x.id, ...v });
        }
        const choque = cruzamento(faixas);
        if (choque) return 'A Faixa ' + (choque.a + 1) + ' (' + textoDasHoras(faixas[choque.a]) + ') e a Faixa ' + (choque.b + 1) + ' (' + textoDasHoras(faixas[choque.b]) + ') se cruzam ' + (/feira$/.test(choque.dia) ? 'na ' : 'no ') + choque.dia + '. Ajuste as horas ou os dias.';
        const item = { id: h ? h.id : novoId(), nome, identidade, faixas, ativo: c.situacao.ativo };
        const ok = gravar((d) => { const i = d.itens.findIndex((x) => x.id === item.id); if (i >= 0) d.itens[i] = { ...d.itens[i], ...item }; else d.itens.push({ ...item, criadoEm: new Date().toISOString() }); });
        if (!ok) return 'Não foi possível salvar neste aparelho. Nada foi alterado.';
        U.avisar('Horário ' + (h ? 'atualizado.' : 'cadastrado.'));
        render();
      },
    });
  }

  window.CicluzHorarioFuncionamento = { abrir, textoDosDias, cruzamento, converterV1, itens: () => dados.itens.slice() };
})();
