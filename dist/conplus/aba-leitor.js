/*
 * Área ConPlus (laboratório) — aba Ler arquivo: abre um .txt de importação (o modelo da ConPlus, um arquivo gerado aqui ou outro)
 * e mostra, linha a linha e coluna a coluna, o que ele contém, com a mesma conferência da geração. Lido só neste navegador.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI; const L = window.CicluzConplusLayout; const D = window.CicluzConplusDominio; const K = window.CicluzConplusComum;
  if (!U || !L || !D || !K) return;
  const { el, botao } = U;
  let ultimo = null; // { texto, codificacao, bytes, nome }

  function montar(corpo, { irPara } = {}) {
    const saida = el('div', 'conplus-saida');
    const colado = el('textarea', 'conplus-colar'); colado.rows = 4; colado.dataset.textoLivre = '1'; colado.spellcheck = false;
    colado.placeholder = 'Ou cole aqui o conteúdo do arquivo (uma linha por registro).';
    const acoes = el('div', 'conplus-acoes');
    acoes.append(
      botao('Escolher arquivo .txt', async () => { const r = await K.escolherArquivo('.txt,.csv,text/plain'); if (r) { ultimo = r; colado.value = ''; mostrar(); } }, 'btn'),
      botao('Ler o texto colado', () => { if (!colado.value.trim()) { U.avisar('Cole o conteúdo antes.'); return; } ultimo = { texto: colado.value, codificacao: 'texto colado', bytes: 0, nome: 'texto colado' }; mostrar(); }, 'btn secondary'),
      botao('Ler o modelo da ConPlus', () => { const t = D.juntar([L.MODELO.A, L.MODELO.B, L.MODELO.C, L.MODELO.D]); ultimo = { texto: t, codificacao: 'modelo da documentação', bytes: D.paraWindows1252(t).length, nome: 'Modelo de admissão (doc da ConPlus)' }; colado.value = ''; mostrar(); }, 'btn ghost'));

    function mostrar() {
      if (!ultimo) { saida.replaceChildren(U.vazio('Nenhum arquivo lido.', 'Escolha um .txt, cole o conteúdo ou leia o modelo da ConPlus.')); return; }
      const r = D.validar(ultimo.texto, { bytes: ultimo.bytes });
      const linhasTexto = r.linhas.map((l) => l.bruta);
      const info = el('p', 'profiles-note', ultimo.nome + ' · ' + ultimo.codificacao + (ultimo.bytes ? ' · ' + ultimo.bytes + ' bytes' : '') + ' · ' + r.linhas.length + (r.linhas.length === 1 ? ' linha' : ' linhas') + (r.grupo ? ' · grupo ' + r.grupo : ''));
      const partes = [info];
      if (ultimo.codificacao === 'UTF-8') partes.push(el('p', 'conplus-situacao tom-aviso', 'O arquivo está em UTF-8. O Questor espera Windows-1252: os acentos chegariam trocados. Gere de novo por aqui ou converta antes de mandar.'));
      const ehAdm = r.grupo === 'Admissao' && r.linhas.filter((l) => l.registro === 'A').length === 1;
      partes.push(K.conferencia(r, { modelo: ehAdm && D.igualAoModelo(linhasTexto), aoEscolher: (e) => abrirLinha(e.linha, e.coluna) }));
      if (ehAdm && irPara) {
        const ac = el('div', 'conplus-acoes');
        ac.append(botao('Levar para o formulário de admissão', () => irPara('admissao', r.linhas), 'btn secondary'));
        partes.push(ac);
      }
      const linhasBox = el('div', 'conplus-linhas');
      r.linhas.forEach((l) => {
        const d = el('details', 'conplus-registro'); d.id = 'conplus-lida-' + l.numero;
        const sm = el('summary');
        const R = L.REGISTROS[l.registro];
        sm.append(el('span', 'conplus-registro-sigla', l.registro || '?'), el('span', 'conplus-registro-nome', 'Linha ' + l.numero + (R ? ' · ' + R.nome : '')),
          el('span', 'conplus-registro-meta', l.contagem + ' de ' + (l.esperado || '?') + ' colunas' + (l.sobraFinal ? ' (com ";" a mais no fim)' : '')),
          el('span', 'conplus-registro-conta' + (l.erros.length ? ' tom-erro' : ''), l.erros.length ? l.erros.length + (l.erros.length === 1 ? ' problema' : ' problemas') : 'ok'));
        d.append(sm);
        d.append(U.tabela([
          ['Nº', (c) => String(c.n), 'conplus-num'],
          ['Campo', (c) => { const s = el('span', c.aConfirmar ? 'conplus-a-confirmar' : null, c.nome + (c.campo ? ' · ' + c.campo : '')); if (c.aConfirmar) s.title = 'Nome a confirmar no .nli'; return s; }],
          ['Valor', (c) => { const v = el('code', 'conplus-valor', c.valor === '' ? '(vazio)' : c.valor); if (c.valor === '') v.classList.add('vazio'); return v; }],
          ['Conferência', (c) => (c.problema ? el('span', 'conplus-problema', c.problema) : '')],
        ], l.colunas, { vazioTexto: 'Linha sem colunas reconhecidas.', classeLinha: (c) => (c.problema ? 'com-erro' : '') }));
        linhasBox.append(d);
      });
      partes.push(linhasBox);
      saida.replaceChildren(...partes);
    }
    function abrirLinha(numero, coluna) {
      const d = saida.querySelector('#conplus-lida-' + numero); if (!d) return;
      d.open = true;
      const tr = d.querySelectorAll('tbody tr')[coluna - 1];
      (tr || d).scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      if (tr) { tr.tabIndex = -1; tr.focus(); }
    }
    corpo.append(U.nota('Útil para conferir o modelo da ConPlus e qualquer arquivo antes de mandar. As colunas que a doc não nomeia aparecem como "Coluna N" (a confirmar no .nli). Nada sai deste navegador.'), acoes, colado, saida);
    mostrar();
  }

  (window.CicluzConplusAbas = window.CicluzConplusAbas || {}).leitor = { titulo: 'Ler arquivo', montar };
})();
