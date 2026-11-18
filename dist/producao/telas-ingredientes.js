/*
 * MER - Ingredientes Ficha Técnica / Tabela TACO (Saídas · Mercadorias → Cadastros Geral Produção) — pedido do Rodrigo, 18/11/2026.
 * Duas coisas na mesma tela:
 *  1) o cadastro de INGREDIENTES, uma lista própria (separada do MER - Produtos, decisão do Rodrigo): nome e, se houver, o código
 *     do alimento na Tabela TACO, que traz a informação nutricional por 100 g;
 *  2) a TABELA TACO para consulta (a oficial do NEPA/UNICAMP já vem no sistema) e a importação de uma tabela em CSV, para atualizar.
 * As regras ficam em producao/taco.js (testadas). Aqui não há cálculo: a tela só mostra o que está na tabela.
 * Guarda: ingredientes em cicluz-producao-v1 (coleção nova "ingredientes"); a tabela importada, se houver, em cicluz-taco-v1.
 * Ainda não ligado à ficha técnica: os ingredientes das fichas continuam sendo os produtos (P-pendente, registrar em PROJECT_BRAIN/11).
 */
(function () {
  'use strict';
  const S = window.CicluzProducaoDados;
  const U = window.CicluzComprasUI;
  const M = window.CicluzProducao;
  const T = window.CicluzTaco;
  if (!S || !U || !M || !T) return;
  const { el, botao, campo, entrada } = U;
  const TITULO = 'MER - Ingredientes Ficha Técnica / Tabela TACO';

  let tela = null; let busca = '';
  /** Tabela em uso: a importada, se existir; senão, a oficial que vem no sistema. */
  function tabelaEmUso() {
    const d = S.taco.dados;
    if (Array.isArray(d.linhas) && d.linhas.length && Array.isArray(d.colunas) && d.colunas.length) return { nome: 'Tabela importada' + (d.nome ? ' (' + d.nome + ')' : ''), importada: true, porcao: '100 g', colunas: d.colunas, linhas: d.linhas };
    return window.CicluzTacoOficial || { nome: 'Tabela TACO não carregada', colunas: [], linhas: [] };
  }
  const itens = () => T.itensDe(tabelaEmUso());
  const ingredientes = () => S.producao.dados.ingredientes;
  const rotuloTaco = (i) => 'TACO ' + i.codigo + ' · ' + i.descricao;

  function abrir() {
    if (!tela) {
      tela = U.criarTela({ id: 'producao-ingredientes', titulo: TITULO, caminho: M.CAMINHO_CAD + TITULO, icone: 'nutricao', voltar: M.voltarCadastros });
      U.atalho(tela, 'Novo ingrediente', 'M12 5v14M5 12h14', () => formulario(), { criar: true });
      const repinta = () => { if (tela.view.classList.contains('show')) render(); };
      document.addEventListener('cicluz-producao-mudou', repinta); document.addEventListener('cicluz-taco-mudou', repinta);
    }
    tela.ativar();
    render();
  }

  function render() {
    const tab = tabelaEmUso(); const todos = itens();
    const lista = ingredientes().filter((x) => U.dobrar(x.nome + ' ' + (x.tacoCodigo == null ? '' : x.tacoCodigo)).includes(U.dobrar(busca)))
      .sort((a, b) => (a.ativo === b.ativo ? a.nome.localeCompare(b.nome, 'pt-BR') : a.ativo === false ? 1 : -1));
    U.buscaRodape(tela, 'Buscar ingrediente', (v) => { busca = v; if (tela.view.classList.contains('show')) render(); });
    const ativos = ingredientes().filter((x) => x.ativo !== false).length;
    const sec = U.secao('Ingredientes', undefined, U.pontaDaLista(ativos, ativos + (ativos === 1 ? ' ingrediente ativo' : ' ingredientes ativos')));
    sec.querySelector('.compras-secao-cab h3').replaceChildren(
      U.botaoTitulo('Novo Ingrediente', 'Cadastrar ingrediente', () => formulario()),
      U.botaoTitulo('Tabela TACO', 'Consultar ou importar a Tabela TACO', () => consultarTabela(), U.ICONES.lista));
    const linhas = el('div', 'compras-lista');
    if (!lista.length) linhas.append(U.vazio(busca ? 'Nenhum ingrediente encontrado.' : 'Nenhum ingrediente cadastrado.', busca ? '' : 'Use "Novo Ingrediente" e ligue cada um ao alimento da Tabela TACO.'));
    lista.forEach((x) => {
      const alimento = x.tacoCodigo == null ? null : T.porCodigo(todos, x.tacoCodigo);
      const kcal = alimento ? T.valorTexto(alimento.valores.kcal, 'kcal') : '';
      const detalhe = x.tacoCodigo == null ? 'Sem vínculo com a Tabela TACO' : alimento ? rotuloTaco(alimento) + (typeof alimento.valores.kcal === 'number' ? ' · ' + kcal + ' por 100 g' : '') : 'Código TACO ' + x.tacoCodigo + ' não existe na tabela em uso';
      const linha = U.linhaLista({ icone: 'nutricao', titulo: x.nome, detalhe, estado: x.ativo === false ? 'Inativo' : 'Ativo',
        acoes: { rotulo: x.nome, lista: linhas, aoEditar: () => formulario(x), aoExcluir: () => excluir(x) } });
      if (x.ativo === false) linha.classList.add('inativo');
      linhas.append(linha);
    });
    sec.append(linhas);
    tela.body.replaceChildren(U.nota('Tabela em uso: ' + tab.nome + ' · ' + tab.linhas.length + ' alimentos · valores por 100 g. Tocar na linha edita o ingrediente; a seta mostra Editar e Excluir.'), sec);
  }

  function excluir(x) {
    U.confirmar('Excluir ingrediente?', '"' + x.nome + '" será excluído. Não dá para desfazer.', 'Excluir', () => {
      if (!S.producao.transacao((d) => { d.ingredientes = d.ingredientes.filter((o) => o.id !== x.id); })) return 'Não foi possível excluir neste navegador.';
      U.avisar('Ingrediente excluído.');
    });
  }

  /** Quadro com os valores de um alimento: [[nome, texto]]. */
  const quadroValores = (pares) => { const dl = el('dl', 'profiles-info compras-largo'); pares.forEach(([k, v]) => dl.append(el('dt', null, k), el('dd', null, v))); return dl; };

  function formulario(ing) {
    U.dialogo({
      titulo: ing ? 'Editar ingrediente' : 'Novo ingrediente', largo: true, classe: 'compras-form-padrao',
      montar: (form) => {
        const todos = itens();
        let codigo = ing && ing.tacoCodigo != null ? ing.tacoCodigo : null;
        const situacao = U.quadroSituacao('Situação do ingrediente', ing ? ing.ativo !== false : true, { dica: 'Ingrediente inativo sai das listas de escolha. Nada é apagado.' });
        situacao.classList.add('compras-largo');
        const nome = entrada('text', ing ? ing.nome : '', { maxLength: 80, required: true });
        const qDados = el('fieldset', 'compras-fieldset compras-largo');
        qDados.append(el('legend', null, 'Dados do ingrediente'), situacao, campo('Nome do ingrediente *', nome));

        // Vínculo com a Tabela TACO: busca por nome ou código, escolhe o alimento, e o quadro mostra a informação nutricional dele.
        const buscaT = entrada('text', '', { maxLength: 60, placeholder: 'Ex: farinha de trigo, ou o código…' }); buscaT.dataset.textoLivre = '1';
        const resultados = el('div', 'compras-lista compras-largo');
        const escolhido = el('div', 'compras-largo');
        const pintarEscolhido = () => {
          const a = codigo == null ? null : T.porCodigo(todos, codigo);
          if (codigo == null) { escolhido.replaceChildren(el('p', 'profiles-note', 'Nenhum alimento ligado. Busque acima e toque no alimento para ligar.')); return; }
          if (!a) { escolhido.replaceChildren(el('p', 'profiles-error', 'O código ' + codigo + ' não existe na tabela em uso. Escolha outro alimento ou tire o vínculo.'), botao('Tirar o vínculo', () => { codigo = null; pintarEscolhido(); }, 'btn secondary')); return; }
          const linhaTirar = el('div', 'compras-form-rodape'); linhaTirar.append(botao('Tirar o vínculo', () => { codigo = null; pintarEscolhido(); }, 'btn secondary'));
          escolhido.replaceChildren(el('span', 'compras-rotulo', 'Alimento ligado · informação nutricional por 100 g'),
            quadroValores([['Código TACO', String(a.codigo)], ['Alimento', a.descricao], ['Grupo', a.grupo], ...T.resumo(a)]), linhaTirar);
        };
        const pintarResultados = () => {
          const t = buscaT.value.trim();
          if (!t) { resultados.replaceChildren(); return; }
          const achados = T.buscar(todos, t, 20);
          resultados.replaceChildren(...(achados.length ? achados.map((a) => U.linhaLista({ icone: 'nutricao', titulo: a.descricao, detalhe: 'Código ' + a.codigo + ' · ' + a.grupo + (typeof a.valores.kcal === 'number' ? ' · ' + T.valorTexto(a.valores.kcal, 'kcal') : ''),
            aoClicar: () => { codigo = a.codigo; buscaT.value = ''; pintarResultados(); pintarEscolhido(); } })) : [U.vazio('Nenhum alimento encontrado na tabela.', 'Tente outra palavra ou o código.')]));
        };
        buscaT.addEventListener('input', pintarResultados);
        buscaT.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); }); // Enter na busca não salva o cadastro
        const qTaco = el('fieldset', 'compras-fieldset compras-largo');
        const campoBusca = campo('Buscar na Tabela TACO (nome ou código)', buscaT); campoBusca.classList.add('compras-largo');
        qTaco.append(el('legend', null, 'Tabela TACO'), el('p', 'profiles-note compras-largo', 'Ligar o ingrediente a um alimento da tabela traz a informação nutricional dele. O vínculo é opcional e pode ser trocado depois.'), campoBusca, resultados, escolhido);
        form.append(qDados, qTaco);
        pintarEscolhido();
        return { nome, situacao, codigo: () => codigo };
      },
      salvar: (c) => {
        const novo = { id: ing ? ing.id : undefined, nome: c.nome.value.trim(), tacoCodigo: c.codigo(), ativo: c.situacao.ativo };
        const falta = T.validarIngrediente(novo, ingredientes(), itens());
        if (falta) return falta;
        const ok = S.producao.transacao((d) => {
          if (ing) Object.assign(d.ingredientes.find((o) => o.id === ing.id), { nome: novo.nome, tacoCodigo: novo.tacoCodigo, ativo: novo.ativo, atualizadoEm: S.agoraIso() });
          else d.ingredientes.push({ id: S.novoId('ing'), nome: novo.nome, tacoCodigo: novo.tacoCodigo, ativo: novo.ativo, criadoEm: S.agoraIso() });
        });
        if (!ok) return 'Não foi possível salvar neste navegador.';
        U.avisar('Ingrediente salvo.');
      },
    });
  }

  /* ---------- Tabela TACO: consulta e importação ---------- */
  function fichaDoAlimento(a, colunas) {
    U.dialogo({ titulo: 'TACO ' + a.codigo, largo: true, classe: 'compras-form-padrao',
      montar: (form) => {
        const q = el('fieldset', 'compras-fieldset compras-largo');
        q.append(el('legend', null, a.descricao), el('p', 'profiles-note compras-largo', a.grupo + ' · valores por 100 g de parte comestível.'), quadroValores(T.completo(a, colunas)));
        form.append(q);
      } });
  }
  function consultarTabela() {
    U.dialogo({ titulo: 'Tabela TACO', largo: true, classe: 'compras-form-padrao',
      montar: (form) => {
        const erro = el('p', 'profiles-error compras-largo'); erro.setAttribute('role', 'alert');
        const buscaT = entrada('text', '', { maxLength: 60, placeholder: 'Ex: arroz integral, ou o código…' }); buscaT.dataset.textoLivre = '1';
        buscaT.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });
        const lista = el('div', 'compras-lista compras-largo'); const info = el('p', 'profiles-note compras-largo');
        const pintar = () => {
          const tab = tabelaEmUso(); const todos = T.itensDe(tab); const achados = T.buscar(todos, buscaT.value, 40);
          info.textContent = 'Tabela em uso: ' + tab.nome + ' · ' + todos.length + ' alimentos · valores por 100 g.' + (buscaT.value.trim() ? ' Mostrando ' + achados.length + ' encontrado(s).' : ' Mostrando os 40 primeiros: busque para achar os outros.');
          lista.replaceChildren(...(achados.length ? achados.map((a) => U.linhaLista({ icone: 'nutricao', titulo: a.descricao, detalhe: 'Código ' + a.codigo + ' · ' + a.grupo, estado: typeof a.valores.kcal === 'number' ? T.valorTexto(a.valores.kcal, 'kcal') : '',
            aoClicar: () => fichaDoAlimento(a, tab.colunas) })) : [U.vazio('Nenhum alimento encontrado.', 'Tente outra palavra ou o código.')]));
          mostrarOficial();
        };
        buscaT.addEventListener('input', pintar);
        // Importação: um CSV com as mesmas colunas do modelo troca a tabela em uso; a oficial continua no sistema e pode voltar.
        const arquivo = entrada('file'); arquivo.accept = '.csv,text/csv'; arquivo.hidden = true;
        arquivo.addEventListener('change', async () => {
          const f = arquivo.files && arquivo.files[0]; arquivo.value = ''; if (!f) return;
          erro.textContent = '';
          const r = T.lerCsv(await f.text(), (window.CicluzTacoOficial || {}).colunas || []);
          if (r.erros.length) { erro.textContent = 'Nada foi importado. ' + r.erros.join(' '); return; }
          U.confirmar('Trocar a tabela em uso?', 'O arquivo "' + f.name + '" tem ' + r.tabela.linhas.length + ' alimentos. Ele passa a ser a tabela em uso neste navegador; a tabela oficial continua guardada e pode voltar.', 'Trocar', () => {
            if (!S.taco.transacao((d) => { d.linhas = r.tabela.linhas; d.colunas = r.tabela.colunas; d.nome = f.name; d.importadaEm = S.agoraIso(); })) return 'Não foi possível guardar a tabela neste navegador.';
            U.avisar('Tabela importada.'); pintar();
          });
        });
        const baixarModelo = () => {
          const blob = new Blob(['﻿' + T.modeloCsv(window.CicluzTacoOficial)], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob);
          const a = el('a'); a.href = url; a.download = 'modelo-tabela-taco.csv'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
        };
        const bOficial = botao('Voltar à tabela oficial', () => U.confirmar('Voltar à tabela oficial?', 'A tabela importada deixa de ser usada e a TACO oficial (NEPA/UNICAMP) volta a valer.', 'Voltar', () => {
          if (!S.taco.transacao((d) => { d.linhas = []; d.colunas = []; d.nome = ''; d.importadaEm = ''; })) return 'Não foi possível trocar neste navegador.';
          U.avisar('Tabela oficial em uso.'); pintar();
        }), 'btn secondary');
        const mostrarOficial = () => { bOficial.style.display = tabelaEmUso().importada ? '' : 'none'; };
        const acoes = el('div', 'compras-form-rodape compras-largo');
        acoes.append(U.botaoTitulo('Importar tabela (CSV)', 'Importar uma tabela em CSV', () => arquivo.click(), U.ICONES.send), botao('Baixar modelo do CSV', baixarModelo, 'btn secondary'), bOficial, arquivo);
        const qBusca = el('fieldset', 'compras-fieldset compras-largo'); const campoBusca = campo('Buscar alimento (nome ou código)', buscaT); campoBusca.classList.add('compras-largo');
        qBusca.append(el('legend', null, 'Consultar'), info, campoBusca, lista);
        const qImp = el('fieldset', 'compras-fieldset compras-largo');
        qImp.append(el('legend', null, 'Atualizar a tabela'), el('p', 'profiles-note compras-largo', 'A Tabela TACO oficial (4ª edição, NEPA/UNICAMP) já vem no sistema. Para usar outra versão, importe um arquivo CSV com as colunas do modelo.'), acoes, erro);
        form.append(qBusca, qImp);
        pintar();
      } });
  }

  M.registrar('ingredientes', abrir);
})();
