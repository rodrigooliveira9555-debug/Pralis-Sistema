/*
 * Área ConPlus (laboratório) — aba Eventos: lançamentos variáveis do mês (registro E, 13 colunas). Cada lançamento ganha o SEQ
 * na hora em que é guardado (contador por CNPJ, período e contrato, que só cresce) e fica em cicluz-conplus-v1. O arquivo do período
 * é montado dos lançamentos guardados: reenviar gera as mesmas linhas, com o mesmo SEQ, e o Questor ignora o que já gravou.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI; const L = window.CicluzConplusLayout; const D = window.CicluzConplusDominio; const S = window.CicluzConplusDados; const K = window.CicluzConplusComum;
  if (!U || !L || !D || !S || !K) return;
  const { el, botao } = U;
  const cnpj = L.CNPJ_HOMOLOGACAO;
  let periodoVisto = '';

  function montar(corpo) {
    const cols = L.colunas('E');
    const form = { periodo: '', contrato: '', evento: '', referencia: '', valor: '' };
    const ctl = {};
    const grade = el('div', 'conplus-grade conplus-grade-eventos');
    const COLS = [[2, null], [3, 'periodo'], [4, null], [5, 'contrato'], [6, 'evento'], [7, 'referencia'], [8, 'valor']];
    COLS.forEach(([n, chave]) => {
      const c = cols[n - 1];
      const fixo = n === 2 ? cnpj : n === 4 ? 'gerado ao guardar' : null;
      const x = K.campoColuna(chave ? c : { ...c, fixo: 'valor' }, form[chave], { valorFixo: fixo, aoMudar: (v) => { form[chave] = v; erro.textContent = ''; } });
      if (n === 5) {
        const vs = S.ler().vinculos;
        if (vs.length) { const dl = el('datalist'); dl.id = 'conplus-dl-contratos'; vs.forEach((v) => { const o = el('option'); o.value = v.contrato; o.label = (v.nome || '') + ' · ' + v.cpf; dl.append(o); }); x.no.append(dl); x.input.setAttribute('list', dl.id); }
      }
      if (chave) ctl[chave] = x;
      grade.append(x.no);
    });
    const erro = el('p', 'profiles-error'); erro.setAttribute('role', 'alert');
    const pinta = () => Object.entries(ctl).forEach(([k, x]) => { x.input.value = form[k]; });
    const acoes = el('div', 'conplus-acoes');
    acoes.append(
      botao('Preencher com o modelo da ConPlus', () => { Object.assign(form, { periodo: '2505', contrato: '1', evento: '318', referencia: '5,00', valor: '0,00' }); pinta(); erro.textContent = ''; }, 'btn secondary'),
      botao('Guardar lançamento (gera o SEQ)', () => {
        const dados = { cnpj, ...form };
        const p = D.problemaDoLancamento(dados); if (p) { erro.textContent = p; return; }
        let feito = null;
        const ok = S.mudar((d) => { const r = D.novoLancamento(d.eventos, dados, { id: S.novoId('ev'), agora: S.agoraIso() }); d.eventos = r.estado; feito = r.lancamento; });
        if (!ok) { erro.textContent = 'Não foi possível guardar. Tente de novo.'; return; }
        periodoVisto = feito.periodo;
        U.avisar('Lançamento guardado com SEQ ' + feito.seq + '.');
        Object.assign(form, { evento: '', referencia: '', valor: '' }); pinta(); desenharLista();
      }, 'btn'));
    const novo = U.secao('Novo lançamento');
    novo.append(U.nota('A linha E identifica o empregado pelo código do contrato no Questor (CODIGOFUNCCONTR), não pelo CPF: os contratos ligados na aba Retorno aparecem como sugestão. O SEQ é gerado uma vez, ao guardar, e nunca se repete.'), grade, erro, acoes);

    const lista = U.secao('Lançamentos guardados');
    const arquivo = U.secao('Arquivo do período');
    function desenharLista() {
      const todos = S.ler().eventos.lancamentos.filter((x) => String(x.cnpj).replace(/\D/g, '') === cnpj.replace(/\D/g, ''));
      const periodos = [...new Set(todos.map((x) => x.periodo))].sort((a, b) => Number(b) - Number(a));
      if (!periodos.includes(periodoVisto)) periodoVisto = periodos[0] || '';
      lista.querySelectorAll(':scope > :not(.compras-secao-cab)').forEach((n) => n.remove());
      arquivo.querySelectorAll(':scope > :not(.compras-secao-cab)').forEach((n) => n.remove());
      if (!todos.length) { lista.append(U.vazio('Nenhum lançamento guardado.', 'Guarde um lançamento acima para montar o arquivo de eventos.')); arquivo.append(U.nota('O arquivo aparece aqui quando houver lançamento.')); return; }
      const sel = U.seletor(periodos.map((p) => [p, 'Período ' + p]), periodoVisto);
      sel.addEventListener('change', () => { periodoVisto = sel.value; desenharLista(); });
      const doPeriodo = todos.filter((x) => x.periodo === periodoVisto).sort((a, b) => Number(a.contrato) - Number(b.contrato) || Number(a.seq) - Number(b.seq));
      lista.append(el('div', 'conplus-filtro'));
      lista.lastChild.append(U.campo('Período de cálculo', sel));
      lista.append(U.tabela([
        ['Contrato', (x) => x.contrato], ['SEQ', (x) => x.seq, 'conplus-num'], ['Evento', (x) => x.evento], ['Referência', (x) => x.referencia || '—', 'conplus-num'], ['Valor', (x) => x.valor || '—', 'conplus-num'],
        ['', (x) => botao('Remover', () => remover(x), 'btn ghost conplus-remover')],
      ], doPeriodo, { vazioTexto: 'Nenhum lançamento neste período.' }));
      const linhas = D.montarEventos(doPeriodo, { cnpj });
      const texto = D.juntar(linhas); const r = D.validar(texto);
      const baixar = botao('Baixar .txt do período ' + periodoVisto, () => {
        if (r.erros.length) { U.avisar('Corrija os problemas antes de baixar.'); return; }
        const msg = K.baixar('Eventos ' + periodoVisto + ' ' + K.carimbo() + ' - laboratorio.txt', texto);
        U.avisar(msg || 'Arquivo baixado. Reenviar o mesmo arquivo não grava em dobro: o SEQ é o mesmo.');
      }, 'btn');
      baixar.disabled = r.erros.length > 0;
      const ac = el('div', 'conplus-acoes'); ac.append(baixar);
      arquivo.append(K.conferencia(r), K.previa(linhas), ac);
    }
    function remover(x) {
      U.confirmar('Remover o lançamento', 'Remover o lançamento SEQ ' + x.seq + ' do contrato ' + x.contrato + ' (período ' + x.periodo + ')? O número SEQ não volta a ser usado. Se o arquivo já foi para a ConPlus, o lançamento continua no Questor: a correção é com a ConPlus.', 'Remover', () => {
        const ok = S.mudar((d) => { d.eventos.lancamentos = d.eventos.lancamentos.filter((y) => y.id !== x.id); });
        if (!ok) return 'Não foi possível remover. Tente de novo.';
        desenharLista(); return undefined;
      }, { cor: K.COR, corTexto: K.COR_TEXTO, classe: 'conplus-dialogo-remover' });
    }
    corpo.append(novo, lista, arquivo);
    desenharLista();
  }

  (window.CicluzConplusAbas = window.CicluzConplusAbas || {}).eventos = { titulo: 'Eventos', montar };
})();
