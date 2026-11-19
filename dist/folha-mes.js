/*
 * DES - Folha de Pagamento Mês (Saídas · Despesas / Relatórios, na lista junto com os outros relatórios). Tela própria, separada do confronto de ponto.
 * Uma tabela só: COLABORADOR fixo à esquerda e, ao lado, cada rubrica da folha com três subcolunas:
 *   PROJETADO (folha gerada pelo Cicluz) | REALIZADO (folha oficial da Conplus) | DIFERENÇA (Realizado − Projetado).
 *
 * Nada aqui calcula folha nem inventa valor. Os dois valores vêm de uma FONTE trocável (CicluzFolhaMes.usarFonte):
 *   projetado(competencia) e realizado(competencia), com competencia "AAAA-MM", devolvem { [idDaPessoa]: { [rubrica]: número } }
 *   (ou null quando ainda não existe). Valor que a fonte não traz aparece como "Pendente", nunca como zero.
 * Hoje não existe motor de folha do Cicluz nem a API da Conplus (PROJECT_BRAIN/11, P-37): as duas fontes devolvem null.
 * As rubricas são as dos eventos das folhas Conplus de demonstração (Dia 05 e Dia 20); a lista oficial substitui esta função.
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI;
  if (!U) return;
  const { el } = U;
  const BRL = (n) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const ICONE_PESSOA = '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0"/>';

  const COR = '#ef4444'; const COR_TEXTO = '#9c1c1c'; // Saídas · Despesas (mesmas cores do menu)
  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  let fonte = { async projetado() { return null; }, async realizado() { return null; } };
  let tela = null; let ref = { ano: new Date().getFullYear(), mes: new Date().getMonth() }; let versao = 0;
  const chave = (r) => r.ano + '-' + String(r.mes + 1).padStart(2, '0');
  function somar(r, n) { const t = r.ano * 12 + r.mes + n; return { ano: Math.floor(t / 12), mes: ((t % 12) + 12) % 12 }; }

  /** Rubricas (nomes dos eventos) das folhas mensais Conplus de demonstração, na ordem em que aparecem. */
  function rubricas() {
    const d = window.CicluzFolhasDemo || {}; const nomes = [];
    for (const tipo of ['folha05', 'folha20']) for (const doc of d[tipo] || []) for (const ev of doc.eventos || []) if (ev && ev.nome && !nomes.includes(ev.nome)) nomes.push(ev.nome);
    return nomes;
  }
  /** Colaboradores cadastrados (ativos), por ordem alfabética. */
  function colaboradores() {
    const P = window.CicluzPeople; if (!P) return [];
    P.load();
    return P.get().people.filter((p) => p.status === 'ATIVO').sort((a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR'));
  }

  function pendente() {
    const s = el('span', 'tg-pendente', 'Pendente');
    s.title = 'Valor ainda não disponível';
    return s;
  }
  function celula(valor, extra) {
    const c = el('span', 'tg-cel tg-num' + (extra ? ' ' + extra : ''));
    if (valor == null) c.append(pendente()); else c.textContent = BRL(valor);
    return c;
  }

  /** Seção com a tabela da folha da competência "AAAA-MM" (todos os colaboradores ativos). Devolve uma promessa do elemento. */
  async function secao(comp) {
    const [proj, real] = await Promise.all([Promise.resolve(fonte.projetado(comp)).catch(() => null), Promise.resolve(fonte.realizado(comp)).catch(() => null)]);
    const rub = rubricas(); const gente = colaboradores();
    const ponta = U.pontaDaLista(gente.length, gente.length + (gente.length === 1 ? ' colaborador' : ' colaboradores'));
    const sec = U.secao('Folha de pagamento do mês', undefined, ponta);
    if (!gente.length) { sec.append(U.vazio('Nenhum colaborador cadastrado.', 'Os colaboradores ativos do cadastro aparecem aqui.')); return sec; }
    if (!rub.length) { sec.append(U.vazio('Nenhuma rubrica disponível.', 'As rubricas vêm das folhas da Conplus.')); return sec; }
    const rolagem = el('div', 'tg-rolagem'); U.arrastarParaRolar(rolagem);
    const grade = el('div', 'tg-grade'); grade.style.setProperty('--tg-grupos', String(rub.length));
    grade.setAttribute('role', 'table'); grade.setAttribute('aria-label', 'Folha de pagamento de ' + comp);
    const cab1 = el('div', 'tg-linha'); cab1.setAttribute('role', 'row');
    const cab2 = el('div', 'tg-linha'); cab2.setAttribute('role', 'row');
    const colab = el('span', 'tg-cel tg-cab tg-colab', 'Colaborador'); colab.setAttribute('role', 'columnheader');
    cab1.append(colab);
    rub.forEach((r) => {
      const g = el('span', 'tg-cel tg-cab tg-grupo', r); g.setAttribute('role', 'columnheader'); g.title = r; cab1.append(g);
      ['Projetado', 'Realizado', 'Diferença'].forEach((t, i) => { const s = el('span', 'tg-cel tg-cab tg-sub' + (i === 0 ? ' tg-ini' : ''), t); s.setAttribute('role', 'columnheader'); cab2.append(s); });
    });
    grade.append(cab1, cab2);
    gente.forEach((p) => {
      const lin = el('div', 'tg-linha'); lin.setAttribute('role', 'row');
      const c = el('span', 'tg-cel tg-colab tg-nome'); c.setAttribute('role', 'rowheader');
      const ic = el('span', 'compras-linha-icone'); ic.innerHTML = U.svg(ICONE_PESSOA); c.append(ic, el('b', null, p.name || '(sem nome)'));
      lin.append(c);
      rub.forEach((r) => {
        const pj = proj && proj[p.id] && proj[p.id][r] != null ? Number(proj[p.id][r]) : null;
        const rl = real && real[p.id] && real[p.id][r] != null ? Number(real[p.id][r]) : null;
        lin.append(celula(pj, 'tg-ini'), celula(rl), celula(pj != null && rl != null ? Math.round((rl - pj) * 100) / 100 : null));
      });
      grade.append(lin);
    });
    rolagem.append(grade); sec.append(rolagem);
    return sec;
  }

  async function desenhar() {
    if (!tela) return;
    const minha = ++versao;
    const nav = U.navegadorPeriodo({ titulo: MESES[ref.mes] + ' ' + ref.ano, aoMudar: (n) => { ref = somar(ref, n); desenhar(); } });
    const sec = await secao(chave(ref));
    if (minha !== versao) return; // uma troca de mês mais nova já está em andamento
    tela.body.replaceChildren(nav, U.nota('Projetado: folha gerada pelo Cicluz. Realizado: folha oficial da Conplus. Diferença: Realizado − Projetado. "Pendente" = valor ainda não disponível.'), sec);
  }
  function abrir() {
    if (!tela) tela = U.criarTela({ id: 'des-folha-mes', titulo: 'DES - Folha de Pagamento Mês', caminho: 'Saídas · Despesas / Relatórios / DES - Folha de Pagamento Mês', icone: 'cadastro', voltar: () => { if (typeof menuBack === 'function') menuBack(2, 'Relatórios')(); }, cor: COR, corTexto: COR_TEXTO });
    tela.ativar(); desenhar();
  }

  window.CicluzFolhaMes = {
    abrir,
    secao,
    rubricas,
    usarFonte(f) { if (f && typeof f.projetado === 'function' && typeof f.realizado === 'function') { fonte = f; if (tela && tela.view.classList.contains('show')) desenhar(); } },
  };
})();
