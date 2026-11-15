/*
 * Cadastro de Fornecedores, que alimenta Compras (Produtos fica em telas-produto-*.js).
 * É o cadastro único de fornecedor do sistema: abre por Saídas · Mercadorias → Cadastros Geral
 * (MER - Fornecedores) e por Saídas · Despesas → Cadastros Geral (DES - Fornecedores).
 * Espelham /fornecedores e /produtos do S1 (main).
 */
(function () {
  'use strict';
  const D = window.CicluzComprasDominio;
  const S = window.CicluzComprasDados;
  const U = window.CicluzComprasUI;
  const { el, botao, campo, entrada, seletor } = U;

  /* ---------- Máscaras ---------- */
  function mascaraDocumento(v) {
    const d = D.digitos(v).slice(0, 14);
    if (d.length <= 11) return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
  }
  function mascaraTelefone(v) {
    const d = D.digitos(v).slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  }
  const aplicarMascara = (input, fn) => { input.addEventListener('input', () => { input.value = fn(input.value); }); return input; };
  function interruptor(rotulo, marcado, dica) {
    const l = el('label', 'compras-interruptor');
    const c = entrada('checkbox');
    c.checked = Boolean(marcado);
    l.append(c, el('span', null, rotulo));
    if (dica) l.append(el('small', 'profiles-note', dica));
    l.input = c;
    return l;
  }

  /* =====================================================================
   * Fornecedores — cadastro único (decisão do Rodrigo, 15/11/2026). As linhas DES - Fornecedores
   * (Saídas · Despesas) e MER - Fornecedores (Saídas · Mercadorias) abrem este mesmo cadastro, cada
   * uma na cor e com o Voltar do menu de onde veio. Os dados são os de cicluz-compras-v1.fornecedores.
   * ===================================================================== */
  // Cor das origens: a mesma fonte dos cartões do menu (groupConfig, de groups.js), com o padrão de cada origem.
  const corOrigem = (chave, padrao) => { try { return (typeof groupConfig !== 'undefined' && groupConfig[chave] && groupConfig[chave].color) || padrao; } catch (e) { return padrao; } };
  const corMercadorias = () => corOrigem('mercadorias', U.COR);
  const corDespesas = () => corOrigem('despesas', '#ef4444');
  const ORIGENS = {
    mer: { id: 'compras-fornecedores', titulo: 'MER - Fornecedores', caminho: 'Saídas · Mercadorias / Cadastros Geral / MER - Fornecedores', voltar: () => menuBack(3, 'Cadastros Geral')(), get cor() { return corMercadorias(); }, corTexto: U.COR_TEXTO },
    des: { id: 'despesas-fornecedores', titulo: 'DES - Fornecedores', caminho: 'Saídas · Despesas / Cadastros Geral / DES - Fornecedores', voltar: () => menuBack(2, 'Cadastros Geral')(), get cor() { return corDespesas(); }, corTexto: '#a11c1c' },
  };
  /**
   * Ícones da linha pela categoria, iguais nos dois caminhos de entrada (decisão do Rodrigo, 15/11/2026):
   * o desenho é o próprio ícone da linha do menu (o bonequinho de fornecedor), lido de onde o menu lê (iconeLinha,
   * em index.html), para acompanhar se o ícone do menu for trocado. Produto = ícone de MER - Fornecedores em verde
   * (cor de Mercadorias); Serviço = ícone de DES - Fornecedores em vermelho (cor de Despesas); os dois = dois ícones
   * lado a lado; sem categoria = o mesmo ícone em cinza. O nome da categoria também vai escrito na linha.
   */
  function iconeDoMenu(grupo, linha) {
    try {
      const desenho = typeof iconeLinha !== 'undefined' && iconeLinha[grupo] && iconeLinha[grupo][linha];
      if (typeof desenho === 'function') return { html: '<svg viewBox="0 0 24 24" aria-hidden="true">' + desenho() + '</svg>' };
    } catch (e) { /* menu ainda não carregado */ }
    return { icone: 'fornecedor' };
  }
  function iconesDaCategoria(f) {
    const cats = Array.isArray(f.categorias) ? f.categorias : [];
    const mer = iconeDoMenu('3:Cadastros Geral', 'MER - Fornecedores');
    const des = iconeDoMenu('2:Cadastros Geral', 'DES - Fornecedores');
    const r = [];
    if (cats.includes('produto')) r.push({ ...mer, cor: corMercadorias(), rotulo: 'Produto' });
    if (cats.includes('servico')) r.push({ ...des, cor: corDespesas(), rotulo: 'Serviço' });
    return r.length ? r : [{ ...mer, cor: 'var(--navigation-ink, #a2a0aa)', rotulo: 'Sem categoria' }];
  }
  const telasF = {};
  let origemF = 'mer';
  const buscaF = { mer: '', des: '' };
  const coresF = () => ({ cor: ORIGENS[origemF].cor, corTexto: ORIGENS[origemF].corTexto });
  function abrirFornecedores(origem = 'mer') {
    origemF = ORIGENS[origem] ? origem : 'mer';
    const o = ORIGENS[origemF];
    if (!telasF[origemF]) {
      const t = U.criarTela({ id: o.id, titulo: o.titulo, caminho: o.caminho, icone: 'fornecedor', voltar: o.voltar, cor: o.cor, corTexto: o.corTexto });
      U.atalho(t, 'Novo fornecedor', 'M12 5v14M5 12h14', () => editarFornecedor(), { criar: true });
      telasF[origemF] = t;
    }
    telasF[origemF].ativar();
    renderFornecedores();
  }
  function renderFornecedores() {
    const tela = telasF[origemF];
    const lista = S.dados.fornecedores
      .filter((f) => U.dobrar([f.nome, f.razaoSocial, f.documento, f.whatsapp, f.contatoNome, f.ramo, D.nomeCategoriasFornecedor(f)].join(' ')).includes(U.dobrar(buscaF[origemF])))
      // Organizada pela categoria (pedido do Rodrigo): Produto, Produto e Serviço, Serviço e, por último, sem categoria;
      // dentro de cada uma, os ativos antes dos inativos e, entre eles, por nome.
      .sort((a, b) => ordemCategoria(a) - ordemCategoria(b) || (a.situacao === b.situacao ? 0 : a.situacao === 'ativo' ? -1 : 1) || a.nome.localeCompare(b.nome, 'pt-BR'));
    // Busca pela lupa do rodapé (um caminho só para buscar). O cadastro novo é a bolinha "+" do cabeçalho da lista.
    const origem = origemF;
    const busca = U.buscaRodape(tela, 'Buscar fornecedor', (v) => { buscaF[origem] = v; if (origemF === origem && tela.view.classList.contains('show')) renderFornecedores(); });
    const semWhats = S.dados.fornecedores.filter((f) => f.situacao === 'ativo' && !D.podeConvidar(f)).length;
    const incompletos = S.dados.fornecedores.filter((f) => f.situacao === 'ativo' && pendencias(f).length).length;
    // Mesma linha dos cadastros de grupos: tocar edita; a setinha revela Editar e Excluir.
    // Linha fina, uma por fornecedor, em colunas fixas (grade-fornecedor, em compras.css). Sequência final do Rodrigo:
    // ícone da categoria, Fornecedor (nome fantasia), Categoria, Nome do contato, WhatsApp, Razão social, CNPJ,
    // Ramo, avisos, situação e seta. O ícone e o Fornecedor são fixos (nunca ocultam e ficam parados na rolagem); cada
    // uma das outras colunas tem no título a setinha que a oculta ou mostra (preferência do aparelho); o que não couber
    // rola para o lado dentro da lista.
    const linhas = el('div', 'compras-lista compras-lista-grade');
    U.arrastarParaRolar(linhas);
    // Cabeçalho branco da lista (desenho final do Rodrigo): à esquerda, o botão retangular "Fornecedores" com o "+", que abre
    // o cadastro; na outra ponta, a quantidade num círculo e a bolinha "‹ ›" de ocultar ou mostrar todas as colunas.
    const ativos = S.dados.fornecedores.filter((f) => f.situacao === 'ativo').length;
    const ponta = U.pontaDaLista(ativos, ativos + (ativos === 1 ? ' fornecedor ativo' : ' fornecedores ativos'));
    const sec = U.secao('Fornecedores', undefined, ponta);
    sec.querySelector('.compras-secao-cab h3').replaceChildren(U.botaoTitulo('Fornecedores', 'Cadastrar fornecedor', () => editarFornecedor()));
    sec.append(linhas);
    if (!lista.length) linhas.append(U.vazio(buscaF[origemF] ? 'Nenhum fornecedor encontrado.' : 'Nenhum fornecedor cadastrado.'));
    if (lista.length) {
      const cabecalho = U.cabecalhoColunas('grade-fornecedor', [
      { chave: 'nome', rotulo: 'Fornecedor' }, { chave: 'categoria', rotulo: 'Categoria', ocultavel: true },
      { chave: 'contato', rotulo: 'Nome do contato', ocultavel: true }, { chave: 'whatsapp', rotulo: 'WhatsApp', ocultavel: true },
      { chave: 'razao', rotulo: 'Razão social', ocultavel: true }, { chave: 'documento', rotulo: 'CNPJ', ocultavel: true },
      { chave: 'ramo', rotulo: 'Ramo', ocultavel: true }, { chave: 'selos', rotulo: 'Avisos', ocultavel: true }, { chave: 'estado', rotulo: 'Situação' },
      ], { lista: linhas, preferencia: 'cicluz-fornecedores-colunas' });
      linhas.append(cabecalho);
      ponta.append(cabecalho.botaoGeral);
    }
    lista.forEach((f) => {
      const ativo = f.situacao === 'ativo';
      const categoria = D.nomeCategoriasFornecedor(f);
      const falta = pendencias(f).filter((p) => p !== 'categoria');
      const semDdd = ativo && D.motivoNaoConvidavel(f);
      linhas.append(U.linhaLista({
        icones: iconesDaCategoria(f), grade: 'grade-fornecedor',
        colunas: [
          // nome = nome fantasia: é o nome de uso, o mesmo que cotação e pedido mostram.
          { chave: 'nome', conteudo: f.nome },
          // Sem categoria: o aviso ocupa o lugar do texto da categoria (por isso o ícone está cinza).
          { chave: 'categoria', conteudo: categoria || U.situacao('Completar cadastro', 'atencao') },
          { chave: 'contato', conteudo: f.contatoNome },
          { chave: 'whatsapp', conteudo: f.whatsapp },
          { chave: 'razao', conteudo: f.razaoSocial },
          { chave: 'documento', conteudo: f.documento },
          { chave: 'ramo', conteudo: f.ramo },
          { chave: 'selos', conteudo: [
            ativo && categoria && falta.length ? U.situacao('Completar cadastro', 'atencao') : null,
            semDdd ? U.situacao(f.whatsapp ? 'WhatsApp sem DDD' : 'Sem WhatsApp', 'atencao') : null,
          ] },
        ],
        estado: ativo ? 'Ativo' : 'Inativo',
        acoes: { rotulo: f.nome, lista: linhas, aoEditar: () => editarFornecedor(f), aoExcluir: () => excluirFornecedor(f) },
      }));
    });
    tela.body.replaceChildren(
      busca,
      U.nota(lista.length + ' fornecedor(es), os mesmos em Despesas e em Mercadorias. ' + (incompletos ? incompletos + ' ativo(s) com cadastro a completar (toque para editar). ' : '') + (semWhats ? semWhats + ' ativo(s) sem WhatsApp válido não podem receber cotação. ' : '') + 'Fornecedor já usado em cotação, pedido, compra ou peça não é excluído: a lixeira inativa.'),
      sec,
    );
  }
  const contar = D.contarVinculos;
  /** Onde o fornecedor é usado: Compras (catálogo, histórico, cotações, pedidos), peças do patrimônio e compras de uniformes. */
  function usosDoFornecedor(id) {
    const usos = [];
    const compras = D.vinculosComProdutos(S.dados, id);
    if (compras) usos.push(compras + ' registro(s) do Compras (catálogo, histórico, cotação ou pedido)');
    const bens = window.CicluzProducaoDados ? window.CicluzProducaoDados.patrimonio.dados.bens : [];
    const pecas = contar(bens, 'fornecedorId', id);
    if (pecas) usos.push(pecas + ' peça(s) do patrimônio');
    let uniformes = 0;
    try { uniformes = contar(JSON.parse(localStorage.getItem('cicluz-uniformes-v1') || 'null'), 'supplierId', id); } catch (e) { /* sem compras de uniformes */ }
    if (uniformes) usos.push(uniformes + ' compra(s) de uniformes');
    return usos;
  }
  /**
   * Lixeira da linha. Fornecedor com vínculo não é excluído (regra do Compras): a lixeira oferece inativar, e se já
   * está inativo só explica. Sem vínculo nenhum, exclui depois de confirmar.
   */
  function excluirFornecedor(f) {
    const usos = usosDoFornecedor(f.id);
    if (!usos.length) {
      return U.confirmar('Excluir fornecedor', 'Excluir "' + f.nome + '"? Ele não tem cotação, pedido, compra nem peça vinculada. Não dá para desfazer.', 'Excluir', () => {
        if (usosDoFornecedor(f.id).length) return 'Este fornecedor passou a ter vínculos. Inative em vez de excluir.';
        if (!S.transacao((d) => { d.fornecedores = d.fornecedores.filter((x) => x.id !== f.id); })) return 'Não foi possível salvar neste navegador.';
        U.avisar('Fornecedor excluído.');
        renderFornecedores();
      }, coresF());
    }
    const onde = 'Usado em: ' + usos.join('; ') + '.';
    if (f.situacao !== 'ativo') {
      return U.dialogo({ titulo: 'Fornecedor não pode ser excluído', ...coresF(), montar: (form) => { form.append(el('p', null, '"' + f.nome + '" já está inativo e não pode ser excluído, para o histórico não ficar sem fornecedor. ' + onde)); } });
    }
    U.confirmar('Inativar fornecedor', '"' + f.nome + '" não pode ser excluído, para o histórico não ficar sem fornecedor. ' + onde + ' Inativar? Ele deixa de aparecer para novas cotações e peças.', 'Inativar', () => {
      if (!S.transacao((d) => { d.fornecedores.find((x) => x.id === f.id).situacao = 'inativo'; })) return 'Não foi possível salvar neste navegador.';
      U.avisar('Fornecedor inativado.');
      renderFornecedores();
    }, coresF());
  }
  /** Posição do fornecedor na lista pela categoria: Produto, Produto e Serviço, Serviço, sem categoria. */
  function ordemCategoria(f) {
    const c = Array.isArray(f.categorias) ? f.categorias : [];
    const p = c.includes('produto'); const s = c.includes('servico');
    return p && s ? 1 : p ? 0 : s ? 2 : 3;
  }
  /** O que falta no cadastro para os obrigatórios de 15/11/2026 (só para avisar na lista; quem já existia continua valendo). */
  function pendencias(f) {
    const p = [];
    if (!D.nomeCategoriasFornecedor(f)) p.push('categoria');
    // Cadastro antigo com CPF (de quando existia pessoa física) também cai aqui: fica em "Completar cadastro" até receber o CNPJ.
    if (!R().cnpjValid(f.documento)) p.push('CNPJ');
    if (!D.digitos(f.whatsapp)) p.push('WhatsApp');
    return p;
  }
  const R = () => window.CicluzFieldRules;

  /**
   * Cadastro em 4 etapas, com a barra de etapas única do sistema (CicluzStepper, a mesma do Cadastro Completo):
   * 1) Dados da empresa (CNPJ primeiro, que busca razão social, nome fantasia e endereço; endereço começando pelo CEP),
   * 2) Dados do vendedor (ou do prestador, pela categoria), 3) Dados do financeiro, 4) Dados do representante.
   * O nome da etapa é o mesmo na barra, no título do quadro e nos rótulos dos campos.
   * No cadastro novo, Avançar confere a etapa antes de seguir; na edição, toca-se direto em qualquer etapa. O ✓ do
   * rodapé (e o Salvar da última etapa) confere tudo e, se faltar algo, leva à etapa onde está o problema.
   */
  function editarFornecedor(f) {
    U.dialogo({
      titulo: f ? 'Editar fornecedor' : 'Cadastro fornecedor', ...coresF(), largo: true, classe: 'compras-form-padrao',
      montar: (form) => {
        const texto = (v, extra = {}) => entrada('text', v || '', { maxLength: 120, ...extra });
        const email = (v) => { const i = entrada('email', v || '', { maxLength: 160, inputMode: 'email', autocapitalize: 'off' }); i.dataset.textoLivre = '1'; return i; };
        const telefone = (v) => aplicarMascara(entrada('tel', v || '', { inputMode: 'numeric', placeholder: '(00) 00000-0000' }), mascaraTelefone);
        // display, não hidden: o .compras-campo e o fieldset definem display e venceriam o atributo.
        const mostrar = (no, sim) => { no.style.display = sim ? '' : 'none'; };

        /* ----- Etapa 1: dados da empresa ----- */
        const s1 = el('fieldset', 'compras-fieldset');
        s1.append(el('legend', null, 'Dados da empresa'));
        const catBox = el('div', 'compras-campo compras-largo');
        // Categoria em cartões (desenho escolhido pelo Rodrigo): o mesmo ícone e a mesma cor da lista, por categoria
        // (Produto = MER - Fornecedores em verde; Serviço = DES - Fornecedores em vermelho), seja qual for a tela de entrada.
        const desenhoCat = {
          produto: { ...iconeDoMenu('3:Cadastros Geral', 'MER - Fornecedores'), cor: corMercadorias(), detalhe: 'Vende mercadorias' },
          servico: { ...iconeDoMenu('2:Cadastros Geral', 'DES - Fornecedores'), cor: corDespesas(), detalhe: 'Presta serviços' },
        };
        const catOpcoes = U.cartoesEscolha({
          rotulo: 'Categoria',
          opcoes: D.CATEGORIAS_FORNECEDOR.map(([id, nomeCat]) => ({ id, titulo: nomeCat, ...desenhoCat[id], marcado: Array.isArray(f?.categorias) && f.categorias.includes(id) })),
          aoMudar: () => { barra.update(etapas(), atual); pintarVendedor(); },
        });
        catBox.append(el('span', 'compras-rotulo', 'Categoria *'), catOpcoes, el('small', 'profiles-note', 'Toque em uma ou nas duas.'));
        // Fornecedor é sempre por CNPJ. Razão social e Nome fantasia; o campo salvo de uso é sempre "nome" (o que
        // cotação, pedido e recebimento mostram); a razão social é um campo a mais.
        const razao = texto(f?.razaoSocial, { maxLength: 160 });
        const razaoCampo = campo('Razão social', razao);
        const nome = texto(f?.nome);
        const nomeCampo = campo('Nome fantasia', nome);
        // Cadastro antigo com CPF: o CNPJ abre vazio e um aviso mostra o documento que está gravado.
        const docAntigo = D.documentoAntigoFornecedor(f);
        const cnpj = aplicarMascara(entrada('text', docAntigo ? '' : f?.documento || '', { inputMode: 'numeric', placeholder: '00.000.000/0000-00', maxLength: 18 }), R().cnpjMask);
        const cnpjCampo = campo('CNPJ *', cnpj);
        const avisoAntigo = el('p', 'profiles-note compras-largo', docAntigo
          ? 'Este cadastro é antigo e tem outro documento gravado: ' + (D.digitos(docAntigo).length === 11 ? 'CPF ' : '') + docAntigo + '. Fornecedor agora é só por CNPJ: informe o CNPJ para salvar. O documento antigo continua guardado.' : '');
        const regime = seletor(D.REGIMES_TRIBUTARIOS, f?.regimeTributario || '', 'Selecione');
        const regimeCampo = campo('Regime tributário', regime);
        const ramo = texto(f?.ramo, { maxLength: 80, placeholder: 'Ex.: Bebidas, Manutenção' });
        const situacao = U.quadroSituacao('Situação do fornecedor', f ? f.situacao === 'ativo' : true, { dica: 'Fornecedor inativo não aparece no seletor de cotação.' });
        // Ordem do Rodrigo: categoria, CNPJ (que puxa os dados), razão social, nome fantasia, regime tributário; depois o endereço; por último ramo e o quadro Situação do fornecedor.
        const avisoCnpj = el('p', 'profiles-note compras-largo');
        avisoCnpj.setAttribute('role', 'status');
        s1.append(catBox, cnpjCampo, ...(docAntigo ? [avisoAntigo] : []), avisoCnpj, razaoCampo, nomeCampo, regimeCampo);

        /* Endereço: CEP primeiro (puxa rua, bairro, cidade e UF); número e complemento são digitados. */
        const sEnd = el('fieldset', 'compras-fieldset');
        sEnd.append(el('legend', null, 'Endereço'));
        const C = window.CicluzConsultas;
        const cep = aplicarMascara(entrada('text', f?.endereco?.cep || '', { inputMode: 'numeric', placeholder: '00000-000', maxLength: 9 }), C.cepMask);
        const rua = texto(f?.endereco?.logradouro, { maxLength: 160 });
        const numero = texto(f?.endereco?.numero, { maxLength: 20 });
        const complemento = texto(f?.endereco?.complemento, { maxLength: 80 });
        const bairro = texto(f?.endereco?.bairro, { maxLength: 80 });
        const cidade = texto(f?.endereco?.cidade, { maxLength: 80 });
        const uf = seletor(C.UFS, f?.endereco?.uf || '', 'UF');
        const avisoCep = el('p', 'profiles-note compras-largo');
        avisoCep.setAttribute('role', 'status');
        sEnd.append(campo('CEP', cep), campo('Rua / logradouro', rua), campo('Número', numero), campo('Complemento', complemento), campo('Bairro', bairro), campo('Cidade', cidade), campo('UF', uf), avisoCep);

        const sResto = el('fieldset', 'compras-fieldset');
        sResto.append(campo('Ramo', ramo));
        const etapa1 = el('div', 'compras-etapa');
        etapa1.append(s1, sEnd, sResto, situacao);

        /* Buscas (consultas-publicas.js): nunca trocam o que a pessoa digitou; se o serviço falhar, avisam discretamente
           e o cadastro segue à mão. Cada número é consultado uma vez. Um campo é "livre" para a consulta quando está
           vazio ou quando ainda tem exatamente o valor que uma consulta anterior pôs (a pessoa não mexeu): assim, ao
           trocar o CEP ou o CNPJ, o resultado novo substitui o da consulta anterior em bloco (não sobra a UF antiga). */
        const daConsulta = new Map();
        const livre = (c) => !c.value.trim() || daConsulta.get(c) === c.value;
        const completar = (pares) => {
          const feitos = []; const limpos = [];
          pares.forEach(([campoAlvo, valor, nomeCampoAlvo]) => {
            if (!livre(campoAlvo)) return;
            const antes = campoAlvo.value;
            campoAlvo.value = valor || '';
            if (campoAlvo.value) daConsulta.set(campoAlvo, campoAlvo.value); else daConsulta.delete(campoAlvo);
            if (campoAlvo.value !== antes) (campoAlvo.value ? feitos : limpos).push(nomeCampoAlvo);
          });
          return { feitos, limpos };
        };
        const resumo = (r) => (r.limpos.length ? ' Esvaziado, por ser da consulta anterior: ' + r.limpos.join(', ') + '.' : '');
        const FALHA = { 'nao-encontrado': 'não encontrado', indisponivel: 'consulta indisponível agora' };
        let cepConsultado = D.digitos(cep.value);
        async function buscarCep() {
          const n = D.digitos(cep.value);
          if (n.length !== 8 || n === cepConsultado) return;
          cepConsultado = n;
          avisoCep.textContent = 'Buscando o endereço do CEP…';
          const r = await C.cep(n);
          if (D.digitos(cep.value) !== n) return;
          if (r.erro) { avisoCep.textContent = 'CEP ' + FALHA[r.erro] + ': preencha o endereço à mão.'; return; }
          const e = r.dados;
          // Rua, bairro, cidade e UF vão juntos; número e complemento não vêm do CEP e só são esvaziados se eram da consulta anterior.
          const r2 = completar([[rua, e.logradouro, 'rua'], [bairro, e.bairro, 'bairro'], [cidade, e.cidade, 'cidade'], [uf, e.uf, 'UF'], [numero, '', 'número'], [complemento, '', 'complemento']]);
          avisoCep.textContent = (r2.feitos.length ? 'Preenchido pelo CEP: ' + r2.feitos.join(', ') + '. Confira e informe o número.' : 'Endereço do CEP conferido; nada foi trocado.') + resumo(r2);
        }
        cep.addEventListener('input', buscarCep);
        let cnpjConsultado = D.digitos(cnpj.value);
        async function buscarCnpj() {
          const n = D.digitos(cnpj.value);
          if (n.length !== 14 || n === cnpjConsultado || !R().cnpjValid(n)) return;
          cnpjConsultado = n;
          avisoCnpj.textContent = 'Buscando os dados da empresa pelo CNPJ…';
          const r = await C.cnpj(n);
          if (D.digitos(cnpj.value) !== n) return;
          if (r.erro) { avisoCnpj.textContent = 'CNPJ ' + FALHA[r.erro] + ': preencha os dados à mão.'; return; }
          const x = r.dados;
          const e = x.endereco;
          const r2 = completar([[razao, x.razaoSocial, 'razão social'], [nome, x.nomeFantasia, 'nome fantasia'], [cep, e.cep, 'CEP'], [rua, e.logradouro, 'rua'],
            [numero, e.numero, 'número'], [complemento, e.complemento, 'complemento'], [bairro, e.bairro, 'bairro'], [cidade, e.cidade, 'cidade'], [uf, e.uf, 'UF']]);
          cepConsultado = D.digitos(cep.value);
          avisoCnpj.textContent = (r2.feitos.length ? 'Preenchido pela consulta do CNPJ: ' + r2.feitos.join(', ') + '. Confira antes de salvar.' : 'Dados do CNPJ conferidos; nada foi trocado.') + resumo(r2);
        }
        cnpj.addEventListener('input', buscarCnpj);

        /* ----- Etapa 2: vendedor ou prestador de serviço (é o contato do fornecedor; o WhatsApp dele recebe a cotação) ----- */
        const s2 = el('fieldset', 'compras-fieldset');
        const vNome = texto(f?.contatoNome);
        // Aniversário: só mês e ano (MM/AAAA), pela fonte única de datas (date-fields.js). A data completa antiga fica no dado.
        const DF = window.CicluzDateFields;
        const vAniv = aplicarMascara(entrada('text', DF.monthDisplay(D.aniversarioVendedor(f)), { inputMode: 'numeric', placeholder: 'MM/AAAA', maxLength: 7, autocomplete: 'off' }), DF.monthMask);
        const whats = telefone(f?.whatsapp);
        const mail = email(f?.email);
        // O CPF do vendedor não é mais pedido (decisão do Rodrigo): o campo saiu; valor já gravado fica como está, sem uso.
        const tituloS2 = el('legend');
        const camposS2 = [[campo('Nome', vNome), vNome, 'Nome do ', ''], [campo('WhatsApp', whats), whats, 'WhatsApp do ', ' *'], [campo('E-mail', mail), mail, 'E-mail do ', '']];
        s2.append(tituloS2, camposS2[0][0], camposS2[1][0], campo('Aniversário', vAniv), camposS2[2][0]);
        // Título e rótulos acompanham a categoria: "vendedor", "prestador" ou "vendedor / prestador".
        const pintarVendedor = () => {
          const quem = D.quemVendeFornecedor(marcadas());
          tituloS2.textContent = 'Dados do ' + quem;
          camposS2.forEach(([no, input, antes, depois]) => {
            no.querySelector('.compras-rotulo').textContent = antes + quem + depois;
            input.setAttribute('aria-label', antes + quem + depois);
          });
        };

        /* ----- Etapas 3 e 4: contato com a opção "O mesmo da etapa anterior" em primeiro lugar. Marcada, os campos
           continuam à vista, preenchidos com a etapa anterior e só para leitura; a cópia acompanha a etapa anterior
           enquanto a opção estiver marcada. Desmarcada, o que foi copiado fica e volta a ser editável. ----- */
        function etapaContato(dados, sufixo, anterior) {
          const s = el('fieldset', 'compras-fieldset');
          s.append(el('legend', null, 'Dados do ' + sufixo));
          const mesmo = interruptor('O mesmo da etapa anterior', Boolean(dados?.mesmo), 'Preenche o nome, o WhatsApp e o e-mail com os da etapa anterior.');
          mesmo.classList.add('compras-largo');
          mesmo.input.setAttribute('aria-label', 'O mesmo da etapa anterior (' + sufixo + ')');
          const n = texto(dados?.nome);
          const w = telefone(dados?.whatsapp);
          const m = email(dados?.email);
          const campos = [campo('Nome do ' + sufixo, n), campo('WhatsApp do ' + sufixo, w), campo('E-mail do ' + sufixo, m)];
          const pintar = () => {
            const copia = mesmo.input.checked;
            if (copia) { const a = anterior(); n.value = a.nome; w.value = a.whatsapp; m.value = a.email; }
            [n, w, m].forEach((i) => { i.readOnly = copia; });
          };
          mesmo.input.onchange = pintar;
          s.append(mesmo, ...campos);
          return { no: s, mesmo: mesmo.input, nome: n, whatsapp: w, email: m, pintar };
        }
        const valores = (c) => ({ nome: c.nome.value.trim(), whatsapp: c.whatsapp.value.trim(), email: c.email.value.trim() });
        const fin = etapaContato(f?.financeiro, 'financeiro', () => ({ nome: vNome.value.trim(), whatsapp: whats.value.trim(), email: mail.value.trim() }));
        const rep = etapaContato(f?.representante, 'representante', () => valores(fin));
        // A cópia segue a ordem das etapas: primeiro o financeiro (copia o vendedor), depois o representante (copia o financeiro).
        const pintarCopias = () => { fin.pintar(); rep.pintar(); };
        // Cargo na empresa: não é copiado; com "O mesmo da etapa anterior" marcado, é o único campo a preencher na etapa.
        const repCargo = seletor(D.CARGOS_REPRESENTANTE, f?.representante?.cargo || '', 'Selecione');
        rep.no.append(campo('Cargo na empresa', repCargo));

        /* ----- Barra de etapas e navegação ----- */
        const quadros = [etapa1, s2, fin.no, rep.no];
        const marcadas = () => catOpcoes.marcados();
        const etapas = () => D.etapasFornecedor(marcadas()).map((label) => ({ label }));
        let atual = 0;
        const erroEtapa = el('p', 'profiles-error');
        erroEtapa.setAttribute('role', 'alert');
        // Rodapé do formulário no padrão: Voltar sem cor (contorno, como o Cancelar), Avançar e Salvar na cor do menu,
        // todos com a mesma largura (o layout-review.js iguala os botões destas classes dentro do mesmo grupo).
        const voltar = botao('Voltar', () => ir(atual - 1), 'btn secondary footer-cancel-accent form-back-action');
        voltar.insertAdjacentHTML('beforeend', '<svg class="footer-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>');
        const avancar = botao('Avançar', () => {
          const falta = D.validarFornecedorEtapas(ler(), R(), { fornecedores: S.dados.fornecedores })[atual];
          if (falta) { erroEtapa.textContent = falta; return; }
          ir(atual + 1);
        }, 'btn form-next-action');
        const salvarFim = el('button', 'btn', 'Salvar');
        salvarFim.type = 'submit';
        const nav = el('div', 'compras-form-rodape compras-etapas-nav');
        nav.append(voltar, avancar, salvarFim);
        // No cadastro novo só se volta pela barra (para a frente, pelo Avançar, que confere a etapa); na edição, qualquer etapa.
        const barra = window.CicluzStepper.create({ steps: etapas(), current: 0, label: 'Etapas do cadastro do fornecedor', onSelect: (i) => { if (f || i <= atual) ir(i); } });
        function ir(i) {
          atual = Math.max(0, Math.min(quadros.length - 1, i));
          pintarCopias();
          quadros.forEach((q, k) => mostrar(q, k === atual));
          barra.update(etapas(), atual);
          erroEtapa.textContent = '';
          // Os botões entram e saem da barra (o formato padrão dos botões de rodapé força a exibição mesmo com hidden):
          // Voltar a partir da 2ª etapa, Avançar até a penúltima; Salvar em todas na edição e só na última no cadastro novo.
          const ultima = atual === quadros.length - 1;
          nav.replaceChildren(...[atual > 0 && voltar, !ultima && avancar, (f || ultima) && salvarFim].filter(Boolean));
          const foco = quadros[atual].querySelector('input:not([type=checkbox]):not([readonly]),select');
          if (foco && form.isConnected) foco.focus();
        }
        pintarVendedor();

        /** Lê o formulário no formato salvo. "O mesmo da etapa anterior" copia os dados da etapa de antes. */
        function ler() {
          const razaoSocial = razao.value.trim();
          pintarCopias();
          const vendedor = { nome: vNome.value.trim(), whatsapp: whats.value.trim(), email: mail.value.trim() };
          const contato = (c) => ({ mesmo: c.mesmo.checked, ...valores(c) });
          return {
            // tipoPessoa continua gravado (sempre 'juridica') para quem lê o dado; o documento antigo (CPF) não se perde.
            id: f?.id, categorias: marcadas(), tipoPessoa: 'juridica', ...(docAntigo ? { documentoAnterior: docAntigo } : {}),
            // Sem nome fantasia, a razão social vira o nome de uso.
            nome: nome.value.trim() || razaoSocial, razaoSocial,
            documento: cnpj.value.trim(),
            regimeTributario: regime.value, ramo: ramo.value.trim(),
            endereco: { cep: cep.value.trim(), logradouro: rua.value.trim(), numero: numero.value.trim(), complemento: complemento.value.trim(), bairro: bairro.value.trim(), cidade: cidade.value.trim(), uf: uf.value },
            contatoNome: vendedor.nome, whatsapp: vendedor.whatsapp, email: vendedor.email,
            // Texto incompleto segue como está para a validação recusar (não vira vazio em silêncio).
            vendedorAniversario: DF.monthParse(vAniv.value) || vAniv.value.trim(),
            financeiro: contato(fin), representante: { ...contato(rep), cargo: repCargo.value },
            situacao: situacao.ativo ? 'ativo' : 'inativo',
          };
        }
        form.append(barra.el, ...quadros, erroEtapa, nav);
        ir(0);
        return { ler, ir };
      },
      salvar: (c) => {
        const campos = c.ler();
        const faltas = D.validarFornecedorEtapas(campos, R(), { fornecedores: S.dados.fornecedores });
        const etapaComFalta = faltas.findIndex(Boolean);
        if (etapaComFalta >= 0) { c.ir(etapaComFalta); return faltas[etapaComFalta]; }
        delete campos.id;
        const ok = S.transacao((d) => {
          if (f) Object.assign(d.fornecedores.find((y) => y.id === f.id), campos);
          else d.fornecedores.push({ id: S.novoId('f'), ...campos });
        });
        if (!ok) return 'Não foi possível salvar neste navegador.';
        U.avisar('Fornecedor salvo.');
        renderFornecedores();
      },
    });
  }

  window.CicluzComprasCadastros = { abrirFornecedores, mascaraTelefone, mascaraDocumento };
})();
