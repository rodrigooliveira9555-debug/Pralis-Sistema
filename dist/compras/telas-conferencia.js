/*
 * Conferências de estoque (S1: /conferencias_estoque), com controle só no S2 (decisão do Zé, 04/11/2026):
 * contagem cega, recontagem do que não bateu, motivo obrigatório, histórico de cada número e
 * aprovação por outra pessoa, que é quando o estoque é ajustado. Regras em servico.js.
 */
(function () {
  'use strict';
  const D = window.CicluzComprasDominio;
  const S = window.CicluzComprasDados;
  const U = window.CicluzComprasUI;
  const SV = window.CicluzComprasServico;
  const M = window.CicluzCompras;
  const { el, botao, campo, entrada, seletor } = U;
  const CAMINHO = 'Saídas · Mercadorias / Lançamentos / ';
  const RANK = [['vende', 'Mais vendidos'], ['compra', 'Mais comprados'], ['lucro', 'Mais lucro']];

  let tela = null;
  let modo = 'fazer';
  function abrir() {
    if (!tela) {
      tela = U.criarTela({ id: 'compras-conferencias', titulo: 'MER - Contagem de Estoque', caminho: CAMINHO + 'MER - Contagem de Estoque', icone: 'conferencia', voltar: M.voltarLancamentos });
      U.atalho(tela, 'Agendar conferência', 'M12 5v14M5 12h14', () => formulario(), { criar: true });
    }
    SV.processarConferencias();
    tela.ativar();
    render();
  }
  const recorte = (f) => [f.grupoId && S.nomeGrupo(f.grupoId, f.subgrupoId), f.area, f.setor, f.localVenda, (f.ranking || []).map((k) => RANK.find((r) => r[0] === k)[1]).join(', ')].filter(Boolean).join(' · ') || 'Estoque todo';

  const GRUPO = { fazer: ['agendada', 'recontagem'], aprovar: ['concluida'], feitas: ['aprovada', 'recusada'] };
  function situacaoDa(c) {
    if (c.status === 'agendada') return U.situacao(c.itens.filter((i) => i.contado != null).length + '/' + c.itens.length + ' contados', 'info');
    if (c.status === 'recontagem') return U.situacao('Recontar ' + c.itens.filter((i) => i.recontar).length, 'atencao');
    if (c.status === 'concluida') return U.situacao('Aguardando aprovação', 'atencao');
    if (c.status === 'aprovada') return U.situacao('Aprovada', 'positivo');
    return U.situacao('Recusada', 'neutro');
  }

  function render() {
    const da = (k) => S.dados.conferencias.filter((c) => GRUPO[k].includes(c.status));
    const topo = el('div', 'profiles-controls');
    topo.append(U.nota('Contagem cega: quem conta não vê o saldo do sistema. O que não bater vai para recontagem; depois, outra pessoa aprova e só então o estoque é ajustado.'));
    const s1 = U.secao('Conferências');
    const tg = U.chips([['fazer', 'A fazer (' + da('fazer').length + ')'], ['aprovar', 'Para aprovar (' + da('aprovar').length + ')'], ['feitas', 'Feitas (' + da('feitas').length + ')']], modo, (v) => { modo = v; render(); });
    tg.classList.add('compras-corpo-filtros');
    s1.append(tg);
    const l1 = el('div', 'compras-lista');
    const lista = da(modo).slice().sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora));
    const VAZIO = { fazer: ['Nenhuma contagem para hoje.', 'Agende uma conferência e use "Gerar a contagem agora" para testar.'], aprovar: ['Nenhuma conferência esperando aprovação.', ''], feitas: ['Nenhuma conferência decidida.', ''] };
    if (!lista.length) l1.append(U.vazio(...VAZIO[modo]));
    lista.forEach((c) => {
      const a = S.dados.conferenciaAgendas.find((x) => x.id === c.agendaId);
      l1.append(U.linhaLista({ icone: 'conferencia', titulo: recorte(a.filtro), detalhe: D.dataLonga(c.data) + ' ' + c.hora + ' · ' + S.responsavel(c.responsavelId), direita: situacaoDa(c), aoClicar: () => contagem(c.id) }));
    });
    s1.append(l1);
    const ags = S.dados.conferenciaAgendas.filter((a) => a.status === 'ativa');
    const s2 = U.secao('Agendamentos de conferência', ags.length);
    const l2 = el('div', 'compras-lista');
    if (!ags.length) l2.append(U.vazio('Nenhuma conferência agendada.'));
    ags.forEach((a) => {
      const box = el('div', 'compras-agenda');
      box.append(U.linhaLista({ icone: 'agenda', titulo: recorte(a.filtro), detalhe: D.resumoRegra(a.regra, a.inicio) + ' às ' + a.hora + ' · Quem conta: ' + S.responsavel(a.responsavelId), direita: [botao('Editar', () => formulario(a)), botao('Encerrar', () => U.confirmar('Encerrar agendamento', 'As próximas conferências deixam de ser criadas.', 'Encerrar', () => { const r = SV.encerrarAgendaConferencia(a.id); if (r.erro) return r.erro; render(); }))] }));
      const datas = el('div', 'compras-datas');
      datas.append(el('span', 'compras-rotulo', 'Próximas datas'));
      const prox = SV.proximasConferencias(a);
      if (!prox.length) datas.append(el('small', 'profiles-note', 'Sem próximas datas.'));
      prox.forEach((o) => datas.append(botao(D.dataCurta(o.data) + ' ' + o.hora, () => U.confirmar('Conferência de ' + D.dataLonga(o.data), 'Gerar a contagem agora? (simulação do agendador, que congela o saldo do sistema neste momento)', 'Gerar a contagem agora', () => { SV.processarConferencias({ agendaId: a.id, previsto: o.previsto }); modo = 'fazer'; render(); }), 'compras-chip')));
      box.append(datas);
      l2.append(box);
    });
    s2.append(l2);
    tela.body.replaceChildren(topo, s1, s2);
  }

  function formulario(a) {
    const f = a ? structuredClone(a.filtro) : { grupoId: '', subgrupoId: '', area: '', setor: '', localVenda: '', ranking: [] };
    U.dialogo({
      titulo: a ? 'Editar conferência' : 'Agendar conferência',
      largo: true,
      montar: (form) => {
        const sec = (t) => { const s = el('fieldset', 'compras-fieldset'); s.append(el('legend', null, t)); form.append(s); return s; };
        const s1 = sec('O que contar');
        const grupos = S.gruposMercadoria();
        const g = seletor(grupos.map((x) => [x.id, x.nome]), f.grupoId, 'Todos os grupos');
        const sg = el('select');
        const subs = () => { const gr = grupos.find((x) => x.id === g.value); sg.replaceChildren(new Option('Todos os subgrupos', '')); (gr ? gr.subgrupos : []).forEach((s) => sg.add(new Option(s.nome, s.id))); sg.value = f.subgrupoId && gr && gr.subgrupos.some((s) => s.id === f.subgrupoId) ? f.subgrupoId : ''; };
        g.onchange = subs; subs();
        const locais = S.locais();
        const area = seletor(locais, f.area, 'Todas');
        const setor = seletor(locais, f.setor, 'Todos');
        const local = seletor(locais, f.localVenda, 'Todos');
        const rank = new Set(f.ranking || []);
        const rk = el('div', 'compras-chips compras-largo');
        const desenhaRk = () => rk.replaceChildren(...RANK.map(([k, t]) => { const b = botao(t, () => { rank.has(k) ? rank.delete(k) : rank.add(k); desenhaRk(); }, 'compras-chip' + (rank.has(k) ? ' ativo' : '')); b.setAttribute('aria-pressed', String(rank.has(k))); return b; }));
        desenhaRk();
        s1.append(campo('Grupo', g), campo('Subgrupo', sg), campo('Área', area), campo('Setor / local de estoque', setor), campo('Local de venda', local), rk, U.nota('Sem filtro, a conferência cobre o estoque todo.'));
        const s2 = sec('Quem conta');
        const resp = seletor(S.RESPONSAVEIS.map((u) => [u.id, u.nome]), a?.responsavelId || '', 'Selecione');
        s2.append(campo('Quem conta *', resp));
        const s3 = sec('Quando');
        const inicio = entrada('date', a?.inicio || D.isoData(D.somarDias(new Date(), 1)));
        const hora = entrada('time', a?.hora || '07:00');
        s3.append(campo('Primeira conferência em *', inicio), campo('Hora *', hora));
        const rep = window.CicluzComprasPedido.campoRepeticao(s3, a?.regra, a?.termino, inicio);
        const s4 = sec('Orientação');
        const ori = el('textarea'); ori.rows = 2; ori.value = a?.orientacao || '';
        s4.append(campo('Orientação para quem conta', ori));
        return { g, sg, area, setor, local, rank, resp, inicio, hora, rep, ori };
      },
      salvar: (c) => {
        const r = SV.salvarAgendaConferencia({
          filtro: { grupoId: c.g.value, subgrupoId: c.sg.value, area: c.area.value, setor: c.setor.value, localVenda: c.local.value, ranking: [...c.rank] },
          responsavelId: c.resp.value, inicio: c.inicio.value, hora: c.hora.value, regra: c.rep.regra(), termino: c.rep.termino(), orientacao: c.ori.value.trim(),
        }, a);
        if (r.erro) return r.erro;
        U.avisar('Conferência agendada.');
        render();
      },
    });
  }

  const nomeProduto = (id) => S.produto(id)?.descricao || '—';
  const unidade = (id) => S.produto(id)?.unidade || '';
  const hora = (iso) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  function campoNumero(valor, rotulo, aoMudar) {
    const x = entrada('text', valor, { inputMode: 'decimal', placeholder: '—' });
    x.classList.add('compras-contado');
    x.setAttribute('aria-label', rotulo);
    x.oninput = () => aoMudar(x.value);
    return x;
  }
  const textoNumero = (v) => (v == null ? '' : String(v).replace('.', ','));

  function contagem(id) {
    const c = S.dados.conferencias.find((x) => x.id === id);
    if (c.status === 'agendada' || c.status === 'recontagem') return contar(c);
    return revisar(c);
  }

  /* Contagem e recontagem: cegas (sem o saldo do sistema e, na recontagem, sem a 1ª contagem). */
  function contar(c) {
    const a = S.dados.conferenciaAgendas.find((x) => x.id === c.agendaId);
    const recontagem = c.status === 'recontagem';
    const campo = recontagem ? 'recontado' : 'contado';
    const itens = c.itens.filter((i) => !recontagem || i.recontar);
    const valores = {};
    const motivos = {};
    itens.forEach((i) => { if (i[campo] != null) valores[i.produtoId] = textoNumero(i[campo]); if (recontagem && i.motivo) motivos[i.produtoId] = i.motivo; });
    let busca = '';
    let chip;
    U.dialogo({
      titulo: (recontagem ? 'Recontagem de ' : 'Conferência de ') + D.dataLonga(c.data),
      subtitulo: recorte(a.filtro) + ' · ' + S.responsavel(c.responsavelId),
      largo: true,
      montar: (form) => {
        chip = el('p', 'compras-meta');
        const conta = () => { const n = itens.filter((i) => String(valores[i.produtoId] ?? '').trim() !== '').length; chip.replaceChildren(U.situacao(n + '/' + itens.length + (recontagem ? ' recontados' : ' contados'), 'info')); };
        if (a.orientacao) form.append(el('p', 'compras-bloco', a.orientacao));
        const box = el('div');
        const colunas = [
          ['Produto', (i) => {
            if (!recontagem) return nomeProduto(i.produtoId);
            // Na recontagem o motivo fica embaixo do nome: no celular a tabela não precisa rolar de lado.
            const w = el('span', 'compras-celula-pilha');
            const m = entrada('text', motivos[i.produtoId] || '', { maxLength: 200, placeholder: 'Motivo, se continuar diferente' });
            m.setAttribute('aria-label', 'Motivo da diferença de ' + nomeProduto(i.produtoId));
            m.oninput = () => { motivos[i.produtoId] = m.value; };
            w.append(el('b', null, nomeProduto(i.produtoId)), m);
            return w;
          }],
          [recontagem ? 'Recontagem' : 'Contado', (i) => {
            const w = el('span', 'compras-contado-celula');
            w.append(campoNumero(valores[i.produtoId] ?? '', (recontagem ? 'Recontagem de ' : 'Contado de ') + nomeProduto(i.produtoId), (v) => { valores[i.produtoId] = v; conta(); }), el('small', 'profiles-note', unidade(i.produtoId)));
            return w;
          }, 'num'],
        ];
        const desenha = () => box.replaceChildren(U.tabela(colunas, itens.filter((i) => U.dobrar(nomeProduto(i.produtoId)).includes(U.dobrar(busca)))));
        form.append(
          chip,
          U.nota(recontagem
            ? 'Estes produtos não bateram com o sistema na 1ª contagem. Conte de novo, com atenção. Se o número continuar diferente, o motivo é obrigatório.'
            : 'Contagem cega: o saldo do sistema só aparece depois de concluir. Cada número digitado fica guardado no histórico.'),
          U.busca('Buscar produto', (v) => { busca = v; desenha(); }),
          box,
        );
        // Sem "Salvar" no texto: o ✓ do rodapé repassa ao primeiro botão "Salvar…" visível, que precisa ser o de concluir.
        const parcial = el('div', 'compras-form-rodape');
        parcial.append(botao('Guardar e continuar depois', () => {
          const r = SV.salvarContagem(c.id, valores, false, motivos);
          if (r.erro) return U.avisar(r.erro);
          U.avisar(recontagem ? 'Recontagem guardada.' : 'Contagem guardada.');
          form.closest('dialog').close();
          render();
        }));
        form.append(parcial);
        desenha(); conta();
      },
      rotuloSalvar: recontagem ? 'Concluir recontagem' : 'Concluir contagem',
      salvar: () => {
        const r = SV.salvarContagem(c.id, valores, true, motivos);
        if (r.erro) return r.erro;
        if (r.resultado === 'recontagem') { U.avisar(r.recontar + ' produto(s) não bateram: faça a recontagem.'); modo = 'fazer'; render(); setTimeout(() => contagem(c.id), 0); return; }
        U.avisar('Conferência concluída. Falta a aprovação de outra pessoa.');
        modo = 'aprovar';
        render();
      },
    });
  }

  /* Concluída: mostra sistema x contado, a diferença em R$, os motivos e o histórico; outra pessoa decide. */
  function revisar(c) {
    const a = S.dados.conferenciaAgendas.find((x) => x.id === c.agendaId);
    const res = SV.resumoConferencia(c);
    const decidir = c.status === 'concluida';
    let so = 'divergentes';
    U.dialogo({
      titulo: 'Conferência de ' + D.dataLonga(c.data),
      subtitulo: recorte(a.filtro) + ' · Contou: ' + S.responsavel(c.responsavelId),
      largo: true,
      montar: (form) => {
        const meta = el('div', 'compras-chips');
        meta.append(
          situacaoDa(c),
          U.situacao(res.divergentes.length + ' de ' + res.itens.length + ' com diferença', res.divergentes.length ? 'atencao' : 'positivo'),
          U.situacao('Faltas ' + D.moeda(res.faltas), res.faltas ? 'atencao' : 'neutro'),
          U.situacao('Sobras ' + D.moeda(res.sobras), 'neutro'),
          U.situacao('Resultado ' + D.moeda(res.liquido), res.liquido < 0 ? 'atencao' : 'neutro'),
        );
        form.append(meta);
        if (c.status === 'aprovada') form.append(U.nota('Aprovada por ' + S.responsavel(c.aprovadorId) + ' em ' + hora(c.decididaEm) + '. O estoque foi ajustado pela diferença (veja o extrato do estoque).'));
        if (c.status === 'recusada') form.append(U.nota('Recusada por ' + S.responsavel(c.aprovadorId) + ' em ' + hora(c.decididaEm) + ': ' + c.motivoRecusa + '. O estoque não mudou.'));
        const filtro = U.chips([['divergentes', 'Só com diferença'], ['todos', 'Todos']], so, (v) => { so = v; desenha(); });
        const box = el('div');
        const historico = (i) => (i.historico || []).map((h) => (h.etapa === 'recontagem' ? 'recontagem ' : '') + D.numero(h.valor) + ' (' + hora(h.em) + ')').join(' · ');
        const desenha = () => box.replaceChildren(U.tabela([
          ['Produto', (i) => { const w = el('span', 'compras-celula-pilha'); w.append(el('b', null, nomeProduto(i.produtoId))); const h = historico(i); if (h) w.append(el('small', 'profiles-note', 'Digitado: ' + h)); return w; }],
          ['Sistema', (i) => D.numero(i.saldoSistema) + ' ' + unidade(i.produtoId), 'num'],
          ['Contado', (i) => { const w = el('span', 'compras-celula-pilha'); w.append(D.numero(i.final) + ' ' + unidade(i.produtoId)); if (i.recontado != null) w.append(el('small', 'profiles-note', '1ª contagem: ' + D.numero(i.contado))); return w; }, 'num'],
          ['Diferença', (i) => (i.diferenca ? (i.diferenca > 0 ? '+' : '') + D.numero(i.diferenca) : '—'), 'num'],
          ['Valor', (i) => (i.centavos ? D.moeda(i.centavos / 100) : '—'), 'num'],
          ['Motivo', (i) => i.motivo || (i.diferenca ? '—' : '')],
        ], so === 'todos' ? res.itens : res.divergentes, { vazioTexto: 'Todos os produtos bateram com o sistema.' }));
        form.append(filtro, box, U.nota('Valor = diferença × custo de uma unidade (custo da embalagem ÷ quantidade da embalagem). Falta é negativa; sobra é positiva.'));
        let quem = null;
        if (decidir) {
          const sec = el('fieldset', 'compras-fieldset');
          sec.append(el('legend', null, 'Aprovação'));
          quem = seletor(S.RESPONSAVEIS.filter((u) => u.id !== c.responsavelId).map((u) => [u.id, u.nome]), '', 'Selecione');
          sec.append(campo('Quem aprova *', quem, 'Não pode ser quem contou. Ao aprovar, o estoque de cada produto com diferença é ajustado e o ajuste aparece no extrato.'));
          const rodape = el('div', 'compras-form-rodape');
          rodape.append(botao('Recusar', () => recusar(c, quem.value, form.closest('dialog')), 'btn secondary perigo-texto'));
          sec.append(rodape);
          form.append(sec);
        }
        desenha();
        return { quem };
      },
      ...(decidir ? {
        rotuloSalvar: 'Aprovar e ajustar o estoque',
        salvar: (ctx) => {
          const r = SV.aprovarConferencia(c.id, ctx.quem.value);
          if (r.erro) return r.erro;
          U.avisar(r.ajustados ? 'Conferência aprovada: ' + r.ajustados + ' produto(s) ajustado(s) no estoque.' : 'Conferência aprovada. Nada a ajustar.');
          modo = 'feitas';
          render();
        },
      } : {}),
    });
  }

  function recusar(c, aprovadorId, dialogoAnterior) {
    if (!aprovadorId) return U.avisar('Escolha quem aprova antes de recusar.');
    U.dialogo({
      titulo: 'Recusar conferência',
      montar: (form) => {
        const m = el('textarea'); m.rows = 3; m.maxLength = 300;
        form.append(U.nota('O estoque não muda. Para contar de novo, gere uma nova conferência pelo agendamento.'), campo('Motivo da recusa *', m));
        return { m };
      },
      rotuloSalvar: 'Recusar conferência',
      salvar: (ctx) => {
        const r = SV.recusarConferencia(c.id, aprovadorId, ctx.m.value);
        if (r.erro) return r.erro;
        U.avisar('Conferência recusada. O estoque não mudou.');
        if (dialogoAnterior?.open) dialogoAnterior.close();
        modo = 'feitas';
        render();
      },
    });
  }

  M.registrar('conferencias', abrir);
})();
