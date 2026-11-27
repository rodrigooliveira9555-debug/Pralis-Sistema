/*
 * Caixa — Tesouraria: painel de transferências (casca). Base no principal: TesourariaCockpit, TransferenciasLista,
 * TransferenciasFiltros, TransferenciasRelatorioDetalhe, SituacaoMalote e LacresBotao (Caixa-Brain/12).
 * Colunas: Lançamento · Movimento / rota · Valor total · Lacres · Situação. Filtros: Status, Data inicial/final, PDV e, em
 * "Mais filtros", Lançado por, Conta de origem, Conta de destino e Lacre (procura em abertura, bolsas e fechamento), com chips
 * dos filtros aplicados e "Limpar tudo". Mais recente primeiro, 10 por página. Situação sempre com ícone + palavra (nunca só cor).
 * O número do lacre ainda lacrado só aparece a quem confere transferências (aqui todos os perfis com acesso conferem).
 * Adaptação da casca: "Agendada" não existe aqui (sem agendamento). Dados FICTÍCIOS, em centavos, só em memória.
 * Filtros, detalhe e lista de lacres em formulário linha por linha (padrão da Nova Transferência): grupo com título, quadro de linhas de 52 px;
 * a tabela da lista não mudou.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  const C = window.CicluzCaixa;
  const { el, botao, entrada, seletor } = U;
  const { moeda, formulario, grupo, linhaCampo, linhaLeitura } = C;
  const T = (window.CicluzCaixaTesouraria = window.CicluzCaixaTesouraria || {});

  const POR_PAGINA = 10;
  const filtro = { status: '', de: '', ate: '', pdv: '', por: '', origem: '', destino: '', lacre: '' };
  let mais = false;
  let pagina = 1;
  let selecionado = null;
  C.aoReiniciar(() => { Object.assign(filtro, { status: '', de: '', ate: '', pdv: '', por: '', origem: '', destino: '', lacre: '' }); mais = false; pagina = 1; selecionado = null; });

  const hoje = () => new Date().toLocaleDateString('pt-BR');
  const iso = (br) => br.split('/').reverse().join('-');
  const corpoSecao = (...nos) => { const c = el('div', 'compras-corpo'); c.append(...nos); return c; };

  const ROTULO_TIPO = { malote: 'Malote', sangria: 'Sangria', retorno_final: 'Retorno final', sem_lacre: 'Recebimento sem lacre', comum: 'Transferência' };
  const ROTULO_LACRE = { disponivel: 'Disponível', reservado: 'Reservado', usado: 'Usado', usada_aguardando_conferencia: 'Usada, aguardando conferência', conferida: 'Conferida' };
  const TIPO_LACRE = { abertura: 'Abertura', fechamento: 'Fechamento', sangria: 'Sangria' };

  /** Situação como a Tesouraria lê: o malote tem rótulos próprios (Disponível/Usado), os demais o status comum. */
  function situacao(t) {
    if (t.tipo === 'malote') return { pendente: ['● Disponível', 'info'], recebida: ['✓ Usado', 'positivo'], cancelada: ['✕ Cancelado', 'neutro'], divergente: ['▲ Divergente', 'negativo'] }[t.situacao];
    return { pendente: ['● Pendente', 'atencao'], recebida: ['✓ Recebido', 'positivo'], cancelada: ['✕ Cancelada', 'neutro'], divergente: ['▲ Divergente', 'negativo'] }[t.situacao];
  }
  const nomeConta = (id) => C.conta(id).nome;
  const lacresDe = (t) => C.estado.lacres.filter((l) => l.transferenciaId === t.id);
  const numerosLacre = (t) => [t.lacre, t.lacreFechamento, ...(t.bolsas || [])].filter(Boolean);

  function filtradas() {
    const L = C.estado.transferencias.slice().reverse();
    const pdvDe = (id) => C.conta(id).pdv;
    return L.filter((t) => (!filtro.status || t.situacao === filtro.status)
      && (!filtro.de || iso(t.data || hoje()) >= filtro.de) && (!filtro.ate || iso(t.data || hoje()) <= filtro.ate)
      && (!filtro.pdv || pdvDe(t.origem) === filtro.pdv || pdvDe(t.destino) === filtro.pdv)
      && (!filtro.por || t.criadoPor.toLowerCase().includes(filtro.por.trim().toLowerCase()))
      && (!filtro.origem || t.origem === filtro.origem) && (!filtro.destino || t.destino === filtro.destino)
      && (!filtro.lacre || numerosLacre(t).some((n) => n.toLowerCase().includes(filtro.lacre.trim().toLowerCase()))));
  }

  /* ---------- filtros ---------- */

  /** Filtros como formulário linha por linha: um grupo com seleção, datas e texto; "Mais filtros" abre um segundo grupo. A lógica de filtrar não mudou. */
  function blocoFiltros(atualizar) {
    const mudou = () => { pagina = 1; selecionado = null; atualizar(); };
    const P = C.pecas();
    const sel = (chave, rotulo, opcoes, vazio) => { const x = seletor(opcoes, filtro[chave], vazio); x.onchange = () => { filtro[chave] = x.value; mudou(); }; return linhaCampo(rotulo, x); };
    // Data: o campo com calendário do sistema; o valor do filtro continua ISO (AAAA-MM-DD).
    const dt = (chave, rotulo) => {
      const d = U.campoData({ rotulo, valor: filtro[chave] });
      const gravar = (v) => { if (filtro[chave] !== v) { filtro[chave] = v; mudou(); } };
      d.input.addEventListener('change', () => gravar(d.valor()));
      d.input.addEventListener('input', () => { if (!d.input.value) gravar(''); });
      return P.abreAoTocarNaLinha(P.linha(rotulo, d.caixa, d.painel), d.input, d.painel);
    };
    const txt = (chave, rotulo) => { const x = entrada('text', filtro[chave], { autocomplete: 'off' }); x.onchange = () => { filtro[chave] = x.value; mudou(); }; return linhaCampo(rotulo, x); };
    const itens = [grupo('Filtros', [
      sel('status', 'Status', [['pendente', 'Pendente'], ['recebida', 'Recebido'], ['cancelada', 'Cancelada'], ['divergente', 'Divergente']], 'Todos os status'),
      dt('de', 'Data inicial'), dt('ate', 'Data final'),
      sel('pdv', 'PDV', C.pdvs(), 'Todos os PDVs'),
    ])];
    const acoesMais = el('div', 'caixa-acoes'); acoesMais.append(botao(mais ? 'Menos filtros' : 'Mais filtros', () => { mais = !mais; atualizar(); }, 'btn secondary'));
    itens.push(acoesMais);
    if (mais) {
      const contas = C.estado.contas.map((c) => [c.id, c.nome]);
      itens.push(grupo('Mais filtros', [txt('por', 'Lançado por'), sel('origem', 'Conta de origem', contas, 'Todas as contas'), sel('destino', 'Conta de destino', contas, 'Todas as contas'), txt('lacre', 'Lacre')]));
    }
    const rot = { status: 'Status', de: 'De', ate: 'Até', pdv: 'PDV', por: 'Lançado por', lacre: 'Lacre' };
    const chips = Object.entries(filtro).filter(([, v]) => v).map(([k, v]) => {
      const texto = k === 'origem' ? 'Origem: ' + nomeConta(v) : k === 'destino' ? 'Destino: ' + nomeConta(v) : (rot[k] || k) + ': ' + v;
      const c = botao(texto + ' ✕', () => { filtro[k] = ''; mudou(); }, 'compras-chip ativo');
      c.setAttribute('aria-label', 'Remover filtro ' + texto);
      return c;
    });
    if (chips.length) { const box = el('div', 'compras-chips'); box.append(...chips, botao('Limpar tudo', () => { Object.keys(filtro).forEach((k) => { filtro[k] = ''; }); mudou(); }, 'btn secondary')); itens.push(box); }
    if (filtro.de && filtro.ate && filtro.de > filtro.ate) itens.push(el('p', 'caixa-pendencias', 'Data inicial não pode ser maior que a final.'));
    return formulario(...itens);
  }

  /* ---------- lista ---------- */

  function lista(atualizar) {
    const todas = filtradas();
    const paginas = Math.max(1, Math.ceil(todas.length / POR_PAGINA));
    if (pagina > paginas) pagina = paginas;
    const pedaco = todas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
    const s = U.secao('Transferências', todas.length);
    const resumo = 'Acompanhe o dinheiro em trânsito entre cofre, caixas e banco. ' + todas.length + (todas.length === 1 ? ' registro encontrado.' : ' registros encontrados.');
    s.append(corpoSecao(U.nota(resumo), blocoFiltros(atualizar)));
    s.append(U.tabela(
      [
        ['Lançamento', (t) => { const w = el('span', 'caixa-celula'); w.append(el('b', null, (t.data || hoje()) + ' ' + t.criadoEm), el('small', null, 'por ' + t.criadoPor)); return w; }],
        ['Movimento / rota', (t) => { const w = el('span', 'caixa-celula'); w.append(el('b', null, ROTULO_TIPO[t.tipo]), el('small', null, nomeConta(t.origem) + ' → ' + nomeConta(t.destino))); return w; }],
        ['Valor total', (t) => {
          const w = el('span', 'caixa-celula caixa-num'); w.append(el('b', null, moeda(t.valor)));
          if (t.tipo === 'malote') w.append(el('small', null, 'Dinheiro ' + moeda(t.especie) + ' · Moedas ' + moeda(t.moedas)));
          if (t.valorRecebido != null) w.append(el('small', null, 'Contado ' + moeda(t.valorRecebido)));
          return w;
        }, 'caixa-num'],
        ['Lacres', (t) => { const n = lacresDe(t).length || (t.lacre ? 1 : 0); return n ? botao('Lacres (' + n + ')', () => popupLacres(t), 'btn secondary') : el('small', null, 'Sem lacre'); }],
        ['Situação', (t) => { const [txt, tom] = situacao(t); return U.situacao(txt, tom); }],
        ['Ações', (t) => {
          const w = el('span', 'caixa-acoes caixa-acoes-esq');
          if (t.situacao === 'pendente' && ['sangria', 'retorno_final', 'comum'].includes(t.tipo)) w.append(botao('Conferir', () => T.conferir(t, atualizar), 'btn'));
          return w;
        }],
      ],
      pedaco,
      { aoClicar: (t) => { selecionado = selecionado === t.id ? null : t.id; atualizar(); }, vazioTexto: 'Nenhuma transferência encontrada. Altere os filtros ou registre uma em "Nova transferência".', classeLinha: (t) => (t.id === selecionado ? 'selecionada' : '') }
    ));
    if (todas.length > POR_PAGINA) {
      const p = el('div', 'caixa-acoes');
      const ant = botao('Anterior', () => { pagina -= 1; atualizar(); }, 'btn secondary'); ant.disabled = pagina <= 1;
      const prox = botao('Próxima', () => { pagina += 1; atualizar(); }, 'btn secondary'); prox.disabled = pagina >= paginas;
      p.append(el('small', null, 'Página ' + pagina + ' de ' + paginas), ant, prox);
      s.append(corpoSecao(p));
    }
    const out = [s];
    const t = C.transferencia(selecionado);
    if (t) out.push(detalhe(t));
    return out;
  }

  /* ---------- detalhe (só leitura) ---------- */

  function detalhe(t) {
    const s = U.secao('Detalhe · ' + ROTULO_TIPO[t.tipo] + ' · ' + nomeConta(t.origem) + ' → ' + nomeConta(t.destino));
    const P = C.pecas();
    const quem = t.tipo === 'malote'
      ? (t.situacao === 'pendente' ? 'Ninguém abriu caixa com este malote ainda.' : t.situacao === 'cancelada' ? 'Cancelado: não foi usado.' : t.caixaRotulo ? null : 'Sem caixa vinculado.')
      : null;
    const caixa = t.tipo === 'malote' ? (t.caixaRotulo || '') : (C.conta(t.origem).tipo === 'caixa' ? C.conta(t.origem).pdv + ' · ' + C.conta(t.origem).turno : (C.conta(t.destino).tipo === 'caixa' ? C.conta(t.destino).pdv + ' · ' + C.conta(t.destino).turno : ''));
    const tituloQuem = t.tipo === 'malote' ? 'Quem usou o malote' : 'Caixa de origem';
    const gQuem = quem ? P.secao(tituloQuem, U.nota(quem)) : grupo(tituloQuem, [linhaLeitura('PDV · Turno', caixa || '—'), linhaLeitura('Caixa', t.caixaId || '—')]);
    const ls = lacresDe(t);
    const gLacres = ls.length
      ? grupo('Lacres', ls.map((l) => linhaLeitura(TIPO_LACRE[l.tipo] + ' ' + l.numero, ROTULO_LACRE[l.situacao])))
      : P.secao('Lacres', U.nota(t.lacre ? 'Lacre ' + t.lacre + ' (' + (ROTULO_LACRE[(C.lacre(t.lacre) || {}).situacao] || 'em uso') + ')' : 'Sem lacre registrado.'));
    const recusas = (t.recusas || []).map((r) => U.nota('Conferência recusada por ' + r.por + ' às ' + r.em + ': contado ' + moeda(r.contado) + ' · ' + r.motivo + (r.encerrou ? ' (divergência encerrada)' : ' (continua pendente)')));
    const gConf = grupo('Conferência e observação', [
      linhaLeitura('Criada em', (t.data || hoje()) + ' ' + t.criadoEm),
      linhaLeitura('Contado × declarado', t.valorRecebido == null ? 'Contado —  · Declarado ' + moeda(t.valor) : 'Contado ' + moeda(t.valorRecebido) + ' · Declarado ' + moeda(t.valor)),
    ], ...recusas, U.nota(t.observacao || 'Sem observação.'));
    s.append(corpoSecao(formulario(gQuem, gLacres, gConf)));
    return s;
  }

  /* ---------- popup "Lacres da transferência" ---------- */

  function popupLacres(t) {
    C.dialogo({
      titulo: 'Lacres da transferência',
      subtitulo: ROTULO_TIPO[t.tipo] + ' · ' + nomeConta(t.origem) + ' → ' + nomeConta(t.destino),
      padrao: true,
      montar: (form) => {
        const ls = lacresDe(t);
        const grupos = [];
        if (t.tipo === 'malote') {
          [['abertura', 'Abertura', 'Não informado'], ['fechamento', 'Fechamento', 'Não informado'], ['sangria', 'Sangria', 'Sem bolsas']].forEach(([tipo, nome, vazio]) => {
            const itens = ls.filter((l) => l.tipo === tipo);
            grupos.push(itens.length ? grupo(nome, itens.map((l) => linhaLeitura(l.numero, ROTULO_LACRE[l.situacao]))) : C.pecas().secao(nome, U.nota(vazio)));
          });
          const b = ls.filter((l) => l.tipo === 'sangria');
          if (b.length) grupos.push(U.nota(b.length + (b.length === 1 ? ' bolsa' : ' bolsas') + ' · ' + b.filter((l) => l.situacao === 'conferida').length + ' conferida · ' + b.filter((l) => l.situacao === 'usada_aguardando_conferencia').length + ' aguardando · ' + b.filter((l) => l.situacao === 'disponivel').length + ' disponível'));
        } else {
          const l = C.lacre(t.lacre);
          grupos.push(grupo('Lacre', [linhaLeitura(t.lacre || '—', l ? ROTULO_LACRE[l.situacao] : '')], U.nota(t.tipo === 'sangria' ? 'Bolsa de sangria consumida por este movimento.' : 'Lacre de fechamento: sai do caixa fechado com este número.')));
        }
        form.append(formulario(...grupos));
      },
    });
  }

  T.lista = lista;
})();
