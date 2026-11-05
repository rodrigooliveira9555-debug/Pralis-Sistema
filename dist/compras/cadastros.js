/*
 * Cadastro de Fornecedores, que alimenta Compras (Produtos fica em telas-produto-*.js).
 * Ficam em Cadastros → Diretor de Operações (área de cadastros do S2).
 * Espelham /fornecedores e /produtos do S1 (main).
 */
(function () {
  'use strict';
  const D = window.CicluzComprasDominio;
  const S = window.CicluzComprasDados;
  const U = window.CicluzComprasUI;
  const { el, botao, campo, entrada, seletor } = U;
  const voltarCadastros = () => openSection(sections[7][0], 'Diretor de Operações', 'assets', '#7c3aed');
  const CAMINHO = 'Cadastros / Diretor de Operações / ';

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
   * Fornecedores
   * ===================================================================== */
  let telaF = null;
  let buscaF = '';
  function abrirFornecedores() {
    if (!telaF) {
      telaF = U.criarTela({ id: 'compras-fornecedores', titulo: 'Fornecedores', caminho: CAMINHO + 'Fornecedores', icone: 'fornecedor', voltar: voltarCadastros });
      U.atalho(telaF, 'Novo fornecedor', 'M12 5v14M5 12h14', () => editarFornecedor(), { criar: true });
    }
    telaF.ativar();
    renderFornecedores();
  }
  function renderFornecedores() {
    const lista = S.dados.fornecedores
      .filter((f) => U.dobrar([f.nome, f.documento, f.whatsapp, f.categoria].join(' ')).includes(U.dobrar(buscaF)))
      .sort((a, b) => (a.situacao === b.situacao ? a.nome.localeCompare(b.nome, 'pt-BR') : a.situacao === 'ativo' ? -1 : 1));
    const controles = el('div', 'profiles-controls');
    const b = U.busca('Nome, documento, WhatsApp ou categoria', (v) => { buscaF = v; renderFornecedores(); setTimeout(() => telaF.body.querySelector('.compras-busca')?.focus(), 0); });
    b.value = buscaF;
    controles.append(b);
    const semWhats = S.dados.fornecedores.filter((f) => f.situacao === 'ativo' && !D.podeConvidar(f)).length;
    const tab = U.tabela([
      ['Nome', (f) => { const s = el('span'); s.append(el('b', null, f.nome)); if (f.situacao !== 'ativo') s.append(' ', U.situacao('Inativo', 'neutro')); return s; }],
      ['Documento', (f) => f.documento || '—'],
      ['WhatsApp', (f) => { const m = D.motivoNaoConvidavel(f); return f.situacao === 'ativo' && m ? U.situacao(f.whatsapp ? f.whatsapp + ' · sem DDD' : 'Sem WhatsApp', 'atencao') : f.whatsapp || '—'; }],
      ['Categoria', (f) => f.categoria || '—'],
    ], lista, { aoClicar: editarFornecedor, vazioTexto: buscaF ? 'Nenhum fornecedor encontrado.' : 'Nenhum fornecedor cadastrado.', classeLinha: (f) => (f.situacao !== 'ativo' ? 'inativo' : '') });
    telaF.body.replaceChildren(
      controles,
      U.nota(lista.length + ' fornecedor(es). ' + (semWhats ? semWhats + ' ativo(s) sem WhatsApp válido não podem receber cotação. ' : '') + 'Fornecedor não é excluído: inative quando deixar de atender.'),
      tab,
    );
  }
  function editarFornecedor(f) {
    U.dialogo({
      titulo: f ? 'Editar fornecedor' : 'Novo fornecedor',
      montar: (form) => {
        const nome = entrada('text', f?.nome || '', { required: true, maxLength: 120 });
        const doc = aplicarMascara(entrada('text', f?.documento || '', { inputMode: 'numeric' }), mascaraDocumento);
        const whats = aplicarMascara(entrada('tel', f?.whatsapp || '', { inputMode: 'numeric' }), mascaraTelefone);
        const cat = entrada('text', f?.categoria || '', { maxLength: 80 });
        const ativo = interruptor('Fornecedor ativo', f ? f.situacao === 'ativo' : true, 'Fornecedor inativo não aparece no seletor de cotação.');
        form.append(
          campo('Nome *', nome),
          // Sem a palavra "CPF" no rótulo: o field-validation.js do S2 trata como CPF (11 dígitos) todo campo
          // cujo rótulo a contém, o que impedia digitar CNPJ. A máscara deste campo formata os dois.
          campo('Documento', doc, 'Pessoa física ou jurídica: 11 ou 14 dígitos.'),
          campo('WhatsApp', whats, 'Opcional no cadastro; obrigatório só para convidar o fornecedor para uma cotação.'),
          campo('Categoria', cat, 'Ex.: Bebidas, Laticínios, Embalagens.'),
          ativo,
        );
        return { nome, doc, whats, cat, ativo };
      },
      salvar: (c) => {
        const nome = c.nome.value.trim();
        if (!nome) return 'Informe o nome do fornecedor.';
        const dig = D.digitos(c.whats.value);
        if (dig && (dig.length < 8 || c.whats.value.length > 30)) return 'WhatsApp inválido.';
        const docDig = D.digitos(c.doc.value);
        if (docDig && docDig.length !== 11 && docDig.length !== 14) return 'O documento deve ter 11 dígitos (pessoa física) ou 14 (pessoa jurídica).';
        if (S.dados.fornecedores.some((x) => x.id !== f?.id && U.dobrar(x.nome) === U.dobrar(nome))) return 'Já existe um fornecedor com este nome.';
        const campos = { nome, documento: c.doc.value.trim(), whatsapp: c.whats.value.trim(), categoria: c.cat.value.trim(), situacao: c.ativo.input.checked ? 'ativo' : 'inativo' };
        const ok = S.transacao((d) => {
          if (f) Object.assign(d.fornecedores.find((x) => x.id === f.id), campos);
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
