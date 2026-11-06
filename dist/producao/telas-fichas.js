/*
 * Fichas técnicas (Saídas · Mercadorias → Cadastros Geral Produção). Um produto pode ter várias fichas ("do zero", "com kit",
 * "com partes em estoque") [11:59]; a marcada como padrão é a que a ordem de produção usa.
 * Cada etapa: processo, parte do produto, faixa de quantidade, local, instrução (base do guia futuro),
 * ingredientes (produtos do Compras) e equipamentos/utensílios (Patrimônio) com tempo, acompanhamento
 * e nível profissional. Sem custo: as fórmulas esperam aprovação.
 */
(function () {
  'use strict';
  const D = window.CicluzProducaoDominio;
  const S = window.CicluzProducaoDados;
  const SV = window.CicluzProducaoServico;
  const U = window.CicluzComprasUI;
  const CD = window.CicluzComprasDominio;
  const M = window.CicluzProducao;
  const { el, botao, campo, entrada, seletor } = U;

  let tela = null;
  let filtroProduto = '';

  function abrir(produtoId) {
    if (!tela) {
      tela = U.criarTela({ id: 'producao-fichas', titulo: 'MER - Ficha Técnica de Produtos', caminho: M.CAMINHO_CAD + 'MER - Ficha Técnica de Produtos', icone: 'ficha', voltar: M.voltarCadastros });
      U.atalho(tela, 'Nova ficha técnica', 'M12 5v14M5 12h14', () => editor(null, filtroProduto), { criar: true });
      document.addEventListener('cicluz-producao-mudou', () => { if (tela.view.classList.contains('show')) render(); });
    }
    filtroProduto = typeof produtoId === 'string' ? produtoId : '';
    tela.ativar();
    render();
  }

  const un = (produtoId) => { const p = S.produto(produtoId); return p && p.unidade ? p.unidade.toLowerCase() : 'un'; };

  function render() {
    const produzidos = S.produzidos();
    const topo = el('div', 'profiles-controls');
    topo.append(U.nota('A ficha diz como fazer: etapas, ingredientes, equipamentos e tempos. O mesmo produto pode ter mais de uma ficha; a padrão é a usada nos pedidos.'));
    const filtros = el('div', 'compras-filtros');
    const sel = seletor(produzidos.map(({ p }) => [p.id, p.descricao]), filtroProduto, 'Todos os produtos');
    sel.setAttribute('aria-label', 'Filtrar por produto');
    sel.onchange = () => { filtroProduto = sel.value; render(); };
    filtros.append(sel);
    const corpo = [topo, filtros];
    if (!produzidos.length) {
      corpo.push(U.vazio('Nenhum produto ligado à produção.', 'Primeiro ligue o produto em Saídas · Mercadorias → Cadastros Geral Produção → MER - Produtos da Produção.'));
      corpo.push(botao('Abrir MER - Produtos da Produção', () => M.abrir('produtos'), 'btn'));
      tela.body.replaceChildren(...corpo);
      return;
    }
    produzidos.filter(({ p }) => !filtroProduto || p.id === filtroProduto).sort((a, b) => a.p.descricao.localeCompare(b.p.descricao, 'pt-BR')).forEach(({ p, c }) => {
      const fichas = S.fichasDo(p.id);
      const sec = U.secao(p.descricao, fichas.length, botao('Nova ficha', () => editor(null, p.id)));
      const lista = el('div', 'compras-lista');
      if (!fichas.length) lista.append(U.vazio('Sem ficha técnica.', 'Sem ficha, o produto não pode ser pedido à produção.'));
      fichas.forEach((f) => {
        const plano = D.planoDaFicha(f, f.quantidadeBase, S.bem);
        lista.append(U.linhaLista({
          icone: 'ficha', titulo: f.nome,
          detalhe: f.etapas.length + (f.etapas.length > 1 ? ' etapas' : ' etapa') + ' · para ' + CD.numero(f.quantidadeBase) + ' ' + un(p.id) + ' · tempo ' + D.minutos(plano.tempo) + ' · equipe ' + D.minutos(plano.tempoEquipe) + textoCusto(SV.custoDaFicha(f), p.id),
          direita: [
            f.padrao ? U.situacao('Padrão', 'positivo') : botao('Tornar padrão', () => { const r = SV.definirPadrao(f.id); U.avisar(r.erro || 'Ficha padrão definida.'); }),
            botao('Duplicar', () => { const r = SV.duplicarFicha(f.id); U.avisar(r.erro || 'Ficha duplicada.'); }),
            botao('Editar', () => editor(f)),
          ],

        }));
      });
      sec.append(lista);
      if (c.formato) sec.append(U.nota('Pedido em múltiplos de ' + D.passo(c.formato) + ' ' + un(p.id) + ' (' + S.nomeBem(c.formato.utensilioId) + ').'));
      corpo.push(sec);
    });
    tela.body.replaceChildren(...corpo);
  }

  /** Custo em uma linha: total, por unidade, sugerido e, se parcial, o que falta. */
  function textoCusto(c, produtoId) {
    if (!c) return '';
    return ' · custo ' + CD.moeda(c.total) + ' (' + CD.moeda(c.unitario) + '/' + un(produtoId) + ')' + (c.sugerido != null ? ' · sugerido ' + CD.moeda(c.sugerido) : '') + (c.faltas.length ? ' · parcial: falta ' + c.faltas.join(', ') : '');
  }

  /* ---------- Editor ---------- */

  const novaEtapa = () => ({ processo: '', parte: '', faixaDe: null, faixaAte: null, localId: '', instrucao: '', ingredientes: [], recursos: [] });
  const numOuNulo = (v) => (String(v).trim() === '' ? null : Number(String(v).replace(',', '.')));

  function editor(existente, produtoId) {
    const produzidos = S.produzidos();
    const f = existente ? structuredClone(existente) : { produtoId: produtoId || '', nome: '', padrao: false, quantidadeBase: null, producaoDe: null, producaoAte: null, rendimentoBruto: null, rendimentoLiquido: null, etapas: [novaEtapa()] };
    f.etapas.forEach((e) => { if (!Array.isArray(e.ingredientes)) e.ingredientes = []; if (!Array.isArray(e.recursos)) e.recursos = []; });
    if (!existente && f.produtoId) { const c = S.config(f.produtoId); if (c && c.formato) f.quantidadeBase = D.fornada(c.formato); }
    const produtosOp = S.produtos().filter((p) => p.status === 'ativo').sort((a, b) => a.descricao.localeCompare(b.descricao, 'pt-BR')).map((p) => [p.id, p.descricao]);
    const bensOp = S.patrimonio.dados.bens.filter((b) => b.ativo !== false).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map((b) => [b.id, D.nomeDe(D.CATEGORIAS, b.categoria) + ' · ' + b.nome + (b.capacidade ? ' (' + CD.numero(b.capacidade.valor) + ' ' + b.capacidade.unidade.toLowerCase() + ')' : '')]);
    const locaisOp = S.locais().map((l) => [l.id, l.caminho]);
    const unidadesOp = S.unidades();
    let resumoGeral;

    U.dialogo({
      titulo: existente ? 'Editar ficha técnica' : 'Nova ficha técnica', largo: true, classe: 'producao-ficha-dialog',
      montar: (form) => {
        const sec = (t) => { const s = el('fieldset', 'compras-fieldset'); s.append(el('legend', null, t)); form.append(s); return s; };
        const s1 = sec('Cabeçalho');
        const produto = seletor(produzidos.map(({ p }) => [p.id, p.descricao]), f.produtoId, 'Selecione');
        produto.disabled = Boolean(existente);
        const nome = entrada('text', f.nome, { placeholder: 'Ex.: Do zero, Com kit' });
        const base = entrada('number', f.quantidadeBase ?? '', { min: 0, inputMode: 'decimal' });
        const de = entrada('number', f.producaoDe ?? '', { min: 0, inputMode: 'decimal' });
        const ate = entrada('number', f.producaoAte ?? '', { min: 0, inputMode: 'decimal' });
        const bruto = entrada('number', f.rendimentoBruto ?? '', { min: 0, step: 'any', inputMode: 'decimal' });
        const liquido = entrada('number', f.rendimentoLiquido ?? '', { min: 0, step: 'any', inputMode: 'decimal' });
        const perdaTxt = el('small', 'profiles-note');
        const padraoL = el('label', 'compras-interruptor compras-largo');
        const padraoI = entrada('checkbox');
        padraoI.checked = Boolean(f.padrao);
        padraoL.append(padraoI, el('span', null, 'Ficha padrão deste produto (usada nos pedidos)'));
        const atualizaPerda = () => { const pr = D.perda(Number(bruto.value), Number(liquido.value)); perdaTxt.textContent = pr ? 'Perda: ' + CD.numero(pr.kg) + ' kg (' + CD.numero(pr.pct * 100, 1) + '%)' : ''; };
        bruto.oninput = liquido.oninput = atualizaPerda;
        produto.onchange = () => { f.produtoId = produto.value; const c = S.config(produto.value); if (c && c.formato && !base.value) { base.value = D.fornada(c.formato); f.quantidadeBase = Number(base.value); } desenhaResumo(); };
        nome.oninput = () => { f.nome = nome.value; };
        base.oninput = () => { f.quantidadeBase = numOuNulo(base.value); desenhaResumo(); };
        de.oninput = () => { f.producaoDe = numOuNulo(de.value); };
        ate.oninput = () => { f.producaoAte = numOuNulo(ate.value); };
        padraoI.onchange = () => { f.padrao = padraoI.checked; };
        const liq = campo('Rendimento líquido (kg, frio)', liquido);
        liq.append(perdaTxt);
        s1.append(campo('Produto *', produto), campo('Nome da ficha *', nome), campo('Ingredientes para quantas unidades? *', base, 'A ficha escala os ingredientes pela quantidade pedida.'),
          campo('Produção de', de), campo('Produção até', ate), campo('Rendimento bruto (kg, cru)', bruto), liq, padraoL);
        atualizaPerda();

        const s2 = sec('Etapas');
        s2.classList.add('compras-fieldset-lista');
        const etapasBox = el('div', 'producao-etapas compras-largo');
        const addEtapa = botao('+ Etapa', () => { f.etapas.push(novaEtapa()); desenhaEtapas(); });
        s2.append(etapasBox, addEtapa);

        resumoGeral = el('p', 'compras-texto-auto');
        resumoGeral.setAttribute('aria-live', 'polite');
        form.append(resumoGeral);

        function desenhaResumo() {
          const q = f.quantidadeBase;
          if (!(q > 0)) { resumoGeral.textContent = 'Informe a quantidade-base para ver o tempo total.'; return; }
          const pl = D.planoDaFicha(f, q, S.bem);
          const c = f.produtoId ? SV.custoDaFicha(f) : null;
          resumoGeral.textContent = 'Para ' + CD.numero(q) + ' ' + un(f.produtoId) + ': tempo total ' + D.minutos(pl.tempo) + ' · tempo de equipe ' + D.minutos(pl.tempoEquipe) + (pl.etapas.some((e) => e.lotes > 1) ? ' · alguma etapa passa da capacidade e se repete' : '')
            + (c ? '. Custo: ingredientes ' + CD.moeda(c.ingredientes) + ' + mão de obra ' + CD.moeda(c.maoDeObra) + ' + energia ' + CD.moeda(c.energia) + ' = ' + CD.moeda(c.total) + ' (' + CD.moeda(c.unitario) + '/' + un(f.produtoId) + ')' + (c.sugerido != null ? ' · valor sugerido ' + CD.moeda(c.sugerido) : '') + (c.faltas.length ? ' · custo parcial: falta ' + c.faltas.join(', ') : '') : '');
          etapasBox.querySelectorAll('[data-etapa-resumo]').forEach((n) => {
            const i = Number(n.dataset.etapaResumo);
            const e = D.planoDaFicha({ ...f, etapas: [f.etapas[i]] }, q, S.bem).etapas[0];
            const semConversao = e ? e.ingredientes.filter((x) => x.produtoId && x.quantidade > 0 && D.converter(x.quantidade, x.unidade, S.produto(x.produtoId)) == null).map((x) => S.nomeProduto(x.produtoId)) : [];
            n.textContent = (semConversao.length ? 'Sem conversão para a unidade do estoque (não vai baixar): ' + semConversao.join(', ') + '. ' : '') + (e ? 'Tempo ' + D.minutos(e.tempo) + ' · equipe ' + D.minutos(e.tempoEquipe) + (e.kg ? ' · ' + CD.numero(e.kg) + ' kg de ingredientes' : '') + (e.lotes > 1 ? ' · ' + e.lotes + ' processos (passa da capacidade)' : '') : 'Fora da faixa para a quantidade-base.');
          });
        }

        // Campo pequeno com rótulo visível; o aria-label numerado distingue as linhas para o leitor de tela.
        const mini = (rotulo, no) => { const aria = no.getAttribute('aria-label'); const l = campo(rotulo, no); if (aria) no.setAttribute('aria-label', aria); return l; };
        function linhaIngrediente(e, x, k) {
          const r = el('div', 'producao-linha');
          const prod = seletor(produtosOp, x.produtoId, 'Ingrediente');
          prod.setAttribute('aria-label', 'Ingrediente ' + (k + 1));
          const qtd = entrada('number', x.quantidade ?? '', { min: 0, step: 'any', inputMode: 'decimal', placeholder: 'Qtd.' });
          qtd.setAttribute('aria-label', 'Quantidade do ingrediente ' + (k + 1));
          const und = seletor(unidadesOp, x.unidade || 'KG');
          und.setAttribute('aria-label', 'Unidade do ingrediente ' + (k + 1));
          prod.onchange = () => { x.produtoId = prod.value; const p = S.produto(prod.value); if (p && !x.unidade) { x.unidade = p.unidadeIndividual && unidadesOp.includes(p.unidadeIndividual) ? p.unidadeIndividual : 'KG'; und.value = x.unidade; } desenhaResumo(); };
          qtd.oninput = () => { x.quantidade = numOuNulo(qtd.value); desenhaResumo(); };
          und.onchange = () => { x.unidade = und.value; desenhaResumo(); };
          if (!x.unidade) x.unidade = und.value;
          const rm = botao('Remover', () => { e.ingredientes.splice(k, 1); desenhaEtapas(); }, 'btn secondary perigo-texto');
          rm.setAttribute('aria-label', 'Remover ingrediente ' + (k + 1));
          r.append(mini('Ingrediente', prod), mini('Quantidade', qtd), mini('Unidade', und), rm);
          return r;
        }
        function linhaRecurso(e, x, k) {
          const r = el('div', 'producao-linha producao-linha-recurso');
          const bem = seletor(bensOp, x.patrimonioId, 'Sem equipamento (só mão de obra)');
          bem.setAttribute('aria-label', 'Equipamento ou utensílio ' + (k + 1));
          const tempo = entrada('number', x.tempoMin ?? '', { min: 0, step: 'any', inputMode: 'decimal', placeholder: 'Min' });
          tempo.setAttribute('aria-label', 'Tempo em minutos ' + (k + 1));
          const acomp = seletor(D.ACOMPANHAMENTOS.map((v) => [String(v), v === 0 ? 'Sem acompanhamento' : D.pct(v) + ' acompanhado']), String(x.acompanhamento ?? 1));
          acomp.setAttribute('aria-label', 'Acompanhamento ' + (k + 1));
          const cargoAtual = x.cargoKey || x.cargoNome ? S.cargo(x.cargoKey, x.cargoNome) : null;
          const cargosOp = S.cargos().map((c) => [c.key, c.nome]);
          if ((x.cargoKey || x.cargoNome) && !cargoAtual) cargosOp.unshift([x.cargoKey || '?', S.nomeCargo(x.cargoKey, x.cargoNome)]);
          const cargo = seletor(cargosOp, cargoAtual ? cargoAtual.key : x.cargoKey || '', 'Selecione');
          cargo.setAttribute('aria-label', 'Cargo ' + (k + 1));
          cargo.onchange = () => { const c = S.cargos().find((y) => y.key === cargo.value); x.cargoKey = c ? c.key : ''; x.cargoNome = c ? c.nome : ''; };
          const nivel = seletor(D.NIVEIS, x.nivel || '', 'Selecione');
          nivel.setAttribute('aria-label', 'Nível profissional ' + (k + 1));
          const fde = entrada('number', x.faixaDe ?? '', { min: 0, inputMode: 'decimal', placeholder: 'De' });
          fde.setAttribute('aria-label', 'Vale de (quantidade) ' + (k + 1));
          const fate = entrada('number', x.faixaAte ?? '', { min: 0, inputMode: 'decimal', placeholder: 'Até' });
          fate.setAttribute('aria-label', 'Vale até (quantidade) ' + (k + 1));
          bem.onchange = () => { x.patrimonioId = bem.value; desenhaResumo(); };
          tempo.oninput = () => { x.tempoMin = numOuNulo(tempo.value); desenhaResumo(); };
          acomp.onchange = () => { x.acompanhamento = Number(acomp.value); desenhaResumo(); };
          nivel.onchange = () => { x.nivel = nivel.value; };
          cargo.addEventListener('change', desenhaResumo);
          fde.oninput = () => { x.faixaDe = numOuNulo(fde.value); desenhaResumo(); };
          fate.oninput = () => { x.faixaAte = numOuNulo(fate.value); desenhaResumo(); };
          if (x.acompanhamento == null) x.acompanhamento = 1;
          const rm = botao('Remover', () => { e.recursos.splice(k, 1); desenhaEtapas(); }, 'btn secondary perigo-texto');
          rm.setAttribute('aria-label', 'Remover equipamento ' + (k + 1));
          r.append(mini('Equipamento / utensílio', bem), mini('Tempo (min)', tempo), mini('Acompanhamento', acomp), mini('Cargo', cargo), mini('Nível profissional', nivel), mini('Vale de (qtd.)', fde), mini('Até (qtd.)', fate), rm);
          return r;
        }

        function desenhaEtapas() {
          etapasBox.replaceChildren(...f.etapas.map((e, i) => {
            const box = el('section', 'producao-etapa');
            const cab = el('div', 'producao-etapa-cab');
            cab.append(el('h4', null, (i + 1) + 'ª etapa'));
            const acoes = el('div', 'producao-etapa-acoes');
            const sobe = botao('Subir', () => { [f.etapas[i - 1], f.etapas[i]] = [f.etapas[i], f.etapas[i - 1]]; desenhaEtapas(); });
            sobe.disabled = i === 0;
            const desce = botao('Descer', () => { [f.etapas[i + 1], f.etapas[i]] = [f.etapas[i], f.etapas[i + 1]]; desenhaEtapas(); });
            desce.disabled = i === f.etapas.length - 1;
            const rm = botao('Remover etapa', () => { f.etapas.splice(i, 1); desenhaEtapas(); }, 'btn secondary perigo-texto');
            rm.disabled = f.etapas.length === 1;
            acoes.append(sobe, desce, rm);
            cab.append(acoes);
            const grade = el('div', 'producao-etapa-grade');
            const proc = seletor(D.PROCESSOS, e.processo, 'Selecione');
            const parte = seletor(D.PARTES, e.parte, 'Não se aplica');
            const fde = entrada('number', e.faixaDe ?? '', { min: 0, inputMode: 'decimal' });
            const fate = entrada('number', e.faixaAte ?? '', { min: 0, inputMode: 'decimal' });
            const local = seletor(locaisOp, e.localId, 'Sem local');
            const instr = entrada('text', e.instrucao || '', { placeholder: 'Ex.: Vá à pré-pesagem e separe os ingredientes' });
            instr.dataset.textoLivre = '';
            proc.onchange = () => { e.processo = proc.value; };
            parte.onchange = () => { e.parte = parte.value; };
            fde.oninput = () => { e.faixaDe = numOuNulo(fde.value); desenhaResumo(); };
            fate.oninput = () => { e.faixaAte = numOuNulo(fate.value); desenhaResumo(); };
            local.onchange = () => { e.localId = local.value; };
            instr.oninput = () => { e.instrucao = instr.value; };
            grade.append(campo('Processo *', proc), campo('Parte do produto', parte), campo('Vale a partir de (qtd.)', fde), campo('Vale até (qtd.)', fate), campo('Onde é feita', local), campo('Instrução para quem executa', instr, 'Guardada para o guia por áudio, que vem depois.'));
            const ing = el('div', 'producao-bloco');
            ing.append(el('span', 'compras-rotulo', 'Ingredientes'));
            e.ingredientes.forEach((x, k) => ing.append(linhaIngrediente(e, x, k)));
            ing.append(botao('+ Ingrediente', () => { e.ingredientes.push({ produtoId: '', quantidade: null, unidade: '' }); desenhaEtapas(); }));
            const rec = el('div', 'producao-bloco');
            rec.append(el('span', 'compras-rotulo', 'Equipamentos, utensílios e mobiliário · tempo · acompanhamento · quem faz (cargo e nível)'));
            e.recursos.forEach((x, k) => rec.append(linhaRecurso(e, x, k)));
            rec.append(botao('+ Equipamento / tempo', () => { e.recursos.push({ patrimonioId: '', tempoMin: null, acompanhamento: 1, cargoKey: '', cargoNome: '', nivel: '', faixaDe: null, faixaAte: null }); desenhaEtapas(); }));
            rec.append(U.nota('Tempo por partes: uma linha por parte (ex.: masseira 5 min na velocidade 1 e outra linha com 10 min na velocidade 2). Sem acompanhamento = a máquina trabalha sozinha. "De/até" limita a linha a uma faixa de quantidade.'));
            const res = el('small', 'producao-etapa-resumo');
            res.dataset.etapaResumo = String(i);
            box.append(cab, grade, ing, rec, res);
            return box;
          }));
          desenhaResumo();
        }
        desenhaEtapas();

        if (existente) {
          const rod = el('div', 'compras-form-rodape');
          rod.append(botao('Excluir ficha', () => { form.closest('dialog').close(); U.confirmar('Excluir ficha', 'Excluir a ficha "' + existente.nome + '"? Pedidos já enviados guardam uma cópia e não mudam.', 'Excluir', () => { const r = SV.excluirFicha(existente.id); if (r.erro) return r.erro; U.avisar('Ficha excluída.'); }); }, 'btn secondary perigo-texto'));
          form.append(rod);
        }
        return {};
      },
      rotuloSalvar: 'Salvar ficha',
      salvar: () => {
        const limpa = structuredClone(f);
        limpa.etapas.forEach((e) => {
          e.ingredientes = e.ingredientes.filter((x) => x.produtoId || x.quantidade != null);
          e.recursos = e.recursos.filter((x) => x.patrimonioId || x.tempoMin != null);
          e.recursos.forEach((x) => { if (x.tempoMin == null) x.tempoMin = 0; });
        });
        const r = SV.salvarFicha(limpa);
        if (r.erro) return r.erro;
        U.avisar('Ficha salva.');
      },
    });
  }

  M.registrar('fichas', abrir);
})();
