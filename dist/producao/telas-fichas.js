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
  const { el, botao, entrada, seletor } = U;

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
    // As peças do formulário linha por linha moram na tela de Transferências (carrega antes desta, mas só aqui são lidas, ao abrir).
    const P = window.CicluzTransferencias && window.CicluzTransferencias.pecas;
    if (!P) return U.avisar('A tela não carregou por completo. Recarregue a página.');
    const { linha, linhaDe, quadro, secao, chave, botaoExcluir, ICONE } = P;
    const produzidos = S.produzidos();
    const f = existente ? structuredClone(existente) : { produtoId: produtoId || '', nome: '', padrao: false, quantidadeBase: null, producaoDe: null, producaoAte: null, rendimentoBruto: null, rendimentoLiquido: null, etapas: [novaEtapa()] };
    f.etapas.forEach((e) => { if (!Array.isArray(e.ingredientes)) e.ingredientes = []; if (!Array.isArray(e.recursos)) e.recursos = []; });
    if (!existente && f.produtoId) { const c = S.config(f.produtoId); if (c && c.formato) f.quantidadeBase = D.fornada(c.formato); }
    const produtosOp = S.produtos().filter((p) => p.status === 'ativo').sort((a, b) => a.descricao.localeCompare(b.descricao, 'pt-BR')).map((p) => [p.id, p.descricao]);
    const bensOp = S.patrimonio.dados.bens.filter((b) => b.ativo !== false).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map((b) => [b.id, D.nomeDe(D.CATEGORIAS, b.categoria) + ' · ' + b.nome + (b.capacidade ? ' (' + CD.numero(b.capacidade.valor) + ' ' + b.capacidade.unidade.toLowerCase() + ')' : '')]);
    const locaisOp = S.locais().map((l) => [l.id, l.caminho]);
    const unidadesOp = S.unidades();

    // Peças locais: texto de leitura na ponta da linha, botão redondo (mover, mais) e a linha de campo com o aria-label numerado, para o leitor de tela distinguir as repetições.
    const valorDa = (texto) => el('span', 'transferencia-linha-valor', texto);
    const botaoRedondo = (rotulo, desenho, acao) => { const b = el('button', 'transferencia-circulo'); b.type = 'button'; b.title = rotulo; b.setAttribute('aria-label', rotulo); b.innerHTML = U.svg(desenho); b.onclick = acao; return b; };
    const linhaCampo = (rotulo, no, aria) => { const l = linhaDe(rotulo, no); if (aria) no.setAttribute('aria-label', aria); return l; };
    const contagem = (n, um, varios) => (n ? n + ' ' + (n === 1 ? um : varios) : 'Nenhum');
    const CIMA = '<path d="m6 15 6-6 6 6"/>';

    U.dialogo({
      titulo: existente ? 'Editar ficha técnica' : 'Cadastro ficha técnica', largo: true, classe: 'compras-form-padrao transferencia-tela',
      montar: (form) => {
        const corpo = el('div', 'transferencia-corpo');
        form.append(corpo);
        const produto = seletor(produzidos.map(({ p }) => [p.id, p.descricao]), f.produtoId, 'Selecione');
        produto.disabled = Boolean(existente);
        const nome = entrada('text', f.nome, { placeholder: 'Ex.: Do zero, Com kit' });
        const base = entrada('number', f.quantidadeBase ?? '', { min: 0, inputMode: 'decimal' });
        const de = entrada('number', f.producaoDe ?? '', { min: 0, inputMode: 'decimal' });
        const ate = entrada('number', f.producaoAte ?? '', { min: 0, inputMode: 'decimal' });
        const bruto = entrada('number', f.rendimentoBruto ?? '', { min: 0, step: 'any', inputMode: 'decimal' });
        const liquido = entrada('number', f.rendimentoLiquido ?? '', { min: 0, step: 'any', inputMode: 'decimal' });
        const perdaTxt = el('small', 'profiles-note');
        const padrao = chave('Ficha padrão deste produto', Boolean(f.padrao), ['Sim', 'Não'], (sim) => { f.padrao = sim; });
        const atualizaPerda = () => { const pr = D.perda(Number(bruto.value), Number(liquido.value)); perdaTxt.textContent = pr ? 'Perda: ' + CD.numero(pr.kg) + ' kg (' + CD.numero(pr.pct * 100, 1) + '%)' : ''; };
        bruto.oninput = liquido.oninput = atualizaPerda;
        produto.onchange = () => { f.produtoId = produto.value; const c = S.config(produto.value); if (c && c.formato && !base.value) { base.value = D.fornada(c.formato); f.quantidadeBase = Number(base.value); } desenhaResumo(); };
        nome.oninput = () => { f.nome = nome.value; };
        base.oninput = () => { f.quantidadeBase = numOuNulo(base.value); desenhaResumo(); };
        de.oninput = () => { f.producaoDe = numOuNulo(de.value); };
        ate.oninput = () => { f.producaoAte = numOuNulo(ate.value); };
        corpo.append(
          secao('Dados da ficha', quadro(linhaCampo('Produto *', produto), linhaCampo('Nome da ficha *', nome), linhaCampo('Ingredientes para quantas unidades? *', base), linha('Ficha padrão deste produto', padrao)),
            U.nota('A ficha escala os ingredientes pela quantidade pedida. A ficha padrão é a usada nos pedidos.')),
          secao('Produção e rendimento', quadro(linhaCampo('Produção de', de), linhaCampo('Produção até', ate), linhaCampo('Rendimento bruto (kg, cru)', bruto), linhaCampo('Rendimento líquido (kg, frio)', liquido)), perdaTxt));
        atualizaPerda();

        // As etapas (e a linha "Adicionar etapa") são redesenhadas juntas; cada etapa, cada ingrediente e cada equipamento é um grupo de linhas.
        const etapasBox = el('div', 'transferencia-corpo');
        corpo.append(etapasBox);

        const resumoGeral = el('p', 'compras-texto-auto');
        resumoGeral.setAttribute('aria-live', 'polite');
        corpo.append(secao('Resumo', resumoGeral));

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

        function grupoIngrediente(e, i, x, k) {
          const prod = seletor(produtosOp, x.produtoId, 'Selecione');
          const qtd = entrada('number', x.quantidade ?? '', { min: 0, step: 'any', inputMode: 'decimal' });
          const und = seletor(unidadesOp, x.unidade || 'KG');
          prod.onchange = () => { x.produtoId = prod.value; const p = S.produto(prod.value); if (p && !x.unidade) { x.unidade = p.unidadeIndividual && unidadesOp.includes(p.unidadeIndividual) ? p.unidadeIndividual : 'KG'; und.value = x.unidade; } desenhaResumo(); };
          qtd.oninput = () => { x.quantidade = numOuNulo(qtd.value); desenhaResumo(); };
          und.onchange = () => { x.unidade = und.value; desenhaResumo(); };
          if (!x.unidade) x.unidade = und.value;
          const rm = botaoExcluir('Remover ingrediente ' + (k + 1), () => { e.ingredientes.splice(k, 1); desenhaEtapas(); });
          return secao((i + 1) + 'ª etapa · ingrediente ' + (k + 1), quadro(
            linhaCampo('Ingrediente', prod, 'Ingrediente ' + (k + 1)), linhaCampo('Quantidade', qtd, 'Quantidade do ingrediente ' + (k + 1)), linhaCampo('Unidade', und, 'Unidade do ingrediente ' + (k + 1)),
            linha('Remover ingrediente', valorDa(''), rm)));
        }
        function grupoRecurso(e, i, x, k) {
          const bem = seletor(bensOp, x.patrimonioId, 'Sem equipamento (só mão de obra)');
          const tempo = entrada('number', x.tempoMin ?? '', { min: 0, step: 'any', inputMode: 'decimal' });
          const acomp = seletor(D.ACOMPANHAMENTOS.map((v) => [String(v), v === 0 ? 'Sem acompanhamento' : D.pct(v) + ' acompanhado']), String(x.acompanhamento ?? 1));
          const cargoAtual = x.cargoKey || x.cargoNome ? S.cargo(x.cargoKey, x.cargoNome) : null;
          const cargosOp = S.cargos().map((c) => [c.key, c.nome]);
          if ((x.cargoKey || x.cargoNome) && !cargoAtual) cargosOp.unshift([x.cargoKey || '?', S.nomeCargo(x.cargoKey, x.cargoNome)]);
          const cargo = seletor(cargosOp, cargoAtual ? cargoAtual.key : x.cargoKey || '', 'Selecione');
          cargo.onchange = () => { const c = S.cargos().find((y) => y.key === cargo.value); x.cargoKey = c ? c.key : ''; x.cargoNome = c ? c.nome : ''; };
          const nivel = seletor(D.NIVEIS, x.nivel || '', 'Selecione');
          const fde = entrada('number', x.faixaDe ?? '', { min: 0, inputMode: 'decimal' });
          const fate = entrada('number', x.faixaAte ?? '', { min: 0, inputMode: 'decimal' });
          bem.onchange = () => { x.patrimonioId = bem.value; desenhaResumo(); };
          tempo.oninput = () => { x.tempoMin = numOuNulo(tempo.value); desenhaResumo(); };
          acomp.onchange = () => { x.acompanhamento = Number(acomp.value); desenhaResumo(); };
          nivel.onchange = () => { x.nivel = nivel.value; };
          cargo.addEventListener('change', desenhaResumo);
          fde.oninput = () => { x.faixaDe = numOuNulo(fde.value); desenhaResumo(); };
          fate.oninput = () => { x.faixaAte = numOuNulo(fate.value); desenhaResumo(); };
          if (x.acompanhamento == null) x.acompanhamento = 1;
          const rm = botaoExcluir('Remover equipamento ' + (k + 1), () => { e.recursos.splice(k, 1); desenhaEtapas(); });
          return secao((i + 1) + 'ª etapa · equipamento ' + (k + 1), quadro(
            linhaCampo('Equipamento / utensílio', bem, 'Equipamento ou utensílio ' + (k + 1)), linhaCampo('Tempo (min)', tempo, 'Tempo em minutos ' + (k + 1)),
            linhaCampo('Acompanhamento', acomp, 'Acompanhamento ' + (k + 1)), linhaCampo('Cargo', cargo, 'Cargo ' + (k + 1)), linhaCampo('Nível profissional', nivel, 'Nível profissional ' + (k + 1)),
            linhaCampo('Vale de (qtd.)', fde, 'Vale de (quantidade) ' + (k + 1)), linhaCampo('Até (qtd.)', fate, 'Vale até (quantidade) ' + (k + 1)),
            linha('Remover equipamento', valorDa(''), rm)));
        }
        // Linha "Adicionar …": o texto de contagem e o + redondo na ponta (como o "Adicionar item" dos lançamentos).
        function linhaAdicionar(rotulo, resumo, acao, ...notas) {
          const l = linha(rotulo, valorDa(resumo), botaoRedondo(rotulo, ICONE.mais, acao));
          l.classList.add('transferencia-linha-add');
          return secao('', quadro(l), ...notas);
        }

        function desenhaEtapas() {
          etapasBox.replaceChildren(...f.etapas.map((e, i) => {
            const box = el('div', 'transferencia-corpo'); box.dataset.etapa = String(i + 1); // marca a etapa (os testes de tela a procuram por aqui)
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
            const sobe = botaoRedondo('Subir etapa', CIMA, () => { [f.etapas[i - 1], f.etapas[i]] = [f.etapas[i], f.etapas[i - 1]]; desenhaEtapas(); });
            sobe.disabled = i === 0;
            const desce = botaoRedondo('Descer etapa', ICONE.baixo, () => { [f.etapas[i + 1], f.etapas[i]] = [f.etapas[i], f.etapas[i + 1]]; desenhaEtapas(); });
            desce.disabled = i === f.etapas.length - 1;
            const rm = botaoExcluir('Remover etapa', () => { f.etapas.splice(i, 1); desenhaEtapas(); });
            rm.disabled = f.etapas.length === 1;
            box.append(secao((i + 1) + 'ª etapa', quadro(
              linhaCampo('Processo *', proc), linhaCampo('Parte do produto', parte), linhaCampo('Vale a partir de (qtd.)', fde), linhaCampo('Vale até (qtd.)', fate), linhaCampo('Onde é feita', local), linhaCampo('Instrução para quem executa', instr),
              linha('Mover etapa', valorDa(''), sobe, desce), linha('Remover etapa', valorDa(''), rm)),
            U.nota('A instrução é guardada para o guia por áudio, que vem depois.')));
            e.ingredientes.forEach((x, k) => box.append(grupoIngrediente(e, i, x, k)));
            box.append(linhaAdicionar('Adicionar ingrediente', contagem(e.ingredientes.length, 'ingrediente', 'ingredientes'), () => { e.ingredientes.push({ produtoId: '', quantidade: null, unidade: '' }); desenhaEtapas(); }));
            e.recursos.forEach((x, k) => box.append(grupoRecurso(e, i, x, k)));
            box.append(linhaAdicionar('Adicionar equipamento / tempo', contagem(e.recursos.length, 'equipamento', 'equipamentos'), () => { e.recursos.push({ patrimonioId: '', tempoMin: null, acompanhamento: 1, cargoKey: '', cargoNome: '', nivel: '', faixaDe: null, faixaAte: null }); desenhaEtapas(); }),
              U.nota('Tempo por partes: uma linha por parte (ex.: masseira 5 min na velocidade 1 e outra linha com 10 min na velocidade 2). Sem acompanhamento = a máquina trabalha sozinha. "De/até" limita a linha a uma faixa de quantidade.'));
            const res = el('small', 'producao-etapa-resumo');
            res.dataset.etapaResumo = String(i);
            box.append(res);
            return box;
          }), linhaAdicionar('Adicionar etapa', contagem(f.etapas.length, 'etapa', 'etapas'), () => { f.etapas.push(novaEtapa()); desenhaEtapas(); }));
          desenhaResumo();
        }
        desenhaEtapas();

        if (existente) {
          corpo.append(secao('', quadro(linha('Excluir ficha', valorDa('Apaga esta ficha'), botaoExcluir('Excluir ficha', () => { form.closest('dialog').close(); U.confirmar('Excluir ficha', 'Excluir a ficha "' + existente.nome + '"? Pedidos já enviados guardam uma cópia e não mudam.', 'Excluir', () => { const r = SV.excluirFicha(existente.id); if (r.erro) return r.erro; U.avisar('Ficha excluída.'); }); })))));
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
