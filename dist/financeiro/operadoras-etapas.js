/*
 * Cadastro de operadora de cartão em três etapas (VND - Tipos de Operadoras Cartões), 25/11/2026, pedido do Rodrigo:
 *   1 Dados da operadora (nome, identificador, documento, situação) · 2 Máquinas (uma ou mais) · 3 Taxas das bandeiras (e custos fixos).
 * Usa a barra de etapas do sistema (CicluzStepper, layout wizard). O formulário de groups.js monta os campos de sempre; aqui eles só são
 * repartidos em etapas — nada de campo ou regra de taxa mudou. As máquinas moram dentro da operadora (item.maquinas, só neste aparelho):
 * [{ id, apelido, modelo, serie, ativa }]. Operadora antiga sem esse campo abre com a lista vazia; nada é apagado. Máquina já salva
 * não se exclui (turnos e fechamentos podem citá-la): inativa-se. Só a que ainda não foi salva tem o botão de remover.
 */
(function () {
  'use strict';
  const ETAPAS = ['Dados da operadora', 'Máquinas', 'Taxas das bandeiras'];
  const novoId = () => (crypto.randomUUID ? crypto.randomUUID() : 'mq-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
  const tira = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR').trim();
  const botao = (texto, acao, cls) => { const b = document.createElement('button'); b.type = 'button'; b.className = cls || 'btn secondary'; b.textContent = texto; b.onclick = acao; return b; };

  /** Painel "Máquinas": lista editável. Devolve { painel, ler }. ler() devolve a lista pronta ou { erro } com a mensagem. */
  function painelMaquinas(item) {
    const painel = document.createElement('section');
    painel.className = 'operator-fees operator-machines';
    const titulo = document.createElement('h3'); titulo.textContent = 'Máquinas de cartão';
    const ajuda = document.createElement('p');
    ajuda.textContent = 'Cadastre uma ou mais máquinas desta operadora: o apelido que você reconhece, o modelo e o número de série. Máquina já salva não é excluída: use Inativa para tirá-la de uso.';
    const lista = document.createElement('div');
    const vazia = document.createElement('p'); vazia.className = 'profiles-note'; vazia.textContent = 'Nenhuma máquina cadastrada. Use "+ Adicionar máquina".';
    const linhas = [];
    const salvas = new Set(((item && item.maquinas) || []).map((m) => m.id));

    function campo(rotulo, valor, extra = {}) {
      const l = document.createElement('label'); l.textContent = rotulo;
      const i = document.createElement('input'); i.type = 'text'; i.value = valor || ''; i.maxLength = extra.max || 60; i.autocomplete = 'off';
      if (extra.placeholder) i.placeholder = extra.placeholder;
      i.setAttribute('aria-label', rotulo);
      l.append(i);
      return { l, i };
    }
    function adicionar(dados = {}) {
      const linha = document.createElement('div'); linha.className = 'operator-fee-rule operator-machine';
      const id = dados.id || novoId();
      const apelido = campo('Apelido da máquina *', dados.apelido, { placeholder: 'Ex.: Moderninha do balcão' });
      const modelo = campo('Modelo', dados.modelo, { placeholder: 'Ex.: PagBank Moderninha' });
      const serie = campo('Número de série', dados.serie, { max: 40 });
      let ativa = dados.ativa !== false;
      const quadro = document.createElement('div'); quadro.className = 'account-status';
      const tit = document.createElement('span'); tit.textContent = 'Situação da máquina';
      const row = document.createElement('div'); row.className = 'account-status-row';
      const chave = document.createElement('button'); chave.type = 'button'; chave.className = 'account-status-switch'; chave.setAttribute('role', 'switch'); chave.setAttribute('aria-label', 'Máquina ativa ou inativa'); chave.append(document.createElement('span'));
      const txt = document.createElement('span'); txt.className = 'account-status-text';
      const pintar = () => { chave.setAttribute('aria-checked', String(ativa)); txt.textContent = ativa ? 'Ativa' : 'Inativa'; linha.classList.toggle('inativo', !ativa); };
      chave.onclick = () => { ativa = !ativa; pintar(); };
      pintar();
      row.append(chave, txt); quadro.append(tit, row);
      linha.append(apelido.l, modelo.l, serie.l, quadro);
      const entrada = { id, apelido: apelido.i, modelo: modelo.i, serie: serie.i, ativa: () => ativa, linha };
      if (!salvas.has(id)) {
        linha.append(botao('− Remover máquina', () => { linha.remove(); linhas.splice(linhas.indexOf(entrada), 1); atualizar(); }, 'btn fee-action'));
      }
      linhas.push(entrada); lista.append(linha); atualizar();
      return entrada;
    }
    function atualizar() { vazia.hidden = linhas.length > 0; }
    const novo = botao('+ Adicionar máquina', () => { const e = adicionar(); e.apelido.focus(); }, 'btn fee-action');
    ((item && item.maquinas) || []).forEach((m) => adicionar(m));
    painel.append(titulo, ajuda, lista, vazia, novo);
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
    return { painel, ler };
  }

  /**
   * Reparte o formulário em três etapas e devolve { lerMaquinas, ir }.
   * form: o formulário já montado; painelTaxas: a seção "Taxas por bandeira" (com os custos fixos); acoes: a linha com Salvar e Cancelar;
   * nome: o campo de nome (volta para a etapa 1 quando ele é recusado); item: a operadora em edição (ou nulo).
   */
  function montar({ form, painelTaxas, acoes, nome, item }) {
    const etapa1 = document.createElement('div'); etapa1.className = 'operadora-etapa operadora-etapa-dados';
    [...form.children].filter((c) => c !== painelTaxas && c !== acoes).forEach((c) => etapa1.append(c));
    const maq = painelMaquinas(item);
    const etapa2 = document.createElement('div'); etapa2.className = 'operadora-etapa'; etapa2.append(maq.painel);
    const etapa3 = document.createElement('div'); etapa3.className = 'operadora-etapa'; etapa3.append(painelTaxas);
    const etapas = [etapa1, etapa2, etapa3];
    let atual = 0;
    const barra = window.CicluzStepper.create({ steps: ETAPAS.map((label) => ({ label })), current: 0, layout: 'wizard', label: 'Etapas do cadastro da operadora', onSelect: (i) => tentar(i) });
    const salvar = acoes.querySelector('button[type="submit"]');
    const cancelar = [...acoes.querySelectorAll('button')].find((b) => b !== salvar);
    const voltar = botao('Voltar', () => ir(atual - 1), 'btn secondary footer-cancel-accent form-back-action');
    const avancar = botao('Avançar', () => tentar(atual + 1), 'btn');
    const erro = document.createElement('p'); erro.className = 'profiles-error'; erro.setAttribute('role', 'alert');

    function ir(i) {
      atual = Math.max(0, Math.min(etapas.length - 1, i));
      etapas.forEach((e, k) => { e.hidden = k !== atual; });
      barra.set(atual);
      erro.textContent = '';
      // Operadora nova só salva na última etapa; a que já existe salva de qualquer etapa.
      const ultima = atual === etapas.length - 1;
      salvar.hidden = !(ultima || item);
      avancar.hidden = ultima;
      voltar.hidden = atual === 0;
      acoes.replaceChildren(...[voltar, cancelar, avancar, salvar].filter((b) => !b.hidden));
    }
    /** Antes de sair da etapa 1 o nome precisa estar certo; ao sair da 2 as máquinas precisam estar completas. */
    function tentar(i) {
      if (i <= atual) return ir(i);
      if (atual === 0 && i > 0) { nome.setCustomValidity(''); if (!nome.reportValidity()) return; }
      if (atual <= 1 && i > 1) { const r = maq.ler(); if (r.erro) { ir(1); erro.textContent = r.erro; return; } }
      ir(i);
    }
    // Um campo recusado (nome repetido, em branco…) leva à etapa dele em vez de ficar escondido.
    nome.addEventListener('invalid', () => { if (atual !== 0) ir(0); });

    form.prepend(barra.el);
    form.append(...etapas, erro, acoes);
    ir(0);
    form.irParaEtapa = (i, mensagem) => { ir(i); if (mensagem) erro.textContent = mensagem; };
    return { lerMaquinas: () => maq.ler(), ir };
  }

  window.CicluzOperadoraEtapas = { montar, ETAPAS };
})();
