/*
 * Transferências › Lançamentos › CNT - Transferências (25/11/2026, pedido do Washington): o formulário "Nova Transferência" do sistema principal
 * (OperacaoTransferenciaForm.vue, PROJECT_BRAIN/19 do principal: R-031, R-035, R-127, R-188, R-231), no padrão das telas do site (peças de
 * compras/ui.js: janela na cor da origem, quadros com o título na borda, campos com o rótulo na borda, interruptor Sim/Não, campo de data e de hora).
 *
 * TELA EM CONSTRUÇÃO: o CICLUZ ainda não tem servidor de transferências, então o Salvar só CONFERE o preenchimento (as mesmas mensagens do principal)
 * e avisa que não gravou. Ficam para depois, e dependem de decisão e de banco (migration a autorizar): gravar a transferência, saldo da conta de origem,
 * contas vinculadas ao usuário, PDV com caixa aberto, confirmação de recebimento pelo destinatário, lacre já usado, lacres de retorno e sangria.
 * As contas vêm de /api/contas (ativas); sem a regra de "contas candidatas" do principal, o destino lista todas menos a origem (provisório).
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI; const R = window.CicluzLancamentosRegras; const D = window.CicluzComprasDominio; const Sync = window.CicluzSync;
  if (!U || !R || !D || !Sync) return;
  const { el, botao, campo, entrada, seletor } = U;

  const CAMINHO = 'Transferências · Contas / Locais / Lançamentos / CNT - Transferências';
  const COR_TEXTO = '#9a3412';
  const TEMPOS = [['5min', '5 minutos'], ['10min', '10 minutos'], ['30min', '30 minutos'], ['1h', '1 hora'], ['1dia', '1 dia'], ['10dias', '10 dias'], ['30dias', '30 dias']];
  const cor = () => (typeof menuColor !== 'undefined' && menuColor[1]) || '#f97316';
  const quadro = (titulo, ...filhos) => { const f = el('fieldset', 'compras-fieldset'); f.append(el('legend', null, titulo), ...filhos); return f; };
  const largo = (no) => { no.classList.add('compras-largo'); return no; };
  const centavos = (txt) => { const v = R.dinheiroParaApi(txt); return v === null ? null : R.paraCentavos(v); };
  const reais = (c) => D.moeda(c / 100);

  // Data e hora no padrão do site, com o rótulo e o painel dentro do campo.
  function campoDeData(rotulo, valor = '') {
    const d = U.campoData({ rotulo, valor });
    d.no = el('div', 'compras-campo compras-data'); d.no.append(el('span', 'compras-rotulo', rotulo), d.caixa, d.painel);
    return d;
  }
  function campoDeHora(rotulo) {
    const h = U.campoHora({ rotulo });
    h.no = el('div', 'compras-campo'); h.no.append(el('span', 'compras-rotulo', rotulo), h.caixa, h.painel);
    return h;
  }

  async function abrir() {
    let contas;
    try { const r = await Sync.api('/contas'); contas = r.contas.filter((c) => c.situacao === 'ATIVA').map((c) => c.nome); } catch (e) { return U.avisar((e && e.message) || 'Não foi possível carregar as contas.'); }
    formulario(contas);
  }

  function formulario(contas) {
    const estado = { sem: false, agendamento: false, multiplo: false, tempo: false, valoresVisiveis: true };
    U.dialogo({
      titulo: 'Nova Transferência', subtitulo: CAMINHO, largo: true, classe: 'compras-form-padrao', cor: cor(), corTexto: COR_TEXTO, rotuloSalvar: 'Salvar',
      montar: (form, dlg) => {
        /* Campos */
        const origem = seletor(contas.map((n) => [n, n]), '', '—');
        const destino = seletor([], '', '—');
        const destinosLista = el('div', 'compras-largo'); destinosLista.setAttribute('role', 'group'); destinosLista.setAttribute('aria-label', 'Destino / Entrada: contas candidatas');
        const marcados = new Set();
        const fisico = entrada('text', '', { inputMode: 'decimal', placeholder: '0,00' });
        const moedas = entrada('text', '', { inputMode: 'decimal', placeholder: '0,00' });
        const total = entrada('text', '', { readOnly: true });
        const saida = entrada('text', '', { readOnly: true }); saida.classList.add('campo-valor');
        const lacre = entrada('text', '', { placeholder: 'Ex.: 001', maxLength: 100 });
        const dataTransf = campoDeData('Data da transferência *', R.diaNegocio(new Date()));
        const dataAgend = campoDeData('Data do agendamento *'); const horaAgend = campoDeHora('Hora do agendamento');
        const tempo = seletor(TEMPOS, '5min');
        const obs = entrada('text', '', { placeholder: 'Ex.: Suprimento CX1 — reforço de troco', maxLength: 500 });

        /* Resumo no topo: o que isto faz com o dinheiro (com o olho que esconde o valor) */
        const olho = el('button', 'shortcut-circle compras-redondo'); olho.type = 'button';
        const pintarOlho = () => { olho.title = estado.valoresVisiveis ? 'Ocultar valores' : 'Mostrar valores'; olho.setAttribute('aria-label', olho.title); olho.setAttribute('aria-pressed', String(!estado.valoresVisiveis));
          olho.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>' + (estado.valoresVisiveis ? '' : '<path d="M4 4l16 16"/>') + '</svg>'; };
        const caixaSaida = el('div', 'compras-aniv-campo'); caixaSaida.append(saida, olho);
        const campoSaida = el('div', 'compras-campo'); campoSaida.append(el('span', 'compras-rotulo', 'Saída (−)'), caixaSaida);

        /* Origem e destino */
        const nota = largo(U.nota('Tela em construção: a transferência ainda não é gravada. O Salvar confere o preenchimento.'));
        const q1 = quadro('1 · Origem e destino');
        const campoOrigem = campo('Origem / Saída *', origem); const campoDestino = campo('Destino / Entrada *', destino);
        const campoDestinos = el('div', 'compras-campo compras-largo'); campoDestinos.append(el('span', 'compras-rotulo', 'Destino / Entrada *'), destinosLista);
        q1.append(campoOrigem, campoDestino, campoDestinos);
        if (!contas.length) q1.append(largo(el('p', 'profiles-error', 'Nenhuma conta ativa cadastrada. Cadastre as contas em Transferências › Cadastros Geral.')));
        const candidatas = () => contas.filter((n) => n !== origem.value);
        function desenharDestinos() {
          const lista = candidatas();
          const atual = destino.value;
          destino.replaceChildren(new Option('—', ''), ...lista.map((n) => new Option(n, n))); destino.value = lista.includes(atual) ? atual : '';
          [...marcados].forEach((n) => { if (!lista.includes(n)) marcados.delete(n); });
          destinosLista.replaceChildren(...lista.map((n) => { const i = U.interruptor(n, marcados.has(n)); i.input.addEventListener('change', () => { if (i.input.checked) marcados.add(n); else marcados.delete(n); }); return i; }));
        }
        origem.addEventListener('change', desenharDestinos);

        /* Valor transferido */
        const recalcular = () => {
          const f = centavos(fisico.value); const m = centavos(moedas.value);
          const soma = (f || 0) + (m || 0);
          total.value = estado.valoresVisiveis ? reais(soma) : 'R$ ••••';
          saida.value = estado.valoresVisiveis ? reais(soma) : 'R$ ••••';
        };
        olho.onclick = () => { estado.valoresVisiveis = !estado.valoresVisiveis; pintarOlho(); recalcular(); };
        [fisico, moedas].forEach((i) => i.addEventListener('input', recalcular));
        const q2 = quadro('2 · Valor transferido', largo(U.nota('Informe o dinheiro físico e as moedas transferidos. O total é a soma dos dois.')), campo('Dinheiro físico', fisico), campo('Moedas', moedas), largo(campo('Total da transferência', total)));

        /* Lacres (some inteira quando é transferência sem lacre, R-231) */
        const q3 = quadro('3 · Lacres', largo(campo('Lacre do malote *', lacre, 'Identifica o malote que será entregue ao Caixa.')));

        /* Opções */
        const sw = (titulo, chave, dica) => { const q = U.quadroSituacao(titulo, false, { textos: ['Sim', 'Não'], dica, aoMudar: (v) => { estado[chave] = v; atualizar(); } }); return largo(q); };
        const swSem = sw('Transferência sem lacre', 'sem');
        const avisoSem = largo(el('p', 'profiles-note', 'Vai sem malote e sem lacre. Para PDV, o operador confirma o recebimento no Caixa; para outra conta, entra direto.'));
        const swAgend = sw('Agendamento', 'agendamento');
        const swMulti = sw('Múltiplo destino', 'multiplo');
        const swTempo = sw('Tempo de confirmação', 'tempo');
        const campoTempo = campo('Tempo de confirmação', tempo);
        const q4 = quadro('Opções', swSem, avisoSem, swAgend, dataAgend.no, horaAgend.no, swMulti, swTempo, campoTempo);
        const chaveDe = (q) => q.querySelector('button.account-status-switch');
        function atualizar() {
          const com = !estado.sem; // R-231: sem lacre não é malote, não tem agendamento, múltiplo destino nem tempo de confirmação
          q3.style.display = com ? '' : 'none'; avisoSem.style.display = estado.sem ? '' : 'none';
          [swAgend, swMulti, swTempo].forEach((q) => { q.style.display = com ? '' : 'none'; });
          dataAgend.no.style.display = com && estado.agendamento ? '' : 'none'; horaAgend.no.style.display = com && estado.agendamento ? '' : 'none';
          campoTempo.style.display = com && estado.tempo ? '' : 'none';
          const multi = com && estado.multiplo;
          campoDestino.style.display = multi ? 'none' : ''; campoDestinos.style.display = multi ? '' : 'none';
          // R-188/R-035: Múltiplo destino e Tempo de confirmação não andam juntos.
          chaveDe(swMulti).disabled = estado.tempo; chaveDe(swTempo).disabled = estado.multiplo;
        }
        pintarOlho(); desenharDestinos(); recalcular(); atualizar();

        form.append(nota, quadro('Data', dataTransf.no), quadro('Resumo', campoSaida), q1, q2, q3, q4, quadro('Observação', largo(campo('Observação', obs))), largo(el('p', 'profiles-note', 'Recebimento: aguardando confirmação do destinatário')));
        // "Salvar e criar nova": ao lado do Salvar, como no principal (por ora só confere, como o Salvar).
        setTimeout(() => {
          const acoes = dlg.querySelector('.compras-dialog-acoes'); const salvarBtn = acoes && acoes.querySelector('button[type=submit]');
          if (salvarBtn) salvarBtn.before(botao('Salvar e criar nova', () => form.requestSubmit(), 'btn secondary'));
        }, 0);
        return { dataTransf, origem, destino, marcados, fisico, moedas, lacre, dataAgend, estado };
      },
      salvar: async (c) => {
        const e = c.estado;
        if (!c.dataTransf.valor()) return c.dataTransf.input.value ? 'Data da transferência inválida. Use DD/MM/AA.' : 'Informe a data da transferência.';
        // As mesmas mensagens do principal (useTransferenciaFormulario.ts).
        if (!c.origem.value || (!e.sem && e.multiplo ? !c.marcados.size : !c.destino.value)) return 'Escolha a origem e o destino.';
        const f = centavos(c.fisico.value); const m = centavos(c.moedas.value);
        if ((c.fisico.value.trim() && f === null) || (c.moedas.value.trim() && m === null)) return 'Valor em formato inválido. Use 1.234,56 (no máximo 2 casas).';
        if ((f || 0) + (m || 0) <= 0) return 'Informe o dinheiro físico ou as moedas.';
        if (!e.sem && !c.lacre.value.trim()) return 'Informe o lacre do malote.';
        if (!e.sem && e.agendamento && !c.dataAgend.valor()) return 'Informe a data do agendamento.';
        return 'Conferido, mas NÃO gravado: a gravação das transferências ainda está em construção.';
      },
    });
  }

  window.CicluzTransferencias = { abrir };
})();
