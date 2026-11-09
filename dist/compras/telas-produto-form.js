/*
 * Produtos — formulário (S1: ProdutoFormulario.vue e seções). Campos, regras e funcionamento do S1;
 * componentes e cores do S2. Exceções decididas pelo Zé: produto novo nasce "liberado para compra";
 * inativar desliga a liberação; área e setor de estoque vêm da árvore de locais do S2; grupo e subgrupo
 * são cadastros separados (as regras do grupo — obrigatório, margem padrão e fiscal — valem para os dois).
 */
(function () {
  'use strict';
  const D = window.CicluzComprasDominio;
  const S = window.CicluzComprasDados;
  const U = window.CicluzComprasUI;
  const R = window.CicluzProdutoRegras;
  const F = window.CicluzProdutoFiscal;
  const X = window.CicluzProdutoExtras;
  const { el, botao, entrada, seletor } = U;

  // Dicas do S1 (produto-dicas.ts): só aparecem com "Habilitar ajuda" ligado no próprio produto.
  const DICAS = {
    codigoBarras: 'Código de barras (EAN) do produto, se houver.',
    marca: 'Marca/fabricante do produto.',
    nome: 'Nome do produto, sem gramatura. Ex.: "Talento Meio Amargo".',
    gramatura: 'Gramatura/peso da unidade. Ex.: 25 (para 25 g).',
    medida: 'Unidade da gramatura: UN, KG, G, LT ou ML.',
    embalagem: 'Embalagem de compra: saco, caixa, pacote, fardo...',
    cDe: 'C/ = "com" (caixa com 12). DE = "de" (saco de 25 kg).',
    qtd: 'Quantas unidades/medidas vêm na embalagem de compra.',
    medidaCompra: 'Unidade da embalagem de compra (UN, KG, LT).',
    aproximado: 'Aproximado escreve "aproximadamente" na frase. Use para peso variável, como caixa de queijo.',
    grupo: 'Grupo de mercadorias. Define a regra fiscal e a margem padrão.',
    setorEstoque: 'Onde o produto fica armazenado.',
    estoqueMin: 'Quantidade mínima desejada no estoque.',
    estoqueMax: 'Quantidade máxima desejada no estoque.',
    local1: 'Onde o produto é exposto para venda.',
    local2: 'Segundo local de exposição, quando houver.',
    setor1: 'Setor em que o produto é vendido. Não é o setor de estoque.',
    setor2: 'Segundo setor de venda, quando o produto for vendido em mais de um.',
    precisao: 'EXATOS (peso fixo) ou APROXIMADOS (varia um pouco).',
    qtdTransf: 'Quantidade usada na ficha de transformação ou receita.',
    unidTransf: 'Unidade da quantidade de transformação, como UN, G ou ML.',
    receituario: 'Produto ou ingrediente relacionado ao receituário.',
    refReceituario: 'Referência do item no receituário.',
    ncm: 'Código NCM do produto.', cest: 'Código CEST, quando aplicável.', categoria: 'Categoria fiscal do produto.',
  };
  const AREAS_VENDA = [['caixa', 'Caixa'], ['vitrine', 'Vitrine'], ['copa', 'Copa'], ['chapa', 'Chapa'], ['mesas', 'Mesas'], ['vasca_paes', 'Vasca de pães'], ['vitrine_paes', 'Vitrine de pães'], ['paes_empacotados', 'Pães empacotados'], ['mesa_paes', 'Mesa de pães'], ['frios', 'Frios'], ['bebidas', 'Bebidas'], ['laticinios', 'Laticínios'], ['mercearia', 'Mercearia'], ['estoque_bebidas', 'Estoque de bebidas'], ['biscoitos', 'Biscoitos'], ['dml_limpeza', 'DML / limpeza']];
  const MEDIDAS_BASE = ['UN', 'KG', 'G', 'LT', 'ML'];
  const UNIDADES_TRANSF = ['UN', 'G', 'ML'];

  /** Campo com rótulo, dica opcional (só com ajuda ligada) e nota fixa opcional. */
  function campoP(rotulo, no, dica, nota, nomeCampo) {
    const l = el('label', 'compras-campo');
    if (nomeCampo) l.dataset.campo = nomeCampo;
    l.append(el('span', 'compras-rotulo', rotulo));
    if (no.matches('input,select,textarea') && !no.hasAttribute('aria-label')) no.setAttribute('aria-label', rotulo.replace(/ \*$/, ''));
    l.append(no);
    if (nota) l.append(el('small', 'profiles-note', nota));
    if (dica) l.append(el('small', 'profiles-note compras-dica', dica));
    return l;
  }
  function interruptor(rotulo, marcado, nota) {
    const l = el('label', 'compras-interruptor');
    const c = entrada('checkbox'); c.checked = Boolean(marcado);
    l.append(c, el('span', null, rotulo));
    if (nota) l.append(el('small', 'profiles-note', nota));
    l.input = c;
    return l;
  }
  const num = (v) => D.lerNumero(v);
  const texto = (v) => (v == null ? '' : String(v));
  const decimal = (v) => (v == null || v === '' ? '' : String(v).replace('.', ','));

  function nomesDoGrupo(grupos, grupoId, subgrupoId) {
    const g = grupos.find((x) => x.id === grupoId);
    const s = g && g.subgrupos.find((x) => x.id === subgrupoId);
    return { nomeGrupo: g ? g.nome : '', nomeSubgrupo: s ? s.nome : '' };
  }

  /**
   * Abre o formulário. p = produto existente (ou nada, para novo). aoSalvar() é chamado depois de gravar.
   */
  /** Valor do "Setor de estoque" → localId (nó da árvore) e o nome, ou só o texto antigo (sem vínculo). */
  function localDoSetor(valor) {
    if (!valor) return { localId: null, setorEstoque: '' };
    if (valor.startsWith('txt:')) return { localId: null, setorEstoque: valor.slice(4) };
    const no = S.nosLocais().find((n) => n.id === valor);
    return { localId: valor, setorEstoque: no ? no.nome : '' };
  }

  function editarProduto(p, aoSalvar) {
    const novo = !p;
    const grupos = S.gruposMercadoria();
    const unidades = S.unidades();
    const locais = S.locais();
    const nosLocais = S.nosLocais();
    let forcar = false;
    let fiscalTimer = null;
    const promocoes = structuredClone(p?.promocoes || []);
    const conversoes = structuredClone(p?.conversoes || []);
    const legado = p && !p.nomeCatalogo;

    const dlg = U.dialogo({
      titulo: novo ? 'Novo produto' : 'Editar produto',
      subtitulo: novo ? 'Os dados ficam salvos só neste navegador.' : (p.codigoInterno ? 'Código interno ' + p.codigoInterno : ''),
      largo: true,
      rotuloSalvar: 'Salvar produto',
      montar: (form) => {
        form.classList.add('compras-form-produto');
        // Alerta de vínculo (pedido do Rodrigo, 09/11/2026): some quando o grupo e o local da árvore são escolhidos.
        if (p) {
          const v = S.vinculo(p);
          const falta = [v.semGrupo && 'grupo de mercadorias do S2', v.semLocal && 'local na árvore de locais (Setor de estoque)'].filter(Boolean);
          if (falta.length) form.append(Object.assign(el('p', 'compras-alerta tom-atencao compras-alerta-vinculo'), { textContent: 'Sem vínculo: falta ' + falta.join(' e ') + '. Escolha abaixo e salve.' }));
        }
        const alertas = el('div', 'compras-alertas');
        form.append(alertas);
        const sec = (titulo, sub) => {
          const s = el('fieldset', 'compras-fieldset');
          const lg = el('legend', null, titulo);
          s.append(lg);
          if (sub) s.append(el('p', 'compras-fieldset-sub compras-largo', sub));
          form.append(s);
          return s;
        };

        /* ===== Produto (Identificação) ===== */
        const s1 = sec('Produto', 'Identificação e apresentação no catálogo');
        const status = seletor([['ativo', 'Ativo'], ['inativo', 'Inativo']], p?.status || 'ativo');
        const ajuda = interruptor('Habilitar ajuda', p?.habilitarAjuda);
        const liberado = interruptor('Liberado para compra', p ? p.liberadoCompra : true, 'Só produto liberado aparece no agendamento e na solicitação de compra.');
        const ean = entrada('text', p?.codigoBarras || '', { inputMode: 'numeric', maxLength: 20 });
        const lerEan = botao('Ler pela câmera', () => X.lerCodigoDeBarras((v) => { ean.value = String(v).replace(/\D/g, ''); ean.dispatchEvent(new Event('input')); }));
        lerEan.classList.add('compras-botao-campo');
        const avisoEan = el('p', 'compras-aviso-campo'); avisoEan.setAttribute('role', 'status');
        const eanBox = el('div', 'compras-campo-com-botao'); eanBox.append(ean, lerEan);
        const eanCampo = campoP('Código de barras', eanBox, DICAS.codigoBarras, novo ? 'Sem EAN? Deixe vazio: ao salvar, o código interno gerado entra aqui.' : '', 'codigoBarras');
        eanCampo.append(avisoEan);
        const marca = entrada('text', p?.marca || '', { maxLength: 60 });
        const nome = entrada('text', p ? p.nomeCatalogo || p.descricao : '', { maxLength: 200 });
        const foto = X.campoFoto(p?.fotoUrl, () => nome.value);
        const gramatura = entrada('text', p ? decimal(p.quantidadeIndividual ?? 0) : '0', { inputMode: 'decimal' });
        const medida = seletor(MEDIDAS_BASE.filter((m) => unidades.includes(m) || m === p?.unidadeIndividual), p?.unidadeIndividual || (unidades.includes('KG') ? 'KG' : ''), 'Selecione');
        const balanca = seletor([['nao', 'Não'], ['sim', 'Sim']], p?.pesavel ? 'sim' : 'nao');
        const tecla = entrada('text', '000', { readOnly: true });
        const validade = entrada('number', p?.validadeBalanca ?? '', { min: 0, max: 999, step: 1 });
        const descricao = entrada('text', '', { readOnly: true });
        const campoTecla = campoP('Tecla da balança', tecla, null, 'Valor fixo 000 confirmado para a TNP.');
        const campoValidade = campoP('Validade na balança (dias) *', validade, null, 'Informe o número de dias definido para este produto.', 'validadeBalanca');
        ean.setAttribute('aria-label', 'Código de barras');
        const fotoBox = el('div', 'compras-largo');
        fotoBox.append(foto.no);
        s1.append(campoP('Status', status), ajuda, liberado, fotoBox, eanCampo);
        if (!novo) {
          s1.append(campoP('Código interno', entrada('text', p.codigoInterno || '—', { readOnly: true })));
        }
        s1.append(
          campoP('Marca', marca, DICAS.marca),
          campoP('Nome do produto *', nome, DICAS.nome, '', 'nomeCatalogo'),
          campoP('Gramatura', gramatura, DICAS.gramatura, '', 'quantidadeIndividual'),
          campoP('Medida base *', medida, DICAS.medida, '', 'unidadeIndividual'),
          campoP('Vai para balança? *', balanca, null, 'Novos produtos começam em Não. Para produtos já existentes, confira o cadastro SIA; a medida KG não define este campo.'),
          campoTecla, campoValidade,
        );
        const campoDescricao = campoP('Descrição (automática)', descricao);
        campoDescricao.classList.add('compras-largo');
        s1.append(campoDescricao);

        /* Como se compra */
        const s1b = sec('Como se compra', 'Embalagem e unidade de compra');
        const emb = seletor(unidades.concat(p?.embalagem && !unidades.includes(p.embalagem) ? [p.embalagem] : []), p?.embalagem || '', 'Selecione');
        const cde = seletor(['C/', 'DE'], p?.cDe || 'DE');
        const qtdEmb = entrada('number', p?.qtdEmbalagem ?? 1, { min: 1, step: 1 });
        const medCompra = seletor(unidades.concat(p?.medidaCompra && !unidades.includes(p.medidaCompra) ? [p.medidaCompra] : []), p?.medidaCompra || '', 'Selecione');
        const aprox = seletor([['nao', 'Exato'], ['sim', 'Aproximado']], p?.compraAproximada ? 'sim' : 'nao');
        const comoTexto = entrada('text', '', { readOnly: true, placeholder: 'Preencha a embalagem para gerar' });
        const campoComo = campoP('Como se compra (automático)', comoTexto);
        campoComo.classList.add('compras-largo');
        // Produto liberado sem embalagem ou medida de compra fica pendente em "como se compra".
        const avisoComo = el('p', 'compras-aviso-campo compras-largo');
        avisoComo.setAttribute('role', 'status');
        s1b.append(campoP('Embalagem', emb, DICAS.embalagem), campoP('C/ ou DE', cde, DICAS.cDe), campoP('Qt. embalagem', qtdEmb, DICAS.qtd, '', 'qtdEmbalagem'), campoP('Medida de compra', medCompra, DICAS.medidaCompra), campoP('Quantidade da embalagem', aprox, DICAS.aproximado), campoComo, avisoComo, U.nota('As siglas vêm do cadastro de Unidades de medida (Compras).'));

        /* ===== Revenda ou transformação ===== */
        const s2 = sec('Revenda ou transformação', 'Classificação e operação do produto');
        const tipo = seletor([['revenda', 'Revenda'], ['transformacao', 'Transformação']], p?.tipo || 'revenda');
        const grupo = seletor(grupos.filter((g) => g.ativo || g.id === p?.grupoId).map((g) => [g.id, g.nome]), p?.grupoId || '', 'Selecione o grupo');
        const sub = el('select');
        const montarSub = (manter) => {
          const g = grupos.find((x) => x.id === grupo.value);
          sub.replaceChildren(new Option('Sem subgrupo', ''));
          (g ? g.subgrupos.filter((s) => s.ativo || s.id === p?.subgrupoId) : []).forEach((s) => sub.add(new Option(s.nome, s.id)));
          sub.value = manter && g && g.subgrupos.some((s) => s.id === p?.subgrupoId) ? p.subgrupoId : '';
        };
        montarSub(true);
        s2.append(campoP('Tipo', tipo), campoP('Grupo de mercadorias *', grupo, DICAS.grupo, 'Vem do cadastro MER - Grupos de Mercadorias.', 'grupoId'), campoP('Subgrupo', sub, null, 'Quando o subgrupo tem regra própria, ela vale no lugar da do grupo.'));
        s2.append(el('p', 'compras-fieldset-sub compras-largo', 'Desta loja — estoque, pontos de venda e preço'));
        // Setor de estoque = nó da árvore de locais (vínculo pelo id). Texto antigo sem nó continua como opção, com o alerta.
        const textosSemNo = locais.concat(p?.setorEstoque && !locais.includes(p.setorEstoque) ? [p.setorEstoque] : []).filter((t) => !nosLocais.some((n) => n.nome === t));
        const valorSetor = p?.localId && nosLocais.some((n) => n.id === p.localId) ? p.localId : (p?.setorEstoque ? 'txt:' + p.setorEstoque : '');
        const setor = seletor(nosLocais.map((n) => [n.id, n.caminho]).concat(textosSemNo.map((t) => ['txt:' + t, t + ' (sem vínculo na árvore)'])), valorSetor, 'Selecione');
        const area = seletor(locais.concat(p?.areaEstoque && !locais.includes(p.areaEstoque) ? [p.areaEstoque] : []), p?.areaEstoque || '', 'Selecione');
        const min = entrada('number', p?.estoqueMin ?? '', { min: 0, step: 'any' });
        const max = entrada('number', p?.estoqueMax ?? '', { min: 0, step: 'any' });
        const listaLocais = el('datalist'); listaLocais.id = 'compras-locais-' + Date.now();
        locais.forEach((l) => listaLocais.append(new Option(l)));
        const comLista = (v) => { const i = entrada('text', v || '', { maxLength: 120 }); i.setAttribute('list', listaLocais.id); return i; };
        const local1 = comLista(p?.localVenda1); const local2 = comLista(p?.localVenda2);
        const setor1 = comLista(p?.setorVenda1); const setor2 = comLista(p?.setorVenda2);
        const areaVenda = seletor(AREAS_VENDA, p?.areaVenda || '', 'Sem área');
        const custo = entrada('text', p?.custo != null ? D.moeda(p.custo).replace(/\s/g, ' ') : '', { inputMode: 'decimal', placeholder: 'R$ 0,00' });
        const margem = entrada('text', p?.margem != null ? decimal(Math.round(p.margem * 10000) / 100) : '', { inputMode: 'decimal' });
        const notaMargem = el('small', 'profiles-note');
        const auto = interruptor('Calcular venda automático', p ? p.auto : true);
        const pontual = entrada('text', p && !p.auto && p.precoVenda != null ? D.moeda(p.precoVenda) : '', { inputMode: 'decimal', placeholder: 'R$ 0,00' });
        const calculado = entrada('text', '', { readOnly: true });
        const saldo = entrada('text', p ? D.numero(p.saldo) + ' ' + (p.unidade || '') : '0', { readOnly: true });
        const campoMargem = campoP('Margem (%)', margem, null, '', 'margem'); campoMargem.append(notaMargem);
        s2.append(
          campoP('Setor de estoque', setor, DICAS.setorEstoque, 'Escolhido na árvore Área / Setor / Local do S2.'),
          campoP('Área', area),
          campoP('Estoque mín.', min, DICAS.estoqueMin, '', 'estoqueMin'),
          campoP('Estoque máx.', max, DICAS.estoqueMax, '', 'estoqueMax'),
          campoP('Local de venda primário', local1, DICAS.local1), campoP('Local de venda secundário', local2, DICAS.local2),
          campoP('Setor de venda primário', setor1, DICAS.setor1), campoP('Setor de venda secundário', setor2, DICAS.setor2),
          campoP('Área da loja (Relatório Gerentes)', areaVenda),
          campoP('Custo', custo, null, 'Custo da embalagem de compra.'),
          campoMargem, auto,
          campoP('V. Venda pontual', pontual),
          campoP('V. Venda (calculado)', calculado, null, 'Recalculado ao salvar: prévia e valor gravado nunca divergem.'),
          campoP('Estoque atual', saldo, null, 'Só o recebimento conferido altera o saldo.'),
          listaLocais,
        );
        // Transformação
        const transf = p?.transformacao || {};
        const caixaTransf = el('div', 'compras-subbloco compras-largo');
        const precisao = seletor(['EXATOS', 'APROXIMADOS'], transf.precisao || 'EXATOS');
        const qtdTransf = entrada('number', transf.quantidade ?? '', { min: 0, step: 'any' });
        const unidTransf = seletor(UNIDADES_TRANSF, transf.unidade || '', 'Selecione');
        const receituario = entrada('text', transf.produtoReceituario || '', { maxLength: 120 });
        const refRec = entrada('text', transf.refReceituario || '', { maxLength: 60 });
        const validacaoQtd = entrada('text', '', { readOnly: true });
        const gradeTransf = el('div', 'compras-grade-2');
        gradeTransf.append(campoP('Precisão', precisao, DICAS.precisao), campoP('Quantidade', qtdTransf, DICAS.qtdTransf), campoP('Unidade', unidTransf, DICAS.unidTransf), campoP('Produto receituário', receituario, DICAS.receituario), campoP('Ref. receituário', refRec, DICAS.refReceituario));
        const cv = campoP('Validação de quantidade (automática)', validacaoQtd); cv.classList.add('compras-largo'); gradeTransf.append(cv);
        caixaTransf.append(el('h4', null, 'Transformação · Quantidade, unidade e receituário'), gradeTransf);
        s2.append(caixaTransf);

        /* ===== Fiscal ===== */
        const s3 = sec('Fiscal', 'Classificação puxada pelo grupo de mercadorias');
        const fiscalTopo = el('div', 'compras-largo compras-fiscal-topo');
        const fiscalAtual = { ...(p?.fiscal || {}) };
        const fNcm = entrada('text', fiscalAtual.ncm || '', { inputMode: 'numeric', maxLength: 8 });
        const fCest = entrada('text', fiscalAtual.cest || '', { inputMode: 'numeric', maxLength: 7 });
        const fCat = entrada('text', fiscalAtual.categoriaFiscal || '', { maxLength: 60 });
        const leitura = {};
        ['cstPisCofins', 'cstReforma', 'cClassTrib', 'aliquotaIbs', 'aliquotaCbs'].forEach((k) => { leitura[k] = entrada('text', '', { readOnly: true }); });
        const todos = el('details', 'compras-largo compras-fiscal-todos');
        todos.append(el('summary', null, 'Ver os 27 campos fiscais'));
        const tabelaTodos = el('div');
        todos.append(tabelaTodos);
        s3.append(fiscalTopo,
          campoP('NCM (automático quando encontrado)', fNcm, DICAS.ncm), campoP('Código CEST', fCest, DICAS.cest), campoP('Categoria', fCat, DICAS.categoria),
          campoP('CST PIS/COFINS (automático)', leitura.cstPisCofins), campoP('CST reforma', leitura.cstReforma), campoP('cClassTrib', leitura.cClassTrib),
          campoP('IBS %', leitura.aliquotaIbs), campoP('CBS %', leitura.aliquotaCbs), todos);

        /* ===== Promoção (só revenda) ===== */
        const s4 = sec('Promoção', 'Condições e período de oferta');
        const listaPromo = el('div', 'compras-largo compras-promocoes');
        const precoPromo = el('p', 'compras-texto-auto compras-largo');
        const addPromo = botao('+ Adicionar promoção', () => { promocoes.push({ tipo: 'valor', valor: null, descontoFracao: null, horaInicio: '', horaFim: '', dias: [true, true, true, true, true, true, true], validaAte: '' }); desenharPromos(); atualizar(); });
        s4.append(listaPromo, addPromo, precoPromo);
        function desenharPromos() {
          listaPromo.replaceChildren();
          if (!promocoes.length) listaPromo.append(el('p', 'profiles-note', 'Sem promoção.'));
          promocoes.forEach((pr, i) => {
            const card = el('div', 'compras-bloco compras-promo');
            const cab = el('div', 'compras-linha-info');
            cab.append(el('b', null, 'Promoção ' + (i + 1)), botao('Remover', () => { promocoes.splice(i, 1); desenharPromos(); atualizar(); }, 'btn secondary perigo-texto'));
            const t = seletor([['valor', 'Valor fixo'], ['desconto', 'Desconto %']], pr.tipo);
            const v = entrada('text', pr.valor != null ? D.moeda(pr.valor) : '', { inputMode: 'decimal', placeholder: 'R$ 0,00' });
            const d = entrada('number', pr.descontoFracao != null ? Math.round(pr.descontoFracao * 10000) / 100 : '', { min: 0, max: 100, step: 'any' });
            const hi = entrada('time', pr.horaInicio || ''); const hf = entrada('time', pr.horaFim || '');
            const va = entrada('date', pr.validaAte || '');
            const cV = campoP('Valor promo', v); const cD = campoP('Desconto %', d);
            const dias = el('div', 'compras-chips compras-dias');
            const marca = () => { dias.replaceChildren(...R.DIAS_PROMO.map(([k, rot], j) => { const b = botao(rot.toUpperCase(), () => { pr.dias[j] = !pr.dias[j]; marca(); atualizar(); }, 'compras-chip' + (pr.dias[j] ? ' ativo' : '')); b.setAttribute('aria-pressed', String(Boolean(pr.dias[j]))); b.setAttribute('aria-label', 'Promoção ' + (i + 1) + ': ' + rot); return b; })); };
            if (!Array.isArray(pr.dias) || pr.dias.length !== 7) pr.dias = [true, true, true, true, true, true, true];
            marca();
            const sync = () => {
              pr.tipo = t.value; pr.valor = pr.tipo === 'valor' ? num(v.value) : null;
              pr.descontoFracao = pr.tipo === 'desconto' && d.value !== '' ? Number(d.value) / 100 : null;
              pr.horaInicio = hi.value; pr.horaFim = hf.value; pr.validaAte = va.value;
              cV.style.display = pr.tipo === 'valor' ? '' : 'none'; cD.style.display = pr.tipo === 'desconto' ? '' : 'none';
              atualizar();
            };
            [t, v, d, hi, hf, va].forEach((x) => x.addEventListener('input', sync));
            const grade = el('div', 'compras-grade-2');
            grade.append(campoP('Tipo', t), cV, cD, campoP('Início', hi), campoP('Término', hf), campoP('Válida até', va, null, 'Vazio = sem prazo.'));
            const lDias = el('div', 'compras-campo compras-largo'); lDias.append(el('span', 'compras-rotulo', 'Dias da semana'), dias);
            card.append(cab, grade, lDias);
            listaPromo.append(card);
            cV.style.display = pr.tipo === 'valor' ? '' : 'none'; cD.style.display = pr.tipo === 'desconto' ? '' : 'none';
          });
        }
        desenharPromos();

        /* ===== Conversões de unidade ===== */
        const s5 = sec('Conversões de unidade');
        const listaConv = el('div', 'compras-largo compras-conversoes');
        s5.append(listaConv, botao('+ Adicionar conversão', () => { conversoes.push({ unidade: '', quantidade: 1, unidadesIndividuais: 1 }); desenharConv(); }));
        function desenharConv() {
          listaConv.replaceChildren();
          if (!conversoes.length) listaConv.append(el('p', 'profiles-note', 'Sem conversão cadastrada.'));
          conversoes.forEach((c, i) => {
            const linha = el('div', 'compras-item-urgente');
            const un = seletor(unidades.concat(c.unidade && !unidades.includes(c.unidade) ? [c.unidade] : []), c.unidade, 'Unidade');
            const q = entrada('number', c.quantidade, { min: 0, step: 'any' });
            const ui = entrada('number', c.unidadesIndividuais, { min: 0, step: 'any' });
            un.onchange = () => { c.unidade = un.value; };
            q.oninput = () => { c.quantidade = num(q.value); };
            ui.oninput = () => { c.unidadesIndividuais = num(ui.value); };
            linha.append(campoP('Unidade', un), campoP('Quantidade', q), campoP('Unidades individuais', ui), botao('Remover', () => { conversoes.splice(i, 1); desenharConv(); }, 'btn secondary perigo-texto'));
            listaConv.append(linha);
          });
        }
        desenharConv();

        if (!novo) {
          const rod = el('div', 'compras-form-rodape');
          rod.append(botao('Histórico de nomes', () => X.historicoDeNomes(p)));
          form.append(rod);
        }

        /* ===== Prévias ao vivo ===== */
        function margemDoGrupo() {
          const n = nomesDoGrupo(grupos, grupo.value, sub.value);
          return F.margemPadraoDoGrupo(F.TABELAS_EXEMPLO, F.grupoParaFiscal(F.TABELAS_EXEMPLO, n.nomeGrupo, n.nomeSubgrupo));
        }
        function descricaoAtual() {
          if (legado && nome.value === p.descricao && !(num(gramatura.value) > 0)) return p.descricao;
          if (!nome.value.trim() || !medida.value) return '';
          return R.montarDescricao(nome.value, gramatura.value, medida.value);
        }
        function precoCalculado() {
          const m = margem.value === '' ? null : num(margem.value) / 100;
          return R.calcularPrecoVenda({ auto: auto.input.checked, custo: num(custo.value) || 0, quantidadeCaixa: Number(qtdEmb.value) || 1, margem: m, margemGrupo: margemDoGrupo() || 0, precoManual: num(pontual.value) || 0, temProduto: Boolean(nome.value.trim()) });
        }
        function atualizarFiscal() {
          const n = nomesDoGrupo(grupos, grupo.value, sub.value);
          const anterior = { ...fiscalAtual, ncm: fNcm.value || null, cest: fCest.value || null, categoriaFiscal: fCat.value || null };
          const r = F.fiscalDoProduto({ anterior, nome: nome.value, codigoBarras: ean.value, nomeGrupo: n.nomeGrupo, nomeSubgrupo: n.nomeSubgrupo });
          const fx = r.fiscal;
          const tom = r.resultado.estado === 'completo' ? 'positivo' : r.resultado.estado === 'parcial' ? 'info' : 'atencao';
          fiscalTopo.replaceChildren(U.situacao(F.ESTADOS[r.resultado.estado] || r.resultado.estado, tom));
          if (r.resultado.estado !== 'completo') fiscalTopo.append(el('p', 'profiles-note', r.resultado.motivo));
          if (r.resultado.classificacao) {
            const c = r.resultado.classificacao;
            fiscalTopo.append(el('p', 'profiles-note', 'Regra automática: ' + c.tributacaoSimples + ' · CST ' + c.cstPisCofins + ' · Simples ' + D.numero(c.aliquotaSimples, 2) + '% · ICMS RE ' + D.numero(c.icmsRe, 2) + '% · Base ' + c.baseFiscal + ' · Fonte: ' + (c.origem === 'produto' ? 'produto' : c.origem === 'plu_balanca' ? 'PLU do código de balança' : 'grupo ' + r.grupo)));
            fNcm.readOnly = Boolean(c.ncm);
            if (c.ncm) fNcm.value = c.ncm;
            if (c.ecf && c.ecf.cest) fCest.value = c.ecf.cest;
            if (c.ecf && c.ecf.categoria) fCat.value = c.ecf.categoria;
          } else fNcm.readOnly = false;
          Object.entries(leitura).forEach(([k, i]) => { i.value = fx[k] == null || fx[k] === '' ? '—' : String(fx[k]); });
          tabelaTodos.replaceChildren(U.tabela([['Campo', (x) => x[1]], ['Valor', (x) => (fx[x[0]] == null || fx[x[0]] === '' ? '—' : String(fx[x[0]]))]], F.CAMPOS_FISCAIS));
          return r;
        }
        let eanTimer = null;
        function avisarEanRepetido() {
          clearTimeout(eanTimer);
          eanTimer = setTimeout(() => {
            const dig = ean.value.replace(/\D/g, '');
            avisoEan.textContent = '';
            if (dig.length < 6) return;
            const outro = S.dados.produtos.find((x) => x.id !== p?.id && String(x.codigoBarras || '') === dig);
            if (outro) avisoEan.textContent = 'Já existe ' + (outro.nomeCatalogo || outro.descricao) + ' com este código de barras neste catálogo. Confira antes de cadastrar de novo.';
          }, 500);
        }
        function atualizar() {
          form.classList.toggle('com-ajuda', ajuda.input.checked);
          const pes = balanca.value === 'sim';
          campoTecla.style.display = pes ? '' : 'none'; campoValidade.style.display = pes ? '' : 'none';
          descricao.value = descricaoAtual();
          comoTexto.value = R.montarComoSeCompra({ embalagem: emb.value, cDe: cde.value, quantidadeCaixa: qtdEmb.value, medidaCompra: medCompra.value, descricao: descricao.value, aproximado: aprox.value === 'sim' });
          comoTexto.title = comoTexto.value;
          avisoComo.textContent = liberado.input.checked && (!emb.value || !medCompra.value) ? 'Sem embalagem e medida de compra, o produto liberado fica pendente em "como se compra".' : '';
          const mg = margemDoGrupo();
          notaMargem.textContent = mg != null ? 'Padrão do grupo: ' + D.numero(mg * 100, 2) + '% — vazio usa esse valor, 0 vende pelo custo.' : 'Ex.: 70 = 70%. Vazio = sem margem própria.';
          pontual.disabled = auto.input.checked;
          const preco = precoCalculado();
          calculado.value = D.moeda(preco);
          const ehTransf = tipo.value === 'transformacao';
          caixaTransf.style.display = ehTransf ? '' : 'none';
          s4.style.display = ehTransf ? 'none' : '';
          validacaoQtd.value = R.montarValidacaoQtd(descricao.value, precisao.value, qtdTransf.value, unidTransf.value);
          const comPromo = R.calcularPrecoVendaComPromocao({ precoVenda: preco, promocoes: promocoes });
          precoPromo.textContent = promocoes.length ? 'Preço agora: ' + D.moeda(comPromo) + (comPromo < preco ? ' (com promoção)' : ' (sem promoção valendo agora)') : '';
          clearTimeout(fiscalTimer);
          fiscalTimer = setTimeout(atualizarFiscal, 150);
        }
        grupo.addEventListener('change', () => {
          montarSub(false);
          const mg = margemDoGrupo();
          if (mg != null) margem.value = decimal(Math.round(mg * 10000) / 100); // S1: trocar o grupo copia a margem padrão
          atualizar();
        });
        sub.addEventListener('change', () => { const mg = margemDoGrupo(); if (mg != null) margem.value = decimal(Math.round(mg * 10000) / 100); atualizar(); });
        ean.addEventListener('input', () => { avisarEanRepetido(); atualizar(); });
        [status, nome, gramatura, medida, balanca, emb, cde, qtdEmb, medCompra, aprox, tipo, custo, margem, pontual, precisao, qtdTransf, unidTransf, fNcm, fCest, fCat].forEach((x) => x.addEventListener('input', atualizar));
        [ajuda.input, auto.input, liberado.input].forEach((x) => x.addEventListener('change', atualizar));
        status.addEventListener('change', () => { if (status.value === 'inativo') liberado.input.checked = false; });
        atualizar();
        atualizarFiscal();
        avisarEanRepetido();

        return {
          alertas, status, ajuda, liberado, foto, ean, marca, nome, gramatura, medida, balanca, validade, emb, cde, qtdEmb, medCompra, aprox,
          tipo, grupo, sub, setor, area, min, max, local1, local2, setor1, setor2, areaVenda, custo, margem, auto, pontual,
          precisao, qtdTransf, unidTransf, receituario, refRec, fNcm, fCest, fCat, descricaoAtual, precoCalculado, atualizarFiscal, form,
        };
      },
      salvar: (c) => salvar(c),
    });

    function mostrarErro(c, msg, campo) {
      c.alertas.replaceChildren(Object.assign(el('p', 'compras-alerta tom-negativo'), { textContent: msg }));
      const alvo = campo && c.form.querySelector('[data-campo="' + campo + '"] :is(input,select)');
      if (alvo) { alvo.focus(); alvo.scrollIntoView({ block: 'center' }); }
      return msg;
    }

    function salvar(c) {
      const erros = [];
      const nomeCat = c.nome.value.trim();
      const gram = c.gramatura.value.trim() === '' ? 0 : num(c.gramatura.value);
      if (!nomeCat) erros.push(['Informe o nome do produto.', 'nomeCatalogo']);
      if (gram == null || gram < 0) erros.push(['Informe a quantidade (0 ou mais).', 'quantidadeIndividual']);
      if (!c.medida.value) erros.push(['Escolha a unidade individual.', 'unidadeIndividual']);
      if (!c.grupo.value && (novo || p.grupoId)) erros.push(['Selecione o grupo de mercadorias para aplicar os impostos.', 'grupoId']);
      const pesavel = c.balanca.value === 'sim';
      const validadeBalanca = c.validade.value === '' ? null : Number(c.validade.value);
      R.validarBalanca({ pesavel, validadeBalanca }).forEach((m) => erros.push([m, 'validadeBalanca']));
      const qtdEmbalagem = Math.max(1, Math.trunc(Number(c.qtdEmb.value) || 1));
      if (Number(c.qtdEmb.value) !== qtdEmbalagem && c.qtdEmb.value !== '') erros.push(['A Qt. embalagem precisa ser um número inteiro a partir de 1.', 'qtdEmbalagem']);
      const estoqueMin = c.min.value === '' ? null : num(c.min.value);
      const estoqueMax = c.max.value === '' ? null : num(c.max.value);
      if (estoqueMin != null && estoqueMax != null && estoqueMin > estoqueMax) erros.push(['O máximo não pode ser menor que o mínimo.', 'estoqueMax']);
      R.validarEstoquePorEmbalagem({ quantidadeCaixa: qtdEmbalagem, estoqueMin, estoqueMax }).forEach((e) => erros.push([e.mensagem, e.campo]));
      const margemPct = c.margem.value === '' ? null : num(c.margem.value);
      if (margemPct != null && (margemPct < 0 || margemPct > 1000)) erros.push(['A margem precisa ficar entre 0% e 1000%.', 'margem']);
      const convs = conversoes.filter((x) => x.unidade);
      if (new Set(convs.map((x) => x.unidade)).size !== convs.length) erros.push(['A mesma unidade aparece em duas conversões.']);
      if (convs.some((x) => !(x.quantidade > 0) || !(x.unidadesIndividuais > 0))) erros.push(['Quantidade e unidades individuais da conversão precisam ser maiores que zero.']);
      const tipo = c.tipo.value;
      const promos = tipo === 'revenda' ? promocoes.map((x) => ({ ...x })) : [];
      R.validarPromocoesDoProduto(promos).forEach((m) => erros.push([m]));
      if (erros.length) return mostrarErro(c, erros[0][0], erros[0][1]);

      const eanDig = c.ean.value.replace(/\D/g, '');
      // Duplicidade na criação (S1): EAN igual ou nome igual, e os parecidos (semelhança ≥ 55), com "cadastrar mesmo assim".
      if (novo && !forcar) {
        const dup = R.checarDuplicidade({ nomeCatalogo: nomeCat, codigoBarras: eanDig }, S.dados.produtos);
        if (dup.bloqueia || dup.parecidos.length) {
          const box = el('div', 'compras-alerta tom-atencao compras-duplicidade');
          box.append(el('b', null, dup.bloqueia ? 'Produto repetido?' : 'Há produtos com nome parecido'));
          dup.mensagens.forEach((m) => box.append(el('p', null, m)));
          if (dup.parecidos.length) {
            const ul = el('ul');
            dup.parecidos.forEach((x) => ul.append(el('li', null, (x.produto.nomeCatalogo || x.produto.descricao) + ' · ' + x.semelhanca + '% parecido')));
            box.append(el('p', null, 'Nomes parecidos:'), ul);
          }
          box.append(botao('Cadastrar mesmo assim', () => { forcar = true; c.form.requestSubmit(); }, 'btn'));
          c.alertas.replaceChildren(box);
          box.scrollIntoView({ block: 'center' });
          return 'Confira o aviso de duplicidade antes de salvar.';
        }
      }

      const n = nomesDoGrupo(grupos, c.grupo.value, c.sub.value);
      // Categoria fiscal digitada vai em maiúsculas, como no S1 (normalizarTextosProduto).
      const anteriorFiscal = { ...(p?.fiscal || {}), ncm: c.fNcm.value.replace(/\D/g, '') || null, cest: c.fCest.value.replace(/\D/g, '') || null, categoriaFiscal: c.fCat.value.trim().toLocaleUpperCase('pt-BR') || null };
      const descricao = c.descricaoAtual();
      const auto = c.auto.input.checked;
      const status = c.status.value;
      let campos = {
        status, habilitarAjuda: c.ajuda.input.checked, liberadoCompra: status === 'inativo' ? false : c.liberado.input.checked,
        fotoUrl: c.foto.valor(), marca: c.marca.value.trim(), nomeCatalogo: legado && nomeCat === p.descricao && !(gram > 0) ? null : nomeCat,
        quantidadeIndividual: gram, unidadeIndividual: c.medida.value, pesavel, teclaBalanca: pesavel ? R.TECLA_BALANCA_FIXA : null, validadeBalanca: pesavel ? validadeBalanca : null,
        descricao, embalagem: c.emb.value, cDe: c.emb.value ? c.cde.value : null, qtdEmbalagem, medidaCompra: c.medCompra.value, compraAproximada: c.aprox.value === 'sim',
        tipo, grupoId: c.grupo.value, subgrupoId: c.sub.value,
        ...localDoSetor(c.setor.value), areaEstoque: c.area.value, estoqueMin, estoqueMax,
        localVenda1: c.local1.value.trim(), localVenda2: c.local2.value.trim(), setorVenda1: c.setor1.value.trim(), setorVenda2: c.setor2.value.trim(), areaVenda: c.areaVenda.value || null,
        custo: num(c.custo.value), margem: margemPct == null ? null : margemPct / 100, auto, precoVenda: c.precoCalculado(),
        transformacao: tipo === 'transformacao' ? { precisao: c.precisao.value || null, quantidade: c.qtdTransf.value === '' ? null : Number(c.qtdTransf.value), unidade: c.unidTransf.value || null, produtoReceituario: c.receituario.value.trim() || null, refReceituario: c.refRec.value.trim() || null } : null,
        promocoes: promos, conversoes: convs.map((x) => ({ unidade: x.unidade, quantidade: Number(x.quantidade) || 1, unidadesIndividuais: Number(x.unidadesIndividuais) || 1 })),
      };
      campos = R.normalizarTextosProduto(campos);
      // Vínculo escolhido à mão: o "Revincular" não desfaz.
      if (p) {
        const manual = { ...(p.vinculoManual || {}) };
        if (campos.grupoId !== (p.grupoId || '') || campos.subgrupoId !== (p.subgrupoId || '')) manual.grupo = true;
        if ((campos.localId || null) !== (p.localId || null)) manual.local = true;
        campos.vinculoManual = manual;
      }
      let gravado = null;
      let veioDoArquivo = false;
      const ok = S.transacao((d) => {
        if (novo) {
          // Inclui o maior código do app de produtos (importação): o próximo não pode repetir código do PDV, nem de inativo.
          const codigoInterno = R.proximoCodigoInterno(d.produtos.map((x) => x.codigoInterno).filter(Boolean).concat(d.codigoInternoApp ? [d.codigoInternoApp] : []));
          const codigoBarras = R.codigoBarrasNaCriacao(eanDig, codigoInterno);
          const fiscal = F.fiscalDoProduto({ anterior: anteriorFiscal, nome: campos.nomeCatalogo, codigoBarras, nomeGrupo: n.nomeGrupo, nomeSubgrupo: n.nomeSubgrupo }).fiscal;
          gravado = { id: S.novoId('p'), codigoInterno, codigoBarras, unidade: campos.medidaCompra || campos.unidadeIndividual || 'UN', saldo: 0, vendas3m: 0, compras3m: 0, lucro3m: 0, criadoEm: S.agoraIso(), ...campos, fiscal };
          d.produtos.push(gravado);
        } else {
          let alvo = d.produtos.find((x) => x.id === p.id);
          // Produto do arquivo de inativos: ao salvar, passa para o Compras (e sai do arquivo logo depois).
          if (!alvo && p.arquivado) { const { arquivado, ...semMarca } = structuredClone(p); alvo = semMarca; d.produtos.push(alvo); veioDoArquivo = true; }
          // Produto vindo do app de produtos: o fiscal é o do app; as tabelas fiscais do S2 ainda são de exemplo e não o sobrescrevem.
          const fiscal = alvo.appId ? anteriorFiscal : F.fiscalDoProduto({ anterior: anteriorFiscal, nome: campos.nomeCatalogo || campos.descricao, codigoBarras: eanDig || alvo.codigoBarras, nomeGrupo: n.nomeGrupo, nomeSubgrupo: n.nomeSubgrupo }).fiscal;
          const nomeAntes = alvo.nomeCatalogo ?? alvo.descricao;
          if (campos.nomeCatalogo != null && campos.nomeCatalogo !== nomeAntes) {
            d.historicoNomes.push({ id: S.novoId('hn'), produtoId: alvo.id, nomeAnterior: nomeAntes, nomeNovo: campos.nomeCatalogo, alteradoPor: 'José · Compras', alteradoEm: S.agoraIso() });
          }
          Object.assign(alvo, campos, { codigoBarras: eanDig || alvo.codigoBarras, fiscal });
          gravado = alvo;
        }
      });
      if (!ok) return mostrarErro(c, 'Não foi possível salvar neste navegador. A foto pode ser grande demais para o armazenamento.');
      if (veioDoArquivo) S.tirarDoArquivo(p.id).then((foi) => { if (!foi) U.avisar('O produto foi salvo, mas não saiu do arquivo de inativos. Aparece uma vez só na lista.'); if (aoSalvar) aoSalvar(gravado); });
      U.avisar('Produto salvo.');
      if (aoSalvar) aoSalvar(gravado);
      return undefined;
    }
    return dlg;
  }

  window.CicluzProdutoForm = { editarProduto };
})();
