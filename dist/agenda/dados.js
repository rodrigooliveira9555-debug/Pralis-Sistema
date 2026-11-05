/*
 * Agenda — armazenamento e operações. Uma chave só no localStorage (cicluz-agenda-v1), que com login
 * vai para o banco pela sincronização do S2 (servidor/shared/src/documentos.ts).
 *
 * Abrir a Agenda não grava nada: listas e colunas iniciais existem só na memória até a primeira
 * alteração (com ids fixos, para dois aparelhos novos não criarem listas repetidas).
 * Campos acrescentados depois (repetição, alerta, término, URL, local, coluna, ordem, ícone da lista)
 * são opcionais: dado antigo sem eles continua válido e recebe o padrão só na memória.
 */
(function () {
  'use strict';
  const KEY = 'cicluz-agenda-v1';
  const D = window.CicluzAgendaDominio;

  /* As duas listas iniciais são os submenus de Agenda · Atividades no menu lateral. */
  const LISTAS_INICIAIS = [
    { id: 'lista-gestao-pessoas', nome: 'Gestão de Pessoas', cor: '#7c3aed', icone: 'pessoas', ordenacao: 'manual' },
    { id: 'lista-diretor-operacoes', nome: 'Diretor de Operações', cor: '#2563eb', icone: 'operacao', ordenacao: 'manual' },
  ];
  /* Colunas do Kanban (como o protótipo: A fazer, Em progresso; "Concluído" é fixa e marca como feito). */
  const COLUNAS_INICIAIS = [
    { id: 'col-a-fazer', nome: 'A fazer' },
    { id: 'col-em-progresso', nome: 'Em progresso' },
  ];
  const CONCLUIDO = 'concluido';
  const CORES_LISTA = ['#7c3aed', '#2563eb', '#16a34a', '#ea580c', '#dc2626', '#db2777', '#0891b2', '#ca8a04', '#52525b'];

  const novoId = (prefixo) => prefixo + '-' + (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const agoraIso = () => new Date().toISOString();
  const inicial = () => ({ versao: 1, listas: structuredClone(LISTAS_INICIAIS), colunas: structuredClone(COLUNAS_INICIAIS), itens: [] });
  const valido = (x) => x && Array.isArray(x.listas) && Array.isArray(x.itens);
  /** Completa, na memória, o que dado antigo não tem. Não grava. */
  function completar(x) {
    if (!Array.isArray(x.colunas) || !x.colunas.length) x.colunas = structuredClone(COLUNAS_INICIAIS);
    x.listas.forEach((l) => { if (!l.icone) l.icone = 'lista'; if (!l.ordenacao) l.ordenacao = 'manual'; });
    return x;
  }

  let dados = inicial();
  let erroLeitura = false;
  function ler() {
    try {
      const bruto = localStorage.getItem(KEY);
      if (!bruto) return inicial();
      const salvo = JSON.parse(bruto);
      if (!valido(salvo)) throw new Error('formato');
      return completar(salvo);
    } catch (e) {
      // Dado ilegível: não sobrescreve (nada é gravado enquanto erroLeitura for verdadeiro).
      erroLeitura = true;
      console.warn('Agenda: dado salvo ilegível; nada será gravado por cima', e);
      return inicial();
    }
  }
  dados = ler();

  /** Executa a mudança e grava só se algo mudou; se falhar, desfaz e devolve false. */
  function transacao(mudanca) {
    if (!erroLeitura) { const atual = ler(); if (!erroLeitura) dados = atual; }
    const antes = JSON.stringify(dados);
    try {
      if (erroLeitura) throw new Error('leitura');
      const r = mudanca(dados);
      const depois = JSON.stringify(dados);
      if (depois !== antes) {
        localStorage.setItem(KEY, depois);
        document.dispatchEvent(new CustomEvent('cicluz-agenda-mudou'));
      }
      return r === undefined ? true : r;
    } catch (e) {
      dados = JSON.parse(antes);
      console.warn('Agenda: alteração não salva', e);
      return false;
    }
  }

  // Outra aba (ou a sincronização) gravou: atualiza a memória e avisa a tela.
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    try {
      const novo = e.newValue ? JSON.parse(e.newValue) : inicial();
      if (valido(novo)) { dados = completar(novo); document.dispatchEvent(new CustomEvent('cicluz-agenda-mudou', { detail: { externo: true } })); }
    } catch (err) { /* ignora valor inválido */ }
  });

  /* ---------- Pessoas ---------- */
  // O S2 ainda não tem cadastro de usuários: vale quem está logado e a lista provisória de
  // responsáveis do S2 (a mesma do Compras, fonte única até existir o cadastro). PROJECT_BRAIN/11, P-18.
  function pessoas() {
    const lista = [];
    const perfil = window.CicluzSessao && window.CicluzSessao.perfil;
    if (perfil && perfil.usuarioId && perfil.usuarioId !== 'local') lista.push({ id: perfil.usuarioId, nome: perfil.nome || 'Eu' });
    const provisorios = (window.CicluzComprasDados && window.CicluzComprasDados.RESPONSAVEIS) || [];
    provisorios.forEach((p) => { if (!lista.some((x) => x.id === p.id)) lista.push({ id: p.id, nome: p.nome }); });
    return lista;
  }
  const nomePessoa = (id) => (id ? (pessoas().find((p) => p.id === id) || { nome: 'Pessoa não encontrada' }).nome : '');
  const usuarioAtual = () => { const p = window.CicluzSessao && window.CicluzSessao.perfil; return p && p.usuarioId && p.usuarioId !== 'local' ? p.usuarioId : ''; };

  /* ---------- Consultas ---------- */
  const lista = (id) => dados.listas.find((l) => l.id === id);
  const item = (id) => dados.itens.find((i) => i.id === id);
  const coluna = (id) => dados.colunas.find((c) => c.id === id);
  /** Coluna do Kanban em que o compromisso está ("concluido" quando feito). */
  const colunaDe = (i) => (i.concluida ? CONCLUIDO : coluna(i.colunaId) ? i.colunaId : dados.colunas[0].id);

  /* ---------- Operações (devolvem { ok, id } ou { erro }) ---------- */
  const erro = (texto) => ({ erro: texto });
  const vazioOuNumero = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

  function limpar(campos) {
    const r = campos.repeticao && campos.repeticao.tipo && campos.repeticao.tipo !== 'nunca' ? {
      tipo: campos.repeticao.tipo,
      intervalo: Math.max(1, Number(campos.repeticao.intervalo) || 1),
      unidade: campos.repeticao.unidade || 'semana',
      diasSemana: [...new Set((campos.repeticao.diasSemana || []).map(Number))].sort(),
      fim: { tipo: (campos.repeticao.fim && campos.repeticao.fim.tipo) || 'nunca', data: (campos.repeticao.fim && campos.repeticao.fim.data) || '', vezes: Number(campos.repeticao.fim && campos.repeticao.fim.vezes) || 0 },
      feitas: Number(campos.repeticao.feitas) || 0,
      ancora: campos.repeticao.ancora || campos.data || '',
    } : null;
    return {
      listaId: campos.listaId,
      titulo: String(campos.titulo || '').trim(),
      notas: String(campos.notas || '').trim(),
      url: String(campos.url || '').trim(),
      local: String(campos.local || '').trim(),
      localizacao: campos.localizacao && (Number.isFinite(campos.localizacao.lat) || campos.localizacao.aviso) ? {
        lat: Number.isFinite(campos.localizacao.lat) ? +campos.localizacao.lat.toFixed(6) : undefined,
        lng: Number.isFinite(campos.localizacao.lng) ? +campos.localizacao.lng.toFixed(6) : undefined,
        aviso: campos.localizacao.aviso || '',
        raio: Number(campos.localizacao.raio) || 200,
      } : null,
      data: campos.data || '',
      // Hora sem data não é apagada em silêncio: a validação avisa.
      hora: campos.hora || '',
      horaFim: campos.hora ? (campos.horaFim || '') : (campos.horaFim || ''),
      repeticao: r,
      alerta: vazioOuNumero(campos.alerta),
      prioridade: campos.prioridade || 'normal',
      sinalizado: Boolean(campos.sinalizado),
      etiquetas: D.normalizarEtiquetas(campos.etiquetas),
      responsavelId: campos.responsavelId || '',
      colunaId: campos.colunaId || '',
      subtarefas: (campos.subtarefas || []).map((s) => ({
        id: s.id || novoId('sub'), titulo: String(s.titulo || '').trim(),
        concluida: Boolean(s.concluida), concluidaEm: s.concluida ? (s.concluidaEm || agoraIso()) : '',
      })),
    };
  }

  function salvarItem(id, campos) {
    const limpo = limpar(campos);
    const msg = D.validar(limpo);
    if (msg) return erro(msg);
    if (!lista(limpo.listaId)) return erro('Escolha a lista do compromisso.');
    let novo = id;
    const feito = transacao((d) => {
      const agora = agoraIso();
      if (id) {
        const atual = d.itens.find((i) => i.id === id);
        if (!atual) throw new Error('não encontrado');
        // Mudou quando ou o alerta: a soneca antiga deixa de valer.
        if (atual.data !== limpo.data || atual.hora !== limpo.hora || atual.alerta !== limpo.alerta) atual.adiadoPara = '';
        Object.assign(atual, limpo, { atualizadoEm: agora });
      } else {
        novo = novoId('ag');
        const ordem = d.itens.reduce((m, i) => Math.max(m, i.ordem || 0), 0) + 1;
        d.itens.push({ id: novo, ...limpo, ordem, adiadoPara: '', concluida: false, concluidaEm: '', criadoEm: agora, criadoPor: usuarioAtual(), atualizadoEm: agora });
      }
    });
    return feito ? { ok: true, id: novo } : erro('Não foi possível salvar. Tente de novo.');
  }

  /**
   * Criação rápida, como a linha "Novo" do Lembretes. O texto é interpretado: "amanhã às 10",
   * "sexta", "dia 20", "#etiqueta" e "!" viram data, hora, etiqueta e prioridade.
   */
  function criarRapido(texto, listaId, extra = {}) {
    const f = D.interpretar(texto, new Date());
    return salvarItem('', {
      ...extra, titulo: f.titulo, listaId,
      data: f.data || extra.data || '', hora: f.hora || extra.hora || '',
      etiquetas: [...(extra.etiquetas || []), ...f.etiquetas], prioridade: f.prioridade || extra.prioridade || 'normal',
      // Com data, avisa na hora (dia todo: às 9h), como o Lembretes.
      alerta: f.data || extra.data ? 0 : null,
    });
  }

  /**
   * Concluir. Se repete, como no Lembretes: fica uma cópia concluída (histórico) e o compromisso passa
   * para a próxima data, com as subtarefas desmarcadas. Na última vez, ele mesmo é concluído.
   * Reabrir uma cópia concluída só desmarca a cópia.
   */
  function alternarConcluida(id) {
    let resultado = '';
    const ok = transacao((d) => {
      const i = d.itens.find((x) => x.id === id);
      if (!i) return false;
      const agora = agoraIso();
      if (!i.concluida && D.temRepeticao(i)) {
        const p = D.proxima(i);
        if (p) {
          d.itens.push({ ...structuredClone(i), id: novoId('ag'), repeticao: null, alerta: null, adiadoPara: '', concluida: true, concluidaEm: agora, origemId: i.id, atualizadoEm: agora });
          i.repeticao.feitas = (i.repeticao.feitas || 0) + 1;
          i.data = p.data;
          i.hora = p.hora;
          i.adiadoPara = '';
          i.subtarefas.forEach((s) => { s.concluida = false; s.concluidaEm = ''; });
          i.atualizadoEm = agora;
          resultado = 'repetiu';
          return true;
        }
      }
      i.concluida = !i.concluida;
      i.concluidaEm = i.concluida ? agora : '';
      i.adiadoPara = '';
      i.atualizadoEm = agora;
      resultado = i.concluida ? 'concluiu' : 'reabriu';
      return true;
    });
    return ok ? resultado : '';
  }
  function alternarSubtarefa(id, subId) {
    return transacao((d) => {
      const s = (d.itens.find((x) => x.id === id) || { subtarefas: [] }).subtarefas.find((x) => x.id === subId);
      if (!s) return false;
      s.concluida = !s.concluida;
      s.concluidaEm = s.concluida ? agoraIso() : '';
      return true;
    });
  }
  function alternarSinalizado(id) {
    return transacao((d) => { const i = d.itens.find((x) => x.id === id); if (!i) return false; i.sinalizado = !i.sinalizado; i.atualizadoEm = agoraIso(); return true; });
  }
  const excluirItem = (id) => transacao((d) => { const n = d.itens.length; d.itens = d.itens.filter((i) => i.id !== id); return d.itens.length < n; });

  /** Leva para outro dia (e hora, na grade de horas), mantendo a duração. */
  function moverPara(id, data, hora) {
    if (!D.dataValida(data) || (hora && !D.horaValida(hora))) return false;
    return transacao((d) => {
      const i = d.itens.find((x) => x.id === id);
      if (!i || i.concluida) return false;
      if (hora !== undefined && hora !== null) {
        const dur = i.hora && i.horaFim ? D.minutos(i.horaFim) - D.minutos(i.hora) : 0;
        i.hora = hora;
        i.horaFim = hora && dur ? D.paraHora(Math.min(1439, D.minutos(hora) + dur)) : '';
        if (i.horaFim && i.horaFim <= i.hora) i.horaFim = '';
      }
      if (i.repeticao && (!i.repeticao.ancora || i.repeticao.ancora === i.data)) i.repeticao.ancora = data;
      i.data = data;
      i.adiadoPara = '';
      i.atualizadoEm = agoraIso();
      return true;
    });
  }

  /** Soneca do alerta: avisar de novo daqui a N minutos. */
  const adiar = (id, minutosDepois) => transacao((d) => { const i = d.itens.find((x) => x.id === id); if (!i) return false; i.adiadoPara = new Date(Date.now() + minutosDepois * 60000).toISOString(); return true; });

  /** Kanban: muda de coluna. Para "Concluído", conclui; para fora dela, reabre. */
  function moverColuna(id, colunaId) {
    const i = item(id);
    if (!i) return false;
    if (colunaId === CONCLUIDO) return i.concluida ? true : Boolean(alternarConcluida(id));
    return transacao((d) => {
      const x = d.itens.find((y) => y.id === id);
      if (x.concluida) { x.concluida = false; x.concluidaEm = ''; }
      x.colunaId = colunaId;
      x.atualizadoEm = agoraIso();
      return true;
    });
  }

  /** Ordem manual: põe o compromisso antes de outro (ou no fim, sem "antesDe"). */
  function reordenar(id, antesDeId) {
    return transacao((d) => {
      const i = d.itens.find((x) => x.id === id);
      if (!i || id === antesDeId) return false;
      const daLista = d.itens.filter((x) => x.listaId === i.listaId && x.id !== id).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
      const pos = antesDeId ? daLista.findIndex((x) => x.id === antesDeId) : -1;
      daLista.splice(pos < 0 ? daLista.length : pos, 0, i);
      daLista.forEach((x, n) => { x.ordem = n + 1; });
      return true;
    });
  }

  /** "Limpar" do Lembretes: apaga os concluídos de uma lista (ou de todas, sem listaId). */
  function limparConcluidos(listaId) {
    let n = 0;
    const ok = transacao((d) => { const antes = d.itens.length; d.itens = d.itens.filter((i) => !(i.concluida && (!listaId || i.listaId === listaId))); n = antes - d.itens.length; });
    return ok ? n : 0;
  }

  /* ---------- Listas ---------- */
  function salvarLista(id, { nome, cor, icone }) {
    const n = String(nome || '').trim();
    if (!n) return erro('Informe o nome da lista.');
    if (n.length > 40) return erro('O nome da lista passa de 40 letras.');
    if (dados.listas.some((l) => l.id !== id && l.nome.toLocaleLowerCase('pt-BR') === n.toLocaleLowerCase('pt-BR'))) return erro('Já existe uma lista com esse nome.');
    let novo = id;
    const feito = transacao((d) => {
      if (id) { const l = d.listas.find((x) => x.id === id); if (!l) throw new Error('não encontrada'); Object.assign(l, { nome: n, cor: cor || l.cor, icone: icone || l.icone }); }
      else { novo = novoId('lista'); d.listas.push({ id: novo, nome: n, cor: cor || CORES_LISTA[d.listas.length % CORES_LISTA.length], icone: icone || 'lista', ordenacao: 'manual' }); }
    });
    return feito ? { ok: true, id: novo } : erro('Não foi possível salvar a lista.');
  }
  const definirOrdenacao = (listaId, ordenacao) => transacao((d) => { const l = d.listas.find((x) => x.id === listaId); if (l) l.ordenacao = ordenacao; });
  /** Exclui a lista só quando vazia: compromisso nunca some junto com a lista. */
  function excluirLista(id) {
    if (dados.itens.some((i) => i.listaId === id)) return erro('Mova ou exclua os compromissos desta lista antes de excluí-la.');
    if (dados.listas.length <= 1) return erro('A agenda precisa de pelo menos uma lista.');
    return transacao((d) => { d.listas = d.listas.filter((l) => l.id !== id); }) ? { ok: true } : erro('Não foi possível excluir a lista.');
  }

  /* ---------- Colunas do Kanban ---------- */
  function salvarColuna(id, nome) {
    const n = String(nome || '').trim();
    if (!n) return erro('Informe o nome da coluna.');
    if (n.length > 30) return erro('O nome da coluna passa de 30 letras.');
    if (n.toLocaleLowerCase('pt-BR') === 'concluído' || dados.colunas.some((c) => c.id !== id && c.nome.toLocaleLowerCase('pt-BR') === n.toLocaleLowerCase('pt-BR'))) return erro('Já existe uma coluna com esse nome.');
    let novo = id;
    const feito = transacao((d) => {
      if (id) { const c = d.colunas.find((x) => x.id === id); if (!c) throw new Error('não encontrada'); c.nome = n; }
      else { novo = novoId('col'); d.colunas.push({ id: novo, nome: n }); }
    });
    return feito ? { ok: true, id: novo } : erro('Não foi possível salvar a coluna.');
  }
  function excluirColuna(id) {
    if (dados.colunas.length <= 1) return erro('O quadro precisa de pelo menos uma coluna além de Concluído.');
    if (dados.itens.some((i) => !i.concluida && colunaDe(i) === id)) return erro('Mova os cartões desta coluna antes de excluí-la.');
    return transacao((d) => { d.colunas = d.colunas.filter((c) => c.id !== id); }) ? { ok: true } : erro('Não foi possível excluir a coluna.');
  }

  window.CicluzAgendaDados = {
    KEY, LISTAS_INICIAIS, CORES_LISTA, CONCLUIDO,
    get dados() { return dados; },
    get erroLeitura() { return erroLeitura; },
    transacao, novoId, pessoas, nomePessoa, usuarioAtual, lista, item, coluna, colunaDe,
    salvarItem, criarRapido, alternarConcluida, alternarSubtarefa, alternarSinalizado, excluirItem, moverPara, adiar,
    moverColuna, reordenar, limparConcluidos,
    salvarLista, definirOrdenacao, excluirLista, salvarColuna, excluirColuna,
  };
})();
