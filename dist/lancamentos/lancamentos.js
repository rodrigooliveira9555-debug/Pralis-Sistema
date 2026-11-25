/*
 * Saídas › Lançamentos: DES - Despesas, MER - Mercadorias e RET - Retiradas (24/11/2026, pedido do Washington).
 * Uma lista e uma janela de edição para CADA categoria, no padrão das telas do site (peças de compras/ui.js: cabeçalho na cor da origem,
 * quadros com o título na borda, campos com o rótulo na borda, interruptor Sim/Não). Os campos são os do "+ NOVO → Saídas" do sistema
 * principal (PROJECT_BRAIN/16); a Retirada é a versão enxuta (sem documento fiscal, pagamento, vencimento nem discriminação).
 * Dados: API do servidor (/api/lancamentos/...), não o localStorage. A conta de dinheiro é a do servidor (regras.js, gerado de
 * servidor/shared/src/lancamentos): o que a tela mostra é o que o servidor grava.
 * CAMPOS SÓ DE TELA (25/11/2026, pedido do Washington; falta onde guardar, migration a autorizar, PROJECT_BRAIN/11 P-47): Tipo de credor e Credor, as duas
 * fotos e o bloco "Discriminar com a Octad Lumi". A tela mostra, avisa que não grava e o Salvar repete o aviso quando algum deles foi preenchido.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI; const R = window.CicluzLancamentosRegras; const D = window.CicluzComprasDominio; const Sync = window.CicluzSync;
  if (!U || !R || !D || !Sync) return;
  const { el, botao, campo, entrada, seletor } = U;

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
  // Escolha de arquivo no padrão do site (input escondido + botão + nome do arquivo, como em compras/telas-produto-extras.js).
  function campoArquivo(rotulo) {
    const input = entrada('file'); input.accept = 'image/*,application/pdf,.xml'; input.hidden = true;
    const nome = el('small', 'profiles-note', 'Nenhum arquivo escolhido');
    input.addEventListener('change', () => { nome.textContent = input.files.length ? input.files[0].name : 'Nenhum arquivo escolhido'; });
    const linha = el('div', 'compras-chips'); linha.append(botao('Escolher arquivo', () => input.click(), 'btn secondary'), nome);
    const no = el('div', 'compras-campo'); no.append(el('span', 'compras-rotulo', rotulo), linha, input);
    return { no, input };
  }
  const FREQUENCIAS = [['dia', 'Todo dia'], ['semana', 'Toda semana'], ['quinzena', 'A cada 15 dias'], ['mes', 'Todo mês'], ['trimestre', 'A cada 3 meses'], ['ano', 'Todo ano']];
  const DIAS = [[1, 'Sg', 'Segunda'], [2, 'Te', 'Terça'], [3, 'Qa', 'Quarta'], [4, 'Qi', 'Quinta'], [5, 'Sx', 'Sexta'], [6, 'Sa', 'Sábado']];
  const casas = (tipo) => (tipo === 'percentual' ? 4 : 2); // R$ = 2; % = 4 (como no principal)
  const reais = (centavos) => D.moeda(centavos / 100);
  const quadro = (titulo, ...filhos) => { const f = el('fieldset', 'compras-fieldset'); f.append(el('legend', null, titulo), ...filhos); return f; };
  const largo = (no) => { no.classList.add('compras-largo'); return no; };
  // Campo de data: a peça única é U.campoData (compras/campo-data.js); aqui só entra o rótulo e o painel no campo.
  function campoDeData(rotulo, valor) {
    const d = U.campoData({ rotulo, valor });
    d.no = el('div', 'compras-campo compras-data'); d.no.append(el('span', 'compras-rotulo', rotulo), d.caixa, d.painel);
    return d;
  }

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

    U.dialogo({
      titulo: (criando ? 'Nova ' : 'Editar ') + C.singular, subtitulo: C.caminho + (lanc && lanc.recorrenciaOrdem ? ' · ocorrência ' + lanc.recorrenciaOrdem + ' da série' : ''),
      largo: true, classe: 'compras-form-padrao', cor: corDe(cat), corTexto: C.corTexto, rotuloSalvar: 'Salvar',
      aoFechar: () => { if (reabrir) abrirFormulario(cat, null); },
      montar: (form, dlg) => {
        /* Campos */
        const valor = entrada('text', lanc ? R.apiParaDinheiro(lanc.valorOriginal) : '', { inputMode: 'decimal', placeholder: '0,00' });
        const jurosTipo = seletor(TIPOS, (lanc && lanc.jurosTipo) || '', 'Sem juros');
        const jurosValor = entrada('text', lanc && lanc.jurosTipo ? R.apiParaDinheiro(lanc.jurosValorInformado) : '', { inputMode: 'decimal', placeholder: '0,00' });
        const total = entrada('text', '', { readOnly: true });
        const dataRef = campoDeData('Data do lançamento *', (lanc && lanc.dataReferencia) || hoje);
        const docData = campoDeData('Data do documento fiscal', (lanc && lanc.dataDocumentoFiscal) || '');
        const docNumero = entrada('text', (lanc && lanc.numeroDocumentoFiscal) || '', { maxLength: 60 });
        const grupo = seletor(comAtual(cadastros.grupos, lanc && lanc.grupoId), (lanc && lanc.grupoId) || '', 'Sem grupo');
        const conta = seletor(comAtual(cadastros.contas, lanc && lanc.contaNome), (lanc && lanc.contaNome) || '', 'Sem conta');
        const obs = el('textarea'); obs.value = (lanc && lanc.observacao) || ''; obs.rows = 3; obs.maxLength = 500;
        const venc = campoDeData('Vencimento *', (lanc && lanc.dataVencimento) || hoje);
        const dataPag = campoDeData('Data do pagamento', (lanc && lanc.dataPagamento) || '');
        const rotJuros = campo('Juros', jurosValor);
        const campoJurosTipo = campo('Tipo do juros', jurosTipo);
        const campoTotal = campo('Valor Total', total, 'Valor + juros');
        const campoValor = campo('Valor (R$) *', valor);

        /* Prévia: a mesma conta do servidor */
        const avisoSoma = el('p', 'profiles-error compras-largo'); avisoSoma.setAttribute('role', 'status');
        const descontoNota = el('small', 'profiles-note');
        const totaisLinha = [];
        const discriminando = () => !retirada && estado.discriminar && estado.itens.length > 0;
        const descontoGeralApi = () => (estado.descontoTipo ? R.numeroParaApi(estado.descontoValor, casas(estado.descontoTipo)) : null);
        function previa() {
          const v = R.dinheiroParaApi(valor.value) || '0';
          const calculo = discriminando() ? R.calcularDiscriminacao({ itens: itensParaApi(estado.itens).map((i) => ({ ...i, quantidade: i.quantidade ?? 1 })), descontoGeralTipo: estado.descontoTipo || null, descontoGeralValor: descontoGeralApi() }) : null;
          const juros = R.jurosCentavos({ valorOriginal: v, jurosTipo: jurosTipo.value || null, jurosValorInformado: jurosTipo.value ? R.numeroParaApi(jurosValor.value, casas(jurosTipo.value)) : null });
          const desconto = calculo ? calculo.descontoGeralCentavos : 0;
          const valorC = R.paraCentavos(v);
          return { total: Math.max(0, valorC + juros - desconto), desconto, linhas: calculo ? calculo.itens.map((i) => i.valorTotalCentavos) : [], diferenca: calculo ? calculo.totalItensCentavos - valorC : 0 };
        }
        function recalcular() {
          const p = previa();
          total.value = reais(p.total);
          descontoNota.textContent = p.desconto ? 'Já com o desconto geral de − ' + reais(p.desconto) : '';
          const dica = campoTotal.querySelector('small'); if (dica) dica.textContent = p.desconto ? 'Valor + juros − desconto geral (' + reais(p.desconto) + ')' : 'Valor + juros';
          totaisLinha.forEach((no, i) => { no.value = reais(p.linhas[i] || 0); });
          // D5: a soma dos itens (sem o desconto geral) tem de bater com o Valor.
          avisoSoma.textContent = discriminando() && p.diferenca !== 0 ? 'A soma dos itens ' + (p.diferenca > 0 ? 'excede' : 'não alcança') + ' o valor em ' + reais(Math.abs(p.diferenca)) + '. Só dá para salvar quando bater.' : '';
        }
        const pintarJuros = () => { rotJuros.querySelector('.compras-rotulo').textContent = jurosTipo.value === 'percentual' ? 'Juros (%)' : 'Juros (R$)'; jurosValor.disabled = !jurosTipo.value; };
        [valor, jurosValor].forEach((i) => i.addEventListener('input', recalcular));
        jurosTipo.addEventListener('change', () => { pintarJuros(); recalcular(); });
        pintarJuros();

        /* Quadros */
        const q1 = quadro('Valor', largo(campoValor), campoJurosTipo, rotJuros, largo(campoTotal));
        const q2 = quadro('Datas', dataRef.no);
        if (!retirada) q2.append(docData.no, campo('Nº do documento fiscal', docNumero));
        const q3 = quadro('Classificação');
        if (retirada) q3.append(campo('Grupo', grupo));
        q3.append(campo('Conta', conta), largo(campo('Observação *', obs)));
        /* Credor: só tela (ainda não grava) */
        const estadoCredor = { tipo: CREDORES[cat][0][0] };
        const credor = seletor([], '', '—');
        const notaCredor = el('small', 'profiles-note');
        const pintarCredor = () => {
          const lista = listaDeCredores(estadoCredor.tipo);
          credor.replaceChildren(new Option('—', ''), ...lista.map(([v, t]) => new Option(t, v))); credor.value = '';
          notaCredor.textContent = lista.length ? '' : estadoCredor.tipo === 'socio' ? 'O cadastro de Sócios e Gestores ainda não existe.' : 'Nenhum cadastro encontrado neste aparelho.';
        };
        const tipoCredor = el('div', 'compras-campo compras-largo');
        tipoCredor.append(el('span', 'compras-rotulo', 'Tipo de credor'), U.chips(CREDORES[cat], estadoCredor.tipo, (v) => { estadoCredor.tipo = v; pintarCredor(); }));
        const qCredor = quadro('Credor', tipoCredor, largo(campo('Credor', credor)), largo(notaCredor));
        pintarCredor();
        form.append(largo(U.nota(retirada ? AVISO_NAO_GRAVA_RETIRADA : AVISO_NAO_GRAVA)), q1, q2, qCredor, q3);

        if (!retirada) {
          const campoPag = dataPag.no;
          const pintarPag = (sim) => { campoPag.style.display = sim ? '' : 'none'; };
          const sw = U.quadroSituacao('Pagamento realizado', pago0, { textos: ['Sim', 'Não'], aoMudar: (sim) => { dataPag.definir(sim ? (dataPag.valor() || hoje) : ''); pintarPag(sim); } });
          sw.classList.add('compras-largo'); pintarPag(pago0);
          if (!pode('lancamentos_pagar')) { sw.querySelector('button').disabled = true; sw.append(el('small', 'profiles-note', 'Você não tem permissão para registrar pagamento.')); }
          form.append(quadro('Pagamento', sw, campoPag, venc.no));
          /* Fotos: só tela (ainda não grava nem envia o arquivo) */
          fotoA = campoArquivo('Foto (Recibo / Boleto / Nota)'); fotoB = campoArquivo('Foto (Nota / interno)');
          form.append(quadro('Fotos', fotoA.no, fotoB.no));

          /* Discriminação dos itens */
          const itensBox = el('div', 'compras-largo compras-discriminacao');
          const desenhar = () => {
            totaisLinha.length = 0; itensBox.replaceChildren(); itensBox.style.display = estado.discriminar ? '' : 'none';
            if (!estado.discriminar) return recalcular();
            estado.itens.forEach((it, n) => {
              const caixa = el('fieldset', 'compras-fieldset' + (estado.linhaComErro === n + 1 ? ' campo-pendente' : ''));
              caixa.append(el('legend', null, 'Linha ' + (n + 1) + (estado.linhaComErro === n + 1 ? ' · provável erro' : '')));
              const ligar = (no, chave) => { no.addEventListener('input', () => { it[chave] = no.value; recalcular(); }); no.addEventListener('change', () => { it[chave] = no.value; recalcular(); }); return no; };
              const texto = (chave, extra = {}) => ligar(entrada('text', it[chave], extra), chave);
              const tipo = (chave) => ligar(seletor(TIPOS, it[chave], 'Sem desconto'), chave);
              const totalLinha = entrada('text', '', { readOnly: true }); totaisLinha.push(totalLinha);
              const remover = U.botaoRemover('Remover linha ' + (n + 1), () => { estado.itens.splice(n, 1); desenhar(); });
              caixa.append(largo(campo('Descrição *', texto('descricao', { maxLength: 200 }))), campo('Quantidade', texto('quantidade', { inputMode: 'decimal' })), campo('Valor unitário (R$)', texto('valorUnitario', { inputMode: 'decimal', placeholder: '0,00' })),
                campo('Tipo do desconto unitário', tipo('descontoTipo')), campo('Valor do desconto unitário', texto('descontoValor', { inputMode: 'decimal' })),
                campo('Tipo do desconto no total', tipo('descontoTotalTipo')), campo('Valor do desconto no total', texto('descontoTotalValor', { inputMode: 'decimal' })),
                campo('Grupo', ligar(seletor(comAtual(cadastros.grupos, it.grupoId), it.grupoId, 'Sem grupo'), 'grupoId')), campo('Total da linha', totalLinha), largo(remover));
              itensBox.append(caixa);
            });
            const geralTipo = seletor(TIPOS, estado.descontoTipo, 'Sem desconto'); const geralValor = entrada('text', estado.descontoValor, { inputMode: 'decimal' });
            geralTipo.addEventListener('change', () => { estado.descontoTipo = geralTipo.value; geralValor.disabled = !geralTipo.value; recalcular(); });
            geralValor.addEventListener('input', () => { estado.descontoValor = geralValor.value; recalcular(); }); geralValor.disabled = !estado.descontoTipo;
            const geral = quadro('Vale presente / desconto no total', campo('Tipo do desconto', geralTipo), campo('Valor do desconto', geralValor));
            itensBox.append(botao('Adicionar item', () => { estado.itens.push(novoItem()); desenhar(); }, 'btn secondary'), geral, descontoNota, avisoSoma);
            recalcular();
          };
          const discSw = U.quadroSituacao('Discriminar itens', estado.discriminar, { textos: ['Sim', 'Não'], aoMudar: (sim) => { estado.discriminar = sim; if (sim && !estado.itens.length) estado.itens.push(novoItem()); desenhar(); } });
          discSw.classList.add('compras-largo');
          const ia = el('div', 'compras-largo compras-ia');
          const iaTitulo = el('b', null, 'Discriminar com a Octad Lumi (IA)');
          const iaBotoes = el('div', 'compras-chips'); const iaFoto = botao('Tirar foto', () => {}, 'btn secondary'); const iaArq = botao('Escolher arquivo', () => {}, 'btn secondary');
          iaFoto.disabled = true; iaArq.disabled = true; iaBotoes.append(iaFoto, iaArq);
          ia.append(iaTitulo, el('small', 'profiles-note', 'A IA sugere os itens a partir da foto da nota. Leitura por IA: em construção.'), iaBotoes);
          form.append(quadro('Discriminação', ia, discSw, itensBox));
          desenhar();
        } else recalcular();

        /* Recorrência: só ao criar, e com a permissão */
        const rec = { ligada: false, frequencia: 'mes', repeticoes: '12', dias: [] };
        if (criando && pode('lancamentos_recorrencia')) {
          const freq = seletor(FREQUENCIAS, rec.frequencia); const vezes = entrada('number', rec.repeticoes, { min: 1, max: 366 });
          const diasBox = el('div', 'compras-chips compras-largo'); diasBox.setAttribute('role', 'group'); diasBox.setAttribute('aria-label', 'Dias da semana');
          DIAS.forEach(([v, rotulo, nome]) => { const b = botao(rotulo, () => { rec.dias = rec.dias.includes(v) ? rec.dias.filter((d) => d !== v) : [...rec.dias, v]; b.classList.toggle('ativo', rec.dias.includes(v)); b.setAttribute('aria-pressed', String(rec.dias.includes(v))); }, 'compras-chip'); b.title = nome; b.setAttribute('aria-label', nome); b.setAttribute('aria-pressed', 'false'); diasBox.append(b); });
          const campoFreq = campo('Repetir', freq); const campoVezes = campo('Quantas vezes (com esta)', vezes);
          const nota = el('p', 'profiles-note compras-largo', 'Dia, semana, quinzena e mês param em 12 meses. Em Toda semana, sem dias marcados vale o mesmo dia do vencimento.');
          const pintarRec = () => { [campoFreq, campoVezes, nota].forEach((n) => { n.style.display = rec.ligada ? '' : 'none'; }); diasBox.style.display = rec.ligada && freq.value === 'semana' ? '' : 'none'; };
          freq.addEventListener('change', () => { rec.frequencia = freq.value; pintarRec(); }); vezes.addEventListener('input', () => { rec.repeticoes = vezes.value; });
          const recSw = U.quadroSituacao('Repetir este lançamento', false, { textos: ['Sim', 'Não'], aoMudar: (sim) => { rec.ligada = sim; pintarRec(); } }); recSw.classList.add('compras-largo');
          form.append(quadro('Recorrência', recSw, campoFreq, campoVezes, diasBox, nota)); pintarRec();
        } else if (lanc && lanc.recorrenciaId) {
          const q = quadro('Recorrência', largo(el('p', 'profiles-note', 'Este lançamento é a ocorrência ' + lanc.recorrenciaOrdem + ' de uma série.')));
          if (pode('lancamentos_cancelar_serie') && !lanc.dataPagamento) {
            q.append(largo(botao('Cancelar a série', () => U.confirmar('Cancelar a série', 'Apaga as ocorrências futuras ainda não pagas. Continuar?', 'Cancelar a série', async () => {
              try { const r = await Sync.api('/lancamentos/series/' + lanc.recorrenciaId + '/cancelar', { metodo: 'PATCH' }); U.avisar(r.removidas + ' lançamento(s) futuro(s) da série removido(s).'); dlg.close(); } catch (e) { U.avisar(mensagemDe(e)); }
            }, { cor: corDe(cat), corTexto: C.corTexto }), 'btn secondary')));
          }
          form.append(q);
        }

        if (somenteLeitura) { form.querySelectorAll('input,select,textarea,button.account-status-switch').forEach((n) => { n.disabled = true; }); form.prepend(U.nota('Lançamento pago: você não tem permissão para alterar.')); }
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
