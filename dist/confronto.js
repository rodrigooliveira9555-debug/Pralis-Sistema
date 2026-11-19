/*
 * DES - Confronto de Ponto (Saídas · Despesas / Lançamentos). Só o ponto: a folha de pagamento é outra tela (folha-mes.js, em Relatórios).
 * Uma tela só, por competência (mês), em cinco etapas:
 *   1 Importar  — traz o realizado da Conplus (CSV) e mostra o que vai entrar e o que será ignorado.
 *   2 Conferir  — painel por colaborador: quantas divergências, a maior diferença, dias sem batida, situação. Tolerância do DP.
 *   3 Detalhar  — o colaborador no mês (ou o dia de todos): as 4 batidas, Idealizado × Realizado × Diferença.
 *   4 Tratar    — cada divergência é conferida ou justificada (com motivo) pelo DP.
 *   5 Fechar    — só fecha sem pendência; congela a tolerância; dá para reabrir.
 * Regras (divergência, tolerância, tratamento, fechamento) em ponto-dominio.js, testadas. Aqui só apresentação e armazenamento.
 * Dado em cicluz-ponto-v1, só neste navegador, não sincronizado: batida de ponto é dado pessoal (P-32).
 */
(function () {
  'use strict';
  const U = window.CicluzComprasUI; const D = window.CicluzPontoDominio;
  if (!U || !D) return;
  const { el } = U;
  const KEY = 'cicluz-ponto-v1';
  const COR = '#ef4444'; const COR_TEXTO = '#9c1c1c'; // Saídas · Despesas
  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const ICONE_PESSOA = '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0"/>';
  const ICONE_ARQUIVO = '<path d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6"/>';
  const ICONE_ALERTA = '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/>';
  const ICONE_OK = '<path d="m5 12 4 4L19 7"/>';
  const SITUACAO_DIA = { trabalho: '', folga: 'Folga', semEscala: 'Sem escala vinculada' };
  const SITUACAO_PAINEL = { semImportacao: 'Sem importação', semDivergencia: 'Sem divergência', tratado: 'Tratado' };
  const pad = (n) => String(n).padStart(2, '0');

  /* ---------------------------------------------------------------- armazenamento */
  let dados = null; let erroLeitura = false;
  function carregar() {
    erroLeitura = false;
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (s) { if (s.version !== 1 || typeof s.realizado !== 'object' || !Array.isArray(s.importacoes)) throw new Error('formato'); return D.normalizar(s); }
    } catch (e) { erroLeitura = true; }
    return D.vazio();
  }
  function salvar(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); dados = d; return true; } catch (e) { U.avisar('Não foi possível salvar neste navegador.'); return false; } }

  /* ---------------------------------------------------------------- dados do restante do sistema */
  const gente = () => { const P = window.CicluzPeople; if (!P) return []; P.load(); return P.get().people.filter((p) => p.status === 'ATIVO').sort((a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR')); };
  function porCpf() { const P = window.CicluzPeople; const m = new Map(); if (!P) return m; P.load(); P.get().people.forEach((p) => { const c = D.soDigitos(p.cpf); if (c.length === 11) m.set(c, p.id); }); return m; }
  const jornada = () => { const J = window.CicluzJornada; if (J) J.load(); return J || null; };
  const hojeIso = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const voltarLancamentos = () => { if (typeof menuBack === 'function') menuBack(2, 'Lançamentos')(); };
  const minTexto = (n) => (n < 60 ? n + ' min' : Math.floor(n / 60) + 'h' + pad(n % 60));
  const diaCurto = (iso) => D.diaDaSemana(iso) + ' ' + D.dataBR(iso).slice(0, 5);

  /* ---------------------------------------------------------------- estado da tela */
  let tela = null; let versao = 0; let previa = null;
  const agora = new Date();
  const est = { etapa: 0, ano: agora.getFullYear(), mes: agora.getMonth(), modo: 'mes', dia: hojeIso(), pessoaId: '', filtro: 'pendentes', filtroPessoa: '' };
  const compKey = () => est.ano + '-' + pad(est.mes + 1);
  const diasMes = () => D.diasDoMes(est.ano, est.mes);
  function somarMes(n) {
    const t = est.ano * 12 + est.mes + n; est.ano = Math.floor(t / 12); est.mes = ((t % 12) + 12) % 12;
    const dias = diasMes(); const n0 = Number(est.dia.slice(8, 10)) || 1; est.dia = dias[Math.min(n0, dias.length) - 1];
  }

  /* ---------------------------------------------------------------- tabela das batidas (grade agrupada .tg-*) */
  const traco = () => el('span', 'tg-vazio', '—');
  function celula(conteudo, extra) { const c = el('span', 'tg-cel tg-num' + (extra ? ' ' + extra : '')); c.append(conteudo); return c; }
  function pendente(texto, dica) { const s = el('span', 'tg-pendente', texto); s.title = dica; return s; }
  function celulasDaBatida(b, cmp, tol) {
    const dado = cmp.batidas[b.chave];
    const ideal = celula(dado.ideal ? document.createTextNode(dado.ideal) : traco(), 'tg-ini');
    let real;
    if (dado.real) real = document.createTextNode(dado.real);
    else if (cmp.situacao === 'trabalho' && !cmp.temRealizado) real = pendente('Pendente', 'Ainda não há batida importada para este dia');
    else if (cmp.temRealizado && dado.ideal) real = pendente('Ausente', 'O arquivo importado não trouxe esta batida');
    else real = traco();
    let dif = traco();
    if (dado.dif != null) {
      const fora = Math.abs(dado.dif) > tol;
      dif = el('span', dado.dif === 0 ? '' : fora ? 'tg-dif' : 'tg-dentro', D.textoDiferenca(dado.dif));
      if (dado.dif !== 0 && !fora) dif.title = 'Dentro da tolerância de ' + tol + ' min';
    }
    return [ideal, celula(real), celula(dif)];
  }
  /** linhas: [{ primeira: Node, cmp, classe }]. */
  function tabela(primeiraColuna, linhas, tol) {
    const rolagem = el('div', 'tg-rolagem'); U.arrastarParaRolar(rolagem);
    const grade = el('div', 'tg-grade'); grade.style.setProperty('--tg-grupos', String(D.BATIDAS.length));
    grade.setAttribute('role', 'table');
    const cab1 = el('div', 'tg-linha'); const cab2 = el('div', 'tg-linha');
    cab1.append(el('span', 'tg-cel tg-cab tg-colab', primeiraColuna));
    D.BATIDAS.forEach((b) => {
      cab1.append(el('span', 'tg-cel tg-cab tg-grupo', b.rotulo));
      ['Idealizado', 'Realizado', 'Diferença'].forEach((t, i) => cab2.append(el('span', 'tg-cel tg-cab tg-sub' + (i === 0 ? ' tg-ini' : ''), t)));
    });
    grade.append(cab1, cab2);
    linhas.forEach((l) => {
      const lin = el('div', 'tg-linha' + (l.classe ? ' ' + l.classe : '')); lin.setAttribute('role', 'row');
      lin.append(l.primeira);
      D.BATIDAS.forEach((b) => lin.append(...celulasDaBatida(b, l.cmp, tol)));
      grade.append(lin);
    });
    rolagem.append(grade);
    return rolagem;
  }
  /** Informação do dia: comparação, divergência (se houver) e tratamento. */
  function infoDia(J, painel, pessoaId, dia, hoje) {
    const cmp = D.comparar(J, dados, pessoaId, dia);
    const av = D.avaliarDia(cmp, painel.tolerancia, painel.cobertura, dia, hoje);
    const trat = ((dados.tratamentos[painel.competencia] || {})[D.chaveItem(pessoaId, dia)]) || null;
    return { cmp, av, trat };
  }
  function legendaDia(i) {
    const partes = [];
    if (SITUACAO_DIA[i.cmp.situacao]) partes.push(SITUACAO_DIA[i.cmp.situacao]);
    if (i.av) partes.push(i.trat ? (i.trat.status === 'conferido' ? 'Conferido' : 'Justificado') : 'Divergência pendente');
    return partes.join(' · ');
  }
  function primeiraDia(dia, i) {
    const c = el('span', 'tg-cel tg-colab tg-dia'); c.append(el('b', null, diaCurto(dia)));
    const t = legendaDia(i); if (t) c.append(el('small', null, t));
    return c;
  }
  function primeiraPessoa(p, i) {
    const c = el('span', 'tg-cel tg-colab tg-nome');
    const ic = el('span', 'compras-linha-icone'); ic.innerHTML = U.svg(ICONE_PESSOA);
    const t = el('span', 'tg-nome-texto'); t.append(el('b', null, p.name || '(sem nome)'));
    const l = legendaDia(i); if (l) t.append(el('small', null, l));
    c.append(ic, t);
    return c;
  }
  const classeLinha = (i) => (i.av ? (i.trat ? 'tg-tratado' : 'tg-diverge') : '');

  /* ---------------------------------------------------------------- etapa 1: Importar */
  function baixarModelo() {
    const blob = new Blob(['﻿' + D.MODELO_CSV], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'modelo-ponto-conplus.csv';
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  async function lerArquivo(arq) {
    let texto;
    try { texto = await arq.text(); } catch (e) { U.avisar('Não foi possível ler o arquivo.'); return; }
    previa = { nome: arq.name, ...D.processar(texto, porCpf()) };
    desenhar();
  }
  function confirmarImportacao() {
    if (!previa || previa.erro || !previa.validas.length) return;
    if (erroLeitura) { U.avisar('Os dados de ponto deste navegador não puderam ser lidos; nada foi importado para não sobrescrevê-los.'); return; }
    const atual = carregar();
    const { dados: novo, novos, substituidos } = D.aplicar(atual, previa.validas, { arquivo: previa.nome, ignoradas: previa.problemas.length });
    if (!salvar(novo)) return;
    previa = null; est.etapa = 1;
    const p = D.painel(jornada(), novo, gente(), diasMes(), hojeIso());
    U.avisar('Importado: ' + novos + ' novo(s), ' + substituidos + ' substituído(s). ' + p.totais.divergentes + ' divergência(s) em ' + MESES[est.mes] + '.');
    desenhar();
  }
  function blocoArquivo(painel) {
    const sec = U.secao('Importar o realizado da Conplus');
    const corpo = el('div', 'compras-corpo');
    if (painel.fechada) { corpo.append(U.situacao('Competência fechada: reabra na etapa Fechar para importar.', 'atencao')); sec.append(corpo); return sec; }
    corpo.append(el('p', 'profiles-note', 'Arquivo CSV com uma linha por colaborador e dia. Colunas: CPF, Data (DD/MM/AAAA), Entrada, Saída intervalo, Retorno intervalo e Saída (HH:MM). O colaborador é achado pelo CPF do cadastro; o CPF não fica guardado. O arquivo pode ter dias de mais de um mês. Se o dia já tinha batida do colaborador, ela é substituída.'));
    const entrada = document.createElement('input'); entrada.type = 'file'; entrada.accept = '.csv,text/csv,text/plain'; entrada.hidden = true;
    entrada.onchange = () => { if (entrada.files && entrada.files[0]) lerArquivo(entrada.files[0]); entrada.value = ''; };
    const acoes = el('div', 'compras-enviar-acoes ponto-acoes');
    acoes.append(U.botao('Selecionar arquivo CSV', () => entrada.click(), 'btn'), U.botao('Baixar modelo', baixarModelo, 'btn secondary'), entrada);
    corpo.append(acoes); sec.append(corpo);
    return sec;
  }
  function blocoPrevia() {
    const sec = U.secao('Conferência antes de importar'); const corpo = el('div', 'compras-corpo');
    if (previa.erro) { corpo.append(U.situacao(previa.erro, 'atencao')); sec.append(corpo); return sec; }
    corpo.append(el('p', null, previa.nome));
    const chips = el('div', 'compras-chips');
    chips.append(U.situacao(previa.validas.length + ' linha(s) prontas para importar', 'positivo'), U.situacao(previa.problemas.length + ' ignorada(s) ou com aviso', previa.problemas.length ? 'atencao' : 'neutro'), U.situacao(previa.total + ' no arquivo', 'neutro'));
    corpo.append(chips);
    if (previa.problemas.length) {
      const lista = el('div', 'compras-lista');
      previa.problemas.slice(0, 50).forEach((p) => lista.append(U.linhaLista({ icone: ICONE_ARQUIVO, titulo: 'Linha ' + p.linha, detalhe: p.motivo })));
      corpo.append(lista);
      if (previa.problemas.length > 50) corpo.append(el('p', 'profiles-note', 'Mostrando as 50 primeiras de ' + previa.problemas.length + '.'));
    }
    const acoes = el('div', 'compras-enviar-acoes ponto-acoes');
    const ok = U.botao('Importar ' + previa.validas.length + ' linha(s)', confirmarImportacao, 'btn'); ok.disabled = !previa.validas.length;
    acoes.append(ok, U.botao('Cancelar', () => { previa = null; desenhar(); }, 'btn secondary'));
    corpo.append(acoes); sec.append(corpo);
    return sec;
  }
  function blocoIdealizado() {
    const sec = U.secao('Idealizado (Cicluz)'); const corpo = el('div', 'compras-corpo');
    const J = jornada(); const todos = gente();
    const com = J ? todos.filter((p) => J.current(p.id, 'shift') && J.current(p.id, 'scale')).length : 0;
    corpo.append(el('p', null, com + ' de ' + todos.length + ' colaborador(es) ativo(s) têm horário e escala vinculados.'));
    corpo.append(el('p', 'profiles-note', 'O idealizado não é importado: vem de DES - Lançamento de Horários e DES - Escalas de Folga. Colaborador sem horário e escala aparece como "Sem escala vinculada", sem diferença calculada.'));
    sec.append(corpo); return sec;
  }
  function blocoHistorico() {
    const imp = dados.importacoes;
    const sec = U.secao('Histórico de importações', undefined, U.pontaDaLista(imp.length, imp.length + ' importação(ões)'));
    if (!imp.length) { sec.append(U.vazio('Nenhuma importação ainda.', 'Selecione o arquivo da Conplus acima.')); return sec; }
    const lista = el('div', 'compras-lista');
    imp.forEach((i) => {
      const q = new Date(i.quando); const qt = isNaN(q) ? '' : q.toLocaleDateString('pt-BR') + ' ' + q.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      lista.append(U.linhaLista({
        icone: ICONE_ARQUIVO, titulo: i.arquivo || '(sem nome)', detalhe: qt + (i.de ? ' · período ' + D.dataBR(i.de) + ' a ' + D.dataBR(i.ate) : ''),
        direita: [U.situacao(i.novos + ' novos', 'positivo'), U.situacao(i.substituidos + ' substituídos', 'neutro'), ...(i.ignoradas ? [U.situacao(i.ignoradas + ' ignoradas', 'atencao')] : [])],
      }));
    });
    sec.append(lista); return sec;
  }
  function etapaImportar(painel) {
    const partes = [blocoArquivo(painel)];
    if (previa) partes.push(blocoPrevia());
    partes.push(blocoIdealizado(), blocoHistorico());
    return partes;
  }

  /* ---------------------------------------------------------------- etapa 2: Conferir */
  function blocoTolerancia(painel) {
    const entrada = document.createElement('input'); entrada.type = 'number'; entrada.min = '0'; entrada.max = String(D.TOLERANCIA_MAX); entrada.step = '1'; entrada.inputMode = 'numeric';
    entrada.value = String(painel.tolerancia); entrada.disabled = painel.fechada;
    entrada.onchange = () => {
      const r = D.definirTolerancia(dados, entrada.value, !painel.fechada);
      if (r.erro) { U.avisar(r.erro); entrada.value = String(painel.tolerancia); return; }
      if (salvar(r.dados)) desenhar();
    };
    return U.campo('Tolerância (minutos)', entrada, painel.fechada ? 'Competência fechada: a tolerância dela está congelada.' : 'Diferença até este valor não conta como divergência. Começa em 0 até o DP definir.');
  }
  function etapaConferir(painel, J, todos) {
    const partes = [];
    const topo = el('div', 'ponto-controles'); topo.append(blocoTolerancia(painel)); partes.push(topo);
    const chips = el('div', 'compras-chips');
    chips.append(U.situacao(painel.totais.colaboradores + ' colaborador(es)', 'neutro'), U.situacao(painel.totais.divergentes + ' divergência(s)', painel.totais.divergentes ? 'atencao' : 'neutro'), U.situacao(painel.totais.pendentes + ' pendente(s)', painel.totais.pendentes ? 'atencao' : 'neutro'), U.situacao(painel.totais.tratados + ' tratada(s)', 'positivo'));
    partes.push(chips);
    partes.push(U.nota(painel.cobertura ? 'Período importado em ' + MESES[est.mes] + ': ' + D.dataBR(painel.cobertura.de) + ' a ' + D.dataBR(painel.cobertura.ate) + ' (' + painel.cobertura.dias + ' dia(s) com batida). Dia de trabalho sem batida só conta dentro desse período e até hoje.' : 'Nada foi importado em ' + MESES[est.mes] + ' ' + est.ano + '. Importe o arquivo da Conplus na etapa 1 para conferir.'));
    const G = window.CicluzGPEntrada;
    if (!todos.length) { const v = U.secao('Colaboradores'); v.append(U.vazio('Nenhum colaborador cadastrado.', 'Os colaboradores ativos do cadastro aparecem aqui.')); partes.push(v); return partes; }
    const painelUI = G.criar({
      grade: 'grade-confronto', titulo: 'Colaboradores', preferencia: 'cicluz-confronto-colunas',
      colunas: [{ chave: 'nome', rotulo: 'Colaborador' }, { chave: 'dias', rotulo: 'Dias com batida', ocultavel: true }, { chave: 'diverg', rotulo: 'Divergências' }, { chave: 'maior', rotulo: 'Maior diferença' }, { chave: 'sembatida', rotulo: 'Sem batida', ocultavel: true }, { chave: 'estado', rotulo: 'Situação' }],
      nota: 'Toque numa linha para ver o colaborador dia a dia (etapa 3). A seta abre também o atalho para tratar as divergências dele.',
      contagem: (n) => n + (n === 1 ? ' colaborador' : ' colaboradores'), vazio: { titulo: 'Nenhum colaborador.', dica: '' },
      itens: () => painel.linhas.map((l) => ({
        id: l.pessoaId, nome: l.nome, icone: ICONE_PESSOA, rotuloIcone: 'Colaborador',
        celulas: { dias: String(l.diasComBatida), diverg: String(l.divergentes), maior: l.maior ? minTexto(l.maior) : '—', sembatida: String(l.semBatida) },
        estado: l.situacao === 'pendente' ? l.pendentes + ' pendente(s)' : SITUACAO_PAINEL[l.situacao],
        aoAbrir: () => { est.pessoaId = l.pessoaId; est.modo = 'mes'; est.etapa = 2; desenhar(); },
        extras: l.divergentes ? [{ rotulo: 'Tratar divergências de', caminho: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5v5.5M12 16.5v.01', aoClicar: () => { est.filtroPessoa = l.pessoaId; est.filtro = 'pendentes'; est.etapa = 3; desenhar(); } }] : [],
      })),
    });
    painelUI.desenhar(); partes.push(painelUI.no);
    return partes;
  }

  /* ---------------------------------------------------------------- etapa 3: Detalhar */
  function etapaDetalhar(painel, J, todos, hoje) {
    const controles = el('div', 'ponto-controles');
    controles.append(U.chips([['mes', 'Colaborador no mês'], ['dia', 'Dia (todos)']], est.modo, (v) => { est.modo = v; desenhar(); }));
    const partes = [controles];
    if (!todos.length) { const v = U.secao('Ponto'); v.append(U.vazio('Nenhum colaborador cadastrado.', 'Os colaboradores ativos do cadastro aparecem aqui.')); partes.push(v); return partes; }
    const dias = diasMes();
    const seletores = el('div', 'ponto-controles');
    if (est.modo === 'mes') {
      if (!todos.some((p) => p.id === est.pessoaId)) est.pessoaId = todos[0].id;
      const sel = U.seletor(todos.map((p) => [p.id, p.name]), est.pessoaId); sel.onchange = () => { est.pessoaId = sel.value; desenhar(); };
      seletores.append(U.campo('Colaborador', sel));
    } else {
      if (!dias.includes(est.dia)) est.dia = dias[0];
      const sel = U.seletor(dias.map((d) => [d, diaCurto(d)]), est.dia); sel.onchange = () => { est.dia = sel.value; desenhar(); };
      seletores.append(U.campo('Dia', sel));
    }
    partes.push(seletores);
    partes.push(U.nota('Idealizado: horário e escala do Cicluz. Realizado: batida importada da Conplus. Diferença: Realizado − Idealizado em minutos (+ depois do esperado, − antes); em negrito o que passa da tolerância de ' + painel.tolerancia + ' min. "Pendente" = dia sem batida importada; "Ausente" = o arquivo não trouxe a batida.'));
    if (est.modo === 'mes') {
      const p = todos.find((x) => x.id === est.pessoaId);
      const linhas = dias.map((d) => { const i = infoDia(J, painel, p.id, d, hoje); return { primeira: primeiraDia(d, i), cmp: i.cmp, classe: classeLinha(i) }; });
      const lin = painel.linhas.find((l) => l.pessoaId === p.id);
      const sec = U.secao('Dias de ' + p.name, undefined, U.pontaDaLista(dias.length, dias.length + ' dias'));
      sec.append(tabela('Dia', linhas, painel.tolerancia)); partes.push(sec);
      if (lin && lin.divergentes) {
        partes.push(U.nota(p.name + ': ' + lin.divergentes + ' divergência(s), ' + lin.pendentes + ' pendente(s).'));
        partes.push(U.botao('Tratar as divergências de ' + p.name, () => { est.filtroPessoa = p.id; est.filtro = 'pendentes'; est.etapa = 3; desenhar(); }, 'btn'));
      }
    } else {
      const linhas = todos.map((p) => { const i = infoDia(J, painel, p.id, est.dia, hoje); return { primeira: primeiraPessoa(p, i), cmp: i.cmp, classe: classeLinha(i) }; });
      const sec = U.secao('Colaboradores em ' + diaCurto(est.dia), undefined, U.pontaDaLista(todos.length, todos.length + (todos.length === 1 ? ' colaborador' : ' colaboradores')));
      sec.append(tabela('Colaborador', linhas, painel.tolerancia)); partes.push(sec);
    }
    return partes;
  }

  /* ---------------------------------------------------------------- etapa 4: Tratar */
  function justificar(item) {
    U.dialogo({
      titulo: 'Justificar divergência', subtitulo: item.nome + ' · ' + diaCurto(item.dia),
      montar: (form) => {
        form.append(el('p', 'profiles-note', item.itens.map((x) => x.rotulo + ': ' + x.motivo).join(' ')));
        const ta = document.createElement('textarea'); ta.maxLength = 200; ta.rows = 3;
        form.append(U.campo('Motivo *', ta));
        return { ta };
      },
      salvar: ({ ta }) => {
        const r = D.tratar(carregar(), compKey(), item.chave, 'justificado', ta.value);
        if (r.erro) return r.erro;
        if (!salvar(r.dados)) return 'Não foi possível salvar neste navegador.';
        desenhar();
        return undefined;
      },
      rotuloSalvar: 'Justificar',
    });
  }
  function conferir(item) {
    const r = D.tratar(carregar(), compKey(), item.chave, 'conferido', '');
    if (r.erro) { U.avisar(r.erro); return; }
    if (salvar(r.dados)) desenhar();
  }
  function desfazer(item) {
    const r = D.desfazer(carregar(), compKey(), item.chave);
    if (r.erro) { U.avisar(r.erro); return; }
    if (salvar(r.dados)) desenhar();
  }
  function etapaTratar(painel, J, todos, hoje) {
    const todas = D.pendencias(J, dados, todos, diasMes(), hoje);
    const abertas = todas.filter((x) => !x.tratamento).length;
    const controles = el('div', 'ponto-controles');
    controles.append(U.chips([['pendentes', 'Pendentes (' + abertas + ')'], ['tratadas', 'Tratadas (' + (todas.length - abertas) + ')'], ['todas', 'Todas (' + todas.length + ')']], est.filtro, (v) => { est.filtro = v; desenhar(); }));
    const sel = U.seletor(todos.map((p) => [p.id, p.name]), est.filtroPessoa, 'Todos os colaboradores'); sel.onchange = () => { est.filtroPessoa = sel.value; desenhar(); };
    controles.append(U.campo('Colaborador', sel));
    const partes = [controles];
    if (painel.fechada) partes.push(U.nota('Competência fechada: nenhuma divergência pode ser tratada. Reabra na etapa Fechar se precisar corrigir.'));
    let lista = todas.filter((x) => !est.filtroPessoa || x.pessoaId === est.filtroPessoa);
    lista = lista.filter((x) => est.filtro === 'todas' || (est.filtro === 'pendentes' ? !x.tratamento : !!x.tratamento));
    const sec = U.secao('Divergências', undefined, U.pontaDaLista(lista.length, lista.length + (lista.length === 1 ? ' divergência' : ' divergências')));
    if (!lista.length) sec.append(U.vazio(!painel.cobertura ? 'Nada importado nesta competência.' : todas.length ? 'Nenhuma divergência neste filtro.' : 'Nenhuma divergência.', !painel.cobertura ? 'Importe o arquivo da Conplus na etapa 1.' : ''));
    else {
      const box = el('div', 'compras-lista');
      lista.forEach((it) => {
        const direita = [];
        if (it.tratamento) {
          direita.push(U.situacao(it.tratamento.status === 'conferido' ? 'Conferido' : 'Justificado', 'positivo'));
          if (!painel.fechada) direita.push(U.botao('Desfazer', () => desfazer(it), 'btn secondary'));
        } else if (!painel.fechada) direita.push(U.botao('Conferido', () => conferir(it), 'btn secondary'), U.botao('Justificar', () => justificar(it), 'btn secondary'));
        const detalhe = it.itens.map((x) => x.rotulo + ': ' + x.motivo).join(' ') + (it.tratamento && it.tratamento.motivo ? ' Motivo: ' + it.tratamento.motivo : '');
        box.append(U.linhaLista({ icone: it.tratamento ? ICONE_OK : ICONE_ALERTA, titulo: it.nome + ' · ' + diaCurto(it.dia), detalhe, direita }));
      });
      sec.append(box);
    }
    partes.push(sec);
    return partes;
  }

  /* ---------------------------------------------------------------- etapa 5: Fechar */
  function itemCheck(ok, titulo, detalhe) { return U.linhaLista({ icone: ok ? ICONE_OK : ICONE_ALERTA, titulo, detalhe }); }
  function etapaFechar(painel) {
    const t = painel.totais; const partes = [];
    const sec = U.secao('Antes de fechar ' + MESES[est.mes] + ' ' + est.ano);
    const lista = el('div', 'compras-lista');
    lista.append(
      itemCheck(!!painel.cobertura, 'Ponto importado', painel.cobertura ? 'Período ' + D.dataBR(painel.cobertura.de) + ' a ' + D.dataBR(painel.cobertura.ate) + ' (' + painel.cobertura.dias + ' dia(s) com batida).' : 'Nada importado nesta competência.'),
      itemCheck(t.pendentes === 0 && !!painel.cobertura, 'Divergências tratadas', t.tratados + ' de ' + t.divergentes + ' tratada(s)' + (t.pendentes ? ' · ' + t.pendentes + ' pendente(s)' : '') + '.'),
      itemCheck(true, 'Tolerância usada', painel.tolerancia + ' min' + (painel.fechada ? ' (congelada no fechamento)' : '') + '.'),
    );
    sec.append(lista); partes.push(sec);
    const acao = U.secao(painel.fechada ? 'Competência fechada' : 'Fechamento'); const corpo = el('div', 'compras-corpo');
    if (painel.fechada) {
      const c = dados.competencias[painel.competencia]; const q = c && c.fechadaEm ? new Date(c.fechadaEm) : null;
      corpo.append(el('p', null, 'Fechada' + (q && !isNaN(q) ? ' em ' + q.toLocaleDateString('pt-BR') + ' às ' + q.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '') + '. Importação, tolerância e tratamento estão travados.'));
      corpo.append(U.botao('Reabrir competência', () => U.confirmar('Reabrir competência', 'A competência volta a aceitar importação e tratamento. Os tratamentos já feitos continuam.', 'Reabrir', () => { const r = D.reabrir(carregar(), compKey()); if (r.erro) return r.erro; if (salvar(r.dados)) desenhar(); return undefined; }), 'btn secondary'));
    } else {
      const pode = !!painel.cobertura && t.pendentes === 0;
      const b = U.botao('Fechar competência', () => U.confirmar('Fechar competência', 'Depois de fechada, a importação, a tolerância e o tratamento de ' + MESES[est.mes] + ' ficam travados (dá para reabrir). A tolerância de ' + painel.tolerancia + ' min fica registrada.', 'Fechar', () => { const r = D.fechar(carregar(), compKey(), t); if (r.erro) return r.erro; if (salvar(r.dados)) desenhar(); return undefined; }), 'btn');
      b.disabled = !pode;
      corpo.append(b);
      if (!pode) corpo.append(el('p', 'profiles-note', !painel.cobertura ? 'Para fechar: importe o ponto desta competência (etapa 1).' : 'Para fechar: trate as ' + t.pendentes + ' divergência(s) pendente(s) (etapa 4).'));
    }
    acao.append(corpo); partes.push(acao);
    return partes;
  }

  /* ---------------------------------------------------------------- tela */
  const ETAPAS = ['Importar', 'Conferir', 'Detalhar', 'Tratar', 'Fechar'];
  function desenhar() {
    if (!tela) return;
    const minha = ++versao; dados = carregar();
    const J = jornada(); const todos = gente(); const hoje = hojeIso();
    const painel = D.painel(J, dados, todos, diasMes(), hoje);
    const topo = el('div', 'confronto-topo');
    topo.append(U.navegadorPeriodo({ titulo: MESES[est.mes] + ' ' + est.ano, aoMudar: (n) => { somarMes(n); previa = null; desenhar(); } }), U.situacao(painel.fechada ? 'Competência fechada' : 'Competência aberta', painel.fechada ? 'neutro' : 'positivo'));
    const status = [painel.cobertura ? painel.cobertura.dias + ' dia(s)' : 'Nada importado', painel.totais.divergentes + ' divergência(s)', '', painel.totais.pendentes + ' pendente(s)', painel.fechada ? 'Fechada' : 'Aberta'];
    const barra = window.CicluzStepper.create({ steps: ETAPAS.map((l, i) => ({ label: l, status: status[i] })), current: est.etapa, label: 'Etapas do confronto', onSelect: (i) => { est.etapa = i; desenhar(); } });
    const partes = [topo, barra.el];
    if (erroLeitura) partes.push(U.nota('Não foi possível ler as batidas guardadas neste navegador. Nada foi apagado; as batidas importadas não aparecem e nenhuma importação será gravada até o dado ser recuperado.'));
    const corpo = est.etapa === 0 ? etapaImportar(painel) : est.etapa === 1 ? etapaConferir(painel, J, todos) : est.etapa === 2 ? etapaDetalhar(painel, J, todos, hoje) : est.etapa === 3 ? etapaTratar(painel, J, todos, hoje) : etapaFechar(painel);
    if (minha !== versao) return; // uma ação mais nova já redesenhou
    tela.body.replaceChildren(...partes, ...corpo);
  }
  function abrir() {
    if (!tela) tela = U.criarTela({ id: 'des-confronto', titulo: 'DES - Confronto de Ponto', caminho: 'Saídas · Despesas / Lançamentos / DES - Confronto de Ponto', icone: 'cadastro', voltar: voltarLancamentos, cor: COR, corTexto: COR_TEXTO });
    previa = null; tela.ativar(); desenhar();
  }

  window.CicluzConfronto = { abrir };
})();
