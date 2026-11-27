/*
 * RET - Tipos de Patrimônio (Saídas · Retiradas → Cadastros Geral) — pedido do Washington, 27/11/2026.
 * Cadastro dos tipos que aparecem no campo "Tipo" do Cadastro Simples de RET - Patrimônios (Notebook, Computador, Celular…).
 * Lista no mesmo desenho dos outros cadastros de apoio (busca no rodapé, "Novo Tipo", linha com seta para Editar e Excluir) e janela
 * com a situação (chave Ativo/Inativo) e o nome. O bem guarda só o id do tipo: renomear não mexe nos bens; tipo em uso não se
 * apaga (inative). Inativo some das escolhas novas e continua aparecendo no bem que já o tinha.
 * Regras do nome em PD.validarTipo (testadas); gravação em SV.salvarTipoDoBem / SV.excluirTipoDoBem (coleção "tipos" de cicluz-patrimonio-v1).
 */
(function () {
  'use strict';
  const S = window.CicluzProducaoDados;
  const SV = window.CicluzProducaoServico;
  const U = window.CicluzComprasUI;
  const M = window.CicluzProducao;
  if (!S || !SV || !U || !M) return;
  const { el, campo, entrada } = U;
  const TITULO = 'RET - Tipos de Patrimônio';
  const cores = { cor: M.COR_RET, corTexto: M.COR_RET_TEXTO };

  let tela = null; let busca = '';
  function abrir() {
    if (!tela) {
      tela = U.criarTela({ id: 'producao-tipos-patrimonio', titulo: TITULO, caminho: 'Saídas · Retiradas / Cadastros Geral / ' + TITULO, icone: 'patrimonio', voltar: M.voltarPatrimonio, ...cores });
      U.atalho(tela, 'Novo tipo de patrimônio', 'M12 5v14M5 12h14', () => formulario(), { criar: true });
      document.addEventListener('cicluz-patrimonio-mudou', () => { if (tela.view.classList.contains('show')) render(); });
    }
    tela.ativar();
    render();
  }

  function render() {
    const todos = SV.todosOsTipos();
    const lista = todos.filter((x) => U.dobrar(x.nome).includes(U.dobrar(busca)))
      .sort((a, b) => (a.ativo === b.ativo ? a.nome.localeCompare(b.nome, 'pt-BR') : a.ativo === false ? 1 : -1));
    U.buscaRodape(tela, 'Buscar tipo de patrimônio', (v) => { busca = v; if (tela.view.classList.contains('show')) render(); });
    const ativos = todos.filter((x) => x.ativo !== false).length;
    const sec = U.secao('Tipos de Patrimônio', undefined, U.pontaDaLista(ativos, ativos + (ativos === 1 ? ' tipo ativo' : ' tipos ativos')));
    sec.querySelector('.compras-secao-cab h3').replaceChildren(U.botaoTitulo('Novo Tipo', 'Cadastrar tipo de patrimônio', () => formulario()));
    const linhas = el('div', 'compras-lista');
    if (!lista.length) linhas.append(U.vazio(busca ? 'Nenhum tipo encontrado.' : 'Nenhum tipo de patrimônio cadastrado.', busca ? '' : 'Use "Novo Tipo" para cadastrar: por exemplo, Notebook, Computador ou Celular.'));
    lista.forEach((x) => {
      const q = SV.usosDoTipo(x.id);
      const linha = U.linhaLista({ icone: 'patrimonio', titulo: x.nome, detalhe: q === 0 ? 'Nenhum patrimônio com este tipo' : q === 1 ? '1 patrimônio com este tipo' : q + ' patrimônios com este tipo', estado: x.ativo === false ? 'Inativo' : 'Ativo',
        acoes: { rotulo: x.nome, lista: linhas, aoEditar: () => formulario(x), aoExcluir: () => excluir(x) } });
      if (x.ativo === false) linha.classList.add('inativo');
      linhas.append(linha);
    });
    sec.append(linhas);
    tela.body.replaceChildren(U.nota('Os tipos daqui aparecem no campo "Tipo" do Cadastro Simples de RET - Patrimônios. Tocar na linha edita o tipo; a seta mostra Editar e Excluir.'), sec);
  }

  function excluir(x) {
    U.confirmar('Excluir tipo de patrimônio?', '"' + x.nome + '" será excluído. Não dá para desfazer.', 'Excluir', () => {
      const r = SV.excluirTipoDoBem(x.id);
      if (r.erro) return r.erro;
      U.avisar('Tipo excluído.');
    });
  }

  function formulario(tipo) {
    U.dialogo({
      titulo: tipo ? 'Editar tipo de patrimônio' : 'Novo tipo de patrimônio', largo: true, classe: 'compras-form-padrao', ...cores,
      montar: (form) => {
        const situacao = U.quadroSituacao('Situação do tipo', tipo ? tipo.ativo !== false : true, { dica: 'Tipo inativo sai das escolhas novas. Os patrimônios que já o têm continuam como estão.' });
        situacao.classList.add('compras-largo');
        const nome = entrada('text', tipo ? tipo.nome : '', { maxLength: 60, required: true, placeholder: 'Ex.: Notebook' });
        const q = el('fieldset', 'compras-fieldset compras-largo');
        q.append(el('legend', null, 'Dados do tipo'), situacao, campo('Nome do tipo *', nome));
        form.append(q);
        return { nome, situacao };
      },
      salvar: (c) => {
        const r = SV.salvarTipoDoBem({ id: tipo ? tipo.id : undefined, nome: c.nome.value, ativo: c.situacao.ativo });
        if (r.erro) return r.erro;
        U.avisar('Tipo salvo.');
      },
    });
  }

  M.registrar('tipos-patrimonio', abrir);
})();
