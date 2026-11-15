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
      .filter((f) => U.dobrar([f.nome, f.documento, f.whatsapp, f.contatoNome, f.ramo, D.nomeCategoriasFornecedor(f)].join(' ')).includes(U.dobrar(buscaF[origemF])))
      // Organizada pela categoria (pedido do Rodrigo): Produto, Produto e Serviço, Serviço e, por último, sem categoria;
      // dentro de cada uma, os ativos antes dos inativos e, entre eles, por nome.
      .sort((a, b) => ordemCategoria(a) - ordemCategoria(b) || (a.situacao === b.situacao ? 0 : a.situacao === 'ativo' ? -1 : 1) || a.nome.localeCompare(b.nome, 'pt-BR'));
    // Busca pela lupa do rodapé (um caminho só para buscar); no topo fica só o botão de cadastro (pedido do Rodrigo).
    const origem = origemF;
    const busca = U.buscaRodape(tela, 'Buscar fornecedor', (v) => { buscaF[origem] = v; if (origemF === origem && tela.view.classList.contains('show')) renderFornecedores(); });
    const acoes = el('div', 'compras-form-rodape');
    acoes.append(botao('Cadastrar fornecedor', () => editarFornecedor(), 'btn'));
    const semWhats = S.dados.fornecedores.filter((f) => f.situacao === 'ativo' && !D.podeConvidar(f)).length;
    const incompletos = S.dados.fornecedores.filter((f) => f.situacao === 'ativo' && pendencias(f).length).length;
    // Mesma linha dos cadastros de grupos: tocar edita; a setinha revela Editar e Excluir.
    // Linha fina, uma por fornecedor. O botão do cabeçalho expande ou recolhe as colunas (preferência do aparelho):
    // recolhida = Categoria, Fornecedor e Situação; expandida = todas, com rolagem lateral dentro da lista.
    const linhas = el('div', 'compras-lista compras-lista-grade');
    const colunas = U.botaoColunas('cicluz-fornecedores-colunas', (expandida) => {
      linhas.classList.toggle('colunas-expandidas', expandida);
      linhas.classList.toggle('colunas-recolhidas', !expandida);
      if (!expandida) linhas.scrollLeft = 0;
    });
    U.arrastarParaRolar(linhas);
    const sec = U.secao('Fornecedores', S.dados.fornecedores.filter((f) => f.situacao === 'ativo').length, colunas);
    sec.append(linhas);
    if (!lista.length) linhas.append(U.vazio(buscaF[origemF] ? 'Nenhum fornecedor encontrado.' : 'Nenhum fornecedor cadastrado.'));
    // Ordem da linha (pedido do Rodrigo): ícone da categoria e o nome dela, depois o nome do fornecedor e os outros dados,
    // em colunas fixas (grade-fornecedor, em compras.css) para CNPJ, WhatsApp e ramo caírem sempre na mesma vertical.
    if (lista.length) linhas.append(U.cabecalhoColunas('grade-fornecedor', [
      { chave: 'categoria', rotulo: 'Categoria' }, { chave: 'nome', rotulo: 'Fornecedor' }, { chave: 'documento', rotulo: 'CPF / CNPJ' },
      { chave: 'whatsapp', rotulo: 'WhatsApp' }, { chave: 'ramo', rotulo: 'Ramo' }, { chave: 'email', rotulo: 'E-mail' },
      { chave: 'financeiro', rotulo: 'Contato do financeiro' }, { chave: 'selos', rotulo: 'Avisos' }, { chave: 'estado', rotulo: 'Situação' },
    ]));
    lista.forEach((f) => {
      const ativo = f.situacao === 'ativo';
      const categoria = D.nomeCategoriasFornecedor(f);
      const falta = pendencias(f).filter((p) => p !== 'categoria');
      const semDdd = ativo && D.motivoNaoConvidavel(f);
      linhas.append(U.linhaLista({
        icones: iconesDaCategoria(f), grade: 'grade-fornecedor',
        colunas: [
          // Sem categoria: o aviso ocupa o lugar do texto da categoria (por isso o ícone está cinza).
          { chave: 'categoria', conteudo: categoria || U.situacao('Completar cadastro', 'atencao') },
          { chave: 'nome', conteudo: f.nome },
          { chave: 'documento', conteudo: f.documento },
          { chave: 'whatsapp', conteudo: f.whatsapp },
          { chave: 'ramo', conteudo: f.ramo },
          { chave: 'email', conteudo: f.email },
          { chave: 'financeiro', conteudo: [f.financeiro?.nome, f.financeiro?.whatsapp].filter(Boolean).join(' · ') },
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
      acoes,
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
    const tipo = D.tipoPessoaDe(f);
    if (!tipo || !(tipo === 'fisica' ? R().cpfValid(f.documento) : R().cnpjValid(f.documento))) p.push('CPF ou CNPJ');
    if (!D.digitos(f.whatsapp)) p.push('WhatsApp');
    return p;
  }
  const R = () => window.CicluzFieldRules;

  function editarFornecedor(f) {
    U.dialogo({
      titulo: f ? 'Editar fornecedor' : 'Novo fornecedor', ...coresF(), largo: true, classe: 'compras-form-padrao',
      montar: (form) => {
        const sec = (t) => { const s = el('fieldset', 'compras-fieldset'); s.append(el('legend', null, t)); form.append(s); return s; };
        const texto = (v, extra = {}) => entrada('text', v || '', { maxLength: 120, ...extra });
        const email = (v) => { const i = entrada('email', v || '', { maxLength: 160, inputMode: 'email', autocapitalize: 'off' }); i.dataset.textoLivre = '1'; return i; };
        const telefone = (v) => aplicarMascara(entrada('tel', v || '', { inputMode: 'numeric', placeholder: '(00) 00000-0000' }), mascaraTelefone);

        // Categoria: Produto, Serviço ou os dois (caixas de marcar; pelo menos uma). Fornecedor antigo vem sem nenhuma.
        const catBox = el('div', 'compras-campo compras-largo');
        catBox.setAttribute('role', 'group');
        catBox.setAttribute('aria-label', 'Categoria');
        const catOpcoes = el('div', 'compras-form-rodape');
        const cats = D.CATEGORIAS_FORNECEDOR.map(([id, nomeCat]) => {
          const l = interruptor(nomeCat, Array.isArray(f?.categorias) && f.categorias.includes(id));
          l.input.setAttribute('aria-label', nomeCat);
          catOpcoes.append(l);
          return { id, input: l.input };
        });
        catBox.append(el('span', 'compras-rotulo', 'Categoria * (pode marcar as duas)'), catOpcoes);
        const ramo = texto(f?.ramo, { maxLength: 80, placeholder: 'Ex.: Bebidas, Manutenção' });
        const tipo = seletor(D.TIPOS_PESSOA, f ? D.tipoPessoaDe(f) : '', 'Selecione');
        const nome = texto(f?.nome);
        const contato = texto(f?.contatoNome, { placeholder: 'Nome da pessoa de contato' });
        // Dois campos de documento: o do CPF é tratado pelo field-validation.js (máscara e dígito verificador
        // pelo rótulo); o do CNPJ usa a máscara e o validador de lá. Só o do tipo escolhido aparece.
        const tipoInicial = f ? D.tipoPessoaDe(f) : '';
        const cpf = entrada('text', tipoInicial === 'fisica' ? f.documento || '' : '', { inputMode: 'numeric' });
        const cnpj = aplicarMascara(entrada('text', tipoInicial === 'juridica' ? f.documento || '' : '', { inputMode: 'numeric', placeholder: '00.000.000/0000-00', maxLength: 18 }), R().cnpjMask);
        const cpfCampo = campo('CPF *', cpf);
        const cnpjCampo = campo('CNPJ *', cnpj);
        const semTipo = el('p', 'profiles-note', 'Escolha o tipo de pessoa para informar o CPF ou o CNPJ.');

        const s1 = sec('Identificação');
        s1.append(catBox, campo('Tipo de pessoa *', tipo), campo('Nome *', nome), campo('Contato', contato), cpfCampo, cnpjCampo, semTipo,
          campo('Ramo', ramo));

        const s2 = sec('Contato do financeiro');
        const finNome = texto(f?.financeiro?.nome);
        const finWhats = telefone(f?.financeiro?.whatsapp);
        const finEmail = email(f?.financeiro?.email);
        s2.append(campo('Nome do financeiro', finNome), campo('WhatsApp do financeiro', finWhats), campo('E-mail do financeiro', finEmail));

        const s3 = sec('Contato do fornecedor');
        const whats = telefone(f?.whatsapp);
        const mail = email(f?.email);
        const nasc = entrada('date', f?.nascimento || '');
        const nascCampo = campo('Data de nascimento', nasc);
        s3.append(campo('WhatsApp *', whats), campo('E-mail', mail), nascCampo);

        const ativo = interruptor('Fornecedor ativo', f ? f.situacao === 'ativo' : true, 'Fornecedor inativo não aparece no seletor de cotação.');
        form.append(ativo);

        const mostra = () => {
          // display, não hidden: o .compras-campo define display e venceria o atributo.
          const mostrar = (no, sim) => { no.style.display = sim ? '' : 'none'; };
          mostrar(cpfCampo, tipo.value === 'fisica');
          mostrar(cnpjCampo, tipo.value === 'juridica');
          mostrar(semTipo, !tipo.value);
          mostrar(nascCampo, tipo.value === 'fisica');
        };
        tipo.onchange = mostra;
        mostra();
        return { cats, ramo, tipo, nome, contato, cpf, cnpj, finNome, finWhats, finEmail, whats, mail, nasc, ativo };
      },
      salvar: (c) => {
        const tipoPessoa = c.tipo.value;
        if (tipoPessoa === 'fisica' && !c.nasc.checkValidity()) return 'Confira a data de nascimento: use DD/MM/AA.';
        const campos = {
          id: f?.id, nome: c.nome.value.trim(), tipoPessoa, categorias: c.cats.filter((x) => x.input.checked).map((x) => x.id), ramo: c.ramo.value.trim(),
          documento: (tipoPessoa === 'fisica' ? c.cpf.value : tipoPessoa === 'juridica' ? c.cnpj.value : '').trim(),
          contatoNome: c.contato.value.trim(), whatsapp: c.whats.value.trim(), email: c.mail.value.trim(),
          financeiro: { nome: c.finNome.value.trim(), whatsapp: c.finWhats.value.trim(), email: c.finEmail.value.trim() },
          nascimento: tipoPessoa === 'fisica' ? c.nasc.value : '',
          situacao: c.ativo.input.checked ? 'ativo' : 'inativo',
        };
        const msg = D.validarFornecedor(campos, R(), { fornecedores: S.dados.fornecedores });
        if (msg) return msg;
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
