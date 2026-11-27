/*
 * Área ConPlus (laboratório) — peças de tela usadas por mais de uma aba: o campo de uma coluna do layout, a conferência
 * (erros e avisos com linha e coluna), a prévia do arquivo e o download em Windows-1252.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI; const L = window.CicluzConplusLayout; const D = window.CicluzConplusDominio; const S = window.CicluzConplusDados;
  if (!U || !L || !D || !S) return;
  const { el, botao } = U;
  const COR = '#ef4444';
  const COR_TEXTO = '#9c1c1c';

  /** Opções do de-para para a lista de sugestões de uma coluna (código do Questor + descrição). */
  function sugestoes(tabela) {
    if (!tabela) return null;
    const itens = S.ler().depara[tabela] || [];
    if (!itens.length) return null;
    const dl = el('datalist'); dl.id = 'conplus-dl-' + tabela + '-' + Math.random().toString(36).slice(2, 8);
    itens.forEach((x) => { const o = el('option'); o.value = x.para; o.label = [x.de, x.descricao].filter(Boolean).join(' · '); dl.append(o); });
    return dl;
  }

  /**
   * O campo de uma coluna: "N · Nome *", o nome no Questor e o valor do modelo como dica; fixas e derivadas só leitura.
   * O aria-label é "Registro X, coluna N" de propósito: o field-validation.js aplicaria máscara de moeda a um rótulo com "salário".
   */
  function campoColuna(c, valor, { aoMudar, valorFixo } = {}) {
    const l = el('label', 'conplus-campo' + (c.aConfirmar ? ' a-confirmar' : ''));
    l.dataset.registro = c.registro; l.dataset.coluna = String(c.n);
    const topo = el('span', 'conplus-campo-rotulo');
    topo.append(el('b', 'conplus-campo-n', String(c.n)), el('span', null, c.nome + (c.obrig && !c.fixo && !c.deriva ? ' *' : '')));
    if (c.obrigDoc) { const m = el('span', 'conplus-obrig-doc', 'doc'); m.title = 'Obrigatório na documentação do Questor: vazio, só gera aviso'; topo.append(m); }
    l.append(topo);
    let no;
    const somenteLeitura = Boolean(c.fixo || c.deriva);
    if (c.opcoes && !somenteLeitura) {
      no = U.seletor(c.opcoes.map(([k, t]) => [k, t ? k + ' · ' + t : k]), valor || '', '—');
    } else {
      no = U.entrada('text', somenteLeitura ? (valorFixo == null ? '' : valorFixo) : (valor || ''), { autocomplete: 'off', spellcheck: false });
      no.dataset.textoLivre = '1';
      if (somenteLeitura) { no.readOnly = true; no.tabIndex = -1; }
      else if (c.tamanho) no.maxLength = c.tamanho;
      if (['data', 'decimal', 'inteiro', 'codigo', 'cpf', 'cnpj'].includes(c.tipo)) no.inputMode = c.tipo === 'data' || c.tipo === 'cpf' || c.tipo === 'cnpj' ? 'numeric' : 'decimal';
      // Exemplo próprio em todo campo: sem ele, o layout-review.js poria "R$ 0,00" num rótulo com "salário" e o field-validation.js
      // passaria a máscara de moeda (o arquivo quer 2500,00, sem R$ e sem ponto).
      if (!somenteLeitura) no.placeholder = c.tipo === 'data' ? 'dd/mm/aaaa' : c.modelo ? 'Ex: ' + c.modelo + '...' : c.tipo === 'decimal' ? 'Ex: 0,00...' : ' ';
      const dl = !somenteLeitura && sugestoes(c.depara);
      if (dl) { l.append(dl); no.setAttribute('list', dl.id); }
    }
    no.id = 'conplus-' + c.registro + '-' + c.n + '-' + Math.random().toString(36).slice(2, 6);
    no.setAttribute('aria-label', 'Registro ' + c.registro + ', coluna ' + c.n);
    l.append(no);
    const dica = [c.campo, c.fixo === 'cnpj' ? 'empresa do laboratório' : c.fixo ? 'fixa' : c.deriva ? 'igual à coluna ' + c.deriva[1] + ' do ' + c.deriva[0] : '',
      c.aConfirmar ? 'nome a confirmar no .nli' : '', c.obrigDoc ? 'obrigatório na doc do Questor' : '', c.tamanho && !somenteLeitura && !c.opcoes ? 'até ' + c.tamanho + ' caracteres' : '', c.modelo && !somenteLeitura ? 'modelo: ' + c.modelo : '', c.consulta ? 'consulta ' + c.consulta : ''].filter(Boolean).join(' · ');
    const pe = el('small', 'conplus-campo-dica', dica + (c.dica ? (dica ? '. ' : '') + c.dica : ''));
    l.append(pe);
    const aviso = el('small', 'conplus-campo-erro'); aviso.hidden = true; aviso.setAttribute('role', 'status'); l.append(aviso);
    if (!somenteLeitura && aoMudar) no.addEventListener('input', () => aoMudar(no.value));
    if (!somenteLeitura && aoMudar && no.tagName === 'SELECT') no.addEventListener('change', () => aoMudar(no.value));
    return { no: l, input: no, aviso, marcar(msg) { aviso.hidden = !msg; aviso.textContent = msg || ''; l.classList.toggle('com-erro', Boolean(msg)); if (msg) no.setAttribute('aria-invalid', 'true'); else no.removeAttribute('aria-invalid'); } };
  }

  /** Quadro da conferência: situação, igual ao modelo, erros e avisos. aoEscolher(erro) leva ao campo. */
  function conferencia(resultado, { aoEscolher, modelo } = {}) {
    const box = el('div', 'conplus-conferencia');
    box.setAttribute('aria-live', 'polite');
    const { erros, avisos } = resultado;
    const topo = el('p', 'conplus-situacao ' + (erros.length ? 'tom-erro' : 'tom-ok'));
    topo.textContent = erros.length ? erros.length + (erros.length === 1 ? ' problema' : ' problemas') + ': corrija antes de baixar.' : 'Conferido: o arquivo passa na mesma conferência que a API faria.';
    box.append(topo);
    if (modelo) box.append(el('p', 'conplus-situacao tom-modelo', 'Idêntico ao modelo testado pela ConPlus na homologação (24/11/2026).'));
    const lista = (itens, cls) => {
      const ul = el('ul', 'conplus-erros ' + cls);
      itens.slice(0, 60).forEach((e) => {
        const li = el('li');
        if (aoEscolher && e.linha && e.coluna) { li.append(botao(e.texto, () => aoEscolher(e), 'conplus-erro-link')); } else li.textContent = e.texto;
        ul.append(li);
      });
      if (itens.length > 60) ul.append(el('li', null, '… e mais ' + (itens.length - 60) + '.'));
      return ul;
    };
    if (erros.length) box.append(lista(erros, 'tom-erro'));
    if (avisos.length) { box.append(el('p', 'conplus-sub', 'Avisos (não impedem o arquivo)')); box.append(lista(avisos, 'tom-aviso')); }
    return box;
  }

  /** Prévia do arquivo: uma linha por registro, com o número da linha e a contagem de colunas. */
  function previa(linhasTexto) {
    const box = el('div', 'conplus-previa');
    const lidas = D.ler(linhasTexto.join('\n'));
    linhasTexto.forEach((t, i) => {
      const l = lidas[i] || { registro: '?', contagem: 0, esperado: 0, erros: [] };
      const linha = el('div', 'conplus-previa-linha' + (l.erros.length ? ' com-erro' : ''));
      const cab = el('span', 'conplus-previa-cab', (i + 1) + ' · ' + l.registro + ' · ' + l.contagem + '/' + l.esperado);
      cab.title = 'Linha ' + (i + 1) + ', registro ' + l.registro + ', ' + l.contagem + ' de ' + l.esperado + ' colunas';
      linha.append(cab, el('code', null, t));
      box.append(linha);
    });
    return box;
  }

  /** Baixa o texto como .txt em Windows-1252 (CR+LF). Devolve '' ou o problema. */
  function baixar(nome, texto) {
    const fora = D.foraDo1252(texto);
    if (fora.length) return 'O arquivo tem caractere que não existe em Windows-1252: ' + fora.join(' ');
    const bytes = D.paraWindows1252(texto);
    const url = URL.createObjectURL(new Blob([bytes], { type: 'text/plain;charset=windows-1252' }));
    const a = el('a'); a.href = url; a.download = nome; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return '';
  }
  const carimbo = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + p(d.getMinutes()); };

  /** Lê um arquivo do aparelho (só neste navegador) e devolve { texto, codificacao, bytes, nome }. */
  function escolherArquivo(aceita) {
    return new Promise((resolve) => {
      const inp = el('input'); inp.type = 'file'; inp.accept = aceita; inp.hidden = true; document.body.append(inp);
      inp.onchange = async () => {
        const f = inp.files[0]; inp.remove(); if (!f) { resolve(null); return; }
        if (f.size > 20 * 1024 * 1024) { U.avisar('Arquivo acima de 20 MB.'); resolve(null); return; }
        const buf = new Uint8Array(await f.arrayBuffer()); const r = D.lerBytes(buf);
        resolve({ ...r, bytes: buf.length, nome: f.name });
      };
      inp.click();
    });
  }
  /** Linhas de um CSV, com a mesma leitura da importação das folhas (folhas-csv.js): separador detectado e aspas. */
  function linhasDoCsv(texto) {
    const T = window.CicluzFolhasCsv && window.CicluzFolhasCsv._t;
    if (!T) return null;
    return T.parseCSV(texto, T.detectDelim(texto));
  }

  /** Miolo de uma seção (o espaçamento interno das seções do S2). */
  const corpo = (...nos) => { const c = el('div', 'compras-corpo'); c.append(...nos.filter(Boolean)); return c; };

  /** A tabela do S2 (U.tabela) que, até 600 px, vira uma ficha por linha com o nome de cada coluna (nunca rolagem lateral). */
  function tabela(colunas, linhas, opcoes) {
    const box = U.tabela(colunas, linhas, opcoes);
    box.classList.add('conplus-tabela-empilha');
    box.querySelectorAll('tbody tr').forEach((tr) => [...tr.children].forEach((td, i) => { td.dataset.rotulo = (colunas[i] && colunas[i][0]) || ''; }));
    return box;
  }

  window.CicluzConplusComum = { tabela, corpo, COR, COR_TEXTO, campoColuna, conferencia, previa, baixar, carimbo, escolherArquivo, linhasDoCsv, sugestoes };
})();
