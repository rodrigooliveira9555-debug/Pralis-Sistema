/*
 * Área ConPlus (laboratório) — aba Admissão: formulário de teste campo a campo (A 21, B 85, C 67, D 31 por dependente),
 * conferência ao vivo e download do .txt (Windows-1252, ";", sem cabeçalho, CR+LF). Uma pessoa por arquivo; C e D só com dado.
 * O formulário fica só na memória desta página (nada é gravado). Só dados fictícios.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI; const L = window.CicluzConplusLayout; const D = window.CicluzConplusDominio; const K = window.CicluzConplusComum;
  if (!U || !L || !D || !K) return;
  const { el, botao } = U;

  const vazio = () => ({ a: {}, b: {}, c: {}, d: [] });
  let estado = vazio();
  const cnpj = L.CNPJ_HOMOLOGACAO;

  function preencherComModelo() {
    estado = { a: D.valoresDaLinha(L.MODELO.A), b: D.valoresDaLinha(L.MODELO.B), c: D.valoresDaLinha(L.MODELO.C), d: [D.valoresDaLinha(L.MODELO.D)] };
  }
  /** Traz para o formulário um arquivo lido (aba Ler arquivo): uma pessoa, A e B. */
  function carregarLinhas(linhas) {
    const novo = vazio();
    linhas.forEach((l) => {
      const v = {}; l.colunas.forEach((c) => { v[c.n] = c.valor; });
      if (l.registro === 'A') novo.a = v; else if (l.registro === 'B') novo.b = v; else if (l.registro === 'C') novo.c = v; else if (l.registro === 'D') novo.d.push(v);
    });
    estado = novo;
  }

  function montar(corpo) {
    const campos = []; // { reg, dep, n, ctl }
    const blocos = {}; // chave → details
    const valoresDe = (reg, dep) => (reg === 'A' ? estado.a : reg === 'B' ? estado.b : reg === 'C' ? estado.c : estado.d[dep]);
    const titular = () => ({ 6: String(estado.a[6] || '').trim(), 9: String(estado.a[9] || '').trim() });

    const saida = el('div', 'conplus-saida');
    let ultimo = null;
    function conferir() {
      const linhas = D.montarAdmissao({ cnpj, ...estado });
      const texto = D.juntar(linhas);
      const r = D.validar(texto);
      // Linha do arquivo → bloco do formulário (C e D só entram com dado).
      const mapa = [{ reg: 'A' }, { reg: 'B' }];
      if (D.temDado('C', estado.c)) mapa.push({ reg: 'C' });
      estado.d.forEach((dep, i) => { if (D.temDado('D', dep)) mapa.push({ reg: 'D', dep: i }); });
      const porCampo = new Map();
      r.erros.forEach((e) => { const m = mapa[e.linha - 1]; if (m && e.coluna) { const k = m.reg + (m.dep ?? '') + ':' + e.coluna; if (!porCampo.has(k)) porCampo.set(k, e.msg); e.alvo = { ...m, n: e.coluna }; } });
      campos.forEach((f) => f.ctl.marcar(porCampo.get(f.reg + (f.dep ?? '') + ':' + f.n) || ''));
      Object.entries(blocos).forEach(([k, d]) => {
        const q = [...porCampo.keys()].filter((x) => x.split(':')[0] === k).length;
        const conta = d.querySelector('.conplus-registro-conta'); conta.textContent = q ? q + (q === 1 ? ' problema' : ' problemas') : 'ok'; conta.classList.toggle('tom-erro', q > 0);
      });
      campos.filter((f) => f.reg === 'D').forEach((f) => { const c = L.colunas('D')[f.n - 1]; if (c.deriva) f.ctl.input.value = titular()[c.deriva[1]]; });
      ultimo = { linhas, texto, r };
      saida.replaceChildren(
        K.conferencia(r, { modelo: D.igualAoModelo(linhas), aoEscolher: (e) => irPara(e.alvo) }),
        el('p', 'conplus-sub', 'Prévia do arquivo (' + linhas.length + ' linhas: número · registro · colunas/layout)'),
        K.previa(linhas));
      baixarBtn.disabled = r.erros.length > 0;
    }
    let espera = null;
    const agendar = () => { clearTimeout(espera); espera = setTimeout(conferir, 150); };

    function irPara(alvo) {
      if (!alvo) return;
      const f = campos.find((x) => x.reg === alvo.reg && (x.dep ?? null) === (alvo.dep ?? null) && x.n === alvo.n);
      if (!f) return;
      const d = f.ctl.no.closest('details'); if (d) d.open = true;
      f.ctl.input.focus(); f.ctl.no.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }

    function blocoRegistro(reg, dep, titulo) {
      const R = L.REGISTROS[reg];
      const d = el('details', 'conplus-registro'); d.open = reg === 'A';
      const chave = reg + (dep ?? '');
      blocos[chave] = d;
      const sm = el('summary');
      sm.append(el('span', 'conplus-registro-sigla', reg), el('span', 'conplus-registro-nome', titulo || R.nome), el('span', 'conplus-registro-meta', R.colunas + ' colunas · ' + R.layout), el('span', 'conplus-registro-conta', ''));
      d.append(sm);
      if (R.dica) d.append(el('p', 'profiles-note conplus-registro-dica', R.dica));
      const grade = el('div', 'conplus-grade');
      const vals = valoresDe(reg, dep);
      L.colunas(reg).forEach((c) => {
        const fixo = c.n === 1 ? reg : c.fixo === 'cnpj' ? cnpj : c.fixo === 'valor' ? c.valor : c.deriva ? titular()[c.deriva[1]] : null;
        const ctl = K.campoColuna(c, vals[c.n], { valorFixo: fixo, aoMudar: (v) => { valoresDe(reg, dep)[c.n] = v; agendar(); } });
        campos.push({ reg, dep, n: c.n, ctl });
        grade.append(ctl.no);
      });
      d.append(grade);
      return d;
    }

    const acoes = el('div', 'conplus-acoes');
    const baixarBtn = botao('Baixar .txt', () => {
      conferir();
      if (ultimo.r.erros.length) { U.avisar('Corrija os problemas antes de baixar.'); return; }
      const msg = K.baixar('Admissao ' + K.carimbo() + ' - laboratorio.txt', ultimo.texto);
      U.avisar(msg || 'Arquivo baixado em Windows-1252. Mande para a ConPlus só depois de conferir.');
    }, 'btn');
    acoes.append(
      botao('Preencher com o modelo da ConPlus', () => { preencherComModelo(); desenhar(); }, 'btn secondary'),
      botao('Limpar', () => { estado = vazio(); desenhar(); }, 'btn ghost'),
      baixarBtn);

    const formulario = el('div', 'conplus-formulario');
    function desenhar() {
      campos.length = 0; Object.keys(blocos).forEach((k) => delete blocos[k]);
      const deps = el('div', 'conplus-dependentes');
      estado.d.forEach((dep, i) => {
        const b = blocoRegistro('D', i, 'Dependente ' + (i + 1));
        b.append(botao('Remover dependente ' + (i + 1), () => { estado.d.splice(i, 1); desenhar(); }, 'btn ghost conplus-remover'));
        deps.append(b);
      });
      const novoDep = botao('+ Adicionar dependente', () => { estado.d.push({}); desenhar(); const ult = formulario.querySelector('.conplus-dependentes > details:last-of-type'); if (ult) { ult.open = true; const i = ult.querySelector('input:not([readonly])'); if (i) i.focus(); } }, 'btn secondary');
      formulario.replaceChildren(blocoRegistro('A'), blocoRegistro('B'), blocoRegistro('C'), deps, novoDep);
      conferir();
    }

    const sec = U.secao('Conferência e arquivo'); sec.append(saida);
    corpo.append(
      U.nota('Uma pessoa por arquivo. A e B são obrigatórios; C só vai se tiver algum dado e cada dependente vira uma linha D. As colunas sem nome ainda não foram nomeadas pela ConPlus: o valor do modelo testado aparece embaixo de cada campo. O formulário não é guardado.'),
      acoes, formulario, sec);
    desenhar();
  }

  (window.CicluzConplusAbas = window.CicluzConplusAbas || {}).admissao = { titulo: 'Admissão', montar, carregarLinhas };
})();
