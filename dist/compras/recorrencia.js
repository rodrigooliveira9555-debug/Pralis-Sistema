/*
 * Fornecedor — campo "Tipo de recorrência" e painel "Recorrência personalizada" (16/11/2026).
 * Inspirado na repetição do Calendário e dos Lembretes: um seletor compacto com a opção marcada, e, em "Personalizado",
 * um painel com "Repetir a cada", dias da semana, repetição mensal, término e um resumo que acompanha as escolhas.
 * Só descreve a recorrência (dados em D.validarRecorrenciaPersonalizada); não gera pagamento nem lançamento.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI; const D = window.CicluzComprasDominio;
  if (!U || !D) return;
  const { el, botao, entrada, seletor } = U;
  const SVG = (d) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>';
  const CHECK = '<path d="m5 12.5 4.5 4.5L19 7.5"/>'; const CHEV = '<path d="m6 9 6 6 6-6"/>'; const LAPIS = '<path d="m4 20 4-.8L19 8l-3-3L5 16zM14.5 6.5l3 3"/>';
  const nomeDe = (lista, id) => (lista.find(([x]) => x === id) || [])[1] || '';

  /** Painel "Recorrência personalizada". atual: a configuração já salva (ou null). aoSalvar(cfg) recebe a nova. */
  function abrirPersonalizada({ atual, cores, aoSalvar, aoFechar }) {
    const base = atual || { intervalo: 1, unidade: 'dia', diasSemana: [], mensal: { modo: 'dia', dia: null, posicao: '1', diaSemana: 1 }, termina: { tipo: 'nunca' } };
    U.dialogo({
      titulo: 'Recorrência personalizada', ...cores, rotuloSalvar: 'Salvar recorrência', classe: 'compras-recorr-dialogo', aoFechar,
      montar: (form) => {
        const rotulo = (t) => el('span', 'compras-rotulo', t);
        const bloco = (t, ...filhos) => { const b = el('div', 'compras-campo compras-largo'); b.append(rotulo(t), ...filhos); return b; };
        // Repetir a cada [N] [unidade]
        const cada = seletor(Array.from({ length: 99 }, (_, i) => [String(i + 1), String(i + 1)]), String(Math.min(base.intervalo || 1, 99)));
        if ((base.intervalo || 1) > 99) cada.add(new Option(String(base.intervalo), String(base.intervalo)), 0), cada.value = String(base.intervalo);
        cada.setAttribute('aria-label', 'Repetir a cada (quantidade)');
        const unidade = seletor(D.UNIDADES_REPETICAO, base.unidade || 'dia');
        unidade.setAttribute('aria-label', 'Repetir a cada (unidade)');
        const linhaCada = el('div', 'compras-recorr-linha'); linhaCada.append(cada, unidade);
        // Dias da semana (unidade Semana)
        const dias = new Set(base.diasSemana || []);
        const chips = el('div', 'compras-chips compras-recorr-dias'); chips.setAttribute('role', 'group'); chips.setAttribute('aria-label', 'Repetir nos dias');
        const desenharDias = () => chips.replaceChildren(...D.DIAS_SEMANA.map((t, i) => {
          const b = botao(t, () => { if (dias.has(i)) dias.delete(i); else dias.add(i); desenharDias(); pintar(); }, 'compras-chip' + (dias.has(i) ? ' ativo' : ''));
          b.setAttribute('aria-pressed', String(dias.has(i)));
          return b;
        }));
        desenharDias();
        const blocoDias = bloco('Repetir nos dias', chips);
        // Repetição mensal (unidade Mês)
        const m0 = base.mensal || {};
        const modo = seletor([['dia', 'Dia do mês'], ['posicao', 'Dia da semana']], m0.modo || 'dia');
        modo.setAttribute('aria-label', 'Repetir no mês por');
        const diaMes = seletor(Array.from({ length: 31 }, (_, i) => [String(i + 1), String(i + 1)]), m0.dia ? String(m0.dia) : '', 'Selecionar dia');
        diaMes.setAttribute('aria-label', 'Dia do mês');
        const posicao = seletor(D.POSICOES_MES, String(m0.posicao || '1'));
        posicao.setAttribute('aria-label', 'Posição do dia na semana');
        const diaSem = seletor(D.DIAS_SEMANA_LONGOS.map((t, i) => [String(i), t]), String(m0.diaSemana != null ? m0.diaSemana : 1));
        diaSem.setAttribute('aria-label', 'Dia da semana');
        const linhaMes = el('div', 'compras-recorr-linha'); linhaMes.append(diaMes, posicao, diaSem);
        const blocoMes = bloco('Repetir em', modo, linhaMes);
        // Término
        const t0 = base.termina || { tipo: 'nunca' };
        const termina = seletor([['nunca', 'Nunca'], ['data', 'Em uma data'], ['ocorrencias', 'Após X ocorrências']], t0.tipo);
        termina.setAttribute('aria-label', 'Termina');
        const data = entrada('date', t0.data || ''); data.setAttribute('aria-label', 'Data de término');
        const vezes = entrada('text', t0.ocorrencias != null ? String(t0.ocorrencias) : '', { inputMode: 'numeric', maxLength: 4, placeholder: 'Quantidade' });
        vezes.setAttribute('aria-label', 'Quantidade de ocorrências');
        vezes.addEventListener('input', () => { vezes.value = vezes.value.replace(/\D/g, ''); pintar(); });
        // O seletor de data cria o campo DD/MM/AA ao lado do input: o conjunto some e aparece junto.
        const dataBox = el('div'); dataBox.append(data);
        const linhaFim = el('div', 'compras-recorr-linha'); linhaFim.append(termina, dataBox, vezes);
        const blocoFim = bloco('Termina', linhaFim);
        const resumo = el('p', 'compras-recorr-resumo'); resumo.setAttribute('role', 'status'); resumo.setAttribute('aria-live', 'polite');
        const mostrar = (no, sim) => { no.style.display = sim ? '' : 'none'; };
        const ler = () => {
          const u = unidade.value;
          const cfg = { intervalo: Number(cada.value), unidade: u, termina: { tipo: termina.value } };
          if (u === 'semana') cfg.diasSemana = [...dias].sort((a, b) => a - b);
          if (u === 'mes') cfg.mensal = modo.value === 'dia' ? { modo: 'dia', dia: diaMes.value ? Number(diaMes.value) : null } : { modo: 'posicao', posicao: posicao.value, diaSemana: Number(diaSem.value) };
          if (termina.value === 'data') cfg.termina.data = data.value;
          if (termina.value === 'ocorrencias') cfg.termina.ocorrencias = vezes.value ? Number(vezes.value) : null;
          return cfg;
        };
        function pintar() {
          const u = unidade.value;
          mostrar(blocoDias, u === 'semana'); mostrar(blocoMes, u === 'mes');
          mostrar(diaMes, modo.value === 'dia'); mostrar(posicao, modo.value === 'posicao'); mostrar(diaSem, modo.value === 'posicao');
          mostrar(dataBox, termina.value === 'data'); mostrar(vezes, termina.value === 'ocorrencias');
          const cfg = ler(); const falta = D.validarRecorrenciaPersonalizada(cfg);
          resumo.textContent = falta ? 'Resumo: ' + falta : D.resumoRecorrenciaPersonalizada(cfg);
          resumo.classList.toggle('pendente', Boolean(falta));
        }
        [cada, unidade, modo, diaMes, posicao, diaSem, termina, data].forEach((c) => c.addEventListener('change', pintar));
        form.append(bloco('Repetir a cada', linhaCada), blocoDias, blocoMes, blocoFim, resumo);
        pintar();
        return { ler, data };
      },
      salvar: (c) => {
        const cfg = c.ler();
        if (cfg.termina.tipo === 'data' && !c.data.checkValidity()) return 'Confira a data de término: use DD/MM/AA.';
        const falta = D.validarRecorrenciaPersonalizada(cfg);
        if (falta) return falta;
        aoSalvar(cfg);
      },
    });
  }

  /**
   * O campo: botão compacto com a opção marcada (abre a lista de opções com ✓), e, em Personalizado, o resumo da
   * configuração com o lápis para reabrir o painel. valor/personalizada: o que está gravado. aoMudar() avisa a tela.
   */
  function criar({ valor, personalizada, cores, aoMudar, opcoes = D.RECORRENCIAS_CONTRATO }) {
    let atual = valor || ''; let pers = personalizada || null;
    const no = el('div', 'compras-campo compras-largo compras-recorr');
    const gatilho = el('button', 'compras-escolha-gatilho'); gatilho.type = 'button';
    const texto = el('span', 'compras-escolha-texto'); const seta = el('span', 'compras-escolha-seta'); seta.innerHTML = SVG(CHEV);
    gatilho.append(texto, seta);
    gatilho.setAttribute('aria-label', 'Tipo de recorrência');
    const painel = el('div', 'compras-escolha-painel'); painel.setAttribute('role', 'listbox'); painel.setAttribute('aria-label', 'Tipo de recorrência');
    const abrir = U.flutuante(gatilho, painel);
    const linhaPers = el('div', 'compras-recorr-pers');
    const resumoPers = el('span', 'compras-recorr-pers-texto');
    const lapis = el('button', 'shortcut-circle compras-redondo'); lapis.type = 'button'; lapis.title = 'Editar recorrência personalizada'; lapis.setAttribute('aria-label', 'Editar recorrência personalizada');
    lapis.innerHTML = SVG(LAPIS);
    linhaPers.append(resumoPers, lapis);
    const pintar = () => {
      // Valor antigo que não está na lista continua aparecendo (não some sem a pessoa mexer).
      texto.textContent = atual ? (nomeDe(opcoes, atual) || atual) : 'Selecionar';
      texto.classList.toggle('vazio', !atual);
      painel.replaceChildren(...opcoes.map(([id, nomeOpcao]) => {
        const b = el('button', 'compras-escolha-opcao' + (id === atual ? ' ativo' : '')); b.type = 'button';
        b.setAttribute('role', 'option'); b.setAttribute('aria-selected', String(id === atual));
        const t = el('span', null, nomeOpcao); const c = el('span', 'compras-escolha-check'); c.innerHTML = id === atual ? SVG(CHECK) : '';
        b.append(t, c);
        b.onclick = () => escolher(id);
        return b;
      }));
      const mostraPers = atual === 'personalizado' && pers;
      linhaPers.style.display = mostraPers ? '' : 'none';
      resumoPers.textContent = mostraPers ? 'Personalizado — ' + D.resumoRecorrenciaPersonalizada(pers) : '';
    };
    const abrirPainelPers = (anterior) => abrirPersonalizada({
      atual: pers, cores,
      aoSalvar: (cfg) => { pers = cfg; atual = 'personalizado'; pintar(); if (aoMudar) aoMudar(); },
      // Cancelar sem nada salvo volta para a opção de antes.
      aoFechar: () => { if (atual === 'personalizado' && !pers) { atual = anterior; pintar(); if (aoMudar) aoMudar(); } },
    });
    function escolher(id) {
      abrir(false); gatilho.focus();
      const anterior = atual;
      if (id === 'personalizado') { atual = 'personalizado'; pintar(); abrirPainelPers(anterior === 'personalizado' ? (pers ? 'personalizado' : '') : anterior); return; }
      atual = id; pintar(); if (aoMudar) aoMudar();
    }
    gatilho.addEventListener('click', () => abrir(painel.hidden));
    lapis.onclick = () => abrirPainelPers('personalizado');
    no.append(el('span', 'compras-rotulo', 'Tipo de recorrência'), gatilho, painel, linhaPers);
    pintar();
    return { no, ler: () => ({ recorrencia: atual, recorrenciaPersonalizada: atual === 'personalizado' ? pers : (pers || null) }), atual: () => atual };
  }

  window.CicluzComprasRecorrencia = { criar, abrirPersonalizada };
})();
