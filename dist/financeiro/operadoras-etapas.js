/*
 * Cadastro de operadora de cartão em quatro etapas (VND - Tipos de Operadoras Cartões), 25/11/2026, pedido do Rodrigo:
 *   1 Dados da operadora · 2 Cadastro das máquinas (uma ou mais) · 3 Custo das máquinas · 4 Taxa das bandeiras.
 * Usa a barra de etapas do sistema (CicluzStepper, layout wizard). O formulário de groups.js monta os campos de sempre; aqui eles só são
 * repartidos em etapas — nenhum campo ou regra de taxa das bandeiras mudou.
 * Dados (só neste aparelho), dentro da operadora:
 *   maquinas:      [{ id, apelido, modelo, serie, ativa }]
 *   custosMaquina: [{ id, expenseId, tipo, descricao, cobrado, aplicaA, calculo, valor, periodicidade, faixa, faixaDe, faixaAte, faixaMedida, inicio, fim, obs }]
 * Operadora antiga sem esses campos abre com listas vazias; nada é apagado. Máquina já salva não se exclui (turnos e fechamentos podem citá-la):
 * inativa-se. O custo da máquina é só CADASTRO: nenhum relatório ou cálculo do sistema o usa ainda (regra de uso pendente, doc 11 P-50).
 */
(function () {
  'use strict';
  const ETAPAS = ['Dados da operadora', 'Cadastro das máquinas', 'Custo das máquinas', 'Taxa das bandeiras'];
  const novoId = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
  const tira = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR').trim();
  const el = (tag, cls, texto) => { const n = document.createElement(tag); if (cls) n.className = cls; if (texto !== undefined) n.textContent = texto; return n; };
  const botao = (texto, acao, cls) => { const b = el('button', cls || 'btn secondary', texto); b.type = 'button'; b.onclick = acao; return b; };
  const moeda = (n) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const dataBR = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
  const numero = (txt) => { const s = String(txt == null ? '' : txt).trim(); if (!s) return null; const n = Number(s.replace(/R\$|\s|\./g, '').replace(',', '.')); return Number.isFinite(n) ? n : NaN; };
  const percentual = (txt) => { const s = String(txt == null ? '' : txt).replace('%', '').trim(); if (!s) return null; const n = Number(s.replace(',', '.')); return Number.isFinite(n) ? n : NaN; };

  /* ---------- Etapa 2: cadastro das máquinas ---------- */

  /** Painel "Máquinas": lista editável. Devolve { painel, ler, listar }. ler() devolve a lista pronta ou { erro } com a mensagem. */
  function painelMaquinas(item) {
    const painel = el('section', 'operator-fees operator-machines');
    const ajuda = el('p', null, 'Cadastre uma ou mais máquinas desta operadora: o apelido que você reconhece, o modelo e o número de série. Máquina já salva não é excluída: use Inativa para tirá-la de uso.');
    const lista = el('div');
    const vazia = el('p', 'profiles-note', 'Nenhuma máquina cadastrada. Use "+ Adicionar máquina".');
    const linhas = [];
    const salvas = new Set(((item && item.maquinas) || []).map((m) => m.id));

    function campo(rotulo, valor, extra = {}) {
      const l = el('label', null, rotulo);
      const i = el('input'); i.type = 'text'; i.value = valor || ''; i.maxLength = extra.max || 60; i.autocomplete = 'off';
      if (extra.placeholder) i.placeholder = extra.placeholder;
      i.setAttribute('aria-label', rotulo);
      l.append(i);
      return { l, i };
    }
    function adicionar(dados = {}) {
      const linha = el('div', 'operator-fee-rule operator-machine');
      const id = dados.id || novoId();
      const apelido = campo('Apelido da máquina *', dados.apelido, { placeholder: 'Ex.: Moderninha do balcão' });
      const modelo = campo('Modelo', dados.modelo, { placeholder: 'Ex.: PagBank Moderninha' });
      const serie = campo('Número de série', dados.serie, { max: 40 });
      let ativa = dados.ativa !== false;
      const quadro = el('div', 'account-status');
      const row = el('div', 'account-status-row');
      const chave = el('button', 'account-status-switch'); chave.type = 'button'; chave.setAttribute('role', 'switch'); chave.setAttribute('aria-label', 'Máquina ativa ou inativa'); chave.append(el('span'));
      const txt = el('span', 'account-status-text');
      const pintar = () => { chave.setAttribute('aria-checked', String(ativa)); txt.textContent = ativa ? 'Ativa' : 'Inativa'; linha.classList.toggle('inativo', !ativa); };
      chave.onclick = () => { ativa = !ativa; pintar(); };
      pintar();
      row.append(chave, txt); quadro.append(el('span', null, 'Situação da máquina'), row);
      linha.append(apelido.l, modelo.l, serie.l, quadro);
      const entrada = { id, apelido: apelido.i, modelo: modelo.i, serie: serie.i, ativa: () => ativa, linha };
      if (!salvas.has(id)) linha.append(botao('− Remover máquina', () => { linha.remove(); linhas.splice(linhas.indexOf(entrada), 1); atualizar(); }, 'btn fee-action'));
      linhas.push(entrada); lista.append(linha); atualizar();
      return entrada;
    }
    function atualizar() { vazia.hidden = linhas.length > 0; }
    const novo = botao('+ Adicionar máquina', () => { const e = adicionar(); e.apelido.focus(); }, 'btn fee-action');
    ((item && item.maquinas) || []).forEach((m) => adicionar(m));
    painel.append(ajuda, lista, vazia, novo);
    atualizar();

    function ler() {
      const vistos = new Set();
      const saida = [];
      for (const e of linhas) {
        const apelido = e.apelido.value.trim().replace(/\s+/g, ' ');
        const serie = e.serie.value.trim();
        if (!apelido) { e.apelido.focus(); return { erro: 'Informe o apelido de cada máquina (ou remova a linha em branco).' }; }
        if (vistos.has('a:' + tira(apelido))) { e.apelido.focus(); return { erro: 'Há duas máquinas com o apelido "' + apelido + '". Use apelidos diferentes.' }; }
        vistos.add('a:' + tira(apelido));
        if (serie) {
          if (vistos.has('s:' + tira(serie))) { e.serie.focus(); return { erro: 'O número de série "' + serie + '" aparece em duas máquinas.' }; }
          vistos.add('s:' + tira(serie));
        }
        saida.push({ id: e.id, apelido, modelo: e.modelo.value.trim(), serie, ativa: e.ativa() });
      }
      return saida;
    }
    /** As máquinas como estão agora na tela (mesmo as ainda não salvas), para o custo escolher a quem se aplica. */
    const listar = () => linhas.map((e, i) => ({ id: e.id, rotulo: e.apelido.value.trim() || 'Máquina ' + (i + 1) }));
    return { painel, ler, listar };
  }

  /* ---------- Etapa 3: custo das máquinas ---------- */

  const TIPOS = ['Aluguel da máquina', 'Mensalidade ou assinatura', 'Taxa de adesão ou ativação', 'Instalação ou envio', 'Manutenção ou suporte', 'Taxa por inatividade (máquina sem uso)', 'Seguro ou proteção', 'Multa de cancelamento ou devolução', 'Bobinas e insumos', 'Outro custo'];
  const PERIODOS = [['mes', 'Por mês'], ['ano', 'Por ano'], ['dia', 'Por dia'], ['unica', 'Uma única vez'], ['transacao', 'Por transação']];
  const COBRADO = [['maquina', 'Por máquina'], ['operadora', 'Operadora toda']];
  const CALCULO = [['reais', 'Valor fixo (R$)'], ['percentual', '% do faturamento']];
  const FAIXAS = [['sem', 'Sem faixa (vale sempre)'], ['maquina', 'Faturamento da máquina'], ['operadora', 'Faturamento total da operadora']];
  const MEDIDA = [['mes', 'no mês'], ['ano', 'no ano']];
  const rot = (lista, v) => (lista.find((x) => x[0] === v) || ['', v])[1];

  /** Painel "Custo das máquinas": cada linha é um custo (aluguel, mensalidade…) com a base de cobrança, o valor, a faixa de faturamento e a vigência. */
  function painelCustos(item, listarMaquinas, rotuloOutras, opcoesDespesa) {
    const painel = el('section', 'operator-fees operator-costs');
    painel.append(el('p', null, 'Registre os custos que a operadora cobra pelas máquinas: aluguel, mensalidade, adesão, instalação e outros. Cada custo diz quanto é, se é por máquina ou da operadora toda, de quanto em quanto tempo e, se for o caso, em que faixa de faturamento vale (ex.: aluguel isento acima de certo faturamento). Para valores diferentes por faixa, adicione uma linha por faixa. Aqui é só o cadastro: nenhum cálculo do sistema usa estes custos ainda.'));
    const rapido = el('div', 'operator-cost-rapido');
    const lista = el('div');
    const vazia = el('p', 'profiles-note', 'Nenhum custo cadastrado. Use os botões acima para começar.');
    const cartoes = [];

    function adicionar(dados = {}) {
      const c = { id: dados.id || novoId(), aplicaA: dados.aplicaA || 'todas' };
      const card = el('div', 'operator-fee-rule operator-cost');
      const resumo = el('p', 'operator-cost-resumo');
      const campos = el('div', 'operator-cost-campos');
      const select = (rotulo, opcoes, valor) => { const l = el('label', null, rotulo); const s = el('select'); for (const o of opcoes) s.add(new Option(Array.isArray(o) ? o[1] : o, Array.isArray(o) ? o[0] : o)); s.value = valor; s.setAttribute('aria-label', rotulo); l.append(s); return { l, s }; };
      const entrada = (rotulo, tipo, valor, extra = {}) => { const l = el('label', null, rotulo); const i = el('input'); i.type = tipo; i.value = valor == null ? '' : valor; if (extra.money) { i.type = 'text'; i.dataset.money = 'true'; i.inputMode = 'numeric'; } if (extra.placeholder) i.placeholder = extra.placeholder; if (extra.max) i.maxLength = extra.max; i.setAttribute('aria-label', rotulo); l.append(i); return { l, i }; };

      const tipo = select('Tipo de custo *', TIPOS, dados.tipo || TIPOS[0]);
      // Todo custo se liga a um Grupo de Despesa (ou subgrupo), como as taxas das bandeiras: é o que classifica o gasto.
      const opcoesDes = opcoesDespesa ? opcoesDespesa(dados.expenseId) : [];
      const grupoDes = select('Grupo de Despesa *', [['', 'Selecione o grupo ou subgrupo de despesa'], ...opcoesDes], '');
      if (dados.expenseId && !opcoesDes.some((o) => o[0] === dados.expenseId)) grupoDes.s.add(new Option('Grupo indisponível — selecione outro', dados.expenseId));
      grupoDes.s.value = dados.expenseId || '';
      const descricao = entrada('Qual é o custo? *', 'text', dados.descricao, { max: 80, placeholder: 'Ex.: Taxa de reposição de chip' });
      const cobrado = select('Quem paga', COBRADO, dados.cobrado || 'maquina');
      const aplica = el('fieldset', 'operator-cost-aplica'); aplica.append(el('legend', null, 'Máquinas que pagam'));
      const calculo = select('Como é cobrado', CALCULO, dados.calculo || 'reais');
      const valorReais = entrada('Valor (R$) *', 'text', dados.calculo !== 'percentual' && dados.valor != null ? moeda(dados.valor) : '', { money: true });
      const valorPerc = entrada('Percentual do faturamento (%) *', 'text', dados.calculo === 'percentual' && dados.valor != null ? String(dados.valor).replace('.', ',') : '', { placeholder: 'Ex.: 0,5' });
      const periodo = select('De quanto em quanto tempo', PERIODOS, dados.periodicidade || 'mes');
      const faixa = select('Vale em qual faixa de faturamento', FAIXAS, dados.faixa || 'sem');
      const faixaDe = entrada('Faturamento a partir de (R$)', 'text', dados.faixaDe != null ? moeda(dados.faixaDe) : '', { money: true });
      const faixaAte = entrada('Faturamento até (R$) — vazio = sem limite', 'text', dados.faixaAte != null ? moeda(dados.faixaAte) : '', { money: true });
      const medida = select('Faturamento medido', MEDIDA, dados.faixaMedida || 'mes');
      const inicio = entrada('Início da vigência *', 'date', dados.inicio);
      const fim = entrada('Fim da vigência (opcional)', 'date', dados.fim);
      const obs = entrada('Observações', 'text', dados.obs, { max: 200, placeholder: 'Ex.: isento acima do combinado' });
      let mostraAplica = false;
      const montarCampos = () => {
        const perc = calculo.s.value === 'percentual'; const comFaixa = faixa.s.value !== 'sem';
        campos.replaceChildren(...[tipo.l, tipo.s.value === 'Outro custo' && descricao.l, grupoDes.l, cobrado.l, mostraAplica && aplica, calculo.l, perc ? valorPerc.l : valorReais.l, periodo.l, faixa.l,
          comFaixa && faixaDe.l, comFaixa && faixaAte.l, comFaixa && medida.l, inicio.l, fim.l, obs.l].filter(Boolean));
      };

      // As máquinas a que o custo se aplica: todas, ou só as marcadas (só quando é cobrado por máquina e há mais de uma).
      function pintarAplica() {
        const maq = listarMaquinas();
        const ids = new Set(maq.map((m) => m.id));
        if (c.aplicaA !== 'todas') { c.aplicaA = c.aplicaA.filter((id) => ids.has(id)); if (!c.aplicaA.length) c.aplicaA = 'todas'; }
        mostraAplica = cobrado.s.value === 'maquina' && maq.length > 1;
        montarCampos();
        // Botões que ligam e desligam (o mesmo desenho dos dias do horário de funcionamento).
        const caixa = (rotulo, marcado, aoMudar) => { const b = el('button', 'compras-chip' + (marcado ? ' ativo' : ''), rotulo); b.type = 'button'; b.setAttribute('aria-pressed', String(marcado)); b.onclick = () => aoMudar(!marcado); return b; };
        const todas = caixa('Todas as máquinas', c.aplicaA === 'todas', (v) => { c.aplicaA = v ? 'todas' : maq.map((m) => m.id); pintarAplica(); atualizar(); });
        aplica.replaceChildren(el('legend', null, 'Máquinas que pagam'), el('div', 'compras-chips', ''), ...[]); const grupo = aplica.querySelector('div'); grupo.append(todas, ...maq.map((m) => caixa(m.rotulo, c.aplicaA === 'todas' || c.aplicaA.includes(m.id), (v) => {
          const atual = c.aplicaA === 'todas' ? maq.map((x) => x.id) : c.aplicaA.slice();
          c.aplicaA = v ? [...new Set([...atual, m.id])] : atual.filter((id) => id !== m.id);
          if (!c.aplicaA.length) c.aplicaA = 'todas';
          pintarAplica(); atualizar();
        })));
      }
      function atualizar() {
        montarCampos();
        const perc = calculo.s.value === 'percentual'; const comFaixa = faixa.s.value !== 'sem';
        const v = perc ? percentual(valorPerc.i.value) : numero(valorReais.i.value);
        const nomeCusto = tipo.s.value === 'Outro custo' ? (descricao.i.value.trim() || 'Outro custo') : tipo.s.value;
        const partes = [nomeCusto + ' · ' + (v == null || Number.isNaN(v) ? 'valor a informar' : perc ? String(v).replace('.', ',') + '% do faturamento' : moeda(v)) + ' ' + rot(PERIODOS, periodo.s.value).toLocaleLowerCase('pt-BR')];
        partes.push(cobrado.s.value === 'maquina' ? (c.aplicaA === 'todas' ? 'por máquina (todas)' : 'por máquina (' + c.aplicaA.length + ' escolhida' + (c.aplicaA.length === 1 ? '' : 's') + ')') : 'operadora toda');
        if (comFaixa) { const de = numero(faixaDe.i.value); const ate = numero(faixaAte.i.value); partes.push('faturamento ' + (faixa.s.value === 'maquina' ? 'da máquina' : 'total') + ' ' + (de != null && ate != null ? 'de ' + moeda(de) + ' a ' + moeda(ate) : de != null ? 'a partir de ' + moeda(de) : ate != null ? 'até ' + moeda(ate) : 'a definir') + ' ' + rot(MEDIDA, medida.s.value)); }
        if (inicio.i.value) partes.push('desde ' + dataBR(inicio.i.value) + (fim.i.value ? ' até ' + dataBR(fim.i.value) : ''));
        resumo.textContent = partes.join(' · ');
      }
      [tipo.s, grupoDes.s, cobrado.s, calculo.s, faixa.s, medida.s, periodo.s].forEach((s) => s.addEventListener('change', () => { if (s === cobrado.s) pintarAplica(); atualizar(); }));
      [descricao.i, valorReais.i, valorPerc.i, faixaDe.i, faixaAte.i, inicio.i, fim.i].forEach((i) => i.addEventListener('input', atualizar));
      [inicio.i, fim.i].forEach((i) => i.addEventListener('change', atualizar));

      const remover = botao('− Remover custo', () => {
        if (remover.dataset.confirmando !== 'true') { remover.dataset.confirmando = 'true'; remover.textContent = 'Confirmar remoção'; return; }
        card.remove(); cartoes.splice(cartoes.indexOf(reg), 1); vazia.hidden = cartoes.length > 0;
      }, 'btn fee-action');
      card.append(resumo, campos, remover);
      const reg = { c, card, tipo: tipo.s, grupoDes: grupoDes.s, descricao: descricao.i, cobrado: cobrado.s, calculo: calculo.s, valorReais: valorReais.i, valorPerc: valorPerc.i, periodo: periodo.s, faixa: faixa.s, faixaDe: faixaDe.i, faixaAte: faixaAte.i, medida: medida.s, inicio: inicio.i, fim: fim.i, obs: obs.i, pintarAplica };
      cartoes.push(reg); lista.append(card); vazia.hidden = true;
      pintarAplica(); atualizar();
      return reg;
    }
    [['Aluguel da máquina', '+ Aluguel'], ['Mensalidade ou assinatura', '+ Mensalidade'], ['Taxa de adesão ou ativação', '+ Adesão'], ['Instalação ou envio', '+ Instalação'], ['Outro custo', '+ Outro custo']]
      .forEach(([t, r]) => rapido.append(botao(r, () => { const n = adicionar({ tipo: t }); n.valorReais.focus(); }, 'btn fee-action')));
    ((item && item.custosMaquina) || []).forEach((x) => adicionar(x));
    vazia.hidden = cartoes.length > 0;
    painel.append(rapido, lista, vazia);
    if (rotuloOutras) { rotuloOutras.classList.add('operator-cost-outras'); painel.append(rotuloOutras); }

    /** Confere e devolve os custos prontos, ou { erro }. */
    function ler() {
      const saida = [];
      for (const e of cartoes) {
        const tipo = e.tipo.value; const perc = e.calculo.value === 'percentual';
        const descricao = e.descricao.value.trim();
        if (tipo === 'Outro custo' && !descricao) { e.descricao.focus(); return { erro: 'Diga qual é o custo em "Outro custo".' }; }
        const nome = tipo === 'Outro custo' ? descricao : tipo;
        if (!e.grupoDes.value) { e.grupoDes.focus(); return { erro: nome + ': selecione o Grupo de Despesa para classificar o custo.' }; }
        const valor = perc ? percentual(e.valorPerc.value) : numero(e.valorReais.value);
        if (valor == null || Number.isNaN(valor) || valor < 0) { (perc ? e.valorPerc : e.valorReais).focus(); return { erro: nome + ': informe o valor (zero significa isento).' }; }
        if (perc && valor > 100) { e.valorPerc.focus(); return { erro: nome + ': o percentual não pode passar de 100%.' }; }
        if (!e.inicio.value) { e.inicio.focus(); return { erro: nome + ': informe o início da vigência.' }; }
        if (e.fim.value && e.fim.value < e.inicio.value) { e.fim.focus(); return { erro: nome + ': o fim da vigência deve ser igual ou posterior ao início.' }; }
        let de = null; let ate = null;
        if (e.faixa.value !== 'sem') {
          de = numero(e.faixaDe.value); ate = numero(e.faixaAte.value);
          if ((de != null && Number.isNaN(de)) || (ate != null && Number.isNaN(ate))) { e.faixaDe.focus(); return { erro: nome + ': faixa de faturamento inválida.' }; }
          if (de == null && ate == null) { e.faixaDe.focus(); return { erro: nome + ': informe o faturamento "a partir de" e/ou "até" da faixa, ou escolha "Sem faixa".' }; }
          if (de != null && ate != null && ate < de) { e.faixaAte.focus(); return { erro: nome + ': o faturamento "até" deve ser maior ou igual ao "a partir de".' }; }
        }
        saida.push({
          id: e.c.id, expenseId: e.grupoDes.value, tipo, descricao: tipo === 'Outro custo' ? descricao : '', cobrado: e.cobrado.value, aplicaA: e.cobrado.value === 'maquina' ? (e.c.aplicaA === 'todas' ? 'todas' : e.c.aplicaA.slice()) : 'todas',
          calculo: e.calculo.value, valor, periodicidade: e.periodo.value, faixa: e.faixa.value, faixaDe: de, faixaAte: ate, faixaMedida: e.faixa.value === 'sem' ? 'mes' : e.medida.value,
          inicio: e.inicio.value, fim: e.fim.value, obs: e.obs.value.trim(),
        });
      }
      // Dois custos do mesmo tipo, com vigência e faixa sobrepostas para as mesmas máquinas, são ambíguos (mesma ideia das taxas das bandeiras).
      const cruza = (a1, a2, b1, b2) => (a1 == null ? -Infinity : a1) <= (b2 == null ? Infinity : b2) && (b1 == null ? -Infinity : b1) <= (a2 == null ? Infinity : a2);
      const mesmasMaquinas = (x, y) => x.cobrado !== y.cobrado ? false : x.cobrado === 'operadora' || x.aplicaA === 'todas' || y.aplicaA === 'todas' || x.aplicaA.some((id) => y.aplicaA.includes(id));
      for (let i = 0; i < saida.length; i++) for (let j = i + 1; j < saida.length; j++) {
        const x = saida[i]; const y = saida[j];
        const mesmoCusto = x.tipo === y.tipo && (x.tipo !== 'Outro custo' || tira(x.descricao) === tira(y.descricao)) && x.periodicidade === y.periodicidade;
        if (!mesmoCusto || !mesmasMaquinas(x, y) || x.faixa !== y.faixa) continue;
        if (cruza(x.inicio, x.fim || '9999-12-31', y.inicio, y.fim || '9999-12-31') && (x.faixa === 'sem' || (x.faixaMedida === y.faixaMedida && cruza(x.faixaDe, x.faixaAte, y.faixaDe, y.faixaAte)))) {
          cartoes[j].valorReais.focus();
          return { erro: (x.tipo === 'Outro custo' ? x.descricao : x.tipo) + ': há dois custos iguais com vigência' + (x.faixa === 'sem' ? '' : ' e faixa de faturamento') + ' sobrepostas. Ajuste as datas ou as faixas.' };
        }
      }
      return saida;
    }
    return { painel, ler, atualizarMaquinas: () => cartoes.forEach((e) => e.pintarAplica()) };
  }

  /**
   * Reparte o formulário em quatro etapas e devolve { lerMaquinas, lerCustos, ir }.
   * form: o formulário já montado; painelTaxas: a seção "Taxas por bandeira"; rotuloCustos: o campo de texto "Custos fixos da operadora" (vai para a etapa 3);
   * acoes: a linha com Salvar e Cancelar; nome: o campo de nome (volta para a etapa 1 quando é recusado); item: a operadora em edição (ou nulo).
   */
  function montar({ form, painelTaxas, rotuloCustos, opcoesDespesa, acoes, nome, item }) {
    const etapa1 = el('div', 'operadora-etapa operadora-etapa-dados');
    [...form.children].filter((c) => c !== painelTaxas && c !== acoes).forEach((c) => etapa1.append(c));
    const maq = painelMaquinas(item);
    const etapa2 = el('div', 'operadora-etapa'); etapa2.append(maq.painel);
    const custos = painelCustos(item, maq.listar, rotuloCustos, opcoesDespesa);
    const etapa3 = el('div', 'operadora-etapa'); etapa3.append(custos.painel);
    const etapa4 = el('div', 'operadora-etapa'); etapa4.append(painelTaxas);
    const etapas = [etapa1, etapa2, etapa3, etapa4];
    let atual = 0;
    const barra = window.CicluzStepper.create({ steps: ETAPAS.map((label) => ({ label })), current: 0, layout: 'wizard', label: 'Etapas do cadastro da operadora', onSelect: (i) => tentar(i) });
    const salvar = acoes.querySelector('button[type="submit"]');
    const cancelar = [...acoes.querySelectorAll('button')].find((b) => b !== salvar);
    const voltar = botao('Voltar', () => ir(atual - 1), 'btn secondary footer-cancel-accent form-back-action');
    const avancar = botao('Avançar', () => tentar(atual + 1), 'btn');
    const erro = el('p', 'profiles-error'); erro.setAttribute('role', 'alert');

    function ir(i) {
      atual = Math.max(0, Math.min(etapas.length - 1, i));
      etapas.forEach((e, k) => { e.hidden = k !== atual; });
      if (atual === 2) custos.atualizarMaquinas();
      barra.set(atual);
      erro.textContent = '';
      // Operadora nova só salva na última etapa; a que já existe salva de qualquer etapa.
      const ultima = atual === etapas.length - 1;
      salvar.hidden = !(ultima || item);
      avancar.hidden = ultima;
      voltar.hidden = atual === 0;
      acoes.replaceChildren(...[voltar, cancelar, avancar, salvar].filter((b) => !b.hidden));
    }
    /** Antes de sair de uma etapa, ela precisa estar certa: nome (1), máquinas (2), custos (3). */
    function tentar(i) {
      if (i <= atual) return ir(i);
      if (atual === 0) { nome.setCustomValidity(''); if (!nome.reportValidity()) return; }
      if (atual <= 1 && i > 1) { const r = maq.ler(); if (r.erro) { ir(1); erro.textContent = r.erro; return; } }
      if (atual <= 2 && i > 2) { const r = custos.ler(); if (r.erro) { ir(2); erro.textContent = r.erro; return; } }
      ir(i);
    }
    // Um campo recusado (nome repetido, em branco…) leva à etapa dele em vez de ficar escondido.
    nome.addEventListener('invalid', () => { if (atual !== 0) ir(0); });

    form.prepend(barra.el);
    form.append(...etapas, erro, acoes);
    ir(0);
    form.irParaEtapa = (i, mensagem) => { ir(i); if (mensagem) erro.textContent = mensagem; };
    return { lerMaquinas: () => maq.ler(), lerCustos: () => custos.ler(), ir };
  }

  window.CicluzOperadoraEtapas = { montar, ETAPAS };
})();
