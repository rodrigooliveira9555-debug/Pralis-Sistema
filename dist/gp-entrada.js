/*
 * Tabela de entrada das telas de Gestão de Pessoas (Simples Colaborador, Completo Colaborador, Cargos C/Salários).
 * Reaproveita os blocos de DES - Fornecedores / VND - Clientes (CicluzComprasUI): seção com botão "Novo", contagem,
 * cabeçalho de colunas recolhíveis, linha com seta e gaveta de ações. Só apresenta: quem abre o cadastro, o que o
 * cadastro grava e as regras continuam sendo as das telas que chamam este componente.
 *
 * criar({ grade, titulo, rotuloNovo, dicaNovo, colunas, preferencia, itens(), aoNovo, vazio, nota, contagem })
 *   itens(): [{ id, nome, icone(path svg), rotuloIcone, celulas: { chave: texto }, estado, aoAbrir, extras: [{ rotulo, caminho, aoClicar }] }]
 *   devolve { no, desenhar() } — no vai dentro de .content da tela; desenhar() relê itens() e refaz a tabela.
 */
(function () {
  'use strict';
  function criar(opcoes) {
    const U = window.CicluzComprasUI;
    const { grade, titulo, rotuloNovo, dicaNovo, colunas, preferencia, itens, aoNovo, vazio, nota, contagem } = opcoes;
    const no = U.el('div', 'gp-entrada');
    function desenhar() {
      const lista = itens();
      const linhas = U.el('div', 'compras-lista compras-lista-grade');
      U.arrastarParaRolar(linhas);
      const ativos = lista.filter((i) => !i.inativo).length;
      const ponta = U.pontaDaLista(ativos, contagem(ativos));
      const sec = U.secao(titulo, undefined, ponta);
      sec.querySelector('.compras-secao-cab h3').replaceChildren(U.botaoTitulo(rotuloNovo, dicaNovo || rotuloNovo, aoNovo));
      sec.append(linhas);
      if (!lista.length) linhas.append(U.vazio(vazio.titulo, vazio.dica || ''));
      else {
        const cab = U.cabecalhoColunas(grade, colunas, { lista: linhas, preferencia });
        linhas.append(cab);
        ponta.append(cab.botaoGeral);
        lista.forEach((i) => linhas.append(linha(i, linhas)));
      }
      // A explicação é a primeira linha do quadro (U.infoDaLista), não um texto solto acima dele.
      U.infoDaLista(sec, nota, preferencia || grade);
      no.replaceChildren(sec);
    }
    function linha(i, linhas) {
      const row = U.linhaLista({
        icones: [{ icone: i.icone, rotulo: i.rotuloIcone || '' }], grade,
        colunas: [{ chave: 'nome', conteudo: U.el('span', 'c-nome-texto', i.nome) }, ...colunas.filter((c) => c.chave !== 'nome' && c.chave !== 'estado').map((c) => ({ chave: c.chave, conteudo: (i.celulas || {})[c.chave] || '' }))],
        estado: i.estado,
        acoes: { rotulo: i.nome, lista: linhas, aoEditar: i.aoAbrir, aoExcluir: () => {} },
      });
      row.classList.add('gp-linha');
      if (i.inativo) row.classList.add('inativo');
      const gaveta = row.querySelector('.account-row-actions');
      // Nestas telas nada é excluído: a lixeira sai e entram as ações que a tabela antiga já tinha.
      const lixeira = [...gaveta.children].find((b) => /^Excluir/.test(b.getAttribute('aria-label') || ''));
      if (lixeira) lixeira.remove();
      (i.extras || []).forEach((x) => {
        const b = U.el('button'); b.type = 'button'; b.title = x.rotulo + ' ' + i.nome; b.setAttribute('aria-label', x.rotulo + ' ' + i.nome);
        b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + x.caminho + '"/></svg>';
        b.onclick = (e) => { e.stopPropagation(); x.aoClicar(); };
        gaveta.append(b);
      });
      row.setAttribute('aria-label', 'Abrir ' + i.nome);
      return row;
    }
    return { no, desenhar };
  }
  window.CicluzGPEntrada = { criar };
})();
