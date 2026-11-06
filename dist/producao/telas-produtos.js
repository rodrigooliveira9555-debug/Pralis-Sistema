/*
 * Produtos da produção (Saídas · Mercadorias → Cadastros Geral Produção): liga um produto do Compras à produção e diz COMO ELE É
 * PEDIDO [17:40]: em qual utensílio vai, quantos cabem (largura × altura), se aceita meia, com ou sem
 * estoque, mínimo e máximo em múltiplos da meia fornada, e o tipo de conferência no abastecimento.
 * O produto em si continua no cadastro do Compras (MER - Produtos): aqui só a parte da produção.
 */
(function () {
  'use strict';
  const D = window.CicluzProducaoDominio;
  const S = window.CicluzProducaoDados;
  const SV = window.CicluzProducaoServico;
  const U = window.CicluzComprasUI;
  const CD = window.CicluzComprasDominio;
  const C = window.CicluzComprasDados;
  const M = window.CicluzProducao;
  const { el, botao, campo, entrada, seletor } = U;

  let tela = null;
  let busca = '';

  function abrir() {
    if (!tela) {
      tela = U.criarTela({ id: 'producao-produtos', titulo: 'MER - Produtos da Produção', caminho: M.CAMINHO_CAD + 'MER - Produtos da Produção', icone: 'forno', voltar: M.voltarCadastros });
      U.atalho(tela, 'Ligar produto à produção', 'M12 5v14M5 12h14', () => formulario(), { criar: true });
      document.addEventListener('cicluz-producao-mudou', () => { if (tela.view.classList.contains('show')) render(); });
    }
    tela.ativar();
    render();
  }

  const unidadeDe = (p) => (p && p.unidade ? p.unidade.toLowerCase() : 'un');
  function resumo(c, p) {
    const partes = [];
    if (c.formato) partes.push(D.resumoFormato(c.formato, S.nomeBem(c.formato.utensilioId), unidadeDe(p)));
    else partes.push('Sem utensílio de fornada');
    partes.push(c.comEstoque ? 'com estoque' : 'sem estoque');
    if (c.estoqueMin != null || c.estoqueMax != null) partes.push('mín. ' + CD.numero(c.estoqueMin) + ' · máx. ' + CD.numero(c.estoqueMax));
    return partes.join(' · ');
  }

  function render() {
    const lista = S.producao.dados.produtos.map((c) => ({ c, p: S.produto(c.produtoId) })).filter((x) => x.p)
      .sort((a, b) => a.p.descricao.localeCompare(b.p.descricao, 'pt-BR'));
    const topo = el('div', 'profiles-controls');
    topo.append(U.nota('Os produtos vêm do cadastro do Compras (Saídas · Mercadorias → Cadastros Geral → MER - Produtos). Aqui você diz como cada um é pedido e produzido.'));
    const filtros = el('div', 'compras-filtros');
    const b = U.busca('Buscar produto', (v) => { busca = v; desenha(); });
    b.value = busca;
    filtros.append(b);
    const sec = U.secao('Produtos', lista.filter((x) => x.c.ativo !== false).length);
    const box = el('div', 'compras-lista');
    sec.append(box);
    function desenha() {
      box.replaceChildren();
      const vis = lista.filter((x) => U.dobrar(x.p.descricao).includes(U.dobrar(busca)));
      if (!lista.length) box.append(U.vazio('Nenhum produto ligado à produção.', 'Use o "+" para escolher um produto do Compras (ex.: pão de sal) e dizer como ele é pedido.'));
      vis.forEach(({ c, p }) => {
        const fichas = S.fichasDo(c.produtoId).length;
        box.append(U.linhaLista({
          icone: 'forno', titulo: p.descricao, detalhe: resumo(c, p),
          direita: [
            c.ativo === false ? U.situacao('Desligado', 'neutro') : fichas ? U.situacao(fichas + (fichas > 1 ? ' fichas' : ' ficha'), 'positivo') : U.situacao('Sem ficha', 'atencao'),
            botao('Fichas', () => M.abrir('fichas', c.produtoId)),
            botao('Editar', () => formulario(c)),
          ],
        }));
      });
    }
    desenha();
    tela.body.replaceChildren(topo, filtros, sec);
  }

  /** Produtos que ainda podem ser ligados: ativos, sem configuração. Fabricação própria primeiro. */
  function candidatos() {
    const ligados = new Set(S.producao.dados.produtos.map((c) => c.produtoId));
    const grupos = C.gruposMercadoria();
    const nomeG = (id) => (grupos.find((g) => g.id === id) || {}).nome || '';
    const fab = (p) => /FAB\.? PR[ÓO]PRIA/i.test(nomeG(p.grupoId));
    return S.produtos().filter((p) => p.status === 'ativo' && !ligados.has(p.id))
      .sort((a, b) => (fab(b) - fab(a)) || a.descricao.localeCompare(b.descricao, 'pt-BR'))
      .map((p) => [p.id, p.descricao + (fab(p) ? '' : ' · ' + (nomeG(p.grupoId) || 'sem grupo'))]);
  }

  function formulario(c) {
    const p0 = c ? S.produto(c.produtoId) : null;
    U.dialogo({
      titulo: c ? p0.descricao : 'Ligar produto à produção', largo: true,
      subtitulo: c ? 'Como este produto é pedido e produzido' : null,
      montar: (form) => {
        const sec = (t) => { const s = el('fieldset', 'compras-fieldset'); s.append(el('legend', null, t)); form.append(s); return s; };
        const s0 = sec('Produto');
        const produto = seletor(c ? [[c.produtoId, p0.descricao]] : candidatos(), c?.produtoId || '', c ? undefined : 'Selecione');
        produto.disabled = Boolean(c);
        const processo = seletor(D.PROCESSOS, c?.processoPrincipal || '', 'Selecione');
        s0.append(campo('Produto *', produto, c ? null : 'Não achou? Cadastre antes em Saídas · Mercadorias → Cadastros Geral → MER - Produtos (grupo FAB. PRÓPRIA).'), campo('Principal processo', processo));

        const s1 = sec('Como se pede: utensílio de fornada');
        const temFormato = el('label', 'compras-interruptor compras-largo');
        const temInput = entrada('checkbox');
        temInput.checked = c ? Boolean(c.formato) : true;
        temFormato.append(temInput, el('span', null, 'É pedido por utensílio (assadeira, lata, tira)'));
        const f = c?.formato || {};
        // Utensílios primeiro (assadeira, lata, tira); os outros bens continuam disponíveis.
        const bens = S.patrimonio.dados.bens.filter((x) => x.ativo !== false || x.id === f.utensilioId)
          .sort((a, b) => ((b.categoria === 'utensilio') - (a.categoria === 'utensilio')) || a.nome.localeCompare(b.nome, 'pt-BR'));
        const utensilio = seletor(bens.map((x) => [x.id, x.nome + (x.medidas ? ' (' + CD.numero(x.medidas.largura) + '×' + CD.numero(x.medidas.comprimento) + ')' : '')]), f.utensilioId || '', bens.length ? 'Selecione' : 'Cadastre em RET - Patrimônios');
        const colunas = entrada('number', f.colunas || '', { min: 1, step: 1, inputMode: 'numeric' });
        const linhas = entrada('number', f.linhas || '', { min: 1, step: 1, inputMode: 'numeric' });
        const exatidao = seletor(D.EXATIDOES, f.exatidao || 'exato');
        const meiaL = el('label', 'compras-interruptor');
        const meiaInput = entrada('checkbox');
        meiaInput.checked = c?.formato ? Boolean(f.aceitaMeia) : true;
        meiaL.append(meiaInput, el('span', null, 'Dá para fazer meia (½) neste utensílio'));
        const resumoF = el('p', 'compras-texto-auto compras-largo');
        resumoF.setAttribute('aria-live', 'polite');
        const camposF = [campo('Utensílio *', utensilio), campo('Quantos na largura *', colunas, 'A meia divide a largura: precisa ser par.'), campo('Quantos na altura *', linhas), campo('Exatidão', exatidao), meiaL, resumoF];
        s1.append(temFormato, ...camposF);

        const s2 = sec('Estoque');
        const estL = el('label', 'compras-interruptor compras-largo');
        const estInput = entrada('checkbox');
        estInput.checked = c ? Boolean(c.comEstoque) : true;
        estL.append(estInput, el('span', null, 'Trabalha com estoque (pronto ou cru) — "é com estoque tudo, na verdade"'));
        const min = entrada('number', c?.estoqueMin ?? '', { min: 0, inputMode: 'decimal' });
        const max = entrada('number', c?.estoqueMax ?? '', { min: 0, inputMode: 'decimal' });
        const prodMax = entrada('number', c?.producaoMax ?? '', { min: 0, inputMode: 'decimal' });
        const localEst = seletor(S.locais().map((l) => [l.id, l.caminho]), c?.localEstoqueId || '', 'Sem local');
        const dicaMult = el('small', 'profiles-note');
        s2.append(estL, campo('Estoque mínimo', min), campo('Estoque máximo', max), campo('Produção máxima por pedido', prodMax), campo('Local do estoque', localEst), dicaMult);

        const s3 = sec('Abastecimento');
        const conf = seletor(D.CONFERENCIAS, c?.conferencia || 'nenhuma');
        s3.append(campo('Conferência', conf, '2 etapas: confere na saída da produção e de novo na chegada à loja, por outra pessoa.'));

        const formatoAtual = () => (temInput.checked ? { utensilioId: utensilio.value, colunas: Number(colunas.value) || 0, linhas: Number(linhas.value) || 0, exatidao: exatidao.value, aceitaMeia: meiaInput.checked } : null);
        const atualiza = () => {
          camposF.forEach((x) => { x.style.display = temInput.checked ? '' : 'none'; });
          const fa = formatoAtual();
          const un = unidadeDe(S.produto(produto.value));
          if (fa && D.fornada(fa)) {
            const erroF = D.validarFormato(fa);
            resumoF.textContent = erroF && erroF.includes('par') ? erroF : D.resumoFormato(fa, utensilio.selectedOptions[0]?.textContent || 'Utensílio', un) + ' · pedidos de ' + D.passo(fa) + ' em ' + D.passo(fa);
          } else resumoF.textContent = temInput.checked ? 'Preencha largura e altura para ver a fornada.' : '';
          dicaMult.textContent = fa && D.passo(fa) ? 'Mínimo, máximo e produção máxima: múltiplos de ' + D.passo(fa) + ' ' + un + ' (' + D.multiplos(D.passo(fa), D.passo(fa) * 4).join(', ') + '…).' : '';
        };
        [temInput, utensilio, colunas, linhas, meiaInput, produto].forEach((x) => { x.addEventListener('input', atualiza); x.addEventListener('change', atualiza); });
        atualiza();

        if (c) {
          const rod = el('div', 'compras-form-rodape');
          rod.append(botao(c.ativo === false ? 'Religar à produção' : 'Desligar da produção', () => { const r = SV.desligarProducao(c.produtoId); if (r.erro) return U.avisar(r.erro); form.closest('dialog').close(); U.avisar('Produto atualizado.'); }));
          form.append(rod);
        }
        return { produto, processo, formatoAtual, estInput, min, max, prodMax, localEst, conf };
      },
      rotuloSalvar: 'Salvar produto',
      salvar: (x) => {
        const n = (i) => (String(i.value).trim() === '' ? null : Number(i.value));
        const r = SV.salvarConfig({
          produtoId: x.produto.value, processoPrincipal: x.processo.value, formato: x.formatoAtual(), comEstoque: x.estInput.checked,
          estoqueMin: n(x.min), estoqueMax: n(x.max), producaoMax: n(x.prodMax), localEstoqueId: x.localEst.value, conferencia: x.conf.value,
        });
        if (r.erro) return r.erro;
        U.avisar('Produto salvo.');
      },
    });
  }

  M.registrar('produtos', abrir);
})();
