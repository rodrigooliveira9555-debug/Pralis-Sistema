/*
 * VND - Horário de Funcionamento (Entradas › Vendas › Cadastros Geral), 25/11/2026, pedido do Rodrigo.
 * Cadastro de horários com nome: cada um diz em que dias vale (segunda a domingo e/ou feriado) e a hora em que abre e fecha.
 * Exemplos: "Segunda a sexta" 06:00–20:00, "Sábado" 06:00–14:00, "Feriado" 07:00–12:00. Dá para cadastrar quantos precisar.
 * Mesmo desenho dos outros cadastros da lista (Clientes): botão Novo, linha com seta (editar / ativar e desativar), janela de edição.
 * Horário não é excluído: desativar o tira de uso e mantém o cadastro. Dados só neste aparelho: chave cicluz-horarios-funcionamento-v1
 * (versão 1); a regra de qual horário vence quando dois valem no mesmo dia (ex.: feriado numa segunda) ainda não foi decidida (doc 11).
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  if (!U) return;
  const { el, botao, campo, entrada } = U;
  const KEY = 'cicluz-horarios-funcionamento-v1';
  const cor = () => (typeof menuColor !== 'undefined' && menuColor[0]) || '#eab308';
  const RELOGIO = '<path d="M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"/>';
  // Segunda a domingo, depois feriado. A chave é o dia da semana do JavaScript (0 = domingo) ou "feriado".
  const DIAS = [['1', 'Seg', 'Segunda-feira'], ['2', 'Ter', 'Terça-feira'], ['3', 'Qua', 'Quarta-feira'], ['4', 'Qui', 'Quinta-feira'], ['5', 'Sex', 'Sexta-feira'], ['6', 'Sáb', 'Sábado'], ['0', 'Dom', 'Domingo'], ['feriado', 'Feriado', 'Feriado']];
  const ORDEM = DIAS.map((d) => d[0]);
  const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

  /* ---------- Dados (só neste aparelho) ---------- */
  let dados = { version: 1, itens: [] };
  let erroLeitura = false;
  function ler() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (s) { if (s.version !== 1 || !Array.isArray(s.itens)) throw new Error('formato'); dados = s; }
    } catch (e) { erroLeitura = true; }
  }
  /** Grava; se não der, volta ao que estava e devolve false (nada fica pela metade). */
  function gravar(mudar) {
    const antes = JSON.stringify(dados);
    try { if (erroLeitura) throw new Error('leitura'); mudar(dados); localStorage.setItem(KEY, JSON.stringify(dados)); return true; } catch (e) { dados = JSON.parse(antes); return false; }
  }
  ler();
  const novoId = () => 'hf-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

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
  const textoDoHorario = (h) => h.abre + ' às ' + h.fecha + (h.fecha < h.abre ? ' (dia seguinte)' : '');
  const mesmoNome = (a, b) => U.dobrar(a).trim() === U.dobrar(b).trim();

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
    const lista = todos.filter((h) => U.dobrar(h.nome + ' ' + textoDosDias(h.dias)).includes(U.dobrar(busca)))
      .sort((a, b) => (a.ativo === b.ativo ? 0 : a.ativo ? -1 : 1) || a.nome.localeCompare(b.nome, 'pt-BR'));
    const caixa = U.buscaRodape(tela, 'Buscar horário', (valor) => { busca = valor; if (tela.view.classList.contains('show')) render(); });
    const linhas = el('div', 'compras-lista compras-lista-grade'); U.arrastarParaRolar(linhas);
    const ativos = todos.filter((h) => h.ativo).length;
    const ponta = U.pontaDaLista(ativos, ativos + (ativos === 1 ? ' horário ativo' : ' horários ativos'));
    const sec = U.secao('Horários de funcionamento', undefined, ponta);
    sec.querySelector('.compras-secao-cab h3').replaceChildren(U.botaoTitulo('Novo Horário', 'Cadastrar horário de funcionamento', () => editar()));
    sec.append(linhas);
    if (erroLeitura) linhas.append(U.vazio('Não foi possível ler os horários guardados neste aparelho.', 'Nada foi alterado. Recarregue a página; se continuar, avise o administrador.'));
    else if (!lista.length) linhas.append(U.vazio(busca ? 'Nenhum horário encontrado.' : 'Nenhum horário cadastrado.', busca ? '' : 'Use "Novo Horário" para cadastrar, por exemplo, "Segunda a sexta", "Sábado" ou "Feriado".'));
    else {
      const cab = U.cabecalhoColunas('grade-horario-funcionamento', [
        { chave: 'nome', rotulo: 'Horário' }, { chave: 'dias', rotulo: 'Dias', ocultavel: true }, { chave: 'horas', rotulo: 'Abre e fecha', ocultavel: true }, { chave: 'estado', rotulo: 'Situação' },
      ], { lista: linhas, preferencia: 'cicluz-horario-funcionamento-colunas' });
      linhas.append(cab); ponta.append(cab.botaoGeral);
      lista.forEach((h) => linhas.append(linha(h, linhas)));
    }
    tela.body.replaceChildren(caixa, U.nota(todos.length + ' horário(s). Cada horário tem um nome, os dias em que vale e a hora de abrir e de fechar. Um toque abre o cadastro para editar. Horário não é excluído: use a seta da linha para desativar.'), sec);
  }
  function linha(h, linhas) {
    const inativo = !h.ativo;
    const row = U.linhaLista({
      icones: [{ icone: RELOGIO, rotulo: 'Horário' }], grade: 'grade-horario-funcionamento',
      colunas: [{ chave: 'nome', conteudo: h.nome }, { chave: 'dias', conteudo: textoDosDias(h.dias) }, { chave: 'horas', conteudo: textoDoHorario(h) }],
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
  function editar(h) {
    const v = { dias: new Set(h ? h.dias : []) };
    const cores = { cor: cor(), corTexto: '#785600' };
    U.dialogo({
      titulo: h ? 'Editar horário' : 'Novo horário de funcionamento',
      ...cores,
      montar: (form) => {
        const nome = entrada('text', h ? h.nome : '', { autocomplete: 'off', maxLength: 60, placeholder: 'Ex.: Segunda a sexta' });
        nome.required = true;
        const campoNome = campo('Nome do horário *', nome, 'É o nome que você vai reconhecer na lista: "Segunda a sexta", "Sábado", "Feriado"…');
        // Dias: botões que ligam e desligam, segunda a domingo e feriado.
        const grupo = el('div', 'compras-chips'); grupo.setAttribute('role', 'group'); grupo.setAttribute('aria-label', 'Dias em que este horário vale');
        const pintar = () => grupo.replaceChildren(...DIAS.map(([chave, curto, longo]) => {
          const b = botao(curto, () => { if (v.dias.has(chave)) v.dias.delete(chave); else v.dias.add(chave); pintar(); }, 'compras-chip' + (v.dias.has(chave) ? ' ativo' : ''));
          b.title = longo; b.setAttribute('aria-label', longo); b.setAttribute('aria-pressed', String(v.dias.has(chave)));
          return b;
        }));
        pintar();
        const campoDias = campo('Dias em que vale *', grupo, 'Marque um ou mais dias. Feriado é um dia à parte.');
        const aberto = U.campoHora({ rotulo: 'Abre às', valor: h ? h.abre : '' });
        const fechado = U.campoHora({ rotulo: 'Fecha às', valor: h ? h.fecha : '' });
        const noHora = (rotulo, c) => { const n = el('div', 'compras-campo'); n.append(el('span', 'compras-rotulo', rotulo), c.caixa, c.painel); return n; };
        const horas = el('div', 'compras-grade');
        horas.append(noHora('Abre às *', aberto), noHora('Fecha às *', fechado));
        const dicaHoras = el('small', 'profiles-note', 'Se fechar depois da meia-noite, informe a hora do dia seguinte (ex.: abre 18:00, fecha 02:00).');
        const situacao = U.quadroSituacao('Situação do horário', h ? h.ativo : true, { dica: 'Horário inativo continua cadastrado, mas não entra em uso.' });
        form.append(campoNome, campoDias, horas, dicaHoras, situacao);
        return { nome, aberto, fechado, situacao };
      },
      salvar: (c) => {
        const nome = c.nome.value.trim().replace(/\s+/g, ' ');
        if (nome.length < 2) { c.nome.focus(); return 'Informe o nome do horário.'; }
        if (dados.itens.some((x) => x.id !== (h && h.id) && mesmoNome(x.nome, nome))) { c.nome.focus(); return 'Já existe um horário com o nome "' + nome + '". Escolha outro nome.'; }
        if (!v.dias.size) return 'Marque pelo menos um dia em que este horário vale.';
        const abre = c.aberto.input.value; const fecha = c.fechado.input.value;
        if (!HORA.test(abre)) { c.aberto.input.focus(); return 'Informe a hora em que abre (HH:MM).'; }
        if (!HORA.test(fecha)) { c.fechado.input.focus(); return 'Informe a hora em que fecha (HH:MM).'; }
        if (abre === fecha) return 'Abrir e fechar na mesma hora não é um horário. Informe horas diferentes.';
        const item = { id: h ? h.id : novoId(), nome, dias: ORDEM.filter((d) => v.dias.has(d)), abre, fecha, ativo: c.situacao.ativo };
        const ok = gravar((d) => { const i = d.itens.findIndex((x) => x.id === item.id); if (i >= 0) d.itens[i] = { ...d.itens[i], ...item }; else d.itens.push({ ...item, criadoEm: new Date().toISOString() }); });
        if (!ok) return 'Não foi possível salvar neste aparelho. Nada foi alterado.';
        U.avisar('Horário ' + (h ? 'atualizado.' : 'cadastrado.'));
        render();
      },
    });
  }

  window.CicluzHorarioFuncionamento = { abrir, textoDosDias, itens: () => dados.itens.slice() };
})();
