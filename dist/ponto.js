/* PONTO ELETRÔNICO: IMPORTAÇÃO E CONFERÊNCIA (19/11/2026, pedido do Rodrigo).
   Lançamentos Colaboradores › DES - Ponto Eletrônico Importação.
   Lê a planilha (CSV) exportada do relógio de ponto e põe lado a lado, para cada colaborador e dia, o IDEALIZADO (o Horário / Escala
   vinculado ao colaborador naquele dia) e o REALIZADO (as quatro marcações: entrada, saída almoço, entrada, saída).
   Duas visões: por mês (todos os colaboradores, com o acumulado das diferenças) e por dia (um colaborador, dia a dia).
   Sinaliza: marcação fora da tolerância, marcação faltando, dia previsto sem marcação e marcação em dia de folga.
   Contas (só de horas, nenhuma de dinheiro): horas do dia = (saída − entrada) − (volta − saída do almoço); diferença = realizado − previsto.
   Só entram na soma os dias que o arquivo cobriu (dias em que alguém tem marcação) — dia ainda não importado não vira "sem marcação".
   A tolerância em minutos é escolhida na tela (começa em 0: qualquer minuto de diferença é sinalizado) e fica guardada neste aparelho.
   Dados: cicluz-ponto-v1 = { version:1, marcacoes: { <id do colaborador>: { 'AAAA-MM-DD': [e1, s1, e2, s2] } } } (horas 'HH:MM' ou '').
   É dado real de pessoas: fica só neste aparelho e nunca entra em teste, print ou log. */
(() => {
  'use strict';
  const U = window.CicluzComprasUI, F = window.CicluzFolhaCustos; if (!U || !F) return;
  const { el } = U;
  const KEY = 'cicluz-ponto-v1', PREF = 'cicluz-ponto-tolerancia';
  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const MARCAS = ['Entrada', 'Saída almoço', 'Entrada', 'Saída'];
  const CAMPOS = [['cpf', 'CPF do colaborador', 'É por ele que a linha é ligada ao cadastro. Sem CPF, vale o nome escrito igual.'], ['nome', 'Nome do colaborador'], ['data', 'Data *'], ['e1', 'Entrada'], ['s1', 'Saída almoço'], ['e2', 'Entrada (volta do almoço)'], ['s2', 'Saída']];
  const cores = () => ({ cor: U.corOrigem('despesas', '#ef4444'), corTexto: '#a11c1c' });
  const dobrar = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const dois = (n) => String(n).padStart(2, '0');

  /* ---------- Dados ---------- */
  let dados = { version: 1, marcacoes: {} }, falhou = false;
  function carregar() { try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) { if (s.version !== 1 || typeof s.marcacoes !== 'object' || !s.marcacoes) throw new Error('formato'); dados = s; } falhou = false; } catch (e) { falhou = true; } }
  function gravar(mudar) { if (falhou) return false; const antes = JSON.stringify(dados); try { mudar(dados); localStorage.setItem(KEY, JSON.stringify(dados)); return true; } catch (e) { dados = JSON.parse(antes); return false; } }
  function pessoas() { const P = window.CicluzPeople; if (!P) return []; P.load(); return (P.get().people || []).map((p) => ({ id: p.id, nome: p.name, cpf: String(p.cpf || '').replace(/\D/g, ''), cargo: p.jobName || '', ativo: p.status === 'ATIVO' })); }
  const tolerancia = () => { try { const n = parseInt(localStorage.getItem(PREF) || '0', 10); return Number.isInteger(n) && n >= 0 && n <= 120 ? n : 0; } catch (e) { return 0; } };

  /* ---------- Horas ---------- */
  const minutos = (t) => { const m = /^(\d{2}):(\d{2})$/.exec(t || ''); return m && +m[1] < 24 && +m[2] < 60 ? +m[1] * 60 + +m[2] : null; };
  const vao = (a, b) => (minutos(b) - minutos(a) + 1440) % 1440;
  /** Horas trabalhadas no dia, em minutos; null quando falta marcação para fazer a conta. */
  function liquido(m) { if (!m || minutos(m[0]) == null || minutos(m[3]) == null) return null; if (!!m[1] !== !!m[2]) return null; if (m[1] && (minutos(m[1]) == null || minutos(m[2]) == null)) return null; return vao(m[0], m[3]) - (m[1] ? vao(m[1], m[2]) : 0); }
  const horas = (n, sinal) => { if (n == null) return '—'; const a = Math.abs(n); return (n < 0 ? '−' : sinal && n > 0 ? '+' : '') + Math.floor(a / 60) + 'h' + dois(a % 60); };
  /** "7:05", "07:05" ou "07:05:00" → "07:05"; vazio → ''; inválido → null. */
  function horaDe(texto) { const s = String(texto == null ? '' : texto).trim(); if (s === '' || s === '-' || s === '--:--') return ''; const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(s); if (!m || +m[1] > 23 || +m[2] > 59) return null; return dois(+m[1]) + ':' + m[2]; }
  /** "DD/MM/AAAA", "DD/MM/AA" ou "AAAA-MM-DD" → "AAAA-MM-DD"; inválido → null. */
  function dataDe(texto) {
    const s = String(texto == null ? '' : texto).trim().split(/[ T]/)[0]; let a, m, d; let r = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(s);
    if (r) { d = +r[1]; m = +r[2]; a = r[3].length === 2 ? 2000 + +r[3] : +r[3]; } else { r = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s); if (!r) return null; a = +r[1]; m = +r[2]; d = +r[3]; }
    const dt = new Date(a, m - 1, d); if (dt.getFullYear() !== a || dt.getMonth() !== m - 1 || dt.getDate() !== d || a < 2000 || a > 2100) return null; return a + '-' + dois(m) + '-' + dois(d);
  }
  const dataBR = (iso) => iso.slice(8) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);

  /* ---------- Idealizado × realizado ---------- */
  /** O que o Horário / Escala do colaborador previa para o dia: { sem } sem vínculo, { folga } dia de folga, ou { marcas, net }. */
  function ideal(pid, dia) {
    const J = window.CicluzJornada; let E = null; try { E = J && J.effective(pid, dia); } catch (e) { E = null; }
    if (!E || !E.shift || !E.scale) return { sem: true, marcas: ['', '', '', ''] };
    if (!(E.scale.days || []).includes(new Date(dia + 'T12:00:00').getDay())) return { folga: true, marcas: ['', '', '', ''] };
    const marcas = [E.shift.start || '', E.breakStart || '', E.breakEnd || '', E.shift.end || '']; return { marcas, net: liquido(marcas) };
  }
  const longe = (a, b, tol) => { const x = minutos(a), y = minutos(b); if (x == null || y == null) return true; return Math.abs(((y - x + 720 + 1440) % 1440) - 720) > tol; };
  /** Um dia de um colaborador. `conta` diz se o dia entra nas somas do mês. */
  function analisar(pid, dia, tol, coberto) {
    const I = ideal(pid, dia), real = (dados.marcacoes[pid] || {})[dia] || null, temReal = !!real && real.some(Boolean), vazio = [false, false, false, false];
    const r = { ideal: I.marcas, real: real || ['', '', '', ''], div: vazio, netI: null, netR: null, dif: null, estado: '', alerta: false, conta: false, sem: !!I.sem };
    if (I.sem) { if (temReal) { r.netR = liquido(real); r.estado = 'Sem Horário / Escala vinculado'; } return r; }
    if (I.folga) { if (!temReal) { r.estado = 'Folga'; return r; } r.div = real.map(Boolean); r.netI = 0; r.netR = liquido(real) || 0; r.estado = 'Marcação em dia de folga'; r.alerta = true; r.conta = true; r.dif = r.netR; return r; }
    r.netI = I.net;
    if (!temReal) { if (!coberto) return r; r.div = I.marcas.map(Boolean); r.netR = 0; r.estado = 'Sem marcação'; r.alerta = true; r.conta = true; r.dif = I.net == null ? null : -I.net; return r; }
    r.div = I.marcas.map((h, i) => (h || real[i]) ? (!h || !real[i] || longe(h, real[i], tol)) : false);
    const net = liquido(real); r.netR = net || 0; r.conta = true; r.dif = I.net == null ? null : r.netR - I.net;
    if (net == null) { r.estado = 'Marcação incompleta'; r.alerta = true; } else if (r.div.some(Boolean)) { r.estado = 'Divergente'; r.alerta = true; } else r.estado = 'Conforme';
    return r;
  }
  const diasDoMes = (ym) => { const n = new Date(+ym.slice(0, 4), +ym.slice(5), 0).getDate(), l = []; for (let d = 1; d <= n; d++) l.push(ym + '-' + dois(d)); return l; };
  const cobertos = (ym) => { const s = new Set(); for (const pid of Object.keys(dados.marcacoes)) for (const dia of Object.keys(dados.marcacoes[pid])) if (dia.startsWith(ym) && dados.marcacoes[pid][dia].some(Boolean)) s.add(dia); return s; };
  function resumo(pid, ym, tol, cob) {
    const t = { previstos: 0, comMarcacao: 0, divergentes: 0, netI: 0, netR: 0, dif: 0, semHorario: false, semVinculo: true, dias: [] };
    for (const dia of diasDoMes(ym)) { const a = analisar(pid, dia, tol, cob.has(dia)); t.dias.push([dia, a]); if (!a.sem) t.semVinculo = false; if (a.real.some(Boolean)) t.comMarcacao++; if (a.estado === 'Sem Horário / Escala vinculado') t.semHorario = true; if (!a.conta) continue; if (a.netI) t.previstos++; if (a.alerta) t.divergentes++; t.netI += a.netI || 0; t.netR += a.netR || 0; t.dif += a.dif || 0; }
    return t;
  }

  /* ---------- Painel ---------- */
  const rotuloMes = (ym) => MESES[+ym.slice(5) - 1] + ' ' + ym.slice(0, 4);
  const mesHoje = () => { const d = new Date(); return d.getFullYear() + '-' + dois(d.getMonth() + 1); };
  const andarMes = (ym, n) => { const d = new Date(+ym.slice(0, 4), +ym.slice(5) - 1 + n, 1); return d.getFullYear() + '-' + dois(d.getMonth() + 1); };
  const redondo = (rotulo, d, acao) => { const b = el('button', 'shortcut-circle compras-redondo'); b.type = 'button'; b.title = rotulo; b.setAttribute('aria-label', rotulo); b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/></svg>'; b.onclick = acao; return b; };
  const cab = (classe, texto, colSpan, rowSpan) => { const th = el('th', classe, texto); th.scope = colSpan > 1 ? 'colgroup' : 'col'; if (colSpan > 1) th.colSpan = colSpan; if (rowSpan > 1) th.rowSpan = rowSpan; return th; };
  const cel = (texto, alerta, extra) => el('td', 'ponto-hora' + (extra || '') + (alerta ? ' folha-dif diferente' : ''), texto || '—');
  const linhaNome = (titulo, detalhe) => { const th = el('th', 'folha-pessoa'); th.scope = 'row'; const m = el('div', 'folha-pessoa-miolo'); m.append(el('span', null, titulo), el('small', null, detalhe)); th.append(m); return th; };

  let tela = null, mes = mesHoje(), pessoaId = '', lido = null;
  function abrir() {
    if (!tela) tela = U.criarTela({ id: 'ponto-eletronico', titulo: 'DES - Ponto Eletrônico Importação', caminho: 'Saídas · Despesas / Lançamentos Colaboradores / DES - Ponto Eletrônico Importação', icone: 'cadastro', voltar: () => menuBack(2, 'Lançamentos Colaboradores')(), ...cores() });
    tela.ativar(); carregar(); if (window.CicluzJornada) window.CicluzJornada.load(); lido = null; desenhar();
  }
  function desenhar() { if (lido) desenharImportacao(); else desenharPainel(); }
  function desenharPainel() {
    const tol = tolerancia(), cob = cobertos(mes), todos = pessoas(), gente = todos.filter((p) => p.ativo || dados.marcacoes[p.id]).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    if (pessoaId && !gente.some((p) => p.id === pessoaId)) pessoaId = '';
    const barra = el('div', 'folha-barra ponto-barra'), mesBox = el('div', 'folha-mes'), rot = el('b', null, rotuloMes(mes)); rot.setAttribute('aria-live', 'polite');
    mesBox.append(redondo('Mês anterior', 'm15 6-6 6 6 6', () => { mes = andarMes(mes, -1); desenhar(); }), rot, redondo('Próximo mês', 'm9 6 6 6-6 6', () => { mes = andarMes(mes, 1); desenhar(); }));
    const selPessoa = U.seletor(gente.map((p) => [p.id, p.nome]), pessoaId, 'Todos (resumo do mês)'); selPessoa.onchange = () => { pessoaId = selPessoa.value; desenhar(); };
    const campoTol = U.entrada('text', String(tol), { inputMode: 'numeric', maxLength: 3 }); campoTol.oninput = () => { campoTol.value = campoTol.value.replace(/\D/g, '').slice(0, 3); };
    campoTol.onchange = () => { const n = Math.min(120, parseInt(campoTol.value || '0', 10) || 0); try { localStorage.setItem(PREF, String(n)); } catch (e) { /* preferência do aparelho */ } desenhar(); };
    const arquivo = el('input'); arquivo.type = 'file'; arquivo.accept = '.csv,text/csv,text/plain'; arquivo.hidden = true; arquivo.setAttribute('aria-label', 'Arquivo do ponto (CSV)');
    arquivo.onchange = () => { const f = arquivo.files && arquivo.files[0]; if (!f) return; const fr = new FileReader(); fr.onload = () => { const r = F.lerCsv(fr.result); if (!r.titulos.length || !r.linhas.length) { U.avisar('Não achei linhas nesse arquivo. Confira se é uma planilha em CSV com títulos na primeira linha.'); return; } lido = { nome: f.name, ...r, mapa: sugerir(r.titulos) }; desenhar(); }; fr.onerror = () => U.avisar('Não foi possível ler o arquivo.'); fr.readAsText(f); };
    const importar = U.botaoTitulo('Importar Ponto', 'Escolher a planilha (CSV) exportada do relógio de ponto', () => arquivo.click(), '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>');
    const filtros = el('div', 'ponto-filtros'); filtros.append(U.campo('Colaborador', selPessoa), U.campo('Tolerância (min)', campoTol));
    barra.append(mesBox, filtros, importar, arquivo);
    const corpo = [barra, U.nota('Idealizado é o Horário / Escala vinculado ao colaborador em cada dia; Realizado é o que veio do relógio de ponto. Fica marcado o que passa da tolerância, a marcação que falta, o dia previsto sem marcação e a marcação em dia de folga. O arquivo é lido só neste aparelho.')];
    if (falhou) corpo.push(el('p', 'people-alert', 'Não foi possível ler as marcações salvas neste aparelho. Nada será gravado para não sobrescrever.'));
    const caixa = el('div', 'matriz-uniformes folha-quadro'); let sec;
    if (!pessoaId) {
      sec = U.secao('Ponto — ' + rotuloMes(mes), undefined, U.pontaDaLista(gente.length, gente.length + (gente.length === 1 ? ' colaborador' : ' colaboradores')));
      if (!gente.length) caixa.append(U.vazio('Nenhum colaborador ativo.', 'Cadastre os colaboradores em Cadastros Geral Colaboradores.'));
      else if (!cob.size) caixa.append(U.vazio('Nenhuma marcação em ' + rotuloMes(mes) + '.', 'Use "Importar Ponto" para trazer a planilha do relógio.'));
      else {
        const t = el('table', 'folha-tabela ponto-tabela ponto-resumo'), th = el('thead'), l1 = el('tr'), tb = el('tbody'), tf = el('tfoot');
        l1.append(cab('folha-canto', 'Colaborador'), ...['Dias previstos', 'Dias com marcação', 'Dias com divergência', 'Previsto', 'Realizado', 'Diferença acumulada'].map((x) => cab('folha-grupo', x))); th.append(l1);
        const g = { p: 0, m: 0, d: 0, i: 0, r: 0, dif: 0 };
        for (const p of gente) { const s = resumo(p.id, mes, tol, cob), tr = el('tr', 'ponto-linha'); tr.title = 'Ver dia a dia'; tr.onclick = () => { pessoaId = p.id; desenhar(); };
          tr.append(linhaNome(p.nome, s.semVinculo ? 'Sem Horário / Escala vinculado' : p.cargo || 'Cargo não informado'), cel(s.semVinculo ? '' : String(s.previstos)), cel(String(s.comMarcacao)), cel(s.semVinculo ? '' : String(s.divergentes), s.divergentes > 0), cel(s.semVinculo ? '' : horas(s.netI)), cel(s.semVinculo ? '' : horas(s.netR)), cel(s.semVinculo ? '' : horas(s.dif, true), s.dif !== 0));
          tb.append(tr); g.p += s.previstos; g.m += s.comMarcacao; g.d += s.divergentes; g.i += s.netI; g.r += s.netR; g.dif += s.dif; }
        const rod = el('tr'), rt = el('th', 'folha-pessoa', 'Total do mês'); rt.scope = 'row'; rod.append(rt, cel(String(g.p), false, ' folha-total'), cel(String(g.m), false, ' folha-total'), cel(String(g.d), false, ' folha-total'), cel(horas(g.i), false, ' folha-total'), cel(horas(g.r), false, ' folha-total'), cel(horas(g.dif, true), false, ' folha-total'));
        tf.append(rod); t.append(th, tb, tf); caixa.append(t);
      }
    } else {
      const p = gente.find((x) => x.id === pessoaId), s = resumo(p.id, mes, tol, cob);
      sec = U.secao('Ponto — ' + p.nome + ' · ' + rotuloMes(mes), undefined, U.pontaDaLista(s.divergentes, s.divergentes + (s.divergentes === 1 ? ' dia com divergência' : ' dias com divergência')));
      const t = el('table', 'folha-tabela ponto-tabela ponto-dias'), th = el('thead'), l1 = el('tr'), l2 = el('tr'), tb = el('tbody'), tf = el('tfoot');
      l1.append(cab('folha-canto', 'Dia', 1, 2), ...MARCAS.map((x) => cab('folha-grupo', x, 2)), cab('folha-grupo folha-total', 'Horas do dia', 3), cab('folha-grupo ponto-situacao', 'Situação', 1, 2));
      for (let i = 0; i < 4; i++) l2.append(cab('folha-sub', 'Idealizado'), cab('folha-sub', 'Realizado')); l2.append(cab('folha-sub', 'Previsto'), cab('folha-sub', 'Realizado'), cab('folha-sub', 'Diferença')); th.append(l1, l2);
      for (const [dia, a] of s.dias) { const tr = el('tr'); tr.append(linhaNome(dia.slice(8) + '/' + dia.slice(5, 7), SEMANA[new Date(dia + 'T12:00:00').getDay()]));
        for (let i = 0; i < 4; i++) tr.append(cel(a.ideal[i]), cel(a.real[i], a.div[i]));
        tr.append(cel(a.conta || a.netI != null ? horas(a.netI) : '', false, ' folha-total'), cel(a.conta ? horas(a.netR) : '', false, ' folha-total'), cel(a.conta ? horas(a.dif, true) : '', a.conta && !!a.dif, ' folha-total'), el('td', 'ponto-estado' + (a.alerta ? ' folha-dif diferente' : ''), a.estado || '—')); tb.append(tr); }
      const rod = el('tr'), rt = el('th', 'folha-pessoa', 'Total do mês'); rt.scope = 'row'; const meio = el('td', 'ponto-hora folha-total', s.previstos + ' dia(s) previsto(s) · ' + s.comMarcacao + ' com marcação'); meio.colSpan = 8;
      rod.append(rt, meio, cel(horas(s.netI), false, ' folha-total'), cel(horas(s.netR), false, ' folha-total'), cel(horas(s.dif, true), s.dif !== 0, ' folha-total'), el('td', 'ponto-estado folha-total', s.divergentes + ' com divergência')); tf.append(rod); t.append(th, tb, tf); caixa.append(t);
    }
    sec.append(caixa); corpo.push(sec);
    const noMes = Object.keys(dados.marcacoes).filter((pid) => (!pessoaId || pid === pessoaId) && Object.keys(dados.marcacoes[pid]).some((d) => d.startsWith(mes)));
    if (noMes.length && !falhou) { const acoes = el('div', 'actions'), alvo = pessoaId ? 'deste colaborador em ' + rotuloMes(mes) : 'de ' + rotuloMes(mes);
      acoes.append(U.botao('Excluir marcações ' + alvo, () => U.confirmar('Excluir marcações', 'As marcações ' + alvo + ' serão apagadas deste aparelho. O arquivo do relógio não é alterado.', 'Excluir', () => { if (!gravar((d) => { for (const pid of noMes) { for (const dia of Object.keys(d.marcacoes[pid])) if (dia.startsWith(mes)) delete d.marcacoes[pid][dia]; if (!Object.keys(d.marcacoes[pid]).length) delete d.marcacoes[pid]; } })) return 'Não foi possível excluir. Tente de novo.'; U.avisar('Marcações excluídas.'); desenhar(); return undefined; }, cores()), 'btn ghost')); corpo.push(acoes); }
    tela.body.replaceChildren(...corpo);
  }

  /* ---------- Importação ---------- */
  /** Sugere a coluna do arquivo para cada campo, pelo título parecido; o usuário confere e ajusta. */
  function sugerir(titulos) {
    const t = titulos.map(dobrar), usadas = new Set(), achar = (...pistas) => { const i = t.findIndex((x, k) => !usadas.has(k) && pistas.some((p) => x.includes(p))); if (i < 0) return null; usadas.add(i); return i; };
    const m = { cpf: achar('cpf'), nome: achar('nome', 'colaborador', 'funcionario'), data: achar('data', 'dia') };
    m.s1 = achar('saida almoco', 'saida 1', 'saida1', 'saida intervalo', 'inicio intervalo'); m.e2 = achar('entrada 2', 'entrada2', 'retorno', 'volta', 'fim intervalo'); m.e1 = achar('entrada'); m.s2 = achar('saida'); return m;
  }
  function conferir() {
    const gente = pessoas(), porCpf = new Map(gente.filter((p) => p.cpf).map((p) => [p.cpf, p])), porNome = new Map(gente.map((p) => [dobrar(p.nome), p])), m = lido.mapa;
    const novas = {}, semPessoa = [], dataRuim = []; let horaRuim = 0, dias = 0, de = '', ate = '', substitui = 0;
    lido.linhas.forEach((l, i) => {
      const cpf = m.cpf != null ? String(l[m.cpf] || '').replace(/\D/g, '') : '', nome = m.nome != null ? dobrar(l[m.nome]) : '', p = (cpf && porCpf.get(cpf)) || (nome && porNome.get(nome)) || null;
      if (!p) { semPessoa.push(i + 2); return; }
      const dia = m.data != null ? dataDe(l[m.data]) : null; if (!dia) { dataRuim.push(i + 2); return; }
      const marcas = ['e1', 's1', 'e2', 's2'].map((k) => { if (m[k] == null) return ''; const h = horaDe(l[m[k]]); if (h == null) { horaRuim++; return ''; } return h; });
      if (!marcas.some(Boolean)) return;
      if (!(novas[p.id] = novas[p.id] || {})[dia]) dias++; novas[p.id][dia] = marcas; if (!de || dia < de) de = dia; if (!ate || dia > ate) ate = dia;
    });
    for (const pid of Object.keys(novas)) for (const dia of Object.keys(novas[pid])) if ((dados.marcacoes[pid] || {})[dia]) substitui++;
    return { novas, achados: Object.keys(novas).length, dias, de, ate, semPessoa, dataRuim, horaRuim, substitui, temIdentificacao: m.cpf != null || m.nome != null, temData: m.data != null, temHora: ['e1', 's1', 'e2', 's2'].some((k) => m[k] != null) };
  }
  function desenharImportacao() {
    const corpo = [U.nota('Confira qual coluna do arquivo é o quê. Uma linha por colaborador e por dia, com as quatro marcações. Importar de novo um dia que já tem marcação substitui só aquele dia.')];
    const q1 = el('fieldset', 'compras-fieldset'); q1.append(el('legend', null, '1. Arquivo'), el('small', 'profiles-note compras-largo', 'Arquivo: ' + lido.nome + ' — ' + lido.linhas.length + ' linha(s).')); corpo.push(q1);
    const q2 = el('fieldset', 'compras-fieldset'); q2.append(el('legend', null, '2. Qual coluna do arquivo é o quê'));
    const opc = lido.titulos.map((t, i) => [String(i), t || 'Coluna ' + (i + 1)]);
    for (const [chave, rotulo, dica] of CAMPOS) { const s = U.seletor(opc, lido.mapa[chave] == null ? '' : String(lido.mapa[chave]), 'Não tem no arquivo'); s.onchange = () => { lido.mapa[chave] = s.value === '' ? null : +s.value; desenhar(); }; q2.append(U.campo(rotulo, s, dica)); }
    corpo.push(q2);
    const r = conferir(), q3 = el('fieldset', 'compras-fieldset'); q3.append(el('legend', null, '3. Conferência'));
    const itens = el('dl', 'profiles-info compras-largo'); const par = (k, v) => itens.append(el('dt', null, k), el('dd', null, v));
    par('Linhas do arquivo', String(lido.linhas.length)); par('Colaboradores encontrados no cadastro', String(r.achados)); par('Dias com marcação a importar', String(r.dias)); par('Período', r.de ? dataBR(r.de) + ' a ' + dataBR(r.ate) : '—');
    par('Linhas sem colaborador no cadastro', String(r.semPessoa.length)); par('Linhas com data que não foi entendida', String(r.dataRuim.length)); par('Horas que não foram entendidas', String(r.horaRuim)); par('Dias já importados que serão substituídos', String(r.substitui));
    q3.append(itens);
    const linhasDe = (l) => l.slice(0, 12).join(', ') + (l.length > 12 ? '…' : '');
    if (r.semPessoa.length) q3.append(el('p', 'people-alert compras-largo', r.semPessoa.length + ' linha(s) não serão importadas porque o colaborador não foi encontrado no cadastro (CPF ou nome diferentes). Linhas: ' + linhasDe(r.semPessoa) + '.'));
    if (r.dataRuim.length) q3.append(el('p', 'people-alert compras-largo', r.dataRuim.length + ' linha(s) não serão importadas porque a data não foi entendida (use DD/MM/AAAA). Linhas: ' + linhasDe(r.dataRuim) + '.'));
    if (!r.temIdentificacao) q3.append(el('p', 'people-alert compras-largo', 'Indique a coluna do CPF ou a do nome do colaborador.'));
    else if (!r.temData) q3.append(el('p', 'people-alert compras-largo', 'Indique a coluna da data.'));
    else if (!r.temHora) q3.append(el('p', 'people-alert compras-largo', 'Indique ao menos uma coluna de marcação.'));
    const acoes = el('div', 'actions compras-largo'), cancelar = U.botao('Cancelar', () => { lido = null; desenhar(); }, 'btn ghost'), importar = U.botao('Importar', () => importarAgora(r), 'btn'); importar.disabled = !(r.temIdentificacao && r.temData && r.temHora && r.dias > 0) || falhou;
    acoes.append(cancelar, importar); q3.append(acoes); corpo.push(q3); tela.body.replaceChildren(...corpo);
  }
  function importarAgora(r) {
    const fazer = () => { if (!gravar((d) => { for (const pid of Object.keys(r.novas)) d.marcacoes[pid] = { ...(d.marcacoes[pid] || {}), ...r.novas[pid] }; })) return 'Não foi possível gravar neste aparelho.'; U.avisar('Ponto importado: ' + r.dias + ' dia(s) de ' + r.achados + ' colaborador(es).'); if (r.ate) mes = r.ate.slice(0, 7); lido = null; desenhar(); return undefined; };
    if (r.substitui) U.confirmar('Substituir marcações', r.substitui + ' dia(s) já têm marcação importada. Importar de novo substitui esses dias.', 'Substituir', fazer, cores()); else fazer();
  }

  window.showPontoEletronico = abrir;
  window.CicluzPonto = { abrir, horaDe, dataDe, liquido, analisar };
})();
