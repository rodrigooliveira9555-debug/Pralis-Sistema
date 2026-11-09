/*
 * Cotação por fornecedor (S1: /pedidos): matriz de produtos em cotação, cotação do produto,
 * ações da cotação, Pedido urgente e convites (link do fornecedor).
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
  const dataHora = (iso) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const linkFornecedor = (token) => new URL('rodada.html?t=' + encodeURIComponent(token), location.href).href;

  let tela = null;
  let busca = '';
  let paraDecidir = false;

  function abrir() {
    if (!tela) {
      tela = U.criarTela({ id: 'compras-cotacao', titulo: 'MER - Cotação por Fornecedor', caminho: CAMINHO + 'MER - Cotação por Fornecedor', icone: 'cotacao', voltar: M.voltarLancamentos });
      U.atalho(tela, 'Pedido urgente', 'M13 2 4 14h7l-1 8 9-12h-7Z', () => pedidoUrgente(), { criar: true });
      // Respostas dadas na página do fornecedor (outra aba) atualizam esta tela.
      document.addEventListener('cicluz-compras-mudou', (e) => { if (e.detail && e.detail.externo && tela.view.classList.contains('show') && !document.querySelector('.compras-dialog[open]')) render(); });
    }
    SV.fecharVencidas();
    tela.ativar();
    render();
  }

  /** Linhas (convite × produto) das cotações abertas. */
  function linhasAbertas() {
    const abertas = new Set(S.dados.rodadas.filter((r) => r.status === 'aberta').map((r) => r.id));
    const linhas = [];
    S.dados.convites.filter((c) => abertas.has(c.rodadaId)).forEach((c) => c.itens.forEach((produtoId) => {
      const e = SV.estadoOferta(c, produtoId);
      linhas.push({ produtoId, estado: e.situacao, convite: c });
    }));
    return linhas;
  }

  function render() {
    const linhas = linhasAbertas();
    const matriz = D.contarMatriz(linhas);
    const b = S.bolinhas();
    let produtos = [...matriz.keys()].map(S.produto).filter(Boolean).sort((x, y) => x.descricao.localeCompare(y.descricao, 'pt-BR'));
    const decidir = produtos.filter((p) => matriz.get(p.id).com_aumento > 0 && !(matriz.get(p.id).comprado > 0));
    if (paraDecidir) produtos = produtos.filter((p) => decidir.includes(p));
    produtos = produtos.filter((p) => U.dobrar(p.descricao).includes(U.dobrar(busca)));

    const topo = el('div', 'profiles-controls');
    const bx = U.buscaFixa('cotacao', 'Buscar produto', busca, (v) => { busca = v; render(); });
    topo.append(bx);
    const sec = U.secao('Produtos em cotação', produtos.length, U.legendaBolinhas());
    const filtros = el('div', 'compras-filtros compras-corpo-filtros');
    filtros.append(U.chips([['nao', 'Todos'], ['sim', 'Para decidir (' + decidir.length + ')']], paraDecidir ? 'sim' : 'nao', (v) => { paraDecidir = v === 'sim'; render(); }));
    sec.append(filtros);
    const cols = [['Produto', (p) => { const s = el('span', 'compras-produto-celula'); s.append(el('b', null, p.descricao), U.bolinhasDe(p.id, b)); return s; }]];
    D.COLUNAS_MATRIZ.forEach(([k, t]) => cols.push([t, (p) => { const n = matriz.get(p.id)[k]; return n ? String(n) : '–'; }, 'num' + (k === 'com_aumento' ? ' col-aumento' : '')]));
    const tab = U.tabela(cols, produtos, {
      aoClicar: (p) => cotacaoProduto(p.id),
      vazioTexto: linhas.length ? 'Nenhum produto com esse filtro.' : 'Nenhum produto em cotação agora. Envie um pedido em MER - Pedido de Compra ou faça um Pedido urgente.',
      classeLinha: (p) => (matriz.get(p.id).com_aumento > 0 && !(matriz.get(p.id).comprado > 0) ? 'destaque' : ''),
    });
    tab.querySelectorAll('tr.destaque td.col-aumento').forEach((td) => td.classList.add('destaque'));
    sec.append(tab);
    sec.append(rodapeCotacoes());
    tela.body.replaceChildren(U.nota('Cada produto em cotação e quantos fornecedores estão em cada situação. Clique no produto para decidir.'), topo, sec);
  }

  function rodapeCotacoes() {
    const box = el('div', 'compras-secao-rodape');
    const rodadas = S.dados.rodadas.slice().sort((a, b) => b.numero - a.numero).slice(0, 12);
    if (!rodadas.length) return box;
    const s = seletor(rodadas.map((r) => [r.id, 'Cotação nº ' + r.numero + ' · ' + (r.status === 'aberta' ? 'fecha ' + dataHora(r.expiraEm) : 'encerrada')]), '', 'Opções da cotação…');
    s.onchange = () => { if (s.value) acoesCotacao(s.value); s.value = ''; };
    box.append(campo('Cotações', s));
    return box;
  }

  /* ---------- Cotação do produto ---------- */
  function cotacaoProduto(produtoId) {
    const p = S.produto(produtoId);
    const linhas = linhasAbertas().filter((l) => l.produtoId === produtoId);
    const grupos = { decidir: [], aguardando: [], sem: [], comprado: [] };
    linhas.forEach((l) => {
      const e = SV.estadoOferta(l.convite, produtoId);
      if (e.situacao === 'comprado') grupos.comprado.push(l);
      else if (e.situacao === 'com_aumento' || (e.situacao === 'retornado' && ['fora_da_margem', 'barrado_pelo_teto'].includes(e.motivo))) grupos.decidir.push(l);
      else if (e.situacao === 'aguardando' || e.situacao === 'cotado') grupos.aguardando.push(l);
      else grupos.sem.push(l);
    });
    const ref = linhas[0] ? S.dados.rodadas.find((r) => r.id === linhas[0].convite.rodadaId).itens.find((i) => i.produtoId === produtoId).referencia : null;
    U.dialogo({
      titulo: 'Cotação do produto',
      subtitulo: p.descricao + ' · referência ' + (ref == null ? 'sem preço-base' : D.moeda(ref)),
      montar: (form) => {
        const bloco = (titulo, itens, texto, montarLinha) => {
          if (!itens.length) return;
          const bl = el('section', 'compras-bloco');
          bl.append(el('h4', null, titulo + ' (' + itens.length + ')'));
          if (texto) bl.append(U.nota(texto));
          itens.forEach((l) => bl.append(montarLinha(l)));
          form.append(bl);
        };
        bloco('Para você decidir', grupos.decidir, '', (l) => linhaOferta(l, true));
        bloco('Aguardando o fornecedor', grupos.aguardando, '', (l) => linhaOferta(l, false));
        bloco('Sem oferta', grupos.sem, '', (l) => linhaOferta(l, false));
        bloco('Comprado', grupos.comprado, 'Já é pedido: acompanhe em MER - Pedidos a Receber.', (l) => linhaOferta(l, false));
        if (!linhas.length) form.append(U.vazio('Nenhuma oferta aberta para este produto.'));
      },
    });
    function linhaOferta(l, decidir) {
      const c = l.convite;
      const f = S.fornecedor(c.fornecedorId);
      const rod = S.dados.rodadas.find((r) => r.id === c.rodadaId);
      const item = rod.itens.find((i) => i.produtoId === produtoId);
      const resp = c.resposta?.itens[produtoId];
      const e = SV.estadoOferta(c, produtoId);
      const linha = el('div', 'compras-oferta');
      const info = el('div', 'compras-produto-celula');
      info.append(el('b', null, f.nome));
      if (resp && !resp.indisponivel) {
        const qtd = resp.quantidade ?? item.quantidade;
        info.append(el('small', null, D.moeda(resp.valor) + '/un · disponível ' + D.numero(qtd) + ' · total ' + D.moeda(resp.valor * qtd) + ' · pedimos ' + D.numero(item.quantidade)));
      } else if (resp) info.append(el('small', null, resp.motivo === 'nao_trabalha' ? 'Não trabalha mais com o produto' : 'Sem estoque'));
      else info.append(el('small', null, c.rascunho ? 'Cotado: preenchendo, ainda não enviou' : 'Sem resposta · pedimos ' + D.numero(item.quantidade)));
      const cp = c.contrapropostas[produtoId];
      if (cp && cp.status === 'pendente') info.append(U.situacao('Contraproposta ' + D.moeda(cp.valor) + '/un · aguardando o fornecedor', 'info'));
      if (e.motivo && e.situacao !== 'comprado' && D.MOTIVOS[e.motivo]) info.append(U.situacao(D.MOTIVOS[e.motivo], e.situacao === 'com_aumento' ? 'atencao' : 'neutro'));
      const acoes = el('div', 'compras-oferta-acoes');
      if (decidir && rod.status === 'aberta') {
        acoes.append(botao('Contrapropor', () => contrapropor(c, produtoId)), botao('Aceitar', () => aceitar(c, produtoId, resp, item.referencia), 'btn'));
      }
      if (e.situacao === 'comprado') acoes.append(U.situacao(e.modo === 'automatica' ? 'Comprado automaticamente' : 'Comprado', 'positivo'));
      // Simulação do link do WhatsApp: quem ainda não respondeu pode ser respondido daqui, na página do fornecedor.
      if ((e.situacao === 'aguardando' || e.situacao === 'cotado') && rod.status === 'aberta') {
        acoes.append(botao('Responder como fornecedor', () => window.open(linkFornecedor(c.token), '_blank', 'noopener')));
      }
      linha.append(info, acoes);
      return linha;
    }
    function fechar() { document.querySelectorAll('.compras-dialog[open]').forEach((d) => d.close()); }
    function aceitar(c, pid, resp, referencia) {
      U.dialogo({
        titulo: 'Confirmar compra',
        subtitulo: S.fornecedor(c.fornecedorId).nome + ' · ' + D.moeda(resp.valor) + '/un',
        montar: (form) => {
          const opcao = el('div', 'compras-grade');
          const r1 = el('label', 'compras-interruptor');
          const i1 = entrada('radio'); i1.name = 'ref'; i1.checked = true;
          r1.append(i1, el('span', null, 'Só desta vez'));
          opcao.append(r1);
          let i2 = null;
          if (referencia == null || resp.valor > referencia) {
            const r2 = el('label', 'compras-interruptor');
            i2 = entrada('radio'); i2.name = 'ref';
            r2.append(i2, el('span', null, 'Reajustar a referência para ' + D.moeda(resp.valor)));
            opcao.append(r2);
          }
          form.append(opcao, U.nota('Comprar é irreversível: vira pedido "Comprado" e o fornecedor recebe "pode entregar".'));
          return { i2 };
        },
        rotuloSalvar: 'Confirmar compra',
        salvar: (ctx) => {
          const r = SV.aceitarOferta(c.id, pid, Boolean(ctx.i2 && ctx.i2.checked));
          if (r.erro) return r.erro;
          fechar(); U.avisar('Comprado. Veja em MER - Pedidos a Receber.'); render();
        },
      });
    }
    function contrapropor(c, pid) {
      U.dialogo({
        titulo: 'Contrapropor',
        subtitulo: S.fornecedor(c.fornecedorId).nome,
        montar: (form) => { const v = entrada('text', '', { inputMode: 'decimal', placeholder: '0,00' }); form.append(campo('Seu valor (R$/un)', v), U.nota('O fornecedor vê a contraproposta no link dele e pode aceitar.')); return { v }; },
        rotuloSalvar: 'Enviar contraproposta',
        salvar: (ctx) => { const r = SV.contrapropor(c.id, pid, ctx.v.value); if (r.erro) return r.erro; fechar(); U.avisar('Contraproposta enviada.'); render(); },
      });
    }
  }

  /* ---------- Ações da cotação inteira ---------- */
  function acoesCotacao(rodadaId) {
    const rod = S.dados.rodadas.find((r) => r.id === rodadaId);
    const convites = S.dados.convites.filter((c) => c.rodadaId === rodadaId);
    const comprados = new Set();
    convites.forEach((c) => c.itens.forEach((p) => { if (SV.estadoOferta(c, p).situacao === 'comprado') comprados.add(p); }));
    const pendentes = rod.itens.filter((i) => !comprados.has(i.produtoId));
    const motivo = (produtoId) => {
      const es = convites.filter((c) => c.itens.includes(produtoId)).map((c) => SV.estadoOferta(c, produtoId));
      const pri = ['custo_nao_calculado', 'acima_da_base', 'sem_referencia', 'barrado_pelo_teto', 'fora_da_margem', 'indisponivel', 'sem_resposta'];
      return pri.find((m) => es.some((e) => e.motivo === m)) || 'sem_resposta';
    };
    const tom = { custo_nao_calculado: 'negativo', sem_referencia: 'info', acima_da_base: 'atencao', barrado_pelo_teto: 'atencao' };
    U.dialogo({
      titulo: 'Cotação nº ' + rod.numero,
      subtitulo: (rod.status === 'aberta' ? 'Cotação aberta · fecha ' + dataHora(rod.expiraEm) : 'Cotação ' + (rod.status === 'fechada' ? 'fechada' : 'cancelada')) + ' · ' + comprados.size + ' de ' + rod.itens.length + ' produto(s) comprado(s)',
      montar: (form) => {
        const lista = el('div', 'compras-lista compras-bloco');
        if (!pendentes.length) lista.append(U.vazio('Tudo comprado.'));
        pendentes.forEach((i) => {
          const m = motivo(i.produtoId);
          lista.append(U.linhaLista({ titulo: S.produto(i.produtoId).descricao, detalhe: 'Pedimos ' + D.numero(i.quantidade), direita: [U.situacao(D.MOTIVOS[m], tom[m] || 'neutro'), botao('Ver ofertas', () => { form.closest('dialog').close(); cotacaoProduto(i.produtoId); })] }));
        });
        const acoes = el('div', 'compras-form-rodape');
        const sol = S.dados.solicitacoes.find((s) => s.id === rod.solicitacaoId);
        // Como no S1: com a cotação aberta o fornecedor ainda pode vender estes itens; levar os pendentes para
        // outro pedido ou encerrar agora poderia comprar o mesmo produto duas vezes.
        const podeLevarPendentes = rod.status === 'fechada' && pendentes.length > 0 && sol?.status === 'parcialmente_comprada';
        if (rod.status === 'aberta') {
          acoes.append(botao('Encerrar cotação agora', () => U.confirmar('Encerrar cotação', 'Os fornecedores não poderão mais responder. A referência só desce para o menor preço recebido.', 'Encerrar', () => { const r = SV.encerrarRodada(rod.id); if (r.erro) return r.erro; form.closest('dialog').close(); U.avisar('Cotação encerrada.'); render(); })));
          if (pendentes.length) lista.append(U.nota('Com a cotação aberta, os fornecedores ainda podem vender estes produtos. O pedido urgente com os pendentes e o encerramento da solicitação ficam disponíveis depois que ela fechar.'));
        }
        if (podeLevarPendentes) {
          acoes.append(
            botao('Pedido urgente com os pendentes', () => { form.closest('dialog').close(); pedidoUrgente(pendentes.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade }))); }),
            botao('Encerrar solicitação', () => U.confirmar('Encerrar solicitação', 'Encerrar sem comprar o que sobrou?', 'Encerrar', () => { const r = SV.encerrarSolicitacao(rod.solicitacaoId); if (r.erro) return r.erro; form.closest('dialog').close(); U.avisar('Solicitação encerrada.'); render(); })),
          );
        }
        acoes.append(botao('Ver convites', () => { form.closest('dialog').close(); mostrarConvites(rod.id); }));
        form.append(lista, acoes);
      },
    });
  }

  /* ---------- Convites (link do fornecedor) ---------- */
  function mostrarConvites(rodadaId) {
    const rod = S.dados.rodadas.find((r) => r.id === rodadaId);
    const convites = S.dados.convites.filter((c) => c.rodadaId === rodadaId);
    U.dialogo({
      titulo: 'Enviado aos fornecedores',
      subtitulo: 'Cotação nº ' + rod.numero + ' · prazo até ' + dataHora(rod.expiraEm),
      montar: (form) => {
        const lista = el('div', 'compras-lista compras-bloco');
        convites.forEach((c) => {
          const f = S.fornecedor(c.fornecedorId);
          const st = c.resposta ? ['Respondeu', 'positivo'] : c.rascunho ? ['Cotando', 'info'] : ['WhatsApp enviado (simulado)', 'neutro'];
          lista.append(U.linhaLista({
            icone: 'fornecedor', titulo: f.nome, detalhe: c.itens.length + ' item(ns) · ' + f.whatsapp,
            direita: [U.situacao(st[0], st[1]),
              botao('Copiar link', () => { navigator.clipboard?.writeText(linkFornecedor(c.token)).then(() => U.avisar('Link copiado.'), () => U.avisar(linkFornecedor(c.token))); }),
              botao('Abrir como fornecedor', () => window.open(linkFornecedor(c.token), '_blank', 'noopener'), 'btn')],
          }));
        });
        form.append(lista, U.nota('No sistema real o fornecedor recebe o link pelo WhatsApp. Aqui, "Abrir como fornecedor" mostra a página que ele vê: responda lá e a cotação volta para esta tela.'));
      },
    });
  }

  /* ---------- Pedido urgente ---------- */
  function pedidoUrgente(itensIniciais) {
    let itens = itensIniciais && itensIniciais.length ? itensIniciais.map((i) => ({ ...i })) : [{ produtoId: '', quantidade: '' }];
    const ativos = S.dados.produtos.filter((p) => p.status === 'ativo' && p.liberadoCompra).sort((a, b) => a.descricao.localeCompare(b.descricao, 'pt-BR'));
    U.dialogo({
      titulo: 'Pedido urgente',
      subtitulo: 'Fora da agenda, para um fornecedor só.',
      largo: true,
      montar: (form) => {
        const forn = seletor(S.dados.fornecedores.filter((f) => f.situacao === 'ativo').sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map((f) => [f.id, f.nome + (D.podeConvidar(f) ? '' : ' — ' + D.motivoNaoConvidavel(f))]), '', 'Selecione o fornecedor');
        const box = el('div', 'compras-grade');
        const obs = el('textarea'); obs.rows = 2;
        let margem = 10;
        const margemCampo = el('div', 'compras-campo');
        margemCampo.append(el('span', 'compras-rotulo', 'Variação aceita na quantidade'), U.chips([[10, '10%'], [20, '20%'], [30, '30%'], [40, '40%']], margem, (v) => { margem = v; }));
        const desenha = () => {
          box.replaceChildren(...itens.map((it, n) => {
            const linha = el('div', 'compras-item-urgente');
            const s = seletor(ativos.map((p) => [p.id, p.descricao]), it.produtoId, 'Produto');
            const q = entrada('text', it.quantidade, { inputMode: 'decimal', placeholder: 'Qtd.' });
            const info = el('small', 'profiles-note');
            const mostra = () => { const p = S.produto(s.value); info.textContent = p ? 'Saldo ' + D.numero(p.saldo) + ' · mín ' + (p.estoqueMin ?? '—') + ' · máx ' + (p.estoqueMax ?? '—') : ''; };
            s.onchange = () => { it.produtoId = s.value; mostra(); };
            q.oninput = () => { it.quantidade = q.value; };
            mostra();
            linha.append(campo('Produto', s), campo('Quantidade', q), botao('Remover', () => { itens.splice(n, 1); if (!itens.length) itens.push({ produtoId: '', quantidade: '' }); desenha(); }), info);
            return linha;
          }));
        };
        desenha();
        const acoes = el('div', 'compras-form-rodape');
        acoes.append(
          botao('Adicionar item', () => { itens.push({ produtoId: '', quantidade: '' }); desenha(); }),
          botao('Preencher com o que está no mínimo', () => {
            const sug = ativos.map((p) => ({ produtoId: p.id, quantidade: D.sugestaoReposicao(p) })).filter((x) => x.quantidade > 0);
            if (!sug.length) return U.avisar('Nenhum produto no mínimo.');
            itens = itens.filter((i) => i.produtoId && !sug.some((s) => s.produtoId === i.produtoId)).concat(sug.map((x) => ({ ...x, quantidade: String(x.quantidade) })));
            desenha();
          }),
        );
        form.append(campo('Fornecedor *', forn), box, acoes, campo('Observação', obs), margemCampo);
        return { forn, obs, margem: () => margem };
      },
      rotuloSalvar: 'Enviar ao fornecedor',
      salvar: (c) => {
        const r = SV.pedidoUrgente({ fornecedorId: c.forn.value, itens: itens.map((i) => ({ produtoId: i.produtoId, quantidade: D.lerNumero(i.quantidade) })), observacao: c.obs.value, margemPct: c.margem() });
        if (r.erro) return r.erro;
        render();
        setTimeout(() => mostrarConvites(r.rodadaId), 50);
      },
    });
  }

  M.registrar('cotacao', abrir);
  window.CicluzComprasCotacao = { mostrarConvites, pedidoUrgente, linkFornecedor };
})();
