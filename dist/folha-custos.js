/* CUSTO DA FOLHA DE PAGAMENTO (19/11/2026, pedido do Rodrigo).
   Duas telas:
   1) Relatórios › DES - Folha de Pagamento: tabela de colaboradores × reflexos da folha. Em cada reflexo, três valores:
      Projetado · Realizado · Diferença. Barra do mês para andar para trás e para a frente; botão Colunas para ocultar reflexos.
   2) Lançamentos Colaboradores › DES - Folha de Pagamento Importação Contabilidade: lê a planilha (CSV) que a contabilidade
      entrega e grava o REALIZADO do mês escolhido.
   O PROJETADO fica em branco de propósito: as regras de cálculo de cada reflexo ainda serão definidas pelo Rodrigo, na base dos
   relatórios. Nenhuma conta de folha é feita aqui. A única conta é Diferença = Realizado − Projetado, e só quando os dois existem.
   Colunas (reflexos) = grupos de despesa de pessoal de DES - Grupos de Despesas, pelo id do cadastro (COLUNAS_PADRAO).
   Dados: cicluz-folha-custos-v1 = { version:1, meses: { 'AAAA-MM': { importadoEm, arquivo, valores: { <id do colaborador>: { <id do grupo>: centavos } } } } }.
   É salário real de pessoas: fica só neste aparelho (não vai para o servidor) e nunca entra em teste, print ou log. */
(() => {
  'use strict';
  const U = window.CicluzComprasUI; if (!U) return;
  const { el } = U;
  const KEY = 'cicluz-folha-custos-v1', PREF = 'cicluz-folha-colunas-ocultas';
  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  /* Grupos de despesa de pessoal, pelo id fixo do cadastro (Folha Pag, Premiação, Benefícios, Diárias e H. Extras, Encargos Sociais, Vale Trans., 13º, Férias e Rescisões). */
  const COLUNAS_PADRAO = ['g8', 'g9', 'g10', 'g11', 'g12', 'g13', 'g14', 'g15'];
  const cores = () => ({ cor: U.corOrigem('despesas', '#ef4444'), corTexto: '#a11c1c' });
  const dobrar = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const nomeBonito = (t) => (typeof formatSystemName === 'function' ? formatSystemName(String(t || '')) : String(t || ''));
  const dinheiro = (c) => (c == null ? '—' : (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

  /* ---------- Dados ---------- */
  let dados = { version: 1, meses: {} }, falhou = false;
  function carregar() { try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) { if (s.version !== 1 || typeof s.meses !== 'object' || !s.meses) throw new Error('formato'); dados = s; } falhou = false; } catch (e) { falhou = true; } }
  function gravar(mudar) { if (falhou) return false; const antes = JSON.stringify(dados); try { mudar(dados); localStorage.setItem(KEY, JSON.stringify(dados)); return true; } catch (e) { dados = JSON.parse(antes); return false; } }
  function colunas() {
    let lista = null; try { if (typeof financialGroups !== 'undefined') lista = financialGroups.despesas; } catch (e) { /* ainda não carregado */ }
    if (!lista) { try { lista = (JSON.parse(localStorage.getItem('cicluz-financial-hierarchy-v1') || 'null') || {}).despesas; } catch (e) { lista = null; } }
    const porId = new Map((Array.isArray(lista) ? lista : []).map((g) => [g.id, g]));
    return COLUNAS_PADRAO.map((id) => porId.get(id)).filter(Boolean).map((g) => ({ id: g.id, nome: nomeBonito(g.name) }));
  }
  function pessoas() { const P = window.CicluzPeople; if (!P) return []; P.load(); return (P.get().people || []).map((p) => ({ id: p.id, nome: p.name, cpf: String(p.cpf || '').replace(/\D/g, ''), cargo: p.jobName || '', ativo: p.status === 'ATIVO' })); }
  const ocultas = () => { try { const v = JSON.parse(localStorage.getItem(PREF) || '[]'); return new Set(Array.isArray(v) ? v : []); } catch (e) { return new Set(); } };
  const rotuloMes = (ym) => MESES[+ym.slice(5) - 1] + ' ' + ym.slice(0, 4);
  const mesHoje = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
  const andarMes = (ym, n) => { const d = new Date(+ym.slice(0, 4), +ym.slice(5) - 1 + n, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
  /** Projetado do colaborador naquele reflexo e mês. Em branco até as regras da folha serem definidas (não inventar conta aqui). */
  const projetado = () => null;
  const redondo = (rotulo, d, acao) => { const b = el('button', 'shortcut-circle compras-redondo'); b.type = 'button'; b.title = rotulo; b.setAttribute('aria-label', rotulo); b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/></svg>'; b.onclick = acao; return b; };

  /* ---------- Relatório ---------- */
  let telaRel = null, mes = mesHoje();
  function abrirRelatorio() {
    if (!telaRel) telaRel = U.criarTela({ id: 'folha-custos', titulo: 'DES - Folha de Pagamento', caminho: 'Saídas · Despesas / Relatórios / DES - Folha de Pagamento', icone: 'cadastro', voltar: () => menuBack(2, 'Relatórios')(), ...cores() });
    telaRel.ativar(); carregar(); desenharRelatorio();
  }
  function desenharRelatorio() {
    const cols = colunas(), fora = ocultas(), visiveis = cols.filter((c) => !fora.has(c.id)), m = dados.meses[mes], valores = (m && m.valores) || {};
    const gente = pessoas().filter((p) => p.ativo || valores[p.id]).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const barra = el('div', 'folha-barra'), mesBox = el('div', 'folha-mes'), rot = el('b', null, rotuloMes(mes)); rot.setAttribute('aria-live', 'polite');
    mesBox.append(redondo('Mês anterior', 'm15 6-6 6 6 6', () => { mes = andarMes(mes, -1); desenharRelatorio(); }), rot, redondo('Próximo mês', 'm9 6 6 6-6 6', () => { mes = andarMes(mes, 1); desenharRelatorio(); }));
    const botaoColunas = U.botaoTitulo('Colunas', 'Escolher os reflexos que aparecem na tabela', () => {
      window.CicluzContratos.seletorArvore({ titulo: 'Colunas do relatório', sigla: 'DES', cores: cores(), rotuloBusca: 'Buscar reflexo', nos: () => cols.map((c) => ({ id: c.id, nome: c.nome, ativo: true, conta: 'Reflexo da folha' })), marcados: new Set(visiveis.map((c) => c.id)),
        aoConfirmar: (s) => { try { localStorage.setItem(PREF, JSON.stringify(cols.filter((c) => !s.has(c.id)).map((c) => c.id))); } catch (e) { /* preferência do aparelho */ } desenharRelatorio(); } });
    }, '<path d="M4 5h16v14H4zM9 5v14M15 5v14"/>');
    barra.append(mesBox, botaoColunas);
    const nota = U.nota(m ? 'Realizado importado da contabilidade em ' + new Date(m.importadoEm).toLocaleDateString('pt-BR') + (m.arquivo ? ' (' + m.arquivo + ')' : '') + '. O Projetado fica em branco até as regras da folha serem definidas; a Diferença aparece quando houver os dois valores.'
      : 'Nenhuma importação da contabilidade para ' + rotuloMes(mes) + '. Importe em Lançamentos Colaboradores › DES - Folha de Pagamento Importação Contabilidade. O Projetado fica em branco até as regras da folha serem definidas.');
    const sec = U.secao('Custo da folha — ' + rotuloMes(mes), undefined, U.pontaDaLista(gente.length, gente.length + (gente.length === 1 ? ' colaborador' : ' colaboradores')));
    const caixa = el('div', 'matriz-uniformes folha-quadro');
    if (falhou) caixa.append(el('p', 'people-alert', 'Não foi possível ler os dados da folha salvos neste aparelho. Nada será gravado para não sobrescrever.'));
    else if (!visiveis.length) caixa.append(U.vazio('Nenhuma coluna à vista.', 'Use "Colunas" para escolher os reflexos.'));
    else if (!gente.length) caixa.append(U.vazio('Nenhum colaborador ativo.', 'Cadastre os colaboradores em Cadastros Geral Colaboradores.'));
    else {
      const t = el('table', 'folha-tabela'), th = el('thead'), l1 = el('tr'), l2 = el('tr'), tb = el('tbody'), tf = el('tfoot');
      const canto = el('th', 'folha-canto', 'Colaborador'); canto.rowSpan = 2; canto.scope = 'col'; l1.append(canto);
      for (const c of [...visiveis, { id: '__total', nome: 'Total' }]) { const g = el('th', 'folha-grupo' + (c.id === '__total' ? ' folha-total' : ''), c.nome); g.colSpan = 3; g.scope = 'colgroup'; l1.append(g); for (const x of ['Projetado', 'Realizado', 'Diferença']) { const s = el('th', 'folha-sub', x); s.scope = 'col'; l2.append(s); } }
      th.append(l1, l2);
      const somaCol = new Map(visiveis.map((c) => [c.id, { p: null, r: null }]));
      const celulas = (tr, p, r, extra = '') => { const d = p != null && r != null ? r - p : null; const a = el('td', 'folha-valor' + extra, dinheiro(p)), b = el('td', 'folha-valor' + extra, dinheiro(r)), c = el('td', 'folha-valor folha-dif' + extra + (d ? ' diferente' : ''), dinheiro(d)); tr.append(a, b, c); };
      const somar = (a, b) => (b == null ? a : (a || 0) + b);
      for (const g of gente) {
        const tr = el('tr'), nome = el('th', 'folha-pessoa'); nome.scope = 'row'; const miolo = el('div', 'folha-pessoa-miolo'); miolo.append(el('span', null, g.nome), el('small', null, g.cargo || 'Cargo não informado')); nome.append(miolo); tr.append(nome);
        let tp = null, trl = null;
        for (const c of visiveis) { const r = valores[g.id] && Number.isInteger(valores[g.id][c.id]) ? valores[g.id][c.id] : null, p = projetado(g, c, mes); celulas(tr, p, r); tp = somar(tp, p); trl = somar(trl, r); const s = somaCol.get(c.id); s.p = somar(s.p, p); s.r = somar(s.r, r); }
        celulas(tr, tp, trl, ' folha-total'); tb.append(tr);
      }
      const rodape = el('tr'), rt = el('th', 'folha-pessoa', 'Total do mês'); rt.scope = 'row'; rodape.append(rt); let gp = null, gr = null;
      for (const c of visiveis) { const s = somaCol.get(c.id); celulas(rodape, s.p, s.r, ' folha-total'); gp = somar(gp, s.p); gr = somar(gr, s.r); }
      celulas(rodape, gp, gr, ' folha-total'); tf.append(rodape); t.append(th, tb, tf); caixa.append(t);
    }
    sec.append(caixa); telaRel.body.replaceChildren(barra, nota, sec);
  }

  /* ---------- Importação da contabilidade ---------- */
  /** CSV simples: separador ; ou , (o que mais aparece na primeira linha), aspas duplas, primeira linha = títulos. */
  function lerCsv(texto) {
    const limpo = String(texto || '').replace(/^﻿/, ''); const primeira = limpo.split(/\r?\n/)[0] || ''; const sep = (primeira.match(/;/g) || []).length >= (primeira.match(/,/g) || []).length ? ';' : ',';
    const linhas = []; let atual = [], campo = '', aspas = false;
    for (let i = 0; i < limpo.length; i++) { const ch = limpo[i];
      if (aspas) { if (ch === '"') { if (limpo[i + 1] === '"') { campo += '"'; i++; } else aspas = false; } else campo += ch; }
      else if (ch === '"') aspas = true; else if (ch === sep) { atual.push(campo); campo = ''; } else if (ch === '\n') { atual.push(campo); linhas.push(atual); atual = []; campo = ''; } else if (ch !== '\r') campo += ch; }
    if (campo !== '' || atual.length) { atual.push(campo); linhas.push(atual); }
    const uteis = linhas.filter((l) => l.some((c) => String(c).trim() !== '')); return { titulos: (uteis[0] || []).map((t) => String(t).trim()), linhas: uteis.slice(1) };
  }
  /** "1.234,56", "R$ 1.234,56", "1234.56" ou "1234,5" → centavos; vazio → null; inválido → NaN. */
  function centavosDe(texto) {
    let s = String(texto == null ? '' : texto).replace(/[R$\s]/g, ''); if (s === '' || s === '-') return null; const neg = /^-|^\(.*\)$/.test(s); s = s.replace(/[()-]/g, '');
    if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); else if (/\.\d{3}(\.|$)/.test(s) && !/\.\d{1,2}$/.test(s)) s = s.replace(/\./g, ''); else s = s.replace(/,/g, '');
    const n = Number(s); if (!Number.isFinite(n)) return NaN; return Math.round(n * 100) * (neg ? -1 : 1);
  }
  let telaImp = null, lido = null, mesImp = mesHoje();
  function abrirImportacao() {
    if (!telaImp) telaImp = U.criarTela({ id: 'folha-importacao', titulo: 'DES - Folha de Pagamento Importação Contabilidade', caminho: 'Saídas · Despesas / Lançamentos Colaboradores / DES - Folha de Pagamento Importação Contabilidade', icone: 'cadastro', voltar: () => menuBack(2, 'Lançamentos Colaboradores')(), ...cores() });
    telaImp.ativar(); carregar(); lido = null; desenharImportacao();
  }
  function desenharImportacao() {
    const cols = colunas(), corpo = [];
    corpo.push(U.nota('Importe a planilha que a contabilidade entrega com o que foi pago na folha do mês. O arquivo é lido só neste aparelho e os valores ficam gravados aqui (não vão para o servidor). Importar de novo o mesmo mês substitui o que estava.'));
    if (falhou) corpo.push(el('p', 'people-alert', 'Não foi possível ler os dados da folha salvos neste aparelho. Nada será gravado para não sobrescrever.'));
    /* Passo 1: mês e arquivo */
    const q1 = el('fieldset', 'compras-fieldset'); q1.append(el('legend', null, '1. Mês e arquivo'));
    const anos = []; for (let a = new Date().getFullYear() + 1; a >= new Date().getFullYear() - 5; a--) anos.push(String(a));
    const selMes = U.seletor(MESES.map((n, i) => [String(i + 1).padStart(2, '0'), n]), mesImp.slice(5)), selAno = U.seletor(anos, mesImp.slice(0, 4));
    const aoMudarMes = () => { mesImp = selAno.value + '-' + selMes.value; desenharImportacao(); }; selMes.onchange = aoMudarMes; selAno.onchange = aoMudarMes;
    const arquivo = el('input'); arquivo.type = 'file'; arquivo.accept = '.csv,text/csv,text/plain'; arquivo.hidden = true; arquivo.setAttribute('aria-label', 'Arquivo da contabilidade (CSV)');
    arquivo.onchange = () => { const f = arquivo.files && arquivo.files[0]; if (!f) return; const fr = new FileReader(); fr.onload = () => { const r = lerCsv(fr.result); if (!r.titulos.length || !r.linhas.length) { lido = null; U.avisar('Não achei linhas nesse arquivo. Confira se é uma planilha em CSV com títulos na primeira linha.'); desenharImportacao(); return; } lido = { nome: f.name, ...r, mapa: sugerir(r.titulos, cols) }; desenharImportacao(); }; fr.onerror = () => U.avisar('Não foi possível ler o arquivo.'); fr.readAsText(f); };
    const escolher = U.botaoTitulo('Escolher arquivo', 'Escolher a planilha (CSV) da contabilidade', () => arquivo.click(), '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>');
    q1.append(U.campo('Mês *', selMes), U.campo('Ano *', selAno), escolher, arquivo, el('small', 'profiles-note compras-largo', lido ? 'Arquivo: ' + lido.nome + ' — ' + lido.linhas.length + ' linha(s).' : 'Planilha em CSV, com os títulos na primeira linha: uma linha por colaborador e uma coluna para cada reflexo.'));
    corpo.push(q1);
    /* Passo 2: qual coluna do arquivo é o quê */
    if (lido) {
      const q2 = el('fieldset', 'compras-fieldset'); q2.append(el('legend', null, '2. Qual coluna do arquivo é o quê'));
      const opc = lido.titulos.map((t, i) => [String(i), t || 'Coluna ' + (i + 1)]);
      const sel = (chave, rotulo, dica) => { const s = U.seletor(opc, lido.mapa[chave] == null ? '' : String(lido.mapa[chave]), 'Não tem no arquivo'); s.onchange = () => { lido.mapa[chave] = s.value === '' ? null : +s.value; desenharImportacao(); }; return U.campo(rotulo, s, dica); };
      q2.append(sel('cpf', 'CPF do colaborador', 'É por ele que a linha é ligada ao cadastro. Sem CPF, vale o nome escrito igual.'), sel('nome', 'Nome do colaborador'), ...cols.map((c) => sel(c.id, c.nome)));
      corpo.push(q2);
      /* Passo 3: conferência antes de gravar */
      const r = conferir(cols), q3 = el('fieldset', 'compras-fieldset'); q3.append(el('legend', null, '3. Conferência'));
      const itens = el('dl', 'profiles-info compras-largo'); const par = (k, v) => itens.append(el('dt', null, k), el('dd', null, v));
      par('Mês', rotuloMes(mesImp)); par('Linhas do arquivo', String(lido.linhas.length)); par('Colaboradores encontrados no cadastro', String(r.achados)); par('Linhas sem colaborador no cadastro', String(r.semPessoa.length)); par('Valores que não são número', String(r.invalidos)); par('Total realizado a importar', dinheiro(r.total));
      q3.append(itens);
      if (r.semPessoa.length) q3.append(el('p', 'people-alert compras-largo', r.semPessoa.length + ' linha(s) não serão importadas porque o colaborador não foi encontrado no cadastro (CPF ou nome diferentes). Linhas: ' + r.semPessoa.slice(0, 12).join(', ') + (r.semPessoa.length > 12 ? '…' : '') + '.'));
      if (!r.temIdentificacao) q3.append(el('p', 'people-alert compras-largo', 'Indique a coluna do CPF ou a do nome do colaborador.'));
      else if (!r.temValor) q3.append(el('p', 'people-alert compras-largo', 'Indique ao menos uma coluna de valor.'));
      const acoes = el('div', 'actions compras-largo'); const cancelar = U.botao('Cancelar', () => { lido = null; desenharImportacao(); }, 'btn ghost'); const importar = U.botao('Importar', () => importarAgora(r), 'btn'); importar.disabled = !(r.temIdentificacao && r.temValor && r.achados > 0) || falhou;
      acoes.append(cancelar, importar); q3.append(acoes); corpo.push(q3);
    }
    /* Meses já importados */
    const lista = Object.keys(dados.meses).sort().reverse(), sec = U.secao('Meses importados', undefined, U.pontaDaLista(lista.length, lista.length + (lista.length === 1 ? ' mês importado' : ' meses importados'))), linhas = el('div', 'compras-lista');
    if (!lista.length) linhas.append(U.vazio('Nenhum mês importado.', 'Escolha o mês e o arquivo da contabilidade para importar o realizado.'));
    for (const ym of lista) { const m = dados.meses[ym], q = Object.keys(m.valores || {}).length, total = Object.values(m.valores || {}).reduce((t, v) => t + Object.values(v).reduce((a, b) => a + b, 0), 0);
      linhas.append(U.linhaLista({ icone: '<path d="M4 5h16v15H4zM8 3v4M16 3v4M4 10h16"/>', titulo: rotuloMes(ym), detalhe: q + (q === 1 ? ' colaborador' : ' colaboradores') + ' · total ' + dinheiro(total) + ' · importado em ' + new Date(m.importadoEm).toLocaleDateString('pt-BR'), direita: el('span', 'account-list-state', 'Importado'),
        acoes: { rotulo: rotuloMes(ym), lista: linhas, aoEditar: () => { mes = ym; abrirRelatorio(); }, aoExcluir: () => U.confirmar('Excluir importação', 'O realizado de ' + rotuloMes(ym) + ' será apagado deste aparelho. O arquivo da contabilidade não é alterado.', 'Excluir', () => { if (!gravar((d) => { delete d.meses[ym]; })) return 'Não foi possível excluir. Tente de novo.'; U.avisar('Importação de ' + rotuloMes(ym) + ' excluída.'); desenharImportacao(); return undefined; }, cores()) } })); }
    sec.append(linhas); corpo.push(sec); telaImp.body.replaceChildren(...corpo);
  }
  /** Sugere a coluna do arquivo para cada campo, pelo título parecido; o usuário confere e ajusta. */
  function sugerir(titulos, cols) { const t = titulos.map(dobrar), achar = (...pistas) => { const i = t.findIndex((x) => pistas.some((p) => x.includes(p))); return i < 0 ? null : i; }, mapa = { cpf: achar('cpf'), nome: achar('nome', 'colaborador', 'funcionario') }; for (const c of cols) mapa[c.id] = achar(dobrar(c.nome)); return mapa; }
  function conferir(cols) {
    const gente = pessoas(), porCpf = new Map(gente.filter((p) => p.cpf).map((p) => [p.cpf, p])), porNome = new Map(gente.map((p) => [dobrar(p.nome), p])), m = lido.mapa;
    const usadas = cols.filter((c) => m[c.id] != null), valores = {}, semPessoa = []; let invalidos = 0, total = 0;
    lido.linhas.forEach((l, i) => {
      const cpf = m.cpf != null ? String(l[m.cpf] || '').replace(/\D/g, '') : '', nome = m.nome != null ? dobrar(l[m.nome]) : '', p = (cpf && porCpf.get(cpf)) || (nome && porNome.get(nome)) || null;
      if (!p) { semPessoa.push(i + 2); return; }
      for (const c of usadas) { const v = centavosDe(l[m[c.id]]); if (v == null) continue; if (Number.isNaN(v)) { invalidos++; continue; } (valores[p.id] = valores[p.id] || {})[c.id] = v; total += v; }
    });
    return { valores, achados: Object.keys(valores).length, semPessoa, invalidos, total, temIdentificacao: m.cpf != null || m.nome != null, temValor: usadas.length > 0 };
  }
  function importarAgora(r) {
    const jaTinha = Boolean(dados.meses[mesImp]);
    const fazer = () => { if (!gravar((d) => { d.meses[mesImp] = { importadoEm: new Date().toISOString(), arquivo: lido.nome, valores: r.valores }; })) return 'Não foi possível gravar neste aparelho.'; U.avisar('Realizado de ' + rotuloMes(mesImp) + ' importado: ' + r.achados + ' colaborador(es).'); lido = null; desenharImportacao(); return undefined; };
    if (jaTinha) U.confirmar('Substituir importação', rotuloMes(mesImp) + ' já tem valores importados. Importar de novo substitui o que estava.', 'Substituir', fazer, cores()); else fazer();
  }

  window.showFolhaCustos = abrirRelatorio; window.showFolhaImportacao = abrirImportacao;
  window.CicluzFolhaCustos = { abrirRelatorio, abrirImportacao, lerCsv, centavosDe };
})();
