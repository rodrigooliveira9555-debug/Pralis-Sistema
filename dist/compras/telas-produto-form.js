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
  // Nomes das etapas definidos pelo Rodrigo (17/11/2026).
  const ETAPAS = ['Cadastro geral', 'Cadastro produção/​transformação', 'Cadastro específico', 'Cadastro promoção', 'Cadastro fiscal', 'Revisão dos dados'];
  // Dias da promoção na ordem da lista (domingo primeiro, como no calendário); o número é a posição em promocao.dias.
  const DIAS_LISTA = [[6, 'Domingo'], [0, 'Segunda-feira'], [1, 'Terça-feira'], [2, 'Quarta-feira'], [3, 'Quinta-feira'], [4, 'Sexta-feira'], [5, 'Sábado']];
  const VISTO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 7"/></svg>';
  /*
   * Repetição da promoção, no modelo da repetição dos Lembretes (pedido do Rodrigo, 17/11/2026). A lista "Repetição"
   * são atalhos para o que é salvo em promocao.repeticao { tipo, intervalo } e promocao.dias (regra em produto-regras.js):
   * Dias de semana = semanal de segunda a sexta; Fins de semana = semanal sábado e domingo; Quinzenalmente = semanal a
   * cada 2; A cada 3/6 meses = mensal a cada 3/6. "Personalizada" abre Frequência e "A cada".
   */
  const REPETICOES = [['nunca', 'Nunca'], ['diaria', 'Diariamente'], ['dias_semana', 'Dias de semana'], ['fins_semana', 'Fins de semana'], ['semanal', 'Semanalmente'], ['quinzenal', 'Quinzenalmente'], ['mensal', 'Mensalmente'], ['tri', 'A cada 3 meses'], ['sem', 'A cada 6 meses'], ['anual', 'Anualmente'], ['personalizada', 'Personalizada']];
  const FREQUENCIAS = [['diaria', 'Diariamente'], ['semanal', 'Semanalmente'], ['mensal', 'Mensalmente'], ['anual', 'Anualmente']];
  const MESES_CURTOS = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
  const DIAS_UTEIS = [true, true, true, true, true, false, false];
  const FIM_DE_SEMANA = [false, false, false, false, false, true, true];
  const mesmosDias = (a, b) => b.every((x, i) => Boolean(a[i]) === x);
  /** Qual atalho da lista corresponde ao que está salvo. */
  function repeticaoDe(pr) {
    const r = pr.repeticao; const n = Number(r.intervalo) || 1;
    if (r.tipo === 'nunca') return 'nunca';
    if (r.tipo === 'diaria') return n === 1 ? 'diaria' : 'personalizada';
    if (r.tipo === 'semanal') return n === 2 ? 'quinzenal' : n !== 1 ? 'personalizada' : mesmosDias(pr.dias, DIAS_UTEIS) ? 'dias_semana' : mesmosDias(pr.dias, FIM_DE_SEMANA) ? 'fins_semana' : 'semanal';
    if (r.tipo === 'mensal') return n === 1 ? 'mensal' : n === 3 ? 'tri' : n === 6 ? 'sem' : 'personalizada';
    if (r.tipo === 'anual') return n === 1 ? 'anual' : 'personalizada';
    return 'personalizada';
  }
  function aplicarRepeticao(pr, id) {
    const r = pr.repeticao;
    const por = (tipo, intervalo) => { r.tipo = tipo; r.intervalo = intervalo; };
    if (id === 'nunca') por('nunca', 1);
    if (id === 'diaria') por('diaria', 1);
    if (id === 'dias_semana') { por('semanal', 1); pr.dias = [...DIAS_UTEIS]; }
    if (id === 'fins_semana') { por('semanal', 1); pr.dias = [...FIM_DE_SEMANA]; }
    if (id === 'semanal') por('semanal', 1);
    if (id === 'quinzenal') por('semanal', 2);
    if (id === 'mensal') por('mensal', 1);
    if (id === 'tri') por('mensal', 3);
    if (id === 'sem') por('mensal', 6);
    if (id === 'anual') por('anual', 1);
    if (id === 'personalizada' && r.tipo === 'nunca') por('diaria', 1);
  }
  // O atalho que a pessoa escolheu nesta visita (ex.: "Personalizada" ou "Semanalmente"), enquanto ainda combinar com os dados.
  const repeticaoEscolhida = new WeakMap();
  // O agendamento que estava preenchido quando a pessoa desligou "Agendar promoção" (volta se religar na mesma visita).
  const agendamentoGuardado = new WeakMap();

  /**
   * Promoção agendada entra na Agenda (pedido do Rodrigo, 17/11/2026). Depois de salvar o produto, cada promoção
   * agendada e com data de início tem os seus compromissos criados ou atualizados na lista "Promoções" da Agenda; o
   * vínculo é pelo id do compromisso, guardado na promoção (agendaItemIds). Promoção removida, desligada, encerrada ou
   * de produto inativo tem os compromissos apagados. Devolve quantos compromissos ficaram e as falhas, se houver.
   * A Agenda mora no servidor (docs/AGENDA_NO_SERVIDOR_PLANO.md): cada gravação espera a resposta, uma de cada vez.
   */
  async function sincronizarAgenda(produto, promocoesAntes) {
    const A = window.CicluzAgendaDados;
    if (!A) return { total: 0, falhas: [], promocoes: produto.promocoes || [] };
    const sobram = new Set((promocoesAntes || []).flatMap((pr) => pr.agendaItemIds || []));
    const falhas = [];
    let listaId = '';
    const listaPromocoes = async () => {
      if (listaId) return listaId;
      const ja = A.dados.listas.find((l) => l.nome.toLocaleLowerCase('pt-BR') === 'promoções');
      const r = ja ? { ok: true, id: ja.id } : await A.salvarLista('', { nome: 'Promoções', cor: '#16a34a' });
      if (r.erro) falhas.push(r.erro);
      listaId = r.ok ? r.id : '';
      return listaId;
    };
    const nomeProduto = produto.nomeCatalogo || produto.descricao;
    const idsPorPromocao = [];
    for (const pr of produto.promocoes || []) {
      const quer = produto.status === 'ativo' ? R.compromissosDaPromocao(pr) : [];
      const tem = (pr.agendaItemIds || []).filter((id) => A.item(id));
      tem.forEach((id) => sobram.delete(id));
      const oferta = pr.tipo === 'desconto' ? 'desconto de ' + D.numero((pr.descontoFracao || 0) * 100, 2) + '%' : 'por ' + D.moeda(pr.valor || 0);
      const ids = [];
      for (const [k, c] of quer.entries()) {
        const atual = tem[k] ? A.item(tem[k]) : null;
        const r = await A.salvarItem(atual ? atual.id : '', {
          ...(atual || { etiquetas: ['promoção'], alerta: null, prioridade: 'normal' }),
          listaId: atual ? atual.listaId : await listaPromocoes(),
          titulo: ('Promoção: ' + nomeProduto + ' ' + oferta).slice(0, 200),
          notas: R.resumoRepeticaoPromocao(pr) + ' Criado pelo cadastro do produto (MER - Produtos, código ' + (produto.codigoInterno || 'sem código') + '). Para mudar, altere a promoção no produto.',
          data: c.data, hora: c.hora, horaFim: c.horaFim, repeticao: c.repeticao,
        });
        if (r.ok) ids.push(r.id); else falhas.push(r.erro);
      }
      for (const id of tem.slice(quer.length)) { const x = await A.excluirItem(id); if (x.erro) falhas.push(x.erro); }
      idsPorPromocao.push(ids);
    }
    for (const id of sobram) { if (A.item(id)) { const x = await A.excluirItem(id); if (x.erro) falhas.push(x.erro); } }
    // A ligação promoção → compromissos volta como promoções novas: quem chama grava no produto (no servidor, o produto não
    // mora no documento do Compras, então gravar em d.produtos se perderia).
    const promocoes = (produto.promocoes || []).map((pr, i) => {
      const nova = { ...pr };
      if (idsPorPromocao[i] && idsPorPromocao[i].length) nova.agendaItemIds = idsPorPromocao[i]; else delete nova.agendaItemIds;
      return nova;
    });
    return { total: idsPorPromocao.reduce((n, ids) => n + ids.length, 0), falhas, promocoes };
  }
  function repeticaoMostrada(pr) {
    const e = repeticaoEscolhida.get(pr); const r = pr.repeticao;
    if (e === 'personalizada' && r.tipo !== 'nunca') return e;
    if (e === 'semanal' && r.tipo === 'semanal' && (Number(r.intervalo) || 1) === 1) return e;
    return repeticaoDe(pr);
  }
  // Campos fiscais que já têm campo próprio no quadro; os outros aparecem ao ligar "Ver os 27 campos fiscais".
  const FISCAIS_NO_TOPO = ['ncm', 'cest', 'categoriaFiscal'];

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
      titulo: novo ? 'Cadastro produto' : 'Editar produto',
      subtitulo: novo ? 'O código interno é gerado pelo servidor ao salvar.' : (p.codigoInterno ? 'Código interno ' + p.codigoInterno : ''),
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
        // Cadastro em 5 etapas (pedido do Rodrigo, 17/11/2026), com a barra de etapas única do sistema. Só o lugar dos
        // quadros mudou: campos, regras e o que é salvo são os mesmos.
        const etapasNo = ETAPAS.map(() => el('div', 'compras-etapa'));
        const [eGeral, eTransf, eLoja, ePromo, eFiscal, eRevisao] = etapasNo;
        const sec = (titulo, sub, etapa) => {
          const s = el('fieldset', 'compras-fieldset');
          const lg = el('legend', null, titulo);
          s.append(lg);
          if (sub) s.append(el('p', 'compras-fieldset-sub compras-largo', sub));
          etapa.append(s);
          return s;
        };

        /* ===== Produto (Identificação) ===== */
        const s1 = sec('Produto', 'Identificação e apresentação no catálogo', eGeral);
        // Ativo/inativo no quadro padrão "Situação" com interruptor (regra de 15/11/2026). Inativar desliga a liberação.
        const situacao = U.quadroSituacao('Situação do produto', (p?.status || 'ativo') === 'ativo', { dica: 'Produto inativo sai de uso nesta loja. Nada é apagado.', aoMudar: (ativo) => { if (!ativo) liberado.input.checked = false; atualizar(); } });
        const status = { get value() { return situacao.ativo ? 'ativo' : 'inativo'; } };
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
        s1.append(situacao, ajuda, liberado, fotoBox, eanCampo);
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
        const s1b = sec('Como se compra', 'Embalagem e unidade de compra', eGeral);
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
        const s2 = sec('Revenda ou transformação', 'Classificação e operação do produto', eTransf);
        const tipo = seletor([['revenda', 'Revenda'], ['transformacao', 'Transformação']], p?.tipo || 'revenda');
        // Grupo e subgrupo num campo só, escolhidos na árvore do cadastro MER - Grupos de Mercadorias (23/11/2026, Zé): toca no
        // grupo, abre os subgrupos, marca um. O valor continua gravado como grupoId e subgrupoId (sem migração).
        const gAtual = grupos.find((g) => g.id === p?.grupoId);
        const valorGrupo = gAtual ? gAtual.id + (gAtual.subgrupos.some((s) => s.id === p?.subgrupoId) ? '|' + p.subgrupoId : '') : (p?.grupoId || '');
        const arvGrupo = U.campoArvore({
          rotulo: 'Grupo de mercadorias', titulo: 'Grupo de mercadorias do produto', sigla: 'MER', rotuloBusca: 'Buscar grupo ou subgrupo',
          vazio: 'Nenhum grupo de mercadorias cadastrado em Saídas › Cadastros Geral › MER - Grupos de Mercadorias.',
          nos: () => U.arvoreGruposMercadoria(grupos, { atual: valorGrupo }), valor: valorGrupo, textoVazio: 'Selecione o grupo ou subgrupo',
        });
        const grupo = { get value() { return arvGrupo.value.split('|')[0] || ''; }, addEventListener: (...a) => arvGrupo.addEventListener(...a) };
        const sub = { get value() { return arvGrupo.value.split('|')[1] || ''; } };
        s2.append(campoP('Tipo', tipo), campoP('Grupo de mercadorias *', arvGrupo, DICAS.grupo, 'Grupo ou subgrupo do cadastro MER - Grupos de Mercadorias. Quando o subgrupo tem regra própria, ela vale no lugar da do grupo.', 'grupoId'));
        const sLoja = sec('Desta loja', 'Estoque, pontos de venda e preço', eLoja);
        // Setor de estoque e Área escolhidos na árvore Área › Setor › Local do S2, num campo que abre a janela de locais (23/11/2026,
        // Zé: "igual ao grupo e subgrupo"). O dado gravado não muda: o setor pelo id do nó (localId; texto antigo sem nó continua como
        // "txt:" com o aviso) e a área pelo nome, como sempre foi.
        const valorSetor = p?.localId && nosLocais.some((n) => n.id === p.localId) ? p.localId : (p?.setorEstoque ? 'txt:' + p.setorEstoque : '');
        const setor = U.campoLocal({ rotulo: 'Setor de estoque', titulo: 'Setor de estoque do produto', valor: valorSetor, textoVazio: 'Selecione o setor ou local' });
        const area = U.campoLocal({ rotulo: 'Área', titulo: 'Área do produto', valor: U.campoLocal.doNome(p?.areaEstoque), textoVazio: 'Selecione a área' });
        const areaGravada = () => U.campoLocal.nomeGravado(area);
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
        sLoja.append(
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
        caixaTransf.append(gradeTransf);
        const sTransf = sec('Transformação', 'Quantidade, unidade e receituário', eTransf);
        const notaTransf = el('p', 'profiles-note compras-largo', 'Este produto está como Revenda. A transformação só é preenchida quando o Tipo, no quadro acima, é Transformação.');
        sTransf.append(notaTransf, caixaTransf);

        /* ===== Fiscal ===== */
        const s3 = sec('Fiscal', 'Classificação puxada pelo grupo de mercadorias', eFiscal);
        const fiscalTopo = el('div', 'compras-largo compras-fiscal-topo');
        const fiscalAtual = { ...(p?.fiscal || {}) };
        const fNcm = entrada('text', fiscalAtual.ncm || '', { inputMode: 'numeric', maxLength: 8 });
        const fCest = entrada('text', fiscalAtual.cest || '', { inputMode: 'numeric', maxLength: 7 });
        const fCat = entrada('text', fiscalAtual.categoriaFiscal || '', { maxLength: 60 });
        const leitura = {};
        ['cstPisCofins', 'cstReforma', 'cClassTrib', 'aliquotaIbs', 'aliquotaCbs'].forEach((k) => { leitura[k] = entrada('text', '', { readOnly: true }); });
        // "Ver os 27 campos fiscais": interruptor que abre os campos (pedido do Rodrigo, 17/11/2026). Os que uma pessoa
        // digita (F.FISCAIS_MANUAIS) são editáveis; os derivados da regra do grupo ficam só para leitura.
        const camposFiscais = {};
        const gradeFiscal = el('div', 'compras-grade-fiscal compras-largo');
        F.CAMPOS_FISCAIS.filter(([k]) => !FISCAIS_NO_TOPO.includes(k)).forEach(([k, rot]) => {
          const manual = F.FISCAIS_MANUAIS.includes(k);
          const i = entrada('text', manual && fiscalAtual[k] != null ? decimal(fiscalAtual[k]) : '', manual ? { inputMode: 'decimal', maxLength: 12 } : { readOnly: true });
          camposFiscais[k] = { i, manual };
          gradeFiscal.append(campoP(rot + (manual ? '' : ' (automático)'), i));
        });
        gradeFiscal.style.display = 'none';
        const todos = U.quadroSituacao('Ver os 27 campos fiscais', false, { textos: ['Sim', 'Não'], dica: 'Os campos marcados como automático vêm da regra do grupo de mercadorias e não são digitados.', aoMudar: (sim) => { gradeFiscal.style.display = sim ? '' : 'none'; } });
        s3.append(fiscalTopo,
          campoP('NCM (automático quando encontrado)', fNcm, DICAS.ncm), campoP('Código CEST', fCest, DICAS.cest), campoP('Categoria', fCat, DICAS.categoria),
          campoP('CST PIS/COFINS (automático)', leitura.cstPisCofins), campoP('CST reforma', leitura.cstReforma), campoP('cClassTrib', leitura.cClassTrib),
          campoP('IBS %', leitura.aliquotaIbs), campoP('CBS %', leitura.aliquotaCbs), todos, gradeFiscal);

        /* ===== Promoção (só revenda) ===== */
        const s4 = sec('Promoção', 'Condições e período de oferta', ePromo);
        const notaPromo = el('p', 'profiles-note', 'Promoção vale só para produto de Revenda. Este produto está como Transformação (etapa 2).');
        ePromo.append(notaPromo);
        const listaPromo = el('div', 'compras-largo compras-promocoes');
        const precoPromo = el('p', 'compras-texto-auto compras-largo');
        const addPromo = botao('+ Adicionar promoção', () => { promocoes.push({ tipo: 'valor', valor: null, descontoFracao: null, agendada: false, dataInicio: '', horaInicio: '', horaFim: '', dias: [true, true, true, true, true, true, true], validaAte: '', repeticao: { tipo: 'diaria', intervalo: 1 } }); desenharPromos(); atualizar(); });
        s4.append(listaPromo, addPromo, precoPromo);
        function desenharPromos() {
          listaPromo.replaceChildren();
          if (!promocoes.length) listaPromo.append(el('p', 'profiles-note', 'Sem promoção.'));
          promocoes.forEach((pr, i) => {
            if (!Array.isArray(pr.dias) || pr.dias.length !== 7) pr.dias = [true, true, true, true, true, true, true];
            // Promoção antiga (sem repetição) abre como semanal nos dias marcados: é a mesma regra de antes.
            if (!pr.repeticao) pr.repeticao = { tipo: 'semanal', intervalo: 1 };
            const rp = pr.repeticao;
            // "Agendar promoção": promoção que ainda não tem a marca abre ligada quando já tem dia, horário ou prazo próprios.
            if (typeof pr.agendada !== 'boolean') pr.agendada = Boolean(pr.dataInicio || pr.validaAte || pr.horaInicio || pr.horaFim || !(rp.tipo === 'diaria' || rp.tipo === 'semanal') || (Number(rp.intervalo) || 1) !== 1 || !pr.dias.every(Boolean));
            const card = el('div', 'compras-bloco compras-promo');
            const cab = el('div', 'compras-linha-info');
            cab.append(el('b', null, 'Promoção ' + (i + 1)), U.botaoRemover('Remover promoção ' + (i + 1), () => { promocoes.splice(i, 1); desenharPromos(); atualizar(); }));
            const t = seletor([['valor', 'Valor fixo'], ['desconto', 'Desconto %']], pr.tipo);
            const v = entrada('text', pr.valor != null ? D.moeda(pr.valor) : '', { inputMode: 'decimal', placeholder: 'R$ 0,00' });
            const d = entrada('number', pr.descontoFracao != null ? Math.round(pr.descontoFracao * 10000) / 100 : '', { min: 0, max: 100, step: 'any' });
            const di = entrada('date', pr.dataInicio || '');
            const hi = entrada('time', pr.horaInicio || ''); const hf = entrada('time', pr.horaFim || '');
            const va = entrada('date', pr.validaAte || '');
            const repete = seletor(REPETICOES, repeticaoMostrada(pr));
            const freq = seletor(FREQUENCIAS, rp.tipo === 'nunca' ? 'diaria' : rp.tipo);
            const cada = entrada('number', rp.intervalo || 1, { min: 1, max: 99, step: 1 });
            const cV = campoP('Valor promo', v); const cD = campoP('Desconto %', d);
            const cFreq = campoP('Frequência', freq); const cCada = campoP('A cada', cada);
            const resumo = el('p', 'compras-recorr-resumo compras-largo'); resumo.setAttribute('role', 'status');
            // Cartão de escolha com uma linha por dia e o visto à direita (repetição semanal).
            const dias = el('div', 'compras-dias-lista');
            const celula = (texto, marcado, rotulo, aoTocar) => {
              const b = el('button', 'compras-grade-celula', texto);
              b.type = 'button';
              b.setAttribute('aria-pressed', String(Boolean(marcado)));
              b.setAttribute('aria-label', 'Promoção ' + (i + 1) + ': ' + rotulo);
              b.onclick = aoTocar;
              return b;
            };
            // Grade de 1 a 31 (repetição mensal) e grade dos meses (repetição anual): tocar marca ou desmarca.
            const gradeMes = el('div', 'compras-grade-escolha em-7');
            const gradeAno = el('div', 'compras-grade-escolha em-4');
            const alternar = (lista, valor) => (lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor].sort((a, b) => a - b));
            // Os botões de dia e de mês são criados UMA vez e só têm a marcação atualizada. Recriá-los a cada mudança fazia o
            // 1º toque se perder logo depois de editar uma data: o "change" da data (ao sair do campo) redesenhava a lista entre
            // o apertar e o soltar, e o botão tocado era trocado antes do clique (defeito achado em 23/11/2026).
            const botoesDias = DIAS_LISTA.map(([j, nomeDia]) => {
              const b = el('button', 'compras-dia-linha');
              b.type = 'button';
              b.append(el('span', null, nomeDia));
              b.insertAdjacentHTML('beforeend', VISTO);
              b.onclick = () => { pr.dias[j] = !pr.dias[j]; pintar(); atualizar(); };
              b.setAttribute('aria-label', 'Promoção ' + (i + 1) + ': ' + R.DIAS_PROMO[j][1]);
              return [j, b];
            });
            dias.append(...botoesDias.map(([, b]) => b));
            const lista = (v) => (Array.isArray(v) ? v : []);
            const celulasMes = Array.from({ length: 31 }, (_, k) => celula(String(k + 1), false, 'dia ' + (k + 1), () => { rp.diasMes = alternar(lista(rp.diasMes), k + 1); pintar(); atualizar(); }));
            gradeMes.append(...celulasMes);
            const celulasAno = MESES_CURTOS.map((m, k) => celula(m, false, m, () => { rp.meses = alternar(lista(rp.meses), k + 1); pintar(); atualizar(); }));
            gradeAno.append(...celulasAno);
            const marca = () => {
              botoesDias.forEach(([j, b]) => { b.classList.toggle('marcado', Boolean(pr.dias[j])); b.setAttribute('aria-pressed', String(Boolean(pr.dias[j]))); });
              celulasMes.forEach((c, k) => c.setAttribute('aria-pressed', String(lista(rp.diasMes).includes(k + 1))));
              celulasAno.forEach((c, k) => c.setAttribute('aria-pressed', String(lista(rp.meses).includes(k + 1))));
            };
            // Interruptor "Agendar promoção" (pedido do Rodrigo, 17/11/2026): desligado, a promoção vale todos os dias, o dia
            // todo, e os campos de quando somem; ligado, abre data de início, horário, repetição e término. O que foi
            // preenchido volta se a pessoa religar na mesma visita.
            const agendar = U.quadroSituacao('Agendar promoção', pr.agendada, {
              textos: ['Sim', 'Não'], dica: 'Ligado: escolha quando a promoção vale. Com a data de início, ela entra na Agenda ao salvar o produto.',
              aoMudar: (sim) => {
                if (sim) Object.assign(pr, agendamentoGuardado.get(pr) || { repeticao: { tipo: 'semanal', intervalo: 1 } });
                else {
                  agendamentoGuardado.set(pr, structuredClone({ dataInicio: pr.dataInicio || '', horaInicio: pr.horaInicio || '', horaFim: pr.horaFim || '', validaAte: pr.validaAte || '', dias: pr.dias, repeticao: pr.repeticao }));
                  Object.assign(pr, { dataInicio: '', horaInicio: '', horaFim: '', validaAte: '', dias: [true, true, true, true, true, true, true], repeticao: { tipo: 'diaria', intervalo: 1 } });
                }
                pr.agendada = sim;
                desenharPromos(); atualizar();
              },
            });
            const notaAgenda = el('p', 'profiles-note compras-largo'); notaAgenda.setAttribute('role', 'status');
            const bloco = (rotulo, no, nota) => { const b = el('div', 'compras-campo compras-largo'); b.append(el('span', 'compras-rotulo', rotulo), no); if (nota) b.append(el('small', 'profiles-note', nota)); return b; };
            const lDias = bloco('Dias da semana', dias);
            const lMes = bloco('Dias do mês', gradeMes, 'Sem nenhum dia marcado, vale o dia da data de início.');
            const lAno = bloco('Meses', gradeAno, 'Vale no dia do mês da data de início. Sem nenhum mês marcado, vale o mês da data de início.');
            const ver = (no, sim) => { no.style.display = sim ? '' : 'none'; };
            function pintar() {
              const id = repeticaoMostrada(pr);
              repete.value = id;
              ver(cFreq, id === 'personalizada'); ver(cCada, id === 'personalizada');
              if (rp.tipo !== 'nunca') freq.value = rp.tipo;
              if (document.activeElement !== cada) cada.value = rp.intervalo || 1;
              ver(lDias, rp.tipo === 'semanal' && ['semanal', 'quinzenal', 'personalizada'].includes(id));
              ver(lMes, rp.tipo === 'mensal'); ver(lAno, rp.tipo === 'anual');
              cV.style.display = pr.tipo === 'valor' ? '' : 'none'; cD.style.display = pr.tipo === 'desconto' ? '' : 'none';
              marca();
              resumo.textContent = R.resumoRepeticaoPromocao(pr);
              notaAgenda.textContent = !pr.dataInicio ? 'Informe a data de início para esta promoção aparecer na Agenda.' : R.compromissosDaPromocao(pr).length ? 'Ao salvar o produto, esta promoção entra na Agenda (lista Promoções).' : 'Esta promoção já terminou: não entra na Agenda.';
            }
            const sync = () => {
              pr.tipo = t.value; pr.valor = pr.tipo === 'valor' ? num(v.value) : null;
              pr.descontoFracao = pr.tipo === 'desconto' && d.value !== '' ? Number(d.value) / 100 : null;
              pr.horaInicio = hi.value; pr.horaFim = hf.value; pr.validaAte = va.value; pr.dataInicio = di.value;
              pintar();
              atualizar();
            };
            [t, v, d, di, hi, hf, va].forEach((x) => x.addEventListener('input', sync));
            [di, va].forEach((x) => x.addEventListener('change', sync));
            repete.addEventListener('change', () => { repeticaoEscolhida.set(pr, repete.value); aplicarRepeticao(pr, repete.value); pintar(); atualizar(); });
            freq.addEventListener('change', () => { rp.tipo = freq.value; pintar(); atualizar(); });
            cada.addEventListener('input', () => { const q = Math.trunc(Number(cada.value)); rp.intervalo = q >= 1 ? Math.min(q, 99) : 1; pintar(); atualizar(); });
            const grade = el('div', 'compras-grade-2');
            grade.append(campoP('Tipo', t), cV, cD);
            const gradeQuando = el('div', 'compras-grade-2');
            gradeQuando.append(campoP('Data de início', di, null, 'Vazio = já está valendo.'), campoP('Início', hi), campoP('Término', hf),
              campoP('Repetição', repete), cFreq, cCada,
              campoP('Terminar repetição', va, null, 'Vazio = nunca termina.'));
            const quando = el('div', 'compras-promo-quando');
            quando.append(gradeQuando, resumo, lDias, lMes, lAno, notaAgenda);
            ver(quando, pr.agendada);
            card.append(cab, grade, agendar, quando);
            listaPromo.append(card);
            pintar();
          });
        }
        desenharPromos();

        /* ===== Conversões de unidade ===== */
        const s5 = sec('Conversões de unidade', null, eGeral);
        const listaConv = el('div', 'compras-largo compras-conversoes');
        s5.append(listaConv, botao('+ Adicionar conversão', () => { conversoes.push({ unidade: '', quantidade: 1, unidadesIndividuais: 1 }); desenharConv(); }));
        function desenharConv() {
          listaConv.replaceChildren();
          if (!conversoes.length) listaConv.append(el('p', 'profiles-note', 'Sem conversão cadastrada.'));
          conversoes.forEach((c, i) => {
            const linha = el('div', 'compras-conversao-linha');
            const un = seletor(unidades.concat(c.unidade && !unidades.includes(c.unidade) ? [c.unidade] : []), c.unidade, 'Unidade');
            const q = entrada('number', c.quantidade, { min: 0, step: 'any' });
            const ui = entrada('number', c.unidadesIndividuais, { min: 0, step: 'any' });
            un.onchange = () => { c.unidade = un.value; };
            q.oninput = () => { c.quantidade = num(q.value); };
            ui.oninput = () => { c.unidadesIndividuais = num(ui.value); };
            linha.append(campoP('Unidade', un), campoP('Quantidade', q), campoP('Unidades individuais', ui), U.botaoRemover('Remover conversão ' + (i + 1), () => { conversoes.splice(i, 1); desenharConv(); }));
            listaConv.append(linha);
          });
        }
        desenharConv();

        if (!novo) {
          const rod = el('div', 'compras-form-rodape');
          rod.append(botao('Histórico de nomes', () => X.historicoDeNomes(p)));
          rod.classList.add('compras-largo'); s1.append(rod);
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
        /** Campos fiscais digitados no quadro aberto (número, ou vazio = sem valor). */
        function fiscaisDigitados() {
          const o = {};
          Object.entries(camposFiscais).forEach(([k, c]) => { if (c.manual) o[k] = c.i.value.trim() === '' ? null : num(c.i.value); });
          return o;
        }
        function atualizarFiscal() {
          const n = nomesDoGrupo(grupos, grupo.value, sub.value);
          const anterior = { ...fiscalAtual, ...fiscaisDigitados(), ncm: fNcm.value || null, cest: fCest.value || null, categoriaFiscal: fCat.value || null };
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
          Object.entries(camposFiscais).forEach(([k, c]) => { if (!c.manual) c.i.value = fx[k] == null || fx[k] === '' ? '—' : String(fx[k]); });
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
          notaPromo.style.display = ehTransf ? '' : 'none';
          notaTransf.style.display = ehTransf ? 'none' : '';
          validacaoQtd.value = R.montarValidacaoQtd(descricao.value, precisao.value, qtdTransf.value, unidTransf.value);
          const comPromo = R.calcularPrecoVendaComPromocao({ precoVenda: preco, promocoes: promocoes });
          precoPromo.textContent = promocoes.length ? 'Preço agora: ' + D.moeda(comPromo) + (comPromo < preco ? ' (com promoção)' : ' (sem promoção valendo agora)') : '';
          clearTimeout(fiscalTimer);
          fiscalTimer = setTimeout(atualizarFiscal, 150);
        }
        grupo.addEventListener('change', () => {
          const mg = margemDoGrupo();
          if (mg != null) margem.value = decimal(Math.round(mg * 10000) / 100); // S1: trocar o grupo (ou o subgrupo) copia a margem padrão
          atualizar();
        });
        ean.addEventListener('input', () => { avisarEanRepetido(); atualizar(); });
        [nome, gramatura, medida, balanca, emb, cde, qtdEmb, medCompra, aprox, tipo, custo, margem, pontual, precisao, qtdTransf, unidTransf, fNcm, fCest, fCat, ...Object.values(camposFiscais).filter((c) => c.manual).map((c) => c.i)].forEach((x) => x.addEventListener('input', atualizar));
        [ajuda.input, auto.input, liberado.input].forEach((x) => x.addEventListener('change', atualizar));
        atualizar();
        atualizarFiscal();
        avisarEanRepetido();

        /* ===== Etapas: barra no topo, Voltar/Avançar/Salvar embaixo (mesmo rodapé do cadastro de fornecedor) ===== */
        let atual = 0;
        const voltar = botao('Voltar', () => ir(atual - 1), 'btn secondary footer-cancel-accent form-back-action');
        voltar.insertAdjacentHTML('beforeend', '<svg class="footer-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>');
        const avancar = botao('Avançar', () => ir(atual + 1), 'btn form-next-action');
        const salvarFim = el('button', 'btn', 'Salvar');
        salvarFim.type = 'submit';
        const cancelar = botao('Cancelar', () => form.closest('dialog').close(), 'btn secondary footer-cancel-accent');
        const nav = el('div', 'compras-form-rodape compras-etapas-nav');
        const barra = window.CicluzStepper.create({ steps: ETAPAS.map((label) => ({ label })), current: 0, label: 'Etapas do cadastro do produto', onSelect: (i) => ir(i) });
        /* Etapa 6 · Revisão: tudo o que foi preenchido nas outras etapas, só para leitura, com "Editar" por etapa. */
        const escondido = (no, raiz) => { for (let x = no; x && x !== raiz; x = x.parentElement) if (x.style && x.style.display === 'none') return true; return false; };
        function valorDe(no) {
          if (no.tagName === 'SELECT') return no.selectedOptions[0] && no.value !== '' ? no.selectedOptions[0].textContent : '';
          if (no.classList.contains('compras-arvore-campo')) return no.value ? no.title : ''; // campo em árvore: o texto do que foi escolhido
          return no.value.trim();
        }
        function pintarRevisao() {
          eRevisao.replaceChildren();
          etapasNo.slice(0, -1).forEach((etapa, k) => {
            const quadro = el('fieldset', 'compras-fieldset compras-revisao');
            quadro.append(el('legend', null, (k + 1) + ' · ' + ETAPAS[k]));
            const linhas = el('dl', 'profiles-info compras-largo'); // o mesmo quadro branco da revisão do cliente e da empresa
            const por = (rotulo, valor) => { linhas.append(el('dt', null, rotulo), el('dd', null, valor || '—')); };
            if (k === 0) { por('Situação do produto', situacao.ativo ? 'Ativo' : 'Inativo'); por('Foto', foto.valor() ? 'Com foto' : 'Sem foto'); }
            etapa.querySelectorAll('label.compras-campo, label.compras-interruptor').forEach((l) => {
              if (escondido(l, etapa)) return;
              const no = l.querySelector('input,select,.compras-arvore-campo');
              if (!no || no.type === 'file') return;
              const base = (l.querySelector('.compras-rotulo') || l.querySelector('span')).textContent;
              const rotulo = base.endsWith(' *') ? base.slice(0, -2) : base;
              por(rotulo, no.type === 'checkbox' ? (no.checked ? 'Sim' : 'Não') : valorDe(no));
            });
            if (k === 3 && tipo.value !== 'transformacao') {
              por('Promoções', promocoes.length ? String(promocoes.length) : 'Sem promoção');
              promocoes.forEach((pr, j) => por('Promoção ' + (j + 1) + ' · quando vale', pr.agendada ? R.resumoRepeticaoPromocao(pr) : 'Sem agendamento: vale todos os dias, o dia todo.'));
            }
            quadro.append(U.botaoEditarBloco(ETAPAS[k], () => ir(k)), linhas);
            eRevisao.append(quadro);
          });
        }
        function ir(i) {
          atual = Math.max(0, Math.min(etapasNo.length - 1, i));
          if (atual === etapasNo.length - 1) pintarRevisao();
          etapasNo.forEach((q, k) => { q.style.display = k === atual ? '' : 'none'; });
          barra.set(atual);
          // Voltar a partir da 2ª etapa, Avançar até a penúltima; Salvar em todas na edição e só na última no cadastro novo.
          const ultima = atual === etapasNo.length - 1;
          nav.replaceChildren(...[atual > 0 && voltar, cancelar, (!novo || ultima) && salvarFim, !ultima && avancar].filter(Boolean));
          U.subirAoTopo(barra.el, form);
        }
        form.append(barra.el, ...etapasNo, nav);
        ir(0);

        return {
          alertas, status, ajuda, liberado, foto, ean, marca, nome, gramatura, medida, balanca, validade, emb, cde, qtdEmb, medCompra, aprox,
          tipo, grupo, sub, setor, area, areaGravada, min, max, local1, local2, setor1, setor2, areaVenda, custo, margem, auto, pontual,
          precisao, qtdTransf, unidTransf, receituario, refRec, fNcm, fCest, fCat, descricaoAtual, precoCalculado, atualizarFiscal, fiscaisDigitados, form,
          irParaEtapaDe: (no) => { const k = etapasNo.indexOf(no.closest('.compras-etapa')); if (k >= 0 && k !== atual) ir(k); },
        };
      },
      salvar: (c) => salvar(c),
    });

    function mostrarErro(c, msg, campo) {
      c.alertas.replaceChildren(Object.assign(el('p', 'compras-alerta tom-negativo'), { textContent: msg }));
      const alvo = campo && c.form.querySelector('[data-campo="' + campo + '"] :is(input,select)');
      if (alvo) { c.irParaEtapaDe(alvo); alvo.focus(); alvo.scrollIntoView({ block: 'center' }); }
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
      const anteriorFiscal = { ...(p?.fiscal || {}), ...c.fiscaisDigitados(), ncm: c.fNcm.value.replace(/\D/g, '') || null, cest: c.fCest.value.replace(/\D/g, '') || null, categoriaFiscal: c.fCat.value.trim().toLocaleUpperCase('pt-BR') || null };
      const descricao = c.descricaoAtual();
      const auto = c.auto.input.checked;
      const status = c.status.value;
      let campos = {
        status, habilitarAjuda: c.ajuda.input.checked, liberadoCompra: status === 'inativo' ? false : c.liberado.input.checked,
        fotoUrl: c.foto.valor(), marca: c.marca.value.trim(), nomeCatalogo: legado && nomeCat === p.descricao && !(gram > 0) ? null : nomeCat,
        quantidadeIndividual: gram, unidadeIndividual: c.medida.value, pesavel, teclaBalanca: pesavel ? R.TECLA_BALANCA_FIXA : null, validadeBalanca: pesavel ? validadeBalanca : null,
        descricao, embalagem: c.emb.value, cDe: c.emb.value ? c.cde.value : null, qtdEmbalagem, medidaCompra: c.medCompra.value, compraAproximada: c.aprox.value === 'sim',
        tipo, grupoId: c.grupo.value, subgrupoId: c.sub.value,
        ...localDoSetor(c.setor.value), areaEstoque: c.areaGravada(), estoqueMin, estoqueMax,
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
      // O catálogo fica no servidor (docs/PRODUTOS_NO_SERVIDOR_PLANO.md): cria (o servidor gera o código interno) ou edita
      // com a versão aberta (409 se alguém salvou antes). O histórico de nomes continua no Compras.
      if (!S.emModoServidor() || !window.CicluzProdutos.conectado()) {
        return mostrarErro(c, S.emModoServidor() ? 'Sem conexão com o servidor: o cadastro de produtos só grava conectado.' : 'Os produtos ainda estão sendo levados para o servidor. Peça ao administrador para abrir o S2 e tente de novo.');
      }
      const P = window.CicluzProdutos;
      const nomeAntes = p ? (p.nomeCatalogo ?? p.descricao) : null;
      const fiscalDerivado = (cod) => F.fiscalDoProduto({ anterior: anteriorFiscal, nome: campos.nomeCatalogo || campos.descricao, codigoBarras: cod, nomeGrupo: n.nomeGrupo, nomeSubgrupo: n.nomeSubgrupo }).fiscal;
      let pedido;
      try {
        pedido = novo
          ? P.criar({ ...campos, codigoBarras: eanDig || null, unidade: campos.medidaCompra || campos.unidadeIndividual || 'UN', criadoEm: S.agoraIso(), fiscal: fiscalDerivado(eanDig) })
          : P.editar({ ...p, ...campos, codigoBarras: eanDig || p.codigoBarras, fiscal: p.appId ? anteriorFiscal : fiscalDerivado(eanDig || p.codigoBarras) });
      } catch (e) { return mostrarErro(c, e.message); }
      pedido.then(async (salvo) => {
        if (!novo && campos.nomeCatalogo != null && campos.nomeCatalogo !== nomeAntes) {
          S.transacao((d) => { d.historicoNomes.push({ id: S.novoId('hn'), produtoId: salvo.id, nomeAnterior: nomeAntes, nomeNovo: campos.nomeCatalogo, alteradoPor: 'José · Compras', alteradoEm: S.agoraIso() }); });
        }
        // Promoção agendada vira compromisso na Agenda (17/11/2026, Rodrigo). A ligação (agendaItemIds) é gravada no produto
        // do servidor numa segunda gravação, só quando mudou; se ela falhar, o produto já está salvo e o aviso diz o que faltou.
        const agenda = await sincronizarAgenda(salvo, p ? p.promocoes : []);
        const ligacaoMudou = JSON.stringify(agenda.promocoes) !== JSON.stringify(salvo.promocoes || []);
        return (ligacaoMudou ? P.editar({ ...salvo, promocoes: agenda.promocoes }).catch((e) => { agenda.falhas.push('a ligação com a Agenda não foi gravada no servidor (' + (e.message || 'erro') + ')'); return salvo; }) : Promise.resolve(salvo))
          .then((final) => {
            dlg.close();
            U.avisar((novo ? 'Produto salvo com o código ' + final.codigoInterno + '.' : 'Produto salvo.')
              + (agenda.total ? ' ' + agenda.total + (agenda.total === 1 ? ' promoção na Agenda.' : ' compromissos de promoção na Agenda.') : '')
              + (agenda.falhas.length ? ' A Agenda não aceitou: ' + agenda.falhas[0] : ''));
            if (aoSalvar) aoSalvar(final);
          });
      }).catch((e) => mostrarErro(c, e.message || 'Não foi possível salvar no servidor.'));
      return 'Salvando no servidor…';
    }
    return dlg;
  }

  window.CicluzProdutoForm = { editarProduto };
})();
