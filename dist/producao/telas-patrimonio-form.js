/*
 * RET - Patrimônios: cadastro em seis etapas (17/11/2026). EXPERIMENTO de 26/11/2026 (Washington): a trilha de círculos (CicluzStepper) deu lugar ao quadro de etapa do padrão da Transferência:
 * 1 Cadastro e identificação · 2 Imagens e documentação · 3 Localização e responsabilidade · 4 Composição, peças e características
 * técnicas · 5 Aquisição, financeiro e depreciação · 6 Manutenção, controle e revisão. Avançar confere a etapa; Voltar e as
 * etapas numeradas permitem corrigir sem perder nada. Imagens e documentos ficam no IndexedDB de Documentações (nunca no
 * localStorage; só neste aparelho): o registro guarda apenas a referência { id, name, type, size }.
 * Só informação cadastral: nada aqui gera lançamento contábil, depreciação oficial, pagamento ou baixa (a baixa é um processo à parte).
 */
(function () {
  'use strict';
  const D = window.CicluzProducaoDominio; const S = window.CicluzProducaoDados; const SV = window.CicluzProducaoServico;
  const U = window.CicluzComprasUI; const CD = window.CicluzComprasDominio; const M = window.CicluzProducao; const PD = window.CicluzPatrimonioDominio;
  if (!D || !S || !SV || !U || !PD) return;
  const { el, botao, campo, entrada, seletor } = U;
  const cores = { cor: M.COR_RET, corTexto: M.COR_RET_TEXTO };
  const mostrar = (no, sim) => { no.style.display = sim ? '' : 'none'; };
  const dataBR = (iso) => (iso ? window.CicluzDateFields.display(iso) : '');
  const R = () => window.CicluzFieldRules;
  const arquivos = () => window.CicluzDocuments && window.CicluzDocuments.files;
  const dinheiro = (n) => (n == null ? '' : CD.moeda(n));
  const nomeDe = (lista, id) => (lista.find(([x]) => x === id) || [])[1] || '';
  const SVG = (d) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>';
  const ICO = { ver: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>', lapis: '<path d="m4 20 4-.8L19 8l-3-3L5 16zM14.5 6.5l3 3"/>', lixo: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
    baixar: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>', estrela: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>', trocar: '<path d="M4 8h14l-3-3M20 16H6l3 3"/>' };
  /** Botão redondo de ação de linha (mesmo desenho dos botões redondos do sistema). */
  const bolinha = (rotulo, desenho, acao) => { const b = el('button', 'shortcut-circle compras-redondo'); b.type = 'button'; b.title = rotulo; b.setAttribute('aria-label', rotulo); b.innerHTML = SVG(desenho); b.onclick = acao; return b; };
  const texto = (v, extra = {}) => entrada('text', v || '', { maxLength: 160, ...extra });
  /** Códigos e números (série, patrimônio, nota fiscal, apólice) mantêm exatamente o que foi digitado: sem a capitalização automática de nomes. */
  const livre = (i) => { i.dataset.textoLivre = '1'; return i; };
  // Textos descritivos mantêm o que foi digitado (sem a capitalização automática de nomes).
  const area = (v, linhas = 3) => { const t = el('textarea'); t.rows = linhas; t.maxLength = 2000; t.value = v || ''; t.dataset.textoLivre = '1'; return t; };
  const num = (i) => { const t = String(i.value).trim(); if (!t) return null; const n = CD.lerNumero(t); return n == null ? NaN : n; };
  const inteiro = (i) => { const t = String(i.value).trim(); return t === '' ? null : Number(t); };
  /** Campo de dinheiro com máscara brasileira; valor() em reais (2 casas) ou null. */
  function dinheiroInput(v) {
    const i = entrada('text', v == null ? '' : R().moneyMask(String(Math.round(v * 100))), { inputMode: 'numeric', placeholder: 'R$ 0,00', maxLength: 24 });
    i.addEventListener('input', () => { i.value = R().moneyMask(i.value); });
    return { no: i, valor: () => { const n = CD.digitos ? CD.digitos(i.value) : String(i.value).replace(/\D/g, ''); return n === '' ? null : Math.round(parseInt(n, 10)) / 100; } };
  }
  const opcoesFornecedor = (atual) => S.fornecedores().filter((f) => f.situacao === 'ativo' || f.id === atual).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map((f) => [f.id, f.nome + (f.situacao === 'ativo' ? '' : ' (inativo)')]);
  function opcoesGrupo(grupoAtual, subAtual) {
    const r = [];
    S.gruposDespesa().forEach((g) => {
      const meu = g.id === grupoAtual;
      if (g.ativo || (meu && !subAtual)) r.push([g.id + '|', g.nome]);
      g.subgrupos.forEach((s) => { if ((g.ativo && s.ativo) || (meu && s.id === subAtual)) r.push([g.id + '|' + s.id, g.nome + ' › ' + s.nome]); });
    });
    if (grupoAtual && !r.some((o) => o[0] === grupoAtual + '|' + (subAtual || ''))) r.push([grupoAtual + '|' + (subAtual || ''), S.nomeGrupoDespesa(grupoAtual, subAtual)]);
    return r;
  }
  const meses = (v) => entrada('number', v ?? '', { min: 1, step: 1, inputMode: 'numeric', placeholder: 'Ex.: 6' });
  /** Última data + intervalo em meses decidem a próxima; sem um dos dois, a próxima é digitada. */
  function ligarRepeticao(ultima, cada, proxima) {
    const atualiza = () => {
      const calculada = D.proximaData(ultima.value, cada.value === '' ? null : Number(cada.value));
      if (calculada) proxima.value = calculada;
      proxima.readOnly = !!calculada;
    };
    [ultima, cada].forEach((x) => { x.addEventListener('input', atualiza); x.addEventListener('change', atualiza); });
    atualiza();
  }
  const secao = (titulo, ...nos) => { const f = el('fieldset', 'compras-fieldset'); f.append(el('legend', null, titulo), ...nos); return f; };

  /* ---- Miniaturas e arquivos (IndexedDB de Documentações) ---- */
  const urls = new Map();
  async function urlDe(id) {
    if (urls.has(id)) return urls.get(id);
    try { const b = await arquivos().get(id); if (!b) return ''; const u = URL.createObjectURL(b); urls.set(id, u); return u; } catch (e) { return ''; }
  }
  async function baixarArquivo(meta) {
    try {
      const b = await arquivos().get(meta.id);
      if (!b) { U.avisar('O arquivo não está neste aparelho.'); return; }
      const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = meta.name || 'arquivo'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
    } catch (e) { U.avisar('Não foi possível baixar o arquivo.'); }
  }
  const verArquivo = (titulo, meta) => arquivos().view(titulo, meta, false);

  /* ================================================================ Peça (janela) ================================================================ */
  function janelaPeca(p, aoSalvar, somenteVer) {
    const novo = !p;
    U.dialogo({
      titulo: somenteVer ? 'Peça — ' + p.nome : novo ? 'Nova peça' : 'Editar peça', ...cores, largo: true, rotuloSalvar: 'Salvar peça',
      montar: (form) => {
        const x = p || {};
        const nome = texto(x.nome, { placeholder: 'Ex.: SSD, correia, resistência' }); const codigo = livre(texto(x.codigo, { maxLength: 40 })); const tipo = texto(x.tipo, { maxLength: 60, placeholder: 'Ex.: memória, motor, sensor' });
        const marca = texto(x.marca); const modelo = texto(x.modelo); const serie = livre(texto(x.serie, { maxLength: 60 }));
        const qtd = entrada('number', x.quantidade != null ? x.quantidade : 1, { min: 1, step: 1, inputMode: 'numeric' });
        const un = seletor(S.unidades().map((u) => [u, u]), x.unidade || '', 'Unidade');
        const valor = dinheiroInput(x.valor);
        const totalCampo = entrada('text', '', { readOnly: true });
        const situacao = seletor(PD.SITUACOES_PECA, x.situacao || 'ativo');
        const subst = livre(texto(x.substituidaPor, { placeholder: 'Quando for uma peça substituída: o que a substituiu' }));
        const obs = area(x.obs, 2);
        const forn = seletor(opcoesFornecedor(x.fornecedorId), x.fornecedorId || '', S.fornecedores().length ? 'Sem fornecedor' : 'Cadastre em MER - Fornecedores');
        const grupo = seletor(opcoesGrupo(x.grupoDespesaId, x.subgrupoDespesaId), x.grupoDespesaId ? x.grupoDespesaId + '|' + (x.subgrupoDespesaId || '') : '', 'Sem grupo');
        const ultima = entrada('date', x.ultimaTroca || ''); const cada = meses(x.intervaloMeses); const troca = entrada('date', x.proximaTroca || '');
        const foto = window.CicluzProdutoExtras.campoFoto(x.foto || null, () => nome.value.trim(), { vazio: 'Adicione uma imagem da peça (opcional)', pendente: 'A imagem nova é gravada ao salvar o patrimônio.', coisa: 'peça' });
        foto.no.classList.add('compras-largo');
        const pintaTotal = () => { const q = Number(qtd.value); const v = valor.valor(); totalCampo.value = v != null && Number.isInteger(q) && q >= 1 ? dinheiro(PD.totalPeca({ valor: v, quantidade: q })) : ''; };
        [qtd, valor.no].forEach((i) => i.addEventListener('input', pintaTotal)); pintaTotal();
        ligarRepeticao(ultima, cada, troca);
        // Só ver: tudo dentro de um fieldset desabilitado (vale também para os campos de data que o date-fields.js cria depois).
        const corpo = somenteVer ? el('fieldset') : form;
        if (somenteVer) { corpo.disabled = true; corpo.style.cssText = 'display:contents;border:0;margin:0;padding:0'; form.append(corpo); }
        corpo.append(campo('Peça *', nome), campo('Código', codigo), campo('Tipo', tipo), campo('Marca', marca), campo('Modelo', modelo), campo('Número de série', serie),
          campo('Quantidade *', qtd), campo('Unidade', un), campo('Valor unitário', valor.no), campo('Valor total (quantidade × valor unitário)', totalCampo), campo('Situação', situacao), campo('Substituída por', subst),
          campo('Observações', obs),
          campo('Fornecedor', forn), campo('Grupo de despesas', grupo, 'Ao lançar a despesa desta peça, é este o grupo que deve vir preenchido.'),
          campo('Última troca', ultima), campo('A cada (meses)', cada), campo('Substituir em', troca), foto.no);
        return { nome, codigo, tipo, marca, modelo, serie, qtd, un, valor, situacao, subst, obs, forn, grupo, ultima, cada, troca, foto };
      },
      salvar: somenteVer ? null : (c) => {
        if (!c.nome.value.trim()) return 'Informe o nome da peça.';
        const q = inteiro(c.qtd); if (!(Number.isInteger(q) && q >= 1)) return 'A quantidade deve ser um número inteiro a partir de 1.';
        if ([c.ultima, c.troca].some((d) => !d.checkValidity())) return 'Confira as datas: use DD/MM/AA.';
        const [grupoDespesaId = '', subgrupoDespesaId = ''] = c.grupo.value.split('|');
        aoSalvar({
          id: p ? p.id : '', nome: c.nome.value.trim(), codigo: c.codigo.value.trim(), tipo: c.tipo.value.trim(), marca: c.marca.value.trim(), modelo: c.modelo.value.trim(), serie: c.serie.value.trim(),
          quantidade: inteiro(c.qtd), unidade: c.un.value, valor: c.valor.valor(), situacao: c.situacao.value, substituidaPor: c.subst.value.trim(), obs: c.obs.value.trim(),
          fornecedorId: c.forn.value, grupoDespesaId, subgrupoDespesaId, ultimaTroca: c.ultima.value, intervaloMeses: c.cada.value, proximaTroca: c.troca.value, foto: c.foto.valor(),
        });
        return null;
      },
    });
  }

  /* ================================================================ Formulário ================================================================ */
  /**
   * opcoes { previa } abre o formulário para visualizar, sem salvar nada. opcoes (cadastro aberto de dentro de outro): { categoria } fixa a categoria (ex.: UTS ao cadastrar um utensílio a partir de um equipamento)
   * e { aoSalvar(id) } avisa quem abriu com o id do bem recém-salvo.
   */
  function abrirFormulario(b, opcoes = {}) {
    const novo = !b; let enviado = false; // opcoes.externo: aberto pelo link de teste; o cadastro fica "Recebido", inativo, à espera de conferência
    U.dialogo({
      aoFechar: () => { if (opcoes.externo && !enviado) window.CicluzConviteLink.sairModoExterno(); },
      titulo: opcoes.previa ? 'Prévia — Novo patrimônio' : opcoes.externo ? 'Cadastro de patrimônio' : opcoes.categoria ? 'Novo utensílio' : novo ? 'Novo patrimônio' : 'Editar patrimônio', ...cores, largo: true, classe: 'compras-form-padrao patrimonio-form', rotuloSalvar: 'Salvar Patrimônio',
      montar: (form, dlg) => {
        const v = b || {}; const hoje = S.hojeIso();
        const fin = v.financeiro || {}; const cont = v.contabil || {}; const gar = v.garantia || {}; const seg = v.seguro || {}; const loc = v.localizacao || {}; const resp = v.responsavel || {};
        const tec = v.tecnicas || {}; const man = v.manutencao || {}; const insp = v.inspecao || {};
        const datas = [];
        const dt = (valor) => { const i = entrada('date', valor || ''); datas.push(i); return i; };

        /* ---------- Etapa 1 ---------- */
        // Só as cinco categorias do cadastro; a categoria antiga de um bem já cadastrado continua aparecendo nele (sem conversão).
        const opcCategoria = [...PD.CATEGORIAS_PATRIMONIO];
        if (v.categoria && !opcCategoria.some(([k]) => k === v.categoria)) opcCategoria.push([v.categoria, (nomeDe(D.CATEGORIAS, v.categoria) || v.categoria) + ' (cadastro anterior)']);
        const categoria = seletor(opcCategoria, v.categoria || opcoes.categoria || '', 'Selecione');
        if (opcoes.categoria) categoria.disabled = true;
        // Grupo de patrimônio (19/11/2026, Rodrigo): o grupo e o subgrupo de RET - Grupos de Retiradas em que o bem fica, guardados por id.
        // É por ele que o patrimônio aparece dentro do subgrupo na escolha do Objeto do contrato. Opcional; bem antigo continua sem grupo.
        const gruposRet = (window.CicluzComprasDados && window.CicluzComprasDados.gruposPatrimonio) ? window.CicluzComprasDados.gruposPatrimonio() : []; // só Investimento
        const nomeRet = (t) => (typeof formatSystemName === 'function' ? formatSystemName(t) : t);
        const valorRet = v.grupoRetId ? v.grupoRetId + '|' + (v.subgrupoRetId || '') : '';
        const opcRet = gruposRet.flatMap((g) => (g.subgrupos.length ? g.subgrupos.filter((s2) => (g.ativo && s2.ativo) || valorRet === g.id + '|' + s2.id).map((s2) => [g.id + '|' + s2.id, nomeRet(g.nome) + ' › ' + nomeRet(s2.nome)]) : (g.ativo || valorRet === g.id + '|' ? [[g.id + '|', nomeRet(g.nome)]] : [])));
        if (valorRet && !opcRet.some(([k]) => k === valorRet)) opcRet.push([valorRet, 'Grupo removido']);
        const grupoRet = seletor(opcRet, valorRet, 'Selecione');
        const nome = texto(v.nome, { maxLength: 120, placeholder: 'Ex.: Notebook, Forno industrial, Geladeira' });
        const nomeTec = texto(v.nomeTecnico, { maxLength: 200, placeholder: 'Ex.: Notebook Dell Latitude 5440' });
        const marca = texto(v.marca); const modelo = texto(v.modelo); const serie = livre(texto(v.numeroSerie, { maxLength: 80 }));
        const numero = livre(texto(v.numeroPatrimonio, { maxLength: 40 }));
        const gerar = bolinha('Gerar o próximo número de patrimônio', '<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/>', () => { numero.value = PD.proximoNumero(S.patrimonio.dados.bens.filter((x) => !b || x.id !== b.id)); });
        const valor = dinheiroInput(v.valor);
        const descricao = area(v.descricao, 3);
        const tipoBem = seletor(PD.TIPOS_BEM, v.tipoBem || '', 'Selecione'); const natureza = seletor(PD.NATUREZAS, v.natureza || 'tangivel');
        let situacaoP = v.situacaoPatrimonial || (v.ativo === false ? 'inativo' : 'ativo');
        const opSit = PD.SITUACOES.filter(([k]) => k !== 'baixado' || situacaoP === 'baixado');
        const chipsSit = U.chips(opSit, situacaoP, (x) => { situacaoP = x; });
        let conserv = v.conservacao || '';
        const chipsCons = U.chips([['', 'Não informado'], ...PD.CONSERVACAO], conserv, (x) => { conserv = x; });
        const dataCad = dt(v.dataCadastro || (novo ? hoje : ''));
        const opcUnidade = [...PD.UNIDADES_MEDIDA];
        if (v.unidade && !opcUnidade.some(([k]) => k === v.unidade)) opcUnidade.push([v.unidade, v.unidade + ' (cadastro anterior)']);
        const unidade = seletor(opcUnidade, v.unidade || '', 'Unidade'); const quantidade = entrada('number', v.quantidade != null ? v.quantidade : '', { min: 1, step: 1, inputMode: 'numeric', placeholder: 'Ex.: 1' });
        const conjunto = U.quadroSituacao('Individual ou conjunto', Boolean(v.conjunto), { textos: ['Conjunto', 'Individual'], dica: 'Conjunto: um cadastro que representa várias unidades iguais.' });
        const audio = window.CicluzAudioNota.criar({ rotulo: '', classe: 'compras-largo', aoSalvar: 'o bem' }); audio.definir(v.audio || null);
        const rotSit = el('div', 'compras-campo compras-largo'); rotSit.append(el('span', 'compras-rotulo', 'Situação patrimonial'), chipsSit);
        const rotCons = el('div', 'compras-campo compras-largo'); rotCons.append(el('span', 'compras-rotulo', 'Estado de conservação'), chipsCons);
        const sitNota = el('p', 'profiles-note compras-largo', 'Situação não é exclusão: o cadastro e o histórico continuam. Para dar baixa, use o botão Baixar da lista ou da ficha.');
        // Produção (só MAC, MOB e as categorias antigas equivalentes): capacidade, unidade e utensílios usados.
        const usoProd = U.quadroSituacao('Este equipamento ou mobiliário é utilizado na produção?', v.usadoNaProducao != null ? Boolean(v.usadoNaProducao) : Boolean(v.capacidade), { textos: ['Sim', 'Não'], aoMudar: () => pintarProducao() });
        const opcCap = [...PD.UNIDADES_MEDIDA];
        if (v.capacidade && v.capacidade.unidade && !opcCap.some(([k]) => k === v.capacidade.unidade)) opcCap.push([v.capacidade.unidade, v.capacidade.unidade + ' (cadastro anterior)']);
        const capValor = entrada('text', v.capacidade ? String(v.capacidade.valor).replace('.', ',') : '', { inputMode: 'decimal', placeholder: 'Ex.: 50' });
        const capUn = seletor(opcCap, (v.capacidade && v.capacidade.unidade) || '', 'Unidade');
        const capResumo = el('p', 'profiles-note compras-largo'); capResumo.setAttribute('aria-live', 'polite');
        const usaUt = U.quadroSituacao('Este equipamento utiliza algum utensílio?', Boolean((v.utensiliosIds || []).length), { textos: ['Sim', 'Não'], aoMudar: () => pintarProducao() });
        let utensilios = [...(v.utensiliosIds || [])];
        const bensTodos = () => S.patrimonio.dados.bens;
        const rotuloBem = (x) => x.nome + (x.numeroPatrimonio ? ' · ' + x.numeroPatrimonio : '');
        const disponiveisUt = () => bensTodos().filter((x) => PD.CATEGORIAS_UTENSILIO.includes(x.categoria) && (!b || x.id !== b.id) && !utensilios.includes(x.id) && x.situacaoPatrimonial !== 'baixado' && x.ativo !== false).sort((a, c) => a.nome.localeCompare(c.nome, 'pt-BR'));
        const selUt = el('select'); selUt.setAttribute('aria-label', 'Selecionar utensílios utilizados'); const listaUt = el('div', 'patrimonio-vinculados'); const msgUt = el('p', 'profiles-error');
        function desenharUt() {
          const d = disponiveisUt();
          selUt.replaceChildren(new Option(d.length ? 'Selecione o utensílio' : 'Nenhum utensílio disponível', ''), ...d.map((x) => new Option(rotuloBem(x), x.id)));
          listaUt.replaceChildren(...utensilios.map((id) => { const x = bensTodos().find((y) => y.id === id); const lin = el('div', 'patrimonio-vinculo'); lin.append(el('span', null, x ? rotuloBem(x) : 'Utensílio não encontrado'), bolinha('Remover utensílio ' + (x ? x.nome : ''), ICO.lixo, () => { utensilios = utensilios.filter((y) => y !== id); desenharUt(); })); return lin; }));
        }
        const addUt = botao('Adicionar utensílio', () => { msgUt.textContent = ''; const id = selUt.value; if (!id || utensilios.includes(id)) return; utensilios.push(id); desenharUt(); }, 'btn secondary');
        const novoUt = botao('+ Cadastrar Utensílio', () => abrirFormulario(null, { categoria: 'UTS', aoSalvar: (id) => { if (!utensilios.includes(id)) utensilios.push(id); desenharUt(); } }), 'btn secondary');
        const barraUt = el('div', 'compras-form-rodape'); barraUt.append(selUt, addUt);
        const boxUt = el('div', 'compras-largo patrimonio-condicional'); boxUt.append(el('span', 'compras-rotulo', 'Selecionar utensílios utilizados'), barraUt, listaUt, msgUt, novoUt,
          el('small', 'profiles-note', 'A lista vem de UTS - Utensílios e Ferramentas. O utensílio cadastrado aqui fica salvo na hora, completo, com a categoria UTS; o equipamento só é salvo ao final.'));
        const boxProd = el('div', 'patrimonio-condicional compras-largo'); boxProd.append(campo('Quantidade da capacidade', capValor), campo('Unidade de medida da capacidade', capUn), capResumo, usaUt, boxUt);
        capUn.setAttribute('aria-label', 'Unidade de medida da capacidade'); capValor.setAttribute('aria-label', 'Quantidade da capacidade');
        function pintarCap() { const n = num(capValor); capResumo.textContent = n != null && n > 0 && capUn.value ? 'Capacidade de produção: ' + CD.numero(n) + ' ' + capUn.value : ''; }
        [capValor, capUn].forEach((x) => { x.addEventListener('input', pintarCap); x.addEventListener('change', pintarCap); });
        const secProducao = secao('Produção', usoProd, boxProd);
        function pintarProducao() {
          const ehProd = PD.CATEGORIAS_PRODUCAO.includes(categoria.value);
          mostrar(secProducao, ehProd); mostrar(boxProd, ehProd && usoProd.ativo); mostrar(boxUt, usaUt.ativo); pintarCap();
        }
        // Especificação técnica: o controle fica aqui; os campos ficam na etapa 4 (uma só vez).
        const tec0 = v.tecnicas || {};
        const temDadosEspec = Boolean(Object.keys(tec0).length || v.dimensoesFisicas || (v.materiais || []).length || (v.energia && v.energia !== 'nenhuma'));
        const espec = U.quadroSituacao('Informar especificação técnica?', v.informarEspecificacao != null ? Boolean(v.informarEspecificacao) : temDadosEspec, { textos: ['Sim', 'Não'], aoMudar: () => pintarEspec() });
        const secEspec1 = secao('Especificação técnica', espec);
        const e1 = el('div', 'compras-etapa');
        e1.append(secao('Identificação', campo('Categoria *', categoria), campo('Grupo de patrimônio', grupoRet), campo('Nome simplificado *', nome), campo('Nome técnico', nomeTec), campo('Marca', marca), campo('Modelo', modelo), campo('Número de série', serie),
          (() => { const l = el('label', 'compras-campo'); const ln = el('div', 'patrimonio-linha-campo'); numero.setAttribute('aria-label', 'Número de patrimônio'); ln.append(numero, gerar); l.append(el('span', 'compras-rotulo', 'Número de patrimônio'), ln, el('small', 'profiles-note', 'Único entre os bens; deixe em branco ou gere o próximo.')); return l; })(), campo('Valor do Patrimônio (R$)', valor.no), campo('Descrição detalhada', descricao), audio.no),
        secao('Classificação', campo('Tipo de bem', tipoBem), campo('Natureza', natureza), rotSit, sitNota, rotCons, campo('Data de cadastro', dataCad)),
        secao('Quantidade', campo('Unidade de medida', unidade), campo('Quantidade de unidades', quantidade), conjunto),
        secEspec1, secProducao);
        // Tipo de bem sugerido pela categoria, enquanto a pessoa não escolher.
        let tipoTocado = Boolean(v.tipoBem);
        tipoBem.addEventListener('change', () => { tipoTocado = true; });
        categoria.addEventListener('change', () => { if (!tipoTocado) tipoBem.value = ['imovel', 'instalacao', 'CIS'].includes(categoria.value) ? 'imovel' : categoria.value ? 'movel' : ''; pintarTecnicas(); pintarProducao(); });

        /* ---------- Etapa 2 ---------- */
        let imagens = (v.imagens || []).map((i) => ({ ...i })); let documentos = (v.documentos || []).map((d) => ({ ...d }));
        const msgArq = el('p', 'profiles-error compras-largo'); msgArq.setAttribute('role', 'alert');
        const galeria = el('div', 'patrimonio-galeria'); const contaImg = el('p', 'profiles-note'); const listaDocs = el('div', 'patrimonio-docs');
        const entradaArquivo = (tiposAceitos, multiplo, camera) => { const f = entrada('file'); f.accept = tiposAceitos; f.multiple = multiplo; f.hidden = true; if (camera) f.setAttribute('capture', 'environment'); return f; };
        const fotoIn = entradaArquivo(PD.TIPOS_ARQUIVO_IMAGEM.join(','), true, false); const cameraIn = entradaArquivo('image/*', false, true); const docIn = entradaArquivo(PD.TIPOS_ARQUIVO_DOCUMENTO.join(','), true, false);
        const trocaIn = entradaArquivo(PD.TIPOS_ARQUIVO_IMAGEM.join(','), false, false);
        async function guardarArquivo(arq, limite) {
          if (!arquivos()) return { erro: 'O armazenamento de arquivos deste aparelho não está disponível.' };
          const ruim = await arquivos().inspect(arq); if (ruim) return { erro: ruim };
          const id = S.novoId('arq');
          try { await arquivos().put(id, arq); } catch (e) { return { erro: 'Não foi possível guardar ' + arq.name + ' neste navegador.' }; }
          return { meta: { id, name: arq.name, type: arq.type, size: arq.size } };
        }
        async function receberImagens(lista) {
          msgArq.textContent = '';
          for (const arq of lista) {
            if (!PD.TIPOS_ARQUIVO_IMAGEM.includes(arq.type)) { msgArq.textContent = arq.name + ': use JPEG, PNG ou WebP.'; continue; }
            if (imagens.length >= PD.LIMITES.imagens) { msgArq.textContent = 'No máximo ' + PD.LIMITES.imagens + ' imagens por patrimônio.'; break; }
            const r = await guardarArquivo(arq); if (r.erro) { msgArq.textContent = r.erro; continue; }
            imagens.push({ ...r.meta, tipo: '', principal: !imagens.length });
          }
          desenharImagens();
        }
        fotoIn.onchange = () => { const l = [...fotoIn.files]; fotoIn.value = ''; receberImagens(l); };
        cameraIn.onchange = () => { const l = [...cameraIn.files]; cameraIn.value = ''; receberImagens(l); };
        let trocando = null;
        trocaIn.onchange = async () => {
          const arq = trocaIn.files[0]; trocaIn.value = ''; if (!arq || !trocando) return;
          if (!PD.TIPOS_ARQUIVO_IMAGEM.includes(arq.type)) { msgArq.textContent = arq.name + ': use JPEG, PNG ou WebP.'; return; }
          const r = await guardarArquivo(arq); if (r.erro) { msgArq.textContent = r.erro; return; }
          const k = imagens.indexOf(trocando); if (k >= 0) imagens[k] = { ...r.meta, tipo: trocando.tipo, principal: trocando.principal };
          desenharImagens();
        };
        function desenharImagens() {
          contaImg.textContent = imagens.length ? imagens.length + (imagens.length === 1 ? ' imagem anexada.' : ' imagens anexadas.') : 'Nenhuma imagem anexada.';
          galeria.replaceChildren(...imagens.map((im, k) => {
            const card = el('div', 'patrimonio-foto' + (im.principal ? ' principal' : ''));
            const mini = el('button', 'patrimonio-miniatura'); mini.type = 'button'; mini.title = 'Ampliar'; mini.setAttribute('aria-label', 'Ampliar imagem ' + (k + 1));
            const img = el('img'); img.alt = im.name || 'Imagem do patrimônio'; mini.append(img); urlDe(im.id).then((u) => { if (u) img.src = u; else mini.classList.add('sem-arquivo'); });
            mini.onclick = () => verArquivo('Imagem — ' + (nome.value.trim() || 'patrimônio'), im);
            const tipo = seletor(PD.TIPOS_IMAGEM, im.tipo || '', 'Tipo (opcional)'); tipo.setAttribute('aria-label', 'Tipo da imagem ' + (k + 1)); tipo.onchange = () => { im.tipo = tipo.value; };
            const acoes = el('div', 'patrimonio-acoes');
            acoes.append(bolinha(im.principal ? 'Imagem principal' : 'Definir como principal', ICO.estrela, () => { imagens.forEach((x) => { x.principal = x === im; }); desenharImagens(); }),
              bolinha('Substituir imagem', ICO.trocar, () => { trocando = im; trocaIn.click(); }), bolinha('Remover imagem', ICO.lixo, () => { imagens.splice(k, 1); if (imagens.length && !imagens.some((x) => x.principal)) imagens[0].principal = true; desenharImagens(); }));
            card.append(mini, el('small', im.principal ? 'rotulo-principal' : '', im.principal ? 'Principal' : (im.name || '')), tipo, acoes);
            return card;
          }));
          galeria.append(...(imagens.length ? [] : [el('p', 'profiles-note', 'Sem imagem, a lista mostra o ícone da categoria.')]));
        }
        const escanearDoc = botao('Escanear Documento', () => window.CicluzScanner.abrir({
          titulo: 'Escanear documento', nomeBase: 'Documento digitalizado', ...{ cores },
          aoConcluir: async (arq) => {
            if (documentos.length >= PD.LIMITES.documentos) return 'No máximo ' + PD.LIMITES.documentos + ' documentos por patrimônio.';
            const r = await guardarArquivo(arq); if (r.erro) return r.erro;
            documentos.push({ ...r.meta, tipo: '', data: '', descricao: '' }); desenharDocs(); pintarSelectsDoc(); return undefined;
          },
        }), 'btn secondary');
        const docsBotao = botao('Anexar documento', () => docIn.click(), 'btn secondary'); const fotoBotao = botao('Adicionar imagens', () => fotoIn.click(), 'btn secondary'); const camBotao = botao('Tirar foto', () => cameraIn.click(), 'btn secondary');
        docIn.onchange = async () => {
          const l = [...docIn.files]; docIn.value = ''; msgArq.textContent = '';
          for (const arq of l) {
            if (documentos.length >= PD.LIMITES.documentos) { msgArq.textContent = 'No máximo ' + PD.LIMITES.documentos + ' documentos por patrimônio.'; break; }
            const r = await guardarArquivo(arq); if (r.erro) { msgArq.textContent = r.erro; continue; }
            documentos.push({ ...r.meta, tipo: '', data: '', descricao: '' });
          }
          desenharDocs(); pintarSelectsDoc();
        };
        function desenharDocs() {
          listaDocs.replaceChildren(...documentos.map((d, k) => {
            const lin = el('div', 'patrimonio-doc');
            const tipo = seletor(PD.TIPOS_DOCUMENTO, d.tipo || '', 'Tipo do documento'); tipo.setAttribute('aria-label', 'Tipo do documento ' + (k + 1)); tipo.onchange = () => { d.tipo = tipo.value; pintarSelectsDoc(); };
            const data = dt(d.data || ''); data.setAttribute('aria-label', 'Data do documento ' + (k + 1)); const aplicarData = () => { d.data = data.value; }; data.addEventListener('input', aplicarData); data.addEventListener('change', aplicarData);
            const desc = texto(d.descricao, { maxLength: 200, placeholder: 'Descrição (opcional)' }); desc.setAttribute('aria-label', 'Descrição do documento ' + (k + 1)); desc.oninput = () => { d.descricao = desc.value; };
            const nomeArq = el('b', null, d.name || 'documento'); const acoes = el('div', 'patrimonio-acoes');
            acoes.append(bolinha('Visualizar documento ' + (k + 1), ICO.ver, () => verArquivo('Documento — ' + (d.name || ''), d)), bolinha('Baixar documento ' + (k + 1), ICO.baixar, () => baixarArquivo(d)),
              bolinha('Remover documento ' + (k + 1), ICO.lixo, () => { documentos.splice(k, 1); desenharDocs(); pintarSelectsDoc(); }));
            lin.append(nomeArq, tipo, campo('Data do documento', data), desc, acoes);
            return lin;
          }));
          if (!documentos.length) listaDocs.append(el('p', 'profiles-note', 'Nenhum documento anexado. Nota fiscal, garantia, manual, laudos e contratos podem ser anexados aqui (PDF, JPEG, PNG ou WebP, até 10 MB).'));
        }
        const e2 = el('div', 'compras-etapa');
        e2.append(secao('Galeria de imagens', el('div', 'compras-form-rodape compras-largo patrimonio-barra'), contaImg, galeria, fotoIn, cameraIn, trocaIn, el('small', 'profiles-note', 'JPEG, PNG ou WebP, até 10 MB. A principal aparece na lista e na ficha. Os arquivos ficam neste aparelho.')),
          secao('Documentos', el('div', 'compras-form-rodape compras-largo patrimonio-barra-docs'), listaDocs, docIn), msgArq);
        e2.querySelector('.patrimonio-barra').append(fotoBotao, camBotao); e2.querySelector('.patrimonio-barra-docs').append(docsBotao); if (window.CicluzScanner) e2.querySelector('.patrimonio-barra-docs').append(escanearDoc);

        /* ---------- Etapa 3 ---------- */
        const sessaoEmpresa = window.CicluzSessao && window.CicluzSessao.perfil && window.CicluzSessao.perfil.empresa ? window.CicluzSessao.perfil.empresa.nome : '';
        // Empresa (19/11/2026): a empresa do contexto atual; o CNPJ vem do cadastro de empresas que já existe (mesma empresa, pelo nome), se houver.
        const cnpjDoCadastro = (() => {
          try { const P = window.CicluzPeople; const lista = P && P.get ? P.get().companies : []; const n = U.dobrar(sessaoEmpresa); const c = n ? (lista || []).find((x) => U.dobrar(x.name) === n) : null; return c && c.cnpj ? R().cnpjMask(c.cnpj) : ''; } catch (e) { return ''; }
        })();
        const empresa = texto(loc.empresa ? loc.empresa : sessaoEmpresa, { maxLength: 160 });
        const cnpj = entrada('text', loc.cnpj || cnpjDoCadastro, { inputMode: 'numeric', placeholder: '00.000.000/0000-00', maxLength: 18 }); cnpj.addEventListener('input', () => { cnpj.value = R().cnpjMask(cnpj.value); });
        const unidadeLoc = texto(loc.unidade); const estab = texto(loc.estabelecimento); const departamento = texto(loc.departamento); const ambiente = texto(loc.ambiente); const sala = texto(loc.sala, { maxLength: 60 }); const andar = texto(loc.andar, { maxLength: 40 });
        const localizacaoDet = livre(texto(loc.detalhe, { maxLength: 200, placeholder: 'Ex.: ao lado do balcão de atendimento' }));
        const local = seletor(S.locais().map((l) => [l.id, l.caminho]), v.localId || '', 'Selecione o local');
        const gente = window.CicluzPeople && window.CicluzPeople.selectable ? window.CicluzPeople.selectable() : [];
        const respNome = texto(resp.nome, { placeholder: 'Se não for colaborador, digite o nome' }); const respCargo = texto(resp.cargo, { maxLength: 80 }); const respDep = texto(resp.departamento);
        const respData = dt(resp.dataAtribuicao || ''); const respTipo = seletor(PD.TIPOS_RESPONSABILIDADE, resp.tipo || '', 'Tipo de responsabilidade');
        /* Responsáveis (19/11/2026): os colaboradores ATIVOS vinculados ao local escolhido (áreas e setores do cadastro de pessoas; o vínculo
           vale para o local e para o que está dentro dele). Pode haver vários; nenhum é escolhido ao acaso e sem vínculo a tela avisa.
           Um colaborador de fora do local só entra se a pessoa o adicionar. O texto "Responsável atual" só é digitado quando não há colaborador. */
        const sel0 = Array.isArray(v.responsaveis) && v.responsaveis.length ? v.responsaveis : (resp.colaboradorId ? [{ colaboradorId: resp.colaboradorId, nome: resp.nome || '', cargo: resp.cargo || '' }] : []);
        const respSel = new Map(sel0.map((r) => [r.colaboradorId, { ...r }])); let respTocado = sel0.length > 0;
        const vinculadosAoLocal = (localId) => {
          try {
            const P = window.CicluzPeople; const O = window.CicluzOrg; if (!P || !P.get || !localId) return [];
            const unidades = new Set([localId]); const pilha = [localId];
            while (pilha.length) { const x = pilha.pop(); ((O && O.childrenOf && O.childrenOf(x)) || []).forEach((c) => { if (!unidades.has(c.id)) { unidades.add(c.id); pilha.push(c.id); } }); }
            return P.get().people.filter((p) => p.status === 'ATIVO' && (p.orgUnitIds || []).some((id) => unidades.has(id))).map((p) => ({ id: p.id, name: p.name, jobName: p.jobName || '' })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
          } catch (e) { return []; }
        };
        const boxResp = el('div', 'compras-campo compras-largo patrimonio-responsaveis'); const listaResp = el('div', 'patrimonio-resp-lista'); const msgResp = el('p', 'profiles-note'); msgResp.setAttribute('role', 'status');
        const outroColab = seletor(gente.map((p) => [p.id, p.name + (p.active ? '' : ' (inativo)')]), '', gente.length ? 'Adicionar outro colaborador' : 'Nenhum colaborador cadastrado'); outroColab.setAttribute('aria-label', 'Adicionar outro colaborador');
        function sincronizarResp() {
          const todos = [...respSel.values()];
          if (todos.length) { respNome.value = todos.map((x) => x.nome).join(', '); respNome.readOnly = true; if (!respCargo.value && todos[0].cargo) respCargo.value = todos[0].cargo; } else respNome.readOnly = false;
        }
        function pintarResp() {
          const ligados = vinculadosAoLocal(local.value); const ids = new Set(ligados.map((p) => p.id));
          if (!respTocado && ligados.length) ligados.forEach((p) => respSel.set(p.id, { colaboradorId: p.id, nome: p.name, cargo: p.jobName }));
          const linhas = [...ligados.map((p) => ({ ...p, fora: false })), ...[...respSel.values()].filter((r) => !ids.has(r.colaboradorId)).map((r) => ({ id: r.colaboradorId, name: r.nome, jobName: r.cargo, fora: true }))];
          listaResp.replaceChildren(...linhas.map((p) => {
            const l = el('label', 'compras-interruptor'); const c = entrada('checkbox'); c.checked = respSel.has(p.id); c.setAttribute('aria-label', 'Responsável: ' + p.name);
            c.onchange = () => { respTocado = true; if (c.checked) respSel.set(p.id, { colaboradorId: p.id, nome: p.name, cargo: p.jobName || '' }); else respSel.delete(p.id); pintarResp(); };
            l.append(c, el('span', null, p.name + (p.jobName ? ' — ' + p.jobName : '') + (p.fora ? ' (fora deste local)' : ''))); return l;
          }));
          msgResp.textContent = !local.value ? 'Escolha o local para ver os colaboradores vinculados a ele.'
            : ligados.length ? ligados.length + (ligados.length === 1 ? ' colaborador vinculado a este local.' : ' colaboradores vinculados a este local.')
              : 'Nenhum colaborador está vinculado a este local. Vincule em Gestão de Pessoas (áreas e setores do colaborador) ou adicione um colaborador abaixo.';
          sincronizarResp();
        }
        local.addEventListener('change', () => { if (!respTocado) respSel.clear(); pintarResp(); });
        outroColab.addEventListener('change', () => { const p = gente.find((x) => x.id === outroColab.value); if (p) { respTocado = true; respSel.set(p.id, { colaboradorId: p.id, nome: p.name, cargo: p.jobName || '' }); } outroColab.value = ''; pintarResp(); });
        boxResp.append(el('span', 'compras-rotulo', 'Responsáveis pelo patrimônio (colaboradores do local)'), listaResp, msgResp, outroColab);
        let movs = (v.movimentacoes || []).map((m) => ({ ...m })); const movsNovos = new Set();
        const tabMovs = el('div', 'patrimonio-tabela-box');
        function resumoLocal() { return [empresa.value.trim(), unidadeLoc.value.trim(), local.value ? S.nomeLocal(local.value) : '', ambiente.value.trim(), sala.value.trim()].filter(Boolean).join(' · '); }
        function desenharMovs() {
          tabMovs.replaceChildren();
          if (!movs.length) { tabMovs.append(el('p', 'profiles-note', 'Nenhuma movimentação registrada. Transferências, empréstimos e envios para manutenção aparecem aqui, em ordem, e a localização anterior nunca é apagada.')); return; }
          const t = el('table', 'compras-tabela'); const th = el('thead'); const trh = el('tr');
          ['Data', 'Tipo', 'Origem', 'Destino', 'Responsável', 'Motivo', ''].forEach((h) => { const c = el('th', null, h); c.scope = 'col'; trh.append(c); }); th.append(trh);
          const tb = el('tbody');
          movs.forEach((m) => { const tr = el('tr'); [dataBR(m.data), nomeDe(PD.TIPOS_MOVIMENTACAO, m.tipo), m.origem, m.destino, m.responsavel, m.motivo].forEach((x) => tr.append(el('td', null, x || '—')));
            const ac = el('td', 'patrimonio-acoes'); if (movsNovos.has(m)) ac.append(bolinha('Remover movimentação (ainda não salva)', ICO.lixo, () => { movs.splice(movs.indexOf(m), 1); movsNovos.delete(m); desenharMovs(); })); tr.append(ac); tb.append(tr); });
          t.append(th, tb); tabMovs.append(t);
        }
        function janelaMov() {
          U.dialogo({
            titulo: 'Registrar movimentação', ...cores, rotuloSalvar: 'Registrar',
            montar: (f2) => {
              const tipo = seletor(PD.TIPOS_MOVIMENTACAO, '', 'Selecione'); const data = entrada('date', hoje); const origem = livre(texto(resumoLocal())); const destino = livre(texto('', { placeholder: 'Para onde vai' }));
              const re = texto(respNome.value); const motivo = livre(texto('', { maxLength: 200 })); const obs = area('', 2);
              f2.append(campo('Tipo *', tipo), campo('Data *', data), campo('Origem', origem, 'Preenchida com a localização atual; ela continua guardada.'), campo('Destino', destino), campo('Responsável', re), campo('Motivo', motivo), campo('Observação', obs));
              return { tipo, data, origem, destino, re, motivo, obs };
            },
            salvar: (c) => {
              if (!c.tipo.value) return 'Escolha o tipo da movimentação.'; if (!c.data.checkValidity() || !PD.dataValida(c.data.value)) return 'Informe a data da movimentação (DD/MM/AA).';
              if (c.data.value > hoje) return 'A data da movimentação não pode ser futura.';
              const ultima = movs.length ? movs[movs.length - 1].data : ''; if (ultima && c.data.value < ultima) return 'A movimentação não pode ser anterior à última registrada (' + dataBR(ultima) + ').';
              const m = { id: S.novoId('mov'), tipo: c.tipo.value, data: c.data.value, origem: c.origem.value.trim(), destino: c.destino.value.trim(), responsavel: c.re.value.trim(), motivo: c.motivo.value.trim(), obs: c.obs.value.trim() };
              movs.push(m); movsNovos.add(m); desenharMovs(); return null;
            },
          });
        }
        const e3 = el('div', 'compras-etapa');
        e3.append(secao('Localização', campo('Empresa proprietária', empresa, 'Preenchida com a empresa atual.'), campo('CNPJ da empresa', cnpj, cnpjDoCadastro || loc.cnpj ? 'Do cadastro de empresas.' : 'CNPJ não encontrado no cadastro de empresas: informe uma vez.'), campo('Unidade ou filial', unidadeLoc), campo('Estabelecimento', estab),
          campo('Local do patrimônio (Área › Setor › Local)', local, S.locais().length ? 'Da árvore de DES - Cadastros Geral Colaboradores.' : 'Cadastre a árvore em Saídas · Despesas → Cadastros Geral Colaboradores.'),
          campo('Departamento', departamento), campo('Ambiente', ambiente), campo('Sala', sala), campo('Andar', andar), campo('Localização detalhada', localizacaoDet)),
        secao('Responsável pelo patrimônio', boxResp, campo('Responsável atual', respNome), campo('Cargo ou função', respCargo), campo('Departamento do responsável', respDep), campo('Data de atribuição', respData), campo('Tipo de responsabilidade', respTipo)),
        secao('Movimentações', el('div', 'compras-form-rodape compras-largo patrimonio-barra-mov'), tabMovs));
        e3.querySelector('.patrimonio-barra-mov').append(botao('Registrar movimentação', janelaMov, 'btn secondary'));

        /* ---------- Etapa 4 ---------- */
        const dm0 = v.dimensoesFisicas || {};
        const nd = (x) => (x == null ? '' : String(x).replace('.', ','));
        const dimAlt = entrada('text', nd(dm0.altura), { inputMode: 'decimal', placeholder: 'Ex.: 1,80' }); const dimLarg = entrada('text', nd(dm0.largura), { inputMode: 'decimal', placeholder: 'Ex.: 0,90' }); const dimProf = entrada('text', nd(dm0.profundidade), { inputMode: 'decimal', placeholder: 'Ex.: 0,75' });
        const dimUn = seletor(PD.UNIDADES_DIMENSAO, dm0.unidade || 'm'); dimUn.setAttribute('aria-label', 'Unidade das dimensões');
        const pesoVal = entrada('text', nd(dm0.peso), { inputMode: 'decimal', placeholder: 'Ex.: 85' }); const pesoUn = seletor(PD.UNIDADES_PESO, dm0.pesoUnidade || 'kg'); pesoUn.setAttribute('aria-label', 'Unidade do peso');
        /** Tipo de material: uma lista de seleção agrupada por família, mais "Outro material" (texto livre, só neste cadastro). Materiais extras de cadastros antigos ficam guardados e aparecem como etiquetas que se podem remover. */
        function seletorMaterial(inicial) {
          const todos = PD.MATERIAIS.flatMap(([, l]) => l); const achar = (m) => todos.find((x) => x.toLowerCase() === String(m).toLowerCase());
          const no = el('div', 'compras-campo patrimonio-materiais'); const sel = el('select'); sel.setAttribute('aria-label', 'Tipo de material');
          sel.append(new Option('Selecione o material', ''));
          PD.MATERIAIS.forEach(([t, itens]) => { const g = el('optgroup'); g.label = t; itens.forEach((m) => g.append(new Option(m, m))); sel.append(g); });
          sel.append(new Option('Outro material', '__outro__'));
          const outro = livre(texto('', { placeholder: 'Nome do material', maxLength: 80 })); outro.setAttribute('aria-label', 'Outro material');
          const principal = inicial[0] || ''; let extras = inicial.slice(1); const etiquetas = el('div', 'compras-chips');
          if (principal) { if (achar(principal)) sel.value = achar(principal); else { sel.value = '__outro__'; outro.value = principal; } }
          const pintar = () => {
            outro.style.display = sel.value === '__outro__' ? '' : 'none';
            etiquetas.replaceChildren(...extras.map((m) => { const b2 = botao(m + ' ×', () => { extras = extras.filter((x) => x !== m); pintar(); }, 'compras-chip ativo'); b2.setAttribute('aria-label', 'Remover material ' + m); return b2; }));
            etiquetas.style.display = extras.length ? '' : 'none';
          };
          sel.addEventListener('change', pintar);
          no.append(el('span', 'compras-rotulo', 'Tipo de material'), sel, outro, etiquetas, el('small', 'profiles-note', 'Escolha o material principal. "Outro material" aceita um texto livre.')); pintar();
          return { no, valor: () => { const p = sel.value === '__outro__' ? outro.value.trim() : sel.value; return [p, ...extras].filter((m, i, a) => m && a.findIndex((x) => x.toLowerCase() === m.toLowerCase()) === i); } };
        }
        const materiais = seletorMaterial(v.materiais || []);
        // Tipo de energia e consumo (só o campo que corresponde ao tipo); sem cálculo de custo, geração ou consumo.
        const g0 = v.consumoGas || (v.energia === 'gas' && v.consumoHora ? { valor: v.consumoHora, unidade: 'kg/h' } : null);
        const energia = seletor([['nenhuma', 'Não utiliza energia'], ...PD.TIPOS_ENERGIA], v.energia || 'nenhuma'); energia.setAttribute('aria-label', 'Tipo de Energia');
        const gasValor = entrada('text', g0 ? nd(g0.valor) : '', { inputMode: 'decimal', placeholder: 'Ex.: 1,5' }); const gasUn = seletor(PD.UNIDADES_GAS, (g0 && g0.unidade) || '', 'Unidade'); gasUn.setAttribute('aria-label', 'Unidade do consumo de gás');
        const potW = entrada('text', nd(v.potenciaW), { inputMode: 'decimal', placeholder: 'Ex.: 2000' });
        // Consumo elétrico em kWh por hora de uso (23/11/2026, Zé: "falta o campo"): é ele que entra no custo de energia da ficha
        // técnica (tempo × consumo × preço do kWh). A potência em W continua só informativa: o sistema não converte W em kWh.
        const kwh = entrada('text', v.energia === 'eletrica' ? nd(v.consumoHora) : '', { inputMode: 'decimal', placeholder: 'Ex.: 1,5' });
        const boxGas = el('div', 'patrimonio-condicional compras-largo'); // Consumo de gás por hora: um campo só, com a unidade junto do valor (sem conversão e sem presumir kg). A unidade a adotar ainda precisa de validação técnica.
        gasValor.setAttribute('aria-label', 'Consumo de gás por hora'); const linhaGas = el('div', 'patrimonio-linha-campo'); linhaGas.append(gasValor, gasUn);
        boxGas.append(campo('Consumo de gás por hora', linhaGas, 'A unidade fica junto do valor; o sistema não converte entre unidades.')); linhaGas.removeAttribute('aria-label');
        const boxEle = el('div', 'patrimonio-condicional compras-largo'); boxEle.append(campo('Potência Elétrica (W)', potW, 'Potência em watts (W). Só informativa: não é o consumo e não gera custo.'), campo('Consumo elétrico por hora (kWh)', kwh, 'Quanto o equipamento gasta em 1 hora de uso. É o que entra no custo de energia da ficha técnica.'));
        const boxSol = el('div', 'patrimonio-condicional compras-largo'); boxSol.append(el('p', 'profiles-note', 'Energia solar selecionada. O sistema não calcula geração nem consumo solar.'));
        function pintarEnergia() { mostrar(boxGas, energia.value === 'gas'); mostrar(boxEle, energia.value === 'eletrica'); mostrar(boxSol, energia.value === 'solar'); }
        energia.addEventListener('change', () => { pintarEnergia(); pintarTecnicas(); });
        const camposTec = {};
        PD.TECNICAS.forEach(([k, rot]) => {
          const longo = ['especificacoes', 'observacoes'].includes(k);
          let i;
          if (k === 'voltagem') { // lista de escolha; o texto que já existia em cadastro antigo continua como opção "(cadastro anterior)"
            const op = PD.VOLTAGENS.map((x) => [x, x]); if (tec.voltagem && !PD.VOLTAGENS.includes(tec.voltagem)) op.push([tec.voltagem, tec.voltagem + ' (cadastro anterior)']);
            i = seletor(op, tec.voltagem || '', 'Selecione a voltagem');
          } else i = longo ? area(tec[k], 2) : texto(tec[k], { maxLength: 120 });
          const c = campo(rot, i); if (longo) c.classList.add('compras-largo'); camposTec[k] = c; camposTec[k].entrada = i;
        });
        function pintarTecnicas() { const ok = PD.camposTecnicos(categoria.value).filter((k) => !PD.TECNICAS_OCULTAS.includes(k)); PD.TECNICAS.forEach(([k]) => mostrar(camposTec[k], ok.includes(k))); mostrar(camposTec.voltagem, ok.includes('voltagem') || energia.value !== 'nenhuma'); mostrar(prod, PD.CATEGORIAS_UTENSILIO.includes(categoria.value) || Boolean(v.medidas)); notaTec.textContent = categoria.value ? 'Outros dados técnicos de ' + (nomeDe(D.CATEGORIAS, categoria.value) || 'a categoria') + '.' : 'Escolha a categoria na etapa 1 para ver os dados técnicos que se aplicam.'; }
        const notaTec = el('p', 'profiles-note compras-largo');
        // Medidas úteis do utensílio para a Produção (formas, assadeiras): campos de hoje, sem mudança. A capacidade passou para a etapa 1.
        const larg = entrada('text', v.medidas ? String(v.medidas.largura).replace('.', ',') : '', { inputMode: 'decimal', placeholder: 'cm' }); const comp = entrada('text', v.medidas ? String(v.medidas.comprimento).replace('.', ',') : '', { inputMode: 'decimal', placeholder: 'cm' });
        const prod = secao('Medidas para a produção', campo('Largura (cm)', larg), campo('Comprimento (cm)', comp), U.nota('Medidas úteis do utensílio (forma, assadeira) usadas pela Produção.'));
        // Ficha técnica do equipamento: um documento (PDF ou imagem) anexado ou digitalizado; Substituir troca, Remover tira antes de salvar.
        let ficha = v.fichaTecnica && v.fichaTecnica.id ? { ...v.fichaTecnica } : null;
        const fichaIn = entradaArquivo(PD.TIPOS_ARQUIVO_DOCUMENTO.join(','), false, false); const fichaBox = el('div', 'patrimonio-ficha-tec'); const fichaMsg = el('p', 'profiles-error'); fichaMsg.setAttribute('role', 'alert');
        fichaIn.onchange = async () => {
          const arq = fichaIn.files[0]; fichaIn.value = ''; fichaMsg.textContent = ''; if (!arq) return;
          if (!PD.TIPOS_ARQUIVO_DOCUMENTO.includes(arq.type)) { fichaMsg.textContent = arq.name + ': use PDF, JPEG, PNG ou WebP.'; return; }
          const r = await guardarArquivo(arq); if (r.erro) { fichaMsg.textContent = r.erro; return; }
          ficha = r.meta; desenharFicha();
        };
        function desenharFicha() {
          const linha = el('div', 'patrimonio-doc'); const acoes = el('div', 'patrimonio-acoes');
          if (ficha) acoes.append(bolinha('Visualizar ficha técnica', ICO.ver, () => verArquivo('Ficha técnica — ' + (nome.value.trim() || 'equipamento'), ficha)), bolinha('Baixar ficha técnica', ICO.baixar, () => baixarArquivo(ficha)), bolinha('Remover ficha técnica', ICO.lixo, () => { ficha = null; desenharFicha(); }));
          const botoes = el('div', 'compras-form-rodape patrimonio-barra-docs'); botoes.append(botao(ficha ? 'Substituir documento' : 'Anexar documento', () => fichaIn.click(), 'btn secondary'));
          if (window.CicluzScanner) botoes.append(botao('Escanear Ficha Técnica', () => window.CicluzScanner.abrir({ titulo: 'Escanear ficha técnica', nomeBase: 'Ficha técnica', cores, aoConcluir: async (arq) => { const r = await guardarArquivo(arq); if (r.erro) return r.erro; ficha = r.meta; desenharFicha(); return undefined; } }), 'btn secondary'));
          linha.append(ficha ? el('b', null, ficha.name || 'ficha técnica') : el('span', 'profiles-note', 'Nenhuma ficha técnica anexada.'), acoes);
          fichaBox.replaceChildren(linha, botoes, fichaMsg, fichaIn);
        }
        const secFicha = secao('Ficha Técnica do Equipamento', fichaBox);
        // Peças e componentes
        let pecas = (v.pecas || []).map((p) => ({ ...p, id: p.id || S.novoId('peca') }));
        const indic = el('div', 'patrimonio-indicadores'); const tabPecas = el('div', 'patrimonio-tabela-box');
        function desenharPecas() {
          const t = PD.totaisComponentes(pecas);
          indic.replaceChildren(...[['Tipos de componentes', t.tipos], ['Unidades de peças', t.unidades], ['Componentes ativos', t.ativos], ['Substituídos', t.substituidos]].map(([r, n]) => { const c = el('div', 'patrimonio-indicador'); c.append(el('b', null, String(n)), el('small', null, r)); return c; }));
          tabPecas.replaceChildren();
          if (!pecas.length) { tabPecas.append(el('p', 'profiles-note', 'Nenhuma peça cadastrada. Adicione carregador, memória, motor, correias, sensores e o que mais fizer parte do bem.')); return; }
          const tb = el('table', 'compras-tabela'); const th = el('thead'); const trh = el('tr');
          ['Código', 'Nome da peça', 'Tipo', 'Marca', 'Modelo', 'Número de série', 'Qtd.', 'Unid.', 'Valor unitário', 'Valor total', 'Situação', 'Ações'].forEach((h) => { const c = el('th', null, h); c.scope = 'col'; trh.append(c); }); th.append(trh);
          const corpo = el('tbody');
          pecas.forEach((p, k) => {
            const tr = el('tr'); const tot = PD.totalPeca(p);
            [p.codigo, p.nome, p.tipo, p.marca, p.modelo, p.serie, String(p.quantidade || 1), p.unidade, dinheiro(p.valor), tot == null ? '' : dinheiro(tot), nomeDe(PD.SITUACOES_PECA, p.situacao || 'ativo')].forEach((x, i) => { const c = el('td', i >= 6 && i <= 9 ? 'num' : null, x || '—'); tr.append(c); });
            const ac = el('td', 'patrimonio-acoes');
            ac.append(bolinha('Visualizar peça ' + p.nome, ICO.ver, () => janelaPeca(p, () => {}, true)), bolinha('Editar peça ' + p.nome, ICO.lapis, () => janelaPeca(p, (n) => { pecas[k] = { ...n, id: p.id }; desenharPecas(); })),
              bolinha('Remover peça ' + p.nome, ICO.lixo, () => U.confirmar('Remover peça', 'Remover "' + p.nome + '" deste cadastro? Vale ao salvar o patrimônio.', 'Remover', () => { pecas.splice(k, 1); desenharPecas(); }, cores)));
            tr.append(ac); corpo.append(tr);
          });
          tb.append(th, corpo); tabPecas.append(tb);
        }
        // Composição por outros bens
        let vinculados = [...(v.vinculados || [])];
        const composto = U.quadroSituacao('Este patrimônio é composto por outros bens?', Boolean(v.composto), { textos: ['Sim', 'Não'], dica: 'Ex.: computador com monitor e periféricos, linha de produção, conjunto de móveis.', aoMudar: () => pintarComposto() });
        const outrosBens = () => S.patrimonio.dados.bens.filter((x) => (!b || x.id !== b.id) && !vinculados.includes(x.id) && !(b && PD.criaCiclo(S.patrimonio.dados.bens, b.id, [x.id])));
        const selVinc = el('select'); const listaVinc = el('div', 'patrimonio-vinculados'); const boxVinc = el('div', 'compras-largo'); const msgVinc = el('p', 'profiles-error');
        function desenharVinc() {
          selVinc.replaceChildren(new Option(outrosBens().length ? 'Selecione o patrimônio' : 'Nenhum outro patrimônio disponível', ''), ...outrosBens().sort((a, c) => a.nome.localeCompare(c.nome, 'pt-BR')).map((x) => new Option(x.nome + (x.numeroPatrimonio ? ' · ' + x.numeroPatrimonio : ''), x.id)));
          listaVinc.replaceChildren(...vinculados.map((id) => { const x = S.patrimonio.dados.bens.find((y) => y.id === id); const lin = el('div', 'patrimonio-vinculo'); lin.append(el('span', null, x ? x.nome + (x.numeroPatrimonio ? ' · ' + x.numeroPatrimonio : '') : 'Patrimônio não encontrado'), bolinha('Desvincular ' + (x ? x.nome : ''), ICO.lixo, () => { vinculados = vinculados.filter((y) => y !== id); desenharVinc(); })); return lin; }));
        }
        const addVinc = botao('Vincular', () => {
          msgVinc.textContent = ''; const id = selVinc.value; if (!id) return;
          if (b && id === b.id) { msgVinc.textContent = 'Um patrimônio não pode ser vinculado a ele mesmo.'; return; }
          if (b && PD.criaCiclo(S.patrimonio.dados.bens, b.id, [id])) { msgVinc.textContent = 'Vínculo circular: esse patrimônio já contém este.'; return; }
          if (!vinculados.includes(id)) vinculados.push(id); desenharVinc();
        }, 'btn secondary');
        boxVinc.append(el('div', 'compras-form-rodape'), listaVinc, msgVinc, el('small', 'profiles-note', 'Cada bem vinculado continua com a sua identificação e o seu valor: o valor dele não soma ao deste patrimônio (sem dupla contagem).'));
        boxVinc.firstChild.append(selVinc, addVinc);
        function pintarComposto() { mostrar(boxVinc, composto.ativo); }
        const e4 = el('div', 'compras-etapa');
        // Especificação técnica (19/11/2026): fica na etapa 1, dentro do bloco ligado por "Informar especificação técnica?", em grupos de preenchimento.
        const sub = (t, ...nos) => { const f = el('fieldset', 'compras-fieldset patrimonio-sub'); f.append(el('legend', null, t), ...nos); return f; };
        const boxEspec = el('div', 'compras-largo patrimonio-espec');
        boxEspec.append(sub('Identificação técnica', camposTec.fabricante, camposTec.anoFabricacao),
          sub('Energia e consumo', camposTec.voltagem, campo('Tipo de Energia', energia), boxGas, boxEle, boxSol),
          sub('Dimensões e características físicas', campo('Altura', dimAlt), campo('Largura', dimLarg), campo('Profundidade', dimProf), campo('Unidade das dimensões', dimUn), campo('Peso', pesoVal), campo('Unidade do peso', pesoUn), materiais.no),
          sub('Outras informações técnicas', notaTec, camposTec.frequencia, camposTec.cor, camposTec.especificacoes, camposTec.observacoes), secFicha);
        secEspec1.append(boxEspec);
        function pintarEspec() { mostrar(boxEspec, espec.ativo); }
        e4.append(prod,
          secao('Peças e componentes', indic, el('div', 'compras-form-rodape compras-largo patrimonio-barra-pecas'), tabPecas), secao('Patrimônio composto', composto, boxVinc));
        e4.querySelector('.patrimonio-barra-pecas').append(botao('Adicionar peça', () => janelaPeca(null, (n) => { pecas.push({ ...n, id: S.novoId('peca') }); desenharPecas(); }), 'btn secondary'));

        /* ---------- Etapa 5 ---------- */
        const tipoAq = seletor(PD.TIPOS_AQUISICAO, fin.tipoAquisicao || '', 'Selecione'); const dAq = dt(fin.dataAquisicao); const dRec = dt(fin.dataRecebimento); const dOp = dt(fin.dataOperacao);
        const fornecedor = seletor(opcoesFornecedor(fin.fornecedorId), fin.fornecedorId || '', S.fornecedores().length ? 'Sem fornecedor' : 'Cadastre em DES - Fornecedores'); const nf = livre(texto(fin.nf, { maxLength: 40 })); const serieNf = livre(texto(fin.serieNf, { maxLength: 20 }));
        const vAq = dinheiroInput(fin.valorAquisicao); const frete = dinheiroInput(fin.frete); const instal = dinheiroInput(fin.instalacao); const custos = dinheiroInput(fin.custosAdicionais); const descontos = dinheiroInput(fin.descontos);
        const totalAq = entrada('text', '', { readOnly: true }); const moeda = entrada('text', 'BRL', { readOnly: true });
        const pintaTotalAq = () => { totalAq.value = dinheiro(PD.valorTotalAquisicao({ valorAquisicao: vAq.valor(), frete: frete.valor(), instalacao: instal.valor(), custosAdicionais: custos.valor(), descontos: descontos.valor() })); };
        [vAq, frete, instal, custos, descontos].forEach((x) => x.no.addEventListener('input', pintaTotalAq)); pintaTotalAq();
        const grupoPat = texto(cont.grupo); const conta = livre(texto(cont.conta)); const centroCusto = livre(texto(cont.centroCusto)); const residual = dinheiroInput(cont.valorResidual);
        const vida = entrada('number', cont.vidaUtilMeses != null ? cont.vidaUtilMeses : '', { min: 1, step: 1, inputMode: 'numeric', placeholder: 'Meses' }); const iniDep = dt(cont.inicioDepreciacao);
        const metodo = seletor(PD.METODOS_DEPRECIACAO, cont.metodo || '', 'Selecione'); const vContabil = dinheiroInput(cont.valorContabil); const obsCont = area(cont.obs, 2);
        const garPossui = U.quadroSituacao('Possui garantia?', Boolean(gar.possui), { textos: ['Sim', 'Não'], aoMudar: () => pintarGarSeg() });
        const gIni = dt(gar.inicio); const gFim = dt(gar.fim); const gEmpresa = texto(gar.empresa); const gContato = texto(gar.contato); const gCert = livre(texto(gar.certificado, { maxLength: 60 })); const gCond = area(gar.condicoes, 2);
        const gDoc = el('select'); const gPrazo = el('small', 'profiles-note');
        const segPossui = U.quadroSituacao('Possui seguro?', Boolean(seg.possui), { textos: ['Sim', 'Não'], aoMudar: () => pintarGarSeg() });
        const sSeg = texto(seg.seguradora); const sApolice = livre(texto(seg.apolice, { maxLength: 60 })); const sValor = dinheiroInput(seg.valorSegurado); const sIni = dt(seg.inicio); const sFim = dt(seg.fim); const sObs = area(seg.obs, 2);
        const gBox = el('div', 'patrimonio-condicional'); const sBox = el('div', 'patrimonio-condicional');
        gBox.append(campo('Início da garantia', gIni), campo('Término da garantia', gFim), gPrazo, campo('Empresa responsável', gEmpresa), campo('Contato da assistência', gContato), campo('Número do certificado', gCert), campo('Condições da garantia', gCond), campo('Documento da garantia', gDoc));
        sBox.append(campo('Seguradora', sSeg), campo('Número da apólice', sApolice), campo('Valor segurado', sValor.no), campo('Início da cobertura', sIni), campo('Término da cobertura', sFim), campo('Observações do seguro', sObs));
        function pintarPrazo() { const p = PD.prazoRestante(gIni.value, gFim.value, hoje); gPrazo.textContent = p ? 'Prazo da garantia: ' + p.texto + '.' : ''; }
        [gIni, gFim].forEach((x) => { x.addEventListener('input', pintarPrazo); x.addEventListener('change', pintarPrazo); }); pintarPrazo();
        function pintarGarSeg() { mostrar(gBox, garPossui.ativo); mostrar(sBox, segPossui.ativo); }
        const docAtual = { garantia: gar.documentoId || '', inspecao: insp.documentoId || '', manutencao: '' };
        const selecionaveis = [];
        function pintarSelectsDoc() { selecionaveis.forEach(([sel, chave]) => { const antes = sel.value || docAtual[chave] || ''; sel.replaceChildren(new Option(documentos.length ? 'Sem documento' : 'Anexe na etapa 2', ''), ...documentos.map((d) => new Option((nomeDe(PD.TIPOS_DOCUMENTO, d.tipo) ? nomeDe(PD.TIPOS_DOCUMENTO, d.tipo) + ' — ' : '') + d.name, d.id))); sel.value = documentos.some((d) => d.id === antes) ? antes : ''; docAtual[chave] = sel.value; }); }
        selecionaveis.push([gDoc, 'garantia']);
        const e5 = el('div', 'compras-etapa');
        e5.append(secao('Aquisição', campo('Tipo de aquisição', tipoAq), campo('Data de aquisição', dAq), campo('Data de recebimento', dRec), campo('Data de entrada em operação', dOp), campo('Fornecedor', fornecedor, 'Do cadastro de fornecedores (vínculo pelo id).'),
          campo('Número da nota fiscal', nf), campo('Série da nota fiscal', serieNf), campo('Valor de aquisição (R$)', vAq.no), campo('Frete (R$)', frete.no), campo('Instalação (R$)', instal.no), campo('Custos adicionais (R$)', custos.no), campo('Descontos (R$)', descontos.no),
          campo('Valor total de aquisição (R$)', totalAq, 'Aquisição + frete + instalação + custos − descontos. Só informativo.'), campo('Moeda', moeda)),
        // Depreciação (19/11/2026): só o essencial nesta versão. "Grupo patrimonial" (já é a Categoria) e "Valor contábil informado" (já há o valor do patrimônio e o de aquisição) saíram da tela;
        // o que já estava gravado neles continua guardado. Nenhum cálculo, taxa ou lançamento: os critérios contábeis ainda serão definidos.
        secao('Depreciação', U.nota('Estrutura simplificada nesta versão: critérios e cálculos contábeis serão definidos depois. O sistema não calcula depreciação nem gera lançamento.'),
          campo('Método de depreciação', metodo, 'Nem todo patrimônio é depreciável.'), campo('Vida útil estimada (meses)', vida), campo('Data de início de depreciação', iniDep), campo('Valor residual estimado (R$)', residual.no),
          campo('Conta contábil', conta), campo('Centro de custo', centroCusto), campo('Observações contábeis', obsCont)),
        secao('Garantia', garPossui, gBox), secao('Seguro', segPossui, sBox));

        /* ---------- Etapa 6 ---------- */
        const exige = U.quadroSituacao('Exige manutenção periódica?', Boolean(man.exige || v.revisao), { textos: ['Sim', 'Não'], aoMudar: () => pintarMan() });
        const tipoMan = seletor(PD.TIPOS_MANUTENCAO, man.tipo || '', 'Selecione'); const manCada = meses(v.revisao?.intervaloMeses); const manUltima = dt(v.revisao?.ultima); const manProxima = dt(v.revisao?.proxima);
        const manResp = texto(man.responsavel); const manForn = seletor(opcoesFornecedor(man.fornecedorId), man.fornecedorId || '', 'Sem fornecedor ou prestador'); const manCusto = dinheiroInput(man.custoEstimado); const manObs = area(man.obs, 2);
        ligarRepeticao(manUltima, manCada, manProxima);
        const manBox = el('div', 'patrimonio-condicional'); manBox.append(campo('Tipo de manutenção', tipoMan), campo('Periodicidade — a cada (meses)', manCada), campo('Data da última manutenção', manUltima),
          campo('Próxima manutenção prevista', manProxima, 'Calculada pela última manutenção e pela periodicidade; sem elas, digite a data.'), campo('Responsável pela manutenção', manResp), campo('Fornecedor ou prestador', manForn), campo('Custo estimado (R$)', manCusto.no), campo('Observações', manObs));
        function pintarMan() { mostrar(manBox, exige.ativo); }
        let manutencoes = (v.manutencoes || []).map((m) => ({ ...m })); const tabMan = el('div', 'patrimonio-tabela-box');
        function desenharMan() {
          tabMan.replaceChildren();
          if (!manutencoes.length) { tabMan.append(el('p', 'profiles-note', 'Nenhuma manutenção registrada. O histórico só mostra o que for lançado aqui: nada é inventado.')); return; }
          const t = el('table', 'compras-tabela'); const th = el('thead'); const trh = el('tr');
          ['Data', 'Tipo', 'Serviço', 'Responsável', 'Peças substituídas', 'Custo', 'Documento', 'Próxima', 'Situação', 'Ações'].forEach((h) => { const c = el('th', null, h); c.scope = 'col'; trh.append(c); }); th.append(trh);
          const tb = el('tbody');
          manutencoes.forEach((m, k) => {
            const tr = el('tr'); const d = documentos.find((x) => x.id === (m.documentoId || (m.documento && m.documento.id)));
            [dataBR(m.data), nomeDe(PD.TIPOS_MANUTENCAO, m.tipo), m.descricao, m.responsavel, m.pecas, dinheiro(m.custo), d ? d.name : '', dataBR(m.proxima), nomeDe(PD.SITUACOES_MANUTENCAO, m.situacao)].forEach((x, i) => tr.append(el('td', i === 5 ? 'num' : null, x || '—')));
            const ac = el('td', 'patrimonio-acoes'); ac.append(bolinha('Editar manutenção', ICO.lapis, () => janelaMan(m, (n) => { manutencoes[k] = { ...n, id: m.id }; manutencoes.sort((a, c) => a.data.localeCompare(c.data)); desenharMan(); })),
              bolinha('Remover manutenção', ICO.lixo, () => U.confirmar('Remover manutenção', 'Remover este registro do histórico? Vale ao salvar o patrimônio.', 'Remover', () => { manutencoes.splice(k, 1); desenharMan(); }, cores)));
            tr.append(ac); tb.append(tr);
          });
          t.append(th, tb); tabMan.append(t);
        }
        function janelaMan(m, aoSalvar) {
          U.dialogo({
            titulo: m ? 'Editar manutenção' : 'Registrar manutenção', ...cores, largo: true, rotuloSalvar: 'Salvar manutenção',
            montar: (f2) => {
              const x = m || {}; const data = entrada('date', x.data || ''); const tipo = seletor(PD.TIPOS_MANUTENCAO, x.tipo || '', 'Selecione'); const desc = area(x.descricao, 2); const quem = texto(x.responsavel); const pc = livre(texto(x.pecas, { maxLength: 200, placeholder: 'Peças trocadas neste serviço' }));
              const custo = dinheiroInput(x.custo); const doc = el('select'); doc.replaceChildren(new Option(documentos.length ? 'Sem documento' : 'Anexe na etapa 2', ''), ...documentos.map((d) => new Option(d.name, d.id))); doc.value = x.documentoId || (x.documento && x.documento.id) || '';
              const prox = entrada('date', x.proxima || ''); const sit = seletor(PD.SITUACOES_MANUTENCAO, x.situacao || 'realizada');
              f2.append(campo('Data *', data), campo('Tipo *', tipo), campo('Descrição do serviço *', desc), campo('Responsável', quem), campo('Peças substituídas', pc), campo('Custo (R$)', custo.no), campo('Documento', doc), campo('Próxima manutenção', prox), campo('Situação', sit));
              return { data, tipo, desc, quem, pc, custo, doc, prox, sit };
            },
            salvar: (c) => {
              if (![c.data, c.prox].every((d) => d.checkValidity())) return 'Confira as datas: use DD/MM/AA.';
              if (!c.data.value) return 'Informe a data da manutenção.'; if (!c.tipo.value) return 'Escolha o tipo da manutenção.'; if (!c.desc.value.trim()) return 'Descreva o serviço.';
              aoSalvar({ id: m ? m.id : S.novoId('man'), data: c.data.value, tipo: c.tipo.value, descricao: c.desc.value.trim(), responsavel: c.quem.value.trim(), pecas: c.pc.value.trim(), custo: c.custo.valor(), documentoId: c.doc.value, proxima: c.prox.value, situacao: c.sit.value });
              return null;
            },
          });
        }
        const inspPossui = U.quadroSituacao('Necessita inspeção periódica?', Boolean(insp.necessita), { textos: ['Sim', 'Não'], aoMudar: () => pintarInsp() });
        const iTipo = texto(insp.tipo, { maxLength: 80, placeholder: 'Ex.: vaso de pressão, extintores, elétrica' }); const iUlt = dt(insp.ultima); const iProx = dt(insp.proxima); const iRes = seletor(PD.RESULTADOS_INSPECAO, insp.resultado || '', 'Selecione'); const iResp = texto(insp.responsavel);
        const iDoc = el('select'); const iObs = area(insp.obs, 2); selecionaveis.push([iDoc, 'inspecao']);
        const inspBox = el('div', 'patrimonio-condicional'); inspBox.append(campo('Tipo de inspeção', iTipo), campo('Última inspeção', iUlt), campo('Próxima inspeção', iProx), campo('Resultado', iRes), campo('Responsável', iResp), campo('Documento comprobatório', iDoc), campo('Observações', iObs));
        function pintarInsp() { mostrar(inspBox, inspPossui.ativo); }
        const baixaCartao = el('div', 'patrimonio-baixa compras-largo');
        const revisao = el('div', 'compras-largo patrimonio-revisao');
        const e6 = el('div', 'compras-etapa');
        e6.append(secao('Manutenção', exige, manBox), secao('Histórico de manutenção', el('div', 'compras-form-rodape compras-largo patrimonio-barra-man'), tabMan),
          secao('Inspeções e conformidade', inspPossui, inspBox), secao('Baixa patrimonial', baixaCartao), secao('Revisão final', revisao));
        e6.querySelector('.patrimonio-barra-man').append(botao('Registrar manutenção', () => janelaMan(null, (n) => { manutencoes.push(n); manutencoes.sort((a, c) => a.data.localeCompare(c.data)); desenharMan(); }), 'btn secondary'));
        baixaCartao.append(el('p', 'profiles-note', v.baixa ? 'Baixado em ' + dataBR(v.baixa.data) + ' (' + nomeDe(PD.MOTIVOS_BAIXA, v.baixa.motivo) + ').' + (v.baixa.observacao ? ' ' + v.baixa.observacao : '') : 'A baixa patrimonial é um processo à parte, com motivo, data e confirmação: use o botão Baixar da lista ou da ficha. Ela não apaga o histórico nem faz baixa contábil.'));

        /* ---------- Leitura, revisão e navegação ---------- */
        function ler() {
          const cap = num(capValor); const l = num(larg); const co = num(comp);
          const prodCat = PD.CATEGORIAS_PRODUCAO.includes(categoria.value); const en = energia.value; const gv = num(gasValor); const pw = num(potW); const kw = num(kwh);
          const al = num(dimAlt); const la = num(dimLarg); const pr = num(dimProf); const pe = num(pesoVal);
          const tecnicas = {}; PD.TECNICAS.forEach(([k]) => { const x = camposTec[k].entrada.value.trim(); if (x) tecnicas[k] = x; });
          const garDoc = gDoc.value; const inspDoc = iDoc.value;
          const dados = {
            id: b ? b.id : undefined, nome: nome.value, categoria: categoria.value, grupoRetId: grupoRet.value.split('|')[0] || '', subgrupoRetId: grupoRet.value.split('|')[1] || '', marca: marca.value.trim(), modelo: modelo.value.trim(), numeroSerie: serie.value.trim(), numeroPatrimonio: numero.value.trim(), valor: valor.valor(), localId: local.value,
            nomeTecnico: nomeTec.value, descricao: descricao.value, tipoBem: tipoBem.value, natureza: natureza.value, situacaoPatrimonial: situacaoP, conservacao: conserv, dataCadastro: dataCad.value, codigoInterno: v.codigoInterno || '', // o campo saiu da tela (19/11/2026); o valor que já existia fica guardado
            unidade: unidade.value, quantidade: inteiro(quantidade), conjunto: conjunto.ativo, observacoes: v.observacoes || '', // as observações antigas ficam guardadas; a descrição detalhada e o áudio as substituem
            usadoNaProducao: prodCat ? usoProd.ativo : Boolean(v.usadoNaProducao), utensiliosIds: prodCat ? (usoProd.ativo && usaUt.ativo ? utensilios : []) : (v.utensiliosIds || []),
            informarEspecificacao: espec.ativo, materiais: materiais.valor(), fichaTecnica: ficha,
            dimensoesFisicas: al != null || la != null || pr != null || pe != null ? { altura: al, largura: la, profundidade: pr, unidade: dimUn.value, peso: pe, pesoUnidade: pesoUn.value } : null,
            imagens, documentos,
            localizacao: { empresa: empresa.value.trim(), cnpj: cnpj.value.trim(), unidade: unidadeLoc.value.trim(), estabelecimento: estab.value.trim(), departamento: departamento.value.trim(), ambiente: ambiente.value.trim(), sala: sala.value.trim(), andar: andar.value.trim(), detalhe: localizacaoDet.value.trim() },
            responsavel: { colaboradorId: respSel.size ? [...respSel.values()][0].colaboradorId : '', nome: respNome.value.trim(), cargo: respCargo.value.trim(), departamento: respDep.value.trim(), dataAtribuicao: respData.value, tipo: respTipo.value },
            movimentacoes: movs, responsaveis: [...respSel.values()],
            tecnicas, capacidade: prodCat ? (usoProd.ativo && cap != null ? { valor: cap, unidade: capUn.value } : null) : (v.capacidade || null), medidas: l != null || co != null ? { largura: l, comprimento: co } : null,
            energia: en, consumoGas: en === 'gas' && gv != null ? { valor: gv, unidade: gasUn.value } : null, potenciaW: en === 'eletrica' ? pw : null,
            consumoHora: en === 'gas' ? (gv != null && gasUn.value === 'kg/h' ? gv : null) : en === 'eletrica' ? kw : null,
            pecas, composto: composto.ativo, vinculados: composto.ativo ? vinculados : [],
            financeiro: { tipoAquisicao: tipoAq.value, dataAquisicao: dAq.value, dataRecebimento: dRec.value, dataOperacao: dOp.value, fornecedorId: fornecedor.value, nf: nf.value.trim(), serieNf: serieNf.value.trim(),
              valorAquisicao: vAq.valor(), frete: frete.valor(), instalacao: instal.valor(), custosAdicionais: custos.valor(), descontos: descontos.valor(), valorTotal: PD.valorTotalAquisicao({ valorAquisicao: vAq.valor(), frete: frete.valor(), instalacao: instal.valor(), custosAdicionais: custos.valor(), descontos: descontos.valor() }), moeda: 'BRL' },
            contabil: { grupo: grupoPat.value.trim(), conta: conta.value.trim(), centroCusto: centroCusto.value.trim(), valorResidual: residual.valor(), vidaUtilMeses: inteiro(vida), inicioDepreciacao: iniDep.value, metodo: metodo.value, valorContabil: vContabil.valor(), obs: obsCont.value.trim() },
            garantia: { possui: garPossui.ativo, inicio: gIni.value, fim: gFim.value, empresa: gEmpresa.value.trim(), contato: gContato.value.trim(), certificado: gCert.value.trim(), condicoes: gCond.value.trim(), documentoId: garDoc },
            seguro: { possui: segPossui.ativo, seguradora: sSeg.value.trim(), apolice: sApolice.value.trim(), valorSegurado: sValor.valor(), inicio: sIni.value, fim: sFim.value, obs: sObs.value.trim() },
            manutencao: { exige: exige.ativo, tipo: tipoMan.value, responsavel: manResp.value.trim(), fornecedorId: manForn.value, custoEstimado: manCusto.valor(), obs: manObs.value.trim() },
            revisao: exige.ativo ? { ultima: manUltima.value, intervaloMeses: manCada.value, proxima: manProxima.value } : null,
            manutencoes, inspecao: { necessita: inspPossui.ativo, tipo: iTipo.value.trim(), ultima: iUlt.value, proxima: iProx.value, resultado: iRes.value, responsavel: iResp.value.trim(), documentoId: inspDoc, obs: iObs.value.trim() },
            baixa: situacaoP === 'baixado' ? (v.baixa || null) : null, audio: v.audio || null,
          };
          if (v.baixa && situacaoP !== 'baixado') dados.baixasAnteriores = [...(v.baixasAnteriores || []), v.baixa];
          return dados;
        }
        const conferir = () => { const regras = R(); return PD.validar(PD.normalizar(ler()), { bens: S.patrimonio.dados.bens, cnpjValid: regras ? regras.cnpjValid : undefined, hoje }); };
        function pintarRevisao() {
          const d = PD.normalizar(ler()); revisao.replaceChildren();
          const nomeFornecedor = (id) => (id ? S.nomeFornecedor(id) : '');
          const t = PD.totaisComponentes(d.pecas); const principal = d.imagens.find((i) => i.principal);
          const grupos = [
            [1, 'Cadastro', [['Identificação', d.nome], ['Nome técnico', d.nomeTecnico], ['Categoria', nomeDe(D.CATEGORIAS, d.categoria)], ['Grupo de patrimônio', (opcRet.find(([k]) => k === (d.grupoRetId ? d.grupoRetId + '|' + (d.subgrupoRetId || '') : '')) || [])[1] || ''], ['Marca', d.marca], ['Modelo', d.modelo], ['Número de série', d.numeroSerie], ['Número de patrimônio', d.numeroPatrimonio], ['Valor', d.valor != null ? dinheiro(d.valor) : '']]],
            [2, 'Imagens e documentos', [['Imagem principal', principal ? principal.name : ''], ['Imagens', d.imagens.length ? String(d.imagens.length) : ''], ['Documentos anexados', d.documentos.length ? String(d.documentos.length) : '']]],
            [3, 'Localização', [['Empresa', d.localizacao.empresa], ['Unidade', d.localizacao.unidade], ['Setor / local', d.localId ? S.nomeLocal(d.localId) : d.localizacao.departamento], ['Responsável', d.responsavel.nome]]],
            [4, 'Composição', [['Especificação técnica', d.informarEspecificacao ? 'Informada' : ''], ['Utilizado na produção', d.usadoNaProducao ? 'Sim' + (d.capacidade ? ' — capacidade ' + CD.numero(d.capacidade.valor) + ' ' + d.capacidade.unidade : '') : ''], ['Utensílios utilizados', d.utensiliosIds.length ? String(d.utensiliosIds.length) : ''], ['Materiais', d.materiais.join(', ')], ['Ficha técnica', d.fichaTecnica ? d.fichaTecnica.name : ''], ['Peças (tipos)', t.tipos ? String(t.tipos) : ''], ['Unidades de peças', t.unidades && t.tipos ? String(t.unidades) : ''], ['Patrimônios vinculados', d.vinculados.length ? String(d.vinculados.length) : '']]],
            [5, 'Financeiro', [['Aquisição', nomeDe(PD.TIPOS_AQUISICAO, d.financeiro.tipoAquisicao)], ['Valor total de aquisição', d.financeiro.valorTotal ? dinheiro(d.financeiro.valorTotal) : ''], ['Fornecedor', nomeFornecedor(d.financeiro.fornecedorId)], ['Garantia', d.garantia.possui ? (d.garantia.fim ? 'até ' + dataBR(d.garantia.fim) : 'sim') : ''], ['Informações contábeis', d.contabil.metodo ? nomeDe(PD.METODOS_DEPRECIACAO, d.contabil.metodo) : '']]],
            [6, 'Controle', [['Manutenção periódica', d.manutencao.exige ? (d.revisao && d.revisao.proxima ? 'próxima em ' + dataBR(d.revisao.proxima) : 'sim') : ''], ['Manutenções no histórico', d.manutencoes.length ? String(d.manutencoes.length) : ''], ['Inspeções', d.inspecao.necessita ? 'periódica' : ''], ['Situação patrimonial', nomeDe(PD.SITUACOES, d.situacaoPatrimonial)]]],
          ];
          grupos.forEach(([n, titulo, linhas]) => {
            const box = el('div', 'patrimonio-revisao-grupo'); const cab = el('div', 'patrimonio-revisao-cab'); cab.append(el('b', null, n + '. ' + titulo), botao('Corrigir', () => ir(n - 1), 'btn secondary'));
            box.append(cab);
            const dl = el('dl', 'profiles-info'); const usadas = linhas.filter(([, x]) => x);
            if (!usadas.length) dl.append(el('dt', null, 'Sem informações preenchidas'), el('dd', null, '—')); usadas.forEach(([k, x]) => dl.append(el('dt', null, k), el('dd', null, String(x))));
            box.append(dl); revisao.append(box);
          });
        }
        /* navegação */
        const quadros = [e1, e2, e3, e4, e5, e6]; let atual = 0;
        const erroEtapa = el('p', 'profiles-error'); erroEtapa.setAttribute('role', 'alert');
        /* Quadro da etapa (padrão da Nova Transferência): o quadro azul fixo no topo diz "Etapa N de 6", o nome da etapa e uma barra de seis
           segmentos; abaixo, a linha "Ir para a etapa" abre a lista das seis. As peças vêm da Transferência (CicluzTransferencias.pecas); o
           contêiner transferencia-contexto dá o escopo transferencia-tela a estas duas peças e as prende juntas ao topo (quadro azul + Ir para a etapa). */
        const { quadro: quadroT, secao: secaoT, linhaQueAbre } = window.CicluzTransferencias.pecas;
        const repetido = dlg.querySelector('.compras-dialog-sub'); if (repetido) repetido.remove(); // o caminho já está no cabeçalho
        const nomes = PD.etapas();
        const rotEtapa = el('span', 'transferencia-valor-rotulo'); const titEtapa = el('span', 'patrimonio-etapa-titulo');
        const segmentos = el('ol', 'patrimonio-etapa-barra'); segmentos.setAttribute('aria-hidden', 'true'); nomes.forEach(() => segmentos.append(el('li')));
        const cabEtapa = el('div', 'transferencia-valor-cab'); cabEtapa.append(rotEtapa, titEtapa, segmentos);
        const irAbre = linhaQueAbre('Ir para a etapa', () => abrirIr(painelIr.hidden));
        const painelIr = el('div', 'transferencia-multi-painel'); painelIr.hidden = true;
        const opcaoIr = el('div', 'transferencia-opcao'); opcaoIr.append(irAbre.no, painelIr);
        function abrirIr(sim) {
          if (sim) painelIr.replaceChildren(quadroT(...nomes.map((nome, i) => {
            const b = el('button', 'transferencia-linha transferencia-linha-acao'); b.type = 'button'; b.disabled = novo && i > atual; if (i === atual) b.setAttribute('aria-current', 'step');
            b.append(el('span', 'transferencia-linha-rotulo', (i + 1) + ' · ' + nome), el('span', 'transferencia-linha-valor', i < atual ? 'Feita' : i === atual ? 'Atual' : ''));
            b.onclick = () => { abrirIr(false); ir(i); };
            return b;
          })));
          painelIr.hidden = !sim; irAbre.abrir(sim);
        }
        dlg.addEventListener('click', (e) => { if (!painelIr.hidden && !opcaoIr.contains(e.target)) abrirIr(false); });
        const ctxEtapa = el('div', 'transferencia-tela transferencia-contexto'); ctxEtapa.append(cabEtapa, secaoT('', quadroT(opcaoIr)));
        const cancelar = botao('Cancelar', () => dlg.close(), 'btn secondary footer-cancel-accent');
        const voltar = botao('Voltar', () => ir(atual - 1), 'btn secondary footer-cancel-accent form-back-action'); voltar.insertAdjacentHTML('beforeend', '<svg class="footer-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>');
        const avancar = botao('Avançar', () => { const falta = conferir()[atual]; if (falta) { erroEtapa.textContent = falta; U.sinalizarObrigatorios(quadros[atual]); return; } ir(atual + 1); }, 'btn form-next-action');
        const salvarFim = el('button', 'btn', 'Salvar'); salvarFim.type = 'submit';
        const nav = el('div', 'compras-form-rodape compras-etapas-nav');
        function ir(i) {
          atual = Math.max(0, Math.min(quadros.length - 1, i));
          quadros.forEach((q, k) => mostrar(q, k === atual));
          if (atual === 5) pintarRevisao();
          rotEtapa.textContent = 'Etapa ' + (atual + 1) + ' de ' + quadros.length; titEtapa.textContent = nomes[atual];
          [...segmentos.children].forEach((s, k) => s.classList.toggle('feito', k <= atual));
          irAbre.resumo.textContent = (atual + 1) + ' de ' + quadros.length; abrirIr(false); erroEtapa.textContent = '';
          const ultima = atual === quadros.length - 1;
          nav.replaceChildren(...[atual > 0 && voltar, cancelar, ultima && salvarFim, !ultima && avancar].filter(Boolean));
          // Troca de etapa recomeça do alto (regra de 17/11/2026).
          if (form.isConnected && cabEtapa.isConnected) cabEtapa.scrollIntoView({ block: 'start' });
        }
        form.append(ctxEtapa, ...quadros, erroEtapa, nav);
        desenharImagens(); desenharDocs(); desenharMovs(); desenharPecas(); desenharMan(); desenharVinc(); pintarComposto(); pintarTecnicas(); pintarEnergia(); pintarEspec(); pintarResp(); desenharUt(); desenharFicha(); pintarProducao(); pintarGarSeg(); pintarMan(); pintarInsp(); pintarSelectsDoc();
        gDoc.value = docAtual.garantia && documentos.some((d) => d.id === docAtual.garantia) ? docAtual.garantia : ''; iDoc.value = docAtual.inspecao && documentos.some((d) => d.id === docAtual.inspecao) ? docAtual.inspecao : '';
        ir(0);
        return { ler, conferir, ir, datas, audio, b };
      },
      salvar: async (c) => {
        if (opcoes.previa) return 'Isto é só uma prévia do formulário: nada é salvo.';
        if (c.audio.gravando()) return 'Pare a gravação do áudio antes de salvar.';
        if (c.datas.some((d) => !d.checkValidity())) return 'Confira as datas: use DD/MM/AA.';
        const dados = c.ler();
        if (opcoes.externo) { dados.statusCadastro = 'recebido'; dados.origem = 'link-teste'; dados.situacaoPatrimonial = 'inativo'; }
        const faltas = c.conferir(); const k = faltas.findIndex(Boolean);
        if (k >= 0) { c.ir(k); return faltas[k]; }
        const falta = SV.conferirBem(dados); if (falta) return falta;
        const som = await c.audio.guardar(); if (som.error) return som.error;
        dados.audio = som.meta;
        const r = SV.salvarBem(dados); if (r.erro) return r.erro;
        if (opcoes.externo) { enviado = true; window.CicluzConviteLink.confirmarRecebimento(cores); return null; }
        U.avisar(opcoes.categoria ? 'Utensílio salvo.' : 'Patrimônio salvo.');
        if (opcoes.aoSalvar) opcoes.aoSalvar(r.id);
        return null;
      },
    });
  }
  window.CicluzProducaoPatrimonioForm = { abrir: (b, opcoes) => abrirFormulario(b, opcoes) };
  // Link de teste (?cadastro-teste=<modelo>): abre só o formulário do modelo, depois que o sistema terminou de carregar.
  if (window.CicluzConviteLink) {
    const abridores = { patrimonio: { pronto: () => true, abrir: () => abrirFormulario(null, { externo: true }) } };
    ['pf-simples', 'pf-completo', 'pj-simples', 'pj-completo'].forEach((id) => {
      abridores[id] = { pronto: () => Boolean(window.CicluzComprasClientes && window.CicluzComprasClientes.abrirExterno), abrir: () => window.CicluzComprasClientes.abrirExterno(window.CicluzComprasClientes.MODELOS_LINK.find((m) => m.id === id).modelo) };
    });
    // Colaboradores (18/11/2026): o Enviar das listas de Cadastro Simples e de Cadastro Completo abre o formulário correspondente.
    abridores['colaborador-simples'] = { pronto: () => Boolean(window.CicluzSimpleForm), abrir: () => { window.CicluzSimpleForm.edit(null); document.dispatchEvent(new Event('cicluz-close-menu')); } };
    abridores['colaborador-completo'] = { pronto: () => Boolean(window.CicluzPeople && window.CicluzPeople.novoCompleto), abrir: () => window.CicluzPeople.novoCompleto() };
    window.CicluzConviteLink.iniciarPeloEndereco(abridores);
  }
})();
