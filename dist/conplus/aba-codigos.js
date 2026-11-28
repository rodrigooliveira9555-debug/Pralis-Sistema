/*
 * Área ConPlus (laboratório) — aba Códigos: as tabelas de-para dos códigos do Questor (cargo, escala, filial, município, evento e
 * banco). A API não converte texto em código: quem mantém a correspondência é o S2. Por enquanto à mão ou por CSV (a ConPlus ainda
 * vai mandar as tabelas). Cargo, escala e filial são de cada empresa (CNPJ); município, evento e banco valem para todas.
 * Guardado em cicluz-conplus-v1.depara. Os códigos aparecem como sugestão nos campos da Admissão e dos Eventos.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI; const L = window.CicluzConplusLayout; const D = window.CicluzConplusDominio; const S = window.CicluzConplusDados; const K = window.CicluzConplusComum;
  if (!U || !L || !D || !S || !K) return;
  const { el, botao } = U;
  let tabela = 'cargo';
  let empresaEventos = '';

  /** Os eventos que a ConPlus configurou no Zen para cada empresa (eventos-conplus.js): só consulta. */
  function tabelaEventosConplus(aoMudar) {
    const EV = window.CicluzConplusEventos; if (!EV) return null;
    if (!empresaEventos) empresaEventos = EV.EMPRESAS[0];
    const itens = EV.EVENTOS.filter((x) => x.empresa === empresaEventos);
    const sec = U.secao('Eventos de cada empresa na ConPlus', itens.length);
    sec.append(K.corpo(U.nota('Como a ConPlus mandou (' + EV.FONTE + '). O lançamento precisa bater no código e na unidade: H = horas, R = referência (dias), V = valor. Só consulta: quem muda é a ConPlus.'),
      U.chips(EV.EMPRESAS.map((x) => [x, x]), empresaEventos, (v) => { empresaEventos = v; aoMudar(); })),
    K.tabela([['Evento', (x) => x.codigo, 'conplus-num'], ['Descrição', (x) => x.descricao], ['Unidade', (x) => x.unidade + ' (' + x.tipo + ')'], ['Natureza', (x) => x.natureza], ['Seq.', (x) => x.sequencia, 'conplus-num'], ['Filial', (x) => x.filial, 'conplus-num']], itens));
    return sec;
  }

  function editar(item, aoSalvar) {
    const T = D.TABELAS[tabela];
    U.dialogo({
      titulo: (item ? 'Editar' : 'Novo') + ' código · ' + T.titulo, cor: K.COR, corTexto: K.COR_TEXTO, classe: 'conplus-dialogo',
      montar: (form) => {
        const de = U.entrada('text', item ? item.de : '', { maxLength: 80 }); de.dataset.textoLivre = '1';
        const para = U.entrada('text', item ? item.para : '', { maxLength: 12, inputMode: 'numeric' }); para.dataset.textoLivre = '1';
        const desc = U.entrada('text', item ? item.descricao : '', { maxLength: 120 }); desc.dataset.textoLivre = '1';
        const cnpj = U.entrada('text', item ? item.cnpj : L.CNPJ_HOMOLOGACAO, { maxLength: 18, inputMode: 'numeric' }); cnpj.dataset.textoLivre = '1';
        form.append(U.campo(T.de + ' *', de), U.campo('Código do Questor (' + T.para + ') *', para, 'Vem da consulta ' + T.consulta + '.'), U.campo('Descrição no Questor', desc));
        if (T.porEmpresa) form.append(U.campo('CNPJ da empresa *', cnpj, 'Este código é de cada empresa.'));
        return { de, para, desc, cnpj };
      },
      salvar: (c) => {
        const novo = { de: c.de.value.trim(), para: c.para.value.trim(), descricao: c.desc.value.trim(), cnpj: T.porEmpresa ? c.cnpj.value.trim() : '' };
        const lista = S.ler().depara[tabela];
        const p = D.problemaDoDepara(tabela, novo, lista, item && item.id); if (p) return p;
        const ok = S.mudar((d) => {
          if (item) d.depara[tabela] = d.depara[tabela].map((x) => (x.id === item.id ? { ...x, ...novo } : x));
          else d.depara[tabela].push({ id: S.novoId('dp'), ...novo });
        });
        if (!ok) return 'Não foi possível salvar. Tente de novo.';
        aoSalvar(); return undefined;
      },
    });
  }

  async function importar(aoSalvar) {
    const T = D.TABELAS[tabela];
    const arq = await K.escolherArquivo('.csv,.txt,text/csv,text/plain'); if (!arq) return;
    const linhas = K.linhasDoCsv(arq.texto);
    if (!linhas) { U.avisar('A leitura de CSV ainda não carregou. Tente de novo.'); return; }
    const r = D.deparaDoCsv(tabela, linhas, L.CNPJ_HOMOLOGACAO);
    const existentes = S.ler().depara[tabela];
    const novos = []; const repetidos = [];
    r.itens.forEach((x) => { if (D.problemaDoDepara(tabela, x, existentes.concat(novos))) repetidos.push(x.de); else novos.push({ id: S.novoId('dp'), ...x }); });
    U.dialogo({
      titulo: 'Importar CSV · ' + T.titulo, cor: K.COR, corTexto: K.COR_TEXTO, classe: 'conplus-dialogo', rotuloSalvar: 'Importar ' + novos.length,
      montar: (form) => {
        form.append(U.nota(arq.nome + ' · ' + arq.codificacao + ' · ' + (linhas.length - 1) + ' linha(s) de dados. Cabeçalho esperado: DE (ou ' + (tabela === 'municipio' ? 'CODIGORAIS' : 'S2') + '), ' + T.para + ' (ou PARA), DESCRIÇÃO' + (T.porEmpresa ? ' e CNPJ (sem ela, vale a empresa do laboratório)' : '') + '.'));
        form.append(el('p', 'conplus-situacao ' + (novos.length ? 'tom-ok' : 'tom-erro'), novos.length + ' código(s) novo(s) para importar' + (repetidos.length ? ' · ' + repetidos.length + ' já existente(s), ignorado(s)' : '') + (r.erros.length ? ' · ' + r.erros.length + ' linha(s) com problema' : '') + '.'));
        if (r.erros.length) { const ul = el('ul', 'conplus-erros tom-erro'); r.erros.slice(0, 30).forEach((e) => ul.append(el('li', null, e))); form.append(ul); }
      },
      salvar: () => {
        if (!novos.length) return 'Nada novo para importar.';
        const ok = S.mudar((d) => { d.depara[tabela] = d.depara[tabela].concat(novos); });
        if (!ok) return 'Não foi possível salvar. Tente de novo.';
        U.avisar(novos.length + ' código(s) importado(s).'); aoSalvar(); return undefined;
      },
    });
  }

  function remover(x, aoSalvar) {
    U.confirmar('Remover o código', 'Remover "' + x.de + '" → ' + x.para + ' da tabela de ' + D.TABELAS[tabela].titulo.toLowerCase() + '?', 'Remover', () => {
      const ok = S.mudar((d) => { d.depara[tabela] = d.depara[tabela].filter((y) => y.id !== x.id); });
      if (!ok) return 'Não foi possível remover. Tente de novo.';
      aoSalvar(); return undefined;
    }, { cor: K.COR, corTexto: K.COR_TEXTO, classe: 'conplus-dialogo-remover' });
  }

  function montar(corpo) {
    const chipsBox = el('div');
    const conteudo = el('div');
    function desenhar() {
      const T = D.TABELAS[tabela];
      const dados = S.ler().depara;
      chipsBox.replaceChildren(U.chips(Object.entries(D.TABELAS).map(([k, t]) => [k, t.titulo + ' (' + dados[k].length + ')']), tabela, (v) => { tabela = v; desenhar(); }));
      const itens = [...dados[tabela]].sort((a, b) => String(a.de).localeCompare(String(b.de), 'pt-BR'));
      const sec = U.secao(T.titulo, itens.length);
      const acoes = el('div', 'conplus-acoes');
      acoes.append(botao('Novo código', () => editar(null, desenhar), 'btn'), botao('Importar CSV', () => importar(desenhar), 'btn secondary'));
      const colunas = [[T.de, (x) => x.de], [T.para, (x) => x.para, 'conplus-num'], ['Descrição no Questor', (x) => x.descricao || '—']];
      if (T.porEmpresa) colunas.push(['CNPJ', (x) => x.cnpj]);
      colunas.push(['', (x) => { const b = el('span', 'conplus-linha-acoes'); b.append(botao('Editar', () => editar(x, desenhar), 'btn ghost'), botao('Remover', () => remover(x, desenhar), 'btn ghost conplus-remover')); return b; }]);
      sec.append(K.corpo(U.nota('De-para para ' + T.para + ' (consulta ' + T.consulta + ' do Questor).' + (T.porEmpresa ? ' O código é de cada empresa.' : ' Vale para todas as empresas.')), acoes),
        K.tabela(colunas, itens, { vazioTexto: 'Nenhum código de ' + T.titulo.toLowerCase() + ' ainda. A ConPlus vai mandar a tabela; enquanto isso, cadastre à mão ou importe um CSV.' }));
      conteudo.replaceChildren(sec, ...(tabela === 'evento' ? [tabelaEventosConplus(desenhar)].filter(Boolean) : []));
    }
    corpo.append(U.nota('A API do Questor não converte texto em código: o S2 guarda a correspondência. Os códigos daqui aparecem como sugestão nos campos de cargo, escala, filial, município, banco e evento.'), chipsBox, conteudo);
    desenhar();
  }

  (window.CicluzConplusAbas = window.CicluzConplusAbas || {}).codigos = { titulo: 'Códigos', montar };
})();
