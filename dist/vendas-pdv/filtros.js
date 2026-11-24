/*
 * Vendas dos PDVs — o quadro de Filtros. Enxuto à vista: o período (atalhos e início/fim, cada um com a data no
 * calendário e a hora). O resto (tipo de pagamento, grupo de vendas, turno, situação, produto) fica em "Mais filtros".
 * O PDV não está aqui: ele é escolhido nas abas do topo (um caminho só). Montado uma vez por abertura da tela, para não
 * perder o foco nem o painel aberto; cada mudança chama aoMudar().
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const D = window.CicluzVendasPdvDados;
  const { el, botao, campo, entrada, seletor } = U;
  const { estado } = D;
  let maisAberto = false;

  function montar({ aoMudar, aoEscolherPdv }) {
    const f = estado.filtro;
    const s = U.secao('Filtros');
    const aplicar = () => { estado.pagina = 1; aoMudar(); };

    /* Período: atalhos + início e fim (data no calendário e hora). */
    const ini = U.campoData({ valor: f.dataInicio, rotulo: 'Data inicial' });
    const fim = U.campoData({ valor: f.dataFim, rotulo: 'Data final' });
    const horaIni = U.campoHora({ valor: f.horaInicio, rotulo: 'Hora inicial' });
    const horaFim = U.campoHora({ valor: f.horaFim, rotulo: 'Hora final' });
    const hoje = D.hojeIso();
    const faixas = { hoje: [hoje, hoje], ontem: [D.somarDias(hoje, -1), D.somarDias(hoje, -1)], 7: [D.somarDias(hoje, -6), hoje], mes: [hoje.slice(0, 8) + '01', hoje] };
    const chipDe = () => (f.horaInicio || f.horaFim ? '' : Object.keys(faixas).find((k) => faixas[k][0] === f.dataInicio && faixas[k][1] === f.dataFim) || '');
    const periodo = U.chips([['hoje', 'Hoje'], ['ontem', 'Ontem'], ['7', '7 dias'], ['mes', 'Este mês']], chipDe(), (v) => {
      [f.dataInicio, f.dataFim] = faixas[v];
      f.horaInicio = ''; f.horaFim = '';
      ini.definir(f.dataInicio); fim.definir(f.dataFim); horaIni.input.value = ''; horaFim.input.value = '';
      aplicar();
    });
    const aviso = el('p', 'profiles-error vendas-pdv-aviso');
    aviso.setAttribute('role', 'alert');
    aviso.hidden = true;
    const horaValida = (t) => !t || /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
    const aoMudarPeriodo = () => {
      const [di, df, hi, hf] = [ini.valor(), fim.valor(), horaIni.input.value, horaFim.input.value];
      if (!di || !df || !horaValida(hi) || !horaValida(hf)) return;
      const erro = di + 'T' + (hi || '00:00') > df + 'T' + (hf || '23:59') ? 'O início está depois do fim.' : '';
      aviso.textContent = erro; aviso.hidden = !erro;
      if (erro) return;
      Object.assign(f, { dataInicio: di, dataFim: df, horaInicio: hi, horaFim: hf });
      periodo.atualizar(chipDe());
      aplicar();
    };
    [ini.input, fim.input, horaIni.input, horaFim.input].forEach((i) => i.addEventListener('change', aoMudarPeriodo));
    const ponta = (rotulo, data, hora) => {
      const g = el('div', 'vendas-pdv-ponta');
      g.setAttribute('role', 'group');
      g.setAttribute('aria-label', rotulo);
      g.append(campo(rotulo, data.caixa), campo('Hora', hora.caixa));
      return g;
    };

    /* Mais filtros. */
    const grupos = D.gruposDeVendas();
    const forma = seletor(estado.opcoes.formasPagamento.map((x) => [x.id, x.nome]), f.formaPagamentoId, 'Todos');
    const grupo = seletor(grupos.map((g) => [g.id, g.nome + ' · ' + g.computador + ' · ' + g.inicio + '–' + g.fim]), f.grupoId, grupos.length ? 'Todos' : 'Sem grupos com computador');
    grupo.disabled = !grupos.length;
    const turno = seletor(estado.opcoes.turnos.filter((t) => t.ativo).map((t) => [t.id, t.nome + ' (' + t.horaInicio.slice(0, 5) + '–' + t.horaFim.slice(0, 5) + ')']), f.turnoId, 'Todos');
    const status = seletor([['aprovado', 'Aprovadas'], ['aguardando_aprovacao', 'Aguardando aprovação'], ['cancelado', 'Canceladas']], f.status, 'Todas');
    const produto = entrada('text', f.produto, { placeholder: 'Nome do produto' });
    const avisoGrupo = el('p', 'profiles-note vendas-pdv-aviso');
    avisoGrupo.hidden = true;
    forma.onchange = () => { f.formaPagamentoId = forma.value; aplicar(); };
    turno.onchange = () => { f.turnoId = turno.value; aplicar(); };
    status.onchange = () => { f.status = status.value; aplicar(); };
    let espera = null;
    produto.oninput = () => { clearTimeout(espera); espera = setTimeout(() => { f.produto = produto.value.trim(); aplicar(); }, 500); };
    // O grupo de vendas é o turno de um PDV: escolhe a aba do PDV e aplica a janela de horário em cada dia.
    grupo.onchange = () => {
      const g = grupos.find((x) => x.id === grupo.value);
      f.grupoId = grupo.value;
      f.janelaInicio = g ? g.inicio : ''; f.janelaFim = g ? g.fim : '';
      avisoGrupo.hidden = !(g && !g.pdv);
      if (g && !g.pdv) avisoGrupo.textContent = 'O computador ' + g.computador + ' não existe no Sistema Pralis: vale só o horário do grupo, em todos os PDVs.';
      if (g && g.pdv) { aoEscolherPdv(g.pdv.id); return; }
      aplicar();
    };
    const extras = el('div', 'vendas-pdv-mais');
    extras.id = 'vendas-pdv-mais-filtros';
    extras.hidden = !maisAberto;
    extras.append(
      el('div', 'vendas-pdv-campos'),
      avisoGrupo,
    );
    extras.firstChild.append(campo('Tipo de pagamento', forma), campo('Grupo de vendas', grupo), campo('Turno', turno), campo('Situação', status), campo('Produto', produto));
    const quantos = () => ['formaPagamentoId', 'grupoId', 'turnoId', 'status', 'produto'].filter((k) => f[k]).length;
    const mais = botao('', () => { maisAberto = !maisAberto; extras.hidden = !maisAberto; rotular(); }, 'btn secondary vendas-pdv-mais-botao');
    mais.setAttribute('aria-controls', extras.id);
    const rotular = () => { const n = quantos(); mais.textContent = (maisAberto ? 'Menos filtros' : 'Mais filtros') + (n ? ' (' + n + ')' : ''); mais.setAttribute('aria-expanded', String(maisAberto)); };
    rotular();
    const limpar = botao('Limpar filtros', () => { D.reiniciarFiltro(); aoMudar({ remontar: true }); }, 'btn ghost');

    const linha = el('div', 'vendas-pdv-periodo');
    linha.append(periodo, ponta('Início', ini, horaIni), ponta('Fim', fim, horaFim));
    const acoes = el('div', 'vendas-pdv-acoes');
    acoes.append(mais, limpar);
    const c = el('div', 'compras-corpo');
    c.append(linha, aviso, acoes, extras);
    s.append(c, ini.painel, fim.painel, horaIni.painel, horaFim.painel);
    return s;
  }

  window.CicluzVendasPdvFiltros = { montar };
})();
