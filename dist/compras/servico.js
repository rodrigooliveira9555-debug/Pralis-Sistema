/*
 * Compras — operações (equivalentes aos services da API do S1), sobre os dados locais.
 * Telas chamam estas funções; cada uma valida, grava numa transação e devolve
 * { ok: true, ... } ou { erro: 'mensagem' }.
 *
 * Fluxo: agenda → (na data) ocorrência + solicitação → envio abre a cotação (rodada) com um
 * convite por fornecedor → resposta do fornecedor → compra automática ou decisão do comprador
 * → pedido "Comprado" → recebimento (entrada de estoque). O outro movimento é o ajuste de conferência aprovada.
 */
(function () {
  'use strict';
  const D = window.CicluzComprasDominio;
  const S = window.CicluzComprasDados;
  const erro = (m) => ({ erro: m });
  const agora = () => new Date();
  const dataHora = (iso, hora) => new Date(iso + 'T' + (hora || '00:00') + ':00');
  const proximoNumero = (lista) => lista.reduce((m, x) => Math.max(m, x.numero || 0), 0) + 1;

  /* =================== Agendamento de pedidos =================== */

  function validarAgenda(a) {
    if (!a.grupoId) return 'Escolha o grupo.';
    if (!a.produtoIds || !a.produtoIds.length) return 'Marque ao menos um produto na lista.';
    if (a.produtoIds.length > 500) return 'No máximo 500 produtos por agendamento.';
    if (!a.inicio || !a.hora) return 'Informe a data e a hora do primeiro pedido.';
    if (!a.responsavelId) return 'Escolha o responsável por executar.';
    if (!(a.prazoHoras >= 1 && a.prazoHoras <= 720)) return 'O tempo de resposta deve ficar entre 1 e 720 horas.';
    if (Boolean(a.recebimentoInicio) !== Boolean(a.recebimentoFim)) return 'Preencha os dois horários de recebimento ou nenhum.';
    if (a.recebimentoInicio && a.recebimentoFim <= a.recebimentoInicio) return 'O fim do recebimento deve ser depois do início.';
    if (a.termino && a.termino.tipo === 'data' && a.termino.data && a.termino.data < a.inicio) return 'O término não pode ser antes do início.';
    for (const id of a.produtoIds) {
      const p = S.produto(id);
      if (!p || !p.liberadoCompra || p.status !== 'ativo') return 'Produto não liberado para compra: ' + (p ? p.descricao : id);
    }
    return '';
  }

  function salvarAgenda(entrada, existente, aPartirDe) {
    const a = { ...entrada };
    const msg = validarAgenda(a);
    if (msg) return erro(msg);
    if (!existente && a.inicio < S.hojeIso()) return erro('A data do primeiro pedido não pode estar no passado.');
    const r = S.transacao((d) => {
      if (!existente) {
        d.agendas.push({ id: S.novoId('ag'), status: 'ativa', excecoes: {}, criadaEm: S.agoraIso(), ...a });
        return;
      }
      // Edição divide a série: a antiga termina antes de "a partir de", a nova começa nela (como no S1).
      const antiga = d.agendas.find((x) => x.id === existente.id);
      const corte = aPartirDe || S.hojeIso();
      if (corte <= antiga.inicio) { Object.assign(antiga, a); return; }
      antiga.termino = { tipo: 'data', data: D.isoData(D.somarDias(D.lerData(corte), -1)) };
      d.agendas.push({ id: S.novoId('ag'), status: 'ativa', excecoes: {}, criadaEm: S.agoraIso(), serieAnteriorId: antiga.id, ...a, inicio: corte });
    });
    return r ? { ok: true } : erro('Não foi possível salvar neste navegador.');
  }

  /** "Excluir todas as futuras": encerra a série. */
  function encerrarAgenda(id) {
    return S.transacao((d) => { d.agendas.find((x) => x.id === id).status = 'encerrada'; }) ? { ok: true } : erro('Não foi possível salvar.');
  }
  function cancelarData(agendaId, previsto) {
    if (S.dados.ocorrencias.some((o) => o.agendaId === agendaId && o.previsto === previsto && o.situacao !== 'cancelada')) return erro('Esta data já virou pedido e não pode ser cancelada.');
    return S.transacao((d) => { const a = d.agendas.find((x) => x.id === agendaId); a.excecoes[previsto] = { cancelada: true }; }) ? { ok: true } : erro('Não foi possível salvar.');
  }
  function moverData(agendaId, previsto, data, hora) {
    if (!data || !hora) return erro('Informe a nova data e a nova hora.');
    if (S.dados.ocorrencias.some((o) => o.agendaId === agendaId && o.previsto === previsto)) return erro('Esta data já virou pedido.');
    return S.transacao((d) => { const a = d.agendas.find((x) => x.id === agendaId); a.excecoes[previsto] = { data, hora }; }) ? { ok: true } : erro('Não foi possível salvar.');
  }

  /** Datas futuras ainda não processadas da agenda. */
  function proximasDatas(agenda, limite = 6) {
    const feitas = new Set(S.dados.ocorrencias.filter((o) => o.agendaId === agenda.id).map((o) => o.previsto));
    return D.ocorrencias(agenda, { limite: limite + feitas.size + 2 }).filter((o) => !feitas.has(o.previsto) && dataHora(o.data, o.hora) > agora()).slice(0, limite);
  }

  /**
   * Agendador (no S1 roda a cada 60 s no servidor): quando chega a data, cria a ocorrência
   * "aguardando conferência" e uma solicitação sem quantidade, e avisa o responsável.
   * Nunca envia cotação nem mexe em estoque. `forcar` gera uma data específica agora (simulação).
   */
  function processarAgendas(forcar) {
    let criadas = 0;
    const ok = S.transacao((d) => {
      for (const a of d.agendas.filter((x) => x.status === 'ativa')) {
        const feitas = new Set(d.ocorrencias.filter((o) => o.agendaId === a.id).map((o) => o.previsto));
        const vencidas = D.ocorrencias(a, { ate: S.hojeIso(), limite: 400 }).filter((o) => dataHora(o.data, o.hora) <= agora());
        if (forcar && forcar.agendaId === a.id) vencidas.push(...D.ocorrencias(a, { limite: 400 }).filter((o) => o.previsto === forcar.previsto));
        for (const o of vencidas) {
          if (feitas.has(o.previsto)) continue;
          feitas.add(o.previsto);
          const solicitacaoId = S.novoId('sol');
          d.solicitacoes.push({ id: solicitacaoId, origem: 'agendamento', agendaId: a.id, grupoId: a.grupoId, status: 'rascunho', itens: [], criadaEm: S.agoraIso(), responsavelId: a.responsavelId });
          d.ocorrencias.push({ id: S.novoId('oc'), agendaId: a.id, previsto: o.previsto, data: o.data, hora: o.hora, situacao: 'aguardando_conferencia', solicitacaoId, criadaEm: S.agoraIso() });
          criadas++;
        }
      }
    });
    return ok ? criadas : 0;
  }

  /* =================== Solicitação de compra → cotação =================== */

  /** Fornecedores que podem receber o produto: aprovados no catálogo, ativos e com WhatsApp. */
  function fornecedoresConvidaveis(produtoId) {
    return S.fornecedoresDoProduto(produtoId).filter(D.podeConvidar);
  }

  /** Recusa o pedido que faria o saldo passar do estoque máximo (S1: ESTOQUE_MAXIMO_ULTRAPASSADO). */
  function erroDeTeto(itens) {
    const pendencias = D.pendenciasDeTeto(itens.map((i) => {
      const p = S.produto(i.produtoId) || {};
      return { produtoId: i.produtoId, descricao: p.descricao, quantidade: Number(i.quantidade), saldo: p.saldo, estoqueMax: p.estoqueMax };
    }));
    return pendencias.length ? erro('Quantidade pedida passa do estoque máximo configurado. ' + pendencias.join('; ') + '.') : null;
  }

  /**
   * Envia aos fornecedores. itens: [{ produtoId, quantidade, fornecedorId? }]
   * fornecedorId é usado quando o produto não tem fornecedor no catálogo (vínculo nasce aprovado).
   */
  function enviarSolicitacao(ocorrenciaId, itens) {
    const oc = S.dados.ocorrencias.find((o) => o.id === ocorrenciaId);
    if (!oc || oc.situacao !== 'aguardando_conferencia') return erro('Este pedido não está mais esperando envio.');
    const agenda = S.dados.agendas.find((a) => a.id === oc.agendaId);
    const validos = itens.filter((i) => Number(i.quantidade) > 0);
    if (!validos.length) return erro('Ponha a quantidade de ao menos um produto.');
    const teto = erroDeTeto(validos);
    if (teto) return teto;
    const semFornecedor = [];
    const porFornecedor = new Map();
    for (const i of validos) {
      if (!agenda.produtoIds.includes(i.produtoId)) return erro('Produto fora do agendamento.');
      let fs = fornecedoresConvidaveis(i.produtoId).map((f) => f.id);
      if (!fs.length && i.fornecedorId) {
        if (!D.podeConvidar(S.fornecedor(i.fornecedorId))) return erro('Fornecedor escolhido não pode ser convidado: ' + D.motivoNaoConvidavel(S.fornecedor(i.fornecedorId)));
        fs = [i.fornecedorId];
      }
      if (!fs.length) { semFornecedor.push(S.produto(i.produtoId).descricao); continue; }
      fs.forEach((f) => { if (!porFornecedor.has(f)) porFornecedor.set(f, []); porFornecedor.get(f).push(i.produtoId); });
    }
    if (semFornecedor.length) return erro('Escolha o fornecedor de: ' + semFornecedor.join(', '));
    let rodadaId = null;
    const ok = S.transacao((d) => {
      const sol = d.solicitacoes.find((s) => s.id === oc.solicitacaoId);
      sol.itens = validos.map((i) => ({ produtoId: i.produtoId, quantidade: Number(i.quantidade) }));
      // Vínculo escolhido na hora entra no catálogo como aprovado.
      validos.filter((i) => i.fornecedorId).forEach((i) => {
        const v = d.catalogo.find((x) => x.fornecedorId === i.fornecedorId && x.produtoId === i.produtoId);
        if (v) v.status = 'aprovado';
        else d.catalogo.push({ id: S.novoId('v'), fornecedorId: i.fornecedorId, produtoId: i.produtoId, origem: 'compras', status: 'aprovado', precoOfertado: null, criadoEm: S.agoraIso() });
      });
      rodadaId = abrirRodada(d, sol, porFornecedor, { prazoHoras: agenda.prazoHoras, margemPct: agenda.margemPct, recebimentoInicio: agenda.recebimentoInicio, recebimentoFim: agenda.recebimentoFim, teto: null });
      oc.situacao = 'enviada';
      d.ocorrencias.find((o) => o.id === oc.id).situacao = 'enviada';
    });
    return ok ? { ok: true, rodadaId } : erro('Não foi possível enviar neste navegador.');
  }

  function abrirRodada(d, sol, porFornecedor, cfg) {
    const id = S.novoId('rod');
    const expira = new Date(Date.now() + cfg.prazoHoras * 3600000).toISOString();
    d.rodadas.push({
      id, numero: proximoNumero(d.rodadas), solicitacaoId: sol.id, status: 'aberta', criadaEm: S.agoraIso(), expiraEm: expira,
      prazoHoras: cfg.prazoHoras, margemPct: cfg.margemPct, teto: cfg.teto, recebimentoInicio: cfg.recebimentoInicio || '', recebimentoFim: cfg.recebimentoFim || '',
      // Preço-base congelado no envio.
      itens: sol.itens.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade, referencia: S.referencia(i.produtoId) })),
    });
    for (const [fornecedorId, produtoIds] of porFornecedor) {
      d.convites.push({ id: S.novoId('cv'), rodadaId: id, fornecedorId, token: S.novoId('tk'), status: 'aberto', whatsapp: 'enviado', itens: produtoIds, resposta: null, rascunho: null, estados: {}, contrapropostas: {}, criadoEm: S.agoraIso() });
    }
    sol.status = 'em_cotacao';
    return id;
  }

  /** Pedido urgente: um fornecedor, fora da agenda. itens: [{ produtoId, quantidade }] */
  function pedidoUrgente({ fornecedorId, itens, observacao, margemPct = 10 }) {
    const f = S.fornecedor(fornecedorId);
    if (!f) return erro('Escolha o fornecedor.');
    if (!D.podeConvidar(f)) return erro('Fornecedor não pode receber cotação: ' + D.motivoNaoConvidavel(f));
    const validos = itens.filter((i) => i.produtoId && Number(i.quantidade) > 0);
    if (!validos.length) return erro('Adicione ao menos um item com quantidade.');
    if (new Set(validos.map((i) => i.produtoId)).size !== validos.length) return erro('Há produto repetido na lista.');
    const teto = erroDeTeto(validos);
    if (teto) return teto;
    let rodadaId = null;
    const ok = S.transacao((d) => {
      const sol = { id: S.novoId('sol'), origem: 'rapida', grupoId: S.produto(validos[0].produtoId).grupoId, status: 'rascunho', itens: validos.map((i) => ({ produtoId: i.produtoId, quantidade: Number(i.quantidade) })), observacao: observacao || '', criadaEm: S.agoraIso(), responsavelId: 'u-jose' };
      d.solicitacoes.push(sol);
      rodadaId = abrirRodada(d, sol, new Map([[fornecedorId, sol.itens.map((i) => i.produtoId)]]), { prazoHoras: 24, margemPct: Number(margemPct) || 0, teto: null });
    });
    return ok ? { ok: true, rodadaId } : erro('Não foi possível salvar.');
  }

  /* =================== Resposta do fornecedor (página pública) =================== */

  const conviteDoToken = (token) => S.dados.convites.find((c) => c.token === token);

  /** Itens já comprados na rodada (por qualquer fornecedor). */
  function compradosNaRodada(d, rodadaId) {
    const s = new Set();
    d.convites.filter((c) => c.rodadaId === rodadaId).forEach((c) => Object.entries(c.estados).forEach(([p, e]) => { if (e.situacao === 'comprado') s.add(p); }));
    return s;
  }
  function gastoNaRodada(d, rodadaId) {
    return d.pedidos.filter((p) => p.rodadaId === rodadaId && p.status !== 'cancelado').reduce((t, p) => t + p.itens.reduce((u, i) => u + i.custo * i.pedida, 0), 0);
  }

  /** Cria ou anexa o item ao pedido "Comprado" do fornecedor nesta rodada. */
  function comprar(d, convite, produtoId, custo, quantidade, modo) {
    const rod = d.rodadas.find((r) => r.id === convite.rodadaId);
    let ped = d.pedidos.find((p) => p.rodadaId === rod.id && p.fornecedorId === convite.fornecedorId && p.status === 'confirmado');
    if (!ped) {
      ped = { id: S.novoId('ped'), numero: proximoNumero(d.pedidos), tipo: 'rodada', origem: d.solicitacoes.find((s) => s.id === rod.solicitacaoId)?.origem || 'agendamento', rodadaId: rod.id, fornecedorId: convite.fornecedorId, status: 'confirmado', itens: [], eventos: [], criadoEm: S.agoraIso() };
      ped.eventos.push({ em: S.agoraIso(), status: 'confirmado', quem: modo === 'automatica' ? 'Compra automática' : 'José · Compras', obs: 'Cotação nº ' + rod.numero + '. WhatsApp "pode entregar" enviado ao fornecedor.' });
      d.pedidos.push(ped);
    }
    const solicitada = rod.itens.find((i) => i.produtoId === produtoId)?.quantidade ?? +quantidade;
    ped.itens.push({ id: S.novoId('pi'), produtoId, solicitada, pedida: +quantidade, recebida: 0, devolvida: 0, pendente: +quantidade, custo: +custo, modo });
    convite.estados[produtoId] = { situacao: 'comprado', motivo: '', modo };
    // Quem respondeu e não ganhou o item passa a "já comprado de outro".
    d.convites.filter((c) => c.rodadaId === rod.id && c.id !== convite.id && c.itens.includes(produtoId) && c.resposta).forEach((c) => {
      if (c.estados[produtoId]?.situacao !== 'comprado') c.estados[produtoId] = { situacao: 'retornado', motivo: 'ja_comprado' };
    });
  }

  /** Reavalia os itens de um convite com resposta enviada (compra automática). */
  function avaliarConvite(d, convite) {
    const rod = d.rodadas.find((r) => r.id === convite.rodadaId);
    if (rod.status !== 'aberta') return;
    for (const produtoId of convite.itens) {
      if (convite.estados[produtoId]?.situacao === 'comprado') continue;
      const resp = convite.resposta.itens[produtoId] || { indisponivel: true };
      const item = rod.itens.find((i) => i.produtoId === produtoId);
      const r = D.avaliarItem({
        indisponivel: resp.indisponivel, custo: resp.valor, referencia: item.referencia, pedida: item.quantidade,
        disponivel: resp.quantidade == null ? item.quantidade : resp.quantidade, margemPct: rod.margemPct, teto: rod.teto,
        gastoComprometido: gastoNaRodada(d, rod.id), jaComprado: compradosNaRodada(d, rod.id).has(produtoId),
      });
      if (r.situacao === 'comprado') comprar(d, convite, produtoId, resp.valor, resp.quantidade == null ? item.quantidade : resp.quantidade, 'automatica');
      else convite.estados[produtoId] = r;
    }
    const pendente = convite.itens.some((p) => convite.estados[p]?.situacao === 'com_aumento' || (convite.estados[p]?.situacao === 'retornado' && convite.estados[p].motivo !== 'indisponivel' && convite.estados[p].motivo !== 'ja_comprado'));
    convite.status = pendente ? 'aguardando_comprador' : 'encerrado';
    atualizarSolicitacao(d, rod);
  }

  /**
   * Salva a resposta do fornecedor. enviar=false é rascunho ("Cotado" na matriz).
   * resposta: { itens: { [produtoId]: { indisponivel, motivo, valor, quantidade } }, frete, entrega, pagamento, observacao }
   */
  function responderConvite(token, resposta, enviar) {
    const c = conviteDoToken(token);
    if (!c) return erro('Link inválido.');
    const rod = S.dados.rodadas.find((r) => r.id === c.rodadaId);
    if (rod.status !== 'aberta' || c.status === 'revogado') return erro('Esta cotação já foi encerrada.');
    if (c.resposta && !enviar) return erro('A resposta já foi enviada.');
    if (enviar) {
      for (const p of c.itens) {
        const r = resposta.itens[p] || {};
        if (!r.indisponivel && !(D.lerNumero(r.valor) > 0)) return erro('Informe o valor unitário de ' + S.produto(p).descricao + ' ou marque que não tem.');
      }
    }
    const limpa = { ...resposta, itens: Object.fromEntries(c.itens.map((p) => { const r = resposta.itens[p] || {}; return [p, { indisponivel: Boolean(r.indisponivel), motivo: r.motivo || '', valor: D.lerNumero(r.valor), quantidade: D.lerNumero(r.quantidade) }]; })) };
    const ok = S.transacao((d) => {
      const cv = d.convites.find((x) => x.id === c.id);
      if (!enviar) { cv.rascunho = limpa; return; }
      cv.resposta = { ...limpa, enviadaEm: S.agoraIso() };
      cv.rascunho = null;
      avaliarConvite(d, cv);
    });
    return ok ? { ok: true } : erro('Não foi possível salvar.');
  }

  /**
   * Fornecedor aceita a contraproposta do comprador: o valor proposto vira a resposta dele e passa pela MESMA
   * regra da compra automática (referência, teto e margem), como no S1. Dentro da regra, compra sozinho;
   * fora dela, o item volta para o comprador decidir.
   */
  function aceitarContraproposta(token, produtoId) {
    const c = conviteDoToken(token);
    if (!c) return erro('Link inválido.');
    const cp = c.contrapropostas[produtoId];
    if (!cp || cp.status !== 'pendente') return erro('Não há contraproposta pendente.');
    const rod = S.dados.rodadas.find((r) => r.id === c.rodadaId);
    if (rod.status !== 'aberta') return erro('Esta cotação já foi encerrada.');
    const ok = S.transacao((d) => {
      const cv = d.convites.find((x) => x.id === c.id);
      if (compradosNaRodada(d, cv.rodadaId).has(produtoId)) throw new Error('ja comprado');
      cv.contrapropostas[produtoId].status = 'aceita';
      cv.resposta.itens[produtoId] = { ...cv.resposta.itens[produtoId], indisponivel: false, valor: cp.valor };
      avaliarConvite(d, cv);
    });
    if (!ok) return erro('Este produto já foi comprado de outro fornecedor.');
    const estado = S.dados.convites.find((x) => x.id === c.id)?.estados[produtoId];
    return { ok: true, comprado: estado?.situacao === 'comprado' };
  }

  /* ---------- Depois de comprado: separação e "produtos que também vendo" ---------- */

  /** Pedidos que o fornecedor ganhou nesta cotação (para a página dele). */
  function pedidosDoConvite(token) {
    const c = conviteDoToken(token);
    if (!c) return [];
    return S.dados.pedidos.filter((p) => p.rodadaId === c.rodadaId && p.fornecedorId === c.fornecedorId && p.status !== 'cancelado');
  }

  /**
   * O fornecedor ajusta a quantidade de cada item comprado ao que tem em estoque, dentro da margem da
   * cotação, sem nova aprovação. Só enquanto o pedido está "Comprado" (nada recebido). quantidades: { [itemId]: n }
   */
  function registrarSeparacao(token, quantidades) {
    const c = conviteDoToken(token);
    if (!c) return erro('Link inválido.');
    const rod = S.dados.rodadas.find((r) => r.id === c.rodadaId);
    const pedidos = pedidosDoConvite(token);
    if (!pedidos.length) return erro('Nenhum pedido seu nesta cotação.');
    if (pedidos.some((p) => p.status !== 'confirmado')) return erro('Este pedido já começou a ser recebido ou foi cancelado.');
    const mudancas = [];
    for (const p of pedidos) for (const item of p.itens) {
      if (!(item.id in quantidades)) continue;
      const q = D.lerNumero(quantidades[item.id]);
      const base = item.solicitada ?? item.pedida;
      if (!D.quantidadeDentroDaMargem(base, q, rod.margemPct)) {
        const { minimo, maximo } = D.limitesDaMargem(base, rod.margemPct);
        return erro(S.produto(item.produtoId).descricao + ': a quantidade precisa ficar entre ' + D.numero(minimo) + ' e ' + D.numero(maximo) + '.');
      }
      if (q !== item.pedida) mudancas.push({ pedidoId: p.id, itemId: item.id, de: item.pedida, para: q });
    }
    if (!mudancas.length) return { ok: true, mudou: false };
    const ok = S.transacao((d) => {
      for (const pid of new Set(mudancas.map((m) => m.pedidoId))) {
        const ped = d.pedidos.find((x) => x.id === pid);
        const texto = [];
        mudancas.filter((m) => m.pedidoId === pid).forEach((m) => {
          const it = ped.itens.find((x) => x.id === m.itemId);
          it.pedida = m.para;
          it.pendente = m.para;
          texto.push(S.produto(it.produtoId).descricao + ': ' + D.numero(m.de) + ' → ' + D.numero(m.para));
        });
        ped.eventos.push({ em: S.agoraIso(), status: 'confirmado', quem: S.fornecedor(ped.fornecedorId).nome, obs: 'Fornecedor ajustou ao estoque dele: ' + texto.join('; ') });
      }
    });
    return ok ? { ok: true, mudou: true } : erro('Não foi possível salvar.');
  }

  /** Lista do que a padaria compra (ativos e liberados), marcando o que este fornecedor já vende. */
  function produtosParaFornecedor(token) {
    const c = conviteDoToken(token);
    if (!c) return [];
    return S.dados.produtos.filter((p) => p.status === 'ativo' && p.liberadoCompra)
      .map((p) => {
        const v = S.dados.catalogo.find((x) => x.fornecedorId === c.fornecedorId && x.produtoId === p.id);
        return { produtoId: p.id, descricao: p.descricao, grupo: S.nomeGrupo(p.grupoId), jaVende: Boolean(v && (v.status === 'aprovado' || v.status === 'pendente')), vinculo: v ? v.status : null };
      })
      .sort((a, b) => a.descricao.localeCompare(b.descricao, 'pt-BR'));
  }
  /** O fornecedor marca o que vende: vínculo nasce aprovado; vínculo existente (até rejeitado) não é tocado. */
  function marcarProdutosQueVende(token, produtoIds) {
    const c = conviteDoToken(token);
    if (!c) return erro('Link inválido.');
    if (!produtoIds.length) return erro('Marque ao menos um produto.');
    let criados = 0;
    const ok = S.transacao((d) => {
      for (const produtoId of produtoIds) {
        if (!d.produtos.some((p) => p.id === produtoId)) continue;
        if (d.catalogo.some((v) => v.fornecedorId === c.fornecedorId && v.produtoId === produtoId)) continue;
        d.catalogo.push({ id: S.novoId('v'), fornecedorId: c.fornecedorId, produtoId, origem: 'fornecedor', status: 'aprovado', precoOfertado: null, criadoEm: S.agoraIso(), observacao: 'Marcado pelo fornecedor na página da cotação' });
        criados++;
      }
    });
    return ok ? { ok: true, vinculados: criados } : erro('Não foi possível salvar.');
  }

  /* =================== Decisões do comprador =================== */

  /** Aceitar uma oferta: "só desta vez" ou reajustando a referência. Comprar é irreversível. */
  function aceitarOferta(conviteId, produtoId, reajustarReferencia) {
    const c = S.dados.convites.find((x) => x.id === conviteId);
    const rod = S.dados.rodadas.find((r) => r.id === c.rodadaId);
    if (rod.status !== 'aberta') return erro('A cotação está fechada.');
    const resp = c.resposta?.itens[produtoId];
    if (!resp || resp.indisponivel) return erro('Item indisponível neste fornecedor.');
    if (!(resp.valor > 0)) return erro('Custo não calculado.');
    if (compradosNaRodada(S.dados, rod.id).has(produtoId)) return erro('Este produto já foi comprado de outro fornecedor.');
    const ok = S.transacao((d) => {
      const cv = d.convites.find((x) => x.id === conviteId);
      const item = d.rodadas.find((r) => r.id === cv.rodadaId).itens.find((i) => i.produtoId === produtoId);
      comprar(d, cv, produtoId, resp.valor, resp.quantidade ?? item.quantidade, 'excecao');
      if (reajustarReferencia) S.definirReferencia(d, produtoId, resp.valor, 'rodada');
      avaliarConvite(d, cv);
    });
    return ok ? { ok: true } : erro('Não foi possível salvar.');
  }

  function contrapropor(conviteId, produtoId, valorTexto) {
    const valor = D.lerNumero(valorTexto);
    if (!(valor >= 0.01)) return erro('Informe um valor a partir de R$ 0,01.');
    if (Math.round(valor * 100) !== valor * 100) return erro('Use no máximo 2 casas decimais.');
    const c = S.dados.convites.find((x) => x.id === conviteId);
    if (S.dados.rodadas.find((r) => r.id === c.rodadaId).status !== 'aberta') return erro('A cotação está fechada.');
    return S.transacao((d) => { d.convites.find((x) => x.id === conviteId).contrapropostas[produtoId] = { valor, status: 'pendente', em: S.agoraIso() }; }) ? { ok: true } : erro('Não foi possível salvar.');
  }

  /** Encerrar a cotação: a referência só desce; produto sem referência ganha a menor oferta. */
  function encerrarRodada(rodadaId, motivo = 'manual') {
    const rod = S.dados.rodadas.find((r) => r.id === rodadaId);
    if (!rod || rod.status !== 'aberta') return erro('A cotação já está fechada.');
    const ok = S.transacao((d) => {
      const r = d.rodadas.find((x) => x.id === rodadaId);
      r.status = 'fechada';
      r.motivoFechamento = motivo;
      r.fechadaEm = S.agoraIso();
      const convites = d.convites.filter((c) => c.rodadaId === rodadaId);
      for (const item of r.itens) {
        const ofertas = convites.map((c) => c.resposta?.itens[item.produtoId]).filter((x) => x && !x.indisponivel).map((x) => x.valor);
        const atual = S.referencia(item.produtoId);
        const nova = D.novaReferencia(atual, ofertas);
        if (nova !== atual) S.definirReferencia(d, item.produtoId, nova, 'rodada');
      }
      convites.forEach((c) => { if (c.status !== 'revogado') c.status = 'encerrado'; });
      atualizarSolicitacao(d, r);
      // S1 (statusSolicitacaoAposFechamento): fechada, a solicitação é "comprada" ou "parcialmente comprada",
      // inclusive sem nada comprado; o item sem vencedor continua para o comprador decidir.
      const sol = d.solicitacoes.find((s) => s.id === r.solicitacaoId);
      if (sol && sol.status !== 'encerrada' && sol.status !== 'cancelada') {
        sol.status = compradosNaRodada(d, r.id).size >= r.itens.length && r.itens.length ? 'comprada' : 'parcialmente_comprada';
      }
    });
    return ok ? { ok: true } : erro('Não foi possível salvar.');
  }
  /** Fechamento por prazo (no S1, o mesmo tick de 60 s). */
  function fecharVencidas() {
    S.dados.rodadas.filter((r) => r.status === 'aberta' && new Date(r.expiraEm) <= agora()).forEach((r) => encerrarRodada(r.id, 'prazo'));
  }
  /**
   * Encerrar a solicitação sem comprar o que sobrou. Como no S1, só depois que a cotação fechou e só para a
   * solicitação parcialmente comprada: com a cotação aberta o fornecedor ainda pode vender os itens.
   */
  function encerrarSolicitacao(solicitacaoId) {
    const s = S.dados.solicitacoes.find((x) => x.id === solicitacaoId);
    if (!s) return erro('Solicitação não encontrada.');
    const aberta = S.dados.rodadas.some((r) => r.solicitacaoId === s.id && r.status === 'aberta');
    if (aberta || s.status !== 'parcialmente_comprada') {
      return erro('Só é possível encerrar uma solicitação parcialmente comprada, com a cotação já fechada.');
    }
    return S.transacao((d) => { d.solicitacoes.find((x) => x.id === solicitacaoId).status = 'encerrada'; })
      ? { ok: true }
      : erro('Não foi possível salvar.');
  }
  function atualizarSolicitacao(d, rod) {
    const sol = d.solicitacoes.find((s) => s.id === rod.solicitacaoId);
    if (!sol || sol.status === 'encerrada' || sol.status === 'cancelada') return;
    const comprados = compradosNaRodada(d, rod.id);
    if (comprados.size === rod.itens.length) sol.status = 'comprada';
    else if (comprados.size) sol.status = 'parcialmente_comprada';
  }

  /** Estado de cada (convite, produto) para a matriz e a cotação do produto. */
  function estadoOferta(c, produtoId) {
    if (c.estados[produtoId]) return c.estados[produtoId];
    if (c.resposta) return { situacao: 'retornado', motivo: 'indisponivel' };
    if (c.rascunho) return { situacao: 'cotado', motivo: '' };
    return { situacao: 'aguardando', motivo: 'sem_resposta' };
  }

  /* =================== Pedidos a receber =================== */

  function receberPedido(pedidoId, entrada, observacao) {
    const p = S.dados.pedidos.find((x) => x.id === pedidoId);
    if (!p) return erro('Pedido não encontrado.');
    const r = D.aplicarRecebimento(p.status, p.itens, entrada);
    if (r.erro) return r;
    const ok = S.transacao((d) => {
      const ped = d.pedidos.find((x) => x.id === pedidoId);
      for (const novo of r.itens) {
        if (novo.entrou > 0) {
          const prod = d.produtos.find((x) => x.id === novo.produtoId);
          const antes = Number(prod.saldo) || 0;
          prod.saldo = +(antes + novo.entrou).toFixed(3);
          // Recebimento conferido é a entrada de estoque da compra.
          d.movimentos.push({ id: S.novoId('mov'), em: S.agoraIso(), produtoId: prod.id, pedidoId: ped.id, tipo: 'recebimento_compra', entrada: novo.entrou, saldoAnterior: antes, saldoPosterior: prod.saldo, conferente: 'Ana · Estoque' });
        }
        const item = ped.itens.find((i) => i.id === novo.id);
        Object.assign(item, { recebida: novo.recebida, devolvida: novo.devolvida, pendente: novo.pendente });
        if (novo.devolveu > 0) (item.devolucoes = item.devolucoes || []).push({ quantidade: novo.devolveu, motivo: novo.motivo, em: S.agoraIso() });
      }
      ped.status = r.status;
      ped.eventos.push({ em: S.agoraIso(), status: r.status, quem: 'Ana · Estoque', obs: observacao || '' });
    });
    return ok ? { ok: true, status: r.status } : erro('Não foi possível salvar.');
  }
  function cancelarPedido(pedidoId) {
    const p = S.dados.pedidos.find((x) => x.id === pedidoId);
    if (!p || p.status === 'recebido' || p.status === 'cancelado') return erro('Este pedido não pode ser cancelado.');
    return S.transacao((d) => { const x = d.pedidos.find((y) => y.id === pedidoId); x.status = 'cancelado'; x.eventos.push({ em: S.agoraIso(), status: 'cancelado', quem: 'José · Compras', obs: '' }); }) ? { ok: true } : erro('Não foi possível salvar.');
  }

  /* =================== Conferências de estoque =================== */

  function produtosDoRecorte(f) {
    const b = S.bolinhas();
    return S.dados.produtos.filter((p) => p.status === 'ativo'
      && (!f.grupoId || p.grupoId === f.grupoId) && (!f.subgrupoId || p.subgrupoId === f.subgrupoId)
      && (!f.area || p.areaEstoque === f.area) && (!f.setor || p.setorEstoque === f.setor) && (!f.localVenda || S.locaisDeVenda(p).includes(f.localVenda))
      && (!f.ranking || !f.ranking.length || f.ranking.some((k) => b[k].has(p.id))));
  }
  function salvarAgendaConferencia(entrada, existente) {
    if (!entrada.responsavelId) return erro('Escolha quem conta.');
    if (!entrada.inicio || !entrada.hora) return erro('Informe a data e a hora da primeira conferência.');
    if (!existente && entrada.inicio < S.hojeIso()) return erro('A primeira conferência não pode estar no passado.');
    if (!produtosDoRecorte(entrada.filtro).length) return erro('Nenhum produto ativo neste recorte.');
    return S.transacao((d) => {
      if (existente) Object.assign(d.conferenciaAgendas.find((x) => x.id === existente.id), entrada);
      else d.conferenciaAgendas.push({ id: S.novoId('ca'), status: 'ativa', excecoes: {}, criadaEm: S.agoraIso(), ...entrada });
    }) ? { ok: true } : erro('Não foi possível salvar.');
  }
  function encerrarAgendaConferencia(id) {
    return S.transacao((d) => { d.conferenciaAgendas.find((x) => x.id === id).status = 'encerrada'; }) ? { ok: true } : erro('Não foi possível salvar.');
  }
  /** Agendador das conferências: congela o saldo do sistema no momento em que a contagem nasce. */
  function processarConferencias(forcar) {
    let criadas = 0;
    S.transacao((d) => {
      for (const a of d.conferenciaAgendas.filter((x) => x.status === 'ativa')) {
        const feitas = new Set(d.conferencias.filter((c) => c.agendaId === a.id).map((c) => c.previsto));
        const vencidas = D.ocorrencias(a, { ate: S.hojeIso(), limite: 400 }).filter((o) => dataHora(o.data, o.hora) <= agora());
        if (forcar && forcar.agendaId === a.id) vencidas.push(...D.ocorrencias(a, { limite: 400 }).filter((o) => o.previsto === forcar.previsto));
        for (const o of vencidas) {
          if (feitas.has(o.previsto)) continue;
          feitas.add(o.previsto);
          d.conferencias.push({ id: S.novoId('cf'), agendaId: a.id, previsto: o.previsto, data: o.data, hora: o.hora, status: 'agendada', responsavelId: a.responsavelId, itens: produtosDoRecorte(a.filtro).map((p) => ({ produtoId: p.id, saldoSistema: p.saldo, contado: null })) });
          criadas++;
        }
      }
    });
    return criadas;
  }
  function proximasConferencias(agenda, limite = 6) {
    const feitas = new Set(S.dados.conferencias.filter((c) => c.agendaId === agenda.id).map((c) => c.previsto));
    return D.ocorrencias(agenda, { limite: limite + feitas.size + 2 }).filter((o) => !feitas.has(o.previsto) && dataHora(o.data, o.hora) > agora()).slice(0, limite);
  }
  /*
   * Conferência com controle (decisão do Zé, 04/11/2026, só no S2 por enquanto; S1 pendente):
   * A) contagem cega: quem conta não vê o saldo do sistema;
   * B) o que continuar diferente depois da recontagem exige motivo;
   * C) o que não bater na 1ª contagem volta para recontagem cega antes de concluir;
   * D) cada número digitado fica no histórico do item (quando e quem);
   * E) concluída, outra pessoa aprova; só então o estoque é ajustado (movimento no extrato).
   *    Recusada, o estoque não muda. Status: agendada → recontagem → concluida → aprovada | recusada.
   */
  const q3 = (n) => Math.round(Number(n) * 1000) / 1000;
  const valorFinal = (i) => (i.recontado != null ? i.recontado : i.contado);
  const diverge = (contado, sistema) => contado != null && q3(contado) !== q3(sistema);
  /** Custo de uma unidade de estoque: o custo é o da embalagem de compra (S1 divide pela Qt. embalagem). */
  const custoUnitario = (p) => (p ? (Number(p.custo) || 0) / (Number(p.qtdEmbalagem) || 1) : 0);
  /** Diferença (contado − sistema) de cada item e o valor em centavos inteiros (falta negativa, sobra positiva). */
  function resumoConferencia(c) {
    let faltas = 0, sobras = 0;
    const itens = c.itens.map((i) => {
      const final = valorFinal(i);
      const diferenca = final == null ? null : q3(final - i.saldoSistema);
      const centavos = diferenca ? Math.round(diferenca * custoUnitario(S.produto(i.produtoId)) * 100) : 0;
      if (centavos < 0) faltas += centavos; else sobras += centavos;
      return { ...i, final, diferenca, centavos };
    });
    return { itens, divergentes: itens.filter((i) => i.diferenca), faltas: faltas / 100, sobras: sobras / 100, liquido: (faltas + sobras) / 100 };
  }
  function lerContagem(v) {
    if (v == null || v === '') return { vazio: true };
    const n = typeof v === 'number' ? v : D.lerNumero(v);
    if (n == null || !Number.isFinite(n) || n < 0) return { invalido: true };
    return { n: q3(n) };
  }
  /**
   * Grava a contagem (etapa "contagem") ou a recontagem (etapa "recontagem").
   * valores: { produtoId: número }; motivos: { produtoId: texto } (só na recontagem).
   * Concluir a contagem manda para recontagem o que não bateu; concluir a recontagem fecha a conferência.
   */
  function salvarContagem(conferenciaId, valores, concluir, motivos = {}) {
    const c = S.dados.conferencias.find((x) => x.id === conferenciaId);
    if (!c || (c.status !== 'agendada' && c.status !== 'recontagem')) return erro('Esta conferência já foi fechada.');
    const etapa = c.status === 'agendada' ? 'contagem' : 'recontagem';
    const campo = etapa === 'contagem' ? 'contado' : 'recontado';
    const abertos = c.itens.filter((i) => etapa === 'contagem' || i.recontar);
    const novos = {};
    for (const i of abertos) {
      const r = lerContagem(valores[i.produtoId]);
      if (r.invalido) return erro('Quantidade inválida em ' + (S.produto(i.produtoId)?.descricao || 'um produto') + '.');
      if (!r.vazio) novos[i.produtoId] = r.n;
    }
    const valorDe = (i) => (i.produtoId in novos ? novos[i.produtoId] : i[campo]);
    if (concluir) {
      const faltam = abertos.filter((i) => valorDe(i) == null).length;
      if (faltam) return erro(etapa === 'contagem' ? 'Conte todos os produtos para concluir (faltam ' + faltam + ').' : 'Reconte todos os produtos da lista para concluir (faltam ' + faltam + ').');
      if (etapa === 'recontagem') {
        const semMotivo = abertos.filter((i) => diverge(valorDe(i), i.saldoSistema) && !String(motivos[i.produtoId] ?? i.motivo ?? '').trim());
        if (semMotivo.length) return erro('A recontagem continua diferente do sistema. Explique o motivo de: ' + semMotivo.map((i) => S.produto(i.produtoId)?.descricao || 'produto').join(', ') + '.');
      }
    }
    let resultado = 'salva';
    const ok = S.transacao((d) => {
      const x = d.conferencias.find((y) => y.id === conferenciaId);
      const em = S.agoraIso();
      x.itens.forEach((i) => {
        if (etapa === 'recontagem' && !i.recontar) return;
        if (i.produtoId in novos && novos[i.produtoId] !== i[campo]) {
          i[campo] = novos[i.produtoId];
          (i.historico ||= []).push({ valor: novos[i.produtoId], etapa, em, por: x.responsavelId });
        }
        if (etapa === 'recontagem' && motivos[i.produtoId] != null) i.motivo = String(motivos[i.produtoId]).trim().slice(0, 200);
      });
      if (!concluir) return;
      if (etapa === 'contagem') {
        const divergentes = x.itens.filter((i) => diverge(i.contado, i.saldoSistema));
        x.contagemConcluidaEm = em;
        if (divergentes.length) {
          divergentes.forEach((i) => { i.recontar = true; });
          x.status = 'recontagem';
          resultado = 'recontagem';
          return;
        }
      }
      x.itens.forEach((i) => { if (!diverge(valorFinal(i), i.saldoSistema)) delete i.motivo; });
      x.status = 'concluida';
      x.concluidaEm = em;
      resultado = 'concluida';
    });
    return ok ? { ok: true, resultado, recontar: resultado === 'recontagem' ? S.dados.conferencias.find((y) => y.id === conferenciaId).itens.filter((i) => i.recontar).length : 0 } : erro('Não foi possível salvar.');
  }
  function validarAprovador(c, aprovadorId) {
    if (!c || c.status !== 'concluida') return 'Só a conferência concluída e ainda não aprovada pode ser decidida.';
    if (!aprovadorId) return 'Escolha quem aprova.';
    if (aprovadorId === c.responsavelId) return 'Quem contou não pode aprovar a própria conferência.';
    return null;
  }
  /** Aprova a conferência e ajusta o estoque pela diferença (contado − saldo congelado), com movimento no extrato. */
  function aprovarConferencia(conferenciaId, aprovadorId) {
    const c = S.dados.conferencias.find((x) => x.id === conferenciaId);
    const msg = validarAprovador(c, aprovadorId);
    if (msg) return erro(msg);
    const resumo = resumoConferencia(c);
    let ajustados = 0;
    const ok = S.transacao((d) => {
      const x = d.conferencias.find((y) => y.id === conferenciaId);
      const em = S.agoraIso();
      for (const i of x.itens) {
        const dif = q3(valorFinal(i) - i.saldoSistema);
        if (!dif) continue;
        const prod = d.produtos.find((p) => p.id === i.produtoId);
        if (!prod) continue;
        const antes = Number(prod.saldo) || 0;
        // A diferença vale sobre o saldo atual: o que entrou ou saiu depois da contagem continua contado.
        prod.saldo = q3(antes + dif);
        d.movimentos.push({ id: S.novoId('mov'), em, produtoId: prod.id, conferenciaId: x.id, tipo: 'ajuste_conferencia', entrada: dif, saldoAnterior: antes, saldoPosterior: prod.saldo, conferente: S.responsavel(x.responsavelId), aprovadorId, motivo: i.motivo || '' });
        ajustados++;
      }
      Object.assign(x, { status: 'aprovada', aprovadorId, decididaEm: em, resultado: { faltas: resumo.faltas, sobras: resumo.sobras, liquido: resumo.liquido } });
    });
    return ok ? { ok: true, ajustados } : erro('Não foi possível salvar.');
  }
  /** Recusa a conferência concluída: o estoque não muda e o motivo fica registrado. */
  function recusarConferencia(conferenciaId, aprovadorId, motivo) {
    const c = S.dados.conferencias.find((x) => x.id === conferenciaId);
    const msg = validarAprovador(c, aprovadorId);
    if (msg) return erro(msg);
    const texto = String(motivo || '').trim();
    if (!texto) return erro('Explique por que a conferência foi recusada.');
    return S.transacao((d) => {
      Object.assign(d.conferencias.find((y) => y.id === conferenciaId), { status: 'recusada', aprovadorId, decididaEm: S.agoraIso(), motivoRecusa: texto.slice(0, 300) });
    }) ? { ok: true } : erro('Não foi possível salvar.');
  }

  /* =================== Cadastro de compras =================== */

  function vincular(fornecedorId, produtoId, precoTexto) {
    if (!fornecedorId || !produtoId) return erro('Escolha o fornecedor e o produto.');
    if (S.dados.catalogo.some((v) => v.fornecedorId === fornecedorId && v.produtoId === produtoId && v.status !== 'rejeitado')) return erro('Este vínculo já existe.');
    return S.transacao((d) => d.catalogo.push({ id: S.novoId('v'), fornecedorId, produtoId, origem: 'compras', status: 'aprovado', precoOfertado: D.lerNumero(precoTexto), criadoEm: S.agoraIso() }) && undefined) ? { ok: true } : erro('Não foi possível salvar.');
  }
  function decidirVinculo(id, status) {
    const v = S.dados.catalogo.find((x) => x.id === id);
    if (!v || v.origem !== 'fornecedor' || v.status !== 'pendente') return erro('Só a sugestão pendente do fornecedor pode ser decidida.');
    return S.transacao((d) => { d.catalogo.find((x) => x.id === id).status = status; }) ? { ok: true } : erro('Não foi possível salvar.');
  }
  /** Define o preço-base (referência) do produto. A versão anterior fica no histórico. */
  function definirPrecoBase(produtoId, valorTexto) {
    const p = S.produto(produtoId);
    if (!p) return erro('Escolha o produto.');
    const valor = D.lerNumero(valorTexto);
    if (!(valor > 0)) return erro('Informe um valor maior que zero.');
    if (Math.round(valor * 100) !== Math.round(valor * 1e6) / 1e4) return erro('Use no máximo 2 casas decimais.');
    if (S.referencia(produtoId) === valor) return erro('O valor é igual ao preço-base atual.');
    return S.transacao((d) => S.definirReferencia(d, produtoId, valor, 'manual')) ? { ok: true } : erro('Não foi possível salvar.');
  }

  window.CicluzComprasServico = {
    salvarAgenda, encerrarAgenda, cancelarData, moverData, proximasDatas, processarAgendas,
    fornecedoresConvidaveis, enviarSolicitacao, pedidoUrgente,
    conviteDoToken, responderConvite, aceitarContraproposta,
    pedidosDoConvite, registrarSeparacao, produtosParaFornecedor, marcarProdutosQueVende,
    aceitarOferta, contrapropor, encerrarRodada, fecharVencidas, encerrarSolicitacao, estadoOferta,
    receberPedido, cancelarPedido,
    produtosDoRecorte, salvarAgendaConferencia, encerrarAgendaConferencia, processarConferencias, proximasConferencias, salvarContagem,
    resumoConferencia, aprovarConferencia, recusarConferencia, custoUnitario,
    vincular, decidirVinculo, definirPrecoBase,
  };
})();
