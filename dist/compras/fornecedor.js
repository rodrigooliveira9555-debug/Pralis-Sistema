/*
 * Página do fornecedor (S1: /rodada?token=…, sem login). O fornecedor diz se tem cada item,
 * o valor unitário e a quantidade, as condições, e envia. Também aceita contraproposta.
 * No protótipo é aberta pelo botão "Abrir como fornecedor" e grava no mesmo navegador.
 */
(function () {
  'use strict';
  const D = window.CicluzComprasDominio;
  const S = window.CicluzComprasDados;
  const SV = window.CicluzComprasServico;
  const app = document.getElementById('app');
  const token = new URLSearchParams(location.search).get('t') || '';
  const el = (tag, cls, texto) => { const n = document.createElement(tag); if (cls) n.className = cls; if (texto != null) n.textContent = texto; return n; };
  const btn = (texto, fn, cls = 'btn') => { const b = el('button', cls, texto); b.type = 'button'; b.onclick = fn; return b; };
  const dataHora = (iso) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  const SITUACAO = { comprado: ['Comprado: pode entregar', 'positivo'], com_aumento: ['Aguardando o comprador', 'atencao'], retornado: ['Não comprado', 'neutro'], cotado: ['Rascunho', 'info'], aguardando: ['Sem resposta', 'neutro'] };

  function render() {
    const c = SV.conviteDoToken(token);
    if (!c) {
      document.getElementById('titulo').textContent = 'Link inválido';
      app.replaceChildren(el('p', null, 'Este link de cotação não existe neste navegador. Peça um novo link ao comprador.'));
      return;
    }
    const rod = S.dados.rodadas.find((r) => r.id === c.rodadaId);
    const f = S.fornecedor(c.fornecedorId);
    const aberta = rod.status === 'aberta' && c.status !== 'revogado';
    document.getElementById('titulo').textContent = 'Padaria Pralis · Cotação nº ' + rod.numero;
    document.getElementById('subtitulo').textContent = 'Para ' + f.nome + ' · ' + (aberta ? 'Responda até ' + dataHora(rod.expiraEm) : 'Cotação encerrada') + (rod.recebimentoInicio ? ' · Recebemos das ' + rod.recebimentoInicio + ' às ' + rod.recebimentoFim : '');
    const base = c.resposta || c.rascunho || { itens: {} };
    const enviada = Boolean(c.resposta);
    const estado = {};
    c.itens.forEach((p) => { estado[p] = { ...(base.itens[p] || {}) }; });
    const blocos = [];

    // Contrapropostas pendentes
    Object.entries(c.contrapropostas || {}).filter(([, cp]) => cp.status === 'pendente').forEach(([pid, cp]) => {
      const b = el('section', 'rodada-banner');
      b.append(el('b', null, 'Contraproposta do comprador'), el('span', null, S.produto(pid).descricao + ': ' + D.moeda(cp.valor) + ' por unidade.'));
      if (aberta) b.append(btn('Aceitar contraproposta', () => { const r = SV.aceitarContraproposta(token, pid); if (r.erro) return alert(r.erro); render(); }));
      blocos.push(b);
    });

    const pedido = secaoPedido(rod);
    if (pedido) blocos.push(pedido);

    let total;
    const atualizaTotal = () => {
      let t = 0;
      c.itens.forEach((p) => { const e = estado[p]; const item = rod.itens.find((i) => i.produtoId === p); const v = D.lerNumero(e.valor); const q = D.lerNumero(e.quantidade) ?? item.quantidade; if (!e.indisponivel && v > 0) t += v * q; });
      total.textContent = 'Total estimado (sem frete): ' + D.moeda(t);
    };

    c.itens.forEach((pid) => {
      const p = S.produto(pid);
      const item = rod.itens.find((i) => i.produtoId === pid);
      const e = estado[pid];
      const sec = el('section', 'compras-bloco rodada-item');
      const cab = el('div', 'rodada-item-cab');
      cab.append(el('b', null, p.descricao), el('small', null, 'Pedimos ' + D.numero(item.quantidade) + ' ' + (p.unidade || '') + ' · aceitamos variação de ' + rod.margemPct + '%'));
      sec.append(cab);
      // Referência como no S1: o preço-base congelado no envio; quem oferecer até ele primeiro leva.
      const dados = el('dl', 'rodada-dados');
      dados.append(el('dt', null, 'Referência'), el('dd', null, item.referencia != null ? D.moeda(item.referencia) : 'Sem histórico'));
      sec.append(dados);
      if (item.referencia != null) sec.append(el('p', 'rodada-dica', 'Quem oferecer até ' + D.moeda(item.referencia) + ' primeiro leva este produto.'));
      if (enviada) {
        const st = SV.estadoOferta(c, pid);
        let [txt, tom] = SITUACAO[st.situacao] || ['—', 'neutro'];
        if (st.situacao === 'retornado' && st.motivo === 'ja_comprado') txt = 'Já comprado de outro fornecedor';
        else if (st.situacao === 'retornado' && st.motivo && st.motivo !== 'indisponivel') txt = 'Não comprado: ' + (D.MOTIVOS[st.motivo] || '').toLowerCase();
        const linha = el('p', 'compras-meta');
        linha.append(el('span', 'compras-situacao tom-' + tom, txt), el('span', null, e.indisponivel ? (e.motivo === 'nao_trabalha' ? 'Não trabalho mais' : 'Não tenho') : D.moeda(e.valor) + '/un · ' + D.numero(e.quantidade ?? item.quantidade)));
        sec.append(linha);
      } else {
        const campos = el('div', 'rodada-campos');
        const tem = el('select');
        [['tem', 'Tenho'], ['sem_estoque', 'Não tenho'], ['nao_trabalha', 'Não trabalho mais']].forEach(([v, t]) => tem.add(new Option(t, v)));
        tem.value = e.indisponivel ? e.motivo || 'sem_estoque' : 'tem';
        const valor = el('input'); valor.inputMode = 'decimal'; valor.placeholder = '0,00'; valor.value = e.valor != null ? String(e.valor).replace('.', ',') : '';
        const qtd = el('input'); qtd.inputMode = 'decimal'; qtd.value = e.quantidade != null ? String(e.quantidade).replace('.', ',') : String(item.quantidade).replace('.', ',');
        const lv = el('label', null, 'Valor unitário (R$) *'); lv.append(valor);
        const faixa = D.limitesDaMargem(item.quantidade, rod.margemPct);
        const lq = el('label', null, 'Quantidade que entrego'); lq.append(qtd, el('small', null, 'Aceitamos de ' + D.numero(faixa.minimo) + ' a ' + D.numero(faixa.maximo)));
        const lt = el('label', null, 'Disponibilidade'); lt.append(tem);
        const sync = () => {
          e.indisponivel = tem.value !== 'tem'; e.motivo = e.indisponivel ? tem.value : '';
          e.valor = valor.value; e.quantidade = qtd.value;
          lv.hidden = lq.hidden = e.indisponivel;
          atualizaTotal();
        };
        [tem, valor, qtd].forEach((x) => x.addEventListener('input', sync));
        campos.append(lt, lv, lq);
        sec.append(campos);
        setTimeout(sync, 0);
      }
      blocos.push(sec);
    });

    const cond = el('section', 'compras-bloco');
    cond.append(el('h4', null, 'Condições (opcional)'));
    const g = el('div', 'rodada-cond');
    const campo = (rot, no, val) => { const l = el('label', null, rot); if (val != null) no.value = val; no.disabled = enviada || !aberta; l.append(no); g.append(l); return no; };
    const frete = campo('Frete (R$)', Object.assign(el('input'), { inputMode: 'decimal' }), base.frete || '');
    const entrega = campo('Data de entrega', Object.assign(el('input'), { type: 'date' }), base.entrega || '');
    const pag = campo('Pagamento', Object.assign(el('input'), { placeholder: 'Ex.: boleto 28 dias' }), base.pagamento || '');
    const obs = campo('Observação', el('textarea'), base.observacao || '');
    cond.append(g);
    total = el('p', 'rodada-total');
    blocos.push(cond, total);

    const erro = el('p', 'rodada-erro');
    erro.setAttribute('role', 'alert');
    const acoes = el('div', 'rodada-acoes');
    const resposta = () => ({ itens: estado, frete: frete.value, entrega: entrega.value, pagamento: pag.value, observacao: obs.value });
    if (!enviada && aberta) {
      acoes.append(
        btn('Salvar sem enviar', () => { const r = SV.responderConvite(token, resposta(), false); erro.textContent = r.erro || ''; if (!r.erro) { erro.textContent = 'Rascunho salvo.'; } }, 'btn secondary'),
        btn('Enviar resposta', () => { const r = SV.responderConvite(token, resposta(), true); if (r.erro) { erro.textContent = r.erro; return; } render(); }),
      );
    } else if (enviada) {
      acoes.classList.add('rodada-acoes-inline');
      acoes.append(el('span', null, 'Resposta enviada em ' + dataHora(c.resposta.enviadaEm) + '. Obrigado!'));
    }
    blocos.push(erro, acoes, secaoVendo(), el('p', 'rodada-aviso-demo', 'Protótipo: esta página simula o link que o fornecedor recebe pelo WhatsApp. Os dados ficam neste navegador.'));
    app.replaceChildren(...blocos);
    atualizaTotal();
  }

  /* ---------- Seu pedido: depois de comprado, ajustar a quantidade ao estoque (dentro da faixa) ---------- */
  const MENSAGEM_PEDIDO = {
    confirmado: 'Compramos estes produtos de você. Pode entregar. Se a quantidade que você tem for diferente, ajuste aqui, dentro da faixa.',
    recebido_parcial: 'Recebemos parte da entrega.',
    recebido: 'Entrega recebida. Obrigado!',
  };
  function secaoPedido(rod) {
    const pedidos = SV.pedidosDoConvite(token);
    if (!pedidos.length) return null;
    const separando = pedidos.every((p) => p.status === 'confirmado');
    const status = separando ? 'confirmado' : pedidos.some((p) => p.status === 'recebido_parcial' || p.status === 'confirmado') ? 'recebido_parcial' : 'recebido';
    const sec = el('section', 'compras-bloco rodada-separacao');
    sec.setAttribute('aria-labelledby', 'titulo-separacao');
    const h = el('h4', null, 'Seu pedido'); h.id = 'titulo-separacao';
    sec.append(h, el('p', 'compras-meta', MENSAGEM_PEDIDO[status]));
    const msg = el('p', 'rodada-erro'); msg.setAttribute('role', 'status');
    const qtd = {};
    const itens = pedidos.flatMap((p) => p.itens);
    const total = el('p', 'rodada-total');
    const somar = () => { total.textContent = 'Total: ' + D.moeda(itens.reduce((t, i) => t + (D.lerNumero(qtd[i.id] ?? i.pedida) || 0) * i.custo, 0)); };
    const campos = [];
    itens.forEach((i) => {
      const p = S.produto(i.produtoId);
      const base = i.solicitada ?? i.pedida;
      const { minimo, maximo } = D.limitesDaMargem(base, rod.margemPct);
      const linha = el('div', 'rodada-item-cab');
      const info = el('div');
      info.append(el('b', null, p.descricao), el('small', null, ' Pedimos ' + D.numero(base) + ' · ' + D.moeda(i.custo) + ' cada'));
      linha.append(info);
      if (separando) {
        const l = el('label', null, 'Quantidade que vou entregar');
        const inp = el('input'); inp.inputMode = 'decimal'; inp.value = String(i.pedida).replace('.', ',');
        const dica = el('small', null, 'Entre ' + D.numero(minimo) + ' e ' + D.numero(maximo));
        inp.oninput = () => {
          qtd[i.id] = inp.value;
          const fora = !D.quantidadeDentroDaMargem(base, D.lerNumero(inp.value), rod.margemPct);
          inp.setAttribute('aria-invalid', String(fora));
          inp.style.borderColor = fora ? '#dc2626' : '';
          salvar.disabled = campos.some((x) => x.getAttribute('aria-invalid') === 'true');
          somar();
        };
        campos.push(inp);
        l.append(inp, dica);
        linha.append(l);
      } else linha.append(el('span', null, D.numero(i.pedida)));
      sec.append(linha);
    });
    const salvar = btn('Salvar ajuste', () => {
      const r = SV.registrarSeparacao(token, qtd);
      if (r.erro) { msg.textContent = r.erro; msg.style.color = '#b91c1c'; return; }
      render();
      const novo = document.querySelector('.rodada-separacao .rodada-erro');
      if (novo) { novo.textContent = r.mudou ? 'Ajuste salvo. O comprador vê a quantidade nova no pedido.' : 'Nenhuma quantidade mudou.'; novo.style.color = '#12672e'; }
    });
    sec.append(msg);
    if (separando) { const rod2 = el('div', 'rodada-acoes rodada-acoes-inline'); rod2.append(total, salvar); sec.append(rod2); somar(); }
    return sec;
  }

  /* ---------- Você vende outros produtos que compramos? ---------- */
  let vendoAberto = false;
  function secaoVendo() {
    const sec = el('section', 'compras-bloco rodada-vendo');
    const topo = el('div', 'rodada-item-cab');
    const txt = el('div');
    txt.append(el('h4', null, 'Você vende outros produtos que compramos?'), el('small', null, 'Marque na lista e passe a receber a cotação deles também.'));
    topo.append(txt, btn(vendoAberto ? 'Fechar lista' : 'Ver lista', () => { vendoAberto = !vendoAberto; sec.replaceWith(secaoVendo()); }, 'btn secondary'));
    sec.append(topo);
    if (!vendoAberto) return sec;
    const lista = SV.produtosParaFornecedor(token);
    const marcados = new Set();
    let busca = '';
    const msg = el('p', 'rodada-erro'); msg.setAttribute('role', 'status');
    const caixa = el('div', 'rodada-vendo-lista');
    const resumo = el('small');
    const salvar = btn('Salvar produto(s)', () => {
      const r = SV.marcarProdutosQueVende(token, [...marcados]);
      if (r.erro) { msg.textContent = r.erro; return; }
      const novo = secaoVendo();
      sec.replaceWith(novo);
      const m = novo.querySelector('.rodada-erro');
      m.textContent = r.vinculados + ' produto(s) a mais. Você recebe a cotação deles a partir da próxima.';
      m.style.color = '#12672e';
    });
    salvar.disabled = true;
    const desenha = () => {
      const f = lista.filter((p) => (p.descricao + ' ' + (p.grupo || '')).toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR'))).slice(0, 200);
      resumo.textContent = lista.filter((p) => p.jaVende).length + ' produto(s) já são seus. Mostrando ' + f.length + ' de ' + lista.length + '.';
      caixa.replaceChildren(...f.map((p) => {
        const l = el('label', 'rodada-vendo-item');
        const c = el('input'); c.type = 'checkbox';
        c.checked = p.jaVende || marcados.has(p.produtoId);
        c.disabled = p.jaVende || p.vinculo === 'rejeitado';
        c.onchange = () => { c.checked ? marcados.add(p.produtoId) : marcados.delete(p.produtoId); salvar.disabled = !marcados.size; salvar.textContent = 'Salvar ' + (marcados.size || '') + ' produto(s)'; };
        const t = el('span', null, p.descricao + (p.grupo ? ' · ' + p.grupo : ''));
        l.append(c, t);
        if (p.jaVende) l.append(el('span', 'compras-situacao tom-positivo', 'Já é seu'));
        return l;
      }));
    };
    const b = el('input'); b.type = 'search'; b.placeholder = 'Buscar produto'; b.setAttribute('aria-label', 'Buscar produto');
    b.oninput = () => { busca = b.value; desenha(); };
    const lb = el('label', null, 'Buscar produto'); lb.append(b);
    desenha();
    sec.append(msg, lb, resumo, caixa, salvar);
    return sec;
  }

  document.addEventListener('cicluz-compras-mudou', (e) => { if (e.detail && e.detail.externo) render(); });
  render();
})();
