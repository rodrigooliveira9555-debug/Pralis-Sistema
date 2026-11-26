/*
 * Saídas › Lançamentos: DES - Despesas, MER - Mercadorias e RET - Retiradas (24/11/2026, pedido do Washington).
 * Uma janela de lançamento para CADA categoria. Desde 26/11/2026 (pedido do Washington) as três são "Formulário linha por linha (padrão da Transferência)":
 * o valor num quadro grande na cor da origem, fixo no topo (.transferencia-valor-cab: vermelho em Despesas, verde em Mercadorias, azul em Retiradas), e, embaixo,
 * um grupo por assunto (título pequeno acima, quadro com linhas de 52 px: nome à esquerda, valor à direita). As peças são as da Nova Transferência
 * (window.CicluzTransferencias.pecas: linha, linhaDe, quadro, secao, chave, abreAoTocarNaLinha, botaoExcluir, ICONE) e as de compras/ui.js (campo de data,
 * chips, janela). A classe transferencia-tela na janela é o que dá o desenho da referência, sem CSS paralelo. Os campos são os do "+ NOVO → Saídas" do
 * sistema principal (PROJECT_BRAIN/16); a Retirada é a versão enxuta (sem documento fiscal, pagamento, vencimento nem discriminação).
 * Dados: API do servidor (/api/lancamentos/...), não o localStorage. A conta de dinheiro é a do servidor (regras.js, gerado de
 * servidor/shared/src/lancamentos): o que a tela mostra é o que o servidor grava.
 * CAMPOS SÓ DE TELA (25/11/2026, pedido do Washington; falta onde guardar, migration a autorizar, PROJECT_BRAIN/11 P-47): Tipo de credor e Credor, as duas
 * fotos e o bloco "Discriminar com a Octad Lumi". A tela mostra, avisa que não grava e o Salvar repete o aviso quando algum deles foi preenchido.
 * Linhas que aparecem e somem (data do pagamento, itens, recorrência) entram e saem do quadro; nenhuma usa o atributo hidden (a linha tem display:flex).
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI; const R = window.CicluzLancamentosRegras; const D = window.CicluzComprasDominio; const Sync = window.CicluzSync;
  if (!U || !R || !D || !Sync) return;
  const { el, botao, entrada, seletor } = U;

  const CATEGORIAS = {
    despesas: { indice: 2, titulo: 'DES - Despesas', singular: 'Despesa', caminho: 'Saídas · Despesas / Lançamentos / DES - Despesas', corTexto: '#9c1c1c' },
    mercadorias: { indice: 3, titulo: 'MER - Mercadorias', singular: 'Mercadoria', caminho: 'Saídas · Mercadorias / Lançamentos / MER - Mercadorias', corTexto: '#12672e' },
    retiradas: { indice: 4, titulo: 'RET - Retiradas', singular: 'Retirada', caminho: 'Saídas · Retiradas / Lançamentos / RET - Retiradas', corTexto: '#174ca1' },
  };
  // Cor da origem (a mesma do menu da tela inicial).
  const corDe = (cat) => (typeof menuColor !== 'undefined' && menuColor[CATEGORIAS[cat].indice]) || '#7c3aed';
  const pode = (chave) => Boolean(window.CicluzSessao && window.CicluzSessao.perfil && (window.CicluzSessao.perfil.permissoes || []).includes(chave));
  const TIPOS = [['valor', 'R$'], ['percentual', '%']];
  // Tipos de credor de cada categoria (principal: utils/credor-categoria.ts). Despesa: credor opcional; Mercadoria e Retirada: obrigatório no principal.
  const CREDORES = {
    despesas: [['fornecedor', 'Fornecedor'], ['colaborador', 'Colaborador']],
    mercadorias: [['fornecedor', 'Fornecedor']],
    retiradas: [['fornecedor', 'Fornecedor'], ['socio', 'Sócio ou Gestor']],
  };
  const porNome = (a, b) => a[1].localeCompare(b[1], 'pt-BR');
  // Fornecedor: cadastro de Compras (por id). Colaborador: cadastro de pessoas deste aparelho (por id). Sócio ou Gestor: o cadastro ainda não existe (P-47).
  function listaDeCredores(tipo) {
    try {
      if (tipo === 'fornecedor') return window.CicluzComprasDados.dados.fornecedores.filter((f) => f.situacao !== 'inativo').map((f) => [f.id, f.nome]).sort(porNome);
      if (tipo === 'colaborador') return window.CicluzPeople.selectable().filter((p) => p.active !== false).map((p) => [p.id, p.name]).sort(porNome);
    } catch (e) { /* sem o cadastro neste aparelho */ }
    return [];
  }
  const AVISO_NAO_GRAVA = 'Credor, fotos e leitura por IA ainda não são gravados (em construção). O resto do lançamento é salvo normalmente.';
  const AVISO_NAO_GRAVA_RETIRADA = 'O credor ainda não é gravado (em construção). O resto do lançamento é salvo normalmente.';
  const FREQUENCIAS = [['dia', 'Todo dia'], ['semana', 'Toda semana'], ['quinzena', 'A cada 15 dias'], ['mes', 'Todo mês'], ['trimestre', 'A cada 3 meses'], ['ano', 'Todo ano']];
  const DIAS = [[1, 'Sg', 'Segunda'], [2, 'Te', 'Terça'], [3, 'Qa', 'Quarta'], [4, 'Qi', 'Quinta'], [5, 'Sx', 'Sexta'], [6, 'Sa', 'Sábado']];
  const casas = (tipo) => (tipo === 'percentual' ? 4 : 2); // R$ = 2; % = 4 (como no principal)
  const reais = (centavos) => D.moeda(centavos / 100);

  /* ---------------------------------------------------------------- API ---------------------------------------------------------------- */
  const mensagemDe = (e) => {
    if (e && e.codigo === 'VALIDATION_ERROR' && Array.isArray(e.detalhes) && e.detalhes.length) return e.detalhes.map((d) => d.mensagem).join(' · ');
    return (e && e.message) || 'Não foi possível salvar. Tente de novo.';
  };
  async function carregarCadastros(cat) {
    const [g, c] = await Promise.all([Sync.api('/financeiro/grupos?colecao=' + cat), Sync.api('/contas')]);
    const pais = new Map(g.grupos.filter((x) => !x.paiId).map((x) => [x.itemId, x.nome]));
    return {
      grupos: g.grupos.filter((x) => x.ativo).map((x) => [x.itemId, x.paiId ? (pais.get(x.paiId) || '') + ' › ' + x.nome : x.nome]),
      contas: c.contas.filter((x) => x.situacao === 'ATIVA').map((x) => [x.nome, x.nome]),
    };
  }

  /* ---------------------------------------------------------------- Entrada ---------------------------------------------------------------- */
  // O cartão (DES, MER ou RET) abre direto o formulário da categoria (pedido do Washington, 24/11/2026): sem lista no meio.
  function abrir(cat) {
    if (!CATEGORIAS[cat]) return console.warn('Lançamentos: categoria não encontrada', cat);
    return abrirFormulario(cat, null);
  }
  // Abre um lançamento já gravado (para a lista ou o relatório que vier a chamar).
  async function editar(cat, id) {
    try { const l = await Sync.api('/lancamentos/item/' + id); abrirFormulario(cat, l); } catch (e) { U.avisar((e && e.message) || 'Não foi possível abrir o lançamento.'); }
  }

  /* ---------------------------------------------------------------- Janela de edição ---------------------------------------------------------------- */
  const novoItem = () => ({ descricao: '', quantidade: '1', valorUnitario: '', descontoTipo: '', descontoValor: '', descontoTotalTipo: '', descontoTotalValor: '', grupoId: '' });
  const itemDeApi = (i) => ({
    descricao: i.descricao, quantidade: R.apiParaDinheiro(i.quantidade), valorUnitario: R.apiParaDinheiro(i.valorUnitario),
    descontoTipo: i.descontoTipo || '', descontoValor: R.apiParaDinheiro(i.descontoValor), descontoTotalTipo: i.descontoTotalTipo || '',
    descontoTotalValor: R.apiParaDinheiro(i.descontoTotalValor), grupoId: i.grupoId || '',
  });
  const itensParaApi = (itens) => itens.map((i) => ({
    descricao: i.descricao.trim(), quantidade: R.numeroParaApi(i.quantidade, 3), valorUnitario: R.numeroParaApi(i.valorUnitario, 4) ?? '0',
    descontoTipo: i.descontoTipo || null, descontoValor: i.descontoTipo ? R.numeroParaApi(i.descontoValor, casas(i.descontoTipo)) : null,
    descontoTotalTipo: i.descontoTotalTipo || null, descontoTotalValor: i.descontoTotalTipo ? R.numeroParaApi(i.descontoTotalValor, casas(i.descontoTotalTipo)) : null,
    grupoId: i.grupoId || null,
  }));

  async function abrirFormulario(cat, lanc) {
    // As peças do formulário linha por linha moram na tela de Transferências (carrega depois desta, por isso só aqui são lidas).
    const P = window.CicluzTransferencias && window.CicluzTransferencias.pecas;
    if (!P) return U.avisar('A tela não carregou por completo. Recarregue a página.');
    const { linha, linhaDe, quadro, secao, chave, abreAoTocarNaLinha, botaoExcluir, ICONE } = P;
    let cadastros;
    try { cadastros = await carregarCadastros(cat); } catch (e) { return U.avisar((e && e.message) || 'Não foi possível carregar contas e grupos.'); }
    const C = CATEGORIAS[cat]; const criando = !lanc; const retirada = cat === 'retiradas';
    const hoje = R.diaNegocio(new Date());
    const pago0 = Boolean(lanc && lanc.dataPagamento);
    const somenteLeitura = pago0 && !pode('lancamentos_editar_pago');
    const itens = (lanc && lanc.itens ? lanc.itens : []).map(itemDeApi);
    const estado = { discriminar: itens.length > 0, itens, descontoTipo: (lanc && lanc.descontoGeralTipo) || '', descontoValor: lanc ? R.apiParaDinheiro(lanc.descontoGeralValor) : '', linhaComErro: null };
    let reabrir = false; let criarNova = false;
    let fotoA = null; let fotoB = null; let credorEscolhido = null;
    // Registro antigo com conta ou grupo que saiu da lista: continua aparecendo para não perder o vínculo.
    const comAtual = (lista, v) => (v && !lista.some(([x]) => x === v) ? [...lista, [v, v]] : lista);
    // Peças locais: data com calendário (a linha inteira abre o painel), valor de leitura, arquivo e botão redondo de mais.
    const campoDeData = (rotulo, valor) => U.campoData({ rotulo, valor });
    const linhaDeData = (rotulo, d) => abreAoTocarNaLinha(linha(rotulo, d.caixa, d.painel), d.input, d.painel);
    const valorDa = (texto) => el('span', 'transferencia-linha-valor', texto);
    const botaoMais = (rotulo, acao) => { const b = el('button', 'transferencia-circulo'); b.type = 'button'; b.title = rotulo; b.setAttribute('aria-label', rotulo); b.innerHTML = U.svg(ICONE.mais); b.onclick = acao; return b; };
    // Escolha de arquivo: uma linha que abre o seletor (nome do arquivo à direita e seta, como a linha Anexos da Transferência). O input escondido vai no grupo.
    function linhaDeArquivo(rotulo) {
      const input = entrada('file'); input.accept = 'image/*,application/pdf,.xml'; input.hidden = true;
      const nome = valorDa('Nenhum arquivo');
      const seta = el('span', 'transferencia-seta'); seta.setAttribute('aria-hidden', 'true'); seta.innerHTML = U.svg('<path d="m9 6 6 6-6 6"/>');
      const b = el('button', 'transferencia-linha transferencia-linha-acao'); b.type = 'button'; b.append(el('span', 'transferencia-linha-rotulo', rotulo), nome, seta);
      b.onclick = () => input.click();
      input.addEventListener('change', () => { nome.textContent = input.files.length ? input.files[0].name : 'Nenhum arquivo'; });
      return { no: b, input };
    }

    U.dialogo({
      titulo: (criando ? 'Nova ' : 'Editar ') + C.singular, subtitulo: C.caminho + (lanc && lanc.recorrenciaOrdem ? ' · ocorrência ' + lanc.recorrenciaOrdem + ' da série' : ''),
      largo: true, classe: 'compras-form-padrao transferencia-tela', cor: corDe(cat), corTexto: C.corTexto, rotuloSalvar: 'Salvar',
      aoFechar: () => { if (reabrir) abrirFormulario(cat, null); },
      montar: (form, dlg) => {
        // O caminho já está no cabeçalho: tira a linha repetida, para o quadro do valor ser o primeiro item e ficar fixo no topo (como na Transferência).
        const repetido = dlg.querySelector('.compras-dialog-sub'); if (repetido) repetido.remove();

        /* Campos */
        const valor = entrada('text', lanc ? R.apiParaDinheiro(lanc.valorOriginal) : '', { inputMode: 'decimal', placeholder: 'R$ 0,00', autocomplete: 'off' });
        valor.classList.add('transferencia-calc-tela'); valor.setAttribute('aria-label', 'Valor da ' + C.singular.toLowerCase());
        const jurosTipo = seletor(TIPOS, (lanc && lanc.jurosTipo) || '', 'Sem juros');
        const jurosValor = entrada('text', lanc && lanc.jurosTipo ? R.apiParaDinheiro(lanc.jurosValorInformado) : '', { inputMode: 'decimal', placeholder: '0,00' });
        const dataRef = campoDeData('Data do lançamento *', (lanc && lanc.dataReferencia) || hoje);
        const docData = campoDeData('Data do documento fiscal', (lanc && lanc.dataDocumentoFiscal) || '');
        const docNumero = entrada('text', (lanc && lanc.numeroDocumentoFiscal) || '', { maxLength: 60 });
        const grupo = seletor(comAtual(cadastros.grupos, lanc && lanc.grupoId), (lanc && lanc.grupoId) || '', 'Sem grupo');
        const conta = seletor(comAtual(cadastros.contas, lanc && lanc.contaNome), (lanc && lanc.contaNome) || '', 'Sem conta');
        const obs = entrada('text', (lanc && lanc.observacao) || '', { maxLength: 500, placeholder: 'Ex.: conta de luz de novembro' });
        const venc = campoDeData('Vencimento *', (lanc && lanc.dataVencimento) || hoje);
        const dataPag = campoDeData('Data do pagamento', (lanc && lanc.dataPagamento) || '');
        const linhaJurosValor = linhaDe('Juros (R$)', jurosValor);

        /* Quadro do valor: o laranja da Transferência, na cor da origem. Mostra o total (valor + juros − desconto geral) embaixo do valor. */
        const resumoValor = el('p', 'transferencia-calc-resumo'); resumoValor.setAttribute('role', 'status');
        const blocoValor = el('div', 'transferencia-valor-cab');
        blocoValor.append(el('span', 'transferencia-valor-rotulo', 'Valor da ' + C.singular.toLowerCase() + ' *'), valor, resumoValor);

        /* Prévia: a mesma conta do servidor */
        const avisoSoma = el('p', 'profiles-error'); avisoSoma.setAttribute('role', 'status');
        const totaisLinha = [];
        const discriminando = () => !retirada && estado.discriminar && estado.itens.length > 0;
        const descontoGeralApi = () => (estado.descontoTipo ? R.numeroParaApi(estado.descontoValor, casas(estado.descontoTipo)) : null);
        function previa() {
          const v = R.dinheiroParaApi(valor.value) || '0';
          const calculo = discriminando() ? R.calcularDiscriminacao({ itens: itensParaApi(estado.itens).map((i) => ({ ...i, quantidade: i.quantidade ?? 1 })), descontoGeralTipo: estado.descontoTipo || null, descontoGeralValor: descontoGeralApi() }) : null;
          const juros = R.jurosCentavos({ valorOriginal: v, jurosTipo: jurosTipo.value || null, jurosValorInformado: jurosTipo.value ? R.numeroParaApi(jurosValor.value, casas(jurosTipo.value)) : null });
          const desconto = calculo ? calculo.descontoGeralCentavos : 0;
          const valorC = R.paraCentavos(v);
          return { total: Math.max(0, valorC + juros - desconto), desconto, juros, linhas: calculo ? calculo.itens.map((i) => i.valorTotalCentavos) : [], diferenca: calculo ? calculo.totalItensCentavos - valorC : 0 };
        }
        function recalcular() {
          const p = previa();
          const como = p.desconto ? 'valor + juros − desconto geral (' + reais(p.desconto) + ')' : jurosTipo.value ? 'valor + juros' : '';
          resumoValor.textContent = p.total ? 'Total ' + reais(p.total) + (como ? ' · ' + como : '') : '';
          totaisLinha.forEach((no, i) => { no.value = reais(p.linhas[i] || 0); });
          // D5: a soma dos itens (sem o desconto geral) tem de bater com o Valor.
          avisoSoma.textContent = discriminando() && p.diferenca !== 0 ? 'A soma dos itens ' + (p.diferenca > 0 ? 'excede' : 'não alcança') + ' o valor em ' + reais(Math.abs(p.diferenca)) + '. Só dá para salvar quando bater.' : '';
        }
        const pintarJuros = () => {
          const texto = jurosTipo.value === 'percentual' ? 'Juros (%)' : 'Juros (R$)';
          linhaJurosValor.querySelector('.transferencia-linha-rotulo').textContent = texto; jurosValor.setAttribute('aria-label', texto); jurosValor.disabled = !jurosTipo.value;
        };
        [valor, jurosValor].forEach((i) => i.addEventListener('input', recalcular));
        jurosTipo.addEventListener('change', () => { pintarJuros(); recalcular(); });
        pintarJuros();

        /* Grupos */
        const gJuros = secao('Juros', quadro(linhaDe('Tipo do juros', jurosTipo), linhaJurosValor));
        const qDatas = quadro(linhaDeData('Data do lançamento *', dataRef));
        if (!retirada) qDatas.append(linhaDeData('Data do documento fiscal', docData), linhaDe('Nº do documento fiscal', docNumero));
        const gDatas = secao('Datas', qDatas);
        const qClass = quadro(); if (retirada) qClass.append(linhaDe('Grupo', grupo));
        qClass.append(linhaDe('Conta', conta), linhaDe('Observação *', obs));
        const gClass = secao('Classificação', qClass);
        /* Credor: só tela (ainda não grava) */
        const estadoCredor = { tipo: CREDORES[cat][0][0] };
        const credor = seletor([], '', '—');
        const notaCredor = U.nota('');
        const pintarCredor = () => {
          const lista = listaDeCredores(estadoCredor.tipo);
          credor.replaceChildren(new Option('—', ''), ...lista.map(([v, t]) => new Option(t, v))); credor.value = '';
          notaCredor.textContent = lista.length ? '' : estadoCredor.tipo === 'socio' ? 'O cadastro de Sócios e Gestores ainda não existe.' : 'Nenhum cadastro encontrado neste aparelho.';
          notaCredor.hidden = !notaCredor.textContent;
        };
        const gCredor = secao('Credor', quadro(linha('Tipo de credor', U.chips(CREDORES[cat], estadoCredor.tipo, (v) => { estadoCredor.tipo = v; pintarCredor(); })), linhaDe('Credor', credor)), notaCredor);
        pintarCredor();
        const corpo = el('div', 'transferencia-corpo');
        corpo.append(blocoValor, gJuros, gDatas, gCredor, gClass);

        if (!retirada) {
          /* Pagamento: a data do pagamento só entra no quadro quando "Pagamento realizado" é Sim */
          const linhaDataPag = linhaDeData('Data do pagamento', dataPag);
          const qPag = quadro();
          const sw = chave('Pagamento realizado', pago0, ['Sim', 'Não'], (sim) => { dataPag.definir(sim ? (dataPag.valor() || hoje) : ''); pintarPag(sim); });
          const linhaPag = linha('Pagamento realizado', sw);
          const linhaVenc = linhaDeData('Vencimento *', venc);
          const pintarPag = (sim) => qPag.replaceChildren(linhaPag, ...(sim ? [linhaDataPag] : []), linhaVenc);
          pintarPag(pago0);
          const gPag = secao('Pagamento', qPag);
          if (!pode('lancamentos_pagar')) { sw.querySelector('button').disabled = true; gPag.append(U.nota('Você não tem permissão para registrar pagamento.')); }
          /* Fotos: só tela (ainda não grava nem envia o arquivo) */
          fotoA = linhaDeArquivo('Foto (Recibo / Boleto / Nota)'); fotoB = linhaDeArquivo('Foto (Nota / interno)');
          const gFotos = secao('Fotos', quadro(fotoA.no, fotoB.no), fotoA.input, fotoB.input);

          /* Discriminação dos itens: cada linha é um grupo; o "Adicionar item" é uma linha com o + redondo */
          const itensBox = el('div', 'transferencia-corpo');
          const contagemItens = valorDa('');
          const desenhar = () => {
            totaisLinha.length = 0; itensBox.replaceChildren(); itensBox.style.display = estado.discriminar ? '' : 'none';
            if (!estado.discriminar) return recalcular();
            estado.itens.forEach((it, n) => {
              const rotulo = 'Linha ' + (n + 1); const comErro = estado.linhaComErro === n + 1;
              const ligar = (no, campoDoItem) => { no.addEventListener('input', () => { it[campoDoItem] = no.value; recalcular(); }); no.addEventListener('change', () => { it[campoDoItem] = no.value; recalcular(); }); return no; };
              const texto = (campoDoItem, extra = {}) => ligar(entrada('text', it[campoDoItem], extra), campoDoItem);
              const tipo = (campoDoItem) => ligar(seletor(TIPOS, it[campoDoItem], 'Sem desconto'), campoDoItem);
              const totalLinha = entrada('text', '', { readOnly: true }); totaisLinha.push(totalLinha);
              const q = quadro(
                linhaDe('Descrição *', texto('descricao', { maxLength: 200 })), linhaDe('Quantidade', texto('quantidade', { inputMode: 'decimal' })),
                linhaDe('Valor unitário (R$)', texto('valorUnitario', { inputMode: 'decimal', placeholder: '0,00' })),
                linhaDe('Tipo do desconto unitário', tipo('descontoTipo')), linhaDe('Valor do desconto unitário', texto('descontoValor', { inputMode: 'decimal' })),
                linhaDe('Tipo do desconto no total', tipo('descontoTotalTipo')), linhaDe('Valor do desconto no total', texto('descontoTotalValor', { inputMode: 'decimal' })),
                linhaDe('Grupo', ligar(seletor(comAtual(cadastros.grupos, it.grupoId), it.grupoId, 'Sem grupo'), 'grupoId')), linhaDe('Total da linha', totalLinha),
                linha('Remover ' + rotulo.toLowerCase(), valorDa(''), botaoExcluir('Remover ' + rotulo.toLowerCase(), () => { estado.itens.splice(n, 1); desenhar(); })));
              itensBox.append(secao(rotulo + (comErro ? ' · provável erro' : ''), q));
            });
            const geralTipo = seletor(TIPOS, estado.descontoTipo, 'Sem desconto'); const geralValor = entrada('text', estado.descontoValor, { inputMode: 'decimal' });
            geralTipo.addEventListener('change', () => { estado.descontoTipo = geralTipo.value; geralValor.disabled = !geralTipo.value; recalcular(); });
            geralValor.addEventListener('input', () => { estado.descontoValor = geralValor.value; recalcular(); }); geralValor.disabled = !estado.descontoTipo;
            contagemItens.textContent = estado.itens.length + (estado.itens.length === 1 ? ' item' : ' itens');
            const linhaAdd = linha('Adicionar item', contagemItens, botaoMais('Adicionar item', () => { estado.itens.push(novoItem()); desenhar(); }));
            linhaAdd.classList.add('transferencia-linha-add');
            itensBox.append(secao('', quadro(linhaAdd)), secao('Vale presente / desconto no total', quadro(linhaDe('Tipo do desconto', geralTipo), linhaDe('Valor do desconto', geralValor))), avisoSoma);
            recalcular();
          };
          const discSw = chave('Discriminar itens', estado.discriminar, ['Sim', 'Não'], (sim) => { estado.discriminar = sim; if (sim && !estado.itens.length) estado.itens.push(novoItem()); desenhar(); });
          const gDisc = secao('Discriminação', quadro(linha('Discriminar com a Octad Lumi (IA)', valorDa('Em construção')), linha('Discriminar itens', discSw)), U.nota('A IA sugere os itens a partir da foto da nota. Leitura por IA: em construção.'));
          corpo.append(gPag, gFotos, gDisc, itensBox);
          desenhar();
        } else recalcular();

        /* Recorrência: só ao criar, e com a permissão */
        const rec = { ligada: false, frequencia: 'mes', repeticoes: '12', dias: [] };
        if (criando && pode('lancamentos_recorrencia')) {
          const freq = seletor(FREQUENCIAS, rec.frequencia); const vezes = entrada('number', rec.repeticoes, { min: 1, max: 366 });
          const diasBox = el('div', 'compras-chips'); diasBox.setAttribute('role', 'group'); diasBox.setAttribute('aria-label', 'Dias da semana');
          DIAS.forEach(([v, rotulo, nome]) => { const b = botao(rotulo, () => { rec.dias = rec.dias.includes(v) ? rec.dias.filter((d) => d !== v) : [...rec.dias, v]; b.classList.toggle('ativo', rec.dias.includes(v)); b.setAttribute('aria-pressed', String(rec.dias.includes(v))); }, 'compras-chip'); b.title = nome; b.setAttribute('aria-label', nome); b.setAttribute('aria-pressed', 'false'); diasBox.append(b); });
          const linhaDias = linha('', diasBox);
          const nota = U.nota('Dia, semana, quinzena e mês param em 12 meses. Em Toda semana, sem dias marcados vale o mesmo dia do vencimento.');
          const qRec = quadro(); const linhaSw = linha('Repetir este lançamento', chave('Repetir este lançamento', false, ['Sim', 'Não'], (sim) => { rec.ligada = sim; pintarRec(); }));
          const linhaFreq = linhaDe('Repetir', freq); const linhaVezes = linhaDe('Quantas vezes (com esta)', vezes);
          const pintarRec = () => { qRec.replaceChildren(linhaSw, ...(rec.ligada ? [linhaFreq, linhaVezes, ...(freq.value === 'semana' ? [linhaDias] : [])] : [])); nota.hidden = !rec.ligada; };
          freq.addEventListener('change', () => { rec.frequencia = freq.value; pintarRec(); }); vezes.addEventListener('input', () => { rec.repeticoes = vezes.value; });
          corpo.append(secao('Recorrência', qRec, nota)); pintarRec();
        } else if (lanc && lanc.recorrenciaId) {
          const q = quadro(linha('Ocorrência', valorDa(lanc.recorrenciaOrdem + ' da série')));
          if (pode('lancamentos_cancelar_serie') && !lanc.dataPagamento) {
            const cancelar = () => U.confirmar('Cancelar a série', 'Apaga as ocorrências futuras ainda não pagas. Continuar?', 'Cancelar a série', async () => {
              try { const r = await Sync.api('/lancamentos/series/' + lanc.recorrenciaId + '/cancelar', { metodo: 'PATCH' }); U.avisar(r.removidas + ' lançamento(s) futuro(s) da série removido(s).'); dlg.close(); } catch (e) { U.avisar(mensagemDe(e)); }
            }, { cor: corDe(cat), corTexto: C.corTexto });
            q.append(linha('Cancelar a série', valorDa('Apaga as futuras não pagas'), botaoExcluir('Cancelar a série', cancelar)));
          }
          corpo.append(secao('Recorrência', q));
        }
        corpo.append(U.nota(retirada ? AVISO_NAO_GRAVA_RETIRADA : AVISO_NAO_GRAVA));
        form.append(corpo);

        if (somenteLeitura) { form.querySelectorAll('input,select,textarea,button.account-status-switch').forEach((n) => { n.disabled = true; }); blocoValor.after(U.nota('Lançamento pago: você não tem permissão para alterar.')); }
        recalcular();

        // "Salvar e criar nova": ao lado do Salvar; depois de salvar abre a janela em branco.
        if (criando) setTimeout(() => {
          const acoes = dlg.querySelector('.compras-dialog-acoes'); const salvarBtn = acoes && acoes.querySelector('button[type=submit]');
          if (salvarBtn) salvarBtn.before(botao('Salvar e criar nova', () => { criarNova = true; form.requestSubmit(); }, 'btn secondary'));
        }, 0);
        credorEscolhido = credor; return { cat, valor, jurosTipo, jurosValor, dataRef, docData, docNumero, grupo, conta, obs, venc, dataPag, rec };
      },
      salvar: somenteLeitura ? null : async (c) => {
        const querCriarNova = criarNova; criarNova = false;
        const numero = (txt, n) => !String(txt || '').trim() || R.numeroParaApi(txt, n) !== null;
        if (!R.dinheiroParaApi(c.valor.value)) return c.valor.value.trim() ? 'Valor em formato inválido. Use 1.234,56 (no máximo 2 casas).' : 'Informe o valor.';
        if (c.jurosTipo.value && !numero(c.jurosValor.value, casas(c.jurosTipo.value))) return c.jurosTipo.value === 'percentual' ? 'Juros inválido. Use até 4 casas.' : 'Juros inválido. Use 1.234,56 (no máximo 2 casas).';
        if (!c.dataRef.valor()) return c.dataRef.input.value ? 'Data do lançamento inválida. Use DD/MM/AA.' : 'Informe a data do lançamento.';
        if (!retirada && !c.venc.valor()) return c.venc.input.value ? 'Vencimento inválido. Use DD/MM/AA.' : 'Informe o vencimento.';
        if (!retirada && c.docData.input.value && !c.docData.valor()) return 'Data do documento fiscal inválida. Use DD/MM/AA.';
        if (!retirada && c.dataPag.input.value && !c.dataPag.valor()) return 'Data do pagamento inválida. Use DD/MM/AA.';
        if (!c.obs.value.trim()) return 'Informe a observação.';
        const disc = !retirada && estado.discriminar && estado.itens.length > 0;
        if (disc) {
          if (estado.descontoTipo && !numero(estado.descontoValor, casas(estado.descontoTipo))) return 'Desconto geral inválido.';
          for (let n = 0; n < estado.itens.length; n += 1) {
            const i = estado.itens[n]; const txt = 'Linha ' + (n + 1) + ': ';
            if (!i.descricao.trim()) return txt + 'descreva o item.';
            if (!numero(i.quantidade, 3)) return txt + 'quantidade com até 3 casas.';
            if (!R.numeroParaApi(i.valorUnitario, 4)) return txt + 'informe o valor unitário (até 4 casas).';
            if (i.descontoTipo && !numero(i.descontoValor, casas(i.descontoTipo))) return txt + 'desconto unitário inválido.';
            if (i.descontoTotalTipo && !numero(i.descontoTotalValor, casas(i.descontoTotalTipo))) return txt + 'desconto no total inválido.';
          }
          const v = R.dinheiroParaApi(c.valor.value) || '0';
          const calc = R.calcularDiscriminacao({ itens: itensParaApi(estado.itens).map((i) => ({ ...i, quantidade: i.quantidade ?? 1 })), descontoGeralTipo: estado.descontoTipo || null, descontoGeralValor: estado.descontoTipo ? R.numeroParaApi(estado.descontoValor, casas(estado.descontoTipo)) : null });
          if (calc.totalItensCentavos !== R.paraCentavos(v)) return 'A soma dos itens não bate com o valor. Ajuste e salve de novo.';
        }
        const corpo = {
          dataReferencia: c.dataRef.valor() || null,
          // Retirada não tem Vencimento na tela (como no principal): vale a data do lançamento.
          dataVencimento: retirada ? (c.dataRef.valor() || null) : (c.venc.valor() || null),
          dataPagamento: retirada ? ((lanc && lanc.dataPagamento) || null) : (c.dataPag.valor() || null),
          observacao: c.obs.value.trim(),
          valorOriginal: R.dinheiroParaApi(c.valor.value),
          jurosTipo: c.jurosTipo.value || null,
          jurosValorInformado: c.jurosTipo.value ? R.numeroParaApi(c.jurosValor.value, casas(c.jurosTipo.value)) : null,
          contaNome: c.conta.value || null,
          grupoId: retirada ? (c.grupo.value || null) : ((lanc && lanc.grupoId) || null),
          numeroDocumentoFiscal: retirada ? ((lanc && lanc.numeroDocumentoFiscal) || null) : (c.docNumero.value.trim() || null),
          dataDocumentoFiscal: retirada ? ((lanc && lanc.dataDocumentoFiscal) || null) : (c.docData.valor() || null),
          itens: disc ? itensParaApi(estado.itens) : [],
          descontoGeralTipo: disc ? (estado.descontoTipo || null) : null,
          descontoGeralValor: disc && estado.descontoTipo ? R.numeroParaApi(estado.descontoValor, casas(estado.descontoTipo)) : null,
        };
        if (!criando) corpo.atualizadoEmBase = lanc.atualizadoEm;
        if (criando && c.rec.ligada) corpo.recorrencia = { frequencia: c.rec.frequencia, repeticoes: Number(c.rec.repeticoes) || 1, diasSemana: c.rec.frequencia === 'semana' ? c.rec.dias : [] };
        try {
          let msg = 'Lançamento atualizado.';
          if (criando) {
            const r = await Sync.api('/lancamentos/' + cat, { metodo: 'POST', corpo });
            msg = r && r.serie ? 'Série criada com ' + r.serie + ' lançamentos' + (r.serieLimitada ? ' (limitada a 12 meses).' : '.') : 'Lançamento salvo.';
          } else await Sync.api('/lancamentos/item/' + lanc.id, { metodo: 'PUT', corpo });
          const usouCampoDeTela = (credorEscolhido && credorEscolhido.value) || (fotoA && fotoA.input.files.length) || (fotoB && fotoB.input.files.length);
          U.avisar(usouCampoDeTela ? msg + (retirada ? ' O credor ainda não é gravado.' : ' Credor e fotos ainda não são gravados.') : msg);
          reabrir = querCriarNova && criando;
        } catch (e) {
          if (e && e.codigo === 'DISCRIMINACAO_DIVERGENTE' && e.detalhes && e.detalhes.linhaProvavel) estado.linhaComErro = e.detalhes.linhaProvavel;
          return mensagemDe(e);
        }
        return undefined;
      },
    });
  }

  window.CicluzLancamentos = { abrir, editar, categorias: () => Object.keys(CATEGORIAS) };
})();
