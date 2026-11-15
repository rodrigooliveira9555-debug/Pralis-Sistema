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
  const ORIGENS = {
    mer: { id: 'compras-fornecedores', titulo: 'MER - Fornecedores', caminho: 'Saídas · Mercadorias / Cadastros Geral / MER - Fornecedores', voltar: () => menuBack(3, 'Cadastros Geral')(), cor: U.COR, corTexto: U.COR_TEXTO },
    des: { id: 'despesas-fornecedores', titulo: 'DES - Fornecedores', caminho: 'Saídas · Despesas / Cadastros Geral / DES - Fornecedores', voltar: () => menuBack(2, 'Cadastros Geral')(), cor: '#ef4444', corTexto: '#a11c1c' },
  };
  const telasF = {};
  let origemF = 'mer';
  let buscaF = '';
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
      .filter((f) => U.dobrar([f.nome, f.documento, f.whatsapp, f.contatoNome, S.nomeCategoriaFornecedor(f.categoriaId)].join(' ')).includes(U.dobrar(buscaF)))
      .sort((a, b) => (a.situacao === b.situacao ? a.nome.localeCompare(b.nome, 'pt-BR') : a.situacao === 'ativo' ? -1 : 1));
    const controles = el('div', 'profiles-controls');
    const b = U.buscaFixa('fornecedores-' + origemF, 'Nome, documento, WhatsApp, contato ou categoria', buscaF, (v) => { buscaF = v; renderFornecedores(); });
    controles.append(b);
    // Mesmo padrão do patrimônio (pedido do Rodrigo, 15/11/2026): botão visível de cadastro na tela; o "+" aciona o mesmo cadastro.
    const acoes = el('div', 'compras-form-rodape');
    acoes.append(botao('Cadastrar fornecedor', () => editarFornecedor(), 'btn'), botao('Editar categorias', () => editarCategorias()));
    const semWhats = S.dados.fornecedores.filter((f) => f.situacao === 'ativo' && !D.podeConvidar(f)).length;
    const incompletos = S.dados.fornecedores.filter((f) => f.situacao === 'ativo' && pendencias(f).length).length;
    // Mesma linha dos cadastros de grupos: tocar edita; a setinha revela Editar e Excluir.
    const sec = U.secao('Fornecedores', S.dados.fornecedores.filter((f) => f.situacao === 'ativo').length);
    const linhas = el('div', 'compras-lista');
    sec.append(linhas);
    if (!lista.length) linhas.append(U.vazio(buscaF ? 'Nenhum fornecedor encontrado.' : 'Nenhum fornecedor cadastrado.'));
    lista.forEach((f) => {
      const semDdd = f.situacao === 'ativo' && D.motivoNaoConvidavel(f);
      linhas.append(U.linhaLista({
        icone: 'fornecedor', titulo: f.nome,
        detalhe: [S.nomeCategoriaFornecedor(f.categoriaId), f.documento, f.whatsapp, f.contatoNome].filter(Boolean).join(' · '),
        direita: [
          f.situacao !== 'ativo' ? U.situacao('Inativo', 'neutro') : null,
          f.situacao === 'ativo' && pendencias(f).length ? U.situacao('Completar cadastro', 'atencao') : null,
          semDdd ? U.situacao(f.whatsapp ? 'WhatsApp sem DDD' : 'Sem WhatsApp', 'atencao') : null,
        ].filter(Boolean),
        acoes: { rotulo: f.nome, lista: linhas, aoEditar: () => editarFornecedor(f), aoExcluir: () => excluirFornecedor(f) },
      }));
    });
    tela.body.replaceChildren(
      controles,
      acoes,
      U.nota(lista.length + ' fornecedor(es), os mesmos em Despesas e em Mercadorias. ' + (incompletos ? incompletos + ' ativo(s) com cadastro a completar (toque para editar). ' : '') + (semWhats ? semWhats + ' ativo(s) sem WhatsApp válido não podem receber cotação. ' : '') + 'Fornecedor já usado em cotação, pedido, compra ou peça não é excluído: a lixeira inativa.'),
      sec,
    );
  }
  /** Quantas vezes o id aparece na chave dada, em qualquer nível do dado (cotação, pedido, catálogo, histórico…). */
  function contar(dado, chave, id) {
    if (!dado || typeof dado !== 'object') return 0;
    let n = 0;
    for (const [k, v] of Object.entries(dado)) n += k === chave && v === id ? 1 : contar(v, chave, id);
    return n;
  }
  /** Onde o fornecedor é usado: Compras (catálogo, histórico, cotações, pedidos), peças do patrimônio e compras de uniformes. */
  function usosDoFornecedor(id) {
    const usos = [];
    const compras = contar({ ...S.dados, fornecedores: null }, 'fornecedorId', id);
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
  /** O que falta no cadastro para os obrigatórios de 15/11/2026 (só para avisar na lista; quem já existia continua valendo). */
  function pendencias(f) {
    const p = [];
    if (!f.categoriaId || !S.categoriaFornecedor(f.categoriaId)) p.push('categoria');
    const tipo = D.tipoPessoaDe(f);
    if (!tipo || !(tipo === 'fisica' ? R().cpfValid(f.documento) : R().cnpjValid(f.documento))) p.push('CPF ou CNPJ');
    if (!D.digitos(f.whatsapp)) p.push('WhatsApp');
    return p;
  }
  const R = () => window.CicluzFieldRules;

  function editarFornecedor(f) {
    U.dialogo({
      titulo: f ? 'Editar fornecedor' : 'Novo fornecedor', ...coresF(), largo: true,
      montar: (form) => {
        const sec = (t) => { const s = el('fieldset', 'compras-fieldset'); s.append(el('legend', null, t)); form.append(s); return s; };
        const texto = (v, extra = {}) => entrada('text', v || '', { maxLength: 120, ...extra });
        const email = (v) => { const i = entrada('email', v || '', { maxLength: 160, inputMode: 'email', autocapitalize: 'off' }); i.dataset.textoLivre = '1'; return i; };
        const telefone = (v) => aplicarMascara(entrada('tel', v || '', { inputMode: 'numeric' }), mascaraTelefone);

        // Categoria: só as ativas da lista do Rodrigo, mais a que o fornecedor já tem.
        const cats = S.dados.categoriasFornecedor.filter((c) => c.ativa !== false || c.id === f?.categoriaId).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        const cat = seletor(cats.map((c) => [c.id, c.nome + (c.ativa === false ? ' (inativa)' : '')]), cats.some((c) => c.id === f?.categoriaId) ? f.categoriaId : '', cats.length ? 'Selecione' : 'Cadastre em "Editar categorias"');
        const tipo = seletor(D.TIPOS_PESSOA, f ? D.tipoPessoaDe(f) : '', 'Selecione');
        const nome = texto(f?.nome);
        const contato = texto(f?.contatoNome);
        // Dois campos de documento: o do CPF é tratado pelo field-validation.js (máscara e dígito verificador
        // pelo rótulo); o do CNPJ usa a máscara e o validador de lá. Só o do tipo escolhido aparece.
        const tipoInicial = f ? D.tipoPessoaDe(f) : '';
        const cpf = entrada('text', tipoInicial === 'fisica' ? f.documento || '' : '', { inputMode: 'numeric' });
        const cnpj = aplicarMascara(entrada('text', tipoInicial === 'juridica' ? f.documento || '' : '', { inputMode: 'numeric', placeholder: '00.000.000/0000-00', maxLength: 18 }), R().cnpjMask);
        const cpfCampo = campo('CPF *', cpf);
        const cnpjCampo = campo('CNPJ *', cnpj);
        const semTipo = el('p', 'profiles-note', 'Escolha o tipo de pessoa para informar o CPF ou o CNPJ.');

        const s1 = sec('Identificação');
        s1.append(campo('Categoria *', cat), campo('Tipo de pessoa *', tipo), campo('Nome *', nome), campo('Contato', contato, 'Nome da pessoa de contato no fornecedor.'), cpfCampo, cnpjCampo, semTipo);

        const s2 = sec('Contato do financeiro');
        const finNome = texto(f?.financeiro?.nome);
        const finWhats = telefone(f?.financeiro?.whatsapp);
        const finEmail = email(f?.financeiro?.email);
        s2.append(campo('Nome do financeiro', finNome), campo('WhatsApp do financeiro', finWhats), campo('E-mail do financeiro', finEmail));

        const s3 = sec('Contato do fornecedor');
        const whats = telefone(f?.whatsapp);
        const mail = email(f?.email);
        const nasc = entrada('date', f?.nascimento || '');
        const nascCampo = campo('Data de nascimento', nasc, 'Só para pessoa física.');
        s3.append(campo('WhatsApp *', whats, 'Com DDD: é por ele que o fornecedor recebe o convite de cotação.'), campo('E-mail', mail), nascCampo);

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
        return { cat, tipo, nome, contato, cpf, cnpj, finNome, finWhats, finEmail, whats, mail, nasc, ativo };
      },
      salvar: (c) => {
        const tipoPessoa = c.tipo.value;
        if (tipoPessoa === 'fisica' && !c.nasc.checkValidity()) return 'Confira a data de nascimento: use DD/MM/AA.';
        const campos = {
          id: f?.id, nome: c.nome.value.trim(), tipoPessoa, categoriaId: c.cat.value,
          documento: (tipoPessoa === 'fisica' ? c.cpf.value : tipoPessoa === 'juridica' ? c.cnpj.value : '').trim(),
          contatoNome: c.contato.value.trim(), whatsapp: c.whats.value.trim(), email: c.mail.value.trim(),
          financeiro: { nome: c.finNome.value.trim(), whatsapp: c.finWhats.value.trim(), email: c.finEmail.value.trim() },
          nascimento: tipoPessoa === 'fisica' ? c.nasc.value : '',
          situacao: c.ativo.input.checked ? 'ativo' : 'inativo',
        };
        const msg = D.validarFornecedor(campos, R(), { fornecedores: S.dados.fornecedores, categorias: S.dados.categoriasFornecedor });
        if (msg) return msg;
        delete campos.id;
        const ok = S.transacao((d) => {
          if (f) {
            const x = d.fornecedores.find((y) => y.id === f.id);
            Object.assign(x, campos);
            // A categoria agora é o vínculo categoriaId: o texto livre antigo sai quando o cadastro é salvo de novo.
            delete x.categoria;
          } else d.fornecedores.push({ id: S.novoId('f'), ...campos });
        });
        if (!ok) return 'Não foi possível salvar neste navegador.';
        U.avisar('Fornecedor salvo.');
        renderFornecedores();
      },
    });
  }

  /** Lista de categorias de fornecedor (o Rodrigo cria e edita; o fornecedor só escolhe). Não se exclui: inativa. */
  function editarCategorias() {
    U.dialogo({
      titulo: 'Categorias de fornecedor', ...coresF(),
      montar: (form) => {
        const lista = el('div', 'producao-bloco compras-largo');
        const linhas = [];
        const usados = (id) => S.dados.fornecedores.filter((x) => x.categoriaId === id).length;
        function linha(c = {}) {
          const r = el('fieldset', 'compras-fieldset');
          const nome = entrada('text', c.nome || '', { maxLength: 80, placeholder: 'Ex.: Bebidas, Manutenção, Embalagens' });
          const ativa = interruptor('Categoria ativa', c.ativa !== false, c.id ? usados(c.id) + ' fornecedor(es) nesta categoria.' : 'Categoria nova.');
          const item = { id: c.id || '', nome, ativa };
          linhas.push(item);
          r.append(campo('Categoria', nome), ativa);
          lista.append(r);
          numerar();
          return item;
        }
        const numerar = () => linhas.forEach((x, k) => x.nome.setAttribute('aria-label', 'Categoria ' + (k + 1)));
        [...S.dados.categoriasFornecedor].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).forEach((c) => linha(c));
        const adicionar = el('div', 'compras-form-rodape');
        adicionar.append(botao('Adicionar categoria', () => linha().nome.focus()));
        form.append(U.nota('As categorias aparecem para escolher no cadastro do fornecedor. Categoria inativa some das novas escolhas, mas continua nos fornecedores que já a usam. Linha em branco não é salva.'), lista, adicionar);
        return { linhas };
      },
      salvar: (c) => {
        const preenchidas = c.linhas.map((x) => ({ id: x.id, nome: x.nome.value.trim(), ativa: x.ativa.input.checked })).filter((x) => x.id || x.nome);
        if (preenchidas.some((x) => !x.nome)) return 'Informe o nome de cada categoria (categoria que já existe não pode ficar sem nome).';
        const nomes = preenchidas.map((x) => U.dobrar(x.nome));
        if (new Set(nomes).size !== nomes.length) return 'Há categorias com o mesmo nome.';
        const ok = S.transacao((d) => {
          for (const x of preenchidas) {
            const atual = x.id && d.categoriasFornecedor.find((y) => y.id === x.id);
            if (atual) Object.assign(atual, { nome: x.nome, ativa: x.ativa });
            else d.categoriasFornecedor.push({ id: S.novoId('cf'), nome: x.nome, ativa: x.ativa });
          }
        });
        if (!ok) return 'Não foi possível salvar neste navegador.';
        U.avisar('Categorias salvas.');
        renderFornecedores();
      },
    });
  }

  window.CicluzComprasCadastros = { abrirFornecedores, mascaraTelefone, mascaraDocumento };
})();
