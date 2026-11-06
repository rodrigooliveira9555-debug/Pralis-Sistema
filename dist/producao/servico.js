/*
 * Produção: operações. Cada uma valida, grava numa transação e devolve { ok, ... } ou { erro }.
 *
 * Fluxo (só TNP): agendamento → (na data) pedido "para fazer" → a loja põe as quantidades e envia →
 * uma ordem de produção por produto, com a ficha padrão → etapas iniciadas e concluídas no mapa →
 * pedido pronto → abastecimento (com ou sem conferência) → fechamento: real, sobra e descarte.
 *
 * Estoque (decisões do Zé, 05/11/2026): usa o saldo do produto no Compras. Produto com estoque: o pedido
 * sai do estoque livre e só o que falta vira ordem; a ordem pronta entra no saldo; o abastecimento sai dele.
 * Toda ordem pronta baixa os ingredientes da ficha. Abaixo do mínimo, a reposição é SUGESTÃO para aprovar.
 */
(function () {
  'use strict';
  const D = window.CicluzProducaoDominio;
  const S = window.CicluzProducaoDados;
  const CD = () => window.CicluzComprasDominio;
  const P = S.producao;
  const B = S.patrimonio;
  const erro = (m) => ({ erro: m });
  const NAO_SALVOU = 'Não foi possível salvar neste navegador.';
  const proximoNumero = (lista) => lista.reduce((m, x) => Math.max(m, x.numero || 0), 0) + 1;
  const texto = (v) => String(v == null ? '' : v).trim();
  const num = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));

  /* =================== Patrimônio =================== */

  function validarBem(b) {
    if (!texto(b.nome)) return 'Informe o nome do bem.';
    if (!D.CATEGORIAS.some((c) => c[0] === b.categoria)) return 'Escolha a categoria.';
    if (b.valor != null && !(b.valor >= 0)) return 'O valor não pode ser negativo.';
    if (b.capacidade && !(b.capacidade.valor > 0)) return 'A capacidade deve ser maior que zero (ou deixe em branco).';
    if (b.capacidade && !b.capacidade.unidade) return 'Escolha a unidade da capacidade.';
    if (b.medidas && (!(b.medidas.largura > 0) || !(b.medidas.comprimento > 0))) return 'Preencha largura e comprimento, ou deixe os dois em branco.';
    if (b.energia && b.energia !== 'nenhuma' && !(b.consumoHora > 0)) return 'Informe o consumo por hora do equipamento.';
    const np = texto(b.numeroPatrimonio);
    if (np && B.dados.bens.some((x) => x.id !== b.id && texto(x.numeroPatrimonio) === np)) return 'Já existe um bem com o número de patrimônio ' + np + '.';
    return '';
  }
  function salvarBem(entrada) {
    const b = { ...entrada, nome: texto(entrada.nome).toLocaleUpperCase('pt-BR') };
    if (b.energia === 'nenhuma' || !b.energia) { b.energia = 'nenhuma'; b.consumoHora = null; }
    const msg = validarBem(b);
    if (msg) return erro(msg);
    let id = b.id;
    const ok = B.transacao((d) => {
      if (id) Object.assign(d.bens.find((x) => x.id === id), b, { atualizadoEm: S.agoraIso() });
      else { id = S.novoId('bem'); d.bens.push({ ativo: true, ...b, id, criadoEm: S.agoraIso() }); }
    });
    return ok ? { ok: true, id } : erro(NAO_SALVOU);
  }
  /** Onde o bem é usado (formatos e fichas), para não apagar algo referenciado. */
  function usosDoBem(id) {
    const usos = [];
    P.dados.produtos.forEach((c) => { if (c.formato && c.formato.utensilioId === id) usos.push('formato de ' + S.nomeProduto(c.produtoId)); });
    P.dados.fichas.forEach((f) => { if (f.etapas.some((e) => (e.recursos || []).some((r) => r.patrimonioId === id))) usos.push('ficha ' + f.nome + ' (' + S.nomeProduto(f.produtoId) + ')'); });
    return usos;
  }
  function excluirBem(id) {
    const usos = usosDoBem(id);
    if (usos.length) return erro('Este bem é usado em: ' + usos.slice(0, 3).join(', ') + (usos.length > 3 ? '…' : '') + '. Inative-o em vez de excluir.');
    return B.transacao((d) => { d.bens = d.bens.filter((x) => x.id !== id); }) ? { ok: true } : erro(NAO_SALVOU);
  }
  function alternarBem(id) {
    return B.transacao((d) => { const x = d.bens.find((b) => b.id === id); x.ativo = x.ativo === false; }) ? { ok: true } : erro(NAO_SALVOU);
  }

  /* =================== Produto da produção =================== */

  function salvarConfig(entrada) {
    const c = { ...entrada };
    if (!c.produtoId || !S.produto(c.produtoId)) return erro('Escolha o produto.');
    if (c.formato) {
      const m = D.validarFormato(c.formato);
      if (m) return erro(m);
    }
    const m2 = D.validarConfigProduto(c, c.formato);
    if (m2) return erro(m2);
    if (!D.CONFERENCIAS.some((x) => x[0] === c.conferencia)) c.conferencia = 'nenhuma';
    const ok = P.transacao((d) => {
      const atual = d.produtos.find((x) => x.produtoId === c.produtoId);
      if (atual) Object.assign(atual, c, { atualizadoEm: S.agoraIso() });
      else d.produtos.push({ ativo: true, ...c, criadoEm: S.agoraIso() });
    });
    return ok ? { ok: true } : erro(NAO_SALVOU);
  }
  function desligarProducao(produtoId) {
    if (P.dados.pedidos.some((p) => ['rascunho', 'enviado', 'pronto', 'conferencia_loja'].includes(p.status) && p.itens.some((i) => i.produtoId === produtoId))) return erro('Há pedidos em andamento com este produto. Termine-os antes.');
    return P.transacao((d) => { const c = d.produtos.find((x) => x.produtoId === produtoId); c.ativo = c.ativo === false; }) ? { ok: true } : erro(NAO_SALVOU);
  }

  /* =================== Fichas técnicas =================== */

  function salvarFicha(entrada) {
    const f = structuredClone(entrada);
    f.nome = texto(f.nome);
    const msg = D.validarFicha(f);
    if (msg) return erro(msg);
    f.etapas.forEach((e) => { if (!e.id) e.id = S.novoId('et'); if (!Array.isArray(e.ingredientes)) e.ingredientes = []; if (!Array.isArray(e.recursos)) e.recursos = []; });
    let id = f.id;
    const ok = P.transacao((d) => {
      const doProduto = d.fichas.filter((x) => x.produtoId === f.produtoId && x.id !== id);
      if (!doProduto.some((x) => x.padrao)) f.padrao = true;
      if (f.padrao) doProduto.forEach((x) => { x.padrao = false; });
      if (id) Object.assign(d.fichas.find((x) => x.id === id), f, { atualizadoEm: S.agoraIso() });
      else { id = S.novoId('ft'); d.fichas.push({ ativa: true, ...f, id, criadoEm: S.agoraIso() }); }
    });
    return ok ? { ok: true, id } : erro(NAO_SALVOU);
  }
  function duplicarFicha(id) {
    const f = S.ficha(id);
    if (!f) return erro('Ficha não encontrada.');
    const copia = structuredClone(f);
    delete copia.id;
    copia.padrao = false;
    copia.nome = f.nome + ' (cópia)';
    copia.etapas.forEach((e) => { delete e.id; });
    return salvarFicha(copia);
  }
  function definirPadrao(id) {
    return P.transacao((d) => { const f = d.fichas.find((x) => x.id === id); d.fichas.filter((x) => x.produtoId === f.produtoId).forEach((x) => { x.padrao = x.id === id; }); f.ativa = true; }) ? { ok: true } : erro(NAO_SALVOU);
  }
  function excluirFicha(id) {
    if (P.dados.ordens.some((o) => o.fichaId === id && ['aguardando', 'em_producao'].includes(D.situacaoOrdem(o)))) return erro('Há ordens em produção com esta ficha. Conclua-as antes.');
    return P.transacao((d) => {
      const f = d.fichas.find((x) => x.id === id);
      d.fichas = d.fichas.filter((x) => x.id !== id);
      if (f && f.padrao) { const outra = d.fichas.find((x) => x.produtoId === f.produtoId && x.ativa !== false); if (outra) outra.padrao = true; }
    }) ? { ok: true } : erro(NAO_SALVOU);
  }

  /* =================== Agendamento de pedidos de produção =================== */

  function validarAgenda(a) {
    if (!a.produtoIds || !a.produtoIds.length) return 'Marque ao menos um produto.';
    if (!a.inicio || !a.hora) return 'Informe a data e a hora do primeiro pedido.';
    if (!a.janelaDe || !a.janelaAte) return 'Informe a janela de demanda (de … até …).';
    if (a.janelaAte <= a.janelaDe) return 'O fim da janela de demanda deve ser depois do início.';
    if (!a.responsavelId) return 'Escolha quem faz o pedido.';
    if (a.termino && a.termino.tipo === 'data' && a.termino.data && a.termino.data < a.inicio) return 'O término não pode ser antes do início.';
    for (const id of a.produtoIds) {
      const c = S.config(id);
      if (!c || c.ativo === false) return 'Produto sem produção ligada: ' + S.nomeProduto(id);
      const q = a.quantidades && a.quantidades[id];
      if (q != null) { const m = D.validarQuantidade(q, c.formato); if (m) return S.nomeProduto(id) + ': ' + m; }
    }
    return '';
  }
  function salvarAgenda(entrada, existente, aPartirDe) {
    const a = { ...entrada };
    const msg = validarAgenda(a);
    if (msg) return erro(msg);
    if (!existente && a.inicio < S.hojeIso()) return erro('A data do primeiro pedido não pode estar no passado.');
    const ok = P.transacao((d) => {
      if (!existente) { d.agendas.push({ id: S.novoId('agp'), status: 'ativa', excecoes: {}, criadaEm: S.agoraIso(), ...a }); return; }
      const antiga = d.agendas.find((x) => x.id === existente.id);
      const corte = aPartirDe || S.hojeIso();
      if (corte <= antiga.inicio) { Object.assign(antiga, a); return; }
      antiga.termino = { tipo: 'data', data: CD().isoData(CD().somarDias(CD().lerData(corte), -1)) };
      d.agendas.push({ id: S.novoId('agp'), status: 'ativa', excecoes: {}, criadaEm: S.agoraIso(), serieAnteriorId: antiga.id, ...a, inicio: corte });
    });
    return ok ? { ok: true } : erro(NAO_SALVOU);
  }
  function encerrarAgenda(id) {
    return P.transacao((d) => { d.agendas.find((x) => x.id === id).status = 'encerrada'; }) ? { ok: true } : erro(NAO_SALVOU);
  }
  const dataHora = (iso, hora) => new Date(iso + 'T' + (hora || '00:00') + ':00');
  function proximasDatas(agenda, limite = 6) {
    const feitas = new Set(P.dados.ocorrencias.filter((o) => o.agendaId === agenda.id).map((o) => o.previsto));
    return CD().ocorrencias(agenda, { limite: limite + feitas.size + 2 }).filter((o) => !feitas.has(o.previsto) && dataHora(o.data, o.hora) > new Date()).slice(0, limite);
  }
  function cancelarData(agendaId, previsto) {
    if (P.dados.ocorrencias.some((o) => o.agendaId === agendaId && o.previsto === previsto)) return erro('Esta data já virou pedido.');
    return P.transacao((d) => { d.agendas.find((x) => x.id === agendaId).excecoes[previsto] = { cancelada: true }; }) ? { ok: true } : erro(NAO_SALVOU);
  }

  /**
   * Agendador: quando chega a data e a hora, cria o pedido "para fazer" com os produtos (e as
   * quantidades pré-programadas, se houver). Entrega no mesmo dia ou no seguinte (pedido feito na véspera [19:24]).
   */
  function processarAgendas(forcar) {
    let criados = 0;
    const ok = P.transacao((d) => {
      for (const a of d.agendas.filter((x) => x.status === 'ativa')) {
        const feitas = new Set(d.ocorrencias.filter((o) => o.agendaId === a.id).map((o) => o.previsto));
        const vencidas = CD().ocorrencias(a, { ate: S.hojeIso(), limite: 400 }).filter((o) => dataHora(o.data, o.hora) <= new Date());
        if (forcar && forcar.agendaId === a.id) vencidas.push(...CD().ocorrencias(a, { limite: 400 }).filter((o) => o.previsto === forcar.previsto));
        for (const o of vencidas) {
          if (feitas.has(o.previsto)) continue;
          feitas.add(o.previsto);
          const pedidoId = S.novoId('pp');
          const entrega = a.entrega === 'seguinte' ? CD().isoData(CD().somarDias(CD().lerData(o.data), 1)) : o.data;
          d.pedidos.push({
            id: pedidoId, numero: proximoNumero(d.pedidos), origem: 'agendamento', agendaId: a.id, status: 'rascunho',
            dataEntrega: entrega, janelaDe: a.janelaDe, janelaAte: a.janelaAte, responsavelId: a.responsavelId,
            itens: a.produtoIds.map((produtoId) => ({ produtoId, quantidade: (a.quantidades || {})[produtoId] ?? null })),
            criadoEm: S.agoraIso(), eventos: [],
          });
          d.ocorrencias.push({ id: S.novoId('ocp'), agendaId: a.id, previsto: o.previsto, data: o.data, hora: o.hora, pedidoId, criadaEm: S.agoraIso() });
          criados++;
        }
      }
    });
    return ok ? criados : 0;
  }

  /* =================== Pedido de produção =================== */

  /* Estoque livre do produto produzido: saldo do Compras menos o que pedidos em andamento já reservaram
     (o que vai sair do estoque + o que a ordem deles já pôs no estoque e ainda não foi abastecido). */
  const ABERTOS = ['enviado', 'pronto'];
  function reservado(produtoId, excetoPedidoId) {
    return P.dados.pedidos.filter((p) => ABERTOS.includes(p.status) && p.id !== excetoPedidoId)
      .reduce((s, p) => s + p.itens.filter((i) => i.produtoId === produtoId).reduce((t, i) => t + (i.doEstoque || 0) + Math.min(i.entrouEstoque || 0, i.produzir || 0), 0), 0);
  }
  const saldo = (produtoId) => Number((S.produto(produtoId) || {}).saldo) || 0;
  const estoqueLivre = (produtoId, excetoPedidoId) => D.arred(saldo(produtoId) - reservado(produtoId, excetoPedidoId));

  /** Valida e planeja: com estoque, sai do livre e só o que falta vira ordem (decisão do Zé, 05/11). */
  function planejarItens(itens, pedidoId) {
    if (!itens.length) return { erro: 'Ponha a quantidade de ao menos um produto.' };
    const plano = [];
    for (const i of itens) {
      const c = S.config(i.produtoId);
      if (!c || c.ativo === false) return { erro: 'Produto sem produção ligada: ' + S.nomeProduto(i.produtoId) };
      const m = D.validarQuantidade(i.quantidade, c.formato, (S.produto(i.produtoId) || {}).unidade || 'un');
      if (m) return { erro: S.nomeProduto(i.produtoId) + ': ' + m };
      const { doEstoque, produzir } = c.comEstoque ? D.aProduzir(i.quantidade, estoqueLivre(i.produtoId, pedidoId), c.formato) : { doEstoque: 0, produzir: i.quantidade };
      if (produzir > 0 && !S.fichaPadrao(i.produtoId)) return { erro: S.nomeProduto(i.produtoId) + ' ainda não tem ficha técnica. Cadastre em Saídas · Mercadorias → Cadastros Geral Produção → MER - Ficha Técnica de Produtos.' };
      plano.push({ produtoId: i.produtoId, quantidade: i.quantidade, doEstoque, produzir });
    }
    return { itens: plano };
  }
  function criarOrdens(d, pedido) {
    for (const i of pedido.itens) if (i.produzir > 0) criarOrdem(d, { pedidoId: pedido.id, origem: 'pedido', produtoId: i.produtoId, quantidade: i.produzir, dataEntrega: pedido.dataEntrega, janelaDe: pedido.janelaDe, janelaAte: pedido.janelaAte });
    // Tudo saiu do estoque: o pedido já está pronto para abastecer.
    if (!d.ordens.some((o) => o.pedidoId === pedido.id && o.status !== 'cancelada')) { pedido.status = 'pronto'; pedido.eventos.push({ tipo: 'pronto', em: S.agoraIso(), obs: 'atendido pelo estoque' }); }
  }
  function criarOrdem(d, { pedidoId, origem, produtoId, quantidade, dataEntrega, janelaDe, janelaAte, aprovadoPor }) {
    {
      const i = { produtoId, quantidade };
      const f = d.fichas.find((x) => x.produtoId === i.produtoId && x.padrao && x.ativa !== false) || d.fichas.find((x) => x.produtoId === i.produtoId && x.ativa !== false);
      const plano = D.planoDaFicha(f, i.quantidade, S.bem);
      d.ordens.push({
        id: S.novoId('op'), numero: proximoNumero(d.ordens), pedidoId: pedidoId || null, origem, aprovadoPor: aprovadoPor || null, produtoId: i.produtoId, fichaId: f.id,
        quantidade: i.quantidade, dataEntrega, janelaDe, janelaAte, status: 'ativa',
        // Cópia do plano no momento do envio: editar a ficha depois não mexe em produção em andamento.
        etapas: plano.etapas.map((e) => ({
          etapaId: e.id, numero: e.numero, processo: e.processo, parte: e.parte || '', localId: e.localId || '', instrucao: e.instrucao || '',
          ingredientes: e.ingredientes, kg: e.kg, lotes: e.lotes, tempo: e.tempo, tempoEquipe: e.tempoEquipe,
          recursos: e.recursos.map((r) => ({ patrimonioId: r.patrimonioId || '', cargoKey: r.cargoKey || '', cargoNome: r.cargoNome || '', nivel: r.nivel || '', acompanhamento: r.acompanhamento, lotes: r.lotes, tempo: r.tempo })),
          inicio: null, fim: null, responsavelId: null,
        })),
        criadaEm: S.agoraIso(),
      });
    }
  }
  /** A loja envia o pedido "para fazer": as quantidades viram ordens de produção. */
  function enviarPedido(pedidoId, itensEntrada, responsavelId) {
    const plano = planejarItens(itensEntrada.filter((i) => i.quantidade != null), pedidoId);
    if (plano.erro) return erro(plano.erro);
    const ok = P.transacao((d) => {
      const p = d.pedidos.find((x) => x.id === pedidoId);
      if (p.status !== 'rascunho') throw new Error('estado');
      p.itens = plano.itens;
      p.status = 'enviado';
      p.enviadoEm = S.agoraIso();
      p.eventos.push({ tipo: 'enviado', em: S.agoraIso(), por: responsavelId || p.responsavelId });
      criarOrdens(d, p);
    });
    return ok ? { ok: true } : erro('Este pedido já foi enviado ou não pôde ser salvo.');
  }
  /** Pedido extra (pelo celular, durante o dia): já vai enviado. Provisório: pedido separado (pergunta 5). */
  function pedidoExtra({ dataEntrega, janelaDe, janelaAte, itens: itensEntrada, responsavelId, observacao }) {
    if (!dataEntrega) return erro('Informe o dia.');
    if (!janelaDe || !janelaAte || janelaAte <= janelaDe) return erro('Informe a janela de demanda (de … até …).');
    if (!responsavelId) return erro('Escolha quem está pedindo.');
    const plano = planejarItens(itensEntrada.filter((i) => i.quantidade != null));
    if (plano.erro) return erro(plano.erro);
    let id;
    const ok = P.transacao((d) => {
      id = S.novoId('pp');
      const p = { id, numero: proximoNumero(d.pedidos), origem: 'extra', status: 'enviado', dataEntrega, janelaDe, janelaAte, responsavelId, observacao: texto(observacao), itens: plano.itens, criadoEm: S.agoraIso(), enviadoEm: S.agoraIso(), eventos: [{ tipo: 'enviado', em: S.agoraIso(), por: responsavelId }] };
      d.pedidos.push(p);
      criarOrdens(d, p);
    });
    return ok ? { ok: true, id } : erro(NAO_SALVOU);
  }
  function cancelarPedido(pedidoId) {
    const p = P.dados.pedidos.find((x) => x.id === pedidoId);
    if (!p || !['rascunho', 'enviado'].includes(p.status)) return erro('Só dá para cancelar pedido que ainda não ficou pronto.');
    if (P.dados.ordens.some((o) => o.pedidoId === pedidoId && D.situacaoOrdem(o) !== 'aguardando')) return erro('A produção já começou este pedido. Fale com a produção antes de cancelar.');
    return P.transacao((d) => {
      const x = d.pedidos.find((y) => y.id === pedidoId);
      x.status = 'cancelado';
      x.eventos.push({ tipo: 'cancelado', em: S.agoraIso() });
      d.ordens.filter((o) => o.pedidoId === pedidoId).forEach((o) => { o.status = 'cancelada'; });
    }) ? { ok: true } : erro(NAO_SALVOU);
  }

  /* =================== Mapa: etapas =================== */

  function atualizarPedidoPronto(d, pedidoId) {
    const p = d.pedidos.find((x) => x.id === pedidoId);
    if (!p || p.status !== 'enviado') return;
    const ordens = d.ordens.filter((o) => o.pedidoId === pedidoId && o.status !== 'cancelada');
    if (ordens.length && ordens.every((o) => D.situacaoOrdem(o) === 'pronta')) { p.status = 'pronto'; p.eventos.push({ tipo: 'pronto', em: S.agoraIso() }); }
  }
  function marcarEtapa(ordemId, numero, acao, responsavelId) {
    const o0 = P.dados.ordens.find((x) => x.id === ordemId);
    if (acao === 'desfazer' && o0 && o0.estoqueLancado) return erro('Esta ordem já foi concluída e lançada no estoque: não dá para desfazer.');
    const ok = P.transacao((d) => {
      const o = d.ordens.find((x) => x.id === ordemId);
      const e = o.etapas.find((x) => x.numero === numero);
      if (acao === 'iniciar') { if (e.inicio) throw new Error('já'); e.inicio = S.agoraIso(); e.responsavelId = responsavelId || null; }
      else if (acao === 'concluir') { if (!e.inicio) e.inicio = S.agoraIso(); e.fim = S.agoraIso(); if (responsavelId) e.responsavelId = responsavelId; }
      else if (acao === 'desfazer') { const p = d.pedidos.find((x) => x.id === o.pedidoId); if (p && p.status !== 'enviado') throw new Error('estado'); e.fim = null; e.inicio = null; }
      atualizarPedidoPronto(d, o.pedidoId);
    });
    if (!ok) return erro(acao === 'desfazer' ? 'O pedido já saiu da produção: não dá para desfazer.' : 'Esta etapa já foi marcada.');
    lancarEstoque();
    return { ok: true };
  }

  /* =================== Estoque do Compras =================== */
  // Duas chaves (Compras e Produção) não gravam juntas: primeiro o movimento no Compras, marcado com o id da
  // ordem/pedido; depois a marca na Produção. Se a segunda falhar, a próxima chamada vê o movimento e não repete.
  const C = () => window.CicluzComprasDados;
  function movimento(d, prod, tipo, quantidade, extra) {
    const antes = Number(prod.saldo) || 0;
    prod.saldo = D.arred(antes + quantidade, 4);
    d.movimentos.push({ id: S.novoId('mov'), em: S.agoraIso(), produtoId: prod.id, tipo, entrada: D.arred(quantidade, 4), saldoAnterior: antes, saldoPosterior: prod.saldo, conferente: 'Produção', ...extra });
  }
  /**
   * Ordem pronta: baixa os ingredientes da ficha (consumo da produção) e, se o produto trabalha com estoque,
   * põe a produção no saldo. Ingrediente sem conversão de unidade fica como pendência na ordem.
   */
  function lancarEstoque() {
    for (const o of P.dados.ordens.filter((x) => x.status !== 'cancelada' && !x.estoqueLancado && D.situacaoOrdem(x) === 'pronta')) {
      const pendencias = [];
      const jaLancado = C().dados.movimentos.some((m) => m.ordemProducaoId === o.id);
      if (!jaLancado) {
        const ok = C().transacao((d) => {
          const extra = { ordemProducaoId: o.id, ordemNumero: o.numero };
          o.etapas.forEach((e) => (e.ingredientes || []).forEach((x) => {
            const prod = d.produtos.find((p) => p.id === x.produtoId);
            const q = D.converter(x.quantidade, x.unidade, prod);
            if (q == null) { pendencias.push((prod ? prod.descricao : 'Ingrediente') + ': sem conversão de ' + x.unidade + ' para ' + (prod ? prod.unidade : '?')); return; }
            if (q > 0) movimento(d, prod, 'consumo_producao', -q, extra);
          }));
          const c = S.config(o.produtoId);
          const feito = d.produtos.find((p) => p.id === o.produtoId);
          if (c && c.comEstoque && feito) movimento(d, feito, 'entrada_producao', o.quantidade, extra);
        });
        if (!ok) continue;
      }
      P.transacao((d) => {
        const x = d.ordens.find((y) => y.id === o.id);
        x.estoqueLancado = S.agoraIso();
        if (!jaLancado) x.pendenciasEstoque = pendencias;
        const c = S.config(o.produtoId);
        const ped = x.pedidoId && d.pedidos.find((p) => p.id === x.pedidoId);
        const item = ped && ped.itens.find((i) => i.produtoId === x.produtoId);
        if (item && c && c.comEstoque) item.entrouEstoque = D.arred((item.entrouEstoque || 0) + x.quantidade);
      });
    }
  }

  /* =================== Reposição (sugestão para aprovar, decisão do Zé 05/11) =================== */
  function emReposicao(produtoId) {
    return P.dados.ordens.filter((o) => o.origem === 'reposicao' && o.produtoId === produtoId && o.status !== 'cancelada' && !o.estoqueLancado).reduce((s, o) => s + o.quantidade, 0);
  }
  /** Produtos com estoque abaixo do mínimo (contando o livre e o que já está em reposição). */
  function sugestoesReposicao() {
    return S.produzidos().filter(({ c }) => c.comEstoque && c.estoqueMin != null).map(({ c, p }) => {
      const livre = D.arred(estoqueLivre(p.id) + emReposicao(p.id));
      return { produtoId: p.id, saldo: saldo(p.id), livre, minimo: c.estoqueMin, maximo: c.estoqueMax, quantidade: D.sugestaoReposicao(livre, c) };
    }).filter((x) => x.quantidade > 0);
  }
  function aprovarReposicao({ produtoId, quantidade, dataEntrega, janelaDe, janelaAte, responsavelId }) {
    const c = S.config(produtoId);
    if (!c || !c.comEstoque) return erro('Este produto não trabalha com estoque.');
    const m = D.validarQuantidade(quantidade, c.formato, (S.produto(produtoId) || {}).unidade || 'un');
    if (m) return erro(m);
    if (!S.fichaPadrao(produtoId)) return erro(S.nomeProduto(produtoId) + ' ainda não tem ficha técnica.');
    if (!dataEntrega) return erro('Informe o dia.');
    if (!janelaDe || !janelaAte || janelaAte <= janelaDe) return erro('Informe até quando precisa ficar pronto (de … até …).');
    if (!responsavelId) return erro('Escolha quem aprovou.');
    return P.transacao((d) => { criarOrdem(d, { origem: 'reposicao', produtoId, quantidade, dataEntrega, janelaDe, janelaAte, aprovadoPor: responsavelId }); }) ? { ok: true } : erro(NAO_SALVOU);
  }

  /* =================== Abastecimento e fechamento =================== */

  const conferenciaDoPedido = (p) => p.itens.reduce((m, i) => { const c = (S.config(i.produtoId) || {}).conferencia || 'nenhuma'; return c === '2' || m === '2' ? '2' : c === '1' || m === '1' ? '1' : 'nenhuma'; }, 'nenhuma');

  /**
   * "Conferir só a curva" (decisão do Zé, 05/11: curva ABC). Enquanto o S2 não tem as vendas, a curva A é o
   * mesmo critério da bolinha "Mais vende" do Compras: os 20% do topo em vendas dos últimos 3 meses.
   */
  const curvaA = () => C().bolinhas().vende;
  const itensAConferir = (p) => (p.conferirSo === 'curva' ? p.itens.filter((i) => curvaA().has(i.produtoId)) : p.itens);

  /** Saída da produção: quanto foi de fato (real). Com conferência, alguém confere (todos ou só a curva A). */
  function abastecer(pedidoId, reais, conferenteId, conferirSo = 'todos') {
    const p = P.dados.pedidos.find((x) => x.id === pedidoId);
    if (!p || p.status !== 'pronto') return erro('O pedido ainda não está pronto.');
    const conf = conferenciaDoPedido(p);
    if (conf !== 'nenhuma' && !conferenteId) return erro('Este pedido tem conferência: escolha quem conferiu.');
    for (const i of p.itens) { const v = reais[i.produtoId]; if (!(v >= 0)) return erro('Informe quanto foi de ' + S.nomeProduto(i.produtoId) + ' (pode ser 0).'); }
    // Produto com estoque: o que foi para a loja sai do saldo do Compras (uma vez por pedido e produto).
    const comEstoque = p.itens.filter((i) => (S.config(i.produtoId) || {}).comEstoque && reais[i.produtoId] > 0
      && !C().dados.movimentos.some((m) => m.tipo === 'saida_abastecimento' && m.producaoPedidoId === p.id && m.produtoId === i.produtoId));
    if (comEstoque.length && !C().transacao((d) => comEstoque.forEach((i) => {
      const prod = d.produtos.find((x) => x.id === i.produtoId);
      if (prod) movimento(d, prod, 'saida_abastecimento', -reais[i.produtoId], { producaoPedidoId: p.id, producaoPedidoNumero: p.numero });
    }))) return erro('Não foi possível baixar o estoque neste navegador.');
    let resultado = '';
    return P.transacao((d) => {
      const x = d.pedidos.find((y) => y.id === pedidoId);
      x.itens.forEach((i) => { i.real = reais[i.produtoId]; });
      x.conferenteId = conferenteId || null;
      x.conferirSo = conf !== 'nenhuma' && conferirSo === 'curva' ? 'curva' : 'todos';
      x.abastecidoEm = S.agoraIso();
      // 2 etapas: a loja confere a chegada; se nada estiver na curva A, não há o que conferir.
      const naLoja = conf === '2' && itensAConferir(x).length > 0;
      if (conf === '2' && !naLoja) x.itens.forEach((i) => { i.recebido = i.real; });
      x.status = naLoja ? 'conferencia_loja' : 'abastecido';
      resultado = x.status;
      x.eventos.push({ tipo: 'abastecido', em: S.agoraIso(), por: conferenteId || null });
    }) ? { ok: true, status: resultado } : erro(NAO_SALVOU);
  }
  /** Conferência em 2 etapas: a loja confere o que chegou. */
  function conferirNaLoja(pedidoId, recebidos, conferenteId) {
    const p = P.dados.pedidos.find((x) => x.id === pedidoId);
    if (!p || p.status !== 'conferencia_loja') return erro('Este pedido não espera conferência na loja.');
    if (!conferenteId) return erro('Escolha quem conferiu na loja.');
    if (conferenteId === p.conferenteId) return erro('A conferência na loja deve ser feita por outra pessoa, não por quem conferiu a saída.');
    const conferir = new Set(itensAConferir(p).map((i) => i.produtoId));
    for (const i of p.itens) { const v = recebidos[i.produtoId]; if (conferir.has(i.produtoId) && !(v >= 0)) return erro('Informe quanto chegou de ' + S.nomeProduto(i.produtoId) + '.'); }
    return P.transacao((d) => {
      const x = d.pedidos.find((y) => y.id === pedidoId);
      // Fora da curva (quando a conferência é só da curva A): chegou o que saiu.
      x.itens.forEach((i) => { i.recebido = conferir.has(i.produtoId) ? recebidos[i.produtoId] : i.real; });
      x.conferenteLojaId = conferenteId;
      x.status = 'abastecido';
      x.eventos.push({ tipo: 'conferido_loja', em: S.agoraIso(), por: conferenteId });
    }) ? { ok: true } : erro(NAO_SALVOU);
  }
  /** Fechamento da janela: sobra e descarte (substitui as colunas da folha de produção). */
  function fecharFolha(pedidoId, valores) {
    const p = P.dados.pedidos.find((x) => x.id === pedidoId);
    if (!p || p.status !== 'abastecido') return erro('Só dá para fechar pedido abastecido.');
    const itens = p.itens.map((i) => ({ nome: S.nomeProduto(i.produtoId), real: i.recebido ?? i.real, sobra: num((valores[i.produtoId] || {}).sobra), descarte: num((valores[i.produtoId] || {}).descarte) }));
    const msg = D.validarFechamento(itens);
    if (msg) return erro(msg);
    // Decisão do Zé (05/11): a sobra de produto com estoque volta para o saldo; o descarte só fica registrado.
    const voltam = p.itens.map((i, k) => ({ i, sobra: itens[k].sobra || 0 })).filter(({ i, sobra }) => sobra > 0 && (S.config(i.produtoId) || {}).comEstoque
      && !C().dados.movimentos.some((m) => m.tipo === 'sobra_retorno' && m.producaoPedidoId === p.id && m.produtoId === i.produtoId));
    if (voltam.length && !C().transacao((d) => voltam.forEach(({ i, sobra }) => {
      const prod = d.produtos.find((x) => x.id === i.produtoId);
      if (prod) movimento(d, prod, 'sobra_retorno', sobra, { producaoPedidoId: p.id, producaoPedidoNumero: p.numero });
    }))) return erro('Não foi possível devolver a sobra ao estoque neste navegador.');
    return P.transacao((d) => {
      const x = d.pedidos.find((y) => y.id === pedidoId);
      x.itens.forEach((i, k) => { i.sobra = itens[k].sobra ?? 0; i.descarte = itens[k].descarte ?? 0; });
      x.fechadoEm = S.agoraIso();
    }) ? { ok: true } : erro(NAO_SALVOU);
  }

  /* =================== Custos (C1–C5, aprovadas pelo Zé em 05/11/2026) =================== */
  function salvarParametros(entrada) {
    const p = {};
    for (const [k, rotulo] of [['horasMes', 'As horas por mês'], ['encargosPct', 'Os encargos'], ['precoKwh', 'O preço do kWh'], ['precoGasKg', 'O preço do gás']]) {
      const v = entrada[k];
      if (v == null || v === '') { p[k] = null; continue; }
      if (!(Number(v) >= 0)) return erro(rotulo + ' não pode ser negativo.');
      p[k] = Number(v);
    }
    if (p.horasMes != null && !(p.horasMes > 0)) return erro('As horas por mês devem ser maiores que zero.');
    return P.transacao((d) => { d.parametros = { ...p, atualizadoEm: S.agoraIso() }; }) ? { ok: true } : erro(NAO_SALVOU);
  }
  /** Margem do grupo: a mesma do cadastro de produtos do Compras (tabela fiscal do grupo). */
  function margemGrupo(prod) {
    const F = window.CicluzProdutoFiscal;
    const g = C().gruposMercadoria().find((x) => x.id === prod.grupoId);
    if (!F || !g) return null;
    const s = g.subgrupos.find((x) => x.id === prod.subgrupoId);
    return F.margemPadraoDoGrupo(F.TABELAS_EXEMPLO, F.grupoParaFiscal(F.TABELAS_EXEMPLO, g.nome, s ? s.nome : ''));
  }
  /** Custo da ficha para a quantidade (padrão: a quantidade-base), custo por unidade e valor sugerido. */
  function custoDaFicha(ficha, qtd) {
    const q = qtd || ficha.quantidadeBase;
    if (!(q > 0)) return null;
    const par = S.parametros();
    const cu = window.CicluzComprasServico.custoUnitario;
    const plano = D.planoDaFicha(ficha, q, S.bem);
    const r = D.custoDoPlano(plano, {
      custoIngrediente: (x) => { const prod = S.produto(x.produtoId); const conv = D.converter(x.quantidade, x.unidade, prod); const c = prod ? cu(prod) : 0; return conv == null || !(c > 0) ? null : conv * c; },
      custoMinuto: (rec) => { const cg = S.cargo(rec.cargoKey, rec.cargoNome); return cg ? D.custoMinuto(cg.salario, par) : null; },
      precoEnergia: (tipo) => { const v = tipo === 'gas' ? par.precoGasKg : par.precoKwh; return v > 0 ? v : null; },
    });
    const prod = S.produto(ficha.produtoId) || {};
    const unitario = D.centavos(r.total / q);
    return { ...r, quantidade: q, unitario, sugerido: D.valorSugerido(unitario, prod.margem, margemGrupo(prod)) };
  }

  window.CicluzProducaoServico = {
    salvarParametros, custoDaFicha,
    salvarBem, excluirBem, alternarBem, usosDoBem,
    salvarConfig, desligarProducao,
    salvarFicha, duplicarFicha, definirPadrao, excluirFicha,
    salvarAgenda, encerrarAgenda, proximasDatas, cancelarData, processarAgendas,
    enviarPedido, pedidoExtra, cancelarPedido,
    marcarEtapa, conferenciaDoPedido, abastecer, conferirNaLoja, fecharFolha,
    estoqueLivre, lancarEstoque, sugestoesReposicao, aprovarReposicao, itensAConferir,
  };
})();
